import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  Filter, 
  Check, 
  X, 
  Eye, 
  Clock, 
  User, 
  Building, 
  BookOpen,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { PageSkeleton } from '@/components/ui/SkeletonLoader';

interface PendingApproval {
  id: number;
  type: 'user' | 'institute' | 'course' | 'trainer';
  applicantName: string;
  applicantEmail: string;
  appliedAt: string;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected';
  details: {
    title?: string;
    description?: string;
    experience?: string;
    certification?: string;
    instituteName?: string;
    businessNumber?: string;
    address?: string;
  };
  documents?: string[];
}

export default function AdminApprovals() {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [filteredApprovals, setFilteredApprovals] = useState<PendingApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const { toast } = useToast();

  // 샘플 데이터
  const sampleApprovals: PendingApproval[] = [
    {
      id: 1,
      type: 'trainer',
      applicantName: '김훈련',
      applicantEmail: 'kim.trainer@example.com',
      appliedAt: '2025-01-25T10:30:00Z',
      status: 'pending',
      details: {
        title: '전문 반려견 훈련사 등록 신청',
        description: '10년 경력의 반려견 행동 교정 전문가입니다.',
        experience: '10년',
        certification: 'KKF 공인 훈련사, 동물행동학 석사'
      }
    },
    {
      id: 2,
      type: 'institute',
      applicantName: '박원장',
      applicantEmail: 'park.director@petschool.com',
      appliedAt: '2025-01-24T14:15:00Z',
      status: 'pending',
      details: {
        title: '해피펫 훈련소 등록 신청',
        instituteName: '해피펫 훈련소',
        businessNumber: '123-45-67890',
        address: '서울시 강남구 테헤란로 123',
        description: '종합 반려동물 교육 전문 기관입니다.'
      }
    },
    {
      id: 3,
      type: 'user',
      applicantName: '이반려',
      applicantEmail: 'lee.petowner@example.com',
      appliedAt: '2025-01-24T09:20:00Z',
      status: 'reviewing',
      details: {
        title: '반려인 계정 승인 요청',
        description: '반려견 2마리를 키우는 반려인입니다.'
      }
    },
    {
      id: 4,
      type: 'course',
      applicantName: '최강사',
      applicantEmail: 'choi.instructor@example.com',
      appliedAt: '2025-01-23T16:45:00Z',
      status: 'pending',
      details: {
        title: '기본 순종 훈련 과정',
        description: '초보 반려인을 위한 기본 순종 훈련 강의입니다.',
        experience: '5년'
      }
    }
  ];

  useEffect(() => {
    loadApprovals();
  }, []);

  useEffect(() => {
    filterApprovals();
  }, [approvals, searchTerm, statusFilter, typeFilter]);

  const loadApprovals = async () => {
    try {
      setIsLoading(true);
      
      // 실제 API에서 pending 사용자 목록 가져오기
      const response = await apiRequest('GET', '/api/admin/users/pending');
      const data = await response.json();
      
      if (data.success && data.users && data.users.length > 0) {
        // 실제 데이터를 PendingApproval 형식으로 변환
        const realApprovals: PendingApproval[] = data.users.map((user: any) => ({
          id: user.id,
          type: user.role === 'trainer' ? 'trainer' : user.role === 'institute_admin' ? 'institute' : 'user',
          applicantName: user.name || user.username,
          applicantEmail: user.email,
          appliedAt: user.createdAt,
          status: 'pending' as const,
          details: {
            title: user.role === 'trainer' ? '훈련사 등록 신청' : 
                   user.role === 'institute_admin' ? '기관 관리자 등록 신청' : 
                   '사용자 계정 승인 요청',
            description: `${user.role} 역할로 등록 요청`
          }
        }));
        
        setApprovals(realApprovals);
      } else {
        // API 실패 시 빈 배열
        setApprovals([]);
      }
    } catch (error) {
      console.error('승인 목록 로딩 실패:', error);
      toast({
        title: "데이터 로딩 실패",
        description: "승인 목록을 불러올 수 없습니다.",
        variant: "destructive"
      });
      setApprovals([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterApprovals = () => {
    let filtered = approvals;

    if (searchTerm) {
      filtered = filtered.filter(approval => 
        approval.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        approval.applicantEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        approval.details.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(approval => approval.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(approval => approval.type === typeFilter);
    }

    setFilteredApprovals(filtered);
  };

  const handleApprovalAction = async (approvalId: number, action: 'approve' | 'reject', comment?: string) => {
    setIsProcessing(true);
    try {
      // 실제 API 호출
      const endpoint = action === 'approve' 
        ? `/api/admin/users/${approvalId}/approve`
        : `/api/admin/users/${approvalId}/reject`;
      
      const body = action === 'reject' && comment 
        ? { reason: comment }
        : undefined;
      
      const response = await apiRequest('POST', endpoint, body);
      const data = await response.json();

      if (data.success) {
        // 목록에서 승인된/거부된 사용자 제거
        setApprovals(prev => prev.filter(approval => approval.id !== approvalId));

        toast({
          title: action === 'approve' ? "승인 완료" : "거부 완료",
          description: `${action === 'approve' ? '승인' : '거부'}이 정상적으로 처리되었습니다.`,
          variant: action === 'approve' ? "default" : "destructive"
        });

        setIsDetailModalOpen(false);
        setSelectedApproval(null);
        setReviewComment('');
      } else {
        throw new Error(data.message || '처리 실패');
      }
    } catch (error) {
      console.error('승인 처리 실패:', error);
      toast({
        title: "처리 실패",
        description: "승인 처리 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewDetail = (approval: PendingApproval) => {
    setSelectedApproval(approval);
    setIsDetailModalOpen(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'user': return <User className="h-4 w-4" />;
      case 'institute': return <Building className="h-4 w-4" />;
      case 'trainer': return <User className="h-4 w-4" />;
      case 'course': return <BookOpen className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'user': return '반려인';
      case 'institute': return '기관';
      case 'trainer': return '훈련사';
      case 'course': return '강좌';
      default: return '기타';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">대기중</Badge>;
      case 'reviewing':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">검토중</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">승인됨</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">거부됨</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">승인 관리</h1>
        <p className="text-gray-600">사용자, 기관, 훈련사 및 강좌 등록 신청을 검토하고 승인 처리합니다.</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">전체 대기</p>
                <p className="text-2xl font-bold">{approvals.filter(a => a.status === 'pending').length}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">검토중</p>
                <p className="text-2xl font-bold">{approvals.filter(a => a.status === 'reviewing').length}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">승인됨</p>
                <p className="text-2xl font-bold">{approvals.filter(a => a.status === 'approved').length}</p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">거부됨</p>
                <p className="text-2xl font-bold">{approvals.filter(a => a.status === 'rejected').length}</p>
              </div>
              <X className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 및 검색 */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="이름, 이메일 또는 제목으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 상태</SelectItem>
                <SelectItem value="pending">대기중</SelectItem>
                <SelectItem value="reviewing">검토중</SelectItem>
                <SelectItem value="approved">승인됨</SelectItem>
                <SelectItem value="rejected">거부됨</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="유형 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 유형</SelectItem>
                <SelectItem value="user">반려인</SelectItem>
                <SelectItem value="trainer">훈련사</SelectItem>
                <SelectItem value="institute">기관</SelectItem>
                <SelectItem value="course">강좌</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 승인 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>승인 대기 목록</CardTitle>
          <CardDescription>총 {filteredApprovals.length}건의 신청이 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <PageSkeleton header={false} variant="list" count={5} className="p-0" />
          ) : filteredApprovals.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">조건에 맞는 승인 신청이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApprovals.map((approval) => (
                <div key={approval.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={`https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100&q=80`} />
                      <AvatarFallback>{approval.applicantName[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {getTypeIcon(approval.type)}
                        <span className="font-semibold">{approval.applicantName}</span>
                        <Badge variant="outline">{getTypeName(approval.type)}</Badge>
                        {getStatusBadge(approval.status)}
                      </div>
                      <p className="text-sm text-gray-600">{approval.details.title}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(approval.appliedAt).toLocaleDateString()} 신청
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDetail(approval)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      상세보기
                    </Button>
                    {approval.status === 'pending' && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => handleApprovalAction(approval.id, 'approve')}
                          disabled={isProcessing}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          승인
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => handleApprovalAction(approval.id, 'reject')}
                          disabled={isProcessing}
                        >
                          <X className="h-4 w-4 mr-1" />
                          거부
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 상세보기 모달 */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedApproval && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getTypeIcon(selectedApproval.type)}
                  {selectedApproval.details.title}
                </DialogTitle>
                <DialogDescription>
                  {getTypeName(selectedApproval.type)} 등록 신청 상세 정보
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">신청자</Label>
                    <p className="mt-1 font-semibold">{selectedApproval.applicantName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">이메일</Label>
                    <p className="mt-1">{selectedApproval.applicantEmail}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">신청일</Label>
                    <p className="mt-1">{new Date(selectedApproval.appliedAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">현재 상태</Label>
                    <div className="mt-1">{getStatusBadge(selectedApproval.status)}</div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">상세 설명</Label>
                  <p className="mt-1 text-gray-700">{selectedApproval.details.description}</p>
                </div>

                {selectedApproval.details.experience && (
                  <div>
                    <Label className="text-sm font-medium">경력</Label>
                    <p className="mt-1">{selectedApproval.details.experience}</p>
                  </div>
                )}

                {selectedApproval.details.certification && (
                  <div>
                    <Label className="text-sm font-medium">자격증/인증</Label>
                    <p className="mt-1">{selectedApproval.details.certification}</p>
                  </div>
                )}

                {selectedApproval.details.instituteName && (
                  <div>
                    <Label className="text-sm font-medium">기관명</Label>
                    <p className="mt-1">{selectedApproval.details.instituteName}</p>
                  </div>
                )}

                {selectedApproval.details.businessNumber && (
                  <div>
                    <Label className="text-sm font-medium">사업자등록번호</Label>
                    <p className="mt-1">{selectedApproval.details.businessNumber}</p>
                  </div>
                )}

                {selectedApproval.details.address && (
                  <div>
                    <Label className="text-sm font-medium">주소</Label>
                    <p className="mt-1">{selectedApproval.details.address}</p>
                  </div>
                )}

                {selectedApproval.status === 'pending' && (
                  <div>
                    <Label className="text-sm font-medium">검토 의견</Label>
                    <Textarea
                      placeholder="승인/거부 시 전달할 메시지를 입력하세요..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                )}

                {selectedApproval.status === 'pending' && (
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button 
                      variant="outline"
                      onClick={() => setIsDetailModalOpen(false)}
                      disabled={isProcessing}
                    >
                      닫기
                    </Button>
                    <Button 
                      variant="outline"
                      className="text-red-600 border-red-600 hover:bg-red-50"
                      onClick={() => handleApprovalAction(selectedApproval.id, 'reject', reviewComment)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? '처리중...' : '거부'}
                    </Button>
                    <Button 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprovalAction(selectedApproval.id, 'approve', reviewComment)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? '처리중...' : '승인'}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}