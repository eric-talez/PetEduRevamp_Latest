import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Clock,
  Download,
  Lock,
  Play,
  Share2,
  Star,
  ThumbsUp,
  BookOpen,
  List,
  AlertCircle
} from "lucide-react";
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

// 영상 데이터
const videos = [
  {
    id: 1,
    title: "반려견 기본 훈련: 앉아, 엎드려",
    description: "가장 기본적인 반려견 훈련 명령어인 '앉아'와 '엎드려'를 효과적으로 가르치는 방법을 알아봅니다.",
    fullDescription: `이 강의에서는 반려견에게 기본 명령어를 가르치는 방법에 대해 심층적으로 다룹니다. 
    
    반려견과의 소통에서 가장 기본이 되는 '앉아'와 '엎드려' 명령어를 가르치면 훈련의 기초를 다질 수 있을 뿐만 아니라, 더 복잡한 기술로 나아가기 위한 토대를 마련할 수 있습니다.

    이 강의에서 다루는 내용:
    - 올바른 보상 타이밍의 중요성
    - 명령어와 함께 사용하는 손신호 교육 방법
    - 다양한 환경에서의 명령어 일반화 방법
    - 흔히 발생하는 실수와 해결 방법

    초보 견주부터 경험이 있는 견주까지 모두에게 유용한 내용으로 구성되어 있습니다.`,
    thumbnail: "https://images.unsplash.com/photo-1541599540903-216a46ca1dc0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=600",
    videoUrl: "#",
    duration: "15:20",
    level: "입문",
    isPremium: false,
    category: "기본 훈련",
    views: 12500,
    likes: 876,
    rating: 4.8,
    reviews: 342,
    publishedAt: "2023-05-15",
    trainer: {
      id: 1,
      name: "김훈련",
      avatar: "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200",
      title: "수석 훈련사",
      courses: 15,
      students: 2800,
    },
    tags: ["기본 명령어", "입문", "누구나"],
    chapters: [
      { title: "소개 및 사전 준비", time: "00:00" },
      { title: "'앉아' 명령어 가르치기", time: "02:35" },
      { title: "'엎드려' 명령어 가르치기", time: "07:15" },
      { title: "두 명령어 연속 연습하기", time: "10:50" },
      { title: "실전 상황에서의 적용", time: "13:25" },
    ]
  },
  {
    id: 2,
    title: "강아지 사회화 훈련: 다른 강아지와 만나기",
    description: "반려견이 다른 강아지들과 편안하게 어울릴 수 있도록 사회화 훈련을 시키는 방법을 알려드립니다.",
    fullDescription: `이 프리미엄 강의에서는 반려견의 사회화에 중요한 부분인 다른 강아지와의 만남을 어떻게 준비하고 진행할지 상세하게 알려드립니다.

    많은 반려견들이 다른 강아지를 만날 때 과도한 흥분이나 공격성, 또는 두려움을 보이는 경우가 있습니다. 이 강의는 이러한 문제를 예방하고 건강한 사회화를 돕기 위한 전문적인 가이드를 제공합니다.

    강의 내용:
    - 반려견 첫 만남의 심리학
    - 초기 사회화 단계별 접근법
    - 문제 행동 발생 시 대처 방법
    - 반려견 공원에서의 올바른 에티켓
    - 장기적인 사회화 훈련 계획

    이 강의는 새로운 강아지를 입양한 가정부터 사회화에 어려움을 겪고 있는 성견의 보호자까지 모두에게 가치 있는 정보를 제공합니다.`,
    thumbnail: "https://images.unsplash.com/photo-1556866261-8c2924c595e6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=600",
    videoUrl: "#",
    duration: "23:45",
    level: "중급",
    isPremium: true,
    category: "사회화",
    views: 8700,
    likes: 542,
    rating: 4.7,
    reviews: 215,
    publishedAt: "2023-08-22",
    trainer: {
      id: 3,
      name: "이사회",
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200",
      title: "사회화 전문 훈련사",
      courses: 8,
      students: 1500,
    },
    tags: ["사회화", "만남", "행동 교정"],
    chapters: [
      { title: "사회화의 중요성 이해하기", time: "00:00" },
      { title: "사회화의 적절한 시기와 방법", time: "03:15" },
      { title: "첫 만남 준비와 장소 선택", time: "07:40" },
      { title: "만남 중 보호자의 역할", time: "12:20" },
      { title: "흔한 문제와 해결 방법", time: "16:45" },
      { title: "사회화 훈련 계속하기", time: "20:10" },
    ]
  }
];

