import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  Save,
  RefreshCw,
  Shield,
  Mail,
  Lock,
  Users,
  Database,
  Globe,
  Upload,
  BellRing,
  Cog,
  FileText,
  MessageSquare,
  Loader2,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  Bot
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ImageUpload } from '@/components/ImageUpload';

export default function AdminSettings() {
  const { userName } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(false);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  
  // AI 에러 수정 상태
  const [aiFixSettings, setAiFixSettings] = useState({
    isEnabled: true,
    isRealTimeMonitoring: true,
    aiModel: 'claude-4-sonnet',
    maxRetries: 3,
    enabledErrorTypes: {
      syntax: true,
      type: true,
      import: true,
      linting: true,
      runtime: false,
      performance: false
    }
  });
  const [logoImages, setLogoImages] = useState<{ [key: string]: string }>({});
  const [uploadingLogo, setUploadingLogo] = useState<string | null>(null);



  // 로고 타입 정의
  interface LogoSettings {
    main?: string;
    mainDark?: string;
    compact?: string;
    compactDark?: string;
    favicon?: string;
  }

  // 현재 로고 설정 조회
  const { data: currentLogos, isLoading: logosLoading, refetch: refetchLogos } = useQuery<LogoSettings>({
    queryKey: ['/api/admin/logos'],
    retry: false,
  });

  // 색상 설정 상태
  const [primaryColor, setPrimaryColor] = useState('#7C3AED');
  const [secondaryColor, setSecondaryColor] = useState('#10B981');

  // 현재 색상 설정 조회
  const { data: colorSettings } = useQuery({
    queryKey: ['/api/admin/colors']
  });





  // 색상 설정 로드 후 상태 업데이트
  useEffect(() => {
    if (colorSettings && (colorSettings as any).settings) {
      const settings = (colorSettings as any).settings;
      const primary = settings.primary || '#7C3AED';
      const secondary = settings.secondary || '#10B981';

      setPrimaryColor(primary);
      setSecondaryColor(secondary);

      // CSS 변수에 HSL 값으로 적용
      const primaryHsl = hexToHsl(primary);
      const secondaryHsl = hexToHsl(secondary);

      document.documentElement.style.setProperty('--primary', primaryHsl);
      document.documentElement.style.setProperty('--secondary', secondaryHsl);

      console.log('[색상 로드] 설정 적용:', { primary, secondary, primaryHsl, secondaryHsl });
    }
  }, [colorSettings]);

  // 로고 업로드 뮤테이션
  const logoUploadMutation = useMutation({
    mutationFn: async ({ type, file }: { type: string; file: File }) => {
      const formData = new FormData();
      formData.append('logo', file);
      formData.append('type', type);

      const response = await fetch('/api/admin/logo/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('로고 업로드 실패');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: '로고 업로드 완료',
        description: `${variables.type} 로고가 성공적으로 업로드되었습니다.`,
      });
      setUploadingLogo(null);
      // 로고 목록 다시 조회 (페이지 새로고침 없이)
      refetchLogos();
      // 사이드바의 로고 쿼리도 무효화 (두 엔드포인트 모두)
      queryClient.invalidateQueries({ queryKey: ['/api/admin/logos'] });
      queryClient.invalidateQueries({ queryKey: ['/api/logo'] });
    },
    onError: (error: any) => {
      toast({
        title: '로고 업로드 실패',
        description: error.message || '로고 업로드 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
      setUploadingLogo(null);
    },
  });

  // 로고 삭제 뮤테이션
  const logoDeleteMutation = useMutation({
    mutationFn: async (type: string) => {
      return apiRequest('DELETE', `/api/admin/logos/${type}`);
    },
    onSuccess: (data, type) => {
      toast({
        title: '로고 삭제 완료',
        description: `${type} 로고가 성공적으로 삭제되었습니다.`,
      });
      // 로고 목록 다시 조회 (페이지 새로고침 없이)
      refetchLogos();
      // 사이드바의 로고 쿼리도 무효화 (두 엔드포인트 모두)
      queryClient.invalidateQueries({ queryKey: ['/api/admin/logos'] });
      queryClient.invalidateQueries({ queryKey: ['/api/logo'] });
    },
    onError: (error: any) => {
      toast({
        title: '로고 삭제 실패',
        description: error.message || '로고 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  // 로고 업로드 핸들러
  const handleLogoUpload = async (type: string, urlOrFile: string | File) => {
    if (typeof urlOrFile === 'string') {
      // URL인 경우 API를 통해 로고 저장
      try {
        const response = await apiRequest('POST', `/api/logo/set`, {
          type,
          url: urlOrFile
        });

        // API 응답이 성공이면 무조건 업데이트 (서버 로그에서 성공 확인됨)
        toast({
          title: '로고 업로드 완료',
          description: `${type === 'main' ? '메인' : type === 'mainDark' ? '메인 다크' : type === 'compact' ? '컴팩트' : type === 'compactDark' ? '컴팩트 다크' : '파비콘'} 로고가 성공적으로 저장되었습니다.`,
        });
        // 로고 목록 다시 조회 (페이지 새로고침 없이)
        await refetchLogos();
        // 사이드바의 로고 쿼리도 무효화 (두 엔드포인트 모두)
        await queryClient.invalidateQueries({ queryKey: ['/api/admin/logos'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/logo'] });
        // 강제로 쿼리 다시 실행
        await queryClient.refetchQueries({ queryKey: ['/api/admin/logos'] });
        await queryClient.refetchQueries({ queryKey: ['/api/logo'] });
      } catch (error: any) {
        toast({
          title: '로고 저장 실패',
          description: error.message || '로고 저장 중 오류가 발생했습니다.',
          variant: 'destructive',
        });
      }
    } else {
      // File인 경우 기존 로직 사용
      setUploadingLogo(type);
      logoUploadMutation.mutate({ type, file: urlOrFile });
    }
  };

  // 로고 삭제 핸들러
  const handleLogoDelete = (type: string) => {
    logoDeleteMutation.mutate(type);
  };

  // 색상 변경 뮤테이션
  const colorChangeMutation = useMutation({
    mutationFn: async (colorData: { primary: string; secondary: string }) => {
      console.log('[DEBUG] API Request: POST /api/admin/colors');
      console.log('[DEBUG] Request payload:', colorData);

      const result = await apiRequest("POST", "/api/admin/colors", colorData);

      console.log('[DEBUG] API Success:', result);

      return result;
    },
    onSuccess: (data) => {
      console.log('[DEBUG] onSuccess called with data:', data);
      toast({
        title: "성공",
        description: "색상 설정이 업데이트되었습니다.",
      });
    },
    onError: (error: any) => {
      console.error('색상 설정 오류:', error);
      toast({
        title: "오류", 
        description: error.message || "색상 설정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // AI 에러 수정 설정 쿼리
  const { data: aiFixData, refetch: refetchAiFixSettings } = useQuery({
    queryKey: ['/api/ai-fix/settings'],
    queryFn: () => apiRequest('GET', '/api/ai-fix/settings').then(res => res.json()),
    enabled: activeTab === 'ai-fix'
  });

  // AI 에러 수정 설정 동기화
  useEffect(() => {
    if (aiFixData) {
      setAiFixSettings(prev => ({
        ...prev,
        ...aiFixData
      }));
    }
  }, [aiFixData]);

  // AI 에러 수정 통계 쿼리
  const { data: aiFixStats, refetch: refetchAiFixStats } = useQuery({
    queryKey: ['/api/ai-fix/stats'],
    queryFn: () => apiRequest('GET', '/api/ai-fix/stats').then(res => res.json()),
    refetchInterval: 5000, // 5초마다 업데이트
    enabled: activeTab === 'ai-fix'
  });

  // AI 에러 수정 로그 쿼리
  const { data: aiFixLogs, refetch: refetchAiFixLogs } = useQuery({
    queryKey: ['/api/ai-fix/logs'],
    queryFn: () => apiRequest('GET', '/api/ai-fix/logs').then(res => res.json()),
    refetchInterval: 3000, // 3초마다 업데이트
    enabled: activeTab === 'ai-fix'
  });

  // AI 에러 수정 설정 업데이트
  const updateAiFixSettings = useMutation({
    mutationFn: (settings: any) => apiRequest('POST', '/api/ai-fix/settings', settings),
    onSuccess: () => {
      toast({
        title: "성공",
        description: "AI 에러 자동 수정 설정이 저장되었습니다.",
      });
      refetchAiFixSettings();
    },
    onError: () => {
      toast({
        title: "오류",
        description: "설정 저장에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // 수동 검사 진행 상태
  const [checkProgress, setCheckProgress] = useState<{
    isRunning: boolean;
    currentStep: string;
    processedCount: number;
    totalCount: number;
  }>({
    isRunning: false,
    currentStep: '',
    processedCount: 0,
    totalCount: 0
  });

  // 수동 에러 검사 실행
  const runManualCheck = useMutation({
    mutationFn: async () => {
      setCheckProgress({
        isRunning: true,
        currentStep: '에러 검사 시작...',
        processedCount: 0,
        totalCount: 0
      });

      try {
        // 1단계: 검사 시작
        await new Promise(resolve => setTimeout(resolve, 500));
        setCheckProgress(prev => ({ ...prev, currentStep: 'TypeScript 에러 검사 중...' }));
        
        // 2단계: 에러 분석
        await new Promise(resolve => setTimeout(resolve, 1000));
        setCheckProgress(prev => ({ ...prev, currentStep: '에러 분석 및 분류 중...' }));
        
        // 3단계: 실제 API 호출
        console.log('[AI-Fix Client] API 요청 시작');
        
        try {
          const response = await apiRequest('POST', '/api/ai-fix/check');
          console.log('[AI-Fix Client] Raw response:', response);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('[AI-Fix Client] API 요청 실패 응답:', errorText);
            throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          console.log('[AI-Fix Client] API 응답 파싱 완료:', data);
          
          if (data.success === false && data.error) {
            throw new Error(data.message || data.error);
          }
          
          return data;
          
        } catch (apiError) {
          console.error('[AI-Fix Client] API 요청 중 오류:', apiError);
          throw new Error(`API 통신 오류: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
        }
        
        // 4단계: 수정 처리 시뮬레이션
        if (data.processedErrors > 0) {
          setCheckProgress(prev => ({ 
            ...prev, 
            currentStep: '에러 수정 적용 중...', 
            totalCount: data.processedErrors 
          }));
          
          // 처리 진행률 표시
          for (let i = 1; i <= data.processedErrors; i++) {
            await new Promise(resolve => setTimeout(resolve, 200));
            setCheckProgress(prev => ({ 
              ...prev, 
              processedCount: i,
              currentStep: `에러 수정 중... (${i}/${data.processedErrors})`
            }));
          }
        }
        
        setCheckProgress(prev => ({ ...prev, currentStep: '검사 완료' }));
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return data;
      } catch (error) {
        console.error('[AI-Fix Client] 검사 실행 중 오류:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('[AI-Fix] API 성공 응답 받음:', data);
      
      const successCount = data?.successfulFixes || 0;
      const totalErrors = data?.totalErrors || 0;
      const processedErrors = data?.processedErrors || 0;
      
      setCheckProgress({
        isRunning: false,
        currentStep: '',
        processedCount: 0,
        totalCount: 0
      });
      
      toast({
        title: "검사 완료",
        description: `${totalErrors}개 에러 발견, ${processedErrors}개 처리, ${successCount}개 성공적으로 수정됨`,
      });
      
      console.log('[AI-Fix] 수동 검사 완료, 데이터 새로고침 시작...');
      
      // 통계와 로그를 즉시 새로고침
      setTimeout(() => {
        refetchAiFixStats();
        refetchAiFixLogs();
        refetchAiFixSettings();
        console.log('[AI-Fix] 데이터 새로고침 완료');
      }, 500);
    },
    onError: (error: any) => {
      console.error('에러 검사 실행 실패:', error);
      
      setCheckProgress({
        isRunning: false,
        currentStep: '',
        processedCount: 0,
        totalCount: 0
      });
      
      // 더 구체적인 에러 메시지 처리
      let errorMessage = "에러 검사 실행에 실패했습니다.";
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = error.error;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      console.log('[AI-Fix] 에러 메시지 처리:', { error, errorMessage });
      
      toast({
        title: "검사 실패",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // HEX를 HSL로 변환하는 함수
  const hexToHsl = (hex: string): string => {
    // HEX를 RGB로 변환
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        default: h = 0;
      }
      h /= 6;
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  // 색상 변경 핸들러
  const handleColorChange = (colorType: 'primary' | 'secondary', value: string) => {
    console.log(`[색상 변경] ${colorType} 색상:`, value);

    if (colorType === 'primary') {
      setPrimaryColor(value);
      const hslValue = hexToHsl(value);
      console.log(`[색상 변경] Primary HSL:`, hslValue);
      document.documentElement.style.setProperty('--primary', hslValue);

      // 강제로 스타일 재적용
      document.documentElement.classList.add('color-update-trigger');
      setTimeout(() => {
        document.documentElement.classList.remove('color-update-trigger');
      }, 10);
    } else {
      setSecondaryColor(value);
      const hslValue = hexToHsl(value);
      console.log(`[색상 변경] Secondary HSL:`, hslValue);
      document.documentElement.style.setProperty('--secondary', hslValue);

      // 강제로 스타일 재적용
      document.documentElement.classList.add('color-update-trigger');
      setTimeout(() => {
        document.documentElement.classList.remove('color-update-trigger');
      }, 10);
    }
  };

  // 색상 설정 저장
  const saveColorSettings = () => {
    console.log('[색상 저장] 현재 색상:', { primary: primaryColor, secondary: secondaryColor });

    colorChangeMutation.mutate({
      primary: primaryColor,
      secondary: secondaryColor
    });

    // 즉시 CSS 변수 업데이트
    const primaryHsl = hexToHsl(primaryColor);
    const secondaryHsl = hexToHsl(secondaryColor);

    document.documentElement.style.setProperty('--primary', primaryHsl);
    document.documentElement.style.setProperty('--secondary', secondaryHsl);

    console.log('[색상 저장] CSS 변수 업데이트 완료:', { primaryHsl, secondaryHsl });
  };



  // 설정 저장 처리
  const handleSaveSettings = () => {
    setIsLoading(true);

    // 실제 구현 시 API 호출로 대체
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: '설정 저장',
        description: '시스템 설정이 성공적으로 저장되었습니다.',
      });
    }, 1000);
  };

  // 서버 재시작
  const handleRestartServer = () => {
    setIsLoading(true);

    // 실제 구현 시 API 호출로 대체
    setTimeout(() => {
      setIsLoading(false);
      setShowRestartDialog(false);
      toast({
        title: '서버 재시작',
        description: '서버가 성공적으로 재시작되었습니다.',
      });
    }, 3000);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">시스템 설정</h1>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setShowRestartDialog(true)} variant="outline" disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            서버 재시작
          </Button>
          <Button onClick={handleSaveSettings} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            설정 저장
            {isLoading && <RefreshCw className="ml-2 h-4 w-4 animate-spin" />}
          </Button>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>주의</AlertTitle>
        <AlertDescription>
          일부 설정은 변경 후 서버 재시작이 필요합니다. 업무 시간 외에 변경하는 것을 권장합니다.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-6">
        <Card className="h-fit">
          <CardHeader className="py-4">
            <CardTitle className="text-lg">설정 메뉴</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            <div className="space-y-1">
              <Button 
                variant={activeTab === 'general' ? 'default' : 'ghost'} 
                className="w-full justify-start"
                onClick={() => setActiveTab('general')}
              >
                <Cog className="h-4 w-4 mr-2" />
                일반 설정
              </Button>
              <Button 
                variant={activeTab === 'security' ? 'default' : 'ghost'} 
                className="w-full justify-start"
                onClick={() => setActiveTab('security')}
              >
                <Shield className="h-4 w-4 mr-2" />
                보안 설정
              </Button>
              <Button 
                variant={activeTab === 'mail' ? 'default' : 'ghost'} 
                className="w-full justify-start"
                onClick={() => setActiveTab('mail')}
              >
                <Mail className="h-4 w-4 mr-2" />
                메일 설정
              </Button>
              <Button 
                variant={activeTab === 'notifications' ? 'default' : 'ghost'} 
                className="w-full justify-start"
                onClick={() => setActiveTab('notifications')}
              >
                <BellRing className="h-4 w-4 mr-2" />
                알림 설정
              </Button>
              <Button 
                variant={activeTab === 'appearance' ? 'default' : 'ghost'} 
                className="w-full justify-start"
                onClick={() => setActiveTab('appearance')}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                화면 및 로고 설정
              </Button>
              <Button 
                variant={activeTab === 'localization' ? 'default' : 'ghost'} 
                className="w-full justify-start"
                onClick={() => setActiveTab('localization')}
              >
                <Globe className="h-4 w-4 mr-2" />
                지역화 설정
              </Button>
              <Button 
                variant={activeTab === 'database' ? 'default' : 'ghost'} 
                className="w-full justify-start"
                onClick={() => setActiveTab('database')}
              >
                <Database className="h-4 w-4 mr-2" />
                데이터베이스 설정
              </Button>
              <Button 
                variant={activeTab === 'users' ? 'default' : 'ghost'} 
                className="w-full justify-start"
                onClick={() => setActiveTab('users')}
              >
                <Users className="h-4 w-4 mr-2" />
                사용자 설정
              </Button>
              <Button 
                variant={activeTab === 'contents' ? 'default' : 'ghost'} 
                className="w-full justify-start"
                onClick={() => setActiveTab('contents')}
              >
                <FileText className="h-4 w-4 mr-2" />
                콘텐츠 설정
              </Button>
              <Button 
                variant={activeTab === 'chat' ? 'default' : 'ghost'} 
                className="w-full justify-start"
                onClick={() => setActiveTab('chat')}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                채팅 설정
              </Button>
              <Button 
                variant={activeTab === 'ai-fix' ? 'default' : 'ghost'} 
                className="w-full justify-start"
                onClick={() => setActiveTab('ai-fix')}
              >
                <Bot className="h-4 w-4 mr-2" />
                AI 에러 자동 수정
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {activeTab === 'general' && '일반 설정'}
              {activeTab === 'security' && '보안 설정'}
              {activeTab === 'mail' && '메일 설정'}
              {activeTab === 'notifications' && '알림 설정'}
              {activeTab === 'appearance' && '화면 설정'}
              {activeTab === 'localization' && '지역화 설정'}
              {activeTab === 'database' && '데이터베이스 설정'}
              {activeTab === 'users' && '사용자 설정'}
              {activeTab === 'ai-fix' && 'AI 에러 자동 수정'}
              {activeTab === 'contents' && '콘텐츠 설정'}
              {activeTab === 'chat' && '채팅 설정'}
            </CardTitle>
            <CardDescription>
              {activeTab === 'general' && '시스템의 일반적인 설정을 관리합니다.'}
              {activeTab === 'security' && '시스템의 보안 관련 설정을 관리합니다.'}
              {activeTab === 'mail' && '이메일 발송과 관련된 설정을 관리합니다.'}
              {activeTab === 'notifications' && '사용자 알림과 관련된 설정을 관리합니다.'}
              {activeTab === 'appearance' && '사이트 화면과 관련된 설정을 관리합니다.'}
              {activeTab === 'localization' && '언어 및 지역화 관련 설정을 관리합니다.'}
              {activeTab === 'database' && '데이터베이스 관련 설정을 관리합니다.'}
              {activeTab === 'users' && '사용자 계정 관련 설정을 관리합니다.'}
              {activeTab === 'contents' && '콘텐츠 및 미디어 관련 설정을 관리합니다.'}
              {activeTab === 'chat' && '채팅 및 메시징 관련 설정을 관리합니다.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ScrollArea className="h-[500px] pr-4">
              {/* 일반 설정 */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="siteName">사이트 이름</Label>
                    <Input id="siteName" defaultValue="펫에듀 플랫폼" />
                    <p className="text-sm text-muted-foreground">
                      사이트의 공식 이름입니다. 브라우저 탭과 이메일에 표시됩니다.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="siteDescription">사이트 설명</Label>
                    <Textarea id="siteDescription" defaultValue="반려동물 훈련 및 교육을 위한 종합 플랫폼입니다." />
                    <p className="text-sm text-muted-foreground">
                      메타 태그에 사용되는 사이트 설명입니다.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">관리자 이메일</Label>
                    <Input id="adminEmail" type="email" defaultValue="admin@petedu.com" />
                    <p className="text-sm text-muted-foreground">
                      시스템 알림을 받는 주 관리자 이메일입니다.
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">시스템 상태</h3>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="maintenanceMode" className="flex-1 cursor-pointer">
                        <div>유지보수 모드</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          활성화하면 일반 사용자는 사이트에 접근할 수 없게 됩니다.
                        </p>
                      </Label>
                      <Switch id="maintenanceMode" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maintenanceMessage">유지보수 메시지</Label>
                      <Textarea 
                        id="maintenanceMessage" 
                        defaultValue="현재 시스템 유지보수 중입니다. 빠른 시일 내에 서비스를 재개하겠습니다." 
                      />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="debugMode" className="flex-1 cursor-pointer">
                        <div>디버그 모드</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          상세한 오류 정보를 표시합니다. 프로덕션 환경에서는 비활성화하세요.
                        </p>
                      </Label>
                      <Switch id="debugMode" />
                    </div>
                  </div>
                </div>
              )}

              {/* 보안 설정 */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">인증 설정</h3>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="twoFactorAuth" className="flex-1 cursor-pointer">
                        <div>관리자 2단계 인증</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          관리자 계정에 2단계 인증을 필수로 적용합니다.
                        </p>
                      </Label>
                      <Switch id="twoFactorAuth" defaultChecked />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sessionTimeout">세션 타임아웃 (분)</Label>
                      <Input id="sessionTimeout" type="number" defaultValue="30" />
                      <p className="text-sm text-muted-foreground">
                        사용자 비활성 후 세션이 만료되는 시간(분)입니다.
                      </p>
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="passwordPolicy" className="flex-1 cursor-pointer">
                        <div>강력한 비밀번호 정책 적용</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          최소 8자, 대소문자, 숫자, 특수문자를 포함해야 합니다.
                        </p>
                      </Label>
                      <Switch id="passwordPolicy" defaultChecked />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="passwordExpiration">비밀번호 만료 기간 (일)</Label>
                      <Input id="passwordExpiration" type="number" defaultValue="90" />
                      <p className="text-sm text-muted-foreground">
                        0으로 설정하면 만료되지 않습니다.
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">HTTPS 설정</h3>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="forceHTTPS" className="flex-1 cursor-pointer">
                        <div>HTTPS 강제 적용</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          모든 HTTP 요청을 HTTPS로 리다이렉트합니다.
                        </p>
                      </Label>
                      <Switch id="forceHTTPS" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="hsts" className="flex-1 cursor-pointer">
                        <div>HSTS 활성화</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          HTTP Strict Transport Security 활성화
                        </p>
                      </Label>
                      <Switch id="hsts" defaultChecked />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">접근 제어</h3>

                    <div className="space-y-2">
                      <Label htmlFor="allowedIPs">허용 IP 주소</Label>
                      <Textarea 
                        id="allowedIPs" 
                        placeholder="192.168.1.1, 10.0.0.1" 
                        defaultValue=""
                      />
                      <p className="text-sm text-muted-foreground">
                        관리자 페이지 접근을 특정 IP로 제한합니다. 비워두면 모든 IP 허용.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="loginAttempts">최대 로그인 시도 횟수</Label>
                      <Input id="loginAttempts" type="number" defaultValue="5" />
                      <p className="text-sm text-muted-foreground">
                        초과 시 계정이 일시적으로 잠깁니다.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lockoutDuration">계정 잠금 시간 (분)</Label>
                      <Input id="lockoutDuration" type="number" defaultValue="30" />
                    </div>
                  </div>
                </div>
              )}

              {/* 메일 설정 */}
              {activeTab === 'mail' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">SMTP 설정</h3>

                    <div className="space-y-2">
                      <Label htmlFor="smtpHost">SMTP 서버</Label>
                      <Input id="smtpHost" defaultValue="smtp.example.com" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smtpPort">SMTP 포트</Label>
                      <Input id="smtpPort" type="number" defaultValue="587" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smtpUser">SMTP 사용자명</Label>
                      <Input id="smtpUser" defaultValue="noreply@petedu.com" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smtpPassword">SMTP 비밀번호</Label>
                      <Input id="smtpPassword" type="password" defaultValue="************" />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="smtpSsl" className="flex-1 cursor-pointer">
                        <div>SSL 사용</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          SMTP 연결에 SSL 사용
                        </p>
                      </Label>
                      <Switch id="smtpSsl" defaultChecked />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">발신자 정보</h3>

                    <div className="space-y-2">
                      <Label htmlFor="senderName">발신자 이름</Label>
                      <Input id="senderName" defaultValue="펫에듀 플랫폼" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="senderEmail">발신자 이메일</Label>
                      <Input id="senderEmail" type="email" defaultValue="noreply@petedu.com" />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">이메일 알림</h3>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="welcomeEmail" className="flex-1 cursor-pointer">
                        <div>가입 환영 이메일</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          새 사용자 가입 시 환영 이메일 발송
                        </p>
                      </Label>
                      <Switch id="welcomeEmail" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="passwordResetEmail" className="flex-1 cursor-pointer">
                        <div>비밀번호 재설정 이메일</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          비밀번호 재설정 요청 시 이메일 발송
                        </p>
                      </Label>
                      <Switch id="passwordResetEmail" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="courseNotifications" className="flex-1 cursor-pointer">
                        <div>강의 관련 알림</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          새 강의, 수료증 발급 등 강의 관련 알림
                        </p>
                      </Label>
                      <Switch id="courseNotifications" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="adminAlerts" className="flex-1 cursor-pointer">
                        <div>관리자 알림</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          새로운 신고, 시스템 경고 등 관리자 알림
                        </p>
                      </Label>
                      <Switch id="adminAlerts" defaultChecked />
                    </div>
                  </div>
                </div>
              )}

              {/* 알림 설정 */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">인앱 알림</h3>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="courseUpdates" className="flex-1 cursor-pointer">
                        <div>강의 업데이트</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          구독 중인 강의가 업데이트되면 알림
                        </p>
                      </Label>
                      <Switch id="courseUpdates" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="messageNotifications" className="flex-1 cursor-pointer">
                        <div>새 메시지</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          새 메시지 수신 시 알림
                        </p>
                      </Label>
                      <Switch id="messageNotifications" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="commentNotifications" className="flex-1 cursor-pointer">
                        <div>댓글 알림</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          내 글에 댓글이 달리면 알림
                        </p>
                      </Label>
                      <Switch id="commentNotifications" defaultChecked />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notificationRetention">알림 보관 기간 (일)</Label>
                      <Input id="notificationRetention" type="number" defaultValue="30" />
                      <p className="text-sm text-muted-foreground">
                        읽지 않은 알림이 자동으로 삭제되기 전 보관 기간
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">푸시 알림</h3>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="enablePush" className="flex-1 cursor-pointer">
                        <div>푸시 알림 활성화</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          웹 브라우저 푸시 알림 활성화
                        </p>
                      </Label>
                      <Switch id="enablePush" defaultChecked />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vapidPublicKey">VAPID Public Key</Label>
                      <Input id="vapidPublicKey" defaultValue="BLVYfXwbMJ09NeN3z..." />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vapidPrivateKey">VAPID Private Key</Label>
                      <Input id="vapidPrivateKey" type="password" defaultValue="********" />
                    </div>
                  </div>
                </div>
              )}

              {/* 화면 설정 */}
              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">테마 설정</h3>

                    <div className="space-y-2">
                      <Label htmlFor="defaultTheme">기본 테마</Label>
                      <Select defaultValue="system">
                        <SelectTrigger id="defaultTheme">
                          <SelectValue placeholder="테마 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">라이트 모드</SelectItem>
                          <SelectItem value="dark">다크 모드</SelectItem>
                          <SelectItem value="system">시스템 설정 따름</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">
                        사용자 설정이 없을 때 적용되는 기본 테마입니다.
                      </p>
                    </div>

                    <div className="flex items-center justify-between space-x-2">
```text
                      <Label htmlFor="userThemeToggle" className="flex-1 cursor-pointer">
                        <div>사용자 테마 선택 허용</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          사용자가 사이트 테마를 직접 변경할 수 있도록 합니다.
                        </p>
                      </Label>
                      <Switch id="userThemeToggle" defaultChecked />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="primaryColor">기본 색상</Label>
                      <div className="flex items-center space-x-2">
                        <Input 
                          id="primaryColor" 
                          type="color" 
                          value={primaryColor}
                          onChange={(e) => handleColorChange('primary', e.target.value)}
                          className="w-16 h-10" 
                        />
                        <Input 
                          value={primaryColor}
                          onChange={(e) => handleColorChange('primary', e.target.value)}
                          className="flex-1" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="secondaryColor">보조 색상</Label>
                      <div className="flex items-center space-x-2">
                        <Input 
                          id="secondaryColor" 
                          type="color" 
                          value={secondaryColor}
                          onChange={(e) => handleColorChange('secondary', e.target.value)}
                          className="w-16 h-10" 
                        />
                        <Input 
                          value={secondaryColor}
                          onChange={(e) => handleColorChange('secondary', e.target.value)}
                          className="flex-1" 
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button 
                        onClick={saveColorSettings}
                        disabled={colorChangeMutation.isPending}
                        className="flex items-center gap-2"
                      >
                        {colorChangeMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        색상 설정 저장
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-6">
                    {/* 헤더와 일괄 관리 */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold flex items-center gap-2">
                        <ImageIcon className="h-6 w-6 text-primary" />
                        로고 설정
                      </h3>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            if (confirm('모든 로고를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                              ['main', 'mainDark', 'compact', 'compactDark', 'favicon'].forEach(type => {
                                if (currentLogos?.[type as keyof typeof currentLogos]) {
                                  handleLogoDelete(type);
                                }
                              });
                            }
                          }}
                          className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          전체 삭제
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => refetchLogos()}
                          className="text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400"
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          새로고침
                        </Button>
                      </div>
                    </div>

                    {/* 로고 상태 개요 */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {[
                        { key: 'main', label: '메인', color: 'bg-blue-100 text-blue-800' },
                        { key: 'mainDark', label: '메인(다크)', color: 'bg-slate-100 text-slate-800' },
                        { key: 'compact', label: '컴팩트', color: 'bg-green-100 text-green-800' },
                        { key: 'compactDark', label: '컴팩트(다크)', color: 'bg-primary/10 text-primary' },
                        { key: 'favicon', label: '파비콘', color: 'bg-orange-100 text-orange-800' }
                      ].map((logo) => (
                        <div key={logo.key} className="text-center p-3 border rounded-lg bg-card">
                          <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${logo.color}`}>
                            {logo.label}
                          </div>
                          <div className="mt-2 text-sm">
                            {currentLogos?.[logo.key as keyof typeof currentLogos] ? (
                              <span className="text-green-600 font-medium">✓ 등록됨</span>
                            ) : (
                              <span className="text-gray-400">미등록</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 메인 로고 (라이트 모드) - 향상된 UI */}
                    <Card className="border-2 border-blue-200 bg-blue-50/30">
                      <CardHeader className="pb-3">
                        <div className="flex items-center space-x-2">
                          <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
                          <CardTitle className="text-lg">메인 로고 (라이트 모드)</CardTitle>
                          <div className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">180×60px 권장</div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-start space-x-6">
                          <div className="space-y-2">
                            <div className="h-20 w-40 bg-white rounded-lg border-2 border-dashed border-blue-300 flex items-center justify-center group hover:border-blue-500 transition-all duration-200 hover:shadow-md">
                              {currentLogos?.main ? (
                                <img 
                                  src={currentLogos.main} 
                                  alt="메인 로고" 
                                  className="max-h-full max-w-full object-contain rounded"
                                />
                              ) : (
                                <div className="text-center text-blue-400 group-hover:text-blue-600 transition-colors">
                                  <ImageIcon className="h-8 w-8 mx-auto mb-1" />
                                  <div className="text-xs font-medium">로고 업로드</div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex-1 space-y-3">
                            <ImageUpload
                              value={currentLogos?.main || ''}
                              onChange={(url) => {
                                if (url) {
                                  handleLogoUpload('main', url);
                                }
                              }}
                              maxSize={5}
                              label="메인 로고 업로드"
                              className="w-full"
                            />
                            <div className="flex flex-wrap gap-2">
                              {currentLogos?.main && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleLogoDelete('main')}
                                    disabled={logoDeleteMutation.isPending}
                                    className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    삭제
                                  </Button>

                                </>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              사이드바 확장 시 표시되는 메인 로고입니다. PNG, JPG, SVG 형식을 지원합니다.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 메인 로고 (다크 모드) - 향상된 UI */}
                    <Card className="border-2 border-slate-200 bg-slate-50/30 dark:border-slate-700 dark:bg-slate-800/30">
                      <CardHeader className="pb-3">
                        <div className="flex items-center space-x-2">
                          <div className="h-3 w-3 bg-slate-600 rounded-full"></div>
                          <CardTitle className="text-lg">메인 로고 (다크 모드)</CardTitle>
                          <div className="text-xs px-2 py-1 bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200 rounded-full">180×60px 권장</div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-start space-x-6">
                          <div className="space-y-2">
                            <div className="h-20 w-40 bg-slate-800 rounded-lg border-2 border-dashed border-slate-400 flex items-center justify-center group hover:border-slate-500 transition-all duration-200 hover:shadow-md">
                              {currentLogos?.mainDark ? (
                                <img 
                                  src={currentLogos.mainDark} 
                                  alt="메인 로고 (다크)" 
                                  className="max-h-full max-w-full object-contain rounded"
                                />
                              ) : (
                                <div className="text-center text-slate-400 group-hover:text-slate-300 transition-colors">
                                  <ImageIcon className="h-8 w-8 mx-auto mb-1" />
                                  <div className="text-xs font-medium">로고 업로드</div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex-1 space-y-3">
                            <ImageUpload
                              value={currentLogos?.mainDark || ''}
                              onChange={(url) => {
                                if (url) {
                                  handleLogoUpload('mainDark', url);
                              }
                            }}
                            maxSize={5}
                            label="다크 로고 업로드"
                            className="w-full"
                          />
                          <div className="flex flex-wrap gap-2">
                            {currentLogos?.mainDark && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleLogoDelete('mainDark')}
                                  disabled={logoDeleteMutation.isPending}
                                  className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  삭제
                                </Button>

                              </>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            다크 모드에서 사이드바 확장 시 표시되는 로고입니다. PNG, JPG, SVG 형식을 지원합니다.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                    {/* 컴팩트 로고 (라이트 모드) - 향상된 UI */}
                    <Card className="border-2 border-green-200 bg-green-50/30">
                      <CardHeader className="pb-3">
                        <div className="flex items-center space-x-2">
                          <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                          <CardTitle className="text-lg">컴팩트 로고 (라이트 모드)</CardTitle>
                          <div className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">40×40px 권장</div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-start space-x-6">
                          <div className="space-y-2">
                            <div className="h-16 w-16 bg-white rounded-lg border-2 border-dashed border-green-300 flex items-center justify-center group hover:border-green-500 transition-all duration-200 hover:shadow-md">
                              {currentLogos?.compact ? (
                                <img 
                                  src={currentLogos.compact} 
                                  alt="컴팩트 로고" 
                                  className="max-h-full max-w-full object-contain rounded"
                                />
                              ) : (
                                <div className="text-center text-green-400 group-hover:text-green-600 transition-colors">
                                  <ImageIcon className="h-6 w-6 mx-auto mb-1" />
                                  <div className="text-xs font-medium">로고 업로드</div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex-1 space-y-3">
                            <ImageUpload
                              value={currentLogos?.compact || ''}
                              onChange={(url) => {
                                if (url) {
                                  handleLogoUpload('compact', url);
                                }
                              }}
                              maxSize={5}
                              label="컴팩트 로고 업로드"
                              className="w-full"
                            />
                            <div className="flex flex-wrap gap-2">
                              {currentLogos?.compact && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleLogoDelete('compact')}
                                    disabled={logoDeleteMutation.isPending}
                                    className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    삭제
                                  </Button>

                                </>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              사이드바 축소 시 표시되는 작은 로고입니다. 정사각형 비율을 권장합니다.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 컴팩트 로고 (다크 모드) - 향상된 UI */}
                    <Card className="border-2 border-primary/30 bg-primary/5">
                      <CardHeader className="pb-3">
                        <div className="flex items-center space-x-2">
                          <div className="h-3 w-3 bg-primary/50 rounded-full"></div>
                          <CardTitle className="text-lg">컴팩트 로고 (다크 모드)</CardTitle>
                          <div className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">40×40px 권장</div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-start space-x-6">
                          <div className="space-y-2">
                            <div className="h-16 w-16 bg-slate-800 rounded-lg border-2 border-dashed border-primary/50 flex items-center justify-center group hover:border-primary transition-all duration-200 hover:shadow-md">
                              {currentLogos?.compactDark ? (
                                <img 
                                  src={currentLogos.compactDark} 
                                  alt="컴팩트 로고 (다크)" 
                                  className="max-h-full max-w-full object-contain rounded"
                                />
                              ) : (
                                <div className="text-center text-primary group-hover:text-primary/80 transition-colors">
                                  <ImageIcon className="h-6 w-6 mx-auto mb-1" />
                                  <div className="text-xs font-medium">로고 업로드</div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex-1 space-y-3">
                            <ImageUpload
                              value={currentLogos?.compactDark || ''}
                              onChange={(url) => {
                                if (url) {
                                  handleLogoUpload('compactDark', url);
                                }
                              }}
                              maxSize={5}
                              label="컴팩트 다크 로고 업로드"
                              className="w-full"
                            />
                            <div className="flex flex-wrap gap-2">
                              {currentLogos?.compactDark && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleLogoDelete('compactDark')}
                                    disabled={logoDeleteMutation.isPending}
                                    className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    삭제
                                  </Button>

                                </>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              다크 모드에서 사이드바 축소 시 표시되는 작은 로고입니다.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 파비콘 - 향상된 UI */}
                    <Card className="border-2 border-orange-200 bg-orange-50/30">
                      <CardHeader className="pb-3">
                        <div className="flex items-center space-x-2">
                          <div className="h-3 w-3 bg-orange-500 rounded-full"></div>
                          <CardTitle className="text-lg">파비콘</CardTitle>
                          <div className="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded-full">32×32px 권장</div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-start space-x-6">
                          <div className="space-y-2">
                            <div className="h-12 w-12 bg-white rounded-lg border-2 border-dashed border-orange-300 flex items-center justify-center group hover:border-orange-500 transition-all duration-200 hover:shadow-md">
                              {currentLogos?.favicon ? (
                                <img 
                                  src={currentLogos.favicon} 
                                  alt="파비콘" 
                                  className="max-h-full max-w-full object-contain rounded"
                                />
                              ) : (
                                <div className="text-center text-orange-400 group-hover:text-orange-600 transition-colors">
                                  <ImageIcon className="h-5 w-5 mx-auto mb-0.5" />
                                  <div className="text-xs font-medium">ICO</div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex-1 space-y-3">
                            <ImageUpload
                              value={currentLogos?.favicon || ''}
                              onChange={(url) => {
                                if (url) {
                                  handleLogoUpload('favicon', url);
                                }
                              }}
                              maxSize={5}
                              label="파비콘 업로드"
                              className="w-full"
                            />
                            <div className="flex flex-wrap gap-2">
                              {currentLogos?.favicon && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleLogoDelete('favicon')}
                                    disabled={logoDeleteMutation.isPending}
                                    className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    삭제
                                  </Button>

                                </>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              브라우저 탭에 표시되는 파비콘입니다. ICO, PNG 형식을 지원합니다.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 로고 관리 요약 */}
                    <Alert className="border-blue-200 bg-blue-50/50">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <AlertTitle className="text-blue-900">로고 관리 완료 ✨</AlertTitle>
                      <AlertDescription className="text-blue-800">
                        <div className="space-y-2">
                          <p>로고 업로드가 완료되면 즉시 시스템에 반영됩니다.</p>
                          <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                            <div>• 메인 로고: 사이드바 확장 시 표시</div>
                            <div>• 컴팩트 로고: 사이드바 축소 시 표시</div>
                            <div>• 다크 모드: 어두운 테마에서 사용</div>
                            <div>• 파비콘: 브라우저 탭에 표시</div>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  </div>


                </div>
              )}

              {/* 지역화 설정 */}
              {activeTab === 'localization' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">언어 설정</h3>

                    <div className="space-y-2">
                      <Label htmlFor="defaultLanguage">기본 언어</Label>
                      <Select defaultValue="ko">
                        <SelectTrigger id="defaultLanguage">
                          <SelectValue placeholder="언어 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ko">한국어</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="ja">日本語</SelectItem>
                          <SelectItem value="zh">中文</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">
                        사용자 설정이 없을 때 적용되는 기본 언어입니다.
                      </p>
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="multiLanguage" className="flex-1 cursor-pointer">
                        <div>다국어 지원 활성화</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          사용자가 언어를 선택할 수 있게 합니다.
                        </p>
                      </Label>
                      <Switch id="multiLanguage" defaultChecked />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="availableLanguages">활성화된 언어</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="lang-ko" defaultChecked />
                          <Label htmlFor="lang-ko">한국어</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="lang-en" defaultChecked />
                          <Label htmlFor="lang-en">English</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="lang-ja" defaultChecked />
                          <Label htmlFor="lang-ja">日本語</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="lang-zh" defaultChecked />
                          <Label htmlFor="lang-zh">中文</Label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">날짜 및 시간 형식</h3>

                    <div className="space-y-2">
                      <Label htmlFor="dateFormat">날짜 형식</Label>
                      <Select defaultValue="yyyy-MM-dd">
                        <SelectTrigger id="dateFormat">
                          <SelectValue placeholder="날짜 형식 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                          <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                          <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                          <SelectItem value="yyyy년 MM월 dd일">YYYY년 MM월 DD일</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timeFormat">시간 형식</Label>
                      <Select defaultValue="HH:mm">
                        <SelectTrigger id="timeFormat">
                          <SelectValue placeholder="시간 형식 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HH:mm">24시간 (HH:MM)</SelectItem>
                          <SelectItem value="hh:mm a">12시간 (HH:MM AM/PM)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timezone">기본 시간대</Label>
                      <Select defaultValue="Asia/Seoul">
                        <SelectTrigger id="timezone">
                          <SelectValue placeholder="시간대 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asia/Seoul">서울 (GMT+9)</SelectItem>
                          <SelectItem value="America/New_York">뉴욕 (GMT-5/4)</SelectItem>
                          <SelectItem value="Europe/London">런던 (GMT+0/1)</SelectItem>
                          <SelectItem value="Europe/Paris">파리 (GMT+1/2)</SelectItem>
                          <SelectItem value="Asia/Tokyo">도쿄 (GMT+9)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* 데이터베이스 설정 */}
              {activeTab === 'database' && (
                <div className="space-y-6">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>주의</AlertTitle>
                    <AlertDescription>
                      데이터베이스 설정을 변경하면 서버를 재시작해야 합니다. 데이터베이스 연결 정보를 변경하기 전에 백업을 확인하세요.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">데이터베이스 연결</h3>

                    <div className="space-y-2">
                      <Label htmlFor="dbHost">데이터베이스 호스트</Label>
                      <Input id="dbHost" defaultValue="localhost" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dbPort">포트</Label>
                      <Input id="dbPort" type="number" defaultValue="5432" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dbName">데이터베이스명</Label>
                      <Input id="dbName" defaultValue="petedu" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dbUser">사용자명</Label>
                      <Input id="dbUser" defaultValue="petedu_user" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dbPassword">비밀번호</Label>
                      <Input id="dbPassword" type="password" defaultValue="********" />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">백업 설정</h3>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="autoBackup" className="flex-1 cursor-pointer">
                        <div>자동 백업 활성화</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          일정에 따라 데이터베이스를 자동 백업합니다.
                        </p>
                      </Label>
                      <Switch id="autoBackup" defaultChecked />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="backupSchedule">백업 주기</Label>
                      <Select defaultValue="daily">
                        <SelectTrigger id="backupSchedule">
                          <SelectValue placeholder="백업 주기 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">매시간</SelectItem>
                          <SelectItem value="daily">매일</SelectItem>
                          <SelectItem value="weekly">매주</SelectItem>
                          <SelectItem value="monthly">매월</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="backupRetention">백업 보관 기간 (일)</Label>
                      <Input id="backupRetention" type="number" defaultValue="30" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="backupLocation">백업 저장 경로</Label>
                      <Input id="backupLocation" defaultValue="/var/backups/petedu" />
                    </div>

                    <Button variant="outline">
                      <Database className="h-4 w-4 mr-2" />
                      지금 백업 실행
                    </Button>
                  </div>
                </div>
              )}

              {/* 사용자 설정 */}
              {activeTab === 'users' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">사용자 등록 설정</h3>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="allowRegistration" className="flex-1 cursor-pointer">
                        <div>새 사용자 등록 허용</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          비활성화하면 새 회원가입이 불가능합니다.
                        </p>
                      </Label>
                      <Switch id="allowRegistration" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="emailVerification" className="flex-1 cursor-pointer">
                        <div>이메일 인증 필수</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          가입 후 이메일 인증을 요구합니다.
                        </p>
                      </Label>
                      <Switch id="emailVerification" defaultChecked />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="defaultUserRole">기본 사용자 역할</Label>
                      <Select defaultValue="user">
                        <SelectTrigger id="defaultUserRole">
                          <SelectValue placeholder="역할 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pet-owner">반려동물 주인</SelectItem>
                          <SelectItem value="user">일반 사용자</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">소셜 로그인</h3>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="googleLogin" className="flex-1 cursor-pointer">
                        <div>Google 로그인</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          Google 계정으로 로그인 허용
                        </p>
                      </Label>
                      <Switch id="googleLogin" defaultChecked />
                    </div>

                    <div className="space-y-2 ml-6">
                      <Label htmlFor="googleClientId">Google 클라이언트 ID</Label>
                      <Input id="googleClientId" defaultValue="123456789-abcdefg.apps.googleusercontent.com" />
                    </div>

                    <div className="space-y-2 ml-6">
                      <Label htmlFor="googleClientSecret">Google 클라이언트 시크릿</Label>
                      <Input id="googleClientSecret" type="password" defaultValue="********" />
                    </div>

                    <Separator className="my-2" />

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="kakaoLogin" className="flex-1 cursor-pointer">
                        <div>카카오 로그인</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          카카오 계정으로 로그인 허용
                        </p>
                      </Label>
                      <Switch id="kakaoLogin" defaultChecked />
                    </div>

                    <div className="space-y-2 ml-6">
                      <Label htmlFor="kakaoClientId">카카오 앱 키</Label>
                      <Input id="kakaoClientId" defaultValue="abcdef1234567890" />
                    </div>

                    <div className="space-y-2 ml-6">
                      <Label htmlFor="kakaoClientSecret">카카오 시크릿 키</Label>
                      <Input id="kakaoClientSecret" type="password" defaultValue="********" />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">프로필 설정</h3>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="allowProfileCustomization" className="flex-1 cursor-pointer">
                        <div>프로필 커스터마이징 허용</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          사용자가 프로필 정보를 변경할 수 있도록 허용
                        </p>
                      </Label>
                      <Switch id="allowProfileCustomization" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="allowAvatarUpload" className="flex-1 cursor-pointer">
                        <div>프로필 이미지 업로드 허용</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          사용자가 프로필 이미지를 업로드할 수 있도록 허용
                        </p>
                      </Label>
                      <Switch id="allowAvatarUpload" defaultChecked />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxAvatarSize">최대 이미지 크기 (KB)</Label>
                      <Input id="maxAvatarSize" type="number" defaultValue="1024" />
                    </div>
                  </div>
                </div>
              )}

              {/* 콘텐츠 설정 */}
              {activeTab === 'contents' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">업로드 설정</h3>

                    <div className="space-y-2">
                      <Label htmlFor="maxUploadSize">최대 파일 크기 (MB)</Label>
                      <Input id="maxUploadSize" type="number" defaultValue="50" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="allowedFileTypes">허용된 파일 형식</Label>
                      <Input 
                        id="allowedFileTypes" 
                        defaultValue="jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,mp4,mov,avi"
                      />
                      <p className="text-sm text-muted-foreground">
                        콤마로 구분된 파일 확장자
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="uploadPath">업로드 경로</Label>
                      <Input 
                        id="uploadPath" 
                        defaultValue="/var/www/uploads"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">비디오 설정</h3>

                    <div className="space-y-2">
                      <Label htmlFor="videoProvider">기본 비디오 호스팅</Label>
                      <Select defaultValue="self">
                        <SelectTrigger id="videoProvider">
                          <SelectValue placeholder="비디오 호스팅 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="self">자체 호스팅</SelectItem>
                          <SelectItem value="youtube">YouTube</SelectItem>
                          <SelectItem value="vimeo">Vimeo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="hlsStreaming" className="flex-1 cursor-pointer">
                        <div>HLS 스트리밍 사용</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          HTTP Live Streaming 활성화
                        </p>
                      </Label>
                      <Switch id="hlsStreaming" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="autoTranscode" className="flex-1 cursor-pointer">
                        <div>자동 트랜스코딩</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          업로드된 비디오를 다양한 해상도로 자동 변환
                        </p>
                      </Label>
                      <Switch id="autoTranscode" defaultChecked />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">이미지 처리</h3>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="imageOptimization" className="flex-1 cursor-pointer">
                        <div>이미지 자동 최적화</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          업로드된 이미지를 자동으로 최적화
                        </p>
                      </Label>
                      <Switch id="imageOptimization" defaultChecked />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxImageWidth">최대 이미지 너비 (픽셀)</Label>
                      <Input id="maxImageWidth" type="number" defaultValue="1920" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="thumbnailSizes">썸네일 크기</Label>
                      <Input 
                        id="thumbnailSizes" 
                        defaultValue="150x150,300x200,600x400"
                      />
                      <p className="text-sm text-muted-foreground">
                        쉼표로 구분된 너비x높이 형식
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 채팅 설정 */}
              {activeTab === 'chat' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">채팅 기능</h3>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="enableChat" className="flex-1 cursor-pointer">
                        <div>채팅 기능 활성화</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          사용자 간 실시간 채팅 활성화
                        </p>
                      </Label>
                      <Switch id="enableChat" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="groupChats" className="flex-1 cursor-pointer">
                        <div>그룹 채팅 허용</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          3명 이상의 사용자가 참여하는 그룹 채팅 허용
                        </p>
                      </Label>
                      <Switch id="groupChats" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="fileSharing" className="flex-1 cursor-pointer">
                        <div>파일 공유 허용</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          채팅에서 파일 공유 허용
                        </p>
                      </Label>
                      <Switch id="fileSharing" defaultChecked />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxAttachmentSize">최대 첨부 파일 크기 (MB)</Label>
                      <Input id="maxAttachmentSize" type="number" defaultValue="10" />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">메시지 관리</h3>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="messageModeration" className="flex-1 cursor-pointer">
                        <div>메시지 중재</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          부적절한 메시지 필터링 활성화
                        </p>
                      </Label>
                      <Switch id="messageModeration" defaultChecked />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bannedWords">금지어 목록</Label>
                      <Textarea 
                        id="bannedWords" 
                        placeholder="쉼표로 구분된 금지어"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="messageHistory">메시지 보관 기간 (일)</Label>
                      <Input id="messageHistory" type="number" defaultValue="90" />
                      <p className="text-sm text-muted-foreground">
                        0으로 설정하면 영구 보관
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">화상 채팅</h3>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="videoChat" className="flex-1 cursor-pointer">
                        <div>화상 채팅 활성화</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          훈련사-견주 간 화상 채팅 허용
                        </p>
                      </Label>
                      <Switch id="videoChat" defaultChecked />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="videoChatProvider">화상 채팅 제공자</Label>
                      <Select defaultValue="zoom">
                        <SelectTrigger id="videoChatProvider">
                          <SelectValue placeholder="제공자 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="zoom">Zoom</SelectItem>
                          <SelectItem value="webrtc">WebRTC (자체 호스팅)</SelectItem>
                          <SelectItem value="googlemeet">Google Meet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="zoomApiKey">Zoom API 키</Label>
                      <Input id="zoomApiKey" defaultValue="abc123def456ghi" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="zoomApiSecret">Zoom API 시크릿</Label>
                      <Input id="zoomApiSecret" type="password" defaultValue="********" />
                    </div>
                  </div>
                </div>
              )}

              {/* AI 에러 자동 수정 */}
              {activeTab === 'ai-fix' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">AI 자동 수정 설정</h3>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="aiAutoFix" className="flex-1 cursor-pointer">
                        <div>AI 에러 자동 수정 활성화</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          시스템에서 발생하는 에러를 AI가 자동으로 감지하고 수정합니다
                        </p>
                      </Label>
                      <Switch 
                        id="aiAutoFix" 
                        checked={aiFixSettings.isEnabled}
                        onCheckedChange={(checked) => {
                          setAiFixSettings(prev => ({ ...prev, isEnabled: checked }));
                          updateAiFixSettings.mutate({ isEnabled: checked });
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="aiRealTimeMonitoring" className="flex-1 cursor-pointer">
                        <div>실시간 모니터링</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          코드 변경 시 실시간으로 에러를 감지하고 수정합니다
                        </p>
                      </Label>
                      <Switch 
                        id="aiRealTimeMonitoring" 
                        checked={aiFixSettings.isRealTimeMonitoring}
                        onCheckedChange={(checked) => {
                          setAiFixSettings(prev => ({ ...prev, isRealTimeMonitoring: checked }));
                          updateAiFixSettings.mutate({ isRealTimeMonitoring: checked });
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="aiNotifications" className="flex-1 cursor-pointer">
                        <div>수정 알림</div>
                        <p className="text-sm font-normal text-muted-foreground">
                          AI가 에러를 수정했을 때 관리자에게 알림을 전송합니다
                        </p>
                      </Label>
                      <Switch id="aiNotifications" defaultChecked />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">수정 범위 설정</h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="syntaxErrors" defaultChecked className="rounded" />
                        <Label htmlFor="syntaxErrors">문법 에러</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="typeErrors" defaultChecked className="rounded" />
                        <Label htmlFor="typeErrors">타입 에러</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="importErrors" defaultChecked className="rounded" />
                        <Label htmlFor="importErrors">Import 에러</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="lintingErrors" defaultChecked className="rounded" />
                        <Label htmlFor="lintingErrors">린팅 에러</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="runtimeErrors" className="rounded" />
                        <Label htmlFor="runtimeErrors">런타임 에러</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="performanceIssues" className="rounded" />
                        <Label htmlFor="performanceIssues">성능 문제</Label>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">AI 모델 설정</h3>

                    <div className="space-y-2">
                      <Label htmlFor="aiModel">사용할 AI 모델</Label>
                      <Select defaultValue="claude-4-sonnet">
                        <SelectTrigger id="aiModel">
                          <SelectValue placeholder="AI 모델 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="claude-4-sonnet">Claude 4.0 Sonnet</SelectItem>
                          <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                          <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="aiApiKey">AI API 키</Label>
                      <Input id="aiApiKey" type="password" defaultValue="sk-ant-api03-***" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxRetries">최대 재시도 횟수</Label>
                      <Input id="maxRetries" type="number" defaultValue="3" min="1" max="10" />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">수정 내역 및 통계</h3>

                    <div className="grid grid-cols-4 gap-4">
                      <Card className="p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {aiFixStats?.todayFixed || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">오늘 처리된 에러</div>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {aiFixStats?.totalFixed || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">총 처리된 에러</div>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {aiFixStats?.realProcessed?.total || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">실제 수정된 파일</div>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">
                            {aiFixStats?.successRate || '0'}%
                          </div>
                          <div className="text-sm text-muted-foreground">수정 성공률</div>
                        </div>
                      </Card>
                    </div>

                    <div className="space-y-2">
                      <Label>최근 수정 내역</Label>
                      <div className="max-h-32 overflow-y-auto border rounded-md p-3 space-y-2">
                        {aiFixLogs && aiFixLogs.length > 0 ? (
                          aiFixLogs.map((log: any) => (
                            <div key={log.id} className="text-sm">
                              <span className={`font-medium ${log.success ? 'text-green-600' : 'text-red-600'}`}>
                                [{log.success ? '수정완료' : '수정실패'}]
                              </span>
                              <span className="ml-2">{log.errorType} 에러 - {log.originalError.substring(0, 50)}...</span>
                              <span className="text-muted-foreground ml-2">
                                {new Date(log.timestamp).toLocaleString('ko-KR')}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-muted-foreground">아직 수정된 에러가 없습니다.</div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => runManualCheck.mutate()}
                          disabled={runManualCheck.isPending || checkProgress.isRunning}
                          className="relative"
                        >
                          {checkProgress.isRunning ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          {checkProgress.isRunning ? '검사 진행 중...' : '수동 검사 실행'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            window.open('/api/ai-fix/logs/download', '_blank');
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          수정 로그 다운로드
                        </Button>
                      </div>

                      {/* 진행 상황 표시 */}
                      {checkProgress.isRunning && (
                        <Card className="p-4 bg-blue-50 border-blue-200">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                              <span className="text-sm font-medium text-blue-800">
                                {checkProgress.currentStep}
                              </span>
                            </div>
                            
                            {checkProgress.totalCount > 0 && (
                              <div className="space-y-2">
                                <div className="flex justify-between text-xs text-blue-600">
                                  <span>진행률</span>
                                  <span>{checkProgress.processedCount}/{checkProgress.totalCount}</span>
                                </div>
                                <div className="w-full bg-blue-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                    style={{ 
                                      width: `${(checkProgress.processedCount / checkProgress.totalCount) * 100}%` 
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 로고 설정 탭 제거 - appearance 탭으로 통합 완료 */}
            </ScrollArea>
          </CardContent>
          <CardFooter className="border-t px-6 py-4 flex justify-between">
            <Button variant="outline" onClick={() => setActiveTab('general')}>
              기본 설정으로 돌아가기
            </Button>
            <Button onClick={handleSaveSettings} disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              설정 저장
              {isLoading && <RefreshCw className="ml-2 h-4 w-4 animate-spin" />}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* 서버 재시작 확인 대화상자 */}
      <Dialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>서버 재시작 확인</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>서버를 재시작하면 현재 진행 중인 모든 활동이 일시적으로 중단됩니다.</p>
            <p className="mt-2 text-muted-foreground">
              이 작업은 약 30초 정도 소요됩니다. 계속하시겠습니까?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestartDialog(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleRestartServer} disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  재시작 중...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  재시작
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}