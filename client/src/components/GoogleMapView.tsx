import { useEffect, useRef, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { LocalErrorBoundary } from '@/components/ErrorBoundary';
import { Plus, Minus, Maximize2, Minimize2 } from 'lucide-react';
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const hoverInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const clickedInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCustomControls, setShowCustomControls] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onResize = () => setShowCustomControls(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onFsChange = () =>
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleZoomIn = useCallback(() => {
    if (!map) return;
    const z = map.getZoom();
    if (typeof z === 'number') map.setZoom(z + 1);
  }, [map]);

  const handleZoomOut = useCallback(() => {
    if (!map) return;
    const z = map.getZoom();
    if (typeof z === 'number') map.setZoom(z - 1);
  }, [map]);

  const handleToggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  // 구글 맵 인증 오류(워터마크/경고 모달) 감지
  // Google Maps는 인증 실패 시 window.gm_authFailure 전역 콜백을 호출한다.
  // 이 콜백을 미리 등록해 두면 구글이 직접 띄우는 에러 모달을 차단하고
  // 앱 내 에러 UI로 대체할 수 있다.
  useEffect(() => {
    const prev = window.gm_authFailure;
    window.gm_authFailure = () => {
      setError('auth_failure');
      setIsLoading(false);
      if (typeof prev === 'function') prev();
    };
    return () => {
      window.gm_authFailure = prev;
    };
  }, []);

  // 구글 맵 스크립트 로드
  useEffect(() => {
    // 빌드 타임 환경 변수 우선, 런타임 주입(배포 환경) 차선
    const apiKey =
      (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ||
      window.__GOOGLE_MAPS_API_KEY__;

    if (!apiKey) {
      setError('Google Maps API 키가 설정되지 않았습니다. VITE_GOOGLE_MAPS_API_KEY 환경 변수를 확인해주세요.');
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
      setError('Google Maps 스크립트를 불러오는데 실패했습니다. 네트워크 연결이나 API 키 설정을 확인해주세요.');
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
      const isCompact = window.innerWidth < 1024; // 하단 네비가 보이는 구간에서는 컨트롤을 숨겨 겹침 방지
      
      const mapOptions: google.maps.MapOptions = {
        center: { lat: center.lat, lng: center.lng },
        zoom: zoom,
        zoomControl: !isCompact,
        mapTypeControl: !isMobile, // 모바일에서는 지도 타입 컨트롤 숨김
        streetViewControl: !isMobile, // 모바일에서는 스트리트뷰 컨트롤 숨김
        fullscreenControl: !isCompact,
        keyboardShortcuts: !isCompact,
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

    // 기존 마커 + 클러스터 제거
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
    }
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);

    // 호버/클릭 팝업 상태 초기화
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
    if (hoverInfoWindowRef.current) {
      hoverInfoWindowRef.current.close();
      hoverInfoWindowRef.current = null;
    }
    if (clickedInfoWindowRef.current) {
      clickedInfoWindowRef.current.close();
      clickedInfoWindowRef.current = null;
    }

    // 새 마커 생성 (클러스터 대상)
    const clusterMarkers = locations
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
          if (hoverCloseTimerRef.current) {
            clearTimeout(hoverCloseTimerRef.current);
            hoverCloseTimerRef.current = null;
          }
          if (hoverInfoWindowRef.current) {
            hoverInfoWindowRef.current.close();
            hoverInfoWindowRef.current = null;
          }
          if (clickedInfoWindowRef.current && clickedInfoWindowRef.current !== infoWindow) {
            clickedInfoWindowRef.current.close();
          }
          clickedInfoWindowRef.current = infoWindow;
          infoWindow.open(map, marker);
          if (onLocationSelect) {
            onLocationSelect(location);
          }
        });

        // 마커 호버 효과
        marker.addListener('mouseover', () => {
          marker.setAnimation(google.maps.Animation.BOUNCE);
          if (hoverCloseTimerRef.current) {
            clearTimeout(hoverCloseTimerRef.current);
            hoverCloseTimerRef.current = null;
          }
          // 다른 마커의 클릭 팝업이 열려 있으면 닫기
          if (clickedInfoWindowRef.current && clickedInfoWindowRef.current !== infoWindow) {
            clickedInfoWindowRef.current.close();
            clickedInfoWindowRef.current = null;
          }
          // 이미 클릭으로 열린 팝업이면 중복 열기 생략
          if (clickedInfoWindowRef.current === infoWindow) return;
          if (hoverInfoWindowRef.current && hoverInfoWindowRef.current !== infoWindow) {
            hoverInfoWindowRef.current.close();
          }
          hoverInfoWindowRef.current = infoWindow;
          infoWindow.open(map, marker);
        });

        // X 버튼으로 닫을 때 stale ref 초기화
        infoWindow.addListener('closeclick', () => {
          if (clickedInfoWindowRef.current === infoWindow) {
            clickedInfoWindowRef.current = null;
          }
          if (hoverInfoWindowRef.current === infoWindow) {
            hoverInfoWindowRef.current = null;
          }
        });

        marker.addListener('mouseout', () => {
          marker.setAnimation(null);
          if (hoverInfoWindowRef.current === infoWindow) {
            hoverCloseTimerRef.current = setTimeout(() => {
              if (hoverInfoWindowRef.current === infoWindow) {
                infoWindow.close();
                hoverInfoWindowRef.current = null;
              }
              hoverCloseTimerRef.current = null;
            }, 150);
          }
        });

        return marker;
      });

    // 행사·시설 마커 클러스터링 (가까운 마커 묶음)
    const allMarkers: google.maps.Marker[] = [...clusterMarkers];
    if (clusterMarkers.length > 0) {
      clustererRef.current = new MarkerClusterer({
        map,
        markers: clusterMarkers,
        algorithm: new SuperClusterAlgorithm({ radius: 80, maxZoom: 14 }),
      });
    } else {
      clustererRef.current = null;
    }

    // 내 위치 마커 추가 (클러스터 대상 아님)
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

      allMarkers.push(userMarker);
    }

    setMarkers(allMarkers);

    // 마커들이 모두 보이도록 지도 범위 조정
    if (allMarkers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      allMarkers.forEach(marker => {
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
          <div className="text-center text-red-500 px-4">
            <p className="font-semibold text-base">지도를 불러오지 못했습니다</p>
            {error === 'auth_failure' ? (
              <>
                <p className="text-sm mt-2 text-red-600">
                  Google Maps API 인증 오류가 발생했습니다.
                </p>
                <ul className="text-xs mt-3 text-left text-gray-600 space-y-1 list-disc list-inside">
                  <li>Google Cloud Console → Maps JavaScript API 활성화</li>
                  <li>결제(Billing) 계정 연결 확인</li>
                  <li>API 키 HTTP 리퍼러 제한에 현재 도메인 추가</li>
                  <li>Replit Secrets에서 VITE_GOOGLE_MAPS_API_KEY 업데이트</li>
                </ul>
              </>
            ) : (
              <p className="text-sm mt-2 text-red-600">{error}</p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
      style={{
        height,
        minHeight: '300px',
      }}
    >
      <div
        ref={mapRef}
        className="w-full h-full"
        style={{ minHeight: '300px' }}
      />
      {showCustomControls && !isLoading && !error && (
        <div
          className="absolute top-2 left-2 z-10 flex flex-col gap-1.5"
          data-testid="map-custom-controls"
        >
          <div className="flex flex-col rounded-md shadow-md overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleZoomIn}
              aria-label="지도 확대"
              data-testid="button-map-zoom-in"
              className="w-10 h-10 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
            <div className="h-px bg-gray-200 dark:bg-gray-700" />
            <button
              type="button"
              onClick={handleZoomOut}
              aria-label="지도 축소"
              data-testid="button-map-zoom-out"
              className="w-10 h-10 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors"
            >
              <Minus className="w-5 h-5" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleToggleFullscreen}
            aria-label={isFullscreen ? '전체화면 종료' : '전체화면 보기'}
            aria-pressed={isFullscreen}
            data-testid="button-map-fullscreen"
            className="w-10 h-10 flex items-center justify-center rounded-md shadow-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      )}
    </div>
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
    gm_authFailure?: () => void;
    __GOOGLE_MAPS_API_KEY__?: string;
  }
}
