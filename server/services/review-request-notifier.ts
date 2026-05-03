import { db } from "../db";
import { eq, and, sql, desc } from "drizzle-orm";
import {
  systemSettings,
  users,
  notifications as notificationsTable,
} from "../../shared/schema";
import { emailTriggers } from "./email-service";
import { logServerError } from "../middleware/audit-logger";

export const REVIEW_AUTO_NOTIFY_KEY = "review_auto_notification_enabled";
const REVIEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export async function isReviewAutoNotifyEnabled(): Promise<boolean> {
  try {
    const rows = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, REVIEW_AUTO_NOTIFY_KEY))
      .limit(1);
    if (rows.length === 0) return true;
    const v = (rows[0].value || "").toLowerCase();
    return v !== "false" && v !== "0" && v !== "off";
  } catch (err) {
    logServerError("[reviewNotify] setting lookup failed", err);
    return true;
  }
}

export interface TriggerReviewRequestParams {
  ownerId: number;
  ownerName?: string | null;
  trainerId: number;
  trainerName?: string | null;
  petId?: number | null;
  petName?: string | null;
  lessonRef?: string | null;
  courseId?: number | null;
  completedAt?: string | Date | null;
  storage: any;
}

/**
 * 수업/훈련 완료 시 보호자에게 리뷰 작성 요청 알림(인앱 + 이메일) 자동 발송.
 * - 관리자 설정으로 비활성화된 경우 스킵
 * - 완료 후 14일 경과 시 스킵
 * - 동일 lessonRef로 이미 리뷰가 작성된 경우 스킵
 * - 동일 lessonRef로 이미 리뷰 요청 알림이 발송된 경우 스킵 (중복 방지)
 */
export async function triggerReviewRequestNotification(
  params: TriggerReviewRequestParams,
): Promise<{ sent: boolean; reason?: string }> {
  try {
    const {
      ownerId,
      trainerId,
      trainerName,
      petName,
      lessonRef,
      courseId,
      completedAt,
      storage,
    } = params;

    if (!ownerId || !trainerId) return { sent: false, reason: "missing-ids" };

    const enabled = await isReviewAutoNotifyEnabled();
    if (!enabled) return { sent: false, reason: "admin-disabled" };

    const completedTs = completedAt
      ? new Date(completedAt).getTime()
      : Date.now();
    if (!isNaN(completedTs) && Date.now() - completedTs > REVIEW_WINDOW_MS) {
      return { sent: false, reason: "expired" };
    }

    // 이미 리뷰 작성된 경우 스킵
    try {
      const existingReviews = storage.listTrainerReviews?.({
        authorId: ownerId,
        trainerId,
        includeHidden: true,
      }) || [];
      const alreadyReviewed = existingReviews.find(
        (r: any) =>
          (lessonRef && r.lessonRef === lessonRef) ||
          (courseId && r.courseId === courseId),
      );
      if (alreadyReviewed) return { sent: false, reason: "already-reviewed" };
    } catch { /* noop */ }

    // 중복 알림 방지 1차: in-process 가드 (다중 인스턴스/재시작 시 부족)
    const guardKey = `${ownerId}:${trainerId}:${lessonRef || courseId || "default"}`;
    if (sentGuard.has(guardKey)) {
      return { sent: false, reason: "already-notified" };
    }
    // 중복 알림 방지 2차: DB 영속 - 동일 metadata 조합으로 발송된 review_reminder
    // 알림이 이미 존재하면 스킵 (멱등성)
    try {
      const prior = await db
        .select({ id: notificationsTable.id })
        .from(notificationsTable)
        .where(
          and(
            eq(notificationsTable.userId, ownerId),
            eq(notificationsTable.type, "review_reminder"),
            sql`${notificationsTable.metadata}->>'trainerId' = ${String(trainerId)}`,
            lessonRef
              ? sql`${notificationsTable.metadata}->>'lessonRef' = ${lessonRef}`
              : courseId
                ? sql`${notificationsTable.metadata}->>'courseId' = ${String(courseId)}`
                : sql`true`,
          ),
        )
        .orderBy(desc(notificationsTable.createdAt))
        .limit(1);
      if (prior.length > 0) {
        sentGuard.add(guardKey);
        return { sent: false, reason: "already-notified" };
      }
    } catch (err) {
      logServerError("[reviewNotify] dedupe lookup failed", err);
    }

    const ownerNameResolved =
      params.ownerName ||
      (await fetchUserName(ownerId)) ||
      "보호자";
    const trainerNameResolved =
      trainerName || (await fetchUserName(trainerId)) || "담당 트레이너";

    const actionUrl = "/reviews/write";
    const message = `${trainerNameResolved} 트레이너의 수업은 어떠셨나요? 소중한 후기를 남겨주세요.`;

    let inAppOk = false;
    let emailOk = false;

    try {
      await storage.createNotification?.({
        userId: ownerId,
        title: "훈련 수업이 완료되었어요!",
        message,
        type: "review_reminder",
        actionUrl,
        metadata: {
          trainerId,
          lessonRef: lessonRef || null,
          courseId: courseId || null,
        },
      });
      inAppOk = true;
    } catch (err) {
      logServerError("[reviewNotify] createNotification failed", err);
    }

    try {
      await emailTriggers.reviewRequest(ownerId, {
        name: ownerNameResolved,
        trainerName: trainerNameResolved,
        petName: petName || "반려동물",
        actionUrl,
      });
      emailOk = true;
    } catch (err) {
      logServerError("[reviewNotify] email queue failed", err);
    }

    // 적어도 한 채널 성공 시에만 in-process 가드 표시 (실패 시 재시도 허용)
    if (inAppOk || emailOk) {
      sentGuard.add(guardKey);
      return { sent: true };
    }
    return { sent: false, reason: "delivery-failed" };
  } catch (err) {
    logServerError("[reviewNotify] unexpected error", err);
    return { sent: false, reason: "error" };
  }
}

const sentGuard = new Set<string>();

async function fetchUserName(userId: number): Promise<string | null> {
  try {
    const rows = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return rows[0]?.name || null;
  } catch {
    return null;
  }
}

export async function setReviewAutoNotifyEnabled(enabled: boolean): Promise<void> {
  const value = enabled ? "true" : "false";
  await db
    .insert(systemSettings)
    .values({
      key: REVIEW_AUTO_NOTIFY_KEY,
      value,
      description: "수업 완료 시 보호자 리뷰 요청 알림 자동 발송 여부",
      category: "notifications",
      isActive: true,
    })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: { value, updatedAt: new Date() },
    });
}
