import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { getCSRFToken } from "@/lib/csrf";

const CATEGORY_LABELS: Record<string, { title: string; desc: string }> = {
  welcome: { title: "회원가입 환영", desc: "가입 환영 안내 메일" },
  booking_confirmed: { title: "예약 확정", desc: "수업/강의 예약이 확정되면 안내" },
  lesson_reminder_d1: { title: "수업 D-1 리마인드", desc: "수업 하루 전 알림" },
  payment_receipt: { title: "결제 영수증", desc: "결제 완료 영수증" },
  payment_failed: { title: "결제 실패", desc: "결제 실패 시 안내" },
  settlement_deadline: { title: "정산 마감 안내", desc: "트레이너 정산 마감 안내" },
};

interface PrefData {
  categories: string[];
  preferences: Record<string, boolean>;
}

export default function EmailNotificationsSettings() {
  const [data, setData] = useState<PrefData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/email-preferences", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setData)
      .catch(() => toast({ title: "이메일 알림 설정을 불러올 수 없습니다", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (category: string, enabled: boolean) => {
    if (!data) return;
    const prev = data.preferences[category];
    setData({ ...data, preferences: { ...data.preferences, [category]: enabled } });
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      try {
        const token = await getCSRFToken();
        if (token) headers["x-csrf-token"] = token;
      } catch {}
      const res = await fetch("/api/email-preferences", {
        method: "PATCH",
        credentials: "include",
        headers,
        body: JSON.stringify({ category, enabled }),
      });
      if (!res.ok) throw new Error("save failed");
      toast({ title: "이메일 수신 설정이 저장되었습니다" });
    } catch {
      setData({ ...data, preferences: { ...data.preferences, [category]: prev } });
      toast({ title: "저장 실패", variant: "destructive" });
    }
  };

  if (loading || !data) return <p className="text-sm text-gray-500">불러오는 중...</p>;

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold mt-2">이메일 카테고리별 수신</h3>
      <p className="text-sm text-gray-500 mb-2">아래 항목별로 이메일 수신 여부를 설정할 수 있어요.</p>
      {data.categories.map((c) => {
        const meta = CATEGORY_LABELS[c] || { title: c, desc: "" };
        return (
          <div
            key={c}
            data-testid={`row-email-pref-${c}`}
            className="flex items-center justify-between border rounded-lg p-3"
          >
            <div>
              <div className="font-medium">{meta.title}</div>
              <div className="text-xs text-gray-500">{meta.desc}</div>
            </div>
            <Switch
              data-testid={`switch-email-pref-${c}`}
              checked={!!data.preferences[c]}
              onCheckedChange={(v) => toggle(c, v)}
            />
          </div>
        );
      })}
    </div>
  );
}
