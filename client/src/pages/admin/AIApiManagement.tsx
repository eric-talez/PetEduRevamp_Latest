import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Bot, 
  Key, 
  Activity, 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Zap,
  DollarSign,
  Clock,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

interface AIServiceStatus {
  openai: { available: boolean; latency?: number };
  claude: { available: boolean; latency?: number };
  gemini: { available: boolean; latency?: number };
  perplexity: { available: boolean; latency?: number };
}

interface AIUsageStats {
  totalRequests: number;
  totalCost: number;
  dailyLimit: number;
  monthlyUsage: number;
  topUsers: Array<{ userId: string; requests: number; cost: number }>;
}

interface AIConfiguration {
  openaiApiKey: string;
  claudeApiKey: string;
  geminiApiKey: string;
  perplexityApiKey: string;
  defaultModel: string;
  rateLimitPerMinute: number;
  dailyLimitPerUser: number;
  monthlyBudget: number;
  enableCostOptimization: boolean;
  enableFallback: boolean;
  enableUsageTracking: boolean;
  aiWeights: {
    behavior: { openai: number; claude: number; gemini: number; perplexity: number };
    health: { openai: number; claude: number; gemini: number; perplexity: number };
    training: { openai: number; claude: number; gemini: number; perplexity: number };
    news: { openai: number; claude: number; gemini: number; perplexity: number };
  };
}

