import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { CheckCircle, Clock, XCircle, CalendarDays, Plus, AlertTriangle, BookOpen } from "lucide-react";

type AttendanceStatus = "present" | "late" | "absent" | "scheduled";
interface Course { id: number; title: string; sessionCount: number; enrolledCount: number; }
interface Session { id: number; courseId: number; sessionNumber: number; title: string; description?: string; scheduledDate?: string; durationMinutes?: number; }
interface AttendanceRow { id: number; userId: number; status: AttendanceStatus; memo?: string | null; userName: string; petName?: string; checkedAt?: string | null; }
interface SaveItem { userId: number; status: AttendanceStatus; memo: string | null; }
interface SaveResponse { success?: boolean; warnings?: Array<{ userId: number; absenceRate: number }>; }
interface NewSessionPayload { sessionNumber: number; title: string; description: string; durationMinutes: number; }

const STATUS_LABEL: Record<AttendanceStatus, string> = { present: "출석", late: "지각", absent: "결석", scheduled: "예정" };
const STATUS_COLOR: Record<AttendanceStatus, string> = { present: "bg-green-100 text-green-700", late: "bg-amber-100 text-amber-700", absent: "bg-red-100 text-red-700", scheduled: "bg-gray-100 text-gray-700" };

export default function TrainerAttendance() {
  const { toast } = useToast();
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<number, { status: AttendanceStatus; memo?: string | null }>>({});
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [newSession, setNewSession] = useState({ sessionNumber: 1, title: "", description: "", durationMinutes: 60 });

  const { data: coursesResp, isLoading: loadingCourses } = useQuery<{ data: Course[] }>({ queryKey: ["/api/trainer/courses"] });
  const courses = coursesResp?.data || [];

  const { data: sessionsResp } = useQuery<{ data: Session[] }>({
    queryKey: ["/api/courses", selectedCourseId, "sessions"],
    queryFn: async () => (await fetch(`/api/courses/${selectedCourseId}/sessions`, { credentials: "include" })).json(),
    enabled: !!selectedCourseId,
  });
  const sessions = sessionsResp?.data || [];

  const { data: attResp } = useQuery<{ data: { session: Session; attendance: AttendanceRow[] } }>({
    queryKey: ["/api/courses/sessions", selectedSessionId, "attendance"],
    queryFn: async () => (await fetch(`/api/courses/sessions/${selectedSessionId}/attendance`, { credentials: "include" })).json(),
    enabled: !!selectedSessionId,
  });
  const attendance = attResp?.data.attendance || [];

  const createSession = useMutation<unknown, Error, NewSessionPayload>({
    mutationFn: async (payload) => (await apiRequest("POST", `/api/courses/${selectedCourseId}/sessions`, payload)).json(),
    onSuccess: () => {
      toast({ title: "회차 저장 완료" });
      queryClient.invalidateQueries({ queryKey: ["/api/courses", selectedCourseId, "sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/courses"] });
      setNewSessionOpen(false);
    },
    onError: (e) => toast({ title: "오류", description: e.message, variant: "destructive" }),
  });

  const saveAttendance = useMutation<SaveResponse, Error, void>({
    mutationFn: async () => {
      const items: SaveItem[] = Object.entries(pendingChanges).map(([userId, v]) => ({ userId: parseInt(userId, 10), status: v.status, memo: v.memo ?? null }));
      if (items.length === 0) return { warnings: [] };
      return (await apiRequest("POST", `/api/courses/sessions/${selectedSessionId}/attendance`, { items })).json();
    },
    onSuccess: (res) => {
      const count = res.warnings?.length ?? 0;
      toast({
        title: "출석 저장 완료",
        description: count > 0 ? `결석률 경고: ${count}명` : undefined,
        variant: count > 0 ? "destructive" : "default",
      });
      setPendingChanges({});
      queryClient.invalidateQueries({ queryKey: ["/api/courses/sessions", selectedSessionId, "attendance"] });
    },
    onError: (e) => toast({ title: "저장 실패", description: e.message, variant: "destructive" }),
  });

  const setRow = (userId: number, patch: Partial<{ status: AttendanceStatus; memo: string }>) => {
    setPendingChanges((prev) => {
      const existing = attendance.find((r) => r.userId === userId);
      const cur = prev[userId] || { status: existing?.status ?? "scheduled", memo: existing?.memo ?? "" };
      return { ...prev, [userId]: { ...cur, ...patch } };
    });
  };

  const setAll = (status: AttendanceStatus) => {
    const next: Record<number, { status: AttendanceStatus; memo?: string | null }> = { ...pendingChanges };
    attendance.forEach((r) => {
      next[r.userId] = { status, memo: pendingChanges[r.userId]?.memo ?? r.memo ?? "" };
    });
    setPendingChanges(next);
  };

  const effective = useMemo(() => attendance.map((r) => ({
    ...r,
    status: pendingChanges[r.userId]?.status ?? r.status,
    memo: pendingChanges[r.userId]?.memo ?? r.memo ?? "",
  })), [attendance, pendingChanges]);

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-trainer-attendance">
      <div>
        <h1 className="text-3xl font-bold">수업 출석 & 진도 관리</h1>
        <p className="text-muted-foreground mt-1">회차별 출석을 체크하고 메모를 남기세요.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5" /> 내 코스</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {loadingCourses && <p className="text-sm text-muted-foreground">불러오는 중...</p>}
            {!loadingCourses && courses.length === 0 && <p className="text-sm text-muted-foreground">담당 코스가 없습니다.</p>}
            {courses.map((c) => (
              <button
                key={c.id}
                onClick={() => { setSelectedCourseId(c.id); setSelectedSessionId(null); setPendingChanges({}); }}
                className={`w-full text-left p-3 rounded-md border ${selectedCourseId === c.id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
                data-testid={`course-item-${c.id}`}
              >
                <div className="font-medium">{c.title}</div>
                <div className="text-xs text-muted-foreground mt-1">회차 {c.sessionCount} · 등록 {c.enrolledCount}</div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><CalendarDays className="w-5 h-5" /> 회차 목록</CardTitle>
            {selectedCourseId && (
              <Button size="sm" onClick={() => { setNewSession({ sessionNumber: sessions.length + 1, title: "", description: "", durationMinutes: 60 }); setNewSessionOpen(true); }} data-testid="button-add-session">
                <Plus className="w-4 h-4 mr-1" /> 회차 추가
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!selectedCourseId && <p className="text-sm text-muted-foreground">코스를 선택하세요.</p>}
            {selectedCourseId && sessions.length === 0 && <p className="text-sm text-muted-foreground">등록된 회차가 없습니다. "회차 추가"로 시작하세요.</p>}
            <div className="grid gap-2">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedSessionId(s.id); setPendingChanges({}); }}
                  className={`text-left p-3 rounded-md border ${selectedSessionId === s.id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
                  data-testid={`session-item-${s.id}`}
                >
                  <div className="font-medium">{s.sessionNumber}회차 · {s.title}</div>
                  {s.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</div>}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedSessionId && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <CardTitle>출석 체크</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setAll("present")}>모두 출석</Button>
                <Button variant="outline" size="sm" onClick={() => setAll("absent")}>모두 결석</Button>
                <Button onClick={() => saveAttendance.mutate()} disabled={Object.keys(pendingChanges).length === 0 || saveAttendance.isPending} data-testid="button-save-attendance">
                  저장 ({Object.keys(pendingChanges).length})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {effective.length === 0 && <p className="text-sm text-muted-foreground">등록된 수강생이 없습니다.</p>}
            <div className="space-y-3">
              {effective.map((r) => (
                <div key={r.userId} className="border rounded-md p-3" data-testid={`attendance-row-${r.userId}`}>
                  <div className="flex flex-wrap items-center gap-3 justify-between">
                    <div>
                      <div className="font-medium">{r.userName}{r.petName ? ` · 🐾 ${r.petName}` : ""}</div>
                      {r.checkedAt && <div className="text-xs text-muted-foreground">최종 체크: {new Date(r.checkedAt).toLocaleString("ko-KR")}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={STATUS_COLOR[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                      <Select value={r.status} onValueChange={(v) => setRow(r.userId, { status: v as AttendanceStatus })}>
                        <SelectTrigger className="w-32" data-testid={`select-status-${r.userId}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present">출석</SelectItem>
                          <SelectItem value="late">지각</SelectItem>
                          <SelectItem value="absent">결석</SelectItem>
                          <SelectItem value="scheduled">예정</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Textarea
                    value={r.memo || ""}
                    onChange={(e) => setRow(r.userId, { memo: e.target.value })}
                    placeholder="회차 메모 (선택)"
                    className="mt-3 min-h-[60px]"
                    data-testid={`memo-${r.userId}`}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={newSessionOpen} onOpenChange={setNewSessionOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>회차 추가/수정</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>회차 번호</Label>
              <Input type="number" value={newSession.sessionNumber} onChange={(e) => setNewSession({ ...newSession, sessionNumber: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <Label>제목</Label>
              <Input value={newSession.title} onChange={(e) => setNewSession({ ...newSession, title: e.target.value })} placeholder="예: 기본 자세 훈련" />
            </div>
            <div>
              <Label>설명</Label>
              <Textarea value={newSession.description} onChange={(e) => setNewSession({ ...newSession, description: e.target.value })} />
            </div>
            <div>
              <Label>소요 시간 (분)</Label>
              <Input type="number" value={newSession.durationMinutes} onChange={(e) => setNewSession({ ...newSession, durationMinutes: parseInt(e.target.value) || 60 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewSessionOpen(false)}>취소</Button>
            <Button onClick={() => createSession.mutate(newSession)} disabled={!newSession.title || createSession.isPending}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
