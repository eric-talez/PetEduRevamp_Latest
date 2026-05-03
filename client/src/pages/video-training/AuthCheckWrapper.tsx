/**
 * 권한 확인 및 컨텐츠 접근 제어 래퍼 컴포넌트
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface AuthCheckWrapperProps {
  children: React.ReactNode;
  requiredAuth?: boolean; // 인증 필요 여부
  authMessage?: string; // 인증 필요 시 표시할 메시지
  redirectPath?: string; // 리디렉션 경로
  showContent?: boolean; // 미인증 상태에서 컨텐츠 표시 여부 (제한된 버전으로)
  onUnauthorized?: () => void; // 미인증 상태 콜백
}

const AuthCheckWrapper: React.FC<AuthCheckWrapperProps> = ({
  children,
  requiredAuth = true,
  authMessage = '이 콘텐츠를 이용하려면 로그인이 필요합니다.',
  redirectPath = '/auth',
  showContent = false,
  onUnauthorized
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [shouldRedirect, setShouldRedirect] = useState(false);
  
  useEffect(() => {
    // 로딩이 완료되었고, 인증이 필요하지만 인증되지 않은 경우
    if (!isLoading && requiredAuth && !isAuthenticated) {
      if (onUnauthorized) {
        onUnauthorized();
      }
      
      if (!showContent) {
        toast({
          title: '로그인 필요',
          description: authMessage,
          variant: 'destructive',
        });
        
        // 리디렉션 설정
        setShouldRedirect(true);
      }
    }
  }, [isLoading, isAuthenticated, requiredAuth, authMessage, showContent, onUnauthorized]);
  
  useEffect(() => {
    // 리디렉션 수행
    if (shouldRedirect) {
      const timer = setTimeout(() => {
        window.location.href = redirectPath;
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [shouldRedirect, redirectPath]);
  
  // 로딩 중인 경우 로딩 표시기 표시
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // 인증 필요하지만 인증되지 않았고, 컨텐츠를 표시하지 않는 경우
  if (requiredAuth && !isAuthenticated && !showContent) {
    return (
      <div className="p-4 border rounded-md bg-primary/10 dark:bg-primary/20 text-center">
        <h3 className="font-medium text-lg mb-2">로그인이 필요합니다</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">{authMessage}</p>
        <button 
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          onClick={() => window.location.href = redirectPath}
        >
          로그인 페이지로 이동
        </button>
      </div>
    );
  }
  
  // 인증 필요없거나, 인증되었거나, 컨텐츠를 표시해야 하는 경우
  return <>{children}</>;
};

export default AuthCheckWrapper;