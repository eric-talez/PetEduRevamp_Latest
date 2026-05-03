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
import { 
  Clock, 
  MessageSquare, 
  Star, 
  Calendar, 
  Send, 
  Plus, 
  Eye, 
  FileText,
  Target,
  BookOpen,
  User,
  Dog,
  MessageCircle,
  Phone,
  CalendarPlus,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { queryClient } from '@/lib/queryClient';

interface TrainingJournal {
  id: number;
  title: string;
  content: string;
  trainingDate: string;
  trainingDuration: number;
  trainingType: string;
  progressRating: number;
  behaviorNotes: string;
  homeworkInstructions: string;
  nextGoals: string;
  isRead: boolean;
  readAt: string | null;
  status: 'sent' | 'read' | 'replied';
  createdAt: string;
  trainer: {
    id: number;
    name: string;
    avatar?: string;
  };
  petOwner: {
    id: number;
    name: string;
    avatar?: string;
  };
  pet: {
    id: number;
    name: string;
    breed: string;
  };
  commentsCount: number;
  serviceRequestsCount: number;
}

interface JournalComment {
  id: number;
  content: string;
  attachments: string[];
  createdAt: string;
  author: {
    id: number;
    name: string;
    role: string;
    avatar?: string;
  };
}

interface ServiceRequest {
  id: number;
  serviceType: 'consultation' | 'message' | 'booking';
  title: string;
  description: string;
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: string;
}

export default function JournalsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedJournal, setSelectedJournal] = useState<TrainingJournal | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [serviceRequestForm, setServiceRequestForm] = useState({
    serviceType: '',
    title: '',
    description: '',
    urgency: 'normal'
  });
  const [journalsList, setJournalsList] = useState<TrainingJournal[]>([]);
  const [serviceRequestsList, setServiceRequestsList] = useState<ServiceRequest[]>([]);

  // Click handlers for journal functionality
  const handleDeleteJournal = (journalId: number) => {
    console.log('일지 삭제 클릭:', journalId);
    setJournalsList(prev => prev.filter(j => j.id !== journalId));
    toast({
      title: "삭제 완료",
      description: "알림장이 삭제되었습니다."
    });
  };

  const handleEditJournal = (journalId: number) => {
    console.log('일지 수정 클릭:', journalId);
    setIsCreateOpen(true);
  };

  const handleRequestService = (journalId: number, serviceType: 'consultation' | 'message' | 'booking') => {
    console.log('서비스 요청 클릭:', journalId, serviceType);
    const newRequest = {
      id: Date.now(),
      journalId,
      serviceType,
      title: `${serviceType === 'consultation' ? '상담' : serviceType === 'message' ? '메시지' : '예약'} 요청`,
      description: '새로운 서비스 요청입니다.',
      urgency: 'normal' as const,
      status: 'pending' as const,
      createdAt: new Date().toISOString()
    };
    setServiceRequestsList(prev => [...prev, newRequest]);
    toast({
      title: "요청 완료",
      description: "서비스 요청이 전송되었습니다."
    });
  };

  const handleApproveRequest = (requestId: number) => {
    console.log('요청 승인 클릭:', requestId);
    setServiceRequestsList(prev =>
      prev.map(req => req.id === requestId ? { ...req, status: 'approved' as const } : req)
    );
  };

  const handleRejectRequest = (requestId: number) => {
    console.log('요청 거부 클릭:', requestId);
    setServiceRequestsList(prev =>
      prev.map(req => req.id === requestId ? { ...req, status: 'rejected' as const } : req)
    );
  };

  // 알림장 목록 조회
  const { data: journalsData, isLoading } = useQuery({
    queryKey: ['/api/training-journals', user?.role],
    queryFn: async () => {
      // Mock data for demonstration
      return [
        {
          id: 1,
          title: "멍멍이 기본 훈련 1회차",
          content: "오늘은 기본적인 앉기와 기다리기 훈련을 진행했습니다. 멍멍이가 처음에는 산만했지만 점차 집중력이 향상되었습니다.",
          trainingDate: "2025-01-21",
          trainingDuration: 60,
          trainingType: "기본 훈련",
          progressRating: 4,
          behaviorNotes: "활발하고 호기심이 많음. 간식에 대한 반응이 좋음.",
          homeworkInstructions: "집에서 하루 2번, 5분씩 앉기 연습을 해주세요.",
          nextGoals: "다음 시간에는 눕기와 손 흔들기를 배워보겠습니다.",
          isRead: user?.role === 'pet-owner' ? false : true,
          readAt: null,
          status: 'sent',
          createdAt: "2025-01-21T14:30:00Z",
          trainer: {
            id: 1,
            name: "김민수",
            avatar: "/api/placeholder/32/32"
          },
          petOwner: {
            id: 2,
            name: "박영희",
            avatar: "/api/placeholder/32/32"
          },
          pet: {
            id: 1,
            name: "멍멍이",
            breed: "골든 리트리버"
          },
          commentsCount: 2,
          serviceRequestsCount: 1
        },
        {
          id: 2,
          title: "야옹이 사회화 훈련 3회차",
          content: "다른 고양이들과의 상호작용 훈련을 진행했습니다. 야옹이가 많이 적응했고, 스트레스 반응이 크게 줄었습니다.",
          trainingDate: "2025-01-20",
          trainingDuration: 45,
          trainingType: "사회화 훈련",
          progressRating: 5,
          behaviorNotes: "차분해짐. 다른 동물들에 대한 경계심 감소.",
          homeworkInstructions: "새로운 환경에 천천히 노출시켜 주세요.",
          nextGoals: "실외 환경에서의 사회화 훈련을 시작하겠습니다.",
          isRead: true,
          readAt: "2025-01-20T16:00:00Z",
          status: 'replied',
          createdAt: "2025-01-20T15:30:00Z",
          trainer: {
            id: 3,
            name: "이준호",
            avatar: "/api/placeholder/32/32"
          },
          petOwner: {
            id: 4,
            name: "최지은",
            avatar: "/api/placeholder/32/32"
          },
          pet: {
            id: 2,
            name: "야옹이",
            breed: "페르시안"
          },
          commentsCount: 3,
          serviceRequestsCount: 0
        }
      ];
    }
  });

  // 선택된 알림장의 댓글 조회
  const { data: comments } = useQuery({
    queryKey: ['/api/journal-comments', selectedJournal?.id],
    enabled: !!selectedJournal?.id,
    queryFn: async () => {
      // Mock comments data
      return [
        {
          id: 1,
          content: "감사합니다! 집에서도 열심히 연습하겠습니다.",
          attachments: [],
          createdAt: "2025-01-21T15:00:00Z",
          author: {
            id: 2,
            name: "박영희",
            role: "pet-owner",
            avatar: "/api/placeholder/32/32"
          }
        },
        {
          id: 2,
          content: "궁금한 점이 있으면 언제든 연락주세요!",
          attachments: [],
          createdAt: "2025-01-21T15:30:00Z",
          author: {
            id: 1,
            name: "김민수",
            role: "trainer",
            avatar: "/api/placeholder/32/32"
          }
        }
      ];
    }
  });

  // 선택된 알림장의 서비스 요청 조회
  const { data: serviceRequests } = useQuery({
    queryKey: ['/api/service-requests', selectedJournal?.id],
    enabled: !!selectedJournal?.id,
    queryFn: async () => {
      // Mock service requests data
      return [
        {
          id: 1,
          serviceType: 'consultation',
          title: "추가 상담 요청",
          description: "멍멍이가 집에서 너무 짖어서 상담받고 싶습니다.",
          urgency: 'high',
          status: 'pending',
          createdAt: "2025-01-21T16:00:00Z"
        }
      ];
    }
  });

  // 댓글 작성
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { id: Date.now(), content, createdAt: new Date().toISOString() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/journal-comments'] });
      setNewComment('');
      toast({
        title: "댓글 작성 완료",
        description: "댓글이 성공적으로 작성되었습니다."
      });
    }
  });

  // 서비스 요청
  const createServiceRequestMutation = useMutation({
    mutationFn: async (data: any) => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { id: Date.now(), ...data, createdAt: new Date().toISOString() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests'] });
      setServiceRequestForm({ serviceType: '', title: '', description: '', urgency: 'normal' });
      toast({
        title: "서비스 요청 완료",
        description: "요청이 성공적으로 전송되었습니다."
      });
    }
  });

  // 읽음 처리
  const markAsReadMutation = useMutation({
    mutationFn: async (journalId: number) => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training-journals'] });
    }
  });

  const handleJournalClick = (journal: TrainingJournal) => {
    setSelectedJournal(journal);
    setIsDetailOpen(true);
    
    // 견주가 읽지 않은 알림장인 경우 읽음 처리
    if (user?.role === 'pet-owner' && !journal.isRead) {
      markAsReadMutation.mutate(journal.id);
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment);
  };

  const handleServiceRequest = () => {
    if (!serviceRequestForm.serviceType || !serviceRequestForm.title) {
      toast({
        title: "입력 오류",
        description: "서비스 유형과 제목을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }
    createServiceRequestMutation.mutate(serviceRequestForm);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="outline" className="text-blue-600">전송됨</Badge>;
      case 'read':
        return <Badge variant="outline" className="text-green-600">읽음</Badge>;
      case 'replied':
        return <Badge variant="outline" className="text-primary">답변됨</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProgressStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const getServiceTypeIcon = (type: string) => {
    switch (type) {
      case 'consultation':
        return <MessageCircle className="h-4 w-4" />;
      case 'message':
        return <Phone className="h-4 w-4" />;
      case 'booking':
        return <CalendarPlus className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getServiceTypeName = (type: string) => {
    switch (type) {
      case 'consultation':
        return '상담 요청';
      case 'message':
        return '메시지 문의';
      case 'booking':
        return '예약 요청';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">훈련 알림장</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {user?.role === 'trainer' && '반려동물 훈련 진행상황을 견주에게 전달하세요'}
            {user?.role === 'pet-owner' && '훈련사가 전달한 훈련 진행상황을 확인하세요'}
            {user?.role === 'institute-admin' && '소속 훈련사들의 알림장을 관리하세요'}
          </p>
        </div>
        
        {user?.role === 'trainer' && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                알림장 작성
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>새 훈련 알림장 작성</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pet-select">반려동물 선택</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="반려동물을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pet1">멍멍이 (골든 리트리버)</SelectItem>
                        <SelectItem value="pet2">야옹이 (페르시안)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="training-type">훈련 유형</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="훈련 유형 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">기본 훈련</SelectItem>
                        <SelectItem value="behavior">행동 교정</SelectItem>
                        <SelectItem value="agility">어질리티</SelectItem>
                        <SelectItem value="social">사회화 훈련</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="title">제목</Label>
                  <Input placeholder="알림장 제목을 입력하세요" />
                </div>
                
                <div>
                  <Label htmlFor="content">훈련 내용</Label>
                  <Textarea 
                    placeholder="오늘 진행한 훈련 내용을 상세히 작성해주세요" 
                    rows={4}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duration">훈련 시간 (분)</Label>
                    <Input type="number" placeholder="60" />
                  </div>
                  <div>
                    <Label htmlFor="rating">진행도 평가</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="1-5점" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1점 - 매우 부족</SelectItem>
                        <SelectItem value="2">2점 - 부족</SelectItem>
                        <SelectItem value="3">3점 - 보통</SelectItem>
                        <SelectItem value="4">4점 - 좋음</SelectItem>
                        <SelectItem value="5">5점 - 매우 좋음</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="behavior-notes">행동 관찰 노트</Label>
                  <Textarea 
                    placeholder="훈련 중 관찰된 반려동물의 행동이나 특이사항을 기록하세요" 
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="homework">집에서 할 숙제</Label>
                  <Textarea 
                    placeholder="견주가 집에서 실천해야 할 훈련이나 관리 사항을 작성하세요" 
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="next-goals">다음 목표</Label>
                  <Textarea 
                    placeholder="다음 훈련 세션의 목표나 계획을 작성하세요" 
                    rows={2}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  취소
                </Button>
                <Button>
                  <Send className="h-4 w-4 mr-2" />
                  전송
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* 알림장 목록 */}
      <div className="grid gap-4">
        {(journalsData || journalsList)?.map((journal: TrainingJournal) => (
          <Card 
            key={journal.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary ${
              !journal.isRead && user?.role === 'pet-owner' ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' : ''
            }`}
            onClick={() => handleJournalClick(journal)}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-lg">{journal.title}</CardTitle>
                    {!journal.isRead && user?.role === 'pet-owner' && (
                      <Badge variant="danger" className="text-xs">NEW</Badge>
                    )}
                    {getStatusBadge(journal.status)}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>훈련사: {journal.trainer.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Dog className="h-4 w-4" />
                      <span>{journal.pet.name} ({journal.pet.breed})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(journal.trainingDate).toLocaleDateString('ko-KR')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{journal.trainingDuration}분</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {getProgressStars(journal.progressRating)}
                  </div>
                  <Badge variant="outline">{journal.trainingType}</Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300 line-clamp-2 mb-3">
                {journal.content}
              </p>
              
              <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    <span>댓글 {journal.commentsCount}</span>
                  </div>
                  {journal.serviceRequestsCount > 0 && (
                    <div className="flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      <span>서비스 요청 {journal.serviceRequestsCount}</span>
                    </div>
                  )}
                </div>
                
                <span>{formatDistanceToNow(new Date(journal.createdAt), { 
                  addSuffix: true, 
                  locale: ko 
                })}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 알림장 상세 보기 모달 */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedJournal && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <DialogTitle className="text-xl">{selectedJournal.title}</DialogTitle>
                    <div className="flex items-center gap-2 mt-2">
                      {getStatusBadge(selectedJournal.status)}
                      <Badge variant="outline">{selectedJournal.trainingType}</Badge>
                      <div className="flex">
                        {getProgressStars(selectedJournal.progressRating)}
                      </div>
                    </div>
                  </div>
                </div>
              </DialogHeader>
              
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">훈련 상세</TabsTrigger>
                  <TabsTrigger value="comments">
                    댓글 ({comments?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="services">
                    서비스 요청 ({serviceRequests?.length || 0})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">훈련 날짜</Label>
                      <p className="font-medium">{new Date(selectedJournal.trainingDate).toLocaleDateString('ko-KR')}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">훈련 시간</Label>
                      <p className="font-medium">{selectedJournal.trainingDuration}분</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">훈련사</Label>
                      <p className="font-medium">{selectedJournal.trainer.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">반려동물</Label>
                      <p className="font-medium">{selectedJournal.pet.name} ({selectedJournal.pet.breed})</p>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4" />
                      <Label className="font-medium">훈련 내용</Label>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      {selectedJournal.content}
                    </p>
                  </div>
                  
                  {selectedJournal.behaviorNotes && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="h-4 w-4" />
                        <Label className="font-medium">행동 관찰</Label>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        {selectedJournal.behaviorNotes}
                      </p>
                    </div>
                  )}
                  
                  {selectedJournal.homeworkInstructions && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="h-4 w-4" />
                        <Label className="font-medium">집에서 할 숙제</Label>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        {selectedJournal.homeworkInstructions}
                      </p>
                    </div>
                  )}
                  
                  {selectedJournal.nextGoals && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4" />
                        <Label className="font-medium">다음 목표</Label>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        {selectedJournal.nextGoals}
                      </p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="comments" className="space-y-4">
                  <div className="space-y-3">
                    {comments?.map((comment: JournalComment) => (
                      <div key={comment.id} className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.author.avatar} />
                          <AvatarFallback>{comment.author.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{comment.author.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {comment.author.role === 'trainer' ? '훈련사' : '견주'}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ko })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label htmlFor="new-comment">댓글 작성</Label>
                    <Textarea
                      id="new-comment"
                      placeholder="댓글을 입력하세요..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                    />
                    <Button 
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || addCommentMutation.isPending}
                      className="w-full"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      댓글 작성
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="services" className="space-y-4">
                  {/* 기존 서비스 요청 목록 */}
                  <div className="space-y-3">
                    {(serviceRequests || serviceRequestsList)?.map((request: ServiceRequest) => (
                      <div key={request.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getServiceTypeIcon(request.serviceType)}
                            <span className="font-medium">{request.title}</span>
                            <Badge variant="outline">{getServiceTypeName(request.serviceType)}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={request.urgency === 'urgent' ? 'danger' : 'outline'}
                              className="text-xs"
                            >
                              {request.urgency}
                            </Badge>
                            <Badge variant="outline">{request.status}</Badge>
                          </div>
                        </div>
                        {request.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {request.description}
                          </p>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true, locale: ko })}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {/* 새 서비스 요청 폼 (견주만) */}
                  {user?.role === 'pet-owner' && (
                    <>
                      <Separator />
                      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Label className="font-medium">새 서비스 요청</Label>
                        
                        <div>
                          <Label htmlFor="service-type">서비스 유형</Label>
                          <Select 
                            value={serviceRequestForm.serviceType}
                            onValueChange={(value) => setServiceRequestForm(prev => ({ ...prev, serviceType: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="서비스 유형을 선택하세요" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="consultation">상담 요청</SelectItem>
                              <SelectItem value="message">메시지 문의</SelectItem>
                              <SelectItem value="booking">예약 요청</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="request-title">제목</Label>
                          <Input
                            id="request-title"
                            placeholder="요청 제목을 입력하세요"
                            value={serviceRequestForm.title}
                            onChange={(e) => setServiceRequestForm(prev => ({ ...prev, title: e.target.value }))}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="request-description">설명</Label>
                          <Textarea
                            id="request-description"
                            placeholder="상세한 요청 내용을 입력하세요"
                            value={serviceRequestForm.description}
                            onChange={(e) => setServiceRequestForm(prev => ({ ...prev, description: e.target.value }))}
                            rows={3}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="urgency">우선순위</Label>
                          <Select 
                            value={serviceRequestForm.urgency}
                            onValueChange={(value) => setServiceRequestForm(prev => ({ ...prev, urgency: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">낮음</SelectItem>
                              <SelectItem value="normal">보통</SelectItem>
                              <SelectItem value="high">높음</SelectItem>
                              <SelectItem value="urgent">긴급</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <Button 
                          onClick={handleServiceRequest}
                          disabled={createServiceRequestMutation.isPending}
                          className="w-full"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          서비스 요청
                        </Button>
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}