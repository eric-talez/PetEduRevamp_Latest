import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  Calendar, 
  MapPin, 
  Filter, 
  Clock, 
  Users,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Banner } from "@/components/ui/banner";
// Tabs 컴포넌트는 현재 사용하지 않으므로 임포트 제거
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NaverMapView } from '@/components/NaverMapView';

// 임시 데이터 타입 정의
interface EventLocation {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  region: string;
}

interface EventItem {
  id: number;
  title: string;
  description: string;
  image: string;
  date: string;
  time: string;
  location: EventLocation;
  organizer: {
    name: string;
    avatar: string;
  };
  category: string;
  price: number | '무료';
  attendees: number;
  maxAttendees?: number;
}


// 지역 목록
const REGIONS = ["전체", "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];

// 카테고리 목록
const CATEGORIES = ["전체", "소셜", "교육", "축제", "입양", "훈련", "건강", "기타"];

// 요금 필터 옵션
const PRICE_OPTIONS = ["전체", "무료", "유료"];

export default function EventsPage() {
  const [, setLocation] = useLocation();
  const [filteredEvents, setFilteredEvents] = useState<EventItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("전체");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [selectedPrice, setSelectedPrice] = useState("전체");
  const [selectedLocation, setSelectedLocation] = useState<EventLocation | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMap, setShowMap] = useState(true);
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  
  // 응답 데이터 타입 정의
  interface EventResponseItem {
    id: number;
    title: string;
    description: string;
    image: string | null;
    date: string;
    time: string;
    locationId: number;
    locationName?: string;
    locationAddress?: string;
    locationLat?: string;
    locationLng?: string;
    locationRegion?: string;
    organizerId: number;
    organizerName?: string;
    organizerAvatar?: string;
    category: string;
    price: number | '무료';
    attendees: number | null;
    maxAttendees: number | null;
    createdAt: string;
    updatedAt: string;
  }
  
  // 변환된 이벤트 아이템 타입 (UI에 표시되는 형식)
  interface TransformedEventItem {
    id: number;
    title: string;
    description: string;
    image: string | null;
    date: string;
    time: string;
    location: EventLocation;
    organizer: {
      name: string;
      avatar: string;
    };
    category: string;
    price: number | '무료';
    attendees: number;
    maxAttendees?: number;
    createdAt: string;
    updatedAt: string;
    locationId: number;
    organizerId: number;
  }
  
  interface PaginatedResponse {
    items: EventResponseItem[];
    meta: {
      totalItems: number;
      itemsPerPage: number;
      currentPage: number;
      totalPages: number;
    };
  }
  
  // API에서 이벤트 데이터 불러오기 (페이지네이션 지원)
  const { data: eventsResponse, isLoading, error } = useQuery<PaginatedResponse, Error, { 
    items: TransformedEventItem[], 
    meta: { totalItems: number, currentPage: number, totalPages: number, itemsPerPage: number } 
  }>({
    queryKey: ['/api/events', { page: currentPage, limit: itemsPerPage }],
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
    select: (data) => {
      // 페이지네이션 메타데이터 추출
      if (!data || !data.items || !Array.isArray(data.items)) {
        return { 
          items: [], 
          meta: { totalItems: 0, currentPage: 1, totalPages: 1, itemsPerPage: 10 } 
        };
      }
      
      // 페이지네이션 메타데이터 업데이트
      if (data.meta) {
        setTotalPages(data.meta.totalPages);
        setCurrentPage(data.meta.currentPage);
        setItemsPerPage(data.meta.itemsPerPage);
      }
      
      // 이벤트 데이터 변환
      const transformedItems: TransformedEventItem[] = data.items.map((event: EventResponseItem) => ({
        ...event,
        // 위치 정보 형식 맞추기
        location: {
          id: event.locationId,
          name: event.locationName || '알 수 없는 장소',
          address: event.locationAddress || '주소 정보 없음',
          lat: parseFloat(event.locationLat || '0'),
          lng: parseFloat(event.locationLng || '0'),
          region: event.locationRegion || '지역 정보 없음'
        },
        // 주최자 정보 형식 맞추기
        organizer: {
          name: event.organizerName || '알 수 없음',
          avatar: event.organizerAvatar || 'https://via.placeholder.com/100'
        },
        // 데이터 일관성 보장
        price: event.price || '무료',
        attendees: event.attendees || 0,
        maxAttendees: event.maxAttendees === null ? undefined : event.maxAttendees
      }));
      
      return { 
        items: transformedItems, 
        meta: data.meta || { 
          totalItems: transformedItems.length, 
          currentPage: 1, 
          totalPages: 1, 
          itemsPerPage: 10 
        } 
      };
    }
  });
  
  // 변환된 이벤트 데이터
  const eventsData = eventsResponse?.items || [];
  
  // 모바일 화면 감지
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setShowMap(false);
      }
    };
    
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    
    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
  }, []);
  
  // API에서 받아온 데이터로 상태 업데이트
  useEffect(() => {
    if (eventsData && Array.isArray(eventsData)) {
      setFilteredEvents(eventsData as EventItem[]);
    }
  }, [eventsData]);
  
  // 필터링 로직
  useEffect(() => {
    if (!eventsData || !Array.isArray(eventsData)) return;
    
    let filtered = [...eventsData] as EventItem[];
    
    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(
        event => event.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                event.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // 지역 필터링
    if (selectedRegion !== "전체") {
      filtered = filtered.filter(event => 
        event.location && event.location.region === selectedRegion
      );
    }
    
    // 카테고리 필터링
    if (selectedCategory !== "전체") {
      filtered = filtered.filter(event => event.category === selectedCategory);
    }
    
    // 요금 필터링
    if (selectedPrice !== "전체") {
      if (selectedPrice === "무료") {
        filtered = filtered.filter(event => event.price === "무료");
      } else {
        filtered = filtered.filter(event => event.price !== "무료");
      }
    }
    
    setFilteredEvents(filtered);
  }, [eventsData, searchTerm, selectedRegion, selectedCategory, selectedPrice]);
  
  // 위치 기반 정렬 (선택한 위치에 가까운 순)
  const sortByLocation = (events: EventItem[], location: EventLocation) => {
    return [...events].sort((a, b) => {
      const distA = calculateDistance(a.location.lat, a.location.lng, location.lat, location.lng);
      const distB = calculateDistance(b.location.lat, b.location.lng, location.lat, location.lng);
      return distA - distB;
    });
  };
  
  // 거리 계산 함수 (Haversine 공식)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // 지구 반경 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
  
  // 지도 마커 클릭 핸들러
  const handleMapMarkerClick = (location: EventLocation) => {
    setSelectedLocation(location);
    
    // 선택한 위치에 가까운 이벤트 정렬
    const sortedEvents = sortByLocation(filteredEvents, location);
    setFilteredEvents(sortedEvents);
  };
  
  // 날짜 포맷팅
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    
    const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return "종료됨";
    } else if (diffDays === 0) {
      return "오늘";
    } else if (diffDays === 1) {
      return "내일";
    } else if (diffDays < 7) {
      return `${diffDays}일 후`;
    } else {
      return `${date.getMonth() + 1}월 ${date.getDate()}일`;
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      {/* API 오류 메시지 표시 */}
      {error && (
        <div className="bg-destructive/10 dark:bg-destructive/20 border border-destructive/40 dark:border-destructive/50 text-destructive dark:text-destructive p-4 mb-6 rounded-lg">
          <h3 className="text-lg font-medium mb-1">데이터를 불러오는 중 오류가 발생했습니다</h3>
          <p>잠시 후 다시 시도해주세요. 문제가 지속되면 관리자에게 문의하세요.</p>
        </div>
      )}
      
      {/* 배너 영역 */}
      <Banner
        imageUrl="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=750&q=80"
        title="반려동물 이벤트"
        description="다양한 반려동물 행사와 만남의 장을 찾아보세요. 지역별, 테마별 이벤트를 한눈에!"
        altText="반려견들이 함께 뛰어놀고 있는 모습 - 다양한 반려동물 이벤트와 행사 정보를 찾아볼 수 있는 페이지"
        ariaLabel="이벤트 페이지 배너"
        priority={true}
      >
        <div className="flex space-x-2 mt-4">
          <div className="max-w-lg bg-white dark:bg-gray-800 rounded-lg flex items-center p-1">
            <div className="px-2">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="banner-search"
              type="text"
              className="bg-transparent border-0 focus:ring-0 flex-1 py-2 pl-1 text-sm placeholder:text-gray-400"
              placeholder="이벤트 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="이벤트 검색"
            />
            <Button 
              variant="default"
              size="sm"
              className="mr-1"
              onClick={() => {
                const searchInput = document.getElementById('banner-search') as HTMLInputElement;
                if (searchInput) {
                  setSearchTerm(searchInput.value);
                }
              }}
              aria-label="검색 실행"
            >
              검색
            </Button>
          </div>
        </div>
      </Banner>
      
      {/* 필터 및 검색 */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="event-search"
              className="pl-10"
              placeholder="이벤트 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  {selectedRegion === "전체" ? "지역" : selectedRegion}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 max-h-64 overflow-y-auto">
                <DropdownMenuLabel>지역 선택</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {REGIONS.map((region) => (
                  <DropdownMenuCheckboxItem
                    key={region}
                    checked={selectedRegion === region}
                    onCheckedChange={() => setSelectedRegion(region)}
                  >
                    {region}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center">
                  <Filter className="h-4 w-4 mr-2" />
                  {selectedCategory === "전체" ? "카테고리" : selectedCategory}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>카테고리 선택</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {CATEGORIES.map((category) => (
                  <DropdownMenuCheckboxItem
                    key={category}
                    checked={selectedCategory === category}
                    onCheckedChange={() => setSelectedCategory(category)}
                  >
                    {category}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center">
                  {selectedPrice === "전체" ? "요금" : selectedPrice}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>요금 선택</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {PRICE_OPTIONS.map((price) => (
                  <DropdownMenuCheckboxItem
                    key={price}
                    checked={selectedPrice === price}
                    onCheckedChange={() => setSelectedPrice(price)}
                  >
                    {price}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      {/* 메인 컨텐츠 */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* 이벤트 목록 */}
        <div className={`${showMap ? 'md:w-7/12 lg:w-8/12' : 'w-full'}`}>
          {/* 로딩 상태 표시 */}
          {isLoading && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-lg font-medium">이벤트 데이터를 불러오는 중...</p>
              </div>
            </div>
          )}
          
          {!isLoading && filteredEvents.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
              {eventsData.length === 0 && !searchTerm && selectedRegion === "전체" && selectedCategory === "전체" && selectedPrice === "전체" ? (
                <>
                  <h3 className="text-lg font-medium mb-2">진행 중인 이벤트가 없습니다</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    새로운 이벤트가 등록되면 알려드리겠습니다.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium mb-2">검색 결과가 없습니다</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    다른 검색어나 필터 조건을 시도해보세요.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedRegion("전체");
                      setSelectedCategory("전체");
                      setSelectedPrice("전체");
                    }}
                  >
                    필터 초기화
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <Card 
                  key={event.id}
                  className="overflow-hidden h-full flex flex-col hover:shadow-md transition cursor-pointer"
                  onClick={() => setLocation(`/events/${event.id}`)}
                >
                  <div className="relative h-48">
                    <img 
                      src={event.image} 
                      alt={event.title} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-primary text-white">
                        {event.category}
                      </Badge>
                    </div>
                    <div className="absolute top-2 left-2">
                      <Badge variant="outline" className="bg-white text-black dark:bg-black dark:text-white">
                        {formatDate(event.date)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-1">{event.title}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                      {event.description}
                    </p>
                    
                    <div className="mt-auto space-y-2 text-sm">
                      <div className="flex items-center text-gray-500">
                        <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{event.time}</span>
                      </div>
                      
                      <div className="flex items-center text-gray-500">
                        <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{event.location.name}, {event.location.region}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-gray-500">
                          <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span>
                            {event.attendees}명
                            {event.maxAttendees && ` / ${event.maxAttendees}명`}
                          </span>
                        </div>
                        
                        <Badge variant={event.price === '무료' ? "outline" : "secondary"}>
                          {event.price === '무료' ? '무료' : `${event.price.toLocaleString()}원`}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
          
          {/* 페이지네이션 UI */}
          {!isLoading && totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <nav className="flex items-center space-x-2" aria-label="Pagination">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage <= 1}
                >
                  이전
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // 현재 페이지 주변 페이지만 표시
                    let pageNum;
                    if (totalPages <= 5) {
                      // 총 페이지가 5개 이하면 모두 표시
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      // 현재 페이지가 앞쪽이면 1-5 표시
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      // 현재 페이지가 뒤쪽이면 끝에서 5개 표시
                      pageNum = totalPages - 4 + i;
                    } else {
                      // 중간이면 현재 페이지 중심으로 표시
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-9 h-9"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  
                  {/* 생략 표시 (마지막 페이지가 5 초과인 경우) */}
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <span className="px-2">...</span>
                  )}
                  
                  {/* 마지막 페이지 표시 (현재가 끝에서 3페이지 이상 떨어진 경우) */}
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      className="w-9 h-9"
                    >
                      {totalPages}
                    </Button>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage >= totalPages}
                >
                  다음
                </Button>
                
                <select
                  className="h-9 ml-4 px-2 rounded-md border border-gray-300 dark:border-gray-600 bg-background text-sm"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1); // 페이지 크기 변경 시 첫 페이지로
                  }}
                >
                  <option value="5">5개씩</option>
                  <option value="10">10개씩</option>
                  <option value="20">20개씩</option>
                  <option value="50">50개씩</option>
                </select>
              </nav>
            </div>
          )}
        </div>
        
        {/* 지도 영역 */}
        {showMap && (
          <div className="md:w-5/12 lg:w-4/12">
            <div className="sticky top-20">
              <Card className="overflow-hidden">
                <div className="h-[calc(100vh-180px)] min-h-[400px]">
                  {selectedLocation ? (
                    <NaverMapView 
                      locations={[{
                        id: selectedLocation.id,
                        name: selectedLocation.name,
                        address: selectedLocation.address,
                        coordinates: {
                          lat: selectedLocation.lat,
                          lng: selectedLocation.lng
                        }
                      }]}
                      center={{
                        lat: selectedLocation.lat,
                        lng: selectedLocation.lng
                      }}
                      height="100%"
                      zoom={15}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500">이벤트를 선택하면 위치가 표시됩니다</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}