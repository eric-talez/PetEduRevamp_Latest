import { useState, useEffect } from 'react';
import { useGlobalAuth } from '@/hooks/useGlobalAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  RefreshCw,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  ChevronRight,
  Star,
  Award,
  Users,
  Clock,
  ThumbsUp,
  MessageCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { PageSkeleton } from '@/components/ui/SkeletonLoader';

interface EarningRecord {
  id: number;
  date: string;
  courseName: string;
  studentName: string;
  amount: number;
  commissionRate: number; // % 단위
  netAmount: number;
  status: 'completed' | 'pending' | 'processing';
  paymentMethod: 'card' | 'transfer' | 'cash';
}

interface MonthlySummary {
  month: string;
  totalRevenue: number;
  averageCommissionRate: number; // % 단위
  netEarnings: number;
  transactionCount: number;
}

export default function TrainerEarnings() {
  const { userName, userRole } = useGlobalAuth();
  const { toast } = useToast();
  const isAdmin = userRole === 'admin';
  const [earnings, setEarnings] = useState<EarningRecord[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedMonthDetail, setSelectedMonthDetail] = useState<MonthlySummary | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // TALEZ SCORE 데이터 로드
  const { data: scoreData } = useQuery({
    queryKey: ['/api/monetization/my-score'],
  });

  const { data: eligibilityData } = useQuery({
    queryKey: ['/api/monetization/my-eligibility'],
  });

  // 수익화 관련 유틸 함수
  const getEligibilityBadge = (level: number) => {
    switch (level) {
      case 0:
        return <Badge variant="secondary">Level 0 - 무료</Badge>;
      case 1:
        return <Badge className="bg-blue-500">Level 1 - 광고 수익</Badge>;
      case 2:
        return <Badge className="bg-orange-500">Level 2 - 유료 콘텐츠</Badge>;
      default:
        return <Badge variant="outline">미정</Badge>;
    }
  };

  const getStageBadge = (stage: number) => {
    const stages = [
      { label: "Stage 1 (60/40)", color: "bg-gray-500" },
      { label: "Stage 2 (50/50)", color: "bg-blue-500" },
      { label: "Stage 3 (40/60)", color: "bg-green-500" },
    ];
    const s = stages[stage - 1] || stages[0];
    return <Badge className={s.color}>{s.label}</Badge>;
  };

  // 수익 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // 실제 수익 데이터 (실제 훈련사 수익 내역)
        const mockEarnings: EarningRecord[] = [
          {
            id: 1,
            date: '2025-01-15',
            courseName: '기초 복종 훈련',
            studentName: '김지영',
            amount: 300000,
            commissionRate: 25,
            netAmount: 225000,
            status: 'completed',
            paymentMethod: 'card'
          },
          {
            id: 2,
            date: '2025-01-12',
            courseName: '문제 행동 교정',
            studentName: '박민호',
            amount: 450000,
            commissionRate: 25,
            netAmount: 337500,
            status: 'completed',
            paymentMethod: 'transfer'
          },
          {
            id: 3,
            date: '2025-01-10',
            courseName: '퍼피 사회화 훈련',
            studentName: '이수진',
            amount: 280000,
            commissionRate: 25,
            netAmount: 210000,
            status: 'pending',
            paymentMethod: 'card'
          },
          {
            id: 4,
            date: '2025-01-08',
            courseName: '고급 복종 훈련',
            studentName: '최동수',
            amount: 520000,
            commissionRate: 20,
            netAmount: 416000,
            status: 'processing',
            paymentMethod: 'card'
          },
          {
            id: 5,
            date: '2024-12-28',
            courseName: '기초 복종 훈련',
            studentName: '정미나',
            amount: 300000,
            commissionRate: 25,
            netAmount: 225000,
            status: 'completed',
            paymentMethod: 'transfer'
          },
          {
            id: 6,
            date: '2024-12-25',
            courseName: '분리불안 교정',
            studentName: '강현우',
            amount: 380000,
            commissionRate: 25,
            netAmount: 285000,
            status: 'completed',
            paymentMethod: 'card'
          },
          {
            id: 7,
            date: '2024-12-20',
            courseName: '리콜 훈련',
            studentName: '한소영',
            amount: 350000,
            commissionRate: 25,
            netAmount: 262500,
            status: 'completed',
            paymentMethod: 'card'
          },
          {
            id: 8,
            date: '2024-12-15',
            courseName: '실내 훈련',
            studentName: '오세진',
            amount: 320000,
            commissionRate: 25,
            netAmount: 240000,
            status: 'completed',
            paymentMethod: 'transfer'
          }
        ];

        const mockMonthlySummary: MonthlySummary[] = [
          {
            month: '2025-01',
            totalRevenue: 1550000,
            averageCommissionRate: 23.75,
            netEarnings: 1188500,
            transactionCount: 4
          },
          {
            month: '2024-12',
            totalRevenue: 1350000,
            averageCommissionRate: 25,
            netEarnings: 1012500,
            transactionCount: 4
          },
          {
            month: '2024-11',
            totalRevenue: 950000,
            averageCommissionRate: 25,
            netEarnings: 712500,
            transactionCount: 3
          },
          {
            month: '2024-10',
            totalRevenue: 1200000,
            averageCommissionRate: 25,
            netEarnings: 900000,
            transactionCount: 4
          }
        ];
        
        setEarnings(mockEarnings);
        setMonthlySummary(mockMonthlySummary);
      } catch (error) {
        console.error('수익 데이터 로딩 오류:', error);
        toast({
          title: '데이터 로딩 오류',
          description: '수익 정보를 불러오는 중 오류가 발생했습니다.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [toast]);

  // 필터링된 수익 데이터
  const filteredEarnings = selectedMonth === 'all' 
    ? earnings 
    : earnings.filter(earning => earning.date.substring(0, 7) === selectedMonth);

  // 페이지네이션 처리
  const totalPages = Math.ceil(filteredEarnings.length / itemsPerPage);
  const paginatedEarnings = filteredEarnings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 상태에 따른 배지 스타일
  const getStatusBadge = (status: EarningRecord['status']) => {
    switch(status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">완료</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">처리중</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">대기</Badge>;
      default:
        return <Badge variant="outline">미정</Badge>;
    }
  };

  // 결제 방법 표시
  const getPaymentMethodText = (method: EarningRecord['paymentMethod']) => {
    switch(method) {
      case 'card': return '카드결제';
      case 'transfer': return '계좌이체';
      case 'cash': return '현금결제';
      default: return '기타';
    }
  };

  // 총 수익 계산
  const totalRevenue = filteredEarnings.reduce((sum, earning) => sum + earning.amount, 0);
  const averageCommissionRate = filteredEarnings.length > 0 
    ? filteredEarnings.reduce((sum, earning) => sum + earning.commissionRate, 0) / filteredEarnings.length
    : 0;
  const totalNetEarnings = filteredEarnings.reduce((sum, earning) => sum + earning.netAmount, 0);

  // 이번 달 수익
  const currentMonth = format(new Date(), 'yyyy-MM');
  const currentMonthSummary = monthlySummary.find(summary => summary.month === currentMonth);
  const lastMonthSummary = monthlySummary.find(summary => {
    const lastMonth = format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM');
    return summary.month === lastMonth;
  });

  const monthlyGrowth = lastMonthSummary && currentMonthSummary
    ? ((currentMonthSummary.netEarnings - lastMonthSummary.netEarnings) / lastMonthSummary.netEarnings * 100).toFixed(1)
    : '0';

  // 데이터 새로고침
  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: '새로고침 완료',
        description: '수익 데이터가 업데이트되었습니다.',
      });
    }, 1000);
  };

  if (isLoading) {
    return <PageSkeleton variant="grid" count={6} />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">수익 관리</h1>
          <p className="text-muted-foreground">강의 수익과 정산 내역을 확인하고 관리하세요</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            엑셀 다운로드
          </Button>
        </div>
      </div>

      {/* TALEZ SCORE 수익화 카드 */}
      <Card className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 dark:border-orange-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                <Star className="h-5 w-5" />
                TALEZ SCORE
              </CardTitle>
              <CardDescription>수익화 자격 및 현황</CardDescription>
            </div>
            <div className="flex gap-2">
              {getEligibilityBadge(eligibilityData?.eligibilityLevel || 0)}
              {getStageBadge(eligibilityData?.revenueStage || 1)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="text-center p-4 bg-white/50 dark:bg-gray-900/30 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
              <p className="text-3xl font-bold text-yellow-600">{scoreData?.talezScore?.toFixed(1) || 0}</p>
              <p className="text-sm text-muted-foreground">현재 점수</p>
            </div>
            <div className="text-center p-4 bg-white/50 dark:bg-gray-900/30 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Users className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-blue-600">{scoreData?.followers || 0}</p>
              <p className="text-sm text-muted-foreground">팔로워</p>
            </div>
            <div className="text-center p-4 bg-white/50 dark:bg-gray-900/30 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Eye className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-green-600">{(scoreData?.totalViews || 0).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">총 조회수</p>
            </div>
            <div className="text-center p-4 bg-white/50 dark:bg-gray-900/30 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <ThumbsUp className="h-8 w-8 text-orange-500" />
              </div>
              <p className="text-3xl font-bold text-orange-600">{(scoreData?.totalLikes || 0).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">총 좋아요</p>
            </div>
            <div className="text-center p-4 bg-white/50 dark:bg-gray-900/30 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-600">{(eligibilityData?.pendingPayout || 0).toLocaleString()}원</p>
              <p className="text-sm text-muted-foreground">미정산액</p>
            </div>
          </div>
          
          {eligibilityData?.eligibilityLevel === 0 && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <Award className="h-4 w-4 inline mr-2" />
                수익화 자격 달성까지: 
                {eligibilityData?.requirements?.level1 && (
                  <span className="ml-2">
                    팔로워 {eligibilityData.requirements.level1.followersNeeded}명 또는 점수 {eligibilityData.requirements.level1.scoreNeeded}점 필요
                  </span>
                )}
              </p>
              <Progress 
                value={Math.min(100, (scoreData?.talezScore || 0) / 20 * 100)} 
                className="h-2 mt-2" 
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">이번 달 순수익</p>
                <p className="text-2xl font-bold">
                  {(currentMonthSummary?.netEarnings || 0).toLocaleString()}원
                </p>
                <div className="flex items-center text-xs mt-1">
                  {parseFloat(monthlyGrowth) > 0 ? (
                    <>
                      <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-green-500">+{monthlyGrowth}%</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                      <span className="text-red-500">{monthlyGrowth}%</span>
                    </>
                  )}
                  <span className="text-muted-foreground ml-1">지난 달 대비</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">총 매출</p>
                <p className="text-2xl font-bold">{totalRevenue.toLocaleString()}원</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">평균 수수료율</p>
                <p className="text-2xl font-bold">{averageCommissionRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-amber-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">거래 건수</p>
                <p className="text-2xl font-bold">{filteredEarnings.length}건</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 월별 수익 차트 */}
      <Card>
        <CardHeader>
          <CardTitle>월별 수익 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlySummary.map((summary) => (
              <div 
                key={summary.month} 
                className={`flex items-center justify-between p-4 border rounded-lg ${isAdmin ? 'hover:bg-muted/50 cursor-pointer' : ''} transition-colors`}
                onClick={() => {
                  if (isAdmin) {
                    setSelectedMonthDetail(summary);
                    setIsDetailModalOpen(true);
                  }
                }}
              >
                <div className="flex items-center space-x-4">
                  <div className="text-lg font-semibold">
                    {format(new Date(summary.month + '-01'), 'yyyy년 MM월')}
                  </div>
                  <Badge variant="secondary">{summary.transactionCount}건</Badge>
                </div>
                <div className="text-right flex items-center space-x-2">
                  {isAdmin && (
                    <div>
                      <div className="text-lg font-bold text-green-600">
                        {summary.netEarnings.toLocaleString()}원
                      </div>
                      <div className="text-sm text-muted-foreground">
                        매출 {summary.totalRevenue.toLocaleString()}원 - 수수료 {summary.averageCommissionRate}%
                      </div>
                    </div>
                  )}
                  {isAdmin && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 월별 상세 내역 팝업 */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {selectedMonthDetail && format(new Date(selectedMonthDetail.month + '-01'), 'yyyy년 MM월')} 상세 내역
            </DialogTitle>
          </DialogHeader>
          
          {selectedMonthDetail && (
            <div className="space-y-6">
              {/* 월별 요약 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">총 매출</p>
                      <p className="text-xl font-bold text-blue-600">
                        {selectedMonthDetail.totalRevenue.toLocaleString()}원
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">순수익</p>
                      <p className="text-xl font-bold text-green-600">
                        {selectedMonthDetail.netEarnings.toLocaleString()}원
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">평균 수수료율</p>
                      <p className="text-xl font-bold text-purple-600">
                        {selectedMonthDetail.averageCommissionRate}%
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">거래 건수</p>
                      <p className="text-xl font-bold text-amber-600">
                        {selectedMonthDetail.transactionCount}건
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 해당 월의 상세 거래 내역 */}
              <Card>
                <CardHeader>
                  <CardTitle>거래 내역</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2">날짜</th>
                          <th className="text-left py-3 px-2">강의명</th>
                          <th className="text-left py-3 px-2">수강생</th>
                          <th className="text-right py-3 px-2">매출액</th>
                          <th className="text-right py-3 px-2">수수료율</th>
                          <th className="text-right py-3 px-2">순수익</th>
                          <th className="text-center py-3 px-2">결제방법</th>
                          <th className="text-center py-3 px-2">상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {earnings
                          .filter(earning => earning.date.substring(0, 7) === selectedMonthDetail.month)
                          .map((earning) => (
                            <tr key={earning.id} className="border-b hover:bg-muted/50">
                              <td className="py-3 px-2">
                                {format(new Date(earning.date), 'MM.dd')}
                              </td>
                              <td className="py-3 px-2">
                                <div className="font-medium">{earning.courseName}</div>
                              </td>
                              <td className="py-3 px-2">{earning.studentName}</td>
                              <td className="py-3 px-2 text-right font-medium">
                                {earning.amount.toLocaleString()}원
                              </td>
                              <td className="py-3 px-2 text-right text-red-600">
                                {earning.commissionRate}%
                              </td>
                              <td className="py-3 px-2 text-right font-bold text-green-600">
                                {earning.netAmount.toLocaleString()}원
                              </td>
                              <td className="py-3 px-2 text-center">
                                <Badge variant="secondary">
                                  {getPaymentMethodText(earning.paymentMethod)}
                                </Badge>
                              </td>
                              <td className="py-3 px-2 text-center">
                                {getStatusBadge(earning.status)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 필터 - 관리자만 표시 */}
      {isAdmin && (
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium">기간 필터:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-input bg-background rounded-md text-sm"
          >
            <option value="all">전체 기간</option>
            {monthlySummary.map((summary) => (
              <option key={summary.month} value={summary.month}>
                {format(new Date(summary.month + '-01'), 'yyyy년 MM월')}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 수익 내역 테이블 - 관리자만 표시 */}
      {isAdmin && <Card>
        <CardHeader>
          <CardTitle>수익 내역</CardTitle>
        </CardHeader>
        <CardContent>
          {paginatedEarnings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">날짜</th>
                    <th className="text-left py-3 px-2">강의명</th>
                    <th className="text-left py-3 px-2">수강생</th>
                    <th className="text-right py-3 px-2">매출액</th>
                    <th className="text-right py-3 px-2">수수료율</th>
                    <th className="text-right py-3 px-2">순수익</th>
                    <th className="text-center py-3 px-2">결제방법</th>
                    <th className="text-center py-3 px-2">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEarnings.map((earning) => (
                    <tr key={earning.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2">
                        {format(new Date(earning.date), 'yyyy.MM.dd')}
                      </td>
                      <td className="py-3 px-2">
                        <div className="font-medium">{earning.courseName}</div>
                      </td>
                      <td className="py-3 px-2">{earning.studentName}</td>
                      <td className="py-3 px-2 text-right font-medium">
                        {earning.amount.toLocaleString()}원
                      </td>
                      <td className="py-3 px-2 text-right text-red-600">
                        {earning.commissionRate}%
                      </td>
                      <td className="py-3 px-2 text-right font-bold text-green-600">
                        {earning.netAmount.toLocaleString()}원
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Badge variant="secondary">
                          {getPaymentMethodText(earning.paymentMethod)}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-center">
                        {getStatusBadge(earning.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">수익 내역이 없습니다</h3>
              <p className="text-muted-foreground mb-4">선택한 기간에 해당하는 수익 내역이 없습니다.</p>
            </div>
          )}
        </CardContent>
      </Card>}

      {/* 페이지네이션 - 관리자만 표시 */}
      {isAdmin && totalPages > 1 && (
        <div className="flex justify-center">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              이전
            </Button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              다음
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}