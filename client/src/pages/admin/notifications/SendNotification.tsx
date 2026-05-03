import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Send, Loader2, Search, X, Users as UsersIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type Category = "message" | "reservation" | "payment" | "system" | "training";
type TargetType = "users" | "role" | "all";

const CATEGORY_OPTIONS: Array<{ value: Category; label: string; description: string }> = [
  { value: "message", label: "메시지", description: "1:1 메시지/채팅 관련 알림" },
  { value: "reservation", label: "예약", description: "예약/강좌 일정 관련 알림" },
  { value: "payment", label: "결제", description: "결제/환불 관련 알림" },
  { value: "system", label: "시스템", description: "공지/시스템 알림 (기본값)" },
  { value: "training", label: "교육", description: "교육/훈련 관련 알림" },
];

const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "pet-owner", label: "반려인 (pet-owner)" },
  { value: "trainer", label: "전문가/훈련사 (trainer)" },
  { value: "institute-admin", label: "기관 관리자 (institute-admin)" },
  { value: "admin", label: "관리자 (admin)" },
];

interface AdminUser {
  id: number;
  name: string | null;
  email: string | null;
  role: string;
}

interface SendResult {
  total: number;
  successCount: number;
  failedCount: number;
  failures?: Array<{ userId: number; error: string }>;
  message?: string;
}

