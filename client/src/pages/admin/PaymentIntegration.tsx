
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  CreditCard, 
  DollarSign, 
  Settings, 
  Plus,
  Edit,
  Trash2,
  TestTube,
  Shield,
  Users,
  Percent,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Key,
  Lock
} from "lucide-react";

interface PaymentMethod {
  id: string;
  name: string;
  type: 'toss' | 'kakao' | 'naver' | 'card';
  status: 'active' | 'inactive' | 'testing';
  commission: number;
  monthlyVolume: number;
  testMode: boolean;
}

interface UserPaymentPlan {
  role: 'pet-owner' | 'trainer' | 'institute-admin';
  name: string;
  basePrice: number;
  commission: number;
  features: string[];
  status: 'active' | 'inactive';
}

export default function PaymentIntegration() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [userPaymentPlans, setUserPaymentPlans] = useState<UserPaymentPlan[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [testResults, setTestResults] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [showSecurityDialog, setShowSecurityDialog] = useState(false);
  const [showAddMethodDialog, setShowAddMethodDialog] = useState(false);
  const [showEditMethodDialog, setShowEditMethodDialog] = useState(false);
  const [editingMethod, setEditingMethod] = useState<any>(null);
  const [newMethodForm, setNewMethodForm] = useState({
    id: '',
    name: '',
    type: 'pg',
    description: '',
    provider: '',
    apiKey: '',
    commissionRate: 0
  });
  const [securitySettings, setSecuritySettings] = useState({
    encryptionEnabled: true,
    apiKeyEncryption: true,
    transactionLogging: true,
    fraudDetection: true,
    twoFactorAuth: false,
    ipWhitelist: ''
  });

  // 데이터 로드
  useEffect(() => {
    loadPaymentData();
  }, []);

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      
      // 결제 수단 목록 조회
      const methodsResponse = await fetch('/api/admin/payment/methods');
      if (methodsResponse.ok) {
        const methodsData = await methodsResponse.json();
        const adaptedMethods = methodsData.data.map((method: any) => ({
          id: method.id,
          name: method.name,
          type: method.id as any,
          status: method.status as any,
          commission: method.commissionRate || 0,
          monthlyVolume: 0, // 실제 데이터에서는 계산 필요
          testMode: method.status === 'testing'
        }));
        setPaymentMethods(adaptedMethods);
      }

      // 사용자 요금제 목록 조회
      const plansResponse = await fetch('/api/admin/payment/plans');
      if (plansResponse.ok) {
        const plansData = await plansResponse.json();
        const adaptedPlans = plansData.data.map((plan: any) => ({
          role: plan.role as any,
          name: plan.name,
          basePrice: plan.monthlyFee || 0,
          commission: 0, // 실제 데이터에서 설정 필요
          features: plan.features || [],
          status: plan.status as any
        }));
        setUserPaymentPlans(adaptedPlans);
      }

      // 결제 내역 조회
      const historyResponse = await fetch('/api/admin/payment/history');
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setPaymentHistory(historyData.data);
      }
      
    } catch (error) {
      console.error('결제 데이터 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 결제 수단 테스트
  const testPaymentMethod = async (methodId: string) => {
    try {
      console.log(`결제 수단 테스트 시작: ${methodId}`);
      
      const response = await fetch('/api/admin/payment/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ methodId, amount: 1000 })
      });

      if (response.ok) {
        setTestResults(prev => ({ ...prev, [methodId]: true }));
        alert('✅ 결제 테스트 성공!');
      } else {
        setTestResults(prev => ({ ...prev, [methodId]: false }));
        alert('❌ 결제 테스트 실패');
      }
    } catch (error) {
      console.error('결제 테스트 오류:', error);
      setTestResults(prev => ({ ...prev, [methodId]: false }));
      alert('❌ 네트워크 오류');
    }
  };

  // 결제 수단 상태 변경
  const togglePaymentMethod = async (methodId: string, newStatus: 'active' | 'inactive') => {
    try {
      const response = await fetch(`/api/admin/payment/methods/${methodId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setPaymentMethods(prev => 
          prev.map(method => 
            method.id === methodId ? { ...method, status: newStatus } : method
          )
        );
        alert(`결제 수단이 ${newStatus === 'active' ? '활성화' : '비활성화'}되었습니다.`);
      }
    } catch (error) {
      console.error('상태 변경 오류:', error);
      alert('상태 변경 중 오류가 발생했습니다.');
    }
  };

  // 요금제 수정
  const updatePlan = async (role: string, updates: Partial<UserPaymentPlan>) => {
    try {
      const response = await fetch(`/api/admin/payment/plans/${role}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        setUserPaymentPlans(prev =>
          prev.map(plan =>
            plan.role === role ? { ...plan, ...updates } : plan
          )
        );
        alert('요금제가 업데이트되었습니다.');
      }
    } catch (error) {
      console.error('요금제 업데이트 오류:', error);
      alert('요금제 업데이트 중 오류가 발생했습니다.');
    }
  };

  // 새 결제 수단 추가
  const addPaymentMethod = async () => {
    try {
      const response = await fetch('/api/admin/payment/methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMethodForm)
      });

      if (response.ok) {
        await loadPaymentData(); // 데이터 새로고침
        setShowAddMethodDialog(false);
        setNewMethodForm({
          id: '',
          name: '',
          type: 'pg',
          description: '',
          provider: '',
          apiKey: '',
          commissionRate: 0
        });
        alert('새 결제 수단이 추가되었습니다.');
      }
    } catch (error) {
      console.error('결제 수단 추가 오류:', error);
      alert('결제 수단 추가 중 오류가 발생했습니다.');
    }
  };

  // 결제 수단 수정 다이얼로그 열기
  const openEditMethodDialog = (method: any) => {
    setEditingMethod({
      id: method.id,
      name: method.name,
      type: method.type,
      description: '',
      provider: method.id,
      apiKey: '***hidden***',
      commissionRate: method.commission,
      status: method.status
    });
    setShowEditMethodDialog(true);
  };

  // 결제 수단 수정
  const updatePaymentMethod = async () => {
    try {
      const response = await fetch(`/api/admin/payment/methods/${editingMethod.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingMethod)
      });

      if (response.ok) {
        await loadPaymentData(); // 데이터 새로고침
        setShowEditMethodDialog(false);
        setEditingMethod(null);
        alert('결제 수단이 수정되었습니다.');
      }
    } catch (error) {
      console.error('결제 수단 수정 오류:', error);
      alert('결제 수단 수정 중 오류가 발생했습니다.');
    }
  };

  // 보안 설정 업데이트
  const updateSecuritySettings = async () => {
    try {
      const response = await fetch('/api/admin/payment/security', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(securitySettings)
      });

      if (response.ok) {
        setShowSecurityDialog(false);
        alert('보안 설정이 업데이트되었습니다.');
      }
    } catch (error) {
      console.error('보안 설정 업데이트 오류:', error);
      alert('보안 설정 업데이트 중 오류가 발생했습니다.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success/10 text-success"><CheckCircle className="w-3 h-3 mr-1" />활성</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800"><XCircle className="w-3 h-3 mr-1" />비활성</Badge>;
      case 'testing':
        return <Badge className="bg-warning/10 text-warning"><AlertTriangle className="w-3 h-3 mr-1" />테스트</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">결제 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">결제연동 관리</h1>
          <p className="text-muted-foreground">결제 수단 및 권한별 요금제를 관리합니다</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showSecurityDialog} onOpenChange={setShowSecurityDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Shield className="w-4 h-4 mr-2" />
                보안 설정
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>결제 보안 설정</DialogTitle>
                <DialogDescription>
                  결제 시스템의 보안 정책을 관리합니다
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>데이터 암호화</Label>
                    <p className="text-sm text-muted-foreground">결제 데이터 암호화 저장</p>
                  </div>
                  <Switch 
                    checked={securitySettings.encryptionEnabled}
                    onCheckedChange={(checked) => 
                      setSecuritySettings(prev => ({ ...prev, encryptionEnabled: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>API 키 암호화</Label>
                    <p className="text-sm text-muted-foreground">API 키 안전 저장</p>
                  </div>
                  <Switch 
                    checked={securitySettings.apiKeyEncryption}
                    onCheckedChange={(checked) => 
                      setSecuritySettings(prev => ({ ...prev, apiKeyEncryption: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>거래 로깅</Label>
                    <p className="text-sm text-muted-foreground">모든 거래 기록 저장</p>
                  </div>
                  <Switch 
                    checked={securitySettings.transactionLogging}
                    onCheckedChange={(checked) => 
                      setSecuritySettings(prev => ({ ...prev, transactionLogging: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>사기 탐지</Label>
                    <p className="text-sm text-muted-foreground">이상 거래 자동 감지</p>
                  </div>
                  <Switch 
                    checked={securitySettings.fraudDetection}
                    onCheckedChange={(checked) => 
                      setSecuritySettings(prev => ({ ...prev, fraudDetection: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>2단계 인증</Label>
                    <p className="text-sm text-muted-foreground">관리자 접근 보안 강화</p>
                  </div>
                  <Switch 
                    checked={securitySettings.twoFactorAuth}
                    onCheckedChange={(checked) => 
                      setSecuritySettings(prev => ({ ...prev, twoFactorAuth: checked }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>IP 화이트리스트</Label>
                  <Input 
                    placeholder="192.168.1.1, 10.0.0.1"
                    value={securitySettings.ipWhitelist}
                    onChange={(e) => 
                      setSecuritySettings(prev => ({ ...prev, ipWhitelist: e.target.value }))
                    }
                  />
                  <p className="text-sm text-muted-foreground">접근 허용 IP 주소 (쉼표로 구분)</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSecurityDialog(false)}>
                  취소
                </Button>
                <Button onClick={updateSecuritySettings}>
                  <Lock className="w-4 h-4 mr-2" />
                  설정 저장
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showAddMethodDialog} onOpenChange={setShowAddMethodDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                결제 수단 추가
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>새 결제 수단 추가</DialogTitle>
                <DialogDescription>
                  새로운 결제 서비스를 연동합니다
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="methodId">결제 수단 ID</Label>
                  <Input 
                    id="methodId"
                    placeholder="paypal"
                    value={newMethodForm.id}
                    onChange={(e) => 
                      setNewMethodForm(prev => ({ ...prev, id: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="methodName">결제 수단 이름</Label>
                  <Input 
                    id="methodName"
                    placeholder="PayPal"
                    value={newMethodForm.name}
                    onChange={(e) => 
                      setNewMethodForm(prev => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="methodType">유형</Label>
                  <Select 
                    value={newMethodForm.type} 
                    onValueChange={(value) => 
                      setNewMethodForm(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pg">PG (Payment Gateway)</SelectItem>
                      <SelectItem value="wallet">전자지갑</SelectItem>
                      <SelectItem value="bank">은행 계좌</SelectItem>
                      <SelectItem value="crypto">암호화폐</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provider">제공업체</Label>
                  <Input 
                    id="provider"
                    placeholder="PayPal Inc."
                    value={newMethodForm.provider}
                    onChange={(e) => 
                      setNewMethodForm(prev => ({ ...prev, provider: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">설명</Label>
                  <Textarea 
                    id="description"
                    placeholder="PayPal 글로벌 결제 시스템"
                    value={newMethodForm.description}
                    onChange={(e) => 
                      setNewMethodForm(prev => ({ ...prev, description: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API 키</Label>
                  <Input 
                    id="apiKey"
                    type="password"
                    placeholder="API 키를 입력하세요"
                    value={newMethodForm.apiKey}
                    onChange={(e) => 
                      setNewMethodForm(prev => ({ ...prev, apiKey: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commission">수수료율 (%)</Label>
                  <Input 
                    id="commission"
                    type="number"
                    step="0.1"
                    placeholder="3.4"
                    value={newMethodForm.commissionRate}
                    onChange={(e) => 
                      setNewMethodForm(prev => ({ ...prev, commissionRate: parseFloat(e.target.value) || 0 }))
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddMethodDialog(false)}>
                  취소
                </Button>
                <Button onClick={addPaymentMethod}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  결제 수단 추가
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 전체 결제 현황 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번 달 총 거래액</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₩1,295,000</div>
            <p className="text-xs text-muted-foreground">+12.5% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활성 결제 수단</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paymentMethods.filter(m => m.status === 'active').length}</div>
            <p className="text-xs text-muted-foreground">총 {paymentMethods.length}개 중</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 수수료</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.97%</div>
            <p className="text-xs text-muted-foreground">가중 평균</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">유료 사용자</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87</div>
            <p className="text-xs text-muted-foreground">+23명 이번 달</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 결제 수단 관리 */}
        <Card>
          <CardHeader>
            <CardTitle>결제 수단 관리</CardTitle>
            <CardDescription>연동된 결제 서비스를 관리하고 테스트합니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentMethods.map((method) => (
              <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <CreditCard className="w-8 h-8 text-primary" />
                  <div>
                    <h3 className="font-medium">{method.name}</h3>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <span>수수료: {method.commission}%</span>
                      <span>•</span>
                      <span>월 거래: ₩{method.monthlyVolume.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(method.status)}
                  {method.testMode && (
                    <Badge variant="outline">테스트 모드</Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditMethodDialog(method)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    수정
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testPaymentMethod(method.id)}
                  >
                    <TestTube className="w-4 h-4 mr-1" />
                    테스트
                  </Button>
                  <Switch
                    checked={method.status === 'active'}
                    onCheckedChange={(checked) => 
                      togglePaymentMethod(method.id, checked ? 'active' : 'inactive')
                    }
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 권한별 결제 관리 */}
        <Card>
          <CardHeader>
            <CardTitle>권한별 요금제</CardTitle>
            <CardDescription>사용자 역할별 결제 플랜을 설정합니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {userPaymentPlans.map((plan) => (
              <div key={plan.role} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{plan.name}</h3>
                    <div className="text-sm text-muted-foreground">
                      {plan.role === 'pet-owner' ? '견주' : 
                       plan.role === 'trainer' ? '훈련사' : '기관 관리자'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">₩{plan.basePrice.toLocaleString()}/월</div>
                    <div className="text-sm text-muted-foreground">수수료: {plan.commission}%</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">포함 기능:</div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="w-3 h-3 mr-2 text-success" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between pt-2">
                  {getStatusBadge(plan.status)}
                  <div className="space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-1" />
                      수정
                    </Button>
                    <Switch
                      checked={plan.status === 'active'}
                      onCheckedChange={(checked) => 
                        updatePlan(plan.role, { status: checked ? 'active' : 'inactive' })
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 결제 테스트 결과 */}
      {Object.keys(testResults).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>최근 테스트 결과</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(testResults).map(([methodId, success]) => (
                <div key={methodId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>{paymentMethods.find(m => m.id === methodId)?.name}</span>
                  {success ? (
                    <Badge className="bg-success/10 text-success">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      성공
                    </Badge>
                  ) : (
                    <Badge className="bg-destructive/10 text-destructive">
                      <XCircle className="w-3 h-3 mr-1" />
                      실패
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 결제 수단 수정 다이얼로그 */}
      <Dialog open={showEditMethodDialog} onOpenChange={setShowEditMethodDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>결제 수단 수정</DialogTitle>
            <DialogDescription>
              기존 결제 서비스의 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-method-id" className="text-right">
                결제 수단 ID
              </Label>
              <Input
                id="edit-method-id"
                value={editingMethod?.id || ''}
                disabled
                className="col-span-3 bg-gray-100"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-method-name" className="text-right">
                표시 이름
              </Label>
              <Input
                id="edit-method-name"
                value={editingMethod?.name || ''}
                onChange={(e) => setEditingMethod(prev => ({ ...prev, name: e.target.value }))}
                className="col-span-3"
                placeholder="예: Stripe"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-method-type" className="text-right">
                유형
              </Label>
              <Select
                value={editingMethod?.type || ''}
                onValueChange={(value) => setEditingMethod(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="결제 유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pg">PG사</SelectItem>
                  <SelectItem value="card">카드</SelectItem>
                  <SelectItem value="bank">계좌이체</SelectItem>
                  <SelectItem value="mobile">휴대폰</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-method-provider" className="text-right">
                제공업체
              </Label>
              <Input
                id="edit-method-provider"
                value={editingMethod?.provider || ''}
                onChange={(e) => setEditingMethod(prev => ({ ...prev, provider: e.target.value }))}
                className="col-span-3"
                placeholder="예: Stripe Inc."
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-method-apikey" className="text-right">
                API 키
              </Label>
              <Input
                id="edit-method-apikey"
                type="password"
                value={editingMethod?.apiKey || ''}
                onChange={(e) => setEditingMethod(prev => ({ ...prev, apiKey: e.target.value }))}
                className="col-span-3"
                placeholder="새 API 키를 입력하세요"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-method-commission" className="text-right">
                수수료율 (%)
              </Label>
              <Input
                id="edit-method-commission"
                type="number"
                step="0.01"
                value={editingMethod?.commissionRate || 0}
                onChange={(e) => setEditingMethod(prev => ({ ...prev, commissionRate: parseFloat(e.target.value) || 0 }))}
                className="col-span-3"
                placeholder="0.00"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-method-status" className="text-right">
                상태
              </Label>
              <Select
                value={editingMethod?.status || ''}
                onValueChange={(value) => setEditingMethod(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">활성</SelectItem>
                  <SelectItem value="inactive">비활성</SelectItem>
                  <SelectItem value="testing">테스트</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditMethodDialog(false)}>
              취소
            </Button>
            <Button type="submit" onClick={updatePaymentMethod}>
              수정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
