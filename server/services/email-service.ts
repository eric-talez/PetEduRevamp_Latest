import sgMail from "@sendgrid/mail";
import { db } from "../db";
import { eq, and, desc, sql, ilike, or } from "drizzle-orm";
import {
  emailTemplates,
  emailLogs,
  emailNotificationPreferences,
  users,
  EMAIL_CATEGORIES,
  type EmailCategory,
  type EmailTemplate,
  type EmailLog,
} from "../../shared/schema";
import { logServerError } from '../middleware/audit-logger';

const SENDGRID_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL_RAW = process.env.SENDGRID_FROM_EMAIL;
const FROM_EMAIL = SENDGRID_FROM_EMAIL_RAW || "no-reply@talez.app";
const FROM_NAME = process.env.SENDGRID_FROM_NAME || "TALEZ";
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 60_000;
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const FAILURE_ALERT_THRESHOLD = 5;
const FAILURE_ALERT_COOLDOWN_MS = 30 * 60_000;

const configWarnings: string[] = [];
if (!SENDGRID_KEY) {
  configWarnings.push("SENDGRID_API_KEY 미설정");
}
if (!SENDGRID_FROM_EMAIL_RAW) {
  configWarnings.push("SENDGRID_FROM_EMAIL 미설정 (기본 발신자 사용)");
}

if (SENDGRID_KEY) {
  sgMail.setApiKey(SENDGRID_KEY);
  console.log("✅ SendGrid 초기화 완료");
} else if (IS_PRODUCTION) {
  console.error(
    "❌ [PROD] SENDGRID_API_KEY 미설정 - 이메일이 발송되지 않습니다. 즉시 키를 설정하세요."
  );
} else {
  console.warn("⚠️ SENDGRID_API_KEY 미설정 - 이메일은 큐에만 적재됩니다");
}

if (IS_PRODUCTION && !SENDGRID_FROM_EMAIL_RAW) {
  console.error(
    "❌ [PROD] SENDGRID_FROM_EMAIL 미설정 - 발신자 도메인 인증 누락 위험. 즉시 설정하세요."
  );
}

interface EmailFailureSample {
  at: Date;
  recipient: string;
  templateKey: string;
  error: string;
}

const failureState = {
  consecutiveFailures: 0,
  totalFailuresSinceBoot: 0,
  totalSentSinceBoot: 0,
  lastFailureAt: null as Date | null,
  lastSuccessAt: null as Date | null,
  lastAlertAt: null as Date | null,
  recentFailures: [] as EmailFailureSample[],
  criticalActive: false,
};

export interface EmailServiceStatus {
  configured: boolean;
  apiKeyPresent: boolean;
  fromEmailConfigured: boolean;
  fromEmail: string;
  environment: string;
  warnings: string[];
  consecutiveFailures: number;
  totalFailuresSinceBoot: number;
  totalSentSinceBoot: number;
  lastFailureAt: string | null;
  lastSuccessAt: string | null;
  lastAlertAt: string | null;
  recentFailures: Array<{ at: string; recipient: string; templateKey: string; error: string }>;
  critical: boolean;
  failureAlertThreshold: number;
}

export function getEmailServiceStatus(): EmailServiceStatus {
  const critical =
    (IS_PRODUCTION && (!SENDGRID_KEY || !SENDGRID_FROM_EMAIL_RAW)) ||
    failureState.criticalActive;
  return {
    configured: Boolean(SENDGRID_KEY),
    apiKeyPresent: Boolean(SENDGRID_KEY),
    fromEmailConfigured: Boolean(SENDGRID_FROM_EMAIL_RAW),
    fromEmail: FROM_EMAIL,
    environment: process.env.NODE_ENV || "development",
    warnings: configWarnings.slice(),
    consecutiveFailures: failureState.consecutiveFailures,
    totalFailuresSinceBoot: failureState.totalFailuresSinceBoot,
    totalSentSinceBoot: failureState.totalSentSinceBoot,
    lastFailureAt: failureState.lastFailureAt?.toISOString() || null,
    lastSuccessAt: failureState.lastSuccessAt?.toISOString() || null,
    lastAlertAt: failureState.lastAlertAt?.toISOString() || null,
    recentFailures: failureState.recentFailures.map((f) => ({
      at: f.at.toISOString(),
      recipient: f.recipient,
      templateKey: f.templateKey,
      error: f.error,
    })),
    critical,
    failureAlertThreshold: FAILURE_ALERT_THRESHOLD,
  };
}

