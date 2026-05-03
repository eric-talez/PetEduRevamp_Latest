import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { QrCode, Plus, Search, Clock, CheckCircle, XCircle, PawPrint, User, Shield, Printer, AlertTriangle, Syringe, MapPin } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface Member {
  id: number;
  name: string | null;
  email: string | null;
}

interface Pet {
  id: number;
  name: string | null;
  breed: string | null;
  species: string | null;
  temperamentLevel: string | null;
  trainingStatus: string | null;
  profileImage: string | null;
}

interface VaccineInfo {
  valid: boolean;
  vaccines: Array<{ name: string; status: string; date: string | null; nextDue: string | null }>;
}

interface VisitSession {
  id: number;
  token: string;
  instituteId: number;
  memberId: number;
  petIds: number[];
  vaccineStatus: Record<number, VaccineInfo>;
  temperamentLevels: Record<number, string | null>;
  zonePermissions: Record<number, string[]>;
  todayConcern: string | null;
  todayGoal: string | null;
  singleUse: boolean;
  usedAt: string | null;
  expiresAt: string;
  createdAt: string;
  memberName?: string;
  petNames?: string[];
  status?: string;
}

interface GenerateResponse {
  success: boolean;
  session?: VisitSession;
  error?: string;
}

const TEMPERAMENT_COLORS: Record<string, string> = {
  A: "bg-success/10 text-success",
  B: "bg-primary/10 text-primary",
  C: "bg-warning/10 text-warning",
  D: "bg-destructive/10 text-destructive",
  E: "bg-primary/10 text-primary",
};

const TEMPERAMENT_LABELS: Record<string, string> = {
  A: "사회성 양호", B: "흥분 조절", C: "짖음/경계", D: "공격성 주의", E: "분리불안",
};

function useCountdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  return now;
}

