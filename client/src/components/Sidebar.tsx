import { Link, useLocation, useRoute } from "wouter";
import { BarChart } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from "@/components/ui/scroll-area";
import React, { useState, useEffect, createContext, useContext, useCallback } from "react";
import { SpecialShopLink } from "./SpecialShopLink";
import { HelpSection } from "./HelpSection";
import { StatisticsSection } from "./StatisticsSection";
import { AccessibleIconButton } from "./AccessibleIconButton";
import { AccessibleMenuToggle } from "./AccessibleMenuToggle";
import { AccessibleNavItem } from "./AccessibleNavItem";
import { SidebarMenuGroup } from "./SidebarMenuGroup";
import { QuickActions } from "./QuickActions";
import { MoreHorizontal } from "lucide-react";
import { ScrollReveal } from "@/components/ui/AnimatedContent";
import { useQuery } from "@tanstack/react-query";
const TalezSymbol = "/logo-symbol-new.png";
const TalezLogoType = "/logo-symbol-new.png";

import { AccessibilityFloatingButton } from "@/components/ui/AccessibilityControls";
import {
  Home,
  Users,
  BookOpen,
  Calendar,
  Settings,
  User,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Bell,
  HelpCircle,
  LogOut,
  MapPin,
  Navigation,
  Award,
  UserCheck,
  Video,
  MessageCircle,
  Shield,
  Building,
  TrendingUp,
  FileText,
  BarChart3,
  Package,
  GraduationCap,
  UserRoundCheck,
  CalendarDays,
  CheckCircle,
  Eye,
  EyeOff,
  Sun,
  UserPlus,
  Moon,
  ChevronDown,
  ChevronUp,
  Briefcase,
  ClipboardList,
  Star,
  CreditCard,
  Activity,
  MessageSquare,
  Heart as PawPrint,
  Edit3 as Edit,
  Square as CheckSquare,
  UserCog,
  Wrench,
  Monitor as Presentation,
  Monitor,
  Play as VideoIcon,
  Sparkles,
  Bot,
  ThumbsUp,
  ShoppingBag,
  DollarSign,
  RefreshCw,
  Key,
  Percent,
  Image as ImageIcon,
  Search,
  LogIn,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Coffee,
  Mail,
  Brain,
  Zap,
  Syringe,
  Dog,
  Link2,
  QrCode,
  AlertCircle
} from "lucide-react";

// 사이드바 컨텍스트 생성
export interface SidebarContextType {
  expanded: boolean;
  toggleSidebar: () => void;
}

export const SidebarContext = createContext<SidebarContextType>({
  expanded: true,
  toggleSidebar: () => {}
});

// NavItem 컴포넌트 정의
interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
  onClick?: (path: string) => void;
  show: boolean; // 추가: 권한에 따른 메뉴 표시 여부
}

