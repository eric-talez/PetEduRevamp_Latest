import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Bell,
  CheckCheck,
  Trash2,
  MessageSquare,
  Calendar,
  CreditCard,
  Settings as SettingsIcon,
  Info,
  Check,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Category = "all" | "message" | "reservation" | "payment" | "system";
type ReadFilter = "all" | "unread" | "read";

interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  category?: string;
  isRead: boolean;
  actionUrl?: string | null;
  createdAt: string;
}

interface PreferenceItem {
  category: "message" | "reservation" | "payment" | "system";
  inAppEnabled: boolean;
  pushEnabled: boolean;
}

const CATEGORY_LABEL: Record<string, string> = {
  message: "메시지",
  reservation: "예약",
  payment: "결제",
  system: "시스템",
};

type IconComponent = typeof Bell;
const CATEGORY_ICON: Record<string, IconComponent> = {
  message: MessageSquare,
  reservation: Calendar,
  payment: CreditCard,
  system: SettingsIcon,
};

interface BulkMarkReadResponse {
  success: boolean;
  updatedCount?: number;
}
interface MarkAllReadResponse {
  success: boolean;
  markedCount?: number;
}
interface PreferencesResponse {
  success: boolean;
  preferences: PreferenceItem[];
}
interface UpdatePrefContext {
  previous: PreferencesResponse | undefined;
}

function deriveCategory(n: NotificationItem): string {
  if (n.category) return n.category;
  if (n.type === "message") return "message";
  if (["reservation", "course", "training"].includes(n.type)) return "reservation";
  if (n.type === "payment") return "payment";
  return "system";
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return d.toLocaleDateString("ko-KR");
}

