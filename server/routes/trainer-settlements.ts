import type { Express, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import {
  trainerSettlementItems,
  trainerCommissionRates,
  settlements,
  users,
  courses,
  coursePurchases,
  insertTrainerCommissionRateSchema,
  type TrainerSettlementItem,
} from "../../shared/schema";
import { z } from "zod";
import { logServerError } from '../middleware/audit-logger';

interface AuthedRequest extends Request {
  user?: { id: number; role: string; name?: string; email?: string };
}

const requireAuth = (req: AuthedRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ success: false, message: "로그인이 필요합니다." });
  next();
};
const requireAdmin = (req: AuthedRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ success: false, message: "로그인이 필요합니다." });
  if (req.user.role !== "admin")
    return res.status(403).json({ success: false, message: "관리자 권한이 필요합니다." });
  next();
};
const requireTrainer = (req: AuthedRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ success: false, message: "로그인이 필요합니다." });
  if (req.user.role !== "trainer" && req.user.role !== "admin")
    return res.status(403).json({ success: false, message: "트레이너 권한이 필요합니다." });
  next();
};

const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const STATUS_KO: Record<string, string> = {
  pending: "예정",
  confirmed: "확정",
  locked: "마감",
  paid: "지급완료",
  canceled: "취소",
};

// ===== 수수료율 조회 =====
// 우선순위: trainerId+category > trainerId(category null) > category(trainerId null) > 전역(둘 다 null) > 기본 20%
export async function resolveCommissionRate(
  trainerId: number,
  category?: string | null
): Promise<number> {
  const all = await db
    .select()
    .from(trainerCommissionRates)
    .where(eq(trainerCommissionRates.isActive, true));

  const byTrainerCat = all.find((r) => r.trainerId === trainerId && r.category === category);
  if (byTrainerCat) return Number(byTrainerCat.ratePercent);

  const byTrainer = all.find((r) => r.trainerId === trainerId && !r.category);
  if (byTrainer) return Number(byTrainer.ratePercent);

  const byCat = all.find((r) => !r.trainerId && r.category === category);
  if (byCat) return Number(byCat.ratePercent);

  const global = all.find((r) => !r.trainerId && !r.category);
  if (global) return Number(global.ratePercent);

  return 20;
}

// ===== 정산 항목 자동 생성 =====
// sourceId는 트랜잭션/구매 ID(불변, 고유)여야 합니다. courseId 같은 가변 식별자 사용 금지.
// tx 인자를 받으면 호출자의 트랜잭션 컨텍스트에서 실행되어 결제+정산 원자성을 보장합니다.
type DbExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function createTrainerSettlementItem(
  params: {
    trainerId: number;
    sourceType: "course" | "order" | "lesson";
    sourceId: number;
    sourceName?: string;
    category?: string | null;
    grossAmount: number;
    occurredAt?: Date;
    metadata?: Record<string, unknown>;
  },
  executor: DbExecutor = db
): Promise<TrainerSettlementItem> {
  const { trainerId, sourceType, sourceId } = params;

  // 멱등 보장: 같은 (sourceType, sourceId) 한 번만 생성
  const existing = await executor
    .select()
    .from(trainerSettlementItems)
    .where(
      and(
        eq(trainerSettlementItems.sourceType, sourceType),
        eq(trainerSettlementItems.sourceId, sourceId)
      )
    )
    .limit(1);
  if (existing.length > 0) return existing[0];

  const occurredAt = params.occurredAt || new Date();
  // 수수료율 조회는 read-only이므로 같은 executor 사용 (tx 격리 일관성 유지)
  const rates = await executor
    .select()
    .from(trainerCommissionRates)
    .where(eq(trainerCommissionRates.isActive, true));
  const cat = params.category || null;
  const rate =
    Number(
      rates.find((r) => r.trainerId === trainerId && r.category === cat)?.ratePercent ??
        rates.find((r) => r.trainerId === trainerId && !r.category)?.ratePercent ??
        rates.find((r) => !r.trainerId && r.category === cat)?.ratePercent ??
        rates.find((r) => !r.trainerId && !r.category)?.ratePercent ??
        20
    );
  const gross = Number(params.grossAmount);
  const fee = Math.round((gross * rate) / 100);
  const net = gross - fee;

  try {
    const [row] = await executor
      .insert(trainerSettlementItems)
      .values({
        trainerId,
        sourceType,
        sourceId,
        sourceName: params.sourceName || null,
        category: params.category || null,
        grossAmount: String(gross),
        commissionRate: String(rate),
        platformFee: String(fee),
        netAmount: String(net),
        settlementMonth: monthKey(occurredAt),
        status: "pending",
        occurredAt,
        metadata: params.metadata || null,
      })
      .returning();
    return row;
  } catch (err: unknown) {
    // 동시성 race condition: unique 인덱스 위반 시 기존 row 반환
    const code = (err as { code?: string })?.code;
    if (code === "23505") {
      const dup = await executor
        .select()
        .from(trainerSettlementItems)
        .where(
          and(
            eq(trainerSettlementItems.sourceType, sourceType),
            eq(trainerSettlementItems.sourceId, sourceId)
          )
        )
        .limit(1);
      if (dup[0]) return dup[0];
    }
    throw err;
  }
}

