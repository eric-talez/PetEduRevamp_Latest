import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-compat';
import { useAuth as useAuthContext } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  Video, 
  Plus, 
  Monitor, 
  UserPlus,
  Copy,
  Share2,
  Radio,
  Play,
  Eye,
  StopCircle,
  ExternalLink,
  X,
  Maximize2,
  Trash2
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import VideoClassBannerImage from '@assets/stock_images/virtual_online_pet_d_cb89d2cb.jpg';
import { PageBanner } from '@/components/PageBanner';
import { LiveStreamViewer } from '@/components/streaming/LiveStreamViewer';
import { StreamSession } from '@/components/streaming/StreamSession';
import { LocalErrorBoundary } from '@/components/ErrorBoundary';

interface Meeting {
  id: string;
  topic: string;
  start_time: string;
  duration: number;
  join_url: string;
  password: string;
  host_key: string;
}

interface LiveStream {
  id: number;
  hostId: number;
  title: string;
  description: string | null;
  category: string | null;
  meetingUrl: string | null;
  meetingCode: string | null;
  thumbnailUrl: string | null;
  status: string;
  isPublic: boolean | null;
  currentViewers: number | null;
  scheduledStartTime: string | null;
  actualStartTime: string | null;
  createdAt: string | null;
  hostName: string | null;
  hostAvatar: string | null;
}

