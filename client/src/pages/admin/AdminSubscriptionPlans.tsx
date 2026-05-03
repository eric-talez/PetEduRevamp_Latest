import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";

type Plan = {
  id: number;
  name: string;
  code: string;
  description?: string;
  price: number;
  currency: string;
  billingPeriod: "monthly" | "yearly";
  benefits: string[];
  audience: string;
  isActive: boolean;
  stripePriceId?: string | null;
};

type PlanForm = {
  name: string;
  code: string;
  description: string;
  price: string;
  currency: string;
  billingPeriod: "monthly" | "yearly";
  benefitsText: string;
  audience: string;
  isActive: boolean;
};

const emptyForm: PlanForm = {
  name: "",
  code: "",
  description: "",
  price: "0",
  currency: "KRW",
  billingPeriod: "monthly",
  benefitsText: "",
  audience: "user",
  isActive: true,
};

function planToForm(plan: Plan): PlanForm {
  return {
    name: plan.name,
    code: plan.code,
    description: plan.description || "",
    price: String(plan.price ?? 0),
    currency: plan.currency || "KRW",
    billingPeriod: plan.billingPeriod || "monthly",
    benefitsText: (plan.benefits || []).join("\n"),
    audience: plan.audience || "user",
    isActive: plan.isActive !== false,
  };
}

function formToPayload(form: PlanForm) {
  return {
    name: form.name.trim(),
    code: form.code.trim(),
    description: form.description.trim() || undefined,
    price: Number(form.price) || 0,
    currency: form.currency.trim().toUpperCase() || "KRW",
    billingPeriod: form.billingPeriod,
    benefits: form.benefitsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    audience: form.audience,
    isActive: form.isActive,
  };
}

export default function AdminSubscriptionPlans() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyForm);

  const { data, isLoading } = useQuery<{ plans: Plan[] }>({
    queryKey: ["/api/admin/subscription-plans"],
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/admin/subscription-plans", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "플랜이 생성되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      setDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "생성 실패", description: err?.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const res = await apiRequest("PATCH", `/api/admin/subscription-plans/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "플랜이 수정되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      setDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "수정 실패", description: err?.message, variant: "destructive" });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/subscription-plans/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "플랜이 비활성화되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
    },
    onError: (err: any) => {
      toast({ title: "삭제 실패", description: err?.message, variant: "destructive" });
    },
  });

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setForm(planToForm(plan));
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = formToPayload(form);
    if (!payload.name || !payload.code) {
      toast({ title: "이름과 코드는 필수입니다.", variant: "destructive" });
      return;
    }
    if (editingPlan) {
      const { code, ...rest } = payload;
      updateMutation.mutate({ id: editingPlan.id, payload: rest });
    } else {
      createMutation.mutate(payload);
    }
  };

  const plans = data?.plans || [];

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8" data-testid="page-admin-plans">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">구독 플랜 관리</h1>
          <p className="text-gray-600">정기 구독 플랜을 생성하고 관리합니다.</p>
        </div>
        <Button onClick={handleOpenCreate} data-testid="button-new-plan">
          <Plus className="mr-2 h-4 w-4" />
          새 플랜
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-gray-500">
            등록된 플랜이 없습니다. 새 플랜을 추가해주세요.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {plans.map((plan) => (
            <Card key={plan.id} data-testid={`card-plan-${plan.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {plan.name}
                      {plan.isActive ? (
                        <Badge className="bg-success/10 text-success">활성</Badge>
                      ) : (
                        <Badge variant="outline">비활성</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      코드: <span className="font-mono">{plan.code}</span> · 대상: {plan.audience}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEdit(plan)}
                      data-testid={`button-edit-${plan.id}`}
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      수정
                    </Button>
                    {plan.isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm(`'${plan.name}' 플랜을 비활성화하시겠어요?`)) {
                            deactivateMutation.mutate(plan.id);
                          }
                        }}
                        data-testid={`button-delete-${plan.id}`}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        비활성화
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <div className="text-xs text-gray-500">가격</div>
                    <div className="font-semibold">
                      {plan.price.toLocaleString()} {plan.currency}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">결제 주기</div>
                    <div className="font-semibold">
                      {plan.billingPeriod === "yearly" ? "연간" : "월간"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Stripe Price</div>
                    <div className="font-mono text-xs">
                      {plan.stripePriceId || <span className="text-gray-400">미생성</span>}
                    </div>
                  </div>
                </div>
                {plan.description && (
                  <p className="mt-3 text-sm text-gray-600">{plan.description}</p>
                )}
                {plan.benefits?.length ? (
                  <ul className="mt-3 list-inside list-disc text-sm text-gray-700">
                    {plan.benefits.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingPlan ? "플랜 수정" : "새 플랜 만들기"}</DialogTitle>
              <DialogDescription>
                플랜 정보를 입력하세요. Stripe 상품/가격은 자동으로 생성/갱신됩니다.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-3">
              <div className="grid gap-1.5">
                <Label htmlFor="plan-name">이름</Label>
                <Input
                  id="plan-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  data-testid="input-name"
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="plan-code">코드</Label>
                <Input
                  id="plan-code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  disabled={!!editingPlan}
                  data-testid="input-code"
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="plan-description">설명</Label>
                <Textarea
                  id="plan-description"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  data-testid="input-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="plan-price">가격</Label>
                  <Input
                    id="plan-price"
                    type="number"
                    min={0}
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    data-testid="input-price"
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="plan-currency">통화</Label>
                  <Input
                    id="plan-currency"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    data-testid="input-currency"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>결제 주기</Label>
                  <Select
                    value={form.billingPeriod}
                    onValueChange={(v) =>
                      setForm({ ...form, billingPeriod: v as "monthly" | "yearly" })
                    }
                  >
                    <SelectTrigger data-testid="select-period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">월간</SelectItem>
                      <SelectItem value="yearly">연간</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>대상</Label>
                  <Select
                    value={form.audience}
                    onValueChange={(v) => setForm({ ...form, audience: v })}
                  >
                    <SelectTrigger data-testid="select-audience">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">일반 사용자</SelectItem>
                      <SelectItem value="trainer">훈련사</SelectItem>
                      <SelectItem value="institute">기관</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="plan-benefits">혜택 (한 줄에 하나씩)</Label>
                <Textarea
                  id="plan-benefits"
                  rows={4}
                  value={form.benefitsText}
                  onChange={(e) => setForm({ ...form, benefitsText: e.target.value })}
                  data-testid="input-benefits"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                  data-testid="switch-active"
                />
                <Label>활성화</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                취소
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                저장
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
