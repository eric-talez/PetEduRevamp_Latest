import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AchievementGrid } from '@/components/achievements/AchievementGrid';
import { useAchievements } from '@/hooks/useAchievements';
import { AchievementsProvider } from '@/hooks/useAchievements';
import { useAuth } from '../../SimpleApp';
import { Award, Medal, Trophy } from 'lucide-react';

export default function AchievementsPage() {
  const auth = useAuth();
  
  // 사용자 인증 확인
  if (!auth || !auth.isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">로그인이 필요합니다</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              성취 배지를 확인하려면 먼저 로그인해주세요.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AchievementsProvider>
      <AchievementsPageContent />
    </AchievementsProvider>
  );
}

function AchievementsPageContent() {
  const { achievements, userAchievements, checkAchievements } = useAchievements();
  const auth = useAuth();
  
  useEffect(() => {
    checkAchievements();
  }, [checkAchievements]);
  
  // 잠금 해제된 배지 수 계산
  const unlockedCount = userAchievements.filter(ua => ua.unlocked).length;
  const totalCount = achievements.length;
  const unlockedPercentage = Math.round((unlockedCount / totalCount) * 100);
  
  // 역할별 타이틀 설정
  const getRoleTitle = () => {
    // auth.userRole 사용
    const userRole = auth?.userRole || 'user';
    
    switch (userRole) {
      case 'pet-owner':
        return '반려인';
      case 'trainer':
        return '훈련사';
      case 'institute-admin':
        return '기관 관리자';
      case 'admin':
        return '시스템 관리자';
      default:
        return '사용자';
    }
  };
  
  // 달성률에 따른 등급 및 아이콘 결정
  const getAchievementRank = () => {
    if (unlockedPercentage >= 75) {
      return {
        title: '마스터',
        description: '탈레즈의 모든 기능을 능숙하게 활용하고 있습니다!',
        icon: <Trophy className="h-12 w-12 text-warning" />
      };
    } else if (unlockedPercentage >= 50) {
      return {
        title: '고급 사용자',
        description: '탈레즈의 다양한 기능을 활용하고 있습니다.',
        icon: <Medal className="h-12 w-12 text-primary" />
      };
    } else if (unlockedPercentage >= 25) {
      return {
        title: '중급 사용자',
        description: '탈레즈의 주요 기능을 사용하고 있습니다.',
        icon: <Award className="h-12 w-12 text-slate-400" />
      };
    } else {
      return {
        title: '초보 사용자',
        description: '탈레즈와 함께하는 여정을 시작했습니다.',
        icon: <Award className="h-12 w-12 text-warning" />
      };
    }
  };
  
  const rank = getAchievementRank();
  
  return (
    <div className="container py-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">내 성취 배지</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">달성률</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{unlockedPercentage}%</div>
            <p className="text-muted-foreground text-sm">
              {totalCount}개 중 {unlockedCount}개 달성
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">사용자 유형</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{getRoleTitle()}</div>
            <p className="text-muted-foreground text-sm">
              {auth.userRole === 'pet-owner' ? '반려동물과 함께하는 여정' : 
               auth.userRole === 'trainer' ? '전문 지식 공유' : 
               '서비스 관리 및 운영'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">현재 등급</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              {rank.icon}
            </div>
            <div>
              <div className="text-xl font-bold">{rank.title}</div>
              <p className="text-muted-foreground text-sm">{rank.description}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <AchievementGrid className="mb-8" />
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>배지 등급 안내</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center p-4 bg-muted rounded-lg">
              <div className="w-12 h-12 rounded-full bg-warning flex items-center justify-center mr-4">
                <Award className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">브론즈</h3>
                <p className="text-sm text-muted-foreground">기본 활동 완료</p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-muted rounded-lg">
              <div className="w-12 h-12 rounded-full bg-slate-400 flex items-center justify-center mr-4">
                <Award className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">실버</h3>
                <p className="text-sm text-muted-foreground">중급 활동 완료</p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-muted rounded-lg">
              <div className="w-12 h-12 rounded-full bg-warning/40 flex items-center justify-center mr-4">
                <Award className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">골드</h3>
                <p className="text-sm text-muted-foreground">고급 활동 완료</p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-muted rounded-lg">
              <div className="w-12 h-12 rounded-full bg-primary/40 flex items-center justify-center mr-4">
                <Award className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">플래티넘</h3>
                <p className="text-sm text-muted-foreground">최고 난이도 달성</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}