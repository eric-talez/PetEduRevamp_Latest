import { db } from "../db";
import { and, eq, sql } from "drizzle-orm";
import { emailLogs, notebookReportPreferences, users } from "../../shared/schema";
import { queueEmail, registerAttachmentBuilder } from "./email-service";
import { generateNotebookReportPdf } from "./notebook-report-pdf";
import { storage } from "../storage";
import { logServerError } from "../middleware/audit-logger";

const WEEKLY_KEY = "notebook_weekly_report";
const MONTHLY_KEY = "notebook_monthly_report";

async function buildPdfFromVars(vars: Record<string, any>): Promise<Buffer> {
  const petId = Number(vars.petId);
  const periodStart = new Date(vars.periodStartIso);
  const periodEnd = new Date(vars.periodEndIso);
  const periodType: "weekly" | "monthly" = vars.periodType === "monthly" ? "monthly" : "weekly";

  const pet = (storage as any).getPet?.(petId) || { id: petId, name: vars.petName || "반려동물" };
  const ownerId = Number(vars.ownerId || pet.ownerId);
  const owner = ownerId ? ((storage as any).getUser?.(ownerId) || { id: ownerId, name: vars.ownerName || "보호자" }) : {};

  const data = collectPeriodData(petId, periodStart, periodEnd);
  return generateNotebookReportPdf({
    periodType,
    periodStart,
    periodEnd,
    pet,
    owner,
    journals: data.journals,
    homeworkItems: data.homeworkItems,
  });
}

registerAttachmentBuilder(WEEKLY_KEY, async (vars) => {
  const buf = await buildPdfFromVars({ ...vars, periodType: "weekly" });
  return [{
    content: buf.toString("base64"),
    filename: `notebook-weekly-${vars.petId}-${vars.periodKey || "report"}.pdf`,
    type: "application/pdf",
    disposition: "attachment",
  }];
});

registerAttachmentBuilder(MONTHLY_KEY, async (vars) => {
  const buf = await buildPdfFromVars({ ...vars, periodType: "monthly" });
  return [{
    content: buf.toString("base64"),
    filename: `notebook-monthly-${vars.petId}-${vars.periodKey || "report"}.pdf`,
    type: "application/pdf",
    disposition: "attachment",
  }];
});

export function ensureNotebookReportNotifierLoaded(): void { /* import side-effect */ }

export interface PeriodData {
  journals: any[];
  homeworkItems: any[];
}

export function collectPeriodData(petId: number, periodStart: Date, periodEnd: Date): PeriodData {
  const journals: any[] = ((storage as any).trainingJournals || []).filter((j: any) => {
    if (j.petId !== petId) return false;
    const d = new Date(j.trainingDate || j.createdAt || 0);
    if (isNaN(d.getTime())) return false;
    return d >= periodStart && d < periodEnd;
  });
  const journalIds = new Set(journals.map(j => j.id));
  const homeworkItems: any[] = ((storage as any).notebookHomeworkItems || []).filter((h: any) => journalIds.has(h.journalId));
  return { journals, homeworkItems };
}

