import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, sub, startOfYear, endOfYear } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BarChart3,
  Download,
  FileText,
  Filter,
  Users,
  RefreshCcw,
  Calendar,
  TrendingUp,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';

// 샘플 데이터
const monthlyUserData = [
  { name: '1월', 신규회원: 124, 활성회원: 240, 휴면회원: 80 },
  { name: '2월', 신규회원: 147, 활성회원: 280, 휴면회원: 75 },
  { name: '3월', 신규회원: 155, 활성회원: 320, 휴면회원: 70 },
  { name: '4월', 신규회원: 190, 활성회원: 380, 휴면회원: 65 },
  { name: '5월', 신규회원: 210, 활성회원: 450, 휴면회원: 60 },
  { name: '6월', 신규회원: 215, 활성회원: 480, 휴면회원: 55 },
  { name: '7월', 신규회원: 240, 활성회원: 510, 휴면회원: 50 },
  { name: '8월', 신규회원: 250, 활성회원: 520, 휴면회원: 45 },
  { name: '9월', 신규회원: 265, 활성회원: 540, 휴면회원: 40 },
  { name: '10월', 신규회원: 270, 활성회원: 560, 휴면회원: 35 },
  { name: '11월', 신규회원: 285, 활성회원: 570, 휴면회원: 30 },
  { name: '12월', 신규회원: 290, 활성회원: 580, 휴면회원: 28 },
];

const trainingSessionsData = [
  { name: '1월', 개인훈련: 80, 단체훈련: 40, 온라인훈련: 65 },
  { name: '2월', 개인훈련: 85, 단체훈련: 45, 온라인훈련: 70 },
  { name: '3월', 개인훈련: 90, 단체훈련: 50, 온라인훈련: 85 },
  { name: '4월', 개인훈련: 95, 단체훈련: 55, 온라인훈련: 90 },
  { name: '5월', 개인훈련: 100, 단체훈련: 60, 온라인훈련: 95 },
  { name: '6월', 개인훈련: 110, 단체훈련: 65, 온라인훈련: 100 },
  { name: '7월', 개인훈련: 115, 단체훈련: 70, 온라인훈련: 105 },
  { name: '8월', 개인훈련: 120, 단체훈련: 75, 온라인훈련: 110 },
  { name: '9월', 개인훈련: 125, 단체훈련: 80, 온라인훈련: 115 },
  { name: '10월', 개인훈련: 130, 단체훈련: 85, 온라인훈련: 120 },
  { name: '11월', 개인훈련: 135, 단체훈련: 90, 온라인훈련: 125 },
  { name: '12월', 개인훈련: 140, 단체훈련: 95, 온라인훈련: 130 },
];

const salesData = [
  { name: '1월', 상품판매: 1.5, 수업료: 2.0, 멤버십: 0.9, 광고: 0.4 },
  { name: '2월', 상품판매: 1.6, 수업료: 2.1, 멤버십: 1.0, 광고: 0.5 },
  { name: '3월', 상품판매: 1.7, 수업료: 2.2, 멤버십: 1.1, 광고: 0.6 },
  { name: '4월', 상품판매: 1.8, 수업료: 2.3, 멤버십: 1.2, 광고: 0.7 },
  { name: '5월', 상품판매: 1.9, 수업료: 2.4, 멤버십: 1.3, 광고: 0.8 },
  { name: '6월', 상품판매: 2.0, 수업료: 2.5, 멤버십: 1.4, 광고: 0.9 },
  { name: '7월', 상품판매: 2.1, 수업료: 2.6, 멤버십: 1.5, 광고: 1.0 },
  { name: '8월', 상품판매: 2.2, 수업료: 2.7, 멤버십: 1.6, 광고: 1.1 },
  { name: '9월', 상품판매: 2.3, 수업료: 2.8, 멤버십: 1.7, 광고: 1.2 },
  { name: '10월', 상품판매: 2.4, 수업료: 2.9, 멤버십: 1.8, 광고: 1.3 },
  { name: '11월', 상품판매: 2.5, 수업료: 3.0, 멤버십: 1.9, 광고: 1.4 },
  { name: '12월', 상품판매: 2.6, 수업료: 3.1, 멤버십: 2.0, 광고: 1.5 },
];

