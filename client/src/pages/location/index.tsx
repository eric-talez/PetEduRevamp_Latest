import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, MapPin, Navigation, Calendar, Clock, Users, Star, Filter, ExternalLink, Heart, Share2, Trophy, Upload, Image, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMapService, MapServiceProvider, Place } from '@/hooks/useMapService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { GoogleMapView } from '@/components/GoogleMapView';

/**
 * 위치 마커 컴포넌트
 */
function LocationMarker() {
  return (
    <div className="absolute transform -translate-x-1/2 -translate-y-1/2 text-destructive animate-bounce">
      <MapPin className="h-8 w-8" />
    </div>
  );
}

/**
 * 장소 검색 컴포넌트
 */
function PlaceSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { nearbyPlaces, setNearbyPlaces, currentLocation, getUserLocation } = useMapService();
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "검색어를 입력해주세요",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    try {
      // 현재 위치 가져오기
      let location = currentLocation;
      if (!location) {
        location = await getUserLocation();
        if (!location) {
          toast({
            title: "위치 정보 필요",
            description: "검색을 위해 위치 정보를 허용해주세요.",
            variant: "destructive"
          });
          setIsSearching(false);
          return;
        }
      }

      console.log(`[위치 검색] 검색어: "${searchTerm}", 위치: ${location.latitude}, ${location.longitude}`);

      // Google Places Text Search API 호출 (TALEZ DB + Google Places 통합)
      const response = await fetch(
        `/api/locations/search?query=${encodeURIComponent(searchTerm)}&lat=${location.latitude}&lng=${location.longitude}`
      );
      
      if (!response.ok) {
        throw new Error(`검색 요청 실패: ${response.status}`);
      }
      
      const results = await response.json();
      console.log('[위치 검색] API 응답:', results);
      
      // API 응답을 Place 형태로 변환
      const places: Place[] = results.map((item: any) => ({
        id: item.id || item.place_id,
        name: item.name,
        location: {
          latitude: item.latitude || item.lat,
          longitude: item.longitude || item.lng,
          address: item.address || item.formatted_address || ''
        },
        type: item.type || 'shop',
        rating: item.rating,
        distance: item.distance,
        photo: item.photo || item.photos?.[0],
        contact: item.phone || item.contact,
        openingHours: item.openingHours || item.opening_hours,
        description: item.description || item.editorial_summary?.overview || '',
        isCertified: item.certification || item.isCertified || false,
        certificationLevel: item.certificationLevel || 'standard',
        petFriendlyLevel: 'medium',
        features: item.features || []
      }));
      
      setNearbyPlaces(places);
      
      console.log(`[위치 검색] 검색어: "${searchTerm}", 결과: ${places.length}개`);
      
      toast({
        title: "검색 완료",
        description: `${places.length}개의 장소를 찾았습니다.`,
      });
    } catch (error) {
      console.error("검색 오류:", error);
      toast({
        title: "검색 실패",
        description: "장소를 검색하는데 실패했습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Input
          placeholder="위치 또는 장소 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={isSearching}>
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Search className="h-4 w-4 mr-2" />
          )}
          검색
        </Button>
      </div>

      {isSearching ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : nearbyPlaces.length > 0 ? (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {nearbyPlaces.map(place => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      ) : (
        searchTerm && !isSearching && (
          <Alert variant="default">
            <AlertDescription>
              "{searchTerm}"에 대한 검색 결과가 없습니다.
            </AlertDescription>
          </Alert>
        )
      )}
    </div>
  );
}

/**
 * 근처 장소 찾기 컴포넌트
 */
function NearbyPlaces() {
  const [activeTab, setActiveTab] = useState<'institute' | 'trainer' | 'clinic' | 'shop' | 'event' | 'cafe' | 'pension' | 'park'>('institute');
  const { 
    currentLocation, 
    nearbyPlaces, 
    isLoadingLocation, 
    isSearching, 
    getUserLocation, 
    searchNearbyPlaces 
  } = useMapService();
  const { toast } = useToast();

  // 이벤트 필터링 및 검색 상태
  const [eventSearchTerm, setEventSearchTerm] = useState('');
  const [eventCategoryFilter, setEventCategoryFilter] = useState('all');
  const [eventStatusFilter, setEventStatusFilter] = useState('all');
  const [eventSortBy, setEventSortBy] = useState('date');
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);

  // 축제/이벤트 데이터 - API에서 가져오기
  const [eventData, setEventData] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // 썸네일 업데이트 핸들러
  const handleThumbnailUpdate = (eventId: number, thumbnailUrl: string) => {
    setEventData(prevData => 
      prevData.map(event => 
        event.id === eventId ? { ...event, thumbnailUrl } : event
      )
    );
  };
  
  // 이벤트 API 호출 함수
  const fetchEvents = async () => {
    try {
      setIsLoadingEvents(true);
      console.log('🔥 이벤트 API 호출 시작');
      
      // 직접 fetch 사용하여 API 호출
      const response = await fetch('/api/events');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🔥 API 응답 데이터:', data);
      console.log('🔥 API 응답 타입:', typeof data, Array.isArray(data));
      
      if (Array.isArray(data)) {
        setEventData(data);
        console.log('🔥 이벤트 데이터 설정 완료, 총 개수:', data.length);
      } else if (data && data.items && Array.isArray(data.items)) {
        // 페이지네이션 형태의 응답 처리
        setEventData(data.items);
        console.log('🔥 이벤트 데이터 설정 완료 (페이지네이션), 총 개수:', data.items.length);
      } else {
        console.error('🔥 API 응답이 배열이 아님:', data);
        setEventData([]);
      }
    } catch (error) {
      console.error('🔥 이벤트 조회 오류:', error);
      toast({
        title: "오류",
        description: "이벤트 정보를 불러오는데 실패했습니다.",
        variant: "destructive"
      });
      setEventData([]);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  // 이벤트 탭 선택 시 데이터 로드
  useEffect(() => {
    if (activeTab === 'event') {
      fetchEvents();
    }
  }, [activeTab]);

  // 이벤트 필터링 및 검색 로직
  useEffect(() => {
    console.log('🔥 필터링 시작, 원본 데이터 개수:', eventData.length);
    let filtered = [...eventData];

    // 검색어 필터링
    if (eventSearchTerm) {
      filtered = filtered.filter(event => 
        event.name.toLowerCase().includes(eventSearchTerm.toLowerCase()) ||
        event.location.address.toLowerCase().includes(eventSearchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(eventSearchTerm.toLowerCase()) ||
        event.tags.some(tag => tag.toLowerCase().includes(eventSearchTerm.toLowerCase()))
      );
    }

    // 카테고리 필터링
    if (eventCategoryFilter !== 'all') {
      filtered = filtered.filter(event => event.category === eventCategoryFilter);
    }

    // 상태 필터링
    if (eventStatusFilter !== 'all') {
      filtered = filtered.filter(event => event.status === eventStatusFilter);
    }

    // 정렬
    filtered.sort((a, b) => {
      switch (eventSortBy) {
        case 'date':
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          const priceA = a.price === '무료' ? 0 : typeof a.price === 'number' ? a.price : parseInt(a.price.replace(/[^\d]/g, '')) || 0;
          const priceB = b.price === '무료' ? 0 : typeof b.price === 'number' ? b.price : parseInt(b.price.replace(/[^\d]/g, '')) || 0;
          return priceA - priceB;
        case 'attendees':
          return b.maxAttendees - a.maxAttendees;
        default:
          return 0;
      }
    });

    console.log('🔥 필터링 완료, 필터링된 데이터 개수:', filtered.length);
    setFilteredEvents(filtered);
  }, [eventData, eventSearchTerm, eventCategoryFilter, eventStatusFilter, eventSortBy]);

  // 근처 장소 검색
  const handleSearchNearby = async () => {
    // 현재 위치가 없으면 위치 가져오기
    if (!currentLocation) {
      const location = await getUserLocation();
      if (!location) {
        toast({
          title: "위치 정보 필요",
          description: "주변 검색을 위해 위치 정보를 허용해주세요.",
          variant: "destructive"
        });
        return;
      }
    }

    // 선택된 유형의 장소 검색 (이벤트 탭 제외)
    if (activeTab !== 'event') {
      searchNearbyPlaces(activeTab as any);
    }
  };

  // 탭 변경 시 자동 검색 (축제/이벤트 탭 제외)
  useEffect(() => {
    if (currentLocation && activeTab !== 'event') {
      // 유효한 Place 타입만 검색
      const validPlaceTypes: Array<'trainer' | 'institute' | 'clinic' | 'shop' | 'cafe' | 'pension' | 'park' | 'grooming' | 'restaurant' | 'pethotel'> = 
        ['trainer', 'institute', 'clinic', 'shop', 'cafe', 'pension', 'park', 'grooming', 'restaurant', 'pethotel'];
      
      if (validPlaceTypes.includes(activeTab as any)) {
        searchNearbyPlaces(activeTab as any);
      }
    }
  }, [activeTab, currentLocation, searchNearbyPlaces]);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Button 
          onClick={handleSearchNearby} 
          variant="default" 
          disabled={isLoadingLocation || isSearching}
        >
          {isLoadingLocation ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Navigation className="h-4 w-4 mr-2" />
          )}
          {currentLocation ? '현재 위치에서 검색' : '위치 확인 후 검색'}
        </Button>

        {currentLocation && (
          <div className="text-xs text-muted-foreground">
            위도: {currentLocation.latitude.toFixed(4)}, 
            경도: {currentLocation.longitude.toFixed(4)}
          </div>
        )}
      </div>

      {/* 카테고리 구분 */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">카테고리 선택</h3>
        <Tabs defaultValue="trainer" value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="inline-flex w-full overflow-x-auto h-auto p-1 gap-1">
            <TabsTrigger value="trainer" className="text-sm whitespace-nowrap px-3 py-2 flex-shrink-0">훈련사</TabsTrigger>
            <TabsTrigger value="institute" className="text-sm whitespace-nowrap px-3 py-2 flex-shrink-0">훈련소</TabsTrigger>
            <TabsTrigger value="clinic" className="text-sm whitespace-nowrap px-3 py-2 flex-shrink-0">동물병원</TabsTrigger>
            <TabsTrigger value="grooming" className="text-sm whitespace-nowrap px-3 py-2 flex-shrink-0">미용실</TabsTrigger>
            <TabsTrigger value="shop" className="text-sm whitespace-nowrap px-3 py-2 flex-shrink-0">용품점</TabsTrigger>
            <TabsTrigger value="cafe" className="text-sm whitespace-nowrap px-3 py-2 flex-shrink-0">강아지카페</TabsTrigger>
            <TabsTrigger value="restaurant" className="text-sm whitespace-nowrap px-3 py-2 flex-shrink-0">애견식당</TabsTrigger>
            <TabsTrigger value="pethotel" className="text-sm whitespace-nowrap px-3 py-2 flex-shrink-0">애견호텔</TabsTrigger>
            <TabsTrigger value="pension" className="text-sm whitespace-nowrap px-3 py-2 flex-shrink-0">펜션</TabsTrigger>
            <TabsTrigger value="park" className="text-sm whitespace-nowrap px-3 py-2 flex-shrink-0">공원</TabsTrigger>
            <TabsTrigger value="event" className="text-sm whitespace-nowrap px-3 py-2 flex-shrink-0">축제</TabsTrigger>
          </TabsList>
          
          {/* 탭 컨텐츠 */}
          <TabsContent value="trainer" className="mt-4">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                주변 반려동물 훈련사를 찾아보세요. 전문적인 훈련 서비스를 제공합니다.
              </div>
              {isSearching ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : nearbyPlaces.length > 0 ? (
                <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 32rem)' }}>
                  {nearbyPlaces.map(place => (
                    <PlaceCard key={place.id} place={place} />
                  ))}
                </div>
              ) : (
                (!isSearching && currentLocation) && (
                  <Alert variant="default">
                    <AlertDescription>
                      주변에 {getTypeLabel(activeTab)}이(가) 없습니다.
                    </AlertDescription>
                  </Alert>
                )
              )}
            </div>
          </TabsContent>

          <TabsContent value="institute" className="mt-4">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                주변 반려동물 훈련소를 찾아보세요. 체계적인 훈련 프로그램을 제공합니다.
              </div>
              {isSearching ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : nearbyPlaces.length > 0 ? (
                <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 32rem)' }}>
                  {nearbyPlaces.map(place => (
                    <PlaceCard key={place.id} place={place} />
                  ))}
                </div>
              ) : (
                (!isSearching && currentLocation) && (
                  <Alert variant="default">
                    <AlertDescription>
                      주변에 {getTypeLabel(activeTab)}이(가) 없습니다.
                    </AlertDescription>
                  </Alert>
                )
              )}
            </div>
          </TabsContent>

          <TabsContent value="clinic" className="mt-4">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                주변 동물병원을 찾아보세요. 반려동물의 건강관리를 위한 전문 의료 서비스를 제공합니다.
              </div>
              {isSearching ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : nearbyPlaces.length > 0 ? (
                <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 32rem)' }}>
                  {nearbyPlaces.map(place => (
                    <PlaceCard key={place.id} place={place} />
                  ))}
                </div>
              ) : (
                (!isSearching && currentLocation) && (
                  <Alert variant="default">
                    <AlertDescription>
                      주변에 {getTypeLabel(activeTab)}이(가) 없습니다.
                    </AlertDescription>
                  </Alert>
                )
              )}
            </div>
          </TabsContent>

          <TabsContent value="shop" className="mt-4">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                주변 반려동물 용품점을 찾아보세요. 사료, 간식, 장난감 등 다양한 용품을 만나보세요.
              </div>
              {isSearching ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : nearbyPlaces.length > 0 ? (
                <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 32rem)' }}>
                  {nearbyPlaces.map(place => (
                    <PlaceCard key={place.id} place={place} />
                  ))}
                </div>
              ) : (
                (!isSearching && currentLocation) && (
                  <Alert variant="default">
                    <AlertDescription>
                      주변에 {getTypeLabel(activeTab)}이(가) 없습니다.
                    </AlertDescription>
                  </Alert>
                )
              )}
            </div>
          </TabsContent>

          <TabsContent value="cafe" className="mt-4">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                주변 강아지 카페를 찾아보세요. 반려견과 함께 즐거운 시간을 보낼 수 있는 공간입니다.
              </div>
              {isSearching ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : nearbyPlaces.length > 0 ? (
                <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 32rem)' }}>
                  {nearbyPlaces.map(place => (
                    <PlaceCard key={place.id} place={place} />
                  ))}
                </div>
              ) : (
                (!isSearching && currentLocation) && (
                  <Alert variant="default">
                    <AlertDescription>
                      주변에 {getTypeLabel(activeTab)}이(가) 없습니다.
                    </AlertDescription>
                  </Alert>
                )
              )}
            </div>
          </TabsContent>

          <TabsContent value="pension" className="mt-4">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                주변 애견 펜션을 찾아보세요. 반려견과 함께 숙박할 수 있는 펜션입니다.
              </div>
              {isSearching ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : nearbyPlaces.length > 0 ? (
                <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 32rem)' }}>
                  {nearbyPlaces.map(place => (
                    <PlaceCard key={place.id} place={place} />
                  ))}
                </div>
              ) : (
                (!isSearching && currentLocation) && (
                  <Alert variant="default">
                    <AlertDescription>
                      주변에 {getTypeLabel(activeTab)}이(가) 없습니다.
                    </AlertDescription>
                  </Alert>
                )
              )}
            </div>
          </TabsContent>

          <TabsContent value="park" className="mt-4">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                주변 반려동물 공원을 찾아보세요. 반려견이 자유롭게 뛰어놀 수 있는 공간입니다.
              </div>
              {isSearching ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : nearbyPlaces.length > 0 ? (
                <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 32rem)' }}>
                  {nearbyPlaces.map(place => (
                    <PlaceCard key={place.id} place={place} />
                  ))}
                </div>
              ) : (
                (!isSearching && currentLocation) && (
                  <Alert variant="default">
                    <AlertDescription>
                      주변에 {getTypeLabel(activeTab)}이(가) 없습니다.
                    </AlertDescription>
                  </Alert>
                )
              )}
            </div>
          </TabsContent>

          <TabsContent value="grooming" className="mt-4">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                주변 반려동물 미용실을 찾아보세요. 전문적인 그루밍 서비스를 제공합니다.
              </div>
              {isSearching ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : nearbyPlaces.length > 0 ? (
                <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 32rem)' }}>
                  {nearbyPlaces.map(place => (
                    <PlaceCard key={place.id} place={place} />
                  ))}
                </div>
              ) : (
                (!isSearching && currentLocation) && (
                  <Alert variant="default">
                    <AlertDescription>
                      주변에 {getTypeLabel(activeTab)}이(가) 없습니다.
                    </AlertDescription>
                  </Alert>
                )
              )}
            </div>
          </TabsContent>

          <TabsContent value="restaurant" className="mt-4">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                주변 애견 동반 식당을 찾아보세요. 반려견과 함께 식사할 수 있는 곳입니다.
              </div>
              {isSearching ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : nearbyPlaces.length > 0 ? (
                <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 32rem)' }}>
                  {nearbyPlaces.map(place => (
                    <PlaceCard key={place.id} place={place} />
                  ))}
                </div>
              ) : (
                (!isSearching && currentLocation) && (
                  <Alert variant="default">
                    <AlertDescription>
                      주변에 {getTypeLabel(activeTab)}이(가) 없습니다.
                    </AlertDescription>
                  </Alert>
                )
              )}
            </div>
          </TabsContent>

          <TabsContent value="pethotel" className="mt-4">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                주변 애견 호텔을 찾아보세요. 반려견을 안전하게 맡길 수 있는 곳입니다.
              </div>
              {isSearching ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : nearbyPlaces.length > 0 ? (
                <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 32rem)' }}>
                  {nearbyPlaces.map(place => (
                    <PlaceCard key={place.id} place={place} />
                  ))}
                </div>
              ) : (
                (!isSearching && currentLocation) && (
                  <Alert variant="default">
                    <AlertDescription>
                      주변에 {getTypeLabel(activeTab)}이(가) 없습니다.
                    </AlertDescription>
                  </Alert>
                )
              )}
            </div>
          </TabsContent>

          <TabsContent value="event" className="mt-4">
            <div className="space-y-4">
              {/* 축제/이벤트 필터링 및 검색 UI */}
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="축제명, 지역, 태그로 검색..."
                      value={eventSearchTerm}
                      onChange={(e) => setEventSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={eventCategoryFilter} onValueChange={setEventCategoryFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="카테고리" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체 카테고리</SelectItem>
                        <SelectItem value="전시회">전시회</SelectItem>
                        <SelectItem value="지역축제">지역축제</SelectItem>
                        <SelectItem value="자연체험">자연체험</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={eventStatusFilter} onValueChange={setEventStatusFilter}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="상태" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체 상태</SelectItem>
                        <SelectItem value="예정">예정</SelectItem>
                        <SelectItem value="진행중">진행중</SelectItem>
                        <SelectItem value="완료">완료</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={eventSortBy} onValueChange={setEventSortBy}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="정렬" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">날짜순</SelectItem>
                        <SelectItem value="name">이름순</SelectItem>
                        <SelectItem value="price">가격순</SelectItem>
                        <SelectItem value="attendees">규모순</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-4">
                    <span>총 {filteredEvents.length}개의 축제/이벤트</span>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        예정: {filteredEvents.filter(e => e.status === '예정').length}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        완료: {filteredEvents.filter(e => e.status === '완료').length}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setEventSearchTerm('');
                        setEventCategoryFilter('all');
                        setEventStatusFilter('all');
                        setEventSortBy('date');
                      }}
                    >
                      <Filter className="h-4 w-4 mr-1" />
                      필터 초기화
                    </Button>
                  </div>
                </div>
              </div>

              {/* 축제/이벤트 목록 */}
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {isLoadingEvents ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">이벤트 정보를 불러오는 중...</span>
                  </div>
                ) : filteredEvents.length > 0 ? (
                  <>
                    <div className="text-sm text-muted-foreground mb-2">
                      {filteredEvents.length}개의 이벤트를 표시하고 있습니다.
                    </div>
                    {filteredEvents.map((event, index) => {
                      console.log(`🔥 이벤트 ${index + 1}/${filteredEvents.length}: ${event.name}`);
                      return <EventCard key={event.id} event={event} onThumbnailUpdate={handleThumbnailUpdate} />;
                    })}
                  </>
                ) : (
                  <Alert>
                    <AlertDescription>
                      검색 조건에 맞는 축제/이벤트가 없습니다.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 이벤트 상세 정보 다이얼로그 */}
      <EventDetailDialog 
        event={selectedEvent} 
        isOpen={!!selectedEvent} 
        onClose={() => setSelectedEvent(null)} 
      />
    </div>
  );
}

