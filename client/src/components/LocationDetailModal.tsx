import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Star, 
  Phone, 
  Clock, 
  Navigation, 
  Heart,
  Share2,
  Calendar,
  Users,
  Award,
  MessageCircle,
  ExternalLink,
  Camera,
  Wifi,
  Car,
  CreditCard,
  Shield,
  X,
  UserCheck
} from 'lucide-react';
import { TrainerConsultationModal } from './TrainerConsultationModal';

interface LocationItem {
  id: number;
  name: string;
  type: 'training' | 'grooming' | 'hospital' | 'hotel' | 'daycare' | 'park';
  address: string;
  phone: string;
  rating: number;
  reviewCount: number;
  distance: number;
  operatingHours: {
    open: string;
    close: string;
  };
  services: string[];
  priceRange: string;
  isPartner: boolean;
  description: string;
  image: string;
  gallery?: string[];
  amenities?: string[];
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface LocationDetailModalProps {
  location: LocationItem;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onReservation: (locationId: number) => void;
}

export function LocationDetailModal({ location, isOpen, onOpenChange, onReservation }: LocationDetailModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isFavorite, setIsFavorite] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showTrainerConsultation, setShowTrainerConsultation] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [institutionTrainers, setInstitutionTrainers] = useState([]);
  const [loadingTrainers, setLoadingTrainers] = useState(false);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'training': return '🎓';
      case 'grooming': return '✂️';
      case 'hospital': return '🏥';
      case 'hotel': return '🏨';
      case 'daycare': return '💖';
      case 'park': return '🌳';
      default: return '📍';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'training': return '훈련소';
      case 'grooming': return '미용실';
      case 'hospital': return '동물병원';
      case 'hotel': return '펜션/호텔';
      case 'daycare': return '위탁관리';
      case 'park': return '놀이공원';
      default: return '기타';
    }
  };

  const handleFavoriteToggle = () => {
    setIsFavorite(!isFavorite);
    console.log('즐겨찾기 토글:', location.name, !isFavorite);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: location.name,
        text: location.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      console.log('링크 복사됨');
    }
  };

  const handleDirections = () => {
    const url = `https://map.kakao.com/link/to/${location.name},${location.coordinates?.lat || 37.5665},${location.coordinates?.lng || 126.9780}`;
    window.open(url, '_blank');
    console.log('길찾기 실행:', location.name);
  };

  const handleCall = () => {
    window.open(`tel:${location.phone}`, '_self');
    console.log('전화 연결:', location.phone);
  };

  // 기관 소속 훈련사 정보 가져오기
  const fetchInstitutionTrainers = async () => {
    if (location.type !== 'training') return;
    
    setLoadingTrainers(true);
    try {
      // 실제 구현에서는 API 호출: `/api/locations/${location.id}/trainers`
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // 기관별 실제 소속 훈련사 데이터
      const trainersData = {
        1: [ // 서울 펫 트레이닝 센터
          {
            id: 1,
            name: '김민수 수석 훈련사',
            position: '수석 훈련사',
            specialty: ['기본 복종 훈련', '사회화 훈련', '어질리티', '공격성 교정'],
            experience: '10년+',
            rating: 4.9,
            reviews: 156,
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
            bio: '서울 펫 트레이닝 센터의 수석 훈련사로 10년 이상의 풍부한 경험을 보유하고 있습니다. 특히 문제행동 교정과 기본 복종훈련 분야에서 탁월한 실력을 인정받고 있으며, 수많은 반려견들의 행동 개선에 성공했습니다.',
            certifications: ['국제 반려견 훈련사 자격증', 'KKF 공인 훈련사', '동물행동학 학사', 'CCPDT 인증'],
            institutionRole: '수석 훈련사 및 교육팀장',
            joinDate: '2014-03-01',
            successStories: 156,
            availableSlots: {
              '2025-06-26': ['10:00', '14:00', '16:00'],
              '2025-06-27': ['09:00', '11:00', '15:00'],
              '2025-06-28': ['10:30', '13:30', '16:30']
            },
            achievements: [
              '전국 훈련사 대회 1위 (2023)',
              '우수 훈련사 상 수상 (2022)',
              '반려견 행동교정 전문가 인증',
              '서울시 모범 훈련사 표창 (2021)'
            ],
            consultationPrice: '60,000원',
            trainingPrice: '100,000원 - 150,000원'
          },
          {
            id: 2,
            name: '박지혜 행동교정 전문가',
            position: '선임 행동교정사',
            specialty: ['행동 교정', '분리불안 치료', '공격성 교정', '사회화 훈련'],
            experience: '8년+',
            rating: 4.8,
            reviews: 132,
            avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b4c0?w=400',
            bio: '동물행동학 석사 학위를 보유한 전문가로, 서울 펫 트레이닝 센터에서 행동교정 분야를 담당하고 있습니다. 특히 분리불안, 공격성 등 복잡한 문제행동 해결에 특화되어 있으며, 개별 맞춤형 치료 프로그램을 제공합니다.',
            certifications: ['동물행동학 석사', 'CCPDT 공인 훈련사', '반려동물 심리상담사', '행동치료 전문가'],
            institutionRole: '행동교정팀 리더',
            joinDate: '2016-06-01',
            successStories: 98,
            availableSlots: {
              '2025-06-26': ['11:00', '15:00'],
              '2025-06-27': ['10:00', '14:00', '16:00'],
              '2025-06-29': ['09:30', '13:00', '15:30']
            },
            achievements: [
              '행동교정 전문가 인증 (2021)',
              '우수 상담사 표창 (2023)',
              '반려견 심리치료 연구논문 발표',
              '분리불안 치료 성공률 95% 달성'
            ],
            consultationPrice: '70,000원',
            trainingPrice: '120,000원 - 180,000원'
          },
          {
            id: 3,
            name: '이준호 어질리티 코치',
            position: '스포츠 훈련 전문가',
            specialty: ['어질리티 훈련', '스포츠 훈련', '체력 증진', '경기견 훈련'],
            experience: '12년+',
            rating: 4.9,
            reviews: 89,
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
            bio: '서울 펫 트레이닝 센터의 스포츠 훈련 전문가로, 반려견 어질리티와 각종 스포츠 분야에서 12년간의 경험을 쌓았습니다. 국제 대회 출전견들을 지도한 경력이 있으며, 일반 반려견들의 건강한 운동과 체력 증진을 위한 프로그램도 운영합니다.',
            certifications: ['국제 어질리티 심판 자격증', '반려견 스포츠 코치', '체육학 학사', '펫 피트니스 전문가'],
            institutionRole: '스포츠훈련팀 코치',
            joinDate: '2012-09-01',
            successStories: 67,
            availableSlots: {
              '2025-06-26': ['09:00', '13:00', '17:00'],
              '2025-06-28': ['10:00', '14:00'],
              '2025-06-30': ['11:00', '15:00', '16:30']
            },
            achievements: [
              '전국 어질리티 대회 지도자상 (2022)',
              '올림픽 어질리티 코치 경력',
              '국제 대회 우승견 배출 다수',
              '어질리티 코치 양성 프로그램 개발'
            ],
            consultationPrice: '80,000원',
            trainingPrice: '130,000원 - 200,000원'
          }
        ],
        2: [ // 프리미엄 펫 그루밍 (미용실 - 훈련사 없음)
        ],
        3: [ // 24시 반려동물 병원 (병원 - 수의사는 있지만 훈련사 아님)
        ]
      };

      const trainers = trainersData[location.id] || [];
      setInstitutionTrainers(trainers);
      console.log(`${location.name} 소속 훈련사 ${trainers.length}명 로드됨`);
      
    } catch (error) {
      console.error('훈련사 정보 로드 오류:', error);
      setInstitutionTrainers([]);
    } finally {
      setLoadingTrainers(false);
    }
  };

  // 지도 로드
  useEffect(() => {
    if (isOpen && activeTab === 'map') {
      const timer = setTimeout(() => {
        setMapLoaded(true);
        console.log('지도 로드 완료:', location.name);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeTab, location.name]);

  // 훈련사 탭 활성화시 기관 소속 훈련사 정보 로드
  useEffect(() => {
    if (isOpen && activeTab === 'trainers' && location.type === 'training') {
      fetchInstitutionTrainers();
    }
  }, [isOpen, activeTab, location.id, location.type]);

  const sampleReviews = [
    {
      id: 1,
      user: '김반려',
      rating: 5,
      comment: '정말 친절하고 전문적인 서비스를 받았어요. 우리 강아지가 많이 좋아했습니다!',
      date: '2024-06-20',
      helpful: 12
    },
    {
      id: 2,
      user: '박펫맘',
      rating: 4,
      comment: '시설이 깨끗하고 좋았습니다. 다만 예약이 좀 어려웠어요.',
      date: '2024-06-15',
      helpful: 8
    },
    {
      id: 3,
      user: '이멍멍',
      rating: 5,
      comment: '직원분들이 정말 친절하시고 반려견을 잘 다뤄주셔서 안심이 됐습니다.',
      date: '2024-06-10',
      helpful: 15
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="relative">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{getTypeIcon(location.type)}</span>
                <Badge variant="outline" className="text-sm">
                  {getTypeName(location.type)}
                </Badge>
                {location.isPartner && (
                  <Badge className="bg-blue-600 text-white">
                    테일즈 파트너
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-2xl font-bold mb-2">
                {location.name}
              </DialogTitle>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{location.rating}</span>
                  <span>({location.reviewCount} 후기)</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{location.distance}km</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFavoriteToggle}
                className="p-2"
              >
                <Heart 
                  className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} 
                />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="p-2"
              >
                <Share2 className="h-5 w-5 text-gray-400" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">개요</TabsTrigger>
              <TabsTrigger value="trainers" disabled={location.type !== 'training'}>
                훈련사
              </TabsTrigger>
              <TabsTrigger value="map">지도</TabsTrigger>
              <TabsTrigger value="reviews">후기</TabsTrigger>
              <TabsTrigger value="photos">사진</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">소개</h3>
                    <p className="text-gray-700 leading-relaxed">{location.description}</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">제공 서비스</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {location.services.map((service, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                          <Award className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">{service}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 전문 훈련사 미리보기 (훈련소인 경우만) */}
                  {location.type === 'training' && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold">전문 훈련사</h3>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setActiveTab('trainers')}
                        >
                          전체 보기
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          {
                            id: 1,
                            name: '김민수 전문 훈련사',
                            specialty: ['기본 복종 훈련', '사회화 훈련'],
                            experience: '10년+',
                            rating: 4.9,
                            reviews: 156,
                            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
                            bio: '10년 이상의 경력을 가진 전문 훈련사입니다.',
                            certifications: ['국제 반려견 훈련사 자격증', 'KKF 공인 훈련사'],
                            availableSlots: {
                              '2025-06-26': ['10:00', '14:00', '16:00'],
                              '2025-06-27': ['09:00', '11:00', '15:00'],
                              '2025-06-28': ['10:30', '13:30', '16:30']
                            }
                          },
                          {
                            id: 2,
                            name: '박지혜 행동교정사',
                            specialty: ['행동 교정', '문제행동 해결'],
                            experience: '8년+',
                            rating: 4.8,
                            reviews: 132,
                            avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b4c0?w=100',
                            bio: '문제행동 전문가로 공격성, 분리불안 등의 해결에 특화되어 있습니다.',
                            certifications: ['동물행동학 석사', 'CCPDT 공인 훈련사'],
                            availableSlots: {
                              '2025-06-26': ['11:00', '15:00'],
                              '2025-06-27': ['10:00', '14:00', '16:00'],
                              '2025-06-29': ['09:30', '13:00', '15:30']
                            }
                          }
                        ].slice(0, 2).map((trainer) => (
                          <Card key={trainer.id} className="p-4">
                            <div className="flex items-start gap-3">
                              <img 
                                src={trainer.avatar} 
                                alt={trainer.name}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                              <div className="flex-1">
                                <h4 className="font-semibold text-sm">{trainer.name}</h4>
                                <div className="flex items-center gap-1 mb-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-xs">{trainer.rating}</span>
                                  <span className="text-xs text-gray-500">({trainer.reviews})</span>
                                </div>
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {trainer.specialty.slice(0, 2).map((spec, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs px-1 py-0">
                                      {spec}
                                    </Badge>
                                  ))}
                                </div>
                                <Button 
                                  size="sm" 
                                  className="w-full"
                                  onClick={() => {
                                    setSelectedTrainer(trainer);
                                    setShowTrainerConsultation(true);
                                  }}
                                >
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  상담 예약
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold mb-3">편의시설</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <Wifi className="h-4 w-4 text-green-600" />
                        <span className="text-sm">무료 WiFi</span>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <Car className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">주차 가능</span>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <CreditCard className="h-4 w-4 text-primary" />
                        <span className="text-sm">카드 결제</span>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <Shield className="h-4 w-4 text-orange-600" />
                        <span className="text-sm">안전 보험</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardContent className="p-4">
                      <img
                        src={location.image}
                        alt={location.name}
                        className="w-full h-48 object-cover rounded-lg mb-4"
                      />
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-gray-400" />
                          <span className="text-sm">{location.address}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Phone className="h-5 w-5 text-gray-400" />
                          <span className="text-sm">{location.phone}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-gray-400" />
                          <span className="text-sm">
                            {location.operatingHours.open} - {location.operatingHours.close}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">가격 정보</h4>
                    <p className="text-sm text-gray-700">{location.priceRange}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="map" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">위치 및 길찾기</h3>
                  <Button onClick={handleDirections} className="flex items-center gap-2">
                    <Navigation className="h-4 w-4" />
                    길찾기
                  </Button>
                </div>
                
                <div className="relative h-96 bg-gray-100 rounded-lg overflow-hidden">
                  {!mapLoaded ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-600">지도를 불러오는 중...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
                      <div className="text-center">
                        <MapPin className="h-16 w-16 mx-auto mb-4 text-blue-600" />
                        <p className="text-lg font-medium text-gray-800 mb-2">{location.name}</p>
                        <p className="text-sm text-gray-600 mb-4">{location.address}</p>
                        <div className="flex justify-center gap-3">
                          <Button size="sm" onClick={handleDirections}>
                            <Navigation className="h-4 w-4 mr-2" />
                            카카오맵 열기
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCall}>
                            <Phone className="h-4 w-4 mr-2" />
                            전화하기
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-4">
                          실제 서비스에서는 카카오맵 API가 연동됩니다
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Car className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <h4 className="font-semibold">주차 정보</h4>
                      <p className="text-sm text-gray-600">무료 주차 가능</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <MapPin className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <h4 className="font-semibold">대중교통</h4>
                      <p className="text-sm text-gray-600">지하철 5분 거리</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Clock className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                      <h4 className="font-semibold">소요시간</h4>
                      <p className="text-sm text-gray-600">{location.distance}km ({Math.round(location.distance * 3)}분)</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="mt-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">고객 후기</h3>
                  <Button variant="outline" size="sm">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    후기 작성
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{location.rating}</div>
                    <div className="flex justify-center mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(location.rating) 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {location.reviewCount}개 후기
                    </div>
                  </div>
                  <div className="col-span-2 space-y-2">
                    {[5, 4, 3, 2, 1].map((stars) => (
                      <div key={stars} className="flex items-center gap-3">
                        <span className="text-sm w-8">{stars}점</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-yellow-400 h-2 rounded-full" 
                            style={{ 
                              width: `${Math.max(0, Math.min(100, (6 - stars) * 20))}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-8">
                          {Math.round((6 - stars) * location.reviewCount / 5)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {sampleReviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{review.user}</span>
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${
                                      i < review.rating 
                                        ? 'fill-yellow-400 text-yellow-400' 
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600">{review.date}</p>
                          </div>
                        </div>
                        <p className="text-gray-700 mb-3">{review.comment}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <button className="flex items-center gap-1 hover:text-blue-600">
                            <Heart className="h-3 w-3" />
                            도움됨 {review.helpful}
                          </button>
                          <button className="hover:text-blue-600">답글</button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="photos" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">사진 갤러리</h3>
                  <Button variant="outline" size="sm">
                    <Camera className="h-4 w-4 mr-2" />
                    사진 업로드
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={`${location.image}?random=${index}`}
                        alt={`${location.name} 사진 ${index + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex gap-3 mt-6 pt-6 border-t">
          <Button
            onClick={handleCall}
            variant="outline"
            className="flex-1"
          >
            <Phone className="h-4 w-4 mr-2" />
            전화하기
          </Button>
          <Button
            onClick={handleDirections}
            variant="outline"
            className="flex-1"
          >
            <Navigation className="h-4 w-4 mr-2" />
            길찾기
          </Button>
          <Button
            onClick={() => {
              if (location.type === 'training') {
                setActiveTab('trainers');
              } else {
                onReservation(location.id);
              }
            }}
            className="flex-1 bg-orange-500 hover:bg-orange-600"
          >
            <Calendar className="h-4 w-4 mr-2" />
            {location.type === 'training' ? '상담 예약' : '예약하기'}
          </Button>
        </div>

        {/* Trainer Consultation Modal */}
        {selectedTrainer && (
          <TrainerConsultationModal
            trainer={selectedTrainer}
            isOpen={showTrainerConsultation}
            onOpenChange={setShowTrainerConsultation}
            onBookingComplete={(bookingData) => {
              console.log('상담 예약 완료:', bookingData);
              // 예약 완료 처리 로직
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}