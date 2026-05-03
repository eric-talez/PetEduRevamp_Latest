import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Calendar, TrendingUp, UserCheck, PawPrint, AlertTriangle, Clock, ChevronRight, Shield, Syringe, Fingerprint } from "lucide-react";
import { useLocation } from "wouter";
import type { CheckinRecord } from "@shared/schema";

interface PetInfo {
  name: string | null;
  breed: string | null;
  species: string | null;
  temperamentLevel: string | null;
}

interface OwnerInfo {
  name: string | null;
  phone: string | null;
}

interface EnrichedCheckin extends CheckinRecord {
  petInfo: PetInfo | null;
  ownerInfo: OwnerInfo | null;
}

interface CheckinListResponse {
  success: boolean;
  checkins: EnrichedCheckin[];
}

interface StatsResponse {
  success: boolean;
  stats: {
    todayCount: number;
    weekCount: number;
    monthCount: number;
    uniqueVisitors: number;
  };
}

interface VisitSession {
  id: number;
  token: string;
  memberId: number;
  memberName: string | null;
  petIds: number[];
  petNames: string[];
  vaccineStatus: Record<number, { valid: boolean }>;
  temperamentLevels: Record<number, string | null>;
  zonePermissions: Record<number, string[]>;
  noseVerified: boolean;
  usedAt: string | null;
  expiresAt: string;
  createdAt: string;
  todayConcern: string | null;
  todayGoal: string | null;
}

interface VisitSessionListResponse {
  success: boolean;
  sessions: VisitSession[];
}

interface NoseVerificationLog {
  id: number;
  visitSessionId: number | null;
  petId: number;
  similarityScore: number | null;
  matched: boolean | null;
  failReason: string | null;
  manualApproval: boolean | null;
  verifiedAt: string;
  petName: string | null;
}

interface NoseLogResponse {
  success: boolean;
  logs: NoseVerificationLog[];
  stats: {
    total: number;
    success: number;
    fail: number;
    manualApproval: number;
    successRate: number;
  };
}

const TEMPERAMENT_MAP: Record<string, { label: string; color: string }> = {
  A: { label: "A 사회성 양호", color: "bg-success/10 text-success" },
  B: { label: "B 흥분 조절", color: "bg-warning/10 text-warning" },
  C: { label: "C 짖음/경계", color: "bg-primary/10 text-primary" },
  D: { label: "D 공격성", color: "bg-destructive/10 text-destructive" },
  E: { label: "E 분리불안", color: "bg-primary/10 text-primary" },
};

