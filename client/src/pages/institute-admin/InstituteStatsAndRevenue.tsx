import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Download, 
  TrendingUp, 
  RefreshCw,
  Calendar,
  Loader2,
  BarChart3,
  PieChart,
  LineChart,
  Users,
  UserRoundCheck,
  BadgeCheck,
  BookOpen,
  DollarSign,
  PlusCircle,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  ArrowUp,
  ArrowDown,
  PawPrint,
  FileBarChart
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

// 월별 수익 데이터 인터페이스
interface MonthlyRevenue {
  month: string;
  강습료: number;
  위탁교육: number;
  상품판매: number;
  total: number;
}

// 수업 유형별 데이터
interface CourseTypeData {
  name: string;
  value: number;
  color: string;
}

// 훈련사 성과 데이터
interface TrainerPerformance {
  id: number;
  name: string;
  image?: string;
  students: number;
  rating: number;
  completionRate: number;
  revenue: number;
  courses: number;
  revenueChange: number;
}

// 인기 강좌 데이터
interface PopularCourse {
  id: number;
  name: string;
  enrollments: number;
  rating: number;
  revenue: number;
  trainerName: string;
}

// 통계 요약 데이터
interface StatsSummary {
  name: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  icon: any;
}

export default function InstituteStatsAndRevenue() {
  const { userName } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('month');
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  
  // 데이터 상태
  const [revenueData, setRevenueData] = useState<MonthlyRevenue[]>([]);
  const [courseTypeData, setCourseTypeData] = useState<CourseTypeData[]>([]);
  const [trainerPerformance, setTrainerPerformance] = useState<TrainerPerformance[]>([]);
  const [popularCourses, setPopularCourses] = useState<PopularCourse[]>([]);
  const [statsSummary, setStatsSummary] = useState<StatsSummary[]>([]);
  
  // 임시 데이터 로딩
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // 실제 API 구현 시 이 부분을 API 호출로 대체
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 임시 월별 수익 데이터
        const mockRevenueData: MonthlyRevenue[] = [
          { month: '1월', 강습료: 4500000, 위탁교육: 2500000, 상품판매: 1000000, total: 8000000 },
          { month: '2월', 강습료: 5000000, 위탁교육: 2800000, 상품판매: 1200000, total: 9000000 },
          { month: '3월', 강습료: 5200000, 위탁교육: 3000000, 상품판매: 1500000, total: 9700000 },
          { month: '4월', 강습료: 5500000, 위탁교육: 3200000, 상품판매: 1800000, total: 10500000 },
          { month: '5월', 강습료: 6000000, 위탁교육: 3500000, 상품판매: 2000000, total: 11500000 },
          { month: '6월', 강습료: 5800000, 위탁교육: 3300000, 상품판매: 1900000, total: 11000000 },
        ];
        
        // 임시 수업 유형별 데이터
        const mockCourseTypeData: CourseTypeData[] = [
          { name: '기초 훈련', value: 35, color: 'hsl(var(--secondary))' },
          { name: '문제행동 교정', value: 25, color: 'hsl(var(--success))' },
          { name: '사회화', value: 20, color: 'hsl(var(--warning))' },
          { name: '특수 훈련', value: 15, color: 'hsl(var(--primary))' },
          { name: '어질리티', value: 5, color: 'hsl(var(--primary))' },
        ];
        
        // 임시 훈련사 성과 데이터
        const mockTrainerPerformance: TrainerPerformance[] = [
          { 
            id: 1, 
            name: '김영수', 
            students: 28, 
            rating: 4.8, 
            completionRate: 92, 
            revenue: 3500000, 
            courses: 4,
            revenueChange: 12 
          },
          { 
            id: 2, 
            name: '박지민', 
            students: 22, 
            rating: 4.7, 
            completionRate: 89, 
            revenue: 2800000, 
            courses: 3,
            revenueChange: 8 
          },
          { 
            id: 3, 
            name: '이하은', 
            students: 18, 
            rating: 4.9, 
            completionRate: 94, 
            revenue: 2200000, 
            courses: 2,
            revenueChange: 15 
          },
          { 
            id: 4, 
            name: '최준호', 
            students: 15, 
            rating: 4.5, 
            completionRate: 85, 
            revenue: 1800000, 
            courses: 2,
            revenueChange: -3 
          },
        ];
        
        // 임시 인기 강좌 데이터
        const mockPopularCourses: PopularCourse[] = [
          { 
            id: 1, 
            name: '기초 복종 훈련 A반', 
            enrollments: 15, 
            rating: 4.7, 
            revenue: 3000000,
            trainerName: '김영수'
          },
          { 
            id: 2, 
            name: '문제행동 교정 심화 과정', 
            enrollments: 8, 
            rating: 4.8, 
            revenue: 2400000,
            trainerName: '이하은'
          },
          { 
            id: 3, 
            name: '사회화 트레이닝', 
            enrollments: 12, 
            rating: 4.6, 
            revenue: 1800000,
            trainerName: '박지민'
          },
          { 
            id: 4, 
            name: '반려견 매너 교실', 
            enrollments: 18, 
            rating: 4.5, 
            revenue: 1800000,
            trainerName: '김영수'
          },
        ];
        
        // 임시 통계 요약 데이터
        const mockStatsSummary: StatsSummary[] = [
          { 
            name: '총 매출', 
            value: 28700000, 
            change: 12.5, 
            trend: 'up', 
            icon: DollarSign 
          },
          { 
            name: '활성 수강생', 
            value: 83, 
            change: 8.2, 
            trend: 'up', 
            icon: Users 
          },
          { 
            name: '신규 등록', 
            value: 24, 
            change: 15.3, 
            trend: 'up', 
            icon: PlusCircle 
          },
          { 
            name: '완료된 코스', 
            value: 12, 
            change: -5.2, 
            trend: 'down', 
            icon: BadgeCheck 
          },
        ];
        
        setRevenueData(mockRevenueData);
        setCourseTypeData(mockCourseTypeData);
        setTrainerPerformance(mockTrainerPerformance);
        setPopularCourses(mockPopularCourses);
        setStatsSummary(mockStatsSummary);
      } catch (error) {
        toast({
          title: "데이터 로딩 오류",
          description: "통계 정보를 불러오는 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [toast]);
  
  // 날짜 범위 변경 핸들러
  const handleDateRangeChange = (range: string) => {
    setIsLoadingChart(true);
    setDateRange(range);
    
    // 실제 구현에서는 API 호출로 데이터 가져오기
    setTimeout(() => {
      setIsLoadingChart(false);
    }, 800);
  };
  
  // 데이터 새로고침 핸들러
  const handleRefresh = () => {
    setIsLoading(true);
    
    // 실제 구현에서는 API 호출로 데이터 가져오기
    setTimeout(() => {
      toast({
        title: "데이터 새로고침",
        description: "통계 정보가 업데이트되었습니다.",
      });
      setIsLoading(false);
    }, 1000);
  };
  
  // 보고서 다운로드 핸들러
  const handleDownloadReport = () => {
    toast({
      title: "보고서 다운로드",
      description: "보고서가 다운로드되었습니다.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">통계 데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">통계 및 수익</h1>
          <p className="text-muted-foreground mt-1">기관의 성과와 수익을 분석합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="기간 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">주간</SelectItem>
              <SelectItem value="month">월간</SelectItem>
              <SelectItem value="quarter">분기</SelectItem>
              <SelectItem value="year">연간</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          <Button variant="outline" onClick={handleDownloadReport}>
            <Download className="h-4 w-4 mr-2" />
            보고서
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statsSummary.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{stat.name}</p>
                  <h3 className="text-2xl font-bold">
                    {stat.name === '총 매출' 
                      ? `${(stat.value / 10000).toLocaleString()}만원` 
                      : stat.value.toLocaleString()}
                  </h3>
                </div>
                <div className={`p-2 rounded-full ${
                  stat.trend === 'up' 
                    ? 'bg-success/10 text-success dark:bg-success/30 dark:text-success' 
                    : stat.trend === 'down' 
                      ? 'bg-destructive/10 text-destructive dark:bg-destructive/30 dark:text-destructive' 
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <div className={`${
                  stat.trend === 'up' 
                    ? 'text-success dark:text-success' 
                    : stat.trend === 'down' 
                      ? 'text-destructive dark:text-destructive' 
                      : 'text-gray-600 dark:text-gray-400'
                } flex items-center text-sm`}>
                  {stat.trend === 'up' 
                    ? <ArrowUp className="h-3 w-3 mr-1" /> 
                    : stat.trend === 'down' 
                      ? <ArrowDown className="h-3 w-3 mr-1" /> 
                      : null}
                  {Math.abs(stat.change)}%
                </div>
                <span className="text-xs text-muted-foreground ml-2">vs 지난 {dateRange}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="revenue">수익 분석</TabsTrigger>
          <TabsTrigger value="trainers">훈련사 성과</TabsTrigger>
          <TabsTrigger value="courses">강좌 분석</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg">월별 수익 현황</CardTitle>
                    <CardDescription>최근 6개월간 수익 흐름</CardDescription>
                  </div>
                  {isLoadingChart && (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs text-muted-foreground">로딩 중</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" />
                      <YAxis 
                        tickFormatter={(value) => `${value / 1000000}M`} 
                        width={45}
                      />
                      <Tooltip 
                        formatter={(value: number) => [
                          `${value.toLocaleString()}원`, 
                          ''
                        ]}
                        labelFormatter={(label) => `${label} 수익`}
                      />
                      <Legend />
                      <Bar dataKey="강습료" fill="hsl(var(--secondary))" />
                      <Bar dataKey="위탁교육" fill="hsl(var(--success))" />
                      <Bar dataKey="상품판매" fill="hsl(var(--warning))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">수업 유형별 분포</CardTitle>
                <CardDescription>현재 진행 중인 수업 유형 비율</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center">
                  <div className="w-full max-w-xs mx-auto">
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsPieChart>
                        <Pie
                          data={courseTypeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {courseTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [`${value}%`, '']}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">인기 강좌</CardTitle>
                <CardDescription>등록률이 높은 강좌 목록</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {popularCourses.map((course, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center mr-4">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-medium">{course.name}</h4>
                            <p className="text-sm text-muted-foreground">강사: {course.trainerName}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right mr-4">
                        <div className="font-medium">{course.enrollments}명</div>
                        <div className="text-sm text-muted-foreground">등록</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{(course.revenue / 10000).toLocaleString()}만원</div>
                        <div className="text-sm text-muted-foreground">수익</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">상위 훈련사</CardTitle>
                <CardDescription>수익 기준 상위 훈련사</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {trainerPerformance
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 3)
                    .map((trainer, index) => (
                      <div key={index} className="flex items-center">
                        <Avatar className="h-12 w-12 mr-4">
                          <AvatarImage src={trainer.image} alt={trainer.name} />
                          <AvatarFallback>{trainer.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{trainer.name}</h4>
                            <span className={`text-sm ${
                              trainer.revenueChange > 0 
                                ? 'text-success dark:text-success' 
                                : 'text-destructive dark:text-destructive'
                            }`}>
                              {trainer.revenueChange > 0 ? '+' : ''}{trainer.revenueChange}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-muted-foreground">{trainer.students}명 학생</p>
                            <p className="text-sm font-medium">{(trainer.revenue / 10000).toLocaleString()}만원</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  <Button variant="outline" className="w-full" size="sm">
                    <UserRoundCheck className="h-4 w-4 mr-2" />
                    모든 훈련사 보기
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="revenue" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">수익원 비교</CardTitle>
                <CardDescription>카테고리별 수익 분석</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" />
                      <YAxis 
                        tickFormatter={(value) => `${value / 1000000}M`} 
                        width={45}
                      />
                      <Tooltip 
                        formatter={(value: number) => [
                          `${value.toLocaleString()}원`, 
                          ''
                        ]}
                        labelFormatter={(label) => `${label} 수익`}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="강습료" stackId="1" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" />
                      <Area type="monotone" dataKey="위탁교육" stackId="1" stroke="hsl(var(--success))" fill="hsl(var(--success))" />
                      <Area type="monotone" dataKey="상품판매" stackId="1" stroke="hsl(var(--warning))" fill="hsl(var(--warning))" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">수익 추세</CardTitle>
                <CardDescription>월별 총 수익 추세</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart
                      data={revenueData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" />
                      <YAxis 
                        tickFormatter={(value) => `${value / 1000000}M`} 
                        width={45}
                      />
                      <Tooltip 
                        formatter={(value: number) => [
                          `${value.toLocaleString()}원`, 
                          ''
                        ]}
                        labelFormatter={(label) => `${label} 수익`}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="total" 
                        stroke="hsl(var(--secondary))" 
                        activeDot={{ r: 8 }} 
                        name="총 수익"
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-lg">강습료</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-3xl font-bold mb-2">
                  {(revenueData.reduce((sum, item) => sum + item.강습료, 0) / 10000).toLocaleString()}만원
                </div>
                <div className="text-sm text-success dark:text-success flex items-center justify-center">
                  <ArrowUp className="h-3 w-3 mr-1" />
                  <span>12.3% 증가</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">vs 지난 {dateRange}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-lg">위탁교육</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-3xl font-bold mb-2">
                  {(revenueData.reduce((sum, item) => sum + item.위탁교육, 0) / 10000).toLocaleString()}만원
                </div>
                <div className="text-sm text-success dark:text-success flex items-center justify-center">
                  <ArrowUp className="h-3 w-3 mr-1" />
                  <span>8.7% 증가</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">vs 지난 {dateRange}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-lg">상품판매</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-3xl font-bold mb-2">
                  {(revenueData.reduce((sum, item) => sum + item.상품판매, 0) / 10000).toLocaleString()}만원
                </div>
                <div className="text-sm text-success dark:text-success flex items-center justify-center">
                  <ArrowUp className="h-3 w-3 mr-1" />
                  <span>15.2% 증가</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">vs 지난 {dateRange}</p>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">상세 수익 내역</CardTitle>
              <CardDescription>월별 항목별 상세 수익</CardDescription>
            </CardHeader>
            <CardContent>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">기간</th>
                    <th className="text-right py-3 px-2">강습료</th>
                    <th className="text-right py-3 px-2">위탁교육</th>
                    <th className="text-right py-3 px-2">상품판매</th>
                    <th className="text-right py-3 px-2">총 수익</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueData.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-3 px-2">{item.month}</td>
                      <td className="text-right py-3 px-2">{item.강습료.toLocaleString()}원</td>
                      <td className="text-right py-3 px-2">{item.위탁교육.toLocaleString()}원</td>
                      <td className="text-right py-3 px-2">{item.상품판매.toLocaleString()}원</td>
                      <td className="text-right py-3 px-2 font-medium">{item.total.toLocaleString()}원</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/50">
                    <td className="py-3 px-2 font-medium">합계</td>
                    <td className="text-right py-3 px-2 font-medium">
                      {revenueData.reduce((sum, item) => sum + item.강습료, 0).toLocaleString()}원
                    </td>
                    <td className="text-right py-3 px-2 font-medium">
                      {revenueData.reduce((sum, item) => sum + item.위탁교육, 0).toLocaleString()}원
                    </td>
                    <td className="text-right py-3 px-2 font-medium">
                      {revenueData.reduce((sum, item) => sum + item.상품판매, 0).toLocaleString()}원
                    </td>
                    <td className="text-right py-3 px-2 font-medium">
                      {revenueData.reduce((sum, item) => sum + item.total, 0).toLocaleString()}원
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                엑셀 다운로드
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="trainers" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">훈련사별 성과</CardTitle>
                <CardDescription>수익 및 학생 수 기준 성과 분석</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={trainerPerformance}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={60} />
                      <Tooltip 
                        formatter={(value: number, name) => [
                          name === 'revenue' 
                            ? `${value.toLocaleString()}원` 
                            : `${value}${name === 'completionRate' ? '%' : '명'}`, 
                          name === 'revenue' 
                            ? '수익' 
                            : name === 'students' 
                              ? '학생 수' 
                              : name === 'completionRate' 
                                ? '완료율' 
                                : name
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="revenue" name="수익" fill="hsl(var(--secondary))" />
                      <Bar dataKey="students" name="학생 수" fill="hsl(var(--success))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">평균 완료율</CardTitle>
                <CardDescription>훈련사별 교육 과정 완료율</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trainerPerformance.map((trainer, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between items-center mb-1">
                        <div className="font-medium text-sm flex items-center">
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarImage src={trainer.image} alt={trainer.name} />
                            <AvatarFallback>{trainer.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          {trainer.name}
                        </div>
                        <span className="text-sm">{trainer.completionRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-primary h-full" 
                          style={{ width: `${trainer.completionRate}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">훈련사 상세 성과</CardTitle>
              <CardDescription>숫자로 보는 훈련사 성과 및 수익</CardDescription>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">훈련사</th>
                    <th className="text-center py-3 px-2">수업 수</th>
                    <th className="text-center py-3 px-2">학생 수</th>
                    <th className="text-center py-3 px-2">완료율</th>
                    <th className="text-center py-3 px-2">평점</th>
                    <th className="text-right py-3 px-2">수익</th>
                    <th className="text-right py-3 px-2">증감률</th>
                  </tr>
                </thead>
                <tbody>
                  {trainerPerformance.map((trainer, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-3 px-2">
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage src={trainer.image} alt={trainer.name} />
                            <AvatarFallback>{trainer.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          {trainer.name}
                        </div>
                      </td>
                      <td className="text-center py-3 px-2">{trainer.courses}</td>
                      <td className="text-center py-3 px-2">{trainer.students}</td>
                      <td className="text-center py-3 px-2">{trainer.completionRate}%</td>
                      <td className="text-center py-3 px-2">{trainer.rating.toFixed(1)}</td>
                      <td className="text-right py-3 px-2">{trainer.revenue.toLocaleString()}원</td>
                      <td className="text-right py-3 px-2">
                        <span className={`inline-flex items-center ${
                          trainer.revenueChange > 0 
                            ? 'text-success dark:text-success' 
                            : 'text-destructive dark:text-destructive'
                        }`}>
                          {trainer.revenueChange > 0 
                            ? <ArrowUp className="h-3 w-3 mr-1" /> 
                            : <ArrowDown className="h-3 w-3 mr-1" />}
                          {Math.abs(trainer.revenueChange)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button variant="outline" size="sm">
                <FileBarChart className="h-4 w-4 mr-2" />
                훈련사 분석 보고서
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="courses" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">과정별 학생 등록 현황</CardTitle>
                <CardDescription>인기 과정별 학생 수</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={popularCourses}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number, name) => [
                          name === 'revenue' 
                            ? `${value.toLocaleString()}원` 
                            : name === 'enrollments'
                              ? `${value}명`
                              : value, 
                          name === 'revenue' 
                            ? '수익' 
                            : name === 'enrollments' 
                              ? '등록 수' 
                              : name
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="enrollments" name="등록 수" fill="hsl(var(--secondary))" />
                      <Bar dataKey="rating" name="평점" fill="hsl(var(--success))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">과정별 수익 기여도</CardTitle>
                <CardDescription>수익 기준 상위 과정</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={popularCourses}
                        dataKey="revenue"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="hsl(var(--secondary))"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {popularCourses.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['hsl(var(--secondary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--primary))'][index % 4]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value.toLocaleString()}원`, '']}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">과정 분석 대시보드</CardTitle>
              <CardDescription>모든 과정의 성과 지표</CardDescription>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">과정명</th>
                    <th className="text-left py-3 px-2">담당 훈련사</th>
                    <th className="text-center py-3 px-2">등록 인원</th>
                    <th className="text-center py-3 px-2">평점</th>
                    <th className="text-center py-3 px-2">완료율</th>
                    <th className="text-right py-3 px-2">수익</th>
                  </tr>
                </thead>
                <tbody>
                  {popularCourses.map((course, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-3 px-2">
                        <div className="font-medium">{course.name}</div>
                      </td>
                      <td className="py-3 px-2">{course.trainerName}</td>
                      <td className="text-center py-3 px-2">{course.enrollments}명</td>
                      <td className="text-center py-3 px-2">
                        <div className="flex items-center justify-center">
                          <span className="mr-1">{course.rating.toFixed(1)}</span>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-warning">
                            <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                            <div 
                              className="bg-primary h-full rounded-full" 
                              style={{ width: `${75 + index * 5}%` }}
                            ></div>
                          </div>
                          <span>{75 + index * 5}%</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-2">{course.revenue.toLocaleString()}원</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="text-sm text-muted-foreground">
                표시된 4개 과정 / 총 12개 과정
              </div>
              <Button variant="outline" size="sm">
                <BookOpen className="h-4 w-4 mr-2" />
                모든 과정 보기
              </Button>
            </CardFooter>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-lg">평균 수강생 수</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-3xl font-bold mb-2">
                  {Math.round(popularCourses.reduce((sum, item) => sum + item.enrollments, 0) / popularCourses.length)}명
                </div>
                <div className="text-sm text-success dark:text-success flex items-center justify-center">
                  <ArrowUp className="h-3 w-3 mr-1" />
                  <span>8.5% 증가</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">vs 지난 {dateRange}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-lg">평균 평점</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-3xl font-bold mb-2 flex items-center justify-center">
                  {(popularCourses.reduce((sum, item) => sum + item.rating, 0) / popularCourses.length).toFixed(1)}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-warning ml-2">
                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-sm text-success dark:text-success flex items-center justify-center">
                  <ArrowUp className="h-3 w-3 mr-1" />
                  <span>0.2 증가</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">vs 지난 {dateRange}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-lg">과정당 평균 수익</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-3xl font-bold mb-2">
                  {Math.round(popularCourses.reduce((sum, item) => sum + item.revenue, 0) / popularCourses.length / 10000).toLocaleString()}만원
                </div>
                <div className="text-sm text-success dark:text-success flex items-center justify-center">
                  <ArrowUp className="h-3 w-3 mr-1" />
                  <span>10.3% 증가</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">vs 지난 {dateRange}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}