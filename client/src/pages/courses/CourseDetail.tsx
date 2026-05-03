import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Clock,
  Users,
  BookOpen,
  Star,
  CheckCircle,
  User,
  Calendar,
  Award,
  ShoppingCart,
  Heart,
  Share2,
  ChevronRight,
  Monitor
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Course {
  id: string;
  title: string;
  description: string;
  trainerId: string;
  trainerName: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  price: number;
  rating: number;
  enrollmentCount: number;
  modules: Module[];
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

interface Module {
  id: string;
  title: string;
  description: string;
  order: number;
  duration: number;
  objectives: string[];
  videos: Video[];
  isRequired: boolean;
}

interface Video {
  id: string;
  title: string;
  description: string;
  duration: number;
  thumbnailUrl?: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const [location] = useLocation();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  // URL에서 미리보기 모드인지 확인
  const isPreviewMode = location.includes('/preview');

  useEffect(() => {
    if (id) {
      fetchCourseDetail(id);
    }
  }, [id]);

  const fetchCourseDetail = async (courseId: string) => {
    try {
      // 먼저 커리큘럼에서 데이터를 가져오기 시도 (미리보기 모드일 경우)
      if (isPreviewMode) {
        const curriculumResponse = await fetch(`/api/public/curriculums`);
        if (curriculumResponse.ok) {
          const curriculumsData = await curriculumResponse.json();
          const curriculum = curriculumsData.curriculums.find((c: any) => c.id === courseId);
          
          if (curriculum) {
            // 커리큘럼 데이터를 강의 형식으로 변환
            const courseData: Course = {
              ...curriculum,
              rating: 4.8,
              enrollmentCount: 0,
              status: 'published'
            };
            setCourse(courseData);
            setLoading(false);
            return;
          }
        }
      }

      // 일반 강의 조회
      const response = await fetch(`/api/courses/${courseId}`);
      if (response.ok) {
        const courseData = await response.json();
        setCourse(courseData);
      } else {
        throw new Error('강의를 찾을 수 없습니다');
      }
    } catch (error) {
      console.error('강의 상세 조회 실패:', error);
      toast({
        title: "오류",
        description: "강의 정보를 불러올 수 없습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollment = (testMode = false) => {
    if (!course) return;

    // 결제 페이지로 이동 (테스트 모드 옵션 포함)
    const checkoutUrl = `/checkout?courseId=${course.id}&type=course${testMode ? '&test=true' : ''}`;
    window.location.href = checkoutUrl;
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '초급';
      case 'intermediate': return '중급';
      case 'advanced': return '고급';
      default: return difficulty;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'danger';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">강의를 찾을 수 없습니다</h2>
          <p className="text-muted-foreground">요청하신 강의가 존재하지 않거나 삭제되었습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 미리보기 모드 배너 */}
      {isPreviewMode && (
        <div className="bg-primary text-white py-2 px-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              <span className="font-medium">미리보기 모드</span>
              <span className="text-primary/70">실제 강의 페이지가 아닙니다</span>
            </div>
            <Button
              onClick={() => window.close()}
              variant="outline"
              size="sm"
              className="border-white text-white hover:bg-primary"
            >
              닫기
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto p-6">
        {/* 강의 헤더 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* 강의 정보 */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant={getDifficultyColor(course.difficulty)}>
                {getDifficultyLabel(course.difficulty)}
              </Badge>
              <Badge variant="outline">{course.category}</Badge>
            </div>
            
            <h1 className="text-3xl font-bold mb-4">{course.title}</h1>
            <p className="text-lg text-muted-foreground mb-6">{course.description}</p>
            
            <div className="flex items-center gap-6 mb-6">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-gray-500" />
                <span className="font-medium">{course.trainerName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-500" />
                <span>{Math.floor(course.duration / 60)}시간 {course.duration % 60}분</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-500" />
                <span>{course.enrollmentCount}명 수강중</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-warning" />
                <span>{course.rating}/5.0</span>
              </div>
            </div>

            {/* 탭 네비게이션 */}
            <div className="border-b">
              <div className="flex gap-8">
                {[
                  { id: 'overview', label: '개요' },
                  { id: 'curriculum', label: '커리큘럼' },
                  { id: 'instructor', label: '강사소개' },
                  { id: 'reviews', label: '수강후기' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`pb-4 font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 구매 카드 */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-primary mb-2">
                    ₩{course.price.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    평생 수강 가능
                  </div>
                </div>

                {!isPreviewMode && (
                  <div className="space-y-3">
                    <Button
                      onClick={() => handleEnrollment(false)}
                      className="w-full"
                      size="lg"
                      disabled={isEnrolled}
                    >
                      {isEnrolled ? (
                        <>
                          <CheckCircle className="w-5 h-5 mr-2" />
                          수강중
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-5 h-5 mr-2" />
                          지금 수강하기
                        </>
                      )}
                    </Button>
                    
                    {!isEnrolled && (
                      <Button
                        onClick={() => handleEnrollment(true)}
                        variant="outline"
                        className="w-full text-sm"
                        size="sm"
                      >
                        🧪 테스트 결제 (100원)
                      </Button>
                    )}
                  </div>
                )}

                {isPreviewMode && (
                  <div className="p-4 bg-primary/10 rounded-lg mb-4">
                    <p className="text-sm text-primary text-center">
                      미리보기 모드에서는 구매할 수 없습니다
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Heart className="w-4 h-4 mr-1" />
                    찜하기
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Share2 className="w-4 h-4 mr-1" />
                    공유
                  </Button>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">강의 수준</span>
                    <span className="font-medium">{getDifficultyLabel(course.difficulty)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">총 강의 시간</span>
                    <span className="font-medium">{Math.floor(course.duration / 60)}시간 {course.duration % 60}분</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">모듈 수</span>
                    <span className="font-medium">{course.modules.length}개</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">수료증</span>
                    <span className="font-medium flex items-center">
                      <Award className="w-4 h-4 mr-1" />
                      발급
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 탭 콘텐츠 */}
        <div className="lg:col-span-2">
          {activeTab === 'overview' && (
            <Card>
              <CardHeader>
                <CardTitle>강의 소개</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-gray-700 leading-relaxed">{course.description}</p>
                  
                  <div>
                    <h4 className="font-medium mb-2">이 강의에서 배우는 내용</h4>
                    <ul className="space-y-2">
                      {course.modules.slice(0, 3).map((module, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{module.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'curriculum' && (
            <Card>
              <CardHeader>
                <CardTitle>커리큘럼</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {course.modules.map((module, index) => (
                    <div key={module.id} className="border rounded-lg">
                      <div className="p-4 bg-gray-50 border-b">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{module.title}</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock className="w-4 h-4" />
                            <span>{module.duration}분</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                      </div>
                      
                      {module.videos && module.videos.length > 0 && (
                        <div className="p-4">
                          <div className="space-y-2">
                            {module.videos.map((video, videoIndex) => (
                              <div key={video.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                                <div className="flex items-center gap-3">
                                  <Play className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm">{video.title}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <span>{video.duration}분</span>
                                  <ChevronRight className="w-4 h-4" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'instructor' && (
            <Card>
              <CardHeader>
                <CardTitle>강사 소개</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-lg mb-2">{course.trainerName}</h4>
                    <p className="text-gray-700 mb-4">
                      전문 반려견 훈련사로 10년 이상의 경험을 보유하고 있습니다. 
                      다양한 견종과 성격의 반려견들과 함께 작업하며 쌓은 노하우를 통해 
                      효과적이고 체계적인 훈련 방법을 제공합니다.
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        <span>15개 강의</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>1,200명 수강생</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4" />
                        <span>4.9점 평점</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'reviews' && (
            <Card>
              <CardHeader>
                <CardTitle>수강후기</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-gray-500">아직 등록된 수강후기가 없습니다.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}