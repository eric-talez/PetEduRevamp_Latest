import { db } from "../db";
import { and, eq, sql } from "drizzle-orm";
import { emailLogs, notebookReportPreferences, users, type NotebookHomeworkItem as DbNotebookHomeworkItem } from "../../shared/schema";
import { queueEmail, registerAttachmentBuilder } from "./email-service";
import { generateNotebookReportPdf } from "./notebook-report-pdf";
import { storage } from "../storage";
import { logServerError } from "../middleware/audit-logger";
import type {
  NotebookComment,
  NotebookHomeworkItem,
  NotebookJournal,
  NotebookOwner,
  NotebookPet,
  NotebookStorageLike,
} from "./notebook-report-types";

const WEEKLY_KEY = "notebook_weekly_report";
const MONTHLY_KEY = "notebook_monthly_report";

const APP_BASE_URL =
  process.env.PUBLIC_APP_URL ||
  process.env.OAUTH_CALLBACK_BASE_URL ||
  "https://hitalez.com";

function store(): NotebookStorageLike {
  return storage as unknown as NotebookStorageLike;
}

function reportViewUrl(petId: number, periodType: "weekly" | "monthly"): string {
  return `${APP_BASE_URL.replace(/\/$/, "")}/notebook?petId=${petId}&period=${periodType}`;
}
function unsubscribeUrl(petId: number, periodType: "weekly" | "monthly"): string {
  return `${APP_BASE_URL.replace(/\/$/, "")}/settings?section=notebookReports&petId=${petId}&period=${periodType}`;
}

