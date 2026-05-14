import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GoogleMapView } from "@/components/GoogleMapView";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  PET_EVENT_CATEGORIES,
  PET_EVENT_CATEGORY_LABELS,
  type PetEvent,
} from "@shared/schema";
import { Calendar, MapPin, ExternalLink, Filter, X } from "lucide-react";

const fmtDate = (d: string | Date) => {
  const date = new Date(d);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
};
const fmtRange = (s: string | Date, e: string | Date) => {
  const a = fmtDate(s), b = fmtDate(e);
  return a === b ? a : `${a} ~ ${b}`;
};

export default function PetEventsMapPage() {
  const [category, setCategory] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [selected, setSelected] = useState<PetEvent | null>(null);

  const params = new URLSearchParams();
  if (category !== "all") params.append("category", category);
  if (from) params.append("from", from);
  if (to) params.append("to", to);
  const qs = params.toString();
  const queryUrl = `/api/pet-events${qs ? `?${qs}` : ""}`;

  const { data, isLoading } = useQuery<{ success: boolean; data: PetEvent[] }>({
    queryKey: ["/api/pet-events", category, from, to],
    queryFn: async () => {
      const res = await fetch(queryUrl, { credentials: "include" });
      if (!res.ok) throw new Error("행사 조회 실패");
      return res.json();
    },
  });

  const events = data?.data ?? [];

  type MapLocation = {
    id: number;
    name: string;
    address: string;
    type: string;
    coordinates: { lat: number; lng: number };
  };

  const locations = useMemo<MapLocation[]>(
    () =>
      events.map((e) => ({
        id: e.id,
        name: e.title,
        address: `${e.location} · ${fmtRange(e.startDate, e.endDate)}`,
        type: "event",
        coordinates: { lat: Number(e.lat), lng: Number(e.lng) },
      })),
    [events],
  );

  const handleSelect = (loc: MapLocation) => {
    const ev = events.find((e) => e.id === loc.id);
    if (ev) setSelected(ev);
  };

  const resetFilters = () => {
    setCategory("all");
    setFrom("");
    setTo("");
  };

  return (
    <>
      <title>전국 반려견 행사 지도 | TALEZ</title>
      <meta
        name="description"
        content="한국에서 열리는 반려견·반려동물 행사, 펫페어, 입양 이벤트, 훈련 대회를 지도와 목록으로 한눈에 확인하세요."
      />
      <div className="min-h-screen bg-stone-50">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="mb-5">
            <h1 className="text-2xl md:text-3xl font-bold text-stone-900">
              전국 반려견 행사 지도
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              펫페어, 입양 이벤트, 훈련 대회 등 전국에서 열리는 반려동물 행사를 지도에서 확인하세요.
            </p>
          </div>

          {/* Filters */}
          <Card className="p-4 mb-4">
            <div className="flex items-center gap-2 mb-3 text-stone-700">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">필터</span>
              {(category !== "all" || from || to) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="ml-auto h-7 text-xs"
                  data-testid="button-reset-filters"
                >
                  <X className="w-3 h-3 mr-1" /> 초기화
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-stone-500">카테고리</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1" data-testid="select-event-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {PET_EVENT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {PET_EVENT_CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-stone-500">시작일 이후</label>
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="mt-1"
                  data-testid="input-event-from"
                />
              </div>
              <div>
                <label className="text-xs text-stone-500">종료일 이전</label>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1"
                  data-testid="input-event-to"
                />
              </div>
            </div>
          </Card>

          {/* Map */}
          <Card className="p-3 mb-4">
            <GoogleMapView
              locations={locations}
              onLocationSelect={handleSelect}
              height="500px"
              zoom={7}
              center={{ lat: 36.5, lng: 127.8 }}
            />
            <p className="text-xs text-stone-400 mt-2">
              마커를 클릭하면 행사 상세 정보를 확인할 수 있습니다.
            </p>
          </Card>

          {/* Event list */}
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-stone-800">
              행사 목록 <span className="text-stone-400">({events.length})</span>
            </h2>
          </div>
          {isLoading ? (
            <div className="text-center py-12 text-stone-500">불러오는 중…</div>
          ) : events.length === 0 ? (
            <Card className="p-8 text-center text-stone-400">
              조건에 맞는 행사가 없습니다.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {events.map((e) => (
                <Card
                  key={e.id}
                  className="p-4 cursor-pointer hover:shadow-md transition"
                  onClick={() => setSelected(e)}
                  data-testid={`card-event-${e.id}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-stone-900 leading-tight">{e.title}</h3>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {PET_EVENT_CATEGORY_LABELS[e.category as keyof typeof PET_EVENT_CATEGORY_LABELS] ?? e.category}
                    </Badge>
                  </div>
                  <div className="flex items-center text-xs text-stone-600 mb-1">
                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                    {fmtRange(e.startDate, e.endDate)}
                  </div>
                  <div className="flex items-start text-xs text-stone-600">
                    <MapPin className="w-3.5 h-3.5 mr-1.5 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{e.location}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              {selected.imageUrl && (
                <img
                  src={selected.imageUrl}
                  alt={selected.title}
                  className="w-full h-40 object-cover rounded-md"
                />
              )}
              <div className="flex items-center gap-2">
                <Badge>{PET_EVENT_CATEGORY_LABELS[selected.category as keyof typeof PET_EVENT_CATEGORY_LABELS] ?? selected.category}</Badge>
                {selected.source && <span className="text-xs text-stone-400">출처: {selected.source}</span>}
              </div>
              <div className="flex items-center text-stone-700">
                <Calendar className="w-4 h-4 mr-2" />
                {fmtRange(selected.startDate, selected.endDate)}
              </div>
              <div className="flex items-start text-stone-700">
                <MapPin className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                <span>{selected.location}</span>
              </div>
              {selected.description && (
                <p className="text-stone-600 whitespace-pre-line">{selected.description}</p>
              )}
              {selected.websiteUrl && (
                <a
                  href={selected.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-primary hover:underline"
                  data-testid="link-event-website"
                >
                  <ExternalLink className="w-4 h-4 mr-1" /> 행사 홈페이지
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
