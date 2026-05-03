import { useEffect, useState } from "react";
import { useAuth } from "../../SimpleApp";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Users, BookOpen, Calendar, DollarSign, TrendingUp, Award, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface TrainerDashboardProps {
  onAction: (action: string, data?: any) => void;
}

interface TrainerStats {
  activeCourses: number;
  totalStudents: number;
  monthlyRevenue: number;
  totalReservations: number;
  pendingReservations: number;
  completedReservations: number;
  rating: number;
  unreadMessages: number;
  unreadNotifications: number;
  recentActivity: {
    newStudentsThisWeek: number;
    completedSessionsThisWeek: number;
  };
}

// 훈련사 대시보드 전용 배너 슬라이드
const trainerDashboardBanners = [
  {
    id: 1,
    title: "더 많은 반려인들이 당신을 찾고 있습니다",
    subtitle: "TALEZ 플랫폼을 통해 전국의 반려인들과 연결되고 안정적인 고객층을 확보하세요",
    image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&h=400",
    action: { text: "고객 연결", path: "/trainer/customer-connect" }
  },
  {
    id: 2,
    title: "전문 훈련사의 가치를 제대로 인정받으세요",
    subtitle: "투명한 수수료 체계와 공정한 정산으로 전문가로서의 가치를 제대로 평가받으세요",
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&h=400",
    action: { text: "수수료 확인", path: "/trainer/commission-info" }
  },
  {
    id: 3,
    title: "온라인과 오프라인을 넘나드는 새로운 교육 경험",
    subtitle: "디지털 도구와 전통적인 교육 방식을 결합해 혁신적인 훈련 서비스를 제공하세요",
    image: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&h=400",
    action: { text: "새로운 교육법", path: "/trainer/hybrid-education" }
  },
  {
    id: 4,
    title: "훈련사 커뮤니티에서 노하우를 공유하고 성장하세요",
    subtitle: "전국의 전문 훈련사들과 경험을 나누고 함께 성장하는 네트워크에 참여하세요",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&h=400",
    action: { text: "커뮤니티 참여", path: "/trainer/community" }
  },
  {
    id: 5,
    title: "반려견 교육의 미래를 함께 만들어갑니다",
    subtitle: "혁신적인 교육 방법과 최신 기술로 업계를 선도하는 훈련사가 되어보세요",
    image: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&h=400",
    action: { text: "혁신 참여", path: "/trainer/innovation" }
  }
];