/**
 * 이벤트 상세 정보 다이얼로그
 */
function EventDetailDialog({ event, isOpen, onClose }: { event: any; isOpen: boolean; onClose: () => void }) {
  if (!event) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case '예정': return 'bg-primary/10 text-primary border-primary/40';
      case '진행중': return 'bg-success/10 text-success border-success/40';
      case '완료': return 'bg-gray-100 text-gray-800 border-gray-300';
      case '취소': return 'bg-destructive/10 text-destructive border-destructive/40';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case '전시회': return <Trophy className="h-5 w-5" />;
      case '지역축제': return <Star className="h-5 w-5" />;
      case '자연체험': return <MapPin className="h-5 w-5" />;
      default: return <Calendar className="h-5 w-5" />;
    }
  };

  const handleSourceLink = () => {
    if (event.sourceUrl) {
      window.open(event.sourceUrl, '_blank');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event.name,
        text: event.description,
        url: event.sourceUrl
      });
    } else {
      navigator.clipboard.writeText(event.sourceUrl);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="flex items-center text-primary">
              {getCategoryIcon(event.category)}
              <span className="ml-2 text-sm font-medium">{event.category}</span>
            </div>
            <Badge className={`text-xs ${getStatusColor(event.status)}`}>
              {event.status}
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold mt-2">{event.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* 썸네일 이미지 */}
          {event.thumbnailUrl && (
            <div className="relative h-64 overflow-hidden rounded-lg">
              <img 
                src={event.thumbnailUrl} 
                alt={event.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          
          {/* 기본 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="font-medium">일정:</span>
                <span className="ml-2">
                  {event.startDate === event.endDate ? 
                    event.startDate : 
                    `${event.startDate} ~ ${event.endDate}`
                  }
                </span>
              </div>
              <div className="flex items-center text-sm">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="font-medium">시간:</span>
                <span className="ml-2">{event.time}</span>
              </div>
              <div className="flex items-center text-sm">
                <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="font-medium">장소:</span>
                <span className="ml-2">{event.location?.address || event.location}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="font-medium">참가자:</span>
                <span className="ml-2">
                  {event.attendees > 0 ? `${event.attendees}명 참여` : '참여 대기'} 
                  / 최대 {event.maxAttendees?.toLocaleString()}명
                </span>
              </div>
              <div className="flex items-center text-sm">
                <span className="font-medium">참가비:</span>
                <span className="ml-2">
                  {event.price === '무료' ? (
                    <Badge className="bg-success/10 text-success">무료</Badge>
                  ) : (
                    <Badge className="bg-primary/10 text-primary">
                      {typeof event.price === 'number' ? `${event.price.toLocaleString()}원` : event.price}
                    </Badge>
                  )}
                </span>
              </div>
              <div className="flex items-center text-sm">
                <span className="font-medium">주최:</span>
                <span className="ml-2">{event.organizer}</span>
              </div>
            </div>
          </div>
          
          {/* 상세 설명 */}
          <div>
            <h4 className="font-semibold mb-2">상세 설명</h4>
            <p className="text-sm text-gray-600 leading-relaxed">{event.description}</p>
          </div>
          
          {/* 태그 */}
          {event.tags && event.tags.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">태그</h4>
              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag: string, index: number) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* 액션 버튼 */}
          <div className="flex space-x-2 pt-4 border-t">
            {event.sourceUrl && (
              <Button onClick={handleSourceLink} className="flex-1">
                <ExternalLink className="h-4 w-4 mr-2" />
                원본 페이지 보기
              </Button>
            )}
            <Button onClick={handleShare} variant="outline">
              <Share2 className="h-4 w-4 mr-2" />
              공유하기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 썸네일 업로드 컴포넌트
 */
function ThumbnailUpload({ eventId, onUploadSuccess }: { eventId: number; onUploadSuccess: (thumbnailUrl: string) => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('thumbnail', file);
      
      const response = await fetch(`/api/events/${eventId}/thumbnail`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('업로드 실패');
      }
      
      const result = await response.json();
      
      toast({
        title: "썸네일 업로드 완료",
        description: "이벤트 썸네일이 성공적으로 업로드되었습니다.",
      });
      
      onUploadSuccess(result.thumbnailUrl);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('썸네일 업로드 오류:', error);
      toast({
        title: "업로드 실패",
        description: "썸네일 업로드에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          썸네일 업로드
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>이벤트 썸네일 업로드</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="space-y-2">
              <Image className="h-12 w-12 mx-auto text-gray-400" />
              <div className="space-y-1">
                <p className="text-sm font-medium">드래그 앤 드롭 또는 클릭하여 파일 선택</p>
                <p className="text-xs text-gray-500">JPG, PNG, GIF 파일 (최대 10MB)</p>
              </div>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(file);
                  }
                }}
                className="hidden"
                id="thumbnail-upload"
              />
              <label htmlFor="thumbnail-upload">
                <Button variant="outline" size="sm" disabled={isUploading} asChild>
                  <span className="cursor-pointer">
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        업로드 중...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        파일 선택
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 축제/이벤트 카드 컴포넌트
 */
function EventCard({ event, onThumbnailUpdate }: { event: any; onThumbnailUpdate?: (eventId: number, thumbnailUrl: string) => void }) {
  const { toast } = useToast();

  const handleEventClick = () => {
    // 이벤트 상세 정보 다이얼로그 열기
    console.log('이벤트 클릭:', event.name);
  };

  const handleSourceLink = () => {
    if (event.sourceUrl) {
      window.open(event.sourceUrl, '_blank');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event.name,
        text: event.description,
        url: event.sourceUrl
      });
    } else {
      navigator.clipboard.writeText(event.sourceUrl);
      toast({
        title: "링크 복사됨",
        description: "이벤트 링크가 클립보드에 복사되었습니다.",
      });
    }
  };

  const handleThumbnailUploadSuccess = (thumbnailUrl: string) => {
    if (onThumbnailUpdate) {
      onThumbnailUpdate(event.id, thumbnailUrl);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '예정': return 'bg-primary/10 text-primary';
      case '진행중': return 'bg-success/10 text-success';
      case '완료': return 'bg-gray-100 text-gray-800';
      case '취소': return 'bg-destructive/10 text-destructive';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case '전시회': return <Trophy className="h-4 w-4" />;
      case '지역축제': return <Star className="h-4 w-4" />;
      case '자연체험': return <MapPin className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary cursor-pointer hover:border-primary/50"
      onClick={handleEventClick}
    >
      {/* 썸네일 이미지 */}
      {event.thumbnailUrl && (
        <div className="relative h-48 overflow-hidden">
          <img 
            src={event.thumbnailUrl} 
            alt={event.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="absolute top-2 right-2">
            <Badge className={`text-xs ${getStatusColor(event.status)}`}>
              {event.status}
            </Badge>
          </div>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <div className="flex items-center text-primary">
                {getCategoryIcon(event.category)}
                <span className="ml-1 text-sm font-medium">{event.category}</span>
              </div>
              {!event.thumbnailUrl && (
                <Badge className={`text-xs ${getStatusColor(event.status)}`}>
                  {event.status}
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg leading-tight">{event.name}</CardTitle>
            <CardDescription className="mt-1 text-sm">
              <div className="flex items-center">
                <MapPin className="h-3 w-3 mr-1" />
                {event.location?.address || event.location}
              </div>
            </CardDescription>
          </div>
          <div className="flex flex-col items-end space-y-1">
            <div className="flex items-center text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 mr-1" />
              {event.startDate === event.endDate ? 
                event.startDate : 
                `${event.startDate} ~ ${event.endDate}`
              }
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              {event.time}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <p className="text-sm text-gray-600 line-clamp-2">
            {event.description}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                {event.attendees > 0 ? `${event.attendees}명 참여` : '참여 대기'}
              </div>
              <div className="text-xs">
                최대 {event.maxAttendees?.toLocaleString()}명
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {event.price === '무료' ? (
                <Badge className="bg-success/10 text-success">무료</Badge>
              ) : (
                <Badge className="bg-primary/10 text-primary">
                  {typeof event.price === 'number' ? `${event.price.toLocaleString()}원` : event.price}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {event.tags?.slice(0, 3).map((tag: string, index: number) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {event.tags?.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{event.tags.length - 3}
              </Badge>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            주최: {event.organizer}
          </div>
          
          <div className="flex space-x-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                handleEventClick();
              }}
              className="flex-1"
            >
              상세보기
            </Button>
            {event.sourceUrl && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleSourceLink();
                }}
                className="px-3"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
              className="px-3"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
          
          {/* 썸네일 업로드 버튼 */}
          <div className="flex justify-center pt-3 border-t" onClick={(e) => e.stopPropagation()}>
            <ThumbnailUpload 
              eventId={event.id} 
              onUploadSuccess={handleThumbnailUploadSuccess}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 두 지점 사이의 거리 계산 (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // 지구 반경 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // 소수점 1자리
}

/**
 * 장소 카드 컴포넌트
 */
function PlaceCard({ place }: { place: Place }) {
  const { currentLocation, setSelectedPlace } = useMapService();
  const { toast } = useToast();
  const [showDetails, setShowDetails] = useState(false);
  const [placeDetails, setPlaceDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // 거리 계산
  const distance = currentLocation ? 
    calculateDistance(
      currentLocation.latitude, 
      currentLocation.longitude,
      place.location.latitude,
      place.location.longitude
    ) : null;

  const handleGetDirections = () => {
    // Google Maps로 길찾기
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.location.latitude},${place.location.longitude}`;
    window.open(url, '_blank');
    
    toast({
      title: "길찾기",
      description: "Google Maps에서 길찾기를 시작합니다.",
    });
  };

  const handleCardClick = async () => {
    if (showDetails && placeDetails) {
      setShowDetails(false);
      return;
    }

    setIsLoadingDetails(true);
    try {
      const response = await fetch(`/api/places/${place.id}`);
      if (!response.ok) {
        throw new Error('장소 정보를 불러오는데 실패했습니다.');
      }
      const data = await response.json();
      setPlaceDetails(data);
      setShowDetails(true);
      setSelectedPlace(place);
    } catch (error) {
      console.error('장소 상세 정보 조회 오류:', error);
      toast({
        title: "오류",
        description: "장소 정보를 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow" 
      onClick={handleCardClick}
      data-testid={`place-card-${place.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-base">{place.name}</CardTitle>
              {/* 테일즈 인증 배지 */}
              {place.isCertified && (place.type === 'trainer' || place.type === 'institute') && (
                <Badge className="bg-primary/10 text-primary border-primary hover:bg-primary/20 flex items-center gap-1">
                  <Trophy className="h-3 w-3" />
                  <span className="text-xs font-semibold">테일즈 인증</span>
                </Badge>
              )}
            </div>
            <CardDescription>
              {place.location.address || "주소 정보 없음"}
            </CardDescription>
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 mr-1" />
            {distance ? `${distance}km` : "거리 정보 없음"}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="text-sm">
            {place.description || getTypeLabel(place.type)}
            {place.contact && (
              <div className="text-xs text-muted-foreground mt-1">
                {place.contact}
              </div>
            )}
            {place.rating && (
              <div className="flex items-center mt-1">
                <Star className="h-3 w-3 text-warning fill-warning mr-1" />
                <span className="text-xs font-medium">{place.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              handleGetDirections();
            }}
            data-testid="button-directions"
          >
            <Navigation className="h-3 w-3 mr-1" />
            길찾기
          </Button>
        </div>

        {/* 상세 정보 표시 */}
        {isLoadingDetails && (
          <div className="mt-4 flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {showDetails && placeDetails && (
          <div className="mt-4 pt-4 border-t space-y-3">
            {/* 영업 시간 */}
            {placeDetails.openingHours && (
              <div>
                <h4 className="text-sm font-semibold mb-1">영업 시간</h4>
                <div className="text-xs space-y-0.5">
                  {placeDetails.openingHours.isOpen !== undefined && (
                    <Badge variant={placeDetails.openingHours.isOpen ? "default" : "secondary"} className="text-xs mb-2">
                      {placeDetails.openingHours.isOpen ? "영업 중" : "영업 종료"}
                    </Badge>
                  )}
                  {placeDetails.openingHours.weekdayText?.map((text: string, idx: number) => (
                    <div key={idx} className="text-muted-foreground">{text}</div>
                  ))}
                </div>
              </div>
            )}

            {/* 전화번호 */}
            {placeDetails.phone && (
              <div>
                <h4 className="text-sm font-semibold mb-1">전화</h4>
                <a href={`tel:${placeDetails.phone}`} className="text-sm text-primary hover:underline">
                  {placeDetails.phone}
                </a>
              </div>
            )}

            {/* 웹사이트 */}
            {placeDetails.website && (
              <div>
                <h4 className="text-sm font-semibold mb-1">웹사이트</h4>
                <a 
                  href={placeDetails.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  방문하기 <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
            )}

            {/* 사진 */}
            {placeDetails.photos && placeDetails.photos.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">사진</h4>
                <div className="grid grid-cols-3 gap-2">
                  {placeDetails.photos.slice(0, 3).map((photo: string, idx: number) => (
                    <img 
                      key={idx}
                      src={photo} 
                      alt={`${place.name} 사진 ${idx + 1}`}
                      className="w-full h-20 object-cover rounded"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 리뷰 */}
            {placeDetails.reviews && placeDetails.reviews.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">리뷰</h4>
                <div className="space-y-2">
                  {placeDetails.reviews.slice(0, 2).map((review: any, idx: number) => (
                    <div key={idx} className="text-xs bg-muted p-2 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{review.author}</span>
                        <div className="flex items-center">
                          <Star className="h-3 w-3 text-warning fill-warning mr-1" />
                          <span>{review.rating}</span>
                        </div>
                      </div>
                      <p className="text-muted-foreground line-clamp-2">{review.text}</p>
                      <span className="text-xs text-muted-foreground mt-1">{review.relativeTime}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Google Maps 링크 */}
            {placeDetails.googleMapsUrl && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(placeDetails.googleMapsUrl, '_blank');
                }}
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                Google Maps에서 보기
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 장소 유형에 따른 레이블 반환
 */
function getTypeLabel(type: string): string {
  switch (type) {
    case 'institute': return '훈련소';
    case 'trainer': return '훈련사';
    case 'clinic': return '동물병원';
    case 'grooming': return '미용실';
    case 'shop': return '용품점';
    case 'cafe': return '강아지 카페';
    case 'restaurant': return '애견식당';
    case 'pethotel': return '애견호텔';
    case 'pension': return '애견 펜션';
    case 'park': return '반려동물 공원';
    case 'event': return '축제/이벤트';
    default: return '장소';
  }
}

/**
 * 메인 위치 검색 페이지 컨텐츠 (네이버 지도 스타일 레이아웃)
 */
function LocationPageContent() {
  const { currentLocation, nearbyPlaces, selectedPlace, setSelectedPlace } = useMapService();
  
  return (
    <div className="flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-16rem)] lg:h-[calc(100vh-12rem)]">
      {/* 왼쪽: 검색 컨트롤 및 결과 목록 */}
      <div className="w-full lg:w-2/5 lg:flex-shrink-0 flex flex-col space-y-4 lg:overflow-hidden min-w-0">
        <Card className="flex-shrink-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">위치 기반 서비스</CardTitle>
            <CardDescription className="text-sm">
              주변 훈련사, 훈련소, 동물병원, 용품점 등을 찾아보세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="nearby">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="nearby">주변 검색</TabsTrigger>
                <TabsTrigger value="search">키워드 검색</TabsTrigger>
              </TabsList>
              <TabsContent value="nearby" className="pt-4 overflow-y-auto max-h-[calc(100vh-28rem)]">
                <NearbyPlaces />
              </TabsContent>
              <TabsContent value="search" className="pt-4 overflow-y-auto max-h-[calc(100vh-28rem)]">
                <PlaceSearch />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* 오른쪽: 지도 */}
      <div className="w-full lg:flex-1 min-w-0 min-h-[280px] max-h-[55vh] lg:max-h-none lg:min-h-0">
        <Card className="h-full min-h-[280px] lg:min-h-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">지도</CardTitle>
              {currentLocation && (
                <div className="text-xs text-muted-foreground hidden sm:block">
                  현재 위치: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="h-[calc(100%-5rem)]">
            <GoogleMapView 
              center={{
                lat: currentLocation?.latitude || 37.5665,
                lng: currentLocation?.longitude || 126.978
              }}
              locations={nearbyPlaces.map((place: any) => ({
                id: place.id,
                name: place.name,
                address: place.location?.address || '',
                type: place.type,
                coordinates: {
                  lat: place.location?.latitude || 0,
                  lng: place.location?.longitude || 0
                }
              }))}
              onLocationSelect={(location) => {
                const place = nearbyPlaces.find(p => p.id === location.id);
                if (place) setSelectedPlace(place);
              }}
              height="100%"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * 위치 검색 페이지 (네이버 지도 스타일 - 전체 화면 활용)
 */
export default function LocationPage() {
  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="px-4 lg:px-6 py-4">
        <h1 className="text-2xl lg:text-3xl font-bold mb-4">근처 훈련소 찾기</h1>
      </div>
      <div className="px-4 lg:px-6 pb-24 lg:pb-4">
        <MapServiceProvider>
          <LocationPageContent />
        </MapServiceProvider>
      </div>
    </div>
  );
}