// ===== 환불/취소 처리 =====
// 결제 환불/주문 취소 시 호출. paid/locked는 별도 보정 필요(이미 마감된 정산).
export async function cancelTrainerSettlementItem(
  sourceType: string,
  sourceId: number,
  reason: string = "환불/취소"
): Promise<number> {
  const items = await db
    .select()
    .from(trainerSettlementItems)
    .where(
      and(
        eq(trainerSettlementItems.sourceType, sourceType),
        eq(trainerSettlementItems.sourceId, sourceId)
      )
    );
  let updated = 0;
  for (const item of items) {
    if (["paid", "locked", "canceled"].includes(item.status)) continue;
    await db
      .update(trainerSettlementItems)
      .set({
        status: "canceled",
        canceledAt: new Date(),
        cancelReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(trainerSettlementItems.id, item.id));
    updated++;
  }
  return updated;
}

const buildWhere = (conds: SQL[]): SQL | undefined =>
  conds.length === 0 ? undefined : conds.length === 1 ? conds[0] : and(...conds);

export function registerTrainerSettlementRoutes(app: Express) {
  // ============ 트레이너 화면 ============

  app.get("/api/trainer/settlements/summary", requireTrainer, async (req: AuthedRequest, res) => {
    try {
      const trainerId = req.user!.id;
      const now = new Date();
      const currentMonth = monthKey(now);

      const items = await db
        .select()
        .from(trainerSettlementItems)
        .where(eq(trainerSettlementItems.trainerId, trainerId));

      const sumNet = (rows: TrainerSettlementItem[]) =>
        rows.reduce((s, r) => s + Number(r.netAmount), 0);

      const thisMonth = items.filter(
        (i) => i.settlementMonth === currentMonth && i.status !== "canceled"
      );
      const expected = sumNet(thisMonth.filter((i) => i.status === "pending"));
      const confirmed = sumNet(
        thisMonth.filter((i) => ["confirmed", "locked", "paid"].includes(i.status))
      );

      const months = new Map<
        string,
        { month: string; totalGross: number; totalNet: number; count: number; statuses: Set<string> }
      >();
      for (const i of items) {
        if (i.status === "canceled") continue;
        const k = i.settlementMonth;
        const m =
          months.get(k) || {
            month: k,
            totalGross: 0,
            totalNet: 0,
            count: 0,
            statuses: new Set<string>(),
          };
        m.totalGross += Number(i.grossAmount);
        m.totalNet += Number(i.netAmount);
        m.count += 1;
        m.statuses.add(i.status);
        months.set(k, m);
      }
      const history = Array.from(months.values())
        .map((m) => ({
          month: m.month,
          totalGross: m.totalGross,
          totalNet: m.totalNet,
          count: m.count,
          status: m.statuses.has("paid")
            ? "paid"
            : m.statuses.has("locked")
            ? "locked"
            : m.statuses.has("confirmed")
            ? "confirmed"
            : "pending",
        }))
        .sort((a, b) => b.month.localeCompare(a.month));

      res.json({
        success: true,
        data: {
          currentMonth,
          expected,
          confirmed,
          totalLifetime: sumNet(items.filter((i) => i.status !== "canceled")),
          history,
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logServerError("[정산] 요약 오류:", e, req);
      res.status(500).json({ success: false, message: msg });
    }
  });

  app.get("/api/trainer/settlements/items", requireTrainer, async (req: AuthedRequest, res) => {
    try {
      const trainerId = req.user!.id;
      const { month, status } = req.query as { month?: string; status?: string };
      const conds: SQL[] = [eq(trainerSettlementItems.trainerId, trainerId)];
      if (month) conds.push(eq(trainerSettlementItems.settlementMonth, month));
      if (status) conds.push(eq(trainerSettlementItems.status, status));
      const rows = await db
        .select()
        .from(trainerSettlementItems)
        .where(buildWhere(conds))
        .orderBy(desc(trainerSettlementItems.occurredAt));
      res.json({ success: true, data: rows });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ success: false, message: msg });
    }
  });

  // ============ 관리자 화면 ============

  app.get("/api/admin/trainer-settlements/items", requireAdmin, async (req, res) => {
    try {
      const month = typeof req.query.month === "string" ? req.query.month : undefined;
      const trainerIdQ = typeof req.query.trainerId === "string" ? Number(req.query.trainerId) : undefined;
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const conds: SQL[] = [];
      if (month) conds.push(eq(trainerSettlementItems.settlementMonth, month));
      if (trainerIdQ) conds.push(eq(trainerSettlementItems.trainerId, trainerIdQ));
      if (status) conds.push(eq(trainerSettlementItems.status, status));

      const rows = await db
        .select({
          item: trainerSettlementItems,
          trainerName: users.name,
          trainerEmail: users.email,
        })
        .from(trainerSettlementItems)
        .leftJoin(users, eq(users.id, trainerSettlementItems.trainerId))
        .where(buildWhere(conds))
        .orderBy(desc(trainerSettlementItems.occurredAt));
      res.json({
        success: true,
        data: rows.map((r) => ({ ...r.item, trainerName: r.trainerName, trainerEmail: r.trainerEmail })),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ success: false, message: msg });
    }
  });

  app.get("/api/admin/trainer-settlements/monthly", requireAdmin, async (req, res) => {
    try {
      const monthQ = typeof req.query.month === "string" ? req.query.month : undefined;
      const target = monthQ || monthKey(new Date());
      const rows = await db
        .select({
          trainerId: trainerSettlementItems.trainerId,
          trainerName: users.name,
          trainerEmail: users.email,
          totalGross: sql<string>`COALESCE(SUM(${trainerSettlementItems.grossAmount}::numeric), 0)`,
          totalFee: sql<string>`COALESCE(SUM(${trainerSettlementItems.platformFee}::numeric), 0)`,
          totalNet: sql<string>`COALESCE(SUM(${trainerSettlementItems.netAmount}::numeric), 0)`,
          itemCount: sql<number>`COUNT(*)`,
          pendingCount: sql<number>`SUM(CASE WHEN ${trainerSettlementItems.status} = 'pending' THEN 1 ELSE 0 END)`,
          lockedCount: sql<number>`SUM(CASE WHEN ${trainerSettlementItems.status} IN ('locked','paid') THEN 1 ELSE 0 END)`,
        })
        .from(trainerSettlementItems)
        .leftJoin(users, eq(users.id, trainerSettlementItems.trainerId))
        .where(
          and(
            eq(trainerSettlementItems.settlementMonth, target),
            sql`${trainerSettlementItems.status} != 'canceled'`
          )
        )
        .groupBy(trainerSettlementItems.trainerId, users.name, users.email);
      res.json({ success: true, data: { month: target, rows } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logServerError("[정산 월별 집계] 오류:", e, req);
      res.status(500).json({ success: false, message: msg });
    }
  });

  app.post("/api/admin/trainer-settlements/close", requireAdmin, async (req: AuthedRequest, res) => {
    try {
      const body = z
        .object({ month: z.string().regex(/^\d{4}-\d{2}$/), trainerId: z.number().optional() })
        .parse(req.body);
      const { month, trainerId } = body;

      const conds: SQL[] = [
        eq(trainerSettlementItems.settlementMonth, month),
        sql`${trainerSettlementItems.status} IN ('pending','confirmed')`,
      ];
      if (trainerId) conds.push(eq(trainerSettlementItems.trainerId, trainerId));

      const items = await db
        .select()
        .from(trainerSettlementItems)
        .where(buildWhere(conds));

      if (items.length === 0)
        return res.json({ success: true, data: { closed: 0, settlementIds: [] } });

      const byTrainer = new Map<number, TrainerSettlementItem[]>();
      for (const it of items) {
        const arr = byTrainer.get(it.trainerId) || [];
        arr.push(it);
        byTrainer.set(it.trainerId, arr);
      }

      const settlementIds: number[] = [];
      for (const [tid, list] of byTrainer.entries()) {
        const trainer = (await db.select().from(users).where(eq(users.id, tid)).limit(1))[0];
        const gross = list.reduce((s, i) => s + Number(i.grossAmount), 0);
        const fee = list.reduce((s, i) => s + Number(i.platformFee), 0);
        const net = list.reduce((s, i) => s + Number(i.netAmount), 0);

        const [year, mon] = month.split("-").map(Number);
        const periodStart = new Date(year, mon - 1, 1);
        const periodEnd = new Date(year, mon, 0, 23, 59, 59);

        const [s] = await db
          .insert(settlements)
          .values({
            settlementType: "trainer",
            targetId: tid,
            targetName: trainer?.name || trainer?.email || `Trainer ${tid}`,
            periodStart,
            periodEnd,
            totalGrossAmount: String(gross),
            totalFeeAmount: String(fee),
            totalNetAmount: String(net),
            transactionCount: list.length,
            status: "completed",
            approvedBy: req.user!.id,
            processedAt: new Date(),
          })
          .returning();

        settlementIds.push(s.id);

        for (const it of list) {
          await db
            .update(trainerSettlementItems)
            .set({ status: "locked", settlementId: s.id, updatedAt: new Date() })
            .where(eq(trainerSettlementItems.id, it.id));
        }
      }

      res.json({ success: true, data: { closed: items.length, settlementIds } });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ success: false, errors: e.errors });
      const msg = e instanceof Error ? e.message : String(e);
      logServerError("[정산 마감] 오류:", e, req);
      res.status(500).json({ success: false, message: msg });
    }
  });

  app.post("/api/admin/trainer-settlements/:settlementId/pay", requireAdmin, async (req, res) => {
    try {
      const settlementId = Number(req.params.settlementId);
      await db
        .update(settlements)
        .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
        .where(eq(settlements.id, settlementId));
      await db
        .update(trainerSettlementItems)
        .set({ status: "paid", updatedAt: new Date() })
        .where(eq(trainerSettlementItems.settlementId, settlementId));
      res.json({ success: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ success: false, message: msg });
    }
  });

  // CSV 다운로드
  app.get("/api/admin/trainer-settlements/export.csv", requireAdmin, async (req, res) => {
    try {
      const month = typeof req.query.month === "string" ? req.query.month : undefined;
      const trainerIdQ = typeof req.query.trainerId === "string" ? Number(req.query.trainerId) : undefined;
      const conds: SQL[] = [];
      if (month) conds.push(eq(trainerSettlementItems.settlementMonth, month));
      if (trainerIdQ) conds.push(eq(trainerSettlementItems.trainerId, trainerIdQ));

      const rows = await db
        .select({
          item: trainerSettlementItems,
          trainerName: users.name,
          trainerEmail: users.email,
        })
        .from(trainerSettlementItems)
        .leftJoin(users, eq(users.id, trainerSettlementItems.trainerId))
        .where(buildWhere(conds))
        .orderBy(trainerSettlementItems.trainerId, desc(trainerSettlementItems.occurredAt));

      const header = [
        "정산월",
        "트레이너ID",
        "트레이너명",
        "이메일",
        "원천유형",
        "원천ID",
        "원천명",
        "카테고리",
        "총금액",
        "수수료율(%)",
        "플랫폼수수료",
        "정산액",
        "상태",
        "발생일시",
      ];
      const escape = (v: string | number | null | undefined) => {
        const s = v == null ? "" : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const lines = [header.join(",")];
      for (const r of rows) {
        const i = r.item;
        lines.push(
          [
            i.settlementMonth,
            i.trainerId,
            escape(r.trainerName),
            escape(r.trainerEmail),
            i.sourceType,
            i.sourceId,
            escape(i.sourceName),
            escape(i.category),
            i.grossAmount,
            i.commissionRate,
            i.platformFee,
            i.netAmount,
            STATUS_KO[i.status] || i.status,
            i.occurredAt instanceof Date ? i.occurredAt.toISOString() : String(i.occurredAt),
          ].join(",")
        );
      }
      const csv = "\uFEFF" + lines.join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="trainer-settlements-${month || "all"}.csv"`
      );
      res.send(csv);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ success: false, message: msg });
    }
  });

  // 정산 명세서 (인쇄/PDF용 HTML — 브라우저에서 PDF로 저장)
  app.get("/api/admin/trainer-settlements/statement.html", requireAdmin, async (req, res) => {
    try {
      const month = typeof req.query.month === "string" ? req.query.month : monthKey(new Date());
      const trainerIdQ = typeof req.query.trainerId === "string" ? Number(req.query.trainerId) : undefined;
      const conds: SQL[] = [eq(trainerSettlementItems.settlementMonth, month)];
      if (trainerIdQ) conds.push(eq(trainerSettlementItems.trainerId, trainerIdQ));

      const rows = await db
        .select({
          item: trainerSettlementItems,
          trainerName: users.name,
          trainerEmail: users.email,
        })
        .from(trainerSettlementItems)
        .leftJoin(users, eq(users.id, trainerSettlementItems.trainerId))
        .where(buildWhere(conds))
        .orderBy(trainerSettlementItems.trainerId, desc(trainerSettlementItems.occurredAt));

      // 트레이너별 그룹
      const groups = new Map<
        number,
        { name: string; email: string; rows: typeof rows; gross: number; fee: number; net: number }
      >();
      for (const r of rows) {
        const tid = r.item.trainerId;
        const g =
          groups.get(tid) ||
          { name: r.trainerName || `Trainer #${tid}`, email: r.trainerEmail || "", rows: [] as typeof rows, gross: 0, fee: 0, net: 0 };
        g.rows.push(r);
        if (r.item.status !== "canceled") {
          g.gross += Number(r.item.grossAmount);
          g.fee += Number(r.item.platformFee);
          g.net += Number(r.item.netAmount);
        }
        groups.set(tid, g);
      }

      const esc = (s: unknown) =>
        String(s ?? "").replace(/[&<>"']/g, (c) =>
          ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
        );

      const sections = Array.from(groups.entries())
        .map(
          ([tid, g]) => `
        <section class="trainer">
          <h2>${esc(g.name)} <small>#${tid} · ${esc(g.email)}</small></h2>
          <table>
            <thead>
              <tr><th>발생일</th><th>유형</th><th>상품/강의</th><th>총금액</th><th>수수료율</th><th>플랫폼 수수료</th><th>정산액</th><th>상태</th></tr>
            </thead>
            <tbody>
              ${g.rows
                .map(
                  (r) => `<tr>
                    <td>${esc(new Date(r.item.occurredAt!).toLocaleDateString("ko-KR"))}</td>
                    <td>${esc(r.item.sourceType)}</td>
                    <td>${esc(r.item.sourceName || `#${r.item.sourceId}`)}</td>
                    <td class="num">${Number(r.item.grossAmount).toLocaleString()}원</td>
                    <td class="num">${Number(r.item.commissionRate)}%</td>
                    <td class="num">${Number(r.item.platformFee).toLocaleString()}원</td>
                    <td class="num">${Number(r.item.netAmount).toLocaleString()}원</td>
                    <td>${esc(STATUS_KO[r.item.status] || r.item.status)}</td>
                  </tr>`
                )
                .join("")}
            </tbody>
            <tfoot>
              <tr>
                <th colspan="3">합계 (취소 제외)</th>
                <th class="num">${g.gross.toLocaleString()}원</th>
                <th></th>
                <th class="num">${g.fee.toLocaleString()}원</th>
                <th class="num">${g.net.toLocaleString()}원</th>
                <th></th>
              </tr>
            </tfoot>
          </table>
        </section>`
        )
        .join("");

      const html = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"/>
<title>${esc(month)} 트레이너 정산 명세서</title>
<style>
  body{font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;margin:24px;color:#222}
  h1{margin:0 0 8px}
  .meta{color:#666;margin-bottom:24px}
  section.trainer{page-break-inside:avoid;margin-bottom:32px}
  h2{border-bottom:2px solid #333;padding-bottom:6px;margin-bottom:12px}
  h2 small{font-weight:normal;color:#666;font-size:13px;margin-left:8px}
  table{border-collapse:collapse;width:100%;font-size:13px}
  th,td{border:1px solid #ccc;padding:6px 8px}
  th{background:#f5f5f5;text-align:left}
  td.num,th.num{text-align:right}
  tfoot th{background:#fafafa}
  .actions{position:fixed;top:8px;right:8px}
  @media print { .actions{display:none} body{margin:0} }
</style></head>
<body>
  <div class="actions"><button onclick="window.print()">PDF로 저장 (인쇄)</button></div>
  <h1>${esc(month)} 트레이너 정산 명세서</h1>
  <div class="meta">발행일: ${new Date().toLocaleString("ko-KR")} · 트레이너 수: ${groups.size}명 · 항목 수: ${rows.length}건</div>
  ${sections || '<p>해당 월에 정산 항목이 없습니다.</p>'}
  <script>setTimeout(()=>window.print(), 400);</script>
</body></html>`;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ success: false, message: msg });
    }
  });

  // 항목 수동 취소
  app.post("/api/admin/trainer-settlements/items/:id/cancel", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const reason = typeof req.body?.reason === "string" ? req.body.reason : "관리자 취소";
      const item = (
        await db.select().from(trainerSettlementItems).where(eq(trainerSettlementItems.id, id)).limit(1)
      )[0];
      if (!item) return res.status(404).json({ success: false, message: "항목을 찾을 수 없습니다." });
      if (item.status === "paid" || item.status === "locked")
        return res.status(400).json({ success: false, message: "마감/지급된 항목은 취소할 수 없습니다." });
      await db
        .update(trainerSettlementItems)
        .set({ status: "canceled", canceledAt: new Date(), cancelReason: reason, updatedAt: new Date() })
        .where(eq(trainerSettlementItems.id, id));
      res.json({ success: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ success: false, message: msg });
    }
  });

  // ============ 수수료율 관리 ============

  app.get("/api/admin/trainer-commission-rates", requireAdmin, async (_req, res) => {
    try {
      const rows = await db
        .select({
          rate: trainerCommissionRates,
          trainerName: users.name,
          trainerEmail: users.email,
        })
        .from(trainerCommissionRates)
        .leftJoin(users, eq(users.id, trainerCommissionRates.trainerId))
        .orderBy(desc(trainerCommissionRates.updatedAt));
      res.json({
        success: true,
        data: rows.map((r) => ({ ...r.rate, trainerName: r.trainerName, trainerEmail: r.trainerEmail })),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ success: false, message: msg });
    }
  });

  app.post("/api/admin/trainer-commission-rates", requireAdmin, async (req, res) => {
    try {
      const body = insertTrainerCommissionRateSchema.parse(req.body);
      const [row] = await db.insert(trainerCommissionRates).values(body).returning();
      res.json({ success: true, data: row });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ success: false, errors: e.errors });
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ success: false, message: msg });
    }
  });

  app.put("/api/admin/trainer-commission-rates/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const body = insertTrainerCommissionRateSchema.partial().parse(req.body);
      const [row] = await db
        .update(trainerCommissionRates)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(trainerCommissionRates.id, id))
        .returning();
      res.json({ success: true, data: row });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ success: false, errors: e.errors });
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ success: false, message: msg });
    }
  });

  app.delete("/api/admin/trainer-commission-rates/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(trainerCommissionRates).where(eq(trainerCommissionRates.id, id));
      res.json({ success: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ success: false, message: msg });
    }
  });

  // ============ 자동 생성 hooks (관리자 전용) ============

  // 강의 구매 완료 → 정산 항목 생성. 멱등(같은 purchaseId 한 번만)
  // 보안: 관리자만. 일반 사용자가 아무 purchaseId나 호출해 정산을 만드는 것을 방지.
  app.post(
    "/api/admin/trainer-settlements/sync/course-purchase/:purchaseId",
    requireAdmin,
    async (req, res) => {
      try {
        const purchaseId = Number(req.params.purchaseId);
        const purchase = (
          await db.select().from(coursePurchases).where(eq(coursePurchases.id, purchaseId)).limit(1)
        )[0];
        if (!purchase) return res.status(404).json({ success: false, message: "구매 내역 없음" });
        if (purchase.paymentStatus !== "completed")
          return res.status(400).json({ success: false, message: "완료된 결제만 정산 가능" });

        const course = (
          await db.select().from(courses).where(eq(courses.id, purchase.courseId)).limit(1)
        )[0];
        if (!course?.instructorId)
          return res.status(400).json({ success: false, message: "강사 정보 없음" });

        const item = await createTrainerSettlementItem({
          trainerId: course.instructorId,
          sourceType: "course",
          sourceId: purchase.id,
          sourceName: course.title,
          category: course.category || null,
          grossAmount: Number(purchase.purchaseAmount),
          occurredAt: purchase.createdAt || new Date(),
        });
        res.json({ success: true, data: item });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logServerError("[정산 동기화] 강의 오류:", e, req);
        res.status(500).json({ success: false, message: msg });
      }
    }
  );

  // 환불/취소 시 항목 취소 (관리자 전용)
  app.post("/api/admin/trainer-settlements/cancel", requireAdmin, async (req, res) => {
    try {
      const body = z
        .object({
          sourceType: z.enum(["course", "order", "lesson"]),
          sourceId: z.number().int().positive(),
          reason: z.string().optional(),
        })
        .parse(req.body);
      const updated = await cancelTrainerSettlementItem(body.sourceType, body.sourceId, body.reason);
      res.json({ success: true, data: { canceled: updated } });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ success: false, errors: e.errors });
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ success: false, message: msg });
    }
  });

  // 백필: coursePurchases 중 정산 항목 없는 완료된 구매 모두 처리
  app.post("/api/admin/trainer-settlements/backfill", requireAdmin, async (_req, res) => {
    try {
      const purchases = await db
        .select({
          purchase: coursePurchases,
          course: courses,
        })
        .from(coursePurchases)
        .leftJoin(courses, eq(courses.id, coursePurchases.courseId))
        .where(eq(coursePurchases.paymentStatus, "completed"));

      let created = 0;
      for (const p of purchases) {
        if (!p.course?.instructorId) continue;
        const before = await db
          .select()
          .from(trainerSettlementItems)
          .where(
            and(
              eq(trainerSettlementItems.sourceType, "course"),
              eq(trainerSettlementItems.sourceId, p.purchase.id)
            )
          )
          .limit(1);
        if (before.length > 0) continue;
        await createTrainerSettlementItem({
          trainerId: p.course.instructorId,
          sourceType: "course",
          sourceId: p.purchase.id,
          sourceName: p.course.title,
          category: p.course.category || null,
          grossAmount: Number(p.purchase.purchaseAmount),
          occurredAt: p.purchase.createdAt || new Date(),
        });
        created++;
      }
      res.json({ success: true, data: { created } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logServerError("[정산 백필] 오류:", e);
      res.status(500).json({ success: false, message: msg });
    }
  });
}