export default function NotificationCenterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [category, setCategory] = useState<Category>("all");
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // 알림 목록
  const { data, isLoading } = useQuery<{
    success: boolean;
    notifications: NotificationItem[];
    total: number;
  }>({
    queryKey: ["/api/notifications", { limit: 100 }],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/notifications?limit=100");
      return res.json();
    },
    refetchInterval: 30000,
  });

  // 수신 설정
  const { data: prefsData } = useQuery<{ success: boolean; preferences: PreferenceItem[] }>({
    queryKey: ["/api/notifications/preferences"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/notifications/preferences");
      return res.json();
    },
  });

  const allNotifications = data?.notifications ?? [];

  const filtered = useMemo(() => {
    let list = allNotifications;
    if (category !== "all") {
      list = list.filter((n) => deriveCategory(n) === category);
    }
    if (readFilter === "unread") list = list.filter((n) => !n.isRead);
    if (readFilter === "read") list = list.filter((n) => n.isRead);
    return list;
  }, [allNotifications, category, readFilter]);

  const counts = useMemo(() => {
    const c = { all: 0, message: 0, reservation: 0, payment: 0, system: 0 };
    allNotifications.forEach((n) => {
      if (!n.isRead) {
        c.all++;
        const cat = deriveCategory(n) as keyof typeof c;
        if (cat in c) c[cat]++;
      }
    });
    return c;
  }, [allNotifications]);

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/notifications/${id}`, { isRead: true });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markUnreadMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/notifications/${id}`, { isRead: false });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const bulkMarkReadMutation = useMutation<BulkMarkReadResponse, Error, number[]>({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("PATCH", "/api/notifications/mark-read", {
        notificationIds: ids,
        updates: { isRead: true },
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "읽음 처리 완료", description: `${data.updatedCount ?? 0}개 알림이 처리되었습니다.` });
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation<MarkAllReadResponse, Error, void>({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/notifications/mark-all-read");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "전체 읽음", description: `${data.markedCount ?? 0}개 알림이 모두 읽음 처리되었습니다.` });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/notifications/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const updatePrefMutation = useMutation<unknown, Error, PreferenceItem, UpdatePrefContext>({
    mutationFn: async (pref) => {
      const res = await apiRequest("PATCH", "/api/notifications/preferences", pref);
      return res.json();
    },
    onMutate: async (pref) => {
      await queryClient.cancelQueries({ queryKey: ["/api/notifications/preferences"] });
      const previous = queryClient.getQueryData<PreferencesResponse>([
        "/api/notifications/preferences",
      ]);
      if (previous?.preferences) {
        queryClient.setQueryData<PreferencesResponse>(
          ["/api/notifications/preferences"],
          {
            ...previous,
            preferences: previous.preferences.map((p) =>
              p.category === pref.category ? { ...p, ...pref } : p
            ),
          }
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["/api/notifications/preferences"], context.previous);
      }
      toast({ title: "설정 저장 실패", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/preferences"] });
    },
  });

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected = filtered.length > 0 && filtered.every((n) => selectedIds.has(n.id));
  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((n) => n.id)));
    }
  };

  const handleClick = (n: NotificationItem) => {
    if (!n.isRead) markReadMutation.mutate(n.id);
    if (n.actionUrl) setLocation(n.actionUrl);
  };

  const renderCategoryTab = (key: Category, label: string, count: number) => (
    <TabsTrigger value={key} className="relative" data-testid={`tab-${key}`}>
      {label}
      {count > 0 && (
        <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
          {count > 99 ? "99+" : count}
        </Badge>
      )}
    </TabsTrigger>
  );

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-5xl">
      <header className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold" data-testid="text-page-title">알림 센터</h1>
            {counts.all > 0 && (
              <Badge variant="destructive" data-testid="badge-total-unread">{counts.all}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={counts.all === 0 || markAllReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              {markAllReadMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4 mr-1" />
              )}
              모두 읽음
            </Button>
          </div>
        </div>
      </header>

      <Tabs value={category} onValueChange={(v) => setCategory(v as Category)} className="mb-4">
        <TabsList className="grid grid-cols-5 w-full">
          {renderCategoryTab("all", "전체", counts.all)}
          {renderCategoryTab("message", "메시지", counts.message)}
          {renderCategoryTab("reservation", "예약", counts.reservation)}
          {renderCategoryTab("payment", "결제", counts.payment)}
          {renderCategoryTab("system", "시스템", counts.system)}
        </TabsList>

        <TabsContent value={category} className="mt-4 space-y-4">
          {/* Read filter + bulk action toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-2 px-1">
            <div className="flex gap-1">
              {(["all", "unread", "read"] as ReadFilter[]).map((f) => (
                <Button
                  key={f}
                  variant={readFilter === f ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setReadFilter(f)}
                  data-testid={`filter-${f}`}
                >
                  {f === "all" ? "전체" : f === "unread" ? "안 읽음" : "읽음"}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {filtered.length > 0 && (
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={toggleSelectAll}
                    data-testid="checkbox-select-all"
                  />
                  전체 선택
                </label>
              )}
              {selectedIds.size > 0 && (
                <Button
                  size="sm"
                  onClick={() => bulkMarkReadMutation.mutate(Array.from(selectedIds))}
                  disabled={bulkMarkReadMutation.isPending}
                  data-testid="button-bulk-mark-read"
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  선택 {selectedIds.size}개 읽음
                </Button>
              )}
            </div>
          </div>

          {/* Notification list */}
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {isLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Info className="h-10 w-10 mb-3 opacity-40" />
                    <p data-testid="text-empty">알림이 없습니다.</p>
                  </div>
                ) : (
                  <ul className="divide-y">
                    {filtered.map((n) => {
                      const cat = deriveCategory(n);
                      const Icon = CATEGORY_ICON[cat] || Bell;
                      const selected = selectedIds.has(n.id);
                      return (
                        <li
                          key={n.id}
                          className={`flex items-start gap-3 p-4 hover:bg-muted/40 transition-colors ${
                            !n.isRead ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                          }`}
                          data-testid={`notification-item-${n.id}`}
                        >
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => toggleSelect(n.id)}
                            className="mt-1"
                            data-testid={`checkbox-${n.id}`}
                          />
                          <div
                            className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center cursor-pointer"
                            onClick={() => handleClick(n)}
                          >
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => handleClick(n)}
                          >
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs text-muted-foreground">
                                {CATEGORY_LABEL[cat]}
                              </span>
                              {!n.isRead && (
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                              )}
                            </div>
                            <h4 className={`text-sm ${!n.isRead ? "font-semibold" : "font-medium"}`}>
                              {n.title}
                            </h4>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                              {n.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatTime(n.createdAt)}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1">
                            {n.isRead ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                title="안 읽음으로 표시"
                                onClick={(e) => { e.stopPropagation(); markUnreadMutation.mutate(n.id); }}
                                data-testid={`button-mark-unread-${n.id}`}
                              >
                                <Check className="h-3.5 w-3.5 opacity-50" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                title="읽음으로 표시"
                                onClick={(e) => { e.stopPropagation(); markReadMutation.mutate(n.id); }}
                                data-testid={`button-mark-read-${n.id}`}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              title="삭제"
                              onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(n.id); }}
                              data-testid={`button-delete-${n.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 수신 설정 카드 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            알림 수신 설정
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            카테고리별로 인앱 알림과 푸시 알림 수신 여부를 설정할 수 있습니다.
          </p>
          <div className="space-y-3">
            {(prefsData?.preferences ?? []).map((pref) => {
              const Icon = CATEGORY_ICON[pref.category] || Bell;
              return (
                <div
                  key={pref.category}
                  className="flex items-center justify-between gap-4 p-3 rounded-md border"
                  data-testid={`pref-row-${pref.category}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{CATEGORY_LABEL[pref.category]}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">인앱</span>
                      <Switch
                        checked={pref.inAppEnabled}
                        onCheckedChange={(checked) =>
                          updatePrefMutation.mutate({ ...pref, inAppEnabled: checked })
                        }
                        data-testid={`switch-inapp-${pref.category}`}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">푸시</span>
                      <Switch
                        checked={pref.pushEnabled}
                        onCheckedChange={(checked) =>
                          updatePrefMutation.mutate({ ...pref, pushEnabled: checked })
                        }
                        data-testid={`switch-push-${pref.category}`}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
