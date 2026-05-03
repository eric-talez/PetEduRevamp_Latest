import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { getCSRFToken } from '@/lib/csrf';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, PawPrint, Brain, Clock, AlertTriangle, CheckCircle, Upload, Image as ImageIcon, TrendingUp, Download, Share2, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { TrendsTab } from './TrendsTab';
import { LocalErrorBoundary } from '@/components/ErrorBoundary';
import { PageSkeleton, FetchingOverlay } from '@/components/ui/SkeletonLoader';

interface CareLog {
  id: number;
  petId: number;
  userId: number;
  date: string;
  note?: string;
  poopStatus?: string;
  mealStatus?: string;
  walkStatus?: string;
  mood?: string;
  energyLevel?: number;
  media?: any[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface AiAnalysis {
  id: number;
  petId: number;
  userId: number;
  resultJson: {
    summary: string;
    behavior?: string;
    health?: string;
    nutrition?: string;
    activity?: string;
    redFlags: string[];
    nextSteps: string[];
    model?: string;
    tokensUsed?: {
      input: number;
      output: number;
    };
  };
  selectedSignals: {
    text: boolean;
    poop: boolean;
    meal: boolean;
    walk: boolean;
    media: boolean;
  };
  timeRange: string;
  model: string;
  createdAt: string;
}

export default function AiAnalysisPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 60일 전
    end: new Date().toISOString().split('T')[0] // 오늘
  });
  const [selectedSignals, setSelectedSignals] = useState({
    text: true,
    poop: true,
    meal: true,
    walk: true,
    media: false
  });
  const [selectedLogIds, setSelectedLogIds] = useState<number[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o-mini");
  
  // 미디어 분석 state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mediaMemo, setMediaMemo] = useState<string>('');
  const [mediaAnalysisResult, setMediaAnalysisResult] = useState<any>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);

  // PDF / 공유 링크 상태
  const [pdfBusyId, setPdfBusyId] = useState<number | null>(null);
  const [shareBusyId, setShareBusyId] = useState<number | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareInfo, setShareInfo] = useState<{ url: string; expiresAt: string; expiresInHours: number } | null>(null);
  const [shareExpiresInHours, setShareExpiresInHours] = useState<number>(24);

  const handleDownloadPdf = async (analysisId: number) => {
    try {
      setPdfBusyId(analysisId);
      const response = await fetch(`/api/ai-analysis/${analysisId}/pdf`, { credentials: 'include' });
      if (!response.ok) {
        let msg = 'PDF 다운로드에 실패했습니다.';
        try { const j = await response.json(); msg = j.error || msg; } catch {}
        throw new Error(msg);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `talez-ai-report-${analysisId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast({ title: 'PDF 다운로드 완료', description: '분석 리포트가 저장되었습니다.' });
    } catch (e: any) {
      toast({ title: '다운로드 실패', description: e?.message || 'PDF 다운로드 중 오류가 발생했습니다.', variant: 'destructive' });
    } finally {
      setPdfBusyId(null);
    }
  };

  const handleCreateShareLink = async (analysisId: number) => {
    try {
      setShareBusyId(analysisId);
      const csrfToken = await getCSRFToken();
      const response = await fetch(`/api/ai-analysis/${analysisId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        credentials: 'include',
        body: JSON.stringify({ expiresInHours: shareExpiresInHours }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) throw new Error(data?.error || '공유 링크 생성 실패');
      setShareInfo({ url: data.shareUrl, expiresAt: data.expiresAt, expiresInHours: data.expiresInHours });
      setShareDialogOpen(true);
    } catch (e: any) {
      toast({ title: '공유 링크 실패', description: e?.message || '공유 링크 생성 중 오류가 발생했습니다.', variant: 'destructive' });
    } finally {
      setShareBusyId(null);
    }
  };

  const copyShareUrl = async () => {
    if (!shareInfo?.url) return;
    try {
      await navigator.clipboard.writeText(shareInfo.url);
      toast({ title: '복사 완료', description: '공유 링크가 클립보드에 복사되었습니다.' });
    } catch {
      toast({ title: '복사 실패', description: '브라우저 권한을 확인해주세요.', variant: 'destructive' });
    }
  };

  // 실제 반려동물 목록 조회
  const petsQuery = useQuery({
    queryKey: ['/api/pets'],
  });
  
  // API 응답이 배열이거나 { pets: [...] } 형식일 수 있음
  const petsData = petsQuery.data as any;
  const pets = Array.isArray(petsData) 
    ? petsData 
    : (petsData?.pets || petsData?.data || []);

  // 알림장 데이터 조회
  const careLogsQuery = useQuery({
    queryKey: ['/api/ai-analysis/care-logs', selectedPetId, dateRange],
    enabled: !!selectedPetId,
    placeholderData: keepPreviousData,
    queryFn: () => {
      const params = new URLSearchParams({
        petId: selectedPetId!.toString(),
        startDate: dateRange.start,
        endDate: dateRange.end
      });
      return fetch(`/api/ai-analysis/care-logs?${params}`)
        .then(res => res.json());
    }
  });

  // AI 분석 기록 조회
  const analysisHistoryQuery = useQuery({
    queryKey: ['/api/ai-analysis/history', selectedPetId],
    enabled: !!selectedPetId,
    placeholderData: keepPreviousData,
    queryFn: () => {
      const params = new URLSearchParams({
        petId: selectedPetId!.toString()
      });
      return fetch(`/api/ai-analysis/history?${params}`)
        .then(res => res.json());
    }
  });

  // AI 분석 실행
  const analyzeDataMutation = useMutation({
    mutationFn: async (data: {
      petId: number;
      logIds: number[];
      selectedSignals: any;
      dateRange: string;
      model: string;
    }) => {
      const csrfToken = await getCSRFToken();
      const response = await fetch('/api/ai-analysis/analyze', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('AI 분석 요청 실패');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "분석 완료",
        description: "AI 분석이 성공적으로 완료되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-analysis/history'] });
      setSelectedLogIds([]);
    },
    onError: (error: any) => {
      toast({
        title: "분석 실패",
        description: error?.message || "AI 분석 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  // 미디어 분석 실행
  const analyzeMediaMutation = useMutation({
    mutationFn: async (data: {
      petId: number;
      imageBase64: string;
      model: string;
      memo?: string;
    }) => {
      const csrfToken = await getCSRFToken();
      const response = await fetch('/api/ai/analyze-media', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
      });
      const result = await response.json();
      if (!response.ok && response.status !== 503) {
        throw new Error(result.message || '미디어 분석 요청 실패');
      }
      return result;
    },
    onSuccess: (data) => {
      setMediaAnalysisResult(data);
      setShowResultDialog(true);
      toast({
        title: "미디어 분석 완료",
        description: "AI 미디어 분석이 성공적으로 완료되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "분석 실패",
        description: error?.message || "AI 미디어 분석 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  // 이미지 업로드 핸들러 (압축 포함)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "파일 크기 초과",
        description: "이미지 파일은 10MB 이하만 업로드 가능합니다.",
        variant: "destructive",
      });
      return;
    }

    setMediaAnalysisResult(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        const maxDimension = 1024;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        setUploadedImage(compressedBase64);
        setImagePreview(compressedBase64);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // 미디어 분석 실행 핸들러
  const handleMediaAnalyze = () => {
    if (!selectedPetId) {
      toast({
        title: "반려동물을 선택해주세요",
        description: "분석할 반려동물을 먼저 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!uploadedImage) {
      toast({
        title: "이미지를 업로드해주세요",
        description: "분석할 이미지를 먼저 업로드해주세요.",
        variant: "destructive",
      });
      return;
    }

    analyzeMediaMutation.mutate({
      petId: selectedPetId,
      imageBase64: uploadedImage,
      model: selectedModel,
      memo: mediaMemo
    });
  };

  // 신호 선택 핸들러
  const handleSignalChange = (signal: string, checked: boolean) => {
    setSelectedSignals(prev => ({
      ...prev,
      [signal]: checked
    }));
  };

  // 로그 선택 핸들러
  const handleLogSelection = (logId: number, checked: boolean) => {
    if (checked) {
      setSelectedLogIds(prev => [...prev, logId]);
    } else {
      setSelectedLogIds(prev => prev.filter(id => id !== logId));
    }
  };

  // 분석 실행 핸들러
  const handleAnalyze = () => {
    if (!selectedPetId) {
      toast({
        title: "반려동물을 선택해주세요",
        description: "분석할 반려동물을 먼저 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (selectedLogIds.length === 0) {
      toast({
        title: "알림장을 선택해주세요",
        description: "분석할 알림장을 하나 이상 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    analyzeDataMutation.mutate({
      petId: selectedPetId,
      logIds: selectedLogIds,
      selectedSignals,
      dateRange: `${dateRange.start} to ${dateRange.end}`,
      model: selectedModel
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'good': 
      case 'normal': 
      case 'completed':
        return 'bg-success/10 text-success';
      case 'warning': 
      case 'irregular':
        return 'bg-warning/10 text-warning';
      case 'bad': 
      case 'skipped':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const careLogsData = careLogsQuery.data;
  const analysisHistoryData = analysisHistoryQuery.data;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* 헤더 */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
          <Brain className="w-8 h-8 text-primary" />
          AI 분석 시스템
        </h1>
        <p className="text-gray-600">
          반려동물의 알림장 데이터를 AI로 분석하여 건강 상태와 행동 패턴을 파악합니다
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 좌측: 분석 설정 */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PawPrint className="w-5 h-5" />
                분석 설정
              </CardTitle>
              <CardDescription>
                분석할 반려동물과 기간, 항목을 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 반려동물 선택 */}
              <div>
                <label className="text-sm font-medium mb-2 block">반려동물 선택</label>
                <Select 
                  value={selectedPetId?.toString() || ""} 
                  onValueChange={(value) => setSelectedPetId(parseInt(value))}
                >
                  <SelectTrigger data-testid="select-pet">
                    <SelectValue placeholder="반려동물을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {pets.map(pet => (
                      <SelectItem key={pet.id} value={pet.id.toString()}>
                        {pet.name} ({pet.breed})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 기간 선택 */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">시작일</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    data-testid="input-start-date"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">종료일</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    data-testid="input-end-date"
                  />
                </div>
              </div>

              {/* AI 모델 선택 */}
              <div>
                <label className="text-sm font-medium mb-2 block">AI 모델 선택</label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger data-testid="select-model">
                    <SelectValue placeholder="AI 모델을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">ChatGPT 4o</SelectItem>
                    <SelectItem value="gpt-4o-mini">ChatGPT 4o Mini</SelectItem>
                    <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
                    <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</SelectItem>
                    <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash (무료)</SelectItem>
                    <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 분석 항목 선택 */}
              <div>
                <label className="text-sm font-medium mb-2 block">분석할 항목</label>
                <div className="space-y-2">
                  {[
                    { key: 'text', label: '텍스트 메모', icon: '📝' },
                    { key: 'poop', label: '배변 상태', icon: '💩' },
                    { key: 'meal', label: '식사 상태', icon: '🍽️' },
                    { key: 'walk', label: '산책 상태', icon: '🚶' },
                    { key: 'media', label: '미디어 자료', icon: '📸' }
                  ].map(item => (
                    <div key={item.key} className="flex items-center space-x-2">
                      <Checkbox 
                        id={item.key}
                        checked={selectedSignals[item.key as keyof typeof selectedSignals]}
                        onCheckedChange={(checked) => handleSignalChange(item.key, checked as boolean)}
                        data-testid={`checkbox-${item.key}`}
                      />
                      <label htmlFor={item.key} className="text-sm cursor-pointer">
                        {item.icon} {item.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* 분석 실행 버튼 */}
              <Button 
                onClick={handleAnalyze}
                disabled={analyzeDataMutation.isPending || !selectedPetId || selectedLogIds.length === 0}
                className="w-full"
                data-testid="button-analyze"
              >
                {analyzeDataMutation.isPending ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    {selectedModel.startsWith('claude') ? 'Claude' : 'ChatGPT'} 분석 중...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    {selectedModel.startsWith('claude') ? 'Claude' : 'ChatGPT'}로 AI 분석 실행
                  </>
                )}
              </Button>
              
              {/* 분석 정보 */}
              {analyzeDataMutation.isPending && (
                <div className="text-sm text-muted-foreground text-center p-2 bg-primary/10 rounded-md">
                  <p>선택된 {selectedLogIds.length}개의 알림장을 {selectedModel.startsWith('claude') ? 'Claude' : 'ChatGPT'}로 분석 중입니다...</p>
                  <p>잠시만 기다려주세요.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 우측: 알림장 목록 */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                알림장 목록
              </CardTitle>
              <CardDescription className="flex items-center justify-between">
                <span>{selectedPetId ? `${pets.find(p => p.id === selectedPetId)?.name}의 알림장` : '반려동물을 선택해주세요'}</span>
                {selectedPetId && careLogsData?.dates?.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const allLogIds: number[] = [];
                        careLogsData.dates.forEach((date: string) => {
                          careLogsData.logsByDate[date]?.forEach((log: CareLog) => {
                            allLogIds.push(log.id);
                          });
                        });
                        setSelectedLogIds(allLogIds);
                      }}
                      disabled={analyzeDataMutation.isPending}
                      data-testid="button-select-all"
                    >
                      모두 선택
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedLogIds([])}
                      disabled={analyzeDataMutation.isPending || selectedLogIds.length === 0}
                      data-testid="button-deselect-all"
                    >
                      선택 해제
                    </Button>
                  </div>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedPetId ? (
                <div className="text-center py-8 text-gray-500">
                  <PawPrint className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>반려동물을 선택하면 알림장 목록이 표시됩니다</p>
                </div>
              ) : careLogsQuery.isLoading ? (
                <div className="text-center py-8">
                  <Clock className="w-6 h-6 mx-auto mb-2 animate-spin" />
                  <p>알림장을 불러오는 중...</p>
                </div>
              ) : careLogsData?.dates?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>선택한 기간에 알림장이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {careLogsData?.dates?.map((date: string) => (
                    <div key={date} className="border rounded-lg p-3">
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(date), 'M월 d일 (E)', { locale: ko })}
                        <Badge variant="outline" className="ml-auto">
                          {careLogsData.counts[date]}개
                        </Badge>
                      </h4>
                      <div className="space-y-2">
                        {careLogsData.logsByDate[date]?.map((log: CareLog) => (
                          <div key={log.id} className="border rounded p-3 space-y-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                checked={selectedLogIds.includes(log.id)}
                                onCheckedChange={(checked) => handleLogSelection(log.id, checked as boolean)}
                                disabled={analyzeDataMutation.isPending}
                                data-testid={`checkbox-log-${log.id}`}
                              />
                              <span className="text-sm font-medium">알림장 #{log.id}</span>
                            </div>
                            
                            {log.note && (
                              <p className="text-sm text-gray-700 ml-6">📝 {log.note}</p>
                            )}
                            
                            <div className="ml-6 flex flex-wrap gap-2">
                              {log.poopStatus && (
                                <Badge className={getStatusBadgeColor(log.poopStatus)}>
                                  💩 {log.poopStatus}
                                </Badge>
                              )}
                              {log.mealStatus && (
                                <Badge className={getStatusBadgeColor(log.mealStatus)}>
                                  🍽️ {log.mealStatus}
                                </Badge>
                              )}
                              {log.walkStatus && (
                                <Badge className={getStatusBadgeColor(log.walkStatus)}>
                                  🚶 {log.walkStatus}
                                </Badge>
                              )}
                              {log.mood && (
                                <Badge variant="outline">
                                  😊 {log.mood}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 분석 결과 섹션 */}
      <Tabs defaultValue="results" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="results" data-testid="tab-results">최신 분석 결과</TabsTrigger>
          <TabsTrigger value="media" data-testid="tab-media">미디어 분석</TabsTrigger>
          <TabsTrigger value="trends" data-testid="tab-trends">
            <TrendingUp className="w-4 h-4 mr-1" />
            이력 추이
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">분석 기록</TabsTrigger>
        </TabsList>

        {/* 이력 추이/비교 탭 */}
        <TabsContent value="trends" className="space-y-4">
          <LocalErrorBoundary name="추이 분석">
            <TrendsTab
              petId={selectedPetId}
              petName={pets.find((p: any) => p.id === selectedPetId)?.name}
              analyses={(analysisHistoryData as any)?.analyses || []}
            />
          </LocalErrorBoundary>
        </TabsContent>

        {/* 최신 분석 결과 탭 */}
        <TabsContent value="results" className="space-y-4">
          <LocalErrorBoundary name="분석 결과">
          {analyzeDataMutation.isSuccess && analyzeDataMutation.data ? (
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-success" />
                      최신 분석 결과
                    </CardTitle>
                    <CardDescription>
                      방금 완료된 AI 분석 결과입니다 ({
                        selectedModel.startsWith('claude') ? 'Claude' : 
                        selectedModel.startsWith('gemini') ? 'Gemini' : 'ChatGPT'
                      } {selectedModel})
                    </CardDescription>
                  </div>
                  {(() => {
                    const latestId = (analyzeDataMutation.data as any)?.analysis?.id;
                    if (!latestId) return null;
                    return (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadPdf(latestId)}
                          disabled={pdfBusyId === latestId}
                          data-testid="button-download-pdf-latest"
                        >
                          {pdfBusyId === latestId ? (
                            <><Clock className="w-4 h-4 mr-1 animate-spin" />생성 중...</>
                          ) : (
                            <><Download className="w-4 h-4 mr-1" />PDF 다운로드</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCreateShareLink(latestId)}
                          disabled={shareBusyId === latestId}
                          data-testid="button-share-pdf-latest"
                        >
                          {shareBusyId === latestId ? (
                            <><Clock className="w-4 h-4 mr-1 animate-spin" />발급 중...</>
                          ) : (
                            <><Share2 className="w-4 h-4 mr-1" />공유 링크</>
                          )}
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">📊 종합 분석</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                    {(analyzeDataMutation.data as any)?.analysis?.resultJson?.summary || '분석 결과가 없습니다.'}
                  </p>
                </div>

                {(analyzeDataMutation.data as any)?.analysis?.resultJson?.behavior && (
                  <div>
                    <h4 className="font-medium mb-2">🐕 행동 패턴</h4>
                    <p className="text-sm text-gray-700 bg-primary/10 p-3 rounded">
                      {(analyzeDataMutation.data as any).analysis.resultJson.behavior}
                    </p>
                  </div>
                )}

                {(analyzeDataMutation.data as any)?.analysis?.resultJson?.health && (
                  <div>
                    <h4 className="font-medium mb-2">💊 건강 상태</h4>
                    <p className="text-sm text-gray-700 bg-success/10 p-3 rounded">
                      {(analyzeDataMutation.data as any).analysis.resultJson.health}
                    </p>
                  </div>
                )}

                {(analyzeDataMutation.data as any)?.analysis?.resultJson?.nutrition && (
                  <div>
                    <h4 className="font-medium mb-2">🍽️ 영양 상태</h4>
                    <p className="text-sm text-gray-700 bg-warning/10 p-3 rounded">
                      {(analyzeDataMutation.data as any).analysis.resultJson.nutrition}
                    </p>
                  </div>
                )}

                {(analyzeDataMutation.data as any)?.analysis?.resultJson?.activity && (
                  <div>
                    <h4 className="font-medium mb-2">🏃 활동 상태</h4>
                    <p className="text-sm text-gray-700 bg-primary/5 p-3 rounded">
                      {(analyzeDataMutation.data as any).analysis.resultJson.activity}
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    주의사항
                  </h4>
                  <div className="space-y-2">
                    {((analyzeDataMutation.data as any)?.analysis?.resultJson?.redFlags || []).map((flag: string, index: number) => (
                      <div key={index} className="text-sm bg-warning/10 border-l-4 border-warning/40 p-3">
                        {flag}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">✅ 권장사항</h4>
                  <div className="space-y-2">
                    {((analyzeDataMutation.data as any)?.analysis?.resultJson?.nextSteps || []).map((step: string, index: number) => (
                      <div key={index} className="text-sm bg-primary/10 border-l-4 border-primary/40 p-3">
                        {step}
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI 오류 표시 */}
                {(analyzeDataMutation.data as any)?.analysis?.resultJson?.error && (
                  <div className="mt-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <h4 className="font-medium text-destructive mb-2">⚠️ 참고사항</h4>
                    <p className="text-sm text-destructive">
                      AI API 할당량 초과로 임시 분석을 제공하고 있습니다. 실제 AI 분석을 위해서는 API 키 설정이 필요합니다.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8 text-gray-500">
                <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>AI 분석을 실행하면 결과가 여기에 표시됩니다</p>
                <p className="text-sm">반려동물과 알림장을 선택한 후 분석 버튼을 클릭하세요</p>
              </CardContent>
            </Card>
          )}
          </LocalErrorBoundary>
        </TabsContent>

        {/* 미디어 분석 탭 */}
        <TabsContent value="media" className="space-y-4">
          <LocalErrorBoundary name="미디어 분석">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-primary dark:text-primary-foreground" />
                미디어 업로드 및 분석
              </CardTitle>
              <CardDescription>
                반려동물의 이미지나 동영상을 업로드하여 AI가 자세, 행동, 건강 상태를 분석합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 반려동물 선택 */}
              <div>
                <label className="text-sm font-medium mb-2 block">반려동물 선택</label>
                <Select 
                  value={selectedPetId?.toString() || ""} 
                  onValueChange={(value) => setSelectedPetId(parseInt(value))}
                >
                  <SelectTrigger data-testid="select-pet-media">
                    <SelectValue placeholder="반려동물을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {pets.map(pet => (
                      <SelectItem key={pet.id} value={pet.id.toString()}>
                        {pet.name} ({pet.breed})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* AI 모델 선택 */}
              <div>
                <label className="text-sm font-medium mb-2 block">AI 모델 선택</label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger data-testid="select-model-media">
                    <SelectValue placeholder="AI 모델을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-mini">ChatGPT 4o Mini (저렴, 추천) ⭐</SelectItem>
                    <SelectItem value="gpt-4o">ChatGPT 4o (고성능, 고비용)</SelectItem>
                    <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash (빠름, 저렴)</SelectItem>
                    <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro (고성능)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 이미지 업로드 영역 */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <span className="text-primary dark:text-primary-foreground hover:underline">
                      이미지 선택
                    </span>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      data-testid="input-image-upload"
                    />
                  </label>
                  <p className="text-sm text-gray-500 mt-2">
                    JPG, PNG, GIF 형식 지원 (최대 10MB)
                  </p>
                </div>

                {/* 이미지 미리보기 */}
                {imagePreview && (
                  <div className="mt-4">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-w-full h-auto rounded-lg mx-auto"
                      style={{ maxHeight: '400px' }}
                    />
                    <div className="mt-4 space-y-2">
                      <label className="block text-sm font-medium">
                        메모 (선택사항)
                      </label>
                      <textarea
                        value={mediaMemo}
                        onChange={(e) => setMediaMemo(e.target.value)}
                        placeholder="이미지에 대한 추가 설명을 입력하세요..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        rows={3}
                        data-testid="textarea-media-memo"
                      />
                    </div>
                    <Button
                      onClick={handleMediaAnalyze}
                      disabled={!selectedPetId || analyzeMediaMutation.isPending}
                      className="w-full mt-4"
                      data-testid="button-analyze-media"
                    >
                      {analyzeMediaMutation.isPending ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          분석 중...
                        </>
                      ) : (
                        <>
                          <Brain className="w-4 h-4 mr-2" />
                          AI 분석 실행
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
          </LocalErrorBoundary>
        </TabsContent>

        {/* 분석 기록 탭 */}
        <TabsContent value="history" className="space-y-4">
          {!selectedPetId ? (
            <Card>
              <CardContent className="text-center py-8 text-gray-500">
                <PawPrint className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>반려동물을 선택하면 분석 기록을 볼 수 있습니다</p>
              </CardContent>
            </Card>
          ) : analysisHistoryQuery.isLoading ? (
            <PageSkeleton header={false} variant="list" count={4} className="p-0" />
          ) : analysisHistoryData?.analyses?.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-gray-500">
                <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>아직 분석 기록이 없습니다</p>
                <p className="text-sm">첫 번째 AI 분석을 실행해보세요</p>
              </CardContent>
            </Card>
          ) : (
            <FetchingOverlay isFetching={analysisHistoryQuery.isFetching && !analysisHistoryQuery.isLoading} className="space-y-4">
              {analysisHistoryData?.analyses?.map((analysis: AiAnalysis) => (
                <div key={analysis.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start gap-3 flex-wrap">
                    <div>
                      <h4 className="font-medium">분석 #{analysis.id}</h4>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(analysis.createdAt), 'M월 d일 HH:mm', { locale: ko })} | 
                        모델: {
                          analysis.model.startsWith('claude') ? 'Claude' : 
                          analysis.model.startsWith('gemini') ? 'Gemini' : 'ChatGPT'
                        } ({analysis.model})
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{analysis.timeRange}</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadPdf(analysis.id)}
                        disabled={pdfBusyId === analysis.id}
                        data-testid={`button-download-pdf-${analysis.id}`}
                      >
                        {pdfBusyId === analysis.id ? (
                          <><Clock className="w-3 h-3 mr-1 animate-spin" />생성 중</>
                        ) : (
                          <><Download className="w-3 h-3 mr-1" />PDF</>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreateShareLink(analysis.id)}
                        disabled={shareBusyId === analysis.id}
                        data-testid={`button-share-pdf-${analysis.id}`}
                      >
                        {shareBusyId === analysis.id ? (
                          <><Clock className="w-3 h-3 mr-1 animate-spin" />발급 중</>
                        ) : (
                          <><Share2 className="w-3 h-3 mr-1" />공유</>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-sm mb-1">📊 종합 분석</h5>
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      {analysis.resultJson.summary}
                    </p>
                  </div>

                  {analysis.resultJson.redFlags?.length > 0 && (
                    <div>
                      <h5 className="font-medium text-sm mb-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-warning" />
                        주의사항
                      </h5>
                      <div className="space-y-1">
                        {analysis.resultJson.redFlags.map((flag: string, index: number) => (
                          <div key={index} className="text-xs bg-warning/10 border-l-2 border-warning/40 p-2">
                            {flag}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </FetchingOverlay>
          )}
        </TabsContent>
      </Tabs>

      {/* 공유 링크 다이얼로그 */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              공유 링크 생성됨
            </DialogTitle>
            <DialogDescription>
              아래 링크를 통해 PDF 리포트를 공유할 수 있습니다. 만료 후에는 더 이상 접근할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          {shareInfo && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">공유 URL</label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={shareInfo.url}
                    className="flex-1 px-3 py-2 border rounded-md text-sm bg-gray-50"
                    data-testid="input-share-url"
                  />
                  <Button size="sm" variant="outline" onClick={copyShareUrl} data-testid="button-copy-share-url">
                    <Copy className="w-4 h-4 mr-1" />복사
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                만료: {format(new Date(shareInfo.expiresAt), 'yyyy년 M월 d일 HH:mm', { locale: ko })} (약 {shareInfo.expiresInHours}시간)
              </p>
              <div className="border-t pt-3">
                <label className="text-sm font-medium mb-1 block">만료 시간 (다음 발급 시 적용)</label>
                <Select value={shareExpiresInHours.toString()} onValueChange={(v) => setShareExpiresInHours(parseInt(v, 10))}>
                  <SelectTrigger data-testid="select-share-expiry">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1시간</SelectItem>
                    <SelectItem value="6">6시간</SelectItem>
                    <SelectItem value="24">24시간 (1일)</SelectItem>
                    <SelectItem value="72">3일</SelectItem>
                    <SelectItem value="168">7일</SelectItem>
                    <SelectItem value="720">30일</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 미디어 분석 결과 팝업 */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary dark:text-primary-foreground" />
              AI 미디어 분석 결과
            </DialogTitle>
            <DialogDescription>
              {selectedPetId && `${pets.find(p => p.id === selectedPetId)?.name}의 이미지 분석 결과입니다`}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh] pr-4">
            {mediaAnalysisResult ? (
              <div className="space-y-4">
                {/* 종합 분석 */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">📊 종합 분석</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {mediaAnalysisResult?.analysis?.summary || '분석 결과가 없습니다.'}
                  </p>
                </div>

                {/* 자세 분석 */}
                {mediaAnalysisResult?.analysis?.posture && (
                  <div className="bg-primary/10 dark:bg-primary/20 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">🐕 자세 분석</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">점수:</span>
                        <Badge className="bg-primary dark:bg-primary/80">
                          {mediaAnalysisResult.analysis.posture.score}/100
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {mediaAnalysisResult.analysis.posture.notes}
                      </p>
                      {mediaAnalysisResult.analysis.posture.keyFindings?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium mb-1">주요 발견사항:</p>
                          <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
                            {mediaAnalysisResult.analysis.posture.keyFindings.map((finding: string, idx: number) => (
                              <li key={idx}>{finding}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 행동 분석 */}
                {mediaAnalysisResult?.analysis?.behavior && (
                  <div className="bg-primary/5 dark:bg-primary/20 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">🎯 행동 분석</h4>
                    <div className="space-y-2 text-sm">
                      {mediaAnalysisResult.analysis.behavior.observed?.length > 0 && (
                        <div>
                          <p className="font-medium">관찰된 행동:</p>
                          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
                            {mediaAnalysisResult.analysis.behavior.observed.map((obs: string, idx: number) => (
                              <li key={idx}>{obs}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {mediaAnalysisResult.analysis.behavior.positive?.length > 0 && (
                        <div>
                          <p className="font-medium text-success dark:text-success">긍정적 행동:</p>
                          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
                            {mediaAnalysisResult.analysis.behavior.positive.map((pos: string, idx: number) => (
                              <li key={idx}>{pos}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {mediaAnalysisResult.analysis.behavior.concerns?.length > 0 && (
                        <div>
                          <p className="font-medium text-warning dark:text-warning">우려사항:</p>
                          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
                            {mediaAnalysisResult.analysis.behavior.concerns.map((concern: string, idx: number) => (
                              <li key={idx}>{concern}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 건강 상태 */}
                {mediaAnalysisResult?.analysis?.health && (
                  <div className="bg-success/10 dark:bg-success/20 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">💊 건강 상태</h4>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-700 dark:text-gray-300">
                        {mediaAnalysisResult.analysis.health.status}
                      </p>
                      {mediaAnalysisResult.analysis.health.warnings?.length > 0 && (
                        <div>
                          <p className="font-medium text-destructive dark:text-destructive">경고:</p>
                          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
                            {mediaAnalysisResult.analysis.health.warnings.map((warning: string, idx: number) => (
                              <li key={idx}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {mediaAnalysisResult.analysis.health.recommendations?.length > 0 && (
                        <div>
                          <p className="font-medium">권장사항:</p>
                          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
                            {mediaAnalysisResult.analysis.health.recommendations.map((rec: string, idx: number) => (
                              <li key={idx}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 문제점 및 해결방안 */}
                {mediaAnalysisResult?.analysis?.issues?.length > 0 && (
                  <div className="bg-warning/10 dark:bg-warning/20 p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      발견된 문제점
                    </h4>
                    <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
                      {mediaAnalysisResult.analysis.issues.map((issue: string, idx: number) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {mediaAnalysisResult?.analysis?.solutions?.length > 0 && (
                  <div className="bg-primary/10 dark:bg-primary/20 p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      해결방안
                    </h4>
                    <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
                      {mediaAnalysisResult.analysis.solutions.map((solution: string, idx: number) => (
                        <li key={idx}>{solution}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}