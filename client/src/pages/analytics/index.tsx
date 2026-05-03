import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  Calendar,
  DollarSign,
  Star,
  Award,
  Clock,
  CheckCircle,
  Eye,
  Filter,
  Download,
  RefreshCw,
  Search,
  User,
  GraduationCap,
  Target,
  Activity
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface TrainingSession {
  id: number;
  date: string;
  trainer: {
    id: number;
    name: string;
    avatar?: string;
  };
  student: {
    id: number;
    name: string;
    pet: {
      name: string;
      breed: string;
    };
  };
  course: {
    id: number;
    title: string;
    category: string;
  };
  duration: number;
  status: 'completed' | 'cancelled' | 'no-show';
  rating?: number;
  revenue: number;
  location: string;
}

interface CompletedCourse {
  id: number;
  title: string;
  category: string;
  trainer: {
    id: number;
    name: string;
    avatar?: string;
  };
  student: {
    id: number;
    name: string;
    pet: {
      name: string;
      breed: string;
    };
  };
  startDate: string;
  endDate: string;
  totalSessions: number;
  completedSessions: number;
  finalRating: number;
  totalRevenue: number;
  achievements: string[];
}

interface Trainer {
  id: number;
  name: string;
  avatar?: string;
  specialization: string[];
  totalSessions: number;
  completedCourses: number;
  averageRating: number;
  totalRevenue: number;
  activeStudents: number;
  joinDate: string;
  status: 'active' | 'inactive';
}

interface Student {
  id: number;
  name: string;
  email: string;
  pet: {
    id: number;
    name: string;
    breed: string;
    age: number;
  };
  enrolledCourses: number;
  completedCourses: number;
  totalSessions: number;
  averageRating: number;
  totalSpent: number;
  joinDate: string;
  lastActivity: string;
  status: 'active' | 'inactive' | 'graduated';
}

