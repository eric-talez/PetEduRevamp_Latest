import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Minus, ShoppingBag, X, Coffee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { StoreMenuItem } from "@shared/schema";

const KRW = (n: number) => `${n.toLocaleString("ko-KR")}원`;

const CATEGORY_LABEL: Record<string, string> = {
  "COFFEE": "COFFEE",
  "NON-COFFEE": "NON-COFFEE",
  "SIGNATURE FOOD": "SIGNATURE FOOD",
  "BAR": "BAR",
  "SET MENU": "SET MENU",
};

interface CartItem {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
}

export default function CustomerOrderPage() {
  const [location] = useLocation();
  const { toast } = useToast();
  const params = new URLSearchParams(location.split("?")[1] || "");
  const initialTable = params.get("tableNo") || "";

  const [tableNo, setTableNo] = useState(initialTable);
  const [requestNote, setRequestNote] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCat, setActiveCat] = useState<string>("");
  const [cartOpen, setCartOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<{ orderNumber: string; tableNo: string; total: number } | null>(null);

  const { data: menuData, isLoading } = useQuery<{ success: boolean; data: { items: StoreMenuItem[]; grouped: Record<string, StoreMenuItem[]> } }>({
    queryKey: ["/api/store/menu"],
  });

  const grouped = menuData?.data?.grouped ?? {};
  const categories = useMemo(() => Object.keys(grouped), [grouped]);

  useEffect(() => {
    if (categories.length > 0 && !activeCat) setActiveCat(categories[0]);
  }, [categories, activeCat]);

  const totalAmount = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const totalQty = cart.reduce((s, c) => s + c.quantity, 0);

  const addToCart = (item: StoreMenuItem) => {
    if (item.soldOut) return;
    setCart(prev => {
      const idx = prev.findIndex(c => c.menuItemId === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart(prev => prev
      .map(c => c.menuItemId === id ? { ...c, quantity: c.quantity + delta } : c)
      .filter(c => c.quantity > 0)
    );
  };

  const removeItem = (id: number) => setCart(prev => prev.filter(c => c.menuItemId !== id));

  const submitOrder = useMutation({
    mutationFn: async () => {
      if (!tableNo.trim()) throw new Error("테이블 번호를 입력해주세요");
      if (cart.length === 0) throw new Error("메뉴를 1개 이상 선택해주세요");
      const res = await apiRequest("POST", "/api/store/orders", {
        tableNo: tableNo.trim(),
        requestNote: requestNote.trim() || null,
        items: cart.map(c => ({ menuItemId: c.menuItemId, quantity: c.quantity })),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "주문 실패");
      return json.data;
    },
    onSuccess: (data) => {
      setConfirmedOrder({ orderNumber: data.orderNumber, tableNo: data.tableNo, total: data.totalAmount });
      setCart([]);
      setRequestNote("");
      setCartOpen(false);
    },
    onError: (e: Error) => toast({ title: "주문 실패", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-stone-50 pb-32">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coffee className="w-6 h-6 text-amber-700" />
            <div>
              <div className="font-bold text-lg tracking-wide">TALEZ</div>
              <div className="text-xs text-stone-500">Cafe & Bar · QR Order</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-stone-500">테이블</div>
            <Input
              type="text"
              inputMode="numeric"
              value={tableNo}
              onChange={(e) => setTableNo(e.target.value)}
              placeholder="번호"
              className="w-20 h-9 text-center font-bold"
              data-testid="input-table-no"
            />
          </div>
        </div>
        {/* Category tabs */}
        {categories.length > 0 && (
          <div className="border-t bg-white">
            <ScrollArea className="w-full">
              <div className="flex gap-1 px-2 py-2 max-w-2xl mx-auto">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => {
                      setActiveCat(cat);
                      document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
                      activeCat === cat
                        ? "bg-stone-900 text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                    data-testid={`tab-category-${cat}`}
                  >
                    {CATEGORY_LABEL[cat] ?? cat}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </header>

      {/* Menu */}
      <main className="max-w-2xl mx-auto px-4 py-4 space-y-6">
        {isLoading && <div className="text-center py-12 text-stone-500">메뉴를 불러오는 중…</div>}
        {!isLoading && categories.length === 0 && (
          <div className="text-center py-12 text-stone-500">등록된 메뉴가 없습니다.</div>
        )}
        {categories.map(cat => (
          <section key={cat} id={`cat-${cat}`}>
            <h2 className="text-sm font-bold text-stone-500 tracking-widest mb-3">{CATEGORY_LABEL[cat] ?? cat}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {grouped[cat].map(item => (
                <Card
                  key={item.id}
                  className={`p-4 flex items-center justify-between gap-3 ${
                    item.soldOut ? "opacity-50" : "hover:shadow-md cursor-pointer"
                  }`}
                  onClick={() => addToCart(item)}
                  data-testid={`card-menu-${item.id}`}
                >
                  <div className="flex-1">
                    <div className="font-semibold text-base">{item.name}</div>
                    <div className="text-stone-700 text-sm mt-1">{KRW(item.price)}</div>
                    {item.soldOut && <Badge variant="secondary" className="mt-2">품절</Badge>}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={item.soldOut}
                    onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                    data-testid={`button-add-${item.id}`}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* Bottom cart bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-lg">
          <div className="max-w-2xl mx-auto p-3">
            <Button
              size="lg"
              className="w-full h-14 text-base bg-stone-900 hover:bg-stone-800"
              onClick={() => setCartOpen(true)}
              data-testid="button-open-cart"
            >
              <ShoppingBag className="w-5 h-5 mr-2" />
              장바구니 {totalQty}개 · {KRW(totalAmount)} 보기
            </Button>
          </div>
        </div>
      )}

      {/* Cart dialog */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>주문 확인</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">테이블 번호</label>
              <Input
                value={tableNo}
                onChange={(e) => setTableNo(e.target.value)}
                placeholder="예: 5"
                className="mt-1"
                data-testid="input-cart-table-no"
              />
            </div>
            <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
              {cart.map(c => (
                <div key={c.menuItemId} className="p-3 flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="text-xs text-stone-500">{KRW(c.price)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(c.menuItemId, -1)} data-testid={`button-qty-minus-${c.menuItemId}`}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-6 text-center font-semibold">{c.quantity}</span>
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(c.menuItemId, 1)} data-testid={`button-qty-plus-${c.menuItemId}`}>
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeItem(c.menuItemId)} data-testid={`button-remove-${c.menuItemId}`}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <label className="text-sm font-medium">요청사항 (선택)</label>
              <Textarea
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                placeholder="알레르기, 매운맛 조절 등"
                rows={2}
                maxLength={500}
                className="mt-1"
                data-testid="textarea-request-note"
              />
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-stone-600">총 결제 금액</span>
              <span className="text-xl font-bold">{KRW(totalAmount)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCartOpen(false)}>닫기</Button>
            <Button
              onClick={() => submitOrder.mutate()}
              disabled={submitOrder.isPending || !tableNo.trim() || cart.length === 0}
              data-testid="button-submit-order"
              className="bg-stone-900 hover:bg-stone-800"
            >
              {submitOrder.isPending ? "주문 중…" : "주문하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog */}
      <Dialog open={!!confirmedOrder} onOpenChange={(o) => !o && setConfirmedOrder(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">주문이 접수되었습니다</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="text-sm text-stone-600 leading-relaxed">
              직원이 확인 후 안내드립니다.<br />결제는 카운터에서 진행해주세요.
            </div>
            {confirmedOrder && (
              <div className="bg-stone-50 rounded-lg p-4 space-y-1">
                <div className="text-xs text-stone-500">주문번호</div>
                <div className="text-2xl font-bold tracking-wider" data-testid="text-order-number">
                  {confirmedOrder.orderNumber}
                </div>
                <div className="text-sm text-stone-600 mt-2">
                  테이블 {confirmedOrder.tableNo} · {KRW(confirmedOrder.total)}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button className="w-full bg-stone-900 hover:bg-stone-800" onClick={() => setConfirmedOrder(null)} data-testid="button-confirm-close">
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
