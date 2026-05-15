import { Switch, Route, useLocation } from "wouter";
import { RedirectHandler } from './components/RedirectHandler';
import React, { ReactNode, useState, useEffect, lazy, Suspense } from "react";
import { SimpleChatBot } from './components/ui/SimpleChatBot';
import { OnboardingModal } from './components/OnboardingModal';
import { UserPreferencesProvider } from './hooks/use-user-preferences';
import { useGlobalShortcuts } from './hooks/use-keyboard-shortcuts';
import { NotificationsProvider } from './components/NotificationsProvider';
import { NotificationPermissionPopup } from './components/NotificationPermissionPopup';
import { AchievementsProvider } from './hooks/useAchievements';
import { useKeyboardAccessibility } from '@/hooks/use-keyboard-accessibility';
import { startCacheCleanup } from './utils/performance-optimizer';

// 페이지 컴포넌트 임포트
import Intro from "./pages/Intro";
import Home from "./pages/Home";
import Dashboard from "@/pages/dashboard/index";
import Courses from "@/pages/courses/index";
import FAQPage from "@/pages/help/faq";
import CourseDetail from "@/pages/course-detail";
import Trainers from "@/pages/trainers/index";
import Institutes from "@/pages/institutes";
import Community from "@/pages/community/CommunityFixed";
import CommunityPostDetail from "@/pages/community/post/[id]";
import MyCourses from "@/pages/my-courses";
import MyPets from "@/pages/my-pets";
import LostReportsPage from "@/pages/my-pets/lost-reports";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import PasswordResetPage from "@/pages/auth/PasswordResetPage";
import NotFound from "@/pages/not-found";
import VideoTrainingPage from "@/pages/VideoTraining";
import Certificates from "@/pages/Certificates";
import LocationsPage from "./pages/locations";
import PetEventsMapPage from "./pages/pet-events-map";
const VideoCallPage = lazy(() => import("./pages/video-call"));
import MessagesPage from "./pages/messages";
import ChatbotPage from "./pages/chatbot";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Refund from "./pages/Refund";
import CertifiedPartner from "./pages/CertifiedPartner";
import AdminMenuConfigPage from "./pages/admin/menu-config";
import CustomerOrderPage from "./pages/customer/order";
import AdminStoreOrdersPage from "./pages/admin/store-orders";
import AdminStoreMenuPage from "./pages/admin/store-menu";
import AdminPetEventsPage from "./pages/admin/AdminPetEvents";
import EventsPage from "./pages/events";
import EventDetailPage from "./pages/events/event-detail";
import EventCalendarPage from "./pages/events/calendar";
import AnalyticsPage from "./pages/analytics";
import EducationSchedulePage from "./pages/education-schedule";
import SubscriptionsPage from "./pages/subscriptions";
import SearchPage from "./pages/search";
import AiAnalysisPage from "./pages/ai-analysis";
import TalezExperiencePage from "./pages/TalezExperience";
import CurriculumManager from "./pages/courses/CurriculumManager";
import AdminCurriculum from "./pages/admin/AdminCurriculum";
import AdminRegistrations from "./pages/admin/AdminRegistrations";
import TrainerRegistration from "./pages/registration/TrainerRegistration";
import InstituteRegistration from "./pages/registration/InstituteRegistration";
import PaymentSuccess from "./pages/payment-success";
import PaymentFailed from "./pages/payment-failed";

// 관리자 페이지 직접 import
import AdminHome from "./pages/admin/AdminHome";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminInstitutes from "./pages/admin/AdminInstitutes";
import AdminTrainers from "./pages/admin/AdminTrainers";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminMenuManagement from "./pages/admin/menu-management";
import AdminApprovals from './pages/admin/AdminApprovals';
import PaymentIntegration from './pages/admin/PaymentIntegration';
import AdminReports from './pages/admin/AdminReports';
import NotebookMonitorPage from "./pages/admin/notebook-monitor";
import AdminShop from './pages/admin/AdminShop';
import AdminSettings from './pages/admin/AdminSettings';
import LocationManagement from './pages/admin/LocationManagement';
import SpringBootTestPage from "./pages/SpringBootTest";
import AdminContents from "./pages/admin/AdminContents";
import AdminMembersStatus from "./pages/admin/AdminMembersStatus";
import TrainerCertificationManagement from "./pages/admin/TrainerCertificationManagement";
import MessagingSettings from "./pages/admin/MessagingSettings";
import PushNotificationManagement from "./pages/admin/PushNotificationManagement";
import AdminEmailNotifications from "./pages/admin/AdminEmailNotifications";
import AdminProductPricing from "./pages/admin/AdminProductPricing";
import AdminSettlementPage from "./pages/admin/settlement";
import ContentCrawler from "./pages/admin/ContentCrawler";
import AdminCommunityManagement from "./pages/admin/AdminCommunityManagement";
import InstituteNotebookMonitorPage from "./pages/institute-admin/NotebookMonitor";
import TrainerActivityLogs from "./pages/admin/TrainerActivityLogs";
import PointManagement from "./pages/admin/PointManagement";
import TrainerMyPoints from "./pages/trainer/MyPoints";
import InstituteMyPoints from "./pages/institute/MyPoints";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import TrainerRestManagement from "./pages/trainer/RestManagement";
import InstituteRestManagement from "./pages/institute/RestManagement";
import SubstituteClassBoard from "./pages/trainer/SubstituteClassBoard";
import SubstituteTrainerManagement from "./pages/institute/SubstituteTrainerManagement";
import SubstituteTrainerOverview from "./pages/admin/SubstituteTrainerOverview";
import AdminContentModeration from "./pages/admin/AdminContentModeration";
import ContentModerationTest from "./pages/admin/ContentModerationTest";
import ApiManagement from "./pages/admin/ApiManagement";
import AIApiManagement from "./pages/admin/AIApiManagement";
import AIOptimizationDashboard from "./pages/admin/AIOptimizationDashboard";
import MenuVisibilityControl from "./pages/admin/MenuVisibilityControl";
import NavigationProgress from "./components/NavigationProgress";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { SimpleLoading, SimpleLoadingInline } from "./components/ui/simple-loading";
import { SplashScreen, useSplashScreen, PageLoadingProvider } from "./components/SplashScreen";
import { WeatherProvider, useWeather } from "./contexts/WeatherContext";
import { WeatherEffects } from "./components/WeatherEffects";

// 레이아웃 및 컴포넌트 임포트
import { TopBar } from "@/components/TopBar";
import { Sidebar } from "@/components/Sidebar";
import { Toaster } from "@/components/ui/toaster";
import { IdleLogoutWarning } from "@/components/IdleLogoutWarning";
import Footer from "@/components/Footer";

import { ThemeManager } from "@/components/ThemeManager";
import { AccessibilityFloatingButton } from "@/components/ui/AccessibilityControls";
import { DogLoading, FullScreenLoading } from "@/components/DogLoading";
import { SkipToContent } from "@/components/ui/skip-to-content";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import { AIAssistant } from "@/components/ui/AIAssistant";
import { ThemeProvider } from "@/context/theme-context";

// 인증 관련 임포트 - 호환성 레이어 사용
import { useAuth, USER_ROLES, type UserRole, type AuthState, UserRoleEnum } from "@/lib/auth-compat";

// 로딩 시스템 임포트
import { usePageLoadingDetector } from "@/hooks/use-route-loading";
import { 
  RouteLoadingBar, 
  RouteLoadingMessage, 
  CourseSkeleton, 
  DashboardSkeleton, 
  TrainerSkeleton 
} from "@/components/ui/RouteLoadingBar";