async function notifyAdminsOfEmailFailure(reason: string): Promise<void> {
  try {
    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"));
    if (admins.length === 0) {
      console.error("[email] 관리자 알림 실패: 관리자 사용자가 없습니다");
      return;
    }
    const { notificationService } = await import("../notifications/notification-service");
    for (const a of admins) {
      try {
        await notificationService.sendNotification({
          userId: a.id,
          type: "system",
          title: "⚠️ 이메일 발송 장애 감지",
          message: reason,
          actionUrl: "/admin/email-notifications",
          data: { source: "email-service", severity: "critical" },
        });
      } catch (err) {
        logServerError(`[email] 관리자(id=${a.id}) 알림 전송 실패`, err);
      }
    }
    console.error(`🚨 [email] 관리자 ${admins.length}명에게 발송 장애 알림 전송: ${reason}`);
  } catch (err) {
    logServerError("[email] 관리자 알림 처리 중 오류", err);
  }
}

function recordSendSuccess(): void {
  failureState.consecutiveFailures = 0;
  failureState.totalSentSinceBoot += 1;
  failureState.lastSuccessAt = new Date();
  if (failureState.criticalActive) {
    failureState.criticalActive = false;
    console.log("✅ [email] 발송이 정상화되어 critical 상태가 해제되었습니다");
  }
}

function recordSendFailure(sample: EmailFailureSample): void {
  failureState.consecutiveFailures += 1;
  failureState.totalFailuresSinceBoot += 1;
  failureState.lastFailureAt = sample.at;
  failureState.recentFailures.unshift(sample);
  if (failureState.recentFailures.length > 10) {
    failureState.recentFailures.length = 10;
  }
  const now = Date.now();
  const cooled =
    !failureState.lastAlertAt ||
    now - failureState.lastAlertAt.getTime() > FAILURE_ALERT_COOLDOWN_MS;
  if (failureState.consecutiveFailures >= FAILURE_ALERT_THRESHOLD && cooled) {
    failureState.lastAlertAt = new Date();
    failureState.criticalActive = true;
    void notifyAdminsOfEmailFailure(
      `최근 ${failureState.consecutiveFailures}건 연속 이메일 발송 실패. 마지막 오류: ${sample.error}`
    );
  }
}

