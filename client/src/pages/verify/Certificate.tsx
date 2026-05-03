import { useEffect, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, ShieldCheck, ShieldAlert, Search } from "lucide-react";

interface VerifyData {
  certificateNo: string;
  userName: string;
  courseTitle: string;
  trainerName: string;
  instituteName: string;
  completedAt: string;
  totalSessions: number;
}

type Status = "idle" | "loading" | "ok" | "fail";

export default function VerifyCertificatePage() {
  const [, params] = useRoute<{ certificateNo?: string }>("/verify/:certificateNo");
  const [, setLocation] = useLocation();
  const initialNo = params?.certificateNo ? decodeURIComponent(params.certificateNo) : "";
  const [input, setInput] = useState(initialNo);
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<VerifyData | null>(null);
  const [error, setError] = useState<string>("");

  async function verify(no: string) {
    const trimmed = no.trim();
    if (!trimmed) {
      setStatus("idle");
      setData(null);
      setError("");
      return;
    }
    setStatus("loading");
    setError("");
    setData(null);
    try {
      const res = await fetch(`/api/verify/${encodeURIComponent(trimmed)}`);
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.success) {
        setData(body.data);
        setStatus("ok");
      } else {
        setError(body?.message || "수료증을 확인할 수 없습니다.");
        setStatus("fail");
      }
    } catch {
      setError("네트워크 오류로 확인에 실패했습니다.");
      setStatus("fail");
    }
  }

  useEffect(() => {
    if (initialNo) {
      verify(initialNo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNo]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    if (trimmed === initialNo) {
      verify(trimmed);
    } else {
      setLocation(`/verify/${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl" data-testid="page-verify-certificate">
      <div className="text-center mb-6">
        <Award className="w-12 h-12 mx-auto text-warning" />
        <h1 className="text-2xl font-bold mt-2">수료증 진위 확인</h1>
        <p className="text-sm text-muted-foreground mt-1">
          수료증에 표기된 인증번호를 입력하면 발급 정보를 확인할 수 있습니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">인증번호 입력</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="예: WZ-12-34-567890"
              data-testid="input-certificate-no"
              autoFocus
            />
            <Button type="submit" data-testid="button-verify" disabled={status === "loading"}>
              <Search className="w-4 h-4 mr-1" /> 확인
            </Button>
          </form>
        </CardContent>
      </Card>

      {status === "loading" && (
        <div className="mt-6 text-center text-muted-foreground">확인 중...</div>
      )}

      {status === "fail" && (
        <Card className="mt-6 border-destructive/40" data-testid="result-fail">
          <CardContent className="p-6 flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-destructive">확인 실패</div>
              <div className="text-sm text-muted-foreground mt-1">{error}</div>
              <div className="text-xs text-muted-foreground mt-2">
                인증번호를 다시 확인해 주세요. 형식: WZ-코스ID-사용자ID-6자리숫자
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {status === "ok" && data && (
        <Card className="mt-6 border-success/40" data-testid="result-ok">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-success mb-4">
              <ShieldCheck className="w-6 h-6" />
              <div className="font-semibold">정상 발급된 수료증입니다.</div>
            </div>
            <dl className="grid grid-cols-3 gap-y-3 text-sm">
              <dt className="text-muted-foreground">인증번호</dt>
              <dd className="col-span-2 font-mono" data-testid="text-cert-no">{data.certificateNo}</dd>

              <dt className="text-muted-foreground">수강생</dt>
              <dd className="col-span-2 font-semibold" data-testid="text-user-name">{data.userName}</dd>

              <dt className="text-muted-foreground">과정명</dt>
              <dd className="col-span-2" data-testid="text-course-title">{data.courseTitle}</dd>

              <dt className="text-muted-foreground">총 회차</dt>
              <dd className="col-span-2">{data.totalSessions}회차</dd>

              <dt className="text-muted-foreground">수료일</dt>
              <dd className="col-span-2" data-testid="text-completed-at">
                {new Date(data.completedAt).toLocaleDateString("ko-KR")}
              </dd>

              <dt className="text-muted-foreground">담당 트레이너</dt>
              <dd className="col-span-2">{data.trainerName}</dd>

              <dt className="text-muted-foreground">발급 기관</dt>
              <dd className="col-span-2">{data.instituteName}</dd>
            </dl>
            <p className="text-xs text-muted-foreground mt-4">
              개인정보 보호를 위해 수강생 이름의 일부는 마스킹 처리되어 표시됩니다.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 text-center">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          홈으로
        </Link>
      </div>
    </div>
  );
}