// 역호환성 유지를 위한 re-export
// 다른 파일에서 SimpleApp에서 useAuth를 import하는 경우 호환성 유지
export { useAuth, USER_ROLES, UserRoleEnum };
// 타입 re-export
export type { AuthState, UserRole };

/**
 * 특수 메시지 리스너 컴포넌트
 * 특수한 네비게이션 이벤트를 처리하는 역할만 담당
 */
function NavigationMessageListener({ children }: { children: ReactNode }) {
  useEffect(() => {
    // 허용된 origin 목록 (보안: 신뢰할 수 있는 도메인만)
    const trustedOrigins = [
      window.location.origin,
      'https://talez.com',
      'https://www.talez.com'
    ];
    
    // 쇼핑 페이지 이동 등 특수 메시지 이벤트 리스너
    const handleSpecialNavigation = (event: MessageEvent) => {
      try {
        // 보안: origin 검증 (신뢰할 수 있는 출처만 허용)
        if (!trustedOrigins.includes(event.origin) && event.origin !== '') {
          console.warn("[Navigation] 신뢰할 수 없는 origin에서의 메시지 무시:", event.origin);
          return;
        }
        
        const message = event.data;

        // 메시지 형식 검증
        if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
          return;
        }

        console.log("[Navigation] 메시지 수신:", message.type);

        switch (message.type) {
          case 'NAVIGATE_TO_SHOP':
            console.log("[Navigation] 쇼핑 페이지로 이동 요청 수신");
            window.location.href = '/shop';
            break;

          case 'NAVIGATE_TO_HOME':
            console.log("[Navigation] 홈으로 이동 요청 수신");
            window.location.href = '/';
            break;
        }
      } catch (error) {
        console.error("[Navigation] 메시지 처리 중 오류 발생:", error);
      }
    };

    // 이벤트 리스너 등록
    window.addEventListener('message', handleSpecialNavigation);

    // 정리 함수
    return () => {
      window.removeEventListener('message', handleSpecialNavigation);
    };
  }, []);

  return <>{children}</>;
}

/**
 * 응용 프로그램 레이아웃 컴포넌트
 */
