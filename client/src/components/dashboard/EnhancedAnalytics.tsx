import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  BookOpen, 
  Calendar,
  Award,
  Target,
  Clock,
  Activity,
  BarChart3
} from "lucide-react";

interface AnalyticsData {
  totalCourses: number;
  completedCourses: number;
  upcomingEvents: number;
  learningStreak: number;
  weeklyProgress: number;
  monthlyGoals: {
    completed: number;
    total: number;
  };
  skillProgress: {
    name: string;
    level: number;
    progress: number;
  }[];
  recentAchievements: {
    id: number;
    title: string;
    date: string;
    type: string;
  }[];
}

export function EnhancedAnalytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['/api/analytics/dashboard'],
    queryFn: () => apiRequest('GET', '/api/analytics/dashboard').then(res => res.json()) as Promise<AnalyticsData>
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* 주요 지표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">수강 강의</p>
                <p className="text-2xl font-bold">{analytics.totalCourses}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  완료: {analytics.completedCourses}
                </p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">학습 연속일</p>
                <p className="text-2xl font-bold">{analytics.learningStreak}일</p>
                <p className="text-xs text-blue-600 flex items-center mt-1">
                  <Activity className="h-3 w-3 mr-1" />
                  이번 주
                </p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">예정 일정</p>
                <p className="text-2xl font-bold">{analytics.upcomingEvents}</p>
                <p className="text-xs text-amber-600 flex items-center mt-1">
                  <Clock className="h-3 w-3 mr-1" />
                  이번 주
                </p>
              </div>
              <Calendar className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">주간 진도</p>
                <p className="text-2xl font-bold">{analytics.weeklyProgress}%</p>
                <p className="text-xs text-primary flex items-center mt-1">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  목표 대비
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 월간 목표 및 스킬 진행률 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              월간 목표
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">전체 진행률</span>
                <span className="text-sm text-gray-500">
                  {analytics.monthlyGoals.completed}/{analytics.monthlyGoals.total}
                </span>
              </div>
              <Progress 
                value={(analytics.monthlyGoals.completed / analytics.monthlyGoals.total) * 100} 
                className="h-2"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>완료된 목표</span>
                <span>{Math.round((analytics.monthlyGoals.completed / analytics.monthlyGoals.total) * 100)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 mr-2" />
              스킬 발전도
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.skillProgress.map((skill, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{skill.name}</span>
                    <Badge variant="outline">Level {skill.level}</Badge>
                  </div>
                  <Progress value={skill.progress} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 최근 성취 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Award className="h-5 w-5 mr-2" />
            최근 성취
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.recentAchievements.map((achievement) => (
              <div 
                key={achievement.id}
                className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex-shrink-0">
                  <Award className="h-6 w-6 text-yellow-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {achievement.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {achievement.date}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {achievement.type}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}