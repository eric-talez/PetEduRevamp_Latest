import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useIdleLogout } from "@/hooks/use-idle-logout";
import { useAuth } from "@/lib/auth-compat";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function IdleLogoutWarning() {
  const auth = useAuth();
  const { toast } = useToast();

  const handleLogout = async (_reason: "idle" | "session-expired" | "manual") => {
    try {
      localStorage.removeItem("petedu_auth");
      window.dispatchEvent(new CustomEvent("logout"));
    } catch {
      // ignore
    }
    setTimeout(() => {
      window.location.href = "/auth/login";
    }, 800);
  };

  const { warningOpen, secondsLeft, dismiss } = useIdleLogout({
    isAuthenticated: !!auth.isAuthenticated,
    onLogout: handleLogout,
  });

  const forceLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
    } catch {
      // ignore
    }
    toast({ title: "로그아웃", description: "수동으로 로그아웃되었습니다." });
    handleLogout("manual");
  };

  if (!auth.isAuthenticated) return null;

  return (
    <AlertDialog open={warningOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>곧 자동으로 로그아웃됩니다</AlertDialogTitle>
          <AlertDialogDescription>
            보안을 위해 일정 시간 활동이 없으면 자동으로 로그아웃됩니다.
            <br />
            <span className="font-semibold text-destructive">{secondsLeft}초</span> 후 로그아웃됩니다.
            계속 이용하시려면 "유지하기"를 눌러주세요.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={forceLogout}>지금 로그아웃</AlertDialogCancel>
          <AlertDialogAction onClick={dismiss}>유지하기</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
