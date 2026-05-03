import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_BEFORE_MS = 60 * 1000;
const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
];

interface UseIdleLogoutOptions {
  isAuthenticated: boolean;
  onLogout: (reason: "idle" | "session-expired" | "manual") => void;
}

export interface IdleLogoutState {
  warningOpen: boolean;
  secondsLeft: number;
  dismiss: () => void;
}

export function useIdleLogout({ isAuthenticated, onLogout }: UseIdleLogoutOptions): IdleLogoutState {
  const { toast } = useToast();
  const [warningOpen, setWarningOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const lastActivityRef = useRef<number>(Date.now());
  const warnTimerRef = useRef<number | null>(null);
  const logoutTimerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);

  const clearAll = () => {
    if (warnTimerRef.current) window.clearTimeout(warnTimerRef.current);
    if (logoutTimerRef.current) window.clearTimeout(logoutTimerRef.current);
    if (countdownRef.current) window.clearInterval(countdownRef.current);
    warnTimerRef.current = null;
    logoutTimerRef.current = null;
    countdownRef.current = null;
  };

  const scheduleTimers = () => {
    clearAll();
    warnTimerRef.current = window.setTimeout(() => {
      setSecondsLeft(Math.floor(WARNING_BEFORE_MS / 1000));
      setWarningOpen(true);
      countdownRef.current = window.setInterval(() => {
        setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
      }, 1000);
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

    logoutTimerRef.current = window.setTimeout(async () => {
      clearAll();
      setWarningOpen(false);
      try {
        await apiRequest("POST", "/api/auth/logout", {});
      } catch {
        // ignore
      }
      toast({
        title: "자동 로그아웃",
        description: "30분간 사용하지 않아 보안을 위해 자동 로그아웃되었습니다.",
        variant: "destructive",
      });
      onLogout("idle");
    }, IDLE_TIMEOUT_MS);
  };

  const handleActivity = () => {
    lastActivityRef.current = Date.now();
    if (warningOpen) return;
    scheduleTimers();
  };

  const dismiss = () => {
    setWarningOpen(false);
    lastActivityRef.current = Date.now();
    apiRequest("POST", "/api/auth/sessions/heartbeat", {}).catch(() => {});
    scheduleTimers();
  };

  useEffect(() => {
    if (!isAuthenticated) {
      clearAll();
      setWarningOpen(false);
      return;
    }

    scheduleTimers();
    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, handleActivity, { passive: true } as AddEventListenerOptions),
    );

    // 네트워크 활동(API 응답)도 사용자 활동으로 간주 → idle 타이머 리셋
    const handleNetworkActivity = () => handleActivity();
    window.addEventListener("user-activity", handleNetworkActivity);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, handleActivity));
      window.removeEventListener("user-activity", handleNetworkActivity);
      clearAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // 401(SESSION_EXPIRED) 감지: queryClient의 응답 처리 보강
  useEffect(() => {
    if (!isAuthenticated) return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      const reason = detail.reason === "idle" ? "idle" : "session-expired";
      toast({
        title: "세션 종료",
        description:
          detail.message || "세션이 만료되어 자동 로그아웃되었습니다. 다시 로그인해주세요.",
        variant: "destructive",
      });
      onLogout(reason);
    };
    window.addEventListener("session-expired", handler as EventListener);
    return () => window.removeEventListener("session-expired", handler as EventListener);
  }, [isAuthenticated, onLogout, toast]);

  return { warningOpen, secondsLeft, dismiss };
}
