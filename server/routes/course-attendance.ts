import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { z } from "zod";

const ABSENCE_WARN_THRESHOLD = 0.3;

type AttendanceStatus = "present" | "late" | "absent" | "scheduled";

interface SessionUser {
  id: number;
  role: string;
  name?: string;
  email?: string;
}

interface CourseRecord {
  id: number;
  title?: string;
  instructorId?: number;
  instituteId?: number;
}

interface CourseSessionRecord {
  id: number;
  courseId: number;
  sessionNumber: number;
  title: string;
  description?: string | null;
  scheduledDate?: string | null;
  durationMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

interface AttendanceRecord {
  id: number;
  sessionId: number;
  courseId: number;
  userId: number;
  petId: number | null;
  status: AttendanceStatus;
  memo: string | null;
  checkedBy: number | null;
  checkedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CoursePurchaseRecord {
  id: number;
  userId: number;
  courseId: number;
}

interface CourseProgressRecord {
  id: number;
  userId: number;
  courseId: number;
  currentLesson: number;
  completedLessons: number;
  totalLessons: number;
  progressPercentage: number;
  timeSpent: number;
  averageScore: number;
  lastAccessedAt: string;
  status: "active" | "completed";
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const sessions = (): CourseSessionRecord[] => storage.courseSessions as CourseSessionRecord[];
const attendance = (): AttendanceRecord[] => storage.sessionAttendance as AttendanceRecord[];
const purchases = (): CoursePurchaseRecord[] => storage.coursePurchases as CoursePurchaseRecord[];
const progresses = (): CourseProgressRecord[] => storage.courseProgress as CourseProgressRecord[];
const courses = (): CourseRecord[] => storage.courses as CourseRecord[];

function nextId<T extends { id: number }>(arr: T[]): number {
  return (arr.reduce((m, s) => Math.max(m, s.id), 0) || 0) + 1;
}

function getUser(req: Request): SessionUser | null {
  const sess = req.session as unknown as { user?: SessionUser } | undefined;
  return sess?.user ?? null;
}

const ADMIN_ROLES = new Set(["admin", "super-admin", "institute-admin"]);

function isAdmin(user: SessionUser | null): boolean {
  return !!user && ADMIN_ROLES.has(user.role);
}

function isTrainer(user: SessionUser | null): boolean {
  return !!user && user.role === "trainer";
}

function findCourse(courseId: number): CourseRecord | undefined {
  return courses().find((c) => c.id === courseId);
}

function canManageCourse(user: SessionUser | null, course: CourseRecord | undefined): boolean {
  if (!user || !course) return false;
  if (isAdmin(user)) return true;
  if (isTrainer(user) && course.instructorId === user.id) return true;
  return false;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!getUser(req)) {
    res.status(401).json({ message: "로그인이 필요합니다." });
    return;
  }
  next();
}

async function notifyReviewRequestForCourse(userId: number, courseId: number) {
  try {
    const course = findCourse(courseId);
    if (!course || !course.instructorId) return;
    const userList = storage.users as Array<{ id: number; name?: string }>;
    const petList = storage.pets as Array<{ id: number; ownerId: number; name?: string }>;
    const trainer = userList.find((u) => u.id === course.instructorId);
    const owner = userList.find((u) => u.id === userId);
    const pet = petList.find((p) => p.ownerId === userId);
    const { triggerReviewRequestNotification } = await import(
      "../services/review-request-notifier"
    );
    await triggerReviewRequestNotification({
      ownerId: userId,
      ownerName: owner?.name,
      trainerId: course.instructorId,
      trainerName: trainer?.name,
      petId: pet?.id ?? null,
      petName: pet?.name ?? null,
      courseId,
      lessonRef: `course-${courseId}`,
      completedAt: new Date().toISOString(),
      storage,
    });
  } catch { /* noop */ }
}

function computeAbsenceRate(userId: number, courseId: number): number {
  const myAtt = attendance().filter((a) => a.courseId === courseId && a.userId === userId);
  const completed = myAtt.filter((a) => a.status === "present" || a.status === "late").length;
  const absent = myAtt.filter((a) => a.status === "absent").length;
  const checked = completed + absent;
  return checked > 0 ? absent / checked : 0;
}

async function notifyAbsenceWarning(params: {
  userId: number;
  courseId: number;
  absenceRate: number;
  totalSessions: number;
  absentSessions: number;
}) {
  try {
    const course = findCourse(params.courseId);
    if (!course) return;
    const userList = storage.users as Array<{ id: number; name?: string }>;
    const owner = userList.find((u) => u.id === params.userId);
    const ownerName = owner?.name || "수강생";
    const courseTitle = course.title || `코스 #${params.courseId}`;
    const ratePct = Math.round(params.absenceRate * 1000) / 10;

    const metadata = {
      kind: "absence_warning",
      courseId: params.courseId,
      userId: params.userId,
      absenceRate: ratePct,
      absentSessions: params.absentSessions,
      totalSessions: params.totalSessions,
    };

    // 보호자 알림
    try {
      await storage.createNotification?.({
        userId: params.userId,
        title: "결석률 경고",
        message: `[${courseTitle}] 결석률이 ${ratePct}%에 도달했습니다. 출석에 주의해 주세요.`,
        type: "warning",
        actionUrl: `/courses/${params.courseId}/progress`,
        metadata,
      });
    } catch { /* noop */ }

    // 트레이너 알림
    if (course.instructorId) {
      try {
        await storage.createNotification?.({
          userId: course.instructorId,
          title: "수강생 결석률 경고",
          message: `[${courseTitle}] ${ownerName}님의 결석률이 ${ratePct}%에 도달했습니다.`,
          type: "warning",
          actionUrl: `/trainer/courses/${params.courseId}`,
          metadata: { ...metadata, ownerName },
        });
      } catch { /* noop */ }
    }
  } catch { /* noop */ }
}

function recomputeProgress(userId: number, courseId: number) {
  const courseSessionsForCourse = sessions().filter((s) => s.courseId === courseId);
  const total = courseSessionsForCourse.length;
  const myAtt = attendance().filter((a) => a.courseId === courseId && a.userId === userId);
  const completed = myAtt.filter((a) => a.status === "present" || a.status === "late").length;
  const absent = myAtt.filter((a) => a.status === "absent").length;
  const checked = completed + absent;
  const pct = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;

  const list = progresses();
  let progress = list.find((p) => p.userId === userId && p.courseId === courseId);
  const isComplete = total > 0 && completed >= total;
  const now = new Date().toISOString();

  if (!progress) {
    progress = {
      id: list.length + 1,
      userId,
      courseId,
      currentLesson: Math.min(completed + 1, total || 1),
      completedLessons: completed,
      totalLessons: total,
      progressPercentage: pct,
      timeSpent: 0,
      averageScore: 0,
      lastAccessedAt: now,
      status: isComplete ? "completed" : "active",
      completedAt: isComplete ? now : null,
      createdAt: now,
      updatedAt: now,
    };
    list.push(progress);
  } else {
    progress.totalLessons = total;
    progress.completedLessons = completed;
    progress.progressPercentage = pct;
    progress.currentLesson = Math.min(completed + 1, total || 1);
    progress.lastAccessedAt = now;
    if (isComplete && progress.status !== "completed") {
      progress.status = "completed";
      progress.completedAt = now;
      notifyReviewRequestForCourse(userId, courseId).catch(() => {/* noop */});
    } else if (!isComplete) {
      progress.status = "active";
      progress.completedAt = null;
    }
    progress.updatedAt = now;
  }

  const absenceRate = checked > 0 ? absent / checked : 0;
  return { progress, absenceRate, totalSessions: total, completedSessions: completed, absentSessions: absent };
}

function ensureAttendanceRows(courseId: number): void {
  const courseSessionsForCourse = sessions().filter((s) => s.courseId === courseId);
  const enrolled = purchases().filter((p) => p.courseId === courseId);
  const att = attendance();
  for (const s of courseSessionsForCourse) {
    for (const p of enrolled) {
      const exists = att.find((a) => a.sessionId === s.id && a.userId === p.userId);
      if (!exists) {
        att.push({
          id: nextId(att),
          sessionId: s.id,
          courseId,
          userId: p.userId,
          petId: null,
          status: "scheduled",
          memo: null,
          checkedBy: null,
          checkedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }
}

const sessionInputSchema = z.object({
  sessionNumber: z.number().int().positive(),
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  scheduledDate: z.string().optional().nullable(),
  durationMinutes: z.number().int().positive().optional(),
});

const attendanceUpdateItemSchema = z.object({
  userId: z.number().int().positive(),
  status: z.enum(["present", "late", "absent", "scheduled"]),
  memo: z.string().optional().nullable(),
});

const bulkAttendanceSchema = z.object({
  items: z.array(attendanceUpdateItemSchema).min(1),
});

function maskName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "***";
  const chars = Array.from(trimmed);
  if (chars.length === 1) return chars[0] + "*";
  if (chars.length === 2) return chars[0] + "*";
  return chars[0] + "*".repeat(chars.length - 2) + chars[chars.length - 1];
}

export function registerCourseAttendanceRoutes(app: Express) {
  // 공개: 수료증 번호 진위 확인 (인증 불필요, 개인정보 최소 노출)
  app.get("/api/verify/:certificateNo", (req: Request, res: Response) => {
    const certificateNo = String(req.params.certificateNo || "").trim();
    const match = /^WZ-(\d+)-(\d+)-(\d{6})$/.exec(certificateNo);
    if (!match) {
      return res.status(404).json({ success: false, message: "유효하지 않은 수료증 번호입니다." });
    }
    const courseId = parseInt(match[1], 10);
    const userId = parseInt(match[2], 10);
    const tsSuffix = match[3];

    const course = findCourse(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "수료증을 찾을 수 없습니다." });
    }
    const purchase = purchases().find((p) => p.userId === userId && p.courseId === courseId);
    if (!purchase) {
      return res.status(404).json({ success: false, message: "수료증을 찾을 수 없습니다." });
    }

    const list = progresses();
    const progress = list.find((p) => p.userId === userId && p.courseId === courseId);
    if (!progress || progress.status !== "completed" || !progress.completedAt) {
      return res.status(404).json({ success: false, message: "수료증을 찾을 수 없습니다." });
    }

    const completedTs = new Date(progress.completedAt).getTime();
    const expectedSuffix = completedTs.toString().slice(-6);
    if (expectedSuffix !== tsSuffix) {
      return res.status(404).json({ success: false, message: "수료증 번호가 일치하지 않습니다." });
    }

    const users = storage.users as Array<{ id: number; name?: string }>;
    const user = users.find((u) => u.id === userId);
    const trainer = course.instructorId ? users.find((u) => u.id === course.instructorId) : null;

    res.json({
      success: true,
      data: {
        certificateNo,
        userName: maskName(user?.name || "수강생"),
        courseTitle: course.title || `코스 #${courseId}`,
        trainerName: trainer?.name || "담당 트레이너",
        instituteName: "왕짱스쿨",
        completedAt: progress.completedAt,
        totalSessions: progress.totalLessons,
      },
    });
  });

  // 회차 목록 조회 — 인증 필수. 트레이너/관리자/등록한 보호자만 접근.
  app.get("/api/courses/:courseId/sessions", requireAuth, (req: Request, res: Response) => {
    const me = getUser(req)!;
    const courseId = parseInt(req.params.courseId, 10);
    if (Number.isNaN(courseId)) return res.status(400).json({ message: "잘못된 courseId" });
    const course = findCourse(courseId);
    if (!course) return res.status(404).json({ message: "코스를 찾을 수 없습니다." });

    const isOwnerEnrolled = purchases().some((p) => p.courseId === courseId && p.userId === me.id);
    if (!canManageCourse(me, course) && !isOwnerEnrolled) {
      return res.status(403).json({ message: "권한이 없습니다." });
    }

    const list = sessions()
      .filter((s) => s.courseId === courseId)
      .sort((a, b) => a.sessionNumber - b.sessionNumber);
    res.json({ success: true, data: list });
  });

  // 회차 생성/수정 (담당 트레이너 또는 관리자)
  app.post("/api/courses/:courseId/sessions", requireAuth, (req: Request, res: Response) => {
    const me = getUser(req)!;
    const courseId = parseInt(req.params.courseId, 10);
    if (Number.isNaN(courseId)) return res.status(400).json({ message: "잘못된 courseId" });
    const course = findCourse(courseId);
    if (!course) return res.status(404).json({ message: "코스를 찾을 수 없습니다." });
    if (!canManageCourse(me, course)) return res.status(403).json({ message: "권한이 없습니다." });

    const parsed = sessionInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "입력값 오류", errors: parsed.error.flatten() });

    const list = sessions();
    const existing = list.find((s) => s.courseId === courseId && s.sessionNumber === parsed.data.sessionNumber);
    const now = new Date().toISOString();
    if (existing) {
      existing.title = parsed.data.title;
      existing.description = parsed.data.description ?? null;
      existing.scheduledDate = parsed.data.scheduledDate ?? null;
      if (parsed.data.durationMinutes !== undefined) existing.durationMinutes = parsed.data.durationMinutes;
      existing.updatedAt = now;
      ensureAttendanceRows(courseId);
      return res.json({ success: true, data: existing });
    }
    const session: CourseSessionRecord = {
      id: nextId(list),
      courseId,
      sessionNumber: parsed.data.sessionNumber,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      scheduledDate: parsed.data.scheduledDate ?? null,
      durationMinutes: parsed.data.durationMinutes,
      createdAt: now,
      updatedAt: now,
    };
    list.push(session);
    ensureAttendanceRows(courseId);
    res.json({ success: true, data: session });
  });

