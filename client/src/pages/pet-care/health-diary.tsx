import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  Plus, Trash2, Edit, Download, Calendar as CalendarIcon, Activity, Weight,
  Pill, Syringe, Bell, ChevronLeft, ChevronRight, AlertTriangle,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, BarChart, Bar,
} from 'recharts';

interface Pet {
  id: number;
  name: string;
  breed?: string;
  ownerId: number;
  diaryShareWithTrainer?: boolean;
  assignedTrainerId?: number | null;
  assignedTrainerName?: string | null;
}

type StatusOption = { value: string; label: string };

interface CareLog {
  id: number;
  petId: number;
  date: string;
  note?: string;
  poopStatus?: string;
  mealStatus?: string;
  walkStatus?: string;
  mood?: string;
  energyLevel?: number;
  weightKg?: number | string;
  exerciseMinutes?: number;
  mealAmountG?: number;
  tags?: string[];
}

interface Medication {
  id: number;
  petId: number;
  name: string;
  dosage?: string;
  frequency?: string;
  dueDate: string;
  status: string;
  notes?: string;
  reminderEnabled?: boolean;
}

interface Vaccination {
  id: number;
  petId: number;
  vaccineName: string;
  vaccineDate: string;
  status: string;
  hospitalName?: string;
  nextDueDate?: string;
  notes?: string;
}

interface DiaryFormState {
  date: string;
  weightKg: string;
  exerciseMinutes: string;
  mealAmountG: string;
  energyLevel: string;
  mealStatus: string;
  poopStatus: string;
  walkStatus: string;
  mood: string;
  note: string;
}

interface MedicationFormState {
  name: string;
  dosage: string;
  frequency: string;
  dueDate: string;
  notes: string;
  reminderEnabled: boolean;
}

const POOP_OPTIONS: StatusOption[] = [
  { value: 'normal', label: '정상' }, { value: 'soft', label: '무름' },
  { value: 'diarrhea', label: '설사' }, { value: 'constipated', label: '변비' },
  { value: 'bloody', label: '혈변' }, { value: 'unknown', label: '확인안됨' },
];
const MEAL_OPTIONS: StatusOption[] = [
  { value: 'normal', label: '정상' }, { value: 'low', label: '소량' },
  { value: 'skipped', label: '거름' }, { value: 'overeaten', label: '과식' },
  { value: 'vomited', label: '구토' }, { value: 'unknown', label: '확인안됨' },
];
const WALK_OPTIONS: StatusOption[] = [
  { value: 'normal', label: '정상' }, { value: 'short', label: '짧음' },
  { value: 'long', label: '길게' }, { value: 'hyper', label: '과활동' },
  { value: 'limp', label: '절뚝거림' }, { value: 'unknown', label: '확인안됨' },
];
const MOOD_OPTIONS: StatusOption[] = [
  { value: 'happy', label: '행복' }, { value: 'calm', label: '차분' },
  { value: 'energetic', label: '활기' }, { value: 'tired', label: '피곤' },
  { value: 'anxious', label: '불안' }, { value: 'sad', label: '시무룩' },
];

const todayStr = (): string => new Date().toISOString().slice(0, 10);
const formatDate = (d: Date): string => d.toISOString().slice(0, 10);

const emptyDiaryForm = (): DiaryFormState => ({
  date: todayStr(),
  weightKg: '', exerciseMinutes: '', mealAmountG: '', energyLevel: '',
  mealStatus: '', poopStatus: '', walkStatus: '', mood: '', note: '',
});

const emptyMedForm = (): MedicationFormState => ({
  name: '', dosage: '', frequency: '', dueDate: todayStr(), notes: '', reminderEnabled: true,
});

const logToForm = (log: CareLog): DiaryFormState => ({
  date: log.date,
  weightKg: log.weightKg != null ? String(log.weightKg) : '',
  exerciseMinutes: log.exerciseMinutes != null ? String(log.exerciseMinutes) : '',
  mealAmountG: log.mealAmountG != null ? String(log.mealAmountG) : '',
  energyLevel: log.energyLevel != null ? String(log.energyLevel) : '',
  mealStatus: log.mealStatus ?? '',
  poopStatus: log.poopStatus ?? '',
  walkStatus: log.walkStatus ?? '',
  mood: log.mood ?? '',
  note: log.note ?? '',
});

