import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { CheckCircle2, Clock, XCircle, Calendar, Award, AlertTriangle, type LucideIcon } from "lucide-react";

type AttendanceStatus = "present" | "late" | "absent" | "scheduled";

interface SessionRow {
  id: number; sessionNumber: number; title: string; description?: string | null; scheduledDate?: string | null;
  attendance: { status: AttendanceStatus; memo?: string | null; checkedAt?: string | null };
}
interface CourseInfo { id: number; title?: string; description?: string }
interface ProgressData {
  course: CourseInfo | null;
  progress: { completedLessons: number; totalLessons: number; progressPercentage: string | number; status: string; completedAt?: string | null };
  sessions: SessionRow[];
  absenceRate: number;
  absenceWarning: boolean;
  completed: boolean;
}

const STATUS_LABEL: Record<AttendanceStatus, string> = { present: "출석", late: "지각", absent: "결석", scheduled: "예정" };
const STATUS_COLOR: Record<AttendanceStatus, string> = { present: "bg-green-100 text-green-700", late: "bg-amber-100 text-amber-700", absent: "bg-red-100 text-red-700", scheduled: "bg-gray-100 text-gray-700" };
const STATUS_ICON: Record<AttendanceStatus, LucideIcon> = { present: CheckCircle2, late: Clock, absent: XCircle, scheduled: Calendar };

export default function CourseProgressPage() {
  const [, params] = useRoute<{ id: string }>("/my-courses/:id/progress");
  const [, setLocation] = useLocation();
  const courseId = params?.id ? parseInt(params.id) : null;

  const { data, isLoading, error } = useQuery<{ data: ProgressData }>({
    queryKey: ["/api/my-courses", courseId, "progress"],
    queryFn: async () => (await fetch(`/api/my-courses/${courseId}/progress`, { credentials: "include" })).json(),
    enabled: !!courseId,
  });

  if (isLoading) return <div className="p-8">불러오는 중...</div>;
  if (error || !data?.data) return <div className="p-8">진도 정보를 불러올 수 없습니다.</div>;

  const { course, progress, sessions, absenceRate, absenceWarning, completed } = data.data;
  const pct = Number(progress.progressPercentage) || 0;

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl" data-testid="page-course-progress">
      <Button variant="ghost" onClick={() => setLocation("/my-courses")}>← 내 강의로 돌아가기</Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-2xl">{course?.title || "코스"}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">총 {progress.totalLessons}회차 · 완료 {progress.completedLessons}회차</p>
            </div>
            {completed && (
              <Button onClick={() => setLocation(`/my-courses/${courseId}/certificate`)} data-testid="button-certificate">
                <Award className="w-4 h-4 mr-2" /> 수료증 다운로드
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">진도율</span>
            <span className="text-sm text-muted-foreground">{pct}%</span>
          </div>
          <ProgressBar value={pct} className="h-3" />
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="rounded-md border p-3 text-center">
              <div className="text-xs text-muted-foreground">상태</div>
              <div className="font-semibold mt-1">{completed ? "수료" : "진행 중"}</div>
            </div>
            <div className="rounded-md border p-3 text-center">
              <div className="text-xs text-muted-foreground">결석률</div>
              <div className={`font-semibold mt-1 ${absenceWarning ? "text-red-600" : ""}`}>{absenceRate}%</div>
            </div>
            <div className="rounded-md border p-3 text-center">
              <div className="text-xs text-muted-foreground">완료일</div>
              <div className="font-semibold mt-1 text-sm">{progress.completedAt ? new Date(progress.completedAt).toLocaleDateString("ko-KR") : "-"}</div>
            </div>
          </div>
          {absenceWarning && (
            <div className="mt-4 flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 mt-0.5" />
              <div>결석률이 30%를 초과했습니다. 트레이너에게 학습 일정을 문의해 주세요.</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>회차 목록</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {sessions.length === 0 && <p className="text-sm text-muted-foreground">등록된 회차가 없습니다.</p>}
          {sessions.map((s) => {
            const Icon = STATUS_ICON[s.attendance.status];
            return (
              <div key={s.id} className="border rounded-md p-3" data-testid={`session-${s.id}`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <div>
                      <div className="font-medium">{s.sessionNumber}회차 · {s.title}</div>
                      {s.description && <div className="text-xs text-muted-foreground mt-1">{s.description}</div>}
                    </div>
                  </div>
                  <Badge className={STATUS_COLOR[s.attendance.status]}>{STATUS_LABEL[s.attendance.status]}</Badge>
                </div>
                {s.attendance.memo && (
                  <div className="mt-2 text-sm bg-muted/50 p-2 rounded">📝 {s.attendance.memo}</div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
