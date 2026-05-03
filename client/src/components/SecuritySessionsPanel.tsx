import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Monitor, Smartphone, ShieldCheck } from "lucide-react";

interface SessionRow {
  id: number;
  deviceLabel: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastActivity: string;
  expiresAt: string;
  createdAt: string;
  isCurrent: boolean;
}

function formatRelative(iso: string) {
  try {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return "방금 전";
    if (min < 60) return `${min}분 전`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}시간 전`;
    const days = Math.floor(hr / 24);
    return `${days}일 전`;
  } catch {
    return iso;
  }
}

export function SecuritySessionsPanel() {
  const { toast } = useToast();
  const { data, isLoading, isError } = useQuery<SessionRow[]>({
    queryKey: ["/api/auth/sessions"],
    queryFn: async () => {
      const res = await fetch("/api/auth/sessions", { credentials: "include" });
      if (!res.ok) throw new Error("세션 목록을 불러오지 못했습니다.");
      const json = await res.json();
      return (json.data || []) as SessionRow[];
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/auth/sessions/${id}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "세션 종료에 실패했습니다.");
      }
      return res.json();
    },
    onSuccess: (data: { data?: { revokedCurrent?: boolean } } | undefined) => {
      const revokedCurrent = data?.data?.revokedCurrent === true;
      toast({
        title: "세션을 종료했습니다",
        description: revokedCurrent
          ? "현재 세션이 종료되었습니다. 다시 로그인해주세요."
          : "선택한 기기의 세션이 종료되었습니다.",
      });
      if (revokedCurrent) {
        try {
          localStorage.removeItem("petedu_auth");
          window.dispatchEvent(new CustomEvent("logout"));
        } catch {
          /* noop */
        }
        setTimeout(() => (window.location.href = "/auth/login"), 600);
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/sessions"] });
      }
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "세션을 종료할 수 없습니다.";
      toast({
        title: "오류",
        description: message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">활성 세션 / 기기</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        최근 30일 동안 로그인한 기기와 브라우저를 확인하고, 의심스러운 세션을 강제 종료할 수 있습니다.
        보안을 위해 30분 동안 활동이 없으면 자동으로 로그아웃되며, 자동 로그아웃 1분 전에 알림이 표시됩니다.
      </p>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> 세션 목록을 불러오는 중...
        </div>
      )}
      {isError && (
        <div className="text-sm text-destructive">세션 목록을 불러오지 못했습니다.</div>
      )}

      <ul className="divide-y rounded border">
        {(data || []).map((s) => {
          const ua = (s.userAgent || "").toLowerCase();
          const isMobile = /mobile|iphone|android|ipad/.test(ua);
          return (
            <li
              key={s.id}
              className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
              data-testid={`session-row-${s.id}`}
            >
              <div className="flex items-start gap-3">
                {isMobile ? (
                  <Smartphone className="mt-1 h-5 w-5 text-muted-foreground" />
                ) : (
                  <Monitor className="mt-1 h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <div className="font-medium">
                    {s.deviceLabel}
                    {s.isCurrent && (
                      <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                        현재 세션
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    IP: {s.ipAddress || "알 수 없음"} · 마지막 활동: {formatRelative(s.lastActivity)}
                  </div>
                </div>
              </div>
              <Button
                variant={s.isCurrent ? "outline" : "destructive"}
                size="sm"
                disabled={revokeMutation.isPending}
                onClick={() => revokeMutation.mutate(s.id)}
                data-testid={`button-revoke-session-${s.id}`}
              >
                {s.isCurrent ? "이 기기에서 로그아웃" : "강제 로그아웃"}
              </Button>
            </li>
          );
        })}
        {!isLoading && (data || []).length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">활성 세션이 없습니다.</li>
        )}
      </ul>
    </div>
  );
}
