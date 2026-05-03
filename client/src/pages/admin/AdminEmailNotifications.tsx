import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mail, RefreshCw, Send, Eye, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getCSRFToken } from "@/lib/csrf";

interface Template {
  id: number;
  key: string;
  name: string;
  category: string;
  subject: string;
  bodyHtml: string | null;
  enabled: boolean;
  sendgridTemplateId: string | null;
  description: string | null;
  variables: Record<string, string> | null;
}

interface EmailLog {
  id: number;
  recipient: string;
  templateKey: string;
  subject: string | null;
  status: string;
  attempts: number;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
  payload: Record<string, any> | null;
}

const CERTIFICATE_TEMPLATE_KEY = "course_completion_certificate";

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

interface EmailServiceStatus {
  configured: boolean;
  apiKeyPresent: boolean;
  fromEmailConfigured: boolean;
  fromEmail: string;
  environment: string;
  warnings: string[];
  consecutiveFailures: number;
  totalFailuresSinceBoot: number;
  totalSentSinceBoot: number;
  lastFailureAt: string | null;
  lastSuccessAt: string | null;
  lastAlertAt: string | null;
  recentFailures: Array<{ at: string; recipient: string; templateKey: string; error: string }>;
  critical: boolean;
  failureAlertThreshold: number;
}

