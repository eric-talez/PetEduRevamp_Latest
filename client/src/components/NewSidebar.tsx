import { Link, useLocation } from "wouter";
import { BarChart } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import React, { useState, useEffect } from "react";
import { SpecialShopLink } from "./SpecialShopLink";
import { HelpSection } from "./HelpSection";
import { StatisticsSection } from "./StatisticsSection";
import {
  ChevronDown,
  ChevronRight,
  Home,
  GraduationCap,
  UserRoundCheck,
  Building,
  MessageSquare,
  BookOpen,
  PawPrint,
  Calendar,
  Award,
  Presentation,
  HelpCircle,
  Edit,
  Users,
  LineChart,
  AreaChart,
  Cog,
  UserCog,
  CheckSquare,
  Wrench,
  Video,
  VideoIcon,
  ShoppingBag,
  Bell,
  MapPin,
  ThumbsUp,
  Shield,
  Store,
  LogIn,
  ChevronsLeft,
  ChevronsRight,
  Menu,
  Activity,
  Brain,
  BarChart2,
  Sparkles,
  DollarSign,
  Gift,
  Percent,
  Tag,
  PercentIcon,
  Calculator,
  FileText
} from "lucide-react";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
  onClick?: (path: string) => void;
  show: boolean;
}

function NavItem({ href, icon, children, active, onClick, show }: NavItemProps) {
  if (!show) return null;
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      e.preventDefault();
      onClick(href);
    }
    // onClick이 없으면 Link의 기본 라우팅 동작 사용
  };

  // 키보드 이벤트 핸들러
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (onClick) {
        onClick(href);
      }
    }
  };
  
  return (
    <Link href={href}>
      <a
        className={cn(
          "flex items-center px-4 py-2 rounded-md text-xs font-medium transition-colors",
          active
            ? "bg-primary/10 text-primary"
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50"
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {icon}
        <span>{children}</span>
      </a>
    </Link>
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

export function NewSidebar({ 
  open, 
  onClose, 
  userRole, 
  isAuthenticated,
  expanded: externalExpanded,
  onToggleExpand
}: SidebarProps) {
  console.log('NewSidebar render - userRole:', userRole, 'isAuthenticated:', isAuthenticated);
  const [location, setLocation] = useLocation();
  const [internalExpanded, setInternalExpanded] = useState(true);
  
  // 외부에서 제어되는 상태 또는 내부 상태 사용
  const expanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;

  // 메뉴 그룹 상태 관리 (기본 메뉴 그룹)
  const [menuGroups, setMenuGroups] = useState({
    main: false,
    features: false,
    myLearning: false,
    help: true, // 도움말 메뉴 그룹 추가
    trainer: false,
    institute: false,
    admin: false
  });
  
  // 도움말 영역 상태
  const [helpMenuOpen, setHelpMenuOpen] = useState(true);
  
  // 서비스 현황 영역 상태
  const [statsMenuOpen, setStatsMenuOpen] = useState(true);

  // 역할에 따라 메뉴 그룹 상태 업데이트
  useEffect(() => {
    console.log('NewSidebar userRole changed:', userRole);
    
    if (!isAuthenticated) {
      // 비로그인 사용자는 기본 메뉴만 표시
      setMenuGroups({
        main: false,
        features: false,
        myLearning: false,
        help: true,
        trainer: false,
        institute: false,
        admin: false
      });
      return;
    }

    // 로그인 사용자용 메뉴 설정
    const updatedMenuGroups = {
      main: false,
      features: false,
      myLearning: false,
      help: true,
      trainer: false,
      institute: false,
      admin: false
    };
    
    // 권한에 따라 선택적으로 활성화
    if (userRole === 'trainer' || userRole === 'admin') {
      updatedMenuGroups.trainer = false; // 기본적으로 닫힌 상태
    }
    
    if (userRole === 'institute-admin' || userRole === 'admin') {
      updatedMenuGroups.institute = false; // 기본적으로 닫힌 상태
    }
    
    if (userRole === 'admin') {
      updatedMenuGroups.admin = true; // 관리자는 기본적으로 열려있음
    }
    
    console.log('NewSidebar menuGroups updated:', updatedMenuGroups);
    setMenuGroups(updatedMenuGroups);
  }, [userRole, isAuthenticated]);

  // 화면 크기 변경 시 반응형 처리
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 768) {
        if (expanded && onToggleExpand) {
          onToggleExpand();
        } else if (expanded) {
          setInternalExpanded(false);
        }
      }
    }

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [onToggleExpand, expanded]);

  // 메뉴 펼치기/접기 토글 함수
  const toggleExpand = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  // 메뉴 그룹 토글 함수
  const toggleMenuGroup = (group: keyof typeof menuGroups) => {
    console.log(`메뉴 그룹 토글: ${group}`);
    setMenuGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };
  
  // 도움말 메뉴 토글 함수
  const toggleHelpMenu = () => {
    console.log("도움말 메뉴 토글:", !helpMenuOpen);
    setHelpMenuOpen(!helpMenuOpen);
  };
  
  // 서비스 현황 메뉴 토글 함수
  const toggleStatsMenu = () => {
    console.log("서비스 현황 메뉴 토글:", !statsMenuOpen);
    setStatsMenuOpen(!statsMenuOpen);
  };

  // 활성 메뉴 여부 확인
  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  // 메뉴 클릭 처리 함수
  const handleItemClick = (path: string) => {
    console.log('메뉴 클릭:', path);
    
    // 공개 페이지 목록
    const publicPaths = [
      "/", "/auth/login", "/auth/register", "/auth/forgot-password",
      "/institutes", "/institutes/register", "/events", "/events/calendar",
      "/help/faq", "/help/guide", "/help/about", "/help/contact", "/shop"
    ];

    // 로그인 필요한 페이지 접근 시
    if (!isAuthenticated && !publicPaths.includes(path) && 
        !path.startsWith('/institutes/') && 
        !path.startsWith('/events/') && 
        !path.startsWith('/help/')) {
      console.log('로그인 필요: ', path);
      window.location.href = "/auth/login";
      return;
    }

    // 역할별 접근 제한
    if (isAuthenticated) {
      // 훈련사 전용 페이지
      if (path.startsWith('/trainer/') && userRole !== 'trainer' && userRole !== 'admin' && userRole !== 'institute-admin') {
        console.log('훈련사 권한 필요');
        window.location.href = "/";
        return;
      }
      
      // 기관 관리자 전용 페이지
      if (path.startsWith('/institute/') && userRole !== 'institute-admin' && userRole !== 'admin') {
        console.log('기관 관리자 권한 필요');
        window.location.href = "/";
        return;
      }
      
      // 관리자 전용 페이지
      if (path.startsWith('/admin') && userRole !== 'admin' && userRole !== 'super-admin') {
        console.log('관리자 권한 필요');
        window.location.href = "/";
        return;
      }
    }
    
    // 사이드바가 작은 화면에서 열려있으면 닫기
    if (window.innerWidth < 768 && open) {
      onClose();
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-gray-900 shadow-lg transform transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        expanded ? "w-64" : "w-20"
      )}
    >
      <div className="flex flex-col h-full relative">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-800">
          {expanded ? (
            <div className="flex items-center">
              <PawPrint className="h-6 w-6 text-primary mr-2" />
              <span className="text-xl font-bold text-primary">PetEdu</span>
            </div>
          ) : (
            <div className="mx-auto">
              <PawPrint className="h-6 w-6 text-primary" />
            </div>
          )}
          
          {/* 데스크톱에서만 표시되는 사이드바 펼치기/접기 버튼 */}
          <button 
            className="hidden md:flex p-1 rounded-md focus:outline-none"
            onClick={toggleExpand}
            aria-label={expanded ? "사이드바 접기" : "사이드바 펼치기"}
          >
            {expanded ? <ChevronsLeft className="h-5 w-5 text-gray-500" /> : <ChevronsRight className="h-5 w-5 text-gray-500" />}
          </button>
          
          {/* 모바일에서만 표시되는 닫기 버튼 */}
          <button 
            className="md:hidden p-1 rounded-md focus:outline-none"
            onClick={onClose}
            aria-label="사이드바 닫기"
          >
            <Menu className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <nav className="space-y-1 px-2">
            {isAuthenticated ? (
              <>
                {/* Main Menu Group */}
                {expanded ? (
                  <div className="px-3 py-2 flex items-center justify-between cursor-pointer" onClick={() => toggleMenuGroup('main')}>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      메인
                    </h3>
                    {menuGroups.main ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                  </div>
                ) : (
                  <div className="flex justify-center py-2">
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  </div>
                )}

                {menuGroups.main && (
                  <>
                    <NavItem
                      href="/"
                      icon={<Home className="w-5 h-5 mr-2" />}
                      active={isActive("/")}
                      onClick={handleItemClick}
                      show={true}
                    >
                      홈
                    </NavItem>

                    <NavItem
                      href="/dashboard"
                      icon={<BarChart2 className="w-5 h-5 mr-2" />}
                      active={isActive("/dashboard")}
                      onClick={handleItemClick}
                      show={true}
                    >
                      대시보드
                    </NavItem>

                    <NavItem
                      href="/my-pets"
                      icon={<PawPrint className="w-5 h-5 mr-2" />}
                      active={isActive("/my-pets")}
                      onClick={handleItemClick}
                      show={true}
                    >
                      나의 반려동물
                    </NavItem>

                    <NavItem
                      href="/messages"
                      icon={<MessageSquare className="w-5 h-5 mr-2" />}
                      active={isActive("/messages")}
                      onClick={handleItemClick}
                      show={true}
                    >
                      메시지
                    </NavItem>
                  </>
                )}
              
                {/* Features Menu Group */}
                {expanded ? (
                  <div 
                    className="px-3 py-2 flex items-center justify-between cursor-pointer mt-6" 
                    onClick={() => toggleMenuGroup('features')}
                  >
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      기능
                    </h3>
                    {menuGroups.features ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                  </div>
                ) : (
                  <div className="flex justify-center py-2 mt-6">
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  </div>
                )}

                {menuGroups.features && (
                  <>
                    <NavItem
                      href="/courses"
                      icon={<GraduationCap className="w-5 h-5 mr-2" />}
                      active={isActive("/courses")}
                      onClick={handleItemClick}
                      show={true}
                    >
                      강의
                    </NavItem>

                    <NavItem
                      href="/trainers"
                      icon={<UserRoundCheck className="w-5 h-5 mr-2" />}
                      active={isActive("/trainers")}
                      onClick={handleItemClick}
                      show={true}
                    >
                      훈련사 찾기
                    </NavItem>

                    <NavItem
                      href="/institutes"
                      icon={<Building className="w-5 h-5 mr-2" />}
                      active={isActive("/institutes")}
                      onClick={handleItemClick}
                      show={true}
                    >
                      교육기관
                    </NavItem>

                    <NavItem
                      href="/events"
                      icon={<Calendar className="w-5 h-5 mr-2" />}
                      active={isActive("/events")}
                      onClick={handleItemClick}
                      show={true}
                    >
                      이벤트
                    </NavItem>

                    <NavItem
                      href="/ai-analysis"
                      icon={<Brain className="w-5 h-5 mr-2" />}
                      active={isActive("/ai-analysis")}
                      onClick={handleItemClick}
                      show={true}
                    >
                      AI 분석
                    </NavItem>

                    <SpecialShopLink className={
                      cn(
                        "flex items-center px-4 py-2 rounded-md text-xs font-medium transition-colors",
                        isActive("/shop")
                          ? "bg-primary/10 text-primary"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                      )
                    }>
                      <ShoppingBag className="w-5 h-5 mr-2" />
                      <span>쇼핑</span>
                    </SpecialShopLink>
                  </>
                )}

                {/* My Learning Menu Group */}
                {expanded ? (
                  <div 
                    className="px-3 py-2 flex items-center justify-between cursor-pointer mt-6"
                    onClick={() => toggleMenuGroup('myLearning')}
                  >
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      나의 학습
                    </h3>
                    {menuGroups.myLearning ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                  </div>
                ) : (
                  <div className="flex justify-center py-2 mt-6">
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  </div>
                )}

                {menuGroups.myLearning && (
                  <>
                    <NavItem
                      href="/my-courses"
                      icon={<BookOpen className="w-5 h-5 mr-2" />}
                      active={isActive("/my-courses")}
                      onClick={handleItemClick}
                      show={true}
                    >
                      수강 중인 강의
                    </NavItem>

                    <NavItem
                      href="/my-achievements"
                      icon={<Award className="w-5 h-5 mr-2" />}
                      active={isActive("/my-achievements")}
                      onClick={handleItemClick}
                      show={true}
                    >
                      학습 성취
                    </NavItem>

                    <NavItem
                      href="/my-notes"
                      icon={<Edit className="w-5 h-5 mr-2" />}
                      active={isActive("/my-notes")}
                      onClick={handleItemClick}
                      show={true}
                    >
                      학습 노트
                    </NavItem>

                    <NavItem
                      href="/my-reviews"
                      icon={<ThumbsUp className="w-5 h-5 mr-2" />}
                      active={isActive("/my-reviews")}
                      onClick={handleItemClick}
                      show={true}
                    >
                      내 리뷰
                    </NavItem>
                  </>
                )}

                {/* Trainer Menu Group - only for trainers and admins */}
                {(userRole === 'trainer' || userRole === 'admin') && expanded ? (
                  <div
                    className="px-3 py-2 mt-6 flex items-center justify-between cursor-pointer"
                    onClick={() => toggleMenuGroup('trainer')}
                  >
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      훈련사 관리
                    </h3>
                    {menuGroups.trainer ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                  </div>
                ) : (userRole === 'trainer' || userRole === 'admin') ? (
                  <div className="flex justify-center py-2 mt-6">
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  </div>
                ) : null}

                {menuGroups.trainer && (userRole === 'trainer' || userRole === 'admin') && (
                  <>
                    <NavItem
                      href="/trainer-dashboard"
                      icon={<LineChart className="w-5 h-5 mr-2" />}
                      active={isActive("/trainer-dashboard")}
                      onClick={handleItemClick}
                      show={true}
                    >
                      훈련사 대시보드
                    </NavItem>

                    <NavItem
                      href="/my-students"
                      icon={<Users className="w-5 h-5 mr-2" />}
                      active={isActive("/my-students")}
                      onClick={handleItemClick}
                      show={true}
                    >
                      수강생 관리
                    </NavItem>

                    <NavItem
                      href="/manage-courses"
                      icon={<Presentation className="w-5 h-5 mr-2" />}
                      active={isActive("/manage-courses")}
                      onClick={handleItemClick}
                      show={true}
                    >
                      강의 관리
                    </NavItem>

                    <NavItem
                      href="/schedule-sessions"
                      icon={<Video className="w-5 h-5 mr-2" />}
                      active={isActive("/schedule-sessions")}
                      onClick={handleItemClick}
                      show={true}
                    >
                      세션 스케줄링
                    </NavItem>
                  </>
                )}

                {/* Institute Admin Menu Group - only for institute admins and admins */}
                
                {(userRole === 'institute-admin' || userRole === 'admin') && expanded ? (
                  <div
                    className="px-3 py-2 mt-6 flex items-center justify-between cursor-pointer"
                    onClick={() => toggleMenuGroup('institute')}
                  >
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      기관 관리
                    </h3>
                    {menuGroups.institute ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                  </div>
                ) : (userRole === 'institute-admin' || userRole === 'admin') ? (
                  <div className="flex justify-center py-2 mt-6">
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  </div>
                ) : null}

                {menuGroups.institute && (userRole === 'institute-admin' || userRole === 'admin') && (
                  <>
                    <NavItem
                      href="/institute/dashboard"
                      icon={<AreaChart className="w-5 h-5 mr-2" />}
                      active={isActive("/institute/dashboard")}
                      onClick={handleItemClick}
                      show={true}
                    >
                      기관 대시보드
                    </NavItem>

                    <NavItem
                      href="/manage-trainers"
                      icon={<UserCog className="w-5 h-5 mr-2" />}
                      active={isActive("/manage-trainers")}
                      onClick={handleItemClick}
                      show={true}
                    >
                      훈련사 관리
                    </NavItem>

                    <NavItem
                      href="/course-approvals"
                      icon={<CheckSquare className="w-5 h-5 mr-2" />}
                      active={isActive("/course-approvals")}
                      onClick={handleItemClick}
                      show={true}
                    >
                      과정 승인
                    </NavItem>

                    <NavItem
                      href="/institute-settings"
                      icon={<Wrench className="w-5 h-5 mr-2" />}
                      active={isActive("/institute-settings")}
                      onClick={handleItemClick}
                      show={true}
                    >
                      기관 설정
                    </NavItem>
                  </>
                )}

                {/* Admin Menu Group - only for admins */}
                {(userRole === 'admin' || userRole === 'super-admin') && expanded ? (
                  <div
                    className="px-3 py-2 mt-6 flex items-center justify-between cursor-pointer"
                    onClick={() => toggleMenuGroup('admin')}
                  >
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      관리자
                    </h3>
                    {menuGroups.admin ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                  </div>
                ) : (userRole === 'admin' || userRole === 'super-admin') ? (
                  <div className="flex justify-center py-2 mt-6">
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  </div>
                ) : null}

                {menuGroups.admin && (userRole === 'admin' || userRole === 'super-admin') && (
                  <>
                    <NavItem
                      href="/admin/users"
                      icon={<Users className="w-5 h-5 mr-2" />}
                      active={isActive("/admin/users")}
                      onClick={handleItemClick}
                      show={true}
                    >
                      사용자 관리
                    </NavItem>

                    <NavItem
                      href="/admin/content"
                      icon={<VideoIcon className="w-5 h-5 mr-2" />}
                      active={isActive("/admin/content")}
                      onClick={handleItemClick}
                      show={true}
                    >
                      콘텐츠 관리
                    </NavItem>

                    <NavItem
                      href="/admin/institutes"
                      icon={<Building className="w-5 h-5 mr-2" />}
                      active={isActive("/admin/institutes")}
                      onClick={handleItemClick}
                      show={true}
                    >
                      기관 관리
                    </NavItem>

                    <NavItem
                      href="/admin/commissions"
                      icon={<PercentIcon className="w-5 h-5 mr-2" />}
                      active={isActive("/admin/commissions") || isActive("/admin/product-pricing") || isActive("/admin/settlements")}
                      onClick={handleItemClick}
                      show={true}
                    >
                      가격 관리
                    </NavItem>

                    <NavItem
                      href="/admin/content-moderation"
                      icon={<Shield className="w-5 h-5 mr-2" />}
                      active={isActive("/admin/content-moderation")}
                      onClick={handleItemClick}
                      show={true}
                    >
                      콘텐츠 검열
                    </NavItem>

                    <NavItem
                      href="/admin/settings"
                      icon={<Cog className="w-5 h-5 mr-2" />}
                      active={isActive("/admin/settings")}
                      onClick={handleItemClick}
                      show={true}
                    >
                      시스템 설정
                    </NavItem>

                    <NavItem
                      href="/admin/audit-logs"
                      icon={<FileText className="w-5 h-5 mr-2" />}
                      active={isActive("/admin/audit-logs")}
                      onClick={handleItemClick}
                      show={true}
                    >
                      감사 로그
                    </NavItem>
                  </>
                )}

                {/* 도움말 헤더 - 그룹 헤더 스타일 */}
                {expanded && (
                  <div className="px-3 py-2 mt-6">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      도움말
                    </h3>
                  </div>
                )}

                {/* 도움말 메뉴 항목들 - 첨부 이미지처럼 구현 */}
                <NavItem
                  href="/help/faq"
                  icon={<HelpCircle className="w-5 h-5 mr-2" />}
                  active={isActive("/help/faq")}
                  onClick={handleItemClick}
                  show={true}
                >
                  자주 묻는 질문
                </NavItem>

                <NavItem
                  href="/help/guide"
                  icon={<BookOpen className="w-5 h-5 mr-2" />}
                  active={isActive("/help/guide")}
                  onClick={handleItemClick}
                  show={true}
                >
                  이용 가이드
                </NavItem>

                <NavItem
                  href="/help/about"
                  icon={<Users className="w-5 h-5 mr-2" />}
                  active={isActive("/help/about")}
                  onClick={handleItemClick}
                  show={true}
                >
                  소개
                </NavItem>

                <NavItem
                  href="/help/contact"
                  icon={<MessageSquare className="w-5 h-5 mr-2" />}
                  active={isActive("/help/contact")}
                  onClick={handleItemClick}
                  show={true}
                >
                  문의하기
                </NavItem>

                {/* Service Statistics with Toggle using StatisticsSection component */}
                <StatisticsSection expanded={expanded} />
              </>
            ) : (
              // Non-authenticated user menu
              <>
                <NavItem
                  href="/"
                  icon={<Home className="w-5 h-5 mr-2" />}
                  active={isActive("/")}
                  onClick={handleItemClick}
                  show={true}
                >
                  홈
                </NavItem>

                <NavItem
                  href="/courses"
                  icon={<GraduationCap className="w-5 h-5 mr-2" />}
                  active={isActive("/courses")}
                  onClick={handleItemClick}
                  show={true}
                >
                  강의
                </NavItem>

                <NavItem
                  href="/trainers"
                  icon={<UserRoundCheck className="w-5 h-5 mr-2" />}
                  active={isActive("/trainers")}
                  onClick={handleItemClick}
                  show={true}
                >
                  훈련사 찾기
                </NavItem>

                <NavItem
                  href="/institutes"
                  icon={<Building className="w-5 h-5 mr-2" />}
                  active={isActive("/institutes")}
                  onClick={handleItemClick}
                  show={true}
                >
                  교육기관
                </NavItem>

                {/* Shop Link for non-authenticated users */}
                <Link href="/shop" target="_blank">
                  <a
                    className={cn(
                      "flex items-center px-4 py-2 rounded-md text-xs font-medium transition-colors",
                      isActive("/shop")
                        ? "bg-primary/10 text-primary"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                    )}
                    onClick={() => handleItemClick("/shop")}
                  >
                    <ShoppingBag className="w-5 h-5 mr-2" />
                    <span>쇼핑</span>
                  </a>
                </Link>

                <NavItem
                  href="/auth/login"
                  icon={<LogIn className="w-5 h-5 mr-2" />}
                  active={isActive("/auth/login")}
                  onClick={handleItemClick}
                  show={true}
                >
                  로그인
                </NavItem>

                {/* Help section for non-authenticated users */}
                <HelpSection 
                  expanded={expanded}
                  handleItemClick={handleItemClick}
                />
              </>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}