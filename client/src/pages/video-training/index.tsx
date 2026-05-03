import { useState, useRef, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, 
  Lock, 
  Play, 
  Star, 
  Search, 
  Filter
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLocation } from "wouter";
import VideoPlayer from "@/components/VideoPlayer";

interface CurriculumItem {
  id: number;
  title: string;
  duration: string;
  description: string;
  price: number;
  isPurchased: boolean;
}

interface Video {
  id: number;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  level: string;
  isPremium: boolean;
  category: string;
  views: number;
  rating: number;
  reviews: number;
  price: number; // 전체 강의 가격
  trainer: {
    name: string;
    avatar: string;
  };
  tags: string[];
  curriculum: CurriculumItem[]; // 커리큘럼 항목 목록
}

export default function VideoTraining() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showPlayer, setShowPlayer] = useState<boolean>(false);
  const [showVideoDetails, setShowVideoDetails] = useState<boolean>(false);
  const [showPremiumAlert, setShowPremiumAlert] = useState<boolean>(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [previewEnded, setPreviewEnded] = useState<boolean>(false);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // 비디오 플레이어 상태
  interface PlayerState {
    playing: boolean;
    currentTime: number;
    duration: number;
    muted: boolean;
    volume: number;
    subtitles: boolean;
    playbackRate: number;
    paused: boolean;
    controlsVisible: boolean;
  }
  
  const [playerState, setPlayerState] = useState<PlayerState>({
    playing: false,
    currentTime: 0,
    duration: 0,
    muted: false,
    volume: 1,
    subtitles: false,
    playbackRate: 1,
    paused: true,
    controlsVisible: true
  });

  useEffect(() => {
    // 임시 데이터 로딩 (실제 구현에서는 API 호출로 대체)
    const fetchVideos = async () => {
      try {
        // 예시 데이터
        const mockVideos: Video[] = [
          {
            id: 1,
            title: "기본 복종 훈련: 앉아, 기다려, 엎드려",
            description: "반려견과의 기본적인 의사소통을 위한 필수 명령어 훈련 방법을 알려드립니다. 짧은 세션으로 꾸준히 연습하는 방법을 배워보세요.",
            thumbnail: "https://images.unsplash.com/photo-1534361960057-19889db9621e?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=500&q=80",
            duration: "15:30",
            level: "초급",
            isPremium: false,
            category: "기본 훈련",
            views: 12450,
            rating: 4.7,
            reviews: 342,
            price: 0,
            trainer: {
              name: "김훈련",
              avatar: "https://randomuser.me/api/portraits/men/32.jpg"
            },
            tags: ["기본 훈련", "초급", "복종 훈련"],
            curriculum: [
              {
                id: 1,
                title: "앉아(Sit) 명령 훈련",
                duration: "5:20",
                description: "가장 기본적인 앉아 명령을 훈련하는 방법",
                price: 0,
                isPurchased: true
              },
              {
                id: 2,
                title: "기다려(Stay) 명령 훈련",
                duration: "4:45",
                description: "반려견이 자리에서 기다리게 하는 훈련",
                price: 0,
                isPurchased: true
              },
              {
                id: 3,
                title: "엎드려(Down) 명령 훈련",
                duration: "5:25",
                description: "반려견이 엎드리도록 하는 훈련",
                price: 0,
                isPurchased: true
              }
            ]
          },
          {
            id: 2,
            title: "산책 예절 훈련: 끌지 않고 걷기",
            description: "반려견과 함께하는 산책을 더 즐겁게 만들기 위한 리드줄 훈련 방법입니다. 끌지 않고 걷는 방법을 단계별로 알려드립니다.",
            thumbnail: "https://images.unsplash.com/photo-1592754862816-1a21a4ea2281?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=500&q=80",
            duration: "23:15",
            level: "중급",
            isPremium: true,
            category: "산책 훈련",
            views: 8320,
            rating: 4.9,
            reviews: 256,
            price: 15000,
            trainer: {
              name: "박워커",
              avatar: "https://randomuser.me/api/portraits/women/44.jpg"
            },
            tags: ["산책", "중급", "리드줄"],
            curriculum: [
              {
                id: 1,
                title: "리드줄 적응 훈련",
                duration: "7:30",
                description: "반려견이 리드줄에 익숙해지는 방법",
                price: 0,
                isPurchased: false
              },
              {
                id: 2,
                title: "기본 걷기 훈련",
                duration: "8:15",
                description: "반려견과 함께 기본적인 걷기 훈련",
                price: 5000,
                isPurchased: false
              },
              {
                id: 3,
                title: "다양한 환경에서의 산책 훈련",
                duration: "7:30",
                description: "다양한 상황에서 산책하는 방법",
                price: 10000,
                isPurchased: false
              }
            ]
          },
          {
            id: 3,
            title: "문제행동 교정: 분리불안 다루기",
            description: "반려견의 분리불안 증상을 완화하고 혼자 있는 시간을 편안하게 보낼 수 있도록 도와주는 단계별 훈련 방법을 알려드립니다.",
            thumbnail: "https://images.unsplash.com/photo-1583512603806-077998240c7a?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=500&q=80",
            duration: "35:20",
            level: "고급",
            isPremium: true,
            category: "문제행동",
            views: 15230,
            rating: 4.8,
            reviews: 420,
            price: 25000,
            trainer: {
              name: "이행동",
              avatar: "https://randomuser.me/api/portraits/men/67.jpg"
            },
            tags: ["문제행동", "고급", "분리불안"],
            curriculum: [
              {
                id: 1,
                title: "분리불안의 이해",
                duration: "10:45",
                description: "반려견의 분리불안 원인과 증상 이해하기",
                price: 0,
                isPurchased: false
              },
              {
                id: 2,
                title: "기초 분리불안 훈련",
                duration: "12:30",
                description: "짧은 시간부터 시작하는 분리 훈련",
                price: 10000,
                isPurchased: false
              },
              {
                id: 3,
                title: "심화 분리불안 훈련",
                duration: "12:05",
                description: "장시간 혼자 있을 수 있도록 훈련하는 방법",
                price: 15000,
                isPurchased: false
              }
            ]
          },
          {
            id: 4,
            title: "반려견 트릭 훈련: 기본편",
            description: "반려견과의 유대감을 높이고 지능 발달에 도움이 되는 재미있는 트릭 훈련 방법을 알려드립니다.",
            thumbnail: "https://images.unsplash.com/photo-1505628346881-b72b27e84530?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=500&q=80",
            duration: "28:45",
            level: "초급",
            isPremium: false,
            category: "트릭 훈련",
            views: 9640,
            rating: 4.6,
            reviews: 178,
            price: 0,
            trainer: {
              name: "정트릭",
              avatar: "https://randomuser.me/api/portraits/women/22.jpg"
            },
            tags: ["트릭", "초급", "재미"],
            curriculum: [
              {
                id: 1,
                title: "손 내밀기 훈련",
                duration: "9:15",
                description: "반려견이 손을 내미는 귀여운 트릭",
                price: 0,
                isPurchased: true
              },
              {
                id: 2,
                title: "돌기 훈련",
                duration: "8:30",
                description: "반려견이 제자리에서 돌게 하는 트릭",
                price: 0,
                isPurchased: true
              },
              {
                id: 3,
                title: "하이파이브 훈련",
                duration: "11:00",
                description: "반려견과 하이파이브하는 인기 트릭",
                price: 0,
                isPurchased: true
              }
            ]
          },
          {
            id: 5,
            title: "반려견 사회화 훈련: 다른 강아지 만나기",
            description: "반려견이 다른 강아지들과 건강한 사회적 관계를 형성할 수 있도록 도와주는 방법을 알려드립니다.",
            thumbnail: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=500&q=80",
            duration: "42:10",
            level: "중급",
            isPremium: true,
            category: "사회화",
            views: 7850,
            rating: 4.7,
            reviews: 195,
            price: 20000,
            trainer: {
              name: "김사회",
              avatar: "https://randomuser.me/api/portraits/men/42.jpg"
            },
            tags: ["사회화", "중급", "강아지 만남"],
            curriculum: [
              {
                id: 1,
                title: "사회화의 중요성",
                duration: "10:30",
                description: "반려견 사회화가 필요한 이유",
                price: 0,
                isPurchased: false
              },
              {
                id: 2,
                title: "첫 만남 준비하기",
                duration: "15:45",
                description: "다른 강아지와의 첫 만남을 준비하는 방법",
                price: 8000,
                isPurchased: false
              },
              {
                id: 3,
                title: "문제 상황 대처법",
                duration: "15:55",
                description: "견주가 알아야 할 만남 시 주의사항",
                price: 12000,
                isPurchased: false
              }
            ]
          }
        ];
        
        setVideos(mockVideos);
        setFilteredVideos(mockVideos);
      } catch (error) {
        console.error("Failed to fetch videos:", error);
        toast({
          title: "데이터 로딩 실패",
          description: "영상 데이터를 불러오는데 실패했습니다. 다시 시도해주세요.",
          variant: "destructive",
        });
      }
    };
    
    fetchVideos();
  }, [toast]);
  
  // 비디오 미리보기 타이머 설정
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isPlaying && !isAuthenticated && selectedVideo?.isPremium) {
      timer = setInterval(() => {
        setElapsedTime(prev => {
          if (prev >= 60) { // 1분 후 미리보기 종료
            clearInterval(timer);
            setIsPlaying(false);
            setPreviewEnded(true);
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    }
    
    // 클린업 함수 (비디오 상세 정보 페이지를 나가면 타이머 정리)
    return () => clearInterval(timer);
  }, [isPlaying, isAuthenticated, selectedVideo]);
  
  // 필터링 로직
  useEffect(() => {
    let result = [...videos];
    
    // 탭 필터링
    if (activeTab !== "all") {
      result = result.filter(video => video.category === activeTab);
    }
    
    // 검색어 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        video => 
          video.title.toLowerCase().includes(query) ||
          video.description.toLowerCase().includes(query) ||
          video.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    setFilteredVideos(result);
  }, [videos, activeTab, searchQuery]);
  
  // 비디오 플레이어 이벤트 핸들러
  const handlePlayerReady = useCallback((videoElement: HTMLVideoElement) => {
    // 비디오 로드 이벤트 핸들러
    const handleLoadedMetadata = () => {
      setPlayerState(prev => ({
        ...prev,
        duration: videoElement.duration
      }));
    };
    
    // 비디오 타임 업데이트 핸들러
    const handleTimeUpdate = () => {
      setPlayerState(prev => ({
        ...prev,
        currentTime: videoElement.currentTime
      }));
      
      // 프리미엄 영상의 경우 1분 미리보기 후 종료
      if (!isAuthenticated && selectedVideo?.isPremium && videoElement.currentTime >= 60) {
        videoElement.pause();
        setIsPlaying(false);
        setPreviewEnded(true);
      }
    };
    
    // 비디오 종료 핸들러
    const handleEnded = () => {
      setPlayerState(prev => ({
        ...prev,
        playing: false,
        paused: true
      }));
      setIsPlaying(false);
    };
    
    // 이벤트 리스너 등록
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('ended', handleEnded);
    
    // 클린업 함수
    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('ended', handleEnded);
    };
  }, [isAuthenticated, selectedVideo]);
  
  // 비디오 재생 상태 변경 핸들러
  const handlePlayPause = useCallback(() => {
    setPlayerState(prev => ({
      ...prev,
      playing: !prev.playing,
      paused: !prev.paused
    }));
    setIsPlaying(prev => !prev);
  }, []);
  
  // 비디오 볼륨 변경 핸들러
  const handleVolumeChange = useCallback((volume: number) => {
    setPlayerState(prev => ({
      ...prev,
      volume,
      muted: volume === 0
    }));
  }, []);
  
  // 비디오 음소거 토글 핸들러
  const handleMute = useCallback(() => {
    setPlayerState(prev => ({
      ...prev,
      muted: !prev.muted,
      volume: prev.muted ? 1 : 0
    }));
  }, []);
  
  // 자막 토글 핸들러
  const handleSubtitles = useCallback(() => {
    setPlayerState(prev => ({
      ...prev,
      subtitles: !prev.subtitles
    }));
  }, []);
  
  // 비디오 탐색 핸들러
  const handleSeek = useCallback((time: number) => {
    setPlayerState(prev => ({
      ...prev,
      currentTime: time
    }));
  }, []);
  
  // 재생 속도 변경 핸들러
  const handlePlaybackRate = useCallback((rate: number) => {
    setPlayerState(prev => ({
      ...prev,
      playbackRate: rate
    }));
  }, []);
  
  // 컨트롤 표시 토글 핸들러
  const handleControlsVisibility = useCallback(() => {
    setPlayerState(prev => ({
      ...prev,
      controlsVisible: !prev.controlsVisible
    }));
  }, []);
  
  // 비디오 플레이어 열기
  const handleOpenPlayer = (video: Video) => {
    setSelectedVideo(video);
    setShowPlayer(true);
    setIsPlaying(true);
    setElapsedTime(0);
    
    // 프리미엄 콘텐츠 확인
    if (video.isPremium && !isAuthenticated) {
      // 비로그인 사용자에게는 1분 미리보기 후 로그인 유도
      const timer = setTimeout(() => {
        if (!isAuthenticated) {
          setShowPremiumAlert(true);
        }
      }, 1000);
      
      return () => clearInterval(timer);
    }
  };
  
  // 비디오 플레이어 닫기
  const handleClosePlayer = () => {
    setShowPlayer(false);
    setIsPlaying(false);
    setPreviewEnded(false);
  };
  
  // 로그인 페이지로 이동
  const handleGoToLogin = () => {
    setShowPremiumAlert(false);
    setLocation('/auth');
  };
  
  // 남은 시간 포맷팅
  const formatRemainingTime = () => {
    const remainingSeconds = 60 - elapsedTime;
    return `${Math.floor(remainingSeconds / 60)}:${(remainingSeconds % 60).toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      {/* 상단 배너 */}
      <div className="relative rounded-xl overflow-hidden h-48 md:h-64 mb-8 shadow-lg">
        <img 
          src="https://images.pexels.com/photos/3671300/pexels-photo-3671300.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=1920&h=600&q=80" 
          alt="영상 훈련"
          className="w-full h-full object-cover absolute"
          loading="eager"
        />
        
        <div className="relative h-full flex flex-col justify-center px-6 md:px-10 container mx-auto">
          <h1 className="text-primary dark:text-white text-xl md:text-3xl font-bold mb-2 md:mb-4 max-w-xl bg-white/90 dark:bg-gray-800/90 p-2 rounded-lg">
            영상 훈련 라이브러리
          </h1>
          <p className="text-gray-800 dark:text-gray-200 text-sm md:text-base max-w-xl mb-4 bg-white/90 dark:bg-gray-800/90 p-2 rounded-lg">
            반려견 훈련 전문가들이 제공하는 고품질 영상으로 언제 어디서나 효과적인 훈련을 경험하세요.
            {isAuthenticated ? " 지금 바로 프리미엄 강의를 구매하고 시청할 수 있습니다." : " 로그인하고 프리미엄 강의도 이용해보세요."}
          </p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="secondary" className="bg-white/90 text-primary hover:bg-white">
              500+ 무료 영상
            </Badge>
            <Badge variant="secondary" className="bg-white/90 text-primary hover:bg-white">
              인기 훈련사 강의
            </Badge>
            <Badge variant="secondary" className="bg-white/90 text-primary hover:bg-white">
              초보자 추천 코스
            </Badge>
          </div>
          
          {/* Search Bar */}
          <div className="max-w-lg bg-white dark:bg-gray-800 rounded-lg flex items-center p-1">
            <div className="px-2">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="원하는 훈련 과정이나 키워드로 검색하세요"
              className="flex-1 py-2 px-2 bg-transparent outline-none text-gray-700 dark:text-gray-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button variant="ghost" size="sm" className="mr-1">
              <Filter className="h-4 w-4 mr-1" />
              필터
            </Button>
          </div>
        </div>
      </div>
      
      {/* 메인 콘텐츠 */}
      <div className="container mx-auto mt-8">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <div className="mb-6">
            <TabsList className="grid grid-cols-5 sm:grid-cols-5 max-w-3xl">
              <TabsTrigger value="all">전체</TabsTrigger>
              <TabsTrigger value="기본 훈련">기본 훈련</TabsTrigger>
              <TabsTrigger value="산책 훈련">산책 훈련</TabsTrigger>
              <TabsTrigger value="문제행동">문제행동</TabsTrigger>
              <TabsTrigger value="트릭 훈련">트릭 훈련</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="all" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredVideos.map((video) => (
                <Card 
                  key={video.id} 
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleOpenPlayer(video)}
                >
                  <div className="relative aspect-video">
                    <img 
                      src={video.thumbnail} 
                      alt={video.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <div className="bg-primary rounded-full p-3">
                        <Play className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                      {video.duration}
                    </div>
                    {video.isPremium && (
                      <div className="absolute top-2 right-2 bg-warning text-white text-xs px-2 py-1 rounded-full flex items-center">
                        <Lock className="h-3 w-3 mr-1" />
                        프리미엄
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-start">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex-grow truncate mb-1">
                        {video.title}
                      </h3>
                    </div>
                    <div className="flex items-center mb-2">
                      <img
                        src={video.trainer.avatar}
                        alt={video.trainer.name}
                        className="h-6 w-6 rounded-full mr-2"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {video.trainer.name}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 h-10 mb-2">
                      {video.description}
                    </p>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-warning mr-1" />
                        <span className="text-sm">{video.rating}</span>
                        <span className="text-gray-500 dark:text-gray-400 text-xs ml-1">
                          ({video.reviews})
                        </span>
                      </div>
                      <Badge variant={video.level === '초급' ? 'outline' : video.level === '중급' ? 'secondary' : 'default'}>
                        {video.level}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          {['기본 훈련', '산책 훈련', '문제행동', '트릭 훈련', '사회화'].map((category) => (
            <TabsContent key={category} value={category} className="mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredVideos.map((video) => (
                  <Card 
                    key={video.id} 
                    className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleOpenPlayer(video)}
                  >
                    <div className="relative aspect-video">
                      <img 
                        src={video.thumbnail} 
                        alt={video.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <div className="bg-primary rounded-full p-3">
                          <Play className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                        {video.duration}
                      </div>
                      {video.isPremium && (
                        <div className="absolute top-2 right-2 bg-warning text-white text-xs px-2 py-1 rounded-full flex items-center">
                          <Lock className="h-3 w-3 mr-1" />
                          프리미엄
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4">
                      <div className="flex items-start">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex-grow truncate mb-1">
                          {video.title}
                        </h3>
                      </div>
                      <div className="flex items-center mb-2">
                        <img
                          src={video.trainer.avatar}
                          alt={video.trainer.name}
                          className="h-6 w-6 rounded-full mr-2"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {video.trainer.name}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 h-10 mb-2">
                        {video.description}
                      </p>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-warning mr-1" />
                          <span className="text-sm">{video.rating}</span>
                          <span className="text-gray-500 dark:text-gray-400 text-xs ml-1">
                            ({video.reviews})
                          </span>
                        </div>
                        <Badge variant={video.level === '초급' ? 'outline' : video.level === '중급' ? 'secondary' : 'default'}>
                          {video.level}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
      
      {/* 비디오 플레이어 모달 */}
      {showPlayer && selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold truncate">{selectedVideo.title}</h2>
              <Button variant="ghost" size="sm" onClick={handleClosePlayer}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </Button>
            </div>
            
            <div className="p-4">
              <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
                <VideoPlayer
                  videoUrl={selectedVideo.isPremium && !isAuthenticated ? "/api/videos/premium-preview.mp4" : `/api/videos/${selectedVideo.id}.mp4`}
                  poster={selectedVideo.thumbnail}
                  title={selectedVideo.title}
                  isPremium={selectedVideo.isPremium}
                  isPreviewMode={selectedVideo.isPremium && !isAuthenticated}
                  previewTimeLeft={selectedVideo.isPremium && !isAuthenticated ? Math.max(0, 60 - (playerState.currentTime || 0)) : 0}
                  onPreviewEnd={() => setPreviewEnded(true)}
                  purchased={isAuthenticated}
                  autoPlay={false}
                  onTimeUpdate={(currentTime) => {
                    setPlayerState(prev => ({ ...prev, currentTime }));
                  }}
                  showAutoSubtitleManager={true}
                />
                
                {previewEnded && selectedVideo.isPremium && !isAuthenticated && (
                  <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center text-white p-4">
                    <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                    <h3 className="text-xl font-bold mb-2">미리보기가 종료되었습니다</h3>
                    <p className="text-gray-300 text-center mb-4">
                      이 프리미엄 콘텐츠의 전체 영상을 시청하려면 로그인하고 구독을 시작하세요.
                    </p>
                    <Button onClick={handleGoToLogin}>
                      로그인하고 계속 시청하기
                    </Button>
                  </div>
                )}
                
                {selectedVideo.isPremium && !isAuthenticated && isPlaying && !previewEnded && (
                  <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white rounded-lg px-3 py-1 text-sm flex items-center">
                    <AlertCircle className="h-4 w-4 text-warning mr-1" />
                    미리보기 남은 시간: {formatRemainingTime()}
                  </div>
                )}
              </div>
              
              <div className="mt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <img
                      src={selectedVideo.trainer.avatar}
                      alt={selectedVideo.trainer.name}
                      className="h-10 w-10 rounded-full mr-3"
                    />
                    <div>
                      <p className="font-medium">{selectedVideo.trainer.name} 훈련사</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        조회수 {selectedVideo.views.toLocaleString()}회
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedVideo.level === '초급' ? 'outline' : selectedVideo.level === '중급' ? 'secondary' : 'default'}>
                      {selectedVideo.level}
                    </Badge>
                    {selectedVideo.isPremium && (
                      <Badge variant="default" className="bg-warning">
                        <Lock className="h-3 w-3 mr-1" />
                        프리미엄
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {selectedVideo.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                <div className="mt-4">
                  <h3 className="font-semibold text-lg mb-2">강의 설명</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedVideo.description}
                  </p>
                </div>
                
                <div className="mt-6">
                  <h3 className="font-semibold text-lg mb-4">커리큘럼</h3>
                  {selectedVideo.curriculum.map((item, index) => (
                    <div key={item.id} className="mb-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{index + 1}. {item.title}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {item.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">
                            {item.price > 0 ? `${item.price.toLocaleString()}원` : '무료'}
                          </div>
                          <div className="text-xs line-through text-gray-500">
                            {item.price > 0 && `${Math.round(item.price * 1.2).toLocaleString()}원`}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-2 flex justify-between items-center">
                        <Badge variant="outline" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {item.duration}
                        </Badge>
                        
                        {item.isPurchased || item.price === 0 ? (
                          <Button size="sm" variant="outline">
                            시청하기
                          </Button>
                        ) : (
                          <Button size="sm">
                            구매하기
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <div className="mt-4 p-3 bg-secondary/20 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">전체 강의 패키지</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          모든 챕터를 한 번에 구매하면 20% 할인
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">
                          {selectedVideo.price > 0 ? `${selectedVideo.price.toLocaleString()}원` : '무료'}
                        </div>
                        <div className="text-xs line-through text-gray-500">
                          {selectedVideo.price > 0 && `${Math.round(selectedVideo.price * 1.2).toLocaleString()}원`}
                        </div>
                      </div>
                    </div>
                    
                    {selectedVideo.price > 0 && (
                      <div className="mt-2 text-right">
                        <Button>전체 구매하기</Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 프리미엄 콘텐츠 알림 */}
      <AlertDialog open={showPremiumAlert} onOpenChange={setShowPremiumAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>프리미엄 콘텐츠</AlertDialogTitle>
            <AlertDialogDescription>
              이 콘텐츠는 프리미엄 회원만 이용할 수 있습니다. 로그인하고 구독을 시작하세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleGoToLogin}>
              로그인 페이지로 이동
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}