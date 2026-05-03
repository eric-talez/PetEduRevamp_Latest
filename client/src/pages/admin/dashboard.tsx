import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowUpRight, 
  BarChart3, 
  DollarSign, 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  CalendarDays,
  FileText,
  ChevronUp,
  ChevronDown,
  Layers,
  ListChecks,
  User,
  Building,
  PieChart,
  Zap,
  CreditCard,
  PawPrint
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
// 커스텀 Badge 컴포넌트를 사용하기 위해 shadcn Badge는 사용하지 않음
// import { Badge } from "@/components/ui/badge";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

// 매출 데이터
const salesData = [
  { month: '1월', 일반회원: 120, 트레이너: 80, 기관: 60 },
  { month: '2월', 일반회원: 150, 트레이너: 100, 기관: 75 },
  { month: '3월', 일반회원: 200, 트레이너: 120, 기관: 90 },
  { month: '4월', 일반회원: 250, 트레이너: 150, 기관: 100 },
  { month: '5월', 일반회원: 300, 트레이너: 180, 기관: 120 },
  { month: '6월', 일반회원: 350, 트레이너: 200, 기관: 140 },
];

// 사용자 유형 데이터
const userTypeData = [
  { name: '일반회원', value: 1200 },
  { name: '트레이너', value: 400 },
  { name: '기관관리자', value: 100 },
  { name: '비활성사용자', value: 300 },
];

// 최근 결제 내역
const recentPayments = [
  { id: 1, user: '김철수', amount: 50000, date: '2025-05-12T08:30:00', status: 'completed', type: 'course' },
  { id: 2, user: '이영희', amount: 30000, date: '2025-05-12T10:15:00', status: 'completed', type: 'product' },
  { id: 3, user: '박지민', amount: 100000, date: '2025-05-11T14:20:00', status: 'completed', type: 'subscription' },
  { id: 4, user: '최민준', amount: 25000, date: '2025-05-11T16:45:00', status: 'pending', type: 'product' },
  { id: 5, user: '정다윤', amount: 75000, date: '2025-05-10T09:00:00', status: 'completed', type: 'course' },
  { id: 6, user: '강지훈', amount: 15000, date: '2025-05-10T11:30:00', status: 'failed', type: 'product' },
];

// 최근 사용자 활동
const recentActivities = [
  { id: 1, user: '김훈련 (트레이너)', action: '알림장 작성', target: '쿠키', date: '2025-05-13T09:15:00' },
  { id: 2, user: '이철수 (회원)', action: '수업 등록', target: '기본 복종 훈련', date: '2025-05-13T08:30:00' },
  { id: 3, user: '박행동 (트레이너)', action: '일정 등록', target: '산책 훈련', date: '2025-05-12T16:45:00' },
  { id: 4, user: '유나비 (회원)', action: '결제 완료', target: '댕댕이 장난감', date: '2025-05-12T14:20:00' },
  { id: 5, user: '최도그 (회원)', action: '방문 기록', target: '댕댕이 카페', date: '2025-05-12T10:00:00' },
  { id: 6, user: '김사랑 (기관)', action: '강좌 개설', target: '고급 훈련', date: '2025-05-11T17:30:00' },
];

// 인기 상품
const popularItems = [
  { id: 1, name: '강아지 훈련 리드줄', sales: 120, revenue: 3600000, change: 15 },
  { id: 2, name: '기본 복종 훈련 강좌', sales: 85, revenue: 4250000, change: 10 },
  { id: 3, name: '프리미엄 간식 패키지', sales: 64, revenue: 1920000, change: 5 },
  { id: 4, name: '반려동물 자동 급식기', sales: 52, revenue: 2080000, change: -3 },
  { id: 5, name: '행동 교정 프로그램', sales: 48, revenue: 2400000, change: 20 },
];

// 파이 차트 색상
const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--primary))'];