export default function AnalyticsPage() {
  const { userRole, isAuthenticated } = useAuth();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [searchTerm, setSearchTerm] = useState('');
  
  // 모달 상태
  const [isTrainingSessionsOpen, setIsTrainingSessionsOpen] = useState(false);
  const [isCompletedCoursesOpen, setIsCompletedCoursesOpen] = useState(false);
  const [isTopTrainersOpen, setIsTopTrainersOpen] = useState(false);
  const [isActiveStudentsOpen, setIsActiveStudentsOpen] = useState(false);

  // 권한 체크 함수
  const hasPermission = (action: string) => {
    if (!userRole) {
      console.log('권한 체크 실패 - 사용자 역할이 없음');
      return false;
    }
    
    console.log(`권한 체크 - 사용자 역할: ${userRole}, 요청 작업: ${action}`);
    
    const adminRoles = ['admin', 'institute-admin'];
    const trainerRoles = [...adminRoles, 'trainer'];
    const allRoles = [...trainerRoles, 'student'];
    
    switch (action) {
      case 'view_all_sessions':
        return adminRoles.includes(userRole);
      case 'view_all_courses':
        return adminRoles.includes(userRole);
      case 'view_all_trainers':
        return adminRoles.includes(userRole);
      case 'view_all_students':
        return adminRoles.includes(userRole);
      case 'view_revenue':
        return adminRoles.includes(userRole);
      case 'view_trainer_data':
        return trainerRoles.includes(userRole);
      case 'view_student_data':
        return allRoles.includes(userRole);
      default:
        return false;
    }
  };

  // 클릭 이벤트 핸들러
  const handleCardClick = (cardType: string, modalSetter: (value: boolean) => void) => {
    console.log(`카드 클릭 이벤트 - 카드 타입: ${cardType}, 사용자 역할: ${userRole}`);
    
    let requiredPermission = '';
    switch (cardType) {
      case 'training-sessions':
        requiredPermission = 'view_all_sessions';
        break;
      case 'completed-courses':
        requiredPermission = 'view_all_courses';
        break;
      case 'top-trainers':
        requiredPermission = 'view_all_trainers';
        break;
      case 'active-students':
        requiredPermission = 'view_all_students';
        break;
    }

    if (hasPermission(requiredPermission)) {
      console.log(`권한 확인됨 - ${cardType} 모달 열기`);
      modalSetter(true);
    } else {
      console.log(`권한 없음 - ${userRole}은(는) ${cardType} 데이터에 접근할 수 없습니다`);
      alert(`접근 권한이 없습니다. ${cardType} 데이터를 보려면 ${requiredPermission} 권한이 필요합니다.`);
    }
  };

  // 분석 데이터 조회
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/analytics/overview', selectedPeriod],
    queryFn: async () => {
      return {
        totalSessions: 156,
        completedCourses: 23,
        activeTrainers: 8,
        activeStudents: 45,
        totalRevenue: 12500000,
        averageRating: 4.7,
        growth: {
          sessions: 15.3,
          revenue: 22.1,
          students: 8.7,
          rating: 2.1
        }
      };
    },
    enabled: isAuthenticated
  });

  // 훈련 세션 데이터
  const { data: trainingSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['/api/analytics/training-sessions', selectedPeriod],
    queryFn: async () => {
      return [
        {
          id: 1,
          date: "2025-01-21",
          trainer: { id: 1, name: "김민수", avatar: "/avatars/trainer1.jpg" },
          student: { 
            id: 1, 
            name: "홍길동", 
            pet: { name: "멍멍이", breed: "골든 리트리버" }
          },
          course: { id: 1, title: "기초 복종 훈련", category: "기초훈련" },
          duration: 60,
          status: 'completed',
          rating: 5,
          revenue: 50000,
          location: "메인 훈련장 A"
        },
        {
          id: 2,
          date: "2025-01-21",
          trainer: { id: 2, name: "이준호" },
          student: { 
            id: 2, 
            name: "김영희", 
            pet: { name: "바둑이", breed: "보더 콜리" }
          },
          course: { id: 2, title: "어질리티 기초", category: "운동훈련" },
          duration: 90,
          status: 'completed',
          rating: 4,
          revenue: 45000,
          location: "야외 운동장"
        },
        {
          id: 3,
          date: "2025-01-20",
          trainer: { id: 3, name: "박지혜" },
          student: { 
            id: 3, 
            name: "박철수", 
            pet: { name: "초코", breed: "시바견" }
          },
          course: { id: 3, title: "문제행동 교정", category: "행동교정" },
          duration: 120,
          status: 'completed',
          rating: 4,
          revenue: 80000,
          location: "상담실 1"
        },
        {
          id: 4,
          date: "2025-01-20",
          trainer: { id: 1, name: "김민수" },
          student: { 
            id: 4, 
            name: "최미영", 
            pet: { name: "코코", breed: "푸들" }
          },
          course: { id: 4, title: "사회화 훈련", category: "사회화" },
          duration: 60,
          status: 'cancelled',
          rating: undefined,
          revenue: 0,
          location: "메인 훈련장 B"
        }
      ] as TrainingSession[];
    },
    enabled: isAuthenticated
  });

  // 완료된 코스 데이터
  const { data: completedCourses, isLoading: coursesLoading } = useQuery({
    queryKey: ['/api/analytics/completed-courses', selectedPeriod],
    queryFn: async () => {
      return [
        {
          id: 1,
          title: "기초 복종 훈련",
          category: "기초훈련",
          trainer: { id: 1, name: "김민수", avatar: "/avatars/trainer1.jpg" },
          student: { 
            id: 5, 
            name: "정수민", 
            pet: { name: "루루", breed: "말티즈" }
          },
          startDate: "2024-12-01",
          endDate: "2025-01-15",
          totalSessions: 8,
          completedSessions: 8,
          finalRating: 5,
          totalRevenue: 400000,
          achievements: ["기본 명령어 숙달", "집중력 향상", "사회성 개선"]
        },
        {
          id: 2,
          title: "어질리티 기초",
          category: "운동훈련",
          trainer: { id: 2, name: "이준호" },
          student: { 
            id: 6, 
            name: "강지훈", 
            pet: { name: "맥스", breed: "비글" }
          },
          startDate: "2024-11-15",
          endDate: "2025-01-10",
          totalSessions: 6,
          completedSessions: 6,
          finalRating: 4,
          totalRevenue: 280000,
          achievements: ["점프 기술 습득", "균형감 개선", "자신감 향상"]
        },
        {
          id: 3,
          title: "문제행동 교정",
          category: "행동교정",
          trainer: { id: 3, name: "박지혜" },
          student: { 
            id: 7, 
            name: "윤서현", 
            pet: { name: "보리", breed: "진돗개" }
          },
          startDate: "2024-10-01",
          endDate: "2025-01-20",
          totalSessions: 12,
          completedSessions: 12,
          finalRating: 5,
          totalRevenue: 960000,
          achievements: ["공격성 해결", "분리불안 완화", "사회화 성공"]
        }
      ] as CompletedCourse[];
    },
    enabled: isAuthenticated
  });

  // 상위 훈련사 데이터
  const { data: topTrainers, isLoading: trainersLoading } = useQuery({
    queryKey: ['/api/analytics/top-trainers', selectedPeriod],
    queryFn: async () => {
      return [
        {
          id: 1,
          name: "김민수",
          avatar: "/avatars/trainer1.jpg",
          specialization: ["기초 복종", "어질리티", "사회화"],
          totalSessions: 45,
          completedCourses: 8,
          averageRating: 4.8,
          totalRevenue: 2250000,
          activeStudents: 12,
          joinDate: "2024-01-15",
          status: 'active'
        },
        {
          id: 2,
          name: "이준호",
          avatar: "/avatars/trainer2.jpg",
          specialization: ["어질리티", "운동 능력", "체력 단련"],
          totalSessions: 38,
          completedCourses: 6,
          averageRating: 4.6,
          totalRevenue: 1900000,
          activeStudents: 10,
          joinDate: "2023-11-20",
          status: 'active'
        },
        {
          id: 3,
          name: "박지혜",
          avatar: "/avatars/trainer3.jpg",
          specialization: ["행동 교정", "문제 행동", "심리 치료"],
          totalSessions: 32,
          completedCourses: 5,
          averageRating: 4.9,
          totalRevenue: 2560000,
          activeStudents: 8,
          joinDate: "2024-03-10",
          status: 'active'
        }
      ] as Trainer[];
    },
    enabled: isAuthenticated
  });

  // 활성 학생 데이터
  const { data: activeStudents, isLoading: studentsLoading } = useQuery({
    queryKey: ['/api/analytics/active-students', selectedPeriod],
    queryFn: async () => {
      return [
        {
          id: 1,
          name: "홍길동",
          email: "hong@example.com",
          pet: { id: 1, name: "멍멍이", breed: "골든 리트리버", age: 2 },
          enrolledCourses: 2,
          completedCourses: 1,
          totalSessions: 15,
          averageRating: 4.7,
          totalSpent: 750000,
          joinDate: "2024-11-15",
          lastActivity: "2025-01-21",
          status: 'active'
        },
        {
          id: 2,
          name: "김영희",
          email: "kim@example.com",
          pet: { id: 2, name: "바둑이", breed: "보더 콜리", age: 3 },
          enrolledCourses: 1,
          completedCourses: 0,
          totalSessions: 8,
          averageRating: 4.5,
          totalSpent: 480000,
          joinDate: "2025-01-01",
          lastActivity: "2025-01-20",
          status: 'active'
        }
      ] as Student[];
    },
    enabled: isAuthenticated
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">완료</Badge>;
      case 'cancelled':
        return <Badge variant="danger">취소</Badge>;
      case 'no-show':
        return <Badge variant="warning">노쇼</Badge>;
      case 'active':
        return <Badge variant="success">활성</Badge>;
      case 'inactive':
        return <Badge variant="secondary">비활성</Badge>;
      case 'graduated':
        return <Badge variant="info">수료</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">분석 리포트</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            종합적인 성과 지표와 상세 분석을 확인하세요
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">이번 주</SelectItem>
              <SelectItem value="month">이번 달</SelectItem>
              <SelectItem value="quarter">분기</SelectItem>
              <SelectItem value="year">올해</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            리포트 다운로드
          </Button>
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">종합 현황</TabsTrigger>
          <TabsTrigger value="performance">성과 분석</TabsTrigger>
          <TabsTrigger value="revenue">수익 분석</TabsTrigger>
          <TabsTrigger value="trends">트렌드 분석</TabsTrigger>
        </TabsList>

        {/* 종합 현황 */}
        <TabsContent value="overview" className="space-y-6">
          {/* 주요 지표 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleCardClick('training-sessions', setIsTrainingSessionsOpen)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">총 훈련 세션</p>
                    <p className="text-2xl font-bold">{analytics?.totalSessions || 0}</p>
                    <p className="text-xs text-success flex items-center mt-1">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +{analytics?.growth.sessions || 0}% 증가
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Activity className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setIsCompletedCoursesOpen(true)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">완료된 코스</p>
                    <p className="text-2xl font-bold">{analytics?.completedCourses || 0}</p>
                    <p className="text-xs text-success flex items-center mt-1">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      신규 수료생 증가
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-success/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setIsTopTrainersOpen(true)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">활성 훈련사</p>
                    <p className="text-2xl font-bold">{analytics?.activeTrainers || 0}</p>
                    <p className="text-xs text-primary flex items-center mt-1">
                      평균 평점 {analytics?.averageRating || 0}점
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setIsActiveStudentsOpen(true)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">활성 학생</p>
                    <p className="text-2xl font-bold">{analytics?.activeStudents || 0}</p>
                    <p className="text-xs text-success flex items-center mt-1">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +{analytics?.growth.students || 0}% 증가
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-warning/10 rounded-full flex items-center justify-center">
                    <GraduationCap className="h-6 w-6 text-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 수익 및 평점 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  총 수익
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success mb-2">
                  {formatCurrency(analytics?.totalRevenue || 0)}
                </div>
                <p className="text-sm text-success flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  전월 대비 +{analytics?.growth.revenue || 0}% 증가
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  평균 평점
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-3xl font-bold">{analytics?.averageRating || 0}</div>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < Math.floor(analytics?.averageRating || 0) 
                            ? 'text-warning fill-current' 
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-success flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  전월 대비 +{analytics?.growth.rating || 0}% 향상
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 성과 분석 */}
        <TabsContent value="performance" className="space-y-6">
          {/* 훈련 진행도 차트 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                훈련 진행도
              </CardTitle>
              <CardDescription>주간/월간 훈련 세션 완료율 및 진행 상황</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 진행도 바 차트 시뮬레이션 */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">기초 복종 훈련</span>
                    <span className="text-sm text-gray-500">85%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full shadow-sm" style={{width: '85%'}}></div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">어질리티 훈련</span>
                    <span className="text-sm text-gray-500">72%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full shadow-sm" style={{width: '72%'}}></div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">행동 교정</span>
                    <span className="text-sm text-gray-500">68%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-gradient-to-r from-primary/50 to-primary h-3 rounded-full shadow-sm" style={{width: '68%'}}></div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">사회화 훈련</span>
                    <span className="text-sm text-gray-500">91%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full shadow-sm" style={{width: '91%'}}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 월간 리포트 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                월간 성과 리포트
              </CardTitle>
              <CardDescription>최근 6개월간 주요 지표 변화</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* 월별 세션 수 트렌드 */}
                <div>
                  <h4 className="text-sm font-medium mb-3">월별 완료 세션</h4>
                  <div className="flex items-end justify-between h-32 bg-gradient-to-t from-primary to-transparent rounded-lg p-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 bg-primary/40 rounded-t mb-2" style={{height: '60%'}}></div>
                      <span className="text-xs text-gray-600">8월</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-8 bg-primary rounded-t mb-2" style={{height: '75%'}}></div>
                      <span className="text-xs text-gray-600">9월</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-8 bg-primary rounded-t mb-2" style={{height: '85%'}}></div>
                      <span className="text-xs text-gray-600">10월</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-8 bg-primary rounded-t mb-2" style={{height: '70%'}}></div>
                      <span className="text-xs text-gray-600">11월</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-8 bg-primary rounded-t mb-2" style={{height: '95%'}}></div>
                      <span className="text-xs text-gray-600">12월</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-8 bg-primary rounded-t mb-2" style={{height: '100%'}}></div>
                      <span className="text-xs text-gray-600">1월</span>
                    </div>
                  </div>
                </div>

                {/* 수익 트렌드 */}
                <div>
                  <h4 className="text-sm font-medium mb-3">월별 수익 (만원)</h4>
                  <div className="flex items-end justify-between h-32 bg-gradient-to-t from-primary to-transparent rounded-lg p-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 bg-success/40 rounded-t mb-2" style={{height: '45%'}}></div>
                      <span className="text-xs text-gray-600">8월</span>
                      <span className="text-xs text-success font-medium">950</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-8 bg-success rounded-t mb-2" style={{height: '65%'}}></div>
                      <span className="text-xs text-gray-600">9월</span>
                      <span className="text-xs text-success font-medium">1,150</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-8 bg-success rounded-t mb-2" style={{height: '80%'}}></div>
                      <span className="text-xs text-gray-600">10월</span>
                      <span className="text-xs text-success font-medium">1,320</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-8 bg-success rounded-t mb-2" style={{height: '70%'}}></div>
                      <span className="text-xs text-gray-600">11월</span>
                      <span className="text-xs text-success font-medium">1,180</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-8 bg-success rounded-t mb-2" style={{height: '90%'}}></div>
                      <span className="text-xs text-gray-600">12월</span>
                      <span className="text-xs text-success font-medium">1,480</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-8 bg-success rounded-t mb-2" style={{height: '100%'}}></div>
                      <span className="text-xs text-gray-600">1월</span>
                      <span className="text-xs text-success font-medium">1,650</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 성취 기록 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                성취 기록 및 마일스톤
              </CardTitle>
              <CardDescription>주요 성과 달성 현황 및 목표 진행률</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* 성취 도넛 차트 시뮬레이션 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">훈련 완료율</h4>
                    <div className="relative">
                      <div className="w-32 h-32 mx-auto">
                        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="hsl(var(--border))"
                            strokeWidth="3"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="hsl(var(--primary))"
                            strokeWidth="3"
                            strokeDasharray="87, 100"
                            className="drop-shadow-sm"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-bold text-primary">87%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">학습자 만족도</h4>
                    <div className="relative">
                      <div className="w-32 h-32 mx-auto">
                        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="hsl(var(--border))"
                            strokeWidth="3"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="hsl(var(--success))"
                            strokeWidth="3"
                            strokeDasharray="94, 100"
                            className="drop-shadow-sm"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-bold text-success">94%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 성취 뱃지 */}
                <div>
                  <h4 className="text-sm font-medium mb-3">이번 달 달성한 성과</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="text-center p-3 bg-warning/10 rounded-lg border border-warning/30">
                      <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Award className="h-6 w-6 text-warning" />
                      </div>
                      <span className="text-xs font-medium text-warning">100회 달성</span>
                    </div>
                    
                    <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/30">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Star className="h-6 w-6 text-primary" />
                      </div>
                      <span className="text-xs font-medium text-primary">평점 4.8</span>
                    </div>
                    
                    <div className="text-center p-3 bg-success/10 rounded-lg border border-success/30">
                      <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Users className="h-6 w-6 text-success" />
                      </div>
                      <span className="text-xs font-medium text-success">신규 50명</span>
                    </div>
                    
                    <div className="text-center p-3 bg-primary/5 rounded-lg border border-primary/30">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <GraduationCap className="h-6 w-6 text-primary" />
                      </div>
                      <span className="text-xs font-medium text-primary">수료 25명</span>
                    </div>
                  </div>
                </div>

                {/* 목표 달성률 */}
                <div>
                  <h4 className="text-sm font-medium mb-3">2025년 목표 달성률</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">연간 세션 목표 (1,800회)</span>
                      <span className="text-sm font-medium text-primary">156/1,800 (9%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full" style={{width: '9%'}}></div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">연간 수익 목표 (1억 5천만원)</span>
                      <span className="text-sm font-medium text-success">12.5M/150M (8%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full" style={{width: '8%'}}></div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">신규 학생 목표 (500명)</span>
                      <span className="text-sm font-medium text-primary">45/500 (9%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-primary/50 to-primary h-2 rounded-full" style={{width: '9%'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 수익 분석 */}
        <TabsContent value="revenue" className="space-y-6">
          {/* 수익 개요 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">이번 달 수익</p>
                    <p className="text-2xl font-bold text-success">1,650만원</p>
                    <p className="text-xs text-success flex items-center mt-1">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +11.5% 전월 대비
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-success/10 rounded-full flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">평균 세션당 수익</p>
                    <p className="text-2xl font-bold text-primary">80,128원</p>
                    <p className="text-xs text-primary flex items-center mt-1">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +5.2% 향상
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Activity className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">연간 목표 달성률</p>
                    <p className="text-2xl font-bold text-primary">8.3%</p>
                    <p className="text-xs text-gray-500 mt-1">
                      목표: 1억 5천만원
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 수익 상세 분석 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                수익 구성 분석
              </CardTitle>
              <CardDescription>카테고리별 수익 비중 및 성장률</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 카테고리별 수익 */}
                <div>
                  <h4 className="text-sm font-medium mb-4">강좌별 수익 비중</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-primary rounded"></div>
                        <span className="text-sm">기초 복종 훈련</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">650만원 (39%)</div>
                        <div className="text-xs text-success">+15%</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-success rounded"></div>
                        <span className="text-sm">어질리티 훈련</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">480만원 (29%)</div>
                        <div className="text-xs text-success">+8%</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-primary/50 rounded"></div>
                        <span className="text-sm">행동 교정</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">380만원 (23%)</div>
                        <div className="text-xs text-success">+22%</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-warning rounded"></div>
                        <span className="text-sm">사회화 훈련</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">140만원 (9%)</div>
                        <div className="text-xs text-destructive">-3%</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 월별 성장률 */}
                <div>
                  <h4 className="text-sm font-medium mb-4">월별 성장률</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">12월 → 1월</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-success h-2 rounded-full" style={{width: '75%'}}></div>
                        </div>
                        <span className="text-sm font-medium text-success">+11.5%</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">11월 → 12월</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-success h-2 rounded-full" style={{width: '85%'}}></div>
                        </div>
                        <span className="text-sm font-medium text-success">+25.4%</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">10월 → 11월</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-destructive h-2 rounded-full" style={{width: '40%'}}></div>
                        </div>
                        <span className="text-sm font-medium text-destructive">-10.6%</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">9월 → 10월</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-success h-2 rounded-full" style={{width: '60%'}}></div>
                        </div>
                        <span className="text-sm font-medium text-success">+14.8%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 예측 및 목표 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                수익 예측 및 목표
              </CardTitle>
              <CardDescription>현재 추이 기반 예측 및 연간 목표 달성 전략</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium mb-3">분기별 예상 수익</h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/30">
                      <div className="text-lg font-bold text-primary">1Q</div>
                      <div className="text-sm text-gray-600">4,200만원</div>
                      <div className="text-xs text-success mt-1">+18%</div>
                    </div>
                    <div className="text-center p-4 bg-success/10 rounded-lg border border-success/30">
                      <div className="text-lg font-bold text-success">2Q</div>
                      <div className="text-sm text-gray-600">3,800만원</div>
                      <div className="text-xs text-gray-600 mt-1">예측</div>
                    </div>
                    <div className="text-center p-4 bg-warning/10 rounded-lg border border-warning/30">
                      <div className="text-lg font-bold text-warning">3Q</div>
                      <div className="text-sm text-gray-600">3,500만원</div>
                      <div className="text-xs text-gray-600 mt-1">예측</div>
                    </div>
                    <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/30">
                      <div className="text-lg font-bold text-primary">4Q</div>
                      <div className="text-sm text-gray-600">4,500만원</div>
                      <div className="text-xs text-gray-600 mt-1">예측</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3">연간 목표 달성 전략</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">신규 고객 확보</span>
                      <span className="text-sm text-primary">월 평균 40명 → 60명</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">프리미엄 코스 론칭</span>
                      <span className="text-sm text-success">평균 수강료 +30%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">재수강률 향상</span>
                      <span className="text-sm text-primary">45% → 65%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 트렌드 분석 */}
        <TabsContent value="trends" className="space-y-6">
          {/* 시간대별 이용 패턴 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                시간대별 이용 패턴
              </CardTitle>
              <CardDescription>요일별 및 시간대별 훈련 세션 분포</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 요일별 패턴 */}
                <div>
                  <h4 className="text-sm font-medium mb-4">요일별 세션 수</h4>
                  <div className="space-y-3">
                    {[
                      { day: '월요일', count: 28, percentage: 85 },
                      { day: '화요일', count: 32, percentage: 95 },
                      { day: '수요일', count: 35, percentage: 100 },
                      { day: '목요일', count: 30, percentage: 88 },
                      { day: '금요일', count: 25, percentage: 75 },
                      { day: '토요일', count: 18, percentage: 52 },
                      { day: '일요일', count: 12, percentage: 35 }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm font-medium w-16">{item.day}</span>
                        <div className="flex-1 mx-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-500"
                              style={{width: `${item.percentage}%`}}
                            ></div>
                          </div>
                        </div>
                        <span className="text-sm text-gray-600 w-8 text-right">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 시간대별 패턴 */}
                <div>
                  <h4 className="text-sm font-medium mb-4">시간대별 세션 분포</h4>
                  <div className="flex items-end justify-between h-40 bg-gradient-to-t from-primary/5 to-transparent rounded-lg p-4">
                    {[
                      { time: '09', height: 30, sessions: 8 },
                      { time: '10', height: 45, sessions: 12 },
                      { time: '11', height: 60, sessions: 16 },
                      { time: '14', height: 85, sessions: 22 },
                      { time: '15', height: 100, sessions: 26 },
                      { time: '16', height: 95, sessions: 24 },
                      { time: '17', height: 75, sessions: 19 },
                      { time: '18', height: 55, sessions: 14 },
                      { time: '19', height: 40, sessions: 10 }
                    ].map((item, idx) => (
                      <div key={idx} className="flex flex-col items-center">
                        <div 
                          className="w-6 bg-primary/50 rounded-t mb-2 hover:bg-primary/90 transition-colors cursor-pointer"
                          style={{height: `${item.height}%`}}
                          title={`${item.time}시: ${item.sessions}세션`}
                        ></div>
                        <span className="text-xs text-gray-600">{item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 인기 강좌 트렌드 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                인기 강좌 트렌드
              </CardTitle>
              <CardDescription>최근 3개월간 강좌별 수요 변화</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* 강좌별 인기도 */}
                <div>
                  <h4 className="text-sm font-medium mb-4">강좌별 등록 추이</h4>
                  <div className="space-y-4">
                    {[
                      { name: '기초 복종 훈련', trend: 'up', change: '+23%', color: 'blue', popularity: 92 },
                      { name: '행동 교정', trend: 'up', change: '+45%', color: 'green', popularity: 78 },
                      { name: '어질리티 기초', trend: 'up', change: '+12%', color: 'purple', popularity: 65 },
                      { name: '사회화 훈련', trend: 'down', change: '-8%', color: 'red', popularity: 45 },
                      { name: '고급 트릭', trend: 'up', change: '+35%', color: 'yellow', popularity: 38 }
                    ].map((course, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full bg-${course.color}-500`}></div>
                          <span className="text-sm font-medium">{course.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`bg-${course.color}-500 h-2 rounded-full`}
                              style={{width: `${course.popularity}%`}}
                            ></div>
                          </div>
                          <div className="flex items-center gap-1">
                            {course.trend === 'up' ? (
                              <TrendingUp className="h-4 w-4 text-success" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-destructive" />
                            )}
                            <span className={`text-sm font-medium ${course.trend === 'up' ? 'text-success' : 'text-destructive'}`}>
                              {course.change}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 계절별 트렌드 */}
                <div>
                  <h4 className="text-sm font-medium mb-4">계절별 수요 패턴</h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/30">
                      <div className="text-2xl mb-2">❄️</div>
                      <div className="text-sm font-medium text-primary">겨울</div>
                      <div className="text-xs text-gray-600">실내 훈련 선호</div>
                      <div className="text-lg font-bold text-primary mt-2">85%</div>
                    </div>
                    <div className="text-center p-4 bg-success/10 rounded-lg border border-success/30">
                      <div className="text-2xl mb-2">🌸</div>
                      <div className="text-sm font-medium text-success">봄</div>
                      <div className="text-xs text-gray-600">사회화 훈련 증가</div>
                      <div className="text-lg font-bold text-success mt-2">120%</div>
                    </div>
                    <div className="text-center p-4 bg-warning/10 rounded-lg border border-warning/30">
                      <div className="text-2xl mb-2">☀️</div>
                      <div className="text-sm font-medium text-warning">여름</div>
                      <div className="text-xs text-gray-600">야외 활동 피크</div>
                      <div className="text-lg font-bold text-warning mt-2">145%</div>
                    </div>
                    <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/30">
                      <div className="text-2xl mb-2">🍂</div>
                      <div className="text-sm font-medium text-primary">가을</div>
                      <div className="text-xs text-gray-600">기초 훈련 집중</div>
                      <div className="text-lg font-bold text-primary mt-2">95%</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 고객 행동 패턴 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                고객 행동 패턴 분석
              </CardTitle>
              <CardDescription>학습자 특성 및 행동 패턴 인사이트</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 반려견 품종별 선호도 */}
                <div>
                  <h4 className="text-sm font-medium mb-4">품종별 인기 강좌</h4>
                  <div className="space-y-3">
                    {[
                      { breed: '골든 리트리버', course: '기초 복종', percentage: 85 },
                      { breed: '보더 콜리', course: '어질리티', percentage: 92 },
                      { breed: '시바견', course: '행동 교정', percentage: 78 },
                      { breed: '말티즈', course: '사회화', percentage: 65 },
                      { breed: '진돗개', course: '행동 교정', percentage: 88 }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium">{item.breed}</span>
                          <div className="text-xs text-gray-500">{item.course} 선호</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full"
                              style={{width: `${item.percentage}%`}}
                            ></div>
                          </div>
                          <span className="text-xs font-medium text-primary">{item.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 연령대별 참여율 */}
                <div>
                  <h4 className="text-sm font-medium mb-4">반려견 연령별 참여율</h4>
                  <div className="space-y-4">
                    {[
                      { age: '1세 미만', sessions: 45, color: 'emerald' },
                      { age: '1-3세', sessions: 78, color: 'blue' },
                      { age: '4-6세', sessions: 52, color: 'purple' },
                      { age: '7세 이상', sessions: 25, color: 'gray' }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm font-medium w-20">{item.age}</span>
                        <div className="flex-1 mx-3">
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className={`bg-gradient-to-r from-${item.color}-500 to-${item.color}-600 h-3 rounded-full`}
                              style={{width: `${(item.sessions / 78) * 100}%`}}
                            ></div>
                          </div>
                        </div>
                        <span className="text-sm text-gray-600 w-12 text-right">{item.sessions}회</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 예측 및 권장사항 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                트렌드 예측 및 권장사항
              </CardTitle>
              <CardDescription>데이터 기반 예측 및 전략적 제안</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium mb-3">다음 달 예상 트렌드</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg border border-success/30">
                      <TrendingUp className="h-5 w-5 text-success" />
                      <div>
                        <div className="text-sm font-medium text-success">행동 교정 수요 증가</div>
                        <div className="text-xs text-success">예상 +35% 증가</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/30">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <div>
                        <div className="text-sm font-medium text-primary">주말 세션 선호도 상승</div>
                        <div className="text-xs text-primary">토요일 +20% 예상</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-warning/10 rounded-lg border border-warning/30">
                      <TrendingDown className="h-5 w-5 text-warning" />
                      <div>
                        <div className="text-sm font-medium text-warning">실내 훈련 수요 감소</div>
                        <div className="text-xs text-warning">봄철 야외 선호</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3">전략적 권장사항</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-700">📈 신규 프로그램 제안</div>
                      <div className="text-xs text-gray-600 mt-1">반려견 요가 클래스 도입 검토</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-700">⏰ 운영시간 조정</div>
                      <div className="text-xs text-gray-600 mt-1">오후 2-6시 시간대 강화 필요</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-700">🎯 타겟 마케팅</div>
                      <div className="text-xs text-gray-600 mt-1">신규 견종 맞춤형 프로그램 개발</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 훈련 세션 상세 모달 */}
      <Dialog open={isTrainingSessionsOpen} onOpenChange={setIsTrainingSessionsOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-6 w-6" />
              총 훈련 세션 상세 ({trainingSessions?.length || 0}건)
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="훈련사명, 학생명, 강좌명으로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {sessionsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse bg-gray-200 h-16 rounded"></div>
                  ))}
                </div>
              ) : (
                trainingSessions?.map((session: TrainingSession) => (
                  <Card key={session.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{session.course.title}</h4>
                          {getStatusBadge(session.status)}
                          <Badge variant="outline">{session.course.category}</Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">훈련사:</span> {session.trainer.name}
                          </div>
                          <div>
                            <span className="font-medium">학생:</span> {session.student.name}
                          </div>
                          <div>
                            <span className="font-medium">반려동물:</span> {session.student.pet.name} ({session.student.pet.breed})
                          </div>
                          <div>
                            <span className="font-medium">날짜:</span> {session.date}
                          </div>
                          <div>
                            <span className="font-medium">시간:</span> {session.duration}분
                          </div>
                          <div>
                            <span className="font-medium">장소:</span> {session.location}
                          </div>
                          <div>
                            <span className="font-medium">수익:</span> {formatCurrency(session.revenue)}
                          </div>
                          {session.rating && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">평점:</span>
                              <div className="flex">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${
                                      i < session.rating! ? 'text-warning fill-current' : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTrainingSessionsOpen(false)}>
              닫기
            </Button>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              세션 데이터 다운로드
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 완료된 코스 상세 모달 */}
      <Dialog open={isCompletedCoursesOpen} onOpenChange={setIsCompletedCoursesOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6" />
              완료된 코스 상세 ({completedCourses?.length || 0}건)
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {coursesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse bg-gray-200 h-20 rounded"></div>
                  ))}
                </div>
              ) : (
                completedCourses?.map((course: CompletedCourse) => (
                  <Card key={course.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-lg">{course.title}</h4>
                          <Badge variant="success">완료</Badge>
                          <Badge variant="outline">{course.category}</Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                          <div>
                            <span className="font-medium">훈련사:</span> {course.trainer.name}
                          </div>
                          <div>
                            <span className="font-medium">학생:</span> {course.student.name}
                          </div>
                          <div>
                            <span className="font-medium">반려동물:</span> {course.student.pet.name} ({course.student.pet.breed})
                          </div>
                          <div>
                            <span className="font-medium">기간:</span> {course.startDate} ~ {course.endDate}
                          </div>
                          <div>
                            <span className="font-medium">세션:</span> {course.completedSessions}/{course.totalSessions}회
                          </div>
                          <div>
                            <span className="font-medium">총 수익:</span> {formatCurrency(course.totalRevenue)}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium">최종 평점:</span>
                            <div className="flex">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < course.finalRating ? 'text-warning fill-current' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm">({course.finalRating}/5)</span>
                          </div>
                        </div>

                        <div>
                          <span className="text-sm font-medium text-gray-600">달성 성과:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {course.achievements.map((achievement, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                <Award className="h-3 w-3 mr-1" />
                                {achievement}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompletedCoursesOpen(false)}>
              닫기
            </Button>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              코스 데이터 다운로드
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 상위 훈련사 상세 모달 */}
      <Dialog open={isTopTrainersOpen} onOpenChange={setIsTopTrainersOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              활성 훈련사 상세 ({topTrainers?.length || 0}명)
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {trainersLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse bg-gray-200 h-16 rounded"></div>
                  ))}
                </div>
              ) : (
                topTrainers?.map((trainer: Trainer) => (
                  <Card key={trainer.id} className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={trainer.avatar} />
                        <AvatarFallback>{trainer.name[0]}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-lg">{trainer.name}</h4>
                          {getStatusBadge(trainer.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">총 세션:</span> {trainer.totalSessions}회
                          </div>
                          <div>
                            <span className="font-medium">완료 코스:</span> {trainer.completedCourses}개
                          </div>
                          <div>
                            <span className="font-medium">활성 학생:</span> {trainer.activeStudents}명
                          </div>
                          <div>
                            <span className="font-medium">총 수익:</span> {formatCurrency(trainer.totalRevenue)}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium">평점:</span>
                            <div className="flex">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < Math.floor(trainer.averageRating) ? 'text-warning fill-current' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm">({trainer.averageRating})</span>
                          </div>
                          
                          <div>
                            <span className="text-sm font-medium">전문분야:</span>
                            <div className="flex flex-wrap gap-1 ml-2">
                              {trainer.specialization.map((spec, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">{spec}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTopTrainersOpen(false)}>
              닫기
            </Button>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              훈련사 데이터 다운로드
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 활성 학생 상세 모달 */}
      <Dialog open={isActiveStudentsOpen} onOpenChange={setIsActiveStudentsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6" />
              활성 학생 상세 ({activeStudents?.length || 0}명)
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {studentsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse bg-gray-200 h-16 rounded"></div>
                  ))}
                </div>
              ) : (
                activeStudents?.map((student: Student) => (
                  <Card key={student.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-lg">{student.name}</h4>
                          {getStatusBadge(student.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-2">
                          <div>
                            <span className="font-medium">반려동물:</span> {student.pet.name} ({student.pet.breed})
                          </div>
                          <div>
                            <span className="font-medium">나이:</span> {student.pet.age}살
                          </div>
                          <div>
                            <span className="font-medium">수강 코스:</span> {student.enrolledCourses}개
                          </div>
                          <div>
                            <span className="font-medium">완료 코스:</span> {student.completedCourses}개
                          </div>
                          <div>
                            <span className="font-medium">총 세션:</span> {student.totalSessions}회
                          </div>
                          <div>
                            <span className="font-medium">총 지출:</span> {formatCurrency(student.totalSpent)}
                          </div>
                          <div>
                            <span className="font-medium">가입일:</span> {student.joinDate}
                          </div>
                          <div>
                            <span className="font-medium">최근 활동:</span> {student.lastActivity}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium">평균 평점:</span>
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < Math.floor(student.averageRating) ? 'text-warning fill-current' : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm">({student.averageRating})</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsActiveStudentsOpen(false)}>
              닫기
            </Button>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              학생 데이터 다운로드
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}