import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PawPrint, Calendar, AlertTriangle, Target, Clock, Package, TrendingUp, Shield, Syringe, MapPin } from "lucide-react";
import { useLocation } from "wouter";
import type { CheckinRecord } from "@shared/schema";

interface OwnerInfo {
  name: string | null;
  phone: string | null;
}

interface PetSummary {
  id: number;
  name: string | null;
  breed: string | null;
  temperamentLevel: string | null;
}

interface VisitSessionSummary {
  id: number;
  memberId: number;
  vaccineStatus: Record<number, { valid: boolean }>;
  temperamentLevels: Record<number, string | null>;
  zonePermissions: Record<number, string[]>;
  usedAt: string | null;
  expiresAt: string;
  createdAt: string;
  todayConcern: string | null;
  petNames: string[];
}

interface HistoryResponse {
  success: boolean;
  owner: OwnerInfo | null;
  pets: PetSummary[];
  history: CheckinRecord[];
  totalVisits: number;
  concerns: Array<{ date: string; concern: string }>;
}

const CONCERN_CATEGORIES: Record<string, { label: string; color: string }> = {
  '짖음': { label: '짖음', color: 'hsl(var(--primary))' },
  '공격': { label: '공격성', color: 'hsl(var(--destructive))' },
  '불안': { label: '불안', color: 'hsl(var(--secondary))' },
  '흥분': { label: '흥분', color: 'hsl(var(--warning))' },
  '사회': { label: '사회성', color: 'hsl(var(--success))' },
  '배변': { label: '배변', color: 'hsl(var(--muted-foreground))' },
  '기타': { label: '기타', color: 'hsl(var(--primary))' },
};

function categorizeConcern(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('짖') || lower.includes('경계')) return '짖음';
  if (lower.includes('공격') || lower.includes('물')) return '공격';
  if (lower.includes('불안') || lower.includes('분리')) return '불안';
  if (lower.includes('흥분') || lower.includes('과잉')) return '흥분';
  if (lower.includes('사회') || lower.includes('산책') || lower.includes('다른 개')) return '사회';
  if (lower.includes('배변') || lower.includes('대소변')) return '배변';
  return '기타';
}