export default function AdminSendNotification() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [category, setCategory] = useState<Category>("system");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [targetType, setTargetType] = useState<TargetType>("users");
  const [role, setRole] = useState<string>("pet-owner");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<SendResult | null>(null);

  type UsersResponse = AdminUser[] | { success?: boolean; data?: AdminUser[] };

  const { data: usersResp, isLoading: usersLoading } = useQuery<UsersResponse>({
    queryKey: ["/api/admin/users"],
  });

  const users: AdminUser[] = useMemo(() => {
    if (!usersResp) return [];
    if (Array.isArray(usersResp)) return usersResp;
    if (Array.isArray(usersResp.data)) return usersResp.data;
    return [];
  }, [usersResp]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users.slice(0, 50);
    return users
      .filter((u) => {
        const name = (u.name || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        const role = (u.role || "").toLowerCase();
        return (
          name.includes(q) ||
          email.includes(q) ||
          role.includes(q) ||
          String(u.id).includes(q)
        );
      })
      .slice(0, 50);
  }, [users, userSearch]);

  const selectedUsers = useMemo(
    () => users.filter((u) => selectedUserIds.includes(u.id)),
    [users, selectedUserIds],
  );

  const toggleUser = (id: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: "입력 오류",
        description: "제목과 내용을 입력하세요.",
        variant: "destructive",
      });
      return;
    }
    if (targetType === "users" && selectedUserIds.length === 0) {
      toast({
        title: "대상 선택 필요",
        description: "발송할 사용자를 1명 이상 선택하세요.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      category,
      title: title.trim(),
      message: message.trim(),
      actionUrl: actionUrl.trim() || undefined,
      targetType,
      userIds: targetType === "users" ? selectedUserIds : undefined,
      role: targetType === "role" ? role : undefined,
    };

    setSubmitting(true);
    setLastResult(null);
    try {
      const res = await apiRequest("POST", "/api/admin/notifications/send", payload);
      const json = (await res.json()) as Partial<SendResult> & { message?: string };
      const result: SendResult = {
        total: json.total ?? 0,
        successCount: json.successCount ?? 0,
        failedCount: json.failedCount ?? 0,
        failures: json.failures,
        message: json.message,
      };
      setLastResult(result);
      toast({
        title: "발송 완료",
        description:
          result.message ||
          `성공 ${result.successCount}건 / 실패 ${result.failedCount}건 (총 ${result.total}명)`,
      });
    } catch (err) {
      const description =
        err instanceof Error ? err.message : "알림 발송 중 오류가 발생했습니다.";
      toast({
        title: "발송 실패",
        description,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/alerts")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> 뒤로
        </Button>
        <div>
          <h1 className="text-2xl font-bold">알림 발송</h1>
          <p className="text-sm text-muted-foreground">
            카테고리별로 특정 사용자 또는 역할 그룹에게 인앱/푸시 알림을 발송합니다.
            사용자가 해당 카테고리 수신을 끈 경우 발송이 자동으로 스킵됩니다.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>알림 내용</CardTitle>
            <CardDescription>카테고리, 제목, 내용, 액션 URL을 입력하세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-1 block">카테고리</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{opt.label}</span>
                        <span className="text-xs text-muted-foreground">{opt.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1 block">제목 *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="알림 제목"
                maxLength={200}
              />
              <div className="text-xs text-muted-foreground text-right mt-1">
                {title.length}/200
              </div>
            </div>

            <div>
              <Label className="mb-1 block">내용 *</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="알림 본문"
                rows={5}
                maxLength={2000}
              />
              <div className="text-xs text-muted-foreground text-right mt-1">
                {message.length}/2000
              </div>
            </div>

            <div>
              <Label className="mb-1 block">액션 URL (선택)</Label>
              <Input
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                placeholder="예) /messages, https://example.com/..."
                maxLength={500}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>대상 선택</CardTitle>
            <CardDescription>발송 대상을 선택하세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={targetType} onValueChange={(v) => setTargetType(v as TargetType)}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="users">사용자</TabsTrigger>
                <TabsTrigger value="role">역할</TabsTrigger>
                <TabsTrigger value="all">전체</TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="space-y-3 mt-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="이름/이메일/역할/ID 검색"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>

                {selectedUsers.length > 0 && (
                  <div className="border rounded-md p-2 bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">
                      선택됨 ({selectedUsers.length}명)
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                      {selectedUsers.map((u) => (
                        <Badge
                          key={u.id}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => toggleUser(u.id)}
                        >
                          {u.name || u.email || `#${u.id}`}
                          <X className="w-3 h-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border rounded-md max-h-72 overflow-y-auto divide-y">
                  {usersLoading ? (
                    <div className="p-3 text-sm text-muted-foreground">사용자 로딩 중...</div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">결과 없음</div>
                  ) : (
                    filteredUsers.map((u) => {
                      const checked = selectedUserIds.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => toggleUser(u.id)}
                          className={`w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center justify-between ${
                            checked ? "bg-primary/10" : ""
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {u.name || u.email || `사용자 #${u.id}`}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {u.email} · {u.role} · #{u.id}
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            readOnly
                            checked={checked}
                            className="ml-2 pointer-events-none"
                          />
                        </button>
                      );
                    })
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  최대 50명까지 표시됩니다. 검색으로 좁히세요.
                </div>
              </TabsContent>

              <TabsContent value="role" className="space-y-3 mt-4">
                <Label>대상 역할</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <UsersIcon className="w-3 h-3" />
                  해당 역할의 활성 사용자 전원에게 발송됩니다.
                </div>
              </TabsContent>

              <TabsContent value="all" className="space-y-3 mt-4">
                <div className="text-sm">전체 활성 사용자에게 발송합니다.</div>
                <div className="text-xs text-muted-foreground">
                  주의: 모든 활성 사용자에게 동시에 발송되므로 신중히 사용하세요.
                </div>
              </TabsContent>
            </Tabs>

            <Button
              className="w-full mt-6"
              onClick={handleSubmit}
              disabled={submitting}
              data-testid="button-send-notification"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 발송 중...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" /> 알림 발송
                </>
              )}
            </Button>

            {lastResult && (
              <div className="mt-4 p-3 rounded-md border bg-muted/40 text-sm space-y-1">
                <div>
                  대상: <strong>{lastResult.total}명</strong>
                </div>
                <div className="text-green-700">
                  성공: <strong>{lastResult.successCount}건</strong>
                </div>
                <div className={lastResult.failedCount > 0 ? "text-red-700" : ""}>
                  실패: <strong>{lastResult.failedCount}건</strong>
                </div>
                {lastResult.failures && lastResult.failures.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs">실패 상세 ({lastResult.failures.length})</summary>
                    <ul className="mt-1 text-xs space-y-0.5 max-h-32 overflow-y-auto">
                      {lastResult.failures.map((f, i) => (
                        <li key={i}>
                          #{f.userId}: {f.error}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
