import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  ShoppingCart,
  BookOpen,
  Calendar,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  AlertTriangle,
  MessageSquare,
  AlertCircle
} from 'lucide-react';

interface AdminDashboardBreakdowns {
  period: string;
  startDate: string | null;
  endDate: string | null;
  users: {
    monthlyGrowth: { label: string; newUsers: number; activeUsers: number }[];
    ageGroups: { label: string; count: number; percentage: number }[];
    hourlyDistribution: { label: string; count: number; percentage: number }[];
    engagement: { label: string; value: number }[];
  };
  revenue: {
    monthlyTrend: { month: string; total: number; training: number; shop: number }[];
    growthRate: number;
    averageOrderValue: number;
    customerLifetimeValue: number;
  };
  training: {
    categoryDistribution: { name: string; count: number; percentage: number }[];
    categoryCompletion: { name: string; completion: number }[];
    topTrainers: { name: string; sessions: number; rating: number }[];
  };
  geography: {
    regions: { region: string; users: number; revenue: number; percentage: number }[];
  };
}

interface AdminDashboardStats {
  period: string;
  startDate: string | null;
  endDate: string | null;
  totalUsers: number;
  totalCourses: number;
  activeCourses: number;
  totalInstitutes: number;
  totalTrainers: number;
  totalEvents: number;
  totalProducts: number;
  totalOrders: number;
  completedOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  unreadReports: number;
  totalMessages: number;
  activeUsers: number;
  pendingApprovals: number;
}

