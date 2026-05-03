import { db } from "../db";
import { and, eq, sql } from "drizzle-orm";
import { emailLogs, users } from "../../shared/schema";
import { queueEmail, registerAttachmentBuilder } from "./email-service";
import { generateCertificatePdf } from "./certificate-pdf";
import { logServerError } from "../middleware/audit-logger";

export const CERTIFICATE_EMAIL_TEMPLATE_KEY = "course_completion_certificate";
const TEMPLATE_KEY = CERTIFICATE_EMAIL_TEMPLATE_KEY;
const sentGuard = new Set<string>();

// 모듈 로드 시점에 첨부파일 빌더를 즉시 등록한다.
// - 즉시 발송 경로(triggerCertificateEmail) 이전이라도 보장
// - 서버 재기동 후 retry queue가 deliver 할 때도 PDF 첨부가 누락되지 않도록 함
registerAttachmentBuilder(TEMPLATE_KEY, async (vars) => {
  const buf = await generateCertificatePdf({
    certificateNo: String(vars.certificateNo || ""),
    userName: String(vars.name || vars.userName || "수강생"),
    petName: vars.petName ? String(vars.petName) : null,
    courseTitle: String(vars.courseTitle || "코스"),
    trainerName: String(vars.trainerName || "담당 트레이너"),
    instituteName: String(vars.instituteName || "왕짱스쿨"),
    completedAt: vars.completedAtIso || vars.completedAt || null,
    totalSessions: Number(vars.totalSessions || 0),
    completedSessions: Number(vars.completedSessions || 0),
  });
  return [
    {
      content: buf.toString("base64"),
      filename: `certificate-${vars.certificateNo || "talez"}.pdf`,
      type: "application/pdf",
      disposition: "attachment",
    },
  ];
});

export function ensureCertificateEmailNotifierLoaded(): void {
  // 모듈 import 자체로 빌더가 등록되므로 호출하면 OK.
}

export interface TriggerCertificateEmailParams {
  userId: number;
  userName?: string | null;
  userEmail?: string | null;
  petName?: string | null;
  courseId: number;
  courseTitle: string;
  trainerName?: string | null;
  instituteName?: string | null;
  certificateNo: string;
  completedAt: string | null;
  totalSessions: number;
  completedSessions: number;
}

function formatKoreanDate(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return String(value);
  }
}

/**
 * 코스 수료 확정 시 보호자에게 수료증 PDF가 첨부된 이메일을 자동 발송한다.
 * - 멱등성: 동일 certificateNo 로 발송된(또는 큐 대기 중) 이메일이 있으면 스킵
 * - 발송 실패 시 emailLogs 큐의 retry 메커니즘에 위임 (최대 MAX_ATTEMPTS회)
 */
export async function triggerCertificateEmail(
  params: TriggerCertificateEmailParams,
): Promise<{ sent: boolean; reason?: string }> {
  try {
    if (!params.userId || !params.certificateNo) {
      return { sent: false, reason: "missing-ids" };
    }

    const guardKey = `cert:${params.certificateNo}`;
    if (sentGuard.has(guardKey)) {
      return { sent: false, reason: "already-notified" };
    }

    // DB 멱등성 체크 - 동일 certificateNo 로 이미 발송/큐에 적재된 메일이 있는지
    try {
      const prior = await db
        .select({ id: emailLogs.id, status: emailLogs.status })
        .from(emailLogs)
        .where(
          and(
            eq(emailLogs.templateKey, TEMPLATE_KEY),
            sql`${emailLogs.payload}->>'certificateNo' = ${params.certificateNo}`,
          ),
        )
        .limit(1);
      if (prior.length > 0 && prior[0].status !== "failed") {
        sentGuard.add(guardKey);
        return { sent: false, reason: "already-notified" };
      }
    } catch (err) {
      logServerError("[certificateEmail] dedupe lookup failed", err);
    }

    // 수신자 이메일 확보 (없으면 발송 불가)
    let recipient = params.userEmail || "";
    if (!recipient) {
      try {
        const u = await db
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, params.userId))
          .limit(1);
        recipient = u[0]?.email || "";
      } catch {
        /* noop */
      }
    }
    if (!recipient) {
      return { sent: false, reason: "no-recipient" };
    }

    const variables = {
      name: params.userName || "보호자",
      userName: params.userName || "보호자",
      petName: params.petName || "반려동물",
      courseTitle: params.courseTitle,
      trainerName: params.trainerName || "담당 트레이너",
      instituteName: params.instituteName || "왕짱스쿨",
      certificateNo: params.certificateNo,
      completedAt: formatKoreanDate(params.completedAt),
      completedAtIso: params.completedAt,
      totalSessions: params.totalSessions,
      completedSessions: params.completedSessions,
    };

    await queueEmail({
      templateKey: TEMPLATE_KEY,
      userId: params.userId,
      to: recipient,
      variables,
    });

    sentGuard.add(guardKey);
    return { sent: true };
  } catch (err) {
    logServerError("[certificateEmail] unexpected error", err);
    return { sent: false, reason: "error" };
  }
}
