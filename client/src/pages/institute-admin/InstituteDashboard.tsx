import { useState, useEffect } from 'react';
import { useGlobalAuth } from '@/hooks/useGlobalAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Users,
  GraduationCap,
  TrendingUp,
  Calendar,
  DollarSign,
  Award,
  BarChart3,
  Activity,
  UserCheck,
  BookOpen,
  Target
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface DashboardStats {
  totalTrainers: number;
  activeTrainers: number;
  totalStudents: number;
  newStudentsThisMonth: number;
  totalCourses: number;
  activeCourses: number;
  monthlyRevenue: number;
  totalRevenue: number;
  pendingApplications: number;
  completedCourses: number;
  avgRating: number;
  upcomingClasses: number;
}

interface RecentActivity {
  id: number;
  type: 'enrollment' | 'completion' | 'trainer_join' | 'course_create';
  title: string;
  description: string;
  timestamp: string;
  icon: string;
}

interface UpcomingClass {
  id: number;
  courseName: string;
  trainerName: string;
  studentCount: number;
  startTime: string;
  duration: number;
  room: string;
}

export default function InstituteDashboard() {
  const { userName } = useGlobalAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 대시보드 데이터 로드
  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockStats: DashboardStats = {
          totalTrainers: 15,
          activeTrainers: 12,
          totalStudents: 156,
          newStudentsThisMonth: 23,
          totalCourses: 28,
          activeCourses: 18,
          monthlyRevenue: 8750000,
          totalRevenue: 45600000,
          pendingApplications: 7,
          completedCourses: 342,
          avgRating: 4.7,
          upcomingClasses: 12
        };

        const mockActivities: RecentActivity[] = [
          {
            id: 1,
            type: 'enrollment',
            title: '새로운 수강 신청',
            description: '김철수님이 반려견 기본 훈련 과정에 등록했습니다.',
            timestamp: '2024-05-26T10:30:00Z',
            icon: '👥'
          },
          {
            id: 2,
            type: 'trainer_join',
            title: '새 훈련사 합류',
            description: '박영희 훈련사가 기관에 합류했습니다.',
            timestamp: '2024-05-26T09:15:00Z',
            icon: '🎓'
          },
          {
            id: 3,
            type: 'completion',
            title: '수료 완료',
            description: '이민수님이 고급 트릭 훈련을 수료했습니다.',
            timestamp: '2024-05-25T16:45:00Z',
            icon: '🏆'
          },
          {
            id: 4,
            type: 'course_create',
            title: '새 강좌 개설',
            description: '어질리티 입문 과정이 새로 개설되었습니다.',
            timestamp: '2024-05-25T14:20:00Z',
            icon: '📚'
          }
        ];

        const mockUpcomingClasses: UpcomingClass[] = [
          {
            id: 1,
            courseName: '반려견 기본 훈련',
            trainerName: '김영수 훈련사',
            studentCount: 8,
            startTime: '2024-05-27T10:00:00Z',
            duration: 90,
            room: 'A동 1층 훈련장'
          },
          {
            id: 2,
            courseName: '퍼피 사회화',
            trainerName: '이서연 훈련사',
            studentCount: 6,
            startTime: '2024-05-27T14:00:00Z',
            duration: 60,
            room: 'B동 2층 소강의실'
          },
          {
            id: 3,
            courseName: '어질리티 중급',
            trainerName: '박민준 훈련사',
            studentCount: 4,
            startTime: '2024-05-27T16:30:00Z',
            duration: 120,
            room: 'C동 야외 훈련장'
          }
        ];
        
        setStats(mockStats);
        setRecentActivities(mockActivities);
        setUpcomingClasses(mockUpcomingClasses);
      } catch (error) {
        console.error('대시보드 데이터 로딩 오류:', error);
        toast({
          title: '데이터 로딩 오류',
          description: '대시보드 정보를 불러오는 중 오류가 발생했습니다.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDashboardData();
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-2">
          <Building2 className="h-8 w-8 animate-pulse text-primary" />
          <p className="text-sm text-muted-foreground">대시보드 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold">데이터를 불러올 수 없습니다</h3>
        <p className="text-muted-foreground">나중에 다시 시도해주세요.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">기관 대시보드</h1>
          <p className="text-muted-foreground">
            안녕하세요, {userName}님! 오늘의 기관 현황을 확인하세요.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">마지막 업데이트</p>
          <p className="text-sm font-medium">
            {format(new Date(), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
          </p>
        </div>
      </div>

      {/* 주요 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <GraduationCap className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">총 훈련사</p>
                <p className="text-2xl font-bold">{stats.totalTrainers}명</p>
                <p className="text-xs text-success">활성 {stats.activeTrainers}명</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-success" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">총 수강생</p>
                <p className="text-2xl font-bold">{stats.totalStudents}명</p>
                <p className="text-xs text-success">이달 +{stats.newStudentsThisMonth}명</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">운영 강좌</p>
                <p className="text-2xl font-bold">{stats.activeCourses}개</p>
                <p className="text-xs text-muted-foreground">총 {stats.totalCourses}개</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-warning" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">이달 수익</p>
                <p className="text-2xl font-bold">{(stats.monthlyRevenue / 10000).toFixed(0)}만원</p>
                <p className="text-xs text-muted-foreground">총 {(stats.totalRevenue / 100000000).toFixed(1)}억원</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 추가 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">대기 신청</p>
                <p className="text-2xl font-bold">{stats.pendingApplications}건</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Award className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">수료 완료</p>
                <p className="text-2xl font-bold">{stats.completedCourses}건</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">평균 평점</p>
                <p className="text-2xl font-bold">{stats.avgRating}</p>
                <p className="text-xs text-warning">★★★★★</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-secondary-foreground" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">예정 수업</p>
                <p className="text-2xl font-bold">{stats.upcomingClasses}개</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 활동 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              최근 활동
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                  <span className="text-2xl">{activity.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(activity.timestamp), 'MM월 dd일 HH:mm', { locale: ko })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 오늘의 수업 일정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              오늘의 수업 일정
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingClasses.map((classItem) => (
                <div key={classItem.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{classItem.courseName}</h4>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(classItem.startTime), 'HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    👨‍🏫 {classItem.trainerName}
                  </p>
                  <p className="text-sm text-muted-foreground mb-1">
                    👥 수강생 {classItem.studentCount}명 · {classItem.duration}분
                  </p>
                  <p className="text-sm text-muted-foreground">
                    📍 {classItem.room}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 빠른 액세스 버튼 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            빠른 액세스
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col">
              <Users className="h-6 w-6 mb-2" />
              <span>훈련사 관리</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <BookOpen className="h-6 w-6 mb-2" />
              <span>강좌 관리</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <TrendingUp className="h-6 w-6 mb-2" />
              <span>매출 현황</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Building2 className="h-6 w-6 mb-2" />
              <span>기관 설정</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}