const platformUsageData = [
  { subject: '회원가입', A: 120, B: 110, fullMark: 150 },
  { subject: '로그인 빈도', A: 98, B: 130, fullMark: 150 },
  { subject: '게시글 작성', A: 86, B: 130, fullMark: 150 },
  { subject: '수업 등록', A: 99, B: 100, fullMark: 150 },
  { subject: '댓글 작성', A: 85, B: 90, fullMark: 150 },
  { subject: '상품 구매', A: 65, B: 85, fullMark: 150 },
];

const petBreedData = [
  { name: '말티즈', value: 400 },
  { name: '포메라니안', value: 300 },
  { name: '푸들', value: 350 },
  { name: '리트리버', value: 200 },
  { name: '시츄', value: 150 },
  { name: '기타', value: 300 }
];

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--destructive))'];

// 심층 분석 컴포넌트
const AnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [timeRange, setTimeRange] = useState('year');
  const [loading, setLoading] = useState(true);

  // 시간 범위 변경 핸들러
  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
    setLoading(true);
    
    // 데이터 로딩 시뮬레이션
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };
  
  // 초기 로딩 시뮬레이션
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // 현재 날짜 정보
  const todayDate = format(new Date(), 'yyyy년 MM월 dd일', { locale: ko });
  const currentYear = new Date().getFullYear();
  
  // 사용자 분석 탭 컨텐츠
  const renderUsersTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">사용자 통계</h2>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="시간 범위" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">최근 30일</SelectItem>
              <SelectItem value="quarter">최근 분기</SelectItem>
              <SelectItem value="year">연간</SelectItem>
              <SelectItem value="all">전체 기간</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            내보내기
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">총 회원 수</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2,456명</div>
                <div className="flex items-center text-xs text-success mt-1">
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                  <span>전년 대비 12% 증가</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">활성 사용자</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,789명</div>
                <div className="flex items-center text-xs text-success mt-1">
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                  <span>전월 대비 8% 증가</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">사용자 이탈률</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4.2%</div>
                <div className="flex items-center text-xs text-success mt-1">
                  <ArrowDownIcon className="h-3 w-3 mr-1" />
                  <span>전월 대비 1.2% 감소</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>월별 사용자 추이</CardTitle>
              <CardDescription>
                {timeRange === 'year' ? `${currentYear}년` : '선택 기간'} 사용자 현황
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={monthlyUserData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [`${value}명`, name]}
                      labelFormatter={(label) => `${label} 사용자 통계`}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="신규회원" stackId="1" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" />
                    <Area type="monotone" dataKey="활성회원" stackId="1" stroke="hsl(var(--success))" fill="hsl(var(--success))" />
                    <Area type="monotone" dataKey="휴면회원" stackId="1" stroke="hsl(var(--warning))" fill="hsl(var(--warning))" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>사용자 역할 분포</CardTitle>
                <CardDescription>역할별 사용자 비율</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: '일반 회원', value: 1850 },
                          { name: '훈련사', value: 250 },
                          { name: '기관 관리자', value: 120 },
                          { name: '관리자', value: 10 },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="hsl(var(--secondary))"
                        dataKey="value"
                      >
                        {petBreedData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}명`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>지역별 사용자 분포</CardTitle>
                <CardDescription>지역별 사용자 수</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: '서울', 사용자수: 850 },
                        { name: '경기', 사용자수: 620 },
                        { name: '인천', 사용자수: 320 },
                        { name: '부산', 사용자수: 280 },
                        { name: '대구', 사용자수: 180 },
                        { name: '기타', 사용자수: 206 },
                      ]}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" />
                      <Tooltip formatter={(value) => `${value}명`} />
                      <Legend />
                      <Bar dataKey="사용자수" fill="hsl(var(--secondary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
  
  // 트레이닝 분석 탭 컨텐츠
  const renderTrainingsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">훈련 통계</h2>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="시간 범위" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">최근 30일</SelectItem>
              <SelectItem value="quarter">최근 분기</SelectItem>
              <SelectItem value="year">연간</SelectItem>
              <SelectItem value="all">전체 기간</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            내보내기
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">총 훈련 세션</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">7,895회</div>
                <div className="flex items-center text-xs text-success mt-1">
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                  <span>전년 대비 15% 증가</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">평균 훈련 시간</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">45분</div>
                <div className="flex items-center text-xs text-success mt-1">
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                  <span>전월 대비 5분 증가</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">완료율</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">89.5%</div>
                <div className="flex items-center text-xs text-success mt-1">
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                  <span>전월 대비 2.3% 증가</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>월별 훈련 세션</CardTitle>
              <CardDescription>
                {timeRange === 'year' ? `${currentYear}년` : '선택 기간'} 훈련 세션 유형별 통계
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={trainingSessionsData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [`${value}회`, name]}
                      labelFormatter={(label) => `${label} 훈련 통계`}
                    />
                    <Legend />
                    <Bar dataKey="개인훈련" fill="hsl(var(--secondary))" />
                    <Bar dataKey="단체훈련" fill="hsl(var(--success))" />
                    <Bar dataKey="온라인훈련" fill="hsl(var(--warning))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>반려동물 품종 분포</CardTitle>
                <CardDescription>훈련받은 반려동물 품종 비율</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={petBreedData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="hsl(var(--secondary))"
                        dataKey="value"
                      >
                        {petBreedData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}마리`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>훈련 성공률</CardTitle>
                <CardDescription>훈련 유형별 성공률</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart outerRadius={90} data={[
                      { subject: '기본 복종', A: 95, B: 85, fullMark: 100 },
                      { subject: '짖음 제어', A: 80, B: 70, fullMark: 100 },
                      { subject: '사회화', A: 85, B: 90, fullMark: 100 },
                      { subject: '문제 행동', A: 70, B: 60, fullMark: 100 },
                      { subject: '고급 훈련', A: 75, B: 65, fullMark: 100 },
                      { subject: '재미 기술', A: 90, B: 80, fullMark: 100 },
                    ]}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar name="전문 훈련사" dataKey="A" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" fillOpacity={0.6} />
                      <Radar name="반려인 훈련" dataKey="B" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.6} />
                      <Legend />
                      <Tooltip formatter={(value) => `${value}%`} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
  
  // 수익 분석 탭 컨텐츠
  const renderRevenueTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">수익 분석</h2>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="시간 범위" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">최근 30일</SelectItem>
              <SelectItem value="quarter">최근 분기</SelectItem>
              <SelectItem value="year">연간</SelectItem>
              <SelectItem value="all">전체 기간</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            내보내기
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">총 수익</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₩324,567,000</div>
                <div className="flex items-center text-xs text-success mt-1">
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                  <span>전년 대비 18% 증가</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">평균 거래 금액</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₩75,000</div>
                <div className="flex items-center text-xs text-success mt-1">
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                  <span>전월 대비 5% 증가</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">반려인 평균 지출</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₩125,000/월</div>
                <div className="flex items-center text-xs text-success mt-1">
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                  <span>전월 대비 7.5% 증가</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>월별 수익 분석</CardTitle>
              <CardDescription>
                {timeRange === 'year' ? `${currentYear}년` : '선택 기간'} 수익 구분
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={salesData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [`₩${value}백만`, name]}
                      labelFormatter={(label) => `${label} 수익 요약`}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="상품판매" stackId="1" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" />
                    <Area type="monotone" dataKey="수업료" stackId="1" stroke="hsl(var(--success))" fill="hsl(var(--success))" />
                    <Area type="monotone" dataKey="멤버십" stackId="1" stroke="hsl(var(--warning))" fill="hsl(var(--warning))" />
                    <Area type="monotone" dataKey="광고" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>상품 카테고리별 수익</CardTitle>
                <CardDescription>카테고리별 매출 기여도</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: '사료/간식', value: 42 },
                          { name: '장난감', value: 28 },
                          { name: '의류/악세서리', value: 15 },
                          { name: '위생용품', value: 10 },
                          { name: '훈련도구', value: 35 },
                          { name: '기타', value: 8 },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="hsl(var(--secondary))"
                        dataKey="value"
                      >
                        {petBreedData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}백만원`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>훈련사 월평균 수익</CardTitle>
                <CardDescription>상위 5명 훈련사의 월평균 수익</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: '김훈련', 수익: 5.2 },
                        { name: '이행동', 수익: 4.8 },
                        { name: '박교정', 수익: 4.5 },
                        { name: '정펫라이프', 수익: 4.2 },
                        { name: '최애니멀', 수익: 3.9 },
                      ]}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" />
                      <Tooltip formatter={(value) => `₩${value}백만`} />
                      <Legend />
                      <Bar dataKey="수익" fill="hsl(var(--secondary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
  
  // 플랫폼 분석 탭 컨텐츠
  const renderPlatformTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">플랫폼 이용 분석</h2>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="시간 범위" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">최근 30일</SelectItem>
              <SelectItem value="quarter">최근 분기</SelectItem>
              <SelectItem value="year">연간</SelectItem>
              <SelectItem value="all">전체 기간</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            내보내기
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">페이지뷰</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">385,792회</div>
                <div className="flex items-center text-xs text-success mt-1">
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                  <span>전월 대비 12% 증가</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">평균 세션 시간</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12분 35초</div>
                <div className="flex items-center text-xs text-success mt-1">
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                  <span>전월 대비 2분 증가</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">모바일 접속 비율</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">72.5%</div>
                <div className="flex items-center text-xs text-success mt-1">
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                  <span>전월 대비 3.2% 증가</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>월별 사용자 활동</CardTitle>
              <CardDescription>
                {timeRange === 'year' ? `${currentYear}년` : '선택 기간'} 플랫폼 이용 통계
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={[
                      { month: '1월', 방문자수: 42300, 세션수: 68400, 게시글수: 2840 },
                      { month: '2월', 방문자수: 43500, 세션수: 70100, 게시글수: 2920 },
                      { month: '3월', 방문자수: 45200, 세션수: 73500, 게시글수: 3150 },
                      { month: '4월', 방문자수: 47500, 세션수: 77200, 게시글수: 3320 },
                      { month: '5월', 방문자수: 50100, 세션수: 82300, 게시글수: 3580 },
                      { month: '6월', 방문자수: 53700, 세션수: 88400, 게시글수: 3820 },
                      { month: '7월', 방문자수: 57200, 세션수: 93500, 게시글수: 4050 },
                      { month: '8월', 방문자수: 60500, 세션수: 98700, 게시글수: 4280 },
                      { month: '9월', 방문자수: 64100, 세션수: 104200, 게시글수: 4520 },
                      { month: '10월', 방문자수: 67800, 세션수: 110500, 게시글수: 4750 },
                      { month: '11월', 방문자수: 71300, 세션수: 116800, 게시글수: 4920 },
                      { month: '12월', 방문자수: 74900, 세션수: 122400, 게시글수: 5150 },
                    ]}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === '게시글수') return [`${value}개`, name];
                        return [`${value.toLocaleString()}`, name];
                      }}
                      labelFormatter={(label) => `${label} 활동 통계`}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="방문자수" stroke="hsl(var(--secondary))" activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="세션수" stroke="hsl(var(--success))" />
                    <Line type="monotone" dataKey="게시글수" stroke="hsl(var(--warning))" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>인기 콘텐츠</CardTitle>
                <CardDescription>가장 많이 방문한 콘텐츠</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: '강아지 사회화 가이드', views: 12850 },
                        { name: '초보 훈련사 길잡이', views: 9780 },
                        { name: '반려견 건강관리', views: 8450 },
                        { name: '문제행동 교정법', views: 7920 },
                        { name: '산책 훈련 팁', views: 6540 },
                      ]}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={150} />
                      <Tooltip formatter={(value) => `${value.toLocaleString()}회`} />
                      <Bar dataKey="views" fill="hsl(var(--secondary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>플랫폼 활용 비교</CardTitle>
                <CardDescription>2024 vs 2025 활용도 비교</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart outerRadius={90} data={platformUsageData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis />
                      <Radar name="2024년" dataKey="B" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.6} />
                      <Radar name="2025년" dataKey="A" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" fillOpacity={0.6} />
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">심층 분석 대시보드</h1>
          <p className="text-gray-500">{todayDate} 기준</p>
        </div>
        <div className="flex space-x-2 mt-4 md:mt-0">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            날짜 범위
          </Button>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            필터
          </Button>
          <Button>
            <FileText className="mr-2 h-4 w-4" />
            보고서 생성
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="users" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>사용자</span>
          </TabsTrigger>
          <TabsTrigger value="trainings" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>훈련</span>
          </TabsTrigger>
          <TabsTrigger value="revenue" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>수익</span>
          </TabsTrigger>
          <TabsTrigger value="platform" className="flex items-center space-x-2">
            <PieChartIcon className="h-4 w-4" />
            <span>플랫폼</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-6">
          {renderUsersTab()}
        </TabsContent>
        
        <TabsContent value="trainings" className="space-y-6">
          {renderTrainingsTab()}
        </TabsContent>
        
        <TabsContent value="revenue" className="space-y-6">
          {renderRevenueTab()}
        </TabsContent>
        
        <TabsContent value="platform" className="space-y-6">
          {renderPlatformTab()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsPage;