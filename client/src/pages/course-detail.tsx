import { useState, useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Clock, Calendar, CheckCircle, PlayCircle, List, Download, Share2, Bookmark, Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// 커리큘럼 타입 정의
interface Lesson {
  id: number;
  title: string;
  duration: string;
  preview: boolean;
  type: "video" | "document" | "quiz";
  description?: string;
}

interface Section {
  id: number;
  title: string;
  lessons: Lesson[];
}

export default function CourseDetail() {
  // URL에서 강의 ID 파라미터 가져오기
  const [match, params] = useRoute<{ id: string }>("/course/:id");
  // 다른 라우트 형식으로도 체크
  const [match2, params2] = useRoute<{ id: string }>("/course-detail/:id");
  // 경로 파라미터를 사용하여 courseId 추출
  const courseId = (match && params) ? parseInt(params.id) : (match2 && params2) ? parseInt(params2.id) : 1;
  
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("curriculum"); // 기본 탭을 커리큘럼으로 설정
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [activeVideo, setActiveVideo] = useState<Lesson | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(0);

  const handleSubmitReview = () => {
    if (reviewRating === 0) {
      toast({
        title: "별점을 선택해주세요",
        description: "리뷰 등록을 위해서는 별점을 선택해야 합니다.",
        variant: "destructive",
      });
      return;
    }
    
    if (!reviewText.trim()) {
      toast({
        title: "리뷰를 작성해주세요",
        description: "리뷰 내용을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "리뷰가 등록되었습니다",
      description: "소중한 의견 감사합니다!",
    });
    
    // 리뷰 초기화
    setReviewText("");
    setReviewRating(0);
    
    // 실제 API 호출 (추후 구현)
    // await apiRequest('/api/course-reviews', {
    //   method: 'POST',
    //   body: { courseId, rating: reviewRating, content: reviewText }
    // });
  };

  // 강의 정보 (실제로는 API에서 가져와야 함)
  const course = {
    id: courseId,
    title: "반려견 기초 훈련 마스터하기",
    description: "앉아, 기다려, 엎드려 등 기본 명령어부터 산책 예절까지 체계적으로 배우는 초보 견주 필수 코스입니다. 이 강의에서는 반려견과의 소통 방법부터 보상 기반 훈련 방법까지 다양한 기술을 배우게 됩니다. 전문 훈련사의 지도와 함께 실전 연습을 통해 자신감을 키우게 됩니다.",
    fullDescription: `반려견과의 행복한 생활을 위한 첫 단계, '반려견 기초 훈련 마스터하기'에 오신 것을 환영합니다!

이 강의는 반려견을 처음 맞이한 견주부터 기존 반려견의 훈련을 체계적으로 배우고 싶은 모든 분들을 위해 준비되었습니다.

▶ 이런 분들에게 추천합니다
- 반려견을 처음 맞이한 초보 견주
- 반려견과의 소통에 어려움을 겪고 계신 분
- 반려견 훈련의 기초를 체계적으로 배우고 싶은 분
- 산책 시 리드 당김, 짖음 등의 문제 행동으로 고민하시는 분

▶ 이 강의를 통해 배우게 됩니다
- 반려견의 심리와 행동 패턴 이해하기
- 효과적인 보상 기반 훈련 방법
- 기본 명령어(앉아, 기다려, 엎드려 등) 훈련법
- 산책 예절과 리드 훈련
- 문제 행동 예방과 해결 방법
- 일상 생활 속 지속적인 훈련 방법

▶ 강의 특징
- 전문 훈련사의 시연과 실습 중심의 교육
- 단계별로 난이도를 높여가는 체계적 커리큘럼
- 다양한 품종과 연령대의 반려견 훈련 사례 제공
- 견주-반려견 간 유대감 강화를 위한 팁 제공

훈련은 단순히 명령을 가르치는 것이 아닌, 반려견과의 소통과 유대를 강화하는 과정입니다. 이 강의와 함께 반려견과 더 깊은 이해와 신뢰를 바탕으로 한 관계를 만들어가세요.`,
    
    image: "https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=600",
    price: "89,000원",
    originalPrice: "120,000원",
    discount: "26%",
    trainer: {
      id: 123,
      name: "김훈련 트레이너",
      avatar: "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
      bio: "반려견 행동 전문가 | 대한반려동물협회 인증 트레이너 | 10년 경력",
      description: "안녕하세요, 반려견 행동 전문가 김훈련입니다. 저는 10년 이상 다양한 품종과 연령대의 반려견들을 훈련해왔으며, 특히 문제 행동 교정과 기초 훈련에 전문성을 갖고 있습니다. 대한반려동물협회 인증 트레이너로서 과학적이고 인도적인 훈련 방법을 추구합니다. 이 강의를 통해 여러분과 반려견 모두가 행복한 생활을 만들어가는 데 도움이 되길 바랍니다."
    },
    rating: 4.8,
    reviewCount: 45,
    studentCount: 320,
    lastUpdated: "2023년 8월 업데이트",
    totalHours: "12시간 30분",
    lectures: 28,
    level: "초급",
    category: "기본 훈련",
    tags: ["기초 훈련", "반려견 훈련", "명령어 훈련", "산책 예절", "행동 교정"],
    languages: ["한국어"],
    requirements: [
      "특별한 사전 지식은 필요하지 않습니다.",
      "3개월 이상의 반려견 (품종 무관)",
      "기본적인 훈련 도구 (리드줄, 간식, 클리커 등)"
    ],
    includes: [
      "28개의 상세 강의",
      "5개의 다운로드 가능한 학습 자료",
      "평생 접근 권한",
      "수료증 발급",
      "모바일 및 TV로 시청 가능"
    ],
    preview: "https://www.youtube.com/embed/dQw4w9WgXcQ" // 샘플 영상
  };

  // 커리큘럼 데이터
  const curriculum: Section[] = [
    {
      id: 1,
      title: "섹션 1: 기초 개념과 준비",
      lessons: [
        {
          id: 101,
          title: "강의 소개 및 개요",
          duration: "10:15",
          preview: true,
          type: "video",
          description: "이 강의의 전체 구성과 학습 방법에 대해 알아봅니다."
        },
        {
          id: 102,
          title: "반려견 행동의 이해",
          duration: "15:30",
          preview: false,
          type: "video",
          description: "반려견의 본능과 행동 패턴에 대한 기본적인 이해를 돕습니다."
        },
        {
          id: 103,
          title: "훈련에 필요한 준비물",
          duration: "12:45",
          preview: false,
          type: "video",
          description: "효과적인 훈련을 위해 필요한 도구들과 그 사용법을 알아봅니다."
        },
        {
          id: 104,
          title: "섹션 1 요약 자료",
          duration: "5분 분량",
          preview: false,
          type: "document",
          description: "1섹션의 중요 내용을 요약한 PDF 문서입니다."
        }
      ]
    },
    {
      id: 2,
      title: "섹션 2: 기본 명령어 훈련",
      lessons: [
        {
          id: 201,
          title: "앉아(Sit) 명령 훈련하기",
          duration: "18:20",
          preview: false,
          type: "video",
          description: "가장 기본적인 명령어인 '앉아'를 훈련하는 방법을 배웁니다."
        },
        {
          id: 202,
          title: "기다려(Stay) 명령 훈련하기",
          duration: "20:15",
          preview: false,
          type: "video",
          description: "반려견이 한 자리에서 기다리도록 하는 명령을 훈련합니다."
        },
        {
          id: 203,
          title: "엎드려(Down) 명령 훈련하기",
          duration: "16:30",
          preview: false,
          type: "video",
          description: "바닥에 엎드리는 명령에 대해 훈련하는 방법을 배웁니다."
        },
        {
          id: 204,
          title: "기본 명령어 연습 과제",
          duration: "10분 분량",
          preview: false,
          type: "document",
          description: "학습한 명령어를 연습할 수 있는 과제가 포함된 문서입니다."
        },
        {
          id: 205,
          title: "섹션 2 퀴즈",
          duration: "5분",
          preview: false,
          type: "quiz",
          description: "기본 명령어 훈련에 대한 이해도를 테스트합니다."
        }
      ]
    },
    {
      id: 3,
      title: "섹션 3: 산책 예절 훈련",
      lessons: [
        {
          id: 301,
          title: "올바른 리드 사용법",
          duration: "14:45",
          preview: false,
          type: "video",
          description: "산책 시 리드를 올바르게 사용하는 방법에 대해 배웁니다."
        },
        {
          id: 302,
          title: "당기지 않고 걷기 훈련",
          duration: "22:10",
          preview: false,
          type: "video",
          description: "반려견이 리드를 당기지 않고 걷는 방법을 훈련합니다."
        },
        {
          id: 303,
          title: "다른 반려견 만났을 때 대처법",
          duration: "19:50",
          preview: false,
          type: "video",
          description: "산책 중 다른 반려견을 만났을 때의 올바른 대처법을 배웁니다."
        }
      ]
    }
  ];

  // 모든 강의를 평면화해서 배열로 만들기
  const allLessons = curriculum.flatMap(section => section.lessons);

  useEffect(() => {
    // 실제로는 여기서 API 호출을 통해 강의 정보와 수강 여부를 가져와야 함
    setIsEnrolled(false); // 예시로 false로 설정
    
    // 기본 재생 영상 설정
    const previewLesson = allLessons.find(lesson => lesson.preview);
    if (previewLesson) {
      setActiveVideo(previewLesson);
    }
  }, [courseId]);

  // 강의 시청 핸들러 - 접근 권한 확인 및 사용자 경험 개선
  const handleWatchLesson = (lesson: Lesson) => {
    // 인증되지 않은 사용자가 비공개 강의를 보려고 할 때
    if (!isAuthenticated && !lesson.preview) {
      alert("이 강의를 시청하려면 로그인 후 수강 신청이 필요합니다.");
      return;
    }

    // 인증되었지만 수강 신청하지 않은 사용자가 비공개 강의를 보려고 할 때
    if (!isEnrolled && !lesson.preview) {
      alert("이 강의를 시청하려면 수강 신청이 필요합니다.");
      return;
    }

    // 현재 선택된 강의가 이미 활성화된 강의인 경우 스크롤만 진행
    if (activeVideo?.id === lesson.id) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 액티브 비디오 상태 업데이트
    setActiveVideo(lesson);
    
    // 상단 비디오 플레이어 영역으로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 상단 정보 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* 좌측: 비디오 플레이어 */}
        <div className="lg:col-span-2">
          <div className="bg-gray-900 aspect-video rounded-lg overflow-hidden mb-4">
            {activeVideo ? (
              <div className="w-full h-full">
                {activeVideo.preview ? (
                  <iframe 
                    src={course.preview} 
                    className="w-full h-full" 
                    title={activeVideo.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-white">
                    <PlayCircle className="w-16 h-16 mb-4" />
                    <p className="text-lg font-medium">{activeVideo.title}</p>
                    {!isAuthenticated || !isEnrolled ? (
                      <p className="mt-2 text-gray-400">수강 신청 후 시청 가능합니다</p>
                    ) : (
                      <p className="mt-2 text-gray-400">영상 재생 준비 중...</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-white">
                <p>영상을 선택해주세요</p>
              </div>
            )}
          </div>

          {/* 현재 선택된 강의 정보 */}
          {activeVideo && (
            <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-lg">{activeVideo.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    {activeVideo.type === 'video' ? '비디오' : activeVideo.type === 'document' ? '문서' : '퀴즈'} • {activeVideo.duration}
                  </p>
                </div>
                {activeVideo.preview && (
                  <Badge variant="info">미리보기</Badge>
                )}
              </div>
              {activeVideo.description && (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                  {activeVideo.description}
                </p>
              )}
            </div>
          )}

          {/* 탭 영역 */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="mb-4 border-b border-gray-200 dark:border-gray-700 w-full flex bg-transparent">
              <TabsTrigger value="overview" className="flex-1 rounded-none py-3">강의 소개</TabsTrigger>
              <TabsTrigger value="curriculum" className="flex-1 rounded-none py-3">커리큘럼</TabsTrigger>
              <TabsTrigger value="instructor" className="flex-1 rounded-none py-3">강사 소개</TabsTrigger>
              <TabsTrigger value="reviews" className="flex-1 rounded-none py-3">수강평</TabsTrigger>
            </TabsList>
            
            {/* 강의 소개 탭 */}
            <TabsContent value="overview" className="pt-4">
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">강의 소개</h2>
                <p className="whitespace-pre-line text-gray-700 dark:text-gray-300">
                  {course.fullDescription}
                </p>
                
                {/* 강의 정보 */}
                <div className="mt-8">
                  <h3 className="text-xl font-semibold mb-4">강의 정보</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-gray-500 mr-2" />
                      <span>총 수업 시간: {course.totalHours}</span>
                    </div>
                    <div className="flex items-center">
                      <List className="h-5 w-5 text-gray-500 mr-2" />
                      <span>총 {course.lectures}개 강의</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-gray-500 mr-2" />
                      <span>{course.lastUpdated}</span>
                    </div>
                    <div className="flex items-center">
                      <Badge variant={
                        course.level === "초급" ? "success" : 
                        course.level === "중급" ? "info" : "secondary"
                      }>
                        {course.level}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {/* 수강 대상 및 선수 조건 */}
                <div className="mt-8">
                  <h3 className="text-xl font-semibold mb-4">수강 전 준비사항</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    {course.requirements.map((req, index) => (
                      <li key={index} className="text-gray-700 dark:text-gray-300">{req}</li>
                    ))}
                  </ul>
                </div>
                
                {/* 강의 포함 내용 */}
                <div className="mt-8">
                  <h3 className="text-xl font-semibold mb-4">이 강의에 포함된 내용</h3>
                  <ul className="space-y-2">
                    {course.includes.map((item, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-primary mr-2" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* 강의 태그 */}
                <div className="mt-8">
                  <div className="flex flex-wrap gap-2">
                    {course.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* 커리큘럼 탭 */}
            <TabsContent value="curriculum" className="pt-4">
              <div>
                <h2 className="text-2xl font-bold mb-6">강의 커리큘럼</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  총 {curriculum.length}개 섹션, {allLessons.length}개 강의 ({course.totalHours})
                </p>
                
                <div className="space-y-4">
                  {curriculum.map((section) => (
                    <div key={section.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="font-semibold">{section.title}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {section.lessons.length}개 강의
                        </p>
                      </div>
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {section.lessons.map((lesson) => (
                          <div 
                            key={lesson.id} 
                            className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer flex items-center justify-between ${activeVideo?.id === lesson.id ? 'bg-primary/10 border-l-4 border-primary' : ''}`}
                            onClick={() => handleWatchLesson(lesson)}
                          >
                            <div className="flex items-center">
                              {lesson.type === 'video' ? (
                                <PlayCircle className="h-5 w-5 text-gray-500 mr-3" />
                              ) : lesson.type === 'document' ? (
                                <Download className="h-5 w-5 text-gray-500 mr-3" />
                              ) : (
                                <List className="h-5 w-5 text-gray-500 mr-3" />
                              )}
                              <div>
                                <p className="font-medium text-sm">{lesson.title}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {lesson.type === 'video' ? '비디오' : lesson.type === 'document' ? '문서' : '퀴즈'} • {lesson.duration}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center ml-2">
                              {lesson.preview && (
                                <Badge variant="info" className="text-xs">미리보기</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            {/* 강사 소개 탭 */}
            <TabsContent value="instructor" className="pt-4">
              <div>
                <h2 className="text-2xl font-bold mb-6">강사 소개</h2>
                <div className="flex items-start mb-6">
                  <Avatar className="w-16 h-16 rounded-full mr-4">
                    <AvatarImage src={course.trainer.avatar} alt={course.trainer.name} />
                    <AvatarFallback>{course.trainer.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold">{course.trainer.name}</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">{course.trainer.bio}</p>
                    <Link href={`/trainers/${course.trainer.id}`}>
                      <Button variant="link" className="p-0 h-auto mt-2 text-primary">
                        강사 프로필 보기
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="mt-6">
                  <p className="whitespace-pre-line text-gray-700 dark:text-gray-300">
                    {course.trainer.description}
                  </p>
                </div>
              </div>
            </TabsContent>
            
            {/* 수강평 탭 */}
            <TabsContent value="reviews" className="pt-4">
              <div>
                <h2 className="text-2xl font-bold mb-6">수강평</h2>
                <div className="flex items-center mb-8">
                  <div className="text-5xl font-bold mr-6">{course.rating}</div>
                  <div>
                    <div className="flex items-center mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${i < Math.floor(course.rating) ? 'text-warning fill-warning' : 'text-gray-300'}`}
                        />
                      ))}
                      <span className="ml-2 text-gray-600 dark:text-gray-300">
                        {course.rating} 점
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">
                      총 {course.reviewCount}개 수강평
                    </p>
                  </div>
                </div>
                
                {/* 수강평이 있으면 여기에 표시할 수 있음 */}
                <div className="mb-6 text-center text-gray-500 dark:text-gray-400">
                  <p>실제 수강생들의 리뷰가 표시됩니다.</p>
                </div>
                
                {isEnrolled && (
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-4">리뷰 작성하기</h3>
                    <textarea
                      className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      rows={4}
                      placeholder="이 강의에 대한 리뷰를 작성해주세요..."
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                    />
                    <div className="flex items-center mt-2">
                      <div className="flex mr-4">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-5 w-5 cursor-pointer ${
                              i < reviewRating ? 'text-warning fill-warning' : 'text-gray-300'
                            }`}
                            onClick={() => setReviewRating(i + 1)}
                          />
                        ))}
                      </div>
                      <Button 
                        className="ml-auto"
                        onClick={handleSubmitReview}
                        data-testid="button-submit-review"
                      >
                        리뷰 등록
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* 우측: 강의 정보 및 수강 신청 */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6 sticky top-20">
            <div className="mb-4">
              <div className="flex items-center">
                <span className="text-2xl font-bold text-primary">{course.price}</span>
                {course.originalPrice && (
                  <>
                    <span className="ml-2 text-gray-500 line-through text-sm">
                      {course.originalPrice}
                    </span>
                    <Badge variant="warning" className="ml-2">
                      {course.discount} 할인
                    </Badge>
                  </>
                )}
              </div>
            </div>
            
            {isAuthenticated ? (
              isEnrolled ? (
                <>
                  <Button className="w-full mb-3" variant="default">
                    이어서 학습하기
                  </Button>
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                    이미 수강 중인 강의입니다
                  </p>
                </>
              ) : (
                <>
                  <Button className="w-full mb-3" variant="default">
                    수강 신청하기
                  </Button>
                  <Button className="w-full mb-4" variant="outline">
                    장바구니에 추가
                  </Button>
                </>
              )
            ) : (
              <>
                <Button className="w-full mb-3" variant="default">
                  <Link href="/auth/login">로그인 후 수강 신청</Link>
                </Button>
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                  수강 신청을 위해 로그인이 필요합니다
                </p>
              </>
            )}
            
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
              30일 이내 환불 가능
            </p>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-gray-500 mr-2" />
                <span className="text-sm">총 강의 시간: {course.totalHours}</span>
              </div>
              <div className="flex items-center">
                <List className="h-5 w-5 text-gray-500 mr-2" />
                <span className="text-sm">총 {course.lectures}개 강의</span>
              </div>
              <div className="flex items-center">
                <Star className="h-5 w-5 text-gray-500 mr-2" />
                <span className="text-sm">평점: {course.rating} ({course.reviewCount}개 리뷰)</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-500 mr-2" />
                <span className="text-sm">{course.lastUpdated}</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-gray-500 mr-2" />
                <span className="text-sm">수강 인원: {course.studentCount}명</span>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between">
                <Button variant="ghost" size="sm" className="flex items-center">
                  <Heart className="h-4 w-4 mr-1" />
                  <span className="text-xs">찜하기</span>
                </Button>
                <Button variant="ghost" size="sm" className="flex items-center">
                  <Share2 className="h-4 w-4 mr-1" />
                  <span className="text-xs">공유하기</span>
                </Button>
                <Button variant="ghost" size="sm" className="flex items-center">
                  <Bookmark className="h-4 w-4 mr-1" />
                  <span className="text-xs">저장</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}