export default function VideoCallPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading, userName } = useAuth();
  const { user } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('live');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [meetingData, setMeetingData] = useState({
    topic: '',
    date: new Date(),
    time: format(new Date(), 'HH:mm'),
    duration: 30,
    agenda: ''
  });
  const [meetingId, setMeetingId] = useState('');
  const [videoClasses, setVideoClasses] = useState<Array<{
    id: string;
    title: string;
    description: string;
    trainerId: number;
    trainerName: string;
    trainerImage: string;
    scheduledTime: string;
    duration: number;
    maxStudents: number;
    currentStudents: number;
    price: number;
    category: string;
    difficulty: string;
    meetingUrl?: string;
    zoomPMI?: string;
    zoomPMIPassword?: string;
    zoomHostKey?: string;
    meetingSetupType: string;
    status: string;
  }>>([]);
  
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [isLoadingStreams, setIsLoadingStreams] = useState(false);
  const [isCreatingStream, setIsCreatingStream] = useState(false);
  const [watchingStream, setWatchingStream] = useState<LiveStream | null>(null);
  const [hostingStream, setHostingStream] = useState<LiveStream | null>(null);
  const [streamFormData, setStreamFormData] = useState({
    title: '',
    description: '',
    category: 'training',
    scheduledStartTime: new Date(),
    scheduledTime: format(new Date(), 'HH:mm'),
    isPublic: true,
    maxViewers: 100,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "로그인 필요",
        description: "화상 통화 기능을 사용하려면 로그인이 필요합니다.",
        variant: "destructive"
      });
      setLocation('/auth/login');
    } else if (isAuthenticated) {
      // 현재 사용자 ID 가져오기
      const fetchCurrentUser = async () => {
        try {
          const response = await fetch('/api/auth/me', { credentials: 'include' });
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data?.id) {
              setCurrentUserId(data.data.id);
              console.log('[VideoCall] Current user ID loaded:', data.data.id);
            }
          }
        } catch (error) {
          console.error('[VideoCall] Error fetching current user:', error);
        }
      };
      fetchCurrentUser();
      
      // 미팅 목록 가져오기
      fetchMeetings();
      // 화상수업 목록 가져오기
      fetchVideoClasses();
      // 라이브 스트리밍 목록 가져오기
      fetchLiveStreams();
    }
  }, [isLoading, isAuthenticated, setLocation, toast]);

  // 라이브 탭에서 실시간 업데이트를 위한 폴링 (10초마다)
  useEffect(() => {
    if (activeTab === 'live' && isAuthenticated) {
      const intervalId = setInterval(() => {
        fetchLiveStreams();
      }, 10000); // 10초마다 새로고침
      
      return () => clearInterval(intervalId);
    }
  }, [activeTab, isAuthenticated]);

  const fetchLiveStreams = async () => {
    try {
      setIsLoadingStreams(true);
      const response = await fetch('/api/live-streaming/streams', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data?.streams) {
        setLiveStreams(data.data.streams);
      }
    } catch (error) {
      console.error('Error fetching live streams:', error);
    } finally {
      setIsLoadingStreams(false);
    }
  };

  const createLiveStream = async () => {
    try {
      setIsCreatingStream(true);
      
      const [hours, minutes] = streamFormData.scheduledTime.split(':').map(Number);
      const scheduledStartTime = new Date(streamFormData.scheduledStartTime);
      scheduledStartTime.setHours(hours, minutes, 0, 0);

      const response = await apiRequest('POST', '/api/live-streaming/streams', {
        title: streamFormData.title,
        description: streamFormData.description,
        category: streamFormData.category,
        scheduledStartTime: scheduledStartTime.toISOString(),
        isPublic: streamFormData.isPublic,
        maxViewers: streamFormData.maxViewers,
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "라이브 스트리밍 생성 완료",
          description: `"${streamFormData.title}" 라이브 스트리밍이 생성되었습니다.`,
        });
        
        setStreamFormData({
          title: '',
          description: '',
          category: 'training',
          scheduledStartTime: new Date(),
          scheduledTime: format(new Date(), 'HH:mm'),
          isPublic: true,
          maxViewers: 100,
        });
        
        fetchLiveStreams();
        setActiveTab('live');
      } else {
        throw new Error(data.message || '라이브 스트리밍 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error creating live stream:', error);
      toast({
        title: "라이브 스트리밍 생성 실패",
        description: error instanceof Error ? error.message : "라이브 스트리밍 생성 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingStream(false);
    }
  };

  const startLiveStream = async (streamId: number) => {
    try {
      const response = await apiRequest('PATCH', `/api/live-streaming/streams/${streamId}/start`, {});
      const data = await response.json();
      
      if (data.success) {
        const stream = liveStreams.find(s => s.id === streamId);
        if (stream) {
          setHostingStream({ ...stream, status: 'live' });
        }
        toast({
          title: "라이브 시작",
          description: "WebRTC 스트리밍이 시작됩니다. 카메라와 마이크 권한을 허용해주세요.",
        });
        fetchLiveStreams();
      }
    } catch (error) {
      toast({
        title: "라이브 시작 실패",
        description: "라이브 시작 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const endLiveStream = async (streamId: number) => {
    try {
      const response = await apiRequest('PATCH', `/api/live-streaming/streams/${streamId}/end`, {});
      const data = await response.json();
      
      if (data.success) {
        setHostingStream(null);
        toast({
          title: "라이브 종료",
          description: "라이브 스트리밍이 종료되었습니다.",
        });
        fetchLiveStreams();
      }
    } catch (error) {
      toast({
        title: "라이브 종료 실패",
        description: "라이브 종료 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };
  
  const exitHosting = async () => {
    if (hostingStream) {
      await endLiveStream(hostingStream.id);
    }
    setHostingStream(null);
  };

  const joinLiveStream = async (stream: LiveStream) => {
    try {
      console.log('[joinLiveStream] Attempting to join stream:', {
        streamId: stream.id,
        streamHostId: stream.hostId,
        currentUserId,
        isHost: currentUserId && stream.hostId === currentUserId
      });
      
      // Check if the current user is the host of this stream
      if (currentUserId && stream.hostId === currentUserId) {
        console.log('[joinLiveStream] User is host, opening host interface');
        // User is the host - show host streaming interface
        setHostingStream({ ...stream, status: 'live' });
        toast({
          title: "호스트 모드",
          description: "방송을 시작합니다. 카메라와 마이크가 필요합니다.",
        });
        return;
      }
      
      console.log('[joinLiveStream] User is viewer, joining as viewer');
      // User is a viewer
      await apiRequest('POST', `/api/live-streaming/streams/${stream.id}/join`, {
        sessionId: `session-${Date.now()}`
      });
      
      setWatchingStream(stream);
      toast({
        title: "라이브 참여",
        description: `${stream.title} 라이브에 참여합니다.`,
      });
    } catch (error) {
      console.error('Error joining stream:', error);
      toast({
        title: "참여 실패",
        description: "라이브 참여 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const exitLiveStream = async () => {
    if (watchingStream) {
      try {
        await apiRequest('POST', `/api/live-streaming/streams/${watchingStream.id}/leave`, {
          sessionId: `session-${Date.now()}`
        });
      } catch (error) {
        console.error('Error leaving stream:', error);
      }
    }
    setWatchingStream(null);
  };

  const deleteStream = async (streamId: number) => {
    if (!confirm('이 라이브를 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.')) {
      return;
    }
    
    try {
      const response = await apiRequest('DELETE', `/api/live-streaming/streams/${streamId}`);
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "삭제 완료",
          description: "라이브가 삭제되었습니다.",
        });
        fetchLiveStreams();
      } else {
        throw new Error(data.message || 'Failed to delete stream');
      }
    } catch (error) {
      console.error('Error deleting stream:', error);
      toast({
        title: "삭제 실패",
        description: "라이브 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const fetchMeetings = async () => {
    try {
      const response = await apiRequest('GET', '/api/videocall/my-meetings');
      const data = await response.json();
      
      if (data && data.meetings) {
        setMeetings(data.meetings);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
      toast({
        title: '미팅 목록 가져오기 실패',
        description: '미팅 목록을 가져오는 중 오류가 발생했습니다. 나중에 다시 시도해주세요.',
        variant: 'destructive'
      });
    }
  };

  const fetchVideoClasses = async () => {
    try {
      const response = await fetch('/api/video-classes', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.videoClasses) {
        setVideoClasses(data.videoClasses);
      }
    } catch (error) {
      console.error('Error fetching video classes:', error);
      toast({
        title: '화상수업 목록 가져오기 실패',
        description: '화상수업 목록을 가져오는 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMeetingData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setMeetingData(prev => ({ ...prev, date }));
    }
  };

  const createMeeting = async () => {
    try {
      setIsCreating(true);

      // 날짜와 시간 조합
      const [hours, minutes] = meetingData.time.split(':').map(Number);
      const startTime = new Date(meetingData.date);
      startTime.setHours(hours, minutes, 0, 0);

      const response = await apiRequest('POST', '/api/videocall/create-meeting', {
        topic: meetingData.topic,
        start_time: startTime.toISOString(),
        duration: meetingData.duration,
        agenda: meetingData.agenda
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "미팅 생성 완료",
          description: `"${meetingData.topic}" 미팅이 성공적으로 생성되었습니다.`,
        });
        
        // 폼 초기화
        setMeetingData({
          topic: '',
          date: new Date(),
          time: format(new Date(), 'HH:mm'),
          duration: 30,
          agenda: ''
        });
        
        // 미팅 목록 새로고침
        fetchMeetings();
        
        // 예약된 미팅 탭으로 이동
        setActiveTab('scheduled');
      } else {
        throw new Error(data.error || '미팅 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast({
        title: "미팅 생성 실패",
        description: error instanceof Error ? error.message : "미팅 생성 중 오류가 발생했습니다. 나중에 다시 시도해주세요.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const joinMeeting = async () => {
    if (!meetingId.trim()) {
      toast({
        title: "미팅 ID 필요",
        description: "참여할 미팅 ID를 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsJoining(true);
      
      // 미팅 ID로 미팅 참여 URL 생성
      const joinUrl = `https://zoom.us/j/${meetingId.replace(/\s/g, '')}`;
      window.open(joinUrl, '_blank');
      
      toast({
        title: "미팅 참여",
        description: "Zoom 미팅에 참여합니다.",
      });
      
      setMeetingId('');
    } catch (error) {
      console.error('Error joining meeting:', error);
      toast({
        title: "미팅 참여 실패",
        description: "미팅 참여 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="pb-8">
      <PageBanner
        title="실시간 화상 훈련 서비스"
        subtitle="어디서나 전문 훈련사와 실시간 화상 수업을 받아보세요"
        imageUrl={VideoClassBannerImage}
      />
      
      <div className="container mx-auto px-4 py-8 space-y-8 text-sm">

      {/* 라이브 시청 중인 경우 - 유튜브 스타일 플레이어 + 채팅 */}
      {watchingStream && (
        <LocalErrorBoundary name="라이브 시청" onReset={exitLiveStream}>
          <LiveStreamViewer 
            stream={watchingStream} 
            onExit={exitLiveStream}
          />
        </LocalErrorBoundary>
      )}
      
      {/* 호스트 스트리밍 중인 경우 - WebRTC 방송 화면 */}
      {hostingStream && (
        <LocalErrorBoundary name="라이브 방송" onReset={exitHosting}>
          <StreamSession
            streamId={hostingStream.id}
            userId={currentUserId || undefined}
            isHost={true}
            userName={userName || '호스트'}
            onExit={exitHosting}
          />
        </LocalErrorBoundary>
      )}

      {/* 메인 탭 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 text-sm">
          <TabsTrigger value="live" className="flex items-center gap-2 text-sm" data-testid="tab-live">
            <Radio className="w-4 h-4" />
            라이브
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="flex items-center gap-2 text-sm" data-testid="tab-scheduled">
            <CalendarIcon className="w-4 h-4" />
            예약 미팅
          </TabsTrigger>
          <TabsTrigger value="trainers" className="flex items-center gap-2 text-sm" data-testid="tab-trainers">
            <Users className="w-4 h-4" />
            훈련사 수업
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2 text-sm" data-testid="tab-create">
            <Plus className="w-4 h-4" />
            생성
          </TabsTrigger>
        </TabsList>

        {/* 라이브 스트리밍 탭 */}
        <TabsContent value="live" id="live-tab-content" className="mt-6">
          <div className="space-y-6">
            {/* 현재 진행중인 라이브 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Radio className="w-5 h-5 text-red-500 animate-pulse" />
                      진행중인 라이브
                    </CardTitle>
                    <CardDescription className="text-xs">현재 진행중인 라이브 스트리밍에 참여하세요.</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setActiveTab('create')} data-testid="btn-create-stream">
                    <Plus className="w-4 h-4 mr-1" /> 라이브 시작
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingStreams ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : liveStreams.filter(s => s.status === 'live').length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {liveStreams.filter(s => s.status === 'live').map((stream) => (
                      <Card key={stream.id} className="overflow-hidden border-red-200 dark:border-red-800" data-testid={`stream-card-${stream.id}`}>
                        <div className="relative">
                          <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                            <Video className="w-12 h-12 text-primary/40" />
                          </div>
                          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                            LIVE
                          </span>
                          <span className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {stream.currentViewers || 0}
                          </span>
                        </div>
                        <CardContent className="p-3">
                          <h3 className="font-medium text-sm truncate">{stream.title}</h3>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                              <Users className="w-3 h-3" />
                            </div>
                            <span>{stream.hostName || '훈련사'}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {stream.description || '라이브 수업이 진행중입니다.'}
                          </p>
                        </CardContent>
                        <CardFooter className="p-3 pt-0 flex gap-2">
                          <Button 
                            className="flex-1" 
                            size="sm"
                            onClick={() => joinLiveStream(stream)}
                            data-testid={`btn-join-stream-${stream.id}`}
                          >
                            <Play className="w-4 h-4 mr-1" /> 
                            {currentUserId === stream.hostId ? '방송하기' : '시청하기'}
                          </Button>
                          {currentUserId === stream.hostId && (
                            <Button 
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteStream(stream.id)}
                              data-testid={`btn-delete-stream-${stream.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Radio className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-sm font-medium mb-2">현재 진행중인 라이브가 없습니다</h3>
                    <p className="text-muted-foreground text-xs mb-4">새로운 라이브를 시작하거나 예정된 라이브를 확인하세요.</p>
                    <Button onClick={() => setActiveTab('create')}>
                      <Plus className="w-4 h-4 mr-2" /> 라이브 시작하기
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 예정된 라이브 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">예정된 라이브</CardTitle>
                <CardDescription className="text-xs">곧 시작될 라이브 스트리밍 목록입니다.</CardDescription>
              </CardHeader>
              <CardContent>
                {liveStreams.filter(s => s.status === 'scheduled').length > 0 ? (
                  <div className="space-y-3">
                    {liveStreams.filter(s => s.status === 'scheduled').map((stream) => (
                      <div key={stream.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`scheduled-stream-${stream.id}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Video className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium text-sm">{stream.title}</h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{stream.hostName || '훈련사'}</span>
                              {stream.scheduledStartTime && (
                                <>
                                  <span>•</span>
                                  <span>{format(new Date(stream.scheduledStartTime), 'MM/dd HH:mm', { locale: ko })}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {currentUserId === stream.hostId && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => startLiveStream(stream.id)}
                                data-testid={`btn-start-stream-${stream.id}`}
                              >
                                <Play className="w-4 h-4 mr-1" /> 시작
                              </Button>
                              <Button 
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteStream(stream.id)}
                                data-testid={`btn-delete-scheduled-${stream.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground text-xs py-4">예정된 라이브가 없습니다.</p>
                )}
              </CardContent>
            </Card>

            {/* 지난 라이브 */}
            {liveStreams.filter(s => s.status === 'ended').length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">지난 라이브</CardTitle>
                  <CardDescription className="text-xs">종료된 라이브 스트리밍 기록입니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {liveStreams.filter(s => s.status === 'ended').slice(0, 5).map((stream) => (
                      <div key={stream.id} className="flex items-center justify-between p-2 border rounded-lg opacity-60">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                            <Video className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div>
                            <h4 className="font-medium text-xs">{stream.title}</h4>
                            <span className="text-xs text-muted-foreground">{stream.hostName}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">종료됨</span>
                          {currentUserId === stream.hostId && (
                            <Button 
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              onClick={() => deleteStream(stream.id)}
                              data-testid={`btn-delete-ended-${stream.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* 예약된 미팅 탭 */}
        <TabsContent value="scheduled" id="scheduled-tab-content" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">내 예약된 미팅</CardTitle>
              <CardDescription className="text-xs">예약된 미팅 목록을 확인하고 참여할 수 있습니다.</CardDescription>
            </CardHeader>
            <CardContent>
              {meetings.length > 0 ? (
                <div className="space-y-4">
                  {meetings.map((meeting) => (
                    <Card key={meeting.id} className="overflow-hidden">
                      <CardHeader className="bg-muted/50">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-sm">{meeting.topic}</CardTitle>
                            <CardDescription className="mt-1 text-xs">
                              <div className="flex items-center gap-4 text-xs">
                                <span className="flex items-center gap-1">
                                  <CalendarIcon className="w-4 h-4" />
                                  {format(new Date(meeting.start_time), 'yyyy년 MM월 dd일', { locale: ko })}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {format(new Date(meeting.start_time), 'HH:mm', { locale: ko })}
                                </span>
                                <span>{meeting.duration}분</span>
                              </div>
                            </CardDescription>
                          </div>
                          <Button 
                            onClick={() => window.open(meeting.join_url, '_blank')}
                            className="ml-4"
                            aria-label={`${meeting.topic} 미팅 참여하기`}
                          >
                            <Video className="w-4 h-4 mr-2" /> 참여
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4 pb-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="font-medium text-muted-foreground mb-1 text-xs">미팅 ID:</p>
                            <p className="font-mono text-xs">{meeting.id}</p>
                          </div>
                          {meeting.password && (
                            <div>
                              <p className="font-medium text-muted-foreground mb-1 text-xs">비밀번호:</p>
                              <p className="font-mono text-xs">{meeting.password}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-end gap-2 border-t bg-muted/30 py-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            navigator.clipboard.writeText(meeting.join_url);
                            toast({
                              title: '복사 완료',
                              description: '미팅 링크가 클립보드에 복사되었습니다.',
                            });
                          }}
                          aria-label={`${meeting.topic} 미팅 링크 복사하기`}
                        >
                          <Copy className="w-4 h-4 mr-1" /> 링크 복사
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={async () => {
                            const shareText = `${meeting.topic}\n일시: ${format(new Date(meeting.start_time), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}\n참여 링크: ${meeting.join_url}`;
                            try {
                              if (navigator.share) {
                                await navigator.share({ title: meeting.topic, text: shareText });
                              } else if (navigator.clipboard?.writeText) {
                                await navigator.clipboard.writeText(shareText);
                                toast({
                                  title: '복사 완료',
                                  description: '미팅 정보가 클립보드에 복사되었습니다.',
                                });
                              } else {
                                toast({
                                  title: '공유 정보',
                                  description: shareText,
                                  duration: 10000,
                                });
                              }
                            } catch (err) {
                              console.log('공유 실패:', err);
                              toast({
                                title: '공유 실패',
                                description: '정보 공유 중 오류가 발생했습니다.',
                                variant: 'destructive'
                              });
                            }
                          }}
                          aria-label={`${meeting.topic} 미팅 정보 공유하기`}
                        >
                          <Share2 className="w-4 h-4 mr-1" /> 공유
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-sm font-medium mb-2">예약된 미팅이 없습니다</h3>
                  <p className="text-muted-foreground mb-4 text-xs">새로운 미팅을 생성하거나 미팅 ID로 참여해보세요.</p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => setActiveTab('create')}>
                      <Plus className="w-4 h-4 mr-2" /> 미팅 생성
                    </Button>
                    <Button variant="outline">
                      <UserPlus className="w-4 h-4 mr-2" /> ID로 참여
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 미팅 ID로 참여 섹션 */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">미팅 ID로 참여</CardTitle>
              <CardDescription className="text-xs">다른 사람의 미팅에 참여하려면 미팅 ID를 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="meetingId">미팅 ID</Label>
                  <Input
                    id="meetingId"
                    value={meetingId}
                    onChange={(e) => setMeetingId(e.target.value)}
                    placeholder="예: 123 456 7890"
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={joinMeeting} disabled={isJoining || !meetingId.trim()}>
                    {isJoining ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        참여 중...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" /> 참여
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trainers" id="trainers-tab-content" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">테일즈 화상 수업</CardTitle>
              <CardDescription className="text-xs">테일즈 소속 훈련사가 진행하는 화상수업에 참여하세요.</CardDescription>
            </CardHeader>
            <CardContent>
              {videoClasses.length > 0 ? (
                <div className="space-y-4">
                  {videoClasses.map((videoClass) => (
                    <Card key={videoClass.id} className="overflow-hidden">
                      <CardHeader className="bg-muted/50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="flex items-center gap-2 mb-2 text-sm">
                              <Video className="w-4 h-4" />
                              {videoClass.title}
                            </CardTitle>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {videoClass.trainerName} 훈련사
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {format(new Date(videoClass.scheduledTime), 'MM월 dd일 HH:mm', { locale: ko })}
                              </div>
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="w-4 h-4" />
                                {videoClass.duration}분
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Button 
                              variant="default" 
                              size="sm" 
                              onClick={() => {
                                const meetingUrl = videoClass.meetingUrl || 
                                  (videoClass.zoomPMI && videoClass.zoomPMIPassword ? 
                                    `https://zoom.us/j/${videoClass.zoomPMI.replace(/-/g, '')}?pwd=${videoClass.zoomPMIPassword}` : 
                                    null);
                                
                                if (meetingUrl) {
                                  window.open(meetingUrl, '_blank');
                                  toast({
                                    title: "화상수업 참여",
                                    description: `${videoClass.title} 수업에 참여합니다.`,
                                  });
                                } else {
                                  toast({
                                    title: "미팅 정보 없음",
                                    description: "화상수업 참여 링크를 찾을 수 없습니다.",
                                    variant: "destructive"
                                  });
                                }
                              }}
                              aria-label={`${videoClass.title} 화상수업 참여하기`}
                            >
                              <Video className="w-4 h-4 mr-2" /> 수업 참여
                            </Button>
                            <span className="text-lg font-bold text-primary">
                              {videoClass.price.toLocaleString()}원
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4 pb-2">
                        <p className="text-xs text-muted-foreground mb-4">
                          {videoClass.description}
                        </p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-4">
                          <div>
                            <p className="font-medium text-muted-foreground mb-1">카테고리:</p>
                            <p>{videoClass.category}</p>
                          </div>
                          <div>
                            <p className="font-medium text-muted-foreground mb-1">난이도:</p>
                            <p>{videoClass.difficulty === 'beginner' ? '초급' : 
                               videoClass.difficulty === 'intermediate' ? '중급' : '고급'}</p>
                          </div>
                          <div>
                            <p className="font-medium text-muted-foreground mb-1">참여인원:</p>
                            <p>{videoClass.currentStudents}/{videoClass.maxStudents}명</p>
                          </div>
                          <div>
                            <p className="font-medium text-muted-foreground mb-1">상태:</p>
                            <p>{videoClass.status === 'scheduled' ? '예정됨' : '진행중'}</p>
                          </div>
                        </div>

                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2 text-xs">회의 정보</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="text-blue-700 dark:text-blue-300 font-medium">회의 번호:</p>
                              <p className="font-mono text-blue-900 dark:text-blue-100">{videoClass.zoomPMI}</p>
                            </div>
                            <div>
                              <p className="text-blue-700 dark:text-blue-300 font-medium">비밀번호:</p>
                              <p className="font-mono text-blue-900 dark:text-blue-100">{videoClass.zoomPMIPassword}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between border-t bg-muted/30 py-2">
                        <div className="flex items-center gap-2">
                          <img 
                            src={videoClass.trainerImage} 
                            alt={`${videoClass.trainerName} 프로필`}
                            className="w-8 h-8 rounded-full"
                          />
                          <span className="text-sm font-medium">{videoClass.trainerName}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              const classInfo = `
${videoClass.title}
훈련사: ${videoClass.trainerName}
일시: ${format(new Date(videoClass.scheduledTime), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
회의 번호: ${videoClass.zoomPMI}
비밀번호: ${videoClass.zoomPMIPassword}
참여방법: Zoom 앱에서 "미팅 참여" → 회의 번호 입력
                              `.trim();
                              
                              navigator.clipboard.writeText(classInfo)
                                .then(() => {
                                  toast({
                                    title: '복사 완료',
                                    description: '화상수업 정보가 클립보드에 복사되었습니다.',
                                  });
                                })
                                .catch(() => {
                                  toast({
                                    title: '복사 실패',
                                    description: '정보 복사 중 오류가 발생했습니다.',
                                    variant: 'destructive'
                                  });
                                });
                            }}
                            aria-label={`${videoClass.title} 화상수업 정보 복사하기`}
                          >
                            <Copy className="w-4 h-4 mr-1" /> 정보 복사
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={async () => {
                              const meetingUrl = videoClass.meetingUrl || 
                                (videoClass.zoomPMI && videoClass.zoomPMIPassword ? 
                                  `https://zoom.us/j/${videoClass.zoomPMI.replace(/-/g, '')}?pwd=${videoClass.zoomPMIPassword}` : 
                                  '');
                              const shareText = `${videoClass.title}\n훈련사: ${videoClass.trainerName}\n일시: ${format(new Date(videoClass.scheduledTime), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}${meetingUrl ? `\n참여 링크: ${meetingUrl}` : ''}`;
                              try {
                                if (navigator.share) {
                                  await navigator.share({ title: videoClass.title, text: shareText });
                                } else if (navigator.clipboard?.writeText) {
                                  await navigator.clipboard.writeText(shareText);
                                  toast({
                                    title: '복사 완료',
                                    description: '화상수업 정보가 클립보드에 복사되었습니다.',
                                  });
                                } else {
                                  toast({
                                    title: '공유 정보',
                                    description: shareText,
                                    duration: 10000,
                                  });
                                }
                              } catch (err) {
                                console.log('공유 실패:', err);
                                toast({
                                  title: '공유 실패',
                                  description: '정보 공유 중 오류가 발생했습니다.',
                                  variant: 'destructive'
                                });
                              }
                            }}
                            aria-label={`${videoClass.title} 화상수업 정보 공유하기`}
                          >
                            <Share2 className="w-4 h-4 mr-1" /> 공유
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-sm font-medium mb-2">예정된 화상수업이 없습니다</h3>
                  <p className="text-muted-foreground mb-4 text-xs">테일즈 소속 훈련사가 진행하는 화상수업을 준비 중입니다.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="create" id="create-tab-content" className="mt-6">
          {/* 라이브 스트리밍 생성 섹션 */}
          <Card className="mb-6 border-primary/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Radio className="w-5 h-5 text-red-500" />
                라이브 스트리밍 시작
              </CardTitle>
              <CardDescription className="text-xs">실시간으로 많은 수강생들에게 강의를 진행하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="streamTitle">라이브 제목 *</Label>
                  <Input
                    id="streamTitle"
                    value={streamFormData.title}
                    onChange={(e) => setStreamFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="라이브 스트리밍 제목을 입력하세요"
                    className="mt-1"
                    data-testid="input-stream-title"
                  />
                </div>
                <div>
                  <Label htmlFor="streamCategory">카테고리</Label>
                  <select
                    id="streamCategory"
                    value={streamFormData.category}
                    onChange={(e) => setStreamFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-input bg-background text-sm rounded-md"
                    data-testid="select-stream-category"
                  >
                    <option value="training">훈련 수업</option>
                    <option value="qa">Q&A 세션</option>
                    <option value="demo">시연</option>
                    <option value="consultation">상담</option>
                    <option value="general">기타</option>
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="streamDescription">설명</Label>
                <textarea
                  id="streamDescription"
                  value={streamFormData.description}
                  onChange={(e) => setStreamFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="라이브 스트리밍에 대한 설명을 입력하세요"
                  className="mt-1 min-h-20 w-full px-3 py-2 border border-input bg-background text-sm rounded-md"
                  rows={3}
                  data-testid="textarea-stream-description"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="streamDate">예약 날짜</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full mt-1 justify-start text-left font-normal",
                          !streamFormData.scheduledStartTime && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {streamFormData.scheduledStartTime 
                          ? format(streamFormData.scheduledStartTime, "yyyy년 MM월 dd일", { locale: ko }) 
                          : "날짜 선택"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={streamFormData.scheduledStartTime}
                        onSelect={(date) => date && setStreamFormData(prev => ({ ...prev, scheduledStartTime: date }))}
                        initialFocus
                        locale={ko}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="streamTime">시작 시간</Label>
                  <Input
                    id="streamTime"
                    type="time"
                    value={streamFormData.scheduledTime}
                    onChange={(e) => setStreamFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                    className="mt-1"
                    data-testid="input-stream-time"
                  />
                </div>
                <div>
                  <Label htmlFor="maxViewers">최대 시청자</Label>
                  <Input
                    id="maxViewers"
                    type="number"
                    min="1"
                    max="1000"
                    value={streamFormData.maxViewers}
                    onChange={(e) => setStreamFormData(prev => ({ ...prev, maxViewers: parseInt(e.target.value) || 100 }))}
                    className="mt-1"
                    data-testid="input-max-viewers"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStreamFormData({
                    title: '',
                    description: '',
                    category: 'training',
                    scheduledStartTime: new Date(),
                    scheduledTime: format(new Date(), 'HH:mm'),
                    isPublic: true,
                    maxViewers: 100,
                  })}
                >
                  초기화
                </Button>
                <Button
                  onClick={createLiveStream}
                  disabled={isCreatingStream || !streamFormData.title.trim()}
                  className="bg-red-500 hover:bg-red-600"
                  data-testid="btn-create-live"
                >
                  {isCreatingStream ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Radio className="w-4 h-4 mr-2" /> 라이브 생성
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 일반 미팅 생성 섹션 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">새 미팅 생성</CardTitle>
              <CardDescription className="text-xs">Google Meet 미팅을 생성하여 다른 사람들을 초대하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="topic">미팅 제목 *</Label>
                    <Input
                      id="topic"
                      name="topic"
                      value={meetingData.topic}
                      onChange={handleInputChange}
                      placeholder="미팅 제목을 입력하세요"
                      className="mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="date">날짜 *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full mt-1 justify-start text-left font-normal",
                            !meetingData.date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {meetingData.date ? format(meetingData.date, "yyyy년 MM월 dd일", { locale: ko }) : "날짜 선택"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={meetingData.date}
                          onSelect={handleDateChange}
                          initialFocus
                          locale={ko}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label htmlFor="time">시간 *</Label>
                    <Input
                      id="time"
                      name="time"
                      type="time"
                      value={meetingData.time}
                      onChange={handleInputChange}
                      className="mt-1"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="duration">진행 시간 (분) *</Label>
                    <Input
                      id="duration"
                      name="duration"
                      type="number"
                      min="15"
                      max="480"
                      value={meetingData.duration}
                      onChange={handleInputChange}
                      placeholder="30"
                      className="mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="agenda">안건 (선택사항)</Label>
                    <textarea
                      id="agenda"
                      name="agenda"
                      value={meetingData.agenda}
                      onChange={handleInputChange}
                      placeholder="미팅 안건이나 설명을 입력하세요"
                      className="mt-1 min-h-24 w-full px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md"
                      rows={4}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setMeetingData({
                      topic: '',
                      date: new Date(),
                      time: format(new Date(), 'HH:mm'),
                      duration: 30,
                      agenda: ''
                    });
                  }}
                >
                  초기화
                </Button>
                <Button 
                  onClick={createMeeting} 
                  disabled={isCreating || !meetingData.topic.trim()}
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" /> 미팅 생성
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}