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

  const { data: stats, isLoading, isError, error, refetch, isRefetching } = useQuery<AdminDashboardStats>({
    queryKey: ['/api/admin/dashboard/stats', timeRange, isCustom ? customStart : '', isCustom ? customEnd : ''],
    queryFn: async () => {
      const params = new URLSearchParams({ period: timeRange });
      if (isCustom) {
        params.set('startDate', new Date(customStart).toISOString());
        params.set('endDate', new Date(customEnd + 'T23:59:59').toISOString());
      }
      const res = await fetch(`/api/admin/dashboard/stats?${params.toString()}`, {
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

  const handleRefresh = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard/stats'] });
      await refetch();
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
          <p className={`text-xs flex items-center ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
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
        <Card className="border-amber-300">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 text-amber-500" />
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
                <CardDescription>월별 신규 사용자 및 활성 사용자</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>1월</span>
                      <span>45명 / 28명 활성</span>
                    </div>
                    <Progress value={62} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>2월</span>
                      <span>52명 / 34명 활성</span>
                    </div>
                    <Progress value={65} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>3월</span>
                      <span>68명 / 41명 활성</span>
                    </div>
                    <Progress value={60} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>4월</span>
                      <span>79명 / 52명 활성</span>
                    </div>
                    <Progress value={66} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>5월</span>
                      <span>98명 / 63명 활성</span>
                    </div>
                    <Progress value={64} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>6월</span>
                      <span>123명 / 78명 활성</span>
                    </div>
                    <Progress value={63} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>7월</span>
                      <span>156명 / 89명 활성</span>
                    </div>
                    <Progress value={57} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  훈련 카테고리 분포
                </CardTitle>
                <CardDescription>훈련 유형별 비율</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#2BAA61' }}></div>
                      <span className="text-sm">기본 훈련</span>
                    </div>
                    <Badge>35%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#FFA726' }}></div>
                      <span className="text-sm">문제행동 교정</span>
                    </div>
                    <Badge>28%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#29B5F6' }}></div>
                      <span className="text-sm">고급 훈련</span>
                    </div>
                    <Badge>20%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#E74D3C' }}></div>
                      <span className="text-sm">사회화 훈련</span>
                    </div>
                    <Badge>17%</Badge>
                  </div>
                </div>
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
              <div className="space-y-4">
                {[
                  { month: '1월', total: 1200000, training: 800000 },
                  { month: '2월', total: 1450000, training: 950000 },
                  { month: '3월', total: 1680000, training: 1120000 },
                  { month: '4월', total: 1950000, training: 1340000 },
                  { month: '5월', total: 2200000, training: 1580000 },
                  { month: '6월', total: 2650000, training: 1890000 },
                  { month: '7월', total: 2950000, training: 2100000 }
                ].map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{item.month}</span>
                      <span>{formatCurrency(item.total)} (훈련: {formatCurrency(item.training)})</span>
                    </div>
                    <div className="relative">
                      <Progress value={(item.total / 3000000) * 100} className="h-3" />
                      <div 
                        className="absolute top-0 left-0 h-3 bg-green-500 rounded-full"
                        style={{ width: `${(item.training / 3000000) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
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
                <div className="space-y-4">
                  {[
                    { age: '20-30세', count: 45, percentage: 29 },
                    { age: '31-40세', count: 62, percentage: 40 },
                    { age: '41-50세', count: 38, percentage: 24 },
                    { age: '51-60세', count: 11, percentage: 7 }
                  ].map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{item.age}</span>
                        <span>{item.count}명 ({item.percentage}%)</span>
                      </div>
                      <Progress value={item.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>사용자 활동 패턴</CardTitle>
                <CardDescription>시간대별 접속 현황</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">아침 (06-12시)</span>
                    <Badge variant="secondary">24%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">오후 (12-18시)</span>
                    <Badge variant="secondary">35%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">저녁 (18-24시)</span>
                    <Badge variant="secondary">31%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">새벽 (00-06시)</span>
                    <Badge variant="secondary">10%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>사용자 참여도 지표</CardTitle>
              <CardDescription>핵심 지표별 성과</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: '앱 사용 빈도', value: 85 },
                  { label: '훈련 참여율', value: 78 },
                  { label: '구매 전환율', value: 65 },
                  { label: '리뷰 작성율', value: 42 },
                  { label: '추천 점수', value: 89 },
                  { label: '재방문율', value: 76 }
                ].map((metric, index) => (
                  <div key={index} className="text-center space-y-2">
                    <div className="text-2xl font-bold">{metric.value}%</div>
                    <div className="text-sm text-muted-foreground">{metric.label}</div>
                    <Progress value={metric.value} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 수익 탭 */}
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>월별 상세 수익 분석</CardTitle>
              <CardDescription>카테고리별 수익 추이</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>수익 성장률</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">+23.1%</div>
                    <p className="text-xs text-muted-foreground">전월 대비</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>평균 주문 가격</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(66000)}</div>
                    <p className="text-xs text-muted-foreground">+8.5% 전월 대비</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>고객 생애 가치</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(324000)}</div>
                    <p className="text-xs text-muted-foreground">+15.2% 전월 대비</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 훈련 탭 */}
        <TabsContent value="training" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>훈련 완료율</CardTitle>
                <CardDescription>카테고리별 완료 현황</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: '기본 훈련', completion: 70, color: '#2BAA61' },
                    { name: '문제행동 교정', completion: 56, color: '#FFA726' },
                    { name: '고급 훈련', completion: 40, color: '#29B5F6' },
                    { name: '사회화 훈련', completion: 34, color: '#E74D3C' }
                  ].map((category, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{category.name}</span>
                        <span>{category.completion}%</span>
                      </div>
                      <Progress value={category.completion} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>훈련사 성과</CardTitle>
                <CardDescription>상위 훈련사 랭킹</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: '김지연 훈련사', sessions: 45, rating: 4.9 },
                    { name: '박민수 훈련사', sessions: 38, rating: 4.8 },
                    { name: '이서현 훈련사', sessions: 32, rating: 4.7 },
                    { name: '최동훈 훈련사', sessions: 28, rating: 4.6 }
                  ].map((trainer, index) => (
                    <div key={index} className="flex justify-between items-center p-2 rounded-lg border">
                      <div>
                        <p className="font-medium text-sm">{trainer.name}</p>
                        <p className="text-xs text-muted-foreground">세션: {trainer.sessions}회</p>
                      </div>
                      <Badge>{trainer.rating}⭐</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 지역 탭 */}
        <TabsContent value="geography" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>지역별 사용자 및 수익</CardTitle>
              <CardDescription>주요 지역 분석</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { region: '서울', users: 67, revenue: 8900000, percentage: 43 },
                  { region: '경기', users: 45, revenue: 5600000, percentage: 29 },
                  { region: '부산', users: 23, revenue: 2800000, percentage: 15 },
                  { region: '대구', users: 15, revenue: 1900000, percentage: 10 },
                  { region: '기타', users: 6, revenue: 750000, percentage: 3 }
                ].map((area, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{area.region}</span>
                      <span>{area.users}명 ({formatCurrency(area.revenue)})</span>
                    </div>
                    <Progress value={area.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}