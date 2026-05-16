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
import { Plus, Pencil, Trash2, Calendar, MapPin, Loader2, Locate, RefreshCw, History, AlertCircle, CheckCircle2, XCircle, ExternalLink, Eye, EyeOff, Undo2, Inbox, Settings2, FlaskConical, Database } from "lucide-react";

interface ImportFailureItem {
  source: string;
  message: string;
  link?: string | null;
  title?: string | null;
}

interface SourceStat {
  source: string;
  fetched: number;
  created: number;
  duplicates: number;
  failures: number;
  emptyReason?: string;
}

interface BodyFetchStats {
  attempted: number;
  succeeded: number;
  rescued: number;
  robotsBlocked: number;
  httpErrors: number;
  limitExceeded: number;
  otherSkipped: number;
}

const emptyBodyFetch = (): BodyFetchStats => ({
  attempted: 0,
  succeeded: 0,
  rescued: 0,
  robotsBlocked: 0,
  httpErrors: 0,
  limitExceeded: 0,
  otherSkipped: 0,
});

interface ImportResult {
  runId?: number;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  fetched: number;
  created: number;
  duplicates: number;
  failures: ImportFailureItem[];
  bySource: SourceStat[];
  bodyFetch?: BodyFetchStats | null;
}

type FailureClass =
  | "filter_korea"
  | "filter_keyword"
  | "filter_host"
  | "body_fetched"
  | "robots_blocked"
  | "body_http"
  | "body_limit"
  | "body_other"
  | "no_body";

const isFilterBlockedMessage = (msg: string): boolean => msg.startsWith("필터 차단(");

const classifyFailure = (msg: string): FailureClass => {
  // Filter block reasons recorded by eventUpdater right before save.
  if (msg.startsWith("필터 차단(한국 외 좌표)")) return "filter_korea";
  if (msg.startsWith("필터 차단(광고성 키워드")) return "filter_keyword";
  if (msg.startsWith("필터 차단(호스트 블랙리스트")) return "filter_host";
  // Reasons appended by normalizeSearchResult after the body-fetch fallback runs.
  if (/\| 본문 \d+자/.test(msg)) return "body_fetched";
  if (msg.includes("robots.txt 차단")) return "robots_blocked";
  if (/본문 페치 HTTP \d+/.test(msg)) return "body_http";
  if (msg.includes("본문 페치 한도 초과")) return "body_limit";
  if (msg.includes("본문 페치")) return "body_other";
  return "no_body";
};

const FAILURE_CLASS_LABELS: Record<FailureClass, string> = {
  filter_korea: "필터 차단 · 한국 외 좌표",
  filter_keyword: "필터 차단 · 광고성 키워드",
  filter_host: "필터 차단 · 호스트 블랙리스트",
  body_fetched: "본문 페치 시도됨",
  robots_blocked: "robots 차단됨",
  body_http: "HTTP 오류",
  body_limit: "한도 초과",
  body_other: "기타 페치 스킵",
  no_body: "본문 페치 안 됨",
};

const FILTER_BLOCK_CLASSES: ReadonlySet<FailureClass> = new Set([
  "filter_korea",
  "filter_keyword",
  "filter_host",
]);

const extractFilterKeyword = (msg: string): string | null => {
  const m = msg.match(/필터 차단\(광고성 키워드 "([^"]+)"\)/);
  return m ? m[1] : null;
};

const extractFilterHost = (msg: string): string | null => {
  const m = msg.match(/필터 차단\(호스트 블랙리스트 "([^"]+)"\)/);
  return m ? m[1] : null;
};

interface PetEventFilterSettings {
  koreaBboxEnabled: boolean;
  adKeywords: string[];
  blockedHosts: string[];
  vertexBasicSearchEnabled: boolean;
}

interface SecondarySearchResult {
  title: string;
  link: string | null;
  snippet: string;
  source: "vertex" | "vertex_basic" | "db_fallback";
}

interface FailureCandidate {
  runId: number;
  idx: number;
  runStartedAt: string;
  source: string;
  message: string;
  link: string | null;
  title: string | null;
  status: "open" | "resolved" | "dismissed";
  resolvedEventId: number | null;
  note: string | null;
  resolvedAt: string | null;
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
  const [expandedHistoryIdx, setExpandedHistoryIdx] = useState<number | null>(0);
  const [failuresOpen, setFailuresOpen] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [failureClassFilter, setFailureClassFilter] = useState<"all" | "filter_blocked_all" | FailureClass>("all");
  const [pendingResolution, setPendingResolution] = useState<{ runId: number; idx: number } | null>(null);
  const [vertexTestOpen, setVertexTestOpen] = useState(false);
  const [vertexTestKeyword, setVertexTestKeyword] = useState("2026 반려동물 박람회");
  const [vertexTestResult, setVertexTestResult] = useState<{
    keyword: string;
    status: string;
    httpStatus: number | null;
    rawCount: number;
    normalizedOk: number;
    normalizedFail: number;
    failReasons: Record<string, number>;
    firstResult: { title: string; link: string | null; snippet: string } | null;
    error?: string;
  } | null>(null);

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

  const inactiveCount = useMemo(() => items.filter((it) => !it.isActive).length, [items]);
  const activeCount = items.length - inactiveCount;
  const sourceCounts = useMemo(() => {
    const map = new Map<string, { total: number; pending: number }>();
    let noneTotal = 0;
    let nonePending = 0;
    items.forEach((it) => {
      const src = (it.source ?? "").trim();
      if (!src) {
        noneTotal++;
        if (!it.isActive) nonePending++;
        return;
      }
      const cur = map.get(src) ?? { total: 0, pending: 0 };
      cur.total++;
      if (!it.isActive) cur.pending++;
      map.set(src, cur);
    });
    return { bySrc: map, none: { total: noneTotal, pending: nonePending } };
  }, [items]);

  const sourceBadgeClass = (src: string) => {
    const palette = [
      "bg-amber-50 text-amber-800 border-amber-200",
      "bg-sky-50 text-sky-800 border-sky-200",
      "bg-emerald-50 text-emerald-800 border-emerald-200",
      "bg-violet-50 text-violet-800 border-violet-200",
      "bg-rose-50 text-rose-800 border-rose-200",
      "bg-cyan-50 text-cyan-800 border-cyan-200",
    ];
    let h = 0;
    for (let i = 0; i < src.length; i++) h = (h * 31 + src.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  };

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

  const { data: adoptionData } = useQuery<{
    success: boolean;
    data: Array<{
      source: string;
      runs: number;
      imported: number;
      currentActive: number;
      currentInactive: number;
      removed: number;
      adoptionRate: number | null;
      windowStart: string;
      windowEnd: string;
    }>;
  }>({
    queryKey: ["/api/admin/pet-events/import/source-adoption"],
    refetchInterval: 60_000,
  });
  const adoptionStats = adoptionData?.data ?? [];

  const { data: failuresData, isLoading: failuresLoading } = useQuery<{ success: boolean; data: FailureCandidate[] }>({
    queryKey: ["/api/admin/pet-events/import/failures"],
    refetchInterval: 60_000,
  });
  const failureCandidates = failuresData?.data ?? [];
  const openCandidates = useMemo(() => failureCandidates.filter((c) => c.status === "open"), [failureCandidates]);
  const candidateClassPool = useMemo(
    () => (showResolved ? failureCandidates : openCandidates),
    [failureCandidates, openCandidates, showResolved],
  );
  const candidateClassCounts = useMemo(() => {
    const base: Record<FailureClass, number> = {
      filter_korea: 0, filter_keyword: 0, filter_host: 0,
      body_fetched: 0, robots_blocked: 0, body_http: 0, body_limit: 0, body_other: 0, no_body: 0,
    };
    for (const c of candidateClassPool) base[classifyFailure(c.message)]++;
    return base;
  }, [candidateClassPool]);
  const filterBlockedTotal = useMemo(
    () => candidateClassPool.reduce((n, c) => n + (isFilterBlockedMessage(c.message) ? 1 : 0), 0),
    [candidateClassPool],
  );
  const visibleCandidates = useMemo(() => {
    if (failureClassFilter === "all") return candidateClassPool;
    if (failureClassFilter === "filter_blocked_all") {
      // Prefix-based so any future "필터 차단(...)" reason added on the server
      // shows up here automatically, even if not yet mapped to a FailureClass.
      return candidateClassPool.filter((c) => isFilterBlockedMessage(c.message));
    }
    return candidateClassPool.filter((c) => classifyFailure(c.message) === failureClassFilter);
  }, [candidateClassPool, failureClassFilter]);

  const resolveFailure = useMutation({
    mutationFn: async (vars: { runId: number; idx: number; resolvedEventId?: number | null }) => {
      const res = await apiRequest("POST", "/api/admin/pet-events/import/failures/resolve", vars);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "처리 실패");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pet-events/import/failures"] });
    },
    onError: (e: Error) => toast({ title: "오류", description: e.message, variant: "destructive" }),
  });

