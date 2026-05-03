import type { Express, Request, Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { eq, and } from "drizzle-orm";
import {
  emailTemplates,
  emailNotificationPreferences,
  EMAIL_CATEGORIES,
} from "../../shared/schema";
import {
  ensureEmailSystemInitialized,
  queueEmail,
  listEmailLogs,
  resendEmail,
  previewTemplate,
  getEmailServiceStatus,
} from "../services/email-service";

function requireAuthUser(req: Request, res: Response): number | null {
  const u: any = (req as any).user || (req as any).session?.user;
  if (!u?.id) {
    res.status(401).json({ error: "인증이 필요합니다" });
    return null;
  }
  return u.id;
}

function requireAdmin(req: Request, res: Response): boolean {
  const u: any = (req as any).user || (req as any).session?.user;
  if (!u?.id) {
    res.status(401).json({ error: "인증이 필요합니다" });
    return false;
  }
  if (u.role !== "admin") {
    res.status(403).json({ error: "관리자 권한이 필요합니다" });
    return false;
  }
  return true;
}

const updateTemplateSchema = z.object({
  name: z.string().optional(),
  subject: z.string().optional(),
  bodyHtml: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
  sendgridTemplateId: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

const testSendSchema = z.object({
  to: z.string().email(),
  variables: z.record(z.any()).optional(),
});

const previewSchema = z.object({
  variables: z.record(z.any()).optional(),
});

const updatePreferenceSchema = z.object({
  category: z.enum(EMAIL_CATEGORIES as unknown as [string, ...string[]]),
  enabled: z.boolean(),
});

export function registerEmailNotificationRoutes(app: Express) {
  // 시작 시 템플릿 시드
  ensureEmailSystemInitialized().catch((err) =>
    console.warn("[email-routes] init warning:", err)
  );

  // ----- 사용자 -----
  app.get("/api/email-preferences", async (req, res) => {
    const userId = requireAuthUser(req, res);
    if (!userId) return;
    const prefs = await db
      .select()
      .from(emailNotificationPreferences)
      .where(eq(emailNotificationPreferences.userId, userId));
    const map: Record<string, boolean> = {};
    for (const c of EMAIL_CATEGORIES) map[c] = true;
    for (const p of prefs) map[p.category] = p.enabled !== false;
    res.json({ categories: EMAIL_CATEGORIES, preferences: map });
  });

  app.patch("/api/email-preferences", async (req, res) => {
    const userId = requireAuthUser(req, res);
    if (!userId) return;
    const parsed = updatePreferenceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "잘못된 요청", details: parsed.error.flatten() });
    }
    const { category, enabled } = parsed.data;
    const existing = await db
      .select()
      .from(emailNotificationPreferences)
      .where(
        and(
          eq(emailNotificationPreferences.userId, userId),
          eq(emailNotificationPreferences.category, category)
        )
      )
      .limit(1);
    if (existing.length === 0) {
      await db
        .insert(emailNotificationPreferences)
        .values({ userId, category, enabled });
    } else {
      await db
        .update(emailNotificationPreferences)
        .set({ enabled, updatedAt: new Date() })
        .where(eq(emailNotificationPreferences.id, existing[0].id));
    }
    res.json({ success: true, category, enabled });
  });

  // ----- 관리자: 서비스 상태 -----
  app.get("/api/admin/email-status", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.json(getEmailServiceStatus());
  });

  // ----- 관리자: 템플릿 -----
  app.get("/api/admin/email-templates", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    await ensureEmailSystemInitialized();
    const rows = await db.select().from(emailTemplates);
    res.json({ templates: rows });
  });

  app.patch("/api/admin/email-templates/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "잘못된 id" });
    const parsed = updateTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "잘못된 요청", details: parsed.error.flatten() });
    }
    await db
      .update(emailTemplates)
      .set({ ...parsed.data, updatedAt: new Date() } as any)
      .where(eq(emailTemplates.id, id));
    const [updated] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, id));
    res.json({ template: updated });
  });

  app.post("/api/admin/email-templates/:key/preview", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const parsed = previewSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: "잘못된 요청" });
    try {
      const result = await previewTemplate(req.params.key, parsed.data.variables || {});
      res.json(result);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  });

  app.post("/api/admin/email-templates/:key/test-send", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const parsed = testSendSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "잘못된 요청", details: parsed.error.flatten() });
    }
    try {
      const log = await queueEmail({
        templateKey: req.params.key,
        to: parsed.data.to,
        variables: parsed.data.variables || {},
        bypassPreference: true,
      });
      res.json({ success: true, log });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ----- 관리자: 발송 이력 -----
  app.get("/api/admin/email-logs", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const status = req.query.status as string | undefined;
    const templateKey = req.query.templateKey as string | undefined;
    const search = req.query.search as string | undefined;
    const limit = parseInt((req.query.limit as string) || "50", 10);
    const offset = parseInt((req.query.offset as string) || "0", 10);
    const result = await listEmailLogs({ status, templateKey, search, limit, offset });
    res.json(result);
  });

  app.post("/api/admin/email-logs/:id/resend", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "잘못된 id" });
    try {
      await resendEmail(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
