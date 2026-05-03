import { useState, useEffect, useMemo } from "react";
import { Dog, ExternalLink, Maximize, Minimize, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

interface SSOTokenResponse {
  success: boolean;
  token: string;
  expiresIn: number;
}

export default function DogAnalysisPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);

  const { data: ssoData, isLoading: isTokenLoading, refetch: refetchToken } = useQuery<SSOTokenResponse>({
    queryKey: ['/api/sso/token'],
    staleTime: 1000 * 60 * 50,
    refetchInterval: 1000 * 60 * 50,
  });

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const iframeSrc = useMemo(() => {
    const baseUrl = 'https://talezaitool.com';
    if (!ssoData?.token) return baseUrl;
    
    const params = new URLSearchParams();
    params.append('sso_token', ssoData.token);
    params.append('platform', 'talez');
    
    return `${baseUrl}?${params.toString()}`;
  }, [ssoData?.token]);

  const toggleFullscreen = async () => {
    try {
      const container = document.getElementById('dog-ai-container');
      if (!isFullscreen) {
        if (container?.requestFullscreen) {
          await container.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await refetchToken();
    setIframeKey(prev => prev + 1);
  };

  const handleOpenNewTab = () => {
    window.open(iframeSrc, '_blank');
  };

  if (isTokenLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-success mx-auto mb-4" />
          <p className="text-gray-600">SSO 인증 준비 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="dog-ai-container" className="min-h-screen bg-gradient-to-b from-primary to-white flex flex-col">
      <div className="bg-white border-b shadow-sm px-4 py-3">
        <div className="container mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Dog className="w-8 h-8 text-success" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">강아지 AI 분석</h1>
              <p className="text-xs text-gray-500">
                TALEZ AI Tool - 고급 행동 분석 시스템
                {ssoData?.token && <span className="ml-2 text-success">(SSO 연동됨)</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} title="새로고침">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={toggleFullscreen} title={isFullscreen ? "전체화면 종료" : "전체화면"}>
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpenNewTab} title="새 탭에서 열기">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-success/50 mx-auto mb-4"></div>
              <p className="text-gray-600">TALEZ AI Tool 로딩 중...</p>
            </div>
          </div>
        )}
        <iframe
          key={iframeKey}
          src={iframeSrc}
          className="w-full h-full border-0"
          style={{ minHeight: 'calc(100vh - 80px)' }}
          onLoad={() => setIsLoading(false)}
          allow="camera; microphone; fullscreen; autoplay"
          title="TALEZ AI Tool"
        />
      </div>
    </div>
  );
}