const DEFAULT_TEMPLATES: Array<{
  key: string;
  category: EmailCategory;
  name: string;
  subject: string;
  bodyHtml: string;
  description: string;
  variables: Record<string, string>;
}> = [
  {
    key: "welcome",
    category: "welcome",
    name: "회원가입 환영",
    subject: "[TALEZ] {{name}}님, 가입을 환영합니다 🐾",
    bodyHtml:
      "<h2>{{name}}님, 환영합니다!</h2><p>TALEZ에 가입해주셔서 감사합니다. 반려동물과 함께하는 멋진 여정을 시작해보세요.</p>",
    description: "신규 회원 가입 시 발송",
    variables: { name: "사용자 이름" },
  },
  {
    key: "booking_confirmed",
    category: "booking_confirmed",
    name: "예약 확정 알림",
    subject: "[TALEZ] 예약이 확정되었습니다 - {{courseTitle}}",
    bodyHtml:
      "<h2>예약이 확정되었습니다</h2><p>{{name}}님, <b>{{courseTitle}}</b> 예약이 확정되었습니다.</p><p>일정: {{scheduledAt}}</p>",
    description: "강의/수업 예약 확정 시 발송",
    variables: {
      name: "사용자 이름",
      courseTitle: "수업/강의명",
      scheduledAt: "수업 일시",
    },
  },
  {
    key: "lesson_reminder_d1",
    category: "lesson_reminder_d1",
    name: "수업 D-1 리마인드",
    subject: "[TALEZ] 내일 수업이 있어요 - {{courseTitle}}",
    bodyHtml:
      "<h2>내일 수업 안내</h2><p>{{name}}님, 내일 <b>{{courseTitle}}</b> 수업이 있습니다.</p><p>시간: {{scheduledAt}}</p>",
    description: "수업 시작 D-1 자동 리마인드",
    variables: {
      name: "사용자 이름",
      courseTitle: "수업명",
      scheduledAt: "수업 일시",
    },
  },
  {
    key: "payment_receipt",
    category: "payment_receipt",
    name: "결제 영수증",
    subject: "[TALEZ] 결제 완료 영수증 - {{orderNumber}}",
    bodyHtml:
      "<h2>결제가 완료되었습니다</h2><p>주문번호: {{orderNumber}}</p><p>금액: {{amount}}원</p><p>감사합니다.</p>",
    description: "결제 성공 시 발송",
    variables: { orderNumber: "주문번호", amount: "결제금액" },
  },
  {
    key: "payment_failed",
    category: "payment_failed",
    name: "결제 실패 알림",
    subject: "[TALEZ] 결제가 실패했습니다",
    bodyHtml:
      "<h2>결제 실패 안내</h2><p>{{name}}님의 결제가 실패하였습니다. 결제 수단을 확인 후 다시 시도해주세요.</p><p>사유: {{reason}}</p>",
    description: "결제 실패 시 발송",
    variables: { name: "사용자 이름", reason: "실패 사유" },
  },
  {
    key: "review_request",
    category: "review_request",
    name: "리뷰 작성 요청",
    subject: "[TALEZ] {{name}}님, {{trainerName}} 트레이너에 대한 후기를 남겨주세요",
    bodyHtml:
      "<h2>수업이 완료되었어요!</h2><p>{{name}}님, <b>{{trainerName}}</b> 트레이너의 수업은 어떠셨나요?</p><p>{{petName}}와 함께한 소중한 경험을 다른 보호자에게 공유해주세요.</p><p><a href=\"{{actionUrl}}\">리뷰 작성하기</a></p><p style=\"color:#888;font-size:12px\">완료 후 14일 이내에만 작성하실 수 있어요.</p>",
    description: "수업/훈련 완료 시 보호자에게 리뷰 요청 자동 발송",
    variables: {
      name: "보호자 이름",
      trainerName: "트레이너 이름",
      petName: "반려동물 이름",
      actionUrl: "리뷰 작성 링크",
    },
  },
  {
    key: "course_completion_certificate",
    category: "review_request",
    name: "수료증 발급 안내",
    subject: "[TALEZ] {{courseTitle}} 수료를 축하합니다 - 수료증 첨부",
    bodyHtml:
      "<h2>{{name}}님, 수료를 축하드립니다 🎉</h2><p><b>{{courseTitle}}</b> 과정을 모두 이수하셨습니다.</p><p>수료증 PDF를 본 메일에 첨부해 드렸습니다. 다운로드하여 보관해 주세요.</p><ul><li>수료증 번호: {{certificateNo}}</li><li>수료일: {{completedAt}}</li><li>담당 트레이너: {{trainerName}}</li></ul><p>앞으로도 {{petName}}와의 멋진 여정을 응원합니다.</p>",
    description: "코스 수료 확정 시 수료증 PDF 첨부 발송",
    variables: {
      name: "보호자 이름",
      courseTitle: "코스명",
      certificateNo: "수료증 번호",
      completedAt: "수료일",
      trainerName: "트레이너 이름",
      petName: "반려동물 이름",
    },
  },
  {
    key: "notebook_weekly_report",
    category: "notebook_weekly_report",
    name: "알림장 주간 리포트",
    subject: "[TALEZ] {{petName}} {{periodLabel}} 알림장 리포트가 도착했어요",
    bodyHtml:
      "<h2>{{name}}님, {{petName}}의 한 주 훈련 기록이에요 🐾</h2>"
      + "<p>이번 주({{periodKey}}) 작성된 알림장 <b>{{journalCount}}건</b>, 숙제 완료 {{homeworkCompleted}}/{{homeworkTotal}}, 담당 트레이너: {{trainerNames}}.</p>"
      + "<p>첨부된 PDF 리포트를 열어 자세한 내용을 확인해보세요.</p>"
      + "<p><a href=\"{{viewUrl}}\" style=\"display:inline-block;padding:10px 18px;background:#0F766E;color:#fff;border-radius:6px;text-decoration:none;\">알림장 자세히 보기</a></p>"
      + "<p style=\"font-size:12px;color:#6B7280;margin-top:32px;\">자동 발송이 더 이상 필요하지 않으시면 <a href=\"{{unsubscribeUrl}}\">설정에서 구독을 해지</a>할 수 있어요.</p>",
    description: "매주 월요일 오전 9시(KST) 자동 발송되는 주간 알림장 리포트",
    variables: {
      name: "보호자 이름",
      petName: "반려동물 이름",
      periodKey: "주차 키",
      periodLabel: "기간 라벨",
      journalCount: "알림장 수",
      trainerNames: "담당 트레이너",
      homeworkCompleted: "완료한 숙제 수",
      homeworkTotal: "전체 숙제 수",
      viewUrl: "알림장 자세히 보기 링크",
      unsubscribeUrl: "구독 해지 링크",
    },
  },
  {
    key: "notebook_monthly_report",
    category: "notebook_monthly_report",
    name: "알림장 월간 리포트",
    subject: "[TALEZ] {{petName}} {{periodLabel}} 알림장 리포트가 도착했어요",
    bodyHtml:
      "<h2>{{name}}님, {{petName}}의 지난 달 훈련 기록이에요 🐾</h2>"
      + "<p>지난 달({{periodKey}}) 작성된 알림장 <b>{{journalCount}}건</b>, 숙제 완료 {{homeworkCompleted}}/{{homeworkTotal}}, 담당 트레이너: {{trainerNames}}.</p>"
      + "<p>첨부된 PDF 리포트를 열어 한 달 진행 상황을 확인해보세요.</p>"
      + "<p><a href=\"{{viewUrl}}\" style=\"display:inline-block;padding:10px 18px;background:#0F766E;color:#fff;border-radius:6px;text-decoration:none;\">알림장 자세히 보기</a></p>"
      + "<p style=\"font-size:12px;color:#6B7280;margin-top:32px;\">자동 발송이 더 이상 필요하지 않으시면 <a href=\"{{unsubscribeUrl}}\">설정에서 구독을 해지</a>할 수 있어요.</p>",
    description: "매월 1일 오전 9시(KST) 자동 발송되는 월간 알림장 리포트",
    variables: {
      name: "보호자 이름",
      petName: "반려동물 이름",
      periodKey: "월 키",
      periodLabel: "기간 라벨",
      journalCount: "알림장 수",
      trainerNames: "담당 트레이너",
      homeworkCompleted: "완료한 숙제 수",
      homeworkTotal: "전체 숙제 수",
      viewUrl: "알림장 자세히 보기 링크",
      unsubscribeUrl: "구독 해지 링크",
    },
  },
  {
    key: "vertex_ai_search_status_alert",
    category: "system",
    name: "Vertex AI Search 상태 변경 알림",
    subject: "[TALEZ] Vertex AI Search 공급자 상태 변경: {{currentLabel}}",
    bodyHtml:
      "<h2>Vertex AI Search 공급자 상태가 변경되었습니다</h2>"
      + "<p>반려견 행사 자동 수집의 Vertex AI Search 공급자 상태가 직전 회 실행과 달라졌습니다.</p>"
      + "<ul>"
      + "<li>이전 상태: <b>{{previousLabel}}</b></li>"
      + "<li>현재 상태: <b>{{currentLabel}}</b></li>"
      + "<li>감지 시각(KST): {{detectedAtKst}}</li>"
      + "</ul>"
      + "<p>{{guidance}}</p>"
      + "<p><a href=\"{{actionUrl}}\">관리자 페이지에서 자세히 보기</a></p>",
    description: "Vertex AI Search 공급자 상태가 active↔비활성으로 전이될 때 관리자에게 발송",
    variables: {
      previousLabel: "직전 상태",
      currentLabel: "현재 상태",
      detectedAtKst: "감지 시각",
      guidance: "조치 가이드",
      actionUrl: "관리자 페이지 링크",
    },
  },
  {
    key: "settlement_deadline",
    category: "settlement_deadline",
    name: "정산 마감 안내",
    subject: "[TALEZ] 정산 마감 안내 - {{period}}",
    bodyHtml:
      "<h2>정산 마감 안내</h2><p>{{name}} 트레이너님, {{period}} 정산이 곧 마감됩니다.</p><p>금액: {{amount}}원</p>",
    description: "트레이너 정산 마감 안내",
    variables: { name: "트레이너 이름", period: "정산 기간", amount: "정산 금액" },
  },
];

