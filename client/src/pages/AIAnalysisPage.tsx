import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Bot, 
  Sparkles, 
  Heart, 
  Brain, 
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  Zap,
  Target
} from 'lucide-react';

interface AnalysisResult {
  success: boolean;
  data?: any;
  metadata?: {
    aiUsed: string;
    responseTime: number;
    analysisType: string;
    personalized: boolean;
  };
}

interface PetProfile {
  name: string;
  breed: string;
  age: string;
  personality: string;
  trainingLevel: string;
  behaviorIssues: string;
  medicalHistory: string;
  weight: string;
  notes: string;
}

export default function AIAnalysisPage() {
  const [prompt, setPrompt] = useState('');
  const [analysisType, setAnalysisType] = useState('behavior');
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o");
  const [complexity, setComplexity] = useState('medium');
  const [urgency, setUrgency] = useState('medium');
  const [petProfile, setPetProfile] = useState<Partial<PetProfile>>({});
  const [showPetProfile, setShowPetProfile] = useState(false);
  const { toast } = useToast();

  // 강화된 분석 뮤테이션
  const enhancedAnalysis = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/enhanced-analysis/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('분석 실패');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "분석 완료",
        description: `${data.metadata?.aiUsed} AI를 사용하여 분석이 완료되었습니다.`
      });
    },
    onError: (error) => {
      toast({
        title: "분석 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  // 반려견 행동 분석 뮤테이션
  const behaviorAnalysis = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/enhanced-analysis/dog-behavior', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('행동 분석 실패');
      return response.json();
    }
  });

  // 반려견 건강 분석 뮤테이션
  const healthAnalysis = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/enhanced-analysis/dog-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('건강 분석 실패');
      return response.json();
    }
  });

  // 훈련 계획 생성 뮤테이션
  const trainingPlan = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/enhanced-analysis/training-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('훈련 계획 생성 실패');
      return response.json();
    }
  });

  const handleAnalysis = async () => {
    if (!prompt.trim()) {
      toast({
        title: "입력 오류",
        description: "분석할 내용을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    const analysisData = {
      prompt,
      analysisType,
      model: selectedModel,
      petProfile: showPetProfile ? petProfile : undefined,
      options: {
        complexity,
        urgency,
        personalizedNeeded: showPetProfile,
        realTimeNeeded: urgency === 'critical'
      }
    };

    // 분석 유형에 따른 API 선택
    switch (analysisType) {
      case 'behavior':
        await behaviorAnalysis.mutateAsync(analysisData);
        break;
      case 'health':
        await healthAnalysis.mutateAsync(analysisData);
        break;
      case 'training':
        await trainingPlan.mutateAsync(analysisData);
        break;
      default:
        await enhancedAnalysis.mutateAsync(analysisData);
    }
  };

  const getAnalysisIcon = (type: string) => {
    switch (type) {
      case 'behavior': return <Brain className="w-5 h-5" />;
      case 'health': return <Heart className="w-5 h-5" />;
      case 'training': return <Target className="w-5 h-5" />;
      default: return <Bot className="w-5 h-5" />;
    }
  };

  const getCurrentResult = () => {
    switch (analysisType) {
      case 'behavior': return behaviorAnalysis.data;
      case 'health': return healthAnalysis.data;
      case 'training': return trainingPlan.data;
      default: return enhancedAnalysis.data;
    }
  };

  const isAnalyzing = enhancedAnalysis.isPending || behaviorAnalysis.isPending || 
                     healthAnalysis.isPending || trainingPlan.isPending;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-primary" />
          AI 강화 분석 시스템
        </h1>
        <p className="text-gray-600">
          4개의 AI 엔진을 활용한 고도화된 반려견 분석 서비스입니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 분석 입력 패널 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-6 h-6 text-primary" />
                AI 분석 요청
              </CardTitle>
              <CardDescription>
                반려견의 행동, 건강, 훈련에 대해 전문적인 AI 분석을 받아보세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 분석 유형 선택 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">분석 유형</label>
                <Select value={analysisType} onValueChange={setAnalysisType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="behavior">
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        행동 분석
                      </div>
                    </SelectItem>
                    <SelectItem value="health">
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4" />
                        건강 분석
                      </div>
                    </SelectItem>
                    <SelectItem value="training">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        훈련 계획
                      </div>
                    </SelectItem>
                    <SelectItem value="general">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4" />
                        일반 상담
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* AI 모델 선택 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">AI 모델 선택</label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger data-testid="select-ai-model">
                    <SelectValue placeholder="AI 모델을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4" />
                        ChatGPT 4o
                      </div>
                    </SelectItem>
                    <SelectItem value="gpt-4o-mini">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4" />
                        ChatGPT 4o Mini
                      </div>
                    </SelectItem>
                    <SelectItem value="claude-3-5-sonnet-20241022">
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        Claude 3.5 Sonnet
                      </div>
                    </SelectItem>
                    <SelectItem value="claude-3-5-haiku-20241022">
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        Claude 3.5 Haiku
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 분석 옵션 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">복잡도</label>
                  <Select value={complexity} onValueChange={setComplexity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">간단</SelectItem>
                      <SelectItem value="medium">중간</SelectItem>
                      <SelectItem value="complex">복잡</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">긴급도</label>
                  <Select value={urgency} onValueChange={setUrgency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">낮음</SelectItem>
                      <SelectItem value="medium">보통</SelectItem>
                      <SelectItem value="high">높음</SelectItem>
                      <SelectItem value="critical">응급</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 반려견 프로필 토글 */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="showProfile"
                  checked={showPetProfile}
                  onChange={(e) => setShowPetProfile(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="showProfile" className="text-sm font-medium">
                  반려견 프로필 포함 (개인화된 분석)
                </label>
              </div>

              {/* 반려견 프로필 입력 */}
              {showPetProfile && (
                <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                  <h3 className="font-medium">반려견 정보</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      placeholder="이름"
                      value={petProfile.name || ''}
                      onChange={(e) => setPetProfile(prev => ({ ...prev, name: e.target.value }))}
                      className="p-2 border rounded"
                    />
                    <input
                      placeholder="견종"
                      value={petProfile.breed || ''}
                      onChange={(e) => setPetProfile(prev => ({ ...prev, breed: e.target.value }))}
                      className="p-2 border rounded"
                    />
                    <input
                      placeholder="나이"
                      value={petProfile.age || ''}
                      onChange={(e) => setPetProfile(prev => ({ ...prev, age: e.target.value }))}
                      className="p-2 border rounded"
                    />
                    <input
                      placeholder="체중"
                      value={petProfile.weight || ''}
                      onChange={(e) => setPetProfile(prev => ({ ...prev, weight: e.target.value }))}
                      className="p-2 border rounded"
                    />
                  </div>
                  <Textarea
                    placeholder="성격, 특이사항, 기존 질병력 등을 입력해주세요..."
                    value={petProfile.notes || ''}
                    onChange={(e) => setPetProfile(prev => ({ ...prev, notes: e.target.value }))}
                    className="min-h-20"
                  />
                </div>
              )}

              {/* 분석 요청 입력 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">분석 요청 내용</label>
                <Textarea
                  placeholder={`${analysisType === 'behavior' ? '반려견의 행동을 자세히 설명해주세요...' :
                    analysisType === 'health' ? '반려견의 증상이나 건강 상태를 설명해주세요...' :
                    analysisType === 'training' ? '원하는 훈련 목표나 문제점을 설명해주세요...' :
                    '궁금한 점이나 상담하고 싶은 내용을 입력해주세요...'}`}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-32"
                />
              </div>

              {/* 분석 버튼 */}
              <Button
                onClick={handleAnalysis}
                disabled={isAnalyzing || !prompt.trim()}
                className="w-full"
                size="lg"
              >
                {isAnalyzing ? (
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 animate-spin" />
                    {selectedModel.startsWith('claude') ? 'Claude' : 'ChatGPT'} 분석 중...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {getAnalysisIcon(analysisType)}
                    {selectedModel.startsWith('claude') ? 'Claude' : 'ChatGPT'}로 AI 분석 시작
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 분석 결과 패널 */}
        <div className="space-y-6">
          {/* AI 엔진 상태 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI 엔진 상태</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">ChatGPT</span>
                  <Badge variant="default">활성</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Claude</span>
                  <Badge variant="default">활성</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Gemini</span>
                  <Badge variant="secondary">대기</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Perplexity</span>
                  <Badge variant="outline">오프라인</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 분석 결과 */}
          {getCurrentResult() && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  분석 완료
                </CardTitle>
                <CardDescription>
                  {getCurrentResult().metadata && (
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="w-3 h-3" />
                      {getCurrentResult().metadata.responseTime}ms
                      <Badge variant="outline" className="text-xs">
                        {getCurrentResult().metadata.aiUsed}
                      </Badge>
                    </div>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  {getCurrentResult().analysis || getCurrentResult().data ? (
                    <div className="whitespace-pre-wrap text-sm">
                      {JSON.stringify(getCurrentResult().analysis || getCurrentResult().data, null, 2)}
                    </div>
                  ) : (
                    <p>분석 결과를 표시할 수 없습니다.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 분석 팁 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-warning" />
                분석 팁
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• 구체적이고 상세한 설명일수록 정확한 분석이 가능합니다</p>
                <p>• 반려견 프로필을 입력하면 개인화된 조언을 받을 수 있습니다</p>
                <p>• 응급 상황인 경우 긴급도를 '응급'으로 설정해주세요</p>
                <p>• 여러 AI 엔진의 종합적인 분석 결과를 제공합니다</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 경고 메시지 */}
      {(analysisType === 'health' || urgency === 'critical') && (
        <Alert className="mt-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>중요:</strong> AI 분석은 참고용이며 전문 수의사의 진료를 대체할 수 없습니다. 
            응급 상황이나 심각한 증상이 있는 경우 즉시 동물병원에 내원하세요.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}