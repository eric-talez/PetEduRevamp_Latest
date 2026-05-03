import type { Express, Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import { storage } from "../storage";
import { csrfProtection } from "../middleware/csrf";
import {
  insertSubscriptionPlanSchema,
  updateSubscriptionPlanSchema,
} from "../../shared/schema";
import { logServerError } from '../middleware/audit-logger';

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  try {
    return new Stripe(key, { apiVersion: "2023-10-16" });
  } catch (e) {
    logServerError("Stripe init failed", e);
    return null;
  }
}

function requireUser(req: any, res: Response, next: NextFunction) {
  const user = req.user || req.session?.user;
  if (!user) {
    return res.status(401).json({ error: "로그인이 필요합니다." });
  }
  req.user = user;
  next();
}

function requireAdmin(req: any, res: Response, next: NextFunction) {
  const user = req.user || req.session?.user;
  if (!user) return res.status(401).json({ error: "로그인이 필요합니다." });
  if (user.role !== "admin") return res.status(403).json({ error: "관리자 권한이 필요합니다." });
  req.user = user;
  next();
}

function getBaseUrl(req: Request): string {
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host = (req.headers["x-forwarded-host"] as string) || req.get("host");
  return `${proto}://${host}`;
}

async function ensureStripeProductForPlan(stripe: Stripe, plan: any) {
  if (plan.stripePriceId && plan.stripeProductId) return plan;
  let productId = plan.stripeProductId;
  if (!productId) {
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description || undefined,
      metadata: { planId: String(plan.id), planCode: plan.code },
    });
    productId = product.id;
  }
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: Math.round(Number(plan.price) || 0),
    currency: (plan.currency || "krw").toLowerCase(),
    recurring: {
      interval: plan.billingPeriod === "yearly" ? "year" : "month",
    },
  });
  const updated = storage.updateSubscriptionPlan(plan.id, {
    stripeProductId: productId,
    stripePriceId: price.id,
  });
  return updated || { ...plan, stripeProductId: productId, stripePriceId: price.id };
}

function serializePlan(p: any) {
  return {
    id: p.id,
    name: p.name,
    code: p.code,
    description: p.description,
    price: Number(p.price) || 0,
    currency: p.currency || "KRW",
    billingPeriod: p.billingPeriod || "monthly",
    benefits: Array.isArray(p.benefits) ? p.benefits : [],
    features: p.features || {},
    audience: p.audience || "user",
    isActive: p.isActive !== false,
    stripePriceId: p.stripePriceId || null,
  };
}

// 구독 상태별 접근 권한 정책
// - active / trialing / past_due: 접근 허용 (past_due는 Stripe 자동 재시도 기간)
// - unpaid / canceled / incomplete_expired: 접근 차단 (최종 실패 또는 종료)
const ACCESS_GRANTED_STATUSES = new Set(["active", "trialing", "past_due"]);
const ACCESS_REVOKED_STATUSES = new Set([
  "unpaid",
  "canceled",
  "incomplete_expired",
]);

function hasSubscriptionAccess(sub: any | null | undefined): boolean {
  if (!sub) return false;
  return ACCESS_GRANTED_STATUSES.has(sub.status);
}

function serializeSubscription(sub: any, plan: any | null) {
  if (!sub) return null;
  return {
    id: sub.id,
    status: sub.status,
    planId: sub.planId,
    plan: plan ? serializePlan(plan) : null,
    currentPeriodStart: sub.currentPeriodStart || null,
    currentPeriodEnd: sub.currentPeriodEnd || null,
    cancelAtPeriodEnd: !!sub.cancelAtPeriodEnd,
    canceledAt: sub.canceledAt || null,
    paymentMethod:
      sub.defaultPaymentMethodBrand || sub.defaultPaymentMethodLast4
        ? {
            brand: sub.defaultPaymentMethodBrand || null,
            last4: sub.defaultPaymentMethodLast4 || null,
          }
        : null,
    latestInvoiceStatus: sub.latestInvoiceStatus || null,
    hasAccess: hasSubscriptionAccess(sub),
    isPastDue:
      sub.status === "past_due" ||
      sub.latestInvoiceStatus === "open" ||
      sub.latestInvoiceStatus === "uncollectible",
  };
}