  const dismissFailure = useMutation({
    mutationFn: async (vars: { runId: number; idx: number }) => {
      const res = await apiRequest("POST", "/api/admin/pet-events/import/failures/dismiss", vars);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "처리 실패");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pet-events/import/failures"] });
      toast({ title: "후보를 숨겼습니다" });
    },
    onError: (e: Error) => toast({ title: "오류", description: e.message, variant: "destructive" }),
  });

  const reopenFailure = useMutation({
    mutationFn: async (vars: { runId: number; idx: number }) => {
      const res = await apiRequest("POST", "/api/admin/pet-events/import/failures/reopen", vars);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "처리 실패");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pet-events/import/failures"] });
    },
    onError: (e: Error) => toast({ title: "오류", description: e.message, variant: "destructive" }),
  });

  const { data: filterSettingsData } = useQuery<{ success: boolean; data: PetEventFilterSettings }>({
    queryKey: ["/api/admin/pet-events/filter-settings"],
  });
  const filterSettings = filterSettingsData?.data ?? null;

  const unblockFilterPattern = useMutation({
    mutationFn: async (vars: { kind: "keyword" | "host"; value: string }) => {
      if (!filterSettings) throw new Error("필터 설정을 불러오지 못했습니다");
      const target = vars.value.toLowerCase();
      const next: Partial<PetEventFilterSettings> = {};
      if (vars.kind === "keyword") {
        next.adKeywords = filterSettings.adKeywords.filter((k) => k.toLowerCase() !== target);
        if (next.adKeywords.length === filterSettings.adKeywords.length) {
          throw new Error("이미 차단 목록에 없는 키워드입니다");
        }
      } else {
        next.blockedHosts = filterSettings.blockedHosts.filter((h) => h.toLowerCase() !== target);
        if (next.blockedHosts.length === filterSettings.blockedHosts.length) {
          throw new Error("이미 차단 목록에 없는 호스트입니다");
        }
      }
      const res = await apiRequest("PATCH", "/api/admin/pet-events/filter-settings", next);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "차단 해제 실패");
      return { kind: vars.kind, value: vars.value };
    },
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pet-events/filter-settings"] });
      toast({
        title: r.kind === "keyword" ? "키워드 차단 해제됨" : "호스트 차단 해제됨",
        description: `"${r.value}" 가 다음 수집부터 허용됩니다.`,
      });
    },
    onError: (e: Error) => toast({ title: "오류", description: e.message, variant: "destructive" }),
  });

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
      return json.data as PetEvent;
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pet-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pet-events"] });
      const wasResolution = pendingResolution;
      if (wasResolution && saved?.id) {
        resolveFailure.mutate({ runId: wasResolution.runId, idx: wasResolution.idx, resolvedEventId: saved.id });
        toast({ title: "수동 등록 완료", description: "수집 실패 후보가 처리됨으로 표시되었습니다." });
      } else {
        toast({ title: form.id ? "행사가 수정되었습니다" : "행사가 추가되었습니다" });
      }
      setPendingResolution(null);
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pet-events/import/source-adoption"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pet-events/import/failures"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pet-events/import/source-adoption"] });
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

  const bulkDeactivate = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("POST", "/api/admin/pet-events/bulk-deactivate", { ids });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "일괄 비활성화 실패");
      return json.data as { updated: number };
    },
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pet-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pet-events"] });
      toast({ title: `${r.updated}건 비활성화되었습니다` });
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
  const handleBulkDeactivate = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`선택한 ${ids.length}건을 비활성화할까요?`)) return;
    bulkDeactivate.mutate(ids);
  };
  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`선택한 ${ids.length}건을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return;
    bulkDelete.mutate(ids);
  };

  const openCreate = () => { setForm(emptyForm()); setLastGeocodedAddress(""); setPendingResolution(null); setOpen(true); };

  const openCreateFromCandidate = (c: FailureCandidate) => {
    const cleanedTitle = (c.title ?? "").replace(/<[^>]+>/g, "").trim();
    setForm({
      ...emptyForm(),
      title: cleanedTitle,
      websiteUrl: c.link ?? "",
      source: `${c.source} (수동 보완)`,
      isActive: false,
    });
    setLastGeocodedAddress("");
    setPendingResolution({ runId: c.runId, idx: c.idx });
    setFailuresOpen(false);
    setOpen(true);
  };

  const handleFormDialogOpenChange = (next: boolean) => {
    if (!next) setPendingResolution(null);
    setOpen(next);
  };
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

  const { data: providerStatusData, refetch: refetchProviders } = useQuery<{
    success: boolean;
    providers: {
      google: { enabled: boolean; reason: string };
      naver: { enabled: boolean; reason: string };
      kakao: { enabled: boolean; reason: string };
      vertex: { enabled: boolean; reason: string; indexedDocCount: number | null; lastIndexedAt: string | null };
    };
  }>({
    queryKey: ["/api/admin/event-collection/providers"],
    refetchInterval: 60_000,
  });
  const providers = providerStatusData?.providers ?? null;

  const vertexTest = useMutation({
    mutationFn: async (keyword: string) => {
      const res = await apiRequest("POST", "/api/admin/event-collection/test/vertex", { keyword });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "진단 실패");
      return json as { success: boolean; keyword: string; data: typeof vertexTestResult extends null ? never : NonNullable<typeof vertexTestResult> };
    },
    onSuccess: (r) => {
      setVertexTestResult({ keyword: r.keyword, ...r.data });
    },
    onError: (e: Error) => toast({ title: "진단 실패", description: e.message, variant: "destructive" }),
  });

  const handleVertexTest = () => {
    vertexTest.mutate(vertexTestKeyword || "2026 반려동물 박람회");
  };

  const { data: bodyFetchSettingsData } = useQuery<{ success: boolean; data: { perRunMax: number; perHostMax: number } }>({
    queryKey: ["/api/admin/pet-events/body-fetch-settings"],
  });
  const [perRunDraft, setPerRunDraft] = useState<string>("");
  const [perHostDraft, setPerHostDraft] = useState<string>("");
  useEffect(() => {
    if (bodyFetchSettingsData?.data) {
      setPerRunDraft(String(bodyFetchSettingsData.data.perRunMax));
      setPerHostDraft(String(bodyFetchSettingsData.data.perHostMax));
    }
  }, [bodyFetchSettingsData?.data?.perRunMax, bodyFetchSettingsData?.data?.perHostMax]);

  const saveBodyFetchSettings = useMutation({
    mutationFn: async (vars: { perRunMax: number; perHostMax: number }) => {
      const res = await apiRequest("PATCH", "/api/admin/pet-events/body-fetch-settings", vars);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "저장 실패");
      return json.data as { perRunMax: number; perHostMax: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pet-events/body-fetch-settings"] });
      toast({ title: "본문 페치 한도가 저장되었습니다", description: "다음 자동 수집 실행부터 적용됩니다." });
    },
    onError: (e: Error) => toast({ title: "저장 실패", description: e.message, variant: "destructive" }),
  });

  const onSaveBodyFetchSettings = () => {
    const perRunMax = Number(perRunDraft);
    const perHostMax = Number(perHostDraft);
    if (!Number.isInteger(perRunMax) || perRunMax < 0 || perRunMax > 200) {
      toast({ title: "Run당 최대 호출 수는 0~200 정수여야 합니다", variant: "destructive" });
      return;
    }
    if (!Number.isInteger(perHostMax) || perHostMax < 0 || perHostMax > 200) {
      toast({ title: "사이트당 최대 호출 수는 0~200 정수여야 합니다", variant: "destructive" });
      return;
    }
    saveBodyFetchSettings.mutate({ perRunMax, perHostMax });
  };

  const settingsDirty =
    bodyFetchSettingsData?.data
      ? String(bodyFetchSettingsData.data.perRunMax) !== perRunDraft ||
        String(bodyFetchSettingsData.data.perHostMax) !== perHostDraft
      : false;

  const [koreaBboxDraft, setKoreaBboxDraft] = useState<boolean>(true);
  const [adKeywordsDraft, setAdKeywordsDraft] = useState<string[]>([]);
  const [blockedHostsDraft, setBlockedHostsDraft] = useState<string[]>([]);
  const [adKeywordInput, setAdKeywordInput] = useState<string>("");
  const [blockedHostInput, setBlockedHostInput] = useState<string>("");
  const [vertexBasicDraft, setVertexBasicDraft] = useState<boolean>(false);
  useEffect(() => {
    if (filterSettings) {
      setKoreaBboxDraft(filterSettings.koreaBboxEnabled);
      setAdKeywordsDraft(filterSettings.adKeywords ?? []);
      setBlockedHostsDraft(filterSettings.blockedHosts ?? []);
      setVertexBasicDraft(filterSettings.vertexBasicSearchEnabled ?? false);
    }
  }, [filterSettings]);

  const saveFilterSettings = useMutation({
    mutationFn: async (vars: { koreaBboxEnabled: boolean; adKeywords: string[]; blockedHosts: string[]; vertexBasicSearchEnabled: boolean }) => {
      const res = await apiRequest("PATCH", "/api/admin/pet-events/filter-settings", vars);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "저장 실패");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pet-events/filter-settings"] });
      toast({ title: "수집 필터가 저장되었습니다", description: "다음 자동 수집 실행부터 적용됩니다." });
    },
    onError: (e: Error) => toast({ title: "저장 실패", description: e.message, variant: "destructive" }),
  });

  const [secondarySearchQuery, setSecondarySearchQuery] = useState<string>("");
  const [secondarySearchResults, setSecondarySearchResults] = useState<SecondarySearchResult[] | null>(null);
  const [secondarySearchRanQuery, setSecondarySearchRanQuery] = useState<string>("");

  const runSecondarySearch = useMutation({
    mutationFn: async (q: string) => {
      const res = await fetch(`/api/admin/pet-events/search?q=${encodeURIComponent(q)}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "검색 실패");
      return json as { success: boolean; query: string; data: SecondarySearchResult[] };
    },
    onSuccess: (r) => {
      setSecondarySearchResults(r.data);
      setSecondarySearchRanQuery(r.query);
    },
    onError: (e: Error) => toast({ title: "보조 검색 실패", description: e.message, variant: "destructive" }),
  });

  const normalizeKeyword = (s: string) => s.trim();
  const normalizeHost = (s: string) => {
    let v = s.trim().toLowerCase();
    if (!v) return "";
    v = v.replace(/^https?:\/\//, "");
    v = v.split("/")[0];
    v = v.split("?")[0];
    v = v.split("#")[0];
    v = v.split(":")[0];
    v = v.replace(/^www\./, "");
    return v;
  };

  const addAdKeyword = () => {
    const v = normalizeKeyword(adKeywordInput);
    if (!v) return;
    const lower = v.toLowerCase();
    if (adKeywordsDraft.some((k) => k.toLowerCase() === lower)) {
      setAdKeywordInput("");
      return;
    }
    setAdKeywordsDraft([...adKeywordsDraft, v]);
    setAdKeywordInput("");
  };
  const removeAdKeyword = (v: string) => setAdKeywordsDraft(adKeywordsDraft.filter((x) => x !== v));

  const addBlockedHost = () => {
    const v = normalizeHost(blockedHostInput);
    if (!v) return;
    if (blockedHostsDraft.some((h) => h.toLowerCase() === v)) {
      setBlockedHostInput("");
      return;
    }
    setBlockedHostsDraft([...blockedHostsDraft, v]);
    setBlockedHostInput("");
  };
  const removeBlockedHost = (v: string) => setBlockedHostsDraft(blockedHostsDraft.filter((x) => x !== v));

  const filterSettingsDirty = filterSettings
    ? filterSettings.koreaBboxEnabled !== koreaBboxDraft ||
      JSON.stringify(filterSettings.adKeywords ?? []) !== JSON.stringify(adKeywordsDraft) ||
      JSON.stringify(filterSettings.blockedHosts ?? []) !== JSON.stringify(blockedHostsDraft)
    : false;

  const onSaveFilterSettings = () => {
    saveFilterSettings.mutate({
      koreaBboxEnabled: koreaBboxDraft,
      adKeywords: adKeywordsDraft,
      blockedHosts: blockedHostsDraft,
      vertexBasicSearchEnabled: vertexBasicDraft,
    });
  };

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
                  {lastRun.bodyFetch && lastRun.bodyFetch.attempted + lastRun.bodyFetch.limitExceeded + lastRun.bodyFetch.robotsBlocked > 0 && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-sky-50 text-sky-800 border-sky-200"
                      data-testid="badge-body-fetch-summary"
                      title={`시도 ${lastRun.bodyFetch.attempted} · 성공 ${lastRun.bodyFetch.succeeded} · 후보 구조 ${lastRun.bodyFetch.rescued} · robots ${lastRun.bodyFetch.robotsBlocked} · HTTP 오류 ${lastRun.bodyFetch.httpErrors} · 한도 초과 ${lastRun.bodyFetch.limitExceeded} · 기타 ${lastRun.bodyFetch.otherSkipped}`}
                    >
                      본문 페치 {lastRun.bodyFetch.attempted}/{lastRun.bodyFetch.attempted + lastRun.bodyFetch.limitExceeded + lastRun.bodyFetch.robotsBlocked}
                      {lastRun.bodyFetch.rescued > 0 ? ` · 구조 ${lastRun.bodyFetch.rescued}` : ""}
                      {lastRun.bodyFetch.robotsBlocked > 0 ? ` · robots ${lastRun.bodyFetch.robotsBlocked}` : ""}
                      {lastRun.bodyFetch.httpErrors > 0 ? ` · HTTP ${lastRun.bodyFetch.httpErrors}` : ""}
                      {lastRun.bodyFetch.limitExceeded > 0 ? ` · 한도 ${lastRun.bodyFetch.limitExceeded}` : ""}
                    </Badge>
                  )}
                  <button
                    type="button"
                    onClick={() => setHistoryOpen(true)}
                    className="text-xs text-stone-500 underline-offset-2 hover:underline inline-flex items-center"
                    data-testid="button-open-history"
                  >
                    <History className="w-3 h-3 mr-1" /> 이력 보기 ({history.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFailuresOpen(true)}
                    className="text-xs text-amber-700 underline-offset-2 hover:underline inline-flex items-center"
                    data-testid="button-open-failures"
                  >
                    <Inbox className="w-3 h-3 mr-1" /> 실패 후보 검토 ({openCandidates.length})
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

        {adoptionStats.length > 0 && (
          <Card className="p-3 mb-4" data-testid="card-source-adoption">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-stone-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 소스별 채택률 (최근 수집 분)
              </div>
              <div className="text-[11px] text-stone-400">
                채택률 = 관리자가 활성화한 비율 · 60초마다 갱신
              </div>
            </div>
            <Table data-testid="table-source-adoption">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">소스</TableHead>
                  <TableHead className="text-right text-xs">최근 실행</TableHead>
                  <TableHead className="text-right text-xs">신규 수집</TableHead>
                  <TableHead className="text-right text-xs">활성</TableHead>
                  <TableHead className="text-right text-xs">대기</TableHead>
                  <TableHead className="text-right text-xs">삭제</TableHead>
                  <TableHead className="text-right text-xs">채택률</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adoptionStats.map((s) => {
                  const rate = s.adoptionRate;
                  const rateLabel = rate == null ? "—" : `${Math.round(rate * 100)}%`;
                  const rateClass =
                    rate == null
                      ? "text-stone-400"
                      : rate >= 0.5
                      ? "text-emerald-700"
                      : rate >= 0.2
                      ? "text-amber-700"
                      : "text-rose-700";
                  return (
                    <TableRow key={s.source} data-testid={`row-adoption-${slugifySource(s.source)}`}>
                      <TableCell className="text-xs font-medium">
                        <Badge variant="outline" className={`mr-1 text-[10px] ${sourceBadgeClass(s.source)}`}>
                          {s.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-stone-500">{s.runs}</TableCell>
                      <TableCell className="text-right text-xs">{s.imported}</TableCell>
                      <TableCell className="text-right text-xs font-medium text-emerald-700">{s.currentActive}</TableCell>
                      <TableCell className="text-right text-xs text-stone-500">{s.currentInactive}</TableCell>
                      <TableCell className="text-right text-xs text-stone-400">{s.removed}</TableCell>
                      <TableCell
                        className={`text-right text-xs font-semibold ${rateClass}`}
                        data-testid={`text-adoption-rate-${slugifySource(s.source)}`}
                        title={
                          rate == null
                            ? "최근 수집에 신규가 없거나 사용자 직접 등록 소스입니다."
                            : `활성 ${s.currentActive} / 신규 수집 ${s.imported}`
                        }
                      >
                        {rateLabel}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="mt-2 text-[11px] text-stone-400">
              채택률이 낮은(▾20%) 소스는 SEARCH_KEYWORDS / 필터 차단 / 비-이벤트 휴리스틱을 조정해 튜닝하세요.
            </div>
          </Card>
        )}

        {providers && (
          <Card className="p-3 mb-4" data-testid="card-provider-statuses">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-stone-700">
                <Database className="w-4 h-4 text-sky-600" /> 수집 공급자 상태
              </div>
              <button
                type="button"
                onClick={() => refetchProviders()}
                className="text-[11px] text-stone-400 hover:text-stone-600 underline-offset-2 hover:underline"
              >
                새로고침
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {([
                { key: "naver", label: "Naver 검색" },
                { key: "kakao", label: "Kakao 검색" },
                { key: "google", label: "Google CSE" },
              ] as const).map((p) => {
                const st = providers[p.key];
                return (
                  <div key={p.key} className="flex items-center gap-2 text-xs border border-stone-100 rounded px-2 py-1.5">
                    {st.enabled ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : st.reason === "permission_denied" ? (
                      <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    )}
                    <span className="font-medium text-stone-700 w-24 shrink-0">{p.label}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        st.enabled
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : st.reason === "permission_denied"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-stone-100 text-stone-500 border-stone-200"
                      }`}
                    >
                      {st.enabled ? "active" : st.reason === "permission_denied" ? "permission denied" : "missing credentials"}
                    </Badge>
                  </div>
                );
              })}
              <div className="flex flex-col gap-1.5 border border-amber-100 rounded px-2 py-1.5 sm:col-span-2 bg-amber-50/30" data-testid="card-vertex-secondary">
                <div className="flex items-center gap-2 text-xs">
                  {providers.vertex.enabled ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : providers.vertex.reason === "permission_denied" ? (
                    <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                  <span className="font-medium text-stone-700 shrink-0">Vertex AI Search</span>
                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                    보조 검색(Secondary search)
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      providers.vertex.enabled
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : providers.vertex.reason === "permission_denied"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-stone-100 text-stone-500 border-stone-200"
                    }`}
                  >
                    {providers.vertex.enabled
                      ? "active"
                      : providers.vertex.reason === "permission_denied"
                      ? "permission denied"
                      : "missing credentials"}
                  </Badge>
                  {providers.vertex.enabled && (
                    <span className="ml-auto text-stone-400 text-[11px] flex items-center gap-1.5">
                      {providers.vertex.indexedDocCount !== null ? (
                        <span>색인 문서 <b className="text-stone-700">{providers.vertex.indexedDocCount}</b>건</span>
                      ) : (
                        <span>색인 문서 수 조회 중</span>
                      )}
                      {providers.vertex.lastIndexedAt && (
                        <span>· 마지막 갱신 {formatRelative(providers.vertex.lastIndexedAt)}</span>
                      )}
                    </span>
                  )}
                </div>
                <div className="pl-5 space-y-0.5 text-[11px] text-amber-800" data-testid="vertex-warning-block">
                  <div className="flex items-start gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />
                    <span>Advanced website indexing target site unverified</span>
                  </div>
                  <div className="flex items-start gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />
                    <span>External domains cannot be indexed unless domain ownership is verified</span>
                  </div>
                  <div className="flex items-start gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />
                    <span>Use crawler fallback as primary event source</span>
                  </div>
                </div>
                <div className="pl-5 flex items-center gap-2.5 text-[11px]" data-testid="vertex-basic-toggle">
                  <Switch
                    id="vertex-basic-toggle"
                    checked={vertexBasicDraft}
                    onCheckedChange={(v) => {
                      setVertexBasicDraft(v);
                      saveFilterSettings.mutate({
                        koreaBboxEnabled: koreaBboxDraft,
                        adKeywords: adKeywordsDraft,
                        blockedHosts: blockedHostsDraft,
                        vertexBasicSearchEnabled: v,
                      });
                    }}
                  />
                  <label htmlFor="vertex-basic-toggle" className="cursor-pointer select-none text-stone-600">
                    Basic website search 데이터 스토어를 <b>discovery fallback</b>으로 사용
                    {vertexBasicDraft && (
                      <span className="ml-1 text-amber-600">(켜짐 — 결과는 저신뢰도 후보 풀로만 합류)</span>
                    )}
                  </label>
                  {vertexBasicDraft && (
                    <span className="text-amber-700 text-[10px]">켜짐 — VERTEX_AI_SEARCH_BASIC_DATASTORE 서버 환경변수도 설정해야 작동합니다</span>
                  )}
                </div>
                {providers.vertex.reason !== "missing_credentials" && (
                  <div className="flex items-center gap-2 pl-5">
                    <Input
                      value={vertexTestKeyword}
                      onChange={(e) => setVertexTestKeyword(e.target.value)}
                      placeholder="테스트 키워드"
                      className="h-7 text-xs w-52"
                      data-testid="input-vertex-test-keyword"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => { setVertexTestResult(null); setVertexTestOpen(true); handleVertexTest(); }}
                      disabled={vertexTest.isPending}
                      data-testid="button-vertex-test"
                    >
                      {vertexTest.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <FlaskConical className="w-3 h-3 mr-1" />}
                      보조 검색 테스트
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        <Card className="p-3 mb-4" data-testid="card-secondary-search">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-stone-700 mb-2">
            <FlaskConical className="w-4 h-4 text-amber-500" /> 이벤트 보조 검색
            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 ml-1">Secondary search</Badge>
          </div>
          <p className="text-[11px] text-stone-500 mb-2">
            키워드로 정제된 이벤트 레코드를 검색합니다. Vertex AI 자격증명이 있으면 Vertex로, 없으면 DB 텍스트 폴백으로 처리됩니다.
          </p>
          <div className="flex items-center gap-2 mb-3">
            <Input
              value={secondarySearchQuery}
              onChange={(e) => setSecondarySearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && secondarySearchQuery.trim()) {
                  runSecondarySearch.mutate(secondarySearchQuery.trim());
                }
              }}
              placeholder="예: 2026 반려동물 박람회"
              className="h-8 text-xs max-w-xs"
              data-testid="input-secondary-search"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => {
                if (secondarySearchQuery.trim()) runSecondarySearch.mutate(secondarySearchQuery.trim());
              }}
              disabled={runSecondarySearch.isPending || !secondarySearchQuery.trim()}
              data-testid="button-secondary-search-run"
            >
              {runSecondarySearch.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Database className="w-3 h-3 mr-1" />}
              검색
            </Button>
            {secondarySearchResults !== null && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-stone-400"
                onClick={() => { setSecondarySearchResults(null); setSecondarySearchRanQuery(""); }}
              >
                초기화
              </Button>
            )}
          </div>
          {secondarySearchResults !== null && (
            <div data-testid="secondary-search-results">
              {secondarySearchResults.length === 0 ? (
                <p className="text-[11px] text-stone-400">
                  "{secondarySearchRanQuery}" 에 대한 결과가 없습니다.
                </p>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-stone-500">
                    "{secondarySearchRanQuery}" 검색 결과 {secondarySearchResults.length}건
                  </p>
                  {secondarySearchResults.map((r, i) => (
                    <div key={i} className="border border-stone-100 rounded px-2.5 py-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-stone-800 leading-tight">{r.title}</span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] shrink-0 ${
                            r.source === "vertex"
                              ? "bg-sky-50 text-sky-700 border-sky-200"
                              : r.source === "vertex_basic"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-stone-100 text-stone-500 border-stone-200"
                          }`}
                        >
                          {r.source === "vertex" ? "Vertex" : r.source === "vertex_basic" ? "Vertex Basic" : "DB 폴백"}
                        </Badge>
                      </div>
                      {r.snippet && <p className="text-stone-500 mt-0.5 text-[11px] line-clamp-2">{r.snippet}</p>}
                      {r.link && (
                        <a
                          href={r.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-600 hover:underline text-[11px] flex items-center gap-0.5 mt-0.5"
                        >
                          <ExternalLink className="w-2.5 h-2.5" /> {r.link}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        <Card className="p-3 mb-4" data-testid="card-body-fetch-settings">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-stone-700">
              <Settings2 className="w-4 h-4" /> 본문 페치 한도
            </div>
            <div className="flex flex-col">
              <label className="text-[11px] text-stone-500 mb-0.5" htmlFor="perRunMax">Run당 최대 호출 수 (0~200)</label>
              <Input
                id="perRunMax"
                type="number"
                min={0}
                max={200}
                step={1}
                value={perRunDraft}
                onChange={(e) => setPerRunDraft(e.target.value)}
                className="h-8 w-32"
                data-testid="input-body-fetch-per-run"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[11px] text-stone-500 mb-0.5" htmlFor="perHostMax">사이트당 최대 호출 수 (0~200)</label>
              <Input
                id="perHostMax"
                type="number"
                min={0}
                max={200}
                step={1}
                value={perHostDraft}
                onChange={(e) => setPerHostDraft(e.target.value)}
                className="h-8 w-32"
                data-testid="input-body-fetch-per-host"
              />
            </div>
            <Button
              size="sm"
              onClick={onSaveBodyFetchSettings}
              disabled={!settingsDirty || saveBodyFetchSettings.isPending}
              className="h-8 bg-stone-900 hover:bg-stone-800"
              data-testid="button-save-body-fetch-settings"
            >
              {saveBodyFetchSettings.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "저장"}
            </Button>
            <span className="text-[11px] text-stone-500 ml-auto">
              저장 시 다음 자동 수집 실행부터 즉시 반영됩니다.
            </span>
          </div>
        </Card>

        <Card className="p-3 mb-4" data-testid="card-filter-settings">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-stone-700">
              <Settings2 className="w-4 h-4" /> 수집 필터
            </div>
            <div className="flex items-center gap-2 ml-2">
              <Switch
                id="koreaBboxEnabled"
                checked={koreaBboxDraft}
                onCheckedChange={setKoreaBboxDraft}
                data-testid="switch-korea-bbox"
              />
              <label htmlFor="koreaBboxEnabled" className="text-sm text-stone-700">
                한국 영역만 수집 (해외 행사 차단)
              </label>
            </div>
            <Button
              size="sm"
              onClick={onSaveFilterSettings}
              disabled={!filterSettingsDirty || saveFilterSettings.isPending}
              className="h-8 bg-stone-900 hover:bg-stone-800 ml-auto"
              data-testid="button-save-filter-settings"
            >
              {saveFilterSettings.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "저장"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-[12px] font-medium text-stone-700 mb-1">광고성 키워드</div>
              <p className="text-[11px] text-stone-500 mb-2">제목·요약에 포함되면 자동으로 검수 대기로 분류됩니다. 예: 할인, 쿠폰, 무료배송</p>
              <div className="flex gap-2 mb-2">
                <Input
                  value={adKeywordInput}
                  onChange={(e) => setAdKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addAdKeyword();
                    }
                  }}
                  placeholder="키워드 입력 후 Enter"
                  className="h-8"
                  data-testid="input-ad-keyword"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addAdKeyword}
                  className="h-8"
                  data-testid="button-add-ad-keyword"
                >
                  추가
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 min-h-[28px]" data-testid="list-ad-keywords">
                {adKeywordsDraft.length === 0 ? (
                  <span className="text-[11px] text-stone-400">등록된 키워드 없음</span>
                ) : (
                  adKeywordsDraft.map((kw) => (
                    <Badge
                      key={kw}
                      variant="secondary"
                      className="text-xs gap-1 pr-1"
                      data-testid={`chip-ad-keyword-${kw}`}
                    >
                      {kw}
                      <button
                        type="button"
                        onClick={() => removeAdKeyword(kw)}
                        className="ml-0.5 hover:text-rose-600"
                        aria-label={`${kw} 삭제`}
                        data-testid={`button-remove-ad-keyword-${kw}`}
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="text-[12px] font-medium text-stone-700 mb-1">호스트 블랙리스트</div>
              <p className="text-[11px] text-stone-500 mb-2">해당 도메인 결과는 수집에서 제외됩니다. 예: example-shop.com</p>
              <div className="flex gap-2 mb-2">
                <Input
                  value={blockedHostInput}
                  onChange={(e) => setBlockedHostInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addBlockedHost();
                    }
                  }}
                  placeholder="도메인 입력 후 Enter (예: example.com)"
                  className="h-8"
                  data-testid="input-blocked-host"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addBlockedHost}
                  className="h-8"
                  data-testid="button-add-blocked-host"
                >
                  추가
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 min-h-[28px]" data-testid="list-blocked-hosts">
                {blockedHostsDraft.length === 0 ? (
                  <span className="text-[11px] text-stone-400">등록된 도메인 없음</span>
                ) : (
                  blockedHostsDraft.map((h) => (
                    <Badge
                      key={h}
                      variant="secondary"
                      className="text-xs gap-1 pr-1"
                      data-testid={`chip-blocked-host-${h}`}
                    >
                      {h}
                      <button
                        type="button"
                        onClick={() => removeBlockedHost(h)}
                        className="ml-0.5 hover:text-rose-600"
                        aria-label={`${h} 삭제`}
                        data-testid={`button-remove-blocked-host-${h}`}
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-stone-500 mr-1">상태</span>
            {([
              { v: "all", label: "전체", count: items.length },
              { v: "inactive", label: "검수 대기", count: inactiveCount },
              { v: "active", label: "활성", count: activeCount },
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
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    statusFilter === opt.v
                      ? "bg-white/20 text-white"
                      : opt.v === "inactive" && opt.count > 0
                      ? "bg-amber-100 text-amber-800"
                      : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {opt.count}
                </span>
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
            {sources.map((src) => {
              const c = sourceCounts.bySrc.get(src) ?? { total: 0, pending: 0 };
              return (
                <Button
                  key={src}
                  size="sm"
                  variant={sourceFilter === src ? "default" : "outline"}
                  className={`h-7 rounded-full text-xs ${sourceFilter === src ? "bg-stone-900 hover:bg-stone-800" : ""}`}
                  onClick={() => setSourceFilter(src)}
                  data-testid={`chip-source-${slugifySource(src)}`}
                >
                  {src}
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      sourceFilter === src ? "bg-white/20 text-white" : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {c.total}
                  </span>
                  {c.pending > 0 && (
                    <span
                      className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800"
                      title={`검수 대기 ${c.pending}건`}
                    >
                      신규 {c.pending}
                    </span>
                  )}
                </Button>
              );
            })}
            {sourceCounts.none.total > 0 && (
              <Button
                size="sm"
                variant={sourceFilter === "__none__" ? "default" : "outline"}
                className={`h-7 rounded-full text-xs ${sourceFilter === "__none__" ? "bg-stone-900 hover:bg-stone-800" : ""}`}
                onClick={() => setSourceFilter("__none__")}
                data-testid="chip-source-none"
              >
                출처 없음
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    sourceFilter === "__none__" ? "bg-white/20 text-white" : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {sourceCounts.none.total}
                </span>
              </Button>
            )}
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
                  disabled={selectedCount === 0 || bulkDeactivate.isPending}
                  onClick={handleBulkDeactivate}
                  data-testid="button-bulk-deactivate"
                >
                  {bulkDeactivate.isPending
                    ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    : <XCircle className="w-4 h-4 mr-1" />}
                  선택 항목 비활성화
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
                          {!it.isActive && (
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200" data-testid={`badge-pending-${it.id}`}>
                              검수 대기
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-stone-500 mt-1 flex items-center gap-1.5 flex-wrap">
                          <span>{PET_EVENT_CATEGORY_LABELS[it.category as PetEventCategory] ?? it.category}</span>
                          {it.source && it.source.trim() && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${sourceBadgeClass(it.source.trim())}`}
                              data-testid={`badge-source-${it.id}`}
                            >
                              {it.source.trim()}
                            </Badge>
                          )}
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

      <Dialog open={open} onOpenChange={handleFormDialogOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {form.id ? "행사 수정" : pendingResolution ? "수집 실패 후보 수동 등록" : "행사 추가"}
            </DialogTitle>
          </DialogHeader>
          {pendingResolution && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-2">
              저장 시 해당 후보가 자동으로 "처리됨"으로 표시됩니다. 누락된 일자·장소를 채워 주세요.
            </div>
          )}
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

      <Dialog open={failuresOpen} onOpenChange={setFailuresOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" data-testid="dialog-import-failures">
          <DialogHeader>
            <DialogTitle>수집 실패 후보 검토</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between text-xs text-stone-600 mb-2">
            <span>
              검색엔진(Google/Naver/Daum) 등에서 행사로 추정되었으나 날짜·장소 추출에 실패한 후보를 검토하고 수동으로 등록할 수 있습니다.
            </span>
            <label className="flex items-center gap-1 cursor-pointer shrink-0 ml-2">
              <Checkbox
                checked={showResolved}
                onCheckedChange={(v) => setShowResolved(v === true)}
                data-testid="checkbox-show-resolved-failures"
              />
              <span>처리·숨김 항목 포함</span>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mb-3" data-testid="failure-class-filters">
            <span className="text-xs font-medium text-stone-500 mr-1">상태 분류</span>
            {(["all", "filter_blocked_all", "filter_korea", "filter_keyword", "filter_host", "body_fetched", "robots_blocked", "body_http", "body_limit", "body_other", "no_body"] as const).map((k) => {
              const isAll = k === "all";
              const isFilterAll = k === "filter_blocked_all";
              const count = isAll
                ? candidateClassPool.length
                : isFilterAll
                  ? filterBlockedTotal
                  : (candidateClassCounts[k as FailureClass] ?? 0);
              const active = failureClassFilter === k;
              const label = isAll
                ? "전체"
                : isFilterAll
                  ? "필터 차단 전체"
                  : FAILURE_CLASS_LABELS[k as FailureClass];
              const isFilterChip = isFilterAll || (k !== "all" && FILTER_BLOCK_CLASSES.has(k as FailureClass));
              return (
                <Button
                  key={k}
                  size="sm"
                  variant={active ? "default" : "outline"}
                  className={`h-6 rounded-full text-[11px] px-2 ${active ? "bg-stone-900 hover:bg-stone-800" : isFilterChip ? "border-rose-200 text-rose-700" : ""}`}
                  onClick={() => setFailureClassFilter(k)}
                  data-testid={`chip-failure-class-${k}`}
                >
                  {label}
                  <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${active ? "bg-white/20 text-white" : "bg-stone-100 text-stone-600"}`}>
                    {count}
                  </span>
                </Button>
              );
            })}
          </div>
          {failuresLoading ? (
            <div className="py-8 text-center text-sm text-stone-500">불러오는 중…</div>
          ) : visibleCandidates.length === 0 ? (
            <div className="py-8 text-center text-sm text-stone-500">
              {failureCandidates.length === 0
                ? "최근 수집 실패 후보가 없습니다."
                : candidateClassPool.length === 0
                  ? "처리·숨김 항목만 있습니다. 위 토글을 켜서 확인하세요."
                  : failureClassFilter === "all"
                    ? "표시할 후보가 없습니다."
                    : "선택한 분류에 해당하는 후보가 없습니다. 다른 칩을 눌러보세요."}
            </div>
          ) : (
            <Table data-testid="table-import-failures">
              <TableHeader>
                <TableRow>
                  <TableHead>출처 / 시각</TableHead>
                  <TableHead>실패 사유</TableHead>
                  <TableHead className="w-32">상태</TableHead>
                  <TableHead className="w-44 text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleCandidates.map((c) => {
                  const isOpen = c.status === "open";
                  const cleanedTitle = (c.title ?? "").replace(/<[^>]+>/g, "").trim();
                  const fcls = classifyFailure(c.message);
                  const isFilterBlocked = FILTER_BLOCK_CLASSES.has(fcls);
                  const filterKeyword = fcls === "filter_keyword" ? extractFilterKeyword(c.message) : null;
                  const filterHost = fcls === "filter_host" ? extractFilterHost(c.message) : null;
                  return (
                    <TableRow key={`${c.runId}-${c.idx}`} data-testid={`row-failure-${c.runId}-${c.idx}`}>
                      <TableCell className="text-xs align-top">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${sourceBadgeClass(c.source)}`}
                        >
                          {c.source}
                        </Badge>
                        <div className="text-stone-400 mt-1">{formatRelative(c.runStartedAt)}</div>
                      </TableCell>
                      <TableCell className="text-xs align-top">
                        {cleanedTitle && (
                          <div className="font-medium text-stone-800 line-clamp-2 mb-0.5">{cleanedTitle}</div>
                        )}
                        <Badge
                          variant="outline"
                          className={`mb-1 text-[10px] ${isFilterBlocked ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-stone-50 text-stone-700 border-stone-200"}`}
                          data-testid={`badge-failure-class-${c.runId}-${c.idx}`}
                        >
                          {FAILURE_CLASS_LABELS[fcls]}
                        </Badge>
                        {filterKeyword && (
                          <Badge
                            variant="outline"
                            className="ml-1 mb-1 text-[10px] bg-amber-50 text-amber-800 border-amber-200"
                            data-testid={`badge-filter-keyword-${c.runId}-${c.idx}`}
                          >
                            키워드: {filterKeyword}
                          </Badge>
                        )}
                        {filterHost && (
                          <Badge
                            variant="outline"
                            className="ml-1 mb-1 text-[10px] bg-amber-50 text-amber-800 border-amber-200"
                            data-testid={`badge-filter-host-${c.runId}-${c.idx}`}
                          >
                            호스트: {filterHost}
                          </Badge>
                        )}
                        <div className={`${isFilterBlocked ? "text-rose-700" : "text-amber-700"} line-clamp-2`}>{c.message}</div>
                        {c.link && (
                          <a
                            href={c.link}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="mt-1 inline-flex items-center gap-1 text-sky-700 hover:underline break-all"
                            data-testid={`link-failure-${c.runId}-${c.idx}`}
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="line-clamp-1">{c.link}</span>
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="text-xs align-top">
                        {c.status === "open" ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                            검토 대기
                          </Badge>
                        ) : c.status === "resolved" ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            등록 완료{c.resolvedEventId ? ` · #${c.resolvedEventId}` : ""}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-stone-100 text-stone-600 border-stone-200">
                            <EyeOff className="w-3 h-3 mr-1" /> 숨김
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right align-top">
                        {isOpen ? (
                          <div className="flex flex-col gap-1 items-end">
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-stone-900 hover:bg-stone-800 h-7 text-xs"
                              onClick={() => openCreateFromCandidate(c)}
                              data-testid={`button-register-failure-${c.runId}-${c.idx}`}
                            >
                              <Plus className="w-3 h-3 mr-1" /> 수동 등록
                            </Button>
                            {filterKeyword && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-rose-200 text-rose-700 hover:bg-rose-50"
                                onClick={() => unblockFilterPattern.mutate({ kind: "keyword", value: filterKeyword })}
                                disabled={unblockFilterPattern.isPending || !filterSettings}
                                data-testid={`button-unblock-keyword-${c.runId}-${c.idx}`}
                                title={`광고성 키워드 "${filterKeyword}" 차단을 해제합니다`}
                              >
                                <Undo2 className="w-3 h-3 mr-1" /> 키워드 차단 해제
                              </Button>
                            )}
                            {filterHost && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-rose-200 text-rose-700 hover:bg-rose-50"
                                onClick={() => unblockFilterPattern.mutate({ kind: "host", value: filterHost })}
                                disabled={unblockFilterPattern.isPending || !filterSettings}
                                data-testid={`button-unblock-host-${c.runId}-${c.idx}`}
                                title={`호스트 "${filterHost}" 차단을 해제합니다`}
                              >
                                <Undo2 className="w-3 h-3 mr-1" /> 호스트 화이트리스트
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-stone-500"
                              onClick={() => dismissFailure.mutate({ runId: c.runId, idx: c.idx })}
                              disabled={dismissFailure.isPending}
                              data-testid={`button-dismiss-failure-${c.runId}-${c.idx}`}
                            >
                              <EyeOff className="w-3 h-3 mr-1" /> 숨기기
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => reopenFailure.mutate({ runId: c.runId, idx: c.idx })}
                            disabled={reopenFailure.isPending}
                            data-testid={`button-reopen-failure-${c.runId}-${c.idx}`}
                          >
                            <Undo2 className="w-3 h-3 mr-1" /> 되돌리기
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFailuresOpen(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={vertexTestOpen} onOpenChange={setVertexTestOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto" data-testid="dialog-vertex-test">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4" /> Vertex AI Search 보조 검색 테스트
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                value={vertexTestKeyword}
                onChange={(e) => setVertexTestKeyword(e.target.value)}
                placeholder="테스트 키워드"
                className="flex-1"
                data-testid="input-vertex-test-keyword-modal"
                onKeyDown={(e) => { if (e.key === "Enter") { setVertexTestResult(null); handleVertexTest(); } }}
              />
              <Button
                onClick={() => { setVertexTestResult(null); handleVertexTest(); }}
                disabled={vertexTest.isPending}
                className="bg-stone-900 hover:bg-stone-800 shrink-0"
                data-testid="button-vertex-test-run"
              >
                {vertexTest.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <FlaskConical className="w-4 h-4 mr-1" />}
                테스트
              </Button>
            </div>
            {vertexTest.isPending && (
              <div className="py-6 text-center text-sm text-stone-500">
                <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Discovery Engine 호출 중…
              </div>
            )}
            {vertexTestResult && !vertexTest.isPending && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge
                    variant="outline"
                    className={`text-[11px] ${
                      vertexTestResult.status === "ok"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : vertexTestResult.status === "iam_permission_denied"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : vertexTestResult.status === "unverified_indexing"
                        ? "bg-amber-50 text-amber-800 border-amber-300"
                        : vertexTestResult.status === "permission_denied"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : vertexTestResult.status === "auth_failed"
                        ? "bg-orange-50 text-orange-700 border-orange-200"
                        : vertexTestResult.status === "no_credentials"
                        ? "bg-stone-100 text-stone-500 border-stone-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                    data-testid="badge-vertex-test-status"
                  >
                    {vertexTestResult.status === "ok"
                      ? "✓ 정상 응답"
                      : vertexTestResult.status === "iam_permission_denied"
                      ? "✗ IAM 권한 없음"
                      : vertexTestResult.status === "unverified_indexing"
                      ? "⚠ 소유권 미인증 (Advanced website indexing)"
                      : vertexTestResult.status === "permission_denied"
                      ? "✗ permission denied"
                      : vertexTestResult.status === "auth_failed"
                      ? "✗ 인증 실패"
                      : vertexTestResult.status === "no_credentials"
                      ? "시크릿 없음"
                      : `✗ HTTP 오류 ${vertexTestResult.httpStatus ?? ""}`}
                  </Badge>
                  {vertexTestResult.httpStatus !== null && (
                    <span className="text-stone-500">HTTP {vertexTestResult.httpStatus}</span>
                  )}
                  <span className="text-stone-500">키워드: <b>"{vertexTestResult.keyword}"</b></span>
                </div>
                {vertexTestResult.status === "iam_permission_denied" && (
                  <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded p-2 space-y-1" data-testid="vertex-iam-hint">
                    <div className="font-medium">IAM 권한 부족</div>
                    <div>서비스 계정에 <code className="bg-red-100 px-0.5 rounded">roles/discoveryengine.viewer</code> 역할을 부여하세요.</div>
                  </div>
                )}
                {vertexTestResult.status === "unverified_indexing" && (
                  <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 space-y-1" data-testid="vertex-unverified-hint">
                    <div className="font-medium">Advanced website indexing — 소유권 미인증</div>
                    <div>타겟 사이트(k-pet.co.kr 등 외부 도메인)의 소유권 인증 없이는 Advanced website indexing으로 색인할 수 없습니다.</div>
                    <div className="text-amber-700">→ Naver/Daum/Google 크롤러 폴백이 주 수집 소스로 계속 동작합니다.</div>
                  </div>
                )}
                {vertexTestResult.error && (
                  <div className="text-xs text-red-600 bg-red-50 rounded p-2">{vertexTestResult.error}</div>
                )}
                {vertexTestResult.status === "ok" && (
                  <>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-200">
                        원시 결과 {vertexTestResult.rawCount}건
                      </Badge>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200">
                        정규화 통과 {vertexTestResult.normalizedOk}건
                      </Badge>
                      {vertexTestResult.normalizedFail > 0 && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                          탈락 {vertexTestResult.normalizedFail}건
                        </Badge>
                      )}
                    </div>
                    {Object.keys(vertexTestResult.failReasons).length > 0 && (
                      <div className="text-xs text-stone-600">
                        <div className="font-medium mb-1 text-stone-500">탈락 사유</div>
                        <div className="space-y-0.5">
                          {Object.entries(vertexTestResult.failReasons).map(([reason, count]) => (
                            <div key={reason} className="flex items-center gap-1">
                              <span className="text-amber-700 font-medium">{count}건</span>
                              <span className="text-stone-500">{reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {vertexTestResult.firstResult && (
                      <div className="text-xs border border-stone-100 rounded p-2 bg-stone-50">
                        <div className="font-medium text-stone-500 mb-1">첫 결과 미리보기</div>
                        <div className="font-medium text-stone-800 line-clamp-2">{vertexTestResult.firstResult.title}</div>
                        {vertexTestResult.firstResult.link && (
                          <a
                            href={vertexTestResult.firstResult.link}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-sky-600 hover:underline flex items-center gap-1 mt-0.5 line-clamp-1"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            {vertexTestResult.firstResult.link}
                          </a>
                        )}
                        {vertexTestResult.firstResult.snippet && (
                          <div className="text-stone-500 mt-1 line-clamp-3">{vertexTestResult.firstResult.snippet}</div>
                        )}
                      </div>
                    )}
                    {vertexTestResult.rawCount === 0 && (
                      <div className="text-xs text-stone-500 bg-stone-50 rounded p-2">
                        결과가 0건입니다. 데이터스토어 색인이 완료되지 않았거나 해당 키워드와 일치하는 페이지가 없습니다.
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVertexTestOpen(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto" data-testid="dialog-import-history">
          <DialogHeader>
            <DialogTitle>자동 수집 실행 이력 (최근 {history.length}회)</DialogTitle>
          </DialogHeader>
          {history.length === 0 ? (
            <div className="text-sm text-stone-500 py-8 text-center">표시할 이력이 없습니다.</div>
          ) : (
            <div className="space-y-2">
              {history.map((h, idx) => {
                const ok = h.failures.length === 0;
                const expanded = expandedHistoryIdx === idx;
                const failuresBySource = h.failures.reduce<Record<string, string[]>>((acc, f) => {
                  (acc[f.source] ||= []).push(f.message);
                  return acc;
                }, {});
                return (
                  <div key={`${h.startedAt}-${idx}`} className="border border-stone-200 rounded-md" data-testid={`row-import-history-${idx}`}>
                    <button
                      type="button"
                      onClick={() => setExpandedHistoryIdx(expanded ? null : idx)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-stone-50"
                    >
                      {ok ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium">{new Date(h.startedAt).toLocaleString("ko-KR")}</div>
                        <div className="text-[11px] text-stone-400">{formatRelative(h.startedAt)} · {formatDuration(h.durationMs)}</div>
                      </div>
                      <div className="flex gap-3 text-xs shrink-0">
                        <span>수집 <b>{h.fetched}</b></span>
                        <span className="text-emerald-700">신규 <b>{h.created}</b></span>
                        <span className="text-stone-500">중복 {h.duplicates}</span>
                        {h.failures.length > 0 && <span className="text-amber-700">실패 {h.failures.length}</span>}
                      </div>
                    </button>
                    {expanded && (
                      <div className="border-t border-stone-200 bg-stone-50/50 p-3">
                        {h.bodyFetch && (h.bodyFetch.attempted + h.bodyFetch.limitExceeded + h.bodyFetch.robotsBlocked > 0) && (
                          <div
                            className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px] text-stone-700"
                            data-testid={`row-body-fetch-${idx}`}
                          >
                            <span className="font-medium text-stone-500">본문 페치</span>
                            <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-800 border-sky-200">
                              시도 {h.bodyFetch.attempted}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200">
                              성공 {h.bodyFetch.succeeded}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200">
                              후보 구조 {h.bodyFetch.rescued}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] bg-stone-50 text-stone-700 border-stone-200">
                              robots 차단 {h.bodyFetch.robotsBlocked}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200">
                              HTTP 오류 {h.bodyFetch.httpErrors}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200">
                              한도 초과 {h.bodyFetch.limitExceeded}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] bg-stone-50 text-stone-600 border-stone-200">
                              기타 {h.bodyFetch.otherSkipped}
                            </Badge>
                          </div>
                        )}
                        {h.bySource.length === 0 ? (
                          <div className="text-xs text-stone-400">소스별 통계가 기록되지 않은 이전 실행입니다.</div>
                        ) : (
                          <Table data-testid={`table-by-source-${idx}`}>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">소스</TableHead>
                                <TableHead className="text-right text-xs">수집</TableHead>
                                <TableHead className="text-right text-xs">신규</TableHead>
                                <TableHead className="text-right text-xs">중복</TableHead>
                                <TableHead className="text-right text-xs">실패</TableHead>
                                <TableHead className="text-xs">실패 사유</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {h.bySource.map((s) => {
                                const reasons = failuresBySource[s.source] ?? [];
                                const isEmpty = s.fetched === 0 && s.created === 0 && s.duplicates === 0 && s.failures === 0;
                                return (
                                  <TableRow key={s.source} data-testid={`row-source-${idx}-${s.source}`}>
                                    <TableCell className="text-xs font-medium">
                                      {s.source}
                                      {s.source === "Vertex AI Search" && (
                                        <Badge variant="outline" className="ml-1 text-[10px] py-0 bg-amber-50 text-amber-700 border-amber-200">보조검색</Badge>
                                      )}
                                      {isEmpty && s.source !== "Vertex AI Search" && (
                                        <Badge variant="outline" className="ml-2 text-[10px] py-0">키 미설정/0건</Badge>
                                      )}
                                      {s.source === "Vertex AI Search" && s.fetched === 0 && (
                                        <>
                                          {s.emptyReason === "permission_denied" ? (
                                            <Badge variant="outline" className="ml-2 text-[10px] py-0 bg-red-50 text-red-700 border-red-200">permission denied</Badge>
                                          ) : s.emptyReason === "normalize_rejected" ? (
                                            <Badge variant="outline" className="ml-2 text-[10px] py-0 bg-sky-50 text-sky-700 border-sky-200">정규화 탈락</Badge>
                                          ) : s.emptyReason === "no_index" ? (
                                            <Badge variant="outline" className="ml-2 text-[10px] py-0 bg-amber-50 text-amber-700 border-amber-200">색인 미완료</Badge>
                                          ) : (
                                            <Badge variant="outline" className="ml-2 text-[10px] py-0">0건</Badge>
                                          )}
                                        </>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right text-xs">{s.fetched}</TableCell>
                                    <TableCell className="text-right text-xs font-medium text-emerald-700">{s.created}</TableCell>
                                    <TableCell className="text-right text-xs text-stone-500">{s.duplicates}</TableCell>
                                    <TableCell className="text-right text-xs text-amber-700">{s.failures}</TableCell>
                                    <TableCell className="text-xs">
                                      {reasons.length === 0 ? (
                                        <span className="text-stone-400">—</span>
                                      ) : (
                                        <ul className="space-y-0.5 text-amber-700 max-h-32 overflow-y-auto">
                                          {reasons.slice(0, 10).map((m, i) => (
                                            <li key={i}><XCircle className="inline w-3 h-3 mr-1" />{m}</li>
                                          ))}
                                          {reasons.length > 10 && (
                                            <li className="text-stone-400">외 {reasons.length - 10}건</li>
                                          )}
                                        </ul>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryOpen(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
