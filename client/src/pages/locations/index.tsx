import React, { useState, useEffect } from 'react';
import { NaverMap } from '@/components/map/NaverMap';
import { QuickReservationDialog } from '@/components/reservation/QuickReservationDialog';
import { BusinessCard } from '@/components/business/BusinessCard';
import { TrainerSelectionDialog } from '@/components/business/TrainerSelectionDialog';
import { TrainerProfileDialog } from '@/components/business/TrainerProfileDialog';
import { InfoCorrectionDialog } from '@/components/business/InfoCorrectionDialog';
import { ReviewDetailDialog } from '@/components/business/ReviewDetailDialog';
import { ReviewSubmissionDialog } from '@/components/business/ReviewSubmissionDialog';
import { TalezCertificationBadge } from '@/components/business/TalezCertificationBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Filter, MapPin, Phone, Clock, Star, Navigation, Zap, Target, ChevronRight, Layers, List, Map as MapIcon, Building2, Award, Users, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Trainer {
  id: string;
  name: string;
  specialties: string[];
  experience: number;
  rating: number;
  certifications: string[];
  availableSlots: string[];
  profileImage?: string;
  bio?: string;
  price?: number;
}

interface Review {
  id: string;
  authorName: string;
  authorImage?: string;
  rating: number;
  comment: string;
  date: string;
  helpful?: number;
  photos?: string[];
}

interface LocationData {
  id: string;
  name: string;
  type: 'training-center' | 'pet-store' | 'veterinary' | 'event' | 'hospital' | 'training' | 'grooming' | 'hotel' | 'cafe' | 'park';
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  rating?: number;
  hours?: string;
  description?: string;
  distance?: number;
  businessNumber?: string;
  certificationStatus?: 'pending' | 'verified' | 'rejected';
  certificationDate?: string;
  businessType?: string;
  trainers?: Trainer[];
  reviewCount?: number;
  services?: string[];
  photos?: string[];
  reviews?: Review[];
  amenities?: string[];
  priceRange?: string;
}

