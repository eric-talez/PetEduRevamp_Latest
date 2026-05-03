import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { LocalErrorBoundary } from '@/components/ErrorBoundary';

interface GoogleMapViewProps {
  locations?: Array<{
    id: number;
    name: string;
    address: string;
    type?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  }>;
  center?: {
    lat: number;
    lng: number;
  };
  onLocationSelect?: (location: any) => void;
  height?: string;
  zoom?: number;
  userLocation?: {
    lat: number;
    lng: number;
  } | null;
}

const categoryIcons: Record<string, string> = {
  trainer: '🎓',
  institute: '🏫',
  hospital: '🏥',
  shop: '🛒',
  cafe: '☕',
  restaurant: '🍽️',
  park: '🌳',
  grooming: '✂️',
  hotel: '🏨',
  training: '🎓',
  event: '🎉',
  default: '📍'
};

const categoryColors: Record<string, string> = {
  trainer: '#2BAA61',
  institute: '#EA4335',
  hospital: '#34A853',
  shop: '#FBBC04',
  cafe: '#9C27B0',
  restaurant: '#FF6B6B',
  park: '#2E7D32',
  grooming: '#00BCD4',
  hotel: '#FF9800',
  training: '#3F51B5',
  event: '#E91E63',
  default: '#757575'
};