export function getWeeklyPeriod(now: Date): { start: Date; end: Date; key: string } {
  // 이전 주 (월~일) — KST 기준
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const dow = kst.getUTCDay(); // 0=Sun..6=Sat
  const daysSinceMonday = (dow + 6) % 7; // Mon=0
  const thisMondayKst = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() - daysSinceMonday));
  const lastMondayKst = new Date(thisMondayKst.getTime() - 7 * 24 * 60 * 60 * 1000);
  // KST → UTC
  const start = new Date(lastMondayKst.getTime() - 9 * 60 * 60 * 1000);
  const end = new Date(thisMondayKst.getTime() - 9 * 60 * 60 * 1000);
  // ISO week label (rough): YYYY-Www
  const tmp = new Date(lastMondayKst.getTime());
  tmp.setUTCDate(tmp.getUTCDate() + 4 - ((tmp.getUTCDay() + 6) % 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const key = `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  return { start, end, key };
}

export function getMonthlyPeriod(now: Date): { start: Date; end: Date; key: string } {
  // 이전 달 1일~말일 (KST)
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const thisMonthFirstKst = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), 1));
  const lastMonthFirstKst = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth() - 1, 1));
  const start = new Date(lastMonthFirstKst.getTime() - 9 * 60 * 60 * 1000);
  const end = new Date(thisMonthFirstKst.getTime() - 9 * 60 * 60 * 1000);
  const y = lastMonthFirstKst.getUTCFullYear();
  const m = lastMonthFirstKst.getUTCMonth() + 1;
  const key = `${y}-${String(m).padStart(2, "0")}`;
  return { start, end, key };
}

interface SendReportArgs {
  petId: number;
  ownerId: number;
  periodType: "weekly" | "monthly";
  periodStart: Date;
  periodEnd: Date;
  periodKey: string;
}

export async function triggerNotebookReportEmail(args: SendReportArgs): Promise<{ sent: boolean; reason?: string }> {
  try {
    const templateKey = args.periodType === "weekly" ? WEEKLY_KEY : MONTHLY_KEY;
    const periodKey = `${args.periodKey}-pet${args.petId}`;

    // 데이터 사전 조회 — 없으면 스킵
    const data = collectPeriodData(args.petId, args.periodStart, args.periodEnd);
    if (data.journals.length === 0) {
      return { sent: false, reason: "no-journals" };
    }

    // 멱등성: 동일 periodKey 가 이미 큐/발송 됐는지 확인
    try {
      const prior = await db
        .select({ id: emailLogs.id, status: emailLogs.status })
        .from(emailLogs)
        .where(
          and(
            eq(emailLogs.templateKey, templateKey),
            sql`${emailLogs.payload}->>'periodKey' = ${periodKey}`,
          ),
        )
        .limit(1);
      if (prior.length > 0 && prior[0].status !== "failed") {
        return { sent: false, reason: "already-sent" };
      }
    } catch (err) {
      logServerError("[notebookReport] dedupe lookup failed", err);
    }

    // 수신자 이메일 확인
    const owner = (storage as any).getUser?.(args.ownerId);
    let recipient = owner?.email || "";
    if (!recipient) {
      const u = await db.select({ email: users.email }).from(users).where(eq(users.id, args.ownerId)).limit(1);
      recipient = u[0]?.email || "";
    }
    if (!recipient) return { sent: false, reason: "no-recipient" };

    const pet = (storage as any).getPet?.(args.petId);
    await queueEmail({
      templateKey,
      userId: args.ownerId,
      to: recipient,
      variables: {
        name: owner?.name || owner?.username || "보호자",
        petId: args.petId,
        petName: pet?.name || "반려동물",
        ownerId: args.ownerId,
        ownerName: owner?.name || owner?.username || "보호자",
        periodType: args.periodType,
        periodKey,
        periodStartIso: args.periodStart.toISOString(),
        periodEndIso: args.periodEnd.toISOString(),
        periodLabel: args.periodType === "weekly" ? "주간" : "월간",
        journalCount: data.journals.length,
        homeworkCompleted: data.homeworkItems.filter(h => h.completed).length,
        homeworkTotal: data.homeworkItems.length,
      },
    });
    return { sent: true };
  } catch (err) {
    logServerError("[notebookReport] trigger failed", err);
    return { sent: false, reason: "error" };
  }
}

/**
 * 주어진 기간에 대해, 활성화된 모든 (user,pet) prefs 를 순회하며 발송.
 */
export async function dispatchPeriodReports(periodType: "weekly" | "monthly", now: Date = new Date()): Promise<{ attempted: number; sent: number; skipped: number }> {
  const { start, end, key } = periodType === "weekly" ? getWeeklyPeriod(now) : getMonthlyPeriod(now);

  const enabledColumn = periodType === "weekly"
    ? notebookReportPreferences.weeklyEnabled
    : notebookReportPreferences.monthlyEnabled;

  let prefs: { userId: number; petId: number }[] = [];
  try {
    prefs = await db
      .select({ userId: notebookReportPreferences.userId, petId: notebookReportPreferences.petId })
      .from(notebookReportPreferences)
      .where(eq(enabledColumn as any, true));
  } catch (err) {
    logServerError("[notebookReport] prefs query failed", err);
    return { attempted: 0, sent: 0, skipped: 0 };
  }

  // 명시 prefs 가 없는 경우 weekly 기본 ON 정책: 알림장이 있는 모든 (pet,owner) 도 포함
  if (periodType === "weekly") {
    const prefSet = new Set(prefs.map(p => `${p.userId}:${p.petId}`));
    const journalsInPeriod: any[] = ((storage as any).trainingJournals || []).filter((j: any) => {
      const d = new Date(j.trainingDate || j.createdAt || 0);
      return !isNaN(d.getTime()) && d >= start && d < end;
    });
    const seen = new Set<number>();
    for (const j of journalsInPeriod) {
      if (!j.petId || seen.has(j.petId)) continue;
      seen.add(j.petId);
      const pet = (storage as any).getPet?.(j.petId);
      if (!pet?.ownerId) continue;
      const sigKey = `${pet.ownerId}:${j.petId}`;
      if (prefSet.has(sigKey)) continue;
      // 명시적으로 weekly OFF 인지 확인
      try {
        const row = await db.select().from(notebookReportPreferences)
          .where(and(eq(notebookReportPreferences.userId, pet.ownerId), eq(notebookReportPreferences.petId, j.petId)))
          .limit(1);
        if (row[0] && row[0].weeklyEnabled === false) continue;
      } catch { /* noop */ }
      prefs.push({ userId: pet.ownerId, petId: j.petId });
    }
  }

  let attempted = 0, sent = 0, skipped = 0;
  for (const p of prefs) {
    attempted++;
    const r = await triggerNotebookReportEmail({
      petId: p.petId,
      ownerId: p.userId,
      periodType,
      periodStart: start,
      periodEnd: end,
      periodKey: key,
    });
    if (r.sent) sent++; else skipped++;
  }
  console.log(`[notebookReport] ${periodType} dispatch — attempted=${attempted} sent=${sent} skipped=${skipped} period=${key}`);
  return { attempted, sent, skipped };
}
