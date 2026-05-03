import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Plus, Trash2, Edit2, Shield, Syringe, PawPrint } from "lucide-react";

interface Zone {
  id: number;
  instituteId: number;
  name: string;
  zoneType: string;
  description: string | null;
  requiresVaccination: boolean;
  maxTemperamentLevel: string | null;
  minTrainingLevel: string | null;
  capacity: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const ZONE_TYPES = [
  { value: "training", label: "훈련 구역" },
  { value: "play", label: "놀이 구역" },
  { value: "rest", label: "휴식 구역" },
  { value: "grooming", label: "미용 구역" },
  { value: "medical", label: "의료 구역" },
  { value: "waiting", label: "대기 구역" },
  { value: "outdoor", label: "야외 구역" },
];

const TEMPERAMENT_LABELS: Record<string, string> = {
  A: "A (사회성 양호)",
  B: "B (흥분 조절)",
  C: "C (짖음/경계)",
  D: "D (공격성 주의)",
  E: "E (분리불안)",
};

const TEMPERAMENT_COLORS: Record<string, string> = {
  A: "bg-green-100 text-green-800",
  B: "bg-blue-100 text-blue-800",
  C: "bg-yellow-100 text-yellow-800",
  D: "bg-red-100 text-red-800",
  E: "bg-primary/10 text-primary",
};

const emptyForm = {
  name: "",
  zoneType: "",
  description: "",
  requiresVaccination: false,
  maxTemperamentLevel: "",
  minTrainingLevel: "",
  capacity: "",
};

export default function ZoneManagement() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery<{ success: boolean; zones: Zone[] }>({
    queryKey: ["/api/institute/zones"],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof emptyForm) => apiRequest("POST", "/api/institute/zones", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/institute/zones"] });
      setShowDialog(false);
      resetForm();
      toast({ title: "존 생성 완료", description: "새 구역이 등록되었습니다." });
    },
    onError: () => toast({ title: "오류", description: "존 생성에 실패했습니다.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof emptyForm }) => apiRequest("PUT", `/api/institute/zones/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/institute/zones"] });
      setShowDialog(false);
      setEditingZone(null);
      resetForm();
      toast({ title: "존 수정 완료" });
    },
    onError: () => toast({ title: "오류", description: "수정에 실패했습니다.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/institute/zones/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/institute/zones"] });
      toast({ title: "존 삭제 완료" });
    },
    onError: () => toast({ title: "오류", description: "삭제에 실패했습니다.", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest("PUT", `/api/institute/zones/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/institute/zones"] }),
  });

  function resetForm() {
    setForm(emptyForm);
  }

  function openCreate() {
    setEditingZone(null);
    resetForm();
    setShowDialog(true);
  }

  function openEdit(zone: Zone) {
    setEditingZone(zone);
    setForm({
      name: zone.name,
      zoneType: zone.zoneType,
      description: zone.description || "",
      requiresVaccination: zone.requiresVaccination,
      maxTemperamentLevel: zone.maxTemperamentLevel || "",
      minTrainingLevel: zone.minTrainingLevel || "",
      capacity: zone.capacity ? String(zone.capacity) : "",
    });
    setShowDialog(true);
  }

  function handleSubmit() {
    if (!form.name || !form.zoneType) {
      toast({ title: "입력 오류", description: "존 이름과 유형은 필수입니다.", variant: "destructive" });
      return;
    }
    const payload = {
      name: form.name,
      zoneType: form.zoneType,
      description: form.description || null,
      requiresVaccination: form.requiresVaccination,
      maxTemperamentLevel: (form.maxTemperamentLevel && form.maxTemperamentLevel !== 'none') ? form.maxTemperamentLevel : null,
      minTrainingLevel: form.minTrainingLevel || null,
      capacity: form.capacity ? Number(form.capacity) : null,
    };
    if (editingZone) {
      updateMutation.mutate({ id: editingZone.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const zones = data?.zones || [];
  const zoneTypeLabel = (type: string) => ZONE_TYPES.find(z => z.value === type)?.label || type;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            구역(존) 관리
          </h1>
          <p className="text-muted-foreground mt-1">
            기관 내 구역을 설정하고 접종/성향 기반 입장 조건을 관리합니다.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          새 구역 추가
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-40" />
            </Card>
          ))}
        </div>
      ) : zones.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">등록된 구역이 없습니다</p>
            <p className="mt-1">새 구역을 추가하여 반려동물 입장 조건을 설정해 보세요.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {zones.map(zone => (
            <Card key={zone.id} className={`relative ${!zone.isActive ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{zone.name}</CardTitle>
                    <Badge variant="secondary">{zoneTypeLabel(zone.zoneType)}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={zone.isActive}
                      onCheckedChange={(v) => toggleMutation.mutate({ id: zone.id, isActive: v })}
                    />
                    <Button variant="ghost" size="icon" onClick={() => openEdit(zone)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => {
                      if (confirm("이 구역을 삭제하시겠습니까?")) deleteMutation.mutate(zone.id);
                    }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {zone.description && (
                  <p className="text-sm text-muted-foreground">{zone.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {zone.requiresVaccination && (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Syringe className="w-3 h-3" />
                      접종 필수
                    </Badge>
                  )}
                  {zone.maxTemperamentLevel && (
                    <Badge className={`gap-1 text-xs ${TEMPERAMENT_COLORS[zone.maxTemperamentLevel] || ''}`}>
                      <PawPrint className="w-3 h-3" />
                      {zone.maxTemperamentLevel}등급 이하
                    </Badge>
                  )}
                  {zone.capacity && (
                    <Badge variant="outline" className="text-xs">
                      정원 {zone.capacity}마리
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingZone ? "구역 수정" : "새 구역 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>구역 이름 *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="예: 대형견 훈련장" />
            </div>
            <div>
              <Label>구역 유형 *</Label>
              <Select value={form.zoneType} onValueChange={v => setForm(f => ({ ...f, zoneType: v }))}>
                <SelectTrigger><SelectValue placeholder="유형 선택" /></SelectTrigger>
                <SelectContent>
                  {ZONE_TYPES.map(z => <SelectItem key={z.value} value={z.value}>{z.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>설명</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="구역에 대한 설명" rows={2} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2"><Syringe className="w-4 h-4" /> 접종 필수</Label>
              <Switch checked={form.requiresVaccination} onCheckedChange={v => setForm(f => ({ ...f, requiresVaccination: v }))} />
            </div>
            <div>
              <Label>최대 허용 성향 등급</Label>
              <Select value={form.maxTemperamentLevel} onValueChange={v => setForm(f => ({ ...f, maxTemperamentLevel: v }))}>
                <SelectTrigger><SelectValue placeholder="제한 없음" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">제한 없음</SelectItem>
                  {Object.entries(TEMPERAMENT_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>정원 (마리)</Label>
              <Input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="미입력 시 무제한" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>취소</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingZone ? "수정" : "추가"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
