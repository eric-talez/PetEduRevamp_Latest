import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, MapPin, Users, DollarSign, Eye, CheckCircle, XCircle, AlertCircle, UserCheck } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface SubstituteAssignment {
  id: string;
  originalTrainer: string;
  substituteTrainer: string;
  classTitle: string;
  classDate: string;
  classTime: string;
  location: string;
  studentCount: number;
  compensation: number;
  status: 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  assignedAt: string;
  classStartedAt?: string;
  classCompletedAt?: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  instituteNotes?: string;
}

interface TrainerRequest {
  id: string;
  trainerId: string;
  trainerName: string;
  requestType: 'rest' | 'substitute_need';
  classTitle: string;
  originalDate: string;
  requestedDates: string[];
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  affectedStudents: number;
}

const MOCK_ASSIGNMENTS: SubstituteAssignment[] = [
  {
    id: '1',
    originalTrainer: '김훈련사',
    substituteTrainer: '박대체훈련사',
    classTitle: '기초 복종 훈련 - 성인반',
    classDate: '2025-01-25',
    classTime: '14:00-15:30',
    location: '강남구 테헤란로 123',
    studentCount: 5,
    compensation: 80000,
    status: 'assigned',
    assignedAt: '2025-01-20',
    paymentStatus: 'pending'
  },
  {
    id: '2',
    originalTrainer: '이훈련사',
    substituteTrainer: '최대체훈련사',
    classTitle: '퍼피 사회화 교육',
    classDate: '2025-01-24',
    classTime: '10:00-11:30',
    location: '온라인 (Zoom)',
    studentCount: 3,
    compensation: 60000,
    status: 'completed',
    assignedAt: '2025-01-19',
    classStartedAt: '2025-01-24 10:00',
    classCompletedAt: '2025-01-24 11:30',
    paymentStatus: 'paid'
  }
];

const MOCK_REQUESTS: TrainerRequest[] = [
  {
    id: '1',
    trainerId: '1',
    trainerName: '김훈련사',
    requestType: 'rest',
    classTitle: '기초 복종 훈련 - 성인반',
    originalDate: '2025-01-25',
    requestedDates: ['2025-01-25', '2025-01-26'],
    reason: '개인 사정으로 인한 휴식 요청',
    status: 'pending',
    requestDate: '2025-01-20',
    urgency: 'high',
    affectedStudents: 5
  },
  {
    id: '2',
    trainerId: '2',
    trainerName: '이훈련사',
    requestType: 'substitute_need',
    classTitle: '문제행동 교정 클래스',
    originalDate: '2025-01-27',
    requestedDates: ['2025-01-27'],
    reason: '질병으로 인한 대체 훈련사 필요',
    status: 'approved',
    requestDate: '2025-01-21',
    urgency: 'urgent',
    affectedStudents: 3
  }
];

