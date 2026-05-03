import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { 
  TrendingUp, 
  Users, 
  Star,
  Award,
  Wallet,
  RefreshCw,
  Settings,
  Search,
  Eye,
  Clock,
  ThumbsUp,
  MessageCircle,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function AdminMonetization() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTrainer, setSelectedTrainer] = useState<any>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: trainersData, isLoading: trainersLoading } = useQuery({
    queryKey: ['/api/monetization/admin/trainers'],
  });

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/monetization/settings'],
  });

  const { data: monthlyRevenueData } = useQuery({
    queryKey: ['/api/monetization/admin/revenue/monthly'],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      return apiRequest('/api/monetization/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/monetization/settings'] });
      toast({ title: "설정이 저장되었습니다." });
      setSettingsDialogOpen(false);
    },
  });

  const processPayoutMutation = useMutation({
    mutationFn: async (trainerId: number) => {
      return apiRequest('/api/monetization/admin/process-payout', {
        method: 'POST',
        body: JSON.stringify({ trainerId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/monetization/admin/trainers'] });
      toast({ title: "정산이 완료되었습니다." });
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getEligibilityBadge = (level: number) => {
    switch (level) {
      case 0:
        return <Badge variant="secondary" data-testid="badge-level-0">Level 0 - 무료</Badge>;
      case 1:
        return <Badge className="bg-blue-500" data-testid="badge-level-1">Level 1 - 광고 수익</Badge>;
      case 2:
        return <Badge className="bg-orange-500" data-testid="badge-level-2">Level 2 - 유료 콘텐츠</Badge>;
      default:
        return <Badge variant="outline" data-testid="badge-level-default">미정</Badge>;
    }
  };

  const getStageBadge = (stage: number) => {
    const stages = [
      { label: "Stage 1 (60/40)", color: "bg-gray-500" },
      { label: "Stage 2 (50/50)", color: "bg-blue-500" },
      { label: "Stage 3 (40/60)", color: "bg-green-500" },
    ];
    const s = stages[stage - 1] || stages[0];
    return <Badge className={s.color} data-testid={`badge-stage-${stage}`}>{s.label}</Badge>;
  };

  const trainers = trainersData?.trainers || [];
  const filteredTrainers = trainers.filter((t: any) => 
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const summaryStats = {
    totalTrainers: trainers.length,
    eligibleTrainers: trainers.filter((t: any) => t.eligibilityLevel > 0).length,
    totalPendingPayouts: trainers.reduce((sum: number, t: any) => sum + (t.pendingPayout || 0), 0),
    avgScore: trainers.length > 0 
      ? trainers.reduce((sum: number, t: any) => sum + (t.talezScore || 0), 0) / trainers.length 
      : 0,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">수익화 시스템 관리</h1>
          <p className="text-muted-foreground">TALEZ SCORE 기반 YouTube형 수익화 관리</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/monetization'] })}
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          <Button onClick={() => setSettingsDialogOpen(true)} data-testid="button-settings">
            <Settings className="h-4 w-4 mr-2" />
            수익화 설정
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="card-total-trainers">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">전체 훈련사</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalTrainers}명</div>
            <p className="text-xs text-muted-foreground">활성 훈련사 수</p>
          </CardContent>
        </Card>

        <Card data-testid="card-eligible-trainers">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">수익화 자격자</CardTitle>
            <Award className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{summaryStats.eligibleTrainers}명</div>
            <p className="text-xs text-muted-foreground">Level 1 이상</p>
          </CardContent>
        </Card>

        <Card data-testid="card-pending-payouts">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">미정산 금액</CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{formatCurrency(summaryStats.totalPendingPayouts)}</div>
            <p className="text-xs text-muted-foreground">정산 대기 총액</p>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-score">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">평균 TALEZ SCORE</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{summaryStats.avgScore.toFixed(1)}점</div>
            <p className="text-xs text-muted-foreground">전체 훈련사 평균</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trainers" className="space-y-4">
        <TabsList data-testid="tabs-monetization">
          <TabsTrigger value="trainers" data-testid="tab-trainers">훈련사 관리</TabsTrigger>
          <TabsTrigger value="settlements" data-testid="tab-settlements">정산 현황</TabsTrigger>
          <TabsTrigger value="eligibility" data-testid="tab-eligibility">자격 기준</TabsTrigger>
        </TabsList>

        <TabsContent value="trainers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>훈련사 수익화 현황</CardTitle>
              <CardDescription>훈련사별 TALEZ SCORE 및 수익화 상태</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="훈련사 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-trainer"
                  />
                </div>
              </div>

              {trainersLoading ? (
                <div className="text-center py-8">로딩 중...</div>
              ) : filteredTrainers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "검색 결과가 없습니다." : "훈련사 데이터가 없습니다."}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTrainers.map((trainer: any) => (
                    <div 
                      key={trainer.id} 
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedTrainer(trainer)}
                      data-testid={`card-trainer-${trainer.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                            <span className="text-orange-600 font-bold">{trainer.name?.charAt(0) || "T"}</span>
                          </div>
                          <div>
                            <h4 className="font-semibold">{trainer.name || "이름 없음"}</h4>
                            <p className="text-sm text-muted-foreground">{trainer.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span className="font-bold text-lg">{trainer.talezScore?.toFixed(1) || 0}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">TALEZ SCORE</span>
                          </div>

                          <div className="text-center">
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-blue-500" />
                              <span className="font-bold">{trainer.followers || 0}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">팔로워</span>
                          </div>

                          <div className="text-center">
                            {getEligibilityBadge(trainer.eligibilityLevel || 0)}
                            <p className="text-xs text-muted-foreground mt-1">자격 등급</p>
                          </div>

                          <div className="text-center">
                            {getStageBadge(trainer.revenueStage || 1)}
                            <p className="text-xs text-muted-foreground mt-1">정산 단계</p>
                          </div>

                          <div className="text-right">
                            <div className="font-bold text-green-600">{formatCurrency(trainer.pendingPayout || 0)}</div>
                            <span className="text-xs text-muted-foreground">미정산액</span>
                          </div>

                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <span>조회수: {trainer.totalViews?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>시청시간: {trainer.totalWatchTime || 0}분</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                          <span>좋아요: {trainer.totalLikes?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4 text-muted-foreground" />
                          <span>댓글: {trainer.totalComments?.toLocaleString() || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settlements" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-500" />
                  Stage 1
                </CardTitle>
                <CardDescription>월 매출 500만원 미만</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>플랫폼 몫</span>
                    <span className="font-bold">60%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>훈련사 몫</span>
                    <span className="font-bold text-green-600">40%</span>
                  </div>
                  <Progress value={40} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  Stage 2
                </CardTitle>
                <CardDescription>월 매출 500만~1,500만원</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>플랫폼 몫</span>
                    <span className="font-bold">50%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>훈련사 몫</span>
                    <span className="font-bold text-green-600">50%</span>
                  </div>
                  <Progress value={50} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  Stage 3
                </CardTitle>
                <CardDescription>월 매출 1,500만원 이상</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>플랫폼 몫</span>
                    <span className="font-bold">40%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>훈련사 몫</span>
                    <span className="font-bold text-green-600">60%</span>
                  </div>
                  <Progress value={60} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>월별 정산 현황</CardTitle>
              <CardDescription>최근 6개월 정산 데이터</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(monthlyRevenueData?.monthly || []).map((month: any) => (
                  <div key={month.month} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">{month.month}</h4>
                      <p className="text-sm text-muted-foreground">
                        훈련사: {month.trainerCount}명 | 
                        Stage 1: {month.stage1Count}명, 
                        Stage 2: {month.stage2Count}명, 
                        Stage 3: {month.stage3Count}명
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{formatCurrency(month.totalRevenue || 0)}</div>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>플랫폼: {formatCurrency(month.platformShare || 0)}</span>
                        <span>훈련사: {formatCurrency(month.trainerShare || 0)}</span>
                      </div>
                    </div>
                    <Badge variant={month.settled ? "default" : "secondary"}>
                      {month.settled ? "정산완료" : "정산대기"}
                    </Badge>
                  </div>
                ))}
                {(!monthlyRevenueData?.monthly || monthlyRevenueData.monthly.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">정산 데이터가 없습니다.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="eligibility" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-blue-500" />
                  Level 1 - 광고 수익
                </CardTitle>
                <CardDescription>콘텐츠에 광고를 삽입하여 수익 창출</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">팔로워 300명 이상</p>
                    <p className="text-sm text-muted-foreground">또는 TALEZ SCORE 20점 이상</p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>혜택:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>콘텐츠 광고 수익 분배</li>
                    <li>기본 분석 도구 접근</li>
                    <li>수익 대시보드 이용</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-orange-500" />
                  Level 2 - 유료 콘텐츠
                </CardTitle>
                <CardDescription>유료 강좌 및 프리미엄 콘텐츠 판매</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">팔로워 1,000명 이상</p>
                    <p className="text-sm text-muted-foreground">그리고 TALEZ SCORE 80점 이상</p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>혜택:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>유료 강좌 판매 가능</li>
                    <li>프리미엄 콘텐츠 등록</li>
                    <li>고급 분석 도구 접근</li>
                    <li>프로모션 도구 이용</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>TALEZ SCORE 계산 방식</CardTitle>
              <CardDescription>훈련사 점수는 다음 요소들로 계산됩니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Eye className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <h4 className="font-bold">조회수</h4>
                  <p className="text-2xl font-bold text-blue-500">30%</p>
                  <p className="text-sm text-muted-foreground">로그 스케일 적용</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <h4 className="font-bold">완료율</h4>
                  <p className="text-2xl font-bold text-green-500">30%</p>
                  <p className="text-sm text-muted-foreground">강좌 완료 비율</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <ThumbsUp className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                  <h4 className="font-bold">좋아요</h4>
                  <p className="text-2xl font-bold text-orange-500">20%</p>
                  <p className="text-sm text-muted-foreground">콘텐츠 좋아요 수</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h4 className="font-bold">채택 답변</h4>
                  <p className="text-2xl font-bold text-primary">20%</p>
                  <p className="text-sm text-muted-foreground">Q&A 채택률</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>수익화 설정</DialogTitle>
            <DialogDescription>수익화 자격 기준 및 정산 비율을 설정합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Level 1 최소 팔로워</Label>
              <Input 
                type="number" 
                defaultValue={settingsData?.level1MinFollowers || 300}
                data-testid="input-level1-followers"
              />
            </div>
            <div className="space-y-2">
              <Label>Level 1 최소 TALEZ SCORE</Label>
              <Input 
                type="number" 
                defaultValue={settingsData?.level1MinScore || 20}
                data-testid="input-level1-score"
              />
            </div>
            <div className="space-y-2">
              <Label>Level 2 최소 팔로워</Label>
              <Input 
                type="number" 
                defaultValue={settingsData?.level2MinFollowers || 1000}
                data-testid="input-level2-followers"
              />
            </div>
            <div className="space-y-2">
              <Label>Level 2 최소 TALEZ SCORE</Label>
              <Input 
                type="number" 
                defaultValue={settingsData?.level2MinScore || 80}
                data-testid="input-level2-score"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>취소</Button>
            <Button 
              onClick={() => updateSettingsMutation.mutate({})}
              disabled={updateSettingsMutation.isPending}
              data-testid="button-save-settings"
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedTrainer} onOpenChange={() => setSelectedTrainer(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTrainer?.name} - 상세 정보</DialogTitle>
            <DialogDescription>훈련사 수익화 상세 현황</DialogDescription>
          </DialogHeader>
          {selectedTrainer && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      <span className="font-medium">TALEZ SCORE</span>
                    </div>
                    <p className="text-3xl font-bold">{selectedTrainer.talezScore?.toFixed(1) || 0}점</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="h-5 w-5 text-green-500" />
                      <span className="font-medium">미정산 금액</span>
                    </div>
                    <p className="text-3xl font-bold text-green-600">
                      {formatCurrency(selectedTrainer.pendingPayout || 0)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">활동 지표</h4>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{selectedTrainer.totalViews?.toLocaleString() || 0}</p>
                    <p className="text-sm text-muted-foreground">조회수</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{selectedTrainer.totalWatchTime || 0}분</p>
                    <p className="text-sm text-muted-foreground">시청시간</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{selectedTrainer.totalLikes?.toLocaleString() || 0}</p>
                    <p className="text-sm text-muted-foreground">좋아요</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{selectedTrainer.followers || 0}</p>
                    <p className="text-sm text-muted-foreground">팔로워</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {getEligibilityBadge(selectedTrainer.eligibilityLevel || 0)}
                {getStageBadge(selectedTrainer.revenueStage || 1)}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTrainer(null)}>닫기</Button>
            {selectedTrainer?.pendingPayout > 0 && (
              <Button 
                onClick={() => processPayoutMutation.mutate(selectedTrainer.id)}
                disabled={processPayoutMutation.isPending}
                data-testid="button-process-payout"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                정산 처리
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