export interface EmailAttachment {
  content: string; // base64
  filename: string;
  type: string;
  disposition?: string;
}

export type AttachmentBuilder = (
  vars: Record<string, any>,
  log: EmailLog,
) => Promise<EmailAttachment[]>;

const attachmentBuilders = new Map<string, AttachmentBuilder>();

// 첨부파일이 반드시 동봉되어야 하는 템플릿 키 집합.
// 빌더가 등록되지 않은 상태로는 절대 발송되지 않는다.
export const REQUIRED_ATTACHMENT_TEMPLATES = new Set<string>([
  "course_completion_certificate",
  "notebook_weekly_report",
  "notebook_monthly_report",
]);

export function registerAttachmentBuilder(
  templateKey: string,
  builder: AttachmentBuilder,
): void {
  attachmentBuilders.set(templateKey, builder);
}

let initialized = false;
let queueTimer: NodeJS.Timeout | null = null;

export async function ensureEmailSystemInitialized(): Promise<void> {
  if (initialized) return;
  // 첨부파일 빌더가 필요한 알림 모듈을 우선 로드하여
  // 템플릿 시드 실패와 무관하게 deliver 시점에 빌더가 항상 등록되어 있도록 보장.
  try {
    await import("./certificate-email-notifier");
  } catch (err) {
    console.warn(
      "[email] attachment notifier 로드 실패:",
      (err as Error).message,
    );
  }
  try {
    await import("./notebook-report-notifier");
  } catch (err) {
    console.warn(
      "[email] notebook-report notifier 로드 실패:",
      (err as Error).message,
    );
  }
  // 누락 시 라우트가 unhandledRejection 으로 서버를 죽이는 것을 방지하기 위해
  // 핵심 이메일 테이블이 없으면 즉석에서 생성한다 (Drizzle 마이그레이션 미적용 환경 대비)
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_templates (
        id serial PRIMARY KEY,
        key varchar(80) NOT NULL UNIQUE,
        name varchar(200) NOT NULL,
        category varchar(50) NOT NULL,
        subject varchar(300) NOT NULL,
        body_html text,
        sendgrid_template_id varchar(100),
        enabled boolean DEFAULT true,
        variables jsonb,
        description text,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_notification_preferences (
        id serial PRIMARY KEY,
        user_id integer NOT NULL,
        category varchar(50) NOT NULL,
        enabled boolean DEFAULT true,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_logs (
        id serial PRIMARY KEY,
        user_id integer,
        recipient varchar(255) NOT NULL,
        template_key varchar(80) NOT NULL,
        subject varchar(300),
        payload jsonb,
        status varchar(30) DEFAULT 'queued',
        attempts integer DEFAULT 0,
        last_error text,
        provider_message_id varchar(200),
        scheduled_for timestamp,
        sent_at timestamp,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
  } catch (err) {
    console.warn("[email] table ensure 실패:", (err as Error).message);
  }
  try {
    for (const t of DEFAULT_TEMPLATES) {
      const existing = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.key, t.key))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(emailTemplates).values({
          key: t.key,
          name: t.name,
          category: t.category,
          subject: t.subject,
          bodyHtml: t.bodyHtml,
          description: t.description,
          variables: t.variables as any,
          enabled: true,
        });
      }
    }
    initialized = true;
    if (!queueTimer) {
      queueTimer = setInterval(() => {
        processRetryQueue().catch((err) =>
          logServerError("[email] retry queue error", err)
        );
      }, RETRY_DELAY_MS);
    }
    console.log("✅ 이메일 시스템 초기화 완료");
  } catch (err) {
    console.warn("[email] initialization warning:", (err as Error).message);
  }
}