export default function AIApiManagement() {
  const [isEditing, setIsEditing] = useState(false);
  const [config, setConfig] = useState<AIConfiguration>({
    openaiApiKey: '',
    claudeApiKey: '',
    geminiApiKey: '',
    perplexityApiKey: '',
    defaultModel: 'cost', // cost or quality
    rateLimitPerMinute: 10,
    dailyLimitPerUser: 50,
    monthlyBudget: 100,
    enableCostOptimization: true,
    enableFallback: true,
    enableUsageTracking: true,
    aiWeights: {
      behavior: { openai: 0.4, claude: 0.4, gemini: 0.15, perplexity: 0.05 },
      health: { openai: 0.3, claude: 0.3, gemini: 0.25, perplexity: 0.15 },
      training: { openai: 0.35, claude: 0.35, gemini: 0.2, perplexity: 0.1 },
      news: { openai: 0.1, claude: 0.1, gemini: 0.2, perplexity: 0.6 }
    }
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // AI 서비스 상태 조회
  const { data: serviceStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/ai-proxy/status'],
    refetchInterval: 30000,
  });

  // AI 사용량 통계 조회
  const { data: usageStats } = useQuery({
    queryKey: ['/api/admin/ai-usage-stats'],
    refetchInterval: 60000,
  });

  // AI 설정 조회
  const { data: currentConfig } = useQuery({
    queryKey: ['/api/admin/ai-config'],
  });

  // AI 설정 업데이트
  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig: Partial<AIConfiguration>) => {
      const response = await fetch('/api/admin/ai-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      if (!response.ok) throw new Error('설정 업데이트 실패');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "설정 저장됨", description: "AI API 설정이 성공적으로 업데이트되었습니다." });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ai-config'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-proxy/status'] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "설정 저장 실패", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // 서비스 재시작
  const restartServiceMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/ai-service/restart', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('서비스 재시작 실패');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "서비스 재시작됨", description: "AI 서비스가 재시작되었습니다." });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-proxy/status'] });
    }
  });

  const handleSaveConfig = () => {
    const updateData = { ...config };
    
    // API 키가 마스킹된 상태라면 업데이트에서 제외
    if (updateData.openaiApiKey === '••••••••') {
      delete updateData.openaiApiKey;
    }
    if (updateData.geminiApiKey === '••••••••') {
      delete updateData.geminiApiKey;
    }
    if (updateData.claudeApiKey === '••••••••') {
      delete updateData.claudeApiKey;
    }
    if (updateData.perplexityApiKey === '••••••••') {
      delete updateData.perplexityApiKey;
    }

    updateConfigMutation.mutate(updateData);
  };

  const getServiceStatusBadge = (service: string, status?: { available: boolean; latency?: number }) => {
    if (!status) {
      return <Badge variant="secondary">확인 중</Badge>;
    }
    
    if (status.available) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          정상 {status.latency && `(${status.latency}ms)`}
        </Badge>
      );
    } else {
      return (
        <Badge variant="danger">
          <XCircle className="w-3 h-3 mr-1" />
          오류
        </Badge>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-blue-600" />
            AI API 관리
          </h1>
          <p className="text-muted-foreground">
            AI 서비스 API 키, 사용량 제한, 비용 관리를 설정합니다
          </p>
        </div>
        <Button
          onClick={() => restartServiceMutation.mutate()}
          disabled={restartServiceMutation.isPending}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${restartServiceMutation.isPending ? 'animate-spin' : ''}`} />
          서비스 재시작
        </Button>
      </div>

      {/* 서비스 상태 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            서비스 상태
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">상태 확인 중...</span>
            </div>
          ) : (
            <div className="grid md:grid-cols-4 gap-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Bot className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">OpenAI</h3>
                    <p className="text-sm text-muted-foreground">GPT 모델</p>
                  </div>
                </div>
                {getServiceStatusBadge('openai', serviceStatus?.openai)}
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Bot className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Claude</h3>
                    <p className="text-sm text-muted-foreground">Anthropic AI</p>
                  </div>
                </div>
                {getServiceStatusBadge('claude', serviceStatus?.claude)}
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Bot className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Google Gemini</h3>
                    <p className="text-sm text-muted-foreground">Gemini 모델</p>
                  </div>
                </div>
                {getServiceStatusBadge('gemini', serviceStatus?.gemini)}
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Perplexity</h3>
                    <p className="text-sm text-muted-foreground">실시간 검색 AI</p>
                  </div>
                </div>
                {getServiceStatusBadge('perplexity', serviceStatus?.perplexity)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 사용량 통계 */}
      {usageStats && (
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">총 요청</span>
              </div>
              <p className="text-2xl font-bold mt-1">{(usageStats as any)?.totalRequests?.toLocaleString() || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">총 비용</span>
              </div>
              <p className="text-2xl font-bold mt-1">${(usageStats as any)?.totalCost?.toFixed(2) || '0.00'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">월간 사용량</span>
              </div>
              <p className="text-2xl font-bold mt-1">{(usageStats as any)?.monthlyUsage || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">일간 제한</span>
              </div>
              <p className="text-2xl font-bold mt-1">{config.dailyLimitPerUser}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 설정 탭 */}
      <Tabs defaultValue="api-keys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="api-keys">API 키</TabsTrigger>
          <TabsTrigger value="limits">사용량 제한</TabsTrigger>
          <TabsTrigger value="advanced">고급 설정</TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API 키 관리
              </CardTitle>
              <CardDescription>
                AI 서비스 제공업체의 API 키를 설정합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="openai-key">OpenAI API 키</Label>
                  <Input
                    id="openai-key"
                    type={isEditing ? "text" : "password"}
                    value={config.openaiApiKey}
                    onChange={(e) => setConfig({...config, openaiApiKey: e.target.value})}
                    placeholder="sk-proj-..."
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <Label htmlFor="gemini-key">Google Gemini API 키</Label>
                  <Input
                    id="gemini-key"
                    type={isEditing ? "text" : "password"}
                    value={config.geminiApiKey}
                    onChange={(e) => setConfig({...config, geminiApiKey: e.target.value})}
                    placeholder="AIza..."
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <Label htmlFor="claude-key">Claude API 키</Label>
                  <Input
                    id="claude-key"
                    type={isEditing ? "text" : "password"}
                    value={config.claudeApiKey}
                    onChange={(e) => setConfig({...config, claudeApiKey: e.target.value})}
                    placeholder="sk-ant-..."
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <Label htmlFor="perplexity-key">Perplexity API 키</Label>
                  <Input
                    id="perplexity-key"
                    type={isEditing ? "text" : "password"}
                    value={config.perplexityApiKey}
                    onChange={(e) => setConfig({...config, perplexityApiKey: e.target.value})}
                    placeholder="pplx-..."
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button onClick={handleSaveConfig} disabled={updateConfigMutation.isPending}>
                      저장
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      취소
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)}>
                    편집
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>사용량 제한 설정</CardTitle>
              <CardDescription>
                API 호출 빈도와 사용자별 제한을 설정합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rate-limit">분당 요청 제한</Label>
                  <Input
                    id="rate-limit"
                    type="number"
                    value={config.rateLimitPerMinute}
                    onChange={(e) => setConfig({...config, rateLimitPerMinute: parseInt(e.target.value) || 10})}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    사용자당 분당 최대 요청 횟수
                  </p>
                </div>

                <div>
                  <Label htmlFor="daily-limit">일일 사용자 제한</Label>
                  <Input
                    id="daily-limit"
                    type="number"
                    value={config.dailyLimitPerUser}
                    onChange={(e) => setConfig({...config, dailyLimitPerUser: parseInt(e.target.value) || 50})}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    사용자당 일일 최대 요청 횟수
                  </p>
                </div>

                <div>
                  <Label htmlFor="monthly-budget">월간 예산 (USD)</Label>
                  <Input
                    id="monthly-budget"
                    type="number"
                    value={config.monthlyBudget}
                    onChange={(e) => setConfig({...config, monthlyBudget: parseFloat(e.target.value) || 100})}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    월간 AI 서비스 예산 한도
                  </p>
                </div>
              </div>

              <Button onClick={handleSaveConfig} disabled={updateConfigMutation.isPending}>
                제한 설정 저장
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>고급 설정</CardTitle>
              <CardDescription>
                AI 서비스 최적화 및 고급 기능을 설정합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">비용 최적화</h4>
                  <p className="text-sm text-muted-foreground">
                    저비용 모델 우선 사용으로 비용을 절약합니다
                  </p>
                </div>
                <Switch
                  checked={config.enableCostOptimization}
                  onCheckedChange={(checked) => 
                    setConfig({...config, enableCostOptimization: checked})
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">자동 대체 (Fallback)</h4>
                  <p className="text-sm text-muted-foreground">
                    한 서비스가 실패하면 다른 서비스로 자동 전환합니다
                  </p>
                </div>
                <Switch
                  checked={config.enableFallback}
                  onCheckedChange={(checked) => 
                    setConfig({...config, enableFallback: checked})
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">사용량 추적</h4>
                  <p className="text-sm text-muted-foreground">
                    상세한 사용량 통계와 비용 분석을 수집합니다
                  </p>
                </div>
                <Switch
                  checked={config.enableUsageTracking}
                  onCheckedChange={(checked) => 
                    setConfig({...config, enableUsageTracking: checked})
                  }
                />
              </div>

              <Separator />

              <div>
                <Label>기본 모델 우선순위</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={config.defaultModel === 'cost' ? 'default' : 'outline'}
                    onClick={() => setConfig({...config, defaultModel: 'cost'})}
                  >
                    비용 우선
                  </Button>
                  <Button
                    variant={config.defaultModel === 'quality' ? 'default' : 'outline'}
                    onClick={() => setConfig({...config, defaultModel: 'quality'})}
                  >
                    품질 우선
                  </Button>
                </div>
              </div>

              <Separator />

              {/* AI 엔진 가중치 설정 */}
              <div className="space-y-4">
                <h4 className="font-medium">분석 유형별 AI 엔진 가중치</h4>
                <p className="text-sm text-muted-foreground">
                  각 분석 유형에 따라 AI 엔진의 활용 비율을 조절할 수 있습니다.
                </p>
                
                {Object.entries(config.aiWeights).map(([type, weights]) => (
                  <Card key={type} className="p-4">
                    <h5 className="font-medium mb-3 capitalize">
                      {type === 'behavior' ? '행동 분석' :
                       type === 'health' ? '건강 분석' :
                       type === 'training' ? '훈련 분석' :
                       type === 'news' ? '뉴스/트렌드' : type}
                    </h5>
                    <div className="grid grid-cols-4 gap-4">
                      {Object.entries(weights).map(([engine, weight]) => (
                        <div key={engine} className="space-y-2">
                          <Label className="text-xs">
                            {engine === 'openai' ? 'ChatGPT' :
                             engine === 'claude' ? 'Claude' :
                             engine === 'gemini' ? 'Gemini' :
                             engine === 'perplexity' ? 'Perplexity' : engine}
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            max="1"
                            step="0.05"
                            value={weight}
                            onChange={(e) => {
                              const newWeight = parseFloat(e.target.value) || 0;
                              setConfig({
                                ...config,
                                aiWeights: {
                                  ...config.aiWeights,
                                  [type]: {
                                    ...config.aiWeights[type],
                                    [engine]: newWeight
                                  }
                                }
                              });
                            }}
                            className="text-xs"
                          />
                          <div className="text-xs text-muted-foreground">
                            {(weight * 100).toFixed(0)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>

              <Button onClick={handleSaveConfig} disabled={updateConfigMutation.isPending}>
                고급 설정 저장
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 경고 메시지 */}
      {(!serviceStatus?.openai?.available || !serviceStatus?.claude?.available || !serviceStatus?.gemini?.available || !serviceStatus?.perplexity?.available) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            일부 AI 서비스가 사용 불가능한 상태입니다. API 키 설정을 확인하거나 서비스 상태를 점검해주세요.
            4개의 AI 엔진(ChatGPT, Claude, Gemini, Perplexity) 중 일부가 비활성화되어 있습니다.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}