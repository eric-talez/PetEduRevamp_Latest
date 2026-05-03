import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, 
  Video, 
  Brain, 
  CheckCircle, 
  AlertCircle, 
  Phone, 
  Mail,
  Star,
  Clock,
  Target,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AnalysisResult {
  success: boolean;
  analysis: string;
  recommendations: Array<{
    title: string;
    description: string;
    priority: string;
    estimatedDuration: string;
  }>;
  nextSteps: Array<{
    step: number;
    title: string;
    description: string;
    action: string;
  }>;
  note?: string;
}

interface ConsultationResult {
  success: boolean;
  consultationId: string;
  message: string;
  estimatedContactTime: string;
  nextActions: string[];
}

export default function TalezExperiencePage() {
  const [currentStep, setCurrentStep] = useState<'upload' | 'analyzing' | 'results' | 'consultation'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [consultationData, setConsultationData] = useState({
    questions: '',
    name: '',
    phone: '',
    email: ''
  });
  const [consultationResult, setConsultationResult] = useState<ConsultationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 파일 크기 체크 (50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "파일 크기 초과",
          description: "50MB 이하의 영상 파일만 업로드 가능합니다.",
          variant: "destructive"
        });
        return;
      }

      // 파일 형식 체크
      const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "지원하지 않는 파일 형식",
          description: "MP4, AVI, MOV 파일만 업로드 가능합니다.",
          variant: "destructive"
        });
        return;
      }

      setSelectedFile(file);
    }
  }, [toast]);

  const uploadAndAnalyze = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setCurrentStep('analyzing');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', selectedFile);

      // 진행률 시뮬레이션
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const response = await fetch('/api/experience/analyze-video', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error('분석 요청 실패');
      }

      const result: AnalysisResult = await response.json();
      setAnalysisResult(result);
      setCurrentStep('results');

      toast({
        title: "분석 완료",
        description: "영상 분석이 성공적으로 완료되었습니다!",
      });

    } catch (error) {
      console.error('분석 오류:', error);
      toast({
        title: "분석 실패",
        description: "영상 분석 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
      setCurrentStep('upload');
    } finally {
      setIsLoading(false);
    }
  };

  const submitConsultation = async () => {
    if (!consultationData.name || !consultationData.phone) {
      toast({
        title: "필수 정보 누락",
        description: "이름과 연락처를 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/experience/consultation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          analysis: analysisResult?.analysis,
          userQuestions: consultationData.questions,
          contactInfo: {
            name: consultationData.name,
            phone: consultationData.phone,
            email: consultationData.email
          }
        })
      });

      if (!response.ok) {
        throw new Error('상담 요청 실패');
      }

      const result: ConsultationResult = await response.json();
      setConsultationResult(result);
      setCurrentStep('consultation');

      toast({
        title: "상담 요청 완료",
        description: "전문가가 곧 연락드릴 예정입니다!",
      });

    } catch (error) {
      console.error('상담 요청 오류:', error);
      toast({
        title: "요청 실패",
        description: "상담 요청 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case '높음': return 'bg-destructive/10 text-destructive';
      case '중간': return 'bg-warning/10 text-warning';
      default: return 'bg-success/10 text-success';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 헤더 섹션 */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <Video className="h-8 w-8 text-primary mr-3" />
          <h1 className="text-3xl font-bold">TALEZ 체험 서비스</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          AI 영상 분석으로 우리 강아지를 미리 체험해보세요
        </p>
        <div className="flex items-center justify-center gap-6 mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Zap className="h-4 w-4" />
            무료 체험
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            즉시 분석
          </div>
          <div className="flex items-center gap-1">
            <Target className="h-4 w-4" />
            전문가 상담
          </div>
        </div>
      </div>

      {/* 진행 단계 표시 */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center ${currentStep === 'upload' ? 'text-primary' : currentStep === 'analyzing' || currentStep === 'results' || currentStep === 'consultation' ? 'text-success' : 'text-muted-foreground'}`}>
            <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center mr-2">
              {currentStep === 'analyzing' || currentStep === 'results' || currentStep === 'consultation' ? <CheckCircle className="h-5 w-5" /> : '1'}
            </div>
            영상 업로드
          </div>
          <div className="w-8 h-px bg-border"></div>
          <div className={`flex items-center ${currentStep === 'analyzing' ? 'text-primary' : currentStep === 'results' || currentStep === 'consultation' ? 'text-success' : 'text-muted-foreground'}`}>
            <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center mr-2">
              {currentStep === 'results' || currentStep === 'consultation' ? <CheckCircle className="h-5 w-5" /> : '2'}
            </div>
            AI 분석
          </div>
          <div className="w-8 h-px bg-border"></div>
          <div className={`flex items-center ${currentStep === 'results' ? 'text-primary' : currentStep === 'consultation' ? 'text-success' : 'text-muted-foreground'}`}>
            <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center mr-2">
              {currentStep === 'consultation' ? <CheckCircle className="h-5 w-5" /> : '3'}
            </div>
            결과 확인
          </div>
        </div>
      </div>

      {/* 업로드 단계 */}
      {currentStep === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              강아지 영상 업로드
            </CardTitle>
            <CardDescription>
              우리 강아지의 평소 모습이 담긴 영상을 업로드해주세요. AI가 행동 패턴을 분석해드립니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <input
                type="file"
                accept="video/mp4,video/avi,video/mov,video/quicktime"
                onChange={handleFileSelect}
                className="hidden"
                id="video-upload"
              />
              <label htmlFor="video-upload" className="cursor-pointer">
                <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">
                  클릭하여 영상 파일 선택
                </p>
                <p className="text-sm text-muted-foreground">
                  MP4, AVI, MOV 파일 (최대 50MB)
                </p>
              </label>
            </div>

            {selectedFile && (
              <Alert>
                <Video className="h-4 w-4" />
                <AlertDescription>
                  선택된 파일: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)}MB)
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <h3 className="font-medium">좋은 영상을 위한 팁</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• 10초~2분 길이의 영상이 적당합니다</li>
                <li>• 강아지의 전체 모습이 잘 보이도록 촬영해주세요</li>
                <li>• 밝은 곳에서 촬영하면 더 정확한 분석이 가능합니다</li>
                <li>• 평소 행동 모습(놀기, 걷기, 앉기 등)이 포함되면 좋습니다</li>
              </ul>
            </div>

            <Button 
              onClick={uploadAndAnalyze} 
              disabled={!selectedFile || isLoading}
              className="w-full"
              size="lg"
            >
              <Brain className="h-4 w-4 mr-2" />
              AI 분석 시작하기
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 분석 중 단계 */}
      {currentStep === 'analyzing' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="h-5 w-5 mr-2 animate-pulse" />
              AI 영상 분석 중...
            </CardTitle>
            <CardDescription>
              전문 AI가 영상을 분석하고 있습니다. 잠시만 기다려주세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>분석 진행률</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
            
            <div className="text-center py-8">
              <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                강아지의 행동 패턴, 건강 상태, 훈련 필요도를 분석하고 있습니다...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 결과 단계 */}
      {currentStep === 'results' && analysisResult && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-success" />
                AI 분석 결과
              </CardTitle>
              {analysisResult.note && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{analysisResult.note}</AlertDescription>
                </Alert>
              )}
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="analysis" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="analysis">분석 결과</TabsTrigger>
                  <TabsTrigger value="recommendations">추천 사항</TabsTrigger>
                  <TabsTrigger value="next-steps">다음 단계</TabsTrigger>
                </TabsList>
                
                <TabsContent value="analysis" className="space-y-4">
                  <div className="prose max-w-none">
                    <div className="whitespace-pre-line text-sm">
                      {analysisResult.analysis}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="recommendations" className="space-y-4">
                  {analysisResult.recommendations.map((rec, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium">{rec.title}</h4>
                          <Badge className={getPriorityColor(rec.priority)}>
                            {rec.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {rec.description}
                        </p>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          예상 기간: {rec.estimatedDuration}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
                
                <TabsContent value="next-steps" className="space-y-4">
                  {analysisResult.nextSteps.map((step, index) => (
                    <div key={index} className="flex items-start space-x-4">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                        {step.step}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{step.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* 상담 신청 폼 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Star className="h-5 w-5 mr-2" />
                전문가 상담 신청
              </CardTitle>
              <CardDescription>
                분석 결과를 바탕으로 전문 훈련사와 개별 상담을 받아보세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">이름 *</Label>
                  <Input
                    id="name"
                    value={consultationData.name}
                    onChange={(e) => setConsultationData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="반려인 이름"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">연락처 *</Label>
                  <Input
                    id="phone"
                    value={consultationData.phone}
                    onChange={(e) => setConsultationData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="010-0000-0000"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  value={consultationData.email}
                  onChange={(e) => setConsultationData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="example@email.com"
                />
              </div>
              
              <div>
                <Label htmlFor="questions">추가 질문이나 궁금한 점</Label>
                <Textarea
                  id="questions"
                  value={consultationData.questions}
                  onChange={(e) => setConsultationData(prev => ({ ...prev, questions: e.target.value }))}
                  placeholder="우리 강아지에 대해 더 궁금한 점이 있다면 적어주세요..."
                  rows={3}
                />
              </div>

              <Button 
                onClick={submitConsultation}
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                <Phone className="h-4 w-4 mr-2" />
                전문가 상담 신청하기
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 상담 완료 단계 */}
      {currentStep === 'consultation' && consultationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-success">
              <CheckCircle className="h-5 w-5 mr-2" />
              상담 신청 완료
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {consultationResult.message}
              </AlertDescription>
            </Alert>

            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="font-medium mb-2">상담 ID: {consultationResult.consultationId}</p>
              <p className="text-sm text-muted-foreground">
                예상 연락 시간: {consultationResult.estimatedContactTime}
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-3">다음 진행 과정</h4>
              <ul className="space-y-2">
                {consultationResult.nextActions.map((action, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => window.location.href = '/register'}
                className="flex-1"
              >
                TALEZ 회원가입하기
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="flex-1"
              >
                홈으로 돌아가기
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}