export default function AdminEmailNotifications() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterTemplate, setFilterTemplate] = useState<string>("");
  const [filterSearch, setFilterSearch] = useState<string>("");
  const [loadingTpl, setLoadingTpl] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewSubject, setPreviewSubject] = useState<string>("");
  const [testTo, setTestTo] = useState("");
  const [serviceStatus, setServiceStatus] = useState<EmailServiceStatus | null>(null);
  const [certLogs, setCertLogs] = useState<EmailLog[]>([]);
  const [certTotal, setCertTotal] = useState(0);
  const [certStatus, setCertStatus] = useState<string>("");
  const [certSearch, setCertSearch] = useState<string>("");
  const [loadingCerts, setLoadingCerts] = useState(true);
  const [certOffset, setCertOffset] = useState(0);
  const CERT_PAGE_SIZE = 50;

  async function loadStatus() {
    try {
      const r = await fetch("/api/admin/email-status", { credentials: "include" });
      if (!r.ok) return;
      const d = await r.json();
      setServiceStatus(d);
    } catch {}
  }

  async function loadTemplates() {
    setLoadingTpl(true);
    try {
      const r = await fetch("/api/admin/email-templates", { credentials: "include" });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setTemplates(d.templates || []);
    } catch {
      toast({ title: "템플릿을 불러오지 못했습니다", variant: "destructive" });
    } finally {
      setLoadingTpl(false);
    }
  }

  async function loadLogs() {
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterTemplate) params.set("templateKey", filterTemplate);
      if (filterSearch) params.set("search", filterSearch);
      const r = await fetch(`/api/admin/email-logs?${params.toString()}`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setLogs(d.logs || []);
      setLogTotal(d.total || 0);
    } catch {
      toast({ title: "발송 이력을 불러오지 못했습니다", variant: "destructive" });
    } finally {
      setLoadingLogs(false);
    }
  }

  async function loadCertLogs(opts: { append?: boolean; offset?: number } = {}) {
    setLoadingCerts(true);
    const offset = opts.offset ?? 0;
    try {
      const params = new URLSearchParams();
      params.set("templateKey", CERTIFICATE_TEMPLATE_KEY);
      params.set("limit", String(CERT_PAGE_SIZE));
      params.set("offset", String(offset));
      if (certStatus) params.set("status", certStatus);
      if (certSearch) params.set("search", certSearch);
      const r = await fetch(`/api/admin/email-logs?${params.toString()}`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error();
      const d = await r.json();
      const newLogs: EmailLog[] = d.logs || [];
      setCertLogs((prev) => (opts.append ? [...prev, ...newLogs] : newLogs));
      setCertTotal(d.total || 0);
      setCertOffset(offset + newLogs.length);
    } catch {
      toast({ title: "수료증 발송 이력을 불러오지 못했습니다", variant: "destructive" });
    } finally {
      setLoadingCerts(false);
    }
  }

  useEffect(() => {
    loadTemplates();
    loadLogs();
    loadCertLogs();
    loadStatus();
    const id = setInterval(loadStatus, 30_000);
    return () => clearInterval(id);
  }, []);

  const templateMap = useMemo(() => {
    const m: Record<string, Template> = {};
    for (const t of templates) m[t.key] = t;
    return m;
  }, [templates]);

  async function saveTemplate(t: Template) {
    const headers = await getCsrfHeaders();
    const r = await fetch(`/api/admin/email-templates/${t.id}`, {
      method: "PATCH",
      credentials: "include",
      headers,
      body: JSON.stringify({
        name: t.name,
        subject: t.subject,
        bodyHtml: t.bodyHtml,
        enabled: t.enabled,
        sendgridTemplateId: t.sendgridTemplateId,
        description: t.description,
      }),
    });
    if (r.ok) {
      toast({ title: "템플릿이 저장되었습니다" });
      setEditing(null);
      loadTemplates();
    } else {
      toast({ title: "저장 실패", variant: "destructive" });
    }
  }

  async function toggleTemplate(t: Template, enabled: boolean) {
    const headers = await getCsrfHeaders();
    const r = await fetch(`/api/admin/email-templates/${t.id}`, {
      method: "PATCH",
      credentials: "include",
      headers,
      body: JSON.stringify({ enabled }),
    });
    if (r.ok) {
      setTemplates((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, enabled } : x))
      );
    }
  }

  async function preview(t: Template) {
    const sample: Record<string, string> = {};
    Object.keys(t.variables || {}).forEach((k) => (sample[k] = `[${k}]`));
    const headers = await getCsrfHeaders();
    const r = await fetch(`/api/admin/email-templates/${t.key}/preview`, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({ variables: sample }),
    });
    if (r.ok) {
      const d = await r.json();
      setPreviewSubject(d.subject);
      setPreviewHtml(d.html);
    }
  }

  async function testSend(t: Template) {
    if (!testTo) {
      toast({ title: "수신 이메일을 입력해주세요", variant: "destructive" });
      return;
    }
    const sample: Record<string, string> = {};
    Object.keys(t.variables || {}).forEach((k) => (sample[k] = `샘플-${k}`));
    const headers = await getCsrfHeaders();
    const r = await fetch(`/api/admin/email-templates/${t.key}/test-send`, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({ to: testTo, variables: sample }),
    });
    if (r.ok) {
      toast({ title: "테스트 이메일이 큐잉되었습니다" });
      loadLogs();
    } else {
      const d = await r.json().catch(() => ({}));
      toast({ title: d.error || "테스트 발송 실패", variant: "destructive" });
    }
  }

  async function resend(id: number) {
    const headers = await getCsrfHeaders();
    const r = await fetch(`/api/admin/email-logs/${id}/resend`, {
      method: "POST",
      credentials: "include",
      headers,
    });
    if (r.ok) {
      toast({ title: "재발송이 큐잉되었습니다" });
      loadLogs();
      loadCertLogs({ offset: 0 });
    } else {
      const d = await r.json().catch(() => ({}));
      toast({ title: d.error || "재발송 실패", variant: "destructive" });
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-admin-email">
      <div className="flex items-center gap-3">
        <Mail className="w-6 h-6" />
        <h1 className="text-2xl font-bold">이메일 알림 (SendGrid)</h1>
      </div>

      {serviceStatus && (serviceStatus.critical || serviceStatus.warnings.length > 0) && (
        <Alert
          variant={serviceStatus.critical ? "destructive" : "default"}
          data-testid="banner-email-status"
          className={serviceStatus.critical ? "" : "border-warning/40 bg-warning/10 text-warning"}
        >
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>
            {serviceStatus.critical
              ? "SendGrid 미설정 또는 발송 장애"
              : "SendGrid 설정 경고"}
          </AlertTitle>
          <AlertDescription>
            <div className="space-y-1 text-sm">
              <div>
                환경: <code>{serviceStatus.environment}</code> · API 키:{" "}
                <b>{serviceStatus.apiKeyPresent ? "설정됨" : "미설정"}</b> · 발신자:{" "}
                <b>{serviceStatus.fromEmailConfigured ? serviceStatus.fromEmail : "미설정 (기본값 사용 중)"}</b>
              </div>
              {serviceStatus.warnings.length > 0 && (
                <ul className="list-disc list-inside">
                  {serviceStatus.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
              {serviceStatus.consecutiveFailures > 0 && (
                <div>
                  연속 발송 실패: <b>{serviceStatus.consecutiveFailures}</b>건 (임계값{" "}
                  {serviceStatus.failureAlertThreshold}건 시 관리자 알림 전송)
                </div>
              )}
              {serviceStatus.lastFailureAt && (
                <div className="text-xs">
                  마지막 실패: {new Date(serviceStatus.lastFailureAt).toLocaleString("ko-KR")}
                </div>
              )}
              {serviceStatus.lastAlertAt && (
                <div className="text-xs">
                  마지막 관리자 알림 발송:{" "}
                  {new Date(serviceStatus.lastAlertAt).toLocaleString("ko-KR")}
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates" data-testid="tab-templates">
            템플릿
          </TabsTrigger>
          <TabsTrigger value="logs" data-testid="tab-logs">
            발송 이력
          </TabsTrigger>
          <TabsTrigger value="certificates" data-testid="tab-certificates">
            수료증 발송
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>이메일 템플릿</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <Label htmlFor="test-to">테스트 발송 이메일</Label>
                <Input
                  id="test-to"
                  data-testid="input-test-to"
                  type="email"
                  className="max-w-xs"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="me@example.com"
                />
              </div>
              {loadingTpl ? (
                <p>불러오는 중...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>키</TableHead>
                      <TableHead>활성</TableHead>
                      <TableHead className="w-80">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((t) => (
                      <TableRow key={t.id} data-testid={`row-template-${t.key}`}>
                        <TableCell>
                          <div className="font-medium">{t.name}</div>
                          <div className="text-xs text-gray-500">{t.description}</div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs">{t.key}</code>
                        </TableCell>
                        <TableCell>
                          <Switch
                            data-testid={`switch-template-${t.key}`}
                            checked={t.enabled}
                            onCheckedChange={(v) => toggleTemplate(t, v)}
                          />
                        </TableCell>
                        <TableCell className="space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => preview(t)}
                                data-testid={`button-preview-${t.key}`}
                              >
                                <Eye className="w-4 h-4 mr-1" /> 미리보기
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>{previewSubject}</DialogTitle>
                              </DialogHeader>
                              <div
                                className="prose max-w-none border p-4 rounded"
                                dangerouslySetInnerHTML={{ __html: previewHtml }}
                              />
                            </DialogContent>
                          </Dialog>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => testSend(t)}
                            data-testid={`button-test-${t.key}`}
                          >
                            <Send className="w-4 h-4 mr-1" /> 테스트 발송
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setEditing(t)}
                            data-testid={`button-edit-${t.key}`}
                          >
                            편집
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {editing && (
            <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>템플릿 편집 - {editing.key}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>이름</Label>
                    <Input
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>제목</Label>
                    <Input
                      value={editing.subject}
                      onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>본문 HTML</Label>
                    <Textarea
                      rows={8}
                      value={editing.bodyHtml || ""}
                      onChange={(e) => setEditing({ ...editing, bodyHtml: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>SendGrid 템플릿 ID (선택)</Label>
                    <Input
                      value={editing.sendgridTemplateId || ""}
                      onChange={(e) =>
                        setEditing({ ...editing, sendgridTemplateId: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>설명</Label>
                    <Textarea
                      rows={2}
                      value={editing.description || ""}
                      onChange={(e) =>
                        setEditing({ ...editing, description: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditing(null)}>
                      취소
                    </Button>
                    <Button onClick={() => saveTemplate(editing)} data-testid="button-save-template">
                      저장
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>발송 이력 ({logTotal})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-3">
                <Input
                  placeholder="수신자 검색"
                  className="max-w-xs"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  data-testid="input-log-search"
                />
                <select
                  className="border rounded px-2"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  data-testid="select-log-status"
                >
                  <option value="">전체 상태</option>
                  <option value="sent">발송됨</option>
                  <option value="queued">대기</option>
                  <option value="failed">실패</option>
                  <option value="skipped">건너뜀</option>
                </select>
                <select
                  className="border rounded px-2"
                  value={filterTemplate}
                  onChange={(e) => setFilterTemplate(e.target.value)}
                  data-testid="select-log-template"
                >
                  <option value="">전체 템플릿</option>
                  {templates.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <Button onClick={loadLogs} data-testid="button-search-logs">
                  <RefreshCw className="w-4 h-4 mr-1" /> 조회
                </Button>
              </div>

              {loadingLogs ? (
                <p>불러오는 중...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>일시</TableHead>
                      <TableHead>수신자</TableHead>
                      <TableHead>템플릿</TableHead>
                      <TableHead>제목</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>시도</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                        <TableCell className="text-xs">
                          {new Date(log.createdAt).toLocaleString("ko-KR")}
                        </TableCell>
                        <TableCell>{log.recipient}</TableCell>
                        <TableCell>
                          <code className="text-xs">{log.templateKey}</code>
                          <div className="text-xs text-gray-500">
                            {templateMap[log.templateKey]?.name}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{log.subject}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLOR[log.status] || ""}>{log.status}</Badge>
                          {log.lastError && (
                            <div className="text-xs text-destructive">{log.lastError}</div>
                          )}
                        </TableCell>
                        <TableCell>{log.attempts}</TableCell>
                        <TableCell>
                          {(log.status === "failed" || log.status === "skipped") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resend(log.id)}
                              data-testid={`button-resend-${log.id}`}
                            >
                              재발송
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {logs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-gray-500">
                          발송 이력이 없습니다
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificates">
          <Card>
            <CardHeader>
              <CardTitle>수료증 이메일 발송 내역 ({certTotal})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-3">
                <Input
                  placeholder="수신자 이메일 검색"
                  className="max-w-xs"
                  value={certSearch}
                  onChange={(e) => setCertSearch(e.target.value)}
                  data-testid="input-cert-search"
                />
                <select
                  className="border rounded px-2"
                  value={certStatus}
                  onChange={(e) => setCertStatus(e.target.value)}
                  data-testid="select-cert-status"
                >
                  <option value="">전체 상태</option>
                  <option value="sent">발송됨</option>
                  <option value="queued">대기</option>
                  <option value="failed">실패</option>
                  <option value="skipped">건너뜀</option>
                </select>
                <Button onClick={() => loadCertLogs({ offset: 0 })} data-testid="button-search-certs">
                  <RefreshCw className="w-4 h-4 mr-1" /> 조회
                </Button>
              </div>

              {loadingCerts ? (
                <p>불러오는 중...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>일시</TableHead>
                      <TableHead>수신자</TableHead>
                      <TableHead>코스</TableHead>
                      <TableHead>수료증 번호</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>시도</TableHead>
                      <TableHead>마지막 오류</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certLogs.map((log) => {
                      const p = log.payload || {};
                      return (
                        <TableRow key={log.id} data-testid={`row-cert-${log.id}`}>
                          <TableCell className="text-xs">
                            {new Date(log.createdAt).toLocaleString("ko-KR")}
                            {log.sentAt && (
                              <div className="text-xs text-gray-500">
                                발송:{" "}
                                {new Date(log.sentAt).toLocaleString("ko-KR")}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>{log.recipient}</div>
                            {p.name && (
                              <div className="text-xs text-gray-500">{p.name}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {p.courseTitle || "-"}
                            </div>
                            {p.trainerName && (
                              <div className="text-xs text-gray-500">
                                트레이너: {p.trainerName}
                              </div>
                            )}
                            {p.completedAt && (
                              <div className="text-xs text-gray-500">
                                수료일: {p.completedAt}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <code className="text-xs">
                              {p.certificateNo || "-"}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge className={STATUS_COLOR[log.status] || ""}>
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{log.attempts}</TableCell>
                          <TableCell className="max-w-xs">
                            {log.lastError ? (
                              <span className="text-xs text-destructive break-words">
                                {log.lastError}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {(log.status === "failed" || log.status === "skipped") && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => resend(log.id)}
                                data-testid={`button-resend-cert-${log.id}`}
                              >
                                재발송
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {certLogs.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-gray-500"
                        >
                          수료증 이메일 발송 이력이 없습니다
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
              {certLogs.length > 0 && certLogs.length < certTotal && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    disabled={loadingCerts}
                    onClick={() => loadCertLogs({ append: true, offset: certOffset })}
                    data-testid="button-load-more-certs"
                  >
                    더 보기 ({certLogs.length} / {certTotal})
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
