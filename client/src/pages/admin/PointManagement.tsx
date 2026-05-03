import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Settings, TrendingUp, Award, Star, Calculator, BarChart3, Trophy, Target, Users, Calendar, Activity, Coins } from 'lucide-react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// 포인트 규칙 폼 스키마
const pointRuleSchema = z.object({
  activityType: z.string().min(1, '활동 타입을 입력하세요'),
  activityName: z.string().min(1, '활동명을 입력하세요'),
  pointsPerAction: z.number().min(0, '포인트는 0 이상이어야 합니다'),
  maxDailyPoints: z.number().optional(),
  maxMonthlyPoints: z.number().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true)
});

type PointRuleFormData = z.infer<typeof pointRuleSchema>;

interface PointRule {
  id: number;
  activityType: string;
  activityName: string;
  pointsPerAction: number;
  maxDailyPoints: number | null;
  maxMonthlyPoints: number | null;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PointStats {
  totalActiveRules: number;
  totalPointsDistributed: number;
  activeTrainers: number;
  averageMonthlyPoints: number;
  topPerformers: Array<{
    trainerId: number;
    trainerName: string;
    totalPoints: number;
    rank: number;
  }>;
}

const PointManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PointRuleFormData>({
    resolver: zodResolver(pointRuleSchema),
    defaultValues: {
      activityType: '',
      activityName: '',
      pointsPerAction: 0,
      maxDailyPoints: undefined,
      maxMonthlyPoints: undefined,
      description: '',
      isActive: true
    }
  });

  // 포인트 규칙 목록 조회
  const { data: pointRules = [], isLoading: rulesLoading } = useQuery<PointRule[]>({
    queryKey: ['/api/admin/point-rules'],
    queryFn: () => apiRequest('GET', '/api/admin/point-rules')
  });

  // 포인트 통계 조회
  const { data: pointStats, isLoading: statsLoading } = useQuery<PointStats>({
    queryKey: ['/api/admin/point-stats'],
    queryFn: () => apiRequest('GET', '/api/admin/point-stats')
  });