export default function CheckinDashboard() {
  const [, navigate] = useLocation();
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);

  const { data: statsData, isLoading: statsLoading } = useQuery<StatsResponse>({
    queryKey: ["/api/institute/checkins/stats"],
  });

  const { data: checkinsData, isLoading: checkinsLoading } = useQuery<CheckinListResponse>({
    queryKey: ["/api/institute/checkins", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/institute/checkins?date=${selectedDate}`);
      if (!res.ok) throw new Error("체크인 조회 실패");
      return res.json();
    },
  });

  const { data: sessionsData } = useQuery<VisitSessionListResponse>({
    queryKey: ["/api/visit-sessions"],
  });

  const { data: noseLogData } = useQuery<NoseLogResponse>({
    queryKey: ["/api/nose-verification/logs"],
  });

  const stats = statsData?.stats ?? { todayCount: 0, weekCount: 0, monthCount: 0, uniqueVisitors: 0 };
  const checkins = checkinsData?.checkins ?? [];
  const recentSessions = sessionsData?.sessions?.slice(0, 5) ?? [];
  const noseStats = noseLogData?.stats;
  const noseLogs = noseLogData?.logs ?? [];
  const [showAllNoseLogs, setShowAllNoseLogs] = useState(false);
  const displayedNoseLogs = showAllNoseLogs ? noseLogs : noseLogs.slice(0, 10);

  const temperamentBadge = (level: string | null) => {
    if (!level || !TEMPERAMENT_MAP[level]) return null;
    const info = TEMPERAMENT_MAP[level];
    return <span className={`text-xs px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</span>;
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">체크인 대시보드</h1>
          <p className="text-sm text-gray-500">방문 고객 현황을 실시간으로 확인합니다</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/institute/visit-sessions")}>
            방문 신뢰 QR
          </Button>
          <Button variant="outline" onClick={() => navigate("/institute/qr-codes")}>
            QR 코드 관리
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-gray-500">오늘</p>
              <p className="text-2xl font-bold">{stats.todayCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-gray-500">주간</p>
              <p className="text-2xl font-bold">{stats.weekCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-gray-500">월간</p>
              <p className="text-2xl font-bold">{stats.monthCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-warning/10 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-gray-500">누적 방문자</p>
              <p className="text-2xl font-bold">{stats.uniqueVisitors}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {noseStats && noseStats.total > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-primary" />
              코 인증 통계
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{noseStats.total}</p>
                <p className="text-xs text-gray-500">전체 인증</p>
              </div>
              <div className="bg-success/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-success">{noseStats.success}</p>
                <p className="text-xs text-gray-500">성공</p>
              </div>
              <div className="bg-destructive/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-destructive">{noseStats.fail}</p>
                <p className="text-xs text-gray-500">실패</p>
              </div>
              <div className="bg-primary/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-primary">{noseStats.successRate}%</p>
                <p className="text-xs text-gray-500">성공률</p>
              </div>
            </div>

            {noseLogs.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">인증 이력 ({noseLogs.length}건)</p>
                {displayedNoseLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between border rounded-lg p-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Fingerprint className={`w-4 h-4 ${log.matched ? 'text-success' : 'text-destructive'}`} />
                      <span>{log.petName || '반려동물'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {log.manualApproval && (
                        <Badge variant="outline" className="text-xs">수동</Badge>
                      )}
                      <Badge className={`text-xs ${log.matched ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                        {log.matched ? `일치 ${log.similarityScore}%` : `불일치 ${log.similarityScore}%`}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {new Date(log.verifiedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}
                {noseLogs.length > 10 && !showAllNoseLogs && (
                  <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowAllNoseLogs(true)}>
                    전체 보기 ({noseLogs.length}건)
                  </Button>
                )}
                {showAllNoseLogs && noseLogs.length > 10 && (
                  <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowAllNoseLogs(false)}>
                    접기
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {recentSessions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                최근 방문 신뢰 QR 인증
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/institute/visit-sessions")}>
                전체보기 <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentSessions.map((session) => {
                const isUsed = !!session.usedAt;
                const isExpired = new Date(session.expiresAt) < new Date();
                return (
                  <div key={session.id} className="border rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isUsed ? 'bg-success/10' : isExpired ? 'bg-gray-100' : 'bg-primary/10'}`}>
                        <Shield className={`w-4 h-4 ${isUsed ? 'text-success' : isExpired ? 'text-gray-400' : 'text-primary'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{session.memberName || '보호자'}</span>
                          <span className="text-xs text-gray-400">
                            {session.petNames?.join(', ') || '반려동물'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {Object.entries(session.temperamentLevels || {}).map(([petId, level]) => (
                            level && <span key={petId}>{temperamentBadge(level as string)}</span>
                          ))}
                          {Object.values(session.vaccineStatus || {}).some(v => v?.valid) && (
                            <span className="text-xs text-success flex items-center gap-0.5">
                              <Syringe className="w-3 h-3" /> 접종완료
                            </span>
                          )}
                          {session.noseVerified && (
                            <span className="text-xs text-primary flex items-center gap-0.5">
                              <Fingerprint className="w-3 h-3" /> 코인증
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      {session.noseVerified ? (
                        <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                          <Fingerprint className="w-3 h-3 mr-0.5" />
                          코인증
                        </Badge>
                      ) : isUsed ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-6 px-2"
                          onClick={(e) => { e.stopPropagation(); navigate(`/institute/nose-verify/${session.token}`); }}
                        >
                          <Fingerprint className="w-3 h-3 mr-1" />
                          코인증
                        </Button>
                      ) : null}
                      <div>
                        <Badge variant={isUsed ? "default" : isExpired ? "secondary" : "outline"} className="text-xs">
                          {isUsed ? "체크인 완료" : isExpired ? "만료됨" : "대기 중"}
                        </Badge>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(session.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">방문 기록</CardTitle>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </div>
        </CardHeader>
        <CardContent>
          {checkinsLoading || statsLoading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : checkins.length === 0 ? (
            <div className="text-center py-12">
              <PawPrint className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">이 날짜의 체크인 기록이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {checkins.map((checkin) => (
                <div
                  key={checkin.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => {
                    if (checkin.ownerId) navigate(`/institute/customer-history/${checkin.ownerId}`);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <PawPrint className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{checkin.ownerInfo?.name || checkin.ownerName || '비회원'}</span>
                          {checkin.isNewVisitor && (
                            <Badge variant="outline" className="text-xs border-primary/40 text-primary">신규</Badge>
                          )}
                          {checkin.hasPackage && (
                            <Badge variant="outline" className="text-xs border-success/40 text-success">정기권</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {checkin.petInfo ? (
                            <span className="text-sm text-gray-500">
                              {checkin.petInfo.name} ({checkin.petInfo.breed || '반려동물'})
                            </span>
                          ) : checkin.petName ? (
                            <span className="text-sm text-gray-500">{checkin.petName}</span>
                          ) : null}
                          {checkin.petInfo?.temperamentLevel && temperamentBadge(checkin.petInfo.temperamentLevel)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Clock className="w-4 h-4" />
                      {new Date(checkin.checkinAt!).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                      {checkin.ownerId && <ChevronRight className="w-4 h-4" />}
                    </div>
                  </div>

                  {(checkin.todayConcern || checkin.recentProblemBehavior) && (
                    <div className="mt-3 pl-13 space-y-1">
                      {checkin.todayConcern && (
                        <div className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                          <span className="text-gray-600">{checkin.todayConcern}</span>
                        </div>
                      )}
                      {checkin.todayGoal && (
                        <div className="text-sm text-gray-500 ml-6">
                          목표: {checkin.todayGoal}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
