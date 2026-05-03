import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { BookOpen, Play, Clock, ArrowRight, Loader2, Trophy, Target } from 'lucide-react';

interface CourseProgress {
  id: number;
  title: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  nextLesson: string;
  estimatedTime: string;
  image?: string;
  trainer?: {
    name: string;
    image: string;
  };
}

interface ProgressData {
  courses: CourseProgress[];
  overallProgress: number;
  totalCoursesEnrolled: number;
  completedCourses: number;
  nextRecommendation?: {
    id: number;
    title: string;
    reason: string;
  };
}

export function ProgressWidget() {
  const [, setLocation] = useLocation();

  const { data, isLoading, error } = useQuery<ProgressData>({
    queryKey: ['/api/user/progress'],
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <Card className="border-none shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
            <span className="text-sm text-gray-500">학습 진도 로딩 중...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.courses?.length) {
    return (
      <Card className="border-none shadow-md bg-gradient-to-r from-primary/5 to-secondary/5 dark:from-primary/15 dark:to-secondary/15">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center py-6">
            <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900/50 mb-4">
              <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--txt-strong)' }}>
              아직 수강 중인 강의가 없습니다
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md">
              반려동물과 함께하는 즐거운 교육을 시작해보세요. 
              전문 훈련사들이 제공하는 맞춤형 강의가 준비되어 있습니다.
            </p>
            <Button onClick={() => setLocation('/courses')} className="gap-2">
              <BookOpen className="h-4 w-4" />
              강의 둘러보기
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const mainCourse = data.courses[0];
  const otherCourses = data.courses.slice(1, 3);

  return (
    <div className="space-y-4">
      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              내 학습 진도
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {data.completedCourses}/{data.totalCoursesEnrolled} 완료
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">전체 학습 진도</span>
              <span className="text-sm font-bold text-primary">{data.overallProgress}%</span>
            </div>
            <Progress value={data.overallProgress} className="h-2" />
          </div>

          <div 
            className="bg-gradient-to-r from-primary/5 to-secondary/5 dark:from-primary/15 dark:to-secondary/15 rounded-lg p-4 cursor-pointer hover:shadow-md transition-all"
            onClick={() => setLocation(`/courses/${mainCourse.id}`)}
          >
            <div className="flex items-start gap-4">
              {mainCourse.image ? (
                <img 
                  src={mainCourse.image} 
                  alt={mainCourse.title}
                  className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                    진행 중
                  </Badge>
                </div>
                <h4 className="font-semibold text-base mb-1 line-clamp-1" style={{ color: 'var(--txt-strong)' }}>
                  {mainCourse.title}
                </h4>
                <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    {mainCourse.completedLessons}/{mainCourse.totalLessons} 강의
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {mainCourse.estimatedTime}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={mainCourse.progress} className="h-2 flex-1" />
                  <span className="text-sm font-bold text-primary">{mainCourse.progress}%</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-green-600" />
                  <span className="text-sm">
                    <span className="text-gray-500">다음 강의:</span>{' '}
                    <span className="font-medium" style={{ color: 'var(--txt-strong)' }}>{mainCourse.nextLesson}</span>
                  </span>
                </div>
                <Button size="sm" variant="ghost" className="gap-1 text-primary">
                  이어서 학습 <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {otherCourses.length > 0 && (
            <div className="mt-4 space-y-2">
              <h5 className="text-sm font-medium text-gray-500">다른 수강 중인 강의</h5>
              {otherCourses.map((course) => (
                <div 
                  key={course.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => setLocation(`/courses/${course.id}`)}
                >
                  {course.image ? (
                    <img 
                      src={course.image} 
                      alt={course.title}
                      className="w-12 h-12 rounded object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-medium line-clamp-1" style={{ color: 'var(--txt-strong)' }}>
                      {course.title}
                    </h5>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={course.progress} className="h-1.5 flex-1 max-w-[100px]" />
                      <span className="text-xs text-gray-500">{course.progress}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {data.nextRecommendation && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">다음에 추천하는 강의</span>
              </div>
              <div 
                className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                onClick={() => setLocation(`/courses/${data.nextRecommendation!.id}`)}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--txt-strong)' }}>
                    {data.nextRecommendation.title}
                  </p>
                  <p className="text-xs text-gray-500">{data.nextRecommendation.reason}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-amber-600" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