function formatRemaining(expiresAt: string, currentTime: number): string {
  const diff = new Date(expiresAt).getTime() - currentTime;
  if (diff <= 0) return "만료됨";
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${mins}분 ${secs}초`;
}

export default function VisitSessionManager() {
  const { toast } = useToast();
  const now = useCountdown();
  const [showCreate, setShowCreate] = useState(false);
  const [showQr, setShowQr] = useState<VisitSession | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedPetIds, setSelectedPetIds] = useState<number[]>([]);
  const [todayConcern, setTodayConcern] = useState("");
  const [todayGoal, setTodayGoal] = useState("");
  const [previewData, setPreviewData] = useState<GenerateResponse | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const { data: sessionsData, isLoading } = useQuery<{ success: boolean; sessions: VisitSession[] }>({
    queryKey: ["/api/visit-sessions"],
  });

  const { data: membersData } = useQuery<{ success: boolean; members: Member[] }>({
    queryKey: ["/api/institute/members", searchTerm],
    queryFn: async () => {
      const res = await fetch(`/api/institute/members?search=${encodeURIComponent(searchTerm)}`);
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    enabled: showCreate,
  });

  const { data: petsData } = useQuery<{ success: boolean; pets: Pet[] }>({
    queryKey: ["/api/institute/members", selectedMember?.id, "pets"],
    queryFn: async () => {
      const res = await fetch(`/api/institute/members/${selectedMember!.id}/pets`);
      if (!res.ok) throw new Error("Failed to fetch pets");
      return res.json();
    },
    enabled: !!selectedMember,
  });

  const generateMutation = useMutation<GenerateResponse, Error, { memberId: number; petIds: number[]; todayConcern: string | null; todayGoal: string | null }>({
    mutationFn: async (data) => {
      const res = await apiRequest("POST", "/api/visit-sessions/generate", data);
      return res.json();
    },
    onSuccess: (json) => {
      queryClient.invalidateQueries({ queryKey: ["/api/visit-sessions"] });
      if (json.success && json.session) {
        setShowCreate(false);
        setShowQr(json.session);
        setPreviewData(json);
        resetCreateForm();
      }
      toast({ title: "방문 세션 QR 발급 완료", description: "10분 내 스캔하여 체크인해 주세요." });
    },
    onError: () => toast({ title: "오류", description: "QR 발급에 실패했습니다.", variant: "destructive" }),
  });

  function resetCreateForm() {
    setSelectedMember(null);
    setSelectedPetIds([]);
    setTodayConcern("");
    setTodayGoal("");
    setSearchTerm("");
  }

  function handleGenerate() {
    if (!selectedMember) {
      toast({ title: "보호자 선택 필요", variant: "destructive" });
      return;
    }
    if (selectedPetIds.length === 0) {
      toast({ title: "반려동물을 1마리 이상 선택해 주세요", variant: "destructive" });
      return;
    }
    generateMutation.mutate({
      memberId: selectedMember.id,
      petIds: selectedPetIds,
      todayConcern: todayConcern || null,
      todayGoal: todayGoal || null,
    });
  }

  function togglePet(petId: number) {
    setSelectedPetIds(prev =>
      prev.includes(petId) ? prev.filter(id => id !== petId) : [...prev, petId]
    );
  }

  function getStatusBadge(session: VisitSession) {
    if (session.usedAt) return <Badge className="bg-gray-100 text-gray-600 gap-1"><CheckCircle className="w-3 h-3" /> 사용됨</Badge>;
    if (new Date(session.expiresAt).getTime() < now) return <Badge className="bg-destructive/10 text-destructive gap-1"><XCircle className="w-3 h-3" /> 만료</Badge>;
    return <Badge className="bg-success/10 text-success gap-1"><Clock className="w-3 h-3" /> 유효</Badge>;
  }

  function isActive(session: VisitSession): boolean {
    return !session.usedAt && new Date(session.expiresAt).getTime() > now;
  }

  function handlePrintQr() {
    if (!qrRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;
    printWindow.document.write(`
      <html><head><title>방문 QR</title>
      <style>body{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;font-family:sans-serif;flex-direction:column}
      .info{text-align:center;margin-top:20px;font-size:14px;color:hsl(var(--muted-foreground))}h2{margin-bottom:5px}</style></head>
      <body><h2>반려견 방문 신뢰 QR</h2>${svg.outerHTML}
      <div class="info"><p>10분 내 스캔하여 체크인</p><p>1회용 · 자동 만료</p></div>
      <script>window.print();window.close();</script></body></html>
    `);
    printWindow.document.close();
  }

  const sessions = sessionsData?.sessions || [];
  const members = membersData?.members || [];
  const petsList = petsData?.pets || [];
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            방문 신뢰 QR 발급
          </h1>
          <p className="text-muted-foreground mt-1">
            1회용 방문 세션 QR을 발급하여 반려동물의 접종·성향 기반 신뢰 인증을 수행합니다.
          </p>
        </div>
        <Button onClick={() => { resetCreateForm(); setShowCreate(true); }} className="gap-2">
          <Plus className="w-4 h-4" />
          새 QR 발급
        </Button>
      </div>

      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-primary">Pet Visit Trust QR 특허 기술</p>
              <p className="text-muted-foreground mt-1">
                · 1회용 세션 토큰: 스캔 즉시 폐기, 공유 불가<br />
                · 10분 유효기간: 자동 만료로 보안 강화<br />
                · 반려동물 중심 신뢰: 접종 상태 + 성향 등급 자동 반영<br />
                · 존 기반 권한: 구역별 입장 가능 여부 자동 판정
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse"><CardContent className="h-20" /></Card>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <QrCode className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">발급된 방문 세션이 없습니다</p>
            <p className="mt-1">새 QR 발급 버튼으로 방문 세션을 시작하세요.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => (
            <Card key={session.id} className={isActive(session) ? 'border-success/30' : ''}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{session.memberName || '보호자'}</span>
                        {getStatusBadge(session)}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <PawPrint className="w-3 h-3" />
                        {session.petNames?.join(', ') || '반려동물'}
                        <span className="mx-1">·</span>
                        <Clock className="w-3 h-3" />
                        {new Date(session.createdAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isActive(session) && (
                      <>
                        <Badge variant="outline" className="text-xs font-mono">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatRemaining(session.expiresAt, now)}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => setShowQr(session)} className="gap-1">
                          <QrCode className="w-4 h-4" />
                          QR 보기
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              방문 세션 QR 발급
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <Label className="text-base font-medium">1. 보호자 검색</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="이름 또는 전화번호로 검색"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              {!selectedMember && members.length > 0 && (
                <div className="border rounded-md mt-2 max-h-40 overflow-y-auto">
                  {members.map(m => (
                    <button
                      key={m.id}
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center justify-between"
                      onClick={() => { setSelectedMember(m); setSelectedPetIds([]); }}
                    >
                      <span className="font-medium">{m.name || '미입력'}</span>
                      <span className="text-sm text-muted-foreground">{m.email || ''}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedMember && (
                <div className="mt-2 p-3 bg-primary/5 rounded-md flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <span className="font-medium">{selectedMember.name}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedMember(null); setSelectedPetIds([]); }}>
                    변경
                  </Button>
                </div>
              )}
            </div>

            {selectedMember && (
              <div>
                <Label className="text-base font-medium">2. 반려동물 선택</Label>
                {petsList.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">등록된 반려동물이 없습니다.</p>
                ) : (
                  <div className="grid gap-2 mt-2">
                    {petsList.map(pet => (
                      <label
                        key={pet.id}
                        className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors
                          ${selectedPetIds.includes(pet.id) ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                      >
                        <Checkbox
                          checked={selectedPetIds.includes(pet.id)}
                          onCheckedChange={() => togglePet(pet.id)}
                        />
                        <PawPrint className="w-4 h-4 text-primary" />
                        <div className="flex-1">
                          <span className="font-medium">{pet.name || '이름 미등록'}</span>
                          <span className="text-sm text-muted-foreground ml-2">{pet.breed || ''}</span>
                        </div>
                        {pet.temperamentLevel && (
                          <Badge className={`text-xs ${TEMPERAMENT_COLORS[pet.temperamentLevel] || ''}`}>
                            {pet.temperamentLevel} ({TEMPERAMENT_LABELS[pet.temperamentLevel] || ''})
                          </Badge>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedPetIds.length > 0 && (
              <div className="space-y-3">
                <Label className="text-base font-medium">3. 오늘의 정보 (선택)</Label>
                <div>
                  <Label>오늘의 고민</Label>
                  <Textarea value={todayConcern} onChange={e => setTodayConcern(e.target.value)} placeholder="보호자가 전달한 고민 사항" rows={2} />
                </div>
                <div>
                  <Label>오늘의 목표</Label>
                  <Textarea value={todayGoal} onChange={e => setTodayGoal(e.target.value)} placeholder="오늘 훈련/방문 목표" rows={2} />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>취소</Button>
              <Button
                onClick={handleGenerate}
                disabled={!selectedMember || selectedPetIds.length === 0 || generateMutation.isPending}
                className="gap-2"
              >
                <QrCode className="w-4 h-4" />
                {generateMutation.isPending ? "발급 중..." : "QR 발급"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showQr} onOpenChange={() => { setShowQr(null); setPreviewData(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">방문 신뢰 QR</DialogTitle>
          </DialogHeader>
          {showQr && (
            <div className="space-y-4">
              <div ref={qrRef} className="flex justify-center p-4 bg-white rounded-lg">
                <QRCodeSVG
                  value={`${baseUrl}/visit/${showQr.token}`}
                  size={220}
                  level="H"
                  includeMargin
                />
              </div>
              <div className="text-center space-y-2 text-sm">
                <Badge className="bg-success/10 text-success font-mono">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatRemaining(showQr.expiresAt, now)}
                </Badge>
                <p className="text-muted-foreground">1회 스캔 후 자동 폐기 · 10분 유효</p>
              </div>

              {showQr.vaccineStatus && Object.keys(showQr.vaccineStatus).length > 0 && (
                <div className="border rounded-lg p-3 space-y-2">
                  <p className="font-medium text-sm flex items-center gap-1">
                    <Syringe className="w-4 h-4" /> 접종·성향 사전 검증 결과
                  </p>
                  {showQr.petNames?.map((name, idx) => {
                    const petId = showQr.petIds[idx];
                    const vaccine = showQr.vaccineStatus[petId];
                    const temperament = showQr.temperamentLevels[petId];
                    const zones = showQr.zonePermissions[petId] || [];
                    return (
                      <div key={petId} className="text-sm pl-2 border-l-2 border-primary/30 ml-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <PawPrint className="w-3 h-3" />
                          <span className="font-medium">{name}</span>
                          {temperament && (
                            <Badge className={`text-xs ${TEMPERAMENT_COLORS[temperament] || ''}`}>
                              {temperament}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Syringe className="w-3 h-3" />
                          {vaccine?.valid ? (
                            <span className="text-success">접종 완료</span>
                          ) : (
                            <span className="text-destructive">미접종/만료</span>
                          )}
                        </div>
                        {zones.length > 0 && (
                          <div className="flex items-center gap-1 text-xs flex-wrap">
                            <MapPin className="w-3 h-3" />
                            {zones.map(z => (
                              <Badge key={z} variant="outline" className="text-xs py-0">{z}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrintQr} className="gap-1">
                  <Printer className="w-4 h-4" />
                  인쇄
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
