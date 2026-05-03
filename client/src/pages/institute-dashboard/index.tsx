import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../../SimpleApp';
import { 
  Building, 
  Users, 
  Calendar, 
  BarChart, 
  Settings, 
  DollarSign,
  BadgeCheck,
  User,
  CalendarCheck,
  MessageSquare,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  UserPlus,
  Search,
  Filter,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';

// 기관 정보 타입
interface Institute {
  id: number;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  verified: boolean;
  logo?: string;
  foundedYear: number;
  trainerCount: number;
  studentCount: number;
  courseCount: number;
  rating: number;
  reviewCount: number;
}

// 트레이너 타입
interface Trainer {
  id: number;
  name: string;
  avatar?: string;
  email: string;
  phone: string;
  position: string;
  specialties: string[];
  status: 'active' | 'pending' | 'inactive';
  verified: boolean;
  courseCount: number;
  studentCount: number;
  certifications: string[];
  rating: number;
  reviewCount: number;
  joinedDate: string;
}

// 예약 타입
interface Reservation {
  id: number;
  customerName: string;
  customerAvatar?: string;
  customerPhone: string;
  petName: string;
  petType: string;
  service: string;
  trainerId: number;
  trainerName: string;
  date: string;
  time: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  paymentStatus: 'paid' | 'unpaid' | 'refunded';
  amount: number;
  note?: string;
}

export default function InstituteDashboardPage() {
  const [location, navigate] = useLocation();
  const { isAuthenticated, userRole } = useAuth();
  const { toast } = useToast();

  // 기관 정보 로딩 상태
  const [isLoading, setIsLoading] = useState(true);
  
  // 기관 정보 상태 (빈 상태로 시작)
  const [institute, setInstitute] = useState<Institute>({
    id: 0,
    name: "",
    code: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    verified: false,
    logo: "",
    foundedYear: 0,
    trainerCount: 0,
    studentCount: 0,
    courseCount: 0,
    rating: 0,
    reviewCount: 0
  });

  // 인증되지 않은 사용자 또는 기관 관리자가 아닌 사용자 리디렉션
  useEffect(() => {
    if (!isAuthenticated || (userRole !== 'institute-admin' && userRole !== 'admin')) {
      toast({
        title: "접근 권한이 없습니다",
        description: "기관 관리자만 접근할 수 있는 페이지입니다.",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [isAuthenticated, userRole, navigate, toast]);

  // API에서 기관 정보 가져오기
  useEffect(() => {
    const fetchInstituteData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/my-institute', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setInstitute({
            id: data.id,
            name: data.name || '기관명 없음',
            code: data.code || '코드 미설정',
            address: data.address || '',
            phone: data.phone || '',
            email: data.email || '',
            website: data.website || '',
            verified: data.certification || false,
            logo: data.logo || '',
            foundedYear: data.foundedYear || new Date().getFullYear(),
            trainerCount: data.trainerCount || 0,
            studentCount: data.studentCount || 0,
            courseCount: data.courseCount || 0,
            rating: parseFloat(data.rating) || 0,
            reviewCount: data.reviewCount || 0
          });
          console.log('[InstituteDashboard] 기관 정보 로드 완료:', data.code);
        } else {
          console.error('[InstituteDashboard] 기관 정보 로드 실패:', response.status);
          toast({
            title: "기관 정보 로드 실패",
            description: "기관 정보를 불러오는데 실패했습니다.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('[InstituteDashboard] 기관 정보 로드 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated && (userRole === 'institute-admin' || userRole === 'admin')) {
      fetchInstituteData();
    }
  }, [isAuthenticated, userRole, toast]);

  const [trainers, setTrainers] = useState<Trainer[]>([
    {
      id: 1,
      name: "김훈련",
      avatar: "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      email: "trainer.kim@perfectpet.co.kr",
      phone: "010-1234-5678",
      position: "수석 트레이너",
      specialties: ["기본 훈련", "공격성 교정", "어질리티"],
      status: "active",
      verified: true,
      courseCount: 5,
      studentCount: 78,
      certifications: ["KKC 인증 트레이너", "동물행동 전문가"],
      rating: 4.9,
      reviewCount: 42,
      joinedDate: "2020-03-15"
    },
    {
      id: 2,
      name: "박민첩",
      avatar: "https://images.unsplash.com/photo-1548535537-3cfaf1fc327c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      email: "trainer.park@perfectpet.co.kr",
      phone: "010-2345-6789",
      position: "어질리티 전문 트레이너",
      specialties: ["어질리티", "프리스비", "스포츠 독"],
      status: "active",
      verified: true,
      courseCount: 3,
      studentCount: 56,
      certifications: ["어질리티 국제 인증"],
      rating: 4.7,
      reviewCount: 35,
      joinedDate: "2021-02-10"
    },
    {
      id: 3,
      name: "이사회",
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      email: "trainer.lee@perfectpet.co.kr",
      phone: "010-3456-7890",
      position: "행동교정 전문가",
      specialties: ["문제행동 교정", "사회화 훈련", "심리 상담"],
      status: "active",
      verified: true,
      courseCount: 4,
      studentCount: 67,
      certifications: ["동물행동학 석사", "테일즈 인증 트레이너"],
      rating: 4.8,
      reviewCount: 39,
      joinedDate: "2019-07-22"
    },
    {
      id: 4,
      name: "최신입",
      email: "trainer.choi@perfectpet.co.kr",
      phone: "010-4567-8901",
      position: "초급 트레이너",
      specialties: ["기본 훈련", "퍼피 트레이닝"],
      status: "pending",
      verified: false,
      courseCount: 1,
      studentCount: 12,
      certifications: ["동물훈련사 자격증"],
      rating: 4.5,
      reviewCount: 8,
      joinedDate: "2023-01-05"
    }
  ]);

  const [reservations, setReservations] = useState<Reservation[]>([
    {
      id: 1,
      customerName: "홍길동",
      customerAvatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      customerPhone: "010-1111-2222",
      petName: "몽이",
      petType: "골든리트리버",
      service: "기본 훈련 12주 프로그램",
      trainerId: 1,
      trainerName: "김훈련",
      date: "2023-06-15",
      time: "14:00",
      status: "confirmed",
      paymentStatus: "paid",
      amount: 550000,
      note: "분리불안 증상이 있습니다."
    },
    {
      id: 2,
      customerName: "김철수",
      customerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      customerPhone: "010-2222-3333",
      petName: "해피",
      petType: "비숑프리제",
      service: "어질리티 중급반",
      trainerId: 2,
      trainerName: "박민첩",
      date: "2023-06-16",
      time: "11:00",
      status: "pending",
      paymentStatus: "unpaid",
      amount: 450000
    },
    {
      id: 3,
      customerName: "이영희",
      customerPhone: "010-3333-4444",
      petName: "콩이",
      petType: "포메라니안",
      service: "문제행동 상담",
      trainerId: 3,
      trainerName: "이사회",
      date: "2023-06-14",
      time: "16:30",
      status: "completed",
      paymentStatus: "paid",
      amount: 120000,
      note: "짖음 문제 해결 필요"
    },
    {
      id: 4,
      customerName: "박지민",
      customerPhone: "010-4444-5555",
      petName: "달이",
      petType: "말티즈",
      service: "퍼피 사회화 클래스",
      trainerId: 1,
      trainerName: "김훈련",
      date: "2023-06-18",
      time: "10:00",
      status: "cancelled",
      paymentStatus: "refunded",
      amount: 350000
    },
    {
      id: 5,
      customerName: "정민준",
      customerPhone: "010-5555-6666",
      petName: "루나",
      petType: "보더콜리",
      service: "고급 트릭 훈련",
      trainerId: 2,
      trainerName: "박민첩",
      date: "2023-06-17",
      time: "15:00",
      status: "confirmed",
      paymentStatus: "paid",
      amount: 480000
    }
  ]);

  // 트레이너 추가 모달 상태
  const [isAddTrainerModalOpen, setIsAddTrainerModalOpen] = useState(false);
  const [newTrainer, setNewTrainer] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    specialties: ''
  });

  // 트레이너 초대 처리
  const handleInviteTrainer = () => {
    // 유효성 검사
    if (!newTrainer.name || !newTrainer.email || !newTrainer.phone) {
      toast({
        title: "필수 정보를 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    // 실제로는 API 호출을 통해 트레이너 초대 처리
    const specialtiesArray = newTrainer.specialties
      ? newTrainer.specialties.split(',').map(s => s.trim())
      : [];
    
    const trainer: Trainer = {
      id: trainers.length + 1,
      name: newTrainer.name,
      email: newTrainer.email,
      phone: newTrainer.phone,
      position: newTrainer.position || '트레이너',
      specialties: specialtiesArray,
      status: 'pending',
      verified: false,
      courseCount: 0,
      studentCount: 0,
      certifications: [],
      rating: 0,
      reviewCount: 0,
      joinedDate: new Date().toISOString().split('T')[0]
    };
    
    setTrainers([...trainers, trainer]);
    setIsAddTrainerModalOpen(false);
    setNewTrainer({
      name: '',
      email: '',
      phone: '',
      position: '',
      specialties: ''
    });
    
    toast({
      title: "트레이너 초대가 발송되었습니다",
      description: `${newTrainer.email}로 초대 링크가 발송되었습니다.`,
    });
  };

  // 예약 상태 변경 처리
  const handleReservationStatusChange = (reservationId: number, newStatus: Reservation['status']) => {
    setReservations(prev => 
      prev.map(res => 
        res.id === reservationId 
          ? { ...res, status: newStatus } 
          : res
      )
    );
    
    toast({
      title: "예약 상태가 변경되었습니다",
    });
  };

  // 트레이너 필터링을 위한 상태
  const [trainerFilter, setTrainerFilter] = useState('all');
  
  // 필터링된 트레이너 목록
  const filteredTrainers = trainers.filter(trainer => {
    if (trainerFilter === 'all') return true;
    if (trainerFilter === 'active') return trainer.status === 'active';
    if (trainerFilter === 'pending') return trainer.status === 'pending';
    if (trainerFilter === 'verified') return trainer.verified;
    return true;
  });

  // 예약 필터링을 위한 상태
  const [reservationFilter, setReservationFilter] = useState('all');
  
  // 필터링된 예약 목록
  const filteredReservations = reservations.filter(reservation => {
    if (reservationFilter === 'all') return true;
    if (reservationFilter === 'confirmed') return reservation.status === 'confirmed';
    if (reservationFilter === 'pending') return reservation.status === 'pending';
    if (reservationFilter === 'completed') return reservation.status === 'completed';
    if (reservationFilter === 'cancelled') return reservation.status === 'cancelled';
    return true;
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center text-sm text-gray-500 mb-6">
        <a href="/" className="hover:text-primary">홈</a>
        <ChevronRight className="w-4 h-4 mx-1" />
        <span className="text-gray-700 font-medium">기관 관리자 대시보드</span>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <Building className="w-6 h-6 mr-2 text-primary" />
          {institute.name} 관리자
        </h1>
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 flex items-center">
          <BadgeCheck className="w-3.5 h-3.5 mr-1" />
          기관 코드: {institute.code}
        </Badge>
      </div>

      {/* 개요 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">소속 트레이너</p>
                <h3 className="text-2xl font-bold">{institute.trainerCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xs text-green-600 flex items-center">
                <ChevronUp className="w-3 h-3 mr-1" />
                전월 대비 2명 증가
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">총 학생 수</p>
                <h3 className="text-2xl font-bold">{institute.studentCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <User className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xs text-green-600 flex items-center">
                <ChevronUp className="w-3 h-3 mr-1" />
                전월 대비 15명 증가
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">예약 건수 (이번 달)</p>
                <h3 className="text-2xl font-bold">28</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CalendarCheck className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xs text-green-600 flex items-center">
                <ChevronUp className="w-3 h-3 mr-1" />
                전월 대비 8건 증가
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">월 매출</p>
                <h3 className="text-2xl font-bold">₩12.8M</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xs text-green-600 flex items-center">
                <ChevronUp className="w-3 h-3 mr-1" />
                전월 대비 12% 증가
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trainers" className="mb-8">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trainers">소속 트레이너</TabsTrigger>
          <TabsTrigger value="reservations">상담 예약</TabsTrigger>
          <TabsTrigger value="courses">교육 과정</TabsTrigger>
          <TabsTrigger value="settings">기관 설정</TabsTrigger>
        </TabsList>
        
        {/* 소속 트레이너 탭 */}
        <TabsContent value="trainers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>소속 트레이너 관리</CardTitle>
                <CardDescription>
                  총 {trainers.length}명의 트레이너가 있습니다. 트레이너를 추가하거나 관리할 수 있습니다.
                </CardDescription>
              </div>
              <Button onClick={() => setIsAddTrainerModalOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                트레이너 추가
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center w-full max-w-sm">
                  <div className="relative w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input placeholder="트레이너 검색..." className="pl-8" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={trainerFilter} onValueChange={setTrainerFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="모든 트레이너" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">모든 트레이너</SelectItem>
                      <SelectItem value="active">활성 트레이너</SelectItem>
                      <SelectItem value="pending">승인 대기 중</SelectItem>
                      <SelectItem value="verified">인증된 트레이너</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>트레이너</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>전문 분야</TableHead>
                      <TableHead>학생 수</TableHead>
                      <TableHead>평점</TableHead>
                      <TableHead>연락처</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrainers.map((trainer) => (
                      <TableRow key={trainer.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar 
                              src={trainer.avatar} 
                              fallback={trainer.name[0]}
                            />
                            <div>
                              <div className="font-medium flex items-center">
                                {trainer.name}
                                {trainer.verified && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <BadgeCheck className="w-4 h-4 ml-1 text-primary" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>테일즈 인증 트레이너</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">{trainer.position}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {trainer.status === 'active' && (
                            <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                              활성
                            </Badge>
                          )}
                          {trainer.status === 'pending' && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">
                              승인 대기
                            </Badge>
                          )}
                          {trainer.status === 'inactive' && (
                            <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                              비활성
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {trainer.specialties.map((specialty, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {specialty}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{trainer.studentCount}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <span className="font-medium mr-1">{trainer.rating}</span>
                            <span className="text-xs text-gray-500">({trainer.reviewCount})</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{trainer.phone}</div>
                          <div className="text-xs text-gray-500">{trainer.email}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {trainer.status === 'pending' && (
                              <Button variant="outline" size="sm" className="h-8">
                                승인
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <div className="text-sm text-gray-500">
                페이지 1 / 1
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* 상담 예약 탭 */}
        <TabsContent value="reservations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>상담 예약 관리</CardTitle>
                <CardDescription>
                  총 {reservations.length}건의 상담 예약이 있습니다. 예약 상태를 관리하고 확인할 수 있습니다.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={reservationFilter} onValueChange={setReservationFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="모든 예약" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 예약</SelectItem>
                    <SelectItem value="confirmed">확정된 예약</SelectItem>
                    <SelectItem value="pending">대기 중</SelectItem>
                    <SelectItem value="completed">완료됨</SelectItem>
                    <SelectItem value="cancelled">취소됨</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Calendar className="w-4 h-4 mr-2" />
                  달력 보기
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>고객 정보</TableHead>
                      <TableHead>서비스</TableHead>
                      <TableHead>담당 트레이너</TableHead>
                      <TableHead>예약 시간</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>결제</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReservations.map((reservation) => (
                      <TableRow key={reservation.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar 
                              src={reservation.customerAvatar} 
                              fallback={reservation.customerName[0]}
                            />
                            <div>
                              <div className="font-medium">{reservation.customerName}</div>
                              <div className="text-xs text-gray-500">{reservation.petName} ({reservation.petType})</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{reservation.service}</div>
                          {reservation.note && (
                            <div className="text-xs text-gray-500 flex items-center">
                              <Info className="w-3 h-3 mr-1" />
                              {reservation.note}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>{reservation.trainerName}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {new Date(reservation.date).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="text-xs text-gray-500">{reservation.time}</div>
                        </TableCell>
                        <TableCell>
                          {reservation.status === 'confirmed' && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                              확정됨
                            </Badge>
                          )}
                          {reservation.status === 'pending' && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">
                              대기 중
                            </Badge>
                          )}
                          {reservation.status === 'completed' && (
                            <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                              완료됨
                            </Badge>
                          )}
                          {reservation.status === 'cancelled' && (
                            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                              취소됨
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {reservation.paymentStatus === 'paid' && (
                            <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                              결제 완료
                            </Badge>
                          )}
                          {reservation.paymentStatus === 'unpaid' && (
                            <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                              미결제
                            </Badge>
                          )}
                          {reservation.paymentStatus === 'refunded' && (
                            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                              환불됨
                            </Badge>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            {reservation.amount.toLocaleString()}원
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {reservation.status === 'pending' && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 text-xs"
                                  onClick={() => handleReservationStatusChange(reservation.id, 'confirmed')}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                  확정
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 text-xs text-red-500 hover:text-red-600"
                                  onClick={() => handleReservationStatusChange(reservation.id, 'cancelled')}
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-1" />
                                  취소
                                </Button>
                              </>
                            )}
                            {reservation.status === 'confirmed' && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-xs"
                                onClick={() => handleReservationStatusChange(reservation.id, 'completed')}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                완료
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                내보내기
              </Button>
              <div className="text-sm text-gray-500">
                페이지 1 / 1
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* 교육 과정 탭 */}
        <TabsContent value="courses">
          <Card>
            <CardHeader>
              <CardTitle>교육 과정 관리</CardTitle>
              <CardDescription>
                기관에서 제공하는 교육 과정을 관리합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Settings className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium mb-2">준비 중입니다</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  교육 과정 관리 기능은 현재 개발 중입니다. 곧 이용하실 수 있습니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 기관 설정 탭 */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>기관 설정</CardTitle>
              <CardDescription>
                기관 정보 및 설정을 관리합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium mb-4">기본 정보</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="institute-name">기관명</Label>
                      <Input id="institute-name" value={institute.name} className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="institute-code">기관 코드</Label>
                      <Input id="institute-code" value={institute.code} readOnly className="mt-1 bg-gray-50" />
                      <p className="text-xs text-gray-500 mt-1">
                        기관 코드는 변경할 수 없습니다.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="institute-phone">전화번호</Label>
                      <Input id="institute-phone" value={institute.phone} className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="institute-email">이메일</Label>
                      <Input id="institute-email" value={institute.email} className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="institute-website">웹사이트</Label>
                      <Input id="institute-website" value={institute.website} className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="institute-address">주소</Label>
                      <Input id="institute-address" value={institute.address} className="mt-1" />
                    </div>
                  </div>
                  <div className="mt-6">
                    <Label htmlFor="institute-description">기관 소개</Label>
                    <Textarea id="institute-description" className="mt-1" rows={4} />
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-4">알림 설정</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="notify-new-reservation">새 예약 알림</Label>
                        <p className="text-sm text-gray-500">
                          새로운 예약이 있을 때 이메일로 알림을 받습니다.
                        </p>
                      </div>
                      <div className="flex items-center h-5">
                        <input
                          id="notify-new-reservation"
                          type="checkbox"
                          defaultChecked
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="notify-reservation-changes">예약 변경 알림</Label>
                        <p className="text-sm text-gray-500">
                          예약이 취소 또는 변경될 때 알림을 받습니다.
                        </p>
                      </div>
                      <div className="flex items-center h-5">
                        <input
                          id="notify-reservation-changes"
                          type="checkbox"
                          defaultChecked
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="notify-new-trainer">새 트레이너 알림</Label>
                        <p className="text-sm text-gray-500">
                          새로운 트레이너가 가입할 때 알림을 받습니다.
                        </p>
                      </div>
                      <div className="flex items-center h-5">
                        <input
                          id="notify-new-trainer"
                          type="checkbox"
                          defaultChecked
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-4">위치 서비스 정보</h3>
                  <Alert>
                    <BadgeCheck className="h-4 w-4" />
                    <AlertTitle>테일즈 인증 기관</AlertTitle>
                    <AlertDescription>
                      귀하의 기관은 테일즈 공식 인증을 받았습니다. 위치 서비스에 인증 마크와 함께 노출됩니다.
                    </AlertDescription>
                  </Alert>
                  <div className="mt-4">
                    <Label htmlFor="location-visibility">위치 서비스 노출 여부</Label>
                    <Select defaultValue="visible">
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="visible">노출</SelectItem>
                        <SelectItem value="hidden">비노출</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      위치 서비스에 기관이 노출되는 여부를 설정합니다.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button variant="outline">취소</Button>
              <Button>저장</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 트레이너 추가 모달 */}
      <Dialog open={isAddTrainerModalOpen} onOpenChange={setIsAddTrainerModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>트레이너 초대</DialogTitle>
            <DialogDescription>
              새로운 트레이너를 초대합니다. 트레이너에게 초대 이메일이 발송됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="trainer-name">
                  이름 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="trainer-name"
                  value={newTrainer.name}
                  onChange={(e) => setNewTrainer({...newTrainer, name: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="trainer-email">
                  이메일 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="trainer-email"
                  type="email"
                  value={newTrainer.email}
                  onChange={(e) => setNewTrainer({...newTrainer, email: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="trainer-phone">
                  연락처 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="trainer-phone"
                  value={newTrainer.phone}
                  onChange={(e) => setNewTrainer({...newTrainer, phone: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="trainer-position">직책</Label>
                <Input
                  id="trainer-position"
                  value={newTrainer.position}
                  onChange={(e) => setNewTrainer({...newTrainer, position: e.target.value})}
                  className="mt-1"
                  placeholder="예: 수석 트레이너, 행동교정 전문가"
                />
              </div>
              <div>
                <Label htmlFor="trainer-specialties">전문 분야</Label>
                <Input
                  id="trainer-specialties"
                  value={newTrainer.specialties}
                  onChange={(e) => setNewTrainer({...newTrainer, specialties: e.target.value})}
                  className="mt-1"
                  placeholder="전문 분야를 콤마(,)로 구분하여 입력"
                />
                <p className="text-xs text-gray-500 mt-1">
                  예: 기본 훈련, 공격성 교정, 어질리티
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTrainerModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleInviteTrainer}>초대하기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}