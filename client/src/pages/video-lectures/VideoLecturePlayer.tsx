import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useEngagementTracking } from '@/hooks/use-engagement-tracking';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Settings,
  ThumbsUp,
  ThumbsDown,
  Share,
  BookOpen,
  Clock,
  Users,
  Star,
  ChevronDown,
  ChevronUp,
  Download,
  PlayCircle
} from 'lucide-react';

interface VideoModule {
  id: string;
  title: string;
  description: string;
  duration: number;
  videoUrl: string;
  thumbnailUrl: string;
  order: number;
  isCompleted: boolean;
  isFree: boolean;
}

interface VideoLecture {
  id: string;
  title: string;
  instructor: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  rating: number;
  reviewCount: number;
  studentCount: number;
  totalDuration: number;
  modules: VideoModule[];
  isPurchased: boolean;
  progress: number;
  lastWatchedModule?: string;
}

interface RelatedVideo {
  id: string;
  title: string;
  instructor: string;
  thumbnailUrl: string;
  duration: number;
  viewCount: number;
  rating: number;
  isPurchased: boolean;
  price?: number;
}

const VideoLecturePlayer: React.FC = () => {
  const [currentLecture, setCurrentLecture] = useState<VideoLecture | null>(null);
  const [currentModule, setCurrentModule] = useState<VideoModule | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<RelatedVideo[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showDescription, setShowDescription] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const { toast } = useToast();
  
  const { 
    recordView, 
    recordLike, 
    recordShare,
    startWatchTracking, 
    pauseWatchTracking 
  } = useEngagementTracking({
    targetType: 'video',
    targetId: currentModule?.id,
  });

  useEffect(() => {
    loadCurrentLecture();
    loadRelatedVideos();
  }, []);
  
  useEffect(() => {
    if (currentModule) {
      recordView();
    }
  }, [currentModule, recordView]);
  
  useEffect(() => {
    if (isPlaying) {
      startWatchTracking();
    } else {
      pauseWatchTracking();
    }
  }, [isPlaying, startWatchTracking, pauseWatchTracking]);

  const loadCurrentLecture = () => {
    // 샘플 데이터 - 실제로는 API에서 가져옴
    const sampleLecture: VideoLecture = {
      id: 'lecture-1',
      title: '반려동물 재활 전문과정 - 1강: 오리엔테이션',
      instructor: '한성규',
      description: `이 강의는 반려동물 재활의 기본 개념과 전체 과정에 대한 개요를 다룹니다.

주요 내용:
• 반려동물 재활의 정의와 중요성
• 재활 치료의 다양한 접근법
• 강의 전체 구성과 학습 목표
• 전문가로서의 마음가짐과 윤리

이 과정을 통해 반려동물 재활 전문가로서의 기초를 다지고, 체계적인 재활 프로그램을 설계할 수 있는 능력을 기를 수 있습니다.`,
      category: '재활치료',
      difficulty: 'advanced',
      rating: 4.9,
      reviewCount: 156,
      studentCount: 289,
      totalDuration: 900,
      modules: [
        {
          id: 'module-1',
          title: '1강: 오리엔테이션 (OT)',
          description: '강의 내용 개요 및 반려동물 재활의 기본 개념',
          duration: 45,
          videoUrl: '/videos/rehab-01-orientation.mp4',
          thumbnailUrl: '/images/video-thumbs/rehab-01.jpg',
          order: 1,
          isCompleted: false,
          isFree: true
        },
        {
          id: 'module-2',
          title: '2강: 초기평가',
          description: '재활 대상 동물의 초기 상태 평가 방법',
          duration: 60,
          videoUrl: '/videos/rehab-02-assessment.mp4',
          thumbnailUrl: '/images/video-thumbs/rehab-02.jpg',
          order: 2,
          isCompleted: false,
          isFree: false
        },
        {
          id: 'module-3',
          title: '3강: 통증평가',
          description: '동물의 통증 수준 평가 및 관리 방법',
          duration: 55,
          videoUrl: '/videos/rehab-03-pain.mp4',
          thumbnailUrl: '/images/video-thumbs/rehab-03.jpg',
          order: 3,
          isCompleted: false,
          isFree: false
        }
      ],
      isPurchased: true,
      progress: 15,
      lastWatchedModule: 'module-1'
    };

    setCurrentLecture(sampleLecture);
    setCurrentModule(sampleLecture.modules[0]);
  };

  const loadRelatedVideos = () => {
    // 샘플 관련 영상 데이터
    const sampleRelated: RelatedVideo[] = [
      {
        id: 'related-1',
        title: '반려견 기본 훈련 마스터 클래스',
        instructor: '김훈련사',
        thumbnailUrl: '/images/video-thumbs/basic-training.jpg',
        duration: 180,
        viewCount: 1250,
        rating: 4.7,
        isPurchased: false,
        price: 89000
      },
      {
        id: 'related-2',
        title: '문제행동 교정 전문과정',
        instructor: '박전문가',
        thumbnailUrl: '/images/video-thumbs/behavior-correction.jpg',
        duration: 240,
        viewCount: 890,
        rating: 4.8,
        isPurchased: true
      },
      {
        id: 'related-3',
        title: '반려견 운동재활 실습',
        instructor: '이재활사',
        thumbnailUrl: '/images/video-thumbs/exercise-rehab.jpg',
        duration: 150,
        viewCount: 567,
        rating: 4.6,
        isPurchased: false,
        price: 120000
      },
      {
        id: 'related-4',
        title: '노령견 케어 가이드',
        instructor: '최수의사',
        thumbnailUrl: '/images/video-thumbs/senior-care.jpg',
        duration: 90,
        viewCount: 2340,
        rating: 4.9,
        isPurchased: false,
        price: 65000
      },
      {
        id: 'related-5',
        title: '펫 마사지 테라피',
        instructor: '정테라피스트',
        thumbnailUrl: '/images/video-thumbs/pet-massage.jpg',
        duration: 120,
        viewCount: 445,
        rating: 4.5,
        isPurchased: false,
        price: 75000
      }
    ];

    setRelatedVideos(sampleRelated);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}:${mins.toString().padStart(2, '0')}` : `${mins}분`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleModuleSelect = (module: VideoModule) => {
    if (!module.isFree && !currentLecture?.isPurchased) {
      toast({
        title: "구매 필요",
        description: "이 강의를 시청하려면 먼저 구매해주세요.",
        variant: "destructive"
      });
      return;
    }
    setCurrentModule(module);
  };

  const handleLike = () => {
    if (!liked) {
      recordLike();
    }
    setLiked(!liked);
    if (disliked) setDisliked(false);
  };

  const handleDislike = () => {
    setDisliked(!disliked);
    if (liked) setLiked(false);
  };

  const handleRelatedVideoClick = (video: RelatedVideo) => {
    if (!video.isPurchased && video.price) {
      toast({
        title: "구매 필요",
        description: `이 강의를 시청하려면 ₩${video.price.toLocaleString()}에 구매해주세요.`,
        variant: "destructive"
      });
      return;
    }
    
    // 관련 영상 클릭 시 해당 강의로 이동
    toast({
      title: "강의 로딩",
      description: `${video.title} 강의를 로딩합니다.`,
    });
  };

  if (!currentLecture || !currentModule) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 메인 비디오 플레이어 영역 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 비디오 플레이어 */}
            <Card className="overflow-hidden">
              <div className="relative bg-black aspect-video">
                {/* 비디오 플레이어 컨트롤 오버레이 */}
                <div className="absolute inset-0 bg-black flex items-center justify-center">
                  <div className="text-white text-center">
                    <PlayCircle className="w-16 h-16 mx-auto mb-4 opacity-70" />
                    <p className="text-lg font-medium">{currentModule.title}</p>
                    <p className="text-sm opacity-70">클릭하여 재생</p>
                  </div>
                </div>
                
                {/* 비디오 컨트롤 바 */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <div className="flex items-center gap-4 text-white">
                    <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </Button>
                    <div className="flex-1">
                      <Progress value={(currentTime / duration) * 100} className="h-1" />
                    </div>
                    <span className="text-xs">{formatTime(currentTime)} / {formatTime(duration)}</span>
                    <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                      <Maximize className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* 강의 정보 */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h1 className="text-2xl font-bold mb-2">{currentModule.title}</h1>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="font-medium">{currentLecture.instructor}</span>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{currentLecture.studentCount.toLocaleString()}명 수강</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-warning" />
                        <span>{currentLecture.rating}</span>
                        <span>({currentLecture.reviewCount})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatDuration(currentModule.duration)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 액션 버튼들 */}
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant={liked ? "default" : "outline"}
                      onClick={handleLike}
                    >
                      <ThumbsUp className="w-4 h-4 mr-1" />
                      좋아요
                    </Button>
                    <Button 
                      size="sm" 
                      variant={disliked ? "default" : "outline"}
                      onClick={handleDislike}
                    >
                      <ThumbsDown className="w-4 h-4 mr-1" />
                      싫어요
                    </Button>
                    <Button size="sm" variant="outline">
                      <Share className="w-4 h-4 mr-1" />
                      공유
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-1" />
                      자료
                    </Button>
                  </div>

                  {/* 강의 설명 */}
                  <div>
                    <Button 
                      variant="ghost" 
                      onClick={() => setShowDescription(!showDescription)}
                      className="flex items-center gap-2 p-0 h-auto font-medium"
                    >
                      설명 보기
                      {showDescription ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                    
                    {showDescription && (
                      <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm leading-relaxed whitespace-pre-line">
                          {currentModule.description}
                        </p>
                        <div className="mt-4 pt-4 border-t">
                          <h4 className="font-medium mb-2">전체 강의 정보</h4>
                          <p className="text-sm text-gray-600 whitespace-pre-line">
                            {currentLecture.description}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 강의 모듈 리스트 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  강의 목차 ({currentLecture.modules.length}강)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-0">
                  {currentLecture.modules.map((module, index) => (
                    <div
                      key={module.id}
                      className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                        currentModule.id === module.id ? 'bg-primary/10 border-l-4 border-l-blue-500' : ''
                      }`}
                      onClick={() => handleModuleSelect(module)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium">{module.title}</h4>
                              <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {!module.isFree && !currentLecture.isPurchased && (
                            <Badge variant="outline" className="text-xs">유료</Badge>
                          )}
                          {module.isFree && (
                            <Badge variant="secondary" className="text-xs">무료</Badge>
                          )}
                          <span className="text-xs text-gray-500">{formatDuration(module.duration)}</span>
                          <PlayCircle className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 관련 영상 사이드바 */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-lg">관련 영상</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-0 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {relatedVideos.map((video) => (
                    <div
                      key={video.id}
                      className="p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleRelatedVideoClick(video)}
                    >
                      <div className="space-y-3">
                        {/* 썸네일 영역 */}
                        <div className="relative">
                          <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                            <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                              <PlayCircle className="w-8 h-8 text-white opacity-70" />
                            </div>
                          </div>
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                            {formatDuration(video.duration)}
                          </div>
                          {!video.isPurchased && video.price && (
                            <div className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded">
                              ₩{video.price.toLocaleString()}
                            </div>
                          )}
                        </div>

                        {/* 영상 정보 */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm leading-tight line-clamp-2">
                            {video.title}
                          </h4>
                          <p className="text-xs text-gray-600">{video.instructor}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{video.viewCount.toLocaleString()}회 시청</span>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-warning" />
                              <span>{video.rating}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoLecturePlayer;