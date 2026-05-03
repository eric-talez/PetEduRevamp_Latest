import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Activity, 
  TrendingUp, 
  DollarSign, 
  Clock,
  Brain,
  Zap,
  AlertTriangle,
  CheckCircle,
  Settings,
  BarChart3,
  Heart,
  Target
} from 'lucide-react';

interface OptimizationStatus {
  lastOptimization: string;
  currentCost: number;
  systemHealth: string;
  activeOptimizations: number;
}

interface OptimizationHistory {
  timestamp: string;
  serviceOptimizations: any[];
  costOptimization: any;
  uxMetrics: any;
  implementedActions: string[];
}

export default function AIOptimizationDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 시스템 통계 조회
  const { data: systemStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/enhanced-analysis/system-stats'],
    refetchInterval: 30000 // 30초마다 갱신
  });

  // 최적화 이력 조회
  const { data: optimizationData, isLoading: optimizationLoading } = useQuery({
    queryKey: ['/api/enhanced-analysis/optimization-history'],
    refetchInterval: 60000 // 1분마다 갱신
  });

  // 강제 최적화 실행
  const forceOptimization = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/enhanced-analysis/force-optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('최적화 실행 실패');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "최적화 완료",
        description: "AI 시스템 최적화가 성공적으로 실행되었습니다."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/enhanced-analysis/system-stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/enhanced-analysis/optimization-history'] });
    },
    onError: (error) => {
      toast({
        title: "최적화 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  const optimizationStatus: OptimizationStatus = (systemStats as any)?.optimizationStatus || {
    lastOptimization: '데이터 없음',
    currentCost: 0,
    systemHealth: 'unknown',
    activeOptimizations: 0
  };

  const globalPatterns = (systemStats as any)?.systemStats?.globalPatterns;
  const history: OptimizationHistory[] = (optimizationData as any)?.optimizationHistory || [];

  // 서비스 사용량 차트 데이터
  const serviceUsageData = globalPatterns?.serviceUsage ? Object.entries(globalPatterns.serviceUsage).map(([key, value]) => ({
    name: key,
    value: value as number,
    label: {
      petBehaviorAnalysis: '행동 분석',
      healthMonitoring: '건강 모니터링',
      trainingPlanning: '훈련 계획',
      nutritionAdvice: '영양 상담',
      emergencyConsult: '응급 상담',
      generalChat: '일반 채팅',
      imageAnalysis: '이미지 분석',
      courseRecommendation: '코스 추천'
    }[key] || key
  })) : [];

  const getHealthStatusColor = (health: string) => {
    switch (health) {
      case 'optimal': return 'text-success';
      case 'good': return 'text-primary';
      case 'warning': return 'text-warning';
      case 'critical': return 'text-destructive';
      default: return 'text-gray-500';
    }
  };

  const getHealthStatusIcon = (health: string) => {
    switch (health) {
      case 'optimal': return <CheckCircle className="w-5 h-5" />;
      case 'good': return <Activity className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'critical': return <AlertTriangle className="w-5 h-5" />;
      default: return <Settings className="w-5 h-5" />;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Brain className="w-8 h-8 text-primary" />
          TALEZ AI 최적화 대시보드
        </h1>
        <p className="text-gray-600">
          AI 운영 효율성을 모니터링하고 최적화를 관리합니다.
        </p>
      </div>

      {/* 상태 개요 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">시스템 상태</CardTitle>
            <div className={getHealthStatusColor(optimizationStatus.systemHealth)}>
              {getHealthStatusIcon(optimizationStatus.systemHealth)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {optimizationStatus.systemHealth}
            </div>
            <p className="text-xs text-muted-foreground">
              마지막 최적화: {new Date(optimizationStatus.lastOptimization).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">현재 비용</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${optimizationStatus.currentCost.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              월간 누적 비용
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활성 최적화</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {optimizationStatus.activeOptimizations}
            </div>
            <p className="text-xs text-muted-foreground">
              실행 중인 최적화 작업
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 만족도</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {globalPatterns?.responseQuality?.avgRating?.toFixed(1) || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              5점 만점 기준
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 메인 대시보드 */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="services" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="services">서비스 분석</TabsTrigger>
              <TabsTrigger value="patterns">사용 패턴</TabsTrigger>
              <TabsTrigger value="optimization">최적화 이력</TabsTrigger>
            </TabsList>

            <TabsContent value="services">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    서비스별 사용량
                  </CardTitle>
                  <CardDescription>
                    TALEZ 서비스별 AI 사용 현황입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {serviceUsageData.map((service, index) => (
                      <div key={service.name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{service.label}</span>
                          <span className="text-sm text-muted-foreground">{String(service.value)}</span>
                        </div>
                        <Progress 
                          value={(service.value / Math.max(...serviceUsageData.map(s => s.value), 1)) * 100} 
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="patterns">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    사용 패턴 분석
                  </CardTitle>
                  <CardDescription>
                    시간대별 및 복잡도별 사용 패턴입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    {/* 복잡도 분포 */}
                    <div>
                      <h4 className="text-sm font-medium mb-3">복잡도 분포</h4>
                      <div className="space-y-2">
                        {globalPatterns?.complexityDistribution && Object.entries(globalPatterns.complexityDistribution).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-xs capitalize">{key}</span>
                            <Badge variant="outline">{String(value)}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 도메인 선호도 */}
                    <div>
                      <h4 className="text-sm font-medium mb-3">도메인 선호도</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {globalPatterns?.domainPreference && Object.entries(globalPatterns.domainPreference).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-xs">{key}</span>
                            <Badge variant="secondary">{String(value)}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="optimization">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    최적화 이력
                  </CardTitle>
                  <CardDescription>
                    최근 AI 최적화 실행 기록입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {history.length > 0 ? history.slice(-5).reverse().map((item, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                          <Badge>
                            {item.implementedActions.length}개 작업
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          예상 절약: ${item.costOptimization?.savings?.toFixed(2) || '0.00'}
                        </div>
                        <div className="mt-2">
                          {item.implementedActions.slice(0, 2).map((action, idx) => (
                            <div key={idx} className="text-xs bg-gray-100 rounded px-2 py-1 mb-1">
                              {action}
                            </div>
                          ))}
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-8 text-muted-foreground">
                        최적화 이력이 없습니다.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* 사이드바 - 제어 패널 */}
        <div className="space-y-6">
          {/* 수동 최적화 실행 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">수동 최적화</CardTitle>
              <CardDescription>
                AI 시스템 최적화를 즉시 실행합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => forceOptimization.mutate()}
                disabled={forceOptimization.isPending}
                className="w-full"
                size="lg"
              >
                {forceOptimization.isPending ? (
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 animate-spin" />
                    최적화 실행 중...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    최적화 실행
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* 견종별 분포 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">견종별 분포</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {globalPatterns?.breedSpecificity && Object.entries(globalPatterns.breedSpecificity).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm">{key}</span>
                    <Badge variant="outline">{String(value)}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 긴급도 분포 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">긴급도 분포</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {globalPatterns?.urgencyLevels && Object.entries(globalPatterns.urgencyLevels).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{key}</span>
                    <Badge 
                      variant={key === 'emergency' ? 'danger' : 
                              key === 'urgent' ? 'default' : 'secondary'}
                    >
                      {String(value)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 시스템 알림 */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              AI 최적화는 자동으로 30분마다 실행됩니다. 
              긴급한 경우에만 수동 실행을 사용하세요.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}