function renderTemplate(text: string, vars: Record<string, any> = {}): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, name) => {
    const v = vars[name];
    return v === undefined || v === null ? "" : String(v);
  });
}

export async function getTemplateByKey(key: string): Promise<EmailTemplate | null> {
  const rows = await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.key, key))
    .limit(1);
  return rows[0] || null;
}

export async function getUserPreferenceEnabled(
  userId: number,
  category: string
): Promise<boolean> {
  const rows = await db
    .select()
    .from(emailNotificationPreferences)
    .where(
      and(
        eq(emailNotificationPreferences.userId, userId),
        eq(emailNotificationPreferences.category, category)
      )
    )
    .limit(1);
  if (rows.length === 0) return true; // opt-out 모델: 기본 동의
  return rows[0].enabled !== false;
}

export interface SendEmailOptions {
  templateKey: string;
  userId?: number | null;
  to?: string;
  variables?: Record<string, any>;
  bypassPreference?: boolean;
  scheduledFor?: Date;
}

export async function queueEmail(opts: SendEmailOptions): Promise<EmailLog> {
  await ensureEmailSystemInitialized();
  const template = await getTemplateByKey(opts.templateKey);
  if (!template) {
    throw new Error(`이메일 템플릿이 존재하지 않습니다: ${opts.templateKey}`);
  }

  let recipient = opts.to || "";
  if (!recipient && opts.userId) {
    const u = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, opts.userId))
      .limit(1);
    recipient = u[0]?.email || "";
  }
  if (!recipient) {
    throw new Error("수신자 이메일을 찾을 수 없습니다");
  }

  let status: string = "queued";
  let skipReason: string | null = null;

  if (!template.enabled) {
    status = "skipped";
    skipReason = "템플릿 비활성화";
  } else if (
    !opts.bypassPreference &&
    opts.userId &&
    !(await getUserPreferenceEnabled(opts.userId, template.category))
  ) {
    status = "skipped";
    skipReason = "사용자 수신거부";
  }

  const subject = renderTemplate(template.subject, opts.variables);
  const [log] = await db
    .insert(emailLogs)
    .values({
      userId: opts.userId ?? null,
      recipient,
      templateKey: template.key,
      subject,
      payload: opts.variables ?? {},
      status,
      attempts: 0,
      lastError: skipReason,
      scheduledFor: opts.scheduledFor ?? null,
    })
    .returning();

  if (status === "queued" && (!opts.scheduledFor || opts.scheduledFor <= new Date())) {
    await deliver(log.id).catch((err) =>
      logServerError("[email] immediate deliver failed", err)
    );
  }
  return log;
}

