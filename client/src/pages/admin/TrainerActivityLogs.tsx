import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Calendar, User, TrendingUp, Star, Target, Filter, Search, BarChart3, Timer, Award } from 'lucide-react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface TrainerActivityLog {
  id: number;
  trainerId: number;
  trainerName: string;
  activityType: string;
  activityTitle: string;
  activityDescription: string;
  pointsEarned: number;
  incentiveAmount: string;
  metadata: any;
  createdAt: string;
}

interface ActivitySummary {
  totalActivities: number;
  totalPoints: number;
  totalIncentives: number;
  activeTrainers: number;
  topActivities: Array<{
    activityType: string;
    activityTitle: string;
    count: number;
    totalPoints: number;
  }>;
}

interface TrainerStats {
  trainerId: number;
  trainerName: string;
  totalActivities: number;
  totalPoints: number;
  totalIncentives: number;
  lastActivity: string;
  topActivity: string;
  rank: number;
}

const TrainerActivityLogs: React.FC = () => {
  const [activeTab, setActiveTab] = useState('logs');
  const [searchTerm, setSearchTerm] = useState('');
  const [activityTypeFilter, setActivityTypeFilter] = useState('all');
  const [trainerFilter, setTrainerFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 활동 로그 조회
  const { data: activityLogsResponse, isLoading: logsLoading } = useQuery({
    queryKey: ['/api/admin/trainer-activity-logs', { search: searchTerm, activityType: activityTypeFilter, trainer: trainerFilter, date: dateFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (activityTypeFilter !== 'all') params.append('activityType', activityTypeFilter);
      if (trainerFilter !== 'all') params.append('trainerId', trainerFilter);
      if (dateFilter !== 'all') params.append('date', dateFilter);
      
      const response = await fetch(`/api/admin/trainer-activity-logs?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch activity logs');
      }
      return response.json();
    }
  });

  const activityLogs = activityLogsResponse?.logs || [];

  // 활동 요약 조회
  const { data: activitySummary, isLoading: summaryLoading } = useQuery<ActivitySummary>({
    queryKey: ['/api/admin/activity-summary'],
    queryFn: () => apiRequest('GET', '/api/admin/activity-summary')
  });

  // 훈련사 통계 조회
  const { data: trainerStats = [], isLoading: statsLoading } = useQuery<TrainerStats[]>({
    queryKey: ['/api/admin/trainer-stats'],
    queryFn: () => apiRequest('GET', '/api/admin/trainer-stats')
  });

  // 활동 로그 삭제
  const deleteLogMutation = useMutation({
    mutationFn: (logId: number) => apiRequest('DELETE', `/api/admin/trainer-activity-logs/${logId}`),
    onSuccess: () => {
      toast({
        title: '활동 로그 삭제 완료',
        description: '선택한 활동 로그가 삭제되었습니다.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/trainer-activity-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/activity-summary'] });
    },
    onError: (error: any) => {
      toast({
        title: '활동 로그 삭제 실패',
        description: error.message || '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  });

  // 포인트 재계산
  const recalculatePointsMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/admin/recalculate-points'),
    onSuccess: () => {
      toast({
        title: '포인트 재계산 완료',
        description: '모든 훈련사의 포인트가 재계산되었습니다.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/trainer-activity-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/activity-summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/trainer-stats'] });
    },
    onError: (error: any) => {
      toast({
        title: '포인트 재계산 실패',
        description: error.message || '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  });

  const handleDeleteLog = (logId: number) => {
    if (window.confirm('이 활동 로그를 삭제하시겠습니까?')) {
      deleteLogMutation.mutate(logId);
    }
  };

  const getActivityTypeColor = (activityType: string) => {
    const colors = {
      'video_upload': 'bg-blue-500',
      'comment': 'bg-green-500',
      'view': 'bg-primary/50',
      'member_recruitment': 'bg-orange-500',
      'certification': 'bg-red-500',
      'consultation': 'bg-yellow-500',
      'course_creation': 'bg-indigo-500'
    };
    return colors[activityType as keyof typeof colors] || 'bg-gray-500';
  };

  const getActivityTypeLabel = (activityType: string) => {
    const labels = {
      'video_upload': '영상 업로드',
      'comment': '댓글 작성',
      'view': '조회수',
      'member_recruitment': '회원 추천',
      'certification': '자격증 취득',
      'consultation': '상담 완료',
      'course_creation': '강의 생성'
    };
    return labels[activityType as keyof typeof labels] || activityType;
  };

  const filteredLogs = activityLogs.filter(log => {
    const matchesSearch = log.trainerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.activityTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.activityDescription.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesActivityType = activityTypeFilter === 'all' || log.activityType === activityTypeFilter;
    const matchesTrainer = trainerFilter === 'all' || log.trainerId.toString() === trainerFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const logDate = new Date(log.createdAt);
      const today = new Date();
      
      switch (dateFilter) {
        case 'today':
          matchesDate = logDate.toDateString() === today.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = logDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = logDate >= monthAgo;
          break;
      }
    }
    
    return matchesSearch && matchesActivityType && matchesTrainer && matchesDate;
  });

  if (logsLoading || summaryLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">훈련사 활동 로그</h1>
        <p className="text-gray-600 dark:text-gray-300">훈련사들의 활동 기록과 포인트 획득 현황을 관리합니다</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            활동 로그
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            활동 요약
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            훈련사 통계
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                필터 및 검색
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="search">검색</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="search"
                      placeholder="훈련사명, 활동 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="activityType">활동 타입</Label>
                  <Select value={activityTypeFilter} onValueChange={setActivityTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="활동 타입 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="video_upload">영상 업로드</SelectItem>
                      <SelectItem value="comment">댓글 작성</SelectItem>
                      <SelectItem value="view">조회수</SelectItem>
                      <SelectItem value="member_recruitment">회원 추천</SelectItem>
                      <SelectItem value="certification">자격증 취득</SelectItem>
                      <SelectItem value="consultation">상담 완료</SelectItem>
                      <SelectItem value="course_creation">강의 생성</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="trainer">훈련사</Label>
                  <Select value={trainerFilter} onValueChange={setTrainerFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="훈련사 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      {Array.from(new Set(activityLogs.map(log => log.trainerId)))
                        .map(trainerId => {
                          const trainer = activityLogs.find(log => log.trainerId === trainerId);
                          return (
                            <SelectItem key={trainerId} value={trainerId.toString()}>
                              {trainer?.trainerName}
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date">기간</Label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="기간 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="today">오늘</SelectItem>
                      <SelectItem value="week">최근 7일</SelectItem>
                      <SelectItem value="month">최근 30일</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={() => recalculatePointsMutation.mutate()}
                    disabled={recalculatePointsMutation.isPending}
                    className="w-full"
                  >
                    <Target className="w-4 h-4 mr-2" />
                    {recalculatePointsMutation.isPending ? '재계산 중...' : '포인트 재계산'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {filteredLogs.map((log) => (
              <Card key={log.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-3 h-3 rounded-full ${getActivityTypeColor(log.activityType)} mt-2`}></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{getActivityTypeLabel(log.activityType)}</Badge>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <h3 className="font-semibold text-lg mb-1">{log.activityTitle}</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">{log.activityDescription}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{log.trainerName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span>{log.pointsEarned}점</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Award className="w-4 h-4 text-green-500" />
                            <span>{Number(log.incentiveAmount).toLocaleString()}원</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteLog(log.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      삭제
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredLogs.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">활동 로그가 없습니다</h3>
                  <p className="text-gray-600 dark:text-gray-400">필터 조건을 변경하거나 검색어를 확인해보세요.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="summary" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 활동 수</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activitySummary?.totalActivities?.toLocaleString() || 0}</div>
                <div className="w-16 h-16 mt-2">
                  <CircularProgressbar
                    value={Math.min(((activitySummary?.totalActivities || 0) / 1000) * 100, 100)}
                    styles={buildStyles({
                      textSize: '16px',
                      pathColor: '#3b82f6',
                      textColor: '#3b82f6',
                      trailColor: '#e5e7eb',
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 포인트</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activitySummary?.totalPoints?.toLocaleString() || 0}</div>
                <div className="w-16 h-16 mt-2">
                  <CircularProgressbar
                    value={Math.min(((activitySummary?.totalPoints || 0) / 10000) * 100, 100)}
                    styles={buildStyles({
                      textSize: '16px',
                      pathColor: '#10b981',
                      textColor: '#10b981',
                      trailColor: '#e5e7eb',
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 인센티브</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activitySummary?.totalIncentives?.toLocaleString() || 0}원</div>
                <div className="w-16 h-16 mt-2">
                  <CircularProgressbar
                    value={Math.min(((activitySummary?.totalIncentives || 0) / 1000000) * 100, 100)}
                    styles={buildStyles({
                      textSize: '16px',
                      pathColor: '#f59e0b',
                      textColor: '#f59e0b',
                      trailColor: '#e5e7eb',
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">활성 훈련사</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activitySummary?.activeTrainers || 0}</div>
                <div className="w-16 h-16 mt-2">
                  <CircularProgressbar
                    value={((activitySummary?.activeTrainers || 0) / 20) * 100}
                    styles={buildStyles({
                      textSize: '16px',
                      pathColor: '#8b5cf6',
                      textColor: '#8b5cf6',
                      trailColor: '#e5e7eb',
                    })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>인기 활동 타입</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activitySummary?.topActivities?.map((activity, index) => (
                  <div key={activity.activityType} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getActivityTypeColor(activity.activityType)}`}></div>
                      <div>
                        <div className="font-semibold">{activity.activityTitle}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{activity.count}회 활동</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{activity.totalPoints}점</div>
                      <Badge variant={index < 3 ? 'default' : 'secondary'}>
                        {index + 1}위
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>훈련사별 활동 통계</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trainerStats.map((trainer) => (
                  <div key={trainer.trainerId} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{trainer.trainerName}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">순위: {trainer.rank}위</p>
                      </div>
                      <Badge variant={trainer.rank <= 3 ? 'default' : 'secondary'}>
                        {trainer.rank <= 3 ? '상위' : '일반'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-sm font-medium">총 활동</Label>
                        <div className="text-xl font-bold">{trainer.totalActivities}</div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">총 포인트</Label>
                        <div className="text-xl font-bold">{trainer.totalPoints}</div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">총 인센티브</Label>
                        <div className="text-xl font-bold">{trainer.totalIncentives.toLocaleString()}원</div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">주요 활동</Label>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{trainer.topActivity}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                      마지막 활동: {new Date(trainer.lastActivity).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TrainerActivityLogs;