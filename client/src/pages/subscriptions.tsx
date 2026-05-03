import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  AlertTriangle,
  Crown,
  Star,
  Zap,
  Shield,
  Settings,
  X
} from 'lucide-react';

export default function SubscriptionsPage() {
  const [currentPlan, setCurrentPlan] = useState('premium');
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  // 현재 구독 정보
  const currentSubscription = {
    planName: '프리미엄 플랜',
    price: 29900,
    billingCycle: 'monthly',
    nextBilling: '2025-06-26',
    status: 'active',
    features: [
      '무제한 영상 훈련',
      '1:1 전문가 상담',
      'AI 분석 리포트',
      '프리미엄 커뮤니티 접근',
      '우선 고객 지원'
    ]
  };

  // 사용 가능한 플랜들
  const plans = [
    {
      id: 'basic',
      name: '베이직 플랜',
      price: 9900,
      originalPrice: null,
      icon: <Shield className="w-6 h-6" />,
      features: [
        '월 5개 영상 훈련',
        '기본 AI 분석',
        '커뮤니티 접근',
        '이메일 지원'
      ],
      popular: false
    },
    {
      id: 'premium',
      name: '프리미엄 플랜',
      price: 29900,
      originalPrice: 39900,
      icon: <Star className="w-6 h-6" />,
      features: [
        '무제한 영상 훈련',
        '1:1 전문가 상담',
        'AI 분석 리포트',
        '프리미엄 커뮤니티 접근',
        '우선 고객 지원'
      ],
      popular: true
    },
    {
      id: 'pro',
      name: '프로 플랜',
      price: 49900,
      originalPrice: null,
      icon: <Crown className="w-6 h-6" />,
      features: [
        '모든 프리미엄 기능',
        '개인 맞춤 훈련 계획',
        '실시간 전문가 상담',
        '고급 AI 분석 도구',
        '24/7 전화 지원',
        '독점 이벤트 참여'
      ],
      popular: false
    }
  ];

  const handlePlanChange = (planId: string) => {
    setIsChangingPlan(true);
    // 실제 구현에서는 결제 API 호출
    setTimeout(() => {
      setCurrentPlan(planId);
      setIsChangingPlan(false);
    }, 2000);
  };

  const handleCancelSubscription = () => {
    setIsCanceling(true);
    // 실제 구현에서는 구독 취소 API 호출
    setTimeout(() => {
      setIsCanceling(false);
    }, 2000);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">구독 관리</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          현재 구독을 관리하고 플랜을 변경하세요
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">구독 개요</TabsTrigger>
          <TabsTrigger value="plans">플랜 변경</TabsTrigger>
          <TabsTrigger value="payment">결제 수단</TabsTrigger>
          <TabsTrigger value="settings">구독 설정</TabsTrigger>
        </TabsList>

        {/* 구독 개요 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 현재 구독 상태 */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-500" />
                      {currentSubscription.planName}
                    </CardTitle>
                    <CardDescription>현재 활성 구독</CardDescription>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    활성
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">월 요금</p>
                      <p className="font-semibold">{formatPrice(currentSubscription.price)}원</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">다음 결제일</p>
                      <p className="font-semibold">{currentSubscription.nextBilling}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">포함된 기능</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {currentSubscription.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 사용량 요약 */}
            <Card>
              <CardHeader>
                <CardTitle>이번 달 사용량</CardTitle>
                <CardDescription>플랜 한도 대비 사용률</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>영상 훈련</span>
                      <span>무제한</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full w-full"></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>전문가 상담</span>
                      <span>12/무제한</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full w-full"></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>AI 분석</span>
                      <span>89/무제한</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-primary/50 h-2 rounded-full w-full"></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 플랜 변경 */}
        <TabsContent value="plans" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className={`relative ${plan.popular ? 'ring-2 ring-blue-500' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white">인기</Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-2">
                    {plan.icon}
                  </div>
                  <CardTitle>{plan.name}</CardTitle>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-3xl font-bold">{formatPrice(plan.price)}원</span>
                      {plan.originalPrice && (
                        <span className="text-lg text-gray-500 line-through">
                          {formatPrice(plan.originalPrice)}원
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">월</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    className="w-full"
                    variant={currentPlan === plan.id ? "secondary" : "default"}
                    disabled={currentPlan === plan.id || isChangingPlan}
                    onClick={() => handlePlanChange(plan.id)}
                  >
                    {currentPlan === plan.id ? '현재 플랜' : 
                     isChangingPlan ? '변경 중...' : '플랜 변경'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 결제 수단 */}
        <TabsContent value="payment" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 현재 결제 수단 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  현재 결제 수단
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-primary rounded flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">**** **** **** 1234</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">만료: 12/28</p>
                    </div>
                  </div>
                  <Badge variant="secondary">기본</Badge>
                </div>
                
                <div className="space-y-3">
                  <Button variant="outline" className="w-full">
                    <CreditCard className="w-4 h-4 mr-2" />
                    결제 수단 변경
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Settings className="w-4 h-4 mr-2" />
                    자동 결제 설정
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 결제 내역 */}
            <Card>
              <CardHeader>
                <CardTitle>최근 결제 내역</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { date: '2025-05-26', amount: 29900, status: 'completed' },
                    { date: '2025-04-26', amount: 29900, status: 'completed' },
                    { date: '2025-03-26', amount: 29900, status: 'completed' }
                  ].map((payment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{formatPrice(payment.amount)}원</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{payment.date}</p>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        완료
                      </Badge>
                    </div>
                  ))}
                </div>
                
                <Button variant="ghost" className="w-full mt-4">
                  전체 결제 내역 보기
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 구독 설정 */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 구독 설정 */}
            <Card>
              <CardHeader>
                <CardTitle>구독 설정</CardTitle>
                <CardDescription>구독 관련 설정을 관리하세요</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">자동 갱신</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">매월 자동으로 구독을 갱신합니다</p>
                    </div>
                    <Button variant="outline" size="sm">
                      활성화됨
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">결제 알림</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">결제 전 미리 알림을 받습니다</p>
                    </div>
                    <Button variant="outline" size="sm">
                      활성화됨
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">사용량 알림</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">플랜 한도 도달 시 알림을 받습니다</p>
                    </div>
                    <Button variant="outline" size="sm">
                      활성화됨
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 구독 취소 */}
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400">구독 취소</CardTitle>
                <CardDescription>구독을 취소하면 다음 결제일에 서비스가 종료됩니다</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    구독을 취소하면 2025년 6월 26일까지만 서비스를 이용할 수 있습니다.
                    취소 후에도 해당 날짜까지는 모든 기능을 계속 사용하실 수 있습니다.
                  </AlertDescription>
                </Alert>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <X className="w-4 h-4 mr-2" />
                      구독 취소
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>구독을 정말 취소하시겠습니까?</DialogTitle>
                      <DialogDescription>
                        구독을 취소하면 다음과 같은 변화가 있습니다:
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <X className="w-4 h-4 text-red-500" />
                          <span className="text-sm">무제한 영상 훈련 이용 불가</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <X className="w-4 h-4 text-red-500" />
                          <span className="text-sm">1:1 전문가 상담 이용 불가</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <X className="w-4 h-4 text-red-500" />
                          <span className="text-sm">AI 분석 리포트 이용 불가</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="destructive" 
                          className="flex-1"
                          onClick={handleCancelSubscription}
                          disabled={isCanceling}
                        >
                          {isCanceling ? '취소 중...' : '구독 취소'}
                        </Button>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="flex-1">
                            돌아가기
                          </Button>
                        </DialogTrigger>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}