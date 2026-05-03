
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, Clock, MapPin, Star, User, Phone, Mail, Award } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Trainer {
  id: number;
  name: string;
  avatar: string;
  specialty: string[];
  rating: number;
  reviewCount: number;
  location: string;
  experience: string;
  price: number;
  description: string;
  availableSlots: {
    [date: string]: string[];
  };
  certifications: string[];
}

interface Reservation {
  id: number;
  trainerId: number;
  trainerName: string;
  trainerAvatar: string;
  date: string;
  time: string;
  duration: number;
  service: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  petName: string;
  location: string;
  price: number;
  notes: string;
}

const mockTrainers: Trainer[] = [
  {
    id: 1,
    name: '김민수 전문 훈련사',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80',
    specialty: ['기본복종훈련', '행동교정', '퍼피트레이닝'],
    rating: 4.8,
    reviewCount: 127,
    location: '서울시 강남구',
    experience: '5년',
    price: 80000,
    description: '반려견 행동교정 전문가로 5년간 300마리 이상의 강아지를 성공적으로 훈련시킨 경험이 있습니다.',
    availableSlots: {
      '2025-06-10': ['09:00', '10:30', '14:00', '15:30'],
      '2025-06-11': ['09:00', '11:00', '13:00', '16:00'],
      '2025-06-12': ['10:00', '14:00', '15:30', '17:00'],
    },
    certifications: ['KKF 공인 훈련사', '동물행동학 전문가', 'CCPDT 인증']
  },
  {
    id: 2,
    name: '박지연 훈련사',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b494?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80',
    specialty: ['소형견전문', '사회화훈련', '아지리티'],
    rating: 4.9,
    reviewCount: 89,
    location: '서울시 송파구',
    experience: '3년',
    price: 70000,
    description: '소형견 전문 훈련사로 특히 퍼피 클래스와 사회화 훈련에 특화되어 있습니다.',
    availableSlots: {
      '2025-06-10': ['10:00', '11:30', '15:00', '16:30'],
      '2025-06-11': ['09:30', '11:00', '14:00', '15:30'],
      '2025-06-13': ['09:00', '10:30', '13:30', '15:00'],
    },
    certifications: ['소형견 전문 인증', '퍼피 트레이닝 전문가']
  }
];

