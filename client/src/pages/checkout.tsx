import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CreditCard, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

// 토스페이먼츠 타입 정의
declare global {
  interface Window {
    TossPayments: (clientKey: string) => TossPaymentsInstance;
  }
}

interface TossPaymentsInstance {
  requestPayment(method: string, options: PaymentOptions): Promise<void>;
}

interface PaymentOptions {
  amount: number;
  orderId: string;
  orderName: string;
  customerName?: string;
  successUrl: string;
  failUrl: string;
}

interface CourseInfo {
  id: number;
  title: string;
  price: number;
  description: string;
  duration: number;
}

interface ProductInfo {
  id: number;
  name: string;
  price: number;
  description: string;
}

const CheckoutForm: React.FC<{
  itemInfo: CourseInfo | ProductInfo;
  itemType: 'course' | 'product';
  isTestMode?: boolean;
}> = ({ itemInfo, itemType, isTestMode = false }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTossLoaded, setIsTossLoaded] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY;

  // 환경 변수 누락 시 에러
  if (!clientKey) {
    console.error('[Toss] VITE_TOSS_CLIENT_KEY 환경 변수가 설정되지 않았습니다.');
  }

  useEffect(() => {
    // 토스페이먼츠 SDK 로드
    const script = document.createElement('script');
    script.src = 'https://js.tosspayments.com/v1/payment';
    script.async = true;
    script.onload = () => {
      setIsTossLoaded(true);
      console.log('토스페이먼츠 SDK 로드 완료');
    };
    script.onerror = () => {
      console.error('토스페이먼츠 SDK 로드 실패');
      toast({
        title: '오류',
        description: '결제 시스템을 불러올 수 없습니다.',
        variant: 'destructive',
      });
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [toast]);

  const handlePayment = async () => {
    if (!clientKey) {
      toast({
        title: '설정 오류',
        description: '결제 시스템 설정이 완료되지 않았습니다. 관리자에게 문의하세요.',
        variant: 'destructive',
      });
      return;
    }

    if (!isTossLoaded || !window.TossPayments) {
      toast({
        title: '오류',
        description: '결제 시스템이 준비되지 않았습니다.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const tossPayments = window.TossPayments(clientKey);
      
      // 결제 금액 (테스트 모드면 100원)
      const amount = isTestMode ? 100 : itemInfo.price;
      
      // 주문 ID 생성 (고유값)
      const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      // 주문명
      const orderName = itemType === 'course' 
        ? `강의: ${(itemInfo as CourseInfo).title}`
        : `상품: ${(itemInfo as ProductInfo).name}`;

      console.log('[Toss] 결제 요청:', { orderId, orderName, amount });

      // 토스페이먼츠 결제창 호출
      await tossPayments.requestPayment('카드', {
        amount,
        orderId,
        orderName,
        successUrl: `${window.location.origin}/payment-success`,
        failUrl: `${window.location.origin}/payment-failed`,
      });

    } catch (error) {
      console.error('[Toss] 결제 요청 오류:', error);
      const errorMessage = error instanceof Error ? error.message : "결제 처리 중 오류가 발생했습니다.";
      toast({
        title: '결제 오류',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 mb-4 bg-warning/10 dark:bg-warning/20 border border-warning/30 dark:border-warning/50 rounded">
        <p className="text-sm text-warning dark:text-warning/70 mb-2">
          결제 전 약관 및 정책을 확인해주세요.
        </p>
        <div className="flex gap-4">
          <a href="/terms" target="_blank" className="text-primary dark:text-primary text-sm hover:underline">
            📝 이용약관
          </a>
          <a href="/refund" target="_blank" className="text-primary dark:text-primary text-sm hover:underline">
            💰 환불정책  
          </a>
        </div>
      </div>

      {isTestMode && (
        <div className="bg-primary/10 dark:bg-primary/20 border border-primary/30 dark:border-primary/50 p-4 rounded">
          <p className="text-sm text-primary dark:text-primary font-semibold mb-2">🧪 테스트 결제 모드</p>
          <div className="text-xs text-primary dark:text-primary space-y-1">
            <p>• 실제 결제되지 않습니다</p>
            <p>• 토스페이먼츠 테스트 카드를 사용하세요</p>
            <p>• 테스트 금액: 100원</p>
          </div>
        </div>
      )}
      
      <div className="flex gap-3">
        <Button 
          type="button" 
          variant="outline" 
          size="default"
          onClick={() => navigate(itemType === 'course' ? "/courses" : "/shop")}
          className="flex-1"
          data-testid="button-back-to-list"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {itemType === 'course' ? '강의 목록으로' : '쇼핑 목록으로'}
        </Button>
        
        <Button 
          type="button" 
          onClick={handlePayment}
          disabled={!isTossLoaded || isProcessing}
          variant="default"
          size="lg"
          className="flex-1"
          data-testid="button-pay"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              결제 처리 중...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              {isTestMode ? '100' : itemInfo.price.toLocaleString()}원 결제하기
            </>
          )}
        </Button>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
        <p>토스페이먼츠 안전결제 시스템을 사용합니다</p>
      </div>
    </div>
  );
};

export default function Checkout() {
  const [location] = useLocation();
  
  const searchString = window.location.search;
  const searchParams = new URLSearchParams(searchString);
  
  const courseId = searchParams.get('courseId');
  const productId = searchParams.get('productId');
  const productName = searchParams.get('productName');
  const productPrice = searchParams.get('price');
  const itemType = searchParams.get('type') as 'course' | 'product';
  const isTestMode = searchParams.get('test') === 'true';

  // 강의 정보 조회
  const { data: courseData, isLoading: isCourseLoading } = useQuery({
    queryKey: ['/api/admin/curriculums'],
    enabled: !!courseId,
  });

  // 강의 정보 추출
  const courseInfo: CourseInfo | null = courseData && (courseData as any).curriculums ? 
    (courseData as any).curriculums.find((course: any) => 
      course.id === parseInt(courseId || '0')
    ) ? {
      id: parseInt(courseId || '0'),
      title: (courseData as any).curriculums.find((course: any) => course.id === parseInt(courseId || '0'))?.title || '',
      price: (courseData as any).curriculums.find((course: any) => course.id === parseInt(courseId || '0'))?.price || 0,
      description: (courseData as any).curriculums.find((course: any) => course.id === parseInt(courseId || '0'))?.description || '',
      duration: (courseData as any).curriculums.find((course: any) => course.id === parseInt(courseId || '0'))?.duration || 0,
    } : null : null;

  // 상품 정보 생성
  const productInfo: ProductInfo | null = productId ? {
    id: parseInt(productId),
    name: productName || '상품',
    price: parseInt(productPrice || '0'),
    description: '상품 설명',
  } : null;

  const itemInfo = itemType === 'course' ? courseInfo : productInfo;

  if ((itemType === 'course' && isCourseLoading) || !itemInfo) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" />
            <p>결제 정보를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">결제하기</h1>
          
          <div className="border-b pb-4 mb-4">
            <h2 className="font-semibold" data-testid="text-item-name">
              {itemType === 'course' ? '강의' : '상품'}: {
                itemType === 'course' 
                  ? (itemInfo as CourseInfo).title 
                  : (itemInfo as ProductInfo).name
              }
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
              {itemType === 'course' 
                ? (itemInfo as CourseInfo).description 
                : (itemInfo as ProductInfo).description
              }
            </p>
            <div className="flex justify-between items-center mt-3">
              <div>
                <span className="text-lg font-bold" data-testid="text-item-price">
                  {isTestMode ? '100' : itemInfo.price.toLocaleString()}원
                </span>
                {isTestMode && (
                  <div className="text-sm text-primary dark:text-primary mt-1">
                    💡 테스트 모드: 100원 테스트 결제
                  </div>
                )}
              </div>
              {itemType === 'course' && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {(itemInfo as CourseInfo).duration}분
                </span>
              )}
            </div>
          </div>
          
          <CheckoutForm itemInfo={itemInfo} itemType={itemType} isTestMode={isTestMode} />
        </div>
      </div>
    </div>
  );
}
