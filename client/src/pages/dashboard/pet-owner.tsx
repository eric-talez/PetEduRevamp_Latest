import { useAuth } from "../../SimpleApp";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { EnhancedAnalytics } from "@/components/dashboard/EnhancedAnalytics";

import { useLocation, Link } from "wouter";
import { BookOpen, Calendar, Medal, PawPrint, Star, Bone, Award, Clock, BarChart3 } from "lucide-react";

interface PetOwnerDashboardProps {
  onAction: (action: string, data?: any) => void;
}

interface BannerSlide {
  id: number;
  title: string;
  description: string;
  features: string[];
  image: string;
  primaryAction: {
    text: string;
    path: string;
  };
  secondaryAction: {
    text: string;
    path: string;
  };
}

export default function PetOwnerDashboard({ onAction }: PetOwnerDashboardProps) {
  const { userName, userRole } = useAuth();
  const [, setLocation] = useLocation();
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [activeTab, setActiveTab] = useState('dashboard');

  // 배너 슬라이드 데이터
  const bannerSlides = [
    {
      id: 1,
      title: "반려견 맞춤형 전문 교육 서비스",
      description: "Talez의 전문 훈련사가 제공하는 개인 맞춤형 교육으로 반려견의 성장을 돕습니다",
      features: [
        "1:1 전문가 코칭",
        "행동 교정 프로그램",
        "실시간 화상 교육"
      ],
      image: "https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&h=400&q=80",
      primaryAction: {
        text: "프로그램 둘러보기",
        path: "/courses"
      },
      secondaryAction: {
        text: "무료 체험 신청",
        path: "/free-trial"
      }
    },
    {
      id: 2,
      title: "AI 기반 반려견 행동 분석",
      description: "최신 인공지능 기술로 반려견의 행동과 감정을 분석하고 맞춤형 솔루션을 제공합니다",
      features: [
        "영상 기반 행동 분석",
        "감정 상태 모니터링",
        "맞춤형 훈련 가이드"
      ],
      image: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&h=400&q=80",
      primaryAction: {
        text: "AI 분석 체험하기",
        path: "/ai-analysis"
      },
      secondaryAction: {
        text: "기술 소개 보기",
        path: "/ai-technology"
      }
    },
    {
      id: 3,
      title: "반려견 친화적 장소 찾기",
      description: "전국의 반려견 동반 가능 장소를 한 눈에 확인하고 실시간 리뷰와 평점을 확인하세요",
      features: [
        "위치 기반 추천 시스템",
        "사용자 실시간 리뷰",
        "Talez 인증 장소 정보"
      ],
      image: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&h=400&q=80",
      primaryAction: {
        text: "주변 장소 찾기",
        path: "/locations"
      },
      secondaryAction: {
        text: "장소 등록하기",
        path: "/register-location"
      }
    },
    {
      id: 4,
      title: "반려견 건강 모니터링 시스템",
      description: "일상 활동, 식이 패턴, 수면 상태를 기록하고 건강 변화를 추적하여 질병을 예방합니다",
      features: [
        "건강 데이터 대시보드",
        "식이 관리 캘린더",
        "건강 알림 서비스"
      ],
      image: "https://images.unsplash.com/photo-1544568100-847a948585b9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&h=400&q=80",
      primaryAction: {
        text: "건강 기록 시작하기",
        path: "/health-tracker"
      },
      secondaryAction: {
        text: "건강 정보 살펴보기",
        path: "/health-library"
      }
    },
    {
      id: 5,
      title: "반려견 소셜 커뮤니티",
      description: "비슷한 관심사를 가진 반려인들과 소통하고 경험을 공유하는 활발한 커뮤니티에 참여하세요",
      features: [
        "지역별 모임 정보",
        "실시간 Q&A",
        "전문가 상담 서비스"
      ],
      image: "https://images.unsplash.com/photo-1548658166-136d9f6a7e76?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&h=400&q=80",
      primaryAction: {
        text: "커뮤니티 가입하기",
        path: "/community"
      },
      secondaryAction: {
        text: "이벤트 참여하기",
        path: "/events"
      }
    }
  ];

  // 슬라이드 자동 변경 기능
  useEffect(() => {
    // 슬라이드 타이머 설정
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerSlides.length);
    }, 5000); // 5초마다 슬라이드 변경

    // 컴포넌트 언마운트 시 타이머 정리
    return () => clearInterval(timer);
  }, [bannerSlides.length]);

  // 슬라이드 수동 변경 함수
  const goToSlide = (index: number) => {
    console.log(`슬라이드 변경: ${currentSlide} → ${index}`);
    setCurrentSlide(index);
  };

  const courses = [
    {
      id: 1,
      title: "반려견 기초 훈련 마스터하기",
      description: "앉아, 기다려, 엎드려 등 기본 명령어부터 산책 예절까지 체계적으로 배우는 초보 견주 필수 코스",
      image: "https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=350",
      progress: 65,
      trainer: {
        name: "김훈련 트레이너",
        avatar: "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
      },
      popular: true
    },
    {
      id: 2,
      title: "반려견 어질리티 입문",
      description: "다양한 장애물 코스를 통해 반려견의 민첩성과 집중력을 향상시키는 어질리티 훈련 기초 과정",
      image: "https://images.unsplash.com/photo-1583336663277-620dc1996580?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=350",
      progress: 30,
      trainer: {
        name: "박민첩 트레이너",
        avatar: "https://images.unsplash.com/photo-1548535537-3cfaf1fc327c?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
      },
      level: "중급"
    },
    {
      id: 3,
      title: "반려견 사회화 훈련",
      description: "다른 반려견, 사람, 환경에 올바르게 적응하는 방법을 배우는 필수 사회화 과정",
      image: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=350",
      progress: 45,
      trainer: {
        name: "이사회 트레이너",
        avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
      },
      level: "초급"
    }
  ];

  const recommendedCourses = [
    {
      id: 4,
      title: "분리불안 극복하기",
      description: "혼자 있는 시간을 두려워하는 반려견을 위한 단계별 행동 교정 프로그램",
      image: "https://images.unsplash.com/photo-1583512603806-077998240c7a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=350",
      duration: "8주 과정",
      price: "89,000원",
      petName: "토리"
    },
    {
      id: 5,
      title: "재미있는 트릭 훈련",
      description: "하이파이브부터 점프, 회전까지 반려견의 두뇌를 자극하는 다양한 트릭 교육",
      image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=350",
      duration: "6주 과정",
      price: "69,000원",
      petName: "몽이"
    },
    {
      id: 6,
      title: "반려견 심리 케어",
      description: "반려견의 행동 패턴을 이해하고 심리적 안정을 돕는 전문 케어 과정",
      image: "https://images.unsplash.com/photo-1601758177266-bc599de87707?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=350",
      duration: "5주 과정",
      price: "79,000원"
    },
    {
      id: 7,
      title: "산책 예절 마스터",
      description: "끌기, 짖기 없이 즐거운 산책을 위한 리드 훈련 및 외부 환경 적응법",
      image: "https://images.unsplash.com/photo-1551730459-92db2a308d6a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=350",
      duration: "4주 과정",
      price: "59,000원"
    }
  ];

  const communityPosts = [
    {
      id: 1,
      author: {
        name: "최견주",
        avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
        time: "3시간 전"
      },
      title: "산책 중 다른 강아지 만났을 때 대처법",
      content: "오늘 산책 중 크고 활발한 강아지를 만났는데, 우리집 강아지가 너무 긴장하더라구요. 훈련사님이 알려주신 대로 거리를 두고 차분히 대응했더니 효과가 있었어요. 다른 견주분들도 시도해보세요!",
      likes: 28,
      comments: 12,
      tag: "산책팁"
    },
    {
      id: 2,
      author: {
        name: "김훈련",
        avatar: "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
        time: "어제"
      },
      title: "강아지가 말을 안들을 때 해결법",
      content: "많은 견주님들이 반려견이 말을 안들어서 힘들어하십니다. 하지만 강아지 입장에선 여러분이 무슨 말을 하는지 모를 수 있어요. 일관된 명령어와 적절한 보상으로 서서히 훈련하는 것이 중요합니다. 다음 주 라이브 세션에서 자세히 알려드릴게요!",
      likes: 56,
      comments: 23,
      tag: "훈련팁"
    },
    {
      id: 3,
      author: {
        name: "박반려",
        avatar: "https://images.unsplash.com/photo-1493666438817-866a91353ca9?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
        time: "2일 전"
      },
      title: "분리불안 극복 성공 후기",
      content: "저희 코코가 혼자 있으면 짖고 물건을 망가뜨리는 문제가 심했는데, 이 플랫폼에서 분리불안 과정을 수강하고 정말 많이 좋아졌어요! 특히 점진적 이별 훈련이 효과적이었습니다. 비슷한 고민 있으신 분들께 추천해요.",
      likes: 42,
      comments: 18,
      tag: "성공후기"
    }
  ];

  const tabs = [
    { id: 'dashboard', label: '대시보드', icon: BookOpen },
    { id: 'analytics', label: '학습 분석', icon: BarChart3 },
    { id: 'schedule', label: '일정 관리', icon: Calendar },
    { id: 'achievements', label: '성취도', icon: Award }
  ];

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          안녕하세요, {userName || '반려인'}님! 🐾
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          반려견과 함께하는 즐거운 학습 여정을 계속해보세요.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className={`mr-2 h-5 w-5 ${
                    activeTab === tab.id ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'analytics' && (
        <div className="space-y-8">
          <EnhancedAnalytics />
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          {/* Banner Slider - 5개 슬라이드 */}
          <div className="relative rounded-xl overflow-hidden h-48 md:h-60 mb-8 bg-gradient-to-r from-primary/80 to-accent/80 shadow-lg">
        {/* 슬라이드 이미지 (현재 슬라이드만 표시) */}
        <div className="absolute inset-0 transition-all duration-500 ease-in-out">
          <img 
            src={bannerSlides[currentSlide].image} 
            alt={bannerSlides[currentSlide].title}
            className="w-full h-full object-cover absolute"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent"></div>
        </div>

        {/* 슬라이드 콘텐츠 (현재 슬라이드만 표시) */}
        <div className="relative h-full flex flex-col justify-center px-8 md:px-12">
          <h1 className="text-white text-lg md:text-2xl font-bold mb-1 md:mb-2 max-w-xl">
            {bannerSlides[currentSlide].title}
          </h1>
          <p className="text-white text-xs md:text-sm max-w-xl mb-2 md:mb-3 line-clamp-2">
            {bannerSlides[currentSlide].description}
          </p>

          {/* 주요 기능 목록 */}
          <div className="flex flex-wrap gap-2 mb-3 md:mb-4">
            {bannerSlides[currentSlide].features.map((feature: string, idx: number) => (
              <span 
                key={idx} 
                className="inline-flex items-center text-xs md:text-sm bg-white/30 hover:bg-white/40 transition-colors text-white px-3 py-1 rounded-full shadow-sm"
              >
                <span className="mr-1.5 text-primary-300 font-bold">✓</span> {feature}
              </span>
            ))}
          </div>

          {/* 버튼 */}
          <div className="flex flex-wrap gap-2">
            <Button
              className="bg-white text-primary font-semibold hover:bg-gray-50 text-xs md:text-sm py-1.5 px-4 h-auto rounded-full shadow-md transition-all hover:scale-105"
              onClick={() => setLocation(bannerSlides[currentSlide].primaryAction.path)}
            >
              {bannerSlides[currentSlide].primaryAction.text} →
            </Button>
            <Button
              variant="outline"
              className="border-2 border-white text-white hover:bg-white/20 text-xs md:text-sm py-1.5 px-4 h-auto rounded-full shadow-md transition-all hover:scale-105"
              onClick={() => setLocation(bannerSlides[currentSlide].secondaryAction.path)}
            >
              {bannerSlides[currentSlide].secondaryAction.text}
            </Button>
          </div>
        </div>

        {/* 슬라이드 인디케이터 */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
          {bannerSlides.map((_, index) => (
            <button
              key={`indicator-${index}`}
              className={`w-2 h-2 rounded-full transition-all ${index === currentSlide ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/70'}`}
              onClick={() => goToSlide(index)}
              aria-label={`슬라이드 ${index + 1} 보기`}
            />
          ))}
        </div>

        {/* 슬라이드 네비게이션 버튼 */}
        <button 
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/30"
          onClick={() => goToSlide((currentSlide - 1 + bannerSlides.length) % bannerSlides.length)}
          aria-label="이전 슬라이드"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button 
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/30"
          onClick={() => goToSlide((currentSlide + 1) % bannerSlides.length)}
          aria-label="다음 슬라이드"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-4 mb-8">
        <Card className="p-6 border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-lg transition-all duration-200" onClick={() => setLocation('/my-courses')}>
          <div className="flex items-center">
            <div className="flex-shrink-0 h-12 w-12 bg-primary/10 dark:bg-primary/30 text-primary dark:text-primary rounded-full flex items-center justify-center">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">진행 중인 강의</h2>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">3개</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: "45%" }}></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">전체 진도율 45%</p>
          </div>
        </Card>

        <Card className="p-6 border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-lg transition-all duration-200" onClick={() => setLocation('/my-pets')}>
          <div className="flex items-center">
            <div className="flex-shrink-0 h-12 w-12 bg-success/10 dark:bg-success/30 text-success dark:text-success rounded-full flex items-center justify-center">
              <PawPrint className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">등록 반려견</h2>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">2마리</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1600077106724-946750eeaf3c?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100" 
                  alt="토리" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-8 h-8 -ml-2 rounded-full border-2 border-white overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100" 
                  alt="몽이"
                  className="w-full h-full object-cover"
                />
              </div>
              <button 
                onClick={() => setLocation('/my-pets')}
                className="ml-2 text-xs text-primary hover:text-primary/80"
              >
                관리하기
              </button>
            </div>
          </div>
        </Card>

        {/* 반려동물 건강 관리 카드 */}
        <Card className="p-6 border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-lg transition-all duration-200" onClick={() => setLocation('/health-tracker')}>
          <div className="flex items-center">
            <div className="flex-shrink-0 h-12 w-12 bg-success/10 dark:bg-success/30 text-success dark:text-success rounded-full flex items-center justify-center">
              <PawPrint className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">반려동물 건강</h2>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">양호</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">다음 예방접종</span>
              <span className="text-sm font-medium text-success dark:text-success">30일 후</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">건강검진</span>
              <span className="text-sm font-medium text-primary dark:text-primary">6개월 후</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-lg transition-all duration-200" onClick={() => setLocation('/schedule')}>
          <div className="flex items-center">
            <div className="flex-shrink-0 h-12 w-12 bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary rounded-full flex items-center justify-center">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">다가오는 일정</h2>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">2개</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs text-gray-700 dark:text-gray-300">
              <div className="flex items-center mb-1">
                <Clock className="h-3 w-3 text-primary dark:text-primary mr-1" />
                <span>오늘 17:00 - 기본 훈련 3주차</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-3 w-3 text-primary dark:text-primary mr-1" />
                <span>내일 14:00 - 사회화 훈련 세션</span>
              </div>
            </div>
          </div>
        </Card>

        {/* 훈련 성과 카드 */}
        <Card className="p-6 border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-lg transition-all duration-200" onClick={() => setLocation('/analytics')}>
          <div className="flex items-center">
            <div className="flex-shrink-0 h-12 w-12 bg-primary/10 dark:bg-primary/30 text-primary dark:text-primary rounded-full flex items-center justify-center">
              <Star className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">이번 주 훈련 성과</h2>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">85%</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">완료한 훈련</span>
              <span className="text-sm font-medium text-primary dark:text-primary">4/5개</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">연속 훈련 일수</span>
              <span className="text-sm font-medium text-success dark:text-success">7일</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Current Courses */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">진행 중인 강의</h2>
          <button 
            onClick={() => setLocation('/my-courses')}
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            모두 보기
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="overflow-hidden border border-gray-100 dark:border-gray-700 card-hover cursor-pointer hover:shadow-lg transition-all duration-200" onClick={() => setLocation(`/course/${course.id}`)}>
              <div className="relative h-40">
                <img 
                  src={course.image} 
                  alt={course.title} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 right-0 bg-primary text-white text-xs font-bold px-2 py-1 m-2 rounded">
                  진행 중
                </div>
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{course.title}</h3>
                  {course.popular && (
                    <span className="text-xs bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary px-2 py-1 rounded-full">인기</span>
                  )}
                  {course.level && (
                    <span className={`text-xs px-2 py-1 rounded-full ${course.level === "초급" ? "bg-success/10 text-success dark:bg-success/30 dark:text-success" : "bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary"}`}>
                      {course.level}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                  {course.description}
                </p>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={course.trainer.avatar} />
                      <AvatarFallback>{course.trainer.name.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{course.trainer.name}</span>
                  </div>

                  <div className="text-right">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ width: `${course.progress}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">진도율 {course.progress}%</div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 px-5 py-3 border-t border-gray-100 dark:border-gray-700">
                <Link 
                  href={`/course/${course.id}`} 
                  className="text-sm font-medium text-primary hover:text-primary/80"
                >
                  이어서 학습하기
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Recommended Courses */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">내 반려견을 위한 맞춤 추천</h2>
          <Link href="/recommendations" className="text-sm text-primary hover:text-primary/80 font-medium">더 많은 추천</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {recommendedCourses.map((course) => (
            <Card key={course.id} className="overflow-hidden border border-gray-100 dark:border-gray-700 card-hover cursor-pointer hover:shadow-lg transition-all duration-200" onClick={() => setLocation(`/course/${course.id}`)}>
              <div className="relative h-36">
                <img 
                  src={course.image} 
                  alt={course.title} 
                  className="w-full h-full object-cover"
                />
                {course.petName && (
                  <span className="absolute top-0 left-0 m-2 text-xs bg-destructive/10 text-destructive dark:bg-destructive/30 dark:text-destructive px-2 py-1 rounded-full">
                    {course.petName}에게 맞춤
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-1">{course.title}</h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                  {course.description}
                </p>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 dark:text-gray-400">총 {course.duration}</span>
                  <span className="font-medium text-accent">{course.price}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Community */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">인기 커뮤니티 소식</h2>
          <Link href="/community" className="text-sm text-primary hover:text-primary/80 font-medium">커뮤니티 가기</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {communityPosts.map((post) => (
            <Card key={post.id} className="overflow-hidden border border-gray-100 dark:border-gray-700 card-hover cursor-pointer hover:shadow-lg transition-all duration-200" onClick={() => setLocation(`/community/post/${post.id}`)}>
              <div className="p-5">
                <div className="flex items-center mb-4">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={post.author.avatar} />
                    <AvatarFallback>{post.author.name.substring(0, 2)}</AvatarFallback>
                  </Avatar>

                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-800 dark:text-white">{post.author.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{post.author.time}</p>
                  </div>
                </div>

                <h4 className="text-base font-semibold text-gray-800 dark:text-white mb-2">{post.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                  {post.content}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex space-x-4">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-destructive mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                      <span>{post.likes}</span>
                    </div>
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                      </svg>
                      <span>{post.comments}</span>
                    </div>
                  </div>

                  <div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                        post.tag === "산책팁" ? "bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary" :
                        post.tag === "훈련팁" ? "bg-success/10 text-success dark:bg-success/30 dark:text-success" : 
                        "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary/80"
                      }`}>
                      {post.tag}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="space-y-8">
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Calendar className="h-6 w-6 text-primary mr-3" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">일정 관리</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              반려견 훈련 일정과 건강 관리 스케줄을 한눈에 확인하세요.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-primary/10 dark:bg-primary/20 rounded-lg">
                <h3 className="font-semibold text-primary dark:text-primary mb-2">다가오는 훈련</h3>
                <p className="text-sm text-primary dark:text-primary">오늘 17:00 - 기본 훈련 3주차</p>
              </div>
              <div className="p-4 bg-success/10 dark:bg-success/20 rounded-lg">
                <h3 className="font-semibold text-success dark:text-success mb-2">건강 체크</h3>
                <p className="text-sm text-success dark:text-success">30일 후 - 예방접종 일정</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Achievements Tab */}
      {activeTab === 'achievements' && (
        <div className="space-y-8">
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Award className="h-6 w-6 text-primary mr-3" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">성취도</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              반려견과 함께 달성한 성과들을 확인하세요.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-warning/10 dark:bg-warning/20 rounded-lg">
                <Award className="h-8 w-8 text-warning mx-auto mb-2" />
                <h3 className="font-semibold text-warning dark:text-warning">첫 수료증</h3>
                <p className="text-sm text-warning dark:text-warning">기초 훈련 과정 완료</p>
              </div>
              <div className="text-center p-4 bg-primary/5 dark:bg-primary/15 rounded-lg">
                <Medal className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold text-primary dark:text-primary/80">7일 연속 학습</h3>
                <p className="text-sm text-primary dark:text-primary">꾸준한 학습 습관 형성</p>
              </div>
              <div className="text-center p-4 bg-success/10 dark:bg-success/20 rounded-lg">
                <Star className="h-8 w-8 text-success mx-auto mb-2" />
                <h3 className="font-semibold text-success dark:text-success">우수 반려인</h3>
                <p className="text-sm text-success dark:text-success">커뮤니티 활동 인정</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}