export default function SubstituteTrainerManagement() {
  const [selectedTab, setSelectedTab] = useState('assignments');
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 대체 배정 현황 조회
  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['/api/substitute-assignments'],
    queryFn: () => apiRequest('GET', '/api/substitute-assignments')
  });

  // 휴식 요청 조회
  const { data: requests = [], isLoading: isLoadingRequests } = useQuery({
    queryKey: ['/api/substitute-requests'],
    queryFn: () => apiRequest('GET', '/api/substitute-requests')
  });

  // 휴식 요청 승인
  const approveRequestMutation = useMutation({
    mutationFn: (requestId: string) => apiRequest('PUT', `/api/substitute-requests/${requestId}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/substitute-requests'] });
      toast({
        title: "휴식 요청 승인",
        description: "훈련사 휴식 요청이 승인되었습니다.",
      });
    }
  });

  // 휴식 요청 거절
  const rejectRequestMutation = useMutation({
    mutationFn: (requestId: string) => apiRequest('PUT', `/api/substitute-requests/${requestId}/reject`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/substitute-requests'] });
      toast({
        title: "휴식 요청 거절",
        description: "훈련사 휴식 요청이 거절되었습니다.",
      });
    }
  });

  // 수업료 지급 처리
  const processPaymentMutation = useMutation({
    mutationFn: (assignmentId: string) => apiRequest('PUT', `/api/substitute-assignments/${assignmentId}/payment`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/substitute-assignments'] });
      toast({
        title: "대체 수업료 지급",
        description: "대체 훈련사에게 수업료가 지급되었습니다.",
      });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-primary';
      case 'in_progress': return 'bg-primary';
      case 'completed': return 'bg-success';
      case 'cancelled': return 'bg-destructive';
      case 'pending': return 'bg-warning';
      case 'approved': return 'bg-success';
      case 'rejected': return 'bg-destructive';
      default: return 'bg-gray-500';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-success';
      case 'pending': return 'bg-warning';
      case 'failed': return 'bg-destructive';
      default: return 'bg-gray-500';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-destructive';
      case 'high': return 'bg-primary';
      case 'normal': return 'bg-primary';
      case 'low': return 'bg-success';
      default: return 'bg-gray-500';
    }
  };

  const handleViewDetail = (assignment: any) => {
    setSelectedAssignment(assignment);
    setDetailDialog(true);
  };

  const handleApproveRequest = (request: any) => {
    setSelectedRequest(request);
    setApprovalDialog(true);
  };

  const handleConfirmApproval = () => {
    if (selectedRequest) {
      approveRequestMutation.mutate(selectedRequest.id);
    }
    setApprovalDialog(false);
  };

  const handleRejectRequest = (requestId: string) => {
    rejectRequestMutation.mutate(requestId);
  };

  const handleProcessPayment = (assignmentId: string) => {
    processPaymentMutation.mutate(assignmentId);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">대체 훈련사 관리</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          기관 소속 훈련사들의 대체 수업 현황을 관리하고 승인하세요
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="assignments">대체 배정 현황</TabsTrigger>
          <TabsTrigger value="requests">휴식 요청</TabsTrigger>
          <TabsTrigger value="payments">수수료 관리</TabsTrigger>
          <TabsTrigger value="statistics">통계</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="mt-6">
          <div className="grid gap-4">
            {assignments.map(assignment => (
              <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{assignment.classTitle}</CardTitle>
                      <CardDescription className="text-sm text-gray-600 mt-1">
                        {assignment.originalTrainer} → {assignment.substituteTrainer}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={`${getStatusColor(assignment.status)} text-white`}>
                        {assignment.status === 'assigned' ? '배정됨' : 
                         assignment.status === 'in_progress' ? '진행중' : 
                         assignment.status === 'completed' ? '완료' : '취소'}
                      </Badge>
                      <Badge className={`${getPaymentStatusColor(assignment.paymentStatus)} text-white`}>
                        {assignment.paymentStatus === 'paid' ? '지급완료' : 
                         assignment.paymentStatus === 'pending' ? '지급대기' : '지급실패'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{assignment.classDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{assignment.classTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{assignment.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{assignment.studentCount}명</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium text-success">
                      {assignment.compensation.toLocaleString()}원
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      배정일: {assignment.assignedAt}
                    </span>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleViewDetail(assignment)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        상세보기
                      </Button>
                      {assignment.paymentStatus === 'pending' && assignment.status === 'completed' && (
                        <Button 
                          size="sm"
                          onClick={() => handleProcessPayment(assignment.id)}
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          수업료 지급
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="requests" className="mt-6">
          <div className="grid gap-4">
            {requests.map(request => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{request.classTitle}</CardTitle>
                      <CardDescription className="text-sm text-gray-600 mt-1">
                        {request.trainerName} 훈련사
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={`${getUrgencyColor(request.urgency)} text-white`}>
                        {request.urgency === 'urgent' ? '긴급' : 
                         request.urgency === 'high' ? '높음' : 
                         request.urgency === 'normal' ? '보통' : '낮음'}
                      </Badge>
                      <Badge className={`${getStatusColor(request.status)} text-white`}>
                        {request.status === 'pending' ? '대기중' : 
                         request.status === 'approved' ? '승인됨' : '거절됨'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 mb-4">{request.reason}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">원래 날짜: {request.originalDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">영향받는 학생: {request.affectedStudents}명</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      요청일: {request.requestDate}
                    </span>
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleApproveRequest(request)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          승인
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleRejectRequest(request.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          거절
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <div className="grid gap-4">
            {assignments.filter(a => a.paymentStatus === 'pending').map(assignment => (
              <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{assignment.classTitle}</h3>
                      <p className="text-sm text-gray-600">
                        {assignment.substituteTrainer} → {assignment.compensation.toLocaleString()}원
                      </p>
                      <p className="text-sm text-gray-500">
                        수업일: {assignment.classDate}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={`${getPaymentStatusColor(assignment.paymentStatus)} text-white`}>
                        지급대기
                      </Badge>
                      <Button 
                        size="sm"
                        onClick={() => handleProcessPayment(assignment.id)}
                      >
                        <DollarSign className="h-4 w-4 mr-1" />
                        지급하기
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {assignments.filter(a => a.paymentStatus === 'pending').length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-gray-500">지급 대기 중인 수업료가 없습니다.</p>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="statistics" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">이번 달 대체 수업</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {assignments.length}
                </div>
                <p className="text-sm text-gray-600">건</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">대기 중인 요청</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {requests.filter(r => r.status === 'pending').length}
                </div>
                <p className="text-sm text-gray-600">건</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">지급 대기 수수료</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">
                  {assignments
                    .filter(a => a.paymentStatus === 'pending')
                    .reduce((sum, a) => sum + a.compensation, 0)
                    .toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">원</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 상세보기 다이얼로그 */}
      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>대체 수업 상세 정보</DialogTitle>
            <DialogDescription>
              대체 수업 배정 및 진행 상황을 확인하세요.
            </DialogDescription>
          </DialogHeader>
          {selectedAssignment && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">수업명</Label>
                  <p className="text-sm">{selectedAssignment.classTitle}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">수업료</Label>
                  <p className="text-sm">{selectedAssignment.compensation.toLocaleString()}원</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">원래 훈련사</Label>
                  <p className="text-sm">{selectedAssignment.originalTrainer}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">대체 훈련사</Label>
                  <p className="text-sm">{selectedAssignment.substituteTrainer}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">수업 일시</Label>
                  <p className="text-sm">{selectedAssignment.classDate} {selectedAssignment.classTime}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">수업 장소</Label>
                  <p className="text-sm">{selectedAssignment.location}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">학생 수</Label>
                  <p className="text-sm">{selectedAssignment.studentCount}명</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">배정일</Label>
                  <p className="text-sm">{selectedAssignment.assignedAt}</p>
                </div>
              </div>
              
              {selectedAssignment.classStartedAt && (
                <div>
                  <Label className="text-sm font-medium">수업 시작 시간</Label>
                  <p className="text-sm">{selectedAssignment.classStartedAt}</p>
                </div>
              )}
              
              {selectedAssignment.classCompletedAt && (
                <div>
                  <Label className="text-sm font-medium">수업 완료 시간</Label>
                  <p className="text-sm">{selectedAssignment.classCompletedAt}</p>
                </div>
              )}
              
              <div className="flex justify-between items-center pt-4">
                <Badge className={`${getStatusColor(selectedAssignment.status)} text-white`}>
                  {selectedAssignment.status === 'assigned' ? '배정됨' : 
                   selectedAssignment.status === 'in_progress' ? '진행중' : 
                   selectedAssignment.status === 'completed' ? '완료' : '취소'}
                </Badge>
                <Badge className={`${getPaymentStatusColor(selectedAssignment.paymentStatus)} text-white`}>
                  {selectedAssignment.paymentStatus === 'paid' ? '지급완료' : 
                   selectedAssignment.paymentStatus === 'pending' ? '지급대기' : '지급실패'}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 승인 확인 다이얼로그 */}
      <Dialog open={approvalDialog} onOpenChange={setApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>휴식 요청 승인</DialogTitle>
            <DialogDescription>
              훈련사의 휴식 요청을 승인하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="py-4">
              <div className="space-y-2">
                <p><strong>훈련사:</strong> {selectedRequest.trainerName}</p>
                <p><strong>수업:</strong> {selectedRequest.classTitle}</p>
                <p><strong>원래 날짜:</strong> {selectedRequest.originalDate}</p>
                <p><strong>사유:</strong> {selectedRequest.reason}</p>
                <p><strong>영향받는 학생:</strong> {selectedRequest.affectedStudents}명</p>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setApprovalDialog(false)}>
                  취소
                </Button>
                <Button onClick={handleConfirmApproval}>
                  승인하기
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}