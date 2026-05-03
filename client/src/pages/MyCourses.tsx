import { Card } from '@/components/ui/card';
import { CourseCard } from '@/components/ui/CourseCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Clock, Hourglass, Star, BarChart, BookOpen, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';

interface Course {
  id: number;
  image: string;
  title: string;
  description: string;
  badge?: { text: string; variant: string };
  progress?: number;
  trainer?: { image: string; name: string };
  status?: string;
  nextLesson?: string;
  completedDate?: string;
  price?: string;
  duration?: string;
}

interface MyCoursesData {
  ongoing: Course[];
  completed: Course[];
  wishlist: Course[];
  user: {
    id: number;
    name: string;
    email: string;
  } | null;
  totalProgress: number;
}

export default function MyCourses() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data, isLoading, error } = useQuery<MyCoursesData>({
    queryKey: ['/api/my-courses'],
  });

  const handleEnrollCourse = (courseId: number, courseTitle: string) => {
    toast({
      title: "수강 신청 완료",
      description: `"${courseTitle}" 강의 신청이 완료되었습니다.`,
    });
    setLocation(`/courses/${courseId}/enroll`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-gray-500">강의 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-500 mb-2">강의 목록을 불러오는 중 오류가 발생했습니다.</p>
          <Button onClick={() => window.location.reload()}>
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  const ongoingCourses = data?.ongoing || [];
  const completedCourses = data?.completed || [];
  const wishlistCourses = data?.wishlist || [];
  const userName = data?.user?.name || '사용자';
  const totalProgress = data?.totalProgress || 0;

  const EmptyState = ({ message, icon: Icon }: { message: string; icon: typeof BookOpen }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="w-16 h-16 text-gray-300 mb-4" />
      <p className="text-gray-500 text-lg">{message}</p>
      <Button 
        variant="outline" 
        className="mt-4"
        onClick={() => setLocation('/courses')}
      >
        강의 둘러보기
      </Button>
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">내 강의실</h1>
      
      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-col">
          <div className="text-lg">
            안녕하세요, <span className="font-semibold">{userName}</span>님!
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            오늘도 반려견과 함께 즐거운 학습을 시작해보세요.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <div className="text-sm">
              <span className="text-primary font-semibold">{totalProgress}%</span> 완료
            </div>
            <Progress className="h-2 w-32" value={totalProgress} />
          </div>
          
          <Button>
            <BarChart className="w-4 h-4 mr-2" />
            학습 분석
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="ongoing" className="mb-8">
        <TabsList>
          <TabsTrigger value="ongoing">
            <Hourglass className="w-4 h-4 mr-2" />
            진행 중 ({ongoingCourses.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            <CheckCircle className="w-4 h-4 mr-2" />
            완료 ({completedCourses.length})
          </TabsTrigger>
          <TabsTrigger value="wishlist">
            <Star className="w-4 h-4 mr-2" />
            찜 목록 ({wishlistCourses.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="ongoing" className="mt-6">
          {ongoingCourses.length === 0 ? (
            <EmptyState 
              message="아직 수강 중인 강의가 없습니다." 
              icon={Hourglass} 
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ongoingCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  image={course.image}
                  title={course.title}
                  description={course.description}
                  badge={course.badge}
                  progress={course.progress}
                  trainer={course.trainer}
                  status={course.status}
                  onClick={() => setLocation(`/my-courses/${course.id}/progress`)}
                >
                  {course.nextLesson && (
                    <div className="mt-3 flex items-center text-xs text-gray-600 dark:text-gray-400">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>{course.nextLesson}</span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={(e) => { e.stopPropagation(); setLocation(`/my-courses/${course.id}/progress`); }}
                    data-testid={`button-view-progress-${course.id}`}
                  >
                    회차 & 출석 보기
                  </Button>
                </CourseCard>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="completed" className="mt-6">
          {completedCourses.length === 0 ? (
            <EmptyState 
              message="아직 완료한 강의가 없습니다." 
              icon={CheckCircle} 
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  image={course.image}
                  title={course.title}
                  description={course.description}
                  badge={course.badge}
                  progress={course.progress}
                  trainer={course.trainer}
                  status={course.status}
                  onClick={() => window.location.href = `/courses/${course.id}/review`}
                >
                  {course.completedDate && (
                    <div className="mt-3 flex items-center text-xs text-gray-600 dark:text-gray-400">
                      <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                      <span>완료일: {course.completedDate}</span>
                    </div>
                  )}
                </CourseCard>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="wishlist" className="mt-6">
          {wishlistCourses.length === 0 ? (
            <EmptyState 
              message="찜한 강의가 없습니다." 
              icon={Star} 
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishlistCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  image={course.image}
                  title={course.title}
                  description={course.description}
                  badge={course.badge}
                  trainer={course.trainer}
                  onClick={() => window.location.href = `/courses/${course.id}/enroll`}
                >
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">{course.duration}</span>
                    <span className="text-xs font-medium text-accent">{course.price}</span>
                  </div>
                  <div className="mt-3">
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEnrollCourse(course.id, course.title);
                      }}
                      data-testid={`button-enroll-wishlist-${course.id}`}
                    >
                      수강 신청
                    </Button>
                  </div>
                </CourseCard>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
