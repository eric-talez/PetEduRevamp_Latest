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
import { Eye, EyeOff, UserPlus, Clock, CheckCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type UserRole = 'user' | 'pet-owner' | 'trainer' | 'institute-admin' | 'admin';

export default function Register() {
  const auth = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("pet-owner");
  const [inviteCode, setInviteCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  
  if (auth.isAuthenticated) {
    const dashboardPath = auth.userRole === 'pet-owner' ? '/dashboard' : 
                         auth.userRole === 'trainer' ? '/trainer/dashboard' : 
                         auth.userRole === 'institute-admin' ? '/institute/dashboard' : 
                         auth.userRole === 'admin' ? '/admin/dashboard' : '/dashboard';
    
    React.useEffect(() => {
      setLocation(dashboardPath);
    }, [dashboardPath, setLocation]);
    
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>이미 로그인되어 있습니다. 리다이렉트 중...</p>
        </div>
      </div>
    );
  }

  const goToLogin = () => {
    window.location.href = "/auth";
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (!email || !name || !password) {
      toast({
        title: "입력 오류",
        description: "모든 필수 필드를 입력해주세요.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      toast({
        title: "비밀번호 오류",
        description: "비밀번호는 최소 6자 이상이어야 합니다.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: "비밀번호 불일치",
        description: "비밀번호와 비밀번호 확인이 일치하지 않습니다.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "이메일 오류",
        description: "올바른 이메일 형식을 입력해주세요.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: email,
          password,
          email,
          name,
          role: userRole,
          inviteCode: inviteCode.trim() || undefined,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setRegistrationSuccess(true);
        toast({
          title: "회원가입 신청 완료",
          description: "관리자 승인 후 로그인이 가능합니다.",
        });
      } else {
        toast({
          title: "회원가입 실패",
          description: data.message || "회원가입 중 오류가 발생했습니다.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    } catch (error) {
      console.error('회원가입 오류:', error);
      toast({
        title: "회원가입 오류",
        description: "서버와의 통신 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  if (registrationSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary to-secondary/10 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-warning/10 dark:bg-warning/20 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-warning dark:text-warning" />
            </div>
            <CardTitle className="text-2xl">회원가입 신청 완료</CardTitle>
            <CardDescription className="text-base mt-2">
              회원가입 신청이 접수되었습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-warning/10 dark:bg-warning/20 border border-warning/30 dark:border-warning/50 rounded-lg p-4">
              <p className="text-warning dark:text-warning/70 font-medium">
                관리자 승인 대기 중
              </p>
              <p className="text-warning dark:text-warning text-sm mt-1">
                관리자가 가입 신청을 검토한 후 승인됩니다.<br />
                승인 완료 시 로그인이 가능합니다.
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>신청한 이메일: <strong>{email}</strong></p>
              <p>신청한 역할: <strong>
                {userRole === 'pet-owner' ? '반려동물 보호자' : 
                 userRole === 'trainer' ? '훈련사' : 
                 userRole === 'institute-admin' ? '기관 관리자' : userRole}
              </strong></p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={goToLogin} className="w-full">
              로그인 페이지로 이동
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-950">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">
              <span className="text-primary">Talez</span> 회원가입
            </h1>
            <p className="mt-2 text-muted-foreground">반려견과 함께하는 특별한 교육 여정에 참여하세요</p>
          </div>
          
          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-medium text-center">소셜 계정으로 간편 가입</h2>
            <SocialLoginButtons />
          </div>
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-gray-950 px-2 text-muted-foreground">
                또는 직접 가입
              </span>
            </div>
          </div>
          
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일 *</Label>
              <Input
                id="email"
                type="email"
                placeholder="이메일 주소를 입력하세요"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">이름 *</Label>
              <Input
                id="name"
                type="text"
                placeholder="이름을 입력하세요"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호 *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="비밀번호를 입력하세요 (6자 이상)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">비밀번호 확인 *</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="비밀번호를 다시 입력하세요"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">사용자 유형 *</Label>
              <Select value={userRole} onValueChange={(value: UserRole) => setUserRole(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="사용자 유형을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pet-owner">반려동물 보호자</SelectItem>
                  <SelectItem value="trainer">훈련사</SelectItem>
                  <SelectItem value="institute-admin">기관 관리자</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inviteCode">초대 코드 (선택)</Label>
              <Input
                id="inviteCode"
                type="text"
                placeholder="친구에게 받은 초대 코드를 입력하세요"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                maxLength={10}
                className="uppercase"
              />
              <p className="text-xs text-muted-foreground">초대 코드 입력 시 친구에게 교육 참여 기회가 제공됩니다</p>
            </div>
            
            <div className="bg-primary/10 dark:bg-primary/20 border border-primary/30 dark:border-primary/50 rounded-lg p-3 text-sm">
              <p className="text-primary dark:text-primary/70">
                <strong>안내:</strong> 회원가입 후 관리자 승인이 필요합니다.
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  처리 중...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  회원가입 신청
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">이미 계정이 있으신가요? </span>
            <button 
              onClick={goToLogin}
              className="text-primary hover:underline font-medium"
            >
              로그인
            </button>
          </div>
        </div>
      </div>
      
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary to-secondary items-center justify-center p-12">
        <div className="max-w-md text-white text-center">
          <h2 className="text-4xl font-bold mb-6">Talez와 함께하는 반려견 교육</h2>
          <p className="text-lg opacity-90 mb-8">
            반려견과 보호자를 위한 전문 교육 플랫폼에서 전문 훈련사들과 함께 즐겁고 효과적인 교육 경험을 시작하세요.
          </p>
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="font-semibold mb-1">맞춤형 교육 코스</h3>
              <p className="text-sm opacity-80">개별 반려견의 특성과 수준에 맞는 맞춤형 교육 코스</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="font-semibold mb-1">전문 훈련사 연결</h3>
              <p className="text-sm opacity-80">검증된 전문 훈련사들과 화상 훈련 및 1:1 상담</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
