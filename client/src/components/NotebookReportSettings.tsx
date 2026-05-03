import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getCSRFToken } from "@/lib/csrf";
import { Download } from "lucide-react";

interface PetPref {
  petId: number;
  petName: string;
  weeklyEnabled: boolean;
  monthlyEnabled: boolean;
}

export default function NotebookReportSettings() {
  const [pets, setPets] = useState<PetPref[] | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/notebook/report-preferences", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((j) => setPets(j.pets || []))
      .catch(() =>
        toast({ title: "알림장 리포트 설정을 불러올 수 없습니다", variant: "destructive" })
      )
      .finally(() => setLoading(false));
  }, []);

  const update = async (
    petId: number,
    field: "weeklyEnabled" | "monthlyEnabled",
    value: boolean
  ) => {
    if (!pets) return;
    const prev = pets;
    setPets(pets.map((p) => (p.petId === petId ? { ...p, [field]: value } : p)));
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      try {
        const token = await getCSRFToken();
        if (token) headers["x-csrf-token"] = token;
      } catch {}
      const res = await fetch("/api/notebook/report-preferences", {
        method: "PATCH",
        credentials: "include",
        headers,
        body: JSON.stringify({ petId, [field]: value }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "설정이 저장되었습니다" });
    } catch {
      setPets(prev);
      toast({ title: "저장 실패", variant: "destructive" });
    }
  };

  const downloadPreview = async (petId: number, period: "weekly" | "monthly", petName: string) => {
    try {
      const res = await fetch(
        `/api/notebook/report-preferences/preview?petId=${petId}&period=${period}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `notebook-${period}-${petName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "리포트 다운로드 실패", variant: "destructive" });
    }
  };

  if (loading) return <p className="text-sm text-gray-500">불러오는 중...</p>;
  if (!pets || pets.length === 0)
    return (
      <div className="space-y-2">
        <h3 className="text-base font-semibold mt-2">알림장 리포트 자동 발송</h3>
        <p className="text-sm text-gray-500">등록된 반려동물이 없어 리포트 설정을 표시할 수 없어요.</p>
      </div>
    );

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold mt-2">알림장 리포트 자동 발송</h3>
      <p className="text-sm text-gray-500 mb-2">
        반려동물별로 주간(매주 월요일 09:00) · 월간(매월 1일 09:00) PDF 리포트를 이메일로 받아보실 수 있어요.
      </p>
      {pets.map((p) => (
        <div
          key={p.petId}
          data-testid={`row-notebook-report-${p.petId}`}
          className="border rounded-lg p-3 space-y-2"
        >
          <div className="font-medium">{p.petName}</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm">주간 리포트</div>
              <div className="text-xs text-gray-500">매주 월요일 오전 9시 발송</div>
            </div>
            <Switch
              data-testid={`switch-weekly-${p.petId}`}
              checked={p.weeklyEnabled}
              onCheckedChange={(v) => update(p.petId, "weeklyEnabled", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm">월간 리포트</div>
              <div className="text-xs text-gray-500">매월 1일 오전 9시 발송</div>
            </div>
            <Switch
              data-testid={`switch-monthly-${p.petId}`}
              checked={p.monthlyEnabled}
              onCheckedChange={(v) => update(p.petId, "monthlyEnabled", v)}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              data-testid={`btn-preview-weekly-${p.petId}`}
              onClick={() => downloadPreview(p.petId, "weekly", p.petName)}
            >
              <Download className="h-4 w-4 mr-1" /> 주간 미리보기
            </Button>
            <Button
              size="sm"
              variant="outline"
              data-testid={`btn-preview-monthly-${p.petId}`}
              onClick={() => downloadPreview(p.petId, "monthly", p.petName)}
            >
              <Download className="h-4 w-4 mr-1" /> 월간 미리보기
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
