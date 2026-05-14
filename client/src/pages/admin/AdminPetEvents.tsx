import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  PET_EVENT_CATEGORIES,
  PET_EVENT_CATEGORY_LABELS,
  type PetEvent,
  type PetEventCategory,
} from "@shared/schema";
import { Plus, Pencil, Trash2, Calendar, MapPin } from "lucide-react";

const toLocalInput = (d: string | Date | null | undefined) => {
  if (!d) return "";
  const date = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

interface FormState {
  id?: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  lat: string;
  lng: string;
  category: PetEventCategory;
  imageUrl: string;
  websiteUrl: string;
  source: string;
  isActive: boolean;
}

const emptyForm = (): FormState => ({
  title: "",
  description: "",
  startDate: "",
  endDate: "",
  location: "",
  lat: "",
  lng: "",
  category: "pet_fair",
  imageUrl: "",
  websiteUrl: "",
  source: "",
  isActive: true,
});

export default function AdminPetEventsPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const { data, isLoading } = useQuery<{ success: boolean; data: PetEvent[] }>({
    queryKey: ["/api/admin/pet-events"],
  });
  const items = data?.data ?? [];

  const save = useMutation({
    mutationFn: async () => {
      const payload: {
        title: string;
        description: string | null;
        startDate: string;
        endDate: string;
        location: string;
        lat: string;
        lng: string;
        category: PetEventCategory;
        imageUrl: string | null;
        websiteUrl: string | null;
        source: string | null;
        isActive: boolean;
      } = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : "",
        endDate: form.endDate ? new Date(form.endDate).toISOString() : "",
        location: form.location.trim(),
        lat: form.lat,
        lng: form.lng,
        category: form.category,
        imageUrl: form.imageUrl.trim() || null,
        websiteUrl: form.websiteUrl.trim() || null,
        source: form.source.trim() || null,
        isActive: form.isActive,
      };
      if (!payload.title) throw new Error("행사명을 입력해주세요");
      if (!payload.startDate || !payload.endDate) throw new Error("시작일과 종료일을 입력해주세요");
      if (new Date(payload.endDate) < new Date(payload.startDate)) throw new Error("종료일은 시작일 이후여야 합니다");
      if (!payload.location) throw new Error("장소를 입력해주세요");
      const lat = Number(payload.lat), lng = Number(payload.lng);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error("위도(lat)는 -90 ~ 90 범위여야 합니다");
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) throw new Error("경도(lng)는 -180 ~ 180 범위여야 합니다");

      const res = form.id
        ? await apiRequest("PATCH", `/api/admin/pet-events/${form.id}`, payload)
        : await apiRequest("POST", "/api/admin/pet-events", payload);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "저장 실패");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pet-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pet-events"] });
      toast({ title: form.id ? "행사가 수정되었습니다" : "행사가 추가되었습니다" });
      setOpen(false);
      setForm(emptyForm());
    },
    onError: (e: Error) => toast({ title: "오류", description: e.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async (it: PetEvent) => {
      const res = await apiRequest("PATCH", `/api/admin/pet-events/${it.id}`, { isActive: !it.isActive });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "변경 실패");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pet-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pet-events"] });
    },
    onError: (e: Error) => toast({ title: "오류", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/pet-events/${id}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "삭제 실패");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pet-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pet-events"] });
      toast({ title: "행사가 삭제되었습니다" });
    },
    onError: (e: Error) => toast({ title: "오류", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => { setForm(emptyForm()); setOpen(true); };
  const openEdit = (it: PetEvent) => {
    setForm({
      id: it.id,
      title: it.title,
      description: it.description ?? "",
      startDate: toLocalInput(it.startDate),
      endDate: toLocalInput(it.endDate),
      location: it.location,
      lat: String(it.lat),
      lng: String(it.lng),
      category: (it.category as PetEventCategory) || "other",
      imageUrl: it.imageUrl ?? "",
      websiteUrl: it.websiteUrl ?? "",
      source: it.source ?? "",
      isActive: it.isActive,
    });
    setOpen(true);
  };

  return (
    <div className="min-h-screen bg-stone-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">전국 반려견 행사 관리</h1>
            <p className="text-sm text-stone-500 mt-1">/pet-events-map 지도에 표시될 행사를 관리합니다.</p>
          </div>
          <Button onClick={openCreate} className="bg-stone-900 hover:bg-stone-800" data-testid="button-add-event">
            <Plus className="w-4 h-4 mr-1" /> 행사 추가
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-stone-500">불러오는 중…</div>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center text-stone-400">등록된 행사가 없습니다.</Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((it) => (
              <Card key={it.id} className="p-4" data-testid={`card-admin-event-${it.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-semibold flex items-center gap-2">
                      {it.title}
                      {!it.isActive && <Badge variant="secondary" className="text-xs">비활성</Badge>}
                    </div>
                    <div className="text-xs text-stone-500 mt-1">
                      {PET_EVENT_CATEGORY_LABELS[it.category as PetEventCategory] ?? it.category}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(it)} data-testid={`button-edit-event-${it.id}`}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-600"
                      onClick={() => { if (confirm(`${it.title} 행사를 삭제할까요?`)) del.mutate(it.id); }}
                      data-testid={`button-delete-event-${it.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-xs text-stone-600">
                  <div className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1.5" />{new Date(it.startDate).toLocaleDateString("ko-KR")} ~ {new Date(it.endDate).toLocaleDateString("ko-KR")}</div>
                  <div className="flex items-start"><MapPin className="w-3.5 h-3.5 mr-1.5 mt-0.5 shrink-0" /><span className="line-clamp-2">{it.location}</span></div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm">
                  <span className="text-stone-500">활성(공개)</span>
                  <Switch checked={it.isActive} onCheckedChange={() => toggleActive.mutate(it)} data-testid={`switch-active-${it.id}`} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "행사 수정" : "행사 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">행사명</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" data-testid="input-form-title" />
            </div>
            <div>
              <label className="text-sm font-medium">카테고리</label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as PetEventCategory })}>
                <SelectTrigger className="mt-1" data-testid="select-form-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PET_EVENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{PET_EVENT_CATEGORY_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">시작일시</label>
                <Input type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="mt-1" data-testid="input-form-start" />
              </div>
              <div>
                <label className="text-sm font-medium">종료일시</label>
                <Input type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="mt-1" data-testid="input-form-end" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">장소</label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="mt-1" placeholder="예: 서울 코엑스 (강남구 영동대로 513)" data-testid="input-form-location" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">위도(lat)</label>
                <Input value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} className="mt-1" placeholder="37.5125" data-testid="input-form-lat" />
              </div>
              <div>
                <label className="text-sm font-medium">경도(lng)</label>
                <Input value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} className="mt-1" placeholder="127.0588" data-testid="input-form-lng" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">설명 (선택)</label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">이미지 URL (선택)</label>
              <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="mt-1" placeholder="https://..." />
            </div>
            <div>
              <label className="text-sm font-medium">행사 홈페이지 (선택)</label>
              <Input value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} className="mt-1" placeholder="https://..." />
            </div>
            <div>
              <label className="text-sm font-medium">출처 (선택)</label>
              <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="mt-1" placeholder="예: 직접 등록 / 크롤링" />
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm">활성(공개)</span>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} data-testid="switch-form-active" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-stone-900 hover:bg-stone-800" data-testid="button-save-event">
              {save.isPending ? "저장 중…" : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