function NavItem({ href, icon, children, active, onClick, show }: NavItemProps) {
  const { expanded } = useContext(SidebarContext);
  const [, setLocation] = useLocation();

  const handleNavigation = useCallback(() => {
    if (onClick) {
      onClick(href);
    } else {
      setLocation(href);
    }
  }, [href, onClick, setLocation]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    handleNavigation();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleNavigation();
    }
  };

  if (!show) return null;

  // 접힌 상태에서는 툴팁으로 표시
  if (!expanded) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={href}
              className={cn(
                "sidebar-link flex items-center justify-center min-h-[44px] py-3 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out px-3 group",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-900",
                active 
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" 
                  : "text-gray-700 dark:text-gray-200 hover:text-primary dark:hover:text-primary hover:bg-primary/5 border border-transparent hover:border-primary/10"
              )}
              onClick={handleClick}
              onKeyDown={handleKeyDown}
              tabIndex={0}
              role="button"
              aria-label={typeof children === 'string' ? children : children?.toString()}
              aria-current={active ? "page" : undefined}
            >
              <div className="transition-all duration-200 group-hover:scale-110 flex items-center justify-center w-6 h-6">
                {icon}
              </div>
            </a>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="text-base">{children}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // 확장된 상태에서는 일반 메뉴 아이템으로 표시
  return (
    <a
      href={href}
      className={cn(
        "sidebar-link flex items-center min-h-[48px] py-3.5 text-base font-medium rounded-lg transition-all duration-200 ease-in-out px-3 group",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-900",
        active 
          ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" 
          : "text-gray-700 dark:text-gray-200 hover:text-primary dark:hover:text-primary hover:bg-primary/5 border border-transparent hover:border-primary/10"
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-current={active ? "page" : undefined}
    >
      <div className="transition-all duration-200 group-hover:scale-110 group-hover:rotate-6 mr-3.5 w-6 h-6 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <span className="transition-all duration-200 group-hover:translate-x-1 text-base leading-relaxed">{children}</span>
    </a>
  );
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  userRole: string | null;
  isAuthenticated: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export function Sidebar({ 
  open, 
  onClose, 
  userRole, 
  isAuthenticated,
  expanded: externalExpanded,
  onToggleExpand
}: SidebarProps) {
  const [location, setLocation] = useLocation();
  const [internalExpanded, setInternalExpanded] = useState(() => {
    // 모바일에서는 기본적으로 collapsed 상태로 시작
    return typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
  });

  // 외부에서 제어되는 상태 또는 내부 상태 사용
  const expanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        if (onToggleExpand) {
          // 외부 상태 사용 시에는 외부에서 관리
        } else {
          // 모바일에서는 collapsed 상태로 변경
          setInternalExpanded(false);
        }
      } else {
        if (!onToggleExpand) {
          // 데스크톱에서는 expanded 상태로 복구
          setInternalExpanded(true);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [onToggleExpand]);

  // 메인 메뉴는 기본적으로 열린 상태, 나머지는 닫힌 상태로 시작
  // 메뉴 설정 API에서 가져오기
  const { data: menuConfig } = useQuery({
    queryKey: ['/api/menu-configuration'],
    queryFn: async () => {
      const response = await fetch('/api/menu-configuration');
      if (!response.ok) throw new Error('Failed to fetch menu');
      return response.json();
    }
  });

  // 메뉴 가시성 설정 API에서 가져오기
  const { data: menuVisibilitySettings } = useQuery<Record<string, Record<string, boolean>>>({
    queryKey: ['/api/admin/menu-visibility'],
    queryFn: async () => {
      const response = await fetch('/api/admin/menu-visibility');
      if (!response.ok) throw new Error('Failed to fetch menu visibility');
      return response.json();
    }
  });

  // 메뉴 가시성 확인 함수
  const isMenuVisible = useCallback((menuId: string): boolean => {
    if (!menuVisibilitySettings) return true;
    
    // 역할에 따른 설정 키 결정
    const roleKey = userRole === 'admin' ? 'admin' 
                  : userRole === 'trainer' ? 'trainer'
                  : userRole === 'institute-admin' ? 'institute'
                  : 'user';
    
    const roleSettings = menuVisibilitySettings[roleKey];
    if (!roleSettings) return true;
    
    // 메뉴 ID에 해당하는 설정이 없으면 기본값 true
    return roleSettings[menuId] !== false;
  }, [menuVisibilitySettings, userRole]);

  const [menuGroups, setMenuGroups] = useState<Record<string, boolean>>({
    main: true,
    learning: false,
    management: false,
    tools: false,
    admin: false,
    more: false
  });

  useEffect(() => {
    // 권한별 메뉴 표시 권한 확인
    const isInstituteAdmin = userRole === 'institute-admin';
    const isAdmin = userRole === 'admin';
    const isTrainer = userRole === 'trainer';
    const isPetOwner = userRole === 'pet-owner';

    // 권한별 서비스 접근 가능 여부
    const canAccessNotebook = isPetOwner || isTrainer || isInstituteAdmin || isAdmin;
    const canAccessConsultation = isPetOwner || isTrainer || isInstituteAdmin || isAdmin;
    const canAccessCourses = isPetOwner || isTrainer || isInstituteAdmin || isAdmin;
    const canAccessMessaging = isPetOwner || isTrainer || isInstituteAdmin || isAdmin;

    // 로그인 상태가 변경되면 메뉴 그룹 상태 업데이트
    setMenuGroups((prevGroups) => {
      // 권한에 따른 값 업데이트 - 메인 메뉴는 항상 열린 상태 유지
      const updatedMenuGroups = {
        main: true,       // 메인 메뉴는 항상 열림
        learning: false,
        management: false,
        tools: false,
        trainer: false,   // 권한이 있어도 기본 닫힌 상태
        institute: false, // 권한이 있어도 기본 닫힌 상태
        adminDashboard: isAdmin, // 관리자 대시보드는 기본적으로 열린 상태
        admin: false,     // 시스템 관리는 기본 닫힌 상태
        // 로그인 상태에 따라 메뉴 그룹 표시/숨김 처리
        myLearning: false,
        features: false,
        more: false       // 더보기 메뉴는 기본 닫힌 상태
      };

      return updatedMenuGroups;
    });
  }, [userRole, isAuthenticated]);

  const toggleSidebar = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  // 메뉴 그룹 토글 함수 - 개선된 에러 처리
  const toggleMenuGroup = useCallback((groupId: string) => {
    setMenuGroups((prev) => {
      const updated = {
        ...prev,
        [groupId]: !prev[groupId as keyof typeof prev]
      };

      // 메뉴 그룹 상태 변경 로그 (localStorage 저장 안함)

      return updated;
    });
  }, []);

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  const handleItemClick = (path: string) => {
    // path 값 검증
    if (!path || typeof path !== 'string') {
      console.warn('잘못된 경로:', path);
      return;
    }


    // 특정 페이지 접근 권한 및 라우팅 처리
    const publicPaths = [
      "/", "/courses", "/trainers", "/video-training", "/video-call", "/community",
      "/institutes", "/institutes/register", "/events", "/events/calendar",
      "/help/faq", "/help/guide", "/help/about", "/help/contact", "/shop", "/locations",
      "/consultation", "/facilities"
    ];

    // 로그인 필요한 페이지 접근 시
    if (!isAuthenticated && !publicPaths.includes(path) && 
        !path.startsWith('/institutes/') && 
        !path.startsWith('/events/') && 
        !path.startsWith('/help/')) {

      // 로딩 표시를 위한 오버레이 요소 생성
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 bg-black/30 z-50 flex items-center justify-center';
      overlay.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center">
          <div class="animate-spin w-6 h-6 border-3 border-primary border-t-transparent rounded-full mb-3"></div>
          <p class="mb-4 text-gray-900 dark:text-white">로그인이 필요한 서비스입니다</p>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">로그인 페이지로 이동합니다...</p>
        </div>
      `;
      document.body.appendChild(overlay);

      // 약간의 지연 후 페이지 이동 (로딩 표시가 보이도록)
      setTimeout(() => {
        try {
          if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
          }
        } catch (e) {
        }

        // 페이지 이동 시도 (여러 방식으로 시도)
        try {
          setLocation('/auth');
        } catch (e) {
          window.location.href = '/auth';
        }
      }, 1500);
      return;
    }

    // 역할별 접근 제한
    if (isAuthenticated) {
      // 훈련사 전용 페이지
      if (path.startsWith('/trainer/') && userRole !== 'trainer' && userRole !== 'admin' && userRole !== 'institute-admin') {

        // 접근 제한 알림 표시
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/30 z-50 flex items-center justify-center';
        overlay.innerHTML = `
          <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center">
            <div class="text-amber-500 mb-3"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>
            <p class="text-lg font-medium mb-2 text-gray-900 dark:text-white">접근 권한이 없습니다</p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">이 페이지는 훈련사 권한이 필요합니다.</p>
            <button class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md">확인</button>
          </div>
        `;

        document.body.appendChild(overlay);

        // 확인 버튼 클릭 시 오버레이 제거 및 홈으로 이동
        const button = overlay.querySelector('button');
        if (button) {
          button.addEventListener('click', () => {
            document.body.removeChild(overlay);
            window.location.href = '/';
          });
        }

        return;
      }

      // 기관 관리자 전용 페이지
      if (path.startsWith('/institute/') && userRole !== 'institute-admin' && userRole !== 'admin') {

        // 접근 제한 알림 표시
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/30 z-50 flex items-center justify-center';
        overlay.innerHTML = `
          <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center">
            <div class="text-amber-500 mb-3"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>
            <p class="text-lg font-medium mb-2 text-gray-900 dark:text-white">접근 권한이 없습니다</p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">이 페이지는 기관 관리자 권한이 필요합니다.</p>
            <button class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md">확인</button>
          </div>
        `;

        document.body.appendChild(overlay);

        // 확인 버튼 클릭 시 오버레이 제거 및 홈으로 이동
        const button = overlay.querySelector('button');
        if (button) {
          button.addEventListener('click', () => {
            document.body.removeChild(overlay);
            window.location.href = '/';
          });
        }

        return;
      }

      // 시스템 관리자 전용 페이지
      if (path.startsWith('/admin') && userRole !== 'admin') {

        // 접근 제한 알림 표시
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/30 z-50 flex items-center justify-center';
        overlay.innerHTML = `
          <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col items-center">
            <div class="text-amber-500 mb-3"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>
            <p class="text-lg font-medium mb-2">접근 권한이 없습니다</p>
            <p class="text-sm text-gray-500 mb-4">이 페이지는 시스템 관리자 권한이 필요합니다.</p>
            <button class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">확인</button>
          </div>
        `;

        document.body.appendChild(overlay);

        // 확인 버튼 클릭 시 오버레이 제거 및 홈으로 이동
        const button = overlay.querySelector('button');
        if (button) {
          button.addEventListener('click', () => {
            document.body.removeChild(overlay);
            window.location.href = '/';
          });
        }

        return;
      }
    }

    // 특수 페이지 처리
    const specialRoutes: Record<string, string> = {
      '/video-training': '영상 훈련',
      '/video-call': '화상 수업',
      '/ai-analysis': 'AI 분석',
      '/dog-analysis': '강아지 AI 분석',
      '/my-pets': '반려견 관리',
      '/notebook': '알림장',
      '/calendar': '교육 일정',
      '/education-schedule': '교육 일정',
      '/alerts': '알림',
      '/notifications': '알림 센터'
      // '/shop' 항목은 제거 - 사이드바에서 직접 새 창으로 열기 처리
    };

    // 쇼핑 페이지는 SpecialShopLink 컴포넌트에서 처리되므로 여기서는 처리하지 않음

    // SPA 라우팅 함수
    const navigateToPage = (targetPath: string) => {

      // wouter를 사용한 SPA 라우팅
      setLocation(targetPath);

      // 모바일 화면에서만 사이드바 닫기
      if (onClose && window.innerWidth < 768) onClose();
    };

    if (path in specialRoutes) {
      navigateToPage(path);
      return;
    }

    // 일반 페이지 라우팅
    navigateToPage(path);
  };

  // 동적 로고 로딩
  const { data: logoData } = useQuery({
    queryKey: ['/api/logo'],
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 300000 // 5분
  });

  // 로고 URL 결정
  const getLogoUrl = (type: 'expanded' | 'collapsed') => {
    // API 응답 구조: { success: true, data: { logoUrl: string, ... }, message: string }
    if (!logoData || typeof logoData !== 'object') {
      // 기본 로고 사용
      return type === 'expanded' ? TalezLogoType : TalezSymbol;
    }

    const response = logoData as any;
    const settings = response.data || response;

    // 데이터베이스에 저장된 logoUrl 사용
    if (settings.logoUrl) {
      return settings.logoUrl;
    }

    // 기본 로고 사용
    return type === 'expanded' ? TalezLogoType : TalezSymbol;
  };

  const contextValue = {
    expanded,
    toggleSidebar
  };

  // ============================================================
  // 서비스 기능 연관도 기반 역할별 메뉴 표시 설정
  // ============================================================
  // 견주(pet-owner): 소비 중심 - 탐색, 학습 참여, 반려견 관리, 건강 추적
  // 훈련사(trainer): 서비스 제공 - 강좌 관리, 학생 관리, 수익, 협업 도구
  // 기관(institute-admin): 훈련사 + 기관 운영 - 시설/훈련사 관리, 모니터링
  // 관리자(admin): 플랫폼 전체 관리 - 모든 메뉴 접근 가능
  // ============================================================
  
  const showDashboardLink = userRole !== null;
  
  // 역할별 기본 플래그
  const isAdmin = userRole === 'admin';
  const isTrainer = userRole === 'trainer';
  const isInstituteAdmin = userRole === 'institute-admin';
  const isPetOwner = userRole === 'pet-owner';
  
  // 메뉴 그룹별 표시 조건
  // 관리자는 관리자 전용 메뉴만 표시 (일반 사용자 메뉴 숨김)
  const showTrainerMenu = isTrainer && !isAdmin;  // 훈련사 전용 메뉴 (관리자 제외)
  const showInstituteMenu = isInstituteAdmin && !isAdmin;  // 기관 전용 메뉴 (관리자 제외)
  const showAdminMenu = isAdmin;  // 관리자 전용 메뉴
  const showPetOwnerMenu = isPetOwner && !isAdmin;  // 견주 전용 메뉴 (관리자 제외)
  const showOperationsMenu = (isTrainer || isInstituteAdmin) && !isAdmin;  // 운영 관리 메뉴 (관리자 제외)
  const showAllAuthenticatedMenu = (isPetOwner || isTrainer || isInstituteAdmin) && !isAdmin;  // 로그인 사용자 (관리자 제외)
  const showBasicMenu = true;  // 공개 메뉴

  // 이 useEffect는 중복되므로 제거 (위에서 이미 처리됨)



  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        className={cn(
          "fixed left-0 top-0 bottom-0 h-screen bg-white dark:bg-gray-900 transform transition-all duration-300 ease-in-out shadow-xl z-30 flex flex-col border-r border-gray-200 dark:border-gray-800",
          expanded ? "w-64" : "w-[70px]"
        )}
      >
        <div className="p-4 border-b border-emerald-100 dark:border-emerald-800/30 bg-gradient-to-r from-emerald-50 to-emerald-50/50 dark:from-emerald-950/30 dark:to-emerald-950/10 h-16 flex items-center justify-between px-3 transition-all duration-300">
          {expanded ? (
            <ScrollReveal direction="left" delay={100}>
              <a href="/" className="flex items-center justify-center w-full h-full group">
                <img 
                  src={getLogoUrl('expanded')} 
                  alt="TALEZ 로고" 
                  className="w-full h-full object-contain transition-all duration-300 group-hover:scale-105"
                  onError={(e) => {
                    // 이미지 로드 실패시 기본 이미지로 대체
                    e.currentTarget.src = TalezLogoType;
                  }}
                />
              </a>
            </ScrollReveal>
          ) : (
            <a href="/" className="flex items-center justify-center w-full h-full transition-all duration-300 hover:scale-110">
              <img 
                src={getLogoUrl('collapsed')} 
                alt="TALEZ" 
                className="w-full h-full object-contain transition-all duration-300 hover:scale-105"
                onError={(e) => {
                  // 이미지 로드 실패시 기본 이미지로 대체
                  e.currentTarget.src = TalezSymbol;
                }}
              />
            </a>
          )}
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md border border-transparent hover:border-gray-300 dark:hover:border-gray-600 hover:scale-110"
            aria-label={expanded ? "사이드바 접기" : "사이드바 펼치기"}
            aria-expanded={expanded}
            title={expanded ? "사이드바 접기" : "사이드바 펼치기"}
          >
            {expanded ? <ChevronsLeft size={16} /> : <ChevronsRight size={16} />}
          </button>
        </div>

        <ScrollArea className={cn("flex-1", expanded ? "px-3" : "px-2")}>
          <div className="py-4 space-y-1 w-full min-h-min relative">
            {/* 비로그인 상태 메뉴 */}
            {!isAuthenticated ? (
              <>
                <SidebarMenuGroup
                  expanded={expanded}
                  title="메인 메뉴"
                  groupName="main"
                  isOpen={menuGroups.main}
                  toggleGroup={toggleMenuGroup}
                  icon={<Home className="w-5 h-5 text-gray-500" />}
                />

                {menuGroups.main && (
                  <>
                    <AccessibleNavItem 
                      href="/" 
                      icon={<Home className="w-5 h-5 mr-2" />}
                      hoverIcon={<PawPrint className="w-5 h-5 mr-2 text-primary" />}
                      active={isActive("/")} 
                      onClick={handleItemClick} 
                      show={true}
                    >홈</AccessibleNavItem>
                    <AccessibleNavItem 
                      href="/courses" 
                      icon={<GraduationCap className="w-5 h-5 mr-2" />}
                      hoverIcon={<BookOpen className="w-5 h-5 mr-2 text-primary" />}
                      active={isActive("/courses")} 
                      onClick={handleItemClick} 
                      show={true}
                    >강의 찾기</AccessibleNavItem>
                    <AccessibleNavItem 
                      href="/trainers" 
                      icon={<UserRoundCheck className="w-5 h-5 mr-2" />}
                      hoverIcon={<Award className="w-5 h-5 mr-2 text-primary" />}
                      active={isActive("/trainers")} 
                      onClick={handleItemClick} 
                      show={true}
                    >전문가 찾기</AccessibleNavItem>
                    <AccessibleNavItem 
                      href="/institutes" 
                      icon={<MapPin className="w-5 h-5 mr-2" />}
                      hoverIcon={<Navigation className="w-5 h-5 mr-2 text-primary" />}
                      active={isActive("/institutes")} 
                      onClick={handleItemClick} 
                      show={true}
                    >근처 훈련소 찾기</AccessibleNavItem>
                    <AccessibleNavItem 
                      href="/community" 
                      icon={<MessageSquare className="w-5 h-5 mr-2" />}
                      hoverIcon={<Users className="w-5 h-5 mr-2 text-primary" />}
                      active={isActive("/community")} 
                      onClick={handleItemClick} 
                      show={true}
                    >커뮤니티</AccessibleNavItem>
                  </>
                )}

                {/* 특별 메뉴는 비로그인 상태에서 숨김 처리 */}

                {/* 쇼핑몰 메뉴 그룹 (항상 표시) */}
                <SidebarMenuGroup
                  expanded={expanded}
                  title="쇼핑"
                  groupName="features"
                  isOpen={menuGroups.features}
                  toggleGroup={toggleMenuGroup}
                  icon={<ShoppingBag className="w-5 h-5 text-gray-500" />}
                />

                {/* 쇼핑몰 메뉴 그룹 내용 */}
                {menuGroups.features && (
                  <div className={cn("mt-1 pl-2", !expanded && "pl-0")}>
                    <SpecialShopLink expanded={expanded}>쇼핑몰</SpecialShopLink>
                  </div>
                )}

                {/* 비로그인 상태에서 특별 메뉴 내용도 숨김 처리 */}

                {expanded ? (
                  <div className="flex items-center mx-auto mt-4 px-6 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 shadow-sm w-full">
                    <div className="flex-1 pr-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">반려견 교육 시작하기</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">회원가입 후 맞춤형 교육을 경험하세요.</p>
                    </div>
                    <Link
                      href="/auth"
                      className="bg-primary hover:bg-primary/90 text-white text-xs font-medium py-2 px-3 rounded-md transition-colors inline-block text-center"
                    >
                      로그인
                    </Link>
                  </div>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href="/auth"
                          className="flex items-center justify-center py-2 px-2 mt-4 bg-primary hover:bg-primary/90 text-white rounded-lg mx-auto w-[48px]"
                          aria-label="로그인"
                        >
                          <LogIn className="w-5 h-5" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>로그인</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Help Section 컴포넌트 통합 */}
                {!expanded ? (
                  <div className="mt-4 flex flex-col items-center space-y-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 flex justify-center cursor-pointer" 
                            onClick={() => handleItemClick('/help/faq')}
                          >
                            <HelpCircle className="w-5 h-5 text-primary" aria-label="도움말" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>도움말 및 지원</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ) : (
                  /* 확장된 상태에서는 기존 HelpSection 컴포넌트 사용 */
                  <HelpSection expanded={expanded} handleItemClick={handleItemClick} />
                )}

                {/* 독립적인 StatisticsSection 컴포넌트 사용 */}
                <StatisticsSection expanded={expanded} />
              </>
            ) : (
              /* 로그인 상태 메뉴 */
              <>
                {/* 빠른 작업 섹션 */}
                <QuickActions userRole={userRole} onClick={handleItemClick} />

                {/* 메인 메뉴 - 관리자는 관리자 전용 메뉴만 표시 */}
                {!showAdminMenu && (
                  <>
                    <SidebarMenuGroup
                      expanded={expanded}
                      title="메인"
                      groupName="main"
                      isOpen={menuGroups.main}
                      toggleGroup={toggleMenuGroup}
                      icon={<Home className="w-5 h-5 text-gray-500" />}
                    />

                    {menuGroups.main && (
                      <>
                        <AccessibleNavItem href="/" icon={<Home className="w-5 h-5 mr-2" />} hoverIcon={<PawPrint className="w-5 h-5 mr-2 text-primary" />} active={isActive("/")} onClick={handleItemClick} show={isMenuVisible('home')} highlighted>홈</AccessibleNavItem>
                        {showDashboardLink && <AccessibleNavItem href="/dashboard" icon={<BarChart3 className="w-5 h-5 mr-2" />} hoverIcon={<TrendingUp className="w-5 h-5 mr-2 text-primary" />} active={isActive("/dashboard")} onClick={handleItemClick} show={true}>대시보드</AccessibleNavItem>}
                        <AccessibleNavItem href="/courses" icon={<GraduationCap className="w-5 h-5 mr-2" />} hoverIcon={<BookOpen className="w-5 h-5 mr-2 text-primary" />} active={isActive("/courses")} onClick={handleItemClick} show={isMenuVisible('learning')} highlighted badge="인기">강의 찾기</AccessibleNavItem>
                        <AccessibleNavItem href="/trainers" icon={<UserRoundCheck className="w-5 h-5 mr-2" />} hoverIcon={<Award className="w-5 h-5 mr-2 text-primary" />} active={isActive("/trainers")} onClick={handleItemClick} show={isMenuVisible('learning')}>전문가 찾기</AccessibleNavItem>
                        <AccessibleNavItem href="/institutes" icon={<MapPin className="w-5 h-5 mr-2" />} hoverIcon={<Navigation className="w-5 h-5 mr-2 text-primary" />} active={isActive("/institutes")} onClick={handleItemClick} show={isMenuVisible('location')}>시설 찾기</AccessibleNavItem>
                        {isMenuVisible('shop') && <SpecialShopLink expanded={expanded}>쇼핑몰</SpecialShopLink>}
                      </>
                    )}
                  </>
                )}

                {/* 학습 - 견주 전용 (소비자/학습자) */}
                {/* 핵심: 내 반려동물, 내 강의, 예방접종, 쇼핑, 시설찾기, 알림장 */}
                {showPetOwnerMenu && (
                  <>
                    <SidebarMenuGroup expanded={expanded} title="내 반려동물" groupName="learning" isOpen={menuGroups.learning} toggleGroup={toggleMenuGroup} icon={<PawPrint className="w-5 h-5 text-gray-500" />} />
                    {menuGroups.learning && (
                      <>
                        <AccessibleNavItem href="/my-pets" icon={<PawPrint className="w-5 h-5 mr-2" />} hoverIcon={<Award className="w-5 h-5 mr-2 text-primary" />} active={isActive("/my-pets")} onClick={handleItemClick} show={isMenuVisible('my-pets')} highlighted badge="필수">내 반려동물</AccessibleNavItem>
                        <AccessibleNavItem href="/my-courses" icon={<GraduationCap className="w-5 h-5 mr-2" />} hoverIcon={<BookOpen className="w-5 h-5 mr-2 text-primary" />} active={isActive("/my-courses")} onClick={handleItemClick} show={isMenuVisible('my-courses')} highlighted>내 강의</AccessibleNavItem>
                        <AccessibleNavItem href="/pet-care/vaccination-schedule" icon={<Syringe className="w-5 h-5 mr-2" />} hoverIcon={<Activity className="w-5 h-5 mr-2 text-primary" />} active={isActive("/pet-care/vaccination-schedule")} onClick={handleItemClick} show={isMenuVisible('vaccination-schedule')}>예방접종</AccessibleNavItem>
                        <AccessibleNavItem href="/notebook" icon={<Edit className="w-5 h-5 mr-2" />} hoverIcon={<MessageSquare className="w-5 h-5 mr-2 text-primary" />} active={isActive("/notebook")} onClick={handleItemClick} show={isMenuVisible('notebook')}>알림장</AccessibleNavItem>
                        <AccessibleNavItem href="/education-schedule" icon={<Calendar className="w-5 h-5 mr-2" />} hoverIcon={<CheckSquare className="w-5 h-5 mr-2 text-primary" />} active={isActive("/education-schedule")} onClick={handleItemClick} show={isMenuVisible('education-schedule')}>일정 관리</AccessibleNavItem>
                      </>
                    )}

                    {/* 더보기 - 견주 부가 메뉴 */}
                    <SidebarMenuGroup expanded={expanded} title="더보기" groupName="more" isOpen={menuGroups.more} toggleGroup={toggleMenuGroup} icon={<MoreHorizontal className="w-5 h-5 text-gray-500" />} />
                    {menuGroups.more && (
                      <>
                        <AccessibleNavItem href="/community" icon={<MessageSquare className="w-5 h-5 mr-2" />} hoverIcon={<Users className="w-5 h-5 mr-2 text-primary" />} active={isActive("/community")} onClick={handleItemClick} show={isMenuVisible('community')}>커뮤니티</AccessibleNavItem>
                        <AccessibleNavItem href="/video-call" icon={<Video className="w-5 h-5 mr-2" />} hoverIcon={<Video className="w-5 h-5 mr-2 text-primary" />} active={isActive("/video-call")} onClick={handleItemClick} show={isMenuVisible('video-call')}>화상 강의</AccessibleNavItem>
                        <AccessibleNavItem href="/messages" icon={<MessageCircle className="w-5 h-5 mr-2" />} hoverIcon={<Mail className="w-5 h-5 mr-2 text-primary" />} active={isActive("/messages")} onClick={handleItemClick} show={isMenuVisible('messages')}>메시지</AccessibleNavItem>
                        <AccessibleNavItem href="/ai-analysis" icon={<Brain className="w-5 h-5 mr-2" />} hoverIcon={<Sparkles className="w-5 h-5 mr-2 text-primary" />} active={isActive("/ai-analysis")} onClick={handleItemClick} show={isMenuVisible('ai-analysis')}>AI 분석</AccessibleNavItem>
                        <AccessibleNavItem href="/consultation-records" icon={<ClipboardList className="w-5 h-5 mr-2" />} hoverIcon={<ClipboardList className="w-5 h-5 mr-2 text-primary" />} active={isActive("/consultation-records")} onClick={handleItemClick} show={true}>상담 기록</AccessibleNavItem>
                        <AccessibleNavItem href="/emergency-info" icon={<AlertCircle className="w-5 h-5 mr-2" />} hoverIcon={<AlertCircle className="w-5 h-5 mr-2 text-red-500" />} active={isActive("/emergency-info")} onClick={handleItemClick} show={true}>응급 정보</AccessibleNavItem>
                        <AccessibleNavItem href="/institute/consent-management" icon={<FileText className="w-5 h-5 mr-2" />} hoverIcon={<FileText className="w-5 h-5 mr-2 text-primary" />} active={isActive("/institute/consent-management")} onClick={handleItemClick} show={true}>동의 관리</AccessibleNavItem>
                      </>
                    )}
                  </>
                )}

                {/* 훈련사 전용 메뉴 */}
                {/* 핵심: 내 강의 관리, 수강생, 수익, 일정, 알림장 */}
                {showTrainerMenu && (
                  <>
                    <SidebarMenuGroup expanded={expanded} title="강의 관리" groupName="management" isOpen={menuGroups.management} toggleGroup={toggleMenuGroup} icon={<BookOpen className="w-5 h-5 text-gray-500" />} />
                    {menuGroups.management && (
                      <>
                        <AccessibleNavItem href="/trainer/courses" icon={<BookOpen className="w-5 h-5 mr-2" />} hoverIcon={<GraduationCap className="w-5 h-5 mr-2 text-primary" />} active={isActive("/trainer/courses")} onClick={handleItemClick} show={isMenuVisible('trainer-courses')} highlighted badge="핵심">내 강의 관리</AccessibleNavItem>
                        <AccessibleNavItem href="/trainer/students" icon={<Users className="w-5 h-5 mr-2" />} hoverIcon={<UserCheck className="w-5 h-5 mr-2 text-primary" />} active={isActive("/trainer/students")} onClick={handleItemClick} show={isMenuVisible('trainer-students')} highlighted>수강생</AccessibleNavItem>
                        <AccessibleNavItem href="/trainer/earnings" icon={<DollarSign className="w-5 h-5 mr-2" />} hoverIcon={<TrendingUp className="w-5 h-5 mr-2 text-primary" />} active={isActive("/trainer/earnings")} onClick={handleItemClick} show={isMenuVisible('trainer-earnings')} highlighted>수익</AccessibleNavItem>
                        <AccessibleNavItem href="/education-schedule" icon={<Calendar className="w-5 h-5 mr-2" />} hoverIcon={<CalendarDays className="w-5 h-5 mr-2 text-primary" />} active={isActive("/education-schedule")} onClick={handleItemClick} show={true}>일정</AccessibleNavItem>
                        <AccessibleNavItem href="/trainer/notebook" icon={<FileText className="w-5 h-5 mr-2" />} hoverIcon={<Edit className="w-5 h-5 mr-2 text-primary" />} active={isActive("/trainer/notebook")} onClick={handleItemClick} show={isMenuVisible('trainer-notebook')}>알림장</AccessibleNavItem>
                        <AccessibleNavItem href="/consultation-records" icon={<ClipboardList className="w-5 h-5 mr-2" />} hoverIcon={<ClipboardList className="w-5 h-5 mr-2 text-primary" />} active={isActive("/consultation-records")} onClick={handleItemClick} show={true} badge="상담">상담 기록</AccessibleNavItem>
                        <AccessibleNavItem href="/institute/visit-sessions" icon={<Shield className="w-5 h-5 mr-2" />} hoverIcon={<Shield className="w-5 h-5 mr-2 text-primary" />} active={isActive("/institute/visit-sessions")} onClick={handleItemClick} show={true} badge="신뢰QR">방문 신뢰 QR</AccessibleNavItem>
                        <AccessibleNavItem href="/institute/checkin-dashboard" icon={<QrCode className="w-5 h-5 mr-2" />} hoverIcon={<QrCode className="w-5 h-5 mr-2 text-primary" />} active={isActive("/institute/checkin-dashboard")} onClick={handleItemClick} show={true} badge="체크인">체크인 현황</AccessibleNavItem>
                        <AccessibleNavItem href="/institute/incident-protocols" icon={<AlertCircle className="w-5 h-5 mr-2" />} hoverIcon={<AlertCircle className="w-5 h-5 mr-2 text-primary" />} active={isActive("/institute/incident-protocols")} onClick={handleItemClick} show={true}>사고 처리</AccessibleNavItem>
                      </>
                    )}

                    {/* 더보기 - 훈련사 부가 메뉴 */}
                    <SidebarMenuGroup expanded={expanded} title="더보기" groupName="more" isOpen={menuGroups.more} toggleGroup={toggleMenuGroup} icon={<MoreHorizontal className="w-5 h-5 text-gray-500" />} />
                    {menuGroups.more && (
                      <>
                        <AccessibleNavItem href="/trainer/my-points" icon={<CreditCard className="w-5 h-5 mr-2" />} hoverIcon={<Star className="w-5 h-5 mr-2 text-primary" />} active={isActive("/trainer/my-points")} onClick={handleItemClick} show={isMenuVisible('trainer-points')}>내 포인트</AccessibleNavItem>
                        <AccessibleNavItem href="/trainer/rest-management" icon={<Clock className="w-5 h-5 mr-2" />} hoverIcon={<Coffee className="w-5 h-5 mr-2 text-primary" />} active={isActive("/trainer/rest-management")} onClick={handleItemClick} show={isMenuVisible('trainer-rest')}>휴식 관리</AccessibleNavItem>
                        <AccessibleNavItem href="/trainer/substitute-board" icon={<RefreshCw className="w-5 h-5 mr-2" />} hoverIcon={<UserCheck className="w-5 h-5 mr-2 text-primary" />} active={isActive("/trainer/substitute-board")} onClick={handleItemClick} show={isMenuVisible('substitute-board')}>대체 강사</AccessibleNavItem>
                        <AccessibleNavItem href="/video-call" icon={<Video className="w-5 h-5 mr-2" />} hoverIcon={<Video className="w-5 h-5 mr-2 text-primary" />} active={isActive("/video-call")} onClick={handleItemClick} show={isMenuVisible('video-call')}>화상 강의</AccessibleNavItem>
                        <AccessibleNavItem href="/messages" icon={<MessageCircle className="w-5 h-5 mr-2" />} hoverIcon={<Mail className="w-5 h-5 mr-2 text-primary" />} active={isActive("/messages")} onClick={handleItemClick} show={isMenuVisible('messages')}>메시지</AccessibleNavItem>
                      </>
                    )}
                  </>
                )}

                {/* 기관관리자 전용 메뉴 */}
                {/* 핵심: 훈련사 관리, 강의 관리, 수익, 설정 */}
                {showInstituteMenu && (
                  <>
                    <SidebarMenuGroup expanded={expanded} title="기관 관리" groupName="management" isOpen={menuGroups.management} toggleGroup={toggleMenuGroup} icon={<Building className="w-5 h-5 text-gray-500" />} />
                    {menuGroups.management && (
                      <>
                        <AccessibleNavItem href="/institute/trainers" icon={<UserCog className="w-5 h-5 mr-2" />} hoverIcon={<Users className="w-5 h-5 mr-2 text-primary" />} active={isActive("/institute/trainers")} onClick={handleItemClick} show={isMenuVisible('institute-trainers')} highlighted badge="핵심">훈련사 관리</AccessibleNavItem>
                        <AccessibleNavItem href="/institute/trainer-approvals" icon={<Clock className="w-5 h-5 mr-2" />} hoverIcon={<CheckCircle className="w-5 h-5 mr-2 text-primary" />} active={isActive("/institute/trainer-approvals")} onClick={handleItemClick} show={isMenuVisible('trainer-approvals')} highlighted badge="승인">연결 승인</AccessibleNavItem>
                        <AccessibleNavItem href="/trainer/courses" icon={<BookOpen className="w-5 h-5 mr-2" />} hoverIcon={<GraduationCap className="w-5 h-5 mr-2 text-primary" />} active={isActive("/trainer/courses")} onClick={handleItemClick} show={isMenuVisible('trainer-courses')} highlighted>강의 관리</AccessibleNavItem>
                        <AccessibleNavItem href="/trainer/earnings" icon={<DollarSign className="w-5 h-5 mr-2" />} hoverIcon={<TrendingUp className="w-5 h-5 mr-2 text-primary" />} active={isActive("/trainer/earnings")} onClick={handleItemClick} show={isMenuVisible('trainer-earnings')} highlighted>수익</AccessibleNavItem>
                        <AccessibleNavItem href="/institute/facility" icon={<Building className="w-5 h-5 mr-2" />} hoverIcon={<MapPin className="w-5 h-5 mr-2 text-primary" />} active={isActive("/institute/facility")} onClick={handleItemClick} show={isMenuVisible('institute-facility')}>시설 관리</AccessibleNavItem>
                        <AccessibleNavItem href="/institute/notebook-monitor" icon={<Monitor className="w-5 h-5 mr-2" />} hoverIcon={<FileText className="w-5 h-5 mr-2 text-primary" />} active={isActive("/institute/notebook-monitor")} onClick={handleItemClick} show={isMenuVisible('notebook-monitor')}>알림장</AccessibleNavItem>
                        <AccessibleNavItem href="/consultation-records" icon={<ClipboardList className="w-5 h-5 mr-2" />} hoverIcon={<ClipboardList className="w-5 h-5 mr-2 text-primary" />} active={isActive("/consultation-records")} onClick={handleItemClick} show={true} badge="상담">상담 기록</AccessibleNavItem>
                        <AccessibleNavItem href="/institute/qr-codes" icon={<QrCode className="w-5 h-5 mr-2" />} hoverIcon={<QrCode className="w-5 h-5 mr-2 text-primary" />} active={isActive("/institute/qr-codes")} onClick={handleItemClick} show={true} badge="QR">QR 관리</AccessibleNavItem>
                        <AccessibleNavItem href="/institute/visit-sessions" icon={<Shield className="w-5 h-5 mr-2" />} hoverIcon={<Shield className="w-5 h-5 mr-2 text-primary" />} active={isActive("/institute/visit-sessions")} onClick={handleItemClick} show={true} badge="신뢰QR">방문 신뢰 QR</AccessibleNavItem>
                        <AccessibleNavItem href="/institute/zone-management" icon={<MapPin className="w-5 h-5 mr-2" />} hoverIcon={<MapPin className="w-5 h-5 mr-2 text-primary" />} active={isActive("/institute/zone-management")} onClick={handleItemClick} show={true}>구역 관리</AccessibleNavItem>
                        <AccessibleNavItem href="/institute/checkin-dashboard" icon={<UserCheck className="w-5 h-5 mr-2" />} hoverIcon={<UserCheck className="w-5 h-5 mr-2 text-primary" />} active={isActive("/institute/checkin-dashboard")} onClick={handleItemClick} show={true} badge="체크인">체크인 현황</AccessibleNavItem>
                        <AccessibleNavItem href="/institute/store-policies" icon={<Shield className="w-5 h-5 mr-2" />} hoverIcon={<Shield className="w-5 h-5 mr-2 text-primary" />} active={isActive("/institute/store-policies")} onClick={handleItemClick} show={true}>매장 규정</AccessibleNavItem>
                        <AccessibleNavItem href="/institute/consent-management" icon={<FileText className="w-5 h-5 mr-2" />} hoverIcon={<FileText className="w-5 h-5 mr-2 text-primary" />} active={isActive("/institute/consent-management")} onClick={handleItemClick} show={true}>동의 관리</AccessibleNavItem>
                        <AccessibleNavItem href="/institute/incident-protocols" icon={<AlertCircle className="w-5 h-5 mr-2" />} hoverIcon={<AlertCircle className="w-5 h-5 mr-2 text-primary" />} active={isActive("/institute/incident-protocols")} onClick={handleItemClick} show={true}>사고 처리</AccessibleNavItem>
                      </>
                    )}

                    {/* 더보기 - 기관관리자 부가 메뉴 */}
                    <SidebarMenuGroup expanded={expanded} title="더보기" groupName="more" isOpen={menuGroups.more} toggleGroup={toggleMenuGroup} icon={<MoreHorizontal className="w-5 h-5 text-gray-500" />} />
                    {menuGroups.more && (
                      <>
                        <AccessibleNavItem href="/trainer/students" icon={<Users className="w-5 h-5 mr-2" />} hoverIcon={<UserCheck className="w-5 h-5 mr-2 text-primary" />} active={isActive("/trainer/students")} onClick={handleItemClick} show={isMenuVisible('trainer-students')}>수강생</AccessibleNavItem>
                        <AccessibleNavItem href="/institute/substitute-management" icon={<RefreshCw className="w-5 h-5 mr-2" />} hoverIcon={<UserCheck className="w-5 h-5 mr-2 text-primary" />} active={isActive("/institute/substitute-management")} onClick={handleItemClick} show={isMenuVisible('substitute-management')}>대체 강사</AccessibleNavItem>
                        <AccessibleNavItem href="/trainer/my-points" icon={<CreditCard className="w-5 h-5 mr-2" />} hoverIcon={<Star className="w-5 h-5 mr-2 text-primary" />} active={isActive("/trainer/my-points") || isActive("/institute/my-points")} onClick={handleItemClick} show={isMenuVisible('trainer-points')}>포인트</AccessibleNavItem>
                        <AccessibleNavItem href="/messages" icon={<MessageCircle className="w-5 h-5 mr-2" />} hoverIcon={<Mail className="w-5 h-5 mr-2 text-primary" />} active={isActive("/messages")} onClick={handleItemClick} show={isMenuVisible('messages')}>메시지</AccessibleNavItem>
                      </>
                    )}
                  </>
                )}

                {/* 관리 대시보드 */}
                {showAdminMenu && (
                  <>
                    <SidebarMenuGroup expanded={expanded} title="관리" groupName="adminDashboard" isOpen={menuGroups.adminDashboard} toggleGroup={toggleMenuGroup} icon={<Monitor className="w-5 h-5 text-primary" />} />
                    {menuGroups.adminDashboard && (
                      <>
                        <AccessibleNavItem href="/admin/dashboard" icon={<BarChart3 className="w-5 h-5 mr-2" />} hoverIcon={<TrendingUp className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/dashboard")} onClick={handleItemClick} show={isMenuVisible('admin-dashboard')} highlighted>대시보드</AccessibleNavItem>
                        <AccessibleNavItem href="/admin/users" icon={<Users className="w-5 h-5 mr-2" />} hoverIcon={<UserCheck className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/users")} onClick={handleItemClick} show={isMenuVisible('users-management')} highlighted badge="핵심">사용자 관리</AccessibleNavItem>
                        <AccessibleNavItem href="/admin/trainers" icon={<UserRoundCheck className="w-5 h-5 mr-2" />} hoverIcon={<Award className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/trainers")} onClick={handleItemClick} show={isMenuVisible('trainers-management')}>훈련사 관리</AccessibleNavItem>
                        <AccessibleNavItem href="/admin/members-status" icon={<Users className="w-5 h-5 mr-2" />} hoverIcon={<UserCheck className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/members-status")} onClick={handleItemClick} show={isMenuVisible('members-status')}>회원 현황</AccessibleNavItem>
                        <AccessibleNavItem href="/admin/approvals" icon={<Clock className="w-5 h-5 mr-2" />} hoverIcon={<CheckCircle className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/approvals")} onClick={handleItemClick} show={isMenuVisible('user-approvals')} highlighted badge="승인">회원 승인</AccessibleNavItem>
                        <AccessibleNavItem href="/admin/matching" icon={<Link2 className="w-5 h-5 mr-2" />} hoverIcon={<UserCheck className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/matching")} onClick={handleItemClick} show={isMenuVisible('matching-management')} highlighted badge="매칭">매칭 관리</AccessibleNavItem>
                        <AccessibleNavItem href="/admin/analytics" icon={<Activity className="w-5 h-5 mr-2" />} hoverIcon={<BarChart3 className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/analytics")} onClick={handleItemClick} show={isMenuVisible('admin-analytics')}>분석</AccessibleNavItem>
                        <AccessibleNavItem href="/admin/revenue" icon={<DollarSign className="w-5 h-5 mr-2" />} hoverIcon={<TrendingUp className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/revenue")} onClick={handleItemClick} show={isMenuVisible('revenue-management')} highlighted>수익</AccessibleNavItem>
                        <AccessibleNavItem href="/admin/settings" icon={<Settings className="w-5 h-5 mr-2" />} hoverIcon={<Wrench className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/settings")} onClick={handleItemClick} show={isMenuVisible('system-settings')}>설정</AccessibleNavItem>
                      </>
                    )}
                  </>
                )}

                {/* 시스템 관리 (관리자) */}
                {showAdminMenu && (
                  <>
                    <SidebarMenuGroup expanded={expanded} title="시스템 관리" groupName="admin" isOpen={menuGroups.admin} toggleGroup={toggleMenuGroup} icon={<Settings className="w-5 h-5 text-gray-500" />} />
                    {menuGroups.admin && (
                      <>
                        <AccessibleNavItem href="/admin/curriculum" icon={<BookOpen className="w-5 h-5 mr-2" />} hoverIcon={<GraduationCap className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/curriculum")} onClick={handleItemClick} show={isMenuVisible('curriculum-management')}>커리큘럼 관리</AccessibleNavItem>
                        <AccessibleNavItem href="/admin/registrations" icon={<UserPlus className="w-5 h-5 mr-2" />} hoverIcon={<UserCheck className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/registrations")} onClick={handleItemClick} show={isMenuVisible('registrations')}>등록 신청 관리</AccessibleNavItem>
                        <AccessibleNavItem href="/admin/trainer-certification" icon={<Award className="w-5 h-5 mr-2" />} hoverIcon={<Shield className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/trainer-certification")} onClick={handleItemClick} show={isMenuVisible('trainer-certification')}>훈련사 인증 관리</AccessibleNavItem>
                        <AccessibleNavItem href="/admin/institutes" icon={<Building className="w-5 h-5 mr-2" />} hoverIcon={<UserCog className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/institutes")} onClick={handleItemClick} show={isMenuVisible('institutes-management')}>기관 관리</AccessibleNavItem>
                        <AccessibleNavItem href="/admin/business-registration" icon={<Building className="w-5 h-5 mr-2" />} hoverIcon={<UserPlus className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/business-registration")} onClick={handleItemClick} show={isMenuVisible('business-registration')}>업체 등록</AccessibleNavItem>
                        <AccessibleNavItem href="/admin/review-management" icon={<MessageSquare className="w-5 h-5 mr-2" />} hoverIcon={<Star className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/review-management")} onClick={handleItemClick} show={isMenuVisible('review-management')}>리뷰 관리</AccessibleNavItem>
                        <AccessibleNavItem href="/admin/info-correction-requests" icon={<Edit className="w-5 h-5 mr-2" />} hoverIcon={<FileText className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/info-correction-requests")} onClick={handleItemClick} show={isMenuVisible('info-correction')}>정보 수정 요청</AccessibleNavItem>
                        <AccessibleNavItem href="/admin/contents" icon={<ImageIcon className="w-5 h-5 mr-2" />} hoverIcon={<Package className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/contents")} onClick={handleItemClick} show={isMenuVisible('contents-management')}>콘텐츠 관리</AccessibleNavItem>
                        <AccessibleNavItem href="/admin/community" icon={<MessageSquare className="w-5 h-5 mr-2" />} hoverIcon={<Users className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/community")} onClick={handleItemClick} show={isMenuVisible('community-management')}>커뮤니티 관리</AccessibleNavItem>
                        <AccessibleNavItem href="/admin/content-crawler" icon={<Search className="w-5 h-5 mr-2" />} hoverIcon={<Bot className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/content-crawler")} onClick={handleItemClick} show={isMenuVisible('content-crawler')}>콘텐츠 크롤링</AccessibleNavItem>
                        <AccessibleNavItem href="/admin/content-moderation" icon={<Shield className="w-5 h-5 mr-2" />} hoverIcon={<CheckCircle className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/content-moderation")} onClick={handleItemClick} show={isMenuVisible('content-moderation')}>콘텐츠 검열</AccessibleNavItem>
                        <AccessibleNavItem href="/admin/commissions" icon={<Percent className="w-5 h-5 mr-2" />} hoverIcon={<DollarSign className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/commissions")} onClick={handleItemClick} show={isMenuVisible('commissions')}>가격 관리</AccessibleNavItem>
                        <AccessibleNavItem href="/admin/points-management" icon={<Star className="w-5 h-5 mr-2" />} hoverIcon={<Award className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/points-management")} onClick={handleItemClick} show={isMenuVisible('points-management')}>포인트 관리</AccessibleNavItem>
                        <AccessibleNavItem href="/admin/payment-integration" icon={<CreditCard className="w-5 h-5 mr-2" />} hoverIcon={<DollarSign className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/payment-integration")} onClick={handleItemClick} show={isMenuVisible('payment-integration')}>결제연동 관리</AccessibleNavItem>
                        <AccessibleNavItem href="/admin/shop" icon={<ShoppingBag className="w-5 h-5 mr-2" />} hoverIcon={<Package className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/shop")} onClick={handleItemClick} show={isMenuVisible('shop-management')}>쇼핑몰 관리</AccessibleNavItem>
                        <AccessibleNavItem href="/admin/api-management" icon={<Key className="w-5 h-5 mr-2" />} hoverIcon={<Settings className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/api-management")} onClick={handleItemClick} show={isMenuVisible('api-management')}>API 관리</AccessibleNavItem>
                        <AccessibleNavItem href="/admin/ai-api-management" icon={<Bot className="w-5 h-5 mr-2" />} hoverIcon={<Activity className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/ai-api-management")} onClick={handleItemClick} show={isMenuVisible('ai-api-management')}>AI API 관리</AccessibleNavItem>
                        <AccessibleNavItem href="/admin/ai-optimization" icon={<Brain className="w-5 h-5 mr-2" />} hoverIcon={<Zap className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/ai-optimization")} onClick={handleItemClick} show={isMenuVisible('ai-optimization')}>AI 최적화</AccessibleNavItem>
                        <AccessibleNavItem href="/admin/menu-visibility" icon={<Eye className="w-5 h-5 mr-2" />} hoverIcon={<EyeOff className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/menu-visibility")} onClick={handleItemClick} show={true}>메뉴 표시 제어</AccessibleNavItem>
                        <AccessibleNavItem href="/admin/settings" icon={<Settings className="w-5 h-5 mr-2" />} hoverIcon={<Wrench className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/settings")} onClick={handleItemClick} show={isMenuVisible('system-settings')}>시스템 설정</AccessibleNavItem>
                        <AccessibleNavItem href="/admin/messaging-settings" icon={<MessageSquare className="w-5 h-5 mr-2" />} hoverIcon={<Mail className="w-5 h-5 mr-2 text-primary" />} active={isActive("/admin/messaging-settings")} onClick={handleItemClick} show={isMenuVisible('messaging-settings')}>메시징 설정</AccessibleNavItem>
                      </>
                    )}
                  </>
                )}

                {/* Help & Statistics */}
                {!expanded ? (
                  <div className="mt-4 flex flex-col items-center space-y-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 flex justify-center cursor-pointer" onClick={() => handleItemClick('/help/faq')}>
                            <HelpCircle className="w-5 h-5 text-primary" aria-label="도움말" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right"><p>도움말 및 지원</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ) : (
                  <HelpSection expanded={expanded} handleItemClick={handleItemClick} />
                )}
                <StatisticsSection expanded={expanded} />
              </>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-b border-emerald-100 dark:border-emerald-800/30 bg-gradient-to-r from-emerald-50 to-emerald-50/50 dark:from-emerald-950/30 dark:to-emerald-950/10">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {expanded ? (
              <>
                <div className="flex items-center justify-between">
                  <span>© 2025 Talez</span>
                  <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">
                    {userRole || '비로그인'}
                  </span>
                </div>
                <div className="mt-1">v1.2.0</div>
              </>
            ) : (
              <span className="block py-1 px-2 rounded bg-gray-100 dark:bg-gray-800 text-center text-xs">
                {userRole === 'admin' ? '관리자' : 
                 userRole === 'trainer' ? '훈련사' : 
                 userRole === 'institute-admin' ? '기관' :
                 userRole === 'pet-owner' ? '견주' : '비로그인'}
              </span>
            )}
          </div>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}

// Add service inspection menu for admin role.