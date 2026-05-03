import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle, Home, RefreshCw, HelpCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PaymentFailed() {
  const [, navigate] = useLocation();

  // URL에서 토스페이먼츠 에러 정보 추출
  const urlParams = new URLSearchParams(window.location.search);
  const errorCode = urlParams.get('code');
  const errorMessage = urlParams.get('message') || '결제 처리 중 오류가 발생했습니다.';
  const orderId = urlParams.get('orderId');

  return (
    <div className="container mx-auto py-12 px-4">
      <Card className="max-w-2xl mx-auto border-destructive/30 dark:border-destructive/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-destructive/10 dark:bg-destructive/20 rounded-full flex items-center justify-center">
            <XCircle className="h-10 w-10 text-destructive dark:text-destructive" />
          </div>
          <CardTitle className="text-2xl text-destructive dark:text-destructive">결제에 실패했습니다</CardTitle>
          <CardDescription className="text-base mt-2">
            결제가 정상적으로 처리되지 않았습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertDescription>
              <strong>오류 내용:</strong> {errorMessage}
            </AlertDescription>
          </Alert>

          {(errorCode || orderId) && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 space-y-3">
              <h3 className="font-semibold mb-3">결제 정보</h3>
              {orderId && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">주문번호</span>
                  <span className="font-mono" data-testid="text-order-id">{orderId}</span>
                </div>
              )}
              {errorCode && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">오류 코드</span>
                  <span className="font-mono" data-testid="text-error-code">{errorCode}</span>
                </div>
              )}
            </div>
          )}

          <div className="border-t pt-6 space-y-4">
            <h3 className="font-semibold text-lg">결제 실패 원인</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400 text-sm">
              <li>• 카드 한도 초과 또는 잔액 부족</li>
              <li>• 카드 정보 입력 오류</li>
              <li>• 네트워크 연결 문제</li>
              <li>• 결제 승인 거부</li>
              <li>• 사용자 결제 취소</li>
            </ul>
          </div>

          <div className="border-t pt-6 space-y-4">
            <h3 className="font-semibold text-lg">해결 방법</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={() => window.history.back()} 
                className="w-full"
                data-testid="button-retry-payment"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                다시 시도
              </Button>
              <Button 
                onClick={() => navigate('/help')} 
                variant="outline"
                className="w-full"
                data-testid="button-help"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                고객센터
              </Button>
              <Button 
                onClick={() => navigate('/')} 
                variant="outline"
                className="w-full"
                data-testid="button-home"
              >
                <Home className="h-4 w-4 mr-2" />
                홈으로
              </Button>
            </div>
          </div>

          <div className="bg-warning/10 dark:bg-warning/20 border border-warning/30 dark:border-warning/50 rounded-lg p-4">
            <p className="text-sm text-warning dark:text-warning/70">
              💡 <strong>팁</strong>: 문제가 계속될 경우, 다른 결제 수단을 시도하거나 
              고객센터로 문의해주세요. 영업일 기준 24시간 내에 답변드리겠습니다.
            </p>
          </div>

          <div className="bg-primary/10 dark:bg-primary/20 border border-primary/30 dark:border-primary/50 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2 text-primary dark:text-primary/70">
              자주 묻는 질문
            </h4>
            <details className="text-sm text-primary dark:text-primary/70">
              <summary className="cursor-pointer font-medium mb-2">
                결제가 실패했는데 카드에서 금액이 빠져나갔어요
              </summary>
              <p className="pl-4 text-primary dark:text-primary">
                결제가 실패한 경우 승인된 금액은 자동으로 취소되며, 
                은행에 따라 1-3영업일 내에 환불됩니다.
              </p>
            </details>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            <p>토스페이먼츠 안전결제 시스템</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
