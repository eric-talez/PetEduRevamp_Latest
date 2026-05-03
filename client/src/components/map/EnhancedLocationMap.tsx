import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MapPin, 
  Navigation, 
  Phone, 
  Clock, 
  Star, 
  Search, 
  Filter,
  Loader2,
  RefreshCw,
  Route,
  Eye,
  EyeOff,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Leaflet 기본 마커 아이콘 수정
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

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
  trainers?: any[];
  reviewCount?: number;
  services?: string[];
  priceRange?: string;
  images?: string[];
  isCertified?: boolean;
  talezCertificationStatus?: 'pending' | 'verified' | 'rejected';
}

interface EnhancedLocationMapProps {
  locations?: LocationData[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  showLocationList?: boolean;
  onLocationSelect?: (location: LocationData) => void;
  onReservationClick?: (location: LocationData) => void;
  enableRealTimeTracking?: boolean;
  showDistanceFilter?: boolean;
  enableClustering?: boolean;
}

export function EnhancedLocationMap({
  locations = [],
  center = [37.5665, 126.9780], // 서울 중심
  zoom = 12,
  height = "600px",
  showLocationList = true,
  onLocationSelect,
  onReservationClick,
  enableRealTimeTracking = true,
  showDistanceFilter = true,
  enableClustering = false
}: EnhancedLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDistance, setFilterDistance] = useState<number>(10);
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'name'>('distance');
  const [showMap, setShowMap] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { toast } = useToast();

  // 위치 타입별 아이콘 생성
  const getLocationIcon = useCallback((type: string, isSelected: boolean = false) => {
    const iconColors = {
      'training-center': '#2BAA61',
      'training': '#2BAA61',
      'pet-store': '#FFA726',
      'veterinary': '#E74D3C',
      'hospital': '#E74D3C',
      'event': '#29B5F6',
      'grooming': '#9B59B6',
      'hotel': '#E67E22',
      'cafe': '#F39C12',
      'park': '#27AE60'
    };

    const color = iconColors[type as keyof typeof iconColors] || '#6B7280';
    const size = isSelected ? 32 : 24;
    const border = isSelected ? '4px solid #FFD700' : '3px solid white';

    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: ${border};
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: ${isSelected ? 'pulse 2s infinite' : 'none'};
      ">
        <div style="
          width: ${size/3}px;
          height: ${size/3}px;
          background-color: white;
          border-radius: 50%;
        "></div>
      </div>`,
      iconSize: [size, size],
      iconAnchor: [size/2, size/2]
    });
  }, []);

  // 사용자 위치 아이콘
  const getUserLocationIcon = useCallback(() => {
    return L.divIcon({
      className: 'user-location-icon',
      html: `<div style="
        background-color: #3B82F6;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        animation: pulse 2s infinite;
      "></div>
      <style>
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      </style>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  }, []);

