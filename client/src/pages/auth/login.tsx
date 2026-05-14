import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ui/ThemeSwitcher";
import { useAuth } from "../../SimpleApp";
import { SocialLoginButtons } from "@/components/SocialLoginButtons";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import RegisterPage from "./register";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PasswordResetForm } from "@/components/PasswordResetForm";

export default function Login() {
  const auth = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // URL 파라미터에서 탭 정보 가져오기
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  // 비밀번호 찾기 모달 상태
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  
  useEffect(() => {
    // URL에서 tab 파라미터 가져오기
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'register') {
      setShowRegisterForm(true);
    } else {
      setShowRegisterForm(false);
    }
  }, [location]);
  
  // Form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // 이미 인증된 경우 대시보드로 리다이렉트
  if (auth.isAuthenticated) {
    // 대시보드로 리다이렉트
    const dashboardPath = auth.userRole === 'pet-owner' ? '/dashboard' : 
                         auth.userRole === 'trainer' ? '/trainer/dashboard' : 
                         auth.userRole === 'institute-admin' ? '/institute/dashboard' : 
                         auth.userRole === 'admin' ? '/admin/dashboard' : '/dashboard';
    
    // useEffect 내에서 리다이렉션 처리
    React.useEffect(() => {
      setLocation(dashboardPath);
    }, [dashboardPath, setLocation]);
    
    // 로딩 표시
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>이미 로그인되어 있습니다. 리다이렉트 중...</p>
        </div>
      </div>
    );
  }

  // 빠른 로그인 처리 함수 (역할 기반, /api/auth/quick-login 사용)
  const handleQuickLogin = async (role: string) => {
    setIsLoading(true);
    
    try {
      // CSRF 토큰 먼저 가져오기
      const csrfResponse = await fetch('/api/auth/csrf', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!csrfResponse.ok) {
        throw new Error('CSRF 토큰을 가져올 수 없습니다.');
      }
      
      const csrfData = await csrfResponse.json();
      
      // 역할만 전송 — 비밀번호를 클라이언트에서 노출하지 않음
      const response = await fetch('/api/auth/quick-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfData.csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ role }),
      });

      const userData = await response.json();

      if (!response.ok || !userData.success) {
        throw new Error(userData.message || '로그인에 실패했습니다.');
      }
      
      if (userData.success && userData.data?.user) {
        const user = userData.data.user;

        // 서버 응답으로 받은 역할(user.role)을 단일 소스로 사용해 클라이언트 상태를 즉시 동기화한다.
        // 이전 세션의 역할(예: admin)이 남아 라우팅을 잘못 결정하지 않도록,
        // auth.logout() → dispatch('login') → auth.login() 다단계 호출로 인한 레이스를 제거하고
        // 한 번의 auth.login()만 호출한 뒤 하드 네비게이션으로 새 세션 기준으로 페이지를 새로 로드한다.
        auth.login(user.role, user.name, false);

        toast({
          title: "로그인 성공",
          description: `${user.name}님, 환영합니다!`,
          variant: "default",
        });

        // 역할에 따른 대시보드로 이동 (서버 응답의 user.role 기준)
        const dashboardPath = user.role === 'pet-owner' ? '/dashboard' :
                             user.role === 'trainer' ? '/trainer/dashboard' :
                             user.role === 'institute-admin' ? '/institute/dashboard' :
                             user.role === 'admin' ? '/admin/dashboard' : '/dashboard';

        // 하드 네비게이션으로 React 상태 레이스(이전 역할의 早期 리다이렉트, 캐시된 /api/auth/me 등)를 차단
        window.location.assign(dashboardPath);
        return;
      } else {
        throw new Error(userData.message || '로그인에 실패했습니다.');
      }

    } catch (error) {
      // 실패 시 클라이언트 인증 상태 초기화하여 이전 세션과 혼동 방지
      auth.logout();
      toast({
        title: "로그인 실패",
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 로그인 처리 함수
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // 입력 검증
    if (!username || !password) {
      toast({
        title: "입력 오류",
        description: "아이디와 비밀번호를 모두 입력해주세요.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    try {
      // CSRF 토큰 먼저 가져오기
      const csrfResponse = await fetch('/api/auth/csrf', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!csrfResponse.ok) {
        throw new Error('CSRF 토큰을 가져올 수 없습니다.');
      }
      
      const csrfData = await csrfResponse.json();
      
      // 서버에 로그인 요청
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfData.csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          username,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '로그인에 실패했습니다.');
      }

      const userData = await response.json();
      console.log('로그인 응답 데이터:', userData);
      console.log('조건 체크 - userData.success:', userData.success);
      console.log('조건 체크 - userData.data:', userData.data);
      console.log('조건 체크 - userData.data?.user:', userData.data?.user);
      
      if (userData.success && userData.data?.user) {
        const user = userData.data.user;
        console.log('로그인 성공 - 사용자 데이터:', user);
        
        // 로그인 성공 시 인증 이벤트 발행
        const loginEvent = new CustomEvent('login', {
          detail: {
            role: user.role,
            name: user.name,
            userRole: user.role,
            userName: user.name
          }
        });
        window.dispatchEvent(loginEvent);

        // 인증 상태 강제 업데이트 - 글로벌 상태 동기화
        console.log('글로벌 인증 상태 업데이트 시작:', user.role, user.name);
        auth.login(user.role, user.name, false);
        console.log('글로벌 인증 상태 업데이트 완료');

        toast({
          title: "로그인 성공",
          description: `${user.name}님, 환영합니다!`,
          variant: "default",
        });

        // 역할에 따른 대시보드로 이동
        const dashboardPath = user.role === 'pet-owner' ? '/dashboard' : 
                             user.role === 'trainer' ? '/trainer/dashboard' : 
                             user.role === 'institute-admin' ? '/institute/dashboard' : 
                             user.role === 'admin' ? '/admin/dashboard' : '/dashboard';
        
        // 상태 업데이트 후 즉시 리다이렉트
        setLocation(dashboardPath);
      } else {
        throw new Error(userData.message || '로그인에 실패했습니다.');
      }

    } catch (error) {
      toast({
        title: "로그인 실패",
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 회원가입 폼이 활성화된 경우 해당 컴포넌트 표시
  if (showRegisterForm) {
    return <RegisterPage />;
  }
  
  return (
    <div className="flex min-h-screen">
      {/* 비밀번호 찾기 모달 */}
      <Dialog open={showPasswordReset} onOpenChange={setShowPasswordReset}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>비밀번호 찾기</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            <span className="font-medium text-primary dark:text-primary">가입시 등록한 아이디와 이메일이 정확히 일치해야 합니다.</span> 일치하는 정보가 확인되면 비밀번호 재설정 안내를 이메일로 보내드립니다.
          </p>
          <PasswordResetForm onClose={() => setShowPasswordReset(false)} />
        </DialogContent>
      </Dialog>
      
      {/* 왼쪽 컬럼 - 폼 영역 */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-950 animate-fade-in">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center animate-slide-up">
            <h1 className="text-3xl font-bold">
              <span className="text-primary">Talez</span>
            </h1>
            <p className="mt-2 text-muted-foreground">반려견과 함께하는 특별한 교육 여정</p>
          </div>
          
          <div className="w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">로그인</h2>
              <Button 
                variant="outline" 
                onClick={() => setShowRegisterForm(true)}
                className="flex items-center gap-2"
              >
                회원가입
              </Button>
            </div>
            
            {/* 소셜 로그인 버튼 */}
            <div className="space-y-4 mb-6">
              <h2 className="text-lg font-medium text-center">소셜 계정으로 로그인</h2>
              <SocialLoginButtons />
            </div>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-950 px-2 text-muted-foreground">
                  또는 아이디로 로그인
                </span>
              </div>
            </div>
            
            {/* 아이디 로그인 폼 */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">아이디</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="아이디를 입력하세요"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">비밀번호</Label>
                  <button
                    type="button"
                    onClick={() => setShowPasswordReset(true)}
                    className="text-xs text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer"
                  >
                    비밀번호 찾기
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="비밀번호를 입력하세요"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              {/* 퀵 로그인 버튼 섹션 — 개발 환경 전용 */}
              {import.meta.env.DEV && (
                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 mb-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">빠른 로그인 (개발용)</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickLogin('pet-owner')}
                      disabled={isLoading}
                      className="text-xs"
                    >
                      {isLoading ? '로그인 중...' : '테스트 계정'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickLogin('trainer')}
                      disabled={isLoading}
                      className="text-xs"
                    >
                      {isLoading ? '로그인 중...' : '훈련사 계정'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickLogin('admin')}
                      disabled={isLoading}
                      className="text-xs"
                    >
                      {isLoading ? '로그인 중...' : '관리자 계정'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickLogin('institute-admin')}
                      disabled={isLoading}
                      className="text-xs"
                    >
                      {isLoading ? '로그인 중...' : '기관 계정'}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    버튼을 클릭하면 바로 로그인됩니다.
                  </p>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full focus-visible-enhanced" 
                disabled={isLoading}
                aria-describedby={isLoading ? "login-status" : undefined}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span id="login-status">로그인 중...</span>
                  </div>
                ) : (
                  "로그인"
                )}
              </Button>

              <div className="text-center text-sm mt-4">
                <span className="text-muted-foreground">계정이 없으신가요?</span>{" "}
                <a href="/auth?tab=register" className="text-primary hover:underline">
                  회원가입
                </a>
              </div>
            </form>
          </div>
          
          {/* 약관 안내 */}
          <div className="text-xs text-center text-muted-foreground mt-6">
            <p>계속 진행하면 Talez의 <a href="/terms" className="text-primary hover:underline">이용약관</a>과 <a href="/privacy" className="text-primary hover:underline">개인정보처리방침</a>에 동의하게 됩니다.</p>
          </div>
          
          <div className="mt-4 flex justify-center">
            <ThemeToggle />
          </div>
        </div>
      </div>
      
      {/* 오른쪽 컬럼 - 설명 영역 (데스크톱에서만 표시) */}
      <div className="hidden md:flex flex-1 bg-gradient-to-b from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 p-8 items-center justify-center">
        <div className="max-w-md text-center">
          <h2 className="text-3xl font-bold mb-4">Talez와 함께하는 반려견 교육</h2>
          <p className="mb-6 text-lg">
            반려견과 보호자를 위한 지능형 교육 플랫폼에서 
            전문 훈련사들과 함께 즐겁고 효과적인 교육 경험을 시작하세요.
          </p>
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="p-4 bg-white bg-opacity-80 dark:bg-gray-800 dark:bg-opacity-50 rounded-lg">
              <h3 className="font-bold text-lg mb-2">맞춤형 교육 코스</h3>
              <p>개별 반려견의 특성과 수준에 맞는 맞춤형 교육 코스</p>
            </div>
            <div className="p-4 bg-white bg-opacity-80 dark:bg-gray-800 dark:bg-opacity-50 rounded-lg">
              <h3 className="font-bold text-lg mb-2">전문 훈련사 연결</h3>
              <p>검증된 전문 훈련사들과의 화상 훈련 및 1:1 상담</p>
            </div>
            <div className="p-4 bg-white bg-opacity-80 dark:bg-gray-800 dark:bg-opacity-50 rounded-lg">
              <h3 className="font-bold text-lg mb-2">AI 행동 분석</h3>
              <p>인공지능을 활용한 반려견 행동 분석 및 진단</p>
            </div>
            <div className="p-4 bg-white bg-opacity-80 dark:bg-gray-800 dark:bg-opacity-50 rounded-lg">
              <h3 className="font-bold text-lg mb-2">커뮤니티 참여</h3>
              <p>다양한 반려견 보호자들과의 교류 및 정보 공유</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}