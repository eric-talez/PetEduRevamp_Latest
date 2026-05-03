import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Star, 
  TrendingUp, 
  Trophy, 
  Calendar, 
  Activity,
  Gift,
  Target,
  Award,
  Video,
  BookOpen,
  MessageSquare,
  Users,
  Crown,
  Zap,
  ChevronRight,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface MyPointsData {
  currentPoints: number;
  totalEarned: number;
  monthlyPoints: number;
  level: string;
  nextLevelPoints: number;
  levelProgress: number;
  activities: MyActivity[];
  achievements: MyAchievement[];
  rewards: AvailableReward[];
  ranking: TrainerRanking;
}

interface MyActivity {
  id: string;
  type: 'review' | 'consultation' | 'course' | 'community' | 'referral';
  title: string;
  description: string;
  points: number;
  date: string;
  status: 'completed' | 'pending' | 'processing';
}

interface MyAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  unlockedAt?: string;
  progress: number;
  target: number;
  isCompleted: boolean;
}

interface AvailableReward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  category: 'cash' | 'gift' | 'certification' | 'service';
  available: boolean;
  image?: string;
}

interface TrainerRanking {
  currentRank: number;
  totalTrainers: number;
  percentile: number;
  isStarTrainer: boolean;
}

export default function MyPoints() {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: pointsData, isLoading } = useQuery<MyPointsData>({
    queryKey: ['/api/trainer/my-points'],
    refetchInterval: 30000,
  });

  const defaultData: MyPointsData = {
    currentPoints: 2450,
    totalEarned: 8320,
    monthlyPoints: 680,
    level: 'Silver',
    nextLevelPoints: 5000,
    levelProgress: 49,
    activities: [
      {
        id: '1',
        type: 'review',
        title: '영상 리뷰 작성',
        description: '강아지 기초 훈련 영상 리뷰 작성',
        points: 50,
        date: '2025-01-18',
        status: 'completed'
      },
      {
        id: '2',
        type: 'consultation',
        title: '화상 상담 완료',
        description: '보더콜리 행동 교정 상담',
        points: 100,
        date: '2025-01-17',
        status: 'completed'
      },
      {
        id: '3',
        type: 'course',
        title: '커리큘럼 등록',
        description: '퍼피 사회화 프로그램 등록',
        points: 200,
        date: '2025-01-16',
        status: 'processing'
      }
    ],
    achievements: [
      {
        id: '1',
        title: '첫 번째 리뷰',
        description: '첫 번째 영상 리뷰를 작성하세요',
        icon: 'star',
        points: 50,
        unlockedAt: '2025-01-15',
        progress: 1,
        target: 1,
        isCompleted: true
      },
      {
        id: '2',
        title: '상담 전문가',
        description: '화상 상담 10회 완료',
        icon: 'message-square',
        points: 500,
        progress: 7,
        target: 10,
        isCompleted: false
      }
    ],
    rewards: [
      {
        id: '1',
        title: '5만원 상금',
        description: '현금 보상',
        pointsCost: 2000,
        category: 'cash',
        available: true
      },
      {
        id: '2',
        title: '전문가 인증서',
        description: 'TALEZ 전문가 인증서',
        pointsCost: 3000,
        category: 'certification',
        available: false
      }
    ],
    ranking: {
      currentRank: 15,
      totalTrainers: 120,
      percentile: 87.5,
      isStarTrainer: false
    }
  };

  const data = pointsData || defaultData;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'review': return <Video className="w-4 h-4" />;
      case 'consultation': return <MessageSquare className="w-4 h-4" />;
      case 'course': return <BookOpen className="w-4 h-4" />;
      case 'community': return <Users className="w-4 h-4" />;
      case 'referral': return <Gift className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'review': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'consultation': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'course': return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground';
      case 'community': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'referral': return 'bg-secondary/15 text-primary dark:bg-secondary/20 dark:text-secondary-foreground';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '완료';
      case 'pending': return '대기';
      case 'processing': return '처리중';
      default: return '알 수 없음';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">내 포인트</h1>
          <p className="text-gray-600 dark:text-gray-400">활동 포인트를 확인하고 보상을 받아보세요</p>
        </div>
        {data.ranking.isStarTrainer && (
          <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
            <Crown className="w-4 h-4 mr-1" />
            Star Trainer
          </Badge>
        )}
      </div>

      {/* 포인트 현황 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-primary text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">현재 포인트</p>
                <p className="text-3xl font-bold">{data.currentPoints.toLocaleString()}</p>
              </div>
              <Star className="w-8 h-8 text-yellow-300" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">총 획득 포인트</p>
                <p className="text-2xl font-bold text-green-600">{data.totalEarned.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">이달 포인트</p>
                <p className="text-2xl font-bold text-primary">{data.monthlyPoints.toLocaleString()}</p>
              </div>
              <Calendar className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">전체 순위</p>
                <p className="text-2xl font-bold text-orange-600">{data.ranking.currentRank}위</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">상위 {(100 - data.ranking.percentile).toFixed(1)}%</p>
              </div>
              <Trophy className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 레벨 진행률 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            레벨 진행률
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {data.level}
                </Badge>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">다음 레벨</span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {data.currentPoints} / {data.nextLevelPoints}
              </span>
            </div>
            <Progress value={data.levelProgress} className="h-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              다음 레벨까지 {data.nextLevelPoints - data.currentPoints}포인트 필요
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 탭 섹션 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">활동 내역</TabsTrigger>
          <TabsTrigger value="achievements">업적</TabsTrigger>
          <TabsTrigger value="rewards">보상</TabsTrigger>
          <TabsTrigger value="ranking">순위</TabsTrigger>
        </TabsList>

        {/* 활동 내역 */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                최근 활동 내역
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.activities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div>
                        <h3 className="font-medium">{activity.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{activity.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">{activity.date}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(activity.status)}>
                        {activity.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {getStatusText(activity.status)}
                      </Badge>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        +{activity.points}P
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 업적 */}
        <TabsContent value="achievements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                나의 업적
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.achievements.map((achievement) => (
                  <div key={achievement.id} className="flex items-center justify-between p-4 border rounded-lg dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${achievement.isCompleted ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                        <Trophy className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{achievement.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{achievement.description}</p>
                        <div className="mt-2">
                          <div className="flex justify-between text-sm mb-1">
                            <span>진행률</span>
                            <span>{achievement.progress} / {achievement.target}</span>
                          </div>
                          <Progress value={(achievement.progress / achievement.target) * 100} className="h-2" />
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {achievement.isCompleted ? (
                        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          <Crown className="w-3 h-3 mr-1" />
                          달성완료
                        </Badge>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {achievement.points}P
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 보상 */}
        <TabsContent value="rewards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5" />
                포인트 보상
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.rewards.map((reward) => (
                  <div key={reward.id} className="border rounded-lg p-4 dark:border-gray-700">
                    <div className="aspect-video bg-gradient-to-r from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 rounded-lg mb-3 flex items-center justify-center">
                      <Gift className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-medium mb-1">{reward.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{reward.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {reward.pointsCost.toLocaleString()}P
                      </span>
                      <Button 
                        size="sm" 
                        disabled={!reward.available || data.currentPoints < reward.pointsCost}
                        className="bg-gradient-to-r from-blue-500 to-primary hover:from-blue-600 hover:to-primary/90"
                      >
                        {data.currentPoints < reward.pointsCost ? '포인트 부족' : '교환하기'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 순위 */}
        <TabsContent value="ranking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                내 순위
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-orange-400 to-red-500 rounded-full mb-4">
                  <span className="text-2xl font-bold text-white">{data.ranking.currentRank}</span>
                </div>
                <h3 className="text-2xl font-bold mb-2">전체 {data.ranking.currentRank}위</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  총 {data.ranking.totalTrainers}명 중 상위 {(100 - data.ranking.percentile).toFixed(1)}%
                </p>
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-600 dark:text-blue-400">현재 포인트</p>
                    <p className="text-lg font-bold">{data.currentPoints.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-green-600 dark:text-green-400">이달 포인트</p>
                    <p className="text-lg font-bold">{data.monthlyPoints.toLocaleString()}</p>
                  </div>
                </div>
                {!data.ranking.isStarTrainer && (
                  <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Crown className="w-5 h-5 text-yellow-600" />
                      <span className="font-medium text-yellow-800 dark:text-yellow-200">Star Trainer 도전</span>
                    </div>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      상위 10% 진입으로 Star Trainer가 되어보세요!
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}