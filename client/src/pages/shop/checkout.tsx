import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CreditCard, 
  ShoppingBag, 
  GraduationCap, 
  Check, 
  MapPin, 
  Truck,
  Shield,
  RotateCcw,
  Star,
  ChevronRight,
  Search,
  Phone,
  User,
  Mail,
  Home,
  Package
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TrustBadges } from '@/components/shop/MiniCart';

const FREE_SHIPPING_THRESHOLD = 30000;

interface CheckoutStep {
  id: number;
  title: string;
  description: string;
  icon: any;
}

const checkoutSteps: CheckoutStep[] = [
  { id: 1, title: '장바구니', description: '상품 확인', icon: ShoppingBag },
  { id: 2, title: '배송정보', description: '배송지 입력', icon: MapPin },
  { id: 3, title: '결제', description: '결제 수단', icon: CreditCard },
  { id: 4, title: '완료', description: '주문 완료', icon: Check },
];

function CheckoutProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {checkoutSteps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center relative">
                <div 
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                    ${isCompleted ? 'bg-green-500 border-green-500 text-white' : ''}
                    ${isCurrent ? 'bg-primary border-primary text-white scale-110 shadow-lg' : ''}
                    ${!isCompleted && !isCurrent ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400' : ''}
                  `}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <div className="mt-2 text-center">
                  <p className={`text-sm font-medium ${isCurrent ? 'text-primary' : 'text-gray-600 dark:text-gray-400'}`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
                    {step.description}
                  </p>
                </div>
              </div>
              
              {index < checkoutSteps.length - 1 && (
                <div 
                  className={`
                    flex-1 h-1 mx-2 rounded transition-all duration-300
                    ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(2);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddressSearching, setIsAddressSearching] = useState(false);
  
  const [orderData, setOrderData] = useState({
    type: 'product',
    items: [] as any[],
    totalAmount: 0,
    shippingFee: 0,
    courseInfo: null as any
  });
  
  const [shippingInfo, setShippingInfo] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    addressDetail: '',
    zipCode: '',
    memo: ''
  });
  
  const [paymentInfo, setPaymentInfo] = useState({
    method: 'card',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
    cardName: '',
    agreeTerms: false
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type') || 'product';
    const id = urlParams.get('id');
    const amount = parseInt(urlParams.get('amount') || '0');

    if (type === 'course' && id) {
      fetchCourseInfo(id).then(courseInfo => {
        setOrderData({
          type: 'course',
          items: [],
          totalAmount: amount,
          shippingFee: 0,
          courseInfo
        });
      });
    } else {
      loadCartItems();
    }
    
    loadUserInfo();
  }, []);

  const loadUserInfo = () => {
    const authState = (window as any).__peteduAuthState;
    if (authState?.isAuthenticated && authState?.userName) {
      setShippingInfo(prev => ({
        ...prev,
        name: authState.userName || ''
      }));
    }
  };

  const fetchCourseInfo = async (courseId: string) => {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      if (!response.ok) {
        throw new Error('강의 정보를 가져오지 못했습니다.');
      }
      return await response.json();
    } catch (error) {
      console.error('강의 정보 로드 오류:', error);
      toast({
        title: "오류",
        description: "강의 정보를 불러오는 데 실패했습니다.",
        variant: "destructive",
      });
      return null;
    }
  };

  const loadCartItems = () => {
    try {
      const checkoutData = sessionStorage.getItem('checkout_items');
      if (checkoutData) {
        const parsed = JSON.parse(checkoutData);
        setOrderData({
          type: 'product',
          items: parsed.items || [],
          totalAmount: parsed.total || 0,
          shippingFee: parsed.shippingFee || 0,
          courseInfo: null
        });
        return;
      }
      
      const cartItems = JSON.parse(localStorage.getItem('petedu_cart') || '[]');
      const subtotal = cartItems.reduce((sum: number, item: any) => 
        sum + (item.price * item.quantity), 0);
      const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 3000;

      setOrderData({
        type: 'product',
        items: cartItems,
        totalAmount: subtotal + shippingFee,
        shippingFee,
        courseInfo: null
      });
    } catch (error) {
      console.error('장바구니 로드 오류:', error);
      toast({
        title: "오류",
        description: "장바구니를 불러오는 데 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleAddressSearch = () => {
    setIsAddressSearching(true);
    
    if ((window as any).daum?.Postcode) {
      new (window as any).daum.Postcode({
        oncomplete: (data: any) => {
          setShippingInfo(prev => ({
            ...prev,
            zipCode: data.zonecode,
            address: data.address
          }));
          setIsAddressSearching(false);
        },
        onclose: () => {
          setIsAddressSearching(false);
        }
      }).open();
    } else {
      toast({
        title: "주소 검색",
        description: "주소를 직접 입력해주세요.",
      });
      setIsAddressSearching(false);
    }
  };

  const validateShippingInfo = () => {
    if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address) {
      toast({
        title: "필수 정보를 입력해주세요",
        description: "이름, 연락처, 주소는 필수입니다.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 2 && !validateShippingInfo()) {
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const ensureTossLoaded = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if ((window as any).TossPayments) {
        resolve();
        return;
      }
      const existing = document.querySelector('script[src="https://js.tosspayments.com/v1/payment"]') as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Toss SDK 로드 실패')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://js.tosspayments.com/v1/payment';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Toss SDK 로드 실패'));
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!paymentInfo.agreeTerms) {
      toast({
        title: "약관 동의 필요",
        description: "결제 진행을 위해 약관에 동의해주세요.",
        variant: "destructive",
      });
      return;
    }

    const authState = (window as any).__peteduAuthState;
    if (!authState?.isAuthenticated) {
      toast({ title: "로그인이 필요합니다", variant: "destructive" });
      setLocation('/auth/login');
      return;
    }

    const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY;
    if (!clientKey) {
      toast({
        title: "결제 설정 오류",
        description: "결제 시스템 설정이 완료되지 않았습니다. 관리자에게 문의하세요.",
        variant: "destructive",
      });
      return;
    }

    if (!orderData.totalAmount || orderData.totalAmount <= 0) {
      toast({
        title: "결제 금액 오류",
        description: "결제할 금액이 없습니다.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      await ensureTossLoaded();
      const tossPayments = (window as any).TossPayments(clientKey);

      const orderId = `SHOP_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const orderName = orderData.type === 'course'
        ? `강의: ${orderData.courseInfo?.title || ''}`
        : orderData.items.length === 1
          ? orderData.items[0].name
          : `${orderData.items[0]?.name || '상품'} 외 ${orderData.items.length - 1}건`;

      const checkoutContext = {
        type: orderData.type,
        items: orderData.items,
        shippingInfo,
        courseInfo: orderData.courseInfo,
      };
      try {
        sessionStorage.setItem(`shop_order_${orderId}`, JSON.stringify(checkoutContext));
      } catch (e) {
        console.warn('checkout context 저장 실패:', e);
      }

      const methodLabel = paymentInfo.method === 'kakao'
        ? '간편결제'
        : paymentInfo.method === 'naver'
          ? '간편결제'
          : '카드';

      await tossPayments.requestPayment(methodLabel, {
        amount: orderData.totalAmount,
        orderId,
        orderName,
        customerName: shippingInfo.name || authState?.userName || '고객',
        successUrl: `${window.location.origin}/payment-success`,
        failUrl: `${window.location.origin}/payment-failed`,
      });
    } catch (error: any) {
      console.error('결제 오류:', error);
      toast({
        title: "결제 실패",
        description: error?.message || "결제 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const subtotal = orderData.items.reduce((sum: number, item: any) => 
    sum + ((item.discountedPrice || item.price) * item.quantity), 0
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-2xl font-bold mb-4 text-center">주문/결제</h1>
      
      <CheckoutProgressBar currentStep={currentStep} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  배송 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      받는 분 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="홍길동"
                      value={shippingInfo.name}
                      onChange={(e) => setShippingInfo({...shippingInfo, name: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      연락처 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="phone"
                      placeholder="010-1234-5678"
                      value={shippingInfo.phone}
                      onChange={(e) => setShippingInfo({...shippingInfo, phone: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    이메일 (선택)
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={shippingInfo.email}
                    onChange={(e) => setShippingInfo({...shippingInfo, email: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address" className="flex items-center gap-1">
                    <Home className="h-4 w-4" />
                    배송지 <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="zipCode"
                      placeholder="우편번호"
                      value={shippingInfo.zipCode}
                      readOnly
                      className="w-28"
                    />
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={handleAddressSearch}
                      disabled={isAddressSearching}
                    >
                      <Search className="h-4 w-4 mr-1" />
                      주소 검색
                    </Button>
                  </div>
                  <Input
                    placeholder="기본 주소"
                    value={shippingInfo.address}
                    onChange={(e) => setShippingInfo({...shippingInfo, address: e.target.value})}
                  />
                  <Input
                    placeholder="상세 주소 (동/호수 등)"
                    value={shippingInfo.addressDetail}
                    onChange={(e) => setShippingInfo({...shippingInfo, addressDetail: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="memo">배송 메모 (선택)</Label>
                  <Input
                    id="memo"
                    placeholder="문 앞에 놓아주세요"
                    value={shippingInfo.memo}
                    onChange={(e) => setShippingInfo({...shippingInfo, memo: e.target.value})}
                  />
                </div>
                
                <Button onClick={handleNextStep} className="w-full">
                  결제 정보 입력하기
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  결제 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {['card', 'kakao', 'naver'].map((method) => (
                    <Button
                      key={method}
                      type="button"
                      variant={paymentInfo.method === method ? 'default' : 'outline'}
                      onClick={() => setPaymentInfo({...paymentInfo, method})}
                      className="h-12"
                    >
                      {method === 'card' && '신용카드'}
                      {method === 'kakao' && '카카오페이'}
                      {method === 'naver' && '네이버페이'}
                    </Button>
                  ))}
                </div>
                
                {paymentInfo.method === 'card' && (
                  <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber">카드 번호</Label>
                      <Input
                        id="cardNumber"
                        placeholder="0000-0000-0000-0000"
                        value={paymentInfo.cardNumber}
                        onChange={(e) => setPaymentInfo({...paymentInfo, cardNumber: e.target.value})}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cardExpiry">유효기간</Label>
                        <Input
                          id="cardExpiry"
                          placeholder="MM/YY"
                          value={paymentInfo.cardExpiry}
                          onChange={(e) => setPaymentInfo({...paymentInfo, cardExpiry: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardCvc">CVC</Label>
                        <Input
                          id="cardCvc"
                          placeholder="000"
                          value={paymentInfo.cardCvc}
                          onChange={(e) => setPaymentInfo({...paymentInfo, cardCvc: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cardName">카드 소유자명</Label>
                      <Input
                        id="cardName"
                        placeholder="홍길동"
                        value={paymentInfo.cardName}
                        onChange={(e) => setPaymentInfo({...paymentInfo, cardName: e.target.value})}
                      />
                    </div>
                  </div>
                )}
                
                {(paymentInfo.method === 'kakao' || paymentInfo.method === 'naver') && (
                  <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <p className="text-gray-600 dark:text-gray-400">
                      {paymentInfo.method === 'kakao' ? '카카오페이' : '네이버페이'}로 결제합니다.
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      결제하기 버튼을 누르면 {paymentInfo.method === 'kakao' ? '카카오페이' : '네이버페이'} 결제창으로 이동합니다.
                    </p>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="agreeTerms"
                    checked={paymentInfo.agreeTerms}
                    onCheckedChange={(checked) => 
                      setPaymentInfo({...paymentInfo, agreeTerms: checked as boolean})
                    }
                  />
                  <label
                    htmlFor="agreeTerms"
                    className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
                  >
                    주문 내용을 확인하였으며, 결제 진행에 동의합니다. (필수)
                  </label>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handlePrevStep} className="flex-1">
                    이전 단계
                  </Button>
                  <Button 
                    onClick={handlePayment}
                    disabled={isProcessing || !paymentInfo.agreeTerms}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    {isProcessing ? '결제 처리 중...' : `${orderData.totalAmount.toLocaleString()}원 결제하기`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 4 && (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  주문이 완료되었습니다!
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  주문 확인 메일이 발송되었습니다. 감사합니다!
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={() => setLocation('/shop')}>
                    쇼핑 계속하기
                  </Button>
                  <Button onClick={() => setLocation('/shop/order-history')}>
                    주문 내역 보기
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5" />
                주문 요약
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orderData.type === 'course' && orderData.courseInfo ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">강의명</span>
                    <span className="text-sm font-medium">{orderData.courseInfo.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">강사</span>
                    <span className="text-sm">{orderData.courseInfo.instructor?.name || '정보 없음'}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {orderData.items.length === 0 ? (
                    <p className="text-sm text-gray-500">주문할 상품이 없습니다.</p>
                  ) : (
                    orderData.items.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400 truncate pr-2">
                          {item.name} {item.option ? `(${item.option})` : ''} × {item.quantity}
                        </span>
                        <span className="font-medium whitespace-nowrap">
                          {((item.discountedPrice || item.price) * item.quantity).toLocaleString()}원
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">상품 금액</span>
                  <span>{subtotal.toLocaleString()}원</span>
                </div>
                {orderData.type === 'product' && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">배송비</span>
                    <span className={orderData.shippingFee === 0 ? 'text-green-600 font-medium' : ''}>
                      {orderData.shippingFee === 0 ? '무료' : `${orderData.shippingFee.toLocaleString()}원`}
                    </span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex justify-between text-lg font-bold">
                <span>총 결제금액</span>
                <span className="text-primary">{orderData.totalAmount.toLocaleString()}원</span>
              </div>
            </CardContent>
          </Card>

          <TrustBadges />
        </div>
      </div>
    </div>
  );
}
