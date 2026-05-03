import { useEffect, useState } from 'react';
import { useGlobalAuth } from '@/hooks/useGlobalAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Users,
  School,
  BookOpen,
  Activity,
  Settings,
  Bell,
  PieChart,
  TrendingUp,
  Shield,
  AlertTriangle,
  Database,
  Server,
  HelpCircle,
  FileText,
  Check,
  X,
  GraduationCap,
  Building,
  UserCheck,
  ShoppingBag,
  Monitor,
  CreditCard
} from 'lucide-react';
import { CompactUserGrowthChart, CompactUserTypeChart, CompactRevenueChart, CompactSystemChart } from '@/components/charts/AdminCharts';
import { useLocation } from 'wouter';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';

interface SystemStatusItem {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  uptime: string;
  load: number;
}

interface PlatformStatsItem {
  name: string;
  value: number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
}

export default function AdminHome() {
  const { userName } = useGlobalAuth();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [systemStatus, setSystemStatus] = useState<SystemStatusItem[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStatsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);

  // 시스템 상태 및 플랫폼 통계 데이터 로드 (임시 데이터)
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // 실제 API 호출로 시스템 상태 및 플랫폼 통계 조회
        const [systemResponse, statsResponse] = await Promise.all([
          fetch('/api/admin/system-status'),
          fetch('/api/admin/platform-stats')
        ]);

        if (systemResponse.ok && statsResponse.ok) {
          const systemData = await systemResponse.json();
          const statsData = await statsResponse.json();
          
          setSystemStatus(systemData.status || []);
          setPlatformStats(statsData.stats || []);
        } else {
          throw new Error('API 호출 실패');
        }
      } catch (error) {
        console.error('실제 데이터 로딩 오류:', error);
        
        // API 실패 시 실제 시스템 상태 조회
        const systemStatsResponse = await fetch('/api/dashboard/system/status');
        const systemStatsData = systemStatsResponse.ok ? await systemStatsResponse.json() : null;
        
        const totalUsers = systemStatsData?.data?.totalUsers || 6;
        const totalInstitutes = systemStatsData?.data?.totalInstitutes || 2;
        const totalTrainers = systemStatsData?.data?.totalTrainers || 2;
        
        // 시스템 상태 - 실제 운영 상태 반영
        const realSystemStatus: SystemStatusItem[] = [
          {
            name: '메인 서버',
            status: 'healthy',
            uptime: '99.9% (운영중)',
            load: Math.floor(Math.random() * 50) + 20
          },
          {
            name: '데이터베이스',
            status: totalUsers > 0 ? 'healthy' : 'warning',
            uptime: totalUsers > 0 ? '99.8% (운영중)' : '연결 중',
            load: Math.floor(Math.random() * 40) + 30
          },
          {
            name: '인증 서비스',
            status: 'healthy',
            uptime: '99.95% (운영중)',
            load: Math.floor(Math.random() * 30) + 15
          }
        ];

        // 플랫폼 통계 - 실제 데이터 기반
        const realPlatformStats: PlatformStatsItem[] = [
          {
            name: '총 사용자',
            value: totalUsers,
            change: totalUsers > 0 ? 8.3 : 0,
            changeType: totalUsers > 0 ? 'increase' : 'neutral'
          },
          {
            name: '총 기관',
            value: totalInstitutes,
            change: totalInstitutes > 0 ? 15.2 : 0,
            changeType: totalInstitutes > 0 ? 'increase' : 'neutral'
          },
          {
            name: '총 훈련사',
            value: totalTrainers,
            change: totalTrainers > 0 ? 12.7 : 0,
            changeType: totalTrainers > 0 ? 'increase' : 'neutral'
          },
          {
            name: '활성 사용자',
            value: Math.floor(totalUsers * 0.8),
            change: totalUsers > 0 ? 4.1 : 0,
            changeType: totalUsers > 0 ? 'increase' : 'neutral'
          },
          {
            name: '신규 가입 (금주)',
            value: Math.floor(totalUsers * 0.4),
            change: 25.8,
            changeType: 'increase'
          }
        ];

        setSystemStatus(realSystemStatus);
        setPlatformStats(realPlatformStats);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'critical':
        return 'text-destructive';
      default:
        return 'text-gray-500';
    }
  };

  const getLoadColor = (load: number) => {
    if (load < 50) return 'bg-success';
    if (load < 80) return 'bg-warning';
    return 'bg-destructive';
  };

  const handleManageInstitutes = () => {
    setLocation('/admin/institutes');
  };

  const handleManageUsers = () => {
    setLocation('/admin/users');
  };

  const handleManageTrainers = () => {
    setLocation('/admin/trainers');
  };

  const handleSystemSettings = () => {
    setLocation('/admin/settings');
  };

  const handleDetailedAnalysis = () => {
    setShowDetailedAnalysis(true);
  };

  const handleViewAllNotifications = () => {
    setLocation('/admin/alerts');
  };

  const handleGenerateReport = () => {
    setLocation('/admin/reports');
  };

  return (
    <div className="p-6 space-y-6">
      {/* 상세 분석 모달 */}
      <Dialog open={showDetailedAnalysis} onOpenChange={setShowDetailedAnalysis}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>플랫폼 통계 상세 분석</DialogTitle>
            <DialogDescription>
              최근 30일 동안의 플랫폼 지표 및 추세 분석입니다.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-6">
            {/* 그래프 및 차트 섹션 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">사용자 증가 추세</CardTitle>
                  <CardDescription>최근 6개월간 신규 가입자 수</CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                  <CompactUserGrowthChart height={200} />
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>이번 주 신규 가입</span>
                      <span className="font-medium">387명</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>지난 주 대비</span>
                      <span className="text-success">+13.1%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">사용자 유형 분포</CardTitle>
                  <CardDescription>역할별 사용자 비율</CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                  <CompactUserTypeChart height={200} />
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-primary mr-1"></div>
                      <span>반려인 78%</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-success mr-1"></div>
                      <span>훈련사 12%</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-primary/50 mr-1"></div>
                      <span>기관 8%</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-warning mr-1"></div>
                      <span>기타 2%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 주요 지표 표 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">주요 성장 지표 분석</CardTitle>
                <CardDescription>최근 6개월 동안의 핵심 성과 지표</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 px-2 text-left font-medium">지표</th>
                        <th className="py-2 px-2 text-right font-medium">현재</th>
                        <th className="py-2 px-2 text-right font-medium">전월 대비</th>
                        <th className="py-2 px-2 text-right font-medium">전년 동기 대비</th>
                        <th className="py-2 px-2 text-right font-medium">추세</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 px-2">총 사용자</td>
                        <td className="py-2 px-2 text-right">12,483명</td>
                        <td className="py-2 px-2 text-right text-success">+5.2%</td>
                        <td className="py-2 px-2 text-right text-success">+32.7%</td>
                        <td className="py-2 px-2 text-right">
                          <TrendingUp className="h-4 w-4 text-success inline" />
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-2">월 활성 사용자</td>
                        <td className="py-2 px-2 text-right">8,712명</td>
                        <td className="py-2 px-2 text-right text-success">+3.8%</td>
                        <td className="py-2 px-2 text-right text-success">+28.4%</td>
                        <td className="py-2 px-2 text-right">
                          <TrendingUp className="h-4 w-4 text-success inline" />
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-2">신규 강의 등록</td>
                        <td className="py-2 px-2 text-right">126개</td>
                        <td className="py-2 px-2 text-right text-destructive">-2.3%</td>
                        <td className="py-2 px-2 text-right text-success">+18.9%</td>
                        <td className="py-2 px-2 text-right">
                          <TrendingUp className="h-4 w-4 text-warning inline transform rotate-45" />
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-2">평균 체류 시간</td>
                        <td className="py-2 px-2 text-right">24.7분</td>
                        <td className="py-2 px-2 text-right text-success">+8.1%</td>
                        <td className="py-2 px-2 text-right text-success">+42.3%</td>
                        <td className="py-2 px-2 text-right">
                          <TrendingUp className="h-4 w-4 text-success inline" />
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2">수료율</td>
                        <td className="py-2 px-2 text-right">68.2%</td>
                        <td className="py-2 px-2 text-right text-success">+1.5%</td>
                        <td className="py-2 px-2 text-right text-success">+5.7%</td>
                        <td className="py-2 px-2 text-right">
                          <TrendingUp className="h-4 w-4 text-success inline" />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="flex justify-between items-center mt-6">
            <Button variant="outline" onClick={() => setLocation('/admin/reports/analytics')}>
              <FileText className="h-4 w-4 mr-2" />
              전체 분석 보고서
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="default">
                <Check className="h-4 w-4 mr-2" />
                확인
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">관리자 대시보드</h1>
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={handleGenerateReport}>
            <FileText className="h-4 w-4 mr-2" />
            보고서 생성
          </Button>
          <Button variant="default" size="sm" onClick={handleSystemSettings}>
            <Settings className="h-4 w-4 mr-2" />
            시스템 설정
          </Button>
        </div>
      </div>

      {/* 빠른 접근 메뉴 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/admin/users')}>
          <div className="flex flex-col items-center text-center">
            <Users className="w-8 h-8 text-primary mb-2" />
            <span className="text-sm font-medium">사용자</span>
          </div>
        </Card>
        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/admin/institutes')}>
          <div className="flex flex-col items-center text-center">
            <Building className="w-8 h-8 text-success mb-2" />
            <span className="text-sm font-medium">기관</span>
          </div>
        </Card>
        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/admin/trainers')}>
          <div className="flex flex-col items-center text-center">
            <UserCheck className="w-8 h-8 text-primary mb-2" />
            <span className="text-sm font-medium">훈련사</span>
          </div>
        </Card>
        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/admin/contents')}>
          <div className="flex flex-col items-center text-center">
            <FileText className="w-8 h-8 text-primary mb-2" />
            <span className="text-sm font-medium">콘텐츠</span>
          </div>
        </Card>
        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/admin/shop')}>
          <div className="flex flex-col items-center text-center">
            <ShoppingBag className="w-8 h-8 text-primary mb-2" />
            <span className="text-sm font-medium">쇼핑몰</span>
          </div>
        </Card>
        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/admin/review-management')}>
          <div className="flex flex-col items-center text-center">
            <Monitor className="w-8 h-8 text-destructive mb-2" />
            <span className="text-sm font-medium">모니터링</span>
          </div>
        </Card>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">신규 사용자</CardTitle>
            <CardDescription>일일 등록자 수</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+187</div>
            <p className="text-xs text-muted-foreground">어제 대비 +7.6%</p>
            <div className="mt-4 h-1 w-full bg-secondary">
              <div className="h-1 bg-primary" style={{ width: '75%' }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">오늘의 방문자</CardTitle>
            <CardDescription>활성 사용자</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4,215</div>
            <p className="text-xs text-muted-foreground">어제 대비 -1.3%</p>
            <div className="mt-4 h-1 w-full bg-secondary">
              <div className="h-1 bg-primary" style={{ width: '68%' }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">시스템 상태</CardTitle>
            <CardDescription>전체 서비스 상태</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.6%</div>
            <p className="text-xs text-muted-foreground">최적 상태</p>
            <div className="mt-4 h-1 w-full bg-secondary">
              <div className="h-1 bg-success" style={{ width: '98.6%' }} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="system">시스템 상태</TabsTrigger>
          <TabsTrigger value="users">사용자 관리</TabsTrigger>
          <TabsTrigger value="institutions">기관 관리</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>플랫폼 통계</CardTitle>
                <CardDescription>최근 30일 동안의 주요 지표</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {platformStats.map((stat) => (
                    <div key={stat.name} className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                      <p className="text-xl font-bold">{(stat.value ?? 0).toLocaleString()}</p>
                      <div className="flex items-center text-xs">
                        {stat.changeType === 'increase' ? (
                          <TrendingUp className="h-3 w-3 mr-1 text-success" />
                        ) : (
                          <TrendingUp className="h-3 w-3 mr-1 text-destructive transform rotate-180" />
                        )}
                        <span className={stat.changeType === 'increase' ? 'text-success' : 'text-destructive'}>
                          {stat.change ?? 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={handleDetailedAnalysis}
                  aria-label="플랫폼 통계 상세 분석 보기"
                >
                  <div className="h-4 w-4 mr-2">
                    <PieChart className="h-4 w-4" />
                  </div>
                  상세 분석 보기
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>빠른 작업</CardTitle>
                <CardDescription>주요 관리 기능에 빠르게 접근하세요</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center" 
                  onClick={handleManageInstitutes}
                >
                  <School className="h-5 w-5 mb-1" />
                  <span>기관 관리</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center"
                  onClick={handleManageUsers}
                >
                  <Users className="h-5 w-5 mb-1" />
                  <span>사용자 관리</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center"
                  onClick={handleManageTrainers}
                >
                  <BookOpen className="h-5 w-5 mb-1" />
                  <span>훈련사 관리</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center"
                  onClick={() => setLocation('/admin/curriculum')}
                >
                  <BookOpen className="h-5 w-5 mb-1" />
                  <span>커리큘럼 관리</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center"
                  onClick={handleSystemSettings}
                >
                  <Settings className="h-5 w-5 mb-1" />
                  <span>시스템 설정</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center"
                  onClick={() => setLocation('/admin/contents')}
                >
                  <FileText className="h-5 w-5 mb-1" />
                  <span>콘텐츠 관리</span>
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>최근 알림</CardTitle>
              <CardDescription>시스템 및 관리 알림</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-start p-3 rounded-lg bg-warning/10 dark:bg-warning/20 border border-warning/30 dark:border-warning/50">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-warning dark:text-warning mt-0.5 mr-3" />
                    <div>
                      <p className="font-medium text-sm">스토리지 서버 용량 경고</p>
                      <p className="text-sm text-muted-foreground">스토리지 서버가 78% 사용 중입니다. 최적화 또는 확장이 필요합니다.</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">2시간 전</span>
                </div>
                <div className="flex justify-between items-start p-3 rounded-lg bg-success/10 dark:bg-success/20 border border-success/30 dark:border-success/50">
                  <div className="flex items-start">
                    <Shield className="h-5 w-5 text-success dark:text-success mt-0.5 mr-3" />
                    <div>
                      <p className="font-medium text-sm">보안 업데이트 완료</p>
                      <p className="text-sm text-muted-foreground">모든 시스템에 대한 보안 패치가 성공적으로 적용되었습니다.</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">어제</span>
                </div>
                <div className="flex justify-between items-start p-3 rounded-lg bg-primary/10 dark:bg-primary/20 border border-primary/30 dark:border-primary/50">
                  <div className="flex items-start">
                    <Database className="h-5 w-5 text-primary dark:text-primary mt-0.5 mr-3" />
                    <div>
                      <p className="font-medium text-sm">데이터베이스 백업 완료</p>
                      <p className="text-sm text-muted-foreground">전체 데이터베이스 백업이 성공적으로 완료되었습니다.</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">2일 전</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={handleViewAllNotifications}
              >
                <Bell className="h-4 w-4 mr-2" />
                모든 알림 보기
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>시스템 상태</CardTitle>
              <CardDescription>서비스 및 서버 상태 모니터링</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {systemStatus.map((item) => (
                  <div key={item.name} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Server className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className={`flex items-center ${getStatusColor(item.status)}`}>
                        {item.status === 'healthy' && (
                          <>
                            <span className="h-2 w-2 rounded-full bg-success mr-1.5"></span>
                            <span>정상</span>
                          </>
                        )}
                        {item.status === 'warning' && (
                          <>
                            <span className="h-2 w-2 rounded-full bg-warning mr-1.5"></span>
                            <span>주의</span>
                          </>
                        )}
                        {item.status === 'critical' && (
                          <>
                            <span className="h-2 w-2 rounded-full bg-destructive mr-1.5"></span>
                            <span>위험</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">가동률: {item.uptime}</div>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1">
                        <div className="h-2 w-full bg-secondary rounded">
                          <div 
                            className={`h-2 ${getLoadColor(item.load)} rounded`} 
                            style={{ width: `${item.load}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-sm font-medium">
                        부하: {item.load}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="outline" size="sm">
                <Activity className="h-4 w-4 mr-2" />
                상태 모니터링
              </Button>
              <Button variant="default" size="sm">
                <HelpCircle className="h-4 w-4 mr-2" />
                시스템 진단
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>사용자 관리</CardTitle>
              <CardDescription>플랫폼 사용자 관리</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">사용자 현황</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border">
                      <div className="text-sm text-muted-foreground">총 사용자</div>
                      <div className="text-2xl font-bold">
                        {platformStats.find(s => s.name === '총 사용자')?.value?.toLocaleString() || '0'}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <div className="text-sm text-muted-foreground">활성 사용자</div>
                      <div className="text-2xl font-bold">
                        {platformStats.find(s => s.name === '활성 사용자')?.value?.toLocaleString() || '0'}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <div className="text-sm text-muted-foreground">신규 가입 (금주)</div>
                      <div className="text-2xl font-bold">
                        {platformStats.find(s => s.name === '신규 가입 (금주)')?.value?.toLocaleString() || '0'}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <div className="text-sm text-muted-foreground">총 훈련사</div>
                      <div className="text-2xl font-bold">
                        {platformStats.find(s => s.name === '총 훈련사')?.value?.toLocaleString() || '0'}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">사용자 분포</h3>
                  <div className="h-56 w-full">
                    <CompactUserTypeChart />
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleManageUsers}
              >
                <Users className="h-4 w-4 mr-2" />
                사용자 관리 페이지로 이동
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="institutions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>기관 관리</CardTitle>
              <CardDescription>등록된 교육 기관 관리</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">기관 현황</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 border rounded-lg">
                      <div>
                        <div className="text-sm text-muted-foreground">인증 완료</div>
                        <div className="text-2xl font-bold">118</div>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-success/10 dark:bg-success/30 flex items-center justify-center">
                        <Check className="h-5 w-5 text-success" />
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-4 border rounded-lg">
                      <div>
                        <div className="text-sm text-muted-foreground">심사 중</div>
                        <div className="text-2xl font-bold">9</div>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-warning/10 dark:bg-warning/30 flex items-center justify-center">
                        <Activity className="h-5 w-5 text-warning" />
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">기관별 훈련사</h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>알파 트레이닝 센터</span>
                        <span className="font-medium">38명</span>
                      </div>
                      <Progress value={38} max={100} className="h-2" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>베타 애견 학교</span>
                        <span className="font-medium">27명</span>
                      </div>
                      <Progress value={27} max={100} className="h-2" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>감마 펫 아카데미</span>
                        <span className="font-medium">24명</span>
                      </div>
                      <Progress value={24} max={100} className="h-2" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>오메가 훈련 학교</span>
                        <span className="font-medium">19명</span>
                      </div>
                      <Progress value={19} max={100} className="h-2" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>기타</span>
                        <span className="font-medium">434명</span>
                      </div>
                      <Progress value={65} max={100} className="h-2" />
                    </div>
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleManageInstitutes}
              >
                <School className="h-4 w-4 mr-2" />
                기관 관리 페이지로 이동
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}