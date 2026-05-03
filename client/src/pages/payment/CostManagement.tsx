import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  FileText, 
  Download, 
  Eye, 
  Check, 
  X, 
  Plus,
  Calculator,
  CreditCard,
  AlertCircle,
  RefreshCw,
  Filter,
  Search
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Transaction {
  id: number;
  type: string;
  referenceId: number;
  payerName: string;
  payeeName: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  status: string;
  createdAt: string;
  paymentMethod: string;
}

interface Settlement {
  id: number;
  targetType: 'trainer' | 'institute';
  targetName: string;
  periodStart: string;
  periodEnd: string;
  totalGrossAmount: number;
  totalFeeAmount: number;
  totalNetAmount: number;
  transactionCount: number;
  status: 'pending' | 'processing' | 'completed' | 'paid';
  createdAt: string;
}

interface FeePolicy {
  id: number;
  name: string;
  feeType: 'percentage' | 'fixed' | 'tiered';
  baseRate: number;
  targetType: string;
  isActive: boolean;
}

export default function CostManagementPage() {
  const { userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('transactions');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [feePolicies, setFeePolicies] = useState<FeePolicy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // 수수료 계산기 상태
  const [calculatorAmount, setCalculatorAmount] = useState('');
  const [calculatorType, setCalculatorType] = useState('trainer');
  const [calculatorResult, setCalculatorResult] = useState<{
    feeAmount: number;
    netAmount: number;
    feeRate: number;
  } | null>(null);

  // 수수료 정책 생성 상태
  const [newPolicyForm, setNewPolicyForm] = useState({
    name: '',
    feeType: 'percentage',
    baseRate: '',
    targetType: 'all',
    description: ''
  });

  // 정산 생성 상태
  const [settlementForm, setSettlementForm] = useState({
    targetType: 'trainer',
    targetId: '',
    periodStart: '',
    periodEnd: ''
  });

  // 샘플 데이터
  const sampleTransactions: Transaction[] = [
    {
      id: 1,
      type: 'course_payment',
      referenceId: 101,
      payerName: '김반려',
      payeeName: '김민수 훈련사',
      grossAmount: 150000,
      feeAmount: 15000,
      netAmount: 135000,
      status: 'completed',
      createdAt: '2025-01-25 14:30:00',
      paymentMethod: 'card'
    },
    {
      id: 2,
      type: 'consultation',
      referenceId: 201,
      payerName: '박애견',
      payeeName: '서울 애견훈련소',
      grossAmount: 80000,
      feeAmount: 8000,
      netAmount: 72000,
      status: 'completed',
      createdAt: '2025-01-25 11:15:00',
      paymentMethod: 'bank_transfer'
    },
    {
      id: 3,
      type: 'course_payment',
      referenceId: 102,
      payerName: '이강아지',
      payeeName: '박지혜 트레이너',
      grossAmount: 200000,
      feeAmount: 18000,
      netAmount: 182000,
      status: 'completed',
      createdAt: '2025-01-24 16:45:00',
      paymentMethod: 'virtual_account'
    }
  ];

  const sampleSettlements: Settlement[] = [
    {
      id: 1,
      targetType: 'trainer',
      targetName: '김민수 훈련사',
      periodStart: '2025-01-01',
      periodEnd: '2025-01-31',
      totalGrossAmount: 2400000,
      totalFeeAmount: 240000,
      totalNetAmount: 2160000,
      transactionCount: 16,
      status: 'pending',
      createdAt: '2025-01-25'
    },
    {
      id: 2,
      targetType: 'institute',
      targetName: '서울 애견훈련소',
      periodStart: '2025-01-01',
      periodEnd: '2025-01-31',
      totalGrossAmount: 3800000,
      totalFeeAmount: 342000,
      totalNetAmount: 3458000,
      transactionCount: 23,
      status: 'completed',
      createdAt: '2025-01-24'
    }
  ];

  const sampleFeePolicies: FeePolicy[] = [
    {
      id: 1,
      name: '기본 훈련사 수수료',
      feeType: 'percentage',
      baseRate: 10.0,
      targetType: 'trainer',
      isActive: true
    },
    {
      id: 2,
      name: '기관 차등 수수료',
      feeType: 'tiered',
      baseRate: 8.0,
      targetType: 'institute',
      isActive: true
    },
    {
      id: 3,
      name: '프리미엄 훈련사 할인',
      feeType: 'percentage',
      baseRate: 7.5,
      targetType: 'trainer',
      isActive: true
    }
  ];

  useEffect(() => {
    setTransactions(sampleTransactions);
    setSettlements(sampleSettlements);
    setFeePolicies(sampleFeePolicies);
  }, []);

  // 수수료 계산
  const calculateFee = () => {
    const amount = parseFloat(calculatorAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('올바른 금액을 입력해주세요.');
      return;
    }

    // 간단한 수수료 계산 (실제로는 API 호출)
    const feeRate = calculatorType === 'trainer' ? 10.0 : 9.0;
    const feeAmount = Math.round(amount * (feeRate / 100));
    const netAmount = amount - feeAmount;

    setCalculatorResult({
      feeAmount,
      netAmount,
      feeRate
    });
  };

  // 정산 생성
  const generateSettlement = async () => {
    if (!settlementForm.targetId || !settlementForm.periodStart || !settlementForm.periodEnd) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      // API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newSettlement: Settlement = {
        id: Date.now(),
        targetType: settlementForm.targetType as 'trainer' | 'institute',
        targetName: `${settlementForm.targetType === 'trainer' ? '훈련사' : '기관'} ${settlementForm.targetId}`,
        periodStart: settlementForm.periodStart,
        periodEnd: settlementForm.periodEnd,
        totalGrossAmount: 1500000,
        totalFeeAmount: 150000,
        totalNetAmount: 1350000,
        transactionCount: 12,
        status: 'pending',
        createdAt: new Date().toISOString().split('T')[0]
      };

      setSettlements(prev => [newSettlement, ...prev]);
      setSettlementForm({
        targetType: 'trainer',
        targetId: '',
        periodStart: '',
        periodEnd: ''
      });
      
      alert('정산이 생성되었습니다.');
    } catch (error) {
      alert('정산 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 정산 승인
  const approveSettlement = async (settlementId: number) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSettlements(prev => 
        prev.map(settlement => 
          settlement.id === settlementId 
            ? { ...settlement, status: 'processing' as const }
            : settlement
        )
      );
      
      alert('정산이 승인되었습니다.');
    } catch (error) {
      alert('정산 승인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 수수료 정책 생성
  const createFeePolicy = async () => {
    if (!newPolicyForm.name || !newPolicyForm.baseRate) {
      alert('필수 정보를 입력해주세요.');
      return;
    }

    const newPolicy: FeePolicy = {
      id: Date.now(),
      name: newPolicyForm.name,
      feeType: newPolicyForm.feeType as 'percentage' | 'fixed' | 'tiered',
      baseRate: parseFloat(newPolicyForm.baseRate),
      targetType: newPolicyForm.targetType,
      isActive: true
    };

    setFeePolicies(prev => [newPolicy, ...prev]);
    setNewPolicyForm({
      name: '',
      feeType: 'percentage',
      baseRate: '',
      targetType: 'all',
      description: ''
    });
    
    alert('수수료 정책이 생성되었습니다.');
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'pending': 'secondary',
      'processing': 'default',
      'completed': 'default',
      'paid': 'default'
    } as const;

    const labels = {
      'pending': '대기중',
      'processing': '처리중',
      'completed': '완료',
      'paid': '지급완료'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  // 권한 체크
  const canManagePayments = ['admin', 'institute-admin'].includes(userRole || '');

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">비용 처리 및 정산 관리</h1>
        <p className="text-gray-600">훈련사와 기관의 수익 정산, 수수료 관리를 통합적으로 처리합니다.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="transactions">거래 내역</TabsTrigger>
          <TabsTrigger value="settlements">정산 관리</TabsTrigger>
          <TabsTrigger value="fee-policies">수수료 정책</TabsTrigger>
          <TabsTrigger value="calculator">수수료 계산기</TabsTrigger>
          <TabsTrigger value="analytics">수익 분석</TabsTrigger>
        </TabsList>

        {/* 거래 내역 탭 */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                거래 내역
              </CardTitle>
              <CardDescription>
                모든 결제 및 거래 내역을 확인하고 관리할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="거래 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="all">전체 상태</option>
                    <option value="completed">완료</option>
                    <option value="pending">대기중</option>
                    <option value="failed">실패</option>
                  </select>
                </div>
                <Button>
                  <Download className="h-4 w-4 mr-2" />
                  내역 다운로드
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>거래 ID</TableHead>
                      <TableHead>결제자</TableHead>
                      <TableHead>수취인</TableHead>
                      <TableHead className="text-right">총액</TableHead>
                      <TableHead className="text-right">수수료</TableHead>
                      <TableHead className="text-right">실지급액</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>결제일시</TableHead>
                      <TableHead>관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">#{transaction.id}</TableCell>
                        <TableCell>{transaction.payerName}</TableCell>
                        <TableCell>{transaction.payeeName}</TableCell>
                        <TableCell className="text-right">
                          {transaction.grossAmount.toLocaleString()}원
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          -{transaction.feeAmount.toLocaleString()}원
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {transaction.netAmount.toLocaleString()}원
                        </TableCell>
                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                        <TableCell>{transaction.createdAt}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 정산 관리 탭 */}
        <TabsContent value="settlements">
          <div className="space-y-6">
            {canManagePayments && (
              <Card>
                <CardHeader>
                  <CardTitle>새 정산 생성</CardTitle>
                  <CardDescription>특정 기간의 거래를 기반으로 정산을 생성합니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>대상 유형</Label>
                      <select
                        value={settlementForm.targetType}
                        onChange={(e) => setSettlementForm(prev => ({ ...prev, targetType: e.target.value }))}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="trainer">훈련사</option>
                        <option value="institute">기관</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>대상 ID</Label>
                      <Input
                        placeholder="ID 입력"
                        value={settlementForm.targetId}
                        onChange={(e) => setSettlementForm(prev => ({ ...prev, targetId: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>시작일</Label>
                      <Input
                        type="date"
                        value={settlementForm.periodStart}
                        onChange={(e) => setSettlementForm(prev => ({ ...prev, periodStart: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>종료일</Label>
                      <Input
                        type="date"
                        value={settlementForm.periodEnd}
                        onChange={(e) => setSettlementForm(prev => ({ ...prev, periodEnd: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button onClick={generateSettlement} disabled={isLoading}>
                      {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                      정산 생성
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  정산 내역
                </CardTitle>
                <CardDescription>생성된 정산 내역을 확인하고 승인 처리할 수 있습니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>정산 ID</TableHead>
                        <TableHead>대상</TableHead>
                        <TableHead>기간</TableHead>
                        <TableHead className="text-right">거래 건수</TableHead>
                        <TableHead className="text-right">총 수익</TableHead>
                        <TableHead className="text-right">수수료</TableHead>
                        <TableHead className="text-right">정산액</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {settlements.map((settlement) => (
                        <TableRow key={settlement.id}>
                          <TableCell className="font-medium">#{settlement.id}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{settlement.targetName}</div>
                              <div className="text-sm text-gray-500">
                                {settlement.targetType === 'trainer' ? '훈련사' : '기관'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {settlement.periodStart} ~ {settlement.periodEnd}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{settlement.transactionCount}건</TableCell>
                          <TableCell className="text-right">
                            {settlement.totalGrossAmount.toLocaleString()}원
                          </TableCell>
                          <TableCell className="text-right text-destructive">
                            -{settlement.totalFeeAmount.toLocaleString()}원
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {settlement.totalNetAmount.toLocaleString()}원
                          </TableCell>
                          <TableCell>{getStatusBadge(settlement.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {settlement.status === 'pending' && canManagePayments && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => approveSettlement(settlement.id)}
                                  disabled={isLoading}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 수수료 정책 탭 */}
        <TabsContent value="fee-policies">
          <div className="space-y-6">
            {canManagePayments && (
              <Card>
                <CardHeader>
                  <CardTitle>새 수수료 정책 생성</CardTitle>
                  <CardDescription>훈련사나 기관별 수수료 정책을 설정합니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>정책명</Label>
                      <Input
                        placeholder="정책명 입력"
                        value={newPolicyForm.name}
                        onChange={(e) => setNewPolicyForm(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>수수료 타입</Label>
                      <select
                        value={newPolicyForm.feeType}
                        onChange={(e) => setNewPolicyForm(prev => ({ ...prev, feeType: e.target.value }))}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="percentage">비율 (%)</option>
                        <option value="fixed">고정 금액</option>
                        <option value="tiered">차등 적용</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>기본 요율</Label>
                      <Input
                        type="number"
                        placeholder="10.0"
                        value={newPolicyForm.baseRate}
                        onChange={(e) => setNewPolicyForm(prev => ({ ...prev, baseRate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>적용 대상</Label>
                      <select
                        value={newPolicyForm.targetType}
                        onChange={(e) => setNewPolicyForm(prev => ({ ...prev, targetType: e.target.value }))}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="all">전체</option>
                        <option value="trainer">훈련사</option>
                        <option value="institute">기관</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Label>설명</Label>
                    <Textarea
                      placeholder="정책 설명"
                      value={newPolicyForm.description}
                      onChange={(e) => setNewPolicyForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div className="mt-4">
                    <Button onClick={createFeePolicy}>
                      <Plus className="h-4 w-4 mr-2" />
                      정책 생성
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>수수료 정책 목록</CardTitle>
                <CardDescription>현재 적용중인 수수료 정책들을 확인합니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>정책명</TableHead>
                        <TableHead>타입</TableHead>
                        <TableHead>기본 요율</TableHead>
                        <TableHead>적용 대상</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feePolicies.map((policy) => (
                        <TableRow key={policy.id}>
                          <TableCell className="font-medium">{policy.name}</TableCell>
                          <TableCell>
                            {policy.feeType === 'percentage' && '비율'}
                            {policy.feeType === 'fixed' && '고정금액'}
                            {policy.feeType === 'tiered' && '차등적용'}
                          </TableCell>
                          <TableCell>
                            {policy.feeType === 'percentage' ? `${policy.baseRate}%` : `${policy.baseRate}원`}
                          </TableCell>
                          <TableCell>
                            {policy.targetType === 'all' && '전체'}
                            {policy.targetType === 'trainer' && '훈련사'}
                            {policy.targetType === 'institute' && '기관'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={policy.isActive ? 'default' : 'secondary'}>
                              {policy.isActive ? '활성' : '비활성'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canManagePayments && (
                                <Button variant="ghost" size="sm">
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 수수료 계산기 탭 */}
        <TabsContent value="calculator">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                수수료 계산기
              </CardTitle>
              <CardDescription>
                예상 수수료를 미리 계산해볼 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>거래 금액</Label>
                    <Input
                      type="number"
                      placeholder="100000"
                      value={calculatorAmount}
                      onChange={(e) => setCalculatorAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>대상 유형</Label>
                    <select
                      value={calculatorType}
                      onChange={(e) => setCalculatorType(e.target.value)}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="trainer">훈련사</option>
                      <option value="institute">기관</option>
                    </select>
                  </div>
                  <Button onClick={calculateFee} className="w-full">
                    <Calculator className="h-4 w-4 mr-2" />
                    계산하기
                  </Button>
                </div>

                {calculatorResult && (
                  <div className="space-y-4">
                    <h3 className="font-semibold">계산 결과</h3>
                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between">
                        <span>총 거래 금액:</span>
                        <span className="font-medium">{parseFloat(calculatorAmount).toLocaleString()}원</span>
                      </div>
                      <div className="flex justify-between text-destructive">
                        <span>수수료 ({calculatorResult.feeRate}%):</span>
                        <span className="font-medium">-{calculatorResult.feeAmount.toLocaleString()}원</span>
                      </div>
                      <div className="border-t pt-3">
                        <div className="flex justify-between text-lg font-bold">
                          <span>실 지급액:</span>
                          <span>{calculatorResult.netAmount.toLocaleString()}원</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 수익 분석 탭 */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">이번 달 총 거래액</p>
                    <p className="text-2xl font-bold">8,420만원</p>
                    <p className="text-xs text-success flex items-center mt-1">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +15.2% 전월 대비
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">이번 달 수수료 수익</p>
                    <p className="text-2xl font-bold">758만원</p>
                    <p className="text-xs text-success flex items-center mt-1">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +12.8% 전월 대비
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-success/10 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">활성 파트너</p>
                    <p className="text-2xl font-bold">234명</p>
                    <p className="text-xs text-gray-500 mt-1">
                      훈련사 89명, 기관 145개
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>수익 추이</CardTitle>
              <CardDescription>최근 6개월간 거래액 및 수수료 수익 변화</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>차트 데이터 로딩 중...</p>
                  <p className="text-sm">실제 구현에서는 recharts 등을 사용하여 차트를 표시합니다.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}