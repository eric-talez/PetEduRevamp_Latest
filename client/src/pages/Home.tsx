import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { TrendingSection } from '@/components/TrendingSection';
import { MiniChart } from '@/components/ui/mini-chart';
import { WeeklyWeatherModal } from '@/components/WeeklyWeatherModal';
import { ShopPreview } from '@/components/ShopPreview';
import { SocialLoginButtons } from '@/components/SocialLoginButtons';
import { RealTimePopularChart } from '@/components/RealTimePopularChart';
import { ProgressWidget } from '@/components/ProgressWidget';
import { RecommendationCard } from '@/components/RecommendationCard';
import { useState, lazy, Suspense, useEffect, useMemo } from 'react';
import { Loader2, ChevronDown, ChevronRight, ChevronLeft, Upload, Play, CheckCircle, MapPin, Video, ArrowRight, BookOpen, Users as LucideUsers, Heart, Syringe, BarChart3, Calendar, Settings, UserPlus, Zap, Info, TrendingUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PasswordResetForm } from '@/components/PasswordResetForm';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { setRouteLoading } from '@/hooks/use-route-loading';
// Banner 타입을 local로 정의
interface Banner {
  id: number;
  title: string;
  content: string;
  imageUrl: string;
  actionText?: string;
  actionUrl?: string;
  position: string;
  type: string;
  isActive: boolean;
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  TalezSection,
  TalezPageHeader,
  TalezCard,
  TalezButton,
  TalezBadge,
  TalezGrid,
  TalezIcon,
  IconPetCare,
  IconTraining,
  IconCertificate,
  IconLocation,
  IconVideoCall,
  IconShield
} from '@/components/ui/TalezDesignSystem';
import DogTrainingBackground from '@assets/stock_images/happy_dog_training_o_e67db05d.jpg';
import DogTrainingBackground2 from '@assets/stock_images/professional_dog_tra_64c29073.jpg';
import DogTrainingBackground3 from '@assets/stock_images/modern_pet_training__7ccd29e2.jpg';
import DogTrainingBackground4 from '@assets/stock_images/happy_healthy_dog_ge_4c9ac208.jpg';

// 히어로 섹션 슬라이드 이미지 배열
const heroBackgroundImages = [
  DogTrainingBackground,
  DogTrainingBackground2,
  DogTrainingBackground3,
  DogTrainingBackground4
];


// 각 역할별 홈 페이지를 동적으로 임포트
const TrainerHome = lazy(() => import('./trainer/TrainerHome'));
const PetOwnerHome = lazy(() => import('./pet-owner/PetOwnerHome'));
const InstituteAdminHome = lazy(() => import('./institute-admin/InstituteAdminHome'));

