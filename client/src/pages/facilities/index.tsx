import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Star, 
  Phone, 
  Clock, 
  Car,
  Coffee,
  Home,
  Building,
  Search,
  Filter,
  Navigation,
  Map,
  List,
  TreePine,
  Scissors,
  GraduationCap,
  Heart,
  Hospital
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { NaverMapView } from '@/components/NaverMapView';

interface Facility {
  id: number;
  name: string;
  type: 'training' | 'grooming' | 'hospital' | 'hotel' | 'daycare' | 'park' | 'cafe';
  description: string;
  address: string;
  phone: string;
  rating: number;
  reviewCount: number;
  distance: number;
  operatingHours: {
    open: string;
    close: string;
  };
  amenities: string[];
  images: string[];
  services: string[];
  priceRange: string;
  isPartner: boolean;
  coordinates: {
    lat: number;
    lng: number;
  };
  specialFeatures?: string[];
  bookingAvailable?: boolean;
}

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [filteredFacilities, setFilteredFacilities] = useState<Facility[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('distance');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isMapReady, setIsMapReady] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const { toast } = useToast();

  // 샘플 시설 데이터 - 실제 서울 지역 위치 기반
  const sampleFacilities: Facility[] = [
    {
      id: 1,
      name: '서울 펫 트레이닝 센터',
      type: 'training',
      description: '전문 반려견 훈련 및 행동 교정 전문 시설입니다.',
      address: '서울시 강남구 테헤란로 123',
      phone: '02-123-4567',
      rating: 4.8,
      reviewCount: 156,
      distance: 0.8,
      operatingHours: { open: '09:00', close: '19:00' },
      amenities: ['주차장', '실내훈련장', '야외운동장', 'CCTV'],
      images: ['/attached_assets/KakaoTalk_Photo_2025-07-05-22-37-00 001_1751722697059.png'],
      services: ['기본 순종 훈련', '행동 교정', '사회화 훈련', '어질리티'],
      priceRange: '50,000원 - 150,000원',
      isPartner: true,
      coordinates: { lat: 37.5013, lng: 127.0396 },
      specialFeatures: ['1:1 전담 트레이너', '주말 특별 프로그램'],
      bookingAvailable: true
    },
    {
      id: 2,
      name: '프리미엄 펫 그루밍',
      type: 'grooming',
      description: '전문 그루머가 제공하는 프리미엄 미용 서비스입니다.',
      address: '서울시 마포구 연남동 123-45',
      phone: '02-567-8901',
      rating: 4.6,
      reviewCount: 178,
      distance: 3.1,
      operatingHours: { open: '09:30', close: '20:00' },
      amenities: ['개별 미용실', '스파', '네일케어', '주차 가능'],
      images: ['/attached_assets/KakaoTalk_Photo_2025-07-05-22-37-00 002_1751722697071.png'],
      services: ['기본 미용', '스타일링', '스파', '네일 케어'],
      priceRange: '25,000원 - 80,000원',
      isPartner: true,
      coordinates: { lat: 37.5636, lng: 126.9253 },
      specialFeatures: ['친환경 제품 사용', '스트레스 완화 아로마'],
      bookingAvailable: true
    },
    {
      id: 3,
      name: '24시 반려동물 병원',
      type: 'hospital',
      description: '24시간 응급 진료가 가능한 반려동물 전문 병원입니다.',
      address: '서울시 서초구 반포대로 45',
      phone: '02-456-7890',
      rating: 4.7,
      reviewCount: 312,
      distance: 2.3,
      operatingHours: { open: '24시간', close: '24시간' },
      amenities: ['응급실', 'CT/MRI', '입원실', '주차장'],
      images: ['/attached_assets/KakaoTalk_Photo_2025-07-05-22-37-00 003_1751722697072.png'],
      services: ['응급 진료', '건강검진', '수술', '입원 치료'],
      priceRange: '30,000원 - 500,000원',
      isPartner: true,
      coordinates: { lat: 37.5047, lng: 127.0051 },
      specialFeatures: ['24시간 응급실', '전문의 상주'],
      bookingAvailable: true
    },
    {
      id: 4,
      name: '펫 리조트 펜션',
      type: 'hotel',
      description: '반려견과 함께 머물 수 있는 프리미엄 펜션입니다.',
      address: '경기도 가평군 청평면',
      phone: '031-345-6789',
      rating: 4.9,
      reviewCount: 234,
      distance: 45.6,
      operatingHours: { open: '15:00', close: '11:00' },
      amenities: ['개별 정원', '수영장', '바베큐장', '산책로'],
      images: ['/attached_assets/image_1746582251297.png'],
      services: ['숙박', '반려견 용품 대여', '산책 서비스', '케어 서비스'],
      priceRange: '120,000원 - 300,000원',
      isPartner: false,
      coordinates: { lat: 37.7556, lng: 127.4306 },
      specialFeatures: ['자연 친화적 환경', '개별 놀이공간'],
      bookingAvailable: true
    },
    {
      id: 5,
      name: '도심 펫 위탁센터',
      type: 'daycare',
      description: '낮 시간 반려견 위탁 관리 전문 센터입니다.',
      address: '서울시 용산구 이태원로 67',
      phone: '02-789-0123',
      rating: 4.4,
      reviewCount: 92,
      distance: 1.8,
      operatingHours: { open: '07:00', close: '20:00' },
      amenities: ['놀이방', '산책서비스', 'CCTV', '픽업서비스'],
      images: ['/attached_assets/KakaoTalk_Photo_2025-07-05-22-37-00 001_1751722697059.png'],
      services: ['일일 돌봄', '사회화 프로그램', '간식 제공', '건강 체크'],
      priceRange: '30,000원 - 70,000원',
      isPartner: true,
      coordinates: { lat: 37.5400, lng: 126.9921 },
      specialFeatures: ['소규모 그룹 관리', '실시간 알림 서비스'],
      bookingAvailable: true
    },
    {
      id: 6,
      name: '한강 반려견 놀이공원',
      type: 'park',
      description: '넓은 야외 공간에서 자유롭게 뛰어놀 수 있는 놀이공원입니다.',
      address: '서울시 영등포구 여의도동 한강공원',
      phone: '02-345-6789',
      rating: 4.3,
      reviewCount: 445,
      distance: 4.2,
      operatingHours: { open: '06:00', close: '22:00' },
      amenities: ['대형 운동장', '어질리티 시설', '음수대', '그늘막'],
      images: ['/attached_assets/KakaoTalk_Photo_2025-07-05-22-37-00 002_1751722697071.png'],
      services: ['자유 놀이', '어질리티 체험', '산책로', '소셜라이징'],
      priceRange: '5,000원 - 15,000원',
      isPartner: false,
      coordinates: { lat: 37.5274, lng: 126.9340 },
      specialFeatures: ['한강 뷰', '대형견 전용 구역'],
      bookingAvailable: false
    },
    {
      id: 7,
      name: '해피독 카페',
      type: 'cafe',
      description: '반려견과 함께 즐길 수 있는 아늑한 카페입니다.',
      address: '서울시 홍대입구역 근처',
      phone: '02-234-5678',
      rating: 4.5,
      reviewCount: 89,
      distance: 1.2,
      operatingHours: { open: '10:00', close: '22:00' },
      amenities: ['반려견 놀이터', 'Wi-Fi', '주차장', '테라스'],
      images: ['/attached_assets/KakaoTalk_Photo_2025-07-05-22-37-00 003_1751722697072.png'],
      services: ['반려견 메뉴', '생일파티', '사진촬영', '놀이시설'],
      priceRange: '8,000원 - 25,000원',
      isPartner: true,
      coordinates: { lat: 37.5563, lng: 126.9236 },
      specialFeatures: ['펫 프렌들리 메뉴', '인스타 포토존'],
      bookingAvailable: true
    }
  ];

  useEffect(() => {
    loadFacilities();
    getCurrentLocation();
    checkKakaoMapsAPI();
  }, []);

  useEffect(() => {
    filterAndSortFacilities();
  }, [facilities, searchTerm, typeFilter, sortBy, userLocation]);

  useEffect(() => {
    console.log('지도 초기화 조건 확인:', {
      viewMode,
      hasMapRef: !!mapRef.current,
      hasMapInstance: !!mapInstance.current,
      isMapReady
    });
    
    if (viewMode === 'map' && mapRef.current && !mapInstance.current && isMapReady) {
      console.log('지도 초기화 실행');
      initializeMap();
    }
  }, [viewMode, filteredFacilities, userLocation, isMapReady]);

  useEffect(() => {
    if (mapInstance.current && filteredFacilities.length > 0) {
      updateMapMarkers();
    }
  }, [filteredFacilities]);

  const checkKakaoMapsAPI = () => {
    console.log('카카오맵 API 로드 상태 확인 중...');
    
    if (window.kakao && window.kakao.maps) {
      console.log('카카오맵 API 로드 완료');
      setIsMapReady(true);
    } else {
      console.log('카카오맵 API 로드 중... 재시도 예정');
      
      // API가 로드되지 않은 경우 잠시 후 다시 시도
      const timer = setTimeout(() => {
        if (window.kakao && window.kakao.maps) {
          console.log('카카오맵 API 로드 완료 (재시도 성공)');
          setIsMapReady(true);
        } else {
          console.error('카카오맵 API 로드 실패');
          // 3초 후 한 번 더 시도
          setTimeout(() => {
            if (window.kakao && window.kakao.maps) {
              console.log('카카오맵 API 로드 완료 (최종 재시도 성공)');
              setIsMapReady(true);
            } else {
              console.error('카카오맵 API 최종 로드 실패');
            }
          }, 3000);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  };

  const loadFacilities = async () => {
    try {
      setIsLoading(true);
      // 시뮬레이션 지연
      await new Promise(resolve => setTimeout(resolve, 1000));
      setFacilities(sampleFacilities);
    } catch (error) {
      console.error('시설 목록 로딩 실패:', error);
      toast({
        title: "데이터 로딩 실패",
        description: "시설 목록을 불러올 수 없습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('위치 정보를 가져올 수 없습니다:', error);
          // 서울 시청 좌표를 기본값으로 설정
          setUserLocation({ lat: 37.5665, lng: 126.9780 });
        }
      );
    } else {
      setUserLocation({ lat: 37.5665, lng: 126.9780 });
    }
  };

  const filterAndSortFacilities = () => {
    let filtered = facilities;

    // 검색 필터
    if (searchTerm) {
      filtered = filtered.filter(facility =>
        facility.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facility.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facility.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 타입 필터
    if (typeFilter !== 'all') {
      filtered = filtered.filter(facility => facility.type === typeFilter);
    }

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return a.distance - b.distance;
        case 'rating':
          return b.rating - a.rating;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    setFilteredFacilities(filtered);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'training': return <Building className="h-5 w-5" />;
      case 'cafe': return <Coffee className="h-5 w-5" />;
      case 'pension': return <Home className="h-5 w-5" />;
      case 'hospital': return <Building className="h-5 w-5 text-destructive" />;
      case 'grooming': return <Star className="h-5 w-5" />;
      default: return <MapPin className="h-5 w-5" />;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'training': return '훈련소';
      case 'cafe': return '카페';
      case 'pension': return '펜션';
      case 'hospital': return '병원';
      case 'grooming': return '미용실';
      default: return '기타';
    }
  };

  const handleNavigate = (facility: Facility) => {
    const url = `https://map.kakao.com/link/to/${facility.name},${facility.coordinates.lat},${facility.coordinates.lng}`;
    window.open(url, '_blank');
  };

  const handleReservation = (facilityId: number) => {
    // 예약 페이지로 이동 또는 모달 열기
    window.location.href = `/reservation/${facilityId}`;
  };

  const initializeMap = () => {
    if (!window.kakao || !window.kakao.maps) {
      console.error('Kakao Maps API not loaded');
      // 백업 지도 표시
      if (mapRef.current) {
        mapRef.current.innerHTML = `
          <div class="w-full h-full flex items-center justify-center flex-col bg-gray-50 rounded-lg">
            <div class="text-2xl mb-4">🗺️</div>
            <div class="text-base text-gray-600 mb-2">지도를 로드하는 중...</div>
            <div class="text-sm text-gray-500">잠시만 기다려주세요</div>
          </div>
        `;
      }
      return;
    }

    try {
      const container = mapRef.current;
      if (!container) return;

      const options = {
        center: new window.kakao.maps.LatLng(
          userLocation?.lat || 37.5665, 
          userLocation?.lng || 126.9780
        ),
        level: 5
      };

      mapInstance.current = new window.kakao.maps.Map(container, options);
      console.log('카카오맵 초기화 완료');
      updateMapMarkers();
    } catch (error) {
      console.error('지도 초기화 실패:', error);
      // 에러 발생 시 백업 표시
      if (mapRef.current) {
        mapRef.current.innerHTML = `
          <div class="w-full h-full flex items-center justify-center flex-col bg-gray-50 rounded-lg">
            <div class="text-2xl mb-4">❌</div>
            <div class="text-base text-gray-600 mb-2">지도를 로드할 수 없습니다</div>
            <div class="text-sm text-gray-500">페이지를 새로고침해주세요</div>
          </div>
        `;
      }
    }
  };

  const updateMapMarkers = () => {
    if (!mapInstance.current || !window.kakao) return;

    // 기존 마커 제거 (실제로는 마커 배열을 관리해야 함)
    
    // 사용자 위치 마커
    if (userLocation) {
      const userMarkerPosition = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);
      const userMarker = new window.kakao.maps.Marker({
        position: userMarkerPosition,
        map: mapInstance.current
      });

      const userInfoWindow = new window.kakao.maps.InfoWindow({
        content: '<div style="padding:5px;">내 위치</div>'
      });
      userInfoWindow.open(mapInstance.current, userMarker);
    }

    // 시설 마커들
    filteredFacilities.forEach((facility) => {
      const markerPosition = new window.kakao.maps.LatLng(
        facility.coordinates.lat, 
        facility.coordinates.lng
      );
      
      const marker = new window.kakao.maps.Marker({
        position: markerPosition,
        map: mapInstance.current
      });

      const infoContent = `
        <div style="padding:10px; min-width:200px;">
          <h4 style="margin:0 0 5px 0; font-weight:bold;">${facility.name}</h4>
          <p style="margin:0 0 5px 0; font-size:12px; color:hsl(var(--muted-foreground));">${getTypeName(facility.type)}</p>
          <p style="margin:0 0 5px 0; font-size:12px;">${facility.address}</p>
          <div style="display:flex; align-items:center; margin:5px 0;">
            <span style="color:hsl(var(--warning));">★</span>
            <span style="font-size:12px; margin-left:2px;">${facility.rating} (${facility.reviewCount})</span>
            <span style="font-size:12px; margin-left:10px; color:hsl(var(--primary));">${facility.distance}km</span>
          </div>
          <button 
            onclick="window.open('tel:${facility.phone}')" 
            style="background:hsl(var(--primary)); color:white; border:none; padding:4px 8px; border-radius:4px; font-size:12px; cursor:pointer; margin-right:5px;"
          >
            전화
          </button>
          <button 
            onclick="window.location.href='/reservation/${facility.id}'" 
            style="background:hsl(var(--success)); color:white; border:none; padding:4px 8px; border-radius:4px; font-size:12px; cursor:pointer;"
          >
            예약
          </button>
        </div>
      `;

      const infoWindow = new window.kakao.maps.InfoWindow({
        content: infoContent
      });

      window.kakao.maps.event.addListener(marker, 'click', () => {
        infoWindow.open(mapInstance.current, marker);
        setSelectedFacility(facility);
      });

      // 파트너 시설은 다른 색상 마커 사용 (실제로는 커스텀 마커 이미지 필요)
      if (facility.isPartner) {
        // 파트너 마커 스타일링 로직
      }
    });

    // 지도 범위 조정
    if (filteredFacilities.length > 0) {
      const bounds = new window.kakao.maps.LatLngBounds();
      
      if (userLocation) {
        bounds.extend(new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng));
      }
      
      filteredFacilities.forEach(facility => {
        bounds.extend(new window.kakao.maps.LatLng(facility.coordinates.lat, facility.coordinates.lng));
      });
      
      mapInstance.current.setBounds(bounds);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">주변 시설 찾기</h1>
        <p className="text-gray-600">내 위치 기반으로 훈련소, 카페, 펜션 등 반려견 친화 시설을 찾아보세요.</p>
      </div>

      {/* 필터 및 검색 */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="시설명, 주소로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="시설 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 시설</SelectItem>
                <SelectItem value="training">훈련소</SelectItem>
                <SelectItem value="cafe">카페</SelectItem>
                <SelectItem value="pension">펜션</SelectItem>
                <SelectItem value="hospital">병원</SelectItem>
                <SelectItem value="grooming">미용실</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="정렬 기준" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="distance">거리순</SelectItem>
                <SelectItem value="rating">평점순</SelectItem>
                <SelectItem value="name">이름순</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* 보기 모드 선택 */}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'list' | 'map')}>
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                목록보기
              </TabsTrigger>
              <TabsTrigger value="map" className="flex items-center gap-2">
                <Map className="h-4 w-4" />
                지도보기
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* 컨텐츠 영역 */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'list' | 'map')}>
        <TabsContent value="list">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded-t-lg"></div>
              <CardContent className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))
        ) : filteredFacilities.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">검색 조건에 맞는 시설이 없습니다.</p>
          </div>
        ) : (
          filteredFacilities.map((facility) => (
            <Card key={facility.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                <img
                  src={facility.images[0]}
                  alt={facility.name}
                  className="w-full h-48 object-cover"
                />
                {facility.isPartner && (
                  <Badge className="absolute top-2 right-2 bg-primary">인증 파트너</Badge>
                )}
                <div className="absolute bottom-2 left-2">
                  <Badge variant="secondary" className="bg-white/90">
                    {getTypeName(facility.type)}
                  </Badge>
                </div>
              </div>
              
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(facility.type)}
                    <h3 className="font-semibold text-lg">{facility.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    <span className="text-sm font-medium">{facility.rating}</span>
                    <span className="text-xs text-gray-500">({facility.reviewCount})</span>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {facility.description}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{facility.address}</span>
                    <span className="text-primary font-medium">{facility.distance}km</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{facility.phone}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      {facility.operatingHours.open} - {facility.operatingHours.close}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {facility.amenities.slice(0, 3).map((amenity, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {amenity}
                    </Badge>
                  ))}
                  {facility.amenities.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{facility.amenities.length - 3}
                    </Badge>
                  )}
                </div>

                <div className="text-sm text-gray-600 mb-4">
                  <strong>가격대:</strong> {facility.priceRange}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleNavigate(facility)}
                    className="flex-1"
                  >
                    <Navigation className="h-4 w-4 mr-1" />
                    길찾기
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleReservation(facility.id)}
                    className="flex-1"
                  >
                    예약하기
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
          </div>
        </TabsContent>

        <TabsContent value="map">
          {/* 지도 보기 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 지도 영역 */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-0">
                  <NaverMapView
                    locations={filteredFacilities.map(f => ({
                      id: f.id,
                      name: f.name,
                      address: f.address,
                      coordinates: {
                        lat: f.coordinates.lat,
                        lng: f.coordinates.lng
                      }
                    }))}
                    center={
                      userLocation
                        ? { lat: userLocation.lat, lng: userLocation.lng }
                        : { lat: 37.5665, lng: 126.9780 }
                    }
                    onLocationSelect={(location) => {
                      const facility = facilities.find(f => f.id === location.id);
                      if (facility) setSelectedFacility(facility);
                    }}
                    height="600px"
                    zoom={13}
                  />
                </CardContent>
              </Card>
            </div>

            {/* 선택된 시설 정보 */}
            <div className="lg:col-span-1">
              {selectedFacility ? (
                <Card>
                  <CardContent className="p-4">
                    <div className="relative mb-4">
                      <img
                        src={selectedFacility.images[0]}
                        alt={selectedFacility.name}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      {selectedFacility.isPartner && (
                        <Badge className="absolute top-2 right-2 bg-primary">인증 파트너</Badge>
                      )}
                    </div>

                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(selectedFacility.type)}
                        <h3 className="font-semibold text-lg">{selectedFacility.name}</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-warning text-warning" />
                        <span className="text-sm font-medium">{selectedFacility.rating}</span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">
                      {selectedFacility.description}
                    </p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{selectedFacility.address}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{selectedFacility.phone}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">
                          {selectedFacility.operatingHours.open} - {selectedFacility.operatingHours.close}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {selectedFacility.amenities.map((amenity, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {amenity}
                        </Badge>
                      ))}
                    </div>

                    <div className="text-sm text-gray-600 mb-4">
                      <strong>가격대:</strong> {selectedFacility.priceRange}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleNavigate(selectedFacility)}
                        className="flex-1"
                      >
                        <Navigation className="h-4 w-4 mr-1" />
                        길찾기
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleReservation(selectedFacility.id)}
                        className="flex-1"
                      >
                        예약하기
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">지도에서 시설을 클릭하면</p>
                    <p className="text-gray-500">상세 정보가 표시됩니다.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}