// Webhook 이벤트로부터 사용자 권한/엔타이틀먼트를 동기화한다.
// 활성 상태(active/trialing/past_due)면 플랜 코드를 부여하고,
// 종료 상태(canceled/unpaid/incomplete_expired)면 권한을 회수한다.
function syncUserEntitlement(userId: number, sub: any | null, plan: any | null) {
  try {
    const user = (storage as any).getUser?.(userId);
    if (!user) return;
    const updates: Record<string, any> = {};
    if (sub && ACCESS_GRANTED_STATUSES.has(sub.status)) {
      updates.subscriptionStatus = "active";
      updates.subscriptionTier = plan?.code || sub.planId || null;
      updates.subscriptionPlanId = sub.planId || null;
      updates.subscriptionExpiresAt = sub.currentPeriodEnd || null;
    } else if (!sub || ACCESS_REVOKED_STATUSES.has(sub.status)) {
      updates.subscriptionStatus = "inactive";
      updates.subscriptionTier = null;
      updates.subscriptionPlanId = null;
    } else {
      // incomplete 등 중간 상태는 변경하지 않음
      return;
    }
    (storage as any).updateUser?.(userId, updates);
  } catch (e) {
    logServerError("Entitlement sync 실패:", e);
  }
}

function periodToDate(ts: number | null | undefined): Date | null {
  if (!ts) return null;
  return new Date(ts * 1000);
}

async function applySubscriptionFromStripe(stripe: Stripe, stripeSub: Stripe.Subscription, opts: { userId?: number } = {}) {
  const planMeta = stripeSub.metadata?.planId;
  let planId: number | null = planMeta ? parseInt(planMeta, 10) : null;
  if (!planId) {
    const priceId = stripeSub.items.data[0]?.price?.id;
    const plan = priceId
      ? storage.getAllSubscriptionPlans().find((p: any) => p.stripePriceId === priceId)
      : null;
    if (plan) planId = plan.id;
  }
  let userId = opts.userId;
  if (!userId && stripeSub.metadata?.userId) {
    userId = parseInt(stripeSub.metadata.userId, 10);
  }
  if (!userId) {
    const existing = storage.getUserSubscriptionByStripeId(stripeSub.id);
    userId = existing?.userId;
  }
  if (!userId || !planId) {
    console.warn("Cannot map subscription to user/plan", stripeSub.id);
    return null;
  }
  const item = stripeSub.items.data[0] as Stripe.SubscriptionItem | undefined;
  let pmBrand: string | null = null;
  let pmLast4: string | null = null;
  const pmRef = stripeSub.default_payment_method;
  const pmId = typeof pmRef === "string" ? pmRef : pmRef?.id ?? null;
  if (pmId) {
    try {
      const pm = await stripe.paymentMethods.retrieve(pmId);
      pmBrand = pm.card?.brand ?? null;
      pmLast4 = pm.card?.last4 ?? null;
    } catch {
      // payment method 조회 실패는 치명적이지 않음
    }
  }
  const subAny = stripeSub as unknown as {
    current_period_start?: number;
    current_period_end?: number;
  };
  const itemAny = item as unknown as
    | { current_period_start?: number; current_period_end?: number }
    | undefined;
  const customerId =
    typeof stripeSub.customer === "string" ? stripeSub.customer : stripeSub.customer?.id;
  const latestInvoiceStatus =
    typeof stripeSub.latest_invoice === "object" && stripeSub.latest_invoice
      ? (stripeSub.latest_invoice as Stripe.Invoice).status ?? null
      : undefined;
  const localSub = storage.upsertUserSubscription({
    userId,
    planId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: stripeSub.id,
    status: stripeSub.status,
    currentPeriodStart: periodToDate(itemAny?.current_period_start ?? subAny.current_period_start),
    currentPeriodEnd: periodToDate(itemAny?.current_period_end ?? subAny.current_period_end),
    cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
    canceledAt: stripeSub.canceled_at ? periodToDate(stripeSub.canceled_at) : null,
    defaultPaymentMethodBrand: pmBrand,
    defaultPaymentMethodLast4: pmLast4,
    latestInvoiceStatus,
  });
  // 사용자 엔타이틀먼트(권한) 동기화 — 활성/체험/재시도(past_due) 동안 권한 유지,
  // 최종 실패(unpaid)·해지(canceled)·만료(incomplete_expired) 시 권한 회수.
  const planForSync = planId ? storage.getSubscriptionPlanById(planId) : null;
  syncUserEntitlement(userId, localSub, planForSync);
  return localSub;
}