function ConcernTrendChart({ history }: { history: CheckinRecord[] }) {
  const recordsWithConcern = history
    .filter((r) => r.todayConcern)
    .sort((a, b) => new Date(a.checkinAt!).getTime() - new Date(b.checkinAt!).getTime());

  if (recordsWithConcern.length < 2) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        고민 추이를 표시하려면 2건 이상의 고민 기록이 필요합니다
      </div>
    );
  }

  const categoryCounts: Record<string, number> = {};
  for (const r of recordsWithConcern) {
    const cat = categorizeConcern(r.todayConcern!);
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  const sortedCategories = Object.entries(categoryCounts).sort(([, a], [, b]) => b - a);
  const maxCount = Math.max(...sortedCategories.map(([, c]) => c));

  const monthlyTrend: Record<string, Record<string, number>> = {};
  for (const r of recordsWithConcern) {
    const month = new Date(r.checkinAt!).toLocaleDateString("ko-KR", { year: "2-digit", month: "short" });
    const cat = categorizeConcern(r.todayConcern!);
    if (!monthlyTrend[month]) monthlyTrend[month] = {};
    monthlyTrend[month][cat] = (monthlyTrend[month][cat] || 0) + 1;
  }

  const months = Object.keys(monthlyTrend);

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-gray-600 mb-3">고민 유형별 빈도</h4>
        <div className="space-y-2">
          {sortedCategories.map(([cat, count]) => {
            const info = CONCERN_CATEGORIES[cat] || CONCERN_CATEGORIES['기타'];
            const widthPercent = Math.max((count / maxCount) * 100, 8);
            return (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-sm w-16 text-gray-600">{info.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full rounded-full flex items-center px-2 transition-all duration-500"
                    style={{ width: `${widthPercent}%`, backgroundColor: info.color }}
                  >
                    <span className="text-xs text-white font-medium">{count}건</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {months.length > 1 && (
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-3">월별 고민 추이</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 text-gray-500">월</th>
                  {sortedCategories.map(([cat]) => (
                    <th key={cat} className="text-center py-2 px-2 text-gray-500">
                      {CONCERN_CATEGORIES[cat]?.label || cat}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {months.map((month) => (
                  <tr key={month} className="border-b border-gray-50">
                    <td className="py-2 pr-4 text-gray-600 font-medium">{month}</td>
                    {sortedCategories.map(([cat]) => {
                      const val = monthlyTrend[month]?.[cat] || 0;
                      return (
                        <td key={cat} className="text-center py-2 px-2">
                          {val > 0 ? (
                            <span
                              className="inline-block w-6 h-6 rounded-full text-white text-xs leading-6"
                              style={{ backgroundColor: CONCERN_CATEGORIES[cat]?.color || 'hsl(var(--primary))' }}
                            >
                              {val}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerHistory() {
  const { ownerId } = useParams<{ ownerId: string }>();
  const [, navigate] = useLocation();

  const { data, isLoading } = useQuery<HistoryResponse>({
    queryKey: ["/api/institute/checkins/history", ownerId],
    queryFn: async () => {
      const res = await fetch(`/api/institute/checkins/history/${ownerId}`);
      if (!res.ok) throw new Error("히스토리 조회 실패");
      return res.json();
    },
    enabled: !!ownerId,
  });

  const { data: sessionsData } = useQuery<{ success: boolean; sessions: VisitSessionSummary[] }>({
    queryKey: ["/api/visit-sessions"],
  });

  const ownerSessions = (sessionsData?.sessions || []).filter(
    s => String(s.memberId) === ownerId
  ).slice(0, 10);

  const temperamentBadge = (level: string | null) => {
    const map: Record<string, { label: string; color: string }> = {
      A: { label: "A 사회성 양호", color: "bg-success/10 text-success" },
      B: { label: "B 흥분 조절", color: "bg-warning/10 text-warning" },
      C: { label: "C 짖음/경계", color: "bg-primary/10 text-primary" },
      D: { label: "D 공격성", color: "bg-destructive/10 text-destructive" },
      E: { label: "E 분리불안", color: "bg-primary/10 text-primary" },
    };
    if (!level || !map[level]) return null;
    const info = map[level];
    return <span className={`text-xs px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</span>;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px] text-gray-500">로딩 중...</div>;
  }

  const owner = data?.owner;
  const pets = data?.pets ?? [];
  const history = data?.history ?? [];
  const totalVisits = data?.totalVisits ?? 0;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/institute/checkin-dashboard")}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          돌아가기
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{owner?.name || '고객'}</h1>
              {owner?.phone && <p className="text-gray-500 text-sm mt-1">{owner.phone}</p>}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">총 방문 횟수</p>
              <p className="text-3xl font-bold text-primary">{totalVisits}</p>
            </div>
          </div>

          {pets.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium text-gray-600 mb-2">보유 반려동물</p>
              <div className="flex flex-wrap gap-2">
                {pets.map((pet) => (
                  <div key={pet.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <PawPrint className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{pet.name}</span>
                    {pet.breed && <span className="text-xs text-gray-400">({pet.breed})</span>}
                    {temperamentBadge(pet.temperamentLevel)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {ownerSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5" />
              방문 신뢰 QR 인증 이력
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ownerSessions.map((session) => {
                const isUsed = !!session.usedAt;
                const isExpired = new Date(session.expiresAt) < new Date();
                return (
                  <div key={session.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {new Date(session.createdAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                        <span className="text-gray-400">
                          {new Date(session.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <Badge variant={isUsed ? "default" : isExpired ? "secondary" : "outline"} className="text-xs">
                        {isUsed ? "체크인 완료" : isExpired ? "만료" : "대기 중"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <PawPrint className="w-3 h-3 text-primary" />
                      <span>{session.petNames?.join(', ') || '반려동물'}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs">
                      {Object.entries(session.temperamentLevels || {}).map(([petId, level]) => {
                        if (!level) return null;
                        const info = temperamentBadge(level as string);
                        return info ? <span key={petId}>{info}</span> : null;
                      })}
                      {Object.values(session.vaccineStatus || {}).some(v => v?.valid) && (
                        <span className="text-success flex items-center gap-0.5">
                          <Syringe className="w-3 h-3" /> 접종완료
                        </span>
                      )}
                      {Object.values(session.zonePermissions || {}).flat().length > 0 && (
                        <span className="text-primary flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" /> {Object.values(session.zonePermissions || {}).flat().length}개 구역 허용
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            고민 변화 추이
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ConcernTrendChart history={history} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            방문 기록 ({history.length}건)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-400">방문 기록이 없습니다</div>
          ) : (
            <div className="space-y-4">
              {history.map((record, idx: number) => (
                <div key={record.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium">
                        {new Date(record.checkinAt!).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(record.checkinAt!).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <Badge variant="outline" className="text-xs">#{history.length - idx}회</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      {record.hasPackage && (
                        <Badge variant="outline" className="text-xs border-success/40 text-success">
                          <Package className="w-3 h-3 mr-1" />
                          정기권
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {record.petName && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <PawPrint className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>{record.petName}</span>
                      </div>
                    )}
                    {record.todayConcern && (
                      <div className="flex items-start gap-2 text-gray-600">
                        <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                        <span>{record.todayConcern}</span>
                      </div>
                    )}
                    {record.recentProblemBehavior && (
                      <div className="flex items-start gap-2 text-gray-600">
                        <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                        <span>{record.recentProblemBehavior}</span>
                      </div>
                    )}
                    {record.todayGoal && (
                      <div className="flex items-start gap-2 text-gray-600">
                        <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{record.todayGoal}</span>
                      </div>
                    )}
                    {record.packageNote && (
                      <div className="text-xs text-gray-400 mt-1">패키지 메모: {record.packageNote}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
