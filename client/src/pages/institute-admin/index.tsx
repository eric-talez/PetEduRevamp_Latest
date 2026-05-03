import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Users, 
  FileText, 
  Package, 
  BookOpen, 
  Check, 
  X, 
  Clock, 
  Eye, 
  UserPlus,
  Settings,
  Shield,
  MessageSquare,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Filter,
  Search,
  Download,
  Send,
  Star,
  Award,
  User,
  DollarSign,
  Heart,
  GraduationCap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { queryClient } from '@/lib/queryClient';

interface ContentApproval {
  id: number;
  contentType: 'course' | 'curriculum' | 'product';
  title: string;
  description: string;
  content: any;
  attachments: string[];
  trainerStatus: string;
  instituteStatus: 'pending' | 'approved' | 'rejected';
  adminStatus: 'pending' | 'approved' | 'rejected';
  instituteComment: string | null;
  createdAt: string;
  updatedAt: string;
  submitter: {
    id: number;
    name: string;
    avatar?: string;
  };
}

interface TrainerInfo {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  phone: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  joinDate: string;
  permissions: string[];
  specializations: string[];
  totalStudents: number;
  totalHours: number;
  rating: number;
  contentSubmissions: number;
  pendingApprovals: number;
}

interface InstituteStats {
  totalTrainers: number;
  activeTrainers: number;
  pendingApprovals: number;
  approvedContent: number;
  rejectedContent: number;
  totalStudents: number;
  monthlyRevenue: number;
  avgRating: number;
}

