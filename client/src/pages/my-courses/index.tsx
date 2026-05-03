import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, AlertTriangle, Award, ChevronRight } from "lucide-react";

interface CourseSummary {
  courseId: number;
  course: { id: number; title?: string; description?: string; instructorName?: string } | null;
  progress: {
    completedLessons: number;
    totalLessons: number;
    progressPercentage: number;
    status: "active" | "completed";
  };
  absenceRate: number;
  absenceWarning: boolean;
  completed: boolean;
}

export default function MyCoursesPage() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = useQuery<{ data: CourseSummary[] }>({
    queryKey: ["/api/my-courses/progress-summary"],
  });
  const items = data?.data ?? [];

  return (
    <div className="container mx-auto px-4 py-8" data-testid="page-my-courses">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">내 강의</h1>
        <p className="text-gray-600">현재 수강 중인 강의와 진행 상황을 확인하세요.</p>
      </div>

      {isLoading && <p className="text-sm text-gray-500">불러오는 중...</p>}

      {!isLoading && items.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">수강 중인 강의가 없습니다</h3>
          <p className="text-gray-600 mb-4">새로운 강의를 신청해보세요.</p>
          <Button onClick={() => setLocation("/courses")}>강의 둘러보기</Button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const title = item.course?.title || `코스 #${item.courseId}`;
          const pct = Number(item.progress.progressPercentage) || 0;
          return (
            <Card key={item.courseId} className="hover:shadow-lg transition-shadow" data-testid={`my-course-${item.courseId}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{title}</CardTitle>
                    {item.course?.instructorName && (
                      <CardDescription className="mt-1">담당: {item.course.instructorName}</CardDescription>
                    )}
                  </div>
                  <Badge variant={item.completed ? "secondary" : "default"}>
                    {item.completed ? "수료" : "진행중"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span>진행률</span>
                      <span>{item.progress.completedLessons}/{item.progress.totalLessons} 회차</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <div className="text-right text-sm text-gray-500 mt-1">{pct}%</div>
                  </div>

                  {item.absenceWarning && (
                    <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 p-2 text-xs text-destructive">
                      <AlertTriangle className="w-4 h-4 mt-0.5" />
                      <span>결석률 {item.absenceRate}% — 학습 일정을 확인해주세요.</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => setLocation(`/my-courses/${item.courseId}/progress`)}
                      data-testid={`button-progress-${item.courseId}`}
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      회차 & 출석
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                    {item.completed && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLocation(`/my-courses/${item.courseId}/certificate`)}
                        data-testid={`button-cert-${item.courseId}`}
                      >
                        <Award className="w-4 h-4 mr-1" /> 수료증
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
