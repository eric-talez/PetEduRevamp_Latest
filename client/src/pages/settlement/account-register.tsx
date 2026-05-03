import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-compat';
import { useLocation } from 'wouter';
import { DogLoading } from '@/components/DogLoading';
import { IdentityVerification, VerificationData } from '@/components/IdentityVerification';
import { BanknoteIcon, ShieldCheck, Building2Icon as BankIcon, UserCheck, CreditCard, CalendarIcon, LockIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// 은행 목록
const BANK_LIST = [
  { value: 'KB', label: '국민은행' },
  { value: 'SH', label: '신한은행' },
  { value: 'WR', label: '우리은행' },
  { value: 'NH', label: '농협은행' },
  { value: 'IBK', label: '기업은행' },
  { value: 'HN', label: '하나은행' },
  { value: 'KKO', label: '카카오뱅크' },
  { value: 'TOSS', label: '토스뱅크' },
];

// 계좌 등록 폼 유효성 검증 스키마
const accountFormSchema = z.object({
  bank: z.string().min(1, { message: '은행을 선택해주세요' }),
  accountNumber: z
    .string()
    .min(10, { message: '계좌번호는 최소 10자리 이상이어야 합니다' })
    .max(20, { message: '계좌번호는 최대 20자리까지 입력 가능합니다' })
    .regex(/^[0-9\-]+$/, { message: '계좌번호는 숫자와 하이픈(-)만 입력 가능합니다' }),
  accountHolder: z
    .string()
    .min(2, { message: '예금주명은 최소 2자 이상이어야 합니다' })
    .max(30, { message: '예금주명은 최대 30자까지 입력 가능합니다' }),
  settlementType: z.enum(['personal', 'business'], {
    required_error: '정산 유형을 선택해주세요',
  }),
  businessNumber: z.string().optional(),
});

// 폼 값 타입 정의
type AccountFormValues = z.infer<typeof accountFormSchema>;

/**
 * 정산 계좌 등록 페이지
 * 
 * 훈련사와 기관 관리자가 정산 받을 계좌를 등록하는 페이지
 * 계좌 등록 전 본인인증이 필수적으로 진행됨
 */
export default function AccountRegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const { toast } = useToast();
  const auth = useAuth();
  const [, setLocation] = useLocation();
  
  // 기본값으로 채워진 폼
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      bank: '',
      accountNumber: '',
      accountHolder: '',
      settlementType: 'personal',
      businessNumber: '',
    },
  });
  
  // 사용자 권한 확인
  useEffect(() => {
    // 훈련사나 기관 관리자만 접근 가능
    const currentRole = auth?.userRole;
    if (currentRole && currentRole !== 'trainer' && currentRole !== 'institute-admin') {
      toast({
        title: '접근 권한 없음',
        description: '훈련사 또는 기관 관리자만 정산 계좌를 등록할 수 있습니다.',
        variant: 'destructive',
      });
      
      // 대시보드로 리다이렉트
      setTimeout(() => {
        setLocation('/');
      }, 2000);
    }
    
    // 이미 본인인증이 완료되었는지 확인
    checkVerificationStatus();
  }, [auth?.userRole]);
  
  // 본인인증 상태 확인 함수
  const checkVerificationStatus = async () => {
    try {
      const response = await fetch('/api/user/verification-status');
      if (response.ok) {
        const data = await response.json();
        if (data.verified) {
          setIsVerified(true);
          setVerificationData({
            ci: data.ci,
            name: data.name,
            birth: data.birth,
            phone: data.phone,
            gender: data.gender,
          });
          
          // 이미 등록된 계좌 정보가 있다면 폼에 채우기
          if (data.accountInfo) {
            form.reset({
              bank: data.accountInfo.bank,
              accountNumber: data.accountInfo.accountNumber,
              accountHolder: data.accountInfo.accountHolder,
              settlementType: data.accountInfo.settlementType,
              businessNumber: data.accountInfo.businessNumber || '',
            });
          }
        }
      }
    } catch (error) {
      console.error('본인인증 상태 확인 중 오류:', error);
    }
  };
  
  // 본인인증 완료 콜백
  const handleVerificationComplete = (data: VerificationData) => {
    setIsVerified(true);
    setVerificationData(data);
    toast({
      title: '본인인증 완료',
      description: '계좌 등록을 계속 진행해주세요.',
    });
    
    // 폼의 예금주 필드를 본인인증된 이름으로 자동 설정
    form.setValue('accountHolder', data.name);
  };
  
  // 폼 제출 처리
  const onSubmit = async (data: AccountFormValues) => {
    if (!isVerified) {
      toast({
        title: '본인인증 필요',
        description: '계좌 등록을 위해 먼저 본인인증을 완료해주세요.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // 계좌 등록 API 호출
      const response = await fetch('/api/settlement/register-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          ci: verificationData?.ci,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '계좌 등록 중 오류가 발생했습니다.');
      }
      
      toast({
        title: '계좌 등록 완료',
        description: '정산 계좌가 성공적으로 등록되었습니다.',
      });
      
      // 정산 메인 페이지로 이동
      setTimeout(() => {
        setLocation('/settlement');
      }, 1500);
    } catch (error: any) {
      toast({
        title: '계좌 등록 실패',
        description: error.message || '계좌 등록 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">정산 계좌 등록</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center mb-2">
            <ShieldCheck className="h-5 w-5 text-primary mr-2" />
            <CardTitle>본인인증</CardTitle>
          </div>
          <CardDescription>
            정산 계좌 등록을 위해서는 본인인증이 필요합니다. 
            전자금융거래법에 따라 실명 확인 후 계좌 등록이 가능합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isVerified ? (
            <div className="bg-success/10 dark:bg-success/30 rounded-lg p-4 border border-success/30 dark:border-success/50">
              <div className="flex items-start">
                <UserCheck className="h-5 w-5 text-success dark:text-success mr-3 mt-0.5" />
                <div>
                  <p className="font-medium text-success dark:text-success">본인인증 완료</p>
                  <p className="text-sm text-success dark:text-success mt-1">
                    {verificationData?.name} 님의 본인인증이 완료되었습니다.
                  </p>
                  <div className="mt-2 text-xs text-success dark:text-success grid grid-cols-2 gap-x-4 gap-y-1">
                    <div>생년월일: {verificationData?.birth}</div>
                    <div>휴대폰: {verificationData?.phone}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4">
              <p className="mb-4 text-center text-gray-600 dark:text-gray-400">
                계좌 등록을 위해 본인인증이 필요합니다.
              </p>
              <IdentityVerification 
                onVerified={handleVerificationComplete}
                buttonText="본인인증 진행하기"
                contextMessage="정산 계좌 등록을 위해 본인인증이 필요합니다."
              />
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <div className="flex items-center mb-2">
            <BankIcon className="h-5 w-5 text-primary mr-2" />
            <CardTitle>계좌 정보 입력</CardTitle>
          </div>
          <CardDescription>
            정산금을 받을 계좌 정보를 입력해주세요. 
            본인인증 후 등록한 계좌로만 정산금이 지급됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="personal" value={form.watch('settlementType')} 
                    onValueChange={(value) => form.setValue('settlementType', value as 'personal' | 'business')}>
                <TabsList className="mb-4">
                  <TabsTrigger value="personal" className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2" />
                    개인 계좌
                  </TabsTrigger>
                  <TabsTrigger value="business" className="flex items-center">
                    <BanknoteIcon className="h-4 w-4 mr-2" />
                    사업자 계좌
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="personal">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    개인 계좌로 정산 받으시면 세금계산서 없이 원천징수 후 지급됩니다.
                  </p>
                </TabsContent>
                
                <TabsContent value="business">
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      사업자 계좌로 정산 받으시면 세금계산서 발행이 필요합니다.
                    </p>
                    
                    <FormField
                      control={form.control}
                      name="businessNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>사업자등록번호</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="000-00-00000"
                              {...field}
                              disabled={!isVerified}
                            />
                          </FormControl>
                          <FormDescription>
                            '-'를 포함하여 정확히 입력해주세요
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>
              
              <FormField
                control={form.control}
                name="bank"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>은행</FormLabel>
                    <Select
                      disabled={!isVerified}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="은행을 선택하세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BANK_LIST.map((bank) => (
                          <SelectItem key={bank.value} value={bank.value}>
                            {bank.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>계좌번호</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="숫자와 하이픈(-)만 입력"
                        {...field}
                        disabled={!isVerified}
                      />
                    </FormControl>
                    <FormDescription>
                      '-' 없이 숫자만 입력하셔도 됩니다
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="accountHolder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>예금주명</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="예금주명"
                        {...field}
                        disabled={!isVerified}
                      />
                    </FormControl>
                    <FormDescription>
                      본인인증된 실명과 예금주명이 일치해야 합니다
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="bg-warning/10 dark:bg-warning/30 rounded-lg p-4 border border-warning/30 dark:border-warning/50 text-sm space-y-2">
                <p className="flex items-center text-warning dark:text-warning font-medium">
                  <LockIcon className="h-4 w-4 mr-2" />
                  계좌 등록 시 유의사항
                </p>
                <ul className="list-disc list-inside text-warning dark:text-warning pl-1 space-y-1">
                  <li>본인 명의의 계좌만 등록 가능합니다.</li>
                  <li>정산금은 매월 15일에 등록된 계좌로 지급됩니다.</li>
                  <li>사업자 계좌로 등록 시 세금계산서 발행이 필요합니다.</li>
                  <li>계좌 정보는 암호화되어 안전하게 보관됩니다.</li>
                </ul>
              </div>
              
              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={!isVerified || isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <span className="mr-2">처리 중...</span>
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    </>
                  ) : (
                    '계좌 등록하기'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}