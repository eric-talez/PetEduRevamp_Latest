import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { AlertTriangle, Users, BookOpen, TrendingUp, CheckCircle2, type LucideIcon } from "lucide-react";

interface StatRow {
  courseId: number; courseTitle: string; totalSessions: number; enrolledCount: number;
  completedUsers: number; completionRate: number; attendanceRate: number; absenceRate: number; warningCount: number;
}

export default function AttendanceStats() {
  const { data, isLoading } = useQuery<{ data: StatRow[] }>({
    queryKey: ["/api/admin/courses/attendance-stats"],
  });
  const rows = data?.data || [];

  const avgAttendance = rows.length ? Math.round((rows.reduce((s, r) => s + r.attendanceRate, 0) / rows.length) * 10) / 10 : 0;
  const totalEnrolled = rows.reduce((s, r) => s + r.enrolledCount, 0);
  const totalCompleted = rows.reduce((s, r) => s + r.completedUsers, 0);
  const totalWarnings = rows.reduce((s, r) => s + r.warningCount, 0);

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-admin-attendance-stats">
      <div>
        <h1 className="text-3xl font-bold">출석률 통계</h1>
        <p className="text-muted-foreground mt-1">코스별 평균 출석률과 결석 경고 현황을 확인하세요.</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="총 코스 수" value={rows.length} />
        <StatCard icon={Users} label="총 등록자" value={totalEnrolled} />
        <StatCard icon={TrendingUp} label="평균 출석률" value={`${avgAttendance}%`} />
        <StatCard icon={AlertTriangle} label="결석 경고" value={totalWarnings} variant={totalWarnings > 0 ? "destructive" : "default"} />
      </div>

      <Card>
        <CardHeader><CardTitle>코스별 출석/수료 현황</CardTitle></CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">불러오는 중...</p>}
          {!isLoading && rows.length === 0 && <p className="text-sm text-muted-foreground">등록된 코스가 없습니다.</p>}
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.courseId} className="border rounded-md p-4" data-testid={`stat-row-${r.courseId}`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="font-semibold">{r.courseTitle}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      회차 {r.totalSessions} · 등록 {r.enrolledCount}명 · 수료 {r.completedUsers}명
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {r.warningCount > 0 && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="w-3 h-3" /> 경고 {r.warningCount}
                      </Badge>
                    )}
                    <Badge variant="outline" className="gap-1">
                      <CheckCircle2 className="w-3 h-3" /> 수료율 {r.completionRate}%
                    </Badge>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>출석률</span><span>{r.attendanceRate}%</span>
                    </div>
                    <ProgressBar value={r.attendanceRate} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>결석률</span><span className={r.absenceRate >= 30 ? "text-destructive" : ""}>{r.absenceRate}%</span>
                    </div>
                    <ProgressBar value={r.absenceRate} className="h-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  variant?: "default" | "destructive";
}

function StatCard({ icon: Icon, label, value, variant = "default" }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className={`text-2xl font-bold mt-1 ${variant === "destructive" ? "text-destructive" : ""}`}>{value}</div>
          </div>
          <Icon className={`w-8 h-8 ${variant === "destructive" ? "text-destructive" : "text-muted-foreground"}`} />
        </div>
      </CardContent>
    </Card>
  );
}
