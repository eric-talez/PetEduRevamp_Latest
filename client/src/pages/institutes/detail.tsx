import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MapPin, 
  Star, 
  Phone, 
  Clock, 
  Users,
  Building,
  Calendar,
  Award,
  MessageCircle,
  Heart,
  Share
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Trainer {
  id: number;
  name: string;
  avatar: string;
  specialization: string[];
  experience: number;
  rating: number;
  reviewCount: number;
  bio: string;
  certifications: string[];
  availableSlots: string[];
  priceRange: string;
}

interface Institute {
  id: number;
  name: string;
  description: string;
  address: string;
  phone: string;
  website: string;
  rating: number;
  reviewCount: number;
  images: string[];
  facilities: string[];
  services: string[];
  operatingHours: {
    weekday: { open: string; close: string };
    weekend: { open: string; close: string };
  };
  trainers: Trainer[];
  isVerified: boolean;
  establishedYear: number;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface InstituteDetailProps {
  instituteId: string;
}

export default function InstituteDetail({ instituteId }: InstituteDetailProps) {
  const [institute, setInstitute] = useState<Institute | null>(null);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [isCertificationOpen, setIsCertificationOpen] = useState(false);
  const [selectedCertification, setSelectedCertification] = useState<string | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    authorName: '',
    rating: 5,
    content: '',
    trainerName: 'none'
  });
  const [instituteReviews, setInstituteReviews] = useState<any[]>([]);
  const [reservationForm, setReservationForm] = useState({
    name: '',
    phone: '',
    email: '',
    petName: '',
    petBreed: '',
    date: '',
    time: '',
    service: '',
    message: ''
  });
  const { toast } = useToast();

  // 실제 API에서 기관 데이터 가져오기
  useEffect(() => {
    const fetchInstitute = async () => {
      try {
        setIsLoading(true);
        console.log('[InstituteDetail] 기관 ID로 데이터 조회:', instituteId);
        
        const response = await fetch(`/api/institutes/${instituteId}`);
        if (!response.ok) {
          throw new Error('기관 정보를 찾을 수 없습니다.');
        }
        
        const data = await response.json();
        console.log('[InstituteDetail] API 응답 데이터:', data);
        
        // API 데이터를 클라이언트 인터페이스에 맞게 변환
        const transformedInstitute: Institute = {
          id: data.id,
          name: data.name,
          description: data.description || '전문 반려견 교육 기관',
          address: data.address,
          phone: data.phone,
          website: data.website || '',
          rating: data.rating || 4.5,
          reviewCount: data.reviewCount || 0,
          images: data.name === '왕짱스쿨' ? [
            '/images/wangzzang/wangzzang-main.png',
            '/images/wangzzang/wangzzang-trainer.png',
            '/images/wangzzang/wangzzang-facilities.png',
            '/images/wangzzang/wangzzang-facility-1.jpg',
            '/images/wangzzang/wangzzang-facility-2.jpg',
            '/images/wangzzang/wangzzang-facility-3.jpg',
            '/images/wangzzang/wangzzang-facility-4.jpg',
            '/images/wangzzang/wangzzang-facility-5.jpg'
          ] : ['/images/institute-default.jpg'],
          facilities: data.facilities || [],
          services: ['기본 훈련', '사회화 교육', '문제행동 교정'],
          operatingHours: data.operatingHours ? {
            weekday: { 
              open: data.operatingHours.monday?.open || '09:00', 
              close: data.operatingHours.monday?.close || '18:00' 
            },
            weekend: { 
              open: data.operatingHours.saturday?.open || '10:00', 
              close: data.operatingHours.saturday?.close || '17:00' 
            }
          } : {
            weekday: { open: '09:00', close: '18:00' },
            weekend: { open: '10:00', close: '17:00' }
          },
          trainers: data.name === '왕짱스쿨' ? [{
            id: 1,
            name: '강동훈',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=강동훈',
            specialization: ['기본 복종훈련', '사회화 교육', '문제행동 교정'],
            experience: 10,
            rating: 4.9,
            reviewCount: 87,
            bio: '제1회 반려동물행동지도사 국가자격 취득. 구미대학교 반려동물케어과 졸업. 한국펫고협약형 특성화고 자문위원.',
            certifications: ['제1회 반려동물행동지도사 국가자격', 'KKF 홀련사 2급', 'KKF 저먼세퍼드 베젠테스트 어시스턴트'],
            availableSlots: ['평일 09:00-18:00', '토요일 09:00-18:00'],
            priceRange: '5만원-15만원'
          }] : data.trainers || [],
          isVerified: data.isVerified || false,
          establishedYear: 2020,
          coordinates: {
            lat: data.latitude || 37.5665,
            lng: data.longitude || 126.9780
          }
        };
        
        setInstitute(transformedInstitute);
      } catch (error) {
        console.error('[InstituteDetail] 기관 데이터 조회 오류:', error);
        toast({
          title: "오류",
          description: "기관 정보를 불러올 수 없습니다.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        
        // 리뷰 데이터도 함께 로드
        if (transformedInstitute?.id) {
          fetchInstituteReviews();
        }
      }
    };

    if (instituteId) {
      fetchInstitute();
    }
  }, [instituteId, toast]);

  // 샘플 기관 데이터 (fallback용)
  const fallbackInstitute: Institute = {
    id: parseInt(instituteId),
    name: '기관 정보 없음',
    description: '기관 정보를 불러올 수 없습니다.',
    address: '',
    phone: '',
    website: '',
    rating: 0,
    reviewCount: 324,
    images: [
      'https://images.unsplash.com/photo-1544568100-847a948585b9?w=600',
      'https://images.unsplash.com/photo-1560807707-8cc77767d783?w=600',
      'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600'
    ],
    facilities: ['실내 훈련장', '야외 운동장', '개별 상담실', 'CCTV 모니터링', '주차장', '대기실'],
    services: ['기본 훈련', '행동 교정', '사회화 훈련', '어질리티', '그루밍', '호텔링'],
    operatingHours: {
      weekday: { open: '09:00', close: '20:00' },
      weekend: { open: '10:00', close: '18:00' }
    },
    trainers: [
      {
        id: 1,
        name: '김민수',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
        specialization: ['행동 교정', '기본 순종 훈련'],
        experience: 12,
        rating: 4.9,
        reviewCount: 89,
        bio: '동물행동학 석사 출신으로 12년간 1000마리 이상의 반려견을 성공적으로 훈련시킨 경험이 있습니다.',
        certifications: ['KKF 공인 훈련사', '동물행동전문가', 'CCPDT 인증'],
        availableSlots: ['10:00-11:00', '14:00-15:00', '16:00-17:00'],
        priceRange: '80,000원 - 150,000원'
      },
      {
        id: 2,
        name: '박지혜',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b000?w=100',
        specialization: ['소형견 전문', '사회화 훈련'],
        experience: 8,
        rating: 4.7,
        reviewCount: 67,
        bio: '소형견 전문 훈련사로 예민하고 까다로운 소형견들의 행동 교정에 특화되어 있습니다.',
        certifications: ['KKF 공인 훈련사', '소형견 전문가'],
        availableSlots: ['11:00-12:00', '15:00-16:00', '17:00-18:00'],
        priceRange: '70,000원 - 120,000원'
      },
      {
        id: 3,
        name: '이준호',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
        specialization: ['어질리티', '고급 훈련'],
        experience: 15,
        rating: 4.8,
        reviewCount: 123,
        bio: '국제 어질리티 대회 출신으로 경쟁견 훈련 및 고급 스포츠 훈련을 전문으로 합니다.',
        certifications: ['국제 어질리티 심판', 'KKF 마스터 트레이너'],
        availableSlots: ['09:00-10:00', '13:00-14:00', '18:00-19:00'],
        priceRange: '100,000원 - 200,000원'
      }
    ],
    isVerified: true,
    establishedYear: 2003,
    coordinates: { lat: 37.5665, lng: 126.9780 }
  };



  const handleTrainerReservation = (trainer: Trainer) => {
    setSelectedTrainer(trainer);
    setIsReservationOpen(true);
  };

  const handleTrainerContact = async (trainer: Trainer) => {
    try {
      console.log('[Client] 훈련사 문의:', trainer);
      
      const inquiryData = {
        trainerId: trainer.id,
        trainerName: trainer.name,
        name: "사용자", // 실제로는 로그인한 사용자 정보
        contact: "010-0000-0000", // 실제로는 로그인한 사용자 연락처
        message: `${trainer.name} 훈련사님께 문의드립니다.`,
        type: "trainer_contact"
      };

      const response = await fetch(`/api/institutes/${institute?.id}/inquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inquiryData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '문의 접수에 실패했습니다.');
      }

      console.log('[Client] 문의 API 응답:', result);

      toast({
        title: "문의 접수 완료",
        description: `${trainer.name} 훈련사에게 문의가 접수되었습니다.`,
      });

    } catch (error) {
      console.error('문의 접수 실패:', error);
      toast({
        title: "문의 접수 실패",
        description: "문의 접수 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  // 전화 문의 처리
  const handlePhoneInquiry = async () => {
    try {
      console.log('[Client] 전화 문의 처리');
      
      const callData = {
        callerInfo: "사용자", // 실제로는 로그인한 사용자 정보
        purpose: "기관 문의"
      };

      const response = await fetch(`/api/institutes/${institute?.id}/call-inquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(callData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '전화 문의 기록에 실패했습니다.');
      }

      console.log('[Client] 전화 문의 API 응답:', result);

      // 실제 전화 연결
      window.open(`tel:${institute?.phone}`);

      toast({
        title: "전화 연결",
        description: `${institute?.name}로 전화를 연결합니다.`,
      });

    } catch (error) {
      console.error('전화 문의 실패:', error);
      toast({
        title: "전화 연결 실패",
        description: "전화 연결 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  // 메시지 문의 처리
  const handleMessageInquiry = async () => {
    try {
      console.log('[Client] 메시지 문의 처리');
      
      const inquiryData = {
        name: "사용자", // 실제로는 로그인한 사용자 정보
        contact: "010-0000-0000", // 실제로는 로그인한 사용자 연락처
        message: `${institute?.name}에 대해 문의드립니다.`,
        type: "general_inquiry"
      };

      const response = await fetch(`/api/institutes/${institute?.id}/inquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inquiryData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '메시지 문의 접수에 실패했습니다.');
      }

      console.log('[Client] 메시지 문의 API 응답:', result);

      toast({
        title: "메시지 문의 접수 완료",
        description: `${institute?.name}에 메시지 문의가 접수되었습니다.`,
      });

    } catch (error) {
      console.error('메시지 문의 실패:', error);
      toast({
        title: "메시지 문의 실패",
        description: "메시지 문의 접수 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  // 리뷰 작성 처리
  const handleReviewSubmit = async () => {
    try {
      console.log('[Client] 리뷰 작성:', reviewForm);

      // 기본 유효성 검사
      if (!reviewForm.authorName || !reviewForm.content) {
        toast({
          title: "입력 오류",
          description: "필수 정보를 모두 입력해주세요.",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch(`/api/institutes/${institute?.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...reviewForm,
          trainerName: reviewForm.trainerName === 'none' ? '' : reviewForm.trainerName
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '리뷰 등록에 실패했습니다.');
      }

      console.log('[Client] 리뷰 작성 API 응답:', result);

      toast({
        title: "리뷰 등록 완료",
        description: "소중한 후기가 등록되었습니다.",
      });

      // 폼 초기화
      setReviewForm({
        authorName: '',
        rating: 5,
        content: '',
        trainerName: 'none'
      });
      setIsReviewOpen(false);

      // 리뷰 목록 새로고침
      fetchInstituteReviews();

    } catch (error) {
      console.error('리뷰 작성 실패:', error);
      toast({
        title: "리뷰 등록 실패",
        description: "리뷰 등록 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  // 기관 리뷰 조회
  const fetchInstituteReviews = async () => {
    try {
      const response = await fetch(`/api/institutes/${institute?.id}/reviews`);
      const result = await response.json();

      if (response.ok && result.success) {
        setInstituteReviews(result.reviews);
      }
    } catch (error) {
      console.error('리뷰 조회 실패:', error);
    }
  };

  // 실제 평균 평점 계산
  const calculateAverageRating = () => {
    if (instituteReviews.length === 0) return institute?.rating || 0;
    const totalRating = instituteReviews.reduce((sum: number, review: any) => sum + review.rating, 0);
    return (totalRating / instituteReviews.length).toFixed(1);
  };

  // 예약 폼 변경 처리
  const handleReservationFormChange = (field: string, value: string) => {
    setReservationForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 자격증 클릭 처리
  const handleCertificationClick = (certification: string, trainer: Trainer) => {
    setSelectedCertification(certification);
    setSelectedTrainer(trainer);
    setIsCertificationOpen(true);
  };

  // 자격증 정보 데이터
  const getCertificationInfo = (certification: string) => {
    const certificationData: { [key: string]: { description: string; issuer: string; validity: string; requirements: string[] } } = {
      '제1회 반려동물행동지도사 국가자격': {
        description: '반려동물의 행동을 과학적으로 분석하고 문제행동을 교정할 수 있는 국가공인 자격증입니다.',
        issuer: '한국펫산업협회',
        validity: '평생 유효',
        requirements: [
          '반려동물 행동학 이론 교육 이수',
          '실습 교육 40시간 이상',
          '국가자격 검정시험 합격',
          '윤리교육 이수'
        ]
      },
      'KKF 홀련사 2급': {
        description: '한국켄넬클럽에서 인정하는 공식 핸들러 자격증으로 견종별 전문 지식을 갖춘 전문가 증명서입니다.',
        issuer: '한국켄넬클럽 (KKF)',
        validity: '2년 (갱신 가능)',
        requirements: [
          '견종학 이론 교육',
          '핸들링 실기 교육',
          'KKF 공인 심사위원 평가',
          '견종별 특성 이해도 검증'
        ]
      },
      'KKF 저먼세퍼드 베젠테스트 어시스턴트': {
        description: '저먼셰퍼드의 성격 및 능력 평가를 위한 베젠테스트 보조 업무를 수행할 수 있는 전문 자격증입니다.',
        issuer: '한국켄넬클럽 (KKF)',
        validity: '3년 (갱신 가능)',
        requirements: [
          '저먼셰퍼드 전문 지식',
          '베젠테스트 이론 교육',
          '현장 실습 20회 이상',
          '전문 심사위원 인증'
        ]
      },
      'KKF 공인 훈련사': {
        description: '한국켄넬클럽에서 공인하는 반려견 훈련 전문가 자격증으로 체계적인 훈련 프로그램을 제공할 수 있습니다.',
        issuer: '한국켄넬클럽 (KKF)',
        validity: '3년 (갱신 가능)',
        requirements: [
          '반려견 훈련학 이론',
          '실기 시험 통과',
          '훈련 경력 1년 이상',
          '윤리강령 준수 서약'
        ]
      },
      '동물행동전문가': {
        description: '동물의 행동 패턴을 분석하고 문제행동을 해결할 수 있는 전문가 자격증입니다.',
        issuer: '한국동물행동학회',
        validity: '5년 (갱신 가능)',
        requirements: [
          '동물행동학 석사 이상 또는 동등 경력',
          '임상 경험 100시간 이상',
          '사례 연구 발표',
          '전문가 추천서'
        ]
      },
      'CCPDT 인증': {
        description: '국제적으로 인정받는 반려견 훈련사 자격증으로 과학적 훈련 방법론을 기반으로 합니다.',
        issuer: 'Certification Council for Professional Dog Trainers',
        validity: '3년 (갱신 필요)',
        requirements: [
          '300시간 이상 훈련 경험',
          '온라인 시험 통과',
          '지속적인 교육 이수',
          '윤리 규정 준수'
        ]
      },
      '소형견 전문가': {
        description: '소형견의 특성을 이해하고 전문적인 훈련과 케어를 제공할 수 있는 전문가 자격증입니다.',
        issuer: '소형견전문가협회',
        validity: '2년 (갱신 가능)',
        requirements: [
          '소형견 특성 이론 교육',
          '소형견 핸들링 실습',
          '응급처치 교육',
          '실무 경험 6개월 이상'
        ]
      },
      '국제 어질리티 심판': {
        description: '국제 규격의 어질리티 경기를 심판할 수 있는 공인 자격증입니다.',
        issuer: '국제애견연맹 (FCI)',
        validity: '5년 (갱신 가능)',
        requirements: [
          '어질리티 이론 및 규정 숙지',
          '심판 실습 50회 이상',
          '국제 규격 인증',
          '영어 의사소통 가능'
        ]
      },
      'KKF 마스터 트레이너': {
        description: '한국켄넬클럽 최고 등급의 훈련사 자격증으로 전문 훈련사 양성도 가능한 마스터급 자격증입니다.',
        issuer: '한국켄넬클럽 (KKF)',
        validity: '평생 유효',
        requirements: [
          'KKF 공인 훈련사 경력 5년 이상',
          '마스터 과정 이수',
          '후진 양성 실적',
          '특별 심사 통과'
        ]
      }
    };

    return certificationData[certification] || {
      description: '전문적인 반려견 관련 자격증입니다.',
      issuer: '공인 기관',
      validity: '자격증에 따라 상이',
      requirements: ['해당 기관의 교육 과정 이수', '시험 합격', '실무 경험']
    };
  };

  // 예약 제출 처리
  const handleReservationSubmit = async () => {
    try {
      // 폼 유효성 검사
      if (!reservationForm.name || !reservationForm.phone || !reservationForm.date || !reservationForm.time) {
        toast({
          title: "입력 오류",
          description: "필수 정보를 모두 입력해주세요.",
          variant: "destructive"
        });
        return;
      }

      // 예약 데이터 구성
      const reservationData = {
        trainerId: selectedTrainer?.id,
        trainerName: selectedTrainer?.name,
        instituteName: institute?.name,
        ...reservationForm
      };

      console.log('[Client] 예약 API 호출:', reservationData);

      // 실제 API 호출
      const response = await fetch(`/api/institutes/${institute?.id}/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reservationData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '예약 생성에 실패했습니다.');
      }

      console.log('[Client] 예약 API 응답:', result);

      toast({
        title: "예약 완료",
        description: `${selectedTrainer?.name} 훈련사와의 예약이 완료되었습니다. 곧 연락드리겠습니다.`,
      });

      // 폼 초기화 및 팝업 닫기
      setReservationForm({
        name: '',
        phone: '',
        email: '',
        petName: '',
        petBreed: '',
        date: '',
        time: '',
        service: '',
        message: ''
      });
      setIsReservationOpen(false);
      setSelectedTrainer(null);

    } catch (error) {
      toast({
        title: "예약 실패",
        description: "예약 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded-lg mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
              <div className="h-48 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="space-y-6">
              <div className="h-48 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!institute) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl text-center">
        <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-600 mb-2">기관을 찾을 수 없습니다</h2>
        <p className="text-gray-500">요청하신 기관 정보가 존재하지 않습니다.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* 헤더 이미지 */}
      <div className="relative rounded-xl overflow-hidden mb-8">
        <img
          src={institute.images[0]}
          alt={institute.name}
          className="w-full h-64 md:h-80 object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute bottom-4 left-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold">{institute.name}</h1>
            {institute.isVerified && (
              <Badge className="bg-primary">테일즈 인증 기관</Badge>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Star className="h-5 w-5 fill-warning text-warning" />
              <span className="font-medium">{calculateAverageRating()}</span>
              <span className="text-gray-300">({instituteReviews.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{institute.address}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 메인 컨텐츠 */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">개요</TabsTrigger>
              <TabsTrigger value="trainers">훈련사</TabsTrigger>
              <TabsTrigger value="facilities">시설</TabsTrigger>
              <TabsTrigger value="reviews">후기</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>기관 소개</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-6">{institute.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">제공 서비스</h4>
                      <div className="space-y-2">
                        {institute.services.map((service, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-primary rounded-full" />
                            <span className="text-sm">{service}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-3">운영 시간</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>평일:</span>
                          <span>{institute.operatingHours.weekday.open} - {institute.operatingHours.weekday.close}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>주말:</span>
                          <span>{institute.operatingHours.weekend.open} - {institute.operatingHours.weekend.close}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 빠른 예약 섹션 */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    빠른 예약
                  </CardTitle>
                  <CardDescription>
                    원하는 훈련사를 선택하여 바로 예약하세요.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {institute.trainers.slice(0, 2).map((trainer) => (
                      <Button
                        key={trainer.id}
                        variant="outline"
                        className="p-4 h-auto justify-start hover:bg-primary/5 hover:border-primary/50 transition-all duration-200 group"
                        onClick={() => handleTrainerReservation(trainer)}
                      >
                        <Avatar className="w-12 h-12 mr-4 border-2 border-gray-200 group-hover:border-primary/30 transition-colors">
                          <AvatarImage src={trainer.avatar} />
                          <AvatarFallback className="text-sm font-medium">{trainer.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{trainer.name} 훈련사</span>
                          <span className="text-sm text-gray-500 group-hover:text-primary/70 transition-colors">
                            경력 {trainer.experience}년 · ⭐ {trainer.rating}
                          </span>
                        </div>
                        <Calendar className="h-5 w-5 ml-auto text-gray-400 group-hover:text-primary transition-colors" />
                      </Button>
                    ))}
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full mt-4 bg-gradient-to-r from-primary/5 to-secondary/5 hover:from-primary/10 hover:to-secondary/10 border-primary/20 hover:border-primary/40 text-primary hover:text-primary/90 font-medium transition-all duration-200"
                    onClick={() => setActiveTab('trainers')}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    모든 훈련사 보기
                  </Button>

                  <div className="bg-primary/10 p-3 rounded-lg text-sm text-primary mt-4">
                    <div className="font-medium mb-1">📍 예약 안내</div>
                    <ul className="space-y-1 text-xs">
                      <li>• 예약 신청 후 24시간 내 훈련사가 직접 연락드립니다</li>
                      <li>• 첫 상담은 무료로 진행됩니다</li>
                      <li>• 예약 변경은 최소 24시간 전에 연락주세요</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trainers" className="mt-6">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">소속 훈련사 ({institute.trainers.length}명)</h3>
                </div>
                
                {institute.trainers.map((trainer) => (
                  <Card key={trainer.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-shrink-0">
                          <Avatar className="w-24 h-24">
                            <AvatarImage src={trainer.avatar} alt={trainer.name} />
                            <AvatarFallback>{trainer.name[0]}</AvatarFallback>
                          </Avatar>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="text-xl font-semibold">{trainer.name}</h4>
                              <p className="text-gray-600">경력 {trainer.experience}년</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-warning text-warning" />
                              <span className="font-medium">{trainer.rating}</span>
                              <span className="text-gray-500 text-sm">({trainer.reviewCount})</span>
                            </div>
                          </div>
                          
                          <p className="text-gray-700 mb-4">{trainer.bio}</p>
                          
                          <div className="mb-4">
                            <h5 className="font-medium mb-2">전문 분야</h5>
                            <div className="flex flex-wrap gap-2">
                              {trainer.specialization.map((spec, index) => (
                                <Badge key={index} variant="secondary">{spec}</Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div className="mb-4">
                            <h5 className="font-medium mb-2">자격증</h5>
                            <div className="flex flex-wrap gap-2">
                              {trainer.certifications.map((cert, index) => (
                                <Badge 
                                  key={index} 
                                  variant="outline" 
                                  className="cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-colors"
                                  onClick={() => handleCertificationClick(cert, trainer)}
                                >
                                  {cert}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">가격대</p>
                              <p className="font-medium">{trainer.priceRange}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTrainerContact(trainer)}
                              >
                                <MessageCircle className="h-4 w-4 mr-1" />
                                문의
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleTrainerReservation(trainer)}
                              >
                                <Calendar className="h-4 w-4 mr-1" />
                                예약하기
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="facilities" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>시설 안내</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {institute.facilities.map((facility, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                        <Building className="h-5 w-5 text-primary" />
                        <span>{facility}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {institute.images.slice(1).map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`시설 이미지 ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>이용 후기</CardTitle>
                    <CardDescription>실제 이용자들의 생생한 후기를 확인하세요.</CardDescription>
                  </div>
                  <Button onClick={() => setIsReviewOpen(true)}>
                    <Star className="h-4 w-4 mr-2" />
                    후기 작성
                  </Button>
                </CardHeader>
                <CardContent>
                  {instituteReviews.length > 0 ? (
                    <div className="space-y-6">
                      {instituteReviews.map((review) => (
                        <div key={review.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{review.authorName}</h4>
                              {review.trainerName && (
                                <Badge variant="outline" className="text-xs">
                                  {review.trainerName} 훈련사
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star 
                                  key={star} 
                                  className={`h-4 w-4 ${
                                    star <= review.rating 
                                      ? 'fill-warning text-warning' 
                                      : 'text-gray-300'
                                  }`} 
                                />
                              ))}
                              <span className="text-sm text-gray-500 ml-1">
                                {new Date(review.createdAt).toLocaleDateString('ko-KR')}
                              </span>
                            </div>
                          </div>
                          <p className="text-gray-700 leading-relaxed">{review.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">아직 등록된 후기가 없습니다.</p>
                      <p className="text-gray-500">첫 번째 후기를 남겨보세요!</p>
                      <Button 
                        className="mt-4" 
                        onClick={() => setIsReviewOpen(true)}
                      >
                        <Star className="h-4 w-4 mr-2" />
                        후기 작성하기
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* 사이드바 */}
        <div className="space-y-6">
          {/* 연락처 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>연락처 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <span>{institute.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <span className="text-sm">{institute.address}</span>
              </div>
              <div className="flex items-center gap-3">
                <Building className="h-5 w-5 text-gray-400" />
                <span className="text-sm">설립: {institute.establishedYear}년</span>
              </div>
              
              <div className="pt-4 space-y-2">
                <Button 
                  className="w-full"
                  onClick={handlePhoneInquiry}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  전화 문의
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleMessageInquiry}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  메시지 문의
                </Button>
              </div>
            </CardContent>
          </Card>



          {/* 기관 통계 */}
          <Card>
            <CardHeader>
              <CardTitle>기관 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">소속 훈련사</span>
                <span className="font-medium">{institute.trainers.length}명</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">평균 평점</span>
                <span className="font-medium">{calculateAverageRating()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">후기 수</span>
                <span className="font-medium">{instituteReviews.length}개</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">설립년도</span>
                <span className="font-medium">{institute.establishedYear}년</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 예약 팝업 */}
      <Dialog open={isReservationOpen} onOpenChange={setIsReservationOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={selectedTrainer?.avatar} />
                <AvatarFallback>{selectedTrainer?.name?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold">{selectedTrainer?.name} 훈련사 예약</div>
                <div className="text-sm text-gray-500 font-normal">{institute?.name}</div>
              </div>
            </DialogTitle>
            <DialogDescription>
              예약에 필요한 정보를 입력해주세요. 입력하신 정보를 바탕으로 훈련사가 직접 연락드립니다.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">보호자 성함 *</Label>
                <Input
                  id="name"
                  value={reservationForm.name}
                  onChange={(e) => handleReservationFormChange('name', e.target.value)}
                  placeholder="홍길동"
                />
              </div>
              <div>
                <Label htmlFor="phone">연락처 *</Label>
                <Input
                  id="phone"
                  value={reservationForm.phone}
                  onChange={(e) => handleReservationFormChange('phone', e.target.value)}
                  placeholder="010-1234-5678"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={reservationForm.email}
                onChange={(e) => handleReservationFormChange('email', e.target.value)}
                placeholder="example@email.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="petName">반려견 이름</Label>
                <Input
                  id="petName"
                  value={reservationForm.petName}
                  onChange={(e) => handleReservationFormChange('petName', e.target.value)}
                  placeholder="멍멍이"
                />
              </div>
              <div>
                <Label htmlFor="petBreed">견종</Label>
                <Input
                  id="petBreed"
                  value={reservationForm.petBreed}
                  onChange={(e) => handleReservationFormChange('petBreed', e.target.value)}
                  placeholder="골든리트리버"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">희망 날짜 *</Label>
                <Input
                  id="date"
                  type="date"
                  value={reservationForm.date}
                  onChange={(e) => handleReservationFormChange('date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label htmlFor="time">희망 시간 *</Label>
                <Select value={reservationForm.time} onValueChange={(value) => handleReservationFormChange('time', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="시간 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="09:00">09:00</SelectItem>
                    <SelectItem value="10:00">10:00</SelectItem>
                    <SelectItem value="11:00">11:00</SelectItem>
                    <SelectItem value="13:00">13:00</SelectItem>
                    <SelectItem value="14:00">14:00</SelectItem>
                    <SelectItem value="15:00">15:00</SelectItem>
                    <SelectItem value="16:00">16:00</SelectItem>
                    <SelectItem value="17:00">17:00</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="service">희망 서비스</Label>
              <Select value={reservationForm.service} onValueChange={(value) => handleReservationFormChange('service', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="서비스 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="기본 훈련">기본 훈련</SelectItem>
                  <SelectItem value="문제행동 교정">문제행동 교정</SelectItem>
                  <SelectItem value="사회화 교육">사회화 교육</SelectItem>
                  <SelectItem value="정서안정 교육">정서안정 교육</SelectItem>
                  <SelectItem value="상담">상담</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="message">추가 요청사항</Label>
              <Textarea
                id="message"
                value={reservationForm.message}
                onChange={(e) => handleReservationFormChange('message', e.target.value)}
                placeholder="반려견의 특이사항이나 훈련 목적 등을 자세히 적어주세요."
                rows={3}
              />
            </div>

            <div className="bg-primary/10 p-3 rounded-lg text-sm text-primary">
              <div className="font-medium mb-1">📍 예약 안내</div>
              <ul className="space-y-1 text-xs">
                <li>• 예약 신청 후 24시간 내 훈련사가 직접 연락드립니다</li>
                <li>• 첫 상담은 무료로 진행됩니다</li>
                <li>• 예약 변경은 최소 24시간 전에 연락주세요</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsReservationOpen(false)} className="flex-1">
              취소
            </Button>
            <Button onClick={handleReservationSubmit} className="flex-1">
              <Calendar className="h-4 w-4 mr-2" />
              예약 신청
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 자격증 정보 팝업 */}
      <Dialog open={isCertificationOpen} onOpenChange={setIsCertificationOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Award className="h-6 w-6 text-primary" />
              <div>
                <div className="font-semibold">{selectedCertification}</div>
                <div className="text-sm text-gray-500 font-normal">자격증 상세 정보</div>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedCertification && (
            <div className="space-y-6 py-4">
              {(() => {
                const certInfo = getCertificationInfo(selectedCertification);
                return (
                  <>
                    {/* 자격증 설명 */}
                    <div className="bg-primary/10 p-4 rounded-lg">
                      <h4 className="font-medium text-primary mb-2">자격증 개요</h4>
                      <p className="text-primary text-sm leading-relaxed">
                        {certInfo.description}
                      </p>
                    </div>

                    {/* 발급 기관 정보 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          발급 기관
                        </h4>
                        <p className="text-gray-700 text-sm">{certInfo.issuer}</p>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          유효 기간
                        </h4>
                        <p className="text-gray-700 text-sm">{certInfo.validity}</p>
                      </div>
                    </div>

                    {/* 취득 요건 */}
                    <div className="bg-success/10 p-4 rounded-lg">
                      <h4 className="font-medium text-success mb-3 flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        취득 요건
                      </h4>
                      <ul className="space-y-2">
                        {certInfo.requirements.map((requirement, index) => (
                          <li key={index} className="flex items-start gap-2 text-success text-sm">
                            <span className="w-1.5 h-1.5 bg-success rounded-full mt-2 flex-shrink-0"></span>
                            <span>{requirement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 신뢰도 지표 */}
                    <div className="bg-warning/10 p-4 rounded-lg">
                      <h4 className="font-medium text-warning mb-2 flex items-center gap-2">
                        <Star className="h-4 w-4" />
                        자격증 신뢰도
                      </h4>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            className={`h-4 w-4 ${
                              (selectedCertification?.includes('국가자격') || 
                               selectedCertification?.includes('KKF') ||
                               selectedCertification?.includes('CCPDT') ||
                               selectedCertification?.includes('FCI')) 
                                ? 'fill-warning text-warning' 
                                : star <= 4 ? 'fill-warning text-warning' : 'text-gray-300'
                            }`} 
                          />
                        ))}
                        <span className="text-sm text-warning ml-2">
                          {(selectedCertification?.includes('국가자격') || 
                            selectedCertification?.includes('KKF') ||
                            selectedCertification?.includes('CCPDT') ||
                            selectedCertification?.includes('FCI')) 
                             ? '공인 인증 기관' : '업계 인정 자격증'}
                        </span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsCertificationOpen(false)} className="flex-1">
              닫기
            </Button>
            <Button className="flex-1" onClick={() => {
              setIsCertificationOpen(false);
              // 해당 훈련사에게 문의하기
              if (selectedTrainer) {
                handleTrainerContact(selectedTrainer);
              }
            }}>
              <MessageCircle className="h-4 w-4 mr-2" />
              훈련사에게 문의하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 리뷰 작성 팝업 */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Star className="h-6 w-6 text-warning" />
              <div>
                <div className="font-semibold">후기 작성</div>
                <div className="text-sm text-gray-500 font-normal">{institute?.name}</div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="authorName">작성자명 *</Label>
              <Input
                id="authorName"
                value={reviewForm.authorName}
                onChange={(e) => setReviewForm(prev => ({ ...prev, authorName: e.target.value }))}
                placeholder="이름을 입력하세요"
                className="mt-1"
              />
            </div>

            <div>
              <Label>평점 *</Label>
              <div className="flex items-center gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star}
                    className={`h-6 w-6 cursor-pointer transition-colors ${
                      star <= reviewForm.rating 
                        ? 'fill-warning text-warning' 
                        : 'text-gray-300 hover:text-warning/70'
                    }`}
                    onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                  />
                ))}
                <span className="text-sm text-gray-600 ml-2">
                  {reviewForm.rating}점
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="trainerName">담당 훈련사 (선택사항)</Label>
              <Select
                value={reviewForm.trainerName}
                onValueChange={(value) => setReviewForm(prev => ({ ...prev, trainerName: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="훈련사를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">선택 안함</SelectItem>
                  {institute?.trainers.map((trainer) => (
                    <SelectItem key={trainer.id} value={trainer.name}>
                      {trainer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="content">후기 내용 *</Label>
              <Textarea
                id="content"
                value={reviewForm.content}
                onChange={(e) => setReviewForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="이용 후기를 자세히 작성해주세요..."
                rows={4}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsReviewOpen(false)} className="flex-1">
              취소
            </Button>
            <Button onClick={handleReviewSubmit} className="flex-1">
              <Star className="h-4 w-4 mr-2" />
              후기 등록
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}