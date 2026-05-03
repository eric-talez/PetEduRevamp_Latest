import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
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
  Share2
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import GoogleMeet from '@/components/GoogleMeet';

interface Meeting {
  id: string;
  topic: string;
  start_time: string;
  duration: number;
  join_url?: string; // Legacy field for backward compatibility
  meetingUrl?: string; // Google Meet URL
  agenda?: string;
}

// Helper function to get meeting URL (supports both join_url and meetingUrl)
const getMeetingUrl = (meeting: Pick<Meeting, 'meetingUrl' | 'join_url'>): string => {
  return meeting.meetingUrl || meeting.join_url || '';
};

export default function VideoCallPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading, userName } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('scheduled');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
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
    meetingUrl: string;
    status: string;
  }>>([]);
  
  // Google Meet 통합을 위한 상태
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<{
    meetingUrl?: string;
    topic?: string;
    userName?: string;
  } | null>(null);

  useEffect(() => {
    console.log('🎥 VideoCallPage useEffect - 인증 상태:', { isLoading, isAuthenticated });
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "로그인 필요",
        description: "화상 통화 기능을 사용하려면 로그인이 필요합니다.",
        variant: "destructive"
      });
      setLocation('/auth/login');
    } else if (isAuthenticated) {
      console.log('🎥 인증 완료, 데이터 가져오기 시작');
      // 미팅 목록 가져오기
      fetchMeetings();
      // 화상수업 목록 가져오기
      fetchVideoClasses();
    }
  }, [isLoading, isAuthenticated, setLocation, toast]);

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
    console.log('🎥 fetchVideoClasses 함수 호출됨');
    try {
      const response = await apiRequest('GET', '/api/video-classes');
      console.log('🎥 API 응답 상태:', response.status);
      const data = await response.json();
      console.log('🎥 API 응답 데이터:', data);
      
      if (data && data.videoClasses) {
        console.log('🎥 화상수업 데이터 설정:', data.videoClasses.length, '개');
        setVideoClasses(data.videoClasses);
      } else {
        console.log('🎥 화상수업 데이터 없음');
      }
    } catch (error) {
      console.error('🎥 Error fetching video classes:', error);
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
          title: '미팅 생성 완료',
          description: '화상 미팅이 성공적으로 생성되었습니다.',
        });
        
        // 폼 초기화
        setMeetingData({
          topic: '',
          date: new Date(),
          time: format(new Date(), 'HH:mm'),
          duration: 30,
          agenda: ''
        });
        
        // 미팅 목록 갱신
        fetchMeetings();
        
        // 스케줄된 미팅 탭으로 이동
        setActiveTab('scheduled');
      } else {
        throw new Error(data.error || '미팅 생성 실패');
      }
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      toast({
        title: '미팅 생성 실패',
        description: error.message || '미팅을 생성하는 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const joinMeeting = async () => {
    try {
      setIsJoining(true);

      if (!meetingId) {
        toast({
          title: '미팅 URL 필요',
          description: '미팅에 참여하려면 Google Meet URL을 입력해주세요.',
          variant: 'destructive'
        });
        return;
      }

      // Google Meet 링크로 참여
      setActiveMeeting({
        meetingUrl: meetingId,
        topic: 'Google Meet 화상 수업',
        userName: userName || '게스트'
      });
      setIsInMeeting(true);
      
      toast({
        title: '미팅 참여',
        description: 'Google Meet에 참여합니다.',
      });
    } catch (error: any) {
      console.error('Error joining meeting:', error);
      toast({
        title: '미팅 참여 실패',
        description: error.message || '미팅에 참여하는 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    } finally {
      setIsJoining(false);
    }
  };

  const copyMeetingInfo = (meeting: Meeting) => {
    const meetingUrl = getMeetingUrl(meeting);
    const meetingInfo = `
미팅 주제: ${meeting.topic}
시간: ${format(new Date(meeting.start_time), 'PPP p', { locale: ko })}
소요 시간: ${meeting.duration}분
참여 링크: ${meetingUrl}
    `.trim();

    navigator.clipboard.writeText(meetingInfo)
      .then(() => {
        toast({
          title: '복사 완료',
          description: '미팅 정보가 클립보드에 복사되었습니다.',
          variant: 'default',
        });
      })
      .catch((err) => {
        console.error('클립보드 복사 오류:', err);
        toast({
          title: '복사 실패',
          description: '미팅 정보를 복사하는 중 오류가 발생했습니다.',
          variant: 'destructive'
        });
      });
  };

  const startMeeting = (meeting: Meeting) => {
    // Google Meet 링크로 새 탭에서 참여
    const meetingUrl = getMeetingUrl(meeting);
    setActiveMeeting({
      meetingUrl,
      topic: meeting.topic,
      userName: userName || '게스트'
    });
    setIsInMeeting(true);
    toast({
      title: "미팅 참여",
      description: `${meeting.topic} 미팅에 참여합니다.`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" role="status">
        <div 
          className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"
          aria-hidden="true"
        ></div>
        <span className="sr-only">화상 미팅 데이터를 불러오는 중입니다. 잠시만 기다려주세요.</span>
      </div>
    );
  }

  // 미팅 참여 중일 때는 Google Meet 컴포넌트 렌더링
  if (isInMeeting && activeMeeting) {
    return (
      <GoogleMeet
        meetingUrl={activeMeeting.meetingUrl}
        title={activeMeeting.topic || '화상 수업'}
        onLeave={() => {
          setIsInMeeting(false);
          setActiveMeeting(null);
        }}
      />
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* 스크린 리더 사용자를 위한 실시간 알림 영역 */}
      <div 
        className="sr-only" 
        aria-live="polite" 
        id="screen-reader-announcements"
      >
        {isCreating && "화상 미팅 생성 중입니다. 잠시만 기다려주세요."}
        {isJoining && "화상 미팅 입장 중입니다. 잠시만 기다려주세요."}
      </div>
      
      <h1 className="text-3xl font-bold mb-6">화상 훈련 서비스</h1>
      
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="w-full"
        aria-label="화상 미팅 관리 탭"
      >
        <TabsList className="w-full grid grid-cols-4" aria-label="화상 미팅 관리 옵션">
          <TabsTrigger value="scheduled" aria-controls="scheduled-tab-content">예정된 미팅</TabsTrigger>
          <TabsTrigger value="trainers" aria-controls="trainers-tab-content">훈련사 수업</TabsTrigger>
          <TabsTrigger value="create" aria-controls="create-tab-content">미팅 생성</TabsTrigger>
          <TabsTrigger value="join" aria-controls="join-tab-content">미팅 참여</TabsTrigger>
        </TabsList>
        
        <TabsContent value="scheduled" id="scheduled-tab-content" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>예정된 미팅</CardTitle>
              <CardDescription>귀하의 예정된 화상 훈련 세션 목록입니다.</CardDescription>
            </CardHeader>
            <CardContent>
              {meetings.length > 0 ? (
                <div className="space-y-4">
                  {meetings.map((meeting) => (
                    <Card key={meeting.id} className="overflow-hidden">
                      <CardHeader className="bg-muted/50">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{meeting.topic}</CardTitle>
                            <CardDescription className="mt-1">
                              <div className="flex items-center"><CalendarIcon className="w-4 h-4 mr-1" /> {format(new Date(meeting.start_time), 'PPP', { locale: ko })}</div>
                              <div className="flex items-center mt-1"><Clock className="w-4 h-4 mr-1" /> {format(new Date(meeting.start_time), 'p', { locale: ko })} ({meeting.duration}분)</div>
                            </CardDescription>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => startMeeting(meeting)}
                            aria-label={`${meeting.topic} 미팅 시작하기`}
                          >
                            <Video className="w-4 h-4 mr-2" /> 시작
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4 pb-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="font-medium text-muted-foreground">미팅 ID:</p>
                            <p>{meeting.id}</p>
                          </div>
                          <div>
                            <p className="font-medium text-muted-foreground">비밀번호:</p>
                            <p>{meeting.password}</p>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-end gap-2 border-t bg-muted/30 py-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => copyMeetingInfo(meeting)}
                          aria-label={`${meeting.topic} 미팅 정보 복사하기`}
                        >
                          <Copy className="w-4 h-4 mr-1" /> 정보 복사
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
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
                  <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">예정된 미팅이 없습니다</h3>
                  <p className="text-muted-foreground mb-4">새 화상 훈련 세션을 생성하여 시작하세요.</p>
                  <Button 
                    onClick={() => setActiveTab('create')}
                    aria-label="새 화상 미팅 생성 페이지로 이동"
                  >
                    <Plus className="w-4 h-4 mr-2" /> 미팅 생성
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trainers" id="trainers-tab-content" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>테일즈 화상 수업</CardTitle>
              <CardDescription>테일즈 소속 훈련사가 진행하는 화상수업에 참여하세요.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* 디버깅 정보 */}
              <div className="mb-4 p-2 bg-warning/10 dark:bg-warning/20 rounded text-xs">
                <strong>디버깅 정보:</strong> 화상수업 {videoClasses.length}개 로드됨
              </div>
              
              {(() => {
                console.log('🎥 화상수업 렌더링 상태 확인:', videoClasses.length, '개 수업');
                return videoClasses.length > 0 ? (
                <div className="space-y-4">
                  {videoClasses.map((videoClass) => (
                    <Card key={videoClass.id} className="overflow-hidden">
                      <CardHeader className="bg-muted/50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="flex items-center gap-2 mb-2">
                              <Video className="w-5 h-5" />
                              {videoClass.title}
                            </CardTitle>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                                // Google Meet 링크로 참여
                                const meetingUrl = videoClass.meetingUrl || '';
                                setActiveMeeting({
                                  meetingUrl,
                                  topic: videoClass.title,
                                  userName: userName || '게스트'
                                });
                                setIsInMeeting(true);
                                toast({
                                  title: "화상수업 참여",
                                  description: `${videoClass.title} 수업에 참여합니다.`,
                                });
                              }}
                              aria-label={`${videoClass.title} 화상수업 참여하기`}
                              data-testid={`button-join-class-${videoClass.id}`}
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
                        <p className="text-sm text-muted-foreground mb-4">
                          {videoClass.description}
                        </p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
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

                        <div className="mt-4 p-3 bg-primary/10 dark:bg-primary/20 rounded-lg">
                          <h4 className="font-medium text-primary dark:text-primary/70 mb-2">회의 정보</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-primary dark:text-primary font-medium">회의 번호:</p>
                              <p className="font-mono text-primary dark:text-primary/70">{videoClass.zoomPMI}</p>
                            </div>
                            <div>
                              <p className="text-primary dark:text-primary font-medium">비밀번호:</p>
                              <p className="font-mono text-primary dark:text-primary/70">{videoClass.zoomPMIPassword}</p>
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
                    <h3 className="text-lg font-medium mb-2">예정된 화상수업이 없습니다</h3>
                    <p className="text-muted-foreground mb-4">테일즈 소속 훈련사가 진행하는 화상수업을 준비 중입니다.</p>
                    <p className="text-xs text-muted-foreground">데이터 로딩 상태: {videoClasses.length}개 수업</p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="create" id="create-tab-content" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>미팅 생성</CardTitle>
              <CardDescription>새로운 화상 훈련 세션을 생성합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic">미팅 제목</Label>
                <Input 
                  id="topic" 
                  name="topic" 
                  placeholder="반려견 기본 훈련 세션" 
                  value={meetingData.topic}
                  onChange={handleInputChange}
                  required
                  aria-required="true"
                  aria-label="미팅 제목 입력"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date-picker">날짜</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date-picker"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !meetingData.date && "text-muted-foreground"
                        )}
                        aria-label="화상 미팅 날짜 선택"
                        aria-haspopup="dialog"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                        {meetingData.date ? format(meetingData.date, 'PPP', { locale: ko }) : <span>날짜 선택</span>}
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
                
                <div className="space-y-2">
                  <Label htmlFor="time">시간</Label>
                  <Input 
                    id="time" 
                    name="time" 
                    type="time" 
                    value={meetingData.time}
                    onChange={handleInputChange}
                    aria-label="미팅 시간 선택"
                    aria-required="true"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="duration">소요 시간 (분)</Label>
                <Input 
                  id="duration" 
                  name="duration" 
                  type="number" 
                  min="15"
                  max="300"
                  step="5"
                  value={meetingData.duration}
                  onChange={handleInputChange}
                  aria-label="미팅 소요 시간(분) 입력"
                  aria-valuemin={15}
                  aria-valuemax={300}
                  aria-required="true"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="agenda">안건 (선택사항)</Label>
                <Input 
                  id="agenda" 
                  name="agenda" 
                  placeholder="이번 세션에서 다룰 내용을 간략히 설명해주세요."
                  value={meetingData.agenda}
                  onChange={handleInputChange}
                  aria-label="미팅 안건 입력 (선택사항)"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setActiveTab('scheduled')}
                aria-label="미팅 생성 취소하고 예정된 미팅 목록으로 돌아가기"
              >
                취소
              </Button>
              <Button 
                onClick={createMeeting} 
                disabled={isCreating || !meetingData.topic}
                aria-label="새 화상 미팅 생성하기"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" aria-hidden="true"></div>
                    처리 중...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" aria-hidden="true" /> 미팅 생성
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="join" id="join-tab-content" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>미팅 참여</CardTitle>
              <CardDescription>Google Meet URL을 입력하여 기존 화상 훈련 세션에 참여합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meetingId">Google Meet URL</Label>
                <Input 
                  id="meetingId" 
                  placeholder="예: https://meet.google.com/abc-defg-hij" 
                  value={meetingId}
                  onChange={(e) => setMeetingId(e.target.value)}
                  aria-label="Google Meet URL 입력"
                  aria-required="true"
                />
              </div>
              
              <div className="bg-muted/50 p-4 rounded-md">
                <h3 className="text-sm font-medium mb-2 flex items-center">
                  <Monitor className="w-4 h-4 mr-2" />
                  미팅 참여 전 확인사항
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 카메라와 마이크가 정상적으로 작동하는지 확인해주세요.</li>
                  <li>• 조용한 환경에서 참여하는 것이 좋습니다.</li>
                  <li>• 반려견이 편안한 상태에서 참여할 수 있도록 준비해주세요.</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={joinMeeting} 
                disabled={isJoining || !meetingId}
                aria-label="입력한 미팅 ID로 화상 미팅에 참여하기"
              >
                {isJoining ? (
                  <>
                    <div 
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" 
                      aria-hidden="true"
                    ></div>
                    참여 중...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" aria-hidden="true" /> 미팅 참여
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-4">화상 훈련 이용 가이드</h2>
        <Separator className="mb-6" />
        
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. 미팅 준비</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• 조용하고 밝은 환경을 준비하세요.</li>
                <li>• 반려견이 편안하게 있을 수 있는 공간을 확보하세요.</li>
                <li>• 카메라와 마이크가 정상 작동하는지 확인하세요.</li>
                <li>• 미리 간식이나 장난감을 준비해 두세요.</li>
              </ul>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. 훈련 진행</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• 훈련사의 지시에 따라 천천히 진행하세요.</li>
                <li>• 반려견이 불안해하면 잠시 휴식을 취하세요.</li>
                <li>• 질문이 있을 때는 언제든지 물어보세요.</li>
                <li>• 훈련 후 복습을 위해 세션을 녹화할 수 있습니다.</li>
              </ul>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3. 문제 해결</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• 연결 문제: 브라우저를 재시작하거나 다른 브라우저를 사용해보세요.</li>
                <li>• 오디오 문제: 볼륨 설정과 마이크 권한을 확인하세요.</li>
                <li>• 비디오 문제: 카메라 권한과 연결 상태를 확인하세요.</li>
                <li>• 기술적 도움이 필요하면 고객센터로 연락주세요.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}