// 관리자 대시보드 컴포넌트
const AdminDashboard = () => {
  // 현재 날짜 관련 정보
  const today = new Date();
  const currentDate = format(today, 'yyyy년 MM월 dd일', { locale: ko });
  const currentDayOfWeek = format(today, 'EEEE', { locale: ko });

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  
  // 데이터 로딩 시뮬레이션
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    
    return () => clearTimeout(timer);
  }, []);
  
  // 개요 탭 컨텐츠
  const renderOverviewTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 주요 지표 카드 */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">총 사용자</CardTitle>
            <CardDescription>전체 사용자 수</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold">2,456</span>
                <span className="text-xs text-success flex items-center">
                  <ChevronUp className="h-3 w-3 mr-1" />
                  12% 증가
                </span>
              </div>
              <div className="bg-primary/10 dark:bg-primary/20 p-2 rounded-full">
                <Users className="h-5 w-5 text-primary dark:text-primary" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-0 pb-2">
            <div className="w-full flex justify-between text-xs text-gray-500">
              <span>지난달: 2,198</span>
              <span>목표: 3,000</span>
            </div>
            <div className="w-12 h-12 mx-auto mt-2">
              <CircularProgressbar 
                value={82} 
                text="82%" 
                styles={buildStyles({
                  textColor: "hsl(var(--primary))",
                  pathColor: "hsl(var(--primary))",
                  trailColor: "hsl(var(--border))"
                })}
              />
            </div>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">월간 매출</CardTitle>
            <CardDescription>5월 총 매출</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold">₩32,450,000</span>
                <span className="text-xs text-success flex items-center">
                  <ChevronUp className="h-3 w-3 mr-1" />
                  8% 증가
                </span>
              </div>
              <div className="bg-success/10 dark:bg-success/20 p-2 rounded-full">
                <DollarSign className="h-5 w-5 text-success dark:text-success" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-0 pb-2">
            <div className="w-full flex justify-between text-xs text-gray-500">
              <span>지난달: ₩30,050,000</span>
              <span>목표: ₩40,000,000</span>
            </div>
            <div className="w-12 h-12 mx-auto mt-2">
              <CircularProgressbar 
                value={81} 
                text="81%" 
                styles={buildStyles({
                  textColor: "hsl(var(--success))",
                  pathColor: "hsl(var(--success))",
                  trailColor: "hsl(var(--border))"
                })}
              />
            </div>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">등록된 반려동물</CardTitle>
            <CardDescription>현재 등록된 총 반려동물 수</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold">1,822</span>
                <span className="text-xs text-success flex items-center">
                  <ChevronUp className="h-3 w-3 mr-1" />
                  15% 증가
                </span>
              </div>
              <div className="bg-primary/10 dark:bg-primary/20 p-2 rounded-full">
                <PawPrint className="h-5 w-5 text-primary dark:text-primary/80" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-0 pb-2">
            <div className="w-full flex justify-between text-xs text-gray-500">
              <span>지난달: 1,584</span>
              <span>목표: 2,000</span>
            </div>
            <div className="w-12 h-12 mx-auto mt-2">
              <CircularProgressbar 
                value={91} 
                text="91%" 
                styles={buildStyles({
                  textColor: "hsl(var(--secondary))",
                  pathColor: "hsl(var(--secondary))",
                  trailColor: "hsl(var(--border))"
                })}
              />
            </div>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">완료된 수업</CardTitle>
            <CardDescription>이번 달 완료된 수업 수</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold">356</span>
                <span className="text-xs text-destructive flex items-center">
                  <ChevronDown className="h-3 w-3 mr-1" />
                  5% 감소
                </span>
              </div>
              <div className="bg-primary/10 dark:bg-primary/20 p-2 rounded-full">
                <CalendarDays className="h-5 w-5 text-primary dark:text-primary" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-0 pb-2">
            <div className="w-full flex justify-between text-xs text-gray-500">
              <span>지난달: 375</span>
              <span>목표: 400</span>
            </div>
            <div className="w-12 h-12 mx-auto mt-2">
              <CircularProgressbar 
                value={89} 
                text="89%" 
                styles={buildStyles({
                  textColor: "hsl(var(--primary))",
                  pathColor: "hsl(var(--primary))",
                  trailColor: "hsl(var(--border))"
                })}
              />
            </div>
          </CardFooter>
        </Card>
      </div>
      
      {/* 주요 차트 */}
      <div className="md:col-span-2 space-y-4">
        <Card className="h-[350px]">
          <CardHeader>
            <CardTitle>월별 매출 현황</CardTitle>
            <CardDescription>최근 6개월 매출 추이</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={salesData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `₩${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="일반회원" stackId="a" fill="hsl(var(--secondary))" />
                <Bar dataKey="트레이너" stackId="a" fill="hsl(var(--success))" />
                <Bar dataKey="기관" stackId="a" fill="hsl(var(--warning))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>사용자 구성</CardTitle>
              <CardDescription>유형별 사용자 분포</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {userTypeData.map((user, index) => {
                  const percentage = Math.round((user.value / userTypeData.reduce((sum, u) => sum + u.value, 0)) * 100);
                  return (
                    <div key={user.name} className="bg-slate-800 dark:bg-slate-700 text-white p-4 rounded-xl">
                      <h4 className="text-sm mb-2">{user.name}</h4>
                      <div className="w-16 h-16 mx-auto mb-2">
                        <CircularProgressbar 
                          value={percentage} 
                          text={`${percentage}%`} 
                          styles={buildStyles({
                            textColor: "white",
                            pathColor: COLORS[index % COLORS.length],
                            trailColor: "hsl(var(--foreground))"
                          })}
                        />
                      </div>
                      <p className="text-xs text-center text-gray-300">{user.value}명</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>최근 활동</CardTitle>
              <CardDescription>오늘의 주요 활동</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-4">
                  {recentActivities.slice(0, 4).map((activity) => (
                    <div key={activity.id} className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium">{activity.user}</p>
                        <p className="text-xs text-gray-500">
                          {activity.action} - {activity.target}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {new Date(activity.date).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
  
  // 매출 탭 컨텐츠
  const renderRevenueTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">오늘의 매출</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col">
              <span className="text-2xl font-bold">₩1,250,000</span>
              <span className="text-xs text-success flex items-center">
                <ChevronUp className="h-3 w-3 mr-1" />
                15% 증가
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">이번 주 매출</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col">
              <span className="text-2xl font-bold">₩8,450,000</span>
              <span className="text-xs text-success flex items-center">
                <ChevronUp className="h-3 w-3 mr-1" />
                8% 증가
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">이번 달 매출</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col">
              <span className="text-2xl font-bold">₩32,450,000</span>
              <span className="text-xs text-success flex items-center">
                <ChevronUp className="h-3 w-3 mr-1" />
                8% 증가
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">연간 매출</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col">
              <span className="text-2xl font-bold">₩187,500,000</span>
              <span className="text-xs text-success flex items-center">
                <ChevronUp className="h-3 w-3 mr-1" />
                12% 증가
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>최근 결제 내역</CardTitle>
          <CardDescription>최근 결제된 거래 목록</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>사용자</TableHead>
                <TableHead>금액</TableHead>
                <TableHead>날짜</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.id}</TableCell>
                  <TableCell>{payment.user}</TableCell>
                  <TableCell>₩{payment.amount.toLocaleString()}</TableCell>
                  <TableCell>{new Date(payment.date).toLocaleString('ko-KR')}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {payment.type === 'course' ? '강좌' : 
                       payment.type === 'product' ? '상품' : '구독'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        payment.status === 'completed' ? 'success' : 
                        payment.status === 'pending' ? 'warning' : 'destructive'
                      }
                    >
                      {payment.status === 'completed' ? '완료' : 
                       payment.status === 'pending' ? '대기중' : '실패'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>인기 상품/서비스</CardTitle>
          <CardDescription>판매량 기준 인기 상품 및 서비스</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>순위</TableHead>
                <TableHead>상품명</TableHead>
                <TableHead>판매량</TableHead>
                <TableHead>매출액</TableHead>
                <TableHead>변동</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {popularItems.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.sales}개</TableCell>
                  <TableCell>₩{item.revenue.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className={`flex items-center ${item.change >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {item.change >= 0 ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                      {Math.abs(item.change)}%
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
  
  // 관리 탭 컨텐츠
  const renderManagementTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>빠른 작업</CardTitle>
          <CardDescription>주요 관리 기능</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button className="w-full justify-start" variant="outline">
            <User className="mr-2 h-4 w-4" />
            사용자 관리
          </Button>
          <Button className="w-full justify-start" variant="outline">
            <Building className="mr-2 h-4 w-4" />
            기관 관리
          </Button>
          <Button className="w-full justify-start" variant="outline">
            <Layers className="mr-2 h-4 w-4" />
            강좌 관리
          </Button>
          <Button className="w-full justify-start" variant="outline">
            <CreditCard className="mr-2 h-4 w-4" />
            결제 관리
          </Button>
          <Button className="w-full justify-start" variant="outline">
            <ListChecks className="mr-2 h-4 w-4" />
            메뉴 관리
          </Button>
          <Button className="w-full justify-start" variant="outline">
            <div className="mr-2 h-4 w-4">
              <PieChart className="h-4 w-4" />
            </div>
            통계 리포트
          </Button>
          <Button className="w-full justify-start" variant="outline">
            <Zap className="mr-2 h-4 w-4" />
            시스템 설정
          </Button>
        </CardContent>
      </Card>
      
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>시스템 상태</CardTitle>
          <CardDescription>주요 시스템 지표</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">서버 상태</span>
              <span className="text-sm font-medium text-success">정상</span>
            </div>
            <Progress value={98} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">데이터베이스 상태</span>
              <span className="text-sm font-medium text-success">정상</span>
            </div>
            <Progress value={100} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">API 응답 시간</span>
              <span className="text-sm font-medium">120ms</span>
            </div>
            <Progress value={85} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">서버 리소스 사용량</span>
              <span className="text-sm font-medium">45%</span>
            </div>
            <Progress value={45} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">스토리지 사용량</span>
              <span className="text-sm font-medium">68%</span>
            </div>
            <Progress value={68} className="h-2" />
          </div>
        </CardContent>
      </Card>
      
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>최근 시스템 활동</CardTitle>
          <CardDescription>최근 시스템 로그 및 이벤트</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>시간</TableHead>
                <TableHead>이벤트</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>세부 정보</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>{format(new Date(), 'HH:mm:ss')}</TableCell>
                <TableCell>데이터베이스 백업</TableCell>
                <TableCell>
                  <Badge variant="success">성공</Badge>
                </TableCell>
                <TableCell>일일 데이터베이스 백업 완료</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{format(subMinutes(new Date(), 30), 'HH:mm:ss')}</TableCell>
                <TableCell>사용자 인증 시스템</TableCell>
                <TableCell>
                  <Badge variant="success">정상</Badge>
                </TableCell>
                <TableCell>인증 서비스 정상 작동 중</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{format(subHours(new Date(), 2), 'HH:mm:ss')}</TableCell>
                <TableCell>결제 시스템</TableCell>
                <TableCell>
                  <Badge variant="warning">주의</Badge>
                </TableCell>
                <TableCell>결제 처리 지연 발생 (2분) - 해결됨</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{format(subHours(new Date(), 5), 'HH:mm:ss')}</TableCell>
                <TableCell>시스템 업데이트</TableCell>
                <TableCell>
                  <Badge variant="success">성공</Badge>
                </TableCell>
                <TableCell>시스템 업데이트 v2.1.3 완료</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">관리자 대시보드</h1>
          <p className="text-gray-500">{currentDate} {currentDayOfWeek}</p>
        </div>
        <div className="flex space-x-2 mt-4 md:mt-0">
          <Button variant="outline" size="sm">
            <FileText className="mr-2 h-4 w-4" />
            보고서 다운로드
          </Button>
          <Button size="sm" onClick={() => window.location.href = '/admin/analytics'}>
            <BarChart3 className="mr-2 h-4 w-4" />
            상세 분석
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="flex items-center">
              <Layers className="mr-2 h-4 w-4" />
              개요
            </TabsTrigger>
            <TabsTrigger value="revenue" className="flex items-center">
              <DollarSign className="mr-2 h-4 w-4" />
              매출
            </TabsTrigger>
            <TabsTrigger value="management" className="flex items-center">
              <Settings className="mr-2 h-4 w-4" />
              시스템 관리
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            {renderOverviewTab()}
          </TabsContent>
          
          <TabsContent value="revenue">
            {renderRevenueTab()}
          </TabsContent>
          
          <TabsContent value="management">
            {renderManagementTab()}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

// 스타일 있는 뱃지 컴포넌트
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline';
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
  let variantClasses = '';
  
  switch (variant) {
    case 'success':
      variantClasses = 'bg-success/10 text-success dark:bg-success/20 dark:text-success';
      break;
    case 'warning':
      variantClasses = 'bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning';
      break;
    case 'destructive':
      variantClasses = 'bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive';
      break;
    case 'outline':
      variantClasses = 'bg-transparent border border-gray-200 text-gray-800 dark:border-gray-700 dark:text-gray-300';
      break;
    default:
      variantClasses = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses} ${className}`}>
      {children}
    </span>
  );
};

// 강아지 발바닥 아이콘
interface IconProps extends React.SVGProps<SVGSVGElement> {}

const PawPrint: React.FC<IconProps> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="8" cy="8" r="2" />
    <circle cx="16" cy="8" r="2" />
    <circle cx="5" cy="16" r="2" />
    <circle cx="19" cy="16" r="2" />
    <path d="M12 10c1.93 1.93 2 5 0 7h0s.64-.63 1-1a3.55 3.55 0 0 0 0-5 3.55 3.55 0 0 0 0-5c.36-.37 1-1 1-1h0c-2-2-1.93-5.07 0-7" />
  </svg>
);

// 설정 아이콘
const Settings: React.FC<IconProps> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// 날짜 함수
const subMinutes = (date: Date, minutes: number): Date => {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() - minutes);
  return result;
};

const subHours = (date: Date, hours: number): Date => {
  const result = new Date(date);
  result.setHours(result.getHours() - hours);
  return result;
};

export default AdminDashboard;