async function buildPdfFromVars(vars: Record<string, unknown>): Promise<Buffer> {
  const petId = Number(vars.petId);
  const periodStart = new Date(String(vars.periodStartIso));
  const periodEnd = new Date(String(vars.periodEndIso));
  const periodType: "weekly" | "monthly" = vars.periodType === "monthly" ? "monthly" : "weekly";

  const s = store();
  const pet: NotebookPet = s.getPet?.(petId) ?? { id: petId, name: String(vars.petName ?? "반려동물") };
  const ownerId = Number(vars.ownerId ?? pet.ownerId ?? 0);
  const owner: NotebookOwner = ownerId
    ? (s.getUser?.(ownerId) ?? { id: ownerId, name: String(vars.ownerName ?? "보호자") })
    : { id: 0 };

  const data = await collectPeriodDataWithDb(petId, periodStart, periodEnd);
  return generateNotebookReportPdf({
    periodType,
    periodStart,
    periodEnd,
    pet,
    owner,
    journals: data.journals,
    homeworkItems: data.homeworkItems,
    comments: data.comments,
    trainerNames: data.trainerNames,
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
  journals: NotebookJournal[];
  homeworkItems: NotebookHomeworkItem[];
  comments: NotebookComment[];
  trainerNames: string[];
}

function isPublishedJournal(j: NotebookJournal): boolean {
  // 보호자에게 공개 가능한 상태만 포함. status 가 비어있는 레거시 데이터는 안전하게 제외.
  if (!j.status) return false;
  if (j.status === "draft") return false;
  return true;
}

export function collectPeriodData(petId: number, periodStart: Date, periodEnd: Date): PeriodData {
  const s = store();
  const journals: NotebookJournal[] = (s.trainingJournals || []).filter((j) => {
    if (j.petId !== petId) return false;
    if (!isPublishedJournal(j)) return false;
    const d = new Date(j.trainingDate || j.createdAt || 0);
    if (isNaN(d.getTime())) return false;
    return d >= periodStart && d < periodEnd;
  });
  const journalIds = new Set(journals.map((j) => j.id));
  const homeworkItems: NotebookHomeworkItem[] = (s.notebookHomeworkItems || []).filter((h) => journalIds.has(h.journalId));
  const allComments: NotebookComment[] = s.journalComments || [];
  const comments: NotebookComment[] = allComments.filter((c) => journalIds.has(c.journalId));
  const trainerNames = Array.from(new Set(
    journals.map((j) => j.trainerName).filter((n): n is string => typeof n === "string" && n.length > 0)
  ));
  return { journals, homeworkItems, comments, trainerNames };
}

// DB-backed 숙제 데이터를 함께 채워주는 비동기 버전 (Task #105)
export async function collectPeriodDataWithDb(petId: number, periodStart: Date, periodEnd: Date): Promise<PeriodData> {
  const base = collectPeriodData(petId, periodStart, periodEnd);
  try {
    const ids = base.journals.map((j) => j.id);
    if (ids.length > 0) {
      const dbItems: DbNotebookHomeworkItem[] = await storage.getHomeworkItemsForJournals(ids);
      const merged: NotebookHomeworkItem[] = dbItems.map((row) => ({
        id: row.id,
        journalId: row.journalId,
        label: row.label ?? "",
        completed: !!row.completedAt,
        dueDate: row.dueDate ?? null,
        createdAt: row.createdAt ?? undefined,
      }));
      return { ...base, homeworkItems: merged };
    }
  } catch (err) {
    logServerError("[notebookReport] homework DB load failed", err);
  }
  return base;
}

export function getWeeklyPeriod(now: Date): { start: Date; end: Date; key: string } {
  // 이전 주 (월~일) — KST 기준
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const dow = kst.getUTCDay();
  const daysSinceMonday = (dow + 6) % 7;
  const thisMondayKst = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() - daysSinceMonday));
  const lastMondayKst = new Date(thisMondayKst.getTime() - 7 * 24 * 60 * 60 * 1000);
  const start = new Date(lastMondayKst.getTime() - 9 * 60 * 60 * 1000);
  const end = new Date(thisMondayKst.getTime() - 9 * 60 * 60 * 1000);
  const tmp = new Date(lastMondayKst.getTime());
  tmp.setUTCDate(tmp.getUTCDate() + 4 - ((tmp.getUTCDay() + 6) % 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const key = `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  return { start, end, key };
}

export function getMonthlyPeriod(now: Date): { start: Date; end: Date; key: string } {
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

    const data = await collectPeriodDataWithDb(args.petId, args.periodStart, args.periodEnd);
    if (data.journals.length === 0) {
      return { sent: false, reason: "no-journals" };
    }

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

    const s = store();
    const owner: NotebookOwner | undefined = s.getUser?.(args.ownerId);
    let recipient = owner?.email || "";
    if (!recipient) {
      const u = await db.select({ email: users.email }).from(users).where(eq(users.id, args.ownerId)).limit(1);
      recipient = u[0]?.email || "";
    }
    if (!recipient) return { sent: false, reason: "no-recipient" };

    const pet: NotebookPet | undefined = s.getPet?.(args.petId);
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
        trainerNames: data.trainerNames.join(", ") || "-",
        homeworkCompleted: data.homeworkItems.filter((h) => h.completed).length,
        homeworkTotal: data.homeworkItems.length,
        viewUrl: reportViewUrl(args.petId, args.periodType),
        unsubscribeUrl: unsubscribeUrl(args.petId, args.periodType),
      },
    });
    return { sent: true };
  } catch (err) {
    logServerError("[notebookReport] trigger failed", err);
    return { sent: false, reason: "error" };
  }
}

export async function dispatchPeriodReports(
  periodType: "weekly" | "monthly",
  now: Date = new Date(),
): Promise<{ attempted: number; sent: number; skipped: number }> {
  const { start, end, key } = periodType === "weekly" ? getWeeklyPeriod(now) : getMonthlyPeriod(now);

  const enabledColumn = periodType === "weekly"
    ? notebookReportPreferences.weeklyEnabled
    : notebookReportPreferences.monthlyEnabled;

  let prefs: { userId: number; petId: number }[] = [];
  try {
    prefs = await db
      .select({ userId: notebookReportPreferences.userId, petId: notebookReportPreferences.petId })
      .from(notebookReportPreferences)
      .where(eq(enabledColumn, true));
  } catch (err) {
    logServerError("[notebookReport] prefs query failed", err);
    return { attempted: 0, sent: 0, skipped: 0 };
  }

  // 주간: 명시적 prefs 가 없는 (owner,pet) 도 기본 ON 정책으로 포함.
  // 단, 명시적으로 weeklyEnabled = false 인 경우 제외.
  if (periodType === "weekly") {
    const s = store();
    const prefSet = new Set(prefs.map((p) => `${p.userId}:${p.petId}`));
    const journalsInPeriod: NotebookJournal[] = (s.trainingJournals || []).filter((j) => {
      if (!isPublishedJournal(j)) return false;
      const d = new Date(j.trainingDate || j.createdAt || 0);
      return !isNaN(d.getTime()) && d >= start && d < end;
    });
    const seen = new Set<number>();
    for (const j of journalsInPeriod) {
      if (!j.petId || seen.has(j.petId)) continue;
      seen.add(j.petId);
      const pet = s.getPet?.(j.petId);
      if (!pet?.ownerId) continue;
      const sigKey = `${pet.ownerId}:${j.petId}`;
      if (prefSet.has(sigKey)) continue;
      try {
        const row = await db
          .select()
          .from(notebookReportPreferences)
          .where(and(
            eq(notebookReportPreferences.userId, pet.ownerId),
            eq(notebookReportPreferences.petId, j.petId),
          ))
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