// Sample location data for Seoul area
const sampleLocations: LocationData[] = [
  {
    id: 'tc1',
    name: '서울 펫 트레이닝 센터',
    type: 'training-center',
    address: '서울특별시 강남구 테헤란로 123',
    lat: 37.5012,
    lng: 127.0396,
    phone: '02-1234-5678',
    rating: 4.8,
    hours: '09:00 - 18:00',
    description: '전문 반려동물 훈련 서비스를 제공하는 프리미엄 트레이닝 센터입니다.',
    businessNumber: '123-45-67890',
    certificationStatus: 'verified',
    certificationDate: '2024-01-15',
    businessType: '반려동물 훈련업',
    reviewCount: 156,
    services: ['기본 훈련', '행동 교정', '퍼피 클래스', '개인 레슨'],
    trainers: [
      {
        id: 't1',
        name: '김훈련',
        specialties: ['기본 훈련', '행동 교정', '퍼피 클래스'],
        experience: 8,
        rating: 4.9,
        certifications: ['반려동물행동교정사 1급', 'KKC 공인훈련사'],
        availableSlots: ['09:00', '11:00', '14:00', '16:00'],
        bio: '8년 경력의 전문 반려동물 훈련사로, 특히 문제행동 교정에 탁월한 실력을 보유하고 있습니다.',
        price: 80000
      },
      {
        id: 't2',
        name: '박전문',
        specialties: ['퍼피 클래스', '사회화 훈련', '기초 복종'],
        experience: 5,
        rating: 4.7,
        certifications: ['반려동물훈련사 2급', '애견미용사'],
        availableSlots: ['10:00', '13:00', '15:00', '17:00'],
        bio: '젊은 강아지 교육 전문가로, 사회화 훈련과 기초 복종 훈련을 전문으로 합니다.',
        price: 65000
      }
    ],
    reviews: [
      {
        id: 'r1',
        authorName: '김반려',
        rating: 5,
        comment: '우리 강아지 짖음 문제가 심했는데, 김훈련사님 덕분에 완전히 해결됐어요! 정말 전문적이고 친절하게 가르쳐주셔서 감사합니다. 강력 추천드려요!',
        date: '2024-06-20T00:00:00Z',
        helpful: 12,
        photos: []
      },
      {
        id: 'r2',
        authorName: '박주인',
        rating: 4,
        comment: '퍼피클래스 수강했는데 정말 좋았어요. 사회화 훈련 덕분에 우리 강아지가 다른 개들과 잘 어울려 놀게 되었습니다. 시설도 깨끗하고 훈련사분들도 전문적이에요.',
        date: '2024-06-15T00:00:00Z',
        helpful: 8,
        photos: []
      },
      {
        id: 'r3',
        authorName: '이펫맘',
        rating: 5,
        comment: '행동교정 훈련 받았는데 결과가 정말 만족스러워요. 전에는 산책할 때마다 줄을 당기고 난리였는데 이제는 차분하게 옆에서 걸어요. 가격은 조금 비싸지만 그만한 가치가 있습니다.',
        date: '2024-06-10T00:00:00Z',
        helpful: 15,
        photos: []
      },
      {
        id: 'r4',
        authorName: '최독키',
        rating: 4,
        comment: '기본 훈련 프로그램 완주했어요. 앉기, 기다리기, 손 등 기본 명령어를 확실히 배웠습니다. 훈련사님이 개별적으로 세심하게 봐주셔서 좋았어요.',
        date: '2024-06-05T00:00:00Z',
        helpful: 6,
        photos: []
      },
      {
        id: 'r5',
        authorName: '황펫러버',
        rating: 3,
        comment: '전체적으로는 만족하지만 예약이 너무 어려워요. 인기가 많아서 그런 것 같긴 한데, 좀 더 시간대를 늘려주시면 좋겠어요. 훈련 자체는 효과적이었습니다.',
        date: '2024-05-30T00:00:00Z',
        helpful: 4,
        photos: []
      }
    ]
  },
  {
    id: 'tc2',
    name: '스마트독 교육센터',
    type: 'training-center',
    address: '서울특별시 서초구 강남대로 456',
    lat: 37.4979,
    lng: 127.0276,
    phone: '02-2345-6789',
    rating: 4.6,
    hours: '10:00 - 19:00',
    description: '행동교정 전문 훈련소',
    businessNumber: '234-56-78901',
    certificationStatus: 'verified',
    certificationDate: '2024-02-20',
    businessType: '반려동물 훈련업',
    reviewCount: 89,
    services: ['행동 교정', '공격성 훈련', '분리불안 해결', '사회화 훈련'],
    trainers: [
      {
        id: 't3',
        name: '이행동',
        specialties: ['행동 교정', '공격성 훈련', '분리불안'],
        experience: 10,
        rating: 4.8,
        certifications: ['동물행동학 박사', '반려동물행동교정사 1급'],
        availableSlots: ['09:00', '11:00', '14:00', '16:00'],
        bio: '동물행동학 전문가로 10년간 문제행동 교정에 전념해온 경험 많은 훈련사입니다.',
        price: 120000
      }
    ]
  },
  {
    id: 'ps1',
    name: '펫프렌즈 강남점',
    type: 'pet-store',
    address: '서울특별시 강남구 역삼동 789',
    lat: 37.4998,
    lng: 127.0364,
    phone: '02-3456-7890',
    rating: 4.5,
    hours: '10:00 - 22:00',
    description: '프리미엄 반려동물 용품'
  },
  {
    id: 'ps2',
    name: '애니멀킹덤',
    type: 'pet-store',
    address: '서울특별시 서초구 서초대로 321',
    lat: 37.4936,
    lng: 127.0306,
    phone: '02-4567-8901',
    rating: 4.3,
    hours: '09:00 - 21:00',
    description: '대형 펫샵 체인점'
  },
  {
    id: 'vet1',
    name: '서울동물병원',
    type: 'veterinary',
    address: '서울특별시 강남구 논현로 654',
    lat: 37.5087,
    lng: 127.0224,
    phone: '02-5678-9012',
    rating: 4.9,
    hours: '24시간 응급진료',
    description: '24시간 응급 동물병원'
  },
  {
    id: 'vet2',
    name: '케어펫 동물의료센터',
    type: 'veterinary',
    address: '서울특별시 서초구 효령로 987',
    lat: 37.4847,
    lng: 127.0251,
    phone: '02-6789-0123',
    rating: 4.7,
    hours: '09:00 - 20:00',
    description: '종합 동물의료센터'
  },
  {
    id: 'ev1',
    name: '반려견 어질리티 대회',
    type: 'event',
    address: '서울특별시 강남구 올림픽공원',
    lat: 37.5219,
    lng: 127.1213,
    phone: '02-7890-1234',
    rating: 4.4,
    hours: '2024.02.15 - 2024.02.16',
    description: '전국 반려견 어질리티 경기대회'
  },
  {
    id: 'ev2',
    name: '펫 박람회 2024',
    type: 'event',
    address: '서울특별시 강남구 코엑스',
    lat: 37.5125,
    lng: 127.0592,
    phone: '02-8901-2345',
    rating: 4.6,
    hours: '2024.03.01 - 2024.03.03',
    description: '아시아 최대 반려동물 박람회'
  }
];