function AppLayout({ children }: { children: ReactNode }) {
  // localStorage에서 사이드바 상태 불러오기
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    // localStorage에서 저장된 사이드바 확장 상태 가져오기
    const savedState = localStorage.getItem('sidebarExpanded');
    if (savedState !== null) {
      return savedState === 'true';
    }
    // 기본값은 확장된 상태 (데스크톱에서)
    return true;
  });
  const auth = useAuth();

  // 인증 상태가 변경될 때마다 윈도우 객체에 저장된 상태를 확인하고 동기화
  useEffect(() => {
    if (window.__peteduAuthState && window.__peteduAuthState.isAuthenticated) {
      // 전역 상태가 있고 인증되었는데 로컬 상태와 다르다면 동기화
      if (!auth.isAuthenticated || auth.userRole !== window.__peteduAuthState.userRole) {
        console.log("인증 상태 불일치 감지 - 전역:", window.__peteduAuthState, "로컬:", auth);
        // 인증 이벤트를 발생시켜 상태 동기화
        const loginEvent = new CustomEvent('login', {
          detail: {
            userRole: window.__peteduAuthState.userRole,
            userName: window.__peteduAuthState.userName
          }
        });
        window.dispatchEvent(loginEvent);
      }
    }
  }, [auth.isAuthenticated, auth.userRole, auth.userName]);

  // 사이드바 크기 토글 핸들러
  const toggleSidebarSize = () => {
    const newState = !sidebarExpanded;
    setSidebarExpanded(newState);

    // 사이드바 상태를 localStorage에 저장
    try {
      localStorage.setItem('sidebarExpanded', String(newState));
      console.log('사이드바 확장 상태 저장:', newState);
    } catch (e) {
      console.error('사이드바 상태 저장 오류:', e);
    }
  };

  // 화면 크기 변경 감지
  useEffect(() => {
    function handleResize() {
      setIsDesktop(window.innerWidth >= 1024);
    }

    // 초기 실행
    handleResize();

    // 이벤트 리스너 등록
    window.addEventListener('resize', handleResize);

    // 클린업
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 키보드 접근성 설정 (전역 단축키)
  useKeyboardAccessibility([
    // 홈 페이지로 이동
    { 
      key: 'h', 
      altKey: true, 
      handler: () => window.location.href = '/' 
    },
    // 사이드바 토글
    { 
      key: 'b', 
      altKey: true, 
      handler: () => isDesktop ? toggleSidebarSize() : setSidebarOpen(!sidebarOpen) 
    },
    // 도움말 표시
    { 
      key: '/', 
      handler: () => {
        alert(`키보드 단축키:
- Alt+H: 홈 페이지로 이동
- Alt+B: 사이드바 토글
- ESC: 모달 닫기
- /: 도움말 표시`);
      } 
    }
  ], true);

  return (
    <ErrorBoundary>
      <PageLoadingProvider>
      <div className="bg-background text-foreground min-h-screen font-sans flex flex-col">
        {/* 접근성 개선: 콘텐츠로 건너뛰기 링크 */}
        <SkipToContent contentId="main-content" />

        <div className="flex flex-grow">
          {/* 사이드바 - 항상 고정된 너비를 가짐 */}
          <aside 
            className={`
              shrink-0 h-screen fixed left-0 top-0 z-30
              transition-all duration-300
              ${sidebarExpanded ? 'w-64' : 'w-[70px]'}
              ${sidebarOpen || isDesktop ? 'translate-x-0' : '-translate-x-full'}
            `}
            aria-label="사이드바 메뉴"
          >
            <Sidebar 
              open={sidebarOpen} 
              onClose={() => setSidebarOpen(false)} 
              userRole={auth.userRole} 
              isAuthenticated={auth.isAuthenticated}
              expanded={sidebarExpanded}
              onToggleExpand={toggleSidebarSize}
            />
            {/* 디버그 정보 표시 - 개발 모드에서만 표시 */}
            {process.env.NODE_ENV === 'development' && (
              <div className="fixed bottom-4 right-4 p-2 bg-card border border-border text-card-foreground text-xs rounded z-50">
                역할: {auth.userRole || '미로그인'} / 
                인증: {auth.isAuthenticated ? 'true' : 'false'}
              </div>
            )}
          </aside>

          {/* 모바일 오버레이 - 사이드바가 열리면 본문 위에 표시 */}
          {sidebarOpen && !isDesktop && (
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20" 
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* 우측 컨텐츠 영역 (헤더 + 메인) */}
          <div className={`
            flex-grow flex flex-col min-h-screen transition-all duration-300 w-full
            ${isDesktop ? (sidebarExpanded ? 'ml-64' : 'ml-[70px]') : 'ml-0'}
          `}>
            {/* 상단바 */}
            <TopBar
              sidebarOpen={sidebarOpen}
              onToggleSidebar={isDesktop ? toggleSidebarSize : () => setSidebarOpen(!sidebarOpen)}
            />

            {/* 메인 컨텐츠 영역 */}
            <main id="main-content" className="flex-grow pb-16 lg:pb-0" tabIndex={-1}>
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </main>

            {/* Footer */}
            <Footer />
          </div>
        </div>

        {/* AI 챗봇 */}
        <SimpleChatBot />

        {/* 모바일 하단 네비게이션 */}
        <MobileBottomNav />

        {/* 온보딩 모달 - 로그인 후 첫 방문 시에만 표시 */}
        <OnboardingModal isAuthenticated={auth.isAuthenticated} />
      </div>
      </PageLoadingProvider>
    </ErrorBoundary>
  );
}

/**
 * 로그인 필요 경로 보호 컴포넌트
 */
function ProtectedRoute({ component: Component, requiredRoles = null, fallback = <div className="p-8 text-center">접근 권한이 없습니다</div> }: {
  component: React.ComponentType<any>;
  requiredRoles?: Array<UserRole> | null;
  fallback?: React.ReactNode;
}) {
  const { isAuthenticated, userRole, isLoading } = useAuth();

  // 로딩 중일 때는 로딩 표시
  if (isLoading) {
    return <FullScreenLoading message="인증 정보 확인 중..." />;
  }

  // 로그인 여부 체크
  if (!isAuthenticated) {
    // 접근 제한 메시지와 함께 로그인 페이지로 리다이렉션
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[50vh]">
        <div className="mb-4 text-amber-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2">로그인이 필요한 페이지입니다</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">이 기능을 사용하려면 로그인이 필요합니다.</p>
        <button
          onClick={() => window.location.href = '/auth'}
          className="bg-primary hover:bg-primary/90 text-white py-2 px-6 rounded-md transition-colors"
        >
          로그인 페이지로 이동
        </button>
      </div>
    );
  }

  // 권한 검증 (requiredRoles이 null이면 로그인만 되어 있으면 됨)
  if (requiredRoles && userRole && !requiredRoles.includes(userRole as UserRole)) {
    return <>{fallback}</>;
  }

  return <Component />;
}

/**
 * 훈련사 전용 경로에 대한 권한 검증 컴포넌트
 */
function ProtectedTrainerRoute({ component: Component, fallback = <div className="p-8 text-center">접근 권한이 없습니다</div> }: {
  component: React.ComponentType<any>;
  fallback?: React.ReactNode;
}) {
  return (
    <ProtectedRoute 
      component={Component} 
      requiredRoles={['trainer', 'admin']} 
      fallback={fallback}
    />
  );
}

/**
 * 기관 관리자 전용 경로 보호 컴포넌트
 */
function ProtectedInstituteRoute({ component: Component, fallback = <div className="p-8 text-center">접근 권한이 없습니다</div> }: {
  component: React.ComponentType<any>;
  fallback?: React.ReactNode;
}) {
  return (
    <ProtectedRoute 
      component={Component} 
      requiredRoles={['institute-admin', 'admin']} 
      fallback={fallback}
    />
  );
}

/**
 * 관리자 전용 경로 보호 컴포넌트
 */
function ProtectedAdminRoute({ component: Component, fallback = <div className="p-8 text-center">접근 권한이 없습니다</div> }: {
  component: React.ComponentType<any>;
  fallback?: React.ReactNode;
}) {
  return (
    <ProtectedRoute 
      component={Component} 
      requiredRoles={['admin']} 
      fallback={fallback}
    />
  );
}

/**
 * 인증된 사용자를 위한 라우트
 */
function AuthenticatedRoutes() {
  const { userRole } = useAuth();

  // 역할에 따라 홈 컴포넌트 다르게 처리
  const getHomeComponent = () => {
    switch(userRole) {
      case 'pet-owner':
        return <Dashboard />;
      case 'trainer':
        const TrainerHome = lazy(() => import('./pages/trainer/TrainerHome'));
        return <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div></div>}>
          <TrainerHome />
        </Suspense>;
      case 'institute-admin':
        const InstituteAdminHome = lazy(() => import('./pages/institute-admin/InstituteAdminHome'));
        return <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div></div>}>
          <InstituteAdminHome />
        </Suspense>;
      case 'admin':
        // 관리자는 관리자 대시보드로 리디렉션
        const AdminHome = lazy(() => import('./pages/admin/AdminHome'));
        return <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div></div>}>
          <AdminHome />
        </Suspense>;
      default:
        return <Home />;
    }
  };

  return (
    <AppLayout>
      <Switch>
        {/* 역할별 메인 페이지 */}
        <Route path="/">
          {getHomeComponent()}
        </Route>

        {/* 대시보드 */}
        <Route path="/dashboard">
          {() => <Dashboard />}
        </Route>
        <Route path="/trainer/dashboard">
          {() => <ProtectedTrainerRoute component={() => <Dashboard type="trainer" />} />}
        </Route>
        <Route path="/trainer">
          {() => {
            const TrainerHomePage = lazy(() => import('./pages/trainer/TrainerHome'));
            return (
              <ProtectedTrainerRoute component={() => (
                <Suspense fallback={<SimpleLoading />}>
                  <TrainerHomePage />
                </Suspense>
              )} />
            );
          }}
        </Route>
        <Route path="/institute/dashboard">
          {() => {
            const InstituteDashboard = lazy(() => import('./pages/institute-admin/InstituteDashboard'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <InstituteDashboard />
              </Suspense>
            );
          }}
        </Route>

        {/* 일반 메뉴 */}
        <Route path="/courses" component={() => <Courses />} />
        <Route path="/course/:id" component={CourseDetail} />
        <Route path="/trainers" component={Trainers} />
        <Route path="/institutes" component={Institutes} />
        <Route path="/community" component={Community} />
        <Route path="/community/create" component={() => {
          const CreatePost = lazy(() => import('./pages/community/create'));
          return (
            <Suspense fallback={<SimpleLoading />}>
              <CreatePost />
            </Suspense>
          );
        }} />
        <Route path="/community/post/:id" component={CommunityPostDetail} />
        <Route path="/events" component={EventsPage} />
        <Route path="/events/calendar" component={EventCalendarPage} />
        <Route path="/events/:id" component={EventDetailPage} />
        <Route path="/my-courses" component={MyCourses} />
        <Route path="/my-courses/:id/progress">
          {() => {
            const CourseProgressPage = lazy(() => import('./pages/courses/Progress'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <CourseProgressPage />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/my-courses/:id/certificate">
          {() => {
            const CertificatePage = lazy(() => import('./pages/courses/Certificate'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <CertificatePage />
              </Suspense>
            );
          }}
        </Route>

        {/* 수료증 진위 확인 (공개, 인증 사용자도 접근 가능) */}
        <Route path="/verify">
          {() => {
            const VerifyPage = lazy(() => import('./pages/verify/Certificate'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <VerifyPage />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/verify/:certificateNo">
          {() => {
            const VerifyPage = lazy(() => import('./pages/verify/Certificate'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <VerifyPage />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/verify/pet/scan">
          {() => {
            const Page = lazy(() => import('./pages/verify/pet-scan'));
            return (<Suspense fallback={<SimpleLoading />}><Page /></Suspense>);
          }}
        </Route>
        <Route path="/verify/pet/:token">
          {() => {
            const Page = lazy(() => import('./pages/verify/pet-result'));
            return (<Suspense fallback={<SimpleLoading />}><Page /></Suspense>);
          }}
        </Route>
        <Route path="/trainer/attendance">
          {() => {
            const TrainerAttendance = lazy(() => import('./pages/trainer/Attendance'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedTrainerRoute component={TrainerAttendance} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/admin/attendance-stats">
          {() => {
            const AttendanceStats = lazy(() => import('./pages/admin/AttendanceStats'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedAdminRoute component={AttendanceStats} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/my-pets/lost-reports" component={() => <ProtectedRoute component={LostReportsPage} />} />
        <Route path="/my-pets" component={MyPets} />
        <Route path="/pet-events-map" component={PetEventsMapPage} />

        <Route path="/certificates" component={() => <ProtectedRoute component={Certificates} />} />
        <Route path="/payment-success" component={PaymentSuccess} />
        <Route path="/payment-failed" component={PaymentFailed} />
        <Route path="/video-training" component={VideoTrainingPage} />
        <Route path="/video-call">
          <ErrorBoundary name="영상통화">
            <Suspense fallback={<SimpleLoading />}>
              <VideoCallPage />
            </Suspense>
          </ErrorBoundary>
        </Route>
        <Route path="/chatbot" component={ChatbotPage} />
        {/* 쇼핑몰 메인 */}
        <Route path="/shop">
          {() => {
            console.log("인증된 사용자 /shop 경로 접근");
            // ShopIndex 컴포넌트를 동적으로 임포트
            const ShopIndex = lazy(() => import('./pages/shop/index'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ShopIndex />
              </Suspense>
            );
          }}
        </Route>

        {/* 상품 상세 페이지 */}
        <Route path="/shop/product/:id">
          {() => {
            console.log("상품 상세 페이지 접근");
            const ProductDetail = lazy(() => import('./pages/shop/product-detail'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProductDetail />
              </Suspense>
            );
          }}
        </Route>

        {/* 장바구니 페이지 */}
        <Route path="/shop/cart">
          {() => {
            console.log("장바구니 페이지 접근");
            const Cart = lazy(() => import('./pages/shop/cart'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <Cart />
              </Suspense>
            );
          }}
        </Route>

        {/* 결제 페이지 */}
        <Route path="/shop/checkout">
          {() => {
            console.log("결제 페이지 접근");
            const Checkout = lazy(() => import('./pages/shop/checkout'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <Checkout />
              </Suspense>
            );
          }}
        </Route>

        {/* 주문 완료 페이지 */}
        <Route path="/shop/order-complete">
          {() => {
            console.log("주문 완료 페이지 접근");
            const OrderComplete = lazy(() => import('./pages/shop/order-complete'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <OrderComplete />
              </Suspense>
            );
          }}
        </Route>

        {/* 주문 내역 페이지 */}
        <Route path="/shop/order-history">
          {() => {
            console.log("주문 내역 페이지 접근");
            const OrderHistory = lazy(() => import('./pages/shop/order-history'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <OrderHistory />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/notifications">
          {() => {
            const NotificationCenterPage = lazy(() => import('./pages/notifications'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                <SimpleLoadingInline size="sm" />
              </div>}>
                <ProtectedRoute component={NotificationCenterPage} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/alerts">
          {() => <RedirectHandler to="/notifications" />}
        </Route>
        <Route path="/locations">
          {() => {
            console.log("위치 서비스 페이지 접근");
            const Locations = lazy(() => import('./pages/location'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                <SimpleLoadingInline size="sm" />
              </div>}>
                <Locations />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/recommendations">
          {() => (
            <ProtectedRoute 
              component={() => <div className="p-8"><h1 className="text-2xl font-bold mb-4">맞춤 추천</h1><p>반려견 프로필과 사용자 선호도 기반 맞춤형 추천 서비스 페이지입니다.</p></div>}
            />
          )}
        </Route>
        <Route path="/messages">
          {() => (
            <ProtectedRoute 
              component={MessagesPage}
            />
          )}
        </Route>


        {/* 나의 학습 메뉴 서브 페이지들 */}
        <Route path="/my-trainers">
          {() => (
            <ProtectedRoute 
              component={() => <div className="container p-6"><h1 className="text-2xl font-bold mb-4">담당 훈련사</h1><p>현재 나의 반려견을 담당하고 있는 훈련사 목록과 연락 정보를 확인할 수 있습니다.</p></div>}
            />
          )}
        </Route>


        {/* 훈련사 메뉴 - 권한 검증 적용 */}
        <Route path="/trainer/courses">
          {() => {
            const CourseManagement = lazy(() => import('./pages/trainer/courses'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedTrainerRoute component={CourseManagement} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/trainer/referrals">
          {() => {
            const ReferralManagement = lazy(() => import('./pages/referral/ReferralCodeManagement'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedTrainerRoute component={ReferralManagement} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/trainer/students">
          {() => {
            const StudentManagement = lazy(() => import('./pages/trainer/students'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedTrainerRoute component={StudentManagement} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/trainer/stats">
          {() => {
            const TrainerStats = lazy(() => import('./pages/trainer/stats'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedTrainerRoute component={TrainerStats} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/trainer/classes">
          {() => {
            const TrainerClasses = lazy(() => import('./pages/trainer/classes'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedTrainerRoute component={TrainerClasses} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/trainer/earnings">
          {() => {
            const TrainerEarnings = lazy(() => import('./pages/trainer/earnings'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedTrainerRoute component={TrainerEarnings} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/trainer/settlements">
          {() => {
            const TrainerSettlements = lazy(() => import('./pages/trainer/settlements'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedTrainerRoute component={TrainerSettlements} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/trainer/reviews">
          {() => {
            const TrainerReviews = lazy(() => import('./pages/trainer/reviews'));
            return (
              <Suspense fallback={
                <div className="p-8 flex justify-center items-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              }>
                <ProtectedTrainerRoute component={TrainerReviews} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/reviews/write">
          {() => {
            const WriteReview = lazy(() => import('./pages/reviews/write'));
            return (
              <Suspense fallback={
                <div className="p-8 flex justify-center items-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              }>
                <WriteReview />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/trainer/diary-overview">
          {() => {
            const TrainerDiaryOverview = lazy(() => import('./pages/trainer/diary-overview'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedTrainerRoute component={TrainerDiaryOverview} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/trainer/notebook">
          {() => {
            const NotebookPage = lazy(() => import('./pages/notebook'));
            return (
              <Suspense fallback={
                <div className="p-8 flex justify-center items-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              }>
                <ProtectedTrainerRoute component={NotebookPage} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/trainer/badges">
          {() => {
            const TrainerBadgesPage = lazy(() => import('./pages/trainer/badges'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedTrainerRoute component={TrainerBadgesPage} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/trainer/notebook/templates">
          {() => {
            const TemplatesPage = lazy(() => import('./pages/trainer/notebook/templates'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedTrainerRoute component={TemplatesPage} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/institute/qr-codes">
          {() => {
            const QrCodeManagement = lazy(() => import('./pages/institute/qr-checkin/QrCodeManagement'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedRoute component={QrCodeManagement} requiredRoles={['institute-admin', 'admin']} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/institute/visit-sessions">
          {() => {
            const VisitSessionManager = lazy(() => import('./pages/institute/qr-checkin/VisitSessionManager'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedRoute component={VisitSessionManager} requiredRoles={['institute-admin', 'admin', 'trainer']} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/institute/zone-management">
          {() => {
            const ZoneManagement = lazy(() => import('./pages/institute/qr-checkin/ZoneManagement'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedRoute component={ZoneManagement} requiredRoles={['institute-admin', 'admin']} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/institute/checkin-dashboard">
          {() => {
            const CheckinDashboard = lazy(() => import('./pages/institute/qr-checkin/CheckinDashboard'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedRoute component={CheckinDashboard} requiredRoles={['trainer', 'institute-admin', 'admin']} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/institute/customer-history/:ownerId">
          {() => {
            const CustomerHistory = lazy(() => import('./pages/institute/qr-checkin/CustomerHistory'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedRoute component={CustomerHistory} requiredRoles={['trainer', 'institute-admin', 'admin']} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/institute/nose-enroll/:petId">
          {() => {
            const NoseEnrollment = lazy(() => import('./pages/institute/qr-checkin/NoseEnrollment'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedRoute component={NoseEnrollment} requiredRoles={['trainer', 'institute-admin', 'admin', 'pet-owner']} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/institute/nose-verify/:sessionToken">
          {() => {
            const NoseVerification = lazy(() => import('./pages/institute/qr-checkin/NoseVerification'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedRoute component={NoseVerification} requiredRoles={['trainer', 'institute-admin', 'admin', 'pet-owner']} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/institute/store-policies">
          {() => {
            const StorePolicyManagement = lazy(() => import('./pages/institute/operational-policies/StorePolicyManagement'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedRoute component={StorePolicyManagement} requiredRoles={['institute-admin', 'admin']} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/institute/consent-management">
          {() => {
            const ConsentManagement = lazy(() => import('./pages/institute/operational-policies/ConsentManagement'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedRoute component={ConsentManagement} requiredRoles={['pet-owner', 'institute-admin', 'admin']} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/institute/incident-protocols">
          {() => {
            const IncidentProtocols = lazy(() => import('./pages/institute/operational-policies/IncidentProtocols'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedRoute component={IncidentProtocols} requiredRoles={['trainer', 'institute-admin', 'admin']} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/emergency-info">
          {() => {
            const EmergencyInfoPage = lazy(() => import('./pages/institute/operational-policies/EmergencyInfoPage'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedRoute component={EmergencyInfoPage} requiredRoles={['pet-owner', 'admin']} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/consultation-records">
          {() => {
            const ConsultationRecords = lazy(() => import('./pages/consultation/ConsultationRecords'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedRoute component={ConsultationRecords} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/consultation-records/new">
          {() => {
            const ConsultationForm = lazy(() => import('./pages/consultation/ConsultationForm'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedRoute component={ConsultationForm} requiredRoles={['trainer', 'institute-admin', 'admin']} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/consultation-records/:id">
          {() => {
            const ConsultationDetail = lazy(() => import('./pages/consultation/ConsultationDetail'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedRoute component={ConsultationDetail} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/trainer/profile">
          {() => {
            const TrainerProfile = lazy(() => import('./pages/trainer/profile'));
            return (
              <Suspense fallback={
                <div className="p-8 flex justify-center items-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              }>
                <ProtectedTrainerRoute 
                  component={() => <TrainerProfile />} 
                />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/trainer/settings">
          {() => {
            const SettingsPage = lazy(() => import('./pages/settings'));
            return (
              <Suspense fallback={
                <div className="p-8 flex justify-center items-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              }>
                <ProtectedTrainerRoute 
                  component={() => <SettingsPage userRole="trainer" />} 
                />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/trainer/my-points">
          {() => (
            <Suspense fallback={<SimpleLoading />}>
              <ProtectedTrainerRoute component={TrainerMyPoints} />
            </Suspense>
          )}
        </Route>

        <Route path="/trainer/rest-management">
          {() => (
            <Suspense fallback={<SimpleLoading />}>
              <ProtectedTrainerRoute component={TrainerRestManagement} />
            </Suspense>
          )}
        </Route>

        <Route path="/trainer/email-certificates">
          {() => {
            const TrainerEmailCertificates = lazy(() => import('./pages/trainer/email-certificates'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedTrainerRoute component={TrainerEmailCertificates} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/trainer/substitute-board">
          {() => (
            <Suspense fallback={<SimpleLoading />}>
              <ProtectedTrainerRoute component={SubstituteClassBoard} />
            </Suspense>
          )}
        </Route>

        <Route path="/institute/profile">
          {() => {
            const ProfilePage = lazy(() => import('./pages/profile'));
            return (
              <Suspense fallback={
                <div className="p-8 flex justify-center items-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              }>
                <ProtectedInstituteRoute 
                  component={() => <ProfilePage userType="institute-admin" />} 
                />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/profile">
          {() => {
            const ProfilePage = lazy(() => import('./pages/profile'));
            return (
              <Suspense fallback={
                <div className="p-8 flex justify-center items-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              }>
                <ProtectedRoute 
                  component={() => <ProfilePage userType="user" />} 
                />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/invite">
          {() => {
            const FriendInvite = lazy(() => import('./pages/invite/FriendInvite'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedRoute component={FriendInvite} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/subscriptions">
          {() => {
            console.log("구독 관리 페이지 접근");
            return (
              <Suspense fallback={
                <div className="flex justify-center items-center h-screen">
                  <DogLoading message="구독 관리 로딩중" size="medium" showTips={true} />
                </div>
              }>
                <ProtectedRoute component={SubscriptionsPage} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/settings">
          {() => {
            const SettingsPage = lazy(() => import('./pages/settings'));
            return (
              <Suspense fallback={
                <div className="p-8 flex justify-center items-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              }>
                <ProtectedRoute 
                  component={() => <SettingsPage userRole="user" />} 
                />
              </Suspense>
            );
          }}
        </Route>

        {/* 중복 경로 제거: /trainer-earnings는 /trainer/earnings로 통합되었습니다 */}

        <Route path="/pet-care/health-diary">
          {() => {
            const HealthDiary = lazy(() => import('./pages/pet-care/health-diary'));
            return (
              <Suspense fallback={
                <div className="p-8 flex justify-center items-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              }>
                <ProtectedRoute component={HealthDiary} requiredRoles={['pet-owner', 'trainer', 'admin']} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/notebook">
          {() => {
            const Notebook = lazy(() => import('./pages/notebook'));
            return (
              <Suspense fallback={
                <div className="p-8 flex justify-center items-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              }>
                <ProtectedRoute component={Notebook} requiredRoles={['pet-owner', 'trainer', 'admin']} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/ai-chatbot">
          {() => {
            console.log("AI 챗봇 페이지 접근");
            const AIChatbot = lazy(() => import('./pages/ai-chatbot'));
            return (
              <Suspense fallback={
                <div className="p-8 flex justify-center items-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  <SimpleLoadingInline size="sm" />
                </div>
              }>
                <AIChatbot />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/ai-analysis">
          {() => {
            return (
              <ErrorBoundary name="AI 분석">
                <Suspense fallback={<PageSkeleton variant="detail" />}>
                  <ProtectedRoute component={AiAnalysisPage} requiredRoles={['pet-owner', 'trainer', 'admin']} />
                </Suspense>
              </ErrorBoundary>
            );
          }}
        </Route>

        <Route path="/dog-analysis">
          {() => {
            const DogAnalysisPage = lazy(() => import('./pages/dog-analysis'));
            return (
              <ErrorBoundary name="강아지 AI 분석">
                <Suspense fallback={<PageSkeleton variant="detail" />}>
                  <DogAnalysisPage />
                </Suspense>
              </ErrorBoundary>
            );
          }}
        </Route>

        <Route path="/trainer-referrals">
          {() => {
            const TrainerReferrals = lazy(() => import('./pages/trainer-referrals'));
            return (
              <Suspense fallback={
                <div className="p-8 flex justify-center items-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              }>
                <ProtectedTrainerRoute component={TrainerReferrals} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/shop">
          {() => (
            <Suspense fallback={
              <div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            }>
              <div className="hidden">
                {/* 새 창에서 열리는 쇼핑몰은 이 라우트에서 실제로 렌더링되지 않고 
                    사이드바에서 클릭 시 window.open()을 통해 새 창을 엽니다 */}
              </div>
            </Suspense>
          )}
        </Route>


        <Route path="/institute/pet-assignments">
          {() => {
            const InstitutePetAssignments = lazy(() => import('./pages/institute-admin/InstitutePetAssignments'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>}>
                <ProtectedInstituteRoute component={InstitutePetAssignments} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/institute/settings">
          {() => {
            const InstituteSettings = lazy(() => import('./pages/institute-admin/InstituteSettings'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>}>
                <ProtectedInstituteRoute component={InstituteSettings} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/institute/facility">
          {() => {
            const InstituteFacilityPage = lazy(() => import('./pages/institute/InstituteFacilityPage'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>}>
                <ProtectedInstituteRoute component={InstituteFacilityPage} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/institute/reports">
          {() => {
            const InstituteReportsPage = lazy(() => import('./pages/institute/InstituteReportsPage'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>}>
                <ProtectedInstituteRoute component={InstituteReportsPage} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/institute/substitute-management">
          {() => (
            <Suspense fallback={<SimpleLoading />}>
              <ProtectedInstituteRoute component={SubstituteTrainerManagement} />
            </Suspense>
          )}
        </Route>

        <Route path="/institute/notebook-monitor">
          {() => (
            <Suspense fallback={<SimpleLoading />}>
              <ProtectedInstituteRoute component={InstituteNotebookMonitorPage} />
            </Suspense>
          )}
        </Route>

        <Route path="/institute/trainers">
          {() => {
            const InstituteTrainersPage = lazy(() => import('./pages/institute/InstituteTrainersPage'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedInstituteRoute component={InstituteTrainersPage} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/institute/my-points">
          {() => (
            <Suspense fallback={<SimpleLoading />}>
              <ProtectedInstituteRoute component={InstituteMyPoints} />
            </Suspense>
          )}
        </Route>

        <Route path="/institute/rest-management">
          {() => (
            <Suspense fallback={<SimpleLoading />}>
              <ProtectedInstituteRoute component={InstituteRestManagement} />
            </Suspense>
          )}
        </Route>

        {/* 관리자 메뉴 */}
        <Route path="/admin/dashboard">
          {() => {
            const AdminDashboard = lazy(() => import('./pages/admin/AdminHome'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                <SimpleLoadingInline size="sm" />
              </div>}>
                <ProtectedAdminRoute component={AdminDashboard} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/admin/users">
          {() => {
            const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>}>
                <ProtectedAdminRoute component={AdminUsers} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/admin/institutes">
          {() => {
            const AdminInstitutes = lazy(() => import('./pages/admin/AdminInstitutes'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>}>
                <ProtectedAdminRoute component={AdminInstitutes} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/admin/trainers">
          {() => {
            const AdminTrainers = lazy(() => import('./pages/admin/AdminTrainers'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>}>
                <ProtectedAdminRoute component={AdminTrainers} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/admin/members-status">
          {() => {
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>}>
                <ProtectedAdminRoute component={AdminMembersStatus} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/admin/analytics">
          {() => {
            const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>}>
                <ProtectedAdminRoute component={AdminAnalytics} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/admin/live-streaming-metrics">
          {() => {
            const AdminLiveStreamingMetrics = lazy(() => import('./pages/admin/AdminLiveStreamingMetrics'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedAdminRoute component={AdminLiveStreamingMetrics} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/admin/revenue">
          {() => {
            const AdminRevenue = lazy(() => import('./pages/admin/AdminRevenue'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>}>
                <ProtectedAdminRoute component={AdminRevenue} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/admin/monetization">
          {() => {
            const AdminMonetization = lazy(() => import('./pages/admin/AdminMonetization'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>}>
                <ProtectedAdminRoute component={AdminMonetization} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/admin/curriculum">
          {() => {
            const AdminCurriculum = lazy(() => import('./pages/admin/AdminCurriculum'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>}>
                <ProtectedAdminRoute component={AdminCurriculum} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/admin/reports">
          {() => {
            const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>}>
                <ProtectedAdminRoute component={AdminReports} />
              </Suspense>
            );
          }}
        </Route>


        <Route path="/admin/reports/analytics">
          {() => {
            const AnalyticsReportPage = lazy(() => import('./pages/admin/reports/analytics'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>}>
                <ProtectedAdminRoute component={AnalyticsReportPage} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/admin/audit-logs">
          {() => {
            const AdminAuditLogs = lazy(() => import('./pages/admin/AdminAuditLogs'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedAdminRoute component={AdminAuditLogs} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/admin/approvals">
          {() => {
            const AdminApprovals = lazy(() => import('./pages/admin/AdminApprovals'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>}>
                <ProtectedAdminRoute component={AdminApprovals} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/admin/matching">
          {() => {
            const AdminMatching = lazy(() => import('./pages/admin/AdminMatching'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedAdminRoute component={AdminMatching} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/institute/trainer-approvals">
          {() => {
            const TrainerApprovals = lazy(() => import('./pages/institute/TrainerApprovals'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedRoute component={TrainerApprovals} allowedRoles={['institute-admin']} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/admin/info-correction-requests">
          {() => {
            const InfoCorrectionRequests = lazy(() => import('./pages/admin/InfoCorrectionRequests'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedAdminRoute component={InfoCorrectionRequests} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/admin/review-management">
          {() => {
            const ReviewManagement = lazy(() => import('./pages/admin/ReviewManagement'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedAdminRoute component={ReviewManagement} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/facilities">
          {() => {
            const FacilitiesPage = lazy(() => import('./pages/facilities'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>}>
                <FacilitiesPage />
              </Suspense>
            );
          }}
        </Route>




        {/* /admin/notifications를 /admin/alerts로 리디렉션 */}
        <Route path="/admin/notifications">
          {() => {
            console.log("관리자 알림 페이지 리디렉션: /admin/notifications → /admin/alerts");
            window.location.href = '/admin/alerts';
            return null;
          }}
        </Route>
        <Route path="/admin/alerts">
          {() => {
            const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                <span className="ml-2">관리자 알림딩 중...</span>
              </div>}>
                <ProtectedAdminRoute component={AdminNotifications} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/admin/notifications/send">
          {() => {
            const AdminSendNotification = lazy(() => import('./pages/admin/notifications/SendNotification'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                <span className="ml-2">알림 발송 페이지 로딩 중...</span>
              </div>}>
                <ProtectedAdminRoute component={AdminSendNotification} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/admin/settings">
          {() => {
            const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>}>
                <ProtectedAdminRoute component={AdminSettings} />
              </Suspense>
            );
          }}
        </Route>




        <Route path="/admin/facility">
          {() => {
            const AdminFacilityPage = lazy(() => import('./pages/institute/InstituteFacilityPage'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>}>
                <ProtectedAdminRoute component={AdminFacilityPage} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/admin/subscription-plans">
          {() => {
            const AdminSubscriptionPlans = lazy(() => import('./pages/admin/AdminSubscriptionPlans'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>}>
                <ProtectedAdminRoute component={AdminSubscriptionPlans} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/admin/shop">
          {() => {
            const AdminShop = lazy(() => import('./pages/admin/AdminShop'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>}>
                <ProtectedAdminRoute component={AdminShop} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/admin/payment-integration">
          {() => {
            const PaymentIntegration = lazy(() => import('./pages/admin/PaymentIntegration'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>}>
                <ProtectedAdminRoute component={PaymentIntegration} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/admin/commission">
          {() => {
            const AdminCommission = lazy(() => import('./pages/admin/AdminCommission'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>}>
                <ProtectedAdminRoute component={AdminCommission} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/admin/commission-settings">
          {() => {
            const CommissionSettings = lazy(() => import('./pages/admin/commission-settings'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>}>
                <ProtectedAdminRoute component={CommissionSettings} />
              </Suspense>
            );
          }}
        </Route>

        <Route path="/admin/banners">
          {() => {
            const AdminBanners = lazy(() => import('./pages/admin/AdminBanners'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>}>
                <ProtectedAdminRoute component={AdminBanners} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/admin/hospital-vaccine-codes">
          {() => {
            const AdminHospitalVaccineCodes = lazy(() => import('./pages/admin/AdminHospitalVaccineCodes'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>}>
                <ProtectedRoute component={AdminHospitalVaccineCodes} requiredRoles={['admin', 'hospital']} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/admin/contents">
          {() => {
            const AdminContents = lazy(() => import('./pages/admin/AdminContents'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>}>
                <ProtectedAdminRoute component={AdminContents} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/admin/menu-config">
          {() => (
            <ProtectedAdminRoute 
              component={AdminMenuConfigPage}
            />
          )}
        </Route>
        <Route path="/admin/menu-management">
          {() => {
            console.log("[DEBUG] admin/menu-management 라우트 접근");
            // 메뉴 관리 컴포넌트 lazy 로딩
            const MenuManagement = lazy(() => import('./pages/admin/menu-management'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>}>
                <ProtectedAdminRoute component={MenuManagement} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/admin/settlement">
          {() => (
            <ProtectedAdminRoute 
              component={AdminSettlementPage}
            />
          )}
        </Route>
        <Route path="/admin/trainer-settlements">
          {() => {
            const AdminTrainerSettlements = lazy(() => import('./pages/admin/trainer-settlements'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedAdminRoute component={AdminTrainerSettlements} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/admin/service-inspection">
          {() => {
            const ServiceInspection = lazy(() => import('./pages/admin/ServiceInspection'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>}>
                <ProtectedAdminRoute component={ServiceInspection} />
              </Suspense>
            );
          }}
        </Route>

        {/* 누락된 관리자 라우트 */}
        <Route path="/admin/registrations">
          {() => (
            <ProtectedAdminRoute component={AdminRegistrations} />
          )}
        </Route>
        <Route path="/admin/trainer-certification">
          {() => (
            <ProtectedAdminRoute component={TrainerCertificationManagement} />
          )}
        </Route>
        <Route path="/admin/business-registration">
          {() => {
            const BusinessRegistration = lazy(() => import('./pages/admin/BusinessRegistration'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProtectedAdminRoute component={BusinessRegistration} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/admin/community">
          {() => (
            <ProtectedAdminRoute component={AdminCommunityManagement} />
          )}
        </Route>
        <Route path="/admin/content-crawler">
          {() => (
            <ProtectedAdminRoute component={ContentCrawler} />
          )}
        </Route>
        <Route path="/admin/content-moderation">
          {() => (
            <ProtectedAdminRoute component={AdminContentModeration} />
          )}
        </Route>
        <Route path="/admin/points">
          {() => (
            <ProtectedAdminRoute component={PointManagement} />
          )}
        </Route>
        <Route path="/admin/api-management">
          {() => (
            <ProtectedAdminRoute component={ApiManagement} />
          )}
        </Route>
        <Route path="/admin/ai-api-management">
          {() => (
            <ProtectedAdminRoute component={AIApiManagement} />
          )}
        </Route>
        <Route path="/admin/ai-optimization">
          {() => (
            <ProtectedAdminRoute component={AIOptimizationDashboard} />
          )}
        </Route>
        <Route path="/admin/menu-visibility">
          {() => (
            <ProtectedAdminRoute component={MenuVisibilityControl} />
          )}
        </Route>
        <Route path="/admin/messaging-settings">
          {() => (
            <ProtectedAdminRoute component={MessagingSettings} />
          )}
        </Route>
        <Route path="/admin/push-notifications">
          {() => (
            <ProtectedAdminRoute component={PushNotificationManagement} />
          )}
        </Route>
        <Route path="/admin/email-notifications">
          {() => (
            <ProtectedAdminRoute component={AdminEmailNotifications} />
          )}
        </Route>
        <Route path="/admin/notebook-monitor">
          {() => (
            <ProtectedAdminRoute component={NotebookMonitorPage} />
          )}
        </Route>
        <Route path="/admin/location-management">
          {() => (
            <ProtectedAdminRoute component={LocationManagement} />
          )}
        </Route>
        <Route path="/admin/product-pricing">
          {() => (
            <ProtectedAdminRoute component={AdminProductPricing} />
          )}
        </Route>
        <Route path="/admin/substitute-overview">
          {() => (
            <ProtectedAdminRoute component={SubstituteTrainerOverview} />
          )}
        </Route>
        <Route path="/admin/activity-logs">
          {() => (
            <ProtectedAdminRoute component={TrainerActivityLogs} />
          )}
        </Route>

        {/* 분석 및 보고서 페이지 */}
        <Route path="/analytics">
          {() => {
            console.log("분석 및 보고서 페이지 접근");
            return (
              <Suspense fallback={
                <div className="flex justify-center items-center h-screen">
                  <DogLoading message="분석 데이터 로딩중" size="medium" showTips={true} />
                </div>
              }>
                <AnalyticsPage />
              </Suspense>
            );
          }}
        </Route>

        {/* 교육 일정 페이지 */}
        <Route path="/education-schedule">
          {() => {
            console.log("교육 일정 페이지 접근");
            return (
              <Suspense fallback={
                <div className="flex justify-center items-center h-screen">
                  <DogLoading message="교육 일정 로딩중" size="medium" showTips={true} />
                </div>
              }>
                <EducationSchedulePage />
              </Suspense>
            );
          }}
        </Route>

        {/* 캘린더 경로를 교육일정으로 리다이렉트 */}
        <Route path="/calendar">
          {() => {
            console.log("캘린더 페이지 접근 - 교육일정으로 리다이렉트");
            return (
              <Suspense fallback={
                <div className="flex justify-center items-center h-screen">
                  <DogLoading message="교육 일정 로딩중" size="medium" showTips={true} />
                </div>
              }>
                <EducationSchedulePage />
              </Suspense>
            );
          }}
        </Route>

        {/* 상담 관련 라우트 추가 */}


        {/* 매장 QR 주문 시스템 */}
        <Route path="/customer/order" component={CustomerOrderPage} />
        <Route path="/admin/store-orders">
          {() => <ProtectedAdminRoute component={AdminStoreOrdersPage} />}
        </Route>
        <Route path="/admin/store-menu">
          {() => <ProtectedAdminRoute component={AdminStoreMenuPage} />}
        </Route>
        <Route path="/admin/pet-events">
          {() => <ProtectedAdminRoute component={AdminPetEventsPage} />}
        </Route>

        {/* 404 페이지 */}
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

/**
 * 비인증 사용자를 위한 라우트
 */
function UnauthenticatedRoutes() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/auth" component={Login} />
        <Route path="/auth/register" component={Register} />
        <Route path="/auth/reset-password" component={PasswordResetPage} />
        <Route path="/auth/forgot-password" component={PasswordResetPage} />
        <Route path="/chatbot" component={ChatbotPage} />

        {/* 수료증 진위 확인 (공개) */}
        <Route path="/verify">
          {() => {
            const VerifyPage = lazy(() => import('./pages/verify/Certificate'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <VerifyPage />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/verify/:certificateNo">
          {() => {
            const VerifyPage = lazy(() => import('./pages/verify/Certificate'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <VerifyPage />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/verify/pet/scan">
          {() => {
            const Page = lazy(() => import('./pages/verify/pet-scan'));
            return (<Suspense fallback={<SimpleLoading />}><Page /></Suspense>);
          }}
        </Route>
        <Route path="/verify/pet/:token">
          {() => {
            const Page = lazy(() => import('./pages/verify/pet-result'));
            return (<Suspense fallback={<SimpleLoading />}><Page /></Suspense>);
          }}
        </Route>

        {/* 매장 QR 주문 (비로그인 공개) */}
        <Route path="/customer/order" component={CustomerOrderPage} />

        {/* TALEZ 체험 서비스 */}
        <Route path="/experience">
          {() => {
            console.log("TALEZ 체험 서비스 접근");
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                <SimpleLoadingInline size="sm" />
              </div>}>
                <TalezExperiencePage />
              </Suspense>
            );
          }}
        </Route>

        {/* 위치 서비스 */}
        <Route path="/locations">
          {() => {
            console.log("비회원이 위치 서비스 클릭");
            const LocationsPage = lazy(() => import('./pages/location'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                <SimpleLoadingInline size="sm" />
              </div>}>
                <LocationsPage />
              </Suspense>
            );
          }}
        </Route>

        {/* 전국 반려견 행사 지도 (공개) */}
        <Route path="/pet-events-map" component={PetEventsMapPage} />

        {/* AI 챗봇 */}
        <Route path="/ai-chatbot">
          {() => {
            console.log("비회원이 AI 챗봇 클릭");
            const AIChatbot = lazy(() => import('./pages/ai-chatbot'));
            return (
              <Suspense fallback={<div className="p-8 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                <SimpleLoadingInline size="sm" />
              </div>}>
                <AIChatbot />
              </Suspense>
            );
          }}
        </Route>

        {/* 쇼핑몰 메인 */}
        <Route path="/shop">
          {() => {
            console.log("비인증 사용자 /shop 경로 접근");
            // ShopIndex 컴포넌트를 동적으로 임포트
            const ShopIndex = lazy(() => import('./pages/shop/index'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ShopIndex />
              </Suspense>
            );
          }}
        </Route>

        {/* 상품 상세 페이지 */}
        <Route path="/shop/product/:id">
          {() => {
            console.log("상품 상세 페이지 접근");
            const ProductDetail = lazy(() => import('./pages/shop/product-detail'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ProductDetail />
              </Suspense>
            );
          }}
        </Route>

        {/* 장바구니 페이지 */}
        <Route path="/shop/cart">
          {() => {
            console.log("장바구니 페이지 접근");
            const Cart = lazy(() => import('./pages/shop/cart'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <Cart />
              </Suspense>
            );
          }}
        </Route>

        {/* 결제 페이지 */}
        <Route path="/shop/checkout">
          {() => {
            console.log("결제 페이지 접근");
            const Checkout = lazy(() => import('./pages/shop/checkout'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <Checkout />
              </Suspense>
            );
          }}
        </Route>

        {/* 주문 완료 페이지 */}
        <Route path="/shop/order-complete">
          {() => {
            console.log("주문 완료 페이지 접근");
            const OrderComplete = lazy(() => import('./pages/shop/order-complete'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <OrderComplete />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/help">
          {() => {
            return <RedirectHandler to="/help/faq" />;
          }}
        </Route>
        <Route path="/help/faq">
          {() => {
            return (
              <div className="p-8">
                <FAQPage />
              </div>
            );
          }}
        </Route>
        <Route path="/help/guide">
          {() => {
            const GuidePage = lazy(() => import('./pages/help/guide'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <GuidePage />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/help/about">
          {() => {
            const AboutPage = lazy(() => import('./pages/help/about'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <AboutPage />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/help/contact">
          {() => {
            const ContactPage = lazy(() => import('./pages/help/contact'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <ContactPage />
              </Suspense>
            );
          }}
        </Route>

        {/* 성취 배지 페이지 */}
        <Route path="/profile/achievements">
          {() => {
            const AchievementsPage = lazy(() => import('./pages/profile/achievements'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <AchievementsPage />
              </Suspense>
            );
          }}
        </Route>

        {/* 강의 목록 - 비인증 사용자도 열람 가능 */}
        <Route path="/courses" component={() => <Courses />} />
        <Route path="/course/:id" component={CourseDetail} />
        <Route path="/courses/:id" component={CourseDetail} />

        {/* 훈련사 목록 - 비인증 사용자도 열람 가능 */}
        <Route path="/trainers" component={Trainers} />
        <Route path="/trainers/:id">
          {() => {
            const TrainerDetailPage = lazy(() => import('./pages/trainers/detail'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <TrainerDetailPage />
              </Suspense>
            );
          }}
        </Route>

        {/* 기관 목록 - 비인증 사용자도 열람 가능 */}
        <Route path="/institutes" component={Institutes} />

        {/* 커뮤니티 - 비인증 사용자도 열람 가능 */}
        <Route path="/community" component={Community} />
        <Route path="/community/post/:id" component={CommunityPostDetail} />

        <Route path="/" component={Home} />

        {/* 404 페이지 */}
        <Route>
          {() => {
            const NotFound = lazy(() => import('./pages/NotFound'));
            return (
              <Suspense fallback={<SimpleLoading />}>
                <NotFound />
              </Suspense>
            );
          }}
        </Route>
      </Switch>
      {/* AI 챗봇 */}
      <SimpleChatBot />
    </AppLayout>
  );
}

function CheckinOrAppRoutes({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [location] = useLocation();
  if (location.startsWith('/checkin/')) {
    const CheckinPage = lazy(() => import('./pages/institute/qr-checkin/CheckinPage'));
    return (
      <Switch>
        <Route path="/checkin/:token">
          <Suspense fallback={<SimpleLoading />}>
            <CheckinPage />
          </Suspense>
        </Route>
      </Switch>
    );
  }
  if (location.startsWith('/visit/')) {
    const VisitVerifyPage = lazy(() => import('./pages/institute/qr-checkin/VisitVerifyPage'));
    return (
      <Switch>
        <Route path="/visit/:token">
          <Suspense fallback={<SimpleLoading />}>
            <VisitVerifyPage />
          </Suspense>
        </Route>
      </Switch>
    );
  }
  return isAuthenticated ? <AuthenticatedRoutes /> : <UnauthenticatedRoutes />;
}

function DebugButton() {
  return null;
}

/**
 * 날씨 효과 래퍼 컴포넌트 - WeatherContext 사용
 */
function WeatherEffectsWrapper() {
  const { weather } = useWeather();
  return <WeatherEffects weatherType={weather.type} />;
}


/**
 * 전역 단축키 관리 컴포넌트
 */
function KeyboardShortcutsManager({ children }: { children: ReactNode }) {
  // 글로벌 단축키 훅 사용
  useGlobalShortcuts();
  return <>{children}</>;
}

/**
 * 메인 애플리케이션 컴포넌트
 */
function SimpleApp() {
  const auth = useAuth();
  const { showSplash, handleSplashComplete } = useSplashScreen();

  // 디버깅: 현재 인증 상태 출력
  console.log('SimpleApp render - Auth state:', auth);

  return (
    <ThemeProvider defaultTheme="light" storageKey="petedu-theme">
      <ThemeManager>
        <UserPreferencesProvider>
          <AchievementsProvider>
            <NotificationsProvider>
              <WeatherProvider>
                <KeyboardShortcutsManager>
                  <>
                    <WeatherEffectsWrapper />
                    {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
                    <NavigationProgress />
                    <CheckinOrAppRoutes isAuthenticated={auth.isAuthenticated} />
                    <DebugButton />
                    <Toaster />
                    <IdleLogoutWarning />
                    <NotificationPermissionPopup />
                  </>
                </KeyboardShortcutsManager>
              </WeatherProvider>
            </NotificationsProvider>
          </AchievementsProvider>
        </UserPreferencesProvider>
      </ThemeManager>
    </ThemeProvider>
  );
}

export default SimpleApp;