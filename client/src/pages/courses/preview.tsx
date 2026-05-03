import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Play, 
  Clock, 
  Users, 
  Star, 
  BookOpen, 
  ChevronRight,
  Lock,
  Eye,
  ArrowLeft,
  Award,
  Target,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CoursePreviewProps {
  courseId: string;
}

interface CurriculumData {
  id: string;
  title: string;
  description: string;
  trainerId: string;
  trainerName: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  price: number;
  modules: ModuleData[];
  enrollmentCount: number;
  status: string;
}

interface ModuleData {
  id: string;
  title: string;
  description: string;
  order: number;
  duration: number;
  objectives: string[];
  content: string;
  isRequired: boolean;
  isFree: boolean;
  price: number;
}

export default function CoursePreview({ courseId }: CoursePreviewProps) {
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [curriculumData, setCurriculumData] = useState<CurriculumData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // 실제 커리큘럼 데이터 로드
  useEffect(() => {
    const fetchCurriculumData = async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}/preview`);
        if (!response.ok) {
          throw new Error('커리큘럼 데이터를 불러오는데 실패했습니다');
        }
        const data = await response.json();
        setCurriculumData(data);
      } catch (error) {
        console.error('커리큘럼 데이터 로드 실패:', error);
        toast({
          title: "오류",
          description: "커리큘럼 정보를 불러오는데 실패했습니다",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurriculumData();
  }, [courseId, toast]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary/50"></div>
        </div>
      </div>
    );
  }

  if (!curriculumData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">커리큘럼을 찾을 수 없습니다</h2>
          <p className="text-gray-600 mb-6">요청하신 커리큘럼이 존재하지 않거나 삭제되었습니다.</p>
          <Button onClick={() => window.location.href = '/courses'}>
            강의 목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

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
      case 'beginner': return 'bg-success/10 text-success';
      case 'intermediate': return 'bg-warning/10 text-warning';
      case 'advanced': return 'bg-destructive/10 text-destructive';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 미리보기 가능한 모듈 (무료 모듈들)
  const previewModules = curriculumData.modules.filter(module => module.isFree);
  const paidModules = curriculumData.modules.filter(module => !module.isFree);

  const handlePlayPreview = (moduleId: string) => {
    console.log('미리보기 재생:', moduleId);
    setSelectedLesson(moduleId);
    // 실제로는 비디오 플레이어 모달을 열거나 비디오 페이지로 이동
    toast({
      title: "미리보기 재생",
      description: "실제 서비스에서는 비디오 플레이어가 실행됩니다",
    });
  };

  const handleEnrollNow = () => {
    console.log('지금 등록하기 클릭');
    window.location.href = `/courses/${courseId}`;
  };

  const handleBackToCourses = () => {
    window.location.href = '/courses';
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={handleBackToCourses}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          강의 목록으로
        </Button>
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">커리큘럼 미리보기</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 메인 콘텐츠 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 커리큘럼 정보 */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getDifficultyColor(curriculumData.difficulty)}>
                      {getDifficultyLabel(curriculumData.difficulty)}
                    </Badge>
                    <Badge variant="outline">{curriculumData.category}</Badge>
                  </div>
                  <h2 className="text-xl font-bold mb-2">{curriculumData.title}</h2>
                  <p className="text-gray-600 mb-4">{curriculumData.description}</p>
                  
                  {/* 강사 정보 */}
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar>
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${curriculumData.trainerName}`} />
                      <AvatarFallback>{curriculumData.trainerName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{curriculumData.trainerName}</p>
                      <p className="text-sm text-gray-500">전문 반려견 훈련사</p>
                    </div>
                  </div>
                  
                  {/* 통계 정보 */}
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{curriculumData.enrollmentCount}명 수강</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{curriculumData.duration}주 과정</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-warning text-warning" />
                      <span>4.8 (245개 리뷰)</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 미리보기 레슨 */}
          {previewModules.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  무료 미리보기 모듈
                </CardTitle>
                <CardDescription>
                  커리큘럼의 일부를 무료로 체험해보세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {previewModules.map((module) => (
                    <div
                      key={module.id}
                      className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedLesson === module.id ? 'bg-primary/10 border-primary/30' : ''
                      }`}
                      onClick={() => handlePlayPreview(module.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center">
                          <Play className="h-4 w-4 text-success" />
                        </div>
                        <div>
                          <h4 className="font-medium">{module.title}</h4>
                          <p className="text-sm text-gray-500">{module.description}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {module.duration}분
                            </span>
                            <Badge variant="secondary" className="text-xs">무료</Badge>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 전체 커리큘럼 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                전체 커리큘럼
              </CardTitle>
              <CardDescription>
                {curriculumData.modules.length}개 모듈로 구성된 체계적인 학습 과정
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {curriculumData.modules.map((module) => (
                  <div
                    key={module.id}
                    className={`p-4 border rounded-lg ${
                      module.isFree ? 'border-success/30 bg-success/10' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{module.title}</h4>
                          {module.isFree ? (
                            <Badge variant="secondary" className="text-xs bg-success/10 text-success">
                              무료
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              ₩{module.price.toLocaleString()}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{module.description}</p>
                        
                        {/* 학습 목표 */}
                        {module.objectives.length > 0 && (
                          <div className="mb-3">
                            <h5 className="text-sm font-medium text-primary mb-2 flex items-center gap-1">
                              <Target className="h-4 w-4" />
                              학습 목표
                            </h5>
                            <ul className="space-y-1">
                              {module.objectives.map((objective, index) => (
                                <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                                  <CheckCircle className="h-3 w-3 text-success" />
                                  {objective}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {module.duration}분
                          </span>
                          <span className="flex items-center gap-1">
                            <Award className="h-3 w-3" />
                            {module.order}번째 모듈
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {module.isFree ? (
                          <Play className="h-5 w-5 text-success" />
                        ) : (
                          <Lock className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 사이드바 */}
        <div className="space-y-6">
          {/* 등록 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">수강 신청</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-3xl font-bold text-primary">₩{curriculumData.price.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">평생 수강 가능</p>
                </div>
                
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleEnrollNow}
                >
                  지금 등록하기
                </Button>
                
                <div className="text-center text-sm text-gray-500">
                  <p>30일 환불 보장</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 커리큘럼 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">이 커리큘럼에 포함된 내용</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="text-sm">{curriculumData.modules.length}개 모듈</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="text-sm">{curriculumData.duration}주 완주 과정</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="text-sm">전문 훈련사 직접 지도</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="text-sm">평생 수강 가능</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="text-sm">수료증 발급</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}