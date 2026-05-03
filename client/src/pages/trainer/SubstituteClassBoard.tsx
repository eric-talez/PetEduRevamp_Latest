import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, MapPin, Users, DollarSign, AlertTriangle, Plus, Eye, MessageCircle, CheckCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface SubstituteClassPost {
  id: string;
  title: string;
  description: string;
  classDate: string;
  classTime: string;
  location: string;
  isOnline: boolean;
  compensation: number;
  studentCount: number;
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  requiredSkills: string[];
  currentApplicants: number;
  maxApplicants: number;
  status: 'open' | 'in_progress' | 'closed' | 'completed';
  originalTrainer: string;
  specialRequirements?: string;
}

interface SubstituteApplication {
  id: string;
  postId: string;
  applicantName: string;
  message: string;
  proposedCompensation?: number;
  applicationDate: string;
  status: 'pending' | 'accepted' | 'rejected';
}

const MOCK_POSTS: SubstituteClassPost[] = [
  {
    id: '1',
    title: '기초 복종 훈련 - 성인반',
    description: '성견 대상 기초 복종 훈련 수업입니다. 앉아, 기다려, 이리와 등 기본 명령어 교육을 진행합니다.',
    classDate: '2025-01-25',
    classTime: '14:00-15:30',
    location: '강남구 테헤란로 123',
    isOnline: false,
    compensation: 80000,
    studentCount: 5,
    urgency: 'high',
    requiredSkills: ['기초 복종', '성견 훈련'],
    currentApplicants: 2,
    maxApplicants: 3,
    status: 'open',
    originalTrainer: '김훈련사',
    specialRequirements: '대형견 경험 필수'
  },
  {
    id: '2',
    title: '퍼피 사회화 교육',
    description: '3-6개월 퍼피 대상 사회화 교육 프로그램입니다.',
    classDate: '2025-01-26',
    classTime: '10:00-11:30',
    location: '온라인 (Zoom)',
    isOnline: true,
    compensation: 60000,
    studentCount: 3,
    urgency: 'normal',
    requiredSkills: ['퍼피 교육', '사회화 훈련'],
    currentApplicants: 1,
    maxApplicants: 2,
    status: 'open',
    originalTrainer: '이훈련사'
  },
  {
    id: '3',
    title: '[휴식 신청] 개인 사정으로 인한 대체 훈련사 모집',
    description: '개인 사정으로 인한 휴식 기간 중 대체 훈련사를 모집합니다. 기존 학생들의 교육 연속성 유지를 위해 경험이 풍부한 훈련사를 찾습니다.',
    classDate: '2025-01-25',
    classTime: '전일 (09:00-18:00)',
    location: '강남 훈련센터',
    isOnline: false,
    compensation: 150000,
    studentCount: 8,
    urgency: 'urgent',
    requiredSkills: ['기초 복종', '사회화 훈련', '문제행동 교정'],
    currentApplicants: 1,
    maxApplicants: 1,
    status: 'open',
    originalTrainer: '박훈련사',
    specialRequirements: '3년 이상 경험 필수, 기존 학생 인수인계 필요'
  },
  {
    id: '4',
    title: '강동훈 훈련사 - 행동 교정 수업',
    description: '강동훈 훈련사가 등록한 개별 행동 교정 수업입니다. 짖음, 물기, 분리불안 등 문제행동 교정에 특화된 수업입니다.',
    classDate: '2025-01-27',
    classTime: '16:00-17:30',
    location: '왕짱스쿨 구평센터',
    isOnline: false,
    compensation: 120000,
    studentCount: 2,
    urgency: 'normal',
    requiredSkills: ['문제행동 교정', '개별 훈련', '행동 분석'],
    currentApplicants: 0,
    maxApplicants: 2,
    status: 'open',
    originalTrainer: '강동훈',
    specialRequirements: '문제행동 교정 경험 필수'
  },
  {
    id: '5',
    title: '강동훈 훈련사 - 퍼피 기초 교육',
    description: '강동훈 훈련사가 등록한 퍼피 기초 교육 프로그램입니다. 3-6개월 퍼피 대상 기본 예절 교육을 진행합니다.',
    classDate: '2025-01-28',
    classTime: '10:00-11:30',
    location: '왕짱스쿨 석적센터',
    isOnline: false,
    compensation: 90000,
    studentCount: 4,
    urgency: 'low',
    requiredSkills: ['퍼피 교육', '기초 복종', '사회화 훈련'],
    currentApplicants: 1,
    maxApplicants: 3,
    status: 'open',
    originalTrainer: '강동훈',
    specialRequirements: '퍼피 교육 경험 선호'
  }
];

