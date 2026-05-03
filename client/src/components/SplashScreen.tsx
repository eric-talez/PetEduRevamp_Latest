import { useState, useEffect, useCallback, createContext, useContext, ReactNode, useRef } from 'react';
import { useLocation } from 'wouter';

interface SplashScreenProps {
  onComplete: () => void;
  minDisplayTime?: number;
}

// 페이지 전환 로딩 컨텍스트
interface PageLoadingContextType {
  isLoading: boolean;
  loadingMessage: string;
  startLoading: (message?: string, persistAcrossReload?: boolean) => void;
  stopLoading: () => void;
}

const PageLoadingContext = createContext<PageLoadingContextType>({
  isLoading: false,
  loadingMessage: '',
  startLoading: () => {},
  stopLoading: () => {},
});

export const usePageLoading = () => useContext(PageLoadingContext);

// 페이지 전환 스플래시 로딩 컴포넌트
export function PageLoadingSplash({ isVisible, message }: { isVisible: boolean; message?: string }) {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      setFadeOut(false);
    } else {
      setFadeOut(true);
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!shouldRender) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background/95 to-secondary/10 dark:from-primary/20 dark:via-background/95 dark:to-secondary/10 backdrop-blur-sm transition-opacity duration-300 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      data-testid="page-loading-splash"
    >
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
          <img 
            src="/logo-symbol-new.png"
            alt="TALEZ" 
            className="relative w-20 h-20 md:w-24 md:h-24 object-contain animate-bounce-slow"
          />
        </div>
        
        <div className="flex space-x-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>

        {message && (
          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mt-2">
            {message}
          </p>
        )}
      </div>
      
      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// 페이지 로딩 프로바이더
export function PageLoadingProvider({ children }: { children: ReactNode }) {
  // 페이지 새로고침 중인지 체크 (로그인/로그아웃 등)
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === 'undefined') return false;
    const pendingLoad = sessionStorage.getItem('talez_pending_load');
    return !!pendingLoad;
  });
  const [loadingMessage, setLoadingMessage] = useState(() => {
    if (typeof window === 'undefined') return '';
    return sessionStorage.getItem('talez_pending_load') || '';
  });
  const [location] = useLocation();
  const prevLocationRef = useRef(location);

  // 마운트 시 pending 로딩 처리
  useEffect(() => {
    const pendingLoad = sessionStorage.getItem('talez_pending_load');
    if (pendingLoad) {
      // 렌더링 완료 후 로딩 종료
      const timer = setTimeout(() => {
        sessionStorage.removeItem('talez_pending_load');
        setIsLoading(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // 라우트 변경 시 로딩 표시
  useEffect(() => {
    // 같은 페이지면 로딩 표시 안함
    if (location === prevLocationRef.current) return;
    
    prevLocationRef.current = location;

    const routeNames: Record<string, string> = {
      '/': '홈',
      '/home': '홈',
      '/dashboard': '대시보드',
      '/admin': '관리자',
      '/courses': '강의',
      '/trainers': '훈련사',
      '/community': '커뮤니티',
      '/messages': '메시지',
      '/my-pets': '내 펫',
      '/locations': '위치',
      '/shop': '쇼핑',
      '/video-call': '화상통화',
      '/chatbot': 'AI 챗봇',
      '/events': '이벤트',
      '/search': '검색',
      '/notebook': '노트북',
      '/institutes': '교육기관',
      '/profile': '프로필',
      '/auth': '로그인',
    };

    // 현재 경로에 맞는 이름 찾기
    let currentRouteName = '페이지';
    for (const [path, name] of Object.entries(routeNames)) {
      if (location === path || location.startsWith(path + '/')) {
        currentRouteName = name;
        break;
      }
    }

    setLoadingMessage(`${currentRouteName} 로딩 중...`);
    setIsLoading(true);

    // 페이지 렌더링 완료 감지 - requestAnimationFrame + setTimeout 조합
    // React가 렌더링을 완료하고 브라우저가 페인팅을 마친 후 로딩 종료
    let frameId: number;
    let timerId: NodeJS.Timeout;
    
    const checkRenderComplete = () => {
      frameId = requestAnimationFrame(() => {
        // 다음 프레임에서 추가 확인
        frameId = requestAnimationFrame(() => {
          setIsLoading(false);
        });
      });
    };

    // 최소 표시 시간 (500ms) 후 렌더링 완료 확인
    timerId = setTimeout(checkRenderComplete, 500);
    
    // 최대 대기 시간 (2초)
    const maxTimer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => {
      clearTimeout(timerId);
      clearTimeout(maxTimer);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [location]);

  const startLoading = (message?: string, persistAcrossReload = false) => {
    const msg = message || '로딩 중...';
    setLoadingMessage(msg);
    setIsLoading(true);
    // 페이지 새로고침 시에도 로딩 유지
    if (persistAcrossReload) {
      sessionStorage.setItem('talez_pending_load', msg);
    }
  };

  const stopLoading = () => {
    setIsLoading(false);
  };

  return (
    <PageLoadingContext.Provider value={{ isLoading, loadingMessage, startLoading, stopLoading }}>
      <PageLoadingSplash isVisible={isLoading} message={loadingMessage} />
      {children}
    </PageLoadingContext.Provider>
  );
}

export function SplashScreen({ onComplete, minDisplayTime = 2000 }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => onCompleteRef.current(), 500);
    }, minDisplayTime);

    return () => clearTimeout(timer);
  }, [minDisplayTime]);

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 dark:from-primary/20 dark:via-background dark:to-secondary/10 transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      data-testid="splash-screen"
    >
      <div className="flex flex-col items-center space-y-6 animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <img 
            src="/logo-symbol-new.png"
            alt="TALEZ" 
            className="relative w-32 h-32 md:w-40 md:h-40 object-contain animate-bounce-slow"
            data-testid="splash-logo"
          />
        </div>
        
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            TALEZ
          </h1>
          <p className="mt-2 text-sm md:text-base text-gray-500 dark:text-gray-400">
            반려동물 교육 플랫폼
          </p>
        </div>

        <div className="flex space-x-2 mt-8">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
      
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export function useSplashScreen() {
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === 'undefined') return false;
    
    const hasSeenSplash = sessionStorage.getItem('talez_splash_shown');
    
    return !hasSeenSplash;
  });

  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem('talez_splash_shown', 'true');
    setShowSplash(false);
  }, []);

  return { showSplash, handleSplashComplete };
}
