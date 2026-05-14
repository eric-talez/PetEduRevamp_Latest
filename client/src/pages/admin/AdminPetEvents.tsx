import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  PET_EVENT_CATEGORIES,
  PET_EVENT_CATEGORY_LABELS,
  type PetEvent,
  type PetEventCategory,
} from "@shared/schema";
import { Plus, Pencil, Trash2, Calendar, MapPin, Loader2, Locate, RefreshCw, History, AlertCircle, CheckCircle2 } from "lucide-react";

interface ImportResult {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  fetched: number;
  created: number;
  duplicates: number;
  failures: Array<{ source: string; message: string }>;
}

interface ImportHistoryResponse {
  success: boolean;
  data: {
    running: boolean;
    last: ImportResult | null;
    history: ImportResult[];
  };
}

const formatRelative = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return "방금";
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}초`;
  const m = Math.floor(s / 60);
  const rem = Math.floor(s % 60);
  return `${m}분 ${rem}초`;
};

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

type StatusFilter = "all" | "active" | "inactive";

export default function AdminPetEventsPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [geocoding, setGeocoding] = useState(false);
  const [lastGeocodedAddress, setLastGeocodedAddress] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [historyOpen, setHistoryOpen] = useState(false);

  const runGeocode = async (opts?: { silentOnEmpty?: boolean; force?: boolean }) => {
    const address = form.location.trim();
    if (!address) {
      if (!opts?.silentOnEmpty) toast({ title: "장소를 입력해주세요", variant: "destructive" });
      return;
    }
    if (!opts?.force && address === lastGeocodedAddress) return;
    setGeocoding(true);
    try {
      const res = await apiRequest("GET", `/api/admin/geocode?address=${encodeURIComponent(address)}`);
      const json = await res.json();
      if (!res.ok || !json?.data) throw new Error(json?.error || "좌표를 찾지 못했습니다");
      setForm((prev) => ({
        ...prev,
        lat: String(json.data.lat),
        lng: String(json.data.lng),
      }));
      setLastGeocodedAddress(address);
      toast({ title: "좌표가 자동으로 입력되었습니다", description: json.data.formattedAddress });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "주소로 좌표를 찾지 못했습니다.";
      toast({
        title: "좌표 자동 채우기 실패",
        description: `${message} 위·경도를 직접 입력해주세요.`,
        variant: "destructive",
      });
    } finally {
      setGeocoding(false);
    }
  };

  const { data, isLoading } = useQuery<{ success: boolean; data: PetEvent[] }>({
    queryKey: ["/api/admin/pet-events"],
  });
  const items = data?.data ?? [];

  const sources = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.source && it.source.trim()) set.add(it.source.trim());
    });
    return Array.from(set).sort();
  }, [items]);

  const slugifySource = (src: string) =>
    src.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/(^-|-$)/g, "") || "src";

  useEffect(() => {
    if (selectedIds.size === 0) return;
    const validIds = new Set(items.map((it) => it.id));
    let changed = false;
    const next = new Set<number>();
    selectedIds.forEach((id) => {
      if (validIds.has(id)) next.add(id);
      else changed = true;
    });
    if (changed) setSelectedIds(next);
  }, [items, selectedIds]);

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (statusFilter === "active" && !it.isActive) return false;
      if (statusFilter === "inactive" && it.isActive) return false;
      if (sourceFilter !== "all") {
        const src = (it.source ?? "").trim();
        if (sourceFilter === "__none__" ? src !== "" : src !== sourceFilter) return false;
      }
      return true;
    });
  }, [items, statusFilter, sourceFilter]);

  const filteredIds = useMemo(() => filteredItems.map((it) => it.id), [filteredItems]);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
  const someFilteredSelected = filteredIds.some((id) => selectedIds.has(id));

  const toggleSelect = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };
  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) filteredIds.forEach((id) => next.add(id));
      else filteredIds.forEach((id) => next.delete(id));
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const { data: historyData } = useQuery<ImportHistoryResponse>({
    queryKey: ["/api/admin/pet-events/import/history"],
    refetchInterval: 30_000,
  });
  const lastRun = historyData?.data?.last ?? null;
  const history = historyData?.data?.history ?? [];

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

  const importNow = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/pet-events/import");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "자동 수집 실패");
      return json.data as {
        fetched: number;
        created: number;
        duplicates: number;
        failures: Array<{ source: string; message: string }>;
      };
    },
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pet-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pet-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pet-events/import/history"] });
      const failMsg = r.failures.length > 0 ? ` · 실패 ${r.failures.length}건` : "";
      toast({
        title: "자동 수집 완료",
        description: `수집 ${r.fetched} · 신규 ${r.created} · 중복 ${r.duplicates}${failMsg}. 신규 항목은 비활성 상태로 등록되었으니 검수 후 활성화해 주세요.`,
      });
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

  const bulkActivate = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("POST", "/api/admin/pet-events/bulk-activate", { ids });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "일괄 활성화 실패");
      return json.data as { updated: number };
    },
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pet-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pet-events"] });
      toast({ title: `${r.updated}건 활성화되었습니다` });
      clearSelection();
    },
    onError: (e: Error) => toast({ title: "오류", description: e.message, variant: "destructive" }),
  });

  const bulkDelete = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("POST", "/api/admin/pet-events/bulk-delete", { ids });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "일괄 삭제 실패");
      return json.data as { deleted: number };
    },
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pet-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pet-events"] });
      toast({ title: `${r.deleted}건 삭제되었습니다` });
      clearSelection();
    },
    onError: (e: Error) => toast({ title: "오류", description: e.message, variant: "destructive" }),
  });

  const handleBulkActivate = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`선택한 ${ids.length}건을 활성화할까요?`)) return;
    bulkActivate.mutate(ids);
  };
  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`선택한 ${ids.length}건을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return;
    bulkDelete.mutate(ids);
  };

  const openCreate = () => { setForm(emptyForm()); setLastGeocodedAddress(""); setOpen(true); };
  const openEdit = (it: PetEvent) => {
    setLastGeocodedAddress(it.location);
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

  const selectedCount = selectedIds.size;

  return (
    <div className="min-h-screen bg-stone-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">전국 반려견 행사 관리</h1>
            <p className="text-sm text-stone-500 mt-1">/pet-events-map 지도에 표시될 행사를 관리합니다.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2" data-testid="last-import-badge">
              {lastRun ? (
                <>
                  <Badge variant="secondary" className="text-xs">
                    {lastRun.failures.length === 0 ? (
                      <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-3 h-3 mr-1 text-amber-600" />
                    )}
                    마지막 수집: {formatRelative(lastRun.startedAt)} · 신규 {lastRun.created} · 중복 {lastRun.duplicates}
                    {lastRun.failures.length > 0 ? ` · 실패 ${lastRun.failures.length}` : ""}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => setHistoryOpen(true)}
                    className="text-xs text-stone-500 underline-offset-2 hover:underline inline-flex items-center"
                    data-testid="button-open-history"
                  >
                    <History className="w-3 h-3 mr-1" /> 이력 보기 ({history.length})
                  </button>
                </>
              ) : (
                <span className="text-xs text-stone-400">아직 자동 수집 이력이 없습니다.</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => importNow.mutate()}
              disabled={importNow.isPending}
              variant="outline"
              data-testid="button-import-events"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${importNow.isPending ? "animate-spin" : ""}`} />
              {importNow.isPending ? "수집 중…" : "자동 수집 실행"}
            </Button>
            <Button onClick={openCreate} className="bg-stone-900 hover:bg-stone-800" data-testid="button-add-event">
              <Plus className="w-4 h-4 mr-1" /> 행사 추가
            </Button>
          </div>
        </div>

        <Card className="p-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-stone-500 mr-1">상태</span>
            {([
              { v: "all", label: "전체" },
              { v: "inactive", label: "비활성(검수 대기)" },
              { v: "active", label: "활성" },
            ] as const).map((opt) => (
              <Button
                key={opt.v}
                size="sm"
                variant={statusFilter === opt.v ? "default" : "outline"}
                className={`h-7 rounded-full text-xs ${statusFilter === opt.v ? "bg-stone-900 hover:bg-stone-800" : ""}`}
                onClick={() => setStatusFilter(opt.v)}
                data-testid={`chip-status-${opt.v}`}
              >
                {opt.label}
              </Button>
            ))}
            <span className="text-xs font-medium text-stone-500 ml-3 mr-1">출처</span>
            <Button
              size="sm"
              variant={sourceFilter === "all" ? "default" : "outline"}
              className={`h-7 rounded-full text-xs ${sourceFilter === "all" ? "bg-stone-900 hover:bg-stone-800" : ""}`}
              onClick={() => setSourceFilter("all")}
              data-testid="chip-source-all"
            >
              전체
            </Button>
            {sources.map((src) => (
              <Button
                key={src}
                size="sm"
                variant={sourceFilter === src ? "default" : "outline"}
                className={`h-7 rounded-full text-xs ${sourceFilter === src ? "bg-stone-900 hover:bg-stone-800" : ""}`}
                onClick={() => setSourceFilter(src)}
                data-testid={`chip-source-${slugifySource(src)}`}
              >
                {src}
              </Button>
            ))}
            <Button
              size="sm"
              variant={sourceFilter === "__none__" ? "default" : "outline"}
              className={`h-7 rounded-full text-xs ${sourceFilter === "__none__" ? "bg-stone-900 hover:bg-stone-800" : ""}`}
              onClick={() => setSourceFilter("__none__")}
              data-testid="chip-source-none"
            >
              출처 없음
            </Button>
          </div>
          {filteredItems.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
              <label className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
                <Checkbox
                  checked={allFilteredSelected ? true : (someFilteredSelected ? "indeterminate" : false)}
                  onCheckedChange={(v) => toggleSelectAll(v === true)}
                  data-testid="checkbox-select-all"
                />
                <span>현재 목록 전체 선택 ({filteredIds.length}건)</span>
              </label>
              <span className="text-xs text-stone-500 ml-2">선택됨: <strong className="text-stone-800">{selectedCount}</strong>건</span>
              <div className="ml-auto flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={selectedCount === 0 || bulkActivate.isPending}
                  onClick={handleBulkActivate}
                  data-testid="button-bulk-activate"
                >
                  {bulkActivate.isPending
                    ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    : <CheckCircle2 className="w-4 h-4 mr-1" />}
                  선택 항목 활성화
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                  disabled={selectedCount === 0 || bulkDelete.isPending}
                  onClick={handleBulkDelete}
                  data-testid="button-bulk-delete"
                >
                  {bulkDelete.isPending
                    ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    : <Trash2 className="w-4 h-4 mr-1" />}
                  선택 항목 삭제
                </Button>
                {selectedCount > 0 && (
                  <Button size="sm" variant="ghost" onClick={clearSelection} data-testid="button-clear-selection">
                    선택 해제
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>

        {isLoading ? (
          <div className="text-center py-12 text-stone-500">불러오는 중…</div>
        ) : filteredItems.length === 0 ? (
          <Card className="p-8 text-center text-stone-400">
            {items.length === 0 ? "등록된 행사가 없습니다." : "조건에 해당하는 행사가 없습니다."}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredItems.map((it) => {
              const checked = selectedIds.has(it.id);
              return (
                <Card
                  key={it.id}
                  className={`p-4 ${checked ? "ring-2 ring-stone-900" : ""}`}
                  data-testid={`card-admin-event-${it.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => toggleSelect(it.id, v === true)}
                        className="mt-1"
                        data-testid={`checkbox-event-${it.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold flex items-center gap-2 flex-wrap">
                          <span className="break-words">{it.title}</span>
                          {!it.isActive && <Badge variant="secondary" className="text-xs">비활성</Badge>}
                        </div>
                        <div className="text-xs text-stone-500 mt-1">
                          {PET_EVENT_CATEGORY_LABELS[it.category as PetEventCategory] ?? it.category}
                          {it.source && <span className="ml-2 text-stone-400">· {it.source}</span>}
                        </div>
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
              );
            })}
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
              <div className="mt-1 flex gap-2">
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  onBlur={() => runGeocode({ silentOnEmpty: true })}
                  className="flex-1"
                  placeholder="예: 서울 코엑스 (강남구 영동대로 513)"
                  data-testid="input-form-location"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => runGeocode({ force: true })}
                  disabled={geocoding || !form.location.trim()}
                  data-testid="button-geocode"
                  className="shrink-0"
                >
                  {geocoding ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Locate className="w-4 h-4 mr-1" />}
                  좌표 자동 채우기
                </Button>
              </div>
              <p className="text-xs text-stone-500 mt-1">주소를 입력하면 위·경도가 자동으로 채워집니다. 실패 시 직접 입력할 수 있습니다.</p>
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

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-import-history">
          <DialogHeader>
            <DialogTitle>자동 수집 실행 이력</DialogTitle>
          </DialogHeader>
          {history.length === 0 ? (
            <div className="text-sm text-stone-500 py-8 text-center">표시할 이력이 없습니다.</div>
          ) : (
            <Table data-testid="table-import-history">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>시작 시각</TableHead>
                  <TableHead className="text-right">소요</TableHead>
                  <TableHead className="text-right">수집</TableHead>
                  <TableHead className="text-right">신규</TableHead>
                  <TableHead className="text-right">중복</TableHead>
                  <TableHead>실패</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h, idx) => {
                  const ok = h.failures.length === 0;
                  return (
                    <TableRow key={`${h.startedAt}-${idx}`} data-testid={`row-import-history-${idx}`}>
                      <TableCell>
                        {ok ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{new Date(h.startedAt).toLocaleString("ko-KR")}</div>
                        <div className="text-stone-400">{formatRelative(h.startedAt)}</div>
                      </TableCell>
                      <TableCell className="text-right text-xs">{formatDuration(h.durationMs)}</TableCell>
                      <TableCell className="text-right text-xs">{h.fetched}</TableCell>
                      <TableCell className="text-right text-xs font-medium">{h.created}</TableCell>
                      <TableCell className="text-right text-xs text-stone-500">{h.duplicates}</TableCell>
                      <TableCell className="text-xs">
                        {h.failures.length === 0 ? (
                          <span className="text-stone-400">—</span>
                        ) : (
                          <ul className="space-y-0.5 text-amber-700">
                            {h.failures.map((f, i) => (
                              <li key={i}>
                                <span className="font-medium">[{f.source}]</span> {f.message}
                              </li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryOpen(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