export default function TrainerDashboard({ onAction }: TrainerDashboardProps) {
  const { userName } = useAuth();
  const [stats, setStats] = useState<TrainerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    fetchTrainerStats();
  }, []);

  // 배너 자동 슬라이드 효과
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % trainerDashboardBanners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % trainerDashboardBanners.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + trainerDashboardBanners.length) % trainerDashboardBanners.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const fetchTrainerStats = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('GET', '/api/dashboard/trainer/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('훈련사 통계 조회 실패:', error);
      setStats({
        activeCourses: 0,
        totalStudents: 0,
        monthlyRevenue: 0,
        totalReservations: 0,
        pendingReservations: 0,
        completedReservations: 0,
        rating: 0,
        unreadMessages: 0,
        unreadNotifications: 0,
        recentActivity: {
          newStudentsThisWeek: 0,
          completedSessionsThisWeek: 0
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const currentBanner = trainerDashboardBanners[currentSlide];

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      {/* Banner Slider */}
      <div className="relative rounded-xl overflow-hidden h-60 md:h-80 mb-8 shadow-lg">
        <img 
          src={currentBanner.image}
          alt={currentBanner.title}
          className="w-full h-full object-cover absolute"
        />
        
        {/* 배너 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30"></div>
        
        <div className="relative h-full flex flex-col justify-center px-8 md:px-12">
          <h1 className="text-white text-2xl md:text-4xl font-bold mb-2 md:mb-4 max-w-xl">
            {currentBanner.title}
          </h1>
          <p className="text-white text-sm md:text-lg max-w-xl mb-6">
            {currentBanner.subtitle}
          </p>
          <div>
            <Button
              className="bg-white text-primary font-semibold hover:bg-gray-50 mr-3"
              onClick={() => window.location.href = currentBanner.action.path}
            >
              {currentBanner.action.text}
            </Button>
            <Button
              variant="outline"
              className="border-2 border-white text-white hover:bg-white/10 font-semibold"
              onClick={() => window.location.href = '/trainer/certification'}
            >
              전문가 인증 업그레이드
            </Button>
          </div>
        </div>

        {/* 네비게이션 화살표 */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
          onClick={prevSlide}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
          onClick={nextSlide}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>

        {/* 슬라이드 인디케이터 */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {trainerDashboardBanners.map((_, index) => (
            <button
              key={index}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'bg-white scale-110' 
                  : 'bg-white/50 hover:bg-white/70'
              }`}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
      </div>
      
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-12 w-12 bg-primary/10 dark:bg-primary/30 text-primary dark:text-primary rounded-full flex items-center justify-center">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">진행 중인 강의</h2>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">
                {isLoading ? "..." : `${stats?.activeCourses || 0}개`}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>활성 강좌</span>
              <button 
                onClick={() => window.location.href = '/trainer/courses'}
                className="text-primary hover:text-primary/80 text-xs font-medium"
              >
                관리
              </button>
            </div>
          </div>
        </Card>
        
        <Card className="p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-12 w-12 bg-success/10 dark:bg-success/30 text-success dark:text-success rounded-full flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">수강생</h2>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">
                {isLoading ? "..." : `${stats?.totalStudents || 0}명`}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>이번 주 +{stats?.recentActivity.newStudentsThisWeek || 0}명</span>
              <button 
                onClick={() => window.location.href = '/trainer/students'}
                className="text-primary hover:text-primary/80 text-xs font-medium"
              >
                상세
              </button>
            </div>
          </div>
        </Card>
        
        <Card className="p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-12 w-12 bg-accent/20 dark:bg-accent/10 text-accent dark:text-accent/90 rounded-full flex items-center justify-center">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">월 수익</h2>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">
                {isLoading ? "..." : `${(stats?.monthlyRevenue || 0).toLocaleString()}원`}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>실시간 수익</span>
              <button 
                onClick={() => window.location.href = '/trainer/earnings'}
                className="text-primary hover:text-primary/80 text-xs font-medium"
              >
                내역
              </button>
            </div>
          </div>
        </Card>
        
        <Card className="p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-12 w-12 bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary rounded-full flex items-center justify-center">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">예정된 강의</h2>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">3개</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs text-gray-700 dark:text-gray-300">
              <div className="flex items-center mb-1">
                <svg className="h-3 w-3 text-primary dark:text-primary mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span>오늘 15:00 - 기초 훈련반</span>
              </div>
              <div className="flex items-center">
                <svg className="h-3 w-3 text-primary dark:text-primary mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span>내일 13:00 - 심화 과정</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="border border-gray-100 dark:border-gray-700">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">수익 추이</h2>
              <Badge variant="info">최근 6개월</Badge>
            </div>
            <div className="h-64 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  여기에 수익 차트가 표시됩니다.
                </span>
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="border border-gray-100 dark:border-gray-700">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">수강생 분포</h2>
              <Badge variant="success">활성 사용자</Badge>
            </div>
            <div className="h-64 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  여기에 수강생 분포 차트가 표시됩니다.
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Recent Activities */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">최근 활동</h2>
        </div>
        
        <Card className="border border-gray-100 dark:border-gray-700">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            <div className="p-5 flex items-center">
              <div className="flex-shrink-0 h-10 w-10 bg-success/10 dark:bg-success/30 text-success dark:text-success rounded-full flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <div className="ml-4 flex-1">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-gray-800 dark:text-white">
                    신규 수강생 등록
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">1시간 전</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  김견주님이 "반려견 기초 훈련 마스터하기" 강의에 등록했습니다.
                </p>
              </div>
            </div>
            
            <div className="p-5 flex items-center">
              <div className="flex-shrink-0 h-10 w-10 bg-primary/10 dark:bg-primary/30 text-primary dark:text-primary rounded-full flex items-center justify-center">
                <Award className="h-5 w-5" />
              </div>
              <div className="ml-4 flex-1">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-gray-800 dark:text-white">
                    수료증 발급
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">3시간 전</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  박반려님이 "반려견 사회화 훈련" 과정을 완료하고 수료증을 받았습니다.
                </p>
              </div>
            </div>
            
            <div className="p-5 flex items-center">
              <div className="flex-shrink-0 h-10 w-10 bg-accent/20 dark:bg-accent/10 text-accent dark:text-accent/90 rounded-full flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
              <div className="ml-4 flex-1">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-gray-800 dark:text-white">
                    수익 입금
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">어제</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  5월 강의 수익 545,000원이 계좌에 입금되었습니다.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Popular Courses */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">인기 강의</h2>
          <a href="/trainer/courses" className="text-sm text-primary hover:text-primary/80 font-medium">모든 강의</a>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="overflow-hidden border border-gray-100 dark:border-gray-700 card-hover">
            <div className="relative h-40">
              <img 
                src="https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=350" 
                alt="반려견 기초 훈련 마스터하기" 
                className="w-full h-full object-cover"
              />
              <Badge variant="warning" className="absolute top-0 right-0 m-2">인기</Badge>
            </div>
            <div className="p-5">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">반려견 기초 훈련 마스터하기</h3>
              <div className="flex justify-between items-center text-sm mb-4">
                <span className="text-gray-500 dark:text-gray-400">수강생: 24명</span>
                <span className="font-medium text-accent">89,000원</span>
              </div>
              <div className="flex justify-between items-center">
                <Badge variant="success">평점 4.8/5</Badge>
                <Badge variant="info">후기 16개</Badge>
              </div>
            </div>
          </Card>
          
          <Card className="overflow-hidden border border-gray-100 dark:border-gray-700 card-hover">
            <div className="relative h-40">
              <img 
                src="https://images.unsplash.com/photo-1583336663277-620dc1996580?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=350" 
                alt="반려견 어질리티 입문" 
                className="w-full h-full object-cover"
              />
              <Badge variant="info" className="absolute top-0 right-0 m-2">중급</Badge>
            </div>
            <div className="p-5">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">반려견 어질리티 입문</h3>
              <div className="flex justify-between items-center text-sm mb-4">
                <span className="text-gray-500 dark:text-gray-400">수강생: 12명</span>
                <span className="font-medium text-accent">120,000원</span>
              </div>
              <div className="flex justify-between items-center">
                <Badge variant="success">평점 4.6/5</Badge>
                <Badge variant="info">후기 8개</Badge>
              </div>
            </div>
          </Card>
          
          <Card className="overflow-hidden border border-gray-100 dark:border-gray-700 card-hover">
            <div className="relative h-40">
              <img 
                src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=350" 
                alt="반려견 사회화 훈련" 
                className="w-full h-full object-cover"
              />
              <Badge variant="success" className="absolute top-0 right-0 m-2">초급</Badge>
            </div>
            <div className="p-5">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">반려견 사회화 훈련</h3>
              <div className="flex justify-between items-center text-sm mb-4">
                <span className="text-gray-500 dark:text-gray-400">수강생: 18명</span>
                <span className="font-medium text-accent">75,000원</span>
              </div>
              <div className="flex justify-between items-center">
                <Badge variant="success">평점 4.9/5</Badge>
                <Badge variant="info">후기 12개</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
