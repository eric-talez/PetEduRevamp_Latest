import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Star, 
  TrendingUp, 
  Users, 
  Activity,
  Trophy,
  Target,
  Award,
  Calendar,
  Building,
  Crown,
  BarChart3,
  Gift,
  ChevronRight,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface InstituteMyPointsData {
  currentPoints: number;
  totalEarned: number;
  monthlyPoints: number;
  level: string;
  nextLevelPoints: number;
  levelProgress: number;
  trainerCount: number;
  activities: InstituteActivity[];
  achievements: InstituteAchievement[];
  rewards: InstituteReward[];
  ranking: InstituteRanking;
  trainerStats: TrainerStats[];
}

interface InstituteActivity {
  id: string;
  type: 'trainer_management' | 'facility_upgrade' | 'curriculum_approval' | 'event_hosting' | 'partnership';
  title: string;
  description: string;
  points: number;
  date: string;
  status: 'completed' | 'pending' | 'processing';
  trainerName?: string;
}

interface InstituteAchievement {
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

interface InstituteReward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  category: 'facility' | 'certification' | 'marketing' | 'training';
  available: boolean;
  image?: string;
}

interface InstituteRanking {
  currentRank: number;
  totalInstitutes: number;
  percentile: number;
  category: string;
}

interface TrainerStats {
  id: string;
  name: string;
  points: number;
  monthlyPoints: number;
  level: string;
  isStarTrainer: boolean;
}