export default function Home() {
  // 불필요한 로그 제거
  const { isAuthenticated, userRole, userName, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false);
  const [isServiceStatsOpen, setIsServiceStatsOpen] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // 실제 시스템 통계 데이터 가져오기
  interface SystemStats {
    totalUsers: number;
    activeUsers: number;
    uptime: number;
  }

  const { data: systemStats } = useQuery<SystemStats>({
    queryKey: ['/api/dashboard/system/status'],
    refetchInterval: 60000, // 60초마다 업데이트
    staleTime: 55000
  });

  // 주간 통계 데이터 타입 정의
  interface WeeklyStats {
    userRegistrations: number[];
    trainerCertifications: number[];
    petRegistrations: number[];
    labels: string[];
  }

  // 주간 통계 데이터 조회
  const { data: weeklyStats } = useQuery<WeeklyStats>({
    queryKey: ['/api/weekly-stats'],
    refetchInterval: 300000, // 5분마다 업데이트
    staleTime: 240000
  });

  // TALEZ 체험 서비스 상태
  const [showExperience, setShowExperience] = useState(false);
  const [videoDescription, setVideoDescription] = useState<string>('');
  const [analysisStep, setAnalysisStep] = useState<'upload' | 'analyzing' | 'result'>('upload');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string>('');

  // 관리자가 등록한 배너 데이터 조회
  const { data: adminBanners = [], isLoading: bannersLoading } = useQuery({
    queryKey: ['/api/banners', 'main', 'hero'],
    queryFn: async () => {
      const response = await fetch('/api/banners?type=main&position=hero');
      if (!response.ok) {
        throw new Error('배너를 불러오는데 실패했습니다');
      }
      return response.json() as Promise<Banner[]>;
    }
  });

  // 영상 분석 시작
  const startAnalysis = async () => {
    if (!videoDescription || videoDescription.trim().length < 20) {
      setUploadError('강아지의 행동을 더 자세히 설명해주세요 (최소 20자).');
      return;
    }

    setAnalysisStep('analyzing');
    setUploadError('');

    try {
      const response = await apiRequest('POST', '/api/ai/analyze-video', {
        videoDescription: videoDescription.trim()
      });

      // Response 객체에서 JSON 데이터 추출
      const data = await response.json();
      setAnalysisResult(data);
      setAnalysisStep('result');
    } catch (error) {
      setUploadError('AI 분석 중 오류가 발생했습니다. 다시 시도해주세요.');
      setAnalysisStep('upload');
      console.error('분석 오류:', error);
    }
  };

  // 체험 서비스 초기화
  const resetExperience = () => {
    setVideoDescription('');
    setAnalysisStep('upload');
    setAnalysisResult(null);
    setUploadError('');
  };

  // 기본 배너 데이터 (관리자 배너가 없을 때 사용)
  const defaultBannerSlides = [
    {
      id: 1,
      title: "AI 기반 맞춤형 반려동물 케어",
      subtitle: "TALEZ의 AI 대시보드로 반려동물의 행동을 분석하고 최적의 훈련 방법을 제공받으세요",
      features: ["AI 분석", "맞춤 훈련", "실시간 인사이트", "전문가 추천"],
      image: "/attached_assets/stock_images/professional_dog_tra_96215a25.jpg",
      primaryAction: { text: "AI 분석 시작", path: "/home" },
      secondaryAction: { text: "더 알아보기", path: "/about" }
    },
    {
      id: 2,
      title: "검증된 전문 훈련사와 함께하는 교육",
      subtitle: "TALEZ 인증 전문 훈련사가 직접 제공하는 1:1 맞춤형 훈련 프로그램",
      features: ["검증된 전문가", "디지털 코칭", "체계적 커리큘럼", "자격증 보유"],
      image: "/attached_assets/stock_images/professional_dog_tra_ee84aa05.jpg",
      primaryAction: { text: "무료 체험하기", path: "/experience" },
      secondaryAction: { text: "훈련사 찾기", path: "/trainers" }
    },
    {
      id: 3,
      title: "스마트한 반려동물 용품 쇼핑",
      subtitle: "AI 추천 시스템으로 우리 반려동물에게 딱 맞는 용품을 찾아보세요",
      features: ["AI 추천", "빠른 배송", "친환경 제품", "로열티 혜택"],
      image: "/attached_assets/stock_images/happy_dog_with_pet_p_0b4dccf7.jpg",
      primaryAction: { text: "쇼핑하기", path: "/shop" },
      secondaryAction: { text: "추천 상품", path: "/shop/recommended" }
    },
    {
      id: 4,
      title: "전국 지점 운영 - 편리한 접근성",
      subtitle: "공평점과 석적점에서 전문적인 반려견 교육 서비스를 만나보세요",
      features: ["전국 지점", "편리한 위치", "전문 시설", "개별 맞춤"],
      image: "/attached_assets/stock_images/professional_dog_tra_c9c39d39.jpg",
      primaryAction: { text: "화상 교육", path: "/video-training" },
      secondaryAction: { text: "훈련사 보기", path: "/trainers" }
    },
    {
      id: 5,
      title: "반려견 건강 관리 & 기록",
      subtitle: "반려견의 건강 상태를 체계적으로 관리하고 기록해보세요",
      features: ["건강 기록", "예방접종 알림", "병원 예약", "전문 상담"],
      image: "/attached_assets/stock_images/veterinarian_examini_05b2b989.jpg",
      primaryAction: { text: "건강 관리", path: "/health" },
      secondaryAction: { text: "기록 시작", path: "/health-record" }
    },
    {
      id: 6,
      title: "반려견 교육 용품 쇼핑몰",
      subtitle: "교육에 필요한 다양한 용품들을 한 곳에서 만나보세요",
      features: ["훈련사 추천", "교육 연계 할인", "빠른 배송"],
      image: "/attached_assets/stock_images/happy_dog_with_pet_p_f665e30e.jpg",
      primaryAction: { text: "쇼핑하기", path: "/shop" },
      secondaryAction: { text: "추천 상품", path: "/shop/recommended" }
    },
    {
      id: 8,
      title: "전문 훈련사로 활동하기",
      subtitle: "전문 지식과 경험을 바탕으로 TALEZ 플랫폼에서 훈련사로 활동하세요",
      features: ["훈련사 등록", "고객 매칭", "안정적 수익"],
      image: "/attached_assets/stock_images/pet_owner_community__8108ab64.jpg",
      primaryAction: { text: "훈련사 등록", path: "/registration/trainer" },
      secondaryAction: { text: "혜택 보기", path: "/trainer/benefits" }
    },
    {
      id: 9,
      title: "교육 기관 및 훈련소 등록",
      subtitle: "전문 교육 기관이나 훈련소를 운영하신다면 TALEZ와 함께하세요",
      features: ["기관 등록", "코스 관리", "수익 창출"],
      image: "/attached_assets/stock_images/veterinarian_examini_fc0ee403.jpg",
      primaryAction: { text: "기관 등록", path: "/registration/institute" },
      secondaryAction: { text: "파트너 안내", path: "/partners" }
    }
  ];

  // 훈련사 전용 배너 슬라이드 - 핵심 6개로 축소
  const trainerBannerSlides = [
    {
      id: 101,
      title: "더 많은 반려인들이 당신을 찾고 있습니다",
      subtitle: "TALEZ 플랫폼을 통해 전국의 반려인들과 연결되고 안정적인 고객층을 확보하세요",
      features: ["전국 고객 연결", "안정적 수익", "브랜드 인지도"],
      image: "/attached_assets/KakaoTalk_Photo_2025-07-05-22-37-00 002_1751722697071.png",
      primaryAction: { text: "고객 연결", path: "/trainer/customer-connect" },
      secondaryAction: { text: "성공 사례", path: "/trainer/success-stories" }
    },
    {
      id: 102,
      title: "전문 훈련사의 가치를 제대로 인정받으세요",
      subtitle: "투명한 수수료 체계와 공정한 정산으로 전문가로서의 가치를 제대로 평가받으세요",
      features: ["공정한 보상", "투명한 정산", "전문가 대우"],
      image: "/attached_assets/image_1746582251297.png",
      primaryAction: { text: "수수료 확인", path: "/trainer/commission-info" },
      secondaryAction: { text: "정산 내역", path: "/trainer/settlement" }
    },
    {
      id: 103,
      title: "온·오프라인 통합 교육 시스템",
      subtitle: "디지털 도구와 전통적인 교육 방식을 결합해 혁신적인 훈련 서비스를 제공하세요",
      features: ["하이브리드 교육", "디지털 도구", "혁신적 서비스"],
      image: "/attached_assets/KakaoTalk_Photo_2025-07-05-22-37-00 003_1751722697072.png",
      primaryAction: { text: "새로운 교육법", path: "/trainer/hybrid-education" },
      secondaryAction: { text: "디지털 도구", path: "/trainer/digital-tools" }
    },
    {
      id: 104,
      title: "24시간 자동 예약 시스템",
      subtitle: "시간과 장소에 구애받지 않고 더 많은 수익을 창출하세요",
      features: ["24시간 예약", "자동 스케줄링", "수익 극대화"],
      image: "/attached_assets/KakaoTalk_Photo_2025-07-05-22-37-00 001_1751722697059.png",
      primaryAction: { text: "예약 시스템", path: "/trainer/booking-system" },
      secondaryAction: { text: "수익 통계", path: "/trainer/revenue" }
    },
    {
      id: 105,
      title: "프리미엄 훈련사 인증 프로그램",
      subtitle: "고급 인증과 특별한 혜택으로 더 높은 수준의 서비스를 제공하세요",
      features: ["프리미엄 인증", "차별화 서비스", "높은 수수료"],
      image: "/attached_assets/KakaoTalk_Photo_2025-07-05-22-37-00 002_1751722697071.png",
      primaryAction: { text: "프리미엄 등급", path: "/trainer/premium-tier" },
      secondaryAction: { text: "인증 신청", path: "/trainer/certification-apply" }
    },
    {
      id: 106,
      title: "AI 기반 훈련 효과 분석",
      subtitle: "최신 AI 분석 도구와 데이터를 활용해 훈련 효과를 극대화하세요",
      features: ["AI 분석", "데이터 활용", "효과 최적화"],
      image: "/attached_assets/KakaoTalk_Photo_2025-07-05-22-37-00 003_1751722697072.png",
      primaryAction: { text: "AI 도구", path: "/trainer/ai-tools" },
      secondaryAction: { text: "분석 리포트", path: "/trainer/analytics-report" }
    }
  ];

  // 관리자 배너를 표시 형식으로 변환하는 함수
  const convertAdminBannerToSlide = (banner: Banner) => ({
    id: banner.id,
    title: banner.title,
    subtitle: banner.content || '',
    features: [],
    image: banner.imageUrl,
    primaryAction: {
      text: banner.actionText || "자세히 보기",
      path: banner.actionUrl || "/"
    },
    secondaryAction: {
      text: "더 알아보기",
      path: "/about"
    }
  });

  // 훈련사 배너를 슬라이드 형식으로 변환
  const convertTrainerBannerToSlide = (banner: any) => ({
    id: banner.id,
    title: banner.title,
    subtitle: banner.subtitle,
    features: banner.features,
    image: banner.image,
    primaryAction: banner.primaryAction,
    secondaryAction: banner.secondaryAction
  });

  // 표시할 배너 슬라이드 결정 (사용자 역할에 따라 다른 배너 표시)
  const bannerSlides = useMemo(() => {
    // 전역 상태에서 인증 정보도 확인
    const globalAuth = (window as any).__peteduAuthState;
    const actualIsAuthenticated = isAuthenticated || globalAuth?.isAuthenticated;
    const actualUserRole = userRole || globalAuth?.userRole;


    // 인증된 훈련사인 경우 훈련사 전용 배너 표시
    if (actualIsAuthenticated && actualUserRole === 'trainer') {
      return trainerBannerSlides.map(convertTrainerBannerToSlide);
    }

    // 새로운 배너를 항상 첫 번째로 표시 (관리자 배너가 있어도 우선)
    const heroSlide = defaultBannerSlides[0];

    if (adminBanners.length > 0) {
      const adminSlides = adminBanners.map(convertAdminBannerToSlide);
      return [heroSlide, ...adminSlides];
    }

    return defaultBannerSlides;
  }, [isAuthenticated, userRole, adminBanners, trainerBannerSlides.length]);


  // 배너가 변경될 때 currentSlide 리셋
  useEffect(() => {
    setCurrentSlide(0);
  }, [bannerSlides.length]);

  // 서비스 현황 토글 함수
  const toggleServiceStats = () => {
    setIsServiceStatsOpen(prev => !prev);
  };

  // 배너 슬라이드 네비게이션 함수
  const nextSlide = () => {
    setCurrentSlide((prev) => {
      const next = (prev + 1) % bannerSlides.length;

      return next;
    });
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => {
      const next = (prev - 1 + bannerSlides.length) % bannerSlides.length;

      return next;
    });
  };

  // 자동 슬라이드 진행
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerSlides.length);
    }, 5000); // 5초마다 자동 진행

    return () => clearInterval(interval);
  }, [bannerSlides.length]);

  // 빠른 로그인 처리 함수
  const handleQuickLogin = (role: string) => {
    // 로그인 시뮬레이션을 위한 함수
    let mockUser = {
      id: 1,
      username: `demo-${role}`,
      name: role === 'pet-owner' ? '반려인' :
            role === 'trainer' ? '훈련사' :
            role === 'institute-admin' ? '기관 관리자' :
            role === 'admin' ? '관리자' : `데모 사용자`,
      email: "test@example.com",
      role: role
    };

    // 로그인 이벤트 발생 (hooks/useAuth.tsx에서 이 이벤트를 감지함)
    const loginEvent = new CustomEvent('login', {
      detail: {
        role: mockUser.role,
        name: mockUser.name,
        userName: mockUser.name,
        userRole: mockUser.role
      }
    });

    console.log('Login event dispatched as:', role);
    window.dispatchEvent(loginEvent);
  };

  // 훈련사는 메인 홈페이지에서 전용 배너를 보도록 변경
  // 다른 역할들은 기존대로 전용 홈페이지로 리다이렉트
  if (isAuthenticated && userRole !== 'trainer') {
    console.log("Home 컴포넌트: 인증된 사용자, 역할:", userRole);
    let HomeComponent;

    switch(userRole) {
      case 'pet-owner':
        console.log("Home 컴포넌트: 반려인 홈 렌더링");
        HomeComponent = PetOwnerHome;
        break;
      case 'institute-admin':
        console.log("Home 컴포넌트: 기관 관리자 홈 렌더링");
        HomeComponent = InstituteAdminHome;
        break;
      default:
        console.log("Home 컴포넌트: 기본 홈페이지로 폴백");
        // 기본 홈페이지(아래 정의됨)로 폴백
        return renderDefaultHome();
    }

    return (
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="ml-2">사용자 역할에 맞는 대시보드 로딩 중...</div>
        </div>
      }>
        <HomeComponent />
      </Suspense>
    );
  }

  // 기본 홈페이지 렌더링 함수
  function renderDefaultHome() {
    // Stats data for the default home page
    const stats = [
      { value: systemStats?.totalUsers || 6, label: '등록 사용자' },
      { value: 1, label: '인증 훈련사' }, // Example value
      { value: 3, label: '등록 반려견' }, // Example value
      { value: 120, label: '활성 사용자 (일일)' } // Example value
    ];

    // Features data for the default home page
    const features = [
      { icon: IconPetCare, title: '맞춤형 교육 플랜', description: '우리 아이의 성격과 특성에 맞는 개별 맞춤 교육 프로그램' },
      { icon: IconVideoCall, title: '실시간 화상 교육', description: '전문 훈련사와 실시간으로 소통하며 받는 1:1 맞춤 교육' },
      { icon: IconCertificate, title: '인증된 전문가', description: '국가공인 자격을 보유한 전문 훈련사들의 체계적인 교육' },
      { icon: IconLocation, title: '전국 교육기관 연결', description: '가까운 지역의 검증된 교육기관을 쉽게 찾고 예약' },
      { icon: IconTraining, title: '체계적인 커리큘럼', description: '기초부터 고급까지 단계별로 구성된 전문 교육 과정' },
      { icon: IconShield, title: '안전한 교육 환경', description: '반려동물의 안전을 최우선으로 하는 체계적인 안전 관리' }
    ];

    return (
      <div className="min-h-screen" style={{ background: 'var(--page-bg)' }}>
        {/* Hero Banner Section - 슬라이드 배너 */}
        <div className="mb-8 px-4 pt-4">
          <div className="relative overflow-hidden rounded-xl min-h-[400px] bg-gradient-to-r from-primary to-primary/80 shadow-lg">
            <div className="absolute inset-0">
              <img
                src={bannerSlides[currentSlide].image}
                alt={bannerSlides[currentSlide].title}
                className="w-full h-full object-cover transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-black/30"></div>
            </div>

            <div className="relative z-10 flex flex-col justify-center min-h-[400px] py-8 px-6 md:px-12">
              <div className="max-w-4xl mx-auto w-full">
                <h2 className="text-white text-xl md:text-3xl font-bold mb-3 leading-tight">
                  {bannerSlides[currentSlide].title}
                </h2>
                <p className="text-white/90 text-sm md:text-lg mb-4 leading-relaxed max-w-2xl">
                  {bannerSlides[currentSlide].subtitle}
                </p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {bannerSlides[currentSlide].features.map((feature, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center text-sm bg-white/20 text-white px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/20"
                    >
                      <span className="mr-1.5 text-yellow-300 text-lg">✓</span> {feature}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    size="default"
                    className="bg-white text-primary font-semibold hover:bg-white/90 border border-white px-6 py-2.5 rounded-lg shadow-md"
                    onClick={() => setLocation(bannerSlides[currentSlide].primaryAction.path)}
                  >
                    {bannerSlides[currentSlide].primaryAction.text}
                  </Button>
                  <Button
                    size="default"
                    variant="outline"
                    className="border-2 border-white/80 text-white hover:bg-white/20 hover:text-white px-6 py-2.5 rounded-lg backdrop-blur-sm font-semibold"
                    onClick={() => setLocation(bannerSlides[currentSlide].secondaryAction.path)}
                  >
                    {bannerSlides[currentSlide].secondaryAction.text}
                  </Button>
                </div>
              </div>
            </div>

            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/30 hover:bg-white/50 text-white backdrop-blur-sm h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 z-20 border border-white/20"
              onClick={prevSlide}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/30 hover:bg-white/50 text-white backdrop-blur-sm h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 z-20 border border-white/20"
              onClick={nextSlide}
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {bannerSlides.map((_, index) => (
                <button
                  key={index}
                  className={`w-3 h-3 rounded-full transition-all duration-200 hover:scale-125 border border-white/30 ${
                    currentSlide === index
                      ? 'bg-white shadow-lg'
                      : 'bg-white/50 hover:bg-white/70'
                  }`}
                  onClick={() => setCurrentSlide(index)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Quick Action Section - Role-based */}
        <TalezSection className="py-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--txt-strong)' }}>
              {isAuthenticated ? '빠른 접근' : '지금 시작하세요'}
            </h2>
            <p className="text-sm" style={{ color: 'var(--txt-secondary)' }}>
              {isAuthenticated 
                ? '자주 사용하는 기능을 빠르게 접근하세요'
                : '탈레즈의 다양한 서비스를 경험해보세요'}
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {isAuthenticated && userRole === 'pet-owner' ? (
              <>
                <TalezCard 
                  className="p-4 cursor-pointer group hover:shadow-lg hover:scale-105 transition-all duration-300"
                  onClick={() => setLocation('/my-pets')}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-3 rounded-full bg-secondary/15 dark:bg-secondary/20 group-hover:bg-secondary/20 dark:group-hover:bg-secondary/20 transition-colors">
                      <Heart className="h-5 w-5 text-primary dark:text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--txt-strong)' }}>
                        내 반려동물 관리
                      </h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--txt-secondary)' }}>
                        반려동물 프로필 확인
                      </p>
                    </div>
                  </div>
                </TalezCard>

                <TalezCard 
                  className="p-4 cursor-pointer group hover:shadow-lg hover:scale-105 transition-all duration-300"
                  onClick={() => setLocation('/courses')}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
                      <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--txt-strong)' }}>
                        강의 둘러보기
                      </h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--txt-secondary)' }}>
                        전문가 강의 수강
                      </p>
                    </div>
                  </div>
                </TalezCard>

                <TalezCard 
                  className="p-4 cursor-pointer group hover:shadow-lg hover:scale-105 transition-all duration-300"
                  onClick={() => setLocation('/pet-care')}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 group-hover:bg-green-200 dark:group-hover:bg-green-800/40 transition-colors">
                      <Syringe className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--txt-strong)' }}>
                        예방접종 관리
                      </h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--txt-secondary)' }}>
                        건강 기록 관리
                      </p>
                    </div>
                  </div>
                </TalezCard>

                <TalezCard 
                  className="p-4 cursor-pointer group hover:shadow-lg hover:scale-105 transition-all duration-300"
                  onClick={() => setLocation('/facilities')}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/30 group-hover:bg-orange-200 dark:group-hover:bg-orange-800/40 transition-colors">
                      <MapPin className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--txt-strong)' }}>
                        시설 찾기
                      </h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--txt-secondary)' }}>
                        근처 교육 시설 검색
                      </p>
                    </div>
                  </div>
                </TalezCard>
              </>
            ) : isAuthenticated && userRole === 'trainer' ? (
              <>
                <TalezCard 
                  className="p-4 cursor-pointer group hover:shadow-lg hover:scale-105 transition-all duration-300"
                  onClick={() => setLocation('/trainer/courses')}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
                      <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--txt-strong)' }}>
                        내 강의 관리
                      </h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--txt-secondary)' }}>
                        강의 등록 및 수정
                      </p>
                    </div>
                  </div>
                </TalezCard>

                <TalezCard 
                  className="p-4 cursor-pointer group hover:shadow-lg hover:scale-105 transition-all duration-300"
                  onClick={() => setLocation('/trainer/students')}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-3 rounded-full bg-primary/10 dark:bg-primary/20 group-hover:bg-primary/15 dark:group-hover:bg-primary/40 transition-colors">
                      <LucideUsers className="h-5 w-5 text-primary dark:text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--txt-strong)' }}>
                        수강생 확인
                      </h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--txt-secondary)' }}>
                        수강생 목록 및 진행도
                      </p>
                    </div>
                  </div>
                </TalezCard>

                <TalezCard 
                  className="p-4 cursor-pointer group hover:shadow-lg hover:scale-105 transition-all duration-300"
                  onClick={() => setLocation('/trainer/revenue')}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 group-hover:bg-green-200 dark:group-hover:bg-green-800/40 transition-colors">
                      <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--txt-strong)' }}>
                        수익 현황
                      </h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--txt-secondary)' }}>
                        정산 내역 확인
                      </p>
                    </div>
                  </div>
                </TalezCard>

                <TalezCard 
                  className="p-4 cursor-pointer group hover:shadow-lg hover:scale-105 transition-all duration-300"
                  onClick={() => setLocation('/trainer/schedule')}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30 group-hover:bg-amber-200 dark:group-hover:bg-amber-800/40 transition-colors">
                      <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--txt-strong)' }}>
                        일정 관리
                      </h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--txt-secondary)' }}>
                        예약 일정 확인
                      </p>
                    </div>
                  </div>
                </TalezCard>
              </>
            ) : isAuthenticated && userRole === 'institute-admin' ? (
              <>
                <TalezCard 
                  className="p-4 cursor-pointer group hover:shadow-lg hover:scale-105 transition-all duration-300"
                  onClick={() => setLocation('/institute-admin/trainers')}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-3 rounded-full bg-primary/10 dark:bg-primary/20 group-hover:bg-primary/15 dark:group-hover:bg-primary/40 transition-colors">
                      <LucideUsers className="h-5 w-5 text-primary dark:text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--txt-strong)' }}>
                        소속 훈련사
                      </h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--txt-secondary)' }}>
                        훈련사 관리
                      </p>
                    </div>
                  </div>
                </TalezCard>

                <TalezCard 
                  className="p-4 cursor-pointer group hover:shadow-lg hover:scale-105 transition-all duration-300"
                  onClick={() => setLocation('/institute-admin/courses')}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
                      <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--txt-strong)' }}>
                        등록 강의
                      </h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--txt-secondary)' }}>
                        강의 현황 확인
                      </p>
                    </div>
                  </div>
                </TalezCard>

                <TalezCard 
                  className="p-4 cursor-pointer group hover:shadow-lg hover:scale-105 transition-all duration-300"
                  onClick={() => setLocation('/institute-admin/revenue')}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 group-hover:bg-green-200 dark:group-hover:bg-green-800/40 transition-colors">
                      <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--txt-strong)' }}>
                        수익 현황
                      </h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--txt-secondary)' }}>
                        수익 통계 확인
                      </p>
                    </div>
                  </div>
                </TalezCard>

                <TalezCard 
                  className="p-4 cursor-pointer group hover:shadow-lg hover:scale-105 transition-all duration-300"
                  onClick={() => setLocation('/institute-admin/settings')}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
                      <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--txt-strong)' }}>
                        설정
                      </h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--txt-secondary)' }}>
                        기관 정보 관리
                      </p>
                    </div>
                  </div>
                </TalezCard>
              </>
            ) : (
              <>
                <TalezCard 
                  className="p-4 cursor-pointer group hover:shadow-lg hover:scale-105 transition-all duration-300"
                  onClick={() => setLocation('/auth/register')}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
                      <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--txt-strong)' }}>
                        회원가입
                      </h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--txt-secondary)' }}>
                        새로운 계정 만들기
                      </p>
                    </div>
                  </div>
                </TalezCard>

                <TalezCard 
                  className="p-4 cursor-pointer group hover:shadow-lg hover:scale-105 transition-all duration-300"
                  onClick={() => setLocation('/about')}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-3 rounded-full bg-primary/10 dark:bg-primary/20 group-hover:bg-primary/15 dark:group-hover:bg-primary/40 transition-colors">
                      <Info className="h-5 w-5 text-primary dark:text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--txt-strong)' }}>
                        서비스 소개
                      </h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--txt-secondary)' }}>
                        탈레즈 알아보기
                      </p>
                    </div>
                  </div>
                </TalezCard>

                <TalezCard 
                  className="p-4 cursor-pointer group hover:shadow-lg hover:scale-105 transition-all duration-300"
                  onClick={() => setShowExperience(true)}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30 group-hover:bg-amber-200 dark:group-hover:bg-amber-800/40 transition-colors">
                      <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--txt-strong)' }}>
                        무료 체험
                      </h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--txt-secondary)' }}>
                        AI 분석 미리보기
                      </p>
                    </div>
                  </div>
                </TalezCard>
              </>
            )}
          </div>
        </TalezSection>

        {/* Learning Progress Section - 로그인 사용자만 표시 */}
        {isAuthenticated && (
          <TalezSection className="py-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--txt-strong)' }}>
                나의 학습 현황
              </h2>
              <p className="text-sm" style={{ color: 'var(--txt-secondary)' }}>
                현재 진행 중인 강의와 학습 진도를 확인하세요
              </p>
            </div>
            <ProgressWidget />
          </TalezSection>
        )}

        {/* AI Recommendation Section */}
        <TalezSection className="py-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--txt-strong)' }}>
              {isAuthenticated ? '맞춤 추천' : '인기 강의 & 상품'}
            </h2>
            <p className="text-sm" style={{ color: 'var(--txt-secondary)' }}>
              {isAuthenticated 
                ? 'AI가 분석한 맞춤형 추천 콘텐츠입니다'
                : '많은 보호자들이 선택한 인기 강의와 상품을 만나보세요'}
            </p>
          </div>
          <RecommendationCard />
        </TalezSection>

        {/* Stats Section - Compact */}
        <TalezSection className="py-8">
          <TalezGrid cols={3}>
            {stats.map((stat, index) => (
              <TalezCard key={index} className="text-center p-4">
                <div className="text-2xl font-bold mb-1 talez-text-gradient">
                  {stat.value.toLocaleString()}
                </div>
                <div className="text-xs" style={{ color: 'var(--txt-secondary)' }}>
                  {stat.label}
                </div>
              </TalezCard>
            ))}
          </TalezGrid>
        </TalezSection>

        {/* Features Section - Compact */}
        <TalezSection className="py-12" background="glass">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--txt-strong)' }}>
              TALEZ만의 특별한 서비스
            </h2>
          </div>

          <TalezGrid cols={2}>
            <TalezCard variant="feature">
              <TalezIcon bg="var(--tile-emerald)">
                <IconPetCare />
              </TalezIcon>
              <div>
                <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--txt-strong)' }}>
                  맞춤형 교육 플랜
                </h3>
                <p style={{ color: 'var(--txt-secondary)' }}>
                  우리 아이의 성격과 특성에 맞는 개별 맞춤 교육 프로그램
                </p>
              </div>
            </TalezCard>

            <TalezCard variant="feature">
              <TalezIcon bg="var(--tile-blue)">
                <IconVideoCall />
              </TalezIcon>
              <div>
                <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--txt-strong)' }}>
                  실시간 화상 교육
                </h3>
                <p style={{ color: 'var(--txt-secondary)' }}>
                  전문 훈련사와 실시간으로 소통하며 받는 1:1 맞춤 교육
                </p>
              </div>
            </TalezCard>

            <TalezCard variant="feature">
              <TalezIcon bg="var(--tile-yellow)">
                <IconCertificate />
              </TalezIcon>
              <div>
                <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--txt-strong)' }}>
                  인증된 전문가
                </h3>
                <p style={{ color: 'var(--txt-secondary)' }}>
                  국가공인 자격을 보유한 전문 훈련사들의 체계적인 교육
                </p>
              </div>
            </TalezCard>

            <TalezCard variant="feature">
              <TalezIcon bg="var(--tile-pink)">
                <IconLocation />
              </TalezIcon>
              <div>
                <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--txt-strong)' }}>
                  전국 교육기관 연결
                </h3>
                <p style={{ color: 'var(--txt-secondary)' }}>
                  가까운 지역의 검증된 교육기관을 쉽게 찾고 예약
                </p>
              </div>
            </TalezCard>

            <TalezCard variant="feature">
              <TalezIcon bg="var(--tile-purple)">
                <IconTraining />
              </TalezIcon>
              <div>
                <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--txt-strong)' }}>
                  체계적인 커리큘럼
                </h3>
                <p style={{ color: 'var(--txt-secondary)' }}>
                  기초부터 고급까지 단계별로 구성된 전문 교육 과정
                </p>
              </div>
            </TalezCard>

            <TalezCard variant="feature">
              <TalezIcon bg="var(--tile-gray)">
                <IconShield />
              </TalezIcon>
              <div>
                <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--txt-strong)' }}>
                  안전한 교육 환경
                </h3>
                <p style={{ color: 'var(--txt-secondary)' }}>
                  반려동물의 안전을 최우선으로 하는 체계적인 안전 관리
                </p>
              </div>
            </TalezCard>
          </TalezGrid>
        </TalezSection>

        {/* Service Stats Section - TALEZ Style */}
        <div className="mb-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-all duration-300">
            {/* 헤더 영역 - 클릭 시 토글 */}
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer"
              onClick={toggleServiceStats}
            >
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-semibold">서비스 현황</h2>
              </div>
              <div className="flex items-center">
                {isServiceStatsOpen ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
              </div>
            </div>

            {/* 축소된 상태일 때 간략한 정보 표시 */}
            {!isServiceStatsOpen && (
              <div className="px-6 pb-4 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-3 flex justify-between space-x-6">
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">등록 사용자</span>
                      <span className="text-lg font-bold">{systemStats?.totalUsers || 6}</span>
                    </div>
                    <button
                      onClick={() => setLocation('/dashboard')}
                      className="text-xs text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 py-1 px-2 rounded-full hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors cursor-pointer"
                      title="대시보드에서 자세히 보기"
                    >
                      실데이터
                    </button>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">인증 훈련사</span>
                      <span className="text-lg font-bold">1</span>
                    </div>
                    <button
                      onClick={() => setLocation('/trainers')}
                      className="text-xs text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 py-1 px-2 rounded-full hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors cursor-pointer"
                      title="훈련사 목록 보기"
                    >
                      왕짱스쿨
                    </button>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-primary dark:text-primary">등록 반려견</span>
                      <span className="text-lg font-bold">3</span>
                    </div>
                    <button
                      onClick={() => setLocation('/courses')}
                      className="text-xs text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 py-1 px-2 rounded-full hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors cursor-pointer"
                      title="강좌 목록 보기"
                    >
                      실제현황
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-center md:justify-end">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                        <circle cx="12" cy="12" r="5" />
                        <line x1="12" y1="1" x2="12" y2="3" />
                        <line x1="12" y1="21" x2="12" y2="23" />
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                        <line x1="1" y1="12" x2="3" y2="12" />
                        <line x1="21" y1="12" x2="23" y2="12" />
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-lg font-bold">23°C</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">맑음 · 서울 강남구</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 확장된 상태일 때 상세 정보 표시 */}
            {isServiceStatsOpen && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-4 pb-4">
                {/* 서비스 현황 카드 */}
                <div className="md:col-span-3">
                  <div className="grid grid-cols-3 gap-3">
                    {/* 등록 사용자 */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{systemStats?.totalUsers || 6}</span>
                          <div className="text-xs text-gray-600 dark:text-gray-400">등록 사용자 (현재)</div>
                        </div>
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800/50 rounded flex items-center justify-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-green-600 dark:text-green-400">실제 데이터</div>
                      <div className="mt-1">
                        <div className="flex items-end gap-1 mb-1 h-8">
                          {(weeklyStats?.userRegistrations || [1, 2, 1, 3, 2, 4, 3]).map((value, index) => (
                            <div key={index} className="flex-1 relative group">
                              <div
                                className="bg-blue-200 dark:bg-blue-700 rounded-sm transition-colors hover:bg-blue-300 dark:hover:bg-blue-600"
                                style={{height: `${Math.max(value * 8, 4)}px`}}
                              ></div>
                              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {value}명
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {(weeklyStats?.labels || ['월', '화', '수', '목', '금', '토', '일']).map((day, index) => (
                            <span key={index} className="flex-1 text-center">{day}</span>
                          ))}
                        </div>
                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mt-1">
                          {(weeklyStats?.userRegistrations || [1, 2, 1, 3, 2, 4, 3]).map((value, index) => (
                            <span key={index} className="flex-1 text-center font-medium">{value}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 인증 훈련사 */}
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xl font-bold text-green-600 dark:text-green-400">1</span>
                          <div className="text-xs text-gray-600 dark:text-gray-400">인증 훈련사 (현재)</div>
                        </div>
                        <div className="w-8 h-8 bg-green-100 dark:bg-green-800/50 rounded flex items-center justify-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-green-600 dark:text-green-400">왕짱스쿨</div>
                      <div className="mt-1">
                        <div className="flex items-end gap-1 mb-1 h-8">
                          {(weeklyStats?.trainerCertifications || [0, 1, 0, 0, 1, 0, 0]).map((value, index) => (
                            <div key={index} className="flex-1 relative group">
                              <div
                                className="bg-green-200 dark:bg-green-700 rounded-sm transition-colors hover:bg-green-300 dark:hover:bg-green-600"
                                style={{height: `${Math.max(value * 20, 4)}px`}}
                              ></div>
                              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {value}명
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {(weeklyStats?.labels || ['월', '화', '수', '목', '금', '토', '일']).map((day, index) => (
                            <span key={index} className="flex-1 text-center">{day}</span>
                          ))}
                        </div>
                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mt-1">
                          {(weeklyStats?.trainerCertifications || [0, 1, 0, 0, 1, 0, 0]).map((value, index) => (
                            <span key={index} className="flex-1 text-center font-medium">{value}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 등록 반려견 */}
                    <div className="bg-primary/5 dark:bg-primary/15 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xl font-bold text-primary dark:text-primary">3</span>
                          <div className="text-xs text-gray-600 dark:text-gray-400">등록 반려견 (현재)</div>
                        </div>
                        <div className="w-8 h-8 bg-primary/10 dark:bg-primary/50 rounded flex items-center justify-center">
                          <div className="w-2 h-2 bg-primary/50 rounded-full"></div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">실제현황</div>
                      <div className="mt-1">
                        <div className="flex items-end gap-1 mb-1 h-8">
                          {(weeklyStats?.petRegistrations || [1, 0, 2, 0, 1, 1, 0]).map((value, index) => (
                            <div key={index} className="flex-1 relative group">
                              <div
                                className="bg-primary/15 dark:bg-primary/20 rounded-sm transition-colors hover:bg-primary/15 dark:hover:bg-primary"
                                style={{height: `${Math.max(value * 12, 4)}px`}}
                              ></div>
                              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {value}마리
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {(weeklyStats?.labels || ['월', '화', '수', '목', '금', '토', '일']).map((day, index) => (
                            <span key={index} className="flex-1 text-center">{day}</span>
                          ))}
                        </div>
                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mt-1">
                          {(weeklyStats?.petRegistrations || [1, 0, 2, 0, 1, 1, 0]).map((value, index) => (
                            <span key={index} className="flex-1 text-center font-medium">{value}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 날씨 카드 */}
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <h2 className="text-base font-semibold">오늘의 날씨</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-6 px-2"
                      onClick={() => setIsWeatherModalOpen(true)}
                    >
                      주간
                    </Button>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12">
                      {/* 날씨 아이콘 - 맑음 */}
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                        <circle cx="12" cy="12" r="5" />
                        <line x1="12" y1="1" x2="12" y2="3" />
                        <line x1="12" y1="21" x2="12" y2="23" />
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                        <line x1="1" y1="12" x2="3" y2="12" />
                        <line x1="21" y1="12" x2="23" y2="12" />
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xl font-bold">23°C</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">맑음 · 서울 강남구</p>
                    </div>
                  </div>
                  <div className="flex justify-between w-full mt-2 text-xs">
                    <div className="text-center">
                      <p className="text-gray-600 dark:text-gray-400">습도</p>
                      <p className="font-semibold">45%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600 dark:text-gray-400">바람</p>
                      <p className="font-semibold">3m/s</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600 dark:text-gray-400">미세먼지</p>
                      <p className="font-semibold">좋음</p>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <p>산책하기 좋은 날씨입니다!</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TALEZ 체험 서비스 섹션 */}
        <div className="mb-8">
          <div className="relative bg-gradient-to-br from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 rounded-2xl p-8 border border-primary/30 dark:border-primary/40 overflow-hidden">
            {/* 백그라운드 이미지 - 강아지와 AI 분석 테마 */}
            <div
              className="absolute inset-0 opacity-10 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" fill="none">
                  <!-- 강아지 실루엣들 -->
                  <g opacity="0.3">
                    <path d="M150 200c-10-20 10-40 30-30 20 10 40-10 30 30-10 40-40 20-60 0z" fill="%2310b981"/>
                    <circle cx="140" cy="180" r="4" fill="%2310b981"/>
                    <circle cx="160" cy="180" r="4" fill="%2310b981"/>
                    <path d="M150 185c-3 3-3 7 0 10" stroke="%2310b981" stroke-width="2" fill="none"/>
                  </g>
                  <g opacity="0.2">
                    <path d="M600 150c-8-16 8-32 24-24 16 8 32-8 24 24-8 32-32 16-48 0z" fill="%2310b981"/>
                    <circle cx="592" cy="135" r="3" fill="%2310b981"/>
                    <circle cx="608" cy="135" r="3" fill="%2310b981"/>
                  </g>

                  <!-- AI 네트워크 패턴 -->
                  <g opacity="0.15">
                    <circle cx="300" cy="100" r="25" fill="none" stroke="%2310b981" stroke-width="2"/>
                    <circle cx="500" cy="300" r="25" fill="none" stroke="%2310b981" stroke-width="2"/>
                    <circle cx="100" cy="400" r="25" fill="none" stroke="%2310b981" stroke-width="2"/>
                    <path d="M300 100L500 300L100 400" stroke="%2310b981" stroke-width="1" opacity="0.5"/>
                    <circle cx="300" cy="100" r="4" fill="%2310b981"/>
                    <circle cx="500" cy="300" r="4" fill="%2310b981"/>
                    <circle cx="100" cy="400" r="4" fill="%2310b981"/>
                  </g>

                  <!-- 발자국 패턴 -->
                  <g opacity="0.1">
                    <g transform="translate(400,250)">
                      <ellipse cx="0" cy="0" rx="12" ry="8" fill="%2310b981"/>
                      <ellipse cx="-8" cy="-15" rx="5" ry="5" fill="%2310b981"/>
                      <ellipse cx="8" cy="-15" rx="5" ry="5" fill="%2310b981"/>
                      <ellipse cx="-12" cy="-25" rx="5" ry="5" fill="%2310b981"/>
                      <ellipse cx="12" cy="-25" rx="5" ry="5" fill="%2310b981"/>
                    </g>
                    <g transform="translate(450,300)">
                      <ellipse cx="0" cy="0" rx="12" ry="8" fill="%2310b981"/>
                      <ellipse cx="-8" cy="-15" rx="5" ry="5" fill="%2310b981"/>
                      <ellipse cx="8" cy="-15" rx="5" ry="5" fill="%2310b981"/>
                      <ellipse cx="-12" cy="-25" rx="5" ry="5" fill="%2310b981"/>
                      <ellipse cx="12" cy="-25" rx="5" ry="5" fill="%2310b981"/>
                    </g>
                  </g>

                  <!-- 데이터 차트 요소 -->
                  <g opacity="0.2">
                    <rect x="50" y="50" width="60" height="40" rx="5" fill="none" stroke="%2310b981" stroke-width="1"/>
                    <rect x="60" y="60" width="40" height="3" fill="%2310b981" opacity="0.6"/>
                    <rect x="60" y="67" width="30" height="3" fill="%2310b981" opacity="0.6"/>
                    <rect x="60" y="74" width="35" height="3" fill="%2310b981" opacity="0.6"/>
                    <rect x="60" y="81" width="25" height="3" fill="%2310b981" opacity="0.6"/>
                  </g>
                </svg>')`
              }}
            ></div>

            <div className="relative z-10 text-center mb-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center shadow-lg animate-pulse">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                🎯 TALEZ AI 체험 서비스
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                강아지 행동 영상을 업로드하고 AI 전문가 분석을 무료로 체험해보세요
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                실시간 AI 분석 • 전문가 추천 • 맞춤형 훈련 가이드
              </p>
            </div>

            {!showExperience ? (
              <div className="relative z-10 text-center">
                <Button
                  onClick={() => setShowExperience(true)}
                  className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white px-10 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center">
                    <svg className="mr-3 h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
                    </svg>
                    AI 분석 무료 체험하기
                  </span>
                  <div className="absolute inset-0 bg-white opacity-0 hover:opacity-10 transition-opacity duration-300"></div>
                </Button>
              </div>
            ) : (
              <div className="relative z-10 max-w-2xl mx-auto">
                {/* 단계 표시 */}
                <div className="flex items-center justify-center mb-6">
                  <div className="flex items-center space-x-4">
                    <div className={`flex items-center space-x-2 ${analysisStep === 'upload' ? 'text-blue-600' : 'text-green-600'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        analysisStep === 'upload' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {analysisStep === 'upload' ? '1' : <CheckCircle className="h-5 w-5" />}
                      </div>
                      <span className="text-sm font-medium">영상 업로드</span>
                    </div>
                    <div className="w-8 h-0.5 bg-gray-300"></div>
                    <div className={`flex items-center space-x-2 ${
                      analysisStep === 'analyzing' ? 'text-blue-600' :
                      analysisStep === 'result' ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        analysisStep === 'analyzing' ? 'bg-blue-100 text-blue-600' :
                        analysisStep === 'result' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {analysisStep === 'result' ? <CheckCircle className="h-5 w-5" /> : '2'}
                      </div>
                      <span className="text-sm font-medium">AI 분석</span>
                    </div>
                    <div className="w-8 h-0.5 bg-gray-300"></div>
                    <div className={`flex items-center space-x-2 ${analysisStep === 'result' ? 'text-blue-600' : 'text-gray-400'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        analysisStep === 'result' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        3
                      </div>
                      <span className="text-sm font-medium">결과 확인</span>
                    </div>
                  </div>
                </div>

                {analysisStep === 'upload' && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">강아지 행동 분석</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      강아지의 행동을 자세히 설명해주세요. AI가 행동 패턴을 분석하고 맞춤형 훈련 프로그램을 추천합니다.
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          강아지의 행동 설명
                        </label>
                        <textarea
                          value={videoDescription}
                          onChange={(e) => setVideoDescription(e.target.value)}
                          rows={6}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="예시: 저희 강아지는 다른 강아지를 보면 꼬리를 흔들며 다가가지만, 낯선 사람이 오면 짖으면서 뒤로 물러납니다. 산책할 때는 줄을 많이 당기고, 집에서는 혼자 있을 때 불안해하는 모습을 보입니다. 간식을 주면 '앉아'는 잘 따르지만 '기다려'는 아직 어려워합니다."
                        />
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            💡 팁: 산책 시 행동, 다른 강아지/사람과의 상호작용, 명령 반응도, 집에서의 행동 등을 자세히 적어주세요.
                          </p>
                          <span className={`text-xs ${videoDescription.trim().length < 20 ? 'text-orange-500' : 'text-green-500'}`}>
                            {videoDescription.trim().length}/20자
                          </span>
                        </div>
                        {videoDescription.trim().length > 0 && videoDescription.trim().length < 20 && (
                          <p className="text-xs text-orange-500 mt-1">
                            최소 20자 이상 입력해주세요. ({20 - videoDescription.trim().length}자 더 필요)
                          </p>
                        )}
                      </div>

                      <Button
                        onClick={startAnalysis}
                        disabled={!videoDescription || videoDescription.trim().length < 20}
                        className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 disabled:opacity-50"
                      >
                        <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        AI 분석 시작
                      </Button>

                      {uploadError && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <p className="text-red-600 dark:text-red-400 text-sm">{uploadError}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {analysisStep === 'analyzing' && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm text-center">
                    <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin mb-4" />
                    <h3 className="text-lg font-semibold mb-2">AI가 영상을 분석하고 있습니다</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      강아지의 행동과 특성을 분석 중입니다. 잠시만 기다려주세요.
                    </p>
                  </div>
                )}

                {analysisStep === 'result' && analysisResult && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm max-w-3xl mx-auto">
                    <h3 className="text-2xl font-bold mb-6 flex items-center">
                      <CheckCircle className="mr-2 h-6 w-6 text-green-500" />
                      AI 종합 분석 완료
                    </h3>

                    <div className="space-y-6">
                      {/* 전체 요약 */}
                      <div className="p-4 bg-gradient-to-r from-primary/5 to-secondary/5 dark:from-primary/15 dark:to-secondary/15 rounded-lg border border-primary/30 dark:border-primary/40">
                        <h4 className="font-semibold text-primary dark:text-primary-foreground mb-2 flex items-center">
                          <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                          </svg>
                          분석 요약
                        </h4>
                        <p className="text-sm text-primary dark:text-primary-foreground">
                          {analysisResult.behaviorAnalysis?.summary || '강아지의 행동과 특성을 종합적으로 분석했습니다.'}
                        </p>
                      </div>

                      {/* 훈련 수준 점수 */}
                      <div className="p-5 bg-white dark:bg-gray-700 rounded-lg border-2 border-blue-200 dark:border-blue-700">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                          <svg className="h-5 w-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          훈련 수준 평가
                        </h4>

                        <div className="text-center mb-4">
                          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-lg mb-2">
                            <span className="text-3xl font-bold">{analysisResult.trainingAssessment?.overallScore || 0}</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">전반적 훈련 점수</p>
                          <p className="text-lg font-semibold text-blue-600 dark:text-blue-400 mt-1">
                            {analysisResult.trainingAssessment?.level || '중급'} 수준
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          {analysisResult.trainingAssessment?.scores && Object.entries(analysisResult.trainingAssessment.scores).map(([key, value]: [string, any]) => (
                            <div key={key} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{value}/10</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {key === 'commandResponse' ? '명령 반응' : key === 'focus' ? '집중력' : '학습 능력'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 성격 프로필 */}
                      <div className="p-5 bg-white dark:bg-gray-700 rounded-lg border-2 border-green-200 dark:border-green-700">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                          <svg className="h-5 w-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                          성격 프로필
                        </h4>

                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                          {analysisResult.personalityProfile?.description}
                        </p>

                        {analysisResult.personalityProfile?.scores && (
                          <div className="space-y-3">
                            {Object.entries(analysisResult.personalityProfile.scores).map(([key, value]: [string, any]) => (
                              <div key={key}>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="font-medium text-gray-700 dark:text-gray-300">
                                    {key === 'activeness' ? '활동성' :
                                     key === 'sociability' ? '사교성' :
                                     key === 'obedience' ? '순응성' : '불안 수준'}
                                  </span>
                                  <span className="text-gray-600 dark:text-gray-400">{value}/10</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                                  <div
                                    className={`h-2.5 rounded-full ${
                                      key === 'anxiety' ? 'bg-orange-500' : 'bg-green-500'
                                    }`}
                                    style={{ width: `${(value / 10) * 100}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 행동 패턴 */}
                      {analysisResult.behaviorAnalysis?.patterns && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                          <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-3">
                            관찰된 행동 패턴
                          </h4>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {analysisResult.behaviorAnalysis.patterns.mainBehaviors?.map((behavior: string, idx: number) => (
                              <span key={idx} className="px-3 py-1 bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-100 rounded-full text-sm font-medium">
                                {behavior}
                              </span>
                            ))}
                          </div>
                          <p className="text-sm text-amber-800 dark:text-amber-200">
                            {analysisResult.behaviorAnalysis.patterns.meaning}
                          </p>
                        </div>
                      )}

                      {/* 맞춤형 추천 */}
                      <div className="p-5 bg-gradient-to-r from-green-50 to-primary/5 dark:from-green-900/20 dark:to-primary/15 rounded-lg border border-green-200 dark:border-green-700">
                        <h4 className="font-semibold text-green-900 dark:text-green-100 mb-3 flex items-center">
                          <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          맞춤형 훈련 추천
                        </h4>

                        <div className="space-y-2 mb-4">
                          <p className="text-sm font-medium text-green-800 dark:text-green-200">우선 훈련 항목:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {analysisResult.recommendations?.priorities?.map((priority: string, idx: number) => (
                              <li key={idx} className="text-sm text-green-700 dark:text-green-300">{priority}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-medium text-green-800 dark:text-green-200">훈련 팁:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {analysisResult.recommendations?.tips?.map((tip: string, idx: number) => (
                              <li key={idx} className="text-sm text-green-700 dark:text-green-300">{tip}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Button onClick={resetExperience} variant="outline" size="default" className="flex-1">
                          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          다시 분석하기
                        </Button>
                        <Button onClick={() => setLocation('/institutes')} variant="default" size="default" className="flex-1">
                          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          최적의 훈련소 찾기
                        </Button>
                        <Button onClick={() => setLocation('/auth')} className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90">
                          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          전문가 상담 받기
                        </Button>
                      </div>

                      {/* AI 모델 정보 */}
                      <div className="text-center pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ⚡ {analysisResult.modelInfo?.behaviorAnalysis} + {analysisResult.modelInfo?.trainingRecommendation?.split('(')[1]?.replace(')', '')} 멀티모델 AI 분석
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-center mt-4">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowExperience(false);
                      resetExperience();
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    체험 종료
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 실시간 인기차트 영역 (통합) */}
        <div className="mb-8">
          <RealTimePopularChart />
        </div>


        {/* 쇼핑 페이지 접근 컴포넌트 */}
        <ShopPreview />

        {/* 주간 날씨 모달 */}
        <WeeklyWeatherModal
          isOpen={isWeatherModalOpen}
          onClose={() => setIsWeatherModalOpen(false)}
          location={{ name: "서울", region: "강남구" }}
        />

        {/* 비밀번호 찾기 모달 */}
        <Dialog open={showPasswordReset} onOpenChange={setShowPasswordReset}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>비밀번호 찾기</DialogTitle>
            </DialogHeader>
            <PasswordResetForm onClose={() => setShowPasswordReset(false)} />
          </DialogContent>
        </Dialog>

        {/* CTA Section - TALEZ Style */}
        <TalezSection background="gradient" className="py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              지금 바로 시작해보세요
            </h2>
            <p className="text-xl mb-8 opacity-90">
              우리 아이에게 맞는 최고의 교육을 찾아보세요.
              전문가 상담부터 실제 교육까지, 모든 과정이 간단합니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <TalezButton size="lg" className="bg-white text-[var(--txt-strong)] hover:bg-gray-100">
                <Link href="/auth/register" className="flex items-center">
                  무료로 시작하기
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </TalezButton>
              <TalezButton variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-[var(--txt-strong)]">
                <Link href="/video-call">
                  무료 상담받기
                </Link>
              </TalezButton>
            </div>
          </div>
        </TalezSection>
      </div>
    );
  }

  // Return the default home content
  return renderDefaultHome();
}