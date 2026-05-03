import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GoogleMapView } from "@/components/GoogleMapView";
import { WeatherInfo } from "@/components/WeatherInfo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, Filter, MapPin, Star, Users, Building, Calendar, 
  Shield, Sparkles, BookOpen, Coffee, Droplets, Tent, Home,
  Map, PawPrint, Scissors, Heart, Loader2, Award, X,
  ChevronLeft, ChevronRight, ExternalLink, Phone, Clock,
  Image as ImageIcon, MessageSquare, Info, Cloud, Mail, GraduationCap, Edit, Bot, Navigation, Utensils, Trees, CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import InstitutesBannerImage from '@assets/stock_images/happy_dog_training_o_e67db05d.jpg';

// 훈련사 목록 컴포넌트
function TrainersList({ instituteId, instituteName }: { instituteId: string | number; instituteName: string }) {
  const { data: trainersData, isLoading } = useQuery({
    queryKey: ['/api/trainers', instituteId],
    queryFn: async () => {
      const response = await fetch(`/api/trainers?instituteId=${instituteId}`);
      if (!response.ok) throw new Error('Failed to fetch trainers');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const trainers = trainersData?.data || trainersData || [];

  if (trainers.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-gray-500 dark:text-gray-400">등록된 훈련사가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {trainers.map((trainer: any) => (
        <Card 
          key={trainer.id}
          className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            window.location.href = `/trainers/${trainer.id}`;
          }}
        >
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">{trainer.name}</h3>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {trainer.specialty && (
                  <div className="flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span>{trainer.specialty}</span>
                  </div>
                )}
                {trainer.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{trainer.email}</span>
                  </div>
                )}
                {trainer.experience && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-warning" />
                    <span>경력 {trainer.experience}년</span>
                  </div>
                )}
              </div>
              {trainer.certification && (
                <Badge variant="outline" className="mt-2">
                  <Shield className="h-3 w-3 mr-1" />
                  인증 훈련사
                </Badge>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// 위치 서비스 타입 정의
type LocationType = 
  | "all" 
  | "교육 센터" 
  | "훈련소" 
  | "펜션" 
  | "카페" 
  | "수영장" 
  | "캠핑장" 
  | "병원" 
  | "미용"
  | "음식점"
  | "공원";

// 견종 카테고리
type DogBreed = 
  | "all" 
  | "소형견" 
  | "중형견" 
  | "대형견" 
  | "특수견" 
  | "반려견 전체";

// 지역 카테고리
type Region = 
  | "all" 
  | "서울" 
  | "경기" 
  | "인천" 
  | "강원" 
  | "충청" 
  | "전라" 
  | "경상" 
  | "제주";

export default function LocationServices() {
  const [filter, setFilter] = useState<LocationType>("all");
  const [regionFilter, setRegionFilter] = useState<Region>("all");
  
  // 리뷰 표시 설정 조회
  const { data: reviewsSettingData } = useQuery({
    queryKey: ['/api/settings', 'reviews_enabled'],
    queryFn: async () => {
      const response = await fetch('/api/settings?key=reviews_enabled');
      if (!response.ok) return { data: { value: 'true' } }; // 기본값: 표시
      return response.json();
    },
  });
  const reviewsEnabled = reviewsSettingData?.data?.value === 'true';
  const [breedFilter, setBreedFilter] = useState<DogBreed>("all");
  const [specialFilter, setSpecialFilter] = useState<string>("none"); // 'none', 'certification', 'premium'
  const [selectedInstitute, setSelectedInstitute] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [imageIndices, setImageIndices] = useState<Record<string, number>>({});
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailInstitute, setDetailInstitute] = useState<any | null>(null);
  const [trainersDialogOpen, setTrainersDialogOpen] = useState(false);
  const [selectedInstituteForTrainers, setSelectedInstituteForTrainers] = useState<any | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingInstitute, setEditingInstitute] = useState<any | null>(null);
  const [aiMatchDialogOpen, setAiMatchDialogOpen] = useState(false);
  const [aiMatchingPet, setAiMatchingPet] = useState<any | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [isAiMatching, setIsAiMatching] = useState(false);
  const [mobileMapDialogOpen, setMobileMapDialogOpen] = useState(false);
  const [myLocationEnabled, setMyLocationEnabled] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [locationPermissionDialogOpen, setLocationPermissionDialogOpen] = useState(false);
  const { toast} = useToast();
  
  // 정렬 기준 초기화 (URL 파라미터 > 로컬스토리지 > 기본값)
  // lazy initializer를 사용하여 SSR/테스트 환경에서 안전하게 처리
  const [sortBy, setSortBy] = useState<string>(() => {
    // window가 없는 환경(SSR, 테스트)에서는 기본값 반환
    if (typeof window === 'undefined') {
      return 'distance';
    }
    
    try {
      // 1. URL 파라미터 확인
      const urlParams = new URLSearchParams(window.location.search);
      const urlSort = urlParams.get('sort');
      if (urlSort && ['distance', 'rating', 'reviews', 'name'].includes(urlSort)) {
        return urlSort;
      }
      
      // 2. 로컬스토리지 확인
      const savedSort = localStorage.getItem('institutes_sort_by');
      if (savedSort && ['distance', 'rating', 'reviews', 'name'].includes(savedSort)) {
        return savedSort;
      }
    } catch (error) {
      // localStorage 접근 불가 시 기본값
      console.warn('Failed to access localStorage:', error);
    }
    
    // 3. 기본값
    return 'distance';
  });
  
  // 정렬 기준 변경 시 로컬스토리지 및 URL 업데이트
  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    
    // 브라우저 환경에서만 실행
    if (typeof window === 'undefined') return;
    
    try {
      // 로컬스토리지에 저장
      localStorage.setItem('institutes_sort_by', newSort);
      
      // URL 파라미터 업데이트 (히스토리에 추가하지 않음)
      const url = new URL(window.location.href);
      url.searchParams.set('sort', newSort);
      window.history.replaceState({}, '', url.toString());
    } catch (error) {
      console.warn('Failed to save sort preference:', error);
    }
  };
  
  // 로그인 사용자 정보 가져오기
  const getUserInfo = () => {
    const storedAuth = localStorage.getItem('petedu_auth');
    if (!storedAuth) return null;
    try {
      return JSON.parse(storedAuth);
    } catch {
      return null;
    }
  };
  
  // 수정 권한 확인
  const canEditInstitute = (institute: any) => {
    const userInfo = getUserInfo();
    if (!userInfo) return false;
    
    // 전체 관리자는 모든 기관 수정 가능
    if (userInfo.role === 'admin') return true;
    
    // 기관 관리자는 자신의 기관만 수정 가능 (타입 통일)
    if (userInfo.role === 'institute-admin' && Number(userInfo.instituteId) === Number(institute.id)) return true;
    
    return false;
  };
  
  // 실제 기관 데이터 가져오기
  const { data: institutesData, isLoading } = useQuery({
    queryKey: ['/api/institutes'],
  });
  
  // 로그인 상태 확인 함수
  const isAuthenticated = (): boolean => {
    const storedAuth = localStorage.getItem('petedu_auth');
    return storedAuth !== null;
  };
  
  // 로그인 유도 함수
  const promptLogin = () => {
    toast({
      title: "로그인이 필요합니다",
      description: "이 기능을 사용하려면 로그인이 필요합니다.",
      variant: "default",
    });
    
    // 3초 후 로그인 페이지로 이동
    setTimeout(() => {
      window.location.href = "/auth";
    }, 3000);
  };

  // AI 매칭 핸들러
  const handleAiMatch = async (petId: number) => {
    setIsAiMatching(true);
    setAiRecommendations([]);
    
    try {
      const response = await apiRequest('POST', '/api/ai/match-institutes', { petId }) as any;
      
      if (response.success) {
        setAiMatchingPet(response.pet);
        setAiRecommendations(response.recommendations || []);
        
        toast({
          title: "AI 분석 완료",
          description: `${response.pet.name}에게 적합한 기관을 찾았습니다.`,
          variant: "default",
        });
      } else {
        throw new Error(response.error || 'AI 매칭 실패');
      }
    } catch (error) {
      console.error('AI 매칭 오류:', error);
      toast({
        title: "AI 매칭 실패",
        description: error instanceof Error ? error.message : "잠시 후 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsAiMatching(false);
    }
  };

  // 추천 기관 상세보기
  const handleViewRecommendedInstitute = (instituteId: number) => {
    const allInstitutes = [...(institutes || []), ...searchResults];
    const institute = allInstitutes.find(inst => Number(inst.id) === Number(instituteId));
    
    if (institute) {
      setDetailInstitute(institute);
      setDetailDialogOpen(true);
    } else {
      toast({
        title: "기관을 찾을 수 없습니다",
        description: "해당 기관 정보를 불러올 수 없습니다.",
        variant: "destructive",
      });
    }
  };

  // 거리 계산 함수 (Haversine 공식)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // 지구 반지름 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // km 단위 거리
  };

  // 카테고리별 검색 키워드 매핑
  const getCategorySearchKeyword = (category: LocationType): string => {
    const keywords: Record<string, string> = {
      "훈련소": "반려견 훈련소 애견훈련",
      "교육 센터": "반려견 교육센터 애견학교",
      "펜션": "반려견 펜션 애견펜션 pet pension",
      "카페": "반려견 카페 애견카페 pet cafe",
      "수영장": "반려견 수영장 애견수영장 pet pool",
      "캠핑장": "반려견 캠핑장 애견캠핑 pet camping",
      "병원": "동물병원 애견병원 veterinary",
      "미용": "반려견 미용 애견미용 pet grooming",
      "음식점": "반려견 음식점 애견 레스토랑 pet restaurant dog friendly restaurant",
      "공원": "반려견 공원 애견공원 pet park dog park"
    };
    return keywords[category] || category;
  };

  // 내 위치 찾기 토글 핸들러 - 먼저 권한 확인 다이얼로그 표시
  const handleFindNearby = async () => {
    // 이미 켜져있으면 끄기 (기존 검색 결과는 유지)
    if (myLocationEnabled) {
      setMyLocationEnabled(false);
      setUserLocation(null);
      toast({
        title: "내 위치 찾기 해제",
        description: "내 위치 추적이 비활성화되었습니다. 검색 결과는 유지됩니다.",
      });
      return;
    }

    // 위치 권한 확인 다이얼로그 표시
    setLocationPermissionDialogOpen(true);
  };

  // 실제 위치 요청 및 검색 수행
  const executeLocationSearch = async () => {
    setLocationPermissionDialogOpen(false);
    setIsSearching(true);
    
    try {
      // 사용자 위치 가져오기
      if (!navigator.geolocation) {
        toast({
          title: "위치 서비스 사용 불가",
          description: "브라우저에서 위치 서비스를 지원하지 않습니다.",
          variant: "destructive",
        });
        setIsSearching(false);
        return;
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { 
          timeout: 10000,
          enableHighAccuracy: true 
        });
      });

      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      console.log('[Find Nearby] 사용자 위치:', location);
      
      // 내 위치 저장 및 활성화
      setUserLocation(location);
      setMyLocationEnabled(true);

      // 반려견 관련 장소 검색 (여러 카테고리)
      const searchQueries = [
        "반려견 훈련소",
        "동물병원",
        "반려견 카페",
        "반려견 펜션",
        "반려견 미용"
      ];

      const allResults: any[] = [];

      // 모든 카테고리 검색
      for (const query of searchQueries) {
        const apiUrl = `/api/locations/search?query=${encodeURIComponent(query)}&lat=${location.lat}&lng=${location.lng}`;
        const response = await fetch(apiUrl);
        
        if (response.ok) {
          const results = await response.json();
          allResults.push(...results);
        }
      }

      console.log('[Find Nearby] 검색 결과:', allResults.length, '개');

      // 거리 계산 및 정렬
      const resultsWithDistance = allResults.map((place: any) => {
        const distance = calculateDistance(
          location.lat,
          location.lng,
          parseFloat(place.latitude),
          parseFloat(place.longitude)
        );

        const address = place.address || '';
        let region = '기타';
        if (address.includes('서울')) region = '서울';
        else if (address.includes('경기')) region = '경기';
        else if (address.includes('인천')) region = '인천';
        else if (address.includes('강원')) region = '강원';
        else if (address.includes('충청') || address.includes('충남') || address.includes('충북') || address.includes('대전') || address.includes('세종')) region = '충청';
        else if (address.includes('전라') || address.includes('전남') || address.includes('전북') || address.includes('광주')) region = '전라';
        else if (address.includes('경상') || address.includes('경남') || address.includes('경북') || address.includes('부산') || address.includes('대구') || address.includes('울산')) region = '경상';
        else if (address.includes('제주')) region = '제주';

        return {
          id: place.id,
          name: place.name,
          location: place.address,
          latitude: place.latitude.toString(),
          longitude: place.longitude.toString(),
          image: place.photo || '/images/institutes/default-institute.png',
          images: place.photos || (place.photo ? [place.photo] : ['/images/institutes/default-institute.png']),
          category: place.category || '기타',
          rating: place.rating || 4.0,
          reviews: place.reviews || Math.floor(Math.random() * 50) + 10,
          established: place.established || '2020',
          trainers: place.trainers || Math.floor(Math.random() * 10) + 1,
          courses: place.courses || Math.floor(Math.random() * 20) + 5,
          description: place.description || `${place.category} 전문 시설`,
          facilities: place.facilities || ['편의시설'],
          openingHours: place.openingHours || '영업시간 문의',
          certification: place.certification || false,
          premium: false,
          isTalez: place.isTalez || false,
          sourceUrl: place.sourceUrl || null,
          phone: place.phone || '',
          region: region,
          breedSupport: ["소형견", "중형견", "대형견", "반려견 전체"],
          distance: distance, // 거리 정보 추가
        };
      });

      // 중복 제거 (같은 이름, 같은 주소)
      const uniqueResults = resultsWithDistance.filter((result, index, self) => 
        index === self.findIndex((r) => r.name === result.name && r.location === result.location)
      );

      // 거리순 정렬
      const sortedResults = uniqueResults.sort((a, b) => a.distance - b.distance);

      console.log('[Find Nearby] 정렬된 결과:', sortedResults.length, '개');

      setSearchResults(sortedResults);
      setHasSearched(true);
      setFilter("all");
      setSpecialFilter("none");

      toast({
        title: "내 주변 검색 완료",
        description: `${sortedResults.length}개의 반려견 시설을 찾았습니다. 가까운 순으로 정렬됩니다.`,
      });

      if (sortedResults.length > 0) {
        setSelectedInstitute(sortedResults[0]);
      }

    } catch (error: any) {
      console.error('내 위치 찾기 오류:', error);
      
      if (error.code === 1) { // PERMISSION_DENIED
        toast({
          title: "위치 접근 권한 필요",
          description: "브라우저 주소창 왼쪽의 🔒 아이콘을 클릭하여 '위치' 권한을 허용해주세요. 허용 후 '내 위치 찾기' 버튼을 다시 눌러주세요.",
          variant: "destructive",
          duration: 8000,
        });
      } else if (error.code === 2) { // POSITION_UNAVAILABLE
        toast({
          title: "위치 정보 사용 불가",
          description: "현재 위치를 확인할 수 없습니다. 네트워크 연결을 확인하고 다시 시도해주세요.",
          variant: "destructive",
          duration: 6000,
        });
      } else if (error.code === 3) { // TIMEOUT
        toast({
          title: "위치 확인 시간 초과",
          description: "위치 확인에 시간이 너무 오래 걸립니다. 다시 시도해주세요.",
          variant: "destructive",
          duration: 6000,
        });
      } else {
        toast({
          title: "검색 실패",
          description: "위치를 가져오는 중 오류가 발생했습니다. 다시 시도해주세요.",
          variant: "destructive",
          duration: 5000,
        });
      }
    } finally {
      setIsSearching(false);
    }
  };

  // 카테고리 검색 함수
  const handleCategorySearch = async (category: LocationType) => {
    console.log('[Category Search] 시작:', category);
    if (category === "all") return; // 전체는 필터만 적용
    
    const keyword = getCategorySearchKeyword(category);
    console.log('[Category Search] 검색 키워드:', keyword);
    setIsSearching(true);
    
    try {
      let userLocation = { lat: 37.5665, lng: 126.9780 };
      
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          console.log('[Category Search] 사용자 위치:', userLocation);
        } catch (err) {
          console.log('위치 정보를 가져올 수 없습니다. 기본 위치 사용');
        }
      }
      
      const apiUrl = `/api/locations/search?query=${encodeURIComponent(keyword)}&lat=${userLocation.lat}&lng=${userLocation.lng}`;
      console.log('[Category Search] API 호출:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        console.error('[Category Search] API 에러:', response.status, response.statusText);
        throw new Error('검색에 실패했습니다.');
      }
      
      const results = await response.json();
      console.log('[Category Search] API 응답:', results.length, '개 결과');
      
      const formattedResults = results.map((place: any) => {
        const address = place.address || '';
        let region = '기타';
        if (address.includes('서울')) region = '서울';
        else if (address.includes('경기')) region = '경기';
        else if (address.includes('인천')) region = '인천';
        else if (address.includes('강원')) region = '강원';
        else if (address.includes('충청') || address.includes('충남') || address.includes('충북') || address.includes('대전') || address.includes('세종')) region = '충청';
        else if (address.includes('전라') || address.includes('전남') || address.includes('전북') || address.includes('광주')) region = '전라';
        else if (address.includes('경상') || address.includes('경남') || address.includes('경북') || address.includes('부산') || address.includes('대구') || address.includes('울산')) region = '경상';
        else if (address.includes('제주')) region = '제주';
        
        return {
          id: place.id,
          name: place.name,
          location: place.address,
          latitude: place.latitude.toString(),
          longitude: place.longitude.toString(),
          image: place.photo || '/images/institutes/default-institute.png',
          images: place.photos || (place.photo ? [place.photo] : ['/images/institutes/default-institute.png']),
          category: place.category || category, // 서버에서 받은 category 우선 사용
          rating: place.rating || 4.0,
          reviews: place.reviews || Math.floor(Math.random() * 50) + 10,
          established: place.established || '2020',
          trainers: place.trainers || Math.floor(Math.random() * 10) + 1,
          courses: place.courses || Math.floor(Math.random() * 20) + 5,
          description: place.description || `${category} 전문 시설`,
          facilities: place.facilities || ['편의시설'],
          openingHours: place.openingHours || '영업시간 문의',
          certification: place.certification || false,
          premium: false,
          isTalez: place.isTalez || false,
          sourceUrl: place.sourceUrl || null,
          phone: place.phone || '',
          region: region,
          breedSupport: ["소형견", "중형견", "대형견", "반려견 전체"],
        };
      });
      
      console.log('[Category Search] 포맷팅된 결과:', formattedResults);
      
      setSearchResults(formattedResults);
      setHasSearched(true);
      
      console.log('[Category Search] searchResults 상태 업데이트됨');
      
      toast({
        title: `${category} 검색 완료`,
        description: `${formattedResults.length}개의 ${category}를 찾았습니다.`,
      });
      
      if (formattedResults.length > 0) {
        setSelectedInstitute(formattedResults[0]);
      }
      
    } catch (error) {
      console.error('검색 오류:', error);
      toast({
        title: "검색 실패",
        description: "검색 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // 검색 처리 함수 - Google Maps 기반 검색
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "검색어를 입력하세요",
        description: "기관명, 지역 등으로 검색할 수 있습니다.",
        variant: "default",
      });
      return;
    }

    setIsSearching(true);
    
    try {
      // 현재 위치 가져오기 (선택사항)
      let userLocation = { lat: 37.5665, lng: 126.9780 }; // 기본: 서울
      
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
        } catch (err) {
          console.log('위치 정보를 가져올 수 없습니다. 기본 위치 사용');
        }
      }
      
      // Google Maps 기반 검색 API 호출
      const response = await fetch(
        `/api/locations/search?query=${encodeURIComponent(searchTerm)}&lat=${userLocation.lat}&lng=${userLocation.lng}`
      );
      
      if (!response.ok) {
        throw new Error('검색에 실패했습니다.');
      }
      
      const results = await response.json();
      
      // 검색 결과를 기관 형식으로 변환
      const formattedResults = results.map((place: any) => {
        // 주소에서 지역 추출
        const address = place.address || '';
        let region = '기타';
        if (address.includes('서울')) region = '서울';
        else if (address.includes('경기')) region = '경기';
        else if (address.includes('인천')) region = '인천';
        else if (address.includes('강원')) region = '강원';
        else if (address.includes('충청') || address.includes('충남') || address.includes('충북') || address.includes('대전') || address.includes('세종')) region = '충청';
        else if (address.includes('전라') || address.includes('전남') || address.includes('전북') || address.includes('광주')) region = '전라';
        else if (address.includes('경상') || address.includes('경남') || address.includes('경북') || address.includes('부산') || address.includes('대구') || address.includes('울산')) region = '경상';
        else if (address.includes('제주')) region = '제주';
        
        return {
          id: place.id,
          name: place.name,
          location: place.address,
          latitude: place.latitude.toString(),
          longitude: place.longitude.toString(),
          image: place.photo || '/images/institutes/default-institute.png',
          images: place.photos || (place.photo ? [place.photo] : ['/images/institutes/default-institute.png']), // 이미지 배열
          category: place.type === 'institute' ? '훈련소' : '교육 센터',
          rating: place.rating || 4.0,
          reviews: place.reviews || Math.floor(Math.random() * 50) + 10,
          established: place.established || '2020',
          trainers: place.trainers || Math.floor(Math.random() * 10) + 1,
          courses: place.courses || Math.floor(Math.random() * 20) + 5,
          description: place.description || '반려견 전문 교육 기관',
          facilities: place.facilities || ['실내 훈련장', '실외 훈련장', '주차장'],
          openingHours: place.openingHours || '평일 09:00-18:00',
          certification: place.certification || false,
          premium: false,
          isTalez: place.isTalez || false,
          sourceUrl: place.sourceUrl || null, // Google Maps URL
          phone: place.phone || '',
          region: region,
          breedSupport: ["소형견", "중형견", "대형견", "반려견 전체"], // 기본값: 모든 견종 지원
        };
      });
      
      setSearchResults(formattedResults);
      setHasSearched(true); // 검색 수행 표시
      
      toast({
        title: "검색 완료",
        description: `${formattedResults.length}개의 결과를 찾았습니다.`,
      });
      
      // 첫 번째 결과를 선택하여 지도에 표시
      if (formattedResults.length > 0) {
        setSelectedInstitute(formattedResults[0]);
      }
      
    } catch (error) {
      console.error('검색 오류:', error);
      toast({
        title: "검색 실패",
        description: "검색 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }

    // 검색어로 지역 필터 자동 설정
    const lowerSearch = searchTerm.toLowerCase();
    if (lowerSearch.includes('서울')) setRegionFilter('서울');
    else if (lowerSearch.includes('경기')) setRegionFilter('경기');
    else if (lowerSearch.includes('부산') || lowerSearch.includes('경상')) setRegionFilter('경상');
    else if (lowerSearch.includes('인천')) setRegionFilter('인천');
    else if (lowerSearch.includes('강원')) setRegionFilter('강원');
    else if (lowerSearch.includes('충청')) setRegionFilter('충청');
    else if (lowerSearch.includes('전라')) setRegionFilter('전라');
    else if (lowerSearch.includes('제주')) setRegionFilter('제주');
  };
  
  // 위치 정보가 있는 기관만 필터링하고 표시 데이터 매핑
  const institutesArray = Array.isArray((institutesData as any)?.data) ? (institutesData as any).data : [];
  
  const institutes = institutesArray
    .filter((inst: any) => inst.latitude && inst.longitude)
    .map((inst: any) => {
      const defaultImage = "https://images.unsplash.com/photo-1587300003388-59208cc962cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=450";
      const mainImage = inst.logo || defaultImage;
      
      return {
        id: inst.id,
        name: inst.name,
        description: inst.description || '반려동물 교육 기관',
        image: mainImage,
        images: [mainImage], // 이미지 배열 추가
        location: inst.address || '위치 정보 없음',
        rating: inst.rating ? parseFloat(inst.rating) : 4.5,
        reviews: 0,
        trainers: 0,
        courses: 0,
        facilities: [],
        openingHours: "평일 10:00 - 18:00",
        category: "훈련소",
        region: inst.address?.includes('서울') ? '서울' : inst.address?.includes('경기') ? '경기' : inst.address?.includes('부산') ? '경상' : '기타',
        breedSupport: ["소형견", "중형견", "대형견"],
        certification: inst.certification || false, // DB의 certification 필드 사용
        premium: false,
        established: "2020년",
        latitude: inst.latitude,
        longitude: inst.longitude,
        isTalez: true, // DB 기관은 TALEZ 등록 기관
        sourceUrl: null,
        phone: inst.phone || '',
      };
    });

  // 공통 필터 함수
  const applyFilters = (instituteList: any[]) => {
    return instituteList.filter(institute => {
      // 서비스 타입 필터링
      const categoryMatch = filter === "all" || institute.category === filter;
      
      // 지역 필터링
      const regionMatch = regionFilter === "all" || institute.region === regionFilter;
      
      // 견종 필터링 (배열에 포함 여부) - 옵셔널 체이닝 사용
      const breedMatch = breedFilter === "all" || 
        institute.breedSupport?.includes(breedFilter) || 
        institute.breedSupport?.includes("반려견 전체") ||
        false;
      
      // 특수 필터 (인증, 프리미엄)
      const specialMatch = specialFilter === "none" ||
        (specialFilter === "certification" && institute.certification === true) ||
        (specialFilter === "premium" && institute.premium === true);
      
      // 모든 조건을 만족해야 함
      return categoryMatch && regionMatch && breedMatch && specialMatch;
    });
  };
  
  // DB 기관 우선 표시 로직
  // 1. DB 기관 필터링
  const filteredDbInstitutes = applyFilters(institutes);
  
  // 2. 구글 검색 결과 필터링
  const filteredSearchResults = applyFilters(searchResults);
  
  // 3. 중복 제거: DB 기관과 같은 이름의 구글 검색 결과 제거
  const uniqueSearchResults = filteredSearchResults.filter(searchInst => 
    !filteredDbInstitutes.some(dbInst => 
      dbInst.name.toLowerCase().includes(searchInst.name.toLowerCase()) ||
      searchInst.name.toLowerCase().includes(dbInst.name.toLowerCase())
    )
  );
  
  // 4. DB 기관을 먼저 배치하고 구글 검색 결과를 뒤에 추가
  let finalFilteredInstitutes = [...filteredDbInstitutes, ...uniqueSearchResults];
  
  // 5. 정렬 적용
  finalFilteredInstitutes = finalFilteredInstitutes.sort((a, b) => {
    switch (sortBy) {
      case "distance":
        // 거리순 (가까운 순) - distance가 없으면 뒤로
        if (a.distance === undefined && b.distance === undefined) return 0;
        if (a.distance === undefined) return 1;
        if (b.distance === undefined) return -1;
        return a.distance - b.distance;
      
      case "rating":
        // 평점순 (높은 순)
        const ratingA = parseFloat(a.rating) || 0;
        const ratingB = parseFloat(b.rating) || 0;
        return ratingB - ratingA;
      
      case "reviews":
        // 후기 많은 순
        const reviewsA = parseInt(a.reviews) || 0;
        const reviewsB = parseInt(b.reviews) || 0;
        return reviewsB - reviewsA;
      
      case "name":
        // 이름순 (가나다순)
        return a.name.localeCompare(b.name, 'ko');
      
      default:
        return 0;
    }
  });

  // 위치 데이터를 지도용 형식으로 변환하는 함수
  const getLocationFromInstitute = (institute: any) => {
    // 실제 위치 정보 사용
    if (institute.latitude && institute.longitude) {
      return {
        lat: parseFloat(institute.latitude),
        lng: parseFloat(institute.longitude)
      };
    }
    
    // 백업: 기본 서울 좌표
    return {
      lat: 37.5665,
      lng: 126.9780
    };
  };

  // 카테고리별 아이콘
  const getCategoryIcon = (category: string) => {
    switch(category) {
      case "교육 센터": return <Building className="h-4 w-4 mr-1" />;
      case "훈련소": return <PawPrint className="h-4 w-4 mr-1" />;
      case "펜션": return <Home className="h-4 w-4 mr-1" />;
      case "카페": return <Coffee className="h-4 w-4 mr-1" />;
      case "수영장": return <Droplets className="h-4 w-4 mr-1" />;
      case "캠핑장": return <Tent className="h-4 w-4 mr-1" />;
      case "병원": return <Heart className="h-4 w-4 mr-1" />;
      case "미용": return <Scissors className="h-4 w-4 mr-1" />;
      case "음식점": return <Utensils className="h-4 w-4 mr-1" />;
      case "공원": return <Trees className="h-4 w-4 mr-1" />;
      default: return <Building className="h-4 w-4 mr-1" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Banner */}
      <div className="relative h-72 rounded-2xl overflow-hidden mb-8 bg-cover bg-center" style={{ backgroundImage: `url("${InstitutesBannerImage}")` }}>
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent"></div>
        
        <div className="relative h-full flex flex-col justify-center px-6 md:px-10">
          <h1 className="text-white text-xl md:text-3xl font-bold mb-2 md:mb-4 max-w-xl">
            반려견 교육 및 서비스 위치 찾기
          </h1>
          <p className="text-white text-sm md:text-base max-w-xl mb-4">
            내 주변의 반려견 교육 시설, 전문 훈련소, 관련 서비스 위치 정보를 확인하세요.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-lg bg-white dark:bg-gray-800 rounded-lg flex items-center p-1">
            <div className="px-2" aria-hidden="true">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="지역, 분야로 검색 (예: 강남 애견훈련)" 
              aria-label="반려견 시설 검색"
              className="flex-1 py-2 px-2 bg-transparent focus:outline-none text-gray-800 dark:text-gray-200 placeholder:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              data-testid="input-search"
            />
            {searchResults.length > 0 && (
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchResults([]);
                  setSearchTerm("");
                  toast({
                    title: "검색 초기화",
                    description: "검색 결과가 초기화되었습니다.",
                  });
                }}
                className="mr-1"
                data-testid="button-clear-search"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button 
              className="ml-2"
              onClick={handleSearch}
              disabled={isSearching}
              data-testid="button-search"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  검색 중...
                </>
              ) : (
                '검색'
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Advanced Filters Section */}
      <div className="mb-8 flex flex-col gap-4">
        {/* 주요 필터 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* 서비스 종류 필터 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">서비스 종류</label>
            <Select
              value={filter}
              onValueChange={(value: LocationType) => {
                setFilter(value);
                setSpecialFilter("none"); // 특수 필터 초기화
                setHasSearched(true);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="모든 서비스" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 서비스</SelectItem>
                <SelectItem value="교육 센터">교육 센터</SelectItem>
                <SelectItem value="훈련소">훈련소</SelectItem>
                <SelectItem value="펜션">펜션</SelectItem>
                <SelectItem value="카페">카페</SelectItem>
                <SelectItem value="수영장">수영장</SelectItem>
                <SelectItem value="캠핑장">캠핑장</SelectItem>
                <SelectItem value="병원">병원</SelectItem>
                <SelectItem value="미용">미용</SelectItem>
                <SelectItem value="음식점">음식점</SelectItem>
                <SelectItem value="공원">공원</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* 지역 필터 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">지역</label>
            <Select
              value={regionFilter}
              onValueChange={(value: Region) => {
                setRegionFilter(value);
                setHasSearched(true);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="모든 지역" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 지역</SelectItem>
                <SelectItem value="서울">서울</SelectItem>
                <SelectItem value="경기">경기</SelectItem>
                <SelectItem value="인천">인천</SelectItem>
                <SelectItem value="강원">강원</SelectItem>
                <SelectItem value="충청">충청</SelectItem>
                <SelectItem value="전라">전라</SelectItem>
                <SelectItem value="경상">경상</SelectItem>
                <SelectItem value="제주">제주</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* 견종 필터 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">견종 지원</label>
            <Select
              value={breedFilter}
              onValueChange={(value: DogBreed) => {
                setBreedFilter(value);
                setHasSearched(true);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="모든 견종" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 견종</SelectItem>
                <SelectItem value="소형견">소형견</SelectItem>
                <SelectItem value="중형견">중형견</SelectItem>
                <SelectItem value="대형견">대형견</SelectItem>
                <SelectItem value="특수견">특수견</SelectItem>
                <SelectItem value="반려견 전체">무관</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* 인증/프리미엄 필터 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">특별 조건</label>
            <Select
              value={specialFilter}
              onValueChange={(value) => {
                setSpecialFilter(value);
                setHasSearched(true);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">조건 없음</SelectItem>
                <SelectItem value="certification">인증 기관</SelectItem>
                <SelectItem value="premium">프리미엄 기관</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* 빠른 필터 버튼 */}
        <div className="space-y-3 mt-2">
          {/* 상단 헤더 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">빠른 선택</span>
            </div>
            {hasSearched && finalFilteredInstitutes.length > 0 && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                검색 결과: <span className="font-semibold text-primary">{finalFilteredInstitutes.length}개</span>
              </span>
            )}
          </div>
          
          {/* 내 위치 찾기 - 토글 버튼 */}
          <div className="flex gap-2">
            <Button
              variant={myLocationEnabled ? "default" : "outline"}
              size="sm"
              onClick={handleFindNearby}
              disabled={isSearching}
              className={`flex-1 sm:flex-none text-sm h-10 transition-all ${
                myLocationEnabled 
                  ? 'bg-primary hover:bg-primary/90 shadow-lg text-white' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              aria-label={myLocationEnabled ? "내 위치 추적 해제" : "내 위치 기반 주변 시설 찾기"}
              data-testid="button-find-nearby"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Navigation className={`h-4 w-4 mr-2 ${myLocationEnabled ? 'animate-pulse' : ''}`} />
              )}
              {myLocationEnabled ? '내 위치 추적 중' : '내 위치 찾기'}
            </Button>
          </div>
          
          {/* 서비스 카테고리 */}
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">서비스 카테고리</p>
            <div className="flex flex-wrap gap-2">
          
          <Button
            variant={filter === "교육 센터" ? "default" : "outline"}
            size="sm"
            onClick={async () => {
              setFilter("교육 센터"); 
              setSpecialFilter("none");
              await handleCategorySearch("교육 센터");
            }}
            className="text-xs"
            data-testid="button-category-education"
          >
            <Building className="h-3 w-3 mr-1" />
            교육 센터
          </Button>
          
          <Button
            variant={filter === "훈련소" ? "default" : "outline"}
            size="sm"
            onClick={async () => {
              setFilter("훈련소");
              setSpecialFilter("none");
              await handleCategorySearch("훈련소");
            }}
            className="text-xs"
            data-testid="button-category-training"
          >
            <PawPrint className="h-3 w-3 mr-1" />
            훈련소
          </Button>
          
          <Button
            variant={filter === "펜션" ? "default" : "outline"}
            size="sm"
            onClick={async () => {
              setFilter("펜션");
              setSpecialFilter("none");
              await handleCategorySearch("펜션");
            }}
            className="text-xs"
            data-testid="button-category-pension"
          >
            <Home className="h-3 w-3 mr-1" />
            펜션
          </Button>
          
          <Button
            variant={filter === "카페" ? "default" : "outline"}
            size="sm"
            onClick={async () => {
              setFilter("카페");
              setSpecialFilter("none");
              await handleCategorySearch("카페");
            }}
            className="text-xs"
            data-testid="button-category-cafe"
          >
            <Coffee className="h-3 w-3 mr-1" />
            카페
          </Button>
          
          <Button
            variant={filter === "수영장" ? "default" : "outline"}
            size="sm"
            onClick={async () => {
              setFilter("수영장");
              setSpecialFilter("none");
              await handleCategorySearch("수영장");
            }}
            className="text-xs"
            data-testid="button-category-pool"
          >
            <Droplets className="h-3 w-3 mr-1" />
            수영장
          </Button>
          
          <Button
            variant={filter === "캠핑장" ? "default" : "outline"}
            size="sm"
            onClick={async () => {
              setFilter("캠핑장");
              setSpecialFilter("none");
              await handleCategorySearch("캠핑장");
            }}
            className="text-xs"
            data-testid="button-category-camping"
          >
            <Tent className="h-3 w-3 mr-1" />
            캠핑장
          </Button>
          
          <Button
            variant={filter === "병원" ? "default" : "outline"}
            size="sm"
            onClick={async () => {
              setFilter("병원");
              setSpecialFilter("none");
              await handleCategorySearch("병원");
            }}
            className="text-xs"
            data-testid="button-category-hospital"
          >
            <Heart className="h-3 w-3 mr-1" />
            병원
          </Button>
          
          <Button
            variant={filter === "미용" ? "default" : "outline"}
            size="sm"
            onClick={async () => {
              setFilter("미용");
              setSpecialFilter("none");
              await handleCategorySearch("미용");
            }}
            className="text-xs"
            data-testid="button-category-grooming"
          >
            <Scissors className="h-3 w-3 mr-1" />
            미용
          </Button>
          
          <Button
            variant={filter === "음식점" ? "default" : "outline"}
            size="sm"
            onClick={async () => {
              setFilter("음식점");
              setSpecialFilter("none");
              await handleCategorySearch("음식점");
            }}
            className="text-xs"
            data-testid="button-category-restaurant"
          >
            <Utensils className="h-3 w-3 mr-1" />
            음식점
          </Button>
          
          <Button
            variant={filter === "공원" ? "default" : "outline"}
            size="sm"
            onClick={async () => {
              setFilter("공원");
              setSpecialFilter("none");
              await handleCategorySearch("공원");
            }}
            className="text-xs h-9"
            data-testid="button-category-park"
          >
            <Trees className="h-3 w-3 mr-1" />
            공원
          </Button>
            </div>
          </div>
          
          {/* 특별 조건 */}
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">특별 조건</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={specialFilter === "certification" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSpecialFilter("certification");
                  setFilter("all");
                  setHasSearched(true);
                }}
                className="text-xs h-9"
                aria-label="TALEZ 인증 기관만 보기"
              >
                <Shield className="h-3 w-3 mr-1" />
                인증 기관
              </Button>
              
              <Button
                variant={specialFilter === "premium" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSpecialFilter("premium");
                  setFilter("all");
                  setHasSearched(true);
                }}
                className="text-xs h-9"
                aria-label="프리미엄 기관만 보기"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                프리미엄 기관
              </Button>
              
              {/* AI 추천 버튼 */}
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  if (!isAuthenticated()) {
                    promptLogin();
                    return;
                  }
                  setAiMatchDialogOpen(true);
                }}
                className="text-xs h-9 bg-primary hover:bg-primary/90"
                aria-label="AI가 내 반려견에게 맞는 기관 추천"
                data-testid="button-ai-match"
              >
                <Bot className="h-3 w-3 mr-1" />
                AI 추천
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Two Column Layout: 리스트 + 지도 */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* 왼쪽 열 - 위치 서비스 목록 */}
        <div className="w-full lg:w-2/3">
          {!hasSearched ? (
            <div className="text-center py-16">
              <Search className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">검색을 시작하세요</h3>
              <p className="text-gray-600 dark:text-gray-400">
                위의 필터를 선택하거나 검색어를 입력하여<br />
                원하는 위치 서비스를 찾아보세요.
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">기관 정보를 불러오는 중...</span>
            </div>
          ) : finalFilteredInstitutes.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">검색 조건에 맞는 기관이 없습니다.</p>
            </div>
          ) : (
          <>
            {/* 검색 결과 카운터 및 정렬 - 접근성 개선 */}
            <div 
              className="mb-4 p-4 bg-gradient-to-r from-primary/5 to-secondary/5 dark:from-primary/15 dark:to-secondary/15 rounded-lg border border-success/30 dark:border-success/50"
              aria-live="polite"
              aria-atomic="true"
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success dark:text-success" />
                  <p className="text-sm md:text-base font-medium text-success dark:text-success/70">
                    검색 결과 <span className="text-lg font-bold text-success dark:text-success">{finalFilteredInstitutes.length}건</span>
                  </p>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  {filter !== "all" && (
                    <span className="text-xs md:text-sm text-success dark:text-success bg-success/10 dark:bg-success/20 px-3 py-1 rounded-full">
                      {filter} 필터 적용 중
                    </span>
                  )}
                  
                  {/* 정렬 옵션 */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs md:text-sm text-success dark:text-success font-medium">정렬:</span>
                    <Select value={sortBy} onValueChange={handleSortChange}>
                      <SelectTrigger 
                        className="w-[140px] h-8 text-xs md:text-sm bg-white dark:bg-gray-900 border-success/40 dark:border-success/50"
                        aria-label="검색 결과 정렬 방식 선택"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="distance">거리순</SelectItem>
                        <SelectItem value="rating">평점순</SelectItem>
                        <SelectItem value="reviews">후기 많은 순</SelectItem>
                        <SelectItem value="name">이름순</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
            {finalFilteredInstitutes.map((institute) => (
              <Card 
                key={institute.id} 
                className={`overflow-hidden border border-gray-100 dark:border-gray-700 cursor-pointer transition-all ${selectedInstitute?.id === institute.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => {
                  setSelectedInstitute(institute);
                  // 모바일에서는 Dialog 열기
                  if (window.innerWidth < 1024) {
                    setMobileMapDialogOpen(true);
                  }
                }}
              >
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-2/5">
                    <div className="h-48 md:h-full relative group">
                      {/* 이미지 슬라이더 */}
                      {(() => {
                        const images = institute.images || [institute.image];
                        const currentIndex = imageIndices[institute.id] || 0;
                        
                        return (
                          <>
                            <img 
                              src={images[currentIndex]} 
                              alt={`${institute.name} - 이미지 ${currentIndex + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '/images/institutes/default-institute.png';
                              }}
                            />
                            
                            {/* 이미지가 여러 개인 경우 슬라이더 컨트롤 표시 */}
                            {images.length > 1 && (
                              <>
                                {/* 이전 버튼 */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
                                    setImageIndices(prev => ({ ...prev, [institute.id]: newIndex }));
                                  }}
                                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                  data-testid={`button-prev-image-${institute.id}`}
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </button>
                                
                                {/* 다음 버튼 */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
                                    setImageIndices(prev => ({ ...prev, [institute.id]: newIndex }));
                                  }}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                  data-testid={`button-next-image-${institute.id}`}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </button>
                                
                                {/* 이미지 인디케이터 */}
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                                  {images.map((_: any, idx: number) => (
                                    <button
                                      key={idx}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setImageIndices(prev => ({ ...prev, [institute.id]: idx }));
                                      }}
                                      className={`w-2 h-2 rounded-full transition-all ${
                                        idx === currentIndex 
                                          ? 'bg-white w-4' 
                                          : 'bg-white/50 hover:bg-white/75'
                                      }`}
                                      data-testid={`button-image-indicator-${institute.id}-${idx}`}
                                    />
                                  ))}
                                </div>
                                
                                {/* 이미지 카운터 */}
                                <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                  {currentIndex + 1} / {images.length}
                                </div>
                              </>
                            )}
                          </>
                        );
                      })()}
                      
                      {institute.premium && (
                        <Badge variant="warning" className="absolute top-2 right-2">
                          <Sparkles className="h-3 w-3 mr-1" />
                          프리미엄
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-5 md:w-3/5">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{institute.name}</h3>
                      
                      <div className="flex gap-1">
                        {institute.certification && (
                          <div className="relative inline-flex items-center px-3 py-1.5 rounded-full bg-gradient-to-r from-primary via-primary to-secondary shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 animate-pulse-slow">
                            <Award className="h-4 w-4 mr-1.5 text-white drop-shadow-md" />
                            <span className="text-sm font-bold text-white drop-shadow-md tracking-wide">
                              테일즈 공식인증
                            </span>
                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-secondary opacity-30 blur-sm"></div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center flex-1">
                          <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{institute.location}</span>
                        </div>
                        {institute.distance !== undefined && (
                          <Badge variant="secondary" className="ml-2 shrink-0">
                            <Navigation className="h-3 w-3 mr-1" />
                            {institute.distance < 1 
                              ? `${Math.round(institute.distance * 1000)}m` 
                              : `${institute.distance.toFixed(1)}km`}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-warning fill-warning mr-2" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{institute.rating} ({institute.reviews} 후기)</span>
                      </div>
                      
                      <div className="flex items-center">
                        <Building className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">설립: {institute.established}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="outline" className="bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-foreground flex items-center">
                        {getCategoryIcon(institute.category)}
                        {institute.category}
                      </Badge>
                      
                      {institute.trainers > 0 && (
                        <Badge 
                          variant="outline"
                          className="cursor-pointer hover:bg-primary/10 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInstituteForTrainers(institute);
                            setTrainersDialogOpen(true);
                          }}
                          data-testid={`badge-trainers-${institute.id}`}
                        >
                          <Users className="h-3 w-3 mr-1" />
                          훈련사 {institute.trainers}명
                        </Badge>
                      )}
                      
                      {institute.courses > 0 && (
                        <Badge 
                          variant="outline"
                          className="cursor-pointer hover:bg-primary/10 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = '/curriculum';
                          }}
                          data-testid={`badge-courses-${institute.id}`}
                        >
                          <BookOpen className="h-3 w-3 mr-1" />
                          강의 {institute.courses}개
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                      {institute.description}
                    </p>
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      <div className="flex items-start mb-1">
                        <Calendar className="h-3.5 w-3.5 mr-1.5 mt-0.5" />
                        <span>{institute.openingHours}</span>
                      </div>
                      <div className="flex items-start">
                        <Building className="h-3.5 w-3.5 mr-1.5 mt-0.5" />
                        <span>시설: {institute.facilities.join(", ")}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      {/* 상세 정보 버튼 - 팝업으로 표시 */}
                      <Button 
                        variant="default"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailInstitute(institute);
                          setDetailDialogOpen(true);
                        }}
                        data-testid={`button-detail-${institute.id}`}
                      >
                        상세 정보
                      </Button>
                      
                      {/* 위치 보기 버튼 */}
                      <Button 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedInstitute(institute);
                        }}
                        data-testid={`button-location-${institute.id}`}
                      >
                        위치 보기
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            </div>
          </>
          )}
          
          {/* Pagination */}
          {hasSearched && !isLoading && finalFilteredInstitutes.length > 0 && (
          <div className="mt-8 flex justify-center">
            <nav className="flex items-center space-x-2">
              <Button variant="outline" size="sm" className="text-sm">
                이전
              </Button>
              <Button variant="default" size="sm" className="text-sm">
                1
              </Button>
              <Button variant="outline" size="sm" className="text-sm">
                2
              </Button>
              <Button variant="outline" size="sm" className="text-sm">
                다음
              </Button>
            </nav>
          </div>
          )}
        </div>
        
        {/* 오른쪽 열 - 탭 구조 (모바일: 리스트 하단, 데스크톱: 오른쪽 고정) */}
        <div className="w-full lg:w-1/3 lg:sticky lg:top-24 h-fit">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            {selectedInstitute ? (
              <Tabs defaultValue="location" className="w-full">
                <div className="border-b border-gray-100 dark:border-gray-700">
                  <TabsList className="w-full grid grid-cols-5 h-auto p-0 bg-transparent">
                    <TabsTrigger 
                      value="location" 
                      className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                      data-testid="tab-location"
                    >
                      <MapPin className="h-4 w-4" />
                      <span className="text-xs">위치</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="weather" 
                      className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                      data-testid="tab-weather"
                    >
                      <Cloud className="h-4 w-4" />
                      <span className="text-xs">날씨</span>
                    </TabsTrigger>
                    {reviewsEnabled && (
                      <TabsTrigger 
                        value="reviews" 
                        className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                        data-testid="tab-reviews"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span className="text-xs">리뷰</span>
                      </TabsTrigger>
                    )}
                    <TabsTrigger 
                      value="info" 
                      className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                      data-testid="tab-info"
                    >
                      <Info className="h-4 w-4" />
                      <span className="text-xs">정보</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="images" 
                      className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                      data-testid="tab-images"
                    >
                      <ImageIcon className="h-4 w-4" />
                      <span className="text-xs">이미지</span>
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                {/* 위치 탭 */}
                <TabsContent value="location" className="p-4 m-0">
                  <GoogleMapView 
                    locations={finalFilteredInstitutes.map(inst => ({
                      id: inst.id,
                      name: inst.name,
                      address: inst.location,
                      coordinates: getLocationFromInstitute(inst),
                      category: inst.category
                    }))}
                    center={userLocation || getLocationFromInstitute(selectedInstitute)}
                    height="300px"
                    zoom={13}
                    userLocation={userLocation}
                  />
                  <div className="mt-3 space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">{selectedInstitute.location}</span>
                    </div>
                    {selectedInstitute.sourceUrl && (
                      <Button 
                        variant="outline"
                        className="w-full"
                        size="sm"
                        onClick={() => window.open(selectedInstitute.sourceUrl, '_blank')}
                        data-testid="button-open-maps"
                      >
                        <ExternalLink className="h-3 w-3 mr-2" />
                        구글 맵에서 보기
                      </Button>
                    )}
                  </div>
                </TabsContent>
                
                {/* 날씨 탭 */}
                <TabsContent value="weather" className="p-4 m-0">
                  <WeatherInfo 
                    latitude={getLocationFromInstitute(selectedInstitute).lat}
                    longitude={getLocationFromInstitute(selectedInstitute).lng}
                    locationName={selectedInstitute.name}
                  />
                </TabsContent>
                
                {/* 리뷰 탭 */}
                {reviewsEnabled && (
                  <TabsContent value="reviews" className="p-4 m-0">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Star className="h-5 w-5 text-warning fill-warning" />
                          <span className="text-2xl font-bold">{selectedInstitute.rating}</span>
                          <span className="text-gray-500">({selectedInstitute.reviews} 후기)</span>
                        </div>
                      </div>
                      
                      {/* 리뷰 목록 (데모) */}
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <Card key={i} className="p-3">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">사용자 {i}</span>
                                  <div className="flex">
                                    {[...Array(5)].map((_, j) => (
                                      <Star key={j} className="h-3 w-3 text-warning fill-warning" />
                                    ))}
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  훌륭한 훈련 프로그램과 친절한 강사진입니다. 우리 강아지가 많이 발전했어요!
                                </p>
                                <span className="text-xs text-gray-400 mt-1">2024.10.{20 + i}</span>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                )}
                
                {/* 업체 정보 탭 */}
                <TabsContent value="info" className="p-4 m-0">
                  <div className="space-y-4">
                    {selectedInstitute && canEditInstitute(selectedInstitute) && (
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingInstitute(selectedInstitute);
                            setEditDialogOpen(true);
                          }}
                          data-testid="button-edit-institute"
                        >
                          <Building className="h-3.5 w-3.5 mr-1.5" />
                          정보 수정
                        </Button>
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold mb-2">기본 정보</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-700 dark:text-gray-300">설립: {selectedInstitute.established}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-700 dark:text-gray-300">{selectedInstitute.openingHours}</span>
                        </div>
                        {selectedInstitute.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-700 dark:text-gray-300">{selectedInstitute.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">소개</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{selectedInstitute.description}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">시설</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedInstitute.facilities.map((facility: string, idx: number) => (
                          <Badge key={idx} variant="outline">{facility}</Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">서비스</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {selectedInstitute.trainers > 0 && (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span>훈련사 {selectedInstitute.trainers}명</span>
                          </div>
                        )}
                        {selectedInstitute.courses > 0 && (
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-gray-500" />
                            <span>강의 {selectedInstitute.courses}개</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                {/* 이미지 탭 */}
                <TabsContent value="images" className="p-4 m-0">
                  <div className="space-y-3">
                    {(() => {
                      const images = selectedInstitute.images || [selectedInstitute.image];
                      return images.map((img: string, idx: number) => (
                        <div key={idx} className="relative rounded-lg overflow-hidden">
                          <img 
                            src={img} 
                            alt={`${selectedInstitute.name} - 이미지 ${idx + 1}`}
                            className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => {
                              setImageIndices(prev => ({ ...prev, [selectedInstitute.id]: idx }));
                              setDetailInstitute(selectedInstitute);
                              setDetailDialogOpen(true);
                            }}
                            onError={(e) => {
                              e.currentTarget.src = '/images/institutes/default-institute.png';
                            }}
                          />
                          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                            {idx + 1} / {images.length}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center p-4">
                <MapPin className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">위치 정보 없음</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  왼쪽 목록에서 위치 서비스를 선택하면<br />상세 정보가 표시됩니다.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 위치 서비스 등록 요청 섹션 */}
      <div className="mt-12 bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">위치 서비스 등록 요청</h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl">
              반려견 교육 기관이나 서비스를 운영하고 계신가요? Talez에 등록하여 더 많은 반려인에게 서비스를 제공해보세요.
            </p>
          </div>
          <Button 
            className="shrink-0"
            onClick={() => {
              console.log("위치 서비스 등록 요청 페이지 이동");
              if (isAuthenticated()) {
                window.location.href = '/institutes/register';
              } else {
                // 비회원인 경우 로그인 필요함을 안내하고 로그인 페이지로 이동
                toast({
                  title: "로그인이 필요합니다",
                  description: "위치 서비스 등록은 로그인 후 이용 가능합니다.",
                  variant: "destructive",
                });
                // 3초 후 로그인 페이지로 이동
                setTimeout(() => {
                  window.location.href = '/auth';
                }, 2000);
              }
            }}
          >
            등록 요청하기
          </Button>
        </div>
      </div>
      
      {/* 모바일 지도 팝업 */}
      <Dialog open={mobileMapDialogOpen} onOpenChange={setMobileMapDialogOpen}>
        <DialogContent className="max-w-full h-[90vh] w-[95vw] p-0">
          {selectedInstitute && (
            <Tabs defaultValue="location" className="w-full h-full flex flex-col">
              <DialogHeader className="px-4 pt-4 pb-2">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  {selectedInstitute.name}
                  {selectedInstitute.certification && (
                    <div className="inline-flex items-center px-2 py-1 rounded-full bg-gradient-to-r from-primary via-primary to-secondary shadow-md">
                      <Award className="h-3 w-3 mr-1 text-white" />
                      <span className="text-xs font-bold text-white">테일즈 공식인증</span>
                    </div>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {selectedInstitute.category} · {selectedInstitute.location}
                </DialogDescription>
              </DialogHeader>
              
              <div className="border-b border-gray-100 dark:border-gray-700 px-2">
                <TabsList className="w-full grid grid-cols-5 h-auto p-0 bg-transparent">
                  <TabsTrigger 
                    value="location" 
                    className="flex flex-col items-center gap-1 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                    data-testid="mobile-tab-location"
                  >
                    <MapPin className="h-4 w-4" />
                    <span className="text-xs">위치</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="weather" 
                    className="flex flex-col items-center gap-1 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                    data-testid="mobile-tab-weather"
                  >
                    <Cloud className="h-4 w-4" />
                    <span className="text-xs">날씨</span>
                  </TabsTrigger>
                  {reviewsEnabled && (
                    <TabsTrigger 
                      value="reviews" 
                      className="flex flex-col items-center gap-1 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                      data-testid="mobile-tab-reviews"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span className="text-xs">리뷰</span>
                    </TabsTrigger>
                  )}
                  <TabsTrigger 
                    value="info" 
                    className="flex flex-col items-center gap-1 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                    data-testid="mobile-tab-info"
                  >
                    <Info className="h-4 w-4" />
                    <span className="text-xs">정보</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="images" 
                    className="flex flex-col items-center gap-1 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                    data-testid="mobile-tab-images"
                  >
                    <ImageIcon className="h-4 w-4" />
                    <span className="text-xs">이미지</span>
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {/* 위치 탭 */}
                <TabsContent value="location" className="p-4 m-0 h-full">
                  <GoogleMapView 
                    locations={[{
                      id: selectedInstitute.id,
                      name: selectedInstitute.name,
                      address: selectedInstitute.location,
                      coordinates: getLocationFromInstitute(selectedInstitute)
                    }]}
                    center={userLocation || getLocationFromInstitute(selectedInstitute)}
                    height="400px"
                    zoom={15}
                    userLocation={userLocation}
                  />
                  <div className="mt-3 space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">{selectedInstitute.location}</span>
                    </div>
                    {selectedInstitute.sourceUrl && (
                      <Button 
                        variant="outline"
                        className="w-full"
                        size="sm"
                        onClick={() => window.open(selectedInstitute.sourceUrl, '_blank')}
                        data-testid="mobile-button-open-maps"
                      >
                        <ExternalLink className="h-3 w-3 mr-2" />
                        구글 맵에서 보기
                      </Button>
                    )}
                  </div>
                </TabsContent>
                
                {/* 날씨 탭 */}
                <TabsContent value="weather" className="p-4 m-0">
                  <WeatherInfo 
                    latitude={getLocationFromInstitute(selectedInstitute).lat}
                    longitude={getLocationFromInstitute(selectedInstitute).lng}
                    locationName={selectedInstitute.name}
                  />
                </TabsContent>
                
                {/* 리뷰 탭 */}
                {reviewsEnabled && (
                  <TabsContent value="reviews" className="p-4 m-0">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Star className="h-5 w-5 text-warning fill-warning" />
                          <span className="text-2xl font-bold">{selectedInstitute.rating}</span>
                          <span className="text-gray-500">({selectedInstitute.reviews} 후기)</span>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <Card key={i} className="p-3">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">사용자 {i}</span>
                                  <div className="flex">
                                    {[...Array(5)].map((_, j) => (
                                      <Star key={j} className="h-3 w-3 text-warning fill-warning" />
                                    ))}
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  훌륭한 훈련 프로그램과 친절한 강사진입니다. 우리 강아지가 많이 발전했어요!
                                </p>
                                <span className="text-xs text-gray-400 mt-1">2024.10.{20 + i}</span>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                )}
                
                {/* 업체 정보 탭 */}
                <TabsContent value="info" className="p-4 m-0">
                  <div className="space-y-4">
                    {selectedInstitute && canEditInstitute(selectedInstitute) && (
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingInstitute(selectedInstitute);
                            setEditDialogOpen(true);
                            setMobileMapDialogOpen(false);
                          }}
                          data-testid="mobile-button-edit-institute"
                        >
                          <Building className="h-3.5 w-3.5 mr-1.5" />
                          정보 수정
                        </Button>
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold mb-2">기본 정보</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-700 dark:text-gray-300">설립: {selectedInstitute.established}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-700 dark:text-gray-300">{selectedInstitute.openingHours}</span>
                        </div>
                        {selectedInstitute.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-700 dark:text-gray-300">{selectedInstitute.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">소개</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{selectedInstitute.description}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">시설</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedInstitute.facilities.map((facility: string, idx: number) => (
                          <Badge key={idx} variant="outline">{facility}</Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">서비스</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {selectedInstitute.trainers > 0 && (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span>훈련사 {selectedInstitute.trainers}명</span>
                          </div>
                        )}
                        {selectedInstitute.courses > 0 && (
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-gray-500" />
                            <span>강의 {selectedInstitute.courses}개</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                {/* 이미지 탭 */}
                <TabsContent value="images" className="p-4 m-0">
                  <div className="space-y-3">
                    {(() => {
                      const images = selectedInstitute.images || [selectedInstitute.image];
                      return images.map((img: string, idx: number) => (
                        <div key={idx} className="relative rounded-lg overflow-hidden">
                          <img 
                            src={img} 
                            alt={`${selectedInstitute.name} - 이미지 ${idx + 1}`}
                            className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => {
                              setImageIndices(prev => ({ ...prev, [selectedInstitute.id]: idx }));
                              setDetailInstitute(selectedInstitute);
                              setDetailDialogOpen(true);
                              setMobileMapDialogOpen(false);
                            }}
                            onError={(e) => {
                              e.currentTarget.src = '/images/institutes/default-institute.png';
                            }}
                          />
                          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                            {idx + 1} / {images.length}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* 위치 권한 확인 다이얼로그 */}
      <Dialog open={locationPermissionDialogOpen} onOpenChange={setLocationPermissionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" />
              위치 정보 사용 안내
            </DialogTitle>
            <DialogDescription className="pt-2">
              주변 반려견 시설을 검색하기 위해 현재 위치 정보가 필요합니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="bg-primary/10 dark:bg-primary/20 p-4 rounded-lg">
              <h4 className="font-medium text-primary dark:text-primary/70 mb-2">수집하는 정보</h4>
              <ul className="text-sm text-primary dark:text-primary space-y-1">
                <li>• 현재 위치 (위도, 경도)</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">사용 목적</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• 주변 반려견 훈련소, 병원, 카페 등 검색</li>
                <li>• 거리순 정렬 및 가까운 시설 안내</li>
              </ul>
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400">
              위치 정보는 검색 목적으로만 사용되며, 별도로 저장되지 않습니다.
              브라우저에서 위치 권한 요청이 표시됩니다.
            </p>
          </div>
          
          <div className="flex gap-3 justify-end">
            <Button 
              variant="outline" 
              onClick={() => setLocationPermissionDialogOpen(false)}
              data-testid="button-location-cancel"
            >
              취소
            </Button>
            <Button 
              onClick={executeLocationSearch}
              data-testid="button-location-allow"
            >
              <Navigation className="h-4 w-4 mr-2" />
              위치 사용 허용
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 훈련사 목록 팝업 */}
      <Dialog open={trainersDialogOpen} onOpenChange={setTrainersDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {selectedInstituteForTrainers?.name} - 훈련사 목록
            </DialogTitle>
            <DialogDescription>
              등록된 훈련사를 클릭하면 상세 정보를 확인할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            {selectedInstituteForTrainers && (
              <TrainersList instituteId={selectedInstituteForTrainers.id} instituteName={selectedInstituteForTrainers.name} />
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* 상세 정보 팝업 다이얼로그 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {detailInstitute && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  {detailInstitute.name}
                  {detailInstitute.certification && (
                    <div className="inline-flex items-center px-2 py-1 rounded-full bg-gradient-to-r from-primary via-primary to-secondary shadow-md">
                      <Award className="h-3 w-3 mr-1 text-white" />
                      <span className="text-xs font-bold text-white">테일즈 공식인증</span>
                    </div>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {detailInstitute.category} · {detailInstitute.location}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 mt-4">
                {/* 이미지 슬라이더 */}
                <div className="relative group rounded-lg overflow-hidden">
                  {(() => {
                    const images = detailInstitute.images || [detailInstitute.image];
                    const currentIndex = imageIndices[detailInstitute.id] || 0;
                    
                    return (
                      <>
                        <img 
                          src={images[currentIndex]} 
                          alt={`${detailInstitute.name} - 이미지 ${currentIndex + 1}`}
                          className="w-full h-[400px] object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/images/institutes/default-institute.png';
                          }}
                        />
                        
                        {images.length > 1 && (
                          <>
                            <button
                              onClick={() => {
                                const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
                                setImageIndices(prev => ({ ...prev, [detailInstitute.id]: newIndex }));
                              }}
                              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <ChevronLeft className="h-5 w-5" />
                            </button>
                            
                            <button
                              onClick={() => {
                                const newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
                                setImageIndices(prev => ({ ...prev, [detailInstitute.id]: newIndex }));
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <ChevronRight className="h-5 w-5" />
                            </button>
                            
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                              {images.map((_: any, idx: number) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    setImageIndices(prev => ({ ...prev, [detailInstitute.id]: idx }));
                                  }}
                                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                                    idx === currentIndex 
                                      ? 'bg-white w-6' 
                                      : 'bg-white/50 hover:bg-white/75'
                                  }`}
                                />
                              ))}
                            </div>
                            
                            <div className="absolute top-4 left-4 bg-black/60 text-white text-sm px-3 py-1.5 rounded-lg">
                              {currentIndex + 1} / {images.length}
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
                
                {/* 기본 정보 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-warning fill-warning" />
                      <span className="font-medium">{detailInstitute.rating}</span>
                      <span className="text-gray-500">({detailInstitute.reviews} 후기)</span>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">{detailInstitute.location}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-gray-500" />
                      <span className="text-gray-700 dark:text-gray-300">{detailInstitute.openingHours}</span>
                    </div>
                    
                    {detailInstitute.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-5 w-5 text-gray-500" />
                        <span className="text-gray-700 dark:text-gray-300">{detailInstitute.phone}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Building className="h-5 w-5 text-gray-500" />
                      <span className="text-gray-700 dark:text-gray-300">설립: {detailInstitute.established}</span>
                    </div>
                    
                    {detailInstitute.trainers > 0 && (
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-gray-500" />
                        <span className="text-gray-700 dark:text-gray-300">훈련사 {detailInstitute.trainers}명</span>
                      </div>
                    )}
                    
                    {detailInstitute.courses > 0 && (
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-gray-500" />
                        <span className="text-gray-700 dark:text-gray-300">강의 {detailInstitute.courses}개</span>
                      </div>
                    )}
                    
                    <div className="flex items-start gap-2">
                      <Building className="h-5 w-5 text-gray-500 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">
                        시설: {detailInstitute.facilities.join(", ")}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* 설명 */}
                <div>
                  <h3 className="font-semibold mb-2">소개</h3>
                  <p className="text-gray-700 dark:text-gray-300">{detailInstitute.description}</p>
                </div>
                
                {/* 카테고리 배지 */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-foreground">
                    {getCategoryIcon(detailInstitute.category)}
                    {detailInstitute.category}
                  </Badge>
                  {detailInstitute.premium && (
                    <Badge variant="warning">
                      <Sparkles className="h-3 w-3 mr-1" />
                      프리미엄
                    </Badge>
                  )}
                </div>
                
                {/* 구글 맵 */}
                <div>
                  <h3 className="font-semibold mb-3">위치 정보</h3>
                  <GoogleMapView 
                    locations={[{
                      id: detailInstitute.id,
                      name: detailInstitute.name,
                      address: detailInstitute.location,
                      coordinates: getLocationFromInstitute(detailInstitute)
                    }]}
                    center={userLocation || getLocationFromInstitute(detailInstitute)}
                    height="400px"
                    zoom={15}
                    userLocation={userLocation}
                  />
                </div>
                
                {/* 날씨 정보 */}
                <WeatherInfo 
                  latitude={getLocationFromInstitute(detailInstitute).lat}
                  longitude={getLocationFromInstitute(detailInstitute).lng}
                  locationName={detailInstitute.name}
                />
                
                {/* 구글 맵에서 보기 버튼 */}
                {detailInstitute.sourceUrl && (
                  <Button 
                    className="w-full"
                    onClick={() => {
                      window.open(detailInstitute.sourceUrl, '_blank');
                    }}
                    data-testid="button-open-google-maps"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    구글 맵에서 보기
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* 업체 정보 수정 Dialog */}
      <InstituteEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        institute={editingInstitute}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/institutes'] });
          toast({
            title: "수정 완료",
            description: "업체 정보가 성공적으로 업데이트되었습니다.",
          });
        }}
      />

      {/* AI 매칭 반려견 선택 다이얼로그 */}
      <AiMatchDialog
        open={aiMatchDialogOpen}
        onOpenChange={(open) => {
          setAiMatchDialogOpen(open);
          if (!open) {
            // 다이얼로그가 닫히면서 AI 결과가 있으면 결과 다이얼로그 열기
            if (aiRecommendations.length > 0) {
              setAiMatchDialogOpen(false);
              // 약간의 딜레이 후 결과 다이얼로그 열기
              setTimeout(() => {
                // AI 결과 다이얼로그는 handleAiMatch에서 자동으로 열림
              }, 100);
            }
          }
        }}
        onPetSelected={(petId) => {
          handleAiMatch(petId);
          // 매칭이 시작되면 로딩 다이얼로그를 표시하기 위해 상태 변경
          setAiMatchDialogOpen(false);
          setTimeout(() => {
            // AI 매칭 중임을 표시
            if (isAiMatching) {
              toast({
                title: "AI 분석 시작",
                description: "반려견에게 최적의 기관을 찾고 있습니다...",
              });
            }
          }, 100);
        }}
      />

      {/* AI 추천 결과 다이얼로그 */}
      <AiRecommendationsDialog
        open={aiRecommendations.length > 0 || isAiMatching}
        onOpenChange={(open) => {
          if (!open) {
            setAiRecommendations([]);
            setAiMatchingPet(null);
            setIsAiMatching(false);
          }
        }}
        pet={aiMatchingPet}
        recommendations={aiRecommendations}
        summary={aiRecommendations.length > 0 ? `${aiMatchingPet?.name}의 특성에 맞는 ${aiRecommendations.length}개의 기관을 추천합니다.` : ''}
        isLoading={isAiMatching}
        onViewInstitute={handleViewRecommendedInstitute}
      />
    </div>
  );
}

// 업체 정보 수정 Dialog 컴포넌트
function InstituteEditDialog({ 
  open, 
  onOpenChange, 
  institute,
  onSuccess 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  institute: any;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    phone: '',
    openingHours: '',
    established: '',
    address: '',
    latitude: '',
    longitude: '',
    certification: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const { toast } = useToast();

  // 로그인 사용자 정보 가져오기
  const getUserInfo = () => {
    const storedAuth = localStorage.getItem('petedu_auth');
    if (!storedAuth) return null;
    try {
      return JSON.parse(storedAuth);
    } catch {
      return null;
    }
  };

  const userInfo = getUserInfo();
  const isAdmin = userInfo?.role === 'admin';

  // institute가 변경될 때 formData 업데이트
  useEffect(() => {
    if (institute) {
      setFormData({
        name: institute.name || '',
        description: institute.description || '',
        phone: institute.phone || '',
        openingHours: institute.openingHours || '',
        established: institute.established || '',
        address: institute.location || '',
        latitude: institute.latitude?.toString() || '',
        longitude: institute.longitude?.toString() || '',
        certification: institute.certification || false,
      });
    }
  }, [institute]);

  // 위치 검색 핸들러
  const handleLocationSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "검색어 입력",
        description: "검색할 장소 이름이나 주소를 입력하세요.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    
    try {
      const response = await fetch(`/api/locations/search?query=${encodeURIComponent(searchQuery)}&lat=37.5665&lng=126.9780`);
      if (!response.ok) throw new Error('위치 검색 실패');
      
      const results = await response.json();
      setSearchResults(results);
      
      if (results.length === 0) {
        toast({
          title: "검색 결과 없음",
          description: "검색 결과가 없습니다. 다른 검색어를 시도해보세요.",
        });
      }
    } catch (error) {
      console.error('위치 검색 오류:', error);
      toast({
        title: "검색 실패",
        description: "위치 검색 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // 검색 결과 선택 핸들러
  const handleSelectLocation = (place: any) => {
    setFormData({
      ...formData,
      address: place.address || '',
      latitude: place.latitude?.toString() || '',
      longitude: place.longitude?.toString() || '',
    });
    setSearchResults([]);
    setSearchQuery('');
    toast({
      title: "위치 선택 완료",
      description: `${place.name}의 위치가 설정되었습니다.`,
    });
  };

  const handleSave = async () => {
    if (!institute) return;
    
    setIsSaving(true);
    try {
      // 위도/경도를 숫자로 변환 (데이터 타입 정규화)
      const dataToSave = {
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      };

      await apiRequest('PUT', `/api/institutes/${institute.id}`, dataToSave);

      onSuccess();
      onOpenChange(false);
      toast({
        title: "수정 완료",
        description: "업체 정보가 성공적으로 수정되었습니다.",
      });
    } catch (error) {
      console.error('업체 정보 수정 실패:', error);
      toast({
        title: "수정 실패",
        description: "업체 정보 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!institute) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Edit className="h-5 w-5" />
            업체 정보 수정
          </DialogTitle>
          <DialogDescription>
            {institute.name}의 정보를 수정합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1">업체명</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="업체명을 입력하세요"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">전화번호</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="02-1234-5678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">운영 시간</label>
            <input
              type="text"
              value={formData.openingHours}
              onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="평일 09:00-18:00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">설립년도</label>
            <input
              type="text"
              value={formData.established}
              onChange={(e) => setFormData({ ...formData, established: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="2020"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">소개</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
              placeholder="업체 소개를 입력하세요"
            />
          </div>

          {/* 위치 검색 섹션 */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              위치 정보
            </h3>
            
            {/* 위치 검색 */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">위치 검색</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleLocationSearch();
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="장소 이름이나 주소를 입력하세요"
                  />
                  <Button
                    type="button"
                    onClick={handleLocationSearch}
                    disabled={isSearching}
                    size="sm"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        검색 중
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-1" />
                        검색
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* 검색 결과 */}
              {searchResults.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-md p-2 max-h-60 overflow-y-auto">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 px-2">
                    {searchResults.length}개의 검색 결과
                  </p>
                  <div className="space-y-1">
                    {searchResults.map((place: any, index: number) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSelectLocation(place)}
                        className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{place.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {place.address}
                            </p>
                            {place.isTalez && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                <Award className="h-3 w-3 mr-1" />
                                TALEZ 등록
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 주소 표시/수정 */}
              <div>
                <label className="block text-sm font-medium mb-1">주소</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="주소를 입력하세요"
                />
              </div>

              {/* 위도/경도 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">위도</label>
                  <input
                    type="text"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="37.5665"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">경도</label>
                  <input
                    type="text"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="126.9780"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 관리자 전용: 인증 마크 */}
          {isAdmin && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-warning" />
                  <label className="text-sm font-semibold">테일즈 공식 인증</label>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.certification}
                    onChange={(e) => setFormData({ ...formData, certification: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-warning dark:peer-focus:ring-warning rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-warning"></div>
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                관리자만 인증 마크를 부여하거나 제거할 수 있습니다.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            취소
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              '저장'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// AI 매칭 다이얼로그 컴포넌트
function AiMatchDialog({ 
  open, 
  onOpenChange,
  onPetSelected
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onPetSelected: (petId: number) => void;
}) {
  const { data: petsData, isLoading } = useQuery({
    queryKey: ['/api/pets'],
    enabled: open,
  });

  const pets = Array.isArray((petsData as any)?.data) ? (petsData as any).data : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            AI 업체 매칭
          </DialogTitle>
          <DialogDescription>
            반려견 프로필을 기반으로 AI가 최적의 교육 기관을 추천해드립니다.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">반려견 정보를 불러오는 중...</span>
            </div>
          ) : pets.length === 0 ? (
            <div className="text-center py-12">
              <PawPrint className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">등록된 반려견이 없습니다.</p>
              <Button 
                onClick={() => window.location.href = '/pets'}
                variant="outline"
              >
                반려견 등록하기
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pets.map((pet: any) => (
                <Card 
                  key={pet.id}
                  className="p-4 cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
                  onClick={() => {
                    onPetSelected(pet.id);
                    onOpenChange(false);
                  }}
                  data-testid={`pet-card-${pet.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                      {pet.profileImage || pet.imageUrl ? (
                        <img 
                          src={pet.profileImage || pet.imageUrl} 
                          alt={pet.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <PawPrint className="h-8 w-8 text-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">{pet.name}</h3>
                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex flex-wrap gap-2">
                          {pet.breed && (
                            <Badge variant="outline" className="text-xs">{pet.breed}</Badge>
                          )}
                          {pet.age && (
                            <Badge variant="outline" className="text-xs">{pet.age}세</Badge>
                          )}
                          {pet.weight && (
                            <Badge variant="outline" className="text-xs">{pet.weight}kg</Badge>
                          )}
                        </div>
                        {pet.personality && (
                          <p className="text-xs line-clamp-1">성격: {pet.personality}</p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// AI 추천 결과 다이얼로그
function AiRecommendationsDialog({
  open,
  onOpenChange,
  pet,
  recommendations,
  summary,
  isLoading,
  onViewInstitute
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pet: any;
  recommendations: any[];
  summary: string;
  isLoading: boolean;
  onViewInstitute: (instituteId: number) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            AI 추천 결과
          </DialogTitle>
          <DialogDescription>
            {pet && `${pet.name}에게 최적화된 교육 기관을 추천합니다.`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-gray-600 dark:text-gray-400">AI가 최적의 기관을 분석하고 있습니다...</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">잠시만 기다려주세요</p>
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* 요약 */}
            {summary && (
              <div className="bg-gradient-to-r from-primary/5 to-secondary dark:from-primary/15 dark:to-secondary/20 p-4 rounded-lg border border-primary/30 dark:border-primary/40">
                <h3 className="font-semibold text-primary dark:text-primary-foreground mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI 분석 요약
                </h3>
                <p className="text-sm text-primary dark:text-primary-foreground">{summary}</p>
              </div>
            )}

            {/* 추천 목록 */}
            {recommendations.length > 0 ? (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">추천 기관</h3>
                {recommendations.map((rec: any, index: number) => (
                  <Card key={index} className="p-5 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <h4 className="font-bold text-lg">{rec.instituteName}</h4>
                      </div>
                      <div className="flex items-center gap-1 bg-gradient-to-r from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 px-3 py-1 rounded-full">
                        <Star className="h-4 w-4 text-primary dark:text-primary fill-primary dark:fill-primary" />
                        <span className="font-bold text-primary dark:text-primary-foreground">{rec.matchScore}점</span>
                      </div>
                    </div>

                    <p className="text-gray-700 dark:text-gray-300 mb-3">{rec.reason}</p>

                    {rec.strengths && rec.strengths.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">주요 강점:</p>
                        <div className="flex flex-wrap gap-2">
                          {rec.strengths.map((strength: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="bg-success/10 dark:bg-success/20 text-success dark:text-success border-success/30 dark:border-success/50">
                              {strength}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {rec.considerations && (
                      <div className="text-sm text-warning dark:text-warning bg-warning/10 dark:bg-warning/20 p-3 rounded border border-warning/30 dark:border-warning/50 mb-3">
                        <p className="font-semibold mb-1">고려사항:</p>
                        <p>{rec.considerations}</p>
                      </div>
                    )}

                    <Button 
                      onClick={() => {
                        onViewInstitute(rec.instituteId);
                        onOpenChange(false);
                      }}
                      className="w-full mt-2"
                      data-testid={`button-view-institute-${rec.instituteId}`}
                    >
                      자세히 보기
                    </Button>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">추천 결과가 없습니다.</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}