function GoogleMapViewInner({
  locations = [],
  center = { lat: 37.5665, lng: 126.9780 }, // 서울시청 기본 좌표
  onLocationSelect,
  height = '500px',
  zoom = 14,
  userLocation = null
}: GoogleMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 구글 맵 스크립트 로드
  useEffect(() => {
    // 환경 변수에서 API 키 가져오기 (여러 소스 확인)
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 
                   (window as any).__GOOGLE_MAPS_API_KEY__ ||
                   import.meta.env.GOOGLE_MAPS_API_KEY ||
                   'AIzaSyARFSKm3o7O4vn7RMjCkqYD4YuVfFF14Fo'; // 폴백 키
    
    console.log('[GoogleMapView] 환경 변수 MODE:', import.meta.env.MODE);
    console.log('[GoogleMapView] 환경 변수 DEV:', import.meta.env.DEV);
    console.log('[GoogleMapView] 환경 변수 PROD:', import.meta.env.PROD);
    console.log('[GoogleMapView] API Key 확인:', apiKey ? `설정됨 (${apiKey.substring(0, 10)}...)` : '누락');
    
    if (!apiKey) {
      console.error('[GoogleMapView] VITE_GOOGLE_MAPS_API_KEY 환경 변수가 설정되지 않았습니다.');
      console.error('[GoogleMapView] Replit Secrets에서 VITE_GOOGLE_MAPS_API_KEY를 설정하고 서버를 재시작하세요.');
      setError('Google Maps API 키가 설정되지 않았습니다. Replit Secrets에서 VITE_GOOGLE_MAPS_API_KEY를 설정해주세요.');
      setIsLoading(false);
      return;
    }

    // 이미 로드된 경우
    if (window.google && window.google.maps) {
      setIsLoading(false);
      return;
    }

    // 스크립트 로드
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      setIsLoading(false);
      setError(null);
    };
    
    script.onerror = () => {
      setError('Google Maps를 불러오는데 실패했습니다.');
      setIsLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      // cleanup은 하지 않음 (다른 컴포넌트에서도 사용 가능)
    };
  }, []);

  // 지도 초기화
  useEffect(() => {
    if (!mapRef.current || !window.google || !window.google.maps || isLoading) {
      return;
    }

    try {
      // 모바일 환경 감지
      const isMobile = window.innerWidth < 768;
      
      const mapOptions: google.maps.MapOptions = {
        center: { lat: center.lat, lng: center.lng },
        zoom: zoom,
        zoomControl: true,
        mapTypeControl: !isMobile, // 모바일에서는 지도 타입 컨트롤 숨김
        streetViewControl: !isMobile, // 모바일에서는 스트리트뷰 컨트롤 숨김
        fullscreenControl: true,
        gestureHandling: isMobile ? 'greedy' : 'cooperative', // 모바일에서 스크롤 처리 개선
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'on' }]
          }
        ]
      };

      const googleMap = new window.google.maps.Map(mapRef.current, mapOptions);
      setMap(googleMap);
    } catch (err) {
      console.error('Google Maps 초기화 오류:', err);
      setError('지도를 초기화하는데 실패했습니다.');
    }
  }, [isLoading, center.lat, center.lng, zoom]);

  // 마커 업데이트
  useEffect(() => {
    if (!map || !window.google || !window.google.maps) {
      return;
    }

    // 기존 마커 제거
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);

    // 새 마커 생성
    const newMarkers = locations
      .filter(loc => loc.coordinates)
      .map(location => {
        const icon = categoryIcons[location.type || 'default'] || categoryIcons.default;
        const color = categoryColors[location.type || 'default'] || categoryColors.default;

        // SVG 마커 생성
        const svgMarker = {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 12
        };

        const marker = new google.maps.Marker({
          position: { lat: location.coordinates!.lat, lng: location.coordinates!.lng },
          map: map,
          title: location.name,
          icon: svgMarker,
          animation: google.maps.Animation.DROP
        });

        // 정보창
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 12px; min-width: 200px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="font-size: 24px;">${icon}</span>
                <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #333;">${location.name}</h3>
              </div>
              <p style="margin: 4px 0; font-size: 13px; color: #666;">
                <span style="color: ${color}; font-weight: 600;">📍</span> ${location.address}
              </p>
            </div>
          `
        });

        // 마커 클릭 이벤트
        marker.addListener('click', () => {
          infoWindow.open(map, marker);
          if (onLocationSelect) {
            onLocationSelect(location);
          }
        });

        // 마커 호버 효과
        marker.addListener('mouseover', () => {
          marker.setAnimation(google.maps.Animation.BOUNCE);
          infoWindow.open(map, marker);
        });

        marker.addListener('mouseout', () => {
          marker.setAnimation(null);
        });

        return marker;
      });

    // 내 위치 마커 추가
    if (userLocation) {
      const userMarker = new google.maps.Marker({
        position: { lat: userLocation.lat, lng: userLocation.lng },
        map: map,
        title: '내 위치',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#2BAA61',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
          scale: 15
        },
        animation: google.maps.Animation.BOUNCE,
        zIndex: 9999
      });

      // 내 위치 정보창
      const userInfoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; min-width: 150px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span style="font-size: 24px;">📍</span>
              <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #2BAA61;">내 위치</h3>
            </div>
            <p style="margin: 4px 0; font-size: 12px; color: #666;">
              현재 위치를 기준으로 검색 중
            </p>
          </div>
        `
      });

      // 내 위치 마커 클릭 이벤트
      userMarker.addListener('click', () => {
        userInfoWindow.open(map, userMarker);
      });

      newMarkers.push(userMarker);
    }

    setMarkers(newMarkers);

    // 마커들이 모두 보이도록 지도 범위 조정
    if (newMarkers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      newMarkers.forEach(marker => {
        const position = marker.getPosition();
        if (position) {
          bounds.extend(position);
        }
      });
      
      // userLocation이 있으면 중심을 내 위치로
      if (userLocation) {
        map.setCenter({ lat: userLocation.lat, lng: userLocation.lng });
        map.setZoom(zoom);
      } else {
        map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
      }
    }
  }, [map, locations, onLocationSelect, userLocation, zoom]);

  if (isLoading) {
    return (
      <Card className="w-full" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Google Maps를 불러오는 중...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-red-500">
            <p className="font-semibold">{error}</p>
            <p className="text-sm mt-2">
              {error.includes('API 키') 
                ? 'VITE_GOOGLE_MAPS_API_KEY 환경 변수를 설정해주세요.'
                : 'Google Maps API 키를 확인해주세요.'
              }
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div 
      ref={mapRef} 
      className="w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
      style={{ 
        height,
        minHeight: '300px' // 모바일에서 최소 높이 보장
      }}
    />
  );
}

export function GoogleMapView(props: GoogleMapViewProps) {
  return (
    <LocalErrorBoundary name="지도">
      <GoogleMapViewInner {...props} />
    </LocalErrorBoundary>
  );
}

// 타입 선언
declare global {
  interface Window {
    google: typeof google;
  }
}
