import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { LocalErrorBoundary } from '@/components/ErrorBoundary';

interface NaverMapViewProps {
  locations?: Array<{
    id: number;
    name: string;
    address: string;
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
}

function NaverMapViewInner({
  locations = [],
  center = { lat: 37.5665, lng: 126.9780 }, // 서울시청 기본 좌표
  onLocationSelect,
  height = '500px',
  zoom = 14
}: NaverMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 네이버 지도 스크립트 로드
  useEffect(() => {
    const clientId = import.meta.env.VITE_NAVER_CLIENT_ID || '5bn1nUUVxjxhjuYa3kgz';
    
    // 이미 로드된 경우
    if (window.naver && window.naver.maps) {
      setIsLoading(false);
      return;
    }

    // 스크립트 로드
    const script = document.createElement('script');
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}`;
    script.async = true;
    
    script.onload = () => {
      setIsLoading(false);
      setError(null);
    };
    
    script.onerror = () => {
      setError('네이버 지도를 불러오는데 실패했습니다.');
      setIsLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      // cleanup은 하지 않음 (다른 컴포넌트에서도 사용 가능)
    };
  }, []);

  // 지도 초기화
  useEffect(() => {
    if (!mapRef.current || !window.naver || !window.naver.maps || isLoading) {
      return;
    }

    try {
      const mapOptions = {
        center: new window.naver.maps.LatLng(center.lat, center.lng),
        zoom: zoom,
        zoomControl: true,
        zoomControlOptions: {
          position: window.naver.maps.Position.TOP_RIGHT
        }
      };

      const naverMap = new window.naver.maps.Map(mapRef.current, mapOptions);
      setMap(naverMap);
    } catch (err) {
      console.error('네이버 지도 초기화 오류:', err);
      setError('지도를 초기화하는데 실패했습니다.');
    }
  }, [isLoading, center.lat, center.lng, zoom]);

  // 마커 업데이트
  useEffect(() => {
    if (!map || !window.naver || !window.naver.maps) {
      return;
    }

    // 기존 마커 제거
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);

    // 새 마커 생성
    const newMarkers = locations
      .filter(loc => loc.coordinates)
      .map(location => {
        const marker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(
            location.coordinates!.lat,
            location.coordinates!.lng
          ),
          map: map,
          title: location.name
        });

        // 마커 클릭 이벤트
        if (onLocationSelect) {
          window.naver.maps.Event.addListener(marker, 'click', () => {
            onLocationSelect(location);
          });
        }

        // 정보창
        const infoWindow = new window.naver.maps.InfoWindow({
          content: `
            <div style="padding: 10px; min-width: 200px;">
              <h4 style="margin: 0 0 5px 0; font-weight: bold;">${location.name}</h4>
              <p style="margin: 0; font-size: 12px; color: #666;">${location.address}</p>
            </div>
          `
        });

        // 마커 호버 시 정보창 표시
        window.naver.maps.Event.addListener(marker, 'mouseover', () => {
          infoWindow.open(map, marker);
        });

        window.naver.maps.Event.addListener(marker, 'mouseout', () => {
          infoWindow.close();
        });

        return marker;
      });

    setMarkers(newMarkers);

    // 마커들이 모두 보이도록 지도 범위 조정
    if (newMarkers.length > 0) {
      const bounds = new window.naver.maps.LatLngBounds();
      newMarkers.forEach(marker => {
        bounds.extend(marker.getPosition());
      });
      map.fitBounds(bounds, { padding: 50 });
    }
  }, [map, locations, onLocationSelect]);

  if (isLoading) {
    return (
      <Card className="w-full" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">네이버 지도를 불러오는 중...</p>
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
            <p className="text-sm mt-2">네이버 지도 API 키를 확인해주세요.</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div 
      ref={mapRef} 
      className="w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
      style={{ height }}
    />
  );
}

export function NaverMapView(props: NaverMapViewProps) {
  return (
    <LocalErrorBoundary name="지도">
      <NaverMapViewInner {...props} />
    </LocalErrorBoundary>
  );
}

// 타입 선언
declare global {
  interface Window {
    naver: any;
  }
}
