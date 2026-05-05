import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { StoreOrder, StoreOrderItem, StoreOrderStatus } from "@shared/schema";
import { STORE_ORDER_STATUSES } from "@shared/schema";
import { RefreshCw, ChefHat, CheckCircle2, XCircle, Clock, PlayCircle } from "lucide-react";

const KRW = (n: number) => `${n.toLocaleString("ko-KR")}원`;

const STATUS_LABEL: Record<StoreOrderStatus, string> = {
  pending: "접수대기",
  confirmed: "확인완료",
  preparing: "준비중",
  served: "제공완료",
  cancelled: "취소",
};

const STATUS_STYLE: Record<StoreOrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  confirmed: "bg-blue-100 text-blue-800 border-blue-300",
  preparing: "bg-purple-100 text-purple-800 border-purple-300",
  served: "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-stone-200 text-stone-600 border-stone-300",
};

const STATUS_ICON: Record<StoreOrderStatus, JSX.Element> = {
  pending: <Clock className="w-4 h-4" />,
  confirmed: <CheckCircle2 className="w-4 h-4" />,
  preparing: <ChefHat className="w-4 h-4" />,
  served: <PlayCircle className="w-4 h-4" />,
  cancelled: <XCircle className="w-4 h-4" />,
};

const NEXT_STATUS: Record<StoreOrderStatus, StoreOrderStatus | null> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "served",
  served: null,
  cancelled: null,
};

type OrderWithItems = StoreOrder & { items: StoreOrderItem[] };

export default function AdminStoreOrdersPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const today = new Date().toISOString().slice(0, 10);
  const [dateFilter, setDateFilter] = useState<string>(today);

  const queryKey = ["/api/admin/store/orders", { status: statusFilter, date: dateFilter }] as const;

  const { data, isLoading, refetch, isFetching } = useQuery<{ success: boolean; data: OrderWithItems[] }>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (dateFilter) params.set("date", dateFilter);
      const res = await fetch(`/api/admin/store/orders?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("주문 조회 실패");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: StoreOrderStatus }) => {
      const res = await apiRequest("PATCH", `/api/admin/store/orders/${id}/status`, { status });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "상태 변경 실패");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/store/orders"] });
      toast({ title: "상태가 변경되었습니다" });
    },
    onError: (e: Error) => toast({ title: "오류", description: e.message, variant: "destructive" }),
  });

  const orders = data?.data ?? [];
  const summary = orders.reduce((acc, o) => {
    acc[o.status as StoreOrderStatus] = (acc[o.status as StoreOrderStatus] ?? 0) + 1;
    return acc;
  }, {} as Record<StoreOrderStatus, number>);
  const dailyTotal = orders
    .filter(o => o.status !== "cancelled")
    .reduce((s, o) => s + o.totalAmount, 0);

  return (
    <div className="min-h-screen bg-stone-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">매장 주문 접수</h1>
            <p className="text-sm text-stone-500 mt-1">
              QR 주문이 들어오면 여기에 표시됩니다. 확인 후 포스기에 직접 입력해주세요.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-44"
              data-testid="input-date-filter"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36" data-testid="select-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {STORE_ORDER_STATUSES.map(s => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching} data-testid="button-refresh">
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          {STORE_ORDER_STATUSES.map(s => (
            <Card key={s} className="p-3">
              <div className="text-xs text-stone-500">{STATUS_LABEL[s]}</div>
              <div className="text-2xl font-bold mt-1">{summary[s] ?? 0}</div>
            </Card>
          ))}
          <Card className="p-3 bg-stone-900 text-white">
            <div className="text-xs text-stone-300">일 매출(예상)</div>
            <div className="text-xl font-bold mt-1">{KRW(dailyTotal)}</div>
          </Card>
        </div>

        {isLoading && <div className="text-center py-12 text-stone-500">불러오는 중…</div>}
        {!isLoading && orders.length === 0 && (
          <Card className="p-12 text-center text-stone-500">조회된 주문이 없습니다.</Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map(order => {
            const status = order.status as StoreOrderStatus;
            const next = NEXT_STATUS[status];
            return (
              <Card key={order.id} className="p-4" data-testid={`card-order-${order.id}`}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="text-xs text-stone-500">주문번호</div>
                    <div className="font-mono font-bold text-lg">{order.orderNumber}</div>
                  </div>
                  <Badge className={`${STATUS_STYLE[status]} border flex items-center gap-1`}>
                    {STATUS_ICON[status]}
                    {STATUS_LABEL[status]}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-sm mb-3">
                  <Badge variant="outline" className="text-base font-bold px-3 py-1">
                    테이블 {order.tableNo}
                  </Badge>
                  <span className="text-stone-500 text-xs">
                    {order.createdAt ? new Date(order.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                </div>

                <div className="bg-stone-50 rounded-lg p-3 space-y-1.5 mb-3">
                  {order.items.map(it => (
                    <div key={it.id} className="flex justify-between text-sm">
                      <span className="font-medium">{it.name} <span className="text-stone-500">× {it.quantity}</span></span>
                      <span className="text-stone-700">{KRW(it.price * it.quantity)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 mt-2 border-t font-bold">
                    <span>합계</span>
                    <span>{KRW(order.totalAmount)}</span>
                  </div>
                </div>

                {order.requestNote && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-3 text-sm">
                    <div className="text-xs text-amber-700 font-semibold mb-1">요청사항</div>
                    <div className="text-stone-700">{order.requestNote}</div>
                  </div>
                )}

                <div className="flex gap-2">
                  {next && (
                    <Button
                      className="flex-1 bg-stone-900 hover:bg-stone-800"
                      onClick={() => updateStatus.mutate({ id: order.id, status: next })}
                      disabled={updateStatus.isPending}
                      data-testid={`button-next-status-${order.id}`}
                    >
                      → {STATUS_LABEL[next]}
                    </Button>
                  )}
                  {status !== "cancelled" && status !== "served" && (
                    <Button
                      variant="outline"
                      onClick={() => updateStatus.mutate({ id: order.id, status: "cancelled" })}
                      disabled={updateStatus.isPending}
                      data-testid={`button-cancel-${order.id}`}
                    >
                      취소
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
