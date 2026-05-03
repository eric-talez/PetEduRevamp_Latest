import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2, Home, ShoppingBag, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PaymentSuccess() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // URL에서 토스페이먼츠 파라미터 추출
        const urlParams = new URLSearchParams(window.location.search);
        const paymentKey = urlParams.get('paymentKey');
        const orderId = urlParams.get('orderId');
        const amount = urlParams.get('amount');

        if (!paymentKey || !orderId || !amount) {
          setError('결제 정보를 찾을 수 없습니다.');
          setIsVerifying(false);
          return;
        }

        console.log('[Payment Success] 결제 승인 요청:', { paymentKey, orderId, amount });

        // 토스페이먼츠 결제 승인 API 호출
        const response = await fetch('/api/toss/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: parseInt(amount),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setPaymentInfo(data.payment);
          
          console.log('[Payment Success] 결제 승인 성공:', data);
          
          toast({
            title: "결제 성공",
            description: "결제가 정상적으로 처리되었습니다.",
          });
        } else {
          const errorData = await response.json();
          console.error('[Payment Success] 결제 승인 실패:', errorData);
          setError(errorData.message || '결제 확인 중 오류가 발생했습니다.');
        }
      } catch (err) {
        console.error('[Payment Success] 오류:', err);
        setError('결제 확인 중 오류가 발생했습니다.');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [toast]);

  if (isVerifying) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <h2 className="text-xl font-semibold">결제 확인 중...</h2>
              <p className="text-gray-600 dark:text-gray-400 text-center">
                결제 정보를 확인하고 있습니다. 잠시만 기다려주세요.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Card className="max-w-2xl mx-auto border-destructive/30 dark:border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive dark:text-destructive">결제 확인 실패</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              결제 처리 중 문제가 발생했습니다. 아래 버튼을 눌러 홈으로 돌아가거나 고객센터에 문의해주세요.
            </p>
            <div className="flex gap-4">
              <Button onClick={() => navigate('/')} className="flex-1" data-testid="button-home-error">
                <Home className="h-4 w-4 mr-2" />
                홈으로 돌아가기
              </Button>
              <Button variant="outline" onClick={() => navigate('/help')} className="flex-1" data-testid="button-help">
                고객센터
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <Card className="max-w-2xl mx-auto border-success/30 dark:border-success/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-success/10 dark:bg-success/20 rounded-full flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-success dark:text-success" />
          </div>
          <CardTitle className="text-2xl text-success dark:text-success">결제가 완료되었습니다!</CardTitle>
          <CardDescription className="text-base mt-2">
            구매해 주셔서 감사합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {paymentInfo && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 space-y-3">
              <h3 className="font-semibold text-lg mb-4">결제 정보</h3>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">주문번호</span>
                <span className="font-medium" data-testid="text-order-id">{paymentInfo.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">결제 금액</span>
                <span className="font-medium" data-testid="text-payment-amount">{paymentInfo.totalAmount?.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">결제 방법</span>
                <span className="font-medium">{paymentInfo.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">결제 상태</span>
                <span className="font-medium text-success dark:text-success">완료</span>
              </div>
              {paymentInfo.approvedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">승인 시간</span>
                  <span className="font-medium text-sm">
                    {new Date(paymentInfo.approvedAt).toLocaleString('ko-KR')}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="border-t pt-6 space-y-4">
            <h3 className="font-semibold text-lg">다음 단계</h3>
            <p className="text-gray-600 dark:text-gray-400">
              구매하신 내용은 마이페이지에서 확인하실 수 있습니다.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={() => navigate('/my-courses')} 
                variant="outline"
                className="w-full"
                data-testid="button-my-courses"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                내 강의
              </Button>
              <Button 
                onClick={() => navigate('/shop')} 
                variant="outline"
                className="w-full"
                data-testid="button-shop"
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                쇼핑 계속하기
              </Button>
              <Button 
                onClick={() => navigate('/')} 
                className="w-full"
                data-testid="button-home"
              >
                <Home className="h-4 w-4 mr-2" />
                홈으로
              </Button>
            </div>
          </div>

          <div className="bg-primary/10 dark:bg-primary/20 border border-primary/30 dark:border-primary/50 rounded-lg p-4">
            <p className="text-sm text-primary dark:text-primary/70">
              💡 <strong>안내</strong>: 결제 영수증은 이메일로 발송되었습니다. 
              영수증이 도착하지 않은 경우 스팸 메일함을 확인해주세요.
            </p>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            <p>토스페이먼츠 안전결제 시스템</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
