import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Clock, Phone, Mail, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function VideoCallReserve() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [serviceType, setServiceType] = useState<string>('');
  const [duration, setDuration] = useState<number>(60);
  const [petName, setPetName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [contactInfo, setContactInfo] = useState({
    phone: '',
    email: '',
    location: ''
  });
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [pricing, setPricing] = useState<{[key: string]: number}>({});
  const [totalPrice, setTotalPrice] = useState<number>(0);

  // URL에서 trainer ID 추출
  const urlParams = new URLSearchParams(window.location.search);
  const trainerId = urlParams.get('trainer') || '1';

  // 폼 상태
  const [formData, setFormData] = useState({
    preferredDate: '',
    preferredTime: '',
    consultationType: 'general',
    petName: '',
    petAge: '',
    petBreed: '',
    concerns: '',
    contactPhone: '',
    contactEmail: '',
    sessionType: 'individual', // individual, group
    groupSize: 1,
    courseId: null as number | null
  });

  // URL 파라미터에서 강의 정보 가져오기
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('courseId');
    const sessionType = urlParams.get('type') || 'individual';
    
    if (courseId) {
      setFormData(prev => ({
        ...prev,
        courseId: parseInt(courseId),
        sessionType: sessionType as 'individual' | 'group'
      }));
    }
  }, [location.search]);

  // 훈련사 정보
  const trainerInfo = {
    id: trainerId,
    name: "김민수 전문 훈련사",
    title: "15년 경력의 반려견 행동 교정 전문가",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80",
    specialties: ["기본훈련", "행동교정", "사회화", "어질리티"],
    rating: 4.9,
    consultationFee: 50000,
    phone: "010-1234-5678",
    email: "trainer1@example.com"
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/consultation/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trainerId: parseInt(trainerId),
          ...formData,
          message: `상담 유형: ${formData.consultationType}, 반려동물: ${formData.petName} (${formData.petBreed}, ${formData.petAge}), 고민사항: ${formData.concerns}`
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "상담 예약 완료",
          description: "상담 예약이 성공적으로 완료되었습니다. 곧 연락드리겠습니다.",
        });
        setLocation('/');
      } else {
        throw new Error('예약 실패');
      }
    } catch (error) {
      toast({
        title: "예약 실패",
        description: "상담 예약 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const consultationTypes = [
    { value: 'general', label: '일반 상담' },
    { value: 'behavior', label: '행동 교정' },
    { value: 'training', label: '기본 훈련' },
    { value: 'socialization', label: '사회화 훈련' },
    { value: 'emergency', label: '응급 상담' }
  ];

  useEffect(() => {
    // URL에서 trainerId 파라미터 가져오기
    const params = new URLSearchParams(location.search);
    const trainerId = params.get('trainer');

    if (trainerId) {
      // 훈련사 정보 로드
      fetchTrainerInfo(trainerId);
      // 가격 정보 로드
      fetchPricing(trainerId);
    }
  }, [location.search]);

  // 선택된 날짜가 변경될 때 예약 가능 시간대 조회
  useEffect(() => {
    if (selectedTrainer && selectedDate) {
      fetchAvailableSlots(selectedTrainer.id, selectedDate);
    }
  }, [selectedTrainer, selectedDate]);

  // 서비스 타입과 duration이 변경될 때 총 가격 계산
  useEffect(() => {
    if (serviceType && duration && pricing[serviceType]) {
      const basePrice = pricing[serviceType];
      const durationMultiplier = duration / 60; // 1시간 기준
      setTotalPrice(Math.round(basePrice * durationMultiplier));
    }
  }, [serviceType, duration, pricing]);

  // 예약 가능 시간대 조회
  const fetchAvailableSlots = async (trainerId: string, date: Date) => {
    try {
      setIsLoadingSlots(true);
      const dateString = date.toISOString().split('T')[0];

      const response = await fetch(`/api/trainers/${trainerId}/available-slots?date=${dateString}`);
      const data = await response.json();

      if (data.success) {
        setAvailableSlots(data.slots || []);
      } else {
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error('시간대 조회 실패:', error);
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  // 가격 정보 조회
  const fetchPricing = async (trainerId: string) => {
    try {
      const response = await fetch(`/api/trainers/${trainerId}/pricing`);
      const data = await response.json();

      if (data.success) {
        setPricing(data.pricing || {
          '기본훈련': 50000,
          '행동교정': 70000,
          '고급훈련': 90000,
          '특수훈련': 120000
        });
      }
    } catch (error) {
      console.error('가격 정보 조회 실패:', error);
      // 기본 가격 설정
      setPricing({
        '기본훈련': 50000,
        '행동교정': 70000,
        '고급훈련': 90000,
        '특수훈련': 120000
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">상담 예약</h1>
        <p className="text-muted-foreground">전문 훈련사와의 1:1 상담을 예약하세요</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 훈련사 정보 */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>담당 훈련사</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={trainerInfo.avatar} alt={trainerInfo.name} />
                  <AvatarFallback>{trainerInfo.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{trainerInfo.name}</h3>
                  <p className="text-sm text-muted-foreground">{trainerInfo.title}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-warning">★</span>
                    <span className="text-sm">{trainerInfo.rating}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">전문 분야</h4>
                <div className="flex flex-wrap gap-1">
                  {trainerInfo.specialties.map((specialty, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4" />
                  <span>{trainerInfo.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4" />
                  <span>{trainerInfo.email}</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">상담료</p>
                  <p className="text-2xl font-bold">{trainerInfo.consultationFee.toLocaleString()}원</p>
                  <p className="text-xs text-muted-foreground">30분 기준</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 예약 폼 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>상담 예약 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 날짜 및 시간 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      희망 날짜
                    </label>
                    <Input
                      type="date"
                      value={formData.preferredDate}
                      onChange={(e) => handleInputChange('preferredDate', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <Clock className="w-4 h-4 inline mr-1" />
                      희망 시간
                    </label>
                    <Input
                      type="time"
                      value={formData.preferredTime}
                      onChange={(e) => handleInputChange('preferredTime', e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* 세션 유형 */}
                <div>
                  <label className="block text-sm font-medium mb-2">세션 유형</label>
                  <select
                    className="w-full p-2 border border-input rounded-md"
                    value={formData.sessionType}
                    onChange={(e) => handleInputChange('sessionType', e.target.value)}
                    required
                  >
                    <option value="individual">1:1 개별 상담</option>
                    <option value="group">단체 화상 수업</option>
                  </select>
                </div>

                {/* 단체 수업 인원 (단체 선택 시만 표시) */}
                {formData.sessionType === 'group' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">참여 인원</label>
                    <select
                      className="w-full p-2 border border-input rounded-md"
                      value={formData.groupSize}
                      onChange={(e) => handleInputChange('groupSize', e.target.value)}
                      required
                    >
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(size => (
                        <option key={size} value={size}>{size}명</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 상담 유형 */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {formData.sessionType === 'group' ? '수업 내용' : '상담 유형'}
                  </label>
                  <select
                    className="w-full p-2 border border-input rounded-md"
                    value={formData.consultationType}
                    onChange={(e) => handleInputChange('consultationType', e.target.value)}
                    required
                  >
                    {consultationTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 반려동물 정보 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">반려동물 정보</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">이름</label>
                      <Input
                        placeholder="반려동물 이름"
                        value={formData.petName}
                        onChange={(e) => handleInputChange('petName', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">나이</label>
                      <Input
                        placeholder="예: 2년 3개월"
                        value={formData.petAge}
                        onChange={(e) => handleInputChange('petAge', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">품종</label>
                      <Input
                        placeholder="예: 골든 리트리버"
                        value={formData.petBreed}
                        onChange={(e) => handleInputChange('petBreed', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* 고민사항 */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <MessageSquare className="w-4 h-4 inline mr-1" />
                    상담 내용 및 고민사항
                  </label>
                  <Textarea
                    placeholder="구체적인 상담 내용이나 고민사항을 자세히 적어주세요..."
                    value={formData.concerns}
                    onChange={(e) => handleInputChange('concerns', e.target.value)}
                    rows={4}
                    required
                  />
                </div>

                {/* 연락처 정보 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">연락처 정보</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <Phone className="w-4 h-4 inline mr-1" />
                        휴대폰 번호
                      </label>
                      <Input
                        type="tel"
                        placeholder="010-0000-0000"
                        value={formData.contactPhone}
                        onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <Mail className="w-4 h-4 inline mr-1" />
                        이메일
                      </label>
                      <Input
                        type="email"
                        placeholder="example@email.com"
                        value={formData.contactEmail}
                        onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* 제출 버튼 */}
                <div className="flex gap-3 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation('/')}
                    className="flex-1"
                  >
                    취소
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? '예약 중...' : '상담 예약하기'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}