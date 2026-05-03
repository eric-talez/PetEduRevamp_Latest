import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { shopApi, TossVerificationResult } from '@/lib/shop-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

export default function VerificationCallback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(true);
  const [result, setResult] = useState<TossVerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // URL에서 txId 파라미터 추출
  const urlParams = new URLSearchParams(window.location.search);
  const txId = urlParams.get('txId');
  const returnPath = urlParams.get('returnPath') || '/'; // 돌아갈 경로

  useEffect(() => {
    const verifyResult = async () => {
      if (!txId) {
        setError('유효한 인증 정보가 없습니다.');
        setIsVerifying(false);
        return;
      }

      try {
        const verificationResult = await shopApi.verifyTossResult(txId);
        setResult(verificationResult);
        
        // 사용자 프로필에 인증 정보 저장 로직을 추가할 수 있음
        if (verificationResult.success) {
          toast({
            title: '본인인증 성공',
            description: '인증이 성공적으로 완료되었습니다.',
          });
          
          // 여기에 사용자 정보 업데이트 로직 추가 가능
          // await updateUserVerificationInfo(verificationResult);
        } else {
          toast({
            title: '본인인증 실패',
            description: verificationResult.errorMessage || '인증 과정에서 오류가 발생했습니다.',
            variant: 'destructive'
          });
        }
      } catch (error) {
        console.error('인증 검증 중 오류 발생:', error);
        setError('인증 결과를 확인하는 중 오류가 발생했습니다.');
        toast({
          title: '본인인증 오류',
          description: '인증 결과를 확인하는 중 오류가 발생했습니다.',
          variant: 'destructive'
        });
      } finally {
        setIsVerifying(false);
      }
    };

    verifyResult();
  }, [txId, toast]);

  // 메인 화면으로 돌아가기
  const handleReturn = () => {
    setLocation(returnPath);
  };

  if (isVerifying) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h1 className="text-2xl font-bold mb-2">본인인증 확인 중...</h1>
        <p className="text-muted-foreground">인증 결과를 확인하고 있습니다. 잠시만 기다려주세요.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              인증 오류
            </CardTitle>
            <CardDescription>
              본인인증 과정에서 오류가 발생했습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>오류 발생</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={handleReturn} className="w-full">
              메인으로 돌아가기
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {result?.success ? (
              <>
                <CheckCircle className="h-5 w-5 text-success" />
                인증 완료
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-destructive" />
                인증 실패
              </>
            )}
          </CardTitle>
          <CardDescription>
            {result?.success 
              ? '본인인증이 성공적으로 완료되었습니다.' 
              : '본인인증 과정에서 문제가 발생했습니다.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result?.success ? (
            <div className="space-y-2">
              {result.userName && (
                <div className="grid grid-cols-3 gap-1 py-1 border-b border-gray-100 dark:border-gray-800">
                  <span className="font-medium">이름</span>
                  <span className="col-span-2">{result.userName}</span>
                </div>
              )}
              {result.birthDate && (
                <div className="grid grid-cols-3 gap-1 py-1 border-b border-gray-100 dark:border-gray-800">
                  <span className="font-medium">생년월일</span>
                  <span className="col-span-2">{result.birthDate}</span>
                </div>
              )}
              {result.gender && (
                <div className="grid grid-cols-3 gap-1 py-1 border-b border-gray-100 dark:border-gray-800">
                  <span className="font-medium">성별</span>
                  <span className="col-span-2">{result.gender === 'male' ? '남성' : '여성'}</span>
                </div>
              )}
              {result.phoneNumber && (
                <div className="grid grid-cols-3 gap-1 py-1 border-b border-gray-100 dark:border-gray-800">
                  <span className="font-medium">연락처</span>
                  <span className="col-span-2">{result.phoneNumber}</span>
                </div>
              )}
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertTitle>인증 실패</AlertTitle>
              <AlertDescription>
                {result?.errorMessage || '알 수 없는 오류가 발생했습니다. 다시 시도해주세요.'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleReturn} className="w-full">
            {result?.success ? '계속 진행하기' : '다시 시도하기'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}