export default function VideoDetailPage() {
  const [, params] = useRoute("/video-training/:id");
  const videoId = parseInt(params?.id || "1");
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [previewEnded, setPreviewEnded] = useState(false);
  const [showLoginAlert, setShowLoginAlert] = useState(false);

  // 현재 영상 정보
  const video = videos.find(v => v.id === videoId) || videos[0];

  useEffect(() => {
    // 재생 버튼 클릭 시 실행
    if (isPlaying) {
      // 유료 영상이고 로그인하지 않은 경우 1분 타이머 시작
      if (video.isPremium && !isAuthenticated) {
        const timer = setInterval(() => {
          setElapsedTime(prev => {
            const newTime = prev + 1;
            if (newTime >= 60) { // 60초(1분) 후 프리뷰 종료
              clearInterval(timer);
              setPreviewEnded(true);
              return 60;
            }
            return newTime;
          });
        }, 1000);

        return () => clearInterval(timer);
      }
    }
  }, [isPlaying, video.isPremium, isAuthenticated]);

  // 로그인 페이지로 이동
  const handleGoToLogin = () => {
    setShowLoginAlert(false);
    setLocation('/auth');
  };

  // 뒤로가기
  const handleGoBack = () => {
    setLocation('/video-training');
  };

  // 영상 재생
  const handlePlayVideo = () => {
    setIsPlaying(true);
    setPreviewEnded(false);
    setElapsedTime(0);
  };

  // 남은 시간 포맷팅
  const formatRemainingTime = () => {
    const remainingSeconds = 60 - elapsedTime;
    return `${Math.floor(remainingSeconds / 60)}:${(remainingSeconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="container py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={handleGoBack} className="mr-2">
          <ArrowLeft className="mr-1 h-4 w-4" /> 뒤로
        </Button>
        <div>
          <h1 className="text-xl font-bold">{video.title}</h1>
          <div className="flex items-center text-sm text-gray-500">
            <span className="flex items-center mr-3">
              <Star className="h-4 w-4 text-warning fill-warning mr-1" />
              {video.rating} ({video.reviews} 리뷰)
            </span>
            <span className="flex items-center mr-3">
              <ThumbsUp className="h-4 w-4 mr-1" />
              {video.likes}
            </span>
            <span className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {video.duration}
            </span>
          </div>
        </div>
      </div>

      {/* 비디오 플레이어 */}
      <div className="mb-8">
        <div className="relative rounded-lg overflow-hidden">
          <div className="aspect-video bg-gray-900 flex items-center justify-center">
            {!isPlaying ? (
              // 영상 재생 전 썸네일 표시
              <div className="relative w-full">
                <img 
                  src={video.thumbnail} 
                  alt={video.title} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                  <Button 
                    size="lg" 
                    className="rounded-full h-16 w-16 flex items-center justify-center"
                    onClick={handlePlayVideo}
                  >
                    <Play size={24} />
                  </Button>
                </div>
                {video.isPremium && (
                  <Badge variant="warning" className="absolute top-4 right-4 shadow-sm">
                    <Lock size={12} className="mr-1" />
                    프리미엄
                  </Badge>
                )}
              </div>
            ) : (
              // 영상 재생 화면
              <div className="relative w-full h-full">
                <img 
                  src={video.thumbnail} 
                  alt={video.title} 
                  className="w-full h-full object-cover"
                />
                
                {/* 프리미엄 비로그인 시간 제한 표시 */}
                {video.isPremium && !isAuthenticated && (
                  <div className="absolute top-4 right-4 bg-gray-900 bg-opacity-80 rounded px-3 py-1 text-white flex items-center">
                    {previewEnded ? (
                      <AlertCircle size={14} className="mr-1 text-warning" />
                    ) : (
                      <span className="mr-1">미리보기</span>
                    )}
                    {previewEnded ? "미리보기 종료" : formatRemainingTime()}
                  </div>
                )}
                
                {/* 미리보기 종료 오버레이 */}
                {video.isPremium && !isAuthenticated && previewEnded && (
                  <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center text-center p-6">
                    <Lock size={40} className="text-warning mb-3" />
                    <h2 className="text-white text-2xl font-bold mb-2">미리보기가 종료되었습니다</h2>
                    <p className="text-gray-300 mb-6 max-w-xl">
                      <span className="text-warning font-bold block mb-2">로그인 후 결제가 필요한 서비스입니다.</span>
                      이 프리미엄 영상의 나머지 부분을 시청하려면 로그인하고 멤버십에 가입하세요.
                      회원이 되면 모든 프리미엄 콘텐츠에 제한 없이 접근할 수 있습니다.
                    </p>
                    <div className="flex gap-4">
                      <Button size="lg" onClick={handleGoToLogin}>
                        로그인하기
                      </Button>
                      <Button size="lg" variant="outline" onClick={() => setIsPlaying(false)}>
                        닫기
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 컨텐츠 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* 비디오 정보 */}
          <div className="mb-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex gap-2 mb-3">
                  <Badge>{video.category}</Badge>
                  <Badge variant="outline">{video.level}</Badge>
                  {video.isPremium && (
                    <Badge variant="warning">
                      <Lock size={12} className="mr-1" />
                      프리미엄
                    </Badge>
                  )}
                </div>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                  {video.fullDescription}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {video.tags.map((tag, index) => (
                <Badge key={index} variant="secondary">#{tag}</Badge>
              ))}
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex flex-wrap gap-3 mb-8">
            <Button variant="outline" className="flex items-center">
              <ThumbsUp className="mr-2 h-4 w-4" />
              좋아요
            </Button>
            <Button variant="outline" className="flex items-center">
              <Share2 className="mr-2 h-4 w-4" />
              공유하기
            </Button>
            <Button variant="outline" className="flex items-center">
              <BookOpen className="mr-2 h-4 w-4" />
              노트 작성
            </Button>
            {!video.isPremium && (
              <Button variant="outline" className="flex items-center">
                <Download className="mr-2 h-4 w-4" />
                다운로드
              </Button>
            )}
          </div>
          
          {/* 트레이너 정보 */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-8">
            <div className="flex items-start">
              <img 
                src={video.trainer.avatar} 
                alt={video.trainer.name} 
                className="w-16 h-16 rounded-full object-cover mr-4"
              />
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">{video.trainer.name}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{video.trainer.title}</p>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                  <span className="mr-3">{video.trainer.courses} 강의</span>
                  <span>{video.trainer.students.toLocaleString()} 수강생</span>
                </div>
                <Button size="sm">훈련사 프로필</Button>
              </div>
            </div>
          </div>
        </div>

        {/* 사이드바 영역 */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center">
                <List className="h-5 w-5 mr-2" />
                강의 구성
              </h3>
              <span className="text-sm text-gray-500">{video.duration}</span>
            </div>
            
            <div className="space-y-3">
              {video.chapters.map((chapter, index) => (
                <div 
                  key={index} 
                  className="flex justify-between items-center p-3 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <div className="flex items-start">
                    <div className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-3 shrink-0">
                      {index + 1}
                    </div>
                    <span className="text-sm">{chapter.title}</span>
                  </div>
                  <span className="text-xs text-gray-500">{chapter.time}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-6">
              {video.isPremium && !isAuthenticated ? (
                <Button className="w-full" onClick={() => setShowLoginAlert(true)}>
                  <Lock className="mr-2 h-4 w-4" />
                  프리미엄 멤버십 가입하기
                </Button>
              ) : (
                <Button className="w-full" onClick={handlePlayVideo}>
                  <Play className="mr-2 h-4 w-4" />
                  {isPlaying ? "다시 재생" : "재생하기"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 로그인 안내 알림 */}
      <AlertDialog open={showLoginAlert} onOpenChange={setShowLoginAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <Lock className="h-5 w-5 text-warning mr-2" />
              프리미엄 멤버십 필요
            </AlertDialogTitle>
            <AlertDialogDescription>
              이 강의의 전체 내용을 보려면 로그인하고 프리미엄 멤버십에 가입해야 합니다.
              지금 로그인하여 1분 미리보기를 확인하거나 멤버십에 가입하세요.
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