const MOCK_APPLICATIONS: SubstituteApplication[] = [
  {
    id: '1',
    postId: '1',
    applicantName: '박대체훈련사',
    message: '대형견 훈련 경험이 5년 이상 있습니다. 해당 시간에 수업 진행 가능합니다.',
    proposedCompensation: 80000,
    applicationDate: '2025-01-20',
    status: 'pending'
  }
];

export default function SubstituteClassBoard() {
  const [selectedTab, setSelectedTab] = useState('available');
  const [newPostDialog, setNewPostDialog] = useState(false);
  const [viewApplicationsDialog, setViewApplicationsDialog] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 대체 수업 게시글 조회
  const { data: postsData = [], isLoading: isLoadingPosts } = useQuery({
    queryKey: ['/api/substitute-posts'],
    queryFn: () => apiRequest('GET', '/api/substitute-posts')
  });

  // 대체 수업 지원 신청 조회
  const { data: applicationsData = [], isLoading: isLoadingApplications } = useQuery({
    queryKey: ['/api/substitute-applications'],
    queryFn: () => apiRequest('GET', '/api/substitute-applications')
  });

  // 안전한 배열 변환
  const posts = Array.isArray(postsData) ? postsData : [];
  const applications = Array.isArray(applicationsData) ? applicationsData : [];

  // 현재 사용자 정보 (실제로는 인증된 사용자 정보를 사용해야 함)
  const currentTrainer = '강동훈';

  // 게시글 분류
  const availablePosts = posts.filter(post => post.originalTrainer !== currentTrainer && post.status === 'open');
  const myPosts = posts.filter(post => post.originalTrainer === currentTrainer);
  
  // 디버깅을 위한 로그
  console.log('현재 훈련사:', currentTrainer);
  console.log('전체 게시글:', posts);
  console.log('내가 등록한 수업:', myPosts);
  console.log('이용 가능한 수업:', availablePosts);

  // 대체 수업 게시글 생성
  const createPostMutation = useMutation({
    mutationFn: (postData: any) => apiRequest('POST', '/api/substitute-posts', postData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/substitute-posts'] });
      toast({
        title: "대체 수업 게시글 등록",
        description: "대체 수업 게시글이 성공적으로 등록되었습니다.",
      });
      setNewPostDialog(false);
    }
  });

  // 대체 수업 지원 신청
  const applyMutation = useMutation({
    mutationFn: (applicationData: any) => apiRequest('POST', '/api/substitute-applications', applicationData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/substitute-applications'] });
      toast({
        title: "대체 수업 신청",
        description: "대체 수업 신청이 완료되었습니다.",
      });
    }
  });

  // 신청 상태 변경 처리
  const handleApplicationStatusChange = async (applicationId: string, status: 'accepted' | 'rejected') => {
    try {
      console.log('신청 상태 변경:', { applicationId, status });
      
      const response = await fetch(`/api/substitute-applications/${applicationId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: "신청 상태 변경",
          description: result.message,
        });
        
        // 신청 목록 새로고침
        queryClient.invalidateQueries({ queryKey: ['/api/substitute-applications'] });
      } else {
        throw new Error('상태 변경 실패');
      }
    } catch (error) {
      console.error('신청 상태 변경 오류:', error);
      toast({
        title: "오류",
        description: "신청 상태 변경 중 오류가 발생했습니다.",
        variant: "destructive"
      });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-success';
      case 'in_progress': return 'bg-primary';
      case 'closed': return 'bg-gray-500';
      case 'completed': return 'bg-primary/50';
      default: return 'bg-gray-500';
    }
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = new FormData(e.target as HTMLFormElement);
    
    // 시간 데이터 조합
    const startHour = formData.get('startHour');
    const startMinute = formData.get('startMinute');
    const endHour = formData.get('endHour');
    const endMinute = formData.get('endMinute');
    
    const classTime = `${startHour}:${startMinute}-${endHour}:${endMinute}`;
    
    const postData = {
      title: formData.get('title'),
      description: formData.get('description'),
      classDate: formData.get('classDate'),
      classTime: classTime,
      location: formData.get('location'),
      compensation: Number(formData.get('compensation')),
      urgency: formData.get('urgency'),
      specialRequirements: formData.get('specialRequirements'),
      // 기본값 설정
      isOnline: false,
      studentCount: 5,
      requiredSkills: [],
      maxApplicants: 3,
      originalTrainer: currentTrainer
    };
    
    console.log('대체 수업 등록 데이터:', postData);
    createPostMutation.mutate(postData);
  };

  const handleViewApplications = (post: any) => {
    setSelectedPost(post);
    setViewApplicationsDialog(true);
  };

  const handleApplyForSubstitute = (postId: string) => {
    applyMutation.mutate({
      postId,
      applicantId: 1, // 현재 사용자 ID
      message: "대체 수업을 진행하겠습니다."
    });
  };

  const renderPostCard = (post: any, showActions: boolean = true) => (
    <Card key={post.id} className="mb-4 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{post.title}</CardTitle>
            <CardDescription className="text-sm text-gray-600 mt-1">
              {post.trainer?.name || '훈련사'} 훈련사
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge className={`${getStatusColor(post.status)} text-white`}>
              {post.status === 'open' ? '모집중' : 
               post.status === 'in_progress' ? '진행중' : 
               post.status === 'closed' ? '마감' : '완료'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-700 mb-4">{post.content}</p>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm">{new Date(post.substituteDate).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm">{post.substituteTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span className="text-sm">{post.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="text-sm">{post.trainingType}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-4 w-4 text-success" />
          <span className="text-sm font-medium text-success">
            {post.paymentAmount?.toLocaleString()}원
          </span>
        </div>

        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-1">반려동물 정보:</p>
          <p className="text-sm text-gray-600">{post.petInfo}</p>
        </div>

        {post.requirements && (
          <div className="flex items-start gap-2 mb-4 p-2 bg-warning/10 rounded">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
            <span className="text-sm text-warning">{post.requirements}</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">
            신청자: {post.applications?.length || 0}명
          </span>
          {showActions && (
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleViewApplications(post)}
              >
                <Eye className="h-4 w-4 mr-1" />
                신청 현황
              </Button>
              <Button 
                size="sm"
                onClick={() => handleApplyForSubstitute(post.id)}
                disabled={post.status !== 'open'}
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                신청하기
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );



  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">대체 훈련사 게시판</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            휴식이 필요한 수업을 다른 훈련사에게 맡기고, 대체 수업 기회를 찾아보세요
          </p>
        </div>
        <Dialog open={newPostDialog} onOpenChange={setNewPostDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              대체 수업 등록
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>대체 수업 등록</DialogTitle>
              <DialogDescription>
                휴식이 필요한 수업을 다른 훈련사에게 맡기실 수 있습니다.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePost} className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">수업 제목</Label>
                  <Input id="title" name="title" placeholder="예: 기초 복종 훈련 - 성인반" required />
                </div>
                <div>
                  <Label htmlFor="compensation">수업료</Label>
                  <Input id="compensation" name="compensation" type="number" placeholder="80000" required />
                </div>
              </div>
              <div>
                <Label htmlFor="description">수업 설명</Label>
                <Textarea id="description" name="description" placeholder="수업 내용을 상세히 설명해주세요..." required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="classDate">수업 날짜</Label>
                  <Input id="classDate" name="classDate" type="date" required />
                </div>
                <div>
                  <Label>수업 시간</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-sm text-gray-600">시작 시간</Label>
                      <div className="flex gap-1">
                        <Select name="startHour" required>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="시" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                                {i.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select name="startMinute" required>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="분" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="00">00</SelectItem>
                            <SelectItem value="15">15</SelectItem>
                            <SelectItem value="30">30</SelectItem>
                            <SelectItem value="45">45</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">종료 시간</Label>
                      <div className="flex gap-1">
                        <Select name="endHour" required>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="시" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                                {i.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select name="endMinute" required>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="분" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="00">00</SelectItem>
                            <SelectItem value="15">15</SelectItem>
                            <SelectItem value="30">30</SelectItem>
                            <SelectItem value="45">45</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">수업 장소</Label>
                  <Input id="location" name="location" placeholder="강남구 테헤란로 123" required />
                </div>
                <div>
                  <Label htmlFor="urgency">긴급도</Label>
                  <Select name="urgency" required>
                    <SelectTrigger>
                      <SelectValue placeholder="선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">낮음</SelectItem>
                      <SelectItem value="normal">보통</SelectItem>
                      <SelectItem value="high">높음</SelectItem>
                      <SelectItem value="urgent">긴급</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="requirements">특별 요구사항</Label>
                <Textarea id="requirements" name="specialRequirements" placeholder="대형견 경험 필수, 특별한 주의사항 등..." />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setNewPostDialog(false)}>
                  취소
                </Button>
                <Button type="submit">
                  등록하기
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available">이용 가능한 수업</TabsTrigger>
          <TabsTrigger value="my-posts">내가 등록한 수업</TabsTrigger>
          <TabsTrigger value="applications">내 신청 현황</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="mt-6">
          <div className="grid gap-4">
            {availablePosts.map(post => renderPostCard(post))}
            {availablePosts.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-gray-500">현재 이용 가능한 대체 수업이 없습니다.</p>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="my-posts" className="mt-6">
          <div className="grid gap-4">
            {myPosts.map(post => renderPostCard(post, false))}
            {myPosts.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-gray-500">등록한 대체 수업이 없습니다.</p>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="applications" className="mt-6">
          <div className="grid gap-4">
            {applications.map(app => {
              const post = posts.find(p => p.id === app.postId);
              return (
                <Card key={app.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">{post?.title}</h3>
                    <Badge className={`${app.status === 'pending' ? 'bg-warning' : 
                                     app.status === 'accepted' ? 'bg-success' : 'bg-destructive'} text-white`}>
                      {app.status === 'pending' ? '대기중' : 
                       app.status === 'accepted' ? '승인됨' : '거절됨'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{app.message}</p>
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>신청일: {app.applicationDate}</span>
                    {app.proposedCompensation && (
                      <span>제안 수수료: {app.proposedCompensation.toLocaleString()}원</span>
                    )}
                  </div>
                </Card>
              );
            })}
            {applications.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-gray-500">신청한 대체 수업이 없습니다.</p>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* 신청 현황 보기 다이얼로그 */}
      <Dialog open={viewApplicationsDialog} onOpenChange={setViewApplicationsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>신청 현황</DialogTitle>
            <DialogDescription>
              {selectedPost?.title}에 대한 신청 현황입니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {applications.filter(app => app.postId === selectedPost?.id).map(app => (
              <Card key={app.id} className="mb-4 p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">{app.applicantName}</h4>
                  <Badge className="bg-primary text-white">
                    {app.status === 'pending' ? '검토중' : 
                     app.status === 'accepted' ? '승인됨' : '거절됨'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">{app.message}</p>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>신청일: {app.applicationDate}</span>
                  {app.proposedCompensation && (
                    <span>제안 수수료: {app.proposedCompensation.toLocaleString()}원</span>
                  )}
                </div>
                {app.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleApplicationStatusChange(app.id, 'accepted')}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      승인
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleApplicationStatusChange(app.id, 'rejected')}
                    >
                      거절
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}