async function deliver(logId: number): Promise<void> {
  const rows = await db.select().from(emailLogs).where(eq(emailLogs.id, logId)).limit(1);
  const log = rows[0];
  if (!log || log.status === "sent") return;

  const template = await getTemplateByKey(log.templateKey);
  if (!template) {
    await db
      .update(emailLogs)
      .set({ status: "failed", lastError: "템플릿 없음", updatedAt: new Date() })
      .where(eq(emailLogs.id, logId));
    return;
  }

  const vars = (log.payload as Record<string, any>) || {};
  const subject = renderTemplate(template.subject, vars);
  const html = renderTemplate(template.bodyHtml || "", vars);

  if (!SENDGRID_KEY) {
    const errMsg = "SENDGRID_API_KEY 미설정";
    await db
      .update(emailLogs)
      .set({
        status: "failed",
        lastError: errMsg,
        attempts: (log.attempts || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(emailLogs.id, logId));
    recordSendFailure({
      at: new Date(),
      recipient: log.recipient,
      templateKey: log.templateKey,
      error: errMsg,
    });
    return;
  }

  try {
    const msg: any = {
      to: log.recipient,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      html,
    };
    if (template.sendgridTemplateId) {
      msg.templateId = template.sendgridTemplateId;
      msg.dynamicTemplateData = vars;
    }
    const builder = attachmentBuilders.get(log.templateKey);
    if (builder) {
      const atts = await builder(vars, log);
      if (atts && atts.length > 0) {
        msg.attachments = atts.map((a) => ({
          content: a.content,
          filename: a.filename,
          type: a.type,
          disposition: a.disposition || "attachment",
        }));
      }
    } else if (REQUIRED_ATTACHMENT_TEMPLATES.has(log.templateKey)) {
      // 첨부 파일이 필수인 템플릿인데 빌더가 등록되지 않은 경우(예: 모듈 로드 실패)
      // 첨부 없이 발송되는 사고를 막기 위해 명시적으로 실패 처리하여 retry 큐에 남긴다.
      const errMsg = `필수 첨부 빌더 미등록: ${log.templateKey}`;
      const attempts = (log.attempts || 0) + 1;
      const failed = attempts >= MAX_ATTEMPTS;
      await db
        .update(emailLogs)
        .set({
          status: failed ? "failed" : "queued",
          attempts,
          lastError: errMsg,
          updatedAt: new Date(),
        })
        .where(eq(emailLogs.id, logId));
      logServerError(`[email] 첨부 빌더 미등록으로 발송 보류 (logId=${logId}):`, errMsg);
      return;
    }
    const [resp] = await sgMail.send(msg);
    const messageId =
      (resp.headers as any)?.["x-message-id"] || (resp.headers as any)?.["X-Message-Id"];
    await db
      .update(emailLogs)
      .set({
        status: "sent",
        attempts: (log.attempts || 0) + 1,
        sentAt: new Date(),
        providerMessageId: messageId || null,
        lastError: null,
        subject,
        updatedAt: new Date(),
      })
      .where(eq(emailLogs.id, logId));
    recordSendSuccess();
  } catch (err: any) {
    const attempts = (log.attempts || 0) + 1;
    const failed = attempts >= MAX_ATTEMPTS;
    const errMsg = err?.message || String(err);
    await db
      .update(emailLogs)
      .set({
        status: failed ? "failed" : "queued",
        attempts,
        lastError: errMsg,
        updatedAt: new Date(),
      })
      .where(eq(emailLogs.id, logId));
    logServerError(`[email] 발송 실패 (logId=${logId}, attempts=${attempts}):`, errMsg);
    if (failed) {
      recordSendFailure({
        at: new Date(),
        recipient: log.recipient,
        templateKey: log.templateKey,
        error: errMsg,
      });
    }
  }
}

export async function processRetryQueue(): Promise<number> {
  const now = new Date();
  const due = await db
    .select()
    .from(emailLogs)
    .where(eq(emailLogs.status, "queued"))
    .limit(20);
  let processed = 0;
  for (const log of due) {
    if (log.scheduledFor && log.scheduledFor > now) continue;
    if ((log.attempts || 0) >= MAX_ATTEMPTS) continue;
    await deliver(log.id);
    processed++;
  }
  return processed;
}

export async function resendEmail(logId: number): Promise<void> {
  await db
    .update(emailLogs)
    .set({ status: "queued", lastError: null, attempts: 0, updatedAt: new Date() })
    .where(eq(emailLogs.id, logId));
  await deliver(logId);
}

// 트리거 헬퍼들
export const emailTriggers = {
  welcome: (userId: number, name: string) =>
    queueEmail({ templateKey: "welcome", userId, variables: { name } }),
  bookingConfirmed: (userId: number, vars: Record<string, any>) =>
    queueEmail({ templateKey: "booking_confirmed", userId, variables: vars }),
  lessonReminderD1: (userId: number, vars: Record<string, any>, sendAt?: Date) =>
    queueEmail({
      templateKey: "lesson_reminder_d1",
      userId,
      variables: vars,
      scheduledFor: sendAt,
    }),
  paymentReceipt: (userId: number, vars: Record<string, any>) =>
    queueEmail({ templateKey: "payment_receipt", userId, variables: vars }),
  paymentFailed: (userId: number, vars: Record<string, any>) =>
    queueEmail({ templateKey: "payment_failed", userId, variables: vars }),
  settlementDeadline: (userId: number, vars: Record<string, any>) =>
    queueEmail({
      templateKey: "settlement_deadline",
      userId,
      variables: vars,
    }),
  reviewRequest: (userId: number, vars: Record<string, any>) =>
    queueEmail({
      templateKey: "review_request",
      userId,
      variables: vars,
    }),
};

export interface ListLogsQuery {
  status?: string;
  templateKey?: string;
  search?: string;
  trainerId?: number;
  limit?: number;
  offset?: number;
}

export async function listEmailLogs(q: ListLogsQuery = {}) {
  const conds: any[] = [];
  if (q.status) conds.push(eq(emailLogs.status, q.status));
  if (q.templateKey) conds.push(eq(emailLogs.templateKey, q.templateKey));
  if (q.search) conds.push(ilike(emailLogs.recipient, `%${q.search}%`));
  if (q.trainerId !== undefined && q.trainerId !== null) {
    conds.push(sql`${emailLogs.payload}->>'trainerId' = ${String(q.trainerId)}`);
  }
  const where = conds.length ? and(...conds) : undefined;
  const limit = Math.min(q.limit ?? 50, 200);
  const offset = q.offset ?? 0;
  const rows = where
    ? await db.select().from(emailLogs).where(where).orderBy(desc(emailLogs.createdAt)).limit(limit).offset(offset)
    : await db.select().from(emailLogs).orderBy(desc(emailLogs.createdAt)).limit(limit).offset(offset);
  const totalRows = where
    ? await db.select({ c: sql<number>`count(*)` }).from(emailLogs).where(where)
    : await db.select({ c: sql<number>`count(*)` }).from(emailLogs);
  return { logs: rows, total: Number(totalRows[0]?.c || 0) };
}

export async function previewTemplate(key: string, variables: Record<string, any> = {}) {
  const t = await getTemplateByKey(key);
  if (!t) throw new Error("템플릿을 찾을 수 없습니다");
  return {
    subject: renderTemplate(t.subject, variables),
    html: renderTemplate(t.bodyHtml || "", variables),
  };
}

export { EMAIL_CATEGORIES };
