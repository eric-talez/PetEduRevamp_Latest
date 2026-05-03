import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from "@/lib/queryClient";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Building, 
  CheckCircle, 
  AlertCircle, 
  User, 
  Video, 
  Users, 
  Crown,
  Zap,
  Shield,
  Settings,
  Palette,
  Code,
  Headphones,
  Award
} from "lucide-react";

interface SubscriptionPlan {
  id: number;
  name: string;
  code: string;
  description: string;
  price: number;
  currency: string;
  billingPeriod: string;
  maxMembers: number;
  maxVideoHours: number;
  maxAiAnalysis: number;
  features: {
    basicLMS: boolean;
    basicVideoConsultation: boolean;
    basicStatistics: boolean;
    aiRecommendation: boolean;
    customBranding: boolean;
    apiIntegration: boolean;
    dedicatedSupport: boolean;
    whiteLabel: boolean;
  };
  isActive: boolean;
}

interface Institute {
  id: number;
  name: string;
  subscriptionPlan: string;
  subscriptionPrice: number;
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  paymentStatus: string;
  directorName: string;
  directorEmail: string;
  maxVideoHours?: number;
  maxAiAnalysis?: number;
  currentVideoUsage?: number;
  currentAiUsage?: number;
}

interface SubscriptionChangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  institute: Institute;
  subscriptionPlans: SubscriptionPlan[];
  currentUser: any;
}