export default function InstituteMyPoints() {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: pointsData, isLoading } = useQuery<InstituteMyPointsData>({
    queryKey: ['/api/institute/my-points'],
    refetchInterval: 60000,
  });

  const defaultData: InstituteMyPointsData = {
    currentPoints: 1850,
    totalEarned: 5240,
    monthlyPoints: 420,
    level: 'Bronze',
    nextLevelPoints: 3000,
    levelProgress: 61.7,
    trainerCount: 3,
    activities: [
      {
        id: '1',
        type: 'trainer_management',
        title: '훈련사 등록 승인',
        description: '새로운 훈련사 김민수 등록 승인',
        points: 100,
        date: '2025-01-18',
        status: 'completed',
        trainerName: '김민수'
      },
      {
        id: '2',
        type: 'facility_upgrade',
        title: '시설 업그레이드',
        description: '훈련장 장비 업그레이드 완료',
        points: 200,
        date: '2025-01-17',
        status: 'completed'
      },
      {
        id: '3',
        type: 'curriculum_approval',
        title: '커리큘럼 승인',
        description: '고급 행동 교정 프로그램 승인',
        points: 150,
        date: '2025-01-16',
        status: 'processing'
      }
    ],
    achievements: [
      {
        id: '1',
        title: '첫 번째 훈련사',
        description: '첫 번째 훈련사를 등록하세요',
        icon: 'users',
        points: 100,
        unlockedAt: '2025-01-10',
        progress: 1,
        target: 1,
        isCompleted: true
      },
      {
        id: '2',
        title: '훈련사 팀 구성',
        description: '5명의 훈련사 팀을 구성하세요',
        icon: 'users',
        points: 500,
        progress: 3,
        target: 5,
        isCompleted: false
      }
    ],
    rewards: [
      {
        id: '1',
        title: '마케팅 지원',
        description: '기관 홍보 마케팅 지원',
        pointsCost: 1500,
        category: 'marketing',
        available: true
      },
      {
        id: '2',
        title: '시설 업그레이드',
        description: '훈련 시설 업그레이드 지원',
        pointsCost: 2500,
        category: 'facility',
        available: false
      }
    ],
    ranking: {
      currentRank: 8,
      totalInstitutes: 45,
      percentile: 82.2,
      category: 'small'
    },
    trainerStats: [
      {
        id: '1',
        name: '김민수',
        points: 2100,
        monthlyPoints: 350,
        level: 'Silver',
        isStarTrainer: false
      },
      {
        id: '2',
        name: '이영희',
        points: 1800,
        monthlyPoints: 280,
        level: 'Bronze',
        isStarTrainer: false
      }
    ]
  };

  const data = pointsData || defaultData;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'trainer_management': return <Users className="w-4 h-4" />;
      case 'facility_upgrade': return <Building className="w-4 h-4" />;
      case 'curriculum_approval': return <Trophy className="w-4 h-4" />;
      case 'event_hosting': return <Calendar className="w-4 h-4" />;
      case 'partnership': return <Star className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'trainer_management': return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary/70';
      case 'facility_upgrade': return 'bg-success/10 text-success dark:bg-success/20 dark:text-success/70';
      case 'curriculum_approval': return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground';
      case 'event_hosting': return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary/70';
      case 'partnership': return 'bg-secondary/15 text-secondary-foreground dark:bg-secondary/20 dark:text-secondary-foreground';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success/10 text-success dark:bg-success/20 dark:text-success/70';
      case 'pending': return 'bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning/70';
      case 'processing': return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary/70';
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

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Diamond': return 'text-primary';
      case 'Gold': return 'text-warning';
      case 'Silver': return 'text-gray-600';
      case 'Bronze': return 'text-primary';
      default: return 'text-gray-600';
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
          <p className="text-gray-600 dark:text-gray-400">기관 운영 포인트를 확인하고 관리하세요</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Building className="w-4 h-4" />
          기관 관리자
        </Badge>
      </div>

      {/* 포인트 현황 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-primary to-secondary text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-success/70">현재 포인트</p>
                <p className="text-3xl font-bold">{data.currentPoints.toLocaleString()}</p>
              </div>
              <Star className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">총 획득 포인트</p>
                <p className="text-2xl font-bold text-success">{data.totalEarned.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-success" />
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
                <p className="text-sm text-gray-600 dark:text-gray-400">소속 훈련사</p>
                <p className="text-2xl font-bold text-primary">{data.trainerCount}</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 레벨 진행률 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            기관 레벨 진행률
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">활동 내역</TabsTrigger>
          <TabsTrigger value="trainers">훈련사 현황</TabsTrigger>
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
                          {activity.trainerName && (
                            <>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-primary dark:text-primary">{activity.trainerName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(activity.status)}>
                        {activity.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {getStatusText(activity.status)}
                      </Badge>
                      <span className="font-bold text-primary dark:text-primary">
                        +{activity.points}P
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 훈련사 현황 */}
        <TabsContent value="trainers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                소속 훈련사 포인트 현황
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.trainerStats.map((trainer, index) => (
                  <div key={trainer.id} className="flex items-center justify-between p-4 border rounded-lg dark:border-gray-700">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full">
                        <span className="font-bold text-gray-600 dark:text-gray-300">{index + 1}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-primary to-secondary/50 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">{trainer.name[0]}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{trainer.name}</p>
                            {trainer.isStarTrainer && (
                              <Badge className="bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning/70">
                                <Crown className="w-3 h-3 mr-1" />
                                Star
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            레벨: <span className={`font-medium ${getLevelColor(trainer.level)}`}>{trainer.level}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary dark:text-primary">{trainer.points.toLocaleString()}P</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        이달 +{trainer.monthlyPoints.toLocaleString()}P
                      </p>
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
                기관 업적
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.achievements.map((achievement) => (
                  <div key={achievement.id} className="flex items-center justify-between p-4 border rounded-lg dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${achievement.isCompleted ? 'bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning/70' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
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
                        <Badge className="bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning/70">
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
                기관 보상
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.rewards.map((reward) => (
                  <div key={reward.id} className="border rounded-lg p-4 dark:border-gray-700">
                    <div className="aspect-video bg-gradient-to-r from-primary to-secondary dark:from-primary dark:to-secondary rounded-lg mb-3 flex items-center justify-center">
                      <Building className="w-8 h-8 text-success dark:text-success" />
                    </div>
                    <h3 className="font-medium mb-1">{reward.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{reward.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary dark:text-primary">
                        {reward.pointsCost.toLocaleString()}P
                      </span>
                      <Button 
                        size="sm" 
                        disabled={!reward.available || data.currentPoints < reward.pointsCost}
                        className="bg-gradient-to-r from-primary to-secondary hover:from-primary hover:to-secondary"
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
                기관 순위
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-primary to-secondary rounded-full mb-4">
                  <span className="text-2xl font-bold text-white">{data.ranking.currentRank}</span>
                </div>
                <h3 className="text-2xl font-bold mb-2">전체 {data.ranking.currentRank}위</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  총 {data.ranking.totalInstitutes}개 기관 중 상위 {(100 - data.ranking.percentile).toFixed(1)}%
                </p>
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                  <div className="p-3 bg-primary/10 dark:bg-primary/20 rounded-lg">
                    <p className="text-sm text-primary dark:text-primary">현재 포인트</p>
                    <p className="text-lg font-bold">{data.currentPoints.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-success/10 dark:bg-success/20 rounded-lg">
                    <p className="text-sm text-success dark:text-success">소속 훈련사</p>
                    <p className="text-lg font-bold">{data.trainerCount}명</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}