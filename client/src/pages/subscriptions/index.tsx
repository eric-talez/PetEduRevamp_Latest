import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CreditCard,
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2,
  XCircle,
} from "lucide-react";

type Plan = {
  id: number;
  name: string;
  code: string;
  description?: string;
  price: number;
  currency: string;
  billingPeriod: "monthly" | "yearly";
  benefits: string[];
  isActive: boolean;
};

type Subscription = {
  id: number;
  status: string;
  planId: number;
  plan: Plan | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  paymentMethod: { brand: string | null; last4: string | null } | null;
  latestInvoiceStatus: string | null;
  hasAccess: boolean;
  isPastDue: boolean;
};

type Invoice = {
  id: number;
  amount: number;
  currency: string;
  status: string;
  hostedInvoiceUrl: string | null;
  paidAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  failureMessage: string | null;
  createdAt: string;
};

function formatPrice(amount: number, currency: string) {
  if ((currency || "KRW").toUpperCase() === "KRW") {
    return `${Math.round(amount).toLocaleString("ko-KR")}원`;
  }
  return `${amount.toLocaleString()} ${currency.toUpperCase()}`;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "active":
      return { label: "활성", color: "bg-success/10 text-success" };
    case "trialing":
      return { label: "체험 중", color: "bg-primary/10 text-primary" };
    case "past_due":
      return { label: "결제 실패 (재시도 중)", color: "bg-warning/10 text-warning" };
    case "canceled":
      return { label: "해지됨", color: "bg-gray-200 text-gray-700" };
    case "incomplete":
      return { label: "결제 진행 중", color: "bg-primary/10 text-primary" };
    case "unpaid":
      return { label: "미납", color: "bg-destructive/10 text-destructive" };
    default:
      return { label: status || "-", color: "bg-gray-100 text-gray-800" };
  }
}