export default function AdminAnalytics() {
  const [timeRange, setTimeRange] = useState('30days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const { toast } = useToast();

  const isCustom = timeRange === 'custom';
  const customDatesValid = !isCustom || (
    !!customStart && !!customEnd &&
    !isNaN(new Date(customStart).getTime()) &&
    !isNaN(new Date(customEnd).getTime()) &&
    new Date(customStart) <= new Date(customEnd)
  );

  const buildParams = () => {
    const params = new URLSearchParams({ period: timeRange });
    if (isCustom) {
      params.set('startDate', new Date(customStart).toISOString());
      params.set('endDate', new Date(customEnd + 'T23:59:59').toISOString());
    }
    return params;
  };

  const { data: stats, isLoading, isError, error, refetch, isRefetching } = useQuery<AdminDashboardStats>({
    queryKey: ['/api/admin/dashboard/stats', timeRange, isCustom ? customStart : '', isCustom ? customEnd : ''],
    queryFn: async () => {
      const res = await fetch(`/api/admin/dashboard/stats?${buildParams().toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`통계 조회 실패 (${res.status}): ${text || res.statusText}`);
      }
      return res.json();
    },
    enabled: !isCustom || customDatesValid,
    staleTime: 30_000,
  });

  const {
    data: breakdowns,
    isLoading: isBreakdownsLoading,
    isError: isBreakdownsError,
    error: breakdownsError,
    refetch: refetchBreakdowns,
  } = useQuery<AdminDashboardBreakdowns>({
    queryKey: ['/api/admin/dashboard/breakdowns', timeRange, isCustom ? customStart : '', isCustom ? customEnd : ''],
    queryFn: async () => {
      const res = await fetch(`/api/admin/dashboard/breakdowns?${buildParams().toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`세부 분석 조회 실패 (${res.status}): ${text || res.statusText}`);
      }
      return res.json();
    },
    enabled: !isCustom || customDatesValid,
    staleTime: 30_000,
  });

  const handleRefresh = async () => {
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard/stats'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard/breakdowns'] }),
      ]);
      await Promise.all([refetch(), refetchBreakdowns()]);
      toast({ title: '새로고침 완료', description: '최신 통계로 갱신되었습니다.' });
    } catch (e: any) {
      toast({ title: '새로고침 실패', description: e?.message || '오류가 발생했습니다.', variant: 'destructive' });
    }
  };

  const StatCard = ({ title, value, change, icon: Icon, trend }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className={`text-xs flex items-center ${trend === 'up' ? 'text-success' : 'text-destructive'}`}>
            {trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const CATEGORY_COLORS = ['hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--secondary))', 'hsl(var(--muted-foreground))', 'hsl(var(--success))'];

  const BreakdownState = ({ children, isEmpty, emptyText = '표시할 데이터가 없습니다.' }: { children: React.ReactNode; isEmpty: boolean; emptyText?: string }) => {
    if (isBreakdownsLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      );
    }
    if (isBreakdownsError) {
      return (
        <div className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          <span>{(breakdownsError as Error)?.message || '데이터를 불러올 수 없습니다.'}</span>
        </div>
      );
    }
    if (isEmpty) {
      return (
        <div className="text-center text-sm text-muted-foreground py-8">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-40" />
          {emptyText}
        </div>
      );
    }
    return <>{children}</>;
  };

  const userMonthlyMax = Math.max(1, ...(breakdowns?.users.monthlyGrowth.map(m => m.newUsers) || [1]));
  const revenueMonthlyMax = Math.max(1, ...(breakdowns?.revenue.monthlyTrend.map(m => m.total) || [1]));
  const regionsMax = Math.max(1, ...(breakdowns?.geography.regions.map(r => r.users) || [1]));

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">심층 분석</h1>
          <p className="text-muted-foreground">플랫폼 성과와 사용자 행동을 분석합니다</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">오늘</SelectItem>
              <SelectItem value="7days">최근 7일</SelectItem>
              <SelectItem value="30days">최근 30일</SelectItem>
              <SelectItem value="90days">최근 3개월</SelectItem>
              <SelectItem value="1year">최근 1년</SelectItem>
              <SelectItem value="custom">사용자 지정</SelectItem>
            </SelectContent>
          </Select>
          {isCustom && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="border rounded-md px-2 py-1 text-sm"
                aria-label="시작일"
                data-testid="input-custom-start"
              />
              <span className="text-sm text-muted-foreground">~</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="border rounded-md px-2 py-1 text-sm"
                aria-label="종료일"
                data-testid="input-custom-end"
              />
            </div>
          )}
          <Button onClick={handleRefresh} disabled={isLoading || isRefetching} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${(isLoading || isRefetching) ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            리포트 다운로드
          </Button>
        </div>
      </div>

      {/* 개요 통계 - 실 데이터 */}
      {isCustom && !customDatesValid ? (
        <Card className="border-warning/40">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 text-warning" />
            <div className="flex-1">
              <p className="font-medium">사용자 지정 기간을 선택해주세요</p>
              <p className="text-sm text-muted-foreground">
                시작일과 종료일을 모두 입력하고 시작일이 종료일보다 같거나 빠른지 확인해주세요.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : isError ? (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="font-medium">통계를 불러올 수 없습니다</p>
              <p className="text-sm text-muted-foreground">{(error as Error)?.message || '잠시 후 다시 시도해주세요.'}</p>
            </div>
            <Button size="sm" variant="outline" onClick={handleRefresh}>다시 시도</Button>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-32" /></CardContent>
            </Card>
          ))}
        </div>
      ) : !stats || (
        stats.totalCourses === 0 && stats.totalOrders === 0 && stats.totalRevenue === 0 &&
        stats.unreadReports === 0 && stats.totalMessages === 0
      ) ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">선택하신 기간에 표시할 데이터가 없습니다</p>
            <p className="text-sm">다른 기간을 선택하거나 잠시 후 다시 확인해주세요.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard title="총 강좌" value={stats.totalCourses.toLocaleString()} icon={BookOpen} />
          <StatCard title="총 주문" value={stats.totalOrders.toLocaleString()} icon={ShoppingCart} />
          <StatCard title="총 매출" value={formatCurrency(stats.totalRevenue)} icon={DollarSign} />
          <StatCard title="미열람 신고" value={stats.unreadReports.toLocaleString()} icon={AlertTriangle} />
          <StatCard title="총 메시지" value={stats.totalMessages.toLocaleString()} icon={MessageSquare} />
          <StatCard title="활성 사용자" value={stats.activeUsers.toLocaleString()} icon={Users} />
        </div>
      )}

      {/* 상세 분석 탭 */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="users">사용자</TabsTrigger>
          <TabsTrigger value="revenue">수익</TabsTrigger>
          <TabsTrigger value="training">훈련</TabsTrigger>
          <TabsTrigger value="geography">지역</TabsTrigger>
        </TabsList>

        {/* 개요 탭 */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  사용자 증가 추이
                </CardTitle>
                <CardDescription>최근 7개월 신규 사용자 및 활성 사용자</CardDescription>
              </CardHeader>
              <CardContent>
                <BreakdownState isEmpty={!breakdowns?.users.monthlyGrowth.some(m => m.newUsers > 0 || m.activeUsers > 0)}>
                  <div className="space-y-4" data-testid="user-monthly-growth">
                    {breakdowns?.users.monthlyGrowth.map((item, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{item.label}</span>
                          <span>{item.newUsers}명 / {item.activeUsers}명 활성</span>
                        </div>
                        <Progress value={(item.newUsers / userMonthlyMax) * 100} className="h-2" />
                      </div>
                    ))}
                  </div>
                </BreakdownState>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  훈련 카테고리 분포
                </CardTitle>
                <CardDescription>강좌 카테고리별 비율 (전체 누적)</CardDescription>
              </CardHeader>
              <CardContent>
                <BreakdownState isEmpty={!breakdowns?.training.categoryDistribution.length}>
                  <div className="space-y-4" data-testid="category-distribution">
                    {breakdowns?.training.categoryDistribution.map((cat, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}></div>
                          <span className="text-sm">{cat.name}</span>
                        </div>
                        <Badge>{cat.percentage}%</Badge>
                      </div>
                    ))}
                  </div>
                </BreakdownState>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                월별 수익 추이
              </CardTitle>
              <CardDescription>쇼핑몰 수익 vs 훈련 수익</CardDescription>
            </CardHeader>
            <CardContent>
              <BreakdownState isEmpty={!breakdowns?.revenue.monthlyTrend.some(m => m.total > 0)}>
                <div className="space-y-4" data-testid="revenue-monthly-trend">
                  {breakdowns?.revenue.monthlyTrend.map((item, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{item.month}</span>
                        <span>{formatCurrency(item.total)} (훈련: {formatCurrency(item.training)})</span>
                      </div>
                      <div className="relative">
                        <Progress value={(item.total / revenueMonthlyMax) * 100} className="h-3" />
                        <div
                          className="absolute top-0 left-0 h-3 bg-success rounded-full"
                          style={{ width: `${(item.training / revenueMonthlyMax) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </BreakdownState>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 사용자 탭 */}
        <TabsContent value="users" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>연령대별 사용자 분포</CardTitle>
                <CardDescription>사용자의 연령대 분석</CardDescription>
              </CardHeader>
              <CardContent>
                <BreakdownState
                  isEmpty={!breakdowns?.users.ageGroups.some(a => a.count > 0)}
                  emptyText="연령 정보가 등록된 사용자가 없습니다."
                >
                  <div className="space-y-4" data-testid="user-age-groups">
                    {breakdowns?.users.ageGroups
                      .filter(a => a.count > 0)
                      .map((item, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{item.label}</span>
                            <span>{item.count}명 ({item.percentage}%)</span>
                          </div>
                          <Progress value={item.percentage} className="h-2" />
                        </div>
                      ))}
                  </div>
                </BreakdownState>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>사용자 활동 패턴</CardTitle>
                <CardDescription>시간대별 메시지 활동 비율</CardDescription>
              </CardHeader>
              <CardContent>
                <BreakdownState
                  isEmpty={!breakdowns?.users.hourlyDistribution.some(h => h.count > 0)}
                  emptyText="활동 기록이 아직 없습니다."
                >
                  <div className="space-y-4" data-testid="user-hourly-distribution">
                    {breakdowns?.users.hourlyDistribution.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-sm font-medium">{item.label}</span>
                        <Badge variant="secondary">{item.percentage}%</Badge>
                      </div>
                    ))}
                  </div>
                </BreakdownState>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>사용자 참여도 지표</CardTitle>
              <CardDescription>실제 활동 기반 핵심 지표</CardDescription>
            </CardHeader>
            <CardContent>
              <BreakdownState isEmpty={!breakdowns?.users.engagement.length}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4" data-testid="user-engagement">
                  {breakdowns?.users.engagement.map((metric, idx) => (
                    <div key={idx} className="text-center space-y-2">
                      <div className="text-2xl font-bold">{metric.value}%</div>
                      <div className="text-sm text-muted-foreground">{metric.label}</div>
                      <Progress value={metric.value} className="h-2" />
                    </div>
                  ))}
                </div>
              </BreakdownState>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 수익 탭 */}
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>월별 상세 수익 분석</CardTitle>
              <CardDescription>카테고리별 수익 추이 및 핵심 지표</CardDescription>
            </CardHeader>
            <CardContent>
              <BreakdownState
                isEmpty={!breakdowns?.revenue.monthlyTrend.some(m => m.total > 0) && (breakdowns?.revenue.averageOrderValue || 0) === 0}
                emptyText="해당 기간에 수익 데이터가 없습니다."
              >
                <div className="grid gap-4 md:grid-cols-3 mb-6" data-testid="revenue-summary">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">수익 성장률</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${(breakdowns?.revenue.growthRate || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {(breakdowns?.revenue.growthRate || 0) >= 0 ? '+' : ''}
                        {breakdowns?.revenue.growthRate ?? 0}%
                      </div>
                      <p className="text-xs text-muted-foreground">전월 대비</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">평균 주문 가격</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(breakdowns?.revenue.averageOrderValue || 0)}</div>
                      <p className="text-xs text-muted-foreground">선택 기간 기준</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">고객 생애 가치</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(breakdowns?.revenue.customerLifetimeValue || 0)}</div>
                      <p className="text-xs text-muted-foreground">구매 고객 1인당 평균</p>
                    </CardContent>
                  </Card>
                </div>
                <div className="space-y-4" data-testid="revenue-detail-trend">
                  {breakdowns?.revenue.monthlyTrend.map((item, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{item.month}</span>
                        <span>
                          {formatCurrency(item.total)}
                          <span className="text-muted-foreground"> (쇼핑: {formatCurrency(item.shop)} / 훈련: {formatCurrency(item.training)})</span>
                        </span>
                      </div>
                      <div className="relative">
                        <Progress value={(item.total / revenueMonthlyMax) * 100} className="h-3" />
                        <div
                          className="absolute top-0 left-0 h-3 bg-success rounded-full"
                          style={{ width: `${(item.training / revenueMonthlyMax) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </BreakdownState>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 훈련 탭 */}
        <TabsContent value="training" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>훈련 완료율</CardTitle>
                <CardDescription>카테고리별 평균 진도율 (전체 누적)</CardDescription>
              </CardHeader>
              <CardContent>
                <BreakdownState
                  isEmpty={!breakdowns?.training.categoryCompletion.length}
                  emptyText="진도율 데이터가 아직 없습니다."
                >
                  <div className="space-y-4" data-testid="training-completion">
                    {breakdowns?.training.categoryCompletion.map((cat, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{cat.name}</span>
                          <span>{cat.completion}%</span>
                        </div>
                        <Progress value={cat.completion} className="h-2" />
                      </div>
                    ))}
                  </div>
                </BreakdownState>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>훈련사 성과</CardTitle>
                <CardDescription>완료 세션 기준 상위 훈련사 (전체 누적)</CardDescription>
              </CardHeader>
              <CardContent>
                <BreakdownState
                  isEmpty={!breakdowns?.training.topTrainers.length}
                  emptyText="훈련 세션 데이터가 아직 없습니다."
                >
                  <div className="space-y-3" data-testid="training-top-trainers">
                    {breakdowns?.training.topTrainers.map((trainer, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 rounded-lg border">
                        <div>
                          <p className="font-medium text-sm">{trainer.name}</p>
                          <p className="text-xs text-muted-foreground">세션: {trainer.sessions}회</p>
                        </div>
                        <Badge>{trainer.rating > 0 ? `${trainer.rating}⭐` : '평점 없음'}</Badge>
                      </div>
                    ))}
                  </div>
                </BreakdownState>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 지역 탭 */}
        <TabsContent value="geography" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>지역별 사용자 및 수익</CardTitle>
              <CardDescription>등록된 주소 기반 분석 (전체 누적)</CardDescription>
            </CardHeader>
            <CardContent>
              <BreakdownState
                isEmpty={!breakdowns?.geography.regions.length}
                emptyText="지역 정보가 등록된 사용자가 없습니다."
              >
                <div className="space-y-4" data-testid="geography-regions">
                  {breakdowns?.geography.regions.map((area, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{area.region}</span>
                        <span>{area.users}명 ({formatCurrency(area.revenue)})</span>
                      </div>
                      <Progress value={(area.users / regionsMax) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </BreakdownState>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}