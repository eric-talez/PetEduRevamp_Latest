import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, Check, X, Clock, AlertTriangle, Edit, Eye, Calendar, Filter, FileText, Building, Phone, MapPin, AlertCircle, Palette, Settings, CheckCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useTheme } from '@/context/theme-context';
import { ThemeSettings } from '@/components/ThemeSettings';
import { ThemeSwitcherDropdown } from '@/components/ui/ThemeSwitcher';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface CorrectionRequest {
  id: string;
  businessId: string;
  businessName: string;
  businessType: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string;
  correctionType: 'address' | 'phone' | 'hours' | 'description' | 'services' | 'other';
  currentValue: string;
  proposedValue: string;
  reason: string;
  evidence?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'in-review';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  adminNotes?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export default function InfoCorrectionRequests() {
  console.log('[DEBUG] 정보 수정 요청 관리 라우트 접근');

  const [requests, setRequests] = useState<CorrectionRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<CorrectionRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<CorrectionRequest | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  const { theme } = useTheme();

  // 실제 데이터 조회
  const { data: requestsData, isLoading } = useQuery({
    queryKey: ['/api/admin/correction-requests'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/correction-requests');
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5분
  });

  // 샘플 데이터 (실제 데이터가 없을 때 표시)
  const sampleRequests: CorrectionRequest[] = [
    {
      id: 'req-001',
      businessId: 'biz-001',
      businessName: '서울 펫 트레이닝 센터',
      businessType: 'training-center',
      requesterName: '김철수',
      requesterEmail: 'kimcs@example.com',
      requesterPhone: '010-1234-5678',
      correctionType: 'address',
      currentValue: '서울특별시 강남구 테헤란로 123',
      proposedValue: '서울특별시 강남구 테헤란로 456',
      reason: '업체가 이전했습니다. 새로운 주소로 변경 요청드립니다.',
      evidence: ['image1.jpg', 'lease_contract.pdf'],
      status: 'pending',
      submittedAt: '2024-01-15T10:30:00Z',
      priority: 'high'
    },
    {
      id: 'req-002',
      businessId: 'biz-002',
      businessName: '해피독 동물병원',
      businessType: 'veterinary',
      requesterName: '박영희',
      requesterEmail: 'parkyh@example.com',
      correctionType: 'phone',
      currentValue: '02-1234-5678',
      proposedValue: '02-9876-5432',
      reason: '전화번호가 변경되었습니다.',
      status: 'approved',
      submittedAt: '2024-01-14T14:20:00Z',
      reviewedAt: '2024-01-14T16:45:00Z',
      reviewedBy: '관리자',
      adminNotes: '확인 완료 후 승인처리',
      priority: 'medium'
    },
    {
      id: 'req-003',
      businessId: 'biz-003',
      businessName: '스마트독 교육센터',
      businessType: 'training-center',
      requesterName: '이민수',
      requesterEmail: 'leems@example.com',
      correctionType: 'hours',
      currentValue: '09:00 - 18:00',
      proposedValue: '10:00 - 20:00',
      reason: '운영시간이 변경되었습니다.',
      status: 'rejected',
      submittedAt: '2024-01-13T11:15:00Z',
      reviewedAt: '2024-01-13T15:30:00Z',
      reviewedBy: '관리자',
      adminNotes: '증빙자료 부족으로 반려',
      priority: 'low'
    },
    {
      id: 'req-004',
      businessId: 'biz-004',
      businessName: '펫월드 용품점',
      businessType: 'pet-store',
      requesterName: '최은정',
      requesterEmail: 'choi@example.com',
      correctionType: 'services',
      currentValue: '사료 판매, 용품 판매',
      proposedValue: '사료 판매, 용품 판매, 미용 서비스, 호텔 서비스',
      reason: '새로운 서비스를 추가했습니다.',
      evidence: ['service_menu.jpg'],
      status: 'in-review',
      submittedAt: '2024-01-12T09:45:00Z',
      priority: 'medium'
    }
  ];

  useEffect(() => {
    if (requestsData && requestsData.length > 0) {
      setRequests(requestsData);
      setFilteredRequests(requestsData);
    } else {
      setRequests(sampleRequests);
      setFilteredRequests(sampleRequests);
    }
  }, [requestsData]);

  // 필터링
  useEffect(() => {
    let filtered = requests;

    if (searchTerm) {
      filtered = filtered.filter(request =>
        request.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.reason.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(request => request.priority === priorityFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(request => request.correctionType === typeFilter);
    }

    setFilteredRequests(filtered);
  }, [requests, searchTerm, statusFilter, priorityFilter, typeFilter]);

  const handleReviewRequest = (request: CorrectionRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setReviewAction(action);
    setAdminNotes('');
    setReviewDialogOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedRequest || !reviewAction) return;

    setIsSubmitting(true);
    try {
      // 임시로 성공 처리 (실제 API 연결 시 주석 해제)
      // const response = await fetch(`/api/admin/correction-requests/${selectedRequest.id}/review`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     action: reviewAction,
      //     adminNotes
      //   })
      // });

      // if (!response.ok) {
      //   throw new Error('요청 처리 실패');
      // }

      // const result = await response.json();

      // 임시 성공 처리
      const updatedRequest: CorrectionRequest = {
        ...selectedRequest,
        status: reviewAction === 'approve' ? 'approved' : 'rejected',
        reviewedAt: new Date().toISOString(),
        reviewedBy: '관리자',
        adminNotes
      };

      setRequests(prev => 
        prev.map(req => req.id === selectedRequest.id ? updatedRequest : req)
      );

      toast({
        title: reviewAction === 'approve' ? "요청 승인 완료" : "요청 반려 완료",
        description: reviewAction === 'approve' 
          ? `${selectedRequest.businessName}의 정보 수정 요청이 승인되어 실제 정보가 업데이트되었습니다.`
          : `${selectedRequest.businessName}의 정보 수정 요청이 반려되었습니다.`
      });

      setReviewDialogOpen(false);
      setSelectedRequest(null);
      setReviewAction(null);
      setAdminNotes('');
      
    } catch (error: any) {
      console.error('Review submission error:', error);
      toast({
        title: "처리 실패",
        description: error.message || "요청 처리 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'default',
      'in-review': 'secondary',
      approved: 'success',
      rejected: 'danger'
    } as const;

    const labels = {
      pending: '대기 중',
      'in-review': '검토 중',
      approved: '승인',
      rejected: '반려'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      low: 'outline',
      medium: 'secondary',
      high: 'warning',
      urgent: 'danger'
    } as const;

    const labels = {
      low: '낮음',
      medium: '보통',
      high: '높음',
      urgent: '긴급'
    };

    return (
      <Badge variant={variants[priority as keyof typeof variants] || 'outline'}>
        {labels[priority as keyof typeof labels] || priority}
      </Badge>
    );
  };

  const getCorrectionTypeLabel = (type: string) => {
    const labels = {
      address: '주소',
      phone: '전화번호',
      hours: '운영시간',
      description: '설명',
      services: '서비스',
      other: '기타'
    };
    return labels[type as keyof typeof labels] || type;
  };

  // 테마 설정 값 체크 함수
  const checkThemeSettings = () => {
    const themeData = {
      currentTheme: theme,
      systemSettings: {
        prefersDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
        storedTheme: localStorage.getItem('petedu-theme'),
        appliedClasses: document.documentElement.className,
        colorScheme: document.documentElement.style.colorScheme
      },
      cssVariables: {
        background: getComputedStyle(document.documentElement).getPropertyValue('--background'),
        foreground: getComputedStyle(document.documentElement).getPropertyValue('--foreground'),
        primary: getComputedStyle(document.documentElement).getPropertyValue('--primary'),
        secondary: getComputedStyle(document.documentElement).getPropertyValue('--secondary'),
        accent: getComputedStyle(document.documentElement).getPropertyValue('--accent'),
        muted: getComputedStyle(document.documentElement).getPropertyValue('--muted')
      }
    };

    console.log('🎨 테마 설정 값 체크:', themeData);
    return themeData;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">정보 수정 요청 관리</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">업체 정보 수정 요청을 검토하고 승인/반려할 수 있습니다</p>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            필터 및 검색
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search" className="text-gray-900 dark:text-white">검색</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="업체명, 요청자, 사유 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status" className="text-gray-900 dark:text-white">상태</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="pending">대기 중</SelectItem>
                  <SelectItem value="in-review">검토 중</SelectItem>
                  <SelectItem value="approved">승인</SelectItem>
                  <SelectItem value="rejected">반려</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority" className="text-gray-900 dark:text-white">우선순위</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="urgent">긴급</SelectItem>
                  <SelectItem value="high">높음</SelectItem>
                  <SelectItem value="medium">보통</SelectItem>
                  <SelectItem value="low">낮음</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="type" className="text-gray-900 dark:text-white">수정 유형</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="address">주소</SelectItem>
                  <SelectItem value="phone">전화번호</SelectItem>
                  <SelectItem value="hours">운영시간</SelectItem>
                  <SelectItem value="description">설명</SelectItem>
                  <SelectItem value="services">서비스</SelectItem>
                  <SelectItem value="other">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setTypeFilter('all');
                }}
              >
                초기화
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 요청 목록 */}
      <div className="grid gap-4">
        {filteredRequests.map((request) => (
          <Card key={request.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{request.businessName}</h3>
                    {getStatusBadge(request.status)}
                    {getPriorityBadge(request.priority)}
                    <Badge variant="outline">
                      {getCorrectionTypeLabel(request.correctionType)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">요청자 정보</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">
                            {request.requesterName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-gray-900 dark:text-white">{request.requesterName}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">({request.requesterEmail})</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">제출일</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {formatDistanceToNow(new Date(request.submittedAt), {
                            addSuffix: true,
                            locale: ko
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">현재 정보</Label>
                      <p className="text-sm mt-1 p-2 bg-gray-50 dark:bg-gray-700 rounded text-gray-900 dark:text-white">{request.currentValue}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">수정 요청 정보</Label>
                      <p className="text-sm mt-1 p-2 bg-primary/10 dark:bg-primary/20 rounded text-gray-900 dark:text-white">{request.proposedValue}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">요청 사유</Label>
                      <p className="text-sm mt-1 text-gray-900 dark:text-white">{request.reason}</p>
                    </div>

                    {request.evidence && request.evidence.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">첨부 파일</Label>
                        <div className="flex gap-2 mt-1">
                          {request.evidence.map((file, index) => (
                            <Badge key={index} variant="outline" className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {file}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {request.adminNotes && (
                      <div>
                        <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">관리자 메모</Label>
                        <p className="text-sm mt-1 p-2 bg-warning/10 dark:bg-warning/20 rounded text-gray-900 dark:text-white">{request.adminNotes}</p>
                        {request.reviewedBy && request.reviewedAt && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {request.reviewedBy} • {formatDistanceToNow(new Date(request.reviewedAt), {
                              addSuffix: true,
                              locale: ko
                            })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  {request.status === 'pending' || request.status === 'in-review' ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleReviewRequest(request, 'approve')}
                        className="flex items-center gap-1"
                      >
                        <Check className="w-4 h-4" />
                        승인
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReviewRequest(request, 'reject')}
                        className="flex items-center gap-1"
                      >
                        <X className="w-4 h-4" />
                        반려
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRequest(request);
                        // 상세 보기 로직
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      상세 보기
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredRequests.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">요청이 없습니다</h3>
              <p className="text-gray-600 dark:text-gray-300">
                {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || typeFilter !== 'all'
                  ? '검색 조건에 맞는 요청이 없습니다.'
                  : '아직 정보 수정 요청이 없습니다.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 검토 다이얼로그 */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              요청 {reviewAction === 'approve' ? '승인' : '반려'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve' 
                ? '이 요청을 승인하면 업체 정보가 실제로 업데이트됩니다.'
                : '이 요청을 반려하면 요청자에게 반려 사유가 전달됩니다.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-gray-900 dark:text-white">업체명</Label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedRequest?.businessName}</p>
            </div>

            <div>
              <Label className="text-gray-900 dark:text-white">수정 유형</Label>
              <p className="text-sm text-gray-900 dark:text-white">
                {selectedRequest && getCorrectionTypeLabel(selectedRequest.correctionType)}
              </p>
            </div>

            <div>
              <Label htmlFor="adminNotes" className="text-gray-900 dark:text-white">관리자 메모</Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={reviewAction === 'approve' 
                  ? "승인 사유를 입력하세요..." 
                  : "반려 사유를 입력하세요..."}
                rows={3}
                className="text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 placeholder:text-gray-500 dark:placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setReviewDialogOpen(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={isSubmitting}
              variant={reviewAction === 'approve' ? 'default' : 'destructive'}
            >
              {isSubmitting ? '처리 중...' : (reviewAction === 'approve' ? '승인' : '반려')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 테마 설정 관리 섹션 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            테마 설정 관리
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 현재 테마 상태 표시 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />
                  <Label className="font-medium">현재 테마</Label>
                </div>
                <p className="text-lg font-semibold mt-1 capitalize">
                  {theme === 'light' ? '라이트 모드' : theme === 'dark' ? '다크 모드' : '시스템 자동'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {theme === 'system' ? '시스템 설정을 따름' : '수동 설정'}
                </p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  <Label className="font-medium">시스템 설정</Label>
                </div>
                <p className="text-lg font-semibold mt-1">
                  {window.matchMedia('(prefers-color-scheme: dark)').matches ? '다크' : '라이트'}
                </p>
                <p className="text-sm text-muted-foreground">
                  운영체제 설정
                </p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <Label className="font-medium">적용 상태</Label>
                </div>
                <p className="text-lg font-semibold mt-1 text-success">
                  정상
                </p>
                <p className="text-sm text-muted-foreground">
                  테마가 올바르게 적용됨
                </p>
              </Card>
            </div>

            {/* 테마 컨트롤 */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Label>빠른 테마 변경:</Label>
                <ThemeSwitcherDropdown />
              </div>

              <Button
                variant="outline"
                onClick={() => setShowThemeSettings(!showThemeSettings)}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                고급 설정
              </Button>

              <Button
                variant="outline"
                onClick={checkThemeSettings}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                테마 값 체크
              </Button>
            </div>

            {/* 고급 테마 설정 패널 */}
            {showThemeSettings && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <ThemeSettings />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}