export default function LocationsPage() {
  const [locations, setLocations] = useState<LocationData[]>(sampleLocations);
  const [filteredLocations, setFilteredLocations] = useState<LocationData[]>(sampleLocations);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);
  const [reservationLocation, setReservationLocation] = useState<LocationData | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [trainerDialogOpen, setTrainerDialogOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<LocationData | null>(null);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [trainerProfileOpen, setTrainerProfileOpen] = useState(false);
  const [selectedTrainerProfile, setSelectedTrainerProfile] = useState<Trainer | null>(null);
  const [showMapView, setShowMapView] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'name'>('distance');
  const [isSmartSearchEnabled, setIsSmartSearchEnabled] = useState(false);
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);
  const [reviewDetailOpen, setReviewDetailOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [reviewSubmissionOpen, setReviewSubmissionOpen] = useState(false);
  const [selectedBusinessForReview, setSelectedBusinessForReview] = useState<LocationData | null>(null);
  const [showCertifiedOnly, setShowCertifiedOnly] = useState(false);

  const { toast } = useToast();

  // Calculate distances when user location is available
  useEffect(() => {
    if (userLocation) {
      const locationsWithDistance = locations.map(location => ({
        ...location,
        distance: calculateDistance(
          userLocation[0], userLocation[1],
          location.lat, location.lng
        )
      }));

      // Sort by distance
      locationsWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      setLocations(locationsWithDistance);
    }
  }, [userLocation]);

  // Filter locations based on search and type
  useEffect(() => {
    let filtered = locations;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(location => location.type === selectedType);
    }

    // Filter by TALEZ certification
    if (showCertifiedOnly) {
      filtered = filtered.filter(location => location.certificationStatus === 'verified');
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(location =>
        location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by selected criteria
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return (a.distance || 0) - (b.distance || 0);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    setFilteredLocations(filtered);
  }, [locations, searchTerm, selectedType, sortBy, showCertifiedOnly]);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (value: number): number => {
    return value * Math.PI / 180;
  };

  const getLocationTypeLabel = (type: string) => {
    const labels = {
      'training-center': '훈련소',
      'training': '훈련소',
      'pet-store': '펫샵',
      'veterinary': '동물병원',
      'hospital': '동물병원',
      'event': '이벤트',
      'grooming': '미용실',
      'hotel': '펫호텔',
      'cafe': '펫카페',
      'park': '공원'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getLocationTypeBadgeColor = (type: string) => {
    const colors = {
      'training-center': 'bg-success/10 text-success',
      'training': 'bg-success/10 text-success',
      'pet-store': 'bg-primary/10 text-primary',
      'veterinary': 'bg-destructive/10 text-destructive',
      'hospital': 'bg-destructive/10 text-destructive',
      'event': 'bg-primary/10 text-primary',
      'grooming': 'bg-primary/10 text-primary',
      'hotel': 'bg-warning/10 text-warning',
      'cafe': 'bg-secondary/15 text-primary',
      'park': 'bg-success/10 text-success'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const handleLocationSelect = (location: LocationData) => {
    setSelectedLocation(location);

    if (isSmartSearchEnabled) {
      toast({
        title: `${location.name} 선택됨`,
        description: `${location.distance ? `${location.distance.toFixed(1)}km 거리` : ''}에 위치한 ${getLocationTypeLabel(location.type)}입니다.`,
      });
    }
  };

  const handleReservationClick = (location: LocationData) => {
    // 훈련소이고 훈련사가 여러 명인 경우 훈련사 선택 다이얼로그 표시
    if ((location.type === 'training-center' || location.type === 'training') && 
        location.trainers && location.trainers.length > 1) {
      setSelectedBusiness(location);
      setTrainerDialogOpen(true);
    } else {
      // 훈련사가 1명이거나 없는 경우, 또는 다른 업종의 경우 직접 예약
      setSelectedTrainer(location.trainers && location.trainers.length === 1 ? location.trainers[0] : null);
      setReservationLocation(location);
      setReservationDialogOpen(true);
    }

    if (isSmartSearchEnabled) {
      toast({
        title: "스마트 예약 모드",
        description: "현재 위치와 교통 상황을 고려한 최적 예약 시간을 제안합니다.",
      });
    }
  };

  const handleReservationSubmit = async (reservationData: any) => {
    try {
      console.log('예약 데이터:', reservationData);
      alert(`${reservationData.locationName}에 ${reservationData.date} ${reservationData.time} 예약이 완료되었습니다.`);
    } catch (error) {
      console.error('예약 실패:', error);
      throw error;
    }
  };

  const handleTrainerSelect = (trainer: Trainer) => {
    setSelectedTrainer(trainer);
    setTrainerDialogOpen(false);
    setReservationLocation(selectedBusiness);
    setReservationDialogOpen(true);
  };

  const handleTrainerProfileClick = (trainer: Trainer) => {
    setSelectedTrainerProfile(trainer);
    setTrainerProfileOpen(true);
  };

  const handleTrainerReservation = (trainer: Trainer) => {
    setSelectedTrainer(trainer);
    setReservationLocation(selectedLocation);
    setReservationDialogOpen(true);
  };

  const handleWriteReview = (business: LocationData) => {
    setSelectedBusinessForReview(business);
    setReviewSubmissionOpen(true);
  };

  const handleReviewSubmit = async (reviewData: any) => {
    try {
      // In a real application, this would send the review data to the backend
      console.log('리뷰 제출:', reviewData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update the business with the new review (in a real app, this would come from the backend)
      const updatedLocations = locations.map(location => {
        if (location.id === reviewData.businessId) {
          const newReview: Review = {
            id: `review_${Date.now()}`,
            authorName: '현재 사용자', // In real app, get from auth context
            rating: reviewData.rating,
            comment: reviewData.comment,
            date: new Date().toISOString(),
            helpful: 0,
            photos: reviewData.photos ? reviewData.photos.map((file: File) => URL.createObjectURL(file)) : []
          };
          
          return {
            ...location,
            reviews: [...(location.reviews || []), newReview],
            reviewCount: (location.reviewCount || 0) + 1,
            rating: location.reviews ? 
              ((location.rating || 0) * location.reviews.length + reviewData.rating) / (location.reviews.length + 1) :
              reviewData.rating
          };
        }
        return location;
      });
      
      setLocations(updatedLocations);
      
      // Update selectedLocation if it matches the business being reviewed
      if (selectedLocation?.id === reviewData.businessId) {
        const updatedSelected = updatedLocations.find(loc => loc.id === reviewData.businessId);
        if (updatedSelected) {
          setSelectedLocation(updatedSelected);
        }
      }
      
      // Update filtered locations to reflect the changes in the main list
      setFilteredLocations(current => 
        current.map(location => {
          const updatedLoc = updatedLocations.find(ul => ul.id === location.id);
          return updatedLoc || location;
        })
      );
      
      toast({
        title: "리뷰가 등록되었습니다",
        description: "소중한 후기 감사합니다!"
      });
    } catch (error) {
      console.error('리뷰 제출 실패:', error);
      throw error;
    }
  };



  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [
            position.coords.latitude,
            position.coords.longitude
          ];
          setUserLocation(coords);
          toast({
            title: "위치 확인 완료",
            description: "현재 위치를 찾았습니다.",
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast({
            title: "위치 확인 실패",
            description: "위치 정보를 가져올 수 없습니다.",
            variant: "destructive"
          });
        }
      );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* 네이버 지도 스타일 상단 검색바 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            {/* 로고/타이틀 */}
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="w-6 h-6 text-primary" />
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 hidden sm:block">TALEZ 위치찾기</h1>
            </div>

            {/* 검색바 */}
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="장소명, 주소를 검색하세요"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            </div>

            {/* 필터 및 설정 */}
            <div className="flex items-center gap-2">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="training-center">훈련소</SelectItem>
                  <SelectItem value="pet-store">펫샵</SelectItem>
                  <SelectItem value="veterinary">동물병원</SelectItem>
                  <SelectItem value="event">이벤트</SelectItem>
                  <SelectItem value="grooming">미용실</SelectItem>
                  <SelectItem value="hotel">펫호텔</SelectItem>
                  <SelectItem value="cafe">펫카페</SelectItem>
                  <SelectItem value="park">공원</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                onClick={() => setShowCertifiedOnly(!showCertifiedOnly)}
                variant={showCertifiedOnly ? "default" : "outline"}
                size="sm"
                className={showCertifiedOnly ? "bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))] text-white" : ""}
              >
                <Award className="w-4 h-4 mr-2" />
                TALEZ 인증
              </Button>

              <Button onClick={getUserLocation} variant="outline" size="sm">
                <Navigation className="w-4 h-4 mr-2" />
                내 위치
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨테이너 - 네이버 지도 스타일 좌우 분할 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 좌측 사이드바 - 검색 결과 및 목록 */}
        <div className="w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* 검색 결과 헤더 */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {showCertifiedOnly ? 'TALEZ 인증 업체' : '검색결과'}
                </span>
                <Badge 
                  variant="secondary" 
                  className={showCertifiedOnly ? "bg-[hsl(var(--success))] text-white" : ""}
                >
                  {filteredLocations.length}
                </Badge>
                {showCertifiedOnly && (
                  <div className="flex items-center gap-1 text-xs text-[hsl(var(--success))]">
                    <Award className="w-3 h-3" />
                    <span>인증된 업체만 표시</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                  <SelectTrigger className="w-24 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="distance">거리순</SelectItem>
                    <SelectItem value="rating">평점순</SelectItem>
                    <SelectItem value="name">이름순</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex border rounded">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="h-8 px-2"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'map' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('map')}
                    className="h-8 px-2"
                  >
                    <MapIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* 카테고리 필터 */}
            <div className="flex flex-wrap gap-1">
              {['training-center', 'pet-store', 'veterinary', 'event'].map(type => {
                const count = filteredLocations.filter(loc => loc.type === type).length;
                return count > 0 ? (
                  <Badge 
                    key={type} 
                    variant={selectedType === type ? "default" : "outline"}
                    className="text-xs cursor-pointer"
                    onClick={() => setSelectedType(selectedType === type ? 'all' : type)}
                  >
                    {getLocationTypeLabel(type)} {count}
                  </Badge>
                ) : null;
              })}
            </div>
          </div>

          {/* 위치 목록 */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {filteredLocations.length > 0 ? (
                <div className="space-y-2">
                  {filteredLocations.map((location, index) => (
                    <div
                      key={location.id}
                      className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800 border ${
                        selectedLocation?.id === location.id ? 'border-primary/50 bg-primary/10 dark:bg-primary/20' : 'border-gray-100 dark:border-gray-700'
                      }`}
                      onClick={() => handleLocationSelect(location)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-primary">
                              {index + 1}
                            </span>
                            <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">{location.name}</h4>
                            <Badge className={`${getLocationTypeBadgeColor(location.type)} text-xs`}>
                              {getLocationTypeLabel(location.type)}
                            </Badge>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{location.address}</span>
                            </div>

                            {location.phone && (
                              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                                <Phone className="w-3 h-3" />
                                <span>{location.phone}</span>
                              </div>
                            )}

                            {location.hours && (
                              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                                <Clock className="w-3 h-3" />
                                <span>{location.hours}</span>
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              {location.rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-warning text-warning" />
                                  <span className="text-xs font-medium">{location.rating}</span>
                                  {location.reviewCount && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">({location.reviewCount})</span>
                                  )}
                                </div>
                              )}

                              {location.distance && (
                                <span className="text-xs font-medium text-primary">
                                  {location.distance < 1 
                                    ? `${Math.round(location.distance * 1000)}m`
                                    : `${location.distance.toFixed(1)}km`
                                  }
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
                      </div>

                      {location.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                          {location.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-xs h-7 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLocationSelect(location);
                          }}
                        >
                          상세보기
                        </Button>

                        {(location.type === 'training-center' || location.type === 'training' || location.type === 'hospital' || location.type === 'veterinary') && (
                          <Button 
                            size="sm"
                            className="text-xs h-7 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReservationClick(location);
                            }}
                          >
                            예약
                          </Button>
                        )}

                        <Button 
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 px-2 gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWriteReview(location);
                          }}
                        >
                          <Star className="w-3 h-3" />
                          리뷰 작성
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MapPin className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium">검색 결과가 없습니다</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    다른 검색어나 필터를 시도해보세요
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* 우측 지도 영역 */}
        <div className="flex-1 relative">
          {viewMode === 'map' ? (
            <NaverMap
              locations={filteredLocations}
              height="400px"
              onLocationClick={handleLocationSelect}
              onReservationClick={handleReservationClick}
            />
          ) : (
            /* 상세 정보 패널 */
            <div className="h-full bg-white dark:bg-gray-900">
              {selectedLocation ? (
                <div className="h-full flex flex-col">
                  {/* 헤더 */}
                  <div className="flex items-start justify-between p-6 border-b dark:border-gray-700">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-2xl">
                          {/*{getLocationIcon(selectedLocation.type)}*/}
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {selectedLocation.name}
                        </h2>
                        {/*{selectedLocation.talezPartner && (
                          <Badge className="bg-primary text-white">
                            테일즈 파트너
                          </Badge>
                        )}
                        {selectedLocation.isCertified && (
                          <Badge className="bg-success text-white">
                            인증업체
                          </Badge>
                        )}*/}
                      </div>

                      {selectedLocation.rating && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Star className="w-5 h-5 fill-warning text-warning" />
                            <span className="text-xl font-bold dark:text-gray-100">{selectedLocation.rating}</span>
                            <span className="text-gray-500 dark:text-gray-400">/5</span>
                          </div>
                          {selectedLocation.reviewCount && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">리뷰 {selectedLocation.reviewCount}개</span>
                          )}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLocation(null)}
                      className="self-start"
                    >
                      ← 목록으로
                    </Button>
                  </div>

                  {/* 상세 정보 콘텐츠 */}
                  <ScrollArea className="flex-1 px-6">
                    <div className="space-y-6 pb-6">
                      
                      {/* 기본 정보 */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm">{selectedLocation.address}</span>
                        </div>

                        {selectedLocation.phone && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Phone className="w-4 h-4" />
                            <span className="text-sm">{selectedLocation.phone}</span>
                          </div>
                        )}

                        {selectedLocation.hours && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">{selectedLocation.hours}</span>
                          </div>
                        )}

                        {selectedLocation.distance && (
                          <div className="flex items-center gap-2 text-primary">
                            <Navigation className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              거리: {selectedLocation.distance < 1 
                                ? `${Math.round(selectedLocation.distance * 1000)}m`
                                : `${selectedLocation.distance.toFixed(1)}km`
                              }
                            </span>
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* TALEZ 인증 정보 */}
                      {selectedLocation.businessNumber && (
                        <div className="space-y-3">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <Award className="w-4 h-4" />
                            TALEZ 인증 정보
                          </h3>
                          <div className="bg-success/10 dark:bg-success/20 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <TalezCertificationBadge 
                                businessData={{
                                  id: selectedLocation.id,
                                  name: selectedLocation.name,
                                  businessNumber: selectedLocation.businessNumber,
                                  certificationStatus: 'verified',
                                  certificationDate: selectedLocation.certificationDate || '2024-01-15',
                                  businessType: selectedLocation.businessType || selectedLocation.type
                                }}
                                size="md"
                                showDetails={false}
                              />
                              {selectedLocation.certificationDate && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  인증일: {selectedLocation.certificationDate}
                                </span>
                              )}
                            </div>
                            <div className="space-y-1 text-sm dark:text-gray-300">
                              <div>사업자번호: {selectedLocation.businessNumber}</div>
                              {selectedLocation.businessType && (
                                <div>업종: {selectedLocation.businessType}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 설명 */}
                      {selectedLocation.description && (
                        <>
                          <Separator />
                          <div className="space-y-3">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">소개</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                              {selectedLocation.description}
                            </p>
                          </div>
                        </>
                      )}

                      {/* 서비스 */}
                      {selectedLocation.services && selectedLocation.services.length > 0 && (
                        <>
                          <Separator />
                          <div className="space-y-3">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">제공 서비스</h3>
                            <div className="flex flex-wrap gap-2">
                              {selectedLocation.services.map((service, index) => (
                                <Badge key={index} variant="outline">
                                  {service}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* 훈련사 정보 */}
                      {selectedLocation.trainers && selectedLocation.trainers.length > 0 && (
                        <>
                          <Separator />
                          <div className="space-y-3">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              전문 훈련사 ({selectedLocation.trainers.length}명)
                            </h3>
                            <div className="space-y-3">
                              {selectedLocation.trainers.map((trainer) => (
                                <div key={trainer.id} className="border rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{trainer.name}</span>
                                      <Badge variant="outline">{trainer.experience}년 경력</Badge>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Star className="w-4 h-4 fill-warning text-warning" />
                                      <span className="text-sm">{trainer.rating}</span>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {trainer.specialties.map((specialty, index) => (
                                      <Badge key={index} variant="secondary" className="text-xs">
                                        {specialty}
                                      </Badge>
                                    ))}
                                  </div>
                                  {trainer.price && (
                                    <div className="text-sm text-primary font-medium">
                                      1회 {trainer.price.toLocaleString()}원
                                    </div>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full mt-2"
                                    onClick={() => handleTrainerProfileClick(trainer)}
                                  >
                                    프로필 보기
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* 리뷰 섹션 */}
                      <Separator />
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <Star className="w-4 h-4" />
                            리뷰 ({selectedLocation.reviews?.length || 0})
                          </h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleWriteReview(selectedLocation)}
                            className="text-xs"
                          >
                            리뷰 작성
                          </Button>
                        </div>

                        {/* 평점 요약 */}
                        {selectedLocation.rating && (
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                  {selectedLocation.rating.toFixed(1)}
                                </div>
                                <div className="flex items-center justify-center gap-1 mb-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-3 h-3 ${
                                        star <= Math.round(selectedLocation.rating || 0)
                                          ? 'fill-warning text-warning'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {selectedLocation.reviewCount || 0}개 리뷰
                                </div>
                              </div>
                              <div className="flex-1">
                                {[5, 4, 3, 2, 1].map((rating) => {
                                  const count = selectedLocation.reviews?.filter(r => Math.round(r.rating) === rating).length || 0;
                                  const total = selectedLocation.reviews?.length || 1;
                                  const percentage = (count / total) * 100;
                                  
                                  return (
                                    <div key={rating} className="flex items-center gap-2 text-xs">
                                      <span className="w-4">{rating}</span>
                                      <Star className="w-3 h-3 fill-warning text-warning" />
                                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                                        <div
                                          className="bg-warning/40 h-2 rounded-full"
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                      <span className="w-6 text-gray-600">{count}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 리뷰 목록 */}
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                          {selectedLocation.reviews && selectedLocation.reviews.length > 0 ? (
                            selectedLocation.reviews.slice(0, 3).map((review) => (
                              <div key={review.id} className="border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm dark:text-gray-100">{review.authorName}</span>
                                    <div className="flex items-center gap-1">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                          key={star}
                                          className={`w-3 h-3 ${
                                            star <= review.rating
                                              ? 'fill-warning text-warning'
                                              : 'text-gray-300'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(review.date).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-3">
                                  {review.comment}
                                </p>
                                {review.photos && review.photos.length > 0 && (
                                  <div className="flex gap-2 mb-2">
                                    {review.photos.slice(0, 3).map((photo, index) => (
                                      <img
                                        key={index}
                                        src={photo}
                                        alt={`리뷰 사진 ${index + 1}`}
                                        className="w-12 h-12 object-cover rounded border"
                                      />
                                    ))}
                                    {review.photos.length > 3 && (
                                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded border flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                                        +{review.photos.length - 3}
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-center justify-between">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs p-1 h-auto"
                                  >
                                    도움됨 {review.helpful || 0}
                                  </Button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                              <Star className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                              <p className="text-sm">아직 리뷰가 없습니다</p>
                              <p className="text-xs">첫 번째 리뷰를 작성해보세요!</p>
                            </div>
                          )}

                          {selectedLocation.reviews && selectedLocation.reviews.length > 3 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                // TODO: 모든 리뷰 보기 기능 구현
                                toast({
                                  title: "전체 리뷰 보기",
                                  description: "모든 리뷰를 확인할 수 있습니다."
                                });
                              }}
                            >
                              모든 리뷰 보기 ({selectedLocation.reviews.length}개)
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>

                  {/* 하단 액션 버튼 */}
                  <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    <div className="flex gap-3">
                      {(selectedLocation.type === 'training-center' || selectedLocation.type === 'training' || selectedLocation.type === 'hospital' || selectedLocation.type === 'veterinary') && (
                        <Button
                          className="flex-1"
                          onClick={() => handleReservationClick(selectedLocation)}
                        >
                          예약하기
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          const url = `https://map.naver.com/v5/directions/-/-/${selectedLocation.lat},${selectedLocation.lng}`;
                          window.open(url, '_blank');
                        }}
                      >
                        길찾기
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
                      위치를 선택해주세요
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      좌측 목록에서 장소를 클릭하면<br />
                      자세한 정보를 볼 수 있습니다
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 다이얼로그들 */}
      <TrainerSelectionDialog
        isOpen={trainerDialogOpen}
        onClose={() => setTrainerDialogOpen(false)}
        trainers={selectedBusiness?.trainers || []}
        businessName={selectedBusiness?.name || ''}
        onTrainerSelect={handleTrainerSelect}
      />

      {/* 훈련사 프로필 다이얼로그 */}
      <TrainerProfileDialog
        isOpen={trainerProfileOpen}
        onClose={() => setTrainerProfileOpen(false)}
        trainer={selectedTrainerProfile}
        businessName={selectedLocation?.name || ''}
        onReservationClick={handleTrainerReservation}
      />

      <QuickReservationDialog
        isOpen={reservationDialogOpen}
        onClose={() => setReservationDialogOpen(false)}
        location={reservationLocation as any}
        trainer={selectedTrainer}
        onReservationSubmit={handleReservationSubmit}
      />

      {/* 리뷰 작성 다이얼로그 */}
      <ReviewSubmissionDialog
        isOpen={reviewSubmissionOpen}
        onClose={() => setReviewSubmissionOpen(false)}
        businessId={selectedBusinessForReview?.id || ''}
        businessName={selectedBusinessForReview?.name || ''}
        onSubmit={handleReviewSubmit}
      />
    </div>
  );
}