export const SubscriptionChangeDialog: React.FC<SubscriptionChangeDialogProps> = ({
  isOpen,
  onClose,
  institute,
  subscriptionPlans,
  currentUser
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'self' | 'admin'>('self');
  const [cardInfo, setCardInfo] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });
  const [step, setStep] = useState<'select' | 'payment' | 'confirm'>('select');

  const currentPlan = subscriptionPlans.find(p => p.code === institute.subscriptionPlan);

  const subscriptionChangeMutation = useMutation({
    mutationFn: (data: { newPlanCode: string; paymentMethod: 'self' | 'admin' }) => 
      apiRequest('POST', `/api/institutes/${institute.id}/subscription/change`, data),
    onSuccess: (response) => {
      toast({
        title: '구독 변경 성공',
        description: response.message || '구독 플랜이 성공적으로 변경되었습니다.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/institutes'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: '구독 변경 실패',
        description: error.message || '구독 변경 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  });

  const paymentProcessMutation = useMutation({
    mutationFn: (paymentData: any) => 
      apiRequest('POST', `/api/institutes/${institute.id}/payment/process`, paymentData),
    onSuccess: (response) => {
      toast({
        title: '결제 완료',
        description: response.message || '결제가 성공적으로 처리되었습니다.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/institutes'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: '결제 실패',
        description: error.message || '결제 처리 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  });

  const getFeatureIcon = (feature: string, enabled: boolean) => {
    const iconClass = enabled ? 'text-green-500' : 'text-gray-400';
    
    switch (feature) {
      case 'basicLMS':
        return <CheckCircle className={`w-4 h-4 ${iconClass}`} />;
      case 'basicVideoConsultation':
        return <Video className={`w-4 h-4 ${iconClass}`} />;
      case 'basicStatistics':
        return <Settings className={`w-4 h-4 ${iconClass}`} />;
      case 'aiRecommendation':
        return <Zap className={`w-4 h-4 ${iconClass}`} />;
      case 'customBranding':
        return <Palette className={`w-4 h-4 ${iconClass}`} />;
      case 'apiIntegration':
        return <Code className={`w-4 h-4 ${iconClass}`} />;
      case 'dedicatedSupport':
        return <Headphones className={`w-4 h-4 ${iconClass}`} />;
      case 'whiteLabel':
        return <Award className={`w-4 h-4 ${iconClass}`} />;
      default:
        return <CheckCircle className={`w-4 h-4 ${iconClass}`} />;
    }
  };

  const handlePlanSelect = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setStep('payment');
  };

  const handlePaymentMethodChange = (method: 'self' | 'admin') => {
    setPaymentMethod(method);
  };

  const handleSubscriptionChange = () => {
    if (!selectedPlan) return;

    subscriptionChangeMutation.mutate({
      newPlanCode: selectedPlan.code,
      paymentMethod
    });
  };

  const handleDirectPayment = () => {
    if (!selectedPlan) return;

    // 기관 관리자 직접 결제
    paymentProcessMutation.mutate({
      transactionId: `tx-${Date.now()}`,
      cardInfo,
      amount: selectedPlan.price,
      planCode: selectedPlan.code
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const isUpgrade = selectedPlan && currentPlan && selectedPlan.price > currentPlan.price;
  const isDowngrade = selectedPlan && currentPlan && selectedPlan.price < currentPlan.price;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Building className="w-5 h-5" />
            <span>구독 플랜 변경</span>
          </DialogTitle>
          <DialogDescription>
            {institute.name}의 구독 플랜을 변경하고 결제를 진행하세요.
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-6">
            {/* 현재 구독 정보 */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">현재 구독 정보</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">플랜:</span>
                  <span className="ml-2 font-medium">{currentPlan?.name}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">월 요금:</span>
                  <span className="ml-2 font-medium">{formatPrice(currentPlan?.price || 0)}원</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">화상수업:</span>
                  <span className="ml-2 font-medium">{institute.currentVideoUsage || 0}/{institute.maxVideoHours || 0}시간</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">AI 분석:</span>
                  <span className="ml-2 font-medium">{institute.currentAiUsage || 0}/{institute.maxAiAnalysis || 0}회</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">결제 상태:</span>
                  <Badge variant={institute.paymentStatus === 'completed' ? 'default' : 'secondary'} className="ml-2">
                    {institute.paymentStatus === 'completed' ? '결제 완료' : '결제 대기'}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">종료일:</span>
                  <span className="ml-2">{new Date(institute.subscriptionEndDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* 구독 플랜 선택 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">새로운 구독 플랜 선택</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subscriptionPlans.map((plan) => (
                  <Card 
                    key={plan.id} 
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      plan.code === institute.subscriptionPlan ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => handlePlanSelect(plan)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        {plan.code === institute.subscriptionPlan && (
                          <Badge variant="default">현재 플랜</Badge>
                        )}
                      </div>
                      <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-2xl font-bold text-primary">
                          {formatPrice(plan.price)}원
                          <span className="text-sm text-gray-500 ml-1">/월</span>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            <span className="text-sm">
                              최대 {plan.maxMembers === -1 ? '무제한' : plan.maxMembers}명
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Video className="w-4 h-4 text-green-500" />
                            <span className="text-sm">
                              월 {plan.maxVideoHours === -1 ? '무제한' : plan.maxVideoHours}시간
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Zap className="w-4 h-4 text-primary" />
                            <span className="text-sm">
                              월 {plan.maxAiAnalysis === -1 ? '무제한' : plan.maxAiAnalysis}회 AI 분석
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h5 className="text-sm font-medium">포함 기능:</h5>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(plan.features).map(([key, enabled]) => (
                              <div key={key} className="flex items-center space-x-2">
                                {getFeatureIcon(key, enabled)}
                                <span className={`text-xs ${enabled ? 'text-green-600' : 'text-gray-400'}`}>
                                  {key === 'basicLMS' && '기본 LMS'}
                                  {key === 'basicVideoConsultation' && '화상 상담'}
                                  {key === 'basicStatistics' && '기본 통계'}
                                  {key === 'aiRecommendation' && 'AI 추천'}
                                  {key === 'customBranding' && '커스텀 브랜딩'}
                                  {key === 'apiIntegration' && 'API 연동'}
                                  {key === 'dedicatedSupport' && '전담 지원'}
                                  {key === 'whiteLabel' && '화이트라벨'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'payment' && selectedPlan && (
          <div className="space-y-6">
            {/* 변경 요약 */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">변경 요약</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>기존 플랜:</span>
                  <span>{currentPlan?.name} ({formatPrice(currentPlan?.price || 0)}원/월)</span>
                </div>
                <div className="flex justify-between">
                  <span>새 플랜:</span>
                  <span>{selectedPlan.name} ({formatPrice(selectedPlan.price)}원/월)</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>
                    {isUpgrade && '추가 결제 금액:'}
                    {isDowngrade && '환불 금액:'}
                    {!isUpgrade && !isDowngrade && '결제 금액:'}
                  </span>
                  <span className={isUpgrade ? 'text-red-600' : isDowngrade ? 'text-green-600' : ''}>
                    {formatPrice(Math.abs(selectedPlan.price - (currentPlan?.price || 0)))}원
                  </span>
                </div>
              </div>
            </div>

            {/* 결제 방법 선택 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">결제 방법 선택</h3>
              <RadioGroup value={paymentMethod} onValueChange={handlePaymentMethodChange}>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 p-4 border rounded-lg">
                    <RadioGroupItem value="self" id="self" />
                    <Label htmlFor="self" className="flex items-center space-x-2 cursor-pointer">
                      <CreditCard className="w-4 h-4" />
                      <div>
                        <div className="font-medium">기관 관리자 직접 결제</div>
                        <div className="text-sm text-gray-600">신용카드 또는 계좌이체로 직접 결제</div>
                      </div>
                    </Label>
                  </div>
                  
                  {currentUser?.role === 'admin' && (
                    <div className="flex items-center space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value="admin" id="admin" />
                      <Label htmlFor="admin" className="flex items-center space-x-2 cursor-pointer">
                        <Shield className="w-4 h-4" />
                        <div>
                          <div className="font-medium">관리자 대리 결제</div>
                          <div className="text-sm text-gray-600">시스템 관리자가 대신 결제 처리</div>
                        </div>
                      </Label>
                    </div>
                  )}
                </div>
              </RadioGroup>
            </div>

            {/* 직접 결제 정보 입력 */}
            {paymentMethod === 'self' && (
              <div className="space-y-4">
                <h4 className="font-medium">결제 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cardNumber">카드 번호</Label>
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      value={cardInfo.number}
                      onChange={(e) => setCardInfo({...cardInfo, number: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cardName">카드 소유자명</Label>
                    <Input
                      id="cardName"
                      placeholder="홍길동"
                      value={cardInfo.name}
                      onChange={(e) => setCardInfo({...cardInfo, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expiry">유효기간</Label>
                    <Input
                      id="expiry"
                      placeholder="MM/YY"
                      value={cardInfo.expiry}
                      onChange={(e) => setCardInfo({...cardInfo, expiry: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      placeholder="123"
                      value={cardInfo.cvv}
                      onChange={(e) => setCardInfo({...cardInfo, cvv: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          {step === 'select' && (
            <Button onClick={() => setStep('payment')} disabled={!selectedPlan}>
              결제 진행
            </Button>
          )}
          {step === 'payment' && (
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setStep('select')}>
                이전
              </Button>
              <Button 
                onClick={paymentMethod === 'self' ? handleDirectPayment : handleSubscriptionChange}
                disabled={subscriptionChangeMutation.isPending || paymentProcessMutation.isPending}
              >
                {subscriptionChangeMutation.isPending || paymentProcessMutation.isPending ? '처리 중...' : 
                 paymentMethod === 'self' ? '결제 완료' : '관리자 결제 요청'}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};