export function registerSubscriptionRoutes(app: Express) {
  // Stripe Webhook은 raw body 필요. 다른 미들웨어가 json 파싱하기 전에 등록되도록
  // routes.ts에서 이 함수를 가능한 한 일찍 호출해야 함.
  app.post(
    "/api/stripe/subscription-webhook",
    async (req, res) => {
      const stripe = getStripe();
      const sig = req.headers["stripe-signature"] as string;
      const webhookSecret =
        process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
      if (!stripe) return res.status(500).send("Stripe not initialized");
      if (!webhookSecret) return res.status(500).send("Webhook secret not configured");

      let event: Stripe.Event;
      try {
        const rawBody = (req as any).rawBody || req.body;
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
      } catch (err: any) {
        logServerError("Webhook signature verification failed:", err.message, req);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      try {
        switch (event.type) {
          case "customer.subscription.created":
          case "customer.subscription.updated":
          case "customer.subscription.deleted": {
            const sub = event.data.object as Stripe.Subscription;
            await applySubscriptionFromStripe(stripe, sub);
            break;
          }
          case "invoice.paid":
          case "invoice.payment_succeeded":
          case "invoice.payment_failed":
          case "invoice.finalized": {
            const invoice = event.data.object as Stripe.Invoice;
            const stripeSubId = (invoice as any).subscription as string | null;
            const local = stripeSubId ? storage.getUserSubscriptionByStripeId(stripeSubId) : null;
            const userId = local?.userId;
            if (userId) {
              storage.addSubscriptionInvoice({
                userSubscriptionId: local?.id,
                userId,
                stripeInvoiceId: invoice.id,
                amountDue: invoice.amount_due,
                amountPaid: invoice.amount_paid,
                currency: invoice.currency,
                status: invoice.status || "open",
                hostedInvoiceUrl: invoice.hosted_invoice_url || null,
                periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
                periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
                paidAt: invoice.status_transitions?.paid_at
                  ? new Date(invoice.status_transitions.paid_at * 1000)
                  : null,
                failureMessage:
                  event.type === "invoice.payment_failed"
                    ? (invoice.last_finalization_error?.message || "결제 실패")
                    : null,
              });
              if (local) {
                storage.upsertUserSubscription({
                  ...local,
                  latestInvoiceStatus: invoice.status,
                });
              }
            }
            // 구독 상태도 함께 갱신
            if (stripeSubId) {
              try {
                const fresh = await stripe.subscriptions.retrieve(stripeSubId);
                await applySubscriptionFromStripe(stripe, fresh);
              } catch {
                // ignore
              }
            }
            break;
          }
          default:
            // ignore other events
            break;
        }
        res.json({ received: true });
      } catch (err: any) {
        logServerError("Webhook handler error", err, req);
        res.status(500).send(`Webhook handler error: ${err.message}`);
      }
    }
  );

  // Public: 활성 플랜 목록
  app.get("/api/subscription-plans", (req, res) => {
    const plans = storage.getAllSubscriptionPlans();
    const audience = (req.query.audience as string) || undefined;
    const filtered = plans.filter((p: any) => {
      if (p.isActive === false) return false;
      if (audience) return (p.audience || "user") === audience;
      return (p.audience || "user") === "user";
    });
    res.json({ plans: filtered.map(serializePlan) });
  });

  // Admin: 전체 플랜 (비활성 포함)
  app.get("/api/admin/subscription-plans", requireAdmin, (req, res) => {
    const plans = storage.getAllSubscriptionPlans();
    res.json({ plans: plans.map(serializePlan) });
  });

  app.post("/api/admin/subscription-plans", requireAdmin, csrfProtection, async (req, res) => {
    try {
      const data = insertSubscriptionPlanSchema.parse(req.body);
      const exists = storage.getSubscriptionPlan(data.code);
      if (exists) return res.status(409).json({ error: "이미 존재하는 플랜 코드입니다." });
      let plan = storage.createSubscriptionPlan(data);
      const stripe = getStripe();
      if (stripe) {
        try {
          plan = await ensureStripeProductForPlan(stripe, plan);
        } catch (e) {
          logServerError("Stripe product create failed", e, req);
        }
      }
      res.json({ plan: serializePlan(plan) });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "잘못된 요청입니다." });
    }
  });

  app.patch("/api/admin/subscription-plans/:id", requireAdmin, csrfProtection, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const data = updateSubscriptionPlanSchema.parse(req.body);
      const existing = storage.getSubscriptionPlanById(id);
      if (!existing) return res.status(404).json({ error: "플랜을 찾을 수 없습니다." });
      const priceChanged =
        (data.price !== undefined && Number(data.price) !== Number(existing.price)) ||
        (data.billingPeriod && data.billingPeriod !== existing.billingPeriod) ||
        (data.currency && data.currency !== existing.currency);
      let updated = storage.updateSubscriptionPlan(id, data);
      const stripe = getStripe();
      if (stripe && updated && (priceChanged || !updated.stripePriceId)) {
        try {
          // 가격이 바뀌면 새 Price 생성 (기존 Price는 비활성)
          if (existing.stripePriceId && priceChanged) {
            try {
              await stripe.prices.update(existing.stripePriceId, { active: false });
            } catch {
              // ignore
            }
            storage.updateSubscriptionPlan(id, { stripePriceId: undefined });
            updated = storage.getSubscriptionPlanById(id);
          }
          updated = await ensureStripeProductForPlan(stripe, updated!);
        } catch (e) {
          logServerError("Stripe price update failed", e, req);
        }
      }
      res.json({ plan: serializePlan(updated) });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "잘못된 요청입니다." });
    }
  });

  app.delete("/api/admin/subscription-plans/:id", requireAdmin, csrfProtection, (req, res) => {
    const id = parseInt(req.params.id, 10);
    const updated = storage.deactivateSubscriptionPlan(id);
    if (!updated) return res.status(404).json({ error: "플랜을 찾을 수 없습니다." });
    res.json({ plan: serializePlan(updated) });
  });

  // 사용자: 내 구독 정보
  app.get("/api/subscriptions/me", requireUser, (req: any, res) => {
    const userId = req.user.id;
    const sub = storage.getUserSubscriptionByUserId(userId);
    const plan = sub ? storage.getSubscriptionPlanById(sub.planId) : null;
    const invoices = storage.getInvoicesByUserId(userId).slice(0, 12);
    res.json({
      subscription: serializeSubscription(sub, plan),
      invoices: invoices.map((i: any) => ({
        id: i.id,
        amount: i.amountPaid || i.amountDue,
        currency: i.currency,
        status: i.status,
        hostedInvoiceUrl: i.hostedInvoiceUrl,
        paidAt: i.paidAt,
        periodStart: i.periodStart,
        periodEnd: i.periodEnd,
        failureMessage: i.failureMessage,
        createdAt: i.createdAt,
      })),
    });
  });

  // 사용자: Stripe Checkout 세션 생성 (또는 활성 구독이면 플랜 변경)
  app.post("/api/subscriptions/checkout", requireUser, csrfProtection, async (req: any, res) => {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ error: "결제 시스템이 설정되지 않았습니다." });
    const planIdRaw = req.body?.planId;
    const planId = typeof planIdRaw === "number" ? planIdRaw : parseInt(planIdRaw, 10);
    if (!planId) return res.status(400).json({ error: "planId가 필요합니다." });
    let plan = storage.getSubscriptionPlanById(planId);
    if (!plan || plan.isActive === false) return res.status(404).json({ error: "플랜을 찾을 수 없습니다." });
    try {
      plan = await ensureStripeProductForPlan(stripe, plan);
      const baseUrl = getBaseUrl(req);

      const existing = storage.getUserSubscriptionByUserId(req.user.id);

      // 이미 활성/체험/재시도 중인 Stripe 구독이 있으면 새 Checkout 대신 in-place 변경.
      // 동일 사용자에게 중복 구독이 생기지 않도록 함.
      if (
        existing?.stripeSubscriptionId &&
        ACCESS_GRANTED_STATUSES.has(existing.status)
      ) {
        if (existing.planId === plan.id) {
          return res.status(409).json({ error: "이미 해당 플랜을 이용 중입니다." });
        }
        try {
          const current = await stripe.subscriptions.retrieve(existing.stripeSubscriptionId);
          const itemId = current.items.data[0]?.id;
          if (!itemId) throw new Error("기존 구독 항목을 찾을 수 없습니다.");
          const updated = await stripe.subscriptions.update(existing.stripeSubscriptionId, {
            items: [{ id: itemId, price: plan.stripePriceId! }],
            proration_behavior: "create_prorations",
            metadata: { userId: String(req.user.id), planId: String(plan.id) },
          });
          const local = await applySubscriptionFromStripe(stripe, updated, { userId: req.user.id });
          const planForResp = local ? storage.getSubscriptionPlanById(local.planId) : plan;
          return res.json({
            changed: true,
            url: null,
            subscription: serializeSubscription(local, planForResp),
          });
        } catch (err: any) {
          logServerError("Plan change failed", err, req);
          return res.status(500).json({ error: err.message || "플랜 변경에 실패했습니다." });
        }
      }

      let customerId: string | undefined = existing?.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: req.user.email,
          name: req.user.name || req.user.username,
          metadata: { userId: String(req.user.id) },
        });
        customerId = customer.id;
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: plan.stripePriceId!, quantity: 1 }],
        success_url: `${baseUrl}/subscriptions?status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/subscriptions?status=cancel`,
        subscription_data: {
          metadata: { userId: String(req.user.id), planId: String(plan.id) },
        },
        metadata: { userId: String(req.user.id), planId: String(plan.id) },
      });

      // customerId 보존을 위해 placeholder upsert (활성 구독 행은 덮어쓰지 않음 — storage 가드 참조)
      storage.upsertUserSubscription({
        userId: req.user.id,
        planId: plan.id,
        stripeCustomerId: customerId,
        status: "incomplete",
      });

      res.json({ url: session.url, sessionId: session.id });
    } catch (err: any) {
      logServerError("Checkout session create failed", err, req);
      res.status(500).json({ error: err.message || "체크아웃 세션 생성에 실패했습니다." });
    }
  });

  // 사용자: 구독 해지 (현재 결제 주기 종료 시점)
  app.post("/api/subscriptions/cancel", requireUser, csrfProtection, async (req: any, res) => {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ error: "결제 시스템이 설정되지 않았습니다." });
    const sub = storage.getUserSubscriptionByUserId(req.user.id);
    if (!sub || !sub.stripeSubscriptionId) {
      return res.status(404).json({ error: "활성 구독이 없습니다." });
    }
    try {
      const updated = await stripe.subscriptions.update(sub.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
      const local = await applySubscriptionFromStripe(stripe, updated);
      const plan = local ? storage.getSubscriptionPlanById(local.planId) : null;
      res.json({ subscription: serializeSubscription(local, plan) });
    } catch (err: any) {
      logServerError("Subscription cancel failed", err, req);
      res.status(500).json({ error: err.message || "구독 해지에 실패했습니다." });
    }
  });

  // 사용자: 해지 취소 (다시 활성화)
  app.post("/api/subscriptions/resume", requireUser, csrfProtection, async (req: any, res) => {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ error: "결제 시스템이 설정되지 않았습니다." });
    const sub = storage.getUserSubscriptionByUserId(req.user.id);
    if (!sub?.stripeSubscriptionId) return res.status(404).json({ error: "활성 구독이 없습니다." });
    try {
      const updated = await stripe.subscriptions.update(sub.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });
      const local = await applySubscriptionFromStripe(stripe, updated);
      const plan = local ? storage.getSubscriptionPlanById(local.planId) : null;
      res.json({ subscription: serializeSubscription(local, plan) });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "구독 재개에 실패했습니다." });
    }
  });
}