export default function InstituteAdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedApproval, setSelectedApproval] = useState<ContentApproval | null>(null);
  const [isApprovalDetailOpen, setIsApprovalDetailOpen] = useState(false);
  const [isAddTrainerOpen, setIsAddTrainerOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<any>(null);
  const [isJournalDialogOpen, setIsJournalDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);

  // 기관 통계 조회
  const { data: stats } = useQuery({
    queryKey: ['/api/institute/stats'],
    queryFn: async () => {
      const response = await fetch('/api/institute/stats');
      if (!response.ok) throw new Error('통계를 불러올 수 없습니다.');
      return await response.json();
    }
  });

  // 소속 훈련사 목록 조회
  const { data: trainers, isLoading: trainersLoading } = useQuery({
    queryKey: ['/api/institute/trainers'],
    queryFn: async () => {
      const response = await fetch('/api/institute/trainers');
      if (!response.ok) throw new Error('훈련사 목록을 불러올 수 없습니다.');
      return await response.json();
    }
  });

  // 승인 대기 중인 컨텐츠 조회
  const { data: pendingApprovals, isLoading: approvalsLoading } = useQuery({
    queryKey: ['/api/institute/content-approvals', filterStatus, filterType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterType !== 'all') params.append('type', filterType);
      
      const response = await fetch(`/api/institute/content-approvals?${params}`);
      if (!response.ok) throw new Error('승인 목록을 불러올 수 없습니다.');
      return await response.json();
    }
  });

  // 컨텐츠 승인/거부
  const approveContentMutation = useMutation({
    mutationFn: async ({ id, action, comment }: { id: number; action: 'approve' | 'reject'; comment: string }) => {
      const response = await fetch(`/api/institute/content-approvals/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment })
      });
      if (!response.ok) throw new Error('승인 처리에 실패했습니다.');
      return await response.json();
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/institute/content-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/institute/stats'] });
      setIsApprovalDetailOpen(false);
      setReviewComment('');
      toast({
        title: action === 'approve' ? "승인 완료" : "거부 완료",
        description: `컨텐츠가 성공적으로 ${action === 'approve' ? '승인' : '거부'}되었습니다.`
      });
    }
  });

  // 훈련사 상태 변경
  const updateTrainerStatusMutation = useMutation({
    mutationFn: async ({ trainerId, status }: { trainerId: number; status: string }) => {
      const response = await fetch(`/api/institute/trainers/${trainerId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error('상태 변경에 실패했습니다.');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/institute/trainers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/institute/stats'] });
      toast({
        title: "상태 변경 완료",
        description: "훈련사 상태가 성공적으로 변경되었습니다."
      });
    }
  });

  // 강좌 목록 조회 (승인 대기 중)
  const { data: pendingCourses, isLoading: coursesLoading } = useQuery({
    queryKey: ['/api/institute/pending-courses'],
    queryFn: async () => {
      return [
        {
          id: 1,
          title: "기초 복종 훈련",
          description: "반려견의 기본적인 복종 훈련을 위한 8주 과정",
          trainer: { id: 1, name: "김민수", email: "kim@example.com" },
          category: "기초훈련",
          duration: "8주",
          maxStudents: 10,
          price: 350000,
          level: "초급",
          status: "pending",
          submittedAt: "2025-01-21T10:00:00Z",
          curriculum: [
            { week: 1, topic: "기본 자세 훈련", content: "앉기, 기다리기 기본 자세" },
            { week: 2, topic: "호명 반응", content: "이름 부르기 반응 훈련" }
          ],
          objectives: ["기본 명령어 이해", "집중력 향상", "사회성 기초"],
          requirements: "건강한 반려견, 최신 예방접종 완료"
        },
        {
          id: 2,
          title: "어질리티 기초",
          description: "운동능력 향상을 위한 어질리티 훈련",
          trainer: { id: 2, name: "이준호", email: "lee@example.com" },
          category: "운동훈련",
          duration: "6주",
          maxStudents: 8,
          price: 280000,
          level: "중급",
          status: "pending",
          submittedAt: "2025-01-20T14:30:00Z",
          curriculum: [
            { week: 1, topic: "장애물 익숙해지기", content: "기본 장애물 소개" },
            { week: 2, topic: "점프 훈련", content: "높이별 점프 연습" }
          ],
          objectives: ["운동능력 향상", "협응력 개발", "자신감 증진"],
          requirements: "기초 복종 훈련 수료, 관절 건강 양호"
        }
      ];
    }
  });

  // 알림장 목록 조회 (소속 훈련사들 작성)
  const { data: allJournals, isLoading: journalsLoading } = useQuery({
    queryKey: ['/api/institute/journals'],
    queryFn: async () => {
      return [
        {
          id: 1,
          title: "멍멍이 훈련 일지 - 1주차",
          content: "오늘은 기본 자세 훈련을 진행했습니다. 앉기와 기다리기 명령에 대한 반응이 좋았습니다.",
          trainer: { id: 1, name: "김민수", avatar: "/avatars/trainer1.jpg" },
          student: { id: 1, name: "홍길동", pet: { name: "멍멍이", breed: "골든 리트리버" } },
          course: { id: 1, title: "기초 복종 훈련" },
          trainingDate: "2025-01-21",
          trainingDuration: 60,
          progressRating: 4,
          behaviorNotes: "적극적이고 집중력이 좋음",
          homeworkInstructions: "매일 5분씩 앉기 연습",
          nextGoals: "기다리기 시간 연장",
          createdAt: "2025-01-21T16:00:00Z",
          status: "sent"
        },
        {
          id: 2,
          title: "바둑이 훈련 일지 - 3주차",
          content: "산책 시 리더 훈련을 중점적으로 진행했습니다. 많은 개선이 있었습니다.",
          trainer: { id: 2, name: "이준호", avatar: "/avatars/trainer2.jpg" },
          student: { id: 2, name: "김영희", pet: { name: "바둑이", breed: "보더 콜리" } },
          course: { id: 2, title: "어질리티 기초" },
          trainingDate: "2025-01-20",
          trainingDuration: 90,
          progressRating: 5,
          behaviorNotes: "에너지가 넘치고 학습 능력이 뛰어남",
          homeworkInstructions: "장애물 설치 후 가정에서 연습",
          nextGoals: "복잡한 코스 도전",
          createdAt: "2025-01-20T18:30:00Z",
          status: "read"
        }
      ];
    }
  });

  // 학생 목록 조회 (출결 포함)
  const { data: allStudents, isLoading: studentsLoading } = useQuery({
    queryKey: ['/api/institute/students'],
    queryFn: async () => {
      return [
        {
          id: 1,
          name: "홍길동",
          email: "hong@example.com",
          phone: "010-1234-5678",
          address: "서울시 강남구",
          joinDate: "2025-01-15",
          status: "active",
          pet: {
            id: 1,
            name: "멍멍이",
            breed: "골든 리트리버",
            age: 2,
            weight: 28.5,
            gender: "수컷",
            neutered: true,
            healthStatus: "양호",
            specialNotes: "활발한 성격, 사람을 좋아함"
          },
          trainer: { id: 1, name: "김민수" },
          course: { id: 1, title: "기초 복종 훈련", startDate: "2025-01-15", endDate: "2025-03-15" },
          attendance: {
            totalSessions: 8,
            attendedSessions: 6,
            absences: 1,
            lateArrivals: 1,
            attendanceRate: 87.5,
            recentAttendance: [
              { date: "2025-01-21", status: "attended", notes: "정시 참석" },
              { date: "2025-01-18", status: "late", notes: "10분 지각" },
              { date: "2025-01-15", status: "attended", notes: "첫 수업" },
              { date: "2025-01-12", status: "absent", notes: "펫 컨디션 난조" }
            ]
          },
          progress: {
            overallRating: 4.2,
            skillAssessments: [
              { skill: "기본 복종", score: 85, notes: "앉기, 기다리기 우수" },
              { skill: "집중력", score: 78, notes: "산만할 때가 있음" },
              { skill: "사회성", score: 92, notes: "다른 반려견과 잘 어울림" }
            ]
          }
        },
        {
          id: 2,
          name: "김영희",
          email: "kim@example.com",
          phone: "010-9876-5432",
          address: "서울시 서초구",
          joinDate: "2025-01-10",
          status: "active",
          pet: {
            id: 2,
            name: "바둑이",
            breed: "보더 콜리",
            age: 3,
            weight: 22.0,
            gender: "암컷",
            neutered: true,
            healthStatus: "양호",
            specialNotes: "매우 영리하고 에너지가 많음"
          },
          trainer: { id: 2, name: "이준호" },
          course: { id: 2, title: "어질리티 기초", startDate: "2025-01-10", endDate: "2025-02-28" },
          attendance: {
            totalSessions: 6,
            attendedSessions: 6,
            absences: 0,
            lateArrivals: 0,
            attendanceRate: 100,
            recentAttendance: [
              { date: "2025-01-20", status: "attended", notes: "우수한 참여" },
              { date: "2025-01-17", status: "attended", notes: "정시 참석" },
              { date: "2025-01-14", status: "attended", notes: "적극적 참여" },
              { date: "2025-01-11", status: "attended", notes: "첫 수업" }
            ]
          },
          progress: {
            overallRating: 4.8,
            skillAssessments: [
              { skill: "운동 능력", score: 95, notes: "뛰어난 신체 능력" },
              { skill: "학습 속도", score: 90, notes: "빠른 이해력" },
              { skill: "집중력", score: 88, notes: "장시간 집중 가능" }
            ]
          }
        }
      ];
    }
  });

  // 강좌 승인 처리
  const courseApproveMutation = useMutation({
    mutationFn: async ({ id, action, comment }: { id: number; action: 'approve' | 'reject'; comment?: string }) => {
      console.log('강좌 승인 처리:', { id, action, comment });
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/institute/pending-courses'] });
      setIsCourseDialogOpen(false);
      setSelectedCourse(null);
      toast({
        title: "강좌 승인 완료",
        description: "강좌가 성공적으로 처리되었습니다."
      });
    }
  });

  const handleApprovalClick = (approval: ContentApproval) => {
    setSelectedApproval(approval);
    setIsApprovalDetailOpen(true);
  };

  const handleApprove = () => {
    if (!selectedApproval) return;
    approveContentMutation.mutate({
      id: selectedApproval.id,
      action: 'approve',
      comment: reviewComment
    });
  };

  const handleReject = () => {
    if (!selectedApproval || !reviewComment.trim()) {
      toast({
        title: "입력 오류",
        description: "거부 사유를 입력해주세요.",
        variant: "destructive"
      });
      return;
    }
    approveContentMutation.mutate({
      id: selectedApproval.id,
      action: 'reject',
      comment: reviewComment
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-warning">대기중</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-success">승인됨</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-destructive">거부됨</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'course':
        return <BookOpen className="h-4 w-4" />;
      case 'curriculum':
        return <FileText className="h-4 w-4" />;
      case 'product':
        return <Package className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getContentTypeName = (type: string) => {
    switch (type) {
      case 'course':
        return '강의';
      case 'curriculum':
        return '커리큘럼';
      case 'product':
        return '상품';
      default:
        return type;
    }
  };

  const filteredApprovals = pendingApprovals?.filter((approval: ContentApproval) =>
    approval.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    approval.submitter.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">기관 관리</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            소속 훈련사와 컨텐츠 승인을 관리하세요
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            보고서 다운로드
          </Button>
          <Dialog open={isAddTrainerOpen} onOpenChange={setIsAddTrainerOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                훈련사 추가
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* 통계 대시보드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 훈련사</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTrainers || 0}</div>
            <p className="text-xs text-muted-foreground">
              활성: {stats?.activeTrainers || 0}명
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">승인 대기</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats?.pendingApprovals || 0}</div>
            <p className="text-xs text-muted-foreground">
              검토 필요
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">승인된 컨텐츠</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats?.approvedContent || 0}</div>
            <p className="text-xs text-muted-foreground">
              이번 달
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 평점</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgRating?.toFixed(1) || '0.0'}</div>
            <p className="text-xs text-muted-foreground">
              5점 만점
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="approvals" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="approvals">
            승인 관리 ({stats?.pendingApprovals || 0})
          </TabsTrigger>
          <TabsTrigger value="courses">
            내 강좌 ({pendingCourses?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="journals">
            알림장 관리 ({allJournals?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="students">
            학생 관리 ({allStudents?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="trainers">
            훈련사 관리 ({stats?.totalTrainers || 0})
          </TabsTrigger>
          <TabsTrigger value="analytics">
            분석 리포트
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="approvals" className="space-y-4">
          {/* 필터 및 검색 */}
          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="제목 또는 제출자로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 상태</SelectItem>
                <SelectItem value="pending">대기중</SelectItem>
                <SelectItem value="approved">승인됨</SelectItem>
                <SelectItem value="rejected">거부됨</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="유형 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 유형</SelectItem>
                <SelectItem value="course">강의</SelectItem>
                <SelectItem value="curriculum">커리큘럼</SelectItem>
                <SelectItem value="product">상품</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 승인 목록 */}
          <div className="space-y-3">
            {approvalsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-16 bg-gray-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              filteredApprovals?.map((approval: ContentApproval) => (
                <Card 
                  key={approval.id}
                  className="cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary"
                  onClick={() => handleApprovalClick(approval)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getContentTypeIcon(approval.contentType)}
                          <CardTitle className="text-lg">{approval.title}</CardTitle>
                          <Badge variant="outline">{getContentTypeName(approval.contentType)}</Badge>
                          {getStatusBadge(approval.instituteStatus)}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={approval.submitter.avatar} />
                              <AvatarFallback>{approval.submitter.name[0]}</AvatarFallback>
                            </Avatar>
                            <span>{approval.submitter.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDistanceToNow(new Date(approval.createdAt), { 
                              addSuffix: true, 
                              locale: ko 
                            })}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {approval.instituteStatus === 'pending' && (
                          <Badge variant="danger" className="text-xs">검토 필요</Badge>
                        )}
                        <Eye className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-gray-700 dark:text-gray-300 line-clamp-2">
                      {approval.description}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="trainers" className="space-y-4">
          <div className="grid gap-4">
            {trainersLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              trainers?.map((trainer: TrainerInfo) => (
                <Card key={trainer.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={trainer.avatar} />
                          <AvatarFallback>{trainer.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{trainer.name}</h3>
                            <Badge 
                              variant={trainer.status === 'active' ? 'default' : 'secondary'}
                              className={trainer.status === 'active' ? 'bg-success/10 text-success' : ''}
                            >
                              {trainer.status === 'active' ? '활성' : 
                               trainer.status === 'inactive' ? '비활성' : '정지'}
                            </Badge>
                            {trainer.pendingApprovals > 0 && (
                              <Badge variant="danger" className="text-xs">
                                승인대기 {trainer.pendingApprovals}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {trainer.email} • {trainer.phone}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>학생 {trainer.totalStudents}명</span>
                            <span>총 {trainer.totalHours}시간</span>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-warning text-warning" />
                              <span>{trainer.rating.toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Select 
                          value={trainer.status}
                          onValueChange={(status) => updateTrainerStatusMutation.mutate({ 
                            trainerId: trainer.id, 
                            status 
                          })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">활성</SelectItem>
                            <SelectItem value="inactive">비활성</SelectItem>
                            <SelectItem value="suspended">정지</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* 강좌 승인 관리 */}
        <TabsContent value="courses" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">강좌 승인 관리</h3>
            <Badge variant="outline">대기 중: {pendingCourses?.length || 0}개</Badge>
          </div>
          
          <div className="grid gap-4">
            {coursesLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-20 bg-gray-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : pendingCourses && pendingCourses.length > 0 ? (
              pendingCourses.map((course: any) => (
                <Card key={course.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="h-5 w-5 text-primary" />
                          <CardTitle className="text-xl">{course.title}</CardTitle>
                          <Badge variant="outline">{course.category}</Badge>
                          <Badge variant="secondary">{course.level}</Badge>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">{course.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {course.trainer.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {course.duration}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            최대 {course.maxStudents}명
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {course.price.toLocaleString()}원
                          </span>
                        </div>
                      </div>
                      <Badge variant="warning">승인 대기</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-sm mb-1">강좌 목표</h4>
                        <div className="flex flex-wrap gap-1">
                          {course.objectives.map((obj: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">{obj}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-1">참가 요건</h4>
                        <p className="text-sm text-gray-600">{course.requirements}</p>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedCourse(course);
                            setIsCourseDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          상세보기
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => courseApproveMutation.mutate({ id: course.id, action: 'approve' })}
                          disabled={courseApproveMutation.isPending}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          승인
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => courseApproveMutation.mutate({ id: course.id, action: 'reject' })}
                          disabled={courseApproveMutation.isPending}
                        >
                          <X className="h-4 w-4 mr-2" />
                          거부
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">승인 대기 중인 강좌가 없습니다</h3>
                  <p className="text-gray-500">새로운 강좌 등록 요청이 있으면 여기에 표시됩니다.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* 알림장 관리 */}
        <TabsContent value="journals" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">알림장 관리</h3>
            <Badge variant="outline">총 {allJournals?.length || 0}개</Badge>
          </div>
          
          <div className="grid gap-4">
            {journalsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-16 bg-gray-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : allJournals && allJournals.length > 0 ? (
              allJournals.map((journal: any) => (
                <Card key={journal.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-5 w-5 text-success" />
                          <CardTitle className="text-lg">{journal.title}</CardTitle>
                          <Badge variant={journal.status === 'sent' ? 'default' : 'secondary'}>
                            {journal.status === 'sent' ? '전송됨' : '읽음'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            훈련사: {journal.trainer.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            학생: {journal.student.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-4 w-4" />
                            반려동물: {journal.student.pet.name} ({journal.student.pet.breed})
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {journal.trainingDate}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-gray-700 dark:text-gray-300">{journal.content}</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-semibold">훈련 시간:</span> {journal.trainingDuration}분
                        </div>
                        <div>
                          <span className="font-semibold">진도 평가:</span> 
                          <div className="flex items-center gap-1 mt-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < journal.progressRating ? 'text-warning fill-current' : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-semibold">행동 특이사항:</span>
                          <p className="text-gray-600 mt-1">{journal.behaviorNotes}</p>
                        </div>
                        <div>
                          <span className="font-semibold">다음 목표:</span>
                          <p className="text-gray-600 mt-1">{journal.nextGoals}</p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedJournal(journal);
                            setIsJournalDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          상세보기
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">작성된 알림장이 없습니다</h3>
                  <p className="text-gray-500">훈련사들이 작성한 알림장이 여기에 표시됩니다.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* 학생 관리 (출결 포함) */}
        <TabsContent value="students" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">학생 관리</h3>
            <Badge variant="outline">총 {allStudents?.length || 0}명</Badge>
          </div>
          
          <div className="grid gap-4">
            {studentsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-24 bg-gray-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : allStudents && allStudents.length > 0 ? (
              allStudents.map((student: any) => (
                <Card key={student.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <GraduationCap className="h-5 w-5 text-primary" />
                          <CardTitle className="text-xl">{student.name}</CardTitle>
                          <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                            {student.status === 'active' ? '수강중' : '휴강'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>{student.email}</span>
                          <span>{student.phone}</span>
                          <span>가입일: {student.joinDate}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-success">
                          {student.attendance.attendanceRate}%
                        </div>
                        <div className="text-sm text-gray-500">출석률</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* 반려동물 정보 */}
                      <div className="bg-primary/10 dark:bg-primary/20 p-3 rounded-lg">
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          반려동물 정보
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div><span className="font-medium">이름:</span> {student.pet.name}</div>
                          <div><span className="font-medium">품종:</span> {student.pet.breed}</div>
                          <div><span className="font-medium">나이:</span> {student.pet.age}살</div>
                          <div><span className="font-medium">체중:</span> {student.pet.weight}kg</div>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">{student.pet.specialNotes}</p>
                      </div>

                      {/* 수강 정보 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold text-sm mb-2">수강 과정</h4>
                          <p className="text-sm">{student.course.title}</p>
                          <p className="text-xs text-gray-500">
                            {student.course.startDate} ~ {student.course.endDate}
                          </p>
                          <p className="text-xs text-gray-500">담당: {student.trainer.name}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm mb-2">출석 현황</h4>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-center p-2 bg-success/10 rounded">
                              <div className="font-bold text-success">{student.attendance.attendedSessions}</div>
                              <div className="text-success">출석</div>
                            </div>
                            <div className="text-center p-2 bg-warning/10 rounded">
                              <div className="font-bold text-warning">{student.attendance.lateArrivals}</div>
                              <div className="text-warning">지각</div>
                            </div>
                            <div className="text-center p-2 bg-destructive/10 rounded">
                              <div className="font-bold text-destructive">{student.attendance.absences}</div>
                              <div className="text-destructive">결석</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 학습 성과 */}
                      <div>
                        <h4 className="font-semibold text-sm mb-2">학습 성과 평가</h4>
                        <div className="space-y-2">
                          {student.progress.skillAssessments.map((skill: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span>{skill.skill}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-2 bg-gray-200 rounded-full">
                                  <div 
                                    className="h-2 bg-primary rounded-full" 
                                    style={{ width: `${skill.score}%` }}
                                  ></div>
                                </div>
                                <span className="w-12 text-right font-medium">{skill.score}점</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 text-right">
                          <span className="text-sm font-semibold">
                            종합 평점: {student.progress.overallRating}/5.0
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedStudent(student);
                            setIsStudentDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          상세보기
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">등록된 학생이 없습니다</h3>
                  <p className="text-gray-500">신규 학생 등록 시 여기에 표시됩니다.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>월별 승인 현황</CardTitle>
                <CardDescription>최근 6개월간 컨텐츠 승인 통계</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  차트 영역 (향후 구현)
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>훈련사 성과</CardTitle>
                <CardDescription>훈련사별 활동 및 평가 지표</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  성과 지표 (향후 구현)
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 승인 상세 모달 */}
      <Dialog open={isApprovalDetailOpen} onOpenChange={setIsApprovalDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedApproval && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <DialogTitle className="text-xl flex items-center gap-2">
                      {getContentTypeIcon(selectedApproval.contentType)}
                      {selectedApproval.title}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{getContentTypeName(selectedApproval.contentType)}</Badge>
                      {getStatusBadge(selectedApproval.instituteStatus)}
                      {selectedApproval.adminStatus === 'pending' && (
                        <Badge variant="outline" className="text-primary">최종 승인 대기</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">제출자</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={selectedApproval.submitter.avatar} />
                          <AvatarFallback>{selectedApproval.submitter.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{selectedApproval.submitter.name}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">제출일</Label>
                      <p className="font-medium mt-1">
                        {new Date(selectedApproval.createdAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label className="font-medium">설명</Label>
                  <p className="text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    {selectedApproval.description}
                  </p>
                </div>
                
                {selectedApproval.content && (
                  <div>
                    <Label className="font-medium">상세 내용</Label>
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {JSON.stringify(selectedApproval.content, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
                
                {selectedApproval.attachments && selectedApproval.attachments.length > 0 && (
                  <div>
                    <Label className="font-medium">첨부파일</Label>
                    <div className="mt-2 space-y-2">
                      {selectedApproval.attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm">{attachment}</span>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedApproval.instituteStatus === 'pending' && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <Label className="font-medium">검토 의견</Label>
                      <Textarea
                        placeholder="승인 또는 거부 사유를 입력하세요..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </>
                )}
                
                {selectedApproval.instituteComment && (
                  <div>
                    <Label className="font-medium">기관 검토 의견</Label>
                    <p className="text-gray-700 dark:text-gray-300 mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      {selectedApproval.instituteComment}
                    </p>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsApprovalDetailOpen(false)}>
                  닫기
                </Button>
                {selectedApproval.instituteStatus === 'pending' && (
                  <>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <X className="h-4 w-4 mr-2" />
                          거부
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>컨텐츠 거부</AlertDialogTitle>
                          <AlertDialogDescription>
                            이 컨텐츠를 거부하시겠습니까? 거부 사유가 제출자에게 전달됩니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction onClick={handleReject}>
                            거부
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    
                    <Button onClick={handleApprove} disabled={approveContentMutation.isPending}>
                      <Check className="h-4 w-4 mr-2" />
                      승인
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 강좌 상세 모달 */}
      <Dialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedCourse && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <DialogTitle className="text-xl flex items-center gap-2">
                      <BookOpen className="h-6 w-6 text-primary" />
                      {selectedCourse.title}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{selectedCourse.category}</Badge>
                      <Badge variant="secondary">{selectedCourse.level}</Badge>
                      <Badge variant="warning">승인 대기</Badge>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                {/* 기본 정보 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">강좌 정보</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">기간:</span> {selectedCourse.duration}</div>
                      <div><span className="font-medium">최대 수강생:</span> {selectedCourse.maxStudents}명</div>
                      <div><span className="font-medium">수강료:</span> {selectedCourse.price.toLocaleString()}원</div>
                      <div><span className="font-medium">제출일:</span> {new Date(selectedCourse.submittedAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">담당 훈련사</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">이름:</span> {selectedCourse.trainer.name}</div>
                      <div><span className="font-medium">이메일:</span> {selectedCourse.trainer.email}</div>
                    </div>
                  </div>
                </div>

                {/* 강좌 설명 */}
                <div>
                  <h4 className="font-semibold mb-2">강좌 설명</h4>
                  <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    {selectedCourse.description}
                  </p>
                </div>

                {/* 강좌 목표 */}
                <div>
                  <h4 className="font-semibold mb-2">강좌 목표</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCourse.objectives.map((obj: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-sm">{obj}</Badge>
                    ))}
                  </div>
                </div>

                {/* 참가 요건 */}
                <div>
                  <h4 className="font-semibold mb-2">참가 요건</h4>
                  <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    {selectedCourse.requirements}
                  </p>
                </div>

                {/* 커리큘럼 */}
                <div>
                  <h4 className="font-semibold mb-2">커리큘럼</h4>
                  <div className="space-y-2">
                    {selectedCourse.curriculum.map((item: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">{item.week}주차: {item.topic}</span>
                        </div>
                        <p className="text-sm text-gray-600">{item.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCourseDialogOpen(false)}
                >
                  닫기
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => courseApproveMutation.mutate({ id: selectedCourse.id, action: 'reject' })}
                  disabled={courseApproveMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  거부
                </Button>
                <Button 
                  variant="default"
                  onClick={() => courseApproveMutation.mutate({ id: selectedCourse.id, action: 'approve' })}
                  disabled={courseApproveMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  승인
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 알림장 상세 모달 */}
      <Dialog open={isJournalDialogOpen} onOpenChange={setIsJournalDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedJournal && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <DialogTitle className="text-xl flex items-center gap-2">
                      <FileText className="h-6 w-6 text-success" />
                      {selectedJournal.title}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={selectedJournal.status === 'sent' ? 'default' : 'secondary'}>
                        {selectedJournal.status === 'sent' ? '전송됨' : '읽음'}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {new Date(selectedJournal.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                {/* 기본 정보 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">훈련 정보</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">훈련사:</span> {selectedJournal.trainer.name}</div>
                      <div><span className="font-medium">강좌:</span> {selectedJournal.course.title}</div>
                      <div><span className="font-medium">훈련일:</span> {selectedJournal.trainingDate}</div>
                      <div><span className="font-medium">훈련 시간:</span> {selectedJournal.trainingDuration}분</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">학생 및 반려동물</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">학생:</span> {selectedJournal.student.name}</div>
                      <div><span className="font-medium">반려동물:</span> {selectedJournal.student.pet.name}</div>
                      <div><span className="font-medium">품종:</span> {selectedJournal.student.pet.breed}</div>
                    </div>
                  </div>
                </div>

                {/* 훈련 내용 */}
                <div>
                  <h4 className="font-semibold mb-2">훈련 내용</h4>
                  <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg whitespace-pre-wrap">
                    {selectedJournal.content}
                  </p>
                </div>

                {/* 평가 및 특이사항 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">진도 평가</h4>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${
                            i < selectedJournal.progressRating ? 'text-warning fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="text-sm font-medium">({selectedJournal.progressRating}/5)</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">행동 특이사항</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      {selectedJournal.behaviorNotes}
                    </p>
                  </div>
                </div>

                {/* 숙제 및 다음 목표 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">숙제 지시사항</h4>
                    <p className="text-sm text-gray-600 bg-primary/10 dark:bg-primary/20 p-3 rounded-lg">
                      {selectedJournal.homeworkInstructions}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">다음 훈련 목표</h4>
                    <p className="text-sm text-gray-600 bg-success/10 dark:bg-success/20 p-3 rounded-lg">
                      {selectedJournal.nextGoals}
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsJournalDialogOpen(false)}
                >
                  닫기
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 학생 상세 모달 */}
      <Dialog open={isStudentDialogOpen} onOpenChange={setIsStudentDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          {selectedStudent && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <DialogTitle className="text-xl flex items-center gap-2">
                      <GraduationCap className="h-6 w-6 text-primary" />
                      {selectedStudent.name} 학생 정보
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={selectedStudent.status === 'active' ? 'default' : 'secondary'}>
                        {selectedStudent.status === 'active' ? '수강중' : '휴강'}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        가입일: {selectedStudent.joinDate}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-success">
                      {selectedStudent.attendance.attendanceRate}%
                    </div>
                    <div className="text-sm text-gray-500">출석률</div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                {/* 기본 정보 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">학생 정보</h4>
                    <div className="space-y-2 text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <div><span className="font-medium">이름:</span> {selectedStudent.name}</div>
                      <div><span className="font-medium">이메일:</span> {selectedStudent.email}</div>
                      <div><span className="font-medium">전화번호:</span> {selectedStudent.phone}</div>
                      <div><span className="font-medium">주소:</span> {selectedStudent.address}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">반려동물 정보</h4>
                    <div className="space-y-2 text-sm bg-primary/10 dark:bg-primary/20 p-4 rounded-lg">
                      <div><span className="font-medium">이름:</span> {selectedStudent.pet.name}</div>
                      <div><span className="font-medium">품종:</span> {selectedStudent.pet.breed}</div>
                      <div><span className="font-medium">나이:</span> {selectedStudent.pet.age}살</div>
                      <div><span className="font-medium">체중:</span> {selectedStudent.pet.weight}kg</div>
                      <div><span className="font-medium">성별:</span> {selectedStudent.pet.gender}</div>
                      <div><span className="font-medium">중성화:</span> {selectedStudent.pet.neutered ? '완료' : '미완료'}</div>
                      <div><span className="font-medium">건강상태:</span> {selectedStudent.pet.healthStatus}</div>
                    </div>
                  </div>
                </div>

                {/* 특이사항 */}
                <div>
                  <h4 className="font-semibold mb-2">반려동물 특이사항</h4>
                  <p className="text-gray-700 dark:text-gray-300 bg-warning/10 dark:bg-warning/20 p-3 rounded-lg">
                    {selectedStudent.pet.specialNotes}
                  </p>
                </div>

                {/* 수강 정보 */}
                <div>
                  <h4 className="font-semibold mb-3">수강 정보</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <div className="space-y-2 text-sm">
                        <div><span className="font-medium">강좌명:</span> {selectedStudent.course.title}</div>
                        <div><span className="font-medium">담당 훈련사:</span> {selectedStudent.trainer.name}</div>
                        <div><span className="font-medium">수강 기간:</span> {selectedStudent.course.startDate} ~ {selectedStudent.course.endDate}</div>
                      </div>
                    </div>
                    <div className="bg-success/10 dark:bg-success/20 p-4 rounded-lg">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-success mb-1">
                          {selectedStudent.progress.overallRating}
                        </div>
                        <div className="text-sm text-gray-600">종합 평점 (5점 만점)</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 출석 현황 */}
                <div>
                  <h4 className="font-semibold mb-3">출석 현황</h4>
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-4 bg-primary/10 dark:bg-primary/20 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{selectedStudent.attendance.totalSessions}</div>
                      <div className="text-sm text-gray-600">총 수업</div>
                    </div>
                    <div className="text-center p-4 bg-success/10 dark:bg-success/20 rounded-lg">
                      <div className="text-2xl font-bold text-success">{selectedStudent.attendance.attendedSessions}</div>
                      <div className="text-sm text-gray-600">출석</div>
                    </div>
                    <div className="text-center p-4 bg-warning/10 dark:bg-warning/20 rounded-lg">
                      <div className="text-2xl font-bold text-warning">{selectedStudent.attendance.lateArrivals}</div>
                      <div className="text-sm text-gray-600">지각</div>
                    </div>
                    <div className="text-center p-4 bg-destructive/10 dark:bg-destructive/20 rounded-lg">
                      <div className="text-2xl font-bold text-destructive">{selectedStudent.attendance.absences}</div>
                      <div className="text-sm text-gray-600">결석</div>
                    </div>
                  </div>

                  {/* 최근 출석 기록 */}
                  <div>
                    <h5 className="font-medium mb-2">최근 출석 기록</h5>
                    <div className="space-y-2">
                      {selectedStudent.attendance.recentAttendance.map((record: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-2 border rounded">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{record.date}</span>
                            <Badge 
                              variant={
                                record.status === 'attended' ? 'default' : 
                                record.status === 'late' ? 'warning' : 'danger'
                              }
                              className="text-xs"
                            >
                              {record.status === 'attended' ? '출석' : 
                               record.status === 'late' ? '지각' : '결석'}
                            </Badge>
                          </div>
                          <span className="text-sm text-gray-600">{record.notes}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 학습 성과 평가 */}
                <div>
                  <h4 className="font-semibold mb-3">학습 성과 평가</h4>
                  <div className="space-y-3">
                    {selectedStudent.progress.skillAssessments.map((skill: any, idx: number) => (
                      <div key={idx} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{skill.skill}</span>
                          <span className="text-lg font-bold text-primary">{skill.score}점</span>
                        </div>
                        <div className="w-full h-3 bg-gray-200 rounded-full mb-2">
                          <div 
                            className="h-3 bg-primary rounded-full transition-all duration-300" 
                            style={{ width: `${skill.score}%` }}
                          ></div>
                        </div>
                        <p className="text-sm text-gray-600">{skill.notes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsStudentDialogOpen(false)}
                >
                  닫기
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}