export default function SubscriptionsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [pendingPlanId, setPendingPlanId] = useState<number | null>(null);

  const { data: meData, isLoading: meLoading } = useQuery<{
    subscription: Subscription | null;
    invoices: Invoice[];
  }>({
    queryKey: ["/api/subscriptions/me"],
  });

  const { data: plansData, isLoading: plansLoading } = useQuery<{ plans: Plan[] }>({
    queryKey: ["/api/subscription-plans"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (planId: number) => {
      const res = await apiRequest("POST", "/api/subscriptions/checkout", { planId });
      return res.json();
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.changed) {
        toast({
          title: "플랜이 변경되었습니다",
          description: "다음 결제부터 새 플랜이 적용됩니다.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/me"] });
      } else {
        toast({
          title: "결제 페이지로 이동할 수 없습니다",
          description: "잠시 후 다시 시도해주세요.",
          variant: "destructive",
        });
      }
    },
    onError: (err: any) => {
      toast({
        title: "결제 시작 실패",
        description: err?.message || "잠시 후 다시 시도해주세요.",
        variant: "destructive",
      });
    },
    onSettled: () => setPendingPlanId(null),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscriptions/cancel", {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "구독 해지가 예약되었습니다",
        description: "현재 결제 주기 종료일까지 서비스를 이용할 수 있습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/me"] });
    },
    onError: (err: any) => {
      toast({
        title: "해지 실패",
        description: err?.message || "잠시 후 다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscriptions/resume", {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "구독이 다시 활성화되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/me"] });
    },
    onError: (err: any) => {
      toast({
        title: "재개 실패",
        description: err?.message || "잠시 후 다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const subscription = meData?.subscription || null;
  const invoices = meData?.invoices || [];
  const allPlans = plansData?.plans || [];
  const status = subscription ? statusLabel(subscription.status) : null;

  if (meLoading || plansLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const hasActiveSub = subscription && ["active", "trialing", "past_due"].includes(subscription.status);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8" data-testid="page-subscriptions">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">구독 관리</h1>
        <p className="text-gray-600">현재 구독 플랜과 결제 내역을 관리하세요.</p>
      </div>

      {subscription?.isPastDue && (
        <Alert variant="destructive" className="mb-6" data-testid="alert-past-due">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>결제에 실패했습니다</AlertTitle>
          <AlertDescription>
            등록하신 결제 수단으로 결제가 실패했습니다. Stripe가 자동으로 재시도하는 동안에는
            서비스를 계속 이용할 수 있지만, 재시도가 모두 실패하면 구독이 해지되며 기능 접근이
            제한됩니다. 결제 수단을 확인해주세요.
          </AlertDescription>
        </Alert>
      )}

      {subscription?.cancelAtPeriodEnd && (
        <Alert className="mb-6" data-testid="alert-cancel-scheduled">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>해지가 예약되어 있습니다</AlertTitle>
          <AlertDescription>
            {formatDate(subscription.currentPeriodEnd)}에 구독이 종료됩니다. 그 전까지는
            서비스를 정상적으로 이용할 수 있습니다.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card data-testid="card-current-subscription">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">현재 구독</CardTitle>
                  <CardDescription>
                    {hasActiveSub ? "현재 이용 중인 플랜 정보입니다." : "활성화된 구독이 없습니다."}
                  </CardDescription>
                </div>
                {status && (
                  <Badge className={status.color} data-testid="badge-status">
                    {status.label}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {hasActiveSub && subscription ? (
                <div className="space-y-4">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-2xl font-semibold" data-testid="text-plan-name">
                        {subscription.plan?.name || "플랜"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {subscription.plan?.billingPeriod === "yearly" ? "연간 결제" : "월간 결제"}
                      </div>
                    </div>
                    {subscription.plan && (
                      <div className="text-right">
                        <div className="text-xl font-semibold" data-testid="text-plan-price">
                          {formatPrice(subscription.plan.price, subscription.plan.currency)}
                        </div>
                        <div className="text-xs text-gray-500">
                          / {subscription.plan.billingPeriod === "yearly" ? "년" : "월"}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
                    <div className="flex items-start gap-3">
                      <Calendar className="mt-0.5 h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-xs text-gray-500">다음 결제일</div>
                        <div className="text-sm font-medium" data-testid="text-next-billing">
                          {formatDate(subscription.currentPeriodEnd)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CreditCard className="mt-0.5 h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-xs text-gray-500">결제 수단</div>
                        <div className="text-sm font-medium" data-testid="text-payment-method">
                          {subscription.paymentMethod?.brand
                            ? `${subscription.paymentMethod.brand.toUpperCase()} •••• ${subscription.paymentMethod.last4 || ""}`
                            : "등록된 카드 없음"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {subscription.plan?.benefits?.length ? (
                    <div className="border-t pt-4">
                      <div className="mb-2 text-xs font-medium text-gray-500">제공 혜택</div>
                      <ul className="space-y-1">
                        {subscription.plan.benefits.map((b, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="mt-0.5 h-4 w-4 text-success" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2 border-t pt-4">
                    {subscription.cancelAtPeriodEnd ? (
                      <Button
                        onClick={() => resumeMutation.mutate()}
                        disabled={resumeMutation.isPending}
                        data-testid="button-resume"
                      >
                        {resumeMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        구독 재개
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (confirm("정말로 구독을 해지하시겠어요? 현재 결제 주기 종료 시점에 종료됩니다.")) {
                            cancelMutation.mutate();
                          }
                        }}
                        disabled={cancelMutation.isPending}
                        data-testid="button-cancel"
                      >
                        {cancelMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        구독 해지
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-gray-500">
                  아래에서 원하는 플랜을 선택하여 구독을 시작하세요.
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-billing-history">
            <CardHeader>
              <CardTitle className="text-lg">결제 내역</CardTitle>
              <CardDescription>최근 결제 내역입니다.</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-500">아직 결제 내역이 없습니다.</div>
              ) : (
                <div className="space-y-2">
                  {invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
                      data-testid={`row-invoice-${inv.id}`}
                    >
                      <div>
                        <div className="font-medium">
                          {formatDate(inv.paidAt || inv.createdAt)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(inv.periodStart)} ~ {formatDate(inv.periodEnd)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">
                          {formatPrice((inv.amount || 0) / ((inv.currency || "krw").toLowerCase() === "krw" ? 1 : 100), inv.currency)}
                        </span>
                        {inv.status === "paid" ? (
                          <Badge className="bg-success/10 text-success">결제 완료</Badge>
                        ) : inv.status === "open" ? (
                          <Badge className="bg-warning/10 text-warning">미결제</Badge>
                        ) : inv.status === "uncollectible" || inv.failureMessage ? (
                          <Badge className="bg-destructive/10 text-destructive">결제 실패</Badge>
                        ) : (
                          <Badge variant="outline">{inv.status}</Badge>
                        )}
                        {inv.hostedInvoiceUrl && (
                          <a
                            href={inv.hostedInvoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            영수증 보기
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">플랜 선택</CardTitle>
              <CardDescription>
                {hasActiveSub ? "다른 플랜으로 변경할 수 있습니다." : "원하는 플랜을 선택하세요."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {allPlans.length === 0 ? (
                <div className="py-4 text-center text-sm text-gray-500">
                  사용 가능한 플랜이 없습니다.
                </div>
              ) : (
                allPlans.map((plan) => {
                  const isCurrent = subscription?.plan?.id === plan.id && hasActiveSub;
                  return (
                    <div
                      key={plan.id}
                      className="rounded-lg border p-4"
                      data-testid={`card-plan-${plan.id}`}
                    >
                      <div className="flex items-baseline justify-between">
                        <div className="font-semibold">{plan.name}</div>
                        <div className="text-sm font-semibold">
                          {formatPrice(plan.price, plan.currency)}
                          <span className="ml-1 text-xs text-gray-500">
                            / {plan.billingPeriod === "yearly" ? "년" : "월"}
                          </span>
                        </div>
                      </div>
                      {plan.description && (
                        <div className="mt-1 text-xs text-gray-500">{plan.description}</div>
                      )}
                      {plan.benefits?.length ? (
                        <ul className="mt-3 space-y-1">
                          {plan.benefits.slice(0, 4).map((b, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                              <CheckCircle className="mt-0.5 h-3 w-3 text-success" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <Button
                        className="mt-4 w-full"
                        size="sm"
                        disabled={
                          isCurrent ||
                          checkoutMutation.isPending ||
                          pendingPlanId === plan.id
                        }
                        onClick={() => {
                          setPendingPlanId(plan.id);
                          checkoutMutation.mutate(plan.id);
                        }}
                        data-testid={`button-subscribe-${plan.id}`}
                      >
                        {pendingPlanId === plan.id && checkoutMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {isCurrent ? "현재 이용 중" : hasActiveSub ? "이 플랜으로 변경" : "구독 시작"}
                      </Button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
