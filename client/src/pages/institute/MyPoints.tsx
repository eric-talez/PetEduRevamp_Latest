import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Star, Award, Target, Calendar, TrendingUp, Gift, Users, Building } from "lucide-react";

interface PointTransaction {
  id: string;
  type: '적립' | '사용' | '만료';
  amount: number;
  description: string;
  date: string;
  category: string;
  source: string;
}

interface MonthlyPoints {
  month: string;
  earned: number;
  used: number;
  expired: number;
}

interface PointsData {
  currentPoints: number;
  monthlyEarned: number;
  monthlyUsed: number;
  totalLifetimePoints: number;
  nextTierPoints: number;
  currentTier: string;
  transactions: PointTransaction[];
  monthlyData: MonthlyPoints[];
  upcomingExpiry: {
    amount: number;
    date: string;
  };
}

export default function InstituteMyPoints() {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: pointsData, isLoading } = useQuery<PointsData>({
    queryKey: ['/api/institute/my-points'],
    queryFn: async () => {
      const response = await fetch('/api/institute/my-points');
      if (!response.ok) {
        throw new Error('포인트 정보를 가져오지 못했습니다');
      }
      return response.json();
    }
  });

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'BRONZE': return 'bg-amber-100 text-amber-800';
      case 'SILVER': return 'bg-gray-100 text-gray-800';
      case 'GOLD': return 'bg-yellow-100 text-yellow-800';
      case 'PLATINUM': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case '적립': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case '사용': return <Gift className="w-4 h-4 text-blue-600" />;
      case '만료': return <Calendar className="w-4 h-4 text-red-600" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const data = pointsData || {
    currentPoints: 0,
    monthlyEarned: 0,
    monthlyUsed: 0,
    totalLifetimePoints: 0,
    nextTierPoints: 0,
    currentTier: 'BRONZE',
    transactions: [],
    monthlyData: [],
    upcomingExpiry: { amount: 0, date: '' }
  };

  const tierProgress = data.nextTierPoints > 0 ? (data.currentPoints / data.nextTierPoints) * 100 : 100;

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">내 포인트</h1>
          <p className="text-gray-600 dark:text-gray-400">기관 포인트 현황 및 관리</p>
        </div>
        <div className="flex items-center space-x-2">
          <Building className="w-5 h-5 text-primary" />
          <Badge className={getTierColor(data.currentTier)}>
            {data.currentTier} 등급
          </Badge>
        </div>
      </div>

      {/* 포인트 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span>보유 포인트</span>
              <Star className="w-4 h-4 text-yellow-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{data.currentPoints.toLocaleString()}P</div>
            <p className="text-xs text-gray-500 mt-1">현재 보유 중</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span>이번 달 적립</span>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.monthlyEarned.toLocaleString()}P</div>
            <p className="text-xs text-gray-500 mt-1">이번 달 획득</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span>이번 달 사용</span>
              <Gift className="w-4 h-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data.monthlyUsed.toLocaleString()}P</div>
            <p className="text-xs text-gray-500 mt-1">이번 달 사용</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span>누적 포인트</span>
              <Award className="w-4 h-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{data.totalLifetimePoints.toLocaleString()}P</div>
            <p className="text-xs text-gray-500 mt-1">총 누적 포인트</p>
          </CardContent>
        </Card>
      </div>

      {/* 등급 진행률 */}
      {data.nextTierPoints > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-primary" />
              <span>등급 진행률</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>다음 등급까지</span>
                <span>{data.nextTierPoints - data.currentPoints}P 남음</span>
              </div>
              <Progress value={tierProgress} className="h-2" />
              <p className="text-xs text-gray-500">
                {data.currentPoints.toLocaleString()}P / {data.nextTierPoints.toLocaleString()}P
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 탭 컨텐츠 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="transactions">거래내역</TabsTrigger>
          <TabsTrigger value="monthly">월별현황</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 곧 만료될 포인트 */}
            {data.upcomingExpiry.amount > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-orange-600">
                    <Calendar className="w-5 h-5" />
                    <span>곧 만료될 포인트</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{data.upcomingExpiry.amount.toLocaleString()}P</div>
                  <p className="text-sm text-gray-500 mt-1">만료일: {data.upcomingExpiry.date}</p>
                </CardContent>
              </Card>
            )}

            {/* 포인트 획득 방법 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span>포인트 획득 방법</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>훈련사 관리</span>
                    <span className="text-green-600">+50P</span>
                  </div>
                  <div className="flex justify-between">
                    <span>시설 이용 관리</span>
                    <span className="text-green-600">+30P</span>
                  </div>
                  <div className="flex justify-between">
                    <span>월간 리포트 작성</span>
                    <span className="text-green-600">+100P</span>
                  </div>
                  <div className="flex justify-between">
                    <span>교육 프로그램 운영</span>
                    <span className="text-green-600">+200P</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>최근 거래 내역</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">아직 포인트 거래 내역이 없습니다.</p>
                  </div>
                ) : (
                  data.transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getTransactionIcon(transaction.type)}
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-sm text-gray-500">{transaction.category} · {transaction.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${transaction.type === '적립' ? 'text-green-600' : transaction.type === '사용' ? 'text-blue-600' : 'text-red-600'}`}>
                          {transaction.type === '적립' ? '+' : '-'}{transaction.amount.toLocaleString()}P
                        </p>
                        <p className="text-xs text-gray-500">{transaction.source}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>월별 포인트 현황</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.monthlyData.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">아직 월별 데이터가 없습니다.</p>
                  </div>
                ) : (
                  data.monthlyData.map((monthData) => (
                    <div key={monthData.month} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{monthData.month}</h3>
                        <Badge variant="outline">
                          순증가: {(monthData.earned - monthData.used - monthData.expired).toLocaleString()}P
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <p className="text-green-600 font-bold">{monthData.earned.toLocaleString()}P</p>
                          <p className="text-gray-500">적립</p>
                        </div>
                        <div className="text-center">
                          <p className="text-blue-600 font-bold">{monthData.used.toLocaleString()}P</p>
                          <p className="text-gray-500">사용</p>
                        </div>
                        <div className="text-center">
                          <p className="text-red-600 font-bold">{monthData.expired.toLocaleString()}P</p>
                          <p className="text-gray-500">만료</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}