export default function CourseReservationPage() {
  const { user } = useAuth();
  const [trainers] = useState<Trainer[]>(mockTrainers);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [activeTab, setActiveTab] = useState('book');
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // 예약 폼 상태
  const [bookingForm, setBookingForm] = useState({
    service: '',
    duration: '60',
    petName: '',
    petAge: '',
    petBreed: '',
    notes: '',
    location: 'trainer', // 'trainer' | 'home' | 'center'
    phone: '',
    email: ''
  });

  useEffect(() => {
    if (user) {
      fetchMyReservations();
    }
  }, [user]);

  const fetchMyReservations = async () => {
    try {
      // 목업 데이터
      const mockReservations: Reservation[] = [
        {
          id: 1,
          trainerId: 1,
          trainerName: '김민수 전문 훈련사',
          trainerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80',
          date: '2025-06-15',
          time: '14:00',
          duration: 60,
          service: '기본복종훈련',
          status: 'confirmed',
          petName: '멍멍이',
          location: '서울시 강남구 훈련센터',
          price: 80000,
          notes: '산책 시 리드줄 끌기 문제 개선'
        }
      ];
      setReservations(mockReservations);
    } catch (error) {
      console.error('예약 목록 조회 오류:', error);
    }
  };

  const getAvailableSlots = () => {
    if (!selectedTrainer || !selectedDate) return [];
    
    const dateString = selectedDate.toISOString().split('T')[0];
    return selectedTrainer.availableSlots[dateString] || [];
  };

  const handleBookReservation = async () => {
    if (!selectedTrainer || !selectedDate || !selectedTime) {
      alert('훈련사, 날짜, 시간을 모두 선택해주세요.');
      return;
    }

    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/reservations/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trainerId: selectedTrainer.id,
          date: selectedDate.toISOString().split('T')[0],
          time: selectedTime,
          ...bookingForm
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('예약이 완료되었습니다! 훈련사가 확인 후 연락드리겠습니다.');
        setIsBookingDialogOpen(false);
        setBookingForm({
          service: '',
          duration: '60',
          petName: '',
          petAge: '',
          petBreed: '',
          notes: '',
          location: 'trainer',
          phone: '',
          email: ''
        });
        setSelectedTime('');
        fetchMyReservations();
      } else {
        alert('예약에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('예약 생성 오류:', error);
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = async (reservationId: number) => {
    if (!confirm('예약을 취소하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/reservations/${reservationId}/cancel`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        alert('예약이 취소되었습니다.');
        fetchMyReservations();
      } else {
        alert('예약 취소에 실패했습니다.');
      }
    } catch (error) {
      console.error('예약 취소 오류:', error);
      alert('네트워크 오류가 발생했습니다.');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: '대기중', variant: 'secondary' as const },
      confirmed: { label: '확정', variant: 'default' as const },
      completed: { label: '완료', variant: 'outline' as const },
      cancelled: { label: '취소', variant: 'destructive' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getLocationPrice = () => {
    if (!selectedTrainer) return 0;
    
    const basePrice = selectedTrainer.price;
    const duration = parseInt(bookingForm.duration);
    const locationMultiplier = bookingForm.location === 'home' ? 1.5 : 1;
    
    return Math.round(basePrice * (duration / 60) * locationMultiplier);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">개인 훈련 예약</h1>
        <p className="text-gray-600">전문 훈련사와 1:1 맞춤 훈련을 받아보세요</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="book">예약하기</TabsTrigger>
          <TabsTrigger value="my-reservations">내 예약</TabsTrigger>
        </TabsList>

        <TabsContent value="book" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* 훈련사 목록 */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-semibold mb-4">훈련사 선택</h2>
              <div className="space-y-4">
                {trainers.map((trainer) => (
                  <Card key={trainer.id} className={`cursor-pointer transition-all ${
                    selectedTrainer?.id === trainer.id ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'
                  }`} onClick={() => setSelectedTrainer(trainer)}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={trainer.avatar} alt={trainer.name} />
                          <AvatarFallback>{trainer.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-3">
                          <div>
                            <h3 className="font-semibold text-lg">{trainer.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Star className="h-4 w-4 fill-warning text-warning" />
                              <span className="text-sm font-medium">{trainer.rating}</span>
                              <span className="text-sm text-gray-500">({trainer.reviewCount})</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {trainer.specialty.map((spec, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {trainer.location}
                            </div>
                            <div className="flex items-center gap-1">
                              <Award className="h-4 w-4" />
                              경력 {trainer.experience}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">{trainer.description}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-semibold">{trainer.price.toLocaleString()}원/시간</span>
                            <Button 
                              variant={selectedTrainer?.id === trainer.id ? "default" : "outline"}
                              size="sm"
                            >
                              {selectedTrainer?.id === trainer.id ? "선택됨" : "선택하기"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* 예약 설정 */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>날짜 & 시간 선택</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date() || date > new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
                    className="rounded-md border w-full"
                  />
                  
                  {selectedTrainer && selectedDate && (
                    <div>
                      <Label>이용 가능한 시간</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {getAvailableSlots().map((slot) => (
                          <Button
                            key={slot}
                            variant={selectedTime === slot ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedTime(slot)}
                            className="text-xs"
                          >
                            {slot}
                          </Button>
                        ))}
                      </div>
                      {getAvailableSlots().length === 0 && (
                        <p className="text-sm text-gray-500 mt-2">선택한 날짜에 이용 가능한 시간이 없습니다.</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedTrainer && selectedDate && selectedTime && (
                <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full" size="lg">
                      예약 신청하기
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>예약 신청</DialogTitle>
                      <DialogDescription>
                        {selectedTrainer.name} • {selectedDate.toLocaleDateString()} {selectedTime}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="service">훈련 서비스</Label>
                          <Select value={bookingForm.service} onValueChange={(value) => setBookingForm({...bookingForm, service: value})}>
                            <SelectTrigger>
                              <SelectValue placeholder="서비스 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="basic">기본 복종 훈련</SelectItem>
                              <SelectItem value="behavior">문제행동 교정</SelectItem>
                              <SelectItem value="socialization">사회화 훈련</SelectItem>
                              <SelectItem value="puppy">퍼피 트레이닝</SelectItem>
                              <SelectItem value="advanced">고급 훈련</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="duration">훈련 시간</Label>
                          <Select value={bookingForm.duration} onValueChange={(value) => setBookingForm({...bookingForm, duration: value})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="60">1시간</SelectItem>
                              <SelectItem value="90">1시간 30분</SelectItem>
                              <SelectItem value="120">2시간</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="location">훈련 장소</Label>
                        <Select value={bookingForm.location} onValueChange={(value) => setBookingForm({...bookingForm, location: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trainer">훈련사 센터</SelectItem>
                            <SelectItem value="center">훈련 센터</SelectItem>
                            <SelectItem value="home">방문 훈련 (+50%)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="petName">반려동물 이름</Label>
                          <Input
                            id="petName"
                            value={bookingForm.petName}
                            onChange={(e) => setBookingForm({...bookingForm, petName: e.target.value})}
                            placeholder="이름"
                          />
                        </div>
                        <div>
                          <Label htmlFor="petAge">나이</Label>
                          <Input
                            id="petAge"
                            value={bookingForm.petAge}
                            onChange={(e) => setBookingForm({...bookingForm, petAge: e.target.value})}
                            placeholder="예: 2년"
                          />
                        </div>
                        <div>
                          <Label htmlFor="petBreed">품종</Label>
                          <Input
                            id="petBreed"
                            value={bookingForm.petBreed}
                            onChange={(e) => setBookingForm({...bookingForm, petBreed: e.target.value})}
                            placeholder="품종"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="phone">연락처</Label>
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

                      <div>
                        <Label htmlFor="notes">특이사항 및 요청사항</Label>
                        <Textarea
                          id="notes"
                          value={bookingForm.notes}
                          onChange={(e) => setBookingForm({...bookingForm, notes: e.target.value})}
                          placeholder="훈련 목표나 특별히 요청하고 싶은 내용을 적어주세요"
                          rows={3}
                        />
                      </div>

                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">총 예약 금액</span>
                          <span className="text-xl font-bold">{getLocationPrice().toLocaleString()}원</span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          기본료 {selectedTrainer.price.toLocaleString()}원 × {parseInt(bookingForm.duration) / 60}시간
                          {bookingForm.location === 'home' && ' × 1.5 (방문료 포함)'}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button onClick={() => setIsBookingDialogOpen(false)} variant="outline" className="flex-1">
                          취소
                        </Button>
                        <Button onClick={handleBookReservation} disabled={loading} className="flex-1">
                          {loading ? '예약 중...' : '예약 신청'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="my-reservations" className="space-y-6">
          {!user ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-gray-600">로그인 후 예약 내역을 확인할 수 있습니다.</p>
                <Button className="mt-4" onClick={() => window.location.href = '/auth/login'}>
                  로그인
                </Button>
              </CardContent>
            </Card>
          ) : reservations.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-gray-600">아직 예약한 훈련이 없습니다.</p>
                <Button className="mt-4" onClick={() => setActiveTab('book')}>
                  예약하기
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reservations.map((reservation) => (
                <Card key={reservation.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={reservation.trainerAvatar} alt={reservation.trainerName} />
                          <AvatarFallback>{reservation.trainerName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                          <div>
                            <h3 className="font-semibold">{reservation.trainerName}</h3>
                            <p className="text-sm text-gray-600">{reservation.service}</p>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-4 w-4" />
                              {reservation.date}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {reservation.time} ({reservation.duration}분)
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {reservation.petName}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <MapPin className="h-4 w-4" />
                            {reservation.location}
                          </div>
                          <p className="text-sm text-gray-600 max-w-md">{reservation.notes}</p>
                          <div className="text-lg font-semibold">{reservation.price.toLocaleString()}원</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(reservation.status)}
                        {reservation.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelReservation(reservation.id)}
                          >
                            취소
                          </Button>
                        )}
                        {reservation.status === 'confirmed' && (
                          <Button size="sm">
                            훈련 참여
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