export default function HealthDiaryPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<CareLog | null>(null);
  const [diaryForm, setDiaryForm] = useState<DiaryFormState>(emptyDiaryForm());
  const [medDialogOpen, setMedDialogOpen] = useState(false);
  const [medForm, setMedForm] = useState<MedicationFormState>(emptyMedForm());
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = new Date(); d.setDate(1); return d;
  });

  const { data: petsData } = useQuery<{ pets: Pet[] }>({ queryKey: ['/api/pets'] });
  const pets: Pet[] = petsData?.pets ?? [];
  const pet: Pet | undefined = pets.find((p) => p.id === selectedPetId) ?? pets[0];
  const petId: number | undefined = pet?.id;

  const { data: logsData, isLoading: logsLoading } = useQuery<{ logs: CareLog[] }>({
    queryKey: ['/api/diary/care-logs', petId],
    queryFn: async () => {
      const r = await fetch(`/api/diary/care-logs?petId=${petId}`, { credentials: 'include' });
      if (!r.ok) throw new Error('로그 조회 실패');
      return r.json();
    },
    enabled: !!petId,
  });
  const logs: CareLog[] = logsData?.logs ?? [];

  const { data: medsData } = useQuery<{ medications: Medication[] }>({
    queryKey: ['/api/diary/medications', petId],
    queryFn: async () => {
      const r = await fetch(`/api/diary/medications?petId=${petId}`, { credentials: 'include' });
      if (!r.ok) throw new Error('약 일정 조회 실패');
      return r.json();
    },
    enabled: !!petId,
  });
  const medications: Medication[] = medsData?.medications ?? [];

  const { data: vacData } = useQuery<{ vaccinations: Vaccination[] }>({
    queryKey: ['/api/vaccinations/pet', petId],
    queryFn: async () => {
      const r = await fetch(`/api/vaccinations/pet/${petId}`, { credentials: 'include' });
      if (!r.ok) throw new Error('예방접종 조회 실패');
      return r.json();
    },
    enabled: !!petId,
  });
  const vaccinations: Vaccination[] = vacData?.vaccinations ?? [];

  const { data: upcomingData } = useQuery<{ vaccinations: Vaccination[]; medications: Medication[] }>({
    queryKey: ['/api/diary/upcoming'],
  });

  const openNewLog = () => { setEditingLog(null); setDiaryForm(emptyDiaryForm()); setLogDialogOpen(true); };
  const openEditLog = (log: CareLog) => { setEditingLog(log); setDiaryForm(logToForm(log)); setLogDialogOpen(true); };

  const upsertLog = useMutation({
    mutationFn: async () => {
      if (!petId) throw new Error('반려동물을 선택해주세요');
      const payload: Record<string, unknown> = {
        petId,
        date: diaryForm.date,
      };
      if (diaryForm.weightKg) payload.weightKg = Number(diaryForm.weightKg);
      if (diaryForm.exerciseMinutes) payload.exerciseMinutes = Number(diaryForm.exerciseMinutes);
      if (diaryForm.mealAmountG) payload.mealAmountG = Number(diaryForm.mealAmountG);
      if (diaryForm.energyLevel) payload.energyLevel = Number(diaryForm.energyLevel);
      if (diaryForm.mealStatus) payload.mealStatus = diaryForm.mealStatus;
      if (diaryForm.poopStatus) payload.poopStatus = diaryForm.poopStatus;
      if (diaryForm.walkStatus) payload.walkStatus = diaryForm.walkStatus;
      if (diaryForm.mood) payload.mood = diaryForm.mood;
      if (diaryForm.note) payload.note = diaryForm.note;

      const url = editingLog ? `/api/diary/care-logs/${editingLog.id}` : '/api/diary/care-logs';
      const method = editingLog ? 'PATCH' : 'POST';
      const r = await apiRequest(method, url, payload);
      return r.json();
    },
    onSuccess: () => {
      toast({ title: editingLog ? '수정되었습니다' : '기록이 추가되었습니다' });
      qc.invalidateQueries({ queryKey: ['/api/diary/care-logs', petId] });
      setLogDialogOpen(false);
      setEditingLog(null);
      setDiaryForm(emptyDiaryForm());
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : '저장 실패';
      toast({ title: '오류', description: msg, variant: 'destructive' });
    },
  });

  const deleteLog = useMutation({
    mutationFn: async (id: number) => {
      const r = await apiRequest('DELETE', `/api/diary/care-logs/${id}`);
      return r.json();
    },
    onSuccess: () => {
      toast({ title: '삭제되었습니다' });
      qc.invalidateQueries({ queryKey: ['/api/diary/care-logs', petId] });
    },
  });

  const createMed = useMutation({
    mutationFn: async () => {
      if (!petId) throw new Error('반려동물을 선택해주세요');
      const payload = {
        petId,
        name: medForm.name,
        dosage: medForm.dosage || undefined,
        frequency: medForm.frequency || undefined,
        dueDate: medForm.dueDate,
        notes: medForm.notes || undefined,
        reminderEnabled: medForm.reminderEnabled,
      };
      const r = await apiRequest('POST', '/api/diary/medications', payload);
      return r.json();
    },
    onSuccess: () => {
      toast({ title: '약 복용 일정이 등록되었습니다' });
      qc.invalidateQueries({ queryKey: ['/api/diary/medications', petId] });
      qc.invalidateQueries({ queryKey: ['/api/diary/upcoming'] });
      setMedDialogOpen(false);
      setMedForm(emptyMedForm());
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : '저장 실패';
      toast({ title: '오류', description: msg, variant: 'destructive' });
    },
  });

  const updateMed = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const r = await apiRequest('PATCH', `/api/diary/medications/${id}`, { status });
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/diary/medications', petId] });
      qc.invalidateQueries({ queryKey: ['/api/diary/upcoming'] });
    },
  });

  const deleteMed = useMutation({
    mutationFn: async (id: number) => {
      const r = await apiRequest('DELETE', `/api/diary/medications/${id}`);
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/diary/medications', petId] });
      qc.invalidateQueries({ queryKey: ['/api/diary/upcoming'] });
    },
  });

  const toggleShare = useMutation({
    mutationFn: async (enabled: boolean) => {
      const r = await apiRequest('PATCH', `/api/diary/share/${petId}`, { enabled });
      return r.json();
    },
    onSuccess: () => {
      toast({ title: '공유 설정이 변경되었습니다' });
      qc.invalidateQueries({ queryKey: ['/api/pets'] });
    },
  });

  const trendData = useMemo(() => {
    return [...logs]
      .filter((l) => l.weightKg != null || l.exerciseMinutes != null)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((l) => ({
        date: l.date.slice(5),
        체중: l.weightKg != null ? Number(l.weightKg) : null,
        운동: l.exerciseMinutes != null ? Number(l.exerciseMinutes) : null,
      }));
  }, [logs]);

  const calendar = useMemo(() => {
    const first = new Date(calendarMonth);
    first.setDate(1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const cells: Array<{ date?: string; logs?: CareLog[] }> = [];
    for (let i = 0; i < startWeekday; i++) cells.push({});
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDate(new Date(first.getFullYear(), first.getMonth(), d));
      const dayLogs = logs.filter((l) => l.date === dateStr);
      cells.push({ date: dateStr, logs: dayLogs });
    }
    return cells;
  }, [calendarMonth, logs]);

  const handleExport = () => {
    if (!petId) return;
    window.open(`/api/diary/export?petId=${petId}`, '_blank');
  };

  const updateDiary = <K extends keyof DiaryFormState>(key: K, value: DiaryFormState[K]) =>
    setDiaryForm((prev) => ({ ...prev, [key]: value }));

  const updateMedField = <K extends keyof MedicationFormState>(key: K, value: MedicationFormState[K]) =>
    setMedForm((prev) => ({ ...prev, [key]: value }));

  if (!pets.length) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">등록된 반려동물이 없습니다.</p>
            <Button onClick={() => (window.location.href = '/my-pets')}>반려동물 등록하기</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl space-y-6" data-testid="page-health-diary">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Activity className="w-7 h-7 text-primary" />
            반려견 건강 다이어리
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            일자별 체중·식사·운동·접종을 기록하고 추세를 확인하세요.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={petId ? String(petId) : ''} onValueChange={(v) => setSelectedPetId(Number(v))}>
            <SelectTrigger className="w-44" data-testid="select-pet">
              <SelectValue placeholder="반려동물 선택" />
            </SelectTrigger>
            <SelectContent>
              {pets.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport} data-testid="button-export-csv">
            <Download className="w-4 h-4 mr-2" />CSV
          </Button>
        </div>
      </div>

      {(upcomingData?.vaccinations?.length || upcomingData?.medications?.length) ? (
        <Card className="border-warning/30 bg-warning/10 dark:bg-warning/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-5 h-5 text-warning" />
              다가오는 일정 (30일 이내)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {upcomingData?.vaccinations?.map((v) => (
              <div key={`v-${v.id}`} className="flex items-center justify-between">
                <span><Syringe className="inline w-4 h-4 mr-1" />{v.vaccineName}</span>
                <Badge variant="outline">{v.vaccineDate}</Badge>
              </div>
            ))}
            {upcomingData?.medications?.map((m) => (
              <div key={`m-${m.id}`} className="flex items-center justify-between">
                <span><Pill className="inline w-4 h-4 mr-1" />{m.name}</span>
                <Badge variant="outline">{m.dueDate}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="entries" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="entries" data-testid="tab-entries">기록</TabsTrigger>
          <TabsTrigger value="calendar" data-testid="tab-calendar">캘린더</TabsTrigger>
          <TabsTrigger value="charts" data-testid="tab-charts">추이</TabsTrigger>
          <TabsTrigger value="meds" data-testid="tab-meds">접종/약</TabsTrigger>
          <TabsTrigger value="share" data-testid="tab-share">공유</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={logDialogOpen} onOpenChange={(o) => { setLogDialogOpen(o); if (!o) { setEditingLog(null); setDiaryForm(emptyDiaryForm()); } }}>
              <DialogTrigger asChild>
                <Button onClick={openNewLog} data-testid="button-add-log">
                  <Plus className="w-4 h-4 mr-2" />새 기록
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingLog ? '기록 수정' : '새 일일 기록'}</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => { e.preventDefault(); upsertLog.mutate(); }}
                  className="space-y-3"
                >
                  <div>
                    <Label htmlFor="date">날짜</Label>
                    <Input id="date" type="date" value={diaryForm.date}
                      onChange={(e) => updateDiary('date', e.target.value)}
                      required data-testid="input-date" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label>체중 (kg)</Label>
                      <Input type="number" step="0.1" value={diaryForm.weightKg}
                        onChange={(e) => updateDiary('weightKg', e.target.value)}
                        data-testid="input-weight" />
                    </div>
                    <div>
                      <Label>운동 (분)</Label>
                      <Input type="number" value={diaryForm.exerciseMinutes}
                        onChange={(e) => updateDiary('exerciseMinutes', e.target.value)}
                        data-testid="input-exercise" />
                    </div>
                    <div>
                      <Label>식사 (g)</Label>
                      <Input type="number" value={diaryForm.mealAmountG}
                        onChange={(e) => updateDiary('mealAmountG', e.target.value)}
                        data-testid="input-meal-amount" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>식사 상태</Label>
                      <Select value={diaryForm.mealStatus} onValueChange={(v) => updateDiary('mealStatus', v)}>
                        <SelectTrigger data-testid="select-meal-status"><SelectValue placeholder="선택" /></SelectTrigger>
                        <SelectContent>{MEAL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>배변 상태</Label>
                      <Select value={diaryForm.poopStatus} onValueChange={(v) => updateDiary('poopStatus', v)}>
                        <SelectTrigger data-testid="select-poop-status"><SelectValue placeholder="선택" /></SelectTrigger>
                        <SelectContent>{POOP_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>산책 상태</Label>
                      <Select value={diaryForm.walkStatus} onValueChange={(v) => updateDiary('walkStatus', v)}>
                        <SelectTrigger data-testid="select-walk-status"><SelectValue placeholder="선택" /></SelectTrigger>
                        <SelectContent>{WALK_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>기분</Label>
                      <Select value={diaryForm.mood} onValueChange={(v) => updateDiary('mood', v)}>
                        <SelectTrigger data-testid="select-mood"><SelectValue placeholder="선택" /></SelectTrigger>
                        <SelectContent>{MOOD_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>에너지 레벨 (1-10)</Label>
                    <Input type="number" min={1} max={10} value={diaryForm.energyLevel}
                      onChange={(e) => updateDiary('energyLevel', e.target.value)}
                      data-testid="input-energy" />
                  </div>
                  <div>
                    <Label>메모</Label>
                    <Textarea rows={3} value={diaryForm.note}
                      onChange={(e) => updateDiary('note', e.target.value)}
                      data-testid="input-note" />
                  </div>
                  <Button type="submit" className="w-full" disabled={upsertLog.isPending} data-testid="button-submit-log">
                    {upsertLog.isPending ? '저장 중...' : '저장'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {logsLoading ? (
            <div className="text-center py-8 text-muted-foreground">불러오는 중...</div>
          ) : logs.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">기록이 없습니다.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <Card key={log.id} data-testid={`log-${log.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold">{log.date}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-sm">
                          {log.weightKg != null && <Badge variant="secondary">체중 {log.weightKg}kg</Badge>}
                          {log.exerciseMinutes != null && <Badge variant="secondary">운동 {log.exerciseMinutes}분</Badge>}
                          {log.mealAmountG != null && <Badge variant="secondary">식사 {log.mealAmountG}g</Badge>}
                          {log.mealStatus && <Badge variant="outline">식사: {MEAL_OPTIONS.find((o) => o.value === log.mealStatus)?.label}</Badge>}
                          {log.poopStatus && <Badge variant="outline">배변: {POOP_OPTIONS.find((o) => o.value === log.poopStatus)?.label}</Badge>}
                          {log.walkStatus && <Badge variant="outline">산책: {WALK_OPTIONS.find((o) => o.value === log.walkStatus)?.label}</Badge>}
                          {log.mood && <Badge variant="outline">기분: {MOOD_OPTIONS.find((o) => o.value === log.mood)?.label}</Badge>}
                        </div>
                        {log.note && <p className="text-sm mt-2 text-muted-foreground">{log.note}</p>}
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditLog(log)} data-testid={`button-edit-${log.id}`}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteLog.mutate(log.id)} data-testid={`button-delete-${log.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => {
                const d = new Date(calendarMonth); d.setMonth(d.getMonth() - 1); setCalendarMonth(d);
              }} data-testid="button-prev-month"><ChevronLeft className="w-4 h-4" /></Button>
              <CardTitle>{calendarMonth.getFullYear()}년 {calendarMonth.getMonth() + 1}월</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => {
                const d = new Date(calendarMonth); d.setMonth(d.getMonth() + 1); setCalendarMonth(d);
              }} data-testid="button-next-month"><ChevronRight className="w-4 h-4" /></Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2">
                {['일','월','화','수','목','금','토'].map((d) => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendar.map((c, i) => (
                  <div key={i} className={`min-h-[64px] border rounded p-1 text-xs ${c.date ? 'bg-card' : 'bg-transparent border-transparent'}`}>
                    {c.date && (
                      <>
                        <div className="font-medium">{Number(c.date.slice(8))}</div>
                        {c.logs && c.logs.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {c.logs.slice(0, 2).map((l) => (
                              <div key={l.id} className="truncate text-[10px] bg-primary/10 rounded px-1">
                                {l.weightKg ? `${l.weightKg}kg` : ''}{l.exerciseMinutes ? ` ${l.exerciseMinutes}분` : ''}
                              </div>
                            ))}
                            {c.logs.length > 2 && <div className="text-[10px] text-muted-foreground">+{c.logs.length - 2}</div>}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Weight className="w-5 h-5" />체중 추이</CardTitle></CardHeader>
            <CardContent>
              {trendData.filter((d) => d.체중 != null).length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">체중 기록이 없습니다.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis unit="kg" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="체중" stroke="hsl(var(--primary))" strokeWidth={2} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" />운동량 추이 (분)</CardTitle></CardHeader>
            <CardContent>
              {trendData.filter((d) => d.운동 != null).length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">운동 기록이 없습니다.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis unit="분" />
                    <Tooltip />
                    <Bar dataKey="운동" fill="hsl(var(--success))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meds" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Syringe className="w-5 h-5" />예방접종</CardTitle>
              <Button variant="outline" size="sm" onClick={() => (window.location.href = '/pet-care/vaccination-schedule')}>
                관리
              </Button>
            </CardHeader>
            <CardContent>
              {vaccinations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">등록된 예방접종이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {vaccinations.map((v) => (
                    <div key={v.id} className="flex justify-between items-center text-sm border-b pb-2">
                      <div>
                        <div className="font-medium">{v.vaccineName}</div>
                        <div className="text-muted-foreground">{v.vaccineDate} {v.hospitalName && `· ${v.hospitalName}`}</div>
                      </div>
                      <Badge variant={v.status === 'completed' ? 'default' : v.status === 'overdue' ? 'destructive' : 'secondary'}>
                        {v.status === 'completed' ? '완료' : v.status === 'overdue' ? '지연' : '예정'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Pill className="w-5 h-5" />약 복용 일정</CardTitle>
              <Dialog open={medDialogOpen} onOpenChange={(o) => { setMedDialogOpen(o); if (!o) setMedForm(emptyMedForm()); }}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-add-med"><Plus className="w-4 h-4 mr-1" />추가</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>약 복용 일정 추가</DialogTitle></DialogHeader>
                  <form
                    onSubmit={(e) => { e.preventDefault(); createMed.mutate(); }}
                    className="space-y-3"
                  >
                    <div>
                      <Label>약 이름</Label>
                      <Input value={medForm.name} onChange={(e) => updateMedField('name', e.target.value)}
                        required data-testid="input-med-name" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>용량</Label>
                        <Input value={medForm.dosage} onChange={(e) => updateMedField('dosage', e.target.value)}
                          placeholder="1정" data-testid="input-med-dosage" />
                      </div>
                      <div>
                        <Label>주기</Label>
                        <Input value={medForm.frequency} onChange={(e) => updateMedField('frequency', e.target.value)}
                          placeholder="하루 2회" data-testid="input-med-frequency" />
                      </div>
                    </div>
                    <div>
                      <Label>예정일</Label>
                      <Input type="date" value={medForm.dueDate}
                        onChange={(e) => updateMedField('dueDate', e.target.value)}
                        required data-testid="input-med-date" />
                    </div>
                    <div>
                      <Label>메모</Label>
                      <Textarea rows={2} value={medForm.notes}
                        onChange={(e) => updateMedField('notes', e.target.value)}
                        data-testid="input-med-notes" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="rm"
                        checked={medForm.reminderEnabled}
                        onCheckedChange={(v) => updateMedField('reminderEnabled', v)}
                      />
                      <Label htmlFor="rm">알림 받기</Label>
                    </div>
                    <Button type="submit" className="w-full" disabled={createMed.isPending} data-testid="button-submit-med">
                      {createMed.isPending ? '저장 중...' : '저장'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {medications.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">등록된 약 일정이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {medications.map((m) => (
                    <div key={m.id} className="flex justify-between items-center text-sm border-b pb-2" data-testid={`med-${m.id}`}>
                      <div>
                        <div className="font-medium">{m.name} {m.dosage && <span className="text-muted-foreground">· {m.dosage}</span>}</div>
                        <div className="text-muted-foreground">{m.dueDate} {m.frequency && `· ${m.frequency}`}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={m.status === 'completed' ? 'default' : 'secondary'}>
                          {m.status === 'completed' ? '완료' : '예정'}
                        </Badge>
                        {m.status !== 'completed' && (
                          <Button size="sm" variant="outline" onClick={() => updateMed.mutate({ id: m.id, status: 'completed' })}>
                            완료
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => deleteMed.mutate(m.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="share">
          <Card>
            <CardHeader>
              <CardTitle>트레이너 공유 설정</CardTitle>
              <CardDescription>
                담당 트레이너에게 다이어리 열람 권한을 부여할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pet?.assignedTrainerId ? (
                <div className="flex items-center justify-between border rounded-lg p-4">
                  <div>
                    <div className="font-medium">담당 트레이너: {pet.assignedTrainerName ?? `#${pet.assignedTrainerId}`}</div>
                    <div className="text-sm text-muted-foreground">
                      {pet.diaryShareWithTrainer ? '현재 다이어리를 열람할 수 있습니다.' : '현재 비공개 상태입니다.'}
                    </div>
                  </div>
                  <Switch
                    checked={!!pet.diaryShareWithTrainer}
                    onCheckedChange={(v) => toggleShare.mutate(v)}
                    data-testid="switch-share-trainer"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded-lg p-4">
                  <AlertTriangle className="w-4 h-4" />
                  배정된 트레이너가 없습니다. 훈련 매칭 후 공유 설정이 가능합니다.
                </div>
              )}
              <Separator />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>· 공유를 켜면 담당 트레이너가 모든 일일 기록·접종·약 일정을 열람할 수 있습니다.</p>
                <p>· 공유를 끄면 즉시 트레이너의 열람 권한이 회수됩니다.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
