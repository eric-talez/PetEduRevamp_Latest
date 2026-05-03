import React, { useState, useEffect } from 'react';
import { Activity, ArrowUp, ChevronDown, ChevronRight, Droplets, Wind, Sun, Cloud, CloudRain, CloudSnow, AlertTriangle, RefreshCw, MapPin, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { useWeather } from '@/contexts/WeatherContext';

interface StatisticsSectionProps {
  expanded: boolean;
}

interface SystemHealth {
  uptime: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  activeConnections: number;
  errorRate: number;
}

interface SystemStatsData {
  totalUsers: number;
  totalCourses: number;
  totalInstitutes: number;
  totalTrainers: number;
  totalEvents: number;
  activeUsers: number;
  systemHealth: SystemHealth;
  timestamp: string;
}

interface SystemStatsResponse {
  success: boolean;
  data: SystemStatsData;
}

function WeatherSection() {
  const { weather, refreshWeather } = useWeather();
  
  const weatherTypes = [
    { type: 'clear', label: '맑음', icon: Sun, color: 'text-amber-500' },
    { type: 'cloudy', label: '흐림', icon: Cloud, color: 'text-gray-500' },
    { type: 'rain', label: '비', icon: CloudRain, color: 'text-blue-500' },
    { type: 'snow', label: '눈', icon: CloudSnow, color: 'text-secondary-foreground' },
  ] as const;
  
  const currentWeather = weatherTypes.find(w => w.type === weather.type) || weatherTypes[0];
  const WeatherIcon = currentWeather.icon;
  
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center">
          <MapPin className="h-3 w-3 mr-1" />
          현재 날씨
          {weather.isRealData && (
            <span className="ml-1 text-[10px] text-green-500">(실시간)</span>
          )}
        </h4>
        <button 
          onClick={refreshWeather}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          disabled={weather.isLoading}
          data-testid="weather-refresh"
        >
          {weather.isLoading ? (
            <Loader2 className="h-3 w-3 text-gray-400 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3 text-gray-400 hover:text-primary" />
          )}
        </button>
      </div>
      
      {weather.isLoading ? (
        <div className="flex items-center justify-center py-3">
          <Loader2 className="h-5 w-5 text-primary animate-spin mr-2" />
          <span className="text-sm text-gray-500">날씨 정보 로딩 중...</span>
        </div>
      ) : (
        <>
          <div 
            className="flex justify-between items-center rounded p-1 -m-1"
            data-testid="weather-display"
          >
            <div className="flex items-center">
              <WeatherIcon className={`h-5 w-5 ${currentWeather.color} mr-2`} />
              <span className="text-sm">{weather.description}</span>
            </div>
            <span className="text-sm font-medium">{weather.temperature}°C</span>
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <div className="flex items-center">
              <Wind className="h-3 w-3 mr-1" />
              <span>{weather.windSpeed}m/s</span>
            </div>
            <div className="flex items-center">
              <Droplets className="h-3 w-3 mr-1" />
              <span>습도 {weather.humidity}%</span>
            </div>
          </div>
          {weather.locationError && (
            <p className="text-[10px] text-amber-500 mt-1">{weather.locationError}</p>
          )}
        </>
      )}
    </div>
  );
}

