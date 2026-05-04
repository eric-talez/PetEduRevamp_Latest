import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Award, RefreshCw, Send, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getCSRFToken } from "@/lib/csrf";

interface CertificateLog {
  id: number;
  recipient: string;
  subject: string | null;
  status: string;
  attempts: number;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
  payload: Record<string, any> | null;
}

const STATUS_LABEL: Record<string, string> = {
  sent: "발송됨",
  queued: "대기",
  failed: "실패",
  skipped: "건너뜀",
};

const STATUS_COLOR: Record<string, string> = {
  sent: "bg-success/10 text-success",
  queued: "bg-warning/10 text-warning",
  failed: "bg-destructive/10 text-destructive",
  skipped: "bg-gray-100 text-gray-700",
};

async function getCsrfHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const token = await getCSRFToken();
    if (token) headers["x-csrf-token"] = token;
  } catch {}
  return headers;
}

export default function TrainerEmailCertificates() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<CertificateLog[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      const r = await fetch(
        `/api/trainer/email-logs/certificates?${params.toString()}`,
        { credentials: "include" },
      );
      if (!r.ok) throw new Error();
      const d = await r.json();
      setLogs(d.logs || []);
      setTotal(d.total || 0);
    } catch {
      toast({ title: "발송 이력을 불러오지 못했습니다", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function requestResend(id: number) {
    setRequesting(id);
    try {
      const headers = await getCsrfHeaders();
      const r = await fetch(`/api/trainer/email-logs/${id}/request-resend`, {
        method: "POST",
        credentials: "include",
        headers,
      });
      if (r.ok) {
        toast({
          title: "관리자에게 재발송을 요청했습니다",
          description: "관리자가 확인 후 다시 발송합니다.",
        });
      } else {
        const d = await r.json().catch(() => ({}));
        toast({
          title: d.error || "재발송 요청 실패",
          variant: "destructive",
        });
      }
    } finally {
      setRequesting(null);
    }
  }

  const failedCount = logs.filter((l) => l.status === "failed").length;

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-trainer-cert-emails">
      <div className="flex items-center gap-3">
        <Award className="w-6 h-6" />
        <h1 className="text-2xl font-bold">수료증 이메일 발송 내역</h1>
      </div>
      <p className="text-sm text-gray-600">
        본인이 담당한 코스의 수료증 이메일 발송 상태를 확인할 수 있습니다.
        실패 건은 관리자에게 재발송을 요청하세요.
      </p>

      {failedCount > 0 && (
        <Alert variant="destructive" data-testid="alert-failed-count">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>실패 {failedCount}건</AlertTitle>
          <AlertDescription>
            발송 실패 건은 관리자에게 재발송을 요청할 수 있습니다.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>발송 이력 ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-3">
            <Input
              placeholder="수신자 검색"
              className="max-w-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-cert-search"
            />
            <select
              className="border rounded px-2"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              data-testid="select-cert-status"
            >
              <option value="">전체 상태</option>
              <option value="sent">발송됨</option>
              <option value="queued">대기</option>
              <option value="failed">실패</option>
              <option value="skipped">건너뜀</option>
            </select>
            <Button onClick={load} data-testid="button-cert-search">
              <RefreshCw className="w-4 h-4 mr-1" /> 조회
            </Button>
          </div>

          {loading ? (
            <p>불러오는 중...</p>
          ) : logs.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">
              발송 내역이 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>일시</TableHead>
                    <TableHead>수신자</TableHead>
                    <TableHead>코스</TableHead>
                    <TableHead>수료증 번호</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>시도</TableHead>
                    <TableHead>작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const p = log.payload || {};
                    return (
                      <TableRow key={log.id} data-testid={`row-cert-log-${log.id}`}>
                        <TableCell className="text-xs">
                          {new Date(log.createdAt).toLocaleString("ko-KR")}
                        </TableCell>
                        <TableCell>{log.recipient}</TableCell>
                        <TableCell className="max-w-xs">
                          <div className="font-medium">
                            {p.courseTitle || "-"}
                          </div>
                          {p.name && (
                            <div className="text-xs text-gray-500">
                              보호자: {p.name}
                              {p.petName ? ` · ${p.petName}` : ""}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs">{p.certificateNo || "-"}</code>
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLOR[log.status] || ""}>
                            {STATUS_LABEL[log.status] || log.status}
                          </Badge>
                          {log.lastError && (
                            <div
                              className="text-xs text-destructive mt-1"
                              data-testid={`text-cert-error-${log.id}`}
                            >
                              {log.lastError}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{log.attempts}</TableCell>
                        <TableCell>
                          {log.status === "failed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={requesting === log.id}
                              onClick={() => requestResend(log.id)}
                              data-testid={`button-request-resend-${log.id}`}
                            >
                              <Send className="w-4 h-4 mr-1" />
                              {requesting === log.id
                                ? "요청 중..."
                                : "관리자에게 재발송 요청"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
