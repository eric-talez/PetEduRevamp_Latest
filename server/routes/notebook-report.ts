import type { Express, Request, Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { and, eq } from "drizzle-orm";
import { notebookReportPreferences } from "../../shared/schema";
import { storage } from "../storage";
import { csrfProtection } from "../middleware/csrf";
import { logServerError } from "../middleware/audit-logger";
import {
  collectPeriodData,
  getWeeklyPeriod,
  getMonthlyPeriod,
  dispatchPeriodReports,
} from "../services/notebook-report-notifier";
import { generateNotebookReportPdf } from "../services/notebook-report-pdf";

function requireUser(req: Request, res: Response): { id: number; role?: string } | null {
  const u: any = (req as any).user || (req as any).session?.user;
  if (!u?.id) {
    res.status(401).json({ error: "인증이 필요합니다" });
    return null;
  }
  return u;
}

function ownsPetOrAdmin(userId: number, role: string | undefined, petId: number): boolean {
  if (role === "admin") return true;
  const pet = (storage as any).getPet?.(petId);
  if (!pet) return false;
  return Number(pet.ownerId) === Number(userId);
}

const updateSchema = z.object({
  petId: z.number().int().positive(),
  weeklyEnabled: z.boolean().optional(),
  monthlyEnabled: z.boolean().optional(),
});

const previewSchema = z.object({
  petId: z.coerce.number().int().positive(),
  period: z.enum(["weekly", "monthly"]).default("weekly"),
});

export function registerNotebookReportRoutes(app: Express) {
  // ----- 보호자: 내 반려동물 목록 + 현재 prefs -----
  app.get("/api/notebook/report-preferences", async (req, res) => {
    const u = requireUser(req, res);
    if (!u) return;
    try {
      const pets = (storage as any).getPetsByOwnerId?.(u.id) || [];
      const rows = await db
        .select()
        .from(notebookReportPreferences)
        .where(eq(notebookReportPreferences.userId, u.id));
      const prefMap = new Map<number, any>();
      for (const r of rows) prefMap.set(r.petId, r);
      const list = pets.map((p: any) => {
        const r = prefMap.get(p.id);
        return {
          petId: p.id,
          petName: p.name,
          weeklyEnabled: r ? r.weeklyEnabled !== false : true,
          monthlyEnabled: r ? r.monthlyEnabled === true : false,
        };
      });
      res.json({ pets: list });
    } catch (err) {
      logServerError("[notebookReport] list prefs failed", err);
      res.status(500).json({ error: "설정을 불러올 수 없습니다" });
    }
  });

  // ----- 보호자: prefs 업데이트 -----
  app.patch("/api/notebook/report-preferences", csrfProtection, async (req, res) => {
    const u = requireUser(req, res);
    if (!u) return;
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "잘못된 요청", details: parsed.error.flatten() });
    const { petId, weeklyEnabled, monthlyEnabled } = parsed.data;
    if (!ownsPetOrAdmin(u.id, u.role, petId)) {
      return res.status(403).json({ error: "권한이 없습니다" });
    }
    try {
      const existing = await db
        .select()
        .from(notebookReportPreferences)
        .where(and(eq(notebookReportPreferences.userId, u.id), eq(notebookReportPreferences.petId, petId)))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(notebookReportPreferences).values({
          userId: u.id,
          petId,
          weeklyEnabled: weeklyEnabled ?? true,
          monthlyEnabled: monthlyEnabled ?? false,
        });
      } else {
        const update: any = { updatedAt: new Date() };
        if (typeof weeklyEnabled === "boolean") update.weeklyEnabled = weeklyEnabled;
        if (typeof monthlyEnabled === "boolean") update.monthlyEnabled = monthlyEnabled;
        await db
          .update(notebookReportPreferences)
          .set(update)
          .where(eq(notebookReportPreferences.id, existing[0].id));
      }
      res.json({ success: true });
    } catch (err) {
      logServerError("[notebookReport] update prefs failed", err);
      res.status(500).json({ error: "저장에 실패했습니다" });
    }
  });

  // ----- 보호자: 즉시 미리보기 PDF 다운로드 -----
  app.get("/api/notebook/report-preferences/preview", async (req, res) => {
    const u = requireUser(req, res);
    if (!u) return;
    const parsed = previewSchema.safeParse({
      petId: req.query.petId,
      period: req.query.period || "weekly",
    });
    if (!parsed.success) return res.status(400).json({ error: "잘못된 요청" });
    const { petId, period } = parsed.data;
    if (!ownsPetOrAdmin(u.id, u.role, petId)) {
      return res.status(403).json({ error: "권한이 없습니다" });
    }
    try {
      const now = new Date();
      const { start, end } = period === "weekly" ? getWeeklyPeriod(now) : getMonthlyPeriod(now);
      const data = collectPeriodData(petId, start, end);
      const pet = (storage as any).getPet?.(petId) || { id: petId, name: "반려동물" };
      const owner = (storage as any).getUser?.(u.id) || { id: u.id, name: "보호자" };
      const buf = await generateNotebookReportPdf({
        periodType: period,
        periodStart: start,
        periodEnd: end,
        pet,
        owner,
        journals: data.journals,
        homeworkItems: data.homeworkItems,
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="notebook-${period}-${pet.name || petId}.pdf"`);
      res.send(buf);
    } catch (err) {
      logServerError("[notebookReport] preview failed", err);
      res.status(500).json({ error: "리포트 생성에 실패했습니다" });
    }
  });

  // ----- 관리자: 즉시 발송 트리거 (테스트/수동 운영) -----
  app.post("/api/admin/notebook-reports/dispatch", csrfProtection, async (req, res) => {
    const u = requireUser(req, res);
    if (!u) return;
    if (u.role !== "admin") return res.status(403).json({ error: "관리자 권한이 필요합니다" });
    const period: "weekly" | "monthly" = req.body?.period === "monthly" ? "monthly" : "weekly";
    try {
      const result = await dispatchPeriodReports(period);
      res.json({ success: true, ...result });
    } catch (err) {
      logServerError("[notebookReport] manual dispatch failed", err);
      res.status(500).json({ error: "발송 실패" });
    }
  });
}
