import { dispatchPeriodReports } from "./notebook-report-notifier";
import { logServerError } from "../middleware/audit-logger";

/**
 * KST 기준 매주 월요일 09:00 (주간), 매월 1일 09:00 (월간) 자동 발송 스케줄러.
 * setInterval(5분) 패턴 — 발송 시각 윈도우(09:00~09:09) 진입 시 마지막-실행-키와 비교해 1회만 발송.
 */
class NotebookReportScheduler {
  private static instance: NotebookReportScheduler;
  private intervalId: NodeJS.Timeout | null = null;
  private lastWeeklyKey: string | null = null;
  private lastMonthlyKey: string | null = null;
  private readonly CHECK_INTERVAL = 5 * 60 * 1000;

  static getInstance(): NotebookReportScheduler {
    if (!this.instance) this.instance = new NotebookReportScheduler();
    return this.instance;
  }

  start() {
    if (this.intervalId) return;
    this.tick().catch((e) => logServerError("[notebookReport scheduler] initial tick failed", e));
    this.intervalId = setInterval(() => {
      this.tick().catch((e) => logServerError("[notebookReport scheduler] tick failed", e));
    }, this.CHECK_INTERVAL);
    console.log("📓 알림장 주/월간 리포트 스케줄러 시작 (5분 주기)");
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
  }

  private kstNow(): { date: Date; hour: number; minute: number; dayOfMonth: number; dayOfWeek: number } {
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return {
      date: kst,
      hour: kst.getUTCHours(),
      minute: kst.getUTCMinutes(),
      dayOfMonth: kst.getUTCDate(),
      dayOfWeek: kst.getUTCDay(), // 0=Sun..1=Mon
    };
  }

  private async tick(): Promise<void> {
    const k = this.kstNow();
    // 윈도우: 09:00 ~ 09:09 KST
    if (k.hour !== 9 || k.minute >= 10) return;
    const dateKey = `${k.date.getUTCFullYear()}-${String(k.date.getUTCMonth() + 1).padStart(2, "0")}-${String(k.dayOfMonth).padStart(2, "0")}`;

    if (k.dayOfWeek === 1 && this.lastWeeklyKey !== dateKey) {
      this.lastWeeklyKey = dateKey;
      try { await dispatchPeriodReports("weekly"); }
      catch (e) { logServerError("[notebookReport scheduler] weekly dispatch failed", e); }
    }
    if (k.dayOfMonth === 1 && this.lastMonthlyKey !== dateKey) {
      this.lastMonthlyKey = dateKey;
      try { await dispatchPeriodReports("monthly"); }
      catch (e) { logServerError("[notebookReport scheduler] monthly dispatch failed", e); }
    }
  }
}

export const notebookReportScheduler = NotebookReportScheduler.getInstance();
