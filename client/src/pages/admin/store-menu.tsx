import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { StoreMenuItem } from "@shared/schema";
import { STORE_MENU_CATEGORIES } from "@shared/schema";
import { Plus, Pencil, Trash2 } from "lucide-react";

const KRW = (n: number) => `${n.toLocaleString("ko-KR")}원`;

interface FormState {
  id?: number;
  category: string;
  name: string;
  price: string;
  description: string;
  soldOut: boolean;
  isActive: boolean;
  sortOrder: string;
}

const emptyForm = (): FormState => ({
  category: STORE_MENU_CATEGORIES[0],
  name: "",
  price: "",
  description: "",
  soldOut: false,
  isActive: true,
  sortOrder: "0",
});

export default function AdminStoreMenuPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const { data, isLoading } = useQuery<{ success: boolean; data: StoreMenuItem[] }>({
    queryKey: ["/api/admin/store/menu"],
  });

  const items = data?.data ?? [];
  const grouped = items.reduce<Record<string, StoreMenuItem[]>>((acc, it) => {
    (acc[it.category] = acc[it.category] || []).push(it);
    return acc;
  }, {});

  const saveItem = useMutation({
    mutationFn: async () => {
      const payload = {
        category: form.category,
        name: form.name.trim(),
        price: Number(form.price),
        description: form.description.trim() || null,
        soldOut: form.soldOut,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (!payload.name) throw new Error("메뉴명을 입력해주세요");
      if (!Number.isFinite(payload.price) || payload.price < 0) throw new Error("올바른 가격을 입력해주세요");

      const res = form.id
        ? await apiRequest("PATCH", `/api/admin/store/menu/${form.id}`, payload)
        : await apiRequest("POST", "/api/admin/store/menu", payload);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "저장 실패");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/store/menu"] });
      queryClient.invalidateQueries({ queryKey: ["/api/store/menu"] });
      toast({ title: form.id ? "메뉴가 수정되었습니다" : "메뉴가 추가되었습니다" });
      setOpen(false);
      setForm(emptyForm());
    },
    onError: (e: Error) => toast({ title: "오류", description: e.message, variant: "destructive" }),
  });

  const toggleSoldOut = useMutation({
    mutationFn: async (item: StoreMenuItem) => {
      const res = await apiRequest("PATCH", `/api/admin/store/menu/${item.id}`, { soldOut: !item.soldOut });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "변경 실패");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/store/menu"] });
      queryClient.invalidateQueries({ queryKey: ["/api/store/menu"] });
    },
    onError: (e: Error) => toast({ title: "오류", description: e.message, variant: "destructive" }),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/store/menu/${id}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "삭제 실패");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/store/menu"] });
      queryClient.invalidateQueries({ queryKey: ["/api/store/menu"] });
      toast({ title: "메뉴가 삭제되었습니다" });
    },
    onError: (e: Error) => toast({ title: "오류", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => { setForm(emptyForm()); setOpen(true); };
  const openEdit = (it: StoreMenuItem) => {
    setForm({
      id: it.id,
      category: it.category,
      name: it.name,
      price: String(it.price),
      description: it.description ?? "",
      soldOut: it.soldOut,
      isActive: it.isActive,
      sortOrder: String(it.sortOrder ?? 0),
    });
    setOpen(true);
  };

  return (
    <div className="min-h-screen bg-stone-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">매장 메뉴 관리</h1>
            <p className="text-sm text-stone-500 mt-1">QR 주문에 노출될 메뉴를 관리합니다.</p>
          </div>
          <Button onClick={openCreate} className="bg-stone-900 hover:bg-stone-800" data-testid="button-add-menu">
            <Plus className="w-4 h-4 mr-1" /> 메뉴 추가
          </Button>
        </div>

        {isLoading && <div className="text-center py-12 text-stone-500">불러오는 중…</div>}

        <div className="space-y-6">
          {STORE_MENU_CATEGORIES.map(cat => {
            const list = grouped[cat] ?? [];
            return (
              <section key={cat}>
                <h2 className="text-sm font-bold text-stone-500 tracking-widest mb-2">{cat} <span className="text-stone-400">({list.length})</span></h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {list.length === 0 && (
                    <Card className="p-4 text-stone-400 text-sm">메뉴가 없습니다.</Card>
                  )}
                  {list.map(it => (
                    <Card key={it.id} className="p-4" data-testid={`card-admin-menu-${it.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="font-semibold flex items-center gap-2">
                            {it.name}
                            {!it.isActive && <Badge variant="secondary" className="text-xs">숨김</Badge>}
                            {it.soldOut && <Badge variant="destructive" className="text-xs">품절</Badge>}
                          </div>
                          <div className="text-stone-700 text-sm mt-1">{KRW(it.price)}</div>
                          {it.description && <div className="text-xs text-stone-500 mt-1">{it.description}</div>}
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(it)} data-testid={`button-edit-menu-${it.id}`}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-600"
                            onClick={() => { if (confirm(`${it.name} 메뉴를 삭제할까요?`)) deleteItem.mutate(it.id); }}
                            data-testid={`button-delete-menu-${it.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm">
                        <span className="text-stone-500">품절 처리</span>
                        <Switch
                          checked={it.soldOut}
                          onCheckedChange={() => toggleSoldOut.mutate(it)}
                          data-testid={`switch-soldout-${it.id}`}
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? "메뉴 수정" : "메뉴 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">카테고리</label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="mt-1" data-testid="select-form-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STORE_MENU_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">메뉴명</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" data-testid="input-form-name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">가격(원)</label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1" data-testid="input-form-price" />
              </div>
              <div>
                <label className="text-sm font-medium">정렬순서</label>
                <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">설명 (선택)</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" />
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm">활성(고객 노출)</span>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} data-testid="switch-form-active" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">품절</span>
              <Switch checked={form.soldOut} onCheckedChange={(v) => setForm({ ...form, soldOut: v })} data-testid="switch-form-soldout" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
            <Button
              onClick={() => saveItem.mutate()}
              disabled={saveItem.isPending}
              className="bg-stone-900 hover:bg-stone-800"
              data-testid="button-save-menu"
            >
              {saveItem.isPending ? "저장 중…" : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
