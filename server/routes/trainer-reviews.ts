import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import {
  insertTrainerReviewSchema,
  insertTrainerReviewReplySchema,
  insertTrainerReviewReportSchema,
} from "../../shared/schema";

type SessionUser = {
  id: number;
  role: string;
  name?: string;
  email?: string;
};

function getSessionUser(req: Request): SessionUser | null {
  const sessionUser = req.session?.user;
  if (!sessionUser || typeof sessionUser.id !== "number") return null;
  return {
    id: sessionUser.id,
    role: String(sessionUser.role || ""),
    name: sessionUser.name,
    email: sessionUser.email,
  };
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ success: false, error: "로그인이 필요합니다." });
  (req as Request & { authUser: SessionUser }).authUser = user;
  next();
}

function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = getSessionUser(req);
    if (!user) return res.status(401).json({ success: false, error: "로그인이 필요합니다." });
    if (!roles.includes(user.role)) {
      return res.status(403).json({ success: false, error: "권한이 없습니다." });
    }
    (req as Request & { authUser: SessionUser }).authUser = user;
    next();
  };
}

const authed = (req: Request) => (req as Request & { authUser: SessionUser }).authUser;

export function registerTrainerReviewRoutes(app: Express) {
  // 리뷰 작성 (보호자 전용)
  app.post("/api/trainer-reviews", requireRole("pet-owner", "owner"), async (req: Request, res: Response) => {
    try {
      const user = authed(req);
      const parsed = insertTrainerReviewSchema.safeParse({
        ...req.body,
        authorId: user.id,
      });
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "입력값이 올바르지 않습니다.", details: parsed.error.flatten() });
      }
      if (parsed.data.trainerId === user.id) {
        return res.status(400).json({ success: false, error: "본인에게 리뷰를 작성할 수 없습니다." });
      }

      // 서버 측 자격 검증: 완료된 수업이 N일 이내, 같은 lessonRef 중복 금지
      const eligible = storage.getEligibleReviewTargets(user.id);
      const target = eligible.find(
        (t) =>
          t.trainerId === parsed.data.trainerId &&
          (parsed.data.lessonRef ? t.lessonRef === parsed.data.lessonRef : true),
      );
      if (!target) {
        return res.status(403).json({
          success: false,
          error: "이 트레이너에 대해 작성 가능한 완료 수업이 없습니다. (완료 후 14일 이내에만 가능)",
        });
      }
      const existing = storage.listTrainerReviews({ authorId: user.id, trainerId: parsed.data.trainerId, includeHidden: true });
      const duplicate = existing.find(
        (r) =>
          (parsed.data.lessonRef && r.lessonRef === parsed.data.lessonRef) ||
          (parsed.data.courseId && r.courseId === parsed.data.courseId) ||
          (!parsed.data.lessonRef && !parsed.data.courseId && r.trainerId === parsed.data.trainerId),
      );
      if (duplicate) {
        return res.status(409).json({ success: false, error: "이미 해당 수업에 리뷰를 작성하셨습니다." });
      }

      const review = storage.createTrainerReview(parsed.data, user);
      try {
        await storage.createNotification?.({
          userId: parsed.data.trainerId,
          title: "새 리뷰가 등록되었습니다",
          message: `${user.name || "보호자"}님이 별점 ${parsed.data.rating}점 리뷰를 남겼습니다.`,
          type: "review",
          actionUrl: "/trainer/reviews",
        });
      } catch { /* noop */ }
      res.json({ success: true, review });
    } catch (error) {
      console.error("[trainerReviews] create 오류:", error);
      res.status(500).json({ success: false, error: "리뷰 작성 중 오류가 발생했습니다." });
    }
  });

  // 리뷰 목록 조회 (공개; 트레이너 세션이고 trainerId 미지정이면 본인 기준)
  app.get("/api/trainer-reviews", async (req: Request, res: Response) => {
    try {
      let trainerId = req.query.trainerId ? parseInt(req.query.trainerId as string, 10) : undefined;
      const authorId = req.query.authorId ? parseInt(req.query.authorId as string, 10) : undefined;
      const includeHidden = req.query.includeHidden === "true";
      const user = getSessionUser(req);
      const isAdmin = user?.role === "admin";
      if (!trainerId && user?.role === "trainer") {
        trainerId = user.id;
      }

      // 공개 호출은 반드시 trainerId(또는 본인 authorId)로 범위가 지정되어야 함.
      // 전체 목록 조회는 관리자만 허용.
      if (!trainerId && !isAdmin) {
        const isSelfAuthor = authorId && user?.id === authorId;
        if (!isSelfAuthor) {
          return res.status(400).json({
            success: false,
            error: "trainerId가 필요합니다.",
          });
        }
      }

      const reviews = storage.listTrainerReviews({
        trainerId,
        authorId,
        includeHidden: includeHidden && isAdmin,
      });
      res.json({ success: true, reviews, total: reviews.length });
    } catch (error) {
      console.error("[trainerReviews] list 오류:", error);
      res.status(500).json({ success: false, error: "리뷰 목록 조회 중 오류가 발생했습니다." });
    }
  });

  // 트레이너 평점 요약 (공개)
  app.get("/api/trainer-reviews/summary/:trainerId", async (req: Request, res: Response) => {
    try {
      const trainerId = parseInt(req.params.trainerId, 10);
      if (isNaN(trainerId)) return res.status(400).json({ success: false, error: "올바른 trainerId가 필요합니다." });
      const summary = storage.getTrainerReviewSummary(trainerId);
      res.json({ success: true, ...summary });
    } catch (error) {
      console.error("[trainerReviews] summary 오류:", error);
      res.status(500).json({ success: false, error: "평점 조회 중 오류가 발생했습니다." });
    }
  });

  // 작성 가능한 수업 (수업 완료 후 N일 이내, 보호자 전용)
  app.get("/api/trainer-reviews/eligible", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = authed(req);
      const eligible = storage.getEligibleReviewTargets(user.id);
      res.json({ success: true, eligible });
    } catch (error) {
      console.error("[trainerReviews] eligible 오류:", error);
      res.status(500).json({ success: false, error: "수업 정보 조회 중 오류가 발생했습니다." });
    }
  });

  // 리뷰 답글 (트레이너 본인, 1회)
  app.post("/api/trainer-reviews/:id/reply", requireRole("trainer", "admin"), async (req: Request, res: Response) => {
    try {
      const user = authed(req);
      const reviewId = parseInt(req.params.id, 10);
      const review = storage.getTrainerReviewById(reviewId);
      if (!review) return res.status(404).json({ success: false, error: "리뷰를 찾을 수 없습니다." });
      if (user.role === "trainer" && review.trainerId !== user.id) {
        return res.status(403).json({ success: false, error: "본인 리뷰에만 답글을 달 수 있습니다." });
      }
      const existing = storage.getTrainerReviewReply(reviewId);
      if (existing) return res.status(409).json({ success: false, error: "이미 답글을 작성했습니다." });

      const parsed = insertTrainerReviewReplySchema.safeParse({
        reviewId,
        trainerId: review.trainerId,
        content: req.body.content,
      });
      if (!parsed.success) return res.status(400).json({ success: false, error: "내용이 올바르지 않습니다." });

      const reply = storage.createTrainerReviewReply(parsed.data);
      try {
        await storage.createNotification?.({
          userId: review.authorId,
          title: "트레이너가 답글을 남겼습니다",
          message: parsed.data.content.slice(0, 80),
          type: "review",
          actionUrl: `/reviews/write`,
        });
      } catch { /* noop */ }
      res.json({ success: true, reply });
    } catch (error) {
      console.error("[trainerReviews] reply 오류:", error);
      res.status(500).json({ success: false, error: "답글 작성 중 오류가 발생했습니다." });
    }
  });

  // 리뷰 신고 (로그인 사용자)
  app.post("/api/trainer-reviews/:id/report", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = authed(req);
      const reviewId = parseInt(req.params.id, 10);
      const review = storage.getTrainerReviewById(reviewId);
      if (!review) return res.status(404).json({ success: false, error: "리뷰를 찾을 수 없습니다." });

      const parsed = insertTrainerReviewReportSchema.safeParse({
        reviewId,
        reporterId: user.id,
        reason: req.body.reason,
        description: req.body.description,
      });
      if (!parsed.success) return res.status(400).json({ success: false, error: "신고 정보가 올바르지 않습니다.", details: parsed.error.flatten() });

      const report = storage.createTrainerReviewReport(parsed.data);
      res.json({ success: true, report });
    } catch (error) {
      console.error("[trainerReviews] report 오류:", error);
      res.status(500).json({ success: false, error: "신고 중 오류가 발생했습니다." });
    }
  });

  // 관리자: 리뷰 + 신고 목록
  app.get("/api/admin/trainer-reviews", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const status = (req.query.status as string) || undefined;
      const result = storage.adminListTrainerReviews({ status });
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("[trainerReviews] admin list 오류:", error);
      res.status(500).json({ success: false, error: "관리자 리뷰 조회 중 오류가 발생했습니다." });
    }
  });

  // 관리자: 리뷰 숨김/복원/삭제
  app.patch("/api/admin/trainer-reviews/:id", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const user = authed(req);
      const reviewId = parseInt(req.params.id, 10);
      const { action, reason } = req.body as { action: "hide" | "restore" | "delete"; reason?: string };
      if (!["hide", "restore", "delete"].includes(action)) {
        return res.status(400).json({ success: false, error: "지원하지 않는 작업입니다." });
      }
      const updated = storage.adminModerateTrainerReview(reviewId, action, reason, user.id);
      if (!updated) return res.status(404).json({ success: false, error: "리뷰를 찾을 수 없습니다." });
      res.json({ success: true, review: updated });
    } catch (error) {
      console.error("[trainerReviews] moderate 오류:", error);
      res.status(500).json({ success: false, error: "처리 중 오류가 발생했습니다." });
    }
  });

  // 관리자: 신고 처리
  app.patch("/api/admin/trainer-reviews/reports/:id", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const user = authed(req);
      const reportId = parseInt(req.params.id, 10);
      const { status } = req.body as { status: "reviewed" | "dismissed" };
      if (!["reviewed", "dismissed"].includes(status)) {
        return res.status(400).json({ success: false, error: "올바른 상태가 아닙니다." });
      }
      const updated = storage.adminUpdateTrainerReviewReport(reportId, status, user.id);
      if (!updated) return res.status(404).json({ success: false, error: "신고를 찾을 수 없습니다." });
      res.json({ success: true, report: updated });
    } catch (error) {
      console.error("[trainerReviews] report update 오류:", error);
      res.status(500).json({ success: false, error: "처리 중 오류가 발생했습니다." });
    }
  });
}

export default registerTrainerReviewRoutes;
