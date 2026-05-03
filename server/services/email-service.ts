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

const SENDGRID_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "no-reply@talez.app";
const FROM_NAME = process.env.SENDGRID_FROM_NAME || "TALEZ";
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 60_000;

if (SENDGRID_KEY) {
  sgMail.setApiKey(SENDGRID_KEY);
  console.log("✅ SendGrid 초기화 완료");
} else {
  console.warn("⚠️ SENDGRID_API_KEY 미설정 - 이메일은 큐에만 적재됩니다");
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

let initialized = false;
let queueTimer: NodeJS.Timeout | null = null;

export async function ensureEmailSystemInitialized(): Promise<void> {
  if (initialized) return;
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
          console.error("[email] retry queue error", err)
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
      console.error("[email] immediate deliver failed", err)
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
    await db
      .update(emailLogs)
      .set({
        status: "failed",
        lastError: "SENDGRID_API_KEY 미설정",
        attempts: (log.attempts || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(emailLogs.id, logId));
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
  } catch (err: any) {
    const attempts = (log.attempts || 0) + 1;
    const failed = attempts >= MAX_ATTEMPTS;
    await db
      .update(emailLogs)
      .set({
        status: failed ? "failed" : "queued",
        attempts,
        lastError: err?.message || String(err),
        updatedAt: new Date(),
      })
      .where(eq(emailLogs.id, logId));
    console.error(`[email] 발송 실패 (logId=${logId}, attempts=${attempts}):`, err?.message);
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
};

export interface ListLogsQuery {
  status?: string;
  templateKey?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function listEmailLogs(q: ListLogsQuery = {}) {
  const conds: any[] = [];
  if (q.status) conds.push(eq(emailLogs.status, q.status));
  if (q.templateKey) conds.push(eq(emailLogs.templateKey, q.templateKey));
  if (q.search) conds.push(ilike(emailLogs.recipient, `%${q.search}%`));
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
