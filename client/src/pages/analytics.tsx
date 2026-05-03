import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Calendar,
  Download,
  Filter,
  Eye,
  Users,
  BookOpen,
  Award,
  Heart,
  Star,
  Target,
  Clock,
  Activity,
  Zap,
  LineChart,
  AreaChart,
  Radar
} from 'lucide-react';

// API 호출로 실제 데이터 가져오기

export default function AnalyticsPage() {
  const { userName } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('30일');
  const [chartType, setChartType] = useState('bar');
  const [progressViewMode, setProgressViewMode] = useState('detailed');
  const [selectedUserId, setSelectedUserId] = useState(1); // 기본값을 1로 설정

  // 실제 API 데이터 가져오기
  const { data: trainingProgressData, isLoading: trainingLoading } = useQuery({
    queryKey: ['/api/analytics/training-progress', selectedUserId],
    staleTime: 5 * 60 * 1000, // 5분간 캐시
  });

  const { data: learningStatsData, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/analytics/learning-stats', selectedUserId],
    staleTime: 5 * 60 * 1000,
  });

  const { data: monthlyProgressData, isLoading: monthlyLoading } = useQuery({
    queryKey: ['/api/analytics/monthly-progress', selectedUserId],
    staleTime: 5 * 60 * 1000,
  });

  // 사용자 목록 가져오기
  const { data: usersList, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
    staleTime: 10 * 60 * 1000, // 10분간 캐시
  });

  // 내 강의 데이터 가져오기
  const { data: myCoursesData, isLoading: coursesLoading } = useQuery({
    queryKey: ['/api/courses/my-courses', selectedUserId],
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = trainingLoading || statsLoading || monthlyLoading || usersLoading || coursesLoading;

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-success';
    if (progress >= 60) return 'bg-warning';
    return 'bg-destructive';
  };

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case '마스터': return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground';
      case '숙련': return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary/70';
      case '중급': return 'bg-success/10 text-success dark:bg-success/20 dark:text-success/70';
      case '초급': return 'bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning/70';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Chart type configuration
  const chartTypes = [
    { value: 'bar', label: '막대형 차트', icon: BarChart3 },
    { value: 'line', label: '선형 차트', icon: LineChart },
    { value: 'pie', label: '원형 차트', icon: PieChart },
    { value: 'doughnut', label: '도넛 차트', icon: PieChart },
    { value: 'radar', label: '레이더 차트', icon: Radar },
    { value: 'area', label: '영역 차트', icon: AreaChart }
  ];

  // Render chart based on selected type
  const renderProgressChart = () => {
    switch (chartType) {
      case 'bar':
        return renderBarChart();
      case 'line':
        return renderLineChart();
      case 'pie':
        return renderPieChart();
      case 'doughnut':
        return renderDoughnutChart();
      case 'radar':
        return renderRadarChart();
      case 'area':
        return renderAreaChart();
      default:
        return renderBarChart();
    }
  };

  // Chart rendering functions
  const renderBarChart = () => (
    <div className="space-y-4">
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary/50 mx-auto"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            훈련 진행도를 불러오는 중...
          </p>
        </div>
      ) : trainingProgressData && trainingProgressData.length > 0 ? (
        trainingProgressData.map((item, index) => (
          <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-medium">{item.skill}</h3>
                <Badge className={getLevelBadgeColor(item.level)}>
                  {item.level}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={item.progress} className="flex-1" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[3rem]">
                  {item.progress}%
                </span>
              </div>
            </div>
            <div className="text-right ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {item.sessions}회 세션
              </p>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">
            훈련 진행도 데이터가 없습니다.
          </p>
        </div>
      )}
    </div>
  );

  const renderLineChart = () => (
    <div className="space-y-6">
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary/50 mx-auto"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            훈련 진행도를 불러오는 중...
          </p>
        </div>
      ) : trainingProgressData && trainingProgressData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trainingProgressData.map((item, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">{item.skill}</h3>
                <Badge className={getLevelBadgeColor(item.level)}>{item.level}</Badge>
              </div>
              <div className="h-16 bg-gradient-to-r from-primary to-secondary dark:from-primary dark:to-secondary rounded-lg flex items-end justify-center relative overflow-hidden">
                <div 
                  className="bg-primary w-full transition-all duration-1000 ease-out flex items-center justify-center text-white text-sm font-medium"
                  style={{ height: `${item.progress}%` }}
                >
                  {item.progress}%
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
                {item.sessions}회 완료
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">
            훈련 진행도 데이터가 없습니다.
          </p>
        </div>
      )}
    </div>
  );

  const renderPieChart = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {isLoading ? (
        <div className="col-span-2 text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary/50 mx-auto"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            훈련 진행도를 불러오는 중...
          </p>
        </div>
      ) : trainingProgressData && trainingProgressData.length > 0 ? (
        <>
          <div className="space-y-4">
            <h3 className="font-medium text-lg">훈련 레벨 분포</h3>
            <div className="flex flex-col space-y-3">
              {trainingProgressData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{
                        backgroundColor: index === 0 ? 'hsl(var(--secondary))' : 
                                       index === 1 ? 'hsl(var(--primary))' : 
                                       index === 2 ? 'hsl(var(--success))' : 
                                       index === 3 ? 'hsl(var(--warning))' : 'hsl(var(--muted-foreground))'
                      }}
                    />
                    <span className="font-medium">{item.skill}</span>
                  </div>
                  <span className="text-sm font-medium">{item.progress}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="w-48 h-48 rounded-full border-8 border-gray-200 dark:border-gray-700 flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 dark:from-primary/15 dark:to-secondary/15">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800 dark:text-white">
                  {Math.round(trainingProgressData.reduce((acc, item) => acc + item.progress, 0) / trainingProgressData.length)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">평균 진행도</div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="col-span-2 text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">
            훈련 진행도 데이터가 없습니다.
          </p>
        </div>
      )}
    </div>
  );

  const renderDoughnutChart = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {isLoading ? (
        <div className="col-span-3 text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary/50 mx-auto"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            훈련 진행도를 불러오는 중...
          </p>
        </div>
      ) : trainingProgressData && trainingProgressData.length > 0 ? (
        trainingProgressData.map((item, index) => (
          <div key={index} className="flex flex-col items-center p-4 border rounded-lg">
            <div className="relative w-24 h-24 mb-3">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
              <div 
                className="absolute inset-0 rounded-full border-4 border-t-transparent border-r-transparent transform -rotate-90 transition-all duration-1000"
                style={{
                  borderLeftColor: index === 0 ? 'hsl(var(--secondary))' : 
                                 index === 1 ? 'hsl(var(--primary))' : 
                                 index === 2 ? 'hsl(var(--success))' : 
                                 index === 3 ? 'hsl(var(--warning))' : 'hsl(var(--muted-foreground))',
                  borderBottomColor: index === 0 ? 'hsl(var(--secondary))' : 
                                   index === 1 ? 'hsl(var(--primary))' : 
                                   index === 2 ? 'hsl(var(--success))' : 
                                   index === 3 ? 'hsl(var(--warning))' : 'hsl(var(--muted-foreground))',
                  clipPath: `polygon(50% 50%, 50% 0%, ${50 + (item.progress / 100) * 50}% 0%, ${50 + (item.progress / 100) * 50}% 100%)`
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold">{item.progress}%</span>
              </div>
            </div>
            <h3 className="font-medium text-center">{item.skill}</h3>
            <Badge className={`${getLevelBadgeColor(item.level)} mt-1`}>
              {item.level}
            </Badge>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {item.sessions}회 세션
            </p>
          </div>
        ))
      ) : (
        <div className="col-span-3 text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">
            훈련 진행도 데이터가 없습니다.
          </p>
        </div>
      )}
    </div>
  );

  const renderRadarChart = () => (
    <div className="space-y-6">
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary/50 mx-auto"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            훈련 진행도를 불러오는 중...
          </p>
        </div>
      ) : trainingProgressData && trainingProgressData.length > 0 ? (
        <>
          <div className="flex items-center justify-center">
            <div className="relative w-80 h-80 border border-gray-200 dark:border-gray-700 rounded-full">
              {/* Radar grid lines */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-full relative">
                  {[20, 40, 60, 80, 100].map((radius) => (
                    <div
                      key={radius}
                      className="absolute border border-gray-300 dark:border-gray-600 rounded-full"
                      style={{
                        width: `${radius}%`,
                        height: `${radius}%`,
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)'
                      }}
                    />
                  ))}
                  {/* Skill labels */}
                  {trainingProgressData.map((item, index) => {
                    const angle = (index * 360) / trainingProgressData.length - 90;
                    const x = 50 + 45 * Math.cos((angle * Math.PI) / 180);
                    const y = 50 + 45 * Math.sin((angle * Math.PI) / 180);
                    return (
                      <div
                        key={index}
                        className="absolute text-xs font-medium"
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        {item.skill}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {trainingProgressData.map((item, index) => (
              <div key={index} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="font-medium text-sm">{item.skill}</div>
                <div className="text-lg font-bold text-primary">{item.progress}%</div>
                <Badge className={`${getLevelBadgeColor(item.level)} text-xs mt-1`}>
                  {item.level}
                </Badge>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">
            훈련 진행도 데이터가 없습니다.
          </p>
        </div>
      )}
    </div>
  );

  const renderAreaChart = () => (
    <div className="space-y-6">
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary/50 mx-auto"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            훈련 진행도를 불러오는 중...
          </p>
        </div>
      ) : trainingProgressData && trainingProgressData.length > 0 ? (
        <>
          <div className="h-64 bg-gradient-to-t from-primary to-transparent dark:from-primary border rounded-lg p-4 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-full flex items-end justify-around">
              {trainingProgressData.map((item, index) => (
                <div key={index} className="flex flex-col items-center w-full">
                  <div 
                    className="bg-gradient-to-t from-primary to-secondary w-8 transition-all duration-1000 ease-out rounded-t-lg"
                    style={{ height: `${(item.progress / 100) * 200}px` }}
                  />
                  <div className="text-xs font-medium mt-2 text-center">{item.skill}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {trainingProgressData.map((item, index) => (
              <div key={index} className="text-center p-3 border rounded-lg">
                <div className="font-medium">{item.skill}</div>
                <div className="text-xl font-bold text-primary">{item.progress}%</div>
                <Badge className={getLevelBadgeColor(item.level)}>
                  {item.level}
                </Badge>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {item.sessions}회
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">
            훈련 진행도 데이터가 없습니다.
          </p>
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">분석 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            분석 및 보고서
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {userName || '반려인'}님의 훈련 진행 상황과 성과를 확인하세요
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedUserId.toString()} onValueChange={(value) => setSelectedUserId(parseInt(value))}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="견주 선택" />
            </SelectTrigger>
            <SelectContent>
              {usersList?.filter(user => user.role === 'pet-owner').map((user) => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {user.name} ({user.pets?.length || 0}마리)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            필터
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            내보내기
          </Button>
        </div>
      </div>

      {/* 주요 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">총 훈련 세션</p>
                <p className="text-2xl font-bold">
                  {isLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    learningStatsData?.totalSessions || 0
                  )}
                </p>
              </div>
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">완료된 코스</p>
                <p className="text-2xl font-bold">
                  {isLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    learningStatsData?.completedCourses || 0
                  )}
                </p>
              </div>
              <Award className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">평균 점수</p>
                <p className="text-2xl font-bold">
                  {isLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    `${learningStatsData?.averageScore || 0}%`
                  )}
                </p>
              </div>
              <Target className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">연속 학습일</p>
                <p className="text-2xl font-bold">
                  {isLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    `${learningStatsData?.currentStreak || 0}일`
                  )}
                </p>
              </div>
              <Zap className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 탭 컨텐츠 */}
      <Tabs defaultValue="progress" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="progress">훈련 진행도</TabsTrigger>
          <TabsTrigger value="courses">내 강의</TabsTrigger>
          <TabsTrigger value="monthly">월간 리포트</TabsTrigger>
          <TabsTrigger value="insights">인사이트</TabsTrigger>
        </TabsList>

        {/* 훈련 진행도 탭 */}
        <TabsContent value="progress" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    스킬별 훈련 진행도
                  </CardTitle>
                  <CardDescription>
                    각 훈련 항목별 성취도와 숙련도를 확인하세요
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  {/* Chart Type Selector */}
                  <Select value={chartType} onValueChange={setChartType}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="차트 유형 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {chartTypes.map((type) => {
                        const IconComponent = type.icon;
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4" />
                              <span>{type.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  
                  {/* View Mode Toggle */}
                  <Select value={progressViewMode} onValueChange={setProgressViewMode}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="detailed">상세 보기</SelectItem>
                      <SelectItem value="summary">요약 보기</SelectItem>
                      <SelectItem value="compact">간단 보기</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {renderProgressChart()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 내 강의 탭 */}
        <TabsContent value="courses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                내 강의 현황
              </CardTitle>
              <CardDescription>
                수강 중인 강의의 진행 상황과 성과를 확인하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary/50 mx-auto"></div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      강의 데이터를 불러오는 중...
                    </p>
                  </div>
                ) : myCoursesData && myCoursesData.length > 0 ? (
                  <div className="grid gap-4">
                    {myCoursesData.map((course, index) => (
                      <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center">
                              <BookOpen className="h-6 w-6 text-primary dark:text-primary" />
                            </div>
                            <div>
                              <h3 className="font-medium text-lg">{course.title || '강의 제목'}</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {course.instructor || '강사명'} • {course.category || '카테고리'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-primary h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${course.progress || 0}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">{course.progress || 0}%</span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {course.completedLessons || 0}/{course.totalLessons || 0} 강의 완료
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                          <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                            <div className="font-medium text-success dark:text-success">
                              {course.averageScore || 0}%
                            </div>
                            <div className="text-gray-600 dark:text-gray-400">평균 점수</div>
                          </div>
                          <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                            <div className="font-medium text-primary dark:text-primary">
                              {course.timeSpent || 0}시간
                            </div>
                            <div className="text-gray-600 dark:text-gray-400">학습 시간</div>
                          </div>
                          <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                            <div className="font-medium text-primary dark:text-primary">
                              {course.lastAccessed || 'N/A'}
                            </div>
                            <div className="text-gray-600 dark:text-gray-400">최근 접속</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      수강 중인 강의가 없습니다.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                      새로운 강의를 등록하여 학습을 시작해보세요.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 월간 리포트 탭 */}
        <TabsContent value="monthly" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                월간 학습 트렌드
              </CardTitle>
              <CardDescription>
                최근 5개월간의 학습 패턴과 성과 변화를 확인하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary/50 mx-auto"></div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      월간 진행도를 불러오는 중...
                    </p>
                  </div>
                ) : monthlyProgressData && monthlyProgressData.length > 0 ? (
                  monthlyProgressData.map((month, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{month.month}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {month.sessions}회 세션
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-lg">{month.avgScore}%</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">평균 점수</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-400">
                      월간 진행도 데이터가 없습니다.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 인사이트 탭 */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  학습 패턴 분석
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">가장 활발한 시간대</span>
                    <span className="font-medium">오후 2-4시</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">선호하는 훈련 방식</span>
                    <span className="font-medium">반복 연습</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">강점 영역</span>
                    <span className="font-medium">기본 명령어</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">개선 필요 영역</span>
                    <span className="font-medium">고급 기술</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  추천 학습 계획
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-primary/10 dark:bg-primary/20 rounded-lg">
                    <h4 className="font-medium text-primary dark:text-primary mb-2">
                      이번 주 목표
                    </h4>
                    <p className="text-sm text-primary dark:text-primary">
                      "엎드리기" 명령어 80% 성공률 달성하기
                    </p>
                  </div>
                  <div className="p-3 bg-success/10 dark:bg-success/20 rounded-lg">
                    <h4 className="font-medium text-success dark:text-success mb-2">
                      장기 목표
                    </h4>
                    <p className="text-sm text-success dark:text-success">
                      고급 훈련 코스 시작 준비하기
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}