  // 지도 초기화
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initMap = () => {
      try {
        const map = L.map(mapRef.current!, {
          center: center,
          zoom: zoom,
          zoomControl: true,
          attributionControl: true,
          preferCanvas: false
        });

        // 타일 레이어 추가 (여러 옵션으로 안정성 확보)
        const tileOptions = {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
          crossOrigin: true
        };

        // 기본 타일 레이어
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', tileOptions);

        // 백업 타일 레이어들
        const backupLayers = [
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', tileOptions),
          L.tileLayer('https://a.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', tileOptions)
        ];

        // 타일 레이어 에러 처리
        osmLayer.on('tileerror', () => {
          console.warn('기본 타일 레이어 오류, 백업 레이어 시도');
          backupLayers[0].addTo(map);
        });

        osmLayer.addTo(map);
        mapInstanceRef.current = map;

        // 지도 크기 조정
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 100);

      } catch (error) {
        console.error('지도 초기화 오류:', error);
        toast({
          title: "지도 로드 실패",
          description: "지도를 불러오는데 실패했습니다. 페이지를 새로고침해주세요.",
          variant: "destructive"
        });
      }
    };

    const timer = setTimeout(initMap, 100);
    return () => clearTimeout(timer);
  }, [center, zoom, toast]);

  // 사용자 위치 가져오기 (한 번만)
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: "위치 서비스 미지원",
        description: "이 브라우저에서는 위치 서비스를 지원하지 않습니다.",
        variant: "destructive"
      });
      return;
    }

    setIsLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [
          position.coords.latitude,
          position.coords.longitude
        ];
        setUserLocation(coords);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView(coords, 15);

          // 기존 사용자 마커 제거
          if (userMarkerRef.current) {
            userMarkerRef.current.remove();
          }

          // 새 사용자 마커 추가
          userMarkerRef.current = L.marker(coords, {
            icon: getUserLocationIcon()
          }).addTo(mapInstanceRef.current);

          userMarkerRef.current.bindPopup('현재 위치');
        }

        setIsLoadingLocation(false);
        toast({
          title: "위치 확인 완료",
          description: "현재 위치를 찾았습니다.",
        });
      },
      (error) => {
        setIsLoadingLocation(false);
        let errorMessage = "위치 정보를 가져올 수 없습니다.";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "위치 접근 권한이 거부되었습니다.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "위치 정보를 사용할 수 없습니다.";
            break;
          case error.TIMEOUT:
            errorMessage = "위치 정보 요청 시간이 초과되었습니다.";
            break;
        }

        toast({
          title: "위치 확인 실패",
          description: errorMessage,
          variant: "destructive"
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5분
      }
    );
  }, [getUserLocationIcon, toast]);

  // 실시간 위치 추적 시작/중지
  const toggleLocationTracking = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: "위치 서비스 미지원",
        description: "이 브라우저에서는 위치 서비스를 지원하지 않습니다.",
        variant: "destructive"
      });
      return;
    }

    if (isTrackingLocation) {
      // 추적 중지
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsTrackingLocation(false);
      toast({
        title: "위치 추적 중지",
        description: "실시간 위치 추적이 중지되었습니다.",
      });
    } else {
      // 추적 시작
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const coords: [number, number] = [
            position.coords.latitude,
            position.coords.longitude
          ];
          setUserLocation(coords);

          if (mapInstanceRef.current) {
            // 기존 사용자 마커 제거
            if (userMarkerRef.current) {
              userMarkerRef.current.remove();
            }

            // 새 사용자 마커 추가
            userMarkerRef.current = L.marker(coords, {
              icon: getUserLocationIcon()
            }).addTo(mapInstanceRef.current);

            userMarkerRef.current.bindPopup('현재 위치 (실시간)');
          }
        },
        (error) => {
          console.error('위치 추적 오류:', error);
          setIsTrackingLocation(false);
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 10000 // 10초
        }
      );

      setIsTrackingLocation(true);
      toast({
        title: "위치 추적 시작",
        description: "실시간 위치 추적이 시작되었습니다.",
      });
    }
  }, [isTrackingLocation, getUserLocationIcon, toast]);

  // 거리 계산
  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // 지구 반지름 (km)
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  const toRad = (value: number): number => {
    return value * Math.PI / 180;
  };

  // 필터링 및 정렬된 위치 목록
  const filteredAndSortedLocations = React.useMemo(() => {
    let filtered = locations;

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(location =>
        location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 타입 필터링
    if (filterType !== 'all') {
      filtered = filtered.filter(location => location.type === filterType);
    }

    // 거리 필터링 (사용자 위치가 있을 때만)
    if (userLocation && showDistanceFilter) {
      filtered = filtered.filter(location => {
        const distance = calculateDistance(
          userLocation[0], userLocation[1],
          location.lat, location.lng
        );
        return distance <= filterDistance;
      });
    }

    // 거리 계산 추가
    if (userLocation) {
      filtered = filtered.map(location => ({
        ...location,
        distance: calculateDistance(
          userLocation[0], userLocation[1],
          location.lat, location.lng
        )
      }));
    }

    // 정렬
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

    return filtered;
  }, [locations, searchTerm, filterType, filterDistance, userLocation, showDistanceFilter, calculateDistance, sortBy]);

  // 지도에 마커 추가
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // 기존 마커 제거 (사용자 마커는 제외)
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // 새 마커 추가
    filteredAndSortedLocations.forEach(location => {
      const isSelected = selectedLocation?.id === location.id;
      const marker = L.marker([location.lat, location.lng], {
        icon: getLocationIcon(location.type, isSelected)
      }).addTo(mapInstanceRef.current!);

      // 팝업 내용 생성
      const popupContent = `
        <div style="min-width: 280px; max-width: 320px; font-family: sans-serif;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #1f2937; font-size: 16px;">${location.name}</h3>
          <div style="margin-bottom: 8px; display: flex; gap: 4px; flex-wrap: wrap;">
            <span style="display: inline-block; padding: 2px 8px; background: #e5e7eb; border-radius: 12px; font-size: 11px; color: #374151;">
              ${getLocationTypeLabel(location.type)}
            </span>
            ${location.certificationStatus === 'verified' || location.talezCertificationStatus === 'verified' ? `
              <span style="display: inline-block; padding: 2px 8px; background: #dcfce7; border-radius: 12px; font-size: 11px; color: #166534;">
                TALEZ 인증
              </span>
            ` : ''}
          </div>
          <p style="margin: 4px 0; color: #6b7280; font-size: 13px; line-height: 1.4;">${location.address}</p>
          ${location.phone ? `<p style="margin: 4px 0; font-size: 13px;"><strong>📞</strong> ${location.phone}</p>` : ''}
          ${location.hours ? `<p style="margin: 4px 0; font-size: 13px;"><strong>🕒</strong> ${location.hours}</p>` : ''}
          ${location.rating ? `<p style="margin: 4px 0; font-size: 13px;"><strong>⭐</strong> ${location.rating}/5 ${location.reviewCount ? `(${location.reviewCount}개)` : ''}</p>` : ''}
          ${location.distance ? `<p style="margin: 4px 0; font-size: 13px;"><strong>📍</strong> ${location.distance < 1 ? `${Math.round(location.distance * 1000)}m` : `${location.distance.toFixed(1)}km`}</p>` : ''}
          ${location.services && location.services.length > 0 ? `
            <div style="margin: 8px 0;">
              <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: bold; color: #374151;">서비스</p>
              <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                ${location.services.slice(0, 3).map(service => `
                  <span style="padding: 2px 6px; background: #f3f4f6; border-radius: 8px; font-size: 10px; color: #4b5563;">${service}</span>
                `).join('')}
                ${location.services.length > 3 ? `<span style="font-size: 10px; color: #6b7280;">+${location.services.length - 3}</span>` : ''}
              </div>
            </div>
          ` : ''}
          ${location.description ? `<p style="margin: 8px 0; color: #6b7280; font-size: 12px; line-height: 1.4; max-height: 40px; overflow: hidden;">${location.description.length > 80 ? location.description.substring(0, 80) + '...' : location.description}</p>` : ''}
          <div style="margin-top: 12px; display: flex; gap: 8px;">
            <button onclick="window.selectLocation('${location.id}')" style="
              padding: 8px 12px;
              background: #3b82f6;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 12px;
              font-weight: 500;
              flex: 1;
              transition: background 0.2s;
            " onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">상세보기</button>
            ${(location.type === 'training-center' || location.type === 'training' || location.type === 'hospital' || location.type === 'veterinary') ? `
              <button onclick="window.reserveLocation('${location.id}')" style="
                padding: 8px 12px;
                background: #10b981;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                flex: 1;
                transition: background 0.2s;
              " onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">예약하기</button>
            ` : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        setSelectedLocation(location);
        onLocationSelect?.(location);
      });

      markersRef.current.push(marker);
    });

    // 마커에 맞춰 지도 영역 조정
    if (filteredAndSortedLocations.length > 0) {
      const group = new L.FeatureGroup(markersRef.current);
      const bounds = group.getBounds();

      if (bounds.isValid()) {
        mapInstanceRef.current.fitBounds(bounds.pad(0.1));
      }
    }

    // 전역 함수 등록 (팝업에서 사용)
    (window as any).selectLocation = (locationId: string) => {
      const location = filteredAndSortedLocations.find(loc => loc.id === locationId);
      if (location) {
        setSelectedLocation(location);
        onLocationSelect?.(location);
      }
    };

    (window as any).reserveLocation = (locationId: string) => {
      const location = filteredAndSortedLocations.find(loc => loc.id === locationId);
      if (location) {
        onReservationClick?.(location);
      }
    };

  }, [filteredAndSortedLocations, selectedLocation, getLocationIcon, onLocationSelect, onReservationClick]);

  // 위치 타입 라벨 생성
  const getLocationTypeLabel = (type: string) => {
    const labels = {
      'training-center': '훈련센터',
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

  // 위치 타입 배지 색상
  const getLocationTypeBadgeColor = (type: string) => {
    const colors = {
      'training-center': 'bg-green-100 text-green-800',
      'training': 'bg-green-100 text-green-800',
      'pet-store': 'bg-orange-100 text-orange-800',
      'veterinary': 'bg-red-100 text-red-800',
      'hospital': 'bg-red-100 text-red-800',
      'event': 'bg-blue-100 text-blue-800',
      'grooming': 'bg-primary/10 text-primary',
      'hotel': 'bg-yellow-100 text-yellow-800',
      'cafe': 'bg-secondary/15 text-secondary-foreground',
      'park': 'bg-green-100 text-green-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // 위치 새로고침
  const refreshLocations = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast({
        title: "위치 정보 업데이트",
        description: "위치 정보가 새로고침되었습니다.",
      });
    }, 1000);
  }, [toast]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, []);

  return (
    <div className="w-full space-y-4">
      {/* 검색 및 필터 영역 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              위치 찾기
            </span>
            <div className="flex items-center gap-2">
              <Button
                onClick={refreshLocations}
                variant="outline"
                size="sm"
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                새로고침
              </Button>
              <Button
                onClick={() => setShowMap(!showMap)}
                variant="outline"
                size="sm"
              >
                {showMap ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showMap ? '지도 숨기기' : '지도 보기'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 검색 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="장소명, 주소 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 타입 필터 */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 장소</SelectItem>
                <SelectItem value="training-center">훈련센터</SelectItem>
                <SelectItem value="training">훈련소</SelectItem>
                <SelectItem value="pet-store">펫샵</SelectItem>
                <SelectItem value="veterinary">동물병원</SelectItem>
                <SelectItem value="hospital">동물병원</SelectItem>
                <SelectItem value="grooming">미용실</SelectItem>
                <SelectItem value="hotel">펫호텔</SelectItem>
                <SelectItem value="cafe">펫카페</SelectItem>
                <SelectItem value="park">공원</SelectItem>
                <SelectItem value="event">이벤트</SelectItem>
              </SelectContent>
            </Select>

            {/* 정렬 */}
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'distance' | 'rating' | 'name')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="distance">거리순</SelectItem>
                <SelectItem value="rating">평점순</SelectItem>
                <SelectItem value="name">이름순</SelectItem>
              </SelectContent>
            </Select>

            {/* 위치 버튼들 */}
            <div className="flex gap-2">
              <Button
                onClick={getUserLocation}
                variant="outline"
                size="sm"
                disabled={isLoadingLocation}
                className="flex-1"
              >
                {isLoadingLocation ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
              </Button>

              {enableRealTimeTracking && (
                <Button
                  onClick={toggleLocationTracking}
                  variant={isTrackingLocation ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                >
                  <Route className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* 거리 필터 */}
          {showDistanceFilter && userLocation && (
            <div className="mt-4 flex items-center gap-4">
              <label className="text-sm font-medium">거리 필터:</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={filterDistance}
                  onChange={(e) => setFilterDistance(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-gray-600 min-w-[60px]">
                  {filterDistance}km
                </span>
              </div>
            </div>
          )}

          {/* 결과 요약 */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {filteredAndSortedLocations.length}개 장소
              </span>
              {userLocation && (
                <Badge variant="outline" className="text-blue-600">
                  <MapPin className="w-3 h-3 mr-1" />
                  현재 위치 기준
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 지도 */}
      {showMap && (
        <div className="relative">
          <div 
            ref={mapRef} 
            style={{ 
              height, 
              width: '100%',
              borderRadius: '12px',
              overflow: 'hidden'
            }}
            className="border-2 border-gray-200 shadow-lg"
          />

          {/* 로딩 표시 */}
          {!mapInstanceRef.current && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
                <p className="text-sm text-gray-600">지도를 불러오는 중...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 위치 목록 */}
      {showLocationList && (
        <Card>
          <CardHeader>
            <CardTitle>
              위치 목록 ({filteredAndSortedLocations.length}개)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredAndSortedLocations.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredAndSortedLocations.map((location) => (
                  <div
                    key={location.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedLocation?.id === location.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setSelectedLocation(location);
                      onLocationSelect?.(location);

                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.setView([location.lat, location.lng], 16);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h4 className="font-semibold text-lg">{location.name}</h4>
                          <Badge className={getLocationTypeBadgeColor(location.type)}>
                            {getLocationTypeLabel(location.type)}
                          </Badge>
                          {(location.isCertified || location.talezCertificationStatus === 'verified') && (
                            <Badge className="bg-gradient-to-r from-[#2BAA61] to-[#229954] text-white border-none">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              TALEZ 인증
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{location.address}</span>
                          </div>

                          {location.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              <span>{location.phone}</span>
                            </div>
                          )}

                          {location.hours && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>{location.hours}</span>
                            </div>
                          )}

                          {location.rating && (
                            <div className="flex items-center gap-2">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span>{location.rating}/5</span>
                              {location.reviewCount && (
                                <span className="text-gray-500">({location.reviewCount})</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        {location.distance && (
                          <div className="text-sm font-medium text-blue-600 mb-2">
                            {location.distance < 1 
                              ? `${Math.round(location.distance * 1000)}m`
                              : `${location.distance.toFixed(1)}km`
                            }
                          </div>
                        )}

                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLocation(location);
                              onLocationSelect?.(location);
                            }}
                          >
                            상세보기
                          </Button>

                          {(location.type === 'training-center' || location.type === 'training' || location.type === 'hospital' || location.type === 'veterinary') && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onReservationClick?.(location);
                              }}
                            >
                              예약하기
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {location.description && (
                      <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                        {location.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">조건에 맞는 위치가 없습니다.</p>
                <p className="text-sm text-gray-400 mt-1">
                  검색 조건을 조정해보세요.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}