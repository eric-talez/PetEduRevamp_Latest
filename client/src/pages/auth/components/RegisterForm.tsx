import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, AlertCircle, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

type UserRole = 'pet-owner' | 'trainer' | 'institute-admin';

export default function RegisterForm() {
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("pet-owner");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (!email || !password || !confirmPassword || !name) {
      toast({
        title: "입력 오류",
        description: "모든 필수 필드를 입력해주세요.",
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

    if (password.length < 6) {
      toast({
        title: "비밀번호 오류",
        description: "비밀번호는 6자 이상이어야 합니다.",
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
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: email.split('@')[0] + '_' + Date.now().toString(36),
          password,
          email,
          name,
          role: userRole,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || '회원가입에 실패했습니다.');
      }

      setRegistrationSuccess(true);
      toast({
        title: "회원가입 신청 완료",
        description: "관리자 승인 후 로그인하실 수 있습니다.",
      });

    } catch (error) {
      toast({
        title: "회원가입 실패",
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (registrationSuccess) {
    return (
      <div className="space-y-4 py-4">
        <Alert className="border-warning/50 bg-warning/10 dark:bg-warning/20">
          <Clock className="h-5 w-5 text-warning" />
          <AlertDescription className="text-warning dark:text-warning/70">
            <p className="font-semibold mb-2">회원가입 신청이 완료되었습니다!</p>
            <p>관리자의 승인 후 로그인하실 수 있습니다.</p>
            <p className="text-sm mt-2">승인 완료 시 이메일로 알려드립니다.</p>
          </AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => window.location.href = '/auth'}
        >
          로그인 페이지로 이동
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      <Alert className="border-primary/30 bg-primary/10 dark:bg-primary/20">
        <AlertCircle className="h-4 w-4 text-primary" />
        <AlertDescription className="text-primary dark:text-primary/70 text-sm">
          회원가입 후 관리자 승인이 필요합니다.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="email">이메일 <span className="text-destructive">*</span></Label>
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
        <Label htmlFor="name">이름 <span className="text-destructive">*</span></Label>
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
        <Label htmlFor="password">비밀번호 <span className="text-destructive">*</span></Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="6자 이상 입력하세요"
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
      
      <div className="space-y-2">
        <Label htmlFor="confirm-password">비밀번호 확인 <span className="text-destructive">*</span></Label>
        <Input
          id="confirm-password"
          type="password"
          placeholder="비밀번호를 다시 입력하세요"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="user-role">가입 유형 <span className="text-destructive">*</span></Label>
        <Select
          value={userRole}
          onValueChange={(value) => setUserRole(value as UserRole)}
        >
          <SelectTrigger id="user-role">
            <SelectValue placeholder="가입 유형을 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pet-owner">반려동물 보호자</SelectItem>
            <SelectItem value="trainer">훈련사</SelectItem>
            <SelectItem value="institute-admin">기관 관리자</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            <span>가입 신청 중...</span>
          </div>
        ) : (
          "회원가입 신청"
        )}
      </Button>
    </form>
  );
}
