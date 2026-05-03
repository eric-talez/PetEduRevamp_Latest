import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Filter, Plus, Eye, Edit, Trash2, Building, MapPin, Users, CreditCard, DollarSign, Video, CheckCircle, Clock, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { SubscriptionChangeDialog } from "@/components/SubscriptionChangeDialog";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";

interface SubscriptionPlan {
  id: number;
  name: string;
  code: string;
  description: string;
  price: number;
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
}

export default function AdminInstitutes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddInstituteOpen, setIsAddInstituteOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedInstitute, setSelectedInstitute] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isChangeSubscriptionOpen, setIsChangeSubscriptionOpen] = useState(false);
  const [selectedSubscriptionPlan, setSelectedSubscriptionPlan] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [newInstitute, setNewInstitute] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    businessNumber: "",
    directorName: "",
    directorEmail: "",
    subscriptionPlan: "",
    paymentMethod: "card",
    isVerified: false
  });

  // 현재 사용자 정보 조회
  const { data: currentUserData } = useQuery({
    queryKey: ['/api/user/me'],
    queryFn: async () => {
      const response = await fetch('/api/user/me');
      if (!response.ok) return null;
      return response.json();
    }
  });

  // 구독 플랜 조회
  const { data: subscriptionPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['/api/subscription-plans'],
    queryFn: async () => {
      const response = await fetch('/api/subscription-plans');
      if (!response.ok) {
        throw new Error('구독 플랜 데이터를 불러올 수 없습니다');
      }
      const result = await response.json();
      console.log('[DEBUG] 구독 플랜 응답:', result);
      return Array.isArray(result) ? result : result.data || result.plans || [];
    }
  });

  // 현재 사용자 정보 설정
  useEffect(() => {
    if (currentUserData) {
      setCurrentUser(currentUserData);
    }
  }, [currentUserData]);

  // 기관 등록 뮤테이션
  const registerInstituteMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/admin/institutes', data),
    onSuccess: (response) => {
      toast({
        title: '기관 등록 성공',
        description: '기관이 성공적으로 등록되었습니다.'
      });
      
      // 폼 초기화
      setNewInstitute({
        name: "",
        description: "",
        address: "",
        phone: "",
        email: "",
        website: "",
        businessNumber: "",
        directorName: "",
        directorEmail: "",
        subscriptionPlan: "",
        paymentMethod: "card",
        isVerified: false
      });
      setSelectedPlan(null);
      setIsAddInstituteOpen(false);
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/institutes'] });
    },
    onError: (error: any) => {
      toast({
        title: '등록 실패',
        description: error.message || '기관 등록 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  });

  // 기관 추가 함수
  const handleAddInstitute = () => {
    if (!newInstitute.name || !newInstitute.email || !newInstitute.subscriptionPlan) {
      toast({
        title: '입력 오류',
        description: '기관명, 이메일, 구독 플랜은 필수 항목입니다.',
        variant: 'destructive'
      });
      return;
    }
    
    registerInstituteMutation.mutate(newInstitute);
  };

  // 기관 정보 수정 함수
  const handleUpdateInstitute = async () => {
    if (!selectedInstitute || !newInstitute.name || !newInstitute.email) {
      toast({
        title: '입력 오류',
        description: '필수 정보를 모두 입력해주세요.',
        variant: 'destructive'
      });
      return;
    }

    try {
      console.log('[DEBUG] API Request: PUT /api/admin/institutes/' + selectedInstitute.id);
      console.log('[DEBUG] Request payload:', newInstitute);
      
      const response = await apiRequest('PUT', `/api/admin/institutes/${selectedInstitute.id}`, newInstitute);
      
      console.log('[DEBUG] API Response:', response.status || '200 OK');
      
      // API 응답이 성공 상태인지 확인
      const responseData = response as any;
      if (responseData && (responseData.success === true || responseData.success === undefined)) {
        toast({
          title: '수정 완료',
          description: '기관 정보가 성공적으로 수정되었습니다.'
        });
        
        // 캐시 무효화로 목록 새로고침
        queryClient.invalidateQueries({ queryKey: ['/api/admin/institutes'] });
        
        setIsEditDialogOpen(false);
        setSelectedInstitute(null);
      } else {
        console.error('[DEBUG] API Error:', responseData);
        toast({
          title: '수정 실패',
          description: responseData?.message || responseData?.error || '기관 정보 수정에 실패했습니다.',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('[DEBUG] Exception caught:', error);
      toast({
        title: '수정 실패',
        description: error.message || '기관 정보 수정 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  };

  const handlePlanSelect = (planCode: string) => {
    console.log('[DEBUG] 구독 플랜 선택:', planCode);
    const plans = Array.isArray(subscriptionPlans) ? subscriptionPlans : [];
    const plan = plans.find((p: SubscriptionPlan) => p.code === planCode);
    console.log('[DEBUG] 선택된 플랜:', plan);
    setSelectedPlan(plan || null);
    setNewInstitute(prev => ({ ...prev, subscriptionPlan: planCode }));
  };

  // 기관 보기 함수
  const handleViewInstitute = (institute: any) => {
    console.log('기관 상세보기 클릭:', institute);
    setSelectedInstitute(institute);
    setIsViewDialogOpen(true);
  };

  // 구독 변경 처리
  const handleChangeSubscription = (institute: any) => {
    console.log('구독 변경 클릭:', institute);
    setSelectedInstitute(institute);
    setCurrentUser({ role: 'admin', name: '관리자' });
    setIsChangeSubscriptionOpen(true);
  };

  // 기관 수정 함수
  const handleEditInstitute = (institute: any) => {
    console.log('기관 수정 클릭:', institute);
    setSelectedInstitute(institute);
    setNewInstitute({
      name: institute.name || "",
      description: institute.description || "",
      address: institute.address || "",
      phone: institute.phone || "",
      email: institute.email || "",
      website: institute.website || "",
      businessNumber: institute.businessNumber || "",
      directorName: institute.directorName || "",
      directorEmail: institute.directorEmail || "",
      subscriptionPlan: institute.subscriptionPlan || "",
      paymentMethod: institute.paymentMethod || "card",
      isVerified: institute.isVerified || false
    });
    
    // 선택된 플랜 정보 설정
    const plans = Array.isArray(subscriptionPlans) ? subscriptionPlans : [];
    const plan = plans.find((p: SubscriptionPlan) => p.code === institute.subscriptionPlan);
    setSelectedPlan(plan || null);
    
    setIsEditDialogOpen(true);
  };

  // 기관 삭제 함수
  const handleDeleteInstitute = (institute: any) => {
    console.log('기관 삭제 클릭:', institute);
    setSelectedInstitute(institute);
    setIsDeleteDialogOpen(true);
  };

  // 기관 삭제 확인
  const confirmDeleteInstitute = async () => {
    if (!selectedInstitute) return;

    try {
      await apiRequest('DELETE', `/api/admin/institutes/${selectedInstitute.id}`);
      toast({
        title: '기관 삭제 완료',
        description: '기관이 성공적으로 삭제되었습니다.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/institutes'] });
      setIsDeleteDialogOpen(false);
      setSelectedInstitute(null);
    } catch (error: any) {
      toast({
        title: '삭제 실패',
        description: error.message || '기관 삭제 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  };

  // 구독 플랜 변경 처리
  const handleSubscriptionChange = async (paymentMethod: 'admin' | 'institute') => {
    if (!selectedInstitute || !selectedSubscriptionPlan) return;

    try {
      if (paymentMethod === 'admin') {
        // 관리자가 대신 결제
        await apiRequest('POST', `/api/admin/institutes/${selectedInstitute.id}/admin-payment`, {
          subscriptionPlan: selectedSubscriptionPlan
        });
        toast({
          title: '구독 플랜 변경 완료',
          description: '관리자 결제로 구독 플랜이 변경되었습니다.'
        });
      } else {
        // 기관 관리자가 직접 결제
        await apiRequest('POST', `/api/admin/institutes/${selectedInstitute.id}/request-payment`, {
          subscriptionPlan: selectedSubscriptionPlan
        });
        toast({
          title: '결제 요청 완료',
          description: '기관 관리자에게 결제 요청이 전송되었습니다.'
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/institutes'] });
      setIsChangeSubscriptionOpen(false);
      setSelectedInstitute(null);
      setSelectedSubscriptionPlan("");
    } catch (error: any) {
      toast({
        title: '구독 플랜 변경 실패',
        description: error.message || '구독 플랜 변경 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const getFeatureIcon = (feature: string, enabled: boolean) => {
    if (!enabled) return null;
    
    switch (feature) {
      case 'basicLMS':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'aiRecommendation':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'customBranding':
        return <CheckCircle className="w-4 h-4 text-primary" />;
      case 'apiIntegration':
        return <CheckCircle className="w-4 h-4 text-orange-500" />;
      case 'dedicatedSupport':
        return <CheckCircle className="w-4 h-4 text-primary" />;
      case 'whiteLabel':
        return <CheckCircle className="w-4 h-4 text-indigo-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  // 실제 기관 데이터 가져오기
  const { data: institutesData, isLoading, error } = useQuery({
    queryKey: ['/api/admin/institutes'],
    queryFn: async () => {
      const response = await fetch('/api/admin/institutes');
      if (!response.ok) {
        throw new Error('기관 데이터를 불러올 수 없습니다');
      }
      const result = await response.json();
      console.log('[DEBUG] 기관 데이터 응답:', result);
      
      // 응답 데이터 구조 확인
      if (result.success && result.data && result.data.institutes) {
        return result.data.institutes;
      } else if (result.institutes) {
        return result.institutes;
      } else {
        console.error('[DEBUG] 예상치 못한 응답 구조:', result);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5분
  });

  const institutes = institutesData || [];

  // 로딩 상태 처리
  if (isLoading) {
    return <PageSkeleton variant="table" count={6} />;
  }

  // 에러 상태 처리
  if (error) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">기관 정보를 불러올 수 없습니다</h2>
            <p className="text-muted-foreground">잠시 후 다시 시도해주세요.</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">활성</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">비활성</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-800">정지</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">기관 관리</h1>
          <p className="text-muted-foreground">등록된 훈련 기관들을 관리합니다</p>
        </div>
        <Dialog open={isAddInstituteOpen} onOpenChange={setIsAddInstituteOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              새 기관 등록
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[900px]">
            <DialogHeader>
              <DialogTitle>새 기관 등록</DialogTitle>
              <DialogDescription>
                새로운 훈련 기관을 플랫폼에 등록합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
              {/* 기본 정보 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">기본 정보</h3>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">기관명 *</Label>
                  <Input
                    id="name"
                    value={newInstitute.name}
                    onChange={(e) => setNewInstitute({ ...newInstitute, name: e.target.value })}
                    className="col-span-3"
                    placeholder="서울반려견아카데미"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">이메일 *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newInstitute.email}
                    onChange={(e) => setNewInstitute({ ...newInstitute, email: e.target.value })}
                    className="col-span-3"
                    placeholder="admin@institute.com"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">설명</Label>
                  <Textarea
                    id="description"
                    value={newInstitute.description}
                    onChange={(e) => setNewInstitute({ ...newInstitute, description: e.target.value })}
                    className="col-span-3"
                    placeholder="기관에 대한 설명을 입력하세요"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">연락처</Label>
                  <Input
                    id="phone"
                    value={newInstitute.phone}
                    onChange={(e) => setNewInstitute({ ...newInstitute, phone: e.target.value })}
                    className="col-span-3"
                    placeholder="02-1234-5678"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="address" className="text-right">주소</Label>
                  <Input
                    id="address"
                    value={newInstitute.address}
                    onChange={(e) => setNewInstitute({ ...newInstitute, address: e.target.value })}
                    className="col-span-3"
                    placeholder="서울시 강남구"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="website" className="text-right">웹사이트</Label>
                  <Input
                    id="website"
                    value={newInstitute.website}
                    onChange={(e) => setNewInstitute({ ...newInstitute, website: e.target.value })}
                    className="col-span-3"
                    placeholder="https://www.institute.com"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="businessNumber" className="text-right">사업자번호</Label>
                  <Input
                    id="businessNumber"
                    value={newInstitute.businessNumber}
                    onChange={(e) => setNewInstitute({ ...newInstitute, businessNumber: e.target.value })}
                    className="col-span-3"
                    placeholder="123-45-67890"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="directorName" className="text-right">대표자명</Label>
                  <Input
                    id="directorName"
                    value={newInstitute.directorName}
                    onChange={(e) => setNewInstitute({ ...newInstitute, directorName: e.target.value })}
                    className="col-span-3"
                    placeholder="김원장"
                  />
                </div>
              </div>

              <Separator />

              {/* 구독 플랜 선택 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">구독 플랜 선택 *</h3>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">플랜</Label>
                  <Select value={newInstitute.subscriptionPlan} onValueChange={handlePlanSelect}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="구독 플랜을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Array.isArray(subscriptionPlans) ? subscriptionPlans : []).map((plan: SubscriptionPlan) => (
                        <SelectItem key={plan.code} value={plan.code}>
                          <div className="flex items-center justify-between w-full">
                            <span>{plan.name}</span>
                            <span className="text-primary font-semibold ml-2">
                              월 {formatPrice(plan.price)}원
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPlan && (
                  <div className="col-span-4 ml-4">
                    <Card className="border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold">{selectedPlan.name}</h4>
                          <Badge variant="outline" className="text-primary">
                            월 {formatPrice(selectedPlan.price)}원
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">{selectedPlan.description}</p>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            <span className="text-sm">
                              최대 {selectedPlan.maxMembers === -1 ? '무제한' : selectedPlan.maxMembers}명
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Video className="w-4 h-4 text-green-500" />
                            <span className="text-sm">
                              월 {selectedPlan.maxVideoHours === -1 ? '무제한' : selectedPlan.maxVideoHours}시간
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h5 className="text-sm font-medium">포함 기능:</h5>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(selectedPlan.features).map(([key, enabled]) => (
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
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              <Separator />

              {/* 결제 방법 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">결제 방법</h3>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">결제 수단</Label>
                  <div className="col-span-3">
                    <RadioGroup
                      value={newInstitute.paymentMethod}
                      onValueChange={(value) => setNewInstitute({ ...newInstitute, paymentMethod: value })}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="card" id="card" />
                        <Label htmlFor="card" className="flex items-center space-x-2">
                          <CreditCard className="w-4 h-4" />
                          <span>신용카드</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="transfer" id="transfer" />
                        <Label htmlFor="transfer" className="flex items-center space-x-2">
                          <DollarSign className="w-4 h-4" />
                          <span>계좌이체</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="invoice" id="invoice" />
                        <Label htmlFor="invoice" className="flex items-center space-x-2">
                          <DollarSign className="w-4 h-4" />
                          <span>세금계산서</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                onClick={handleAddInstitute}
                disabled={registerInstituteMutation.isPending || !newInstitute.name || !newInstitute.email || !newInstitute.subscriptionPlan}
              >
                {registerInstituteMutation.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    등록 중...
                  </>
                ) : (
                  '기관 등록'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 기관 수</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Array.isArray(institutes) ? institutes.length : 0}</div>
            <p className="text-xs text-muted-foreground">
              활성 {Array.isArray(institutes) ? institutes.filter((i: any) => i.isActive === true).length : 0}개
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 훈련사</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.isArray(institutes) ? institutes.reduce((total: number, inst: any) => total + (inst.trainersCount || (inst.trainerId ? 1 : 0)), 0) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              전체 기관 소속
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 교육생</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.isArray(institutes) ? institutes.reduce((total: number, inst: any) => total + (inst.studentsCount || 0), 0) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              모든 기관 합계
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 규모</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.isArray(institutes) && institutes.length > 0 ? 
                Math.round(institutes.reduce((total: number, inst: any) => total + (inst.trainersCount || (inst.trainerId ? 1 : 0)), 0) / institutes.length) : 0}명
            </div>
            <p className="text-xs text-muted-foreground">
              기관당 평균 훈련사
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 검색 및 필터 */}
      <Card>
        <CardHeader>
          <CardTitle>기관 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="기관명, 코드, 원장명으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="inactive">비활성</SelectItem>
                <SelectItem value="suspended">정지</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              고급 필터
            </Button>
          </div>

          {/* 기관 테이블 */}
          <div className="border rounded-lg overflow-x-auto">
            <div className="min-w-[1400px]">
              <div className="grid grid-cols-[100px_180px_140px_180px_140px_80px_120px_80px_80px_180px] gap-2 p-4 font-medium border-b bg-muted/50 text-sm">
                <div>기관코드</div>
                <div>기관명</div>
                <div>대표자</div>
                <div>위치</div>
                <div>구독 플랜</div>
                <div className="text-center">훈련사</div>
                <div className="text-center">교육생</div>
                <div className="text-center">상태</div>
                <div className="text-center">결제</div>
                <div>작업</div>
              </div>
            {Array.isArray(institutes) && institutes.length > 0 ? (
              institutes.map((institute: any) => (
                <div 
                  key={institute.id} 
                  className="grid grid-cols-[100px_180px_140px_180px_140px_80px_120px_80px_80px_180px] gap-2 p-4 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors text-sm" 
                  onClick={() => handleViewInstitute(institute)}
                  data-testid={`institute-row-${institute.id}`}
                >
                  <div>
                    <div className="font-mono text-sm font-semibold text-primary bg-primary/10 px-2 py-1 rounded inline-block">
                      {institute.code || institute.instituteCode || '-'}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">{institute.name || '이름 없음'}</div>
                    <div className="text-sm text-muted-foreground">{institute.email || '-'}</div>
                  </div>
                  <div>
                    <div className="font-medium">{institute.directorName || institute.director || '미지정'}</div>
                    <div className="text-sm text-muted-foreground">{institute.phone || '-'}</div>
                  </div>
                  <div className="text-sm flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    {institute.address || institute.location || '위치 미지정'}
                  </div>
                  <div>
                    <div className="font-medium">
                      {institute.subscriptionPlanInfo || 
                       institute.subscriptionPlanName || 
                       (institute.subscriptionPlan === 'starter' ? '스타터 플랜' : 
                        institute.subscriptionPlan === 'standard' ? '스탠다드 플랜' : 
                        institute.subscriptionPlan === 'professional' ? '프로페셔널 플랜' : 
                        institute.subscriptionPlan === 'enterprise' ? '엔터프라이즈 플랜' : 
                        institute.subscriptionPlan || '미지정')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      월 {institute.subscriptionPlanPrice ? institute.subscriptionPlanPrice.toLocaleString() : 
                           (institute.subscriptionPlan === 'starter' ? '150,000' : 
                            institute.subscriptionPlan === 'standard' ? '300,000' : 
                            institute.subscriptionPlan === 'professional' ? '500,000' : 
                            institute.subscriptionPlan === 'enterprise' ? '800,000' : '0')}원
                    </div>
                  </div>
                  <div className="text-center font-medium">
                    <div>{institute.trainersCount || (institute.trainerId ? 1 : 0)}명</div>
                    <div className="text-xs text-muted-foreground">
                      최대 {institute.maxMembers === -1 ? '무제한' : institute.maxMembers}명
                    </div>
                  </div>
                  <div className="text-center font-medium">
                    <div>{institute.studentsCount || 0}명</div>
                    <div className="text-xs text-muted-foreground">
                      영상: {institute.usedVideoHours || 0}h/{institute.maxVideoHours === -1 ? '∞' : institute.maxVideoHours}h
                    </div>
                    <div className="text-xs text-muted-foreground">
                      AI: {institute.currentAiUsage || 0}회/{institute.maxAiAnalysis === -1 ? '∞' : institute.maxAiAnalysis}회
                    </div>
                  </div>
                  <div>{getStatusBadge(institute.isActive ? 'active' : 'inactive')}</div>
                  <div>
                    <Badge 
                      variant={institute.subscriptionStatus === 'active' ? 'default' : 'secondary'}
                      className={institute.subscriptionStatus === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                    >
                      {institute.subscriptionStatus === 'active' ? '활성' : '대기'}
                    </Badge>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewInstitute(institute)}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400"
                      data-testid={`button-view-${institute.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditInstitute(institute)}
                      className="text-green-600 border-green-300 hover:bg-green-50 hover:text-green-700 hover:border-green-400"
                      data-testid={`button-edit-${institute.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteInstitute(institute)}
                      className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700 hover:border-red-400"
                      data-testid={`button-delete-${institute.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleChangeSubscription(institute)}
                      className="text-primary border-primary/40 hover:bg-primary/5 hover:text-primary hover:border-primary/40"
                      data-testid={`button-subscription-${institute.id}`}
                    >
                      <CreditCard className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                등록된 기관이 없습니다.
              </div>
            )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 기관 등록 현황 다이얼로그 */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>기관 등록 현황 및 상세 정보</DialogTitle>
            <DialogDescription>
              {selectedInstitute?.name}의 상세 정보와 등록 현황을 확인할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          {selectedInstitute && (
            <div className="space-y-6">
              {/* 등록 현황 요약 */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedInstitute.trainersCount || (selectedInstitute.trainerId ? 1 : 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">등록 훈련사</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedInstitute.studentsCount || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">등록 교육생</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {selectedInstitute.subscriptionStatus === 'active' ? '활성' : '대기'}
                  </div>
                  <div className="text-sm text-muted-foreground">구독 상태</div>
                </div>
              </div>

              {/* 구독 플랜 및 사용량 현황 */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-3">구독 플랜 및 사용량</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">구독 플랜:</span>
                    <span className="ml-2 text-blue-600">
                      {selectedInstitute.subscriptionPlanInfo || 
                       selectedInstitute.subscriptionPlanName || 
                       (selectedInstitute.subscriptionPlan === 'starter' ? '스타터 플랜' : 
                        selectedInstitute.subscriptionPlan === 'standard' ? '스탠다드 플랜' : 
                        selectedInstitute.subscriptionPlan === 'professional' ? '프로페셔널 플랜' : 
                        selectedInstitute.subscriptionPlan === 'enterprise' ? '엔터프라이즈 플랜' : 
                        selectedInstitute.subscriptionPlan || '미지정')}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">월 구독료:</span>
                    <span className="ml-2 text-green-600">
                      {selectedInstitute.subscriptionPlanPrice ? selectedInstitute.subscriptionPlanPrice.toLocaleString() : 
                       (selectedInstitute.subscriptionPlan === 'starter' ? '150,000' : 
                        selectedInstitute.subscriptionPlan === 'standard' ? '300,000' : 
                        selectedInstitute.subscriptionPlan === 'professional' ? '500,000' : 
                        selectedInstitute.subscriptionPlan === 'enterprise' ? '800,000' : '0')}원
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">화상 수업 사용량:</span>
                    <span className="ml-2">
                      {selectedInstitute.usedVideoHours || 0}h / {selectedInstitute.maxVideoHours === -1 ? '무제한' : `${selectedInstitute.maxVideoHours}h`}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">AI 분석 사용량:</span>
                    <span className="ml-2">
                      {selectedInstitute.currentAiUsage || 0}회 / {selectedInstitute.maxAiAnalysis === -1 ? '무제한' : `${selectedInstitute.maxAiAnalysis}회`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">기관 코드</Label>
                  <p className="font-mono text-sm font-semibold text-primary bg-primary/10 px-2 py-1 rounded inline-block mt-1">
                    {selectedInstitute.code || selectedInstitute.instituteCode || '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">기관명</Label>
                  <p className="text-sm text-muted-foreground">{selectedInstitute.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">대표자</Label>
                  <p className="text-sm text-muted-foreground">{selectedInstitute.directorName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">이메일</Label>
                  <p className="text-sm text-muted-foreground">{selectedInstitute.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">전화번호</Label>
                  <p className="text-sm text-muted-foreground">{selectedInstitute.phone}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium">주소</Label>
                  <p className="text-sm text-muted-foreground">{selectedInstitute.address}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">구독 플랜</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedInstitute.subscriptionPlanInfo?.name || 
                     (selectedInstitute.subscriptionPlan === 'starter' ? 'Starter' : 
                      selectedInstitute.subscriptionPlan === 'standard' ? 'Standard' : 
                      selectedInstitute.subscriptionPlan === 'professional' ? 'Professional' : 
                      selectedInstitute.subscriptionPlan === 'enterprise' ? 'Enterprise' : 
                      selectedInstitute.subscriptionPlan || '미지정')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">월 구독료</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedInstitute.subscriptionPlanInfo?.price ? formatPrice(selectedInstitute.subscriptionPlanInfo.price) : 
                     (selectedInstitute.subscriptionPlan === 'starter' ? '150,000' : 
                      selectedInstitute.subscriptionPlan === 'standard' ? '300,000' : 
                      selectedInstitute.subscriptionPlan === 'professional' ? '500,000' : 
                      selectedInstitute.subscriptionPlan === 'enterprise' ? '800,000' : '0')}원
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">화상 수업 한도</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedInstitute.maxVideoHours === -1 ? '무제한' : `${selectedInstitute.maxVideoHours}시간`}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">AI 분석 한도</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedInstitute.maxAiAnalysis === -1 ? '무제한' : `${selectedInstitute.maxAiAnalysis}회`}
                  </p>
                </div>
              </div>
              {selectedInstitute.description && (
                <div>
                  <Label className="text-sm font-medium">기관 설명</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedInstitute.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 기관 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>기관 정보 수정</DialogTitle>
            <DialogDescription>
              기관의 기본 정보와 구독 플랜을 수정할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* 기본 정보 섹션 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">기본 정보</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">기관명 *</Label>
                  <Input
                    id="edit-name"
                    value={newInstitute.name}
                    onChange={(e) => setNewInstitute({ ...newInstitute, name: e.target.value })}
                    placeholder="기관명을 입력하세요"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-director">대표자명 *</Label>
                  <Input
                    id="edit-director"
                    value={newInstitute.directorName}
                    onChange={(e) => setNewInstitute({ ...newInstitute, directorName: e.target.value })}
                    placeholder="대표자명을 입력하세요"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">이메일 *</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={newInstitute.email}
                    onChange={(e) => setNewInstitute({ ...newInstitute, email: e.target.value })}
                    placeholder="이메일을 입력하세요"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-director-email">대표자 이메일</Label>
                  <Input
                    id="edit-director-email"
                    type="email"
                    value={newInstitute.directorEmail}
                    onChange={(e) => setNewInstitute({ ...newInstitute, directorEmail: e.target.value })}
                    placeholder="대표자 이메일을 입력하세요"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone">전화번호</Label>
                  <Input
                    id="edit-phone"
                    value={newInstitute.phone}
                    onChange={(e) => setNewInstitute({ ...newInstitute, phone: e.target.value })}
                    placeholder="전화번호를 입력하세요"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-business-number">사업자등록번호</Label>
                  <Input
                    id="edit-business-number"
                    value={newInstitute.businessNumber}
                    onChange={(e) => setNewInstitute({ ...newInstitute, businessNumber: e.target.value })}
                    placeholder="사업자등록번호를 입력하세요"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-address">주소</Label>
                  <Input
                    id="edit-address"
                    value={newInstitute.address}
                    onChange={(e) => setNewInstitute({ ...newInstitute, address: e.target.value })}
                    placeholder="주소를 입력하세요"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-website">웹사이트</Label>
                  <Input
                    id="edit-website"
                    value={newInstitute.website}
                    onChange={(e) => setNewInstitute({ ...newInstitute, website: e.target.value })}
                    placeholder="웹사이트 URL을 입력하세요"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-description">기관 설명</Label>
                  <Textarea
                    id="edit-description"
                    value={newInstitute.description}
                    onChange={(e) => setNewInstitute({ ...newInstitute, description: e.target.value })}
                    placeholder="기관에 대한 설명을 입력하세요"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* 구독 플랜 섹션 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">구독 플랜</h3>
              <div className="space-y-3">
                <Label>구독 플랜 선택 *</Label>
                <Select value={newInstitute.subscriptionPlan} onValueChange={handlePlanSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="구독 플랜을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(subscriptionPlans) && subscriptionPlans.map((plan: SubscriptionPlan) => (
                      <SelectItem key={plan.code} value={plan.code}>
                        {plan.name} - {formatPrice(plan.price)}원/월
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* 선택된 플랜 정보 */}
                {selectedPlan && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">최대 회원 수:</span>
                        <span className="ml-2 text-muted-foreground">
                          {selectedPlan.maxMembers === -1 ? '무제한' : `${selectedPlan.maxMembers}명`}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">화상 수업 시간:</span>
                        <span className="ml-2 text-muted-foreground">
                          {selectedPlan.maxVideoHours === -1 ? '무제한' : `${selectedPlan.maxVideoHours}시간`}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">AI 분석 횟수:</span>
                        <span className="ml-2 text-muted-foreground">
                          {selectedPlan.maxAiAnalysis === -1 ? '무제한' : `${selectedPlan.maxAiAnalysis}회`}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">월 구독료:</span>
                        <span className="ml-2 text-muted-foreground">
                          {formatPrice(selectedPlan.price)}원
                        </span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <span className="font-medium">포함 기능:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(selectedPlan.features).map(([key, enabled]) => {
                          if (!enabled) return null;
                          const featureNames: Record<string, string> = {
                            basicLMS: 'LMS 기본',
                            basicVideoConsultation: '화상 상담',
                            basicStatistics: '기본 통계',
                            aiRecommendation: 'AI 추천',
                            customBranding: '커스텀 브랜딩',
                            apiIntegration: 'API 연동',
                            dedicatedSupport: '전담 지원',
                            whiteLabel: '화이트레이블'
                          };
                          return (
                            <Badge key={key} variant="secondary" className="text-xs">
                              {featureNames[key] || key}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* 설정 섹션 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">설정</h3>
              <div className="space-y-3">
                <div>
                  <Label>결제 방법</Label>
                  <RadioGroup 
                    value={newInstitute.paymentMethod} 
                    onValueChange={(value) => setNewInstitute({ ...newInstitute, paymentMethod: value })}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="card" id="edit-card" />
                      <Label htmlFor="edit-card">카드 결제</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="bank" id="edit-bank" />
                      <Label htmlFor="edit-bank">무통장 입금</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="admin" id="edit-admin" />
                      <Label htmlFor="edit-admin">관리자 결제</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-verified"
                    checked={newInstitute.isVerified}
                    onChange={(e) => setNewInstitute({ ...newInstitute, isVerified: e.target.checked })}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="edit-verified" className="text-sm font-medium">
                    기관 인증 상태
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleUpdateInstitute} disabled={!newInstitute.name || !newInstitute.email}>
              수정 완료
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 기관 삭제 확인 다이얼로그 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>기관 삭제 확인</DialogTitle>
            <DialogDescription>
              정말로 "{selectedInstitute?.name}" 기관을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={confirmDeleteInstitute}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 구독 플랜 변경 다이얼로그 */}
      {selectedInstitute && (
        <SubscriptionChangeDialog
          isOpen={isChangeSubscriptionOpen}
          onClose={() => setIsChangeSubscriptionOpen(false)}
          institute={selectedInstitute}
          subscriptionPlans={subscriptionPlans}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}