  // 회차 삭제 (담당 트레이너 또는 관리자)
  app.delete("/api/courses/sessions/:sessionId", requireAuth, (req: Request, res: Response) => {
    const me = getUser(req)!;
    const sessionId = parseInt(req.params.sessionId, 10);
    const list = sessions();
    const idx = list.findIndex((s) => s.id === sessionId);
    if (idx === -1) return res.status(404).json({ message: "회차를 찾을 수 없습니다." });
    const courseId = list[idx].courseId;
    const course = findCourse(courseId);
    if (!canManageCourse(me, course)) return res.status(403).json({ message: "권한이 없습니다." });

    list.splice(idx, 1);
    storage.sessionAttendance = (attendance() as AttendanceRecord[]).filter((a) => a.sessionId !== sessionId);
    const enrolled = purchases().filter((p) => p.courseId === courseId);
    for (const p of enrolled) recomputeProgress(p.userId, courseId);
    res.json({ success: true });
  });

  // 회차별 출석 현황 (담당 트레이너 또는 관리자)
  app.get("/api/courses/sessions/:sessionId/attendance", requireAuth, (req: Request, res: Response) => {
    const me = getUser(req)!;
    const sessionId = parseInt(req.params.sessionId, 10);
    const session = sessions().find((s) => s.id === sessionId);
    if (!session) return res.status(404).json({ message: "회차를 찾을 수 없습니다." });
    const course = findCourse(session.courseId);
    if (!canManageCourse(me, course)) return res.status(403).json({ message: "권한이 없습니다." });

    ensureAttendanceRows(session.courseId);
    const users = storage.users as Array<{ id: number; name?: string; email?: string }>;
    const pets = storage.pets as Array<{ id: number; ownerId: number; name?: string }>;
    const rows = attendance()
      .filter((a) => a.sessionId === sessionId)
      .map((a) => {
        const user = users.find((u) => u.id === a.userId);
        const pet = pets.find((p) => p.ownerId === a.userId);
        return {
          ...a,
          userName: user?.name || `사용자 #${a.userId}`,
          userEmail: user?.email,
          petName: pet?.name,
        };
      });
    res.json({ success: true, data: { session, attendance: rows } });
  });