  // 포인트 규칙 생성
  const createRuleMutation = useMutation({
    mutationFn: (data: PointRuleFormData) => apiRequest('POST', '/api/admin/point-rules', data),
    onSuccess: () => {
      toast({
        title: '포인트 규칙 생성 완료',
        description: '새로운 포인트 규칙이 생성되었습니다.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/point-rules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/point-stats'] });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: '포인트 규칙 생성 실패',
        description: error.message || '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  });

  // 포인트 규칙 활성화/비활성화
  const toggleRuleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest('PATCH', `/api/admin/point-rules/${id}`, { isActive }),
    onSuccess: () => {
      toast({
        title: '포인트 규칙 업데이트 완료',
        description: '포인트 규칙이 업데이트되었습니다.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/point-rules'] });
    },
    onError: (error: any) => {
      toast({
        title: '포인트 규칙 업데이트 실패',
        description: error.message || '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  });

  // 월별 순위 계산
  const calculateRankingsMutation = useMutation({
    mutationFn: (month: string) => apiRequest('POST', '/api/admin/calculate-rankings', { month }),
    onSuccess: () => {
      toast({
        title: '순위 계산 완료',
        description: '월별 훈련사 순위가 계산되었습니다.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/point-stats'] });
    },
    onError: (error: any) => {
      toast({
        title: '순위 계산 실패',
        description: error.message || '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  });

  const handleCreateRule = (data: PointRuleFormData) => {
    createRuleMutation.mutate(data);
  };

  const handleToggleRule = (id: number, isActive: boolean) => {
    toggleRuleMutation.mutate({ id, isActive });
  };

  const handleCalculateRankings = () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    calculateRankingsMutation.mutate(currentMonth);
  };

  if (rulesLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">포인트 관리 시스템</h1>
        <p className="text-gray-600 dark:text-gray-300">훈련사 인센티브 포인트 시스템을 관리합니다</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            개요
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            포인트 규칙
          </TabsTrigger>
          <TabsTrigger value="rankings" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            순위 관리
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            통계 분석
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">활성 포인트 규칙</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pointStats?.totalActiveRules || 0}</div>
                <div className="w-16 h-16 mt-2">
                  <CircularProgressbar
                    value={((pointStats?.totalActiveRules || 0) / Math.max(pointRules.length, 1)) * 100}
                    styles={buildStyles({
                      textSize: '16px',
                      pathColor: 'hsl(var(--primary))',
                      textColor: 'hsl(var(--primary))',
                      trailColor: 'hsl(var(--border))',
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 지급 포인트</CardTitle>
                <Coins className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pointStats?.totalPointsDistributed?.toLocaleString() || 0}</div>
                <div className="w-16 h-16 mt-2">
                  <CircularProgressbar
                    value={Math.min(((pointStats?.totalPointsDistributed || 0) / 10000) * 100, 100)}
                    styles={buildStyles({
                      textSize: '16px',
                      pathColor: 'hsl(var(--success))',
                      textColor: 'hsl(var(--success))',
                      trailColor: 'hsl(var(--border))',
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">활성 훈련사</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pointStats?.activeTrainers || 0}</div>
                <div className="w-16 h-16 mt-2">
                  <CircularProgressbar
                    value={((pointStats?.activeTrainers || 0) / 20) * 100}
                    styles={buildStyles({
                      textSize: '16px',
                      pathColor: 'hsl(var(--warning))',
                      textColor: 'hsl(var(--warning))',
                      trailColor: 'hsl(var(--border))',
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">월평균 포인트</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pointStats?.averageMonthlyPoints?.toLocaleString() || 0}</div>
                <div className="w-16 h-16 mt-2">
                  <CircularProgressbar
                    value={Math.min(((pointStats?.averageMonthlyPoints || 0) / 500) * 100, 100)}
                    styles={buildStyles({
                      textSize: '16px',
                      pathColor: 'hsl(var(--secondary))',
                      textColor: 'hsl(var(--secondary))',
                      trailColor: 'hsl(var(--border))',
                    })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                상위 성과자 (Top 10%)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pointStats?.topPerformers?.map((trainer, index) => (
                  <div key={trainer.trainerId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-bold">
                        {trainer.rank}
                      </div>
                      <div>
                        <div className="font-semibold">{trainer.trainerName}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">ID: {trainer.trainerId}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{trainer.totalPoints?.toLocaleString()}점</div>
                      <Badge variant={index < 3 ? 'default' : 'secondary'}>
                        {index < 3 ? '우수' : '활성'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">포인트 규칙 관리</h2>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  새 규칙 생성
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>새 포인트 규칙 생성</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleCreateRule)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="activityType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>활동 타입</FormLabel>
                          <FormControl>
                            <Input placeholder="예: video_upload" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="activityName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>활동명</FormLabel>
                          <FormControl>
                            <Input placeholder="예: 영상 업로드" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pointsPerAction"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>기본 포인트</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="maxDailyPoints"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>일일 최대 포인트 (선택)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="maxMonthlyPoints"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>월간 최대 포인트 (선택)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>설명</FormLabel>
                          <FormControl>
                            <Input placeholder="포인트 규칙에 대한 설명" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>활성화</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              이 규칙을 활성화하시겠습니까?
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        취소
                      </Button>
                      <Button type="submit" disabled={createRuleMutation.isPending}>
                        {createRuleMutation.isPending ? '생성 중...' : '생성'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {pointRules.map((rule) => (
              <Card key={rule.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{rule.activityName}</CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{rule.activityType}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                        {rule.isActive ? '활성' : '비활성'}
                      </Badge>
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">기본 포인트</Label>
                      <div className="text-2xl font-bold text-primary">{rule.pointsPerAction}점</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">일일 최대</Label>
                      <div className="text-lg font-semibold">
                        {rule.maxDailyPoints ? `${rule.maxDailyPoints}점` : '제한없음'}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">월간 최대</Label>
                      <div className="text-lg font-semibold">
                        {rule.maxMonthlyPoints ? `${rule.maxMonthlyPoints}점` : '제한없음'}
                      </div>
                    </div>
                  </div>
                  {rule.description && (
                    <div className="mt-4">
                      <Label className="text-sm font-medium">설명</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{rule.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rankings" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">순위 관리</h2>
            <Button onClick={handleCalculateRankings} disabled={calculateRankingsMutation.isPending}>
              <Calculator className="w-4 h-4 mr-2" />
              {calculateRankingsMutation.isPending ? '계산 중...' : '순위 재계산'}
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>이번 달 순위 시스템</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                포인트 기반 자동 순위 계산 및 상위 10% 선정
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-primary/10 dark:bg-primary/20 rounded-lg">
                    <h4 className="font-semibold mb-2">포인트 계산 방식</h4>
                    <ul className="text-sm space-y-1">
                      <li>• 영상 업로드: 5점</li>
                      <li>• 댓글 작성: 1점</li>
                      <li>• 조회수: 1점/회</li>
                      <li>• 회원 추천: 20점</li>
                      <li>• 자격증 취득: 100점</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-success/10 dark:bg-success/20 rounded-lg">
                    <h4 className="font-semibold mb-2">인센티브 지급</h4>
                    <ul className="text-sm space-y-1">
                      <li>• 리뷰 영상: 35,000원/개</li>
                      <li>• 활동 포인트: 100원/점</li>
                      <li>• 상위 10% 보너스: 50% 추가</li>
                      <li>• 우선 정산 혜택 제공</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <h2 className="text-2xl font-bold">통계 분석</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>활동 타입별 포인트 분포</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pointRules.filter(rule => rule.isActive).map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between">
                      <span className="text-sm">{rule.activityName}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${(rule.pointsPerAction / 100) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold">{rule.pointsPerAction}점</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>월간 성과 요약</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>총 지급 포인트</span>
                    <span className="font-bold text-lg">{pointStats?.totalPointsDistributed?.toLocaleString() || 0}점</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>평균 월간 포인트</span>
                    <span className="font-bold text-lg">{pointStats?.averageMonthlyPoints?.toLocaleString() || 0}점</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>활성 훈련사</span>
                    <span className="font-bold text-lg">{pointStats?.activeTrainers || 0}명</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>상위 10% 비율</span>
                    <span className="font-bold text-lg">
                      {pointStats?.activeTrainers ? Math.ceil(pointStats.activeTrainers * 0.1) : 0}명
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PointManagement;