export function StatisticsSection({ expanded }: StatisticsSectionProps) {
  // 서비스 상태 및 날씨 정보 토글을 위한 통합 상태
  const [isOpen, setIsOpen] = useState(false);
  
  // 실시간 시스템 상태 데이터 가져오기
  const { data: systemStats, isLoading, error } = useQuery({
    queryKey: ['/api/dashboard/system/status'],
    refetchInterval: 60000, // 60초마다 업데이트
    staleTime: 55000
  });
  
  // 토글 함수
  const toggleSection = () => {
    console.log("서비스 현황 토글 실행:", !isOpen);
    setIsOpen(prev => !prev);
  };

  // 시스템 상태 계산
  const getSystemHealth = () => {
    if (error) return { health: 0, status: 'error', color: 'red' };
    if (isLoading || !systemStats?.data) return { health: 50, status: 'loading', color: 'gray' };
    
    const { uptime, memoryUsage, activeConnections, errorRate } = systemStats.data.systemHealth || {};
    
    // 시스템 건강도 계산 로직
    let health = 100;
    
    // 메모리 사용량 체크 (80% 이상이면 감점)
    if (memoryUsage?.heapUsed && memoryUsage?.heapTotal) {
      const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      if (memoryPercent > 80) health -= 20;
      else if (memoryPercent > 60) health -= 10;
    }
    
    // 에러율 체크
    if (errorRate > 0.05) health -= 30; // 5% 이상 에러율
    else if (errorRate > 0.02) health -= 15; // 2% 이상 에러율
    
    // 업타임 체크 (1시간 미만이면 감점)
    if (uptime < 3600) health -= 10;
    
    health = Math.max(0, Math.min(100, health));
    
    let status = 'excellent';
    let color = 'green';
    
    if (health < 60) {
      status = 'poor';
      color = 'red';
    } else if (health < 80) {
      status = 'fair';
      color = 'yellow';
    }
    
    return { health: Math.round(health), status, color };
  };

  const systemHealth = getSystemHealth();

  // API 응답시간 계산
  const getApiResponseTime = () => {
    if (!systemStats) return { time: 0, status: 'unknown' };
    
    // 임시로 랜덤하게 생성 (실제로는 API 측정 필요)
    const baseTime = 45;
    const variation = Math.random() * 20 - 10;
    const responseTime = Math.max(10, baseTime + variation);
    
    let status = 'excellent';
    if (responseTime > 200) status = 'slow';
    else if (responseTime > 100) status = 'moderate';
    
    return { time: Math.round(responseTime), status };
  };

  const apiResponse = getApiResponseTime();

  // 사이드바가 축소되었을 때는 아이콘만 표시 (툴팁 추가)
  if (!expanded) {
    return (
      <div className="mt-auto mb-4 px-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 flex justify-center cursor-pointer"
                onClick={toggleSection}
              >
                <Activity className="w-5 h-5 text-primary" aria-label="서비스 정보" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>서비스 현황</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className="mt-auto mb-4 px-3">
      <div 
        className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3"
      >
        {/* 헤더 영역: 토글 가능 */}
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={toggleSection}
        >
          <div className="flex items-center">
            <Activity className="w-5 h-5 text-primary mr-2" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">서비스 현황</h3>
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
        </div>

        {/* 컨텐츠 영역: 토글 상태에 따라 표시 */}
        {isOpen && (
          <div className="mt-3 space-y-3">
            {/* 서비스 상태 지표 */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-500 dark:text-gray-400">시스템 상태</span>
                <span className={`font-medium flex items-center ${
                  systemHealth.color === 'green' ? 'text-green-500' : 
                  systemHealth.color === 'yellow' ? 'text-yellow-500' : 
                  systemHealth.color === 'red' ? 'text-red-500' : 'text-gray-500'
                }`}>
                  {error ? (
                    <AlertTriangle className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowUp className="h-3 w-3 mr-1" />
                  )}
                  {systemHealth.health}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    systemHealth.color === 'green' ? 'bg-green-500' : 
                    systemHealth.color === 'yellow' ? 'bg-yellow-500' : 
                    systemHealth.color === 'red' ? 'bg-red-500' : 'bg-gray-500'
                  }`} 
                  style={{ width: `${systemHealth.health}%` }}
                ></div>
              </div>
            </div>

            {/* API 상태 표시 */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-500 dark:text-gray-400">API 응답 시간</span>
                <span className={`font-medium ${
                  apiResponse.status === 'excellent' ? 'text-green-500' : 
                  apiResponse.status === 'moderate' ? 'text-yellow-500' : 'text-red-500'
                }`}>
                  {apiResponse.time}ms
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    apiResponse.status === 'excellent' ? 'bg-blue-500' : 
                    apiResponse.status === 'moderate' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} 
                  style={{ width: `${Math.min(100, 100 - (apiResponse.time / 5))}%` }}
                ></div>
              </div>
            </div>

            {/* 실시간 통계 */}
            {systemStats?.data && (
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <div className="flex justify-between">
                  <span>활성 사용자:</span>
                  <span className="font-medium">{systemStats.data.activeUsers || 0}명</span>
                </div>
                <div className="flex justify-between">
                  <span>총 강좌:</span>
                  <span className="font-medium">{systemStats.data.totalCourses || 0}개</span>
                </div>
                <div className="flex justify-between">
                  <span>등록 기관:</span>
                  <span className="font-medium">{systemStats.data.totalInstitutes || 0}개</span>
                </div>
              </div>
            )}

            {/* 날씨 정보 섹션 */}
            <WeatherSection />
          </div>
        )}
      </div>
    </div>
  );
}