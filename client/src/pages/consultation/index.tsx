import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Video, MessageCircle, Phone, User, CheckCircle, AlertCircle, Send, Timer } from "lucide-react";

interface Consultation {
  id: string;
  trainerName: string;
  petName: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'in-progress';
  type: 'video' | 'phone' | 'in-person';
  topic: string;
  notes?: string;
}

// 참여하기 버튼 컴포넌트
const JoinButton = ({ consultation, onJoin }: { consultation: Consultation; onJoin: (consultation: Consultation) => void }) => {
  const [timeStatus, setTimeStatus] = useState<'early' | 'ready' | 'active' | 'late'>('early');
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTimeStatus = () => {
      const now = new Date();
      const consultationDateTime = new Date(`${consultation.date} ${consultation.time}`);
      const timeDiff = consultationDateTime.getTime() - now.getTime();
      const minutesDiff = Math.floor(timeDiff / (1000 * 60));

      if (minutesDiff > 15) {
        setTimeStatus('early');
        const hours = Math.floor(minutesDiff / 60);
        const minutes = minutesDiff % 60;
        setTimeLeft(`${hours}시간 ${minutes}분 후`);
      } else if (minutesDiff >= -5) {
        setTimeStatus('ready');
        if (minutesDiff > 0) {
          setTimeLeft(`${minutesDiff}분 후 시작`);
        } else {
          setTimeLeft('진행 중');
        }
      } else if (minutesDiff >= -120) {
        setTimeStatus('active');
        setTimeLeft('진행 중');
      } else {
        setTimeStatus('late');
        setTimeLeft('종료됨');
      }
    };

    updateTimeStatus();
    const interval = setInterval(updateTimeStatus, 60000); // 1분마다 업데이트

    return () => clearInterval(interval);
  }, [consultation.date, consultation.time]);

  const getButtonVariant = () => {
    switch (timeStatus) {
      case 'ready':
      case 'active':
        return 'default';
      case 'early':
        return 'outline';
      case 'late':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getButtonText = () => {
    switch (timeStatus) {
      case 'ready':
      case 'active':
        return '참여하기';
      case 'early':
        return `대기 중 (${timeLeft})`;
      case 'late':
        return '종료됨';
      default:
        return '참여하기';
    }
  };

  const isDisabled = timeStatus === 'early' || timeStatus === 'late';

  return (
    <Button 
      size="sm" 
      variant={getButtonVariant()}
      onClick={() => onJoin(consultation)}
      disabled={isDisabled}
      className={timeStatus === 'ready' || timeStatus === 'active' ? 'animate-pulse' : ''}
    >
      {timeStatus === 'ready' || timeStatus === 'active' ? (
        <Video className="h-4 w-4 mr-1" />
      ) : (
        <Timer className="h-4 w-4 mr-1" />
      )}
      {getButtonText()}
    </Button>
  );
};

export default function ConsultationStatusPage() {
  const { toast } = useToast();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [showPetRegistration, setShowPetRegistration] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [selectedTrainerName, setSelectedTrainerName] = useState('');
  const [messageText, setMessageText] = useState('');
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: '',
    content: '',
    tags: [] as string[]
  });
  
  // 반려동물 관련 상태
  const [pets, setPets] = useState<any[]>([]);
  const [selectedPetId, setSelectedPetId] = useState('');
  const [newPet, setNewPet] = useState({
    name: '',
    age: '',
    breed: '',
    gender: '수컷',
    weight: '',
    description: ''
  });
  
  // 예약 폼 상태
  const [selectedTrainer, setSelectedTrainer] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState('');
  const [consultationType, setConsultationType] = useState<'video' | 'phone' | 'in-person'>('video');
  const [bookingForm, setBookingForm] = useState({
    petName: '',
    petAge: '',
    petBreed: '',
    concerns: '',
    phone: '',
    email: '',
    notes: ''
  });

  useEffect(() => {
    // 상담 데이터 로딩 (현재 날짜 기준으로 설정)
    setTimeout(() => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      
      setConsultations([
        {
          id: '1',
          trainerName: '김훈련사',
          petName: '멍멍이',
          date: tomorrow.toISOString().split('T')[0],
          time: '14:00',
          status: 'scheduled',
          type: 'video',
          topic: '기본 복종 훈련 상담'
        },
        {
          id: '2',
          trainerName: '박전문가',
          petName: '멍멍이',
          date: today.toISOString().split('T')[0],
          time: '10:00',
          status: 'completed',
          type: 'video',
          topic: '분리불안 행동교정',
          notes: '상당한 진전이 있었습니다. 다음 주에 추가 상담 권장.'
        },
        {
          id: '3',
          trainerName: '최예린 행동분석가',
          petName: '멍멍이',
          date: today.toISOString().split('T')[0],
          time: new Date(Date.now() + 30 * 60 * 1000).toTimeString().slice(0, 5), // 30분 후
          status: 'scheduled',
          type: 'video',
          topic: '분리불안 상담'
        }
      ]);
      setLoading(false);
    }, 1000);

    // 반려동물 목록 로딩
    loadPets();
  }, []);

  // 반려동물 목록 로딩
  const loadPets = async () => {
    try {
      const response = await fetch('/api/pets');
      const result = await response.json();
      if (result.success) {
        setPets(result.pets);
      }
    } catch (error) {
      console.error('반려동물 목록 로딩 오류:', error);
    }
  };

  // Click handlers for consultation functionality
  const handleNewConsultation = () => {
    console.log('새 상담 예약 클릭');
    setShowBooking(true);
  };

  const handleViewDetails = (consultation: Consultation) => {
    console.log('상담 상세보기 클릭:', consultation.id);
    setSelectedConsultation(consultation);
    setShowDetails(true);
  };

  const handleJoinConsultation = async (consultation: Consultation) => {
    console.log('상담 참여하기 클릭:', consultation.id);
    
    // 현재 시간과 상담 시간 비교
    const now = new Date();
    const consultationDateTime = new Date(`${consultation.date} ${consultation.time}`);
    const timeDiff = consultationDateTime.getTime() - now.getTime();
    const minutesDiff = Math.floor(timeDiff / (1000 * 60));
    
    // 상담 시간 15분 전부터 참여 가능
    if (minutesDiff > 15) {
      toast({
        title: "아직 참여할 수 없습니다",
        description: `상담 시작 15분 전부터 참여 가능합니다. (${Math.floor(minutesDiff / 60)}시간 ${minutesDiff % 60}분 남음)`,
        variant: "destructive",
      });
      return;
    }
    
    // 상담 시간이 2시간 이상 지났으면 참여 불가
    if (minutesDiff < -120) {
      toast({
        title: "상담 시간이 지났습니다",
        description: "상담 종료 후 2시간이 지나 참여할 수 없습니다.",
        variant: "destructive",
      });
      return;
    }
    
    // 화상상담 참여 로직
    if (consultation.type === 'video') {
      try {
        // 화상수업 시작 및 수수료 정산 API 호출
        const response = await fetch(`/api/consultations/${consultation.id}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: 3 // 현재 사용자 ID (실제로는 인증 상태에서 가져옴)
          })
        });

        const result = await response.json();

        if (result.success) {
          // 수수료 정산 완료 메시지
          if (result.paymentInfo) {
            toast({
              title: "화상상담 시작 및 수수료 정산 완료",
              description: `상담료: ${result.paymentInfo.amount?.toLocaleString()}원, 수수료: ${result.paymentInfo.feeAmount?.toLocaleString()}원, 정산액: ${result.paymentInfo.netAmount?.toLocaleString()}원`,
              duration: 5000,
            });
          } else {
            toast({
              title: "화상상담 연결 중",
              description: `${consultation.trainerName}의 화상상담에 참여합니다.`,
            });
          }

          // 훈련사의 개인 Zoom 링크 가져오기
          let zoomUrl = 'https://zoom.us/j/default';
          
          try {
            const zoomResponse = await fetch(`/api/consultations/${consultation.id}/zoom`);
            const zoomData = await zoomResponse.json();
            
            if (zoomData.success && zoomData.consultation?.zoomUrl) {
              zoomUrl = zoomData.consultation.zoomUrl;
            } else {
              // 기본값 사용 (훈련사별 고정 링크)
              const defaultZoomLinks: { [key: string]: string } = {
                '김훈련사': 'https://zoom.us/j/123456789?pwd=abcd1234',
                '박전문가': 'https://zoom.us/j/987654321?pwd=efgh5678',
                '이준호 어질리티 코치': 'https://zoom.us/j/555666777?pwd=ijkl9012',
                '최예린 행동분석가': 'https://zoom.us/j/111222333?pwd=mnop3456'
              };
              zoomUrl = defaultZoomLinks[consultation.trainerName] || 'https://zoom.us/j/default';
            }
          } catch (zoomError) {
            console.error('Zoom 링크 조회 오류:', zoomError);
            // 기본값 사용
            zoomUrl = 'https://zoom.us/j/default';
          }
          
          // Zoom 앱으로 연결 시도, 실패시 웹 브라우저로 연결
          setTimeout(() => {
            window.open(zoomUrl, '_blank');
          }, 1000);

        } else {
          toast({
            title: "상담 참여 실패",
            description: result.error || "상담 참여 중 오류가 발생했습니다.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('상담 참여 API 오류:', error);
        toast({
          title: "연결 오류",
          description: "서버 연결 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
          variant: "destructive",
        });
      }
      
    } else if (consultation.type === 'phone') {
      alert(`전화상담이 곧 시작됩니다. 연락처: ${consultation.trainerName}`);
    }
  };

  const handleCancelConsultation = (consultationId: string) => {
    console.log('상담 취소 클릭:', consultationId);
    setConsultations(prev => 
      prev.map(c => 
        c.id === consultationId 
          ? { ...c, status: 'cancelled' as const }
          : c
      )
    );
  };

  const handleRescheduleConsultation = (consultationId: string) => {
    console.log('상담 일정 변경 클릭:', consultationId);
    // 일정 변경 모달 또는 페이지로 이동
    setShowBooking(true);
  };

  // 예약 제출 핸들러
  const handleBookingSubmit = async () => {
    if (!selectedTrainer || !selectedDate || !selectedTime || !bookingForm.petName || !bookingForm.phone) {
      toast({
        title: "필수 정보를 입력해주세요",
        description: "훈련사, 날짜, 시간, 반려동물 이름, 연락처는 필수입니다.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/consultation/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trainerId: selectedTrainer,
          date: selectedDate.toISOString().split('T')[0],
          time: selectedTime,
          type: consultationType,
          ...bookingForm
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "상담 예약 완료",
          description: "상담 예약이 성공적으로 접수되었습니다.",
        });
        
        // 폼 초기화
        setSelectedTrainer('');
        setSelectedDate(undefined);
        setSelectedTime('');
        setBookingForm({
          petName: '',
          petAge: '',
          petBreed: '',
          concerns: '',
          phone: '',
          email: '',
          notes: ''
        });
        setShowBooking(false);
        
        // 상담 목록 새로고침
        // TODO: 실제 API 호출로 상담 목록 업데이트
      } else {
        throw new Error(result.error || '예약 실패');
      }
    } catch (error) {
      toast({
        title: "예약 실패",
        description: "상담 예약 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 가능한 훈련사 목록
  const availableTrainers = [
    { id: '1', name: '김민수 전문 훈련사', specialty: '기본 훈련' },
    { id: '2', name: '박지혜 펫 트레이너', specialty: '행동 교정' },
    { id: '3', name: '이준호 어질리티 코치', specialty: '어질리티 훈련' },
    { id: '4', name: '최예린 행동분석가', specialty: '분리불안 치료' },
  ];

  // 가능한 시간대
  const availableTimes = [
    '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'
  ];

  // 반려동물 등록 핸들러
  const handlePetRegistration = async () => {
    if (!newPet.name || !newPet.breed) {
      toast({
        title: "필수 정보를 입력해주세요",
        description: "반려동물 이름과 견종은 필수입니다.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/pets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPet),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "반려동물 등록 완료",
          description: "반려동물이 성공적으로 등록되었습니다.",
        });
        
        // 폼 초기화
        setNewPet({
          name: '',
          age: '',
          breed: '',
          gender: '수컷',
          weight: '',
          description: ''
        });
        setShowPetRegistration(false);
        
        // 반려동물 목록 새로고침
        loadPets();
      } else {
        throw new Error(result.error || '등록 실패');
      }
    } catch (error) {
      toast({
        title: "등록 실패",
        description: "반려동물 등록 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 선택된 반려동물 정보로 폼 자동 입력
  const handlePetSelection = (petId: string) => {
    const selectedPet = pets.find(pet => pet.id.toString() === petId);
    if (selectedPet) {
      setBookingForm({
        ...bookingForm,
        petName: selectedPet.name,
        petAge: selectedPet.age,
        petBreed: selectedPet.breed
      });
    }
    setSelectedPetId(petId);
  };

  // 메시지 모달 열기
  const handleOpenMessage = (trainerName: string) => {
    setSelectedTrainerName(trainerName);
    setShowMessage(true);
  };

  // 메시지 전송
  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      toast({
        title: "메시지를 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: 2, // 훈련사 ID (실제로는 selectedTrainer의 ID 사용)
          content: messageText,
          type: 'text'
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "메시지 전송 완료",
          description: `${selectedTrainerName}에게 메시지를 보냈습니다.`,
        });
        setMessageText('');
        setShowMessage(false);
      } else {
        throw new Error(result.error || '메시지 전송 실패');
      }
    } catch (error) {
      toast({
        title: "메시지 전송 실패",
        description: "메시지 전송 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 리뷰 작성 모달 열기
  const handleWriteReview = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    setShowReview(true);
  };

  // 리뷰 제출
  const handleSubmitReview = async () => {
    if (!reviewForm.title || !reviewForm.content) {
      toast({
        title: "리뷰 제목과 내용을 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consultationId: selectedConsultation?.id,
          trainerName: selectedConsultation?.trainerName,
          rating: reviewForm.rating,
          title: reviewForm.title,
          content: reviewForm.content,
          tags: reviewForm.tags
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "리뷰 작성 완료",
          description: "소중한 후기를 남겨주셔서 감사합니다.",
        });
        setReviewForm({
          rating: 5,
          title: '',
          content: '',
          tags: []
        });
        setShowReview(false);
      } else {
        throw new Error(result.error || '리뷰 작성 실패');
      }
    } catch (error) {
      toast({
        title: "리뷰 작성 실패",
        description: "리뷰 작성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 리뷰 태그 선택
  const toggleReviewTag = (tag: string) => {
    setReviewForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  // 리뷰 태그 옵션
  const reviewTags = [
    '친절함', '전문성', '시간준수', '효과적', '소통 원활', 
    '실력 우수', '추천함', '만족', '재이용 의향', '성과 좋음'
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Clock className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4" />;
      case 'in-progress': return <Video className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return '예정됨';
      case 'completed': return '완료됨';
      case 'cancelled': return '취소됨';
      case 'in-progress': return '진행중';
      default: return '알 수 없음';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'in-person': return <User className="h-4 w-4" />;
      default: return <MessageCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-gray-600">상담 현황을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">내 상담 현황</h1>
          <p className="text-muted-foreground">전문가와의 상담 일정과 이력을 확인하세요</p>
        </div>
        <Button onClick={() => handleNewConsultation()}>
          <Calendar className="h-4 w-4 mr-2" />
          새 상담 예약
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">예정된 상담</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {consultations.filter(c => c.status === 'scheduled').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">완료된 상담</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {consultations.filter(c => c.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번 달 상담</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{consultations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">화상 상담</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {consultations.filter(c => c.type === 'video').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 상담 목록 */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="scheduled">예정됨</TabsTrigger>
          <TabsTrigger value="completed">완료됨</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {consultations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">상담 내역이 없습니다</h3>
                <p className="text-muted-foreground text-center mb-4">
                  전문가와의 첫 상담을 예약해보세요!
                </p>
                <Button>
                  <Calendar className="h-4 w-4 mr-2" />
                  상담 예약하기
                </Button>
              </CardContent>
            </Card>
          ) : (
            consultations.map((consultation) => (
              <Card key={consultation.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{consultation.topic}</h3>
                        <Badge className={getStatusColor(consultation.status)}>
                          {getStatusIcon(consultation.status)}
                          <span className="ml-1">{getStatusText(consultation.status)}</span>
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {consultation.trainerName}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {consultation.date}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {consultation.time}
                        </div>
                        <div className="flex items-center gap-1">
                          {getTypeIcon(consultation.type)}
                          {consultation.type === 'video' ? '화상상담' : 
                           consultation.type === 'phone' ? '전화상담' : '대면상담'}
                        </div>
                      </div>
                      {consultation.notes && (
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                          {consultation.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {consultation.status === 'scheduled' && consultation.type === 'video' && (
                        <JoinButton consultation={consultation} onJoin={handleJoinConsultation} />
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(consultation)}>
                        상세보기
                      </Button>
                      {consultation.status === 'scheduled' && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleRescheduleConsultation(consultation.id)}>
                            수정
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleCancelConsultation(consultation.id)}>
                            취소
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          {consultations.filter(c => c.status === 'scheduled').map((consultation) => (
            <Card key={consultation.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{consultation.topic}</h3>
                      <Badge className="bg-blue-100 text-blue-800">
                        <Clock className="h-4 w-4" />
                        <span className="ml-1">예정됨</span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {consultation.trainerName}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {consultation.date}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {consultation.time}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {consultation.type === 'video' && (
                      <Button size="sm">
                        <Video className="h-4 w-4 mr-1" />
                        참여하기
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      수정
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {consultations.filter(c => c.status === 'completed').map((consultation) => (
            <Card key={consultation.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{consultation.topic}</h3>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-4 w-4" />
                        <span className="ml-1">완료됨</span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {consultation.trainerName}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {consultation.date}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {consultation.time}
                      </div>
                    </div>
                    {consultation.notes && (
                      <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                        {consultation.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      리뷰 작성
                    </Button>
                    <Button variant="outline" size="sm">
                      재예약
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* 상담 예약 모달 */}
      <Dialog open={showBooking} onOpenChange={setShowBooking}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>새 상담 예약</DialogTitle>
            <DialogDescription>
              전문 훈련사와의 상담을 예약하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* 훈련사 선택 */}
            <div className="space-y-2">
              <Label htmlFor="trainer">훈련사 선택</Label>
              <Select value={selectedTrainer} onValueChange={setSelectedTrainer}>
                <SelectTrigger>
                  <SelectValue placeholder="훈련사를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {availableTrainers.map((trainer) => (
                    <SelectItem key={trainer.id} value={trainer.id}>
                      {trainer.name} - {trainer.specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 상담 유형 */}
            <div className="space-y-2">
              <Label>상담 유형</Label>
              <div className="flex gap-4">
                <Button
                  variant={consultationType === 'video' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setConsultationType('video')}
                >
                  <Video className="h-4 w-4 mr-2" />
                  화상상담
                </Button>
                <Button
                  variant={consultationType === 'phone' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setConsultationType('phone')}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  전화상담
                </Button>
                <Button
                  variant={consultationType === 'in-person' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setConsultationType('in-person')}
                >
                  <User className="h-4 w-4 mr-2" />
                  대면상담
                </Button>
              </div>
            </div>

            {/* 날짜 선택 */}
            <div className="space-y-2">
              <Label>날짜 선택</Label>
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date() || date.getDay() === 0} // 과거 날짜와 일요일 비활성화
                className="rounded-md border w-full"
              />
            </div>

            {/* 시간 선택 */}
            {selectedDate && (
              <div className="space-y-2">
                <Label>시간 선택</Label>
                <div className="grid grid-cols-4 gap-2">
                  {availableTimes.map((time) => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTime(time)}
                      className="text-sm"
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      {time}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* 반려동물 정보 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">반려동물 정보</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPetRegistration(true)}
                >
                  새 반려동물 등록
                </Button>
              </div>
              
              {/* 등록된 반려동물 선택 */}
              {pets.length > 0 && (
                <div className="space-y-2">
                  <Label>등록된 반려동물 선택</Label>
                  <Select value={selectedPetId} onValueChange={handlePetSelection}>
                    <SelectTrigger>
                      <SelectValue placeholder="등록된 반려동물을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {pets.map((pet) => (
                        <SelectItem key={pet.id} value={pet.id.toString()}>
                          {pet.name} ({pet.breed}, {pet.age})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="petName">이름 *</Label>
                  <Input
                    id="petName"
                    value={bookingForm.petName}
                    onChange={(e) => setBookingForm({...bookingForm, petName: e.target.value})}
                    placeholder="반려동물 이름"
                  />
                </div>
                <div>
                  <Label htmlFor="petAge">나이</Label>
                  <Input
                    id="petAge"
                    value={bookingForm.petAge}
                    onChange={(e) => setBookingForm({...bookingForm, petAge: e.target.value})}
                    placeholder="예: 2살"
                  />
                </div>
                <div>
                  <Label htmlFor="petBreed">견종</Label>
                  <Input
                    id="petBreed"
                    value={bookingForm.petBreed}
                    onChange={(e) => setBookingForm({...bookingForm, petBreed: e.target.value})}
                    placeholder="예: 골든리트리버"
                  />
                </div>
              </div>
            </div>

            {/* 상담 내용 */}
            <div className="space-y-2">
              <Label htmlFor="concerns">상담하고 싶은 내용</Label>
              <Textarea
                id="concerns"
                value={bookingForm.concerns}
                onChange={(e) => setBookingForm({...bookingForm, concerns: e.target.value})}
                placeholder="어떤 문제나 궁금한 점이 있으신지 자세히 적어주세요"
                rows={3}
              />
            </div>

            {/* 연락처 정보 */}
            <div className="space-y-4">
              <h4 className="font-medium">연락처 정보</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">전화번호 *</Label>
                  <Input
                    id="phone"
                    value={bookingForm.phone}
                    onChange={(e) => setBookingForm({...bookingForm, phone: e.target.value})}
                    placeholder="010-0000-0000"
                  />
                </div>
                <div>
                  <Label htmlFor="email">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    value={bookingForm.email}
                    onChange={(e) => setBookingForm({...bookingForm, email: e.target.value})}
                    placeholder="example@email.com"
                  />
                </div>
              </div>
            </div>

            {/* 추가 요청사항 */}
            <div className="space-y-2">
              <Label htmlFor="notes">추가 요청사항</Label>
              <Textarea
                id="notes"
                value={bookingForm.notes}
                onChange={(e) => setBookingForm({...bookingForm, notes: e.target.value})}
                placeholder="특별한 요청사항이 있으시면 적어주세요"
                rows={2}
              />
            </div>

            {/* 예약 정보 요약 */}
            {selectedTrainer && selectedDate && selectedTime && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium mb-2">예약 정보 확인</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">훈련사:</span> {availableTrainers.find(t => t.id === selectedTrainer)?.name}</p>
                  <p><span className="font-medium">날짜:</span> {selectedDate.toLocaleDateString('ko-KR')}</p>
                  <p><span className="font-medium">시간:</span> {selectedTime}</p>
                  <p><span className="font-medium">상담방식:</span> {
                    consultationType === 'video' ? '화상상담' :
                    consultationType === 'phone' ? '전화상담' : '대면상담'
                  }</p>
                  <p><span className="font-medium">반려동물:</span> {bookingForm.petName}</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setShowBooking(false)}
            >
              취소
            </Button>
            <Button onClick={handleBookingSubmit}>
              <Send className="h-4 w-4 mr-2" />
              예약 신청
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 상담 상세보기 모달 */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>상담 상세 정보</DialogTitle>
            <DialogDescription>
              상담 예약 및 진행 상태를 확인하세요.
            </DialogDescription>
          </DialogHeader>
          {selectedConsultation && (
            <div className="space-y-6 py-4">
              {/* 상담 기본 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">상담 주제</Label>
                    <p className="text-lg font-semibold">{selectedConsultation.topic}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">담당 훈련사</Label>
                    <p className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {selectedConsultation.trainerName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">반려동물</Label>
                    <p>{selectedConsultation.petName}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">예약 날짜</Label>
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(selectedConsultation.date).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long'
                      })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">예약 시간</Label>
                    <p className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {selectedConsultation.time}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">상담 방식</Label>
                    <p className="flex items-center gap-2">
                      {selectedConsultation.type === 'video' && <Video className="h-4 w-4" />}
                      {selectedConsultation.type === 'phone' && <Phone className="h-4 w-4" />}
                      {selectedConsultation.type === 'in-person' && <User className="h-4 w-4" />}
                      {selectedConsultation.type === 'video' ? '화상상담' : 
                       selectedConsultation.type === 'phone' ? '전화상담' : '대면상담'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 상담 상태 */}
              <div className="p-4 bg-muted rounded-lg">
                <Label className="text-sm font-medium text-muted-foreground">상담 상태</Label>
                <div className="flex items-center gap-2 mt-2">
                  {selectedConsultation.status === 'scheduled' && (
                    <>
                      <Clock className="h-5 w-5 text-blue-500" />
                      <Badge className="bg-blue-100 text-blue-800">예정됨</Badge>
                    </>
                  )}
                  {selectedConsultation.status === 'completed' && (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <Badge className="bg-green-100 text-green-800">완료됨</Badge>
                    </>
                  )}
                  {selectedConsultation.status === 'cancelled' && (
                    <>
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      <Badge className="bg-red-100 text-red-800">취소됨</Badge>
                    </>
                  )}
                  {selectedConsultation.status === 'in-progress' && (
                    <>
                      <Video className="h-5 w-5 text-primary" />
                      <Badge className="bg-primary/10 text-primary">진행 중</Badge>
                    </>
                  )}
                </div>
              </div>

              {/* 화상상담 정보 (화상상담인 경우) */}
              {selectedConsultation.type === 'video' && selectedConsultation.status === 'scheduled' && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Label className="text-sm font-medium text-gray-900 dark:text-white">화상상담 접속 정보</Label>
                  <div className="space-y-3 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">미팅 ID:</span>
                      <code className="bg-white dark:bg-gray-800 px-3 py-1 rounded text-sm font-mono text-gray-900 dark:text-gray-100">
                        {selectedConsultation.meetingId || '123 456 789'}
                      </code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">비밀번호:</span>
                      <code className="bg-white dark:bg-gray-800 px-3 py-1 rounded text-sm font-mono text-gray-900 dark:text-gray-100">
                        {selectedConsultation.meetingPassword || 'talez2025'}
                      </code>
                    </div>
                    <div className="flex items-start gap-2 mt-3 p-3 bg-blue-100 dark:bg-blue-800/30 rounded">
                      <Video className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div className="text-xs text-blue-800 dark:text-blue-200">
                        <p className="font-medium text-blue-900 dark:text-blue-100">화상상담 참여 안내</p>
                        <p className="mt-1 text-blue-800 dark:text-blue-200">• 예약 시간 15분 전부터 접속 가능합니다</p>
                        <p className="text-blue-800 dark:text-blue-200">• 안정적인 인터넷 연결을 확인해주세요</p>
                        <p className="text-blue-800 dark:text-blue-200">• 조용한 환경에서 참여를 권장합니다</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 상담 메모 (완료된 상담인 경우) */}
              {selectedConsultation.notes && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">상담 메모</Label>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm">{selectedConsultation.notes}</p>
                  </div>
                </div>
              )}

              {/* 훈련사 정보 */}
              <div className="border-t pt-4">
                <Label className="text-sm font-medium text-muted-foreground">훈련사 정보</Label>
                <div className="flex items-center gap-4 mt-2 p-4 bg-muted rounded-lg">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{selectedConsultation.trainerName}</p>
                    <p className="text-sm text-muted-foreground">전문 반려동물 훈련사</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <div key={star} className="w-3 h-3 text-yellow-400">⭐</div>
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">4.9점 (127개 리뷰)</span>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleOpenMessage(selectedConsultation.trainerName)}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    메시지
                  </Button>
                </div>
              </div>

              {/* 예약 정보 */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">예약 일시</Label>
                  <p className="text-sm">{new Date().toLocaleDateString('ko-KR')} 예약됨</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">예약 번호</Label>
                  <p className="text-sm font-mono">#{selectedConsultation.id.padStart(8, '0')}</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setShowDetails(false)}
            >
              닫기
            </Button>
            {selectedConsultation?.status === 'scheduled' && selectedConsultation.type === 'video' && (
              <JoinButton consultation={selectedConsultation} onJoin={handleJoinConsultation} />
            )}
            {selectedConsultation?.status === 'completed' && (
              <Button 
                variant="outline"
                onClick={() => handleWriteReview(selectedConsultation)}
              >
                리뷰 작성
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 메시지 모달 */}
      <Dialog open={showMessage} onOpenChange={setShowMessage}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedTrainerName}에게 메시지 보내기</DialogTitle>
            <DialogDescription>
              훈련사와 직접 소통하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="messageContent">메시지 내용</Label>
              <Textarea
                id="messageContent"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="궁금한 점이나 요청사항을 자유롭게 작성해주세요"
                rows={4}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setShowMessage(false)}
            >
              취소
            </Button>
            <Button onClick={handleSendMessage}>
              <Send className="h-4 w-4 mr-2" />
              전송
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 리뷰 작성 모달 */}
      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>상담 후기 작성</DialogTitle>
            <DialogDescription>
              {selectedConsultation?.trainerName}와의 상담은 어떠셨나요?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* 별점 */}
            <div className="space-y-2">
              <Label>만족도 평가</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewForm({...reviewForm, rating: star})}
                    className={`text-2xl ${star <= reviewForm.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                  >
                    ⭐
                  </button>
                ))}
                <span className="ml-2 text-sm text-muted-foreground">
                  {reviewForm.rating}점
                </span>
              </div>
            </div>

            {/* 리뷰 제목 */}
            <div>
              <Label htmlFor="reviewTitle">리뷰 제목</Label>
              <Input
                id="reviewTitle"
                value={reviewForm.title}
                onChange={(e) => setReviewForm({...reviewForm, title: e.target.value})}
                placeholder="상담에 대한 한줄 평가를 작성해주세요"
              />
            </div>

            {/* 리뷰 내용 */}
            <div>
              <Label htmlFor="reviewContent">상세 후기</Label>
              <Textarea
                id="reviewContent"
                value={reviewForm.content}
                onChange={(e) => setReviewForm({...reviewForm, content: e.target.value})}
                placeholder="상담 경험을 자세히 공유해주세요. 다른 견주들에게 도움이 됩니다."
                rows={4}
              />
            </div>

            {/* 태그 선택 */}
            <div>
              <Label>추천 태그 (선택사항)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {reviewTags.map((tag) => (
                  <Button
                    key={tag}
                    variant={reviewForm.tags.includes(tag) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleReviewTag(tag)}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            </div>

            {/* 상담 정보 요약 */}
            {selectedConsultation && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">상담 정보</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">주제:</span> {selectedConsultation.topic}</p>
                  <p><span className="font-medium">날짜:</span> {selectedConsultation.date}</p>
                  <p><span className="font-medium">시간:</span> {selectedConsultation.time}</p>
                  <p><span className="font-medium">반려동물:</span> {selectedConsultation.petName}</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setShowReview(false)}
            >
              취소
            </Button>
            <Button onClick={handleSubmitReview}>
              <Send className="h-4 w-4 mr-2" />
              리뷰 작성
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}