  // 일괄 출석 체크 업데이트 (담당 트레이너 또는 관리자)
  app.post("/api/courses/sessions/:sessionId/attendance", requireAuth, (req: Request, res: Response) => {
    const me = getUser(req)!;
    const sessionId = parseInt(req.params.sessionId, 10);
    const session = sessions().find((s) => s.id === sessionId);
    if (!session) return res.status(404).json({ message: "회차를 찾을 수 없습니다." });
    const course = findCourse(session.courseId);
    if (!canManageCourse(me, course)) return res.status(403).json({ message: "권한이 없습니다." });

    const parsed = bulkAttendanceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "입력값 오류", errors: parsed.error.flatten() });

    const enrolledIds = new Set(purchases().filter((p) => p.courseId === session.courseId).map((p) => p.userId));
    const now = new Date().toISOString();
    const updatedUsers = new Set<number>();
    const att = attendance();

    // 임계값 통과 감지를 위한 사전 결석률 캡처
    const previousRates = new Map<number, number>();
    for (const item of parsed.data.items) {
      if (!enrolledIds.has(item.userId)) continue;
      if (!previousRates.has(item.userId)) {
        previousRates.set(item.userId, computeAbsenceRate(item.userId, session.courseId));
      }
    }

    for (const item of parsed.data.items) {
      if (!enrolledIds.has(item.userId)) continue;
      let row = att.find((a) => a.sessionId === sessionId && a.userId === item.userId);
      if (!row) {
        row = {
          id: nextId(att),
          sessionId,
          courseId: session.courseId,
          userId: item.userId,
          petId: null,
          status: item.status,
          memo: item.memo ?? null,
          checkedBy: me.id,
          checkedAt: now,
          createdAt: now,
          updatedAt: now,
        };
        att.push(row);
      } else {
        row.status = item.status;
        if (item.memo !== undefined) row.memo = item.memo ?? null;
        row.checkedBy = me.id;
        row.checkedAt = now;
        row.updatedAt = now;
      }
      updatedUsers.add(item.userId);
    }

    const warnings: Array<{ userId: number; absenceRate: number; totalSessions: number; absentSessions: number }> = [];
    for (const userId of updatedUsers) {
      const result = recomputeProgress(userId, session.courseId);
      if (result.absenceRate >= ABSENCE_WARN_THRESHOLD) {
        warnings.push({
          userId,
          absenceRate: Math.round(result.absenceRate * 1000) / 10,
          totalSessions: result.totalSessions,
          absentSessions: result.absentSessions,
        });

        const prevRate = previousRates.get(userId) ?? 0;
        if (prevRate < ABSENCE_WARN_THRESHOLD) {
          notifyAbsenceWarning({
            userId,
            courseId: session.courseId,
            absenceRate: result.absenceRate,
            totalSessions: result.totalSessions,
            absentSessions: result.absentSessions,
          }).catch(() => { /* noop */ });
        }
      }
    }

    res.json({ success: true, warnings });
  });

  // 보호자: 코스별 진도 및 회차 리스트
  app.get("/api/my-courses/:courseId/progress", requireAuth, (req: Request, res: Response) => {
    const me = getUser(req)!;
    const courseId = parseInt(req.params.courseId, 10);
    const targetUserId = req.query.userId ? parseInt(req.query.userId as string, 10) : me.id;

    const course = findCourse(courseId);
    if (!course) return res.status(404).json({ message: "코스를 찾을 수 없습니다." });

    if (targetUserId !== me.id && !canManageCourse(me, course)) {
      return res.status(403).json({ message: "권한이 없습니다." });
    }

    const purchase = purchases().find((p) => p.userId === targetUserId && p.courseId === courseId);
    if (!purchase) return res.status(404).json({ message: "수강 정보가 없습니다." });

    const list = sessions()
      .filter((s) => s.courseId === courseId)
      .sort((a, b) => a.sessionNumber - b.sessionNumber);

    const sessionsWithStatus = list.map((s) => {
      const att = attendance().find((a) => a.sessionId === s.id && a.userId === targetUserId);
      return {
        ...s,
        attendance: att ?? { status: "scheduled" as AttendanceStatus, memo: null, checkedAt: null },
      };
    });

    const result = recomputeProgress(targetUserId, courseId);
    const absenceRate = Math.round(result.absenceRate * 1000) / 10;

    res.json({
      success: true,
      data: {
        course,
        purchase,
        progress: result.progress,
        sessions: sessionsWithStatus,
        absenceRate,
        absenceWarning: result.absenceRate >= ABSENCE_WARN_THRESHOLD,
        completed: result.progress.status === "completed",
      },
    });
  });

  // 보호자: 내 모든 코스 진도 요약
  app.get("/api/my-courses/progress-summary", requireAuth, (req: Request, res: Response) => {
    const me = getUser(req)!;
    const myPurchases = purchases().filter((p) => p.userId === me.id);
    const data = myPurchases.map((p) => {
      const course = findCourse(p.courseId);
      const result = recomputeProgress(me.id, p.courseId);
      return {
        courseId: p.courseId,
        course,
        progress: result.progress,
        absenceRate: Math.round(result.absenceRate * 1000) / 10,
        absenceWarning: result.absenceRate >= ABSENCE_WARN_THRESHOLD,
        completed: result.progress.status === "completed",
      };
    });
    res.json({ success: true, data });
  });

  // 보호자: 본인의 수료증 목록 (수료한 모든 강의)
  app.get("/api/my-certificates", requireAuth, (req: Request, res: Response) => {
    const me = getUser(req)!;
    const users = storage.users as Array<{ id: number; name?: string }>;
    const pets = storage.pets as Array<{ id: number; ownerId: number; name?: string }>;
    const myPurchases = purchases().filter((p) => p.userId === me.id);

    const items = myPurchases
      .map((p) => {
        const course = findCourse(p.courseId);
        if (!course) return null;
        const result = recomputeProgress(me.id, p.courseId);
        if (result.progress.status !== "completed") return null;
        const trainer = course.instructorId ? users.find((u) => u.id === course.instructorId) : null;
        const pet = pets.find((pt) => pt.ownerId === me.id);
        const completedTs = result.progress.completedAt
          ? new Date(result.progress.completedAt).getTime()
          : Date.now();
        return {
          courseId: p.courseId,
          certificateNo: `WZ-${p.courseId}-${me.id}-${completedTs.toString().slice(-6)}`,
          courseTitle: course.title || `코스 #${p.courseId}`,
          trainerName: trainer?.name || "담당 트레이너",
          instituteName: "왕짱스쿨",
          petName: pet?.name || null,
          completedAt: result.progress.completedAt,
          totalSessions: result.totalSessions,
          completedSessions: result.completedSessions,
        };
      })
      .filter(Boolean);

    res.json({ success: true, data: items });
  });

  // 보호자: 수료증 데이터
  app.get("/api/courses/:courseId/certificate", requireAuth, (req: Request, res: Response) => {
    const me = getUser(req)!;
    const courseId = parseInt(req.params.courseId, 10);
    const targetUserId = req.query.userId ? parseInt(req.query.userId as string, 10) : me.id;
    const course = findCourse(courseId);
    if (!course) return res.status(404).json({ message: "코스를 찾을 수 없습니다." });

    if (targetUserId !== me.id && !canManageCourse(me, course)) {
      return res.status(403).json({ message: "권한이 없습니다." });
    }

    const result = recomputeProgress(targetUserId, courseId);
    if (result.progress.status !== "completed") {
      return res.status(400).json({ message: "아직 수료하지 않았습니다." });
    }

    const users = storage.users as Array<{ id: number; name?: string }>;
    const pets = storage.pets as Array<{ id: number; ownerId: number; name?: string }>;
    const user = users.find((u) => u.id === targetUserId);
    const trainer = course.instructorId ? users.find((u) => u.id === course.instructorId) : null;
    const pet = pets.find((p) => p.ownerId === targetUserId);

    const completedTs = result.progress.completedAt ? new Date(result.progress.completedAt).getTime() : Date.now();
    const certificateNo = `WZ-${courseId}-${targetUserId}-${completedTs.toString().slice(-6)}`;

    res.json({
      success: true,
      data: {
        certificateNo,
        userName: user?.name || "수강생",
        petName: pet?.name || null,
        courseTitle: course.title || "코스",
        trainerName: trainer?.name || "담당 트레이너",
        instituteName: "왕짱스쿨",
        completedAt: result.progress.completedAt,
        totalSessions: result.totalSessions,
        completedSessions: result.completedSessions,
      },
    });
  });

  // 보호자: 수료증 PDF 다운로드
  app.get("/api/courses/:courseId/certificate.pdf", requireAuth, async (req: Request, res: Response) => {
    const me = getUser(req)!;
    const courseId = parseInt(req.params.courseId, 10);
    if (Number.isNaN(courseId)) return res.status(400).json({ message: "잘못된 courseId" });
    let targetUserId = me.id;
    if (req.query.userId !== undefined) {
      const parsed = parseInt(req.query.userId as string, 10);
      if (Number.isNaN(parsed)) return res.status(400).json({ message: "잘못된 userId" });
      targetUserId = parsed;
    }
    const course = findCourse(courseId);
    if (!course) return res.status(404).json({ message: "코스를 찾을 수 없습니다." });

    if (targetUserId !== me.id && !canManageCourse(me, course)) {
      return res.status(403).json({ message: "권한이 없습니다." });
    }

    const result = recomputeProgress(targetUserId, courseId);
    if (result.progress.status !== "completed") {
      return res.status(400).json({ message: "아직 수료하지 않았습니다." });
    }

    const users = storage.users as Array<{ id: number; name?: string }>;
    const pets = storage.pets as Array<{ id: number; ownerId: number; name?: string }>;
    const user = users.find((u) => u.id === targetUserId);
    const trainer = course.instructorId ? users.find((u) => u.id === course.instructorId) : null;
    const pet = pets.find((p) => p.ownerId === targetUserId);

    const completedTs = result.progress.completedAt ? new Date(result.progress.completedAt).getTime() : Date.now();
    const certificateNo = `WZ-${courseId}-${targetUserId}-${completedTs.toString().slice(-6)}`;

    try {
      const { generateCertificatePdf } = await import("../services/certificate-pdf");
      const buffer = await generateCertificatePdf({
        certificateNo,
        userName: user?.name || "수강생",
        petName: pet?.name || null,
        courseTitle: course.title || "코스",
        trainerName: trainer?.name || "담당 트레이너",
        instituteName: "왕짱스쿨",
        completedAt: result.progress.completedAt,
        totalSessions: result.totalSessions,
        completedSessions: result.completedSessions,
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="certificate-${certificateNo}.pdf"`,
      );
      res.send(buffer);
    } catch (err) {
      console.error("[Certificate PDF] 생성 실패:", err);
      res.status(500).json({ message: "수료증 PDF 생성에 실패했습니다." });
    }
  });

  // 관리자: 코스별 평균 출석률 통계
  app.get("/api/admin/courses/attendance-stats", requireAuth, (req: Request, res: Response) => {
    const me = getUser(req)!;
    if (!isAdmin(me)) return res.status(403).json({ message: "권한이 없습니다." });

    const stats = courses().map((course) => {
      const courseSessionsForCourse = sessions().filter((s) => s.courseId === course.id);
      const enrolled = purchases().filter((p) => p.courseId === course.id);
      const att = attendance().filter((a) => a.courseId === course.id);
      const checked = att.filter((a) => a.status !== "scheduled");
      const present = att.filter((a) => a.status === "present" || a.status === "late").length;
      const absent = att.filter((a) => a.status === "absent").length;
      let completedUsers = 0;
      let warningCount = 0;
      for (const p of enrolled) {
        const r = recomputeProgress(p.userId, course.id);
        if (r.progress.status === "completed") completedUsers++;
        if (r.absenceRate >= ABSENCE_WARN_THRESHOLD) warningCount++;
      }

      const attendanceRate = checked.length > 0 ? Math.round((present / checked.length) * 1000) / 10 : 0;
      const absenceRate = checked.length > 0 ? Math.round((absent / checked.length) * 1000) / 10 : 0;

      return {
        courseId: course.id,
        courseTitle: course.title,
        instructorId: course.instructorId,
        totalSessions: courseSessionsForCourse.length,
        enrolledCount: enrolled.length,
        completedUsers,
        completionRate: enrolled.length > 0 ? Math.round((completedUsers / enrolled.length) * 1000) / 10 : 0,
        attendanceRate,
        absenceRate,
        warningCount,
      };
    });

    res.json({ success: true, data: stats });
  });

  // 트레이너: 자기가 담당한 코스 목록
  app.get("/api/trainer/courses", requireAuth, (req: Request, res: Response) => {
    const me = getUser(req)!;
    if (!isTrainer(me) && !isAdmin(me)) {
      return res.status(403).json({ message: "권한이 없습니다." });
    }
    const list = courses()
      .filter((c) => isAdmin(me) || c.instructorId === me.id)
      .map((c) => {
        const sessionCount = sessions().filter((s) => s.courseId === c.id).length;
        const enrolledCount = purchases().filter((p) => p.courseId === c.id).length;
        return { ...c, sessionCount, enrolledCount };
      });
    res.json({ success: true, data: list });
  });
}

export default registerCourseAttendanceRoutes;
