import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  RefreshCw,
  Bell,
  AlertTriangle,
  Shield,
  Database,
  Search,
  Check,
  X,
  Filter,
  MoreVertical,
  Clock,
  Eye,
  Trash2,
  Send,
  Calendar,
  Users as UsersIcon,
  Smartphone,
  Globe,
  Mail,
  BellRing,
  CheckCircle2,
  Settings,
  MessageSquare,
  TestTube,
  Save,
  Loader2
} from 'lucide-react';
import { useLocation } from 'wouter';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { getCSRFToken } from '@/lib/csrf';
import { useGlobalAuth } from '@/hooks/useGlobalAuth';
import { Separator } from '@/components/ui/separator';

interface Notification {
  id: number;
  title: string;
  content: string;
  type: 'system' | 'security' | 'user' | 'database' | 'warning';
  status: 'unread' | 'read';
  createdAt: string;
  priority: 'low' | 'medium' | 'high';
  actions?: string[];
}

// PushNotificationTab component types
interface Campaign {
  id: number;
  title: string;
  message: string;
  status: string;
  targetType: string;
  targetCriteria: any;
  scheduledAt: string | null;
  sentAt: string | null;
  totalRecipients: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
}

interface SegmentData {
  roles: { value: string; label: string; count: number }[];
  petTypes: { value: string; label: string; count: number }[];
  devices: { web: number; android: number; ios: number; total: number };
}

// EmailNotificationsTab component types
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

interface ResendRequestItem {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl: string | null;
  metadata: {
    source?: string;
    emailLogId?: number;
    trainerId?: number;
    recipient?: string;
    courseId?: number | null;
    certificateNo?: string | null;
  } | null;
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

// SendNotificationTab component types
type Category = "message" | "reservation" | "payment" | "system" | "training";
type TargetType = "users" | "role" | "all";

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

// MessagingSettingsTab component types
type MessagingSettings = {
  region: string;
  accessKey: string;
  secretKey: string;
  sesFromEmail: string;
  sesConfigurationSet: string;
  snsDefaultSmsType: string;
  snsSenderId: string;
  pinpointAppId: string;
  chimeAppInstanceArn: string;
};

// --- PushNotificationTab ---
function PushNotificationTab() {
  const { toast } = useToast();
  const [newCampaign, setNewCampaign] = useState({
    title: '',
    message: '',
    targetType: 'all',
    targetCriteria: {} as { role?: string; petTypes?: string[] },
    scheduledAt: '',
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const { data: campaignsData, isLoading: campaignsLoading, refetch: refetchCampaigns } = useQuery<{ campaigns: Campaign[]; pagination: any }>({
    queryKey: ['/api/admin/push/campaigns'],
  });

  const { data: segmentData } = useQuery<SegmentData>({
    queryKey: ['/api/admin/push/segments'],
  });

  const sendNowMutation = useMutation({
    mutationFn: async (data: typeof newCampaign) => {
      return apiRequest('POST', '/api/admin/push/send-now', {
        title: data.title,
        message: data.message,
        targetType: data.targetType,
        targetCriteria: data.targetCriteria,
      });
    },
    onSuccess: () => {
      toast({ title: '발송 시작', description: '푸시 알림 발송이 시작되었습니다.' });
      setIsCreateDialogOpen(false);
      setNewCampaign({ title: '', message: '', targetType: 'all', targetCriteria: {}, scheduledAt: '' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/push/campaigns'] });
    },
    onError: () => {
      toast({ title: '오류', description: '발송에 실패했습니다.', variant: 'destructive' });
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: typeof newCampaign) => {
      return apiRequest('POST', '/api/admin/push/campaigns', {
        title: data.title,
        message: data.message,
        targetType: data.targetType,
        targetCriteria: data.targetCriteria,
        scheduledAt: data.scheduledAt || null,
        status: data.scheduledAt ? 'scheduled' : 'draft',
      });
    },
    onSuccess: () => {
      toast({ title: '성공', description: '캠페인이 생성되었습니다.' });
      setIsCreateDialogOpen(false);
      setNewCampaign({ title: '', message: '', targetType: 'all', targetCriteria: {}, scheduledAt: '' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/push/campaigns'] });
    },
    onError: () => {
      toast({ title: '오류', description: '캠페인 생성에 실패했습니다.', variant: 'destructive' });
    },
  });

  const sendCampaignMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('POST', `/api/admin/push/campaigns/${id}/send`);
    },
    onSuccess: () => {
      toast({ title: '발송 시작', description: '캠페인 발송이 시작되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/push/campaigns'] });
    },
    onError: () => {
      toast({ title: '오류', description: '발송에 실패했습니다.', variant: 'destructive' });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/admin/push/campaigns/${id}`);
    },
    onSuccess: () => {
      toast({ title: '삭제됨', description: '캠페인이 삭제되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/push/campaigns'] });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "warning" | "default" | "success" | "secondary" | "outline" | "info" | "danger" | "purple" }> = {
      draft: { label: '초안', variant: 'secondary' },
      scheduled: { label: '예약됨', variant: 'outline' },
      sending: { label: '발송 중', variant: 'default' },
      completed: { label: '완료', variant: 'default' },
      cancelled: { label: '취소됨', variant: 'danger' },
    };
    const s = statusMap[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const getTargetLabel = (targetType: string, criteria?: any) => {
    if (targetType === 'all') return '전체 사용자';
    if (targetType === 'role' && criteria?.role) {
      const roleLabels: Record<string, string> = {
        'pet-owner': '반려인',
        trainer: '훈련사',
        'institute-admin': '기관 관리자',
      };
      return roleLabels[criteria.role] || criteria.role;
    }
    if (targetType === 'segment') return '세그먼트';
    return targetType;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">푸시 알림 관리</h1>
          <p className="text-muted-foreground">대량 발송, 예약 발송, 세그먼트 발송을 관리합니다</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetchCampaigns()} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-campaign">
                <Bell className="h-4 w-4 mr-2" />
                새 푸시 발송
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>푸시 알림 발송</DialogTitle>
                <DialogDescription>대상을 선택하고 메시지를 작성하세요</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">제목</Label>
                  <Input
                    id="title"
                    value={newCampaign.title}
                    onChange={(e) => setNewCampaign({ ...newCampaign, title: e.target.value })}
                    placeholder="알림 제목"
                    data-testid="input-title"
                  />
                </div>
                <div>
                  <Label htmlFor="message">메시지</Label>
                  <Textarea
                    id="message"
                    value={newCampaign.message}
                    onChange={(e) => setNewCampaign({ ...newCampaign, message: e.target.value })}
                    placeholder="알림 내용을 입력하세요"
                    rows={3}
                    data-testid="input-message"
                  />
                </div>
                <div>
                  <Label htmlFor="targetType">발송 대상</Label>
                  <Select
                    value={newCampaign.targetType}
                    onValueChange={(value) => setNewCampaign({ ...newCampaign, targetType: value, targetCriteria: {} })}
                  >
                    <SelectTrigger data-testid="select-target-type">
                      <SelectValue placeholder="대상 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 사용자 ({segmentData?.devices.total || 0}명)</SelectItem>
                      <SelectItem value="role">역할별</SelectItem>
                      <SelectItem value="segment">세그먼트</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newCampaign.targetType === 'role' && (
                  <div>
                    <Label>역할 선택</Label>
                    <Select
                      value={newCampaign.targetCriteria.role || ''}
                      onValueChange={(value) => setNewCampaign({ ...newCampaign, targetCriteria: { role: value } })}
                    >
                      <SelectTrigger data-testid="select-role">
                        <SelectValue placeholder="역할 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {segmentData?.roles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label} ({role.count}명)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!newCampaign.targetCriteria.role && (
                      <p className="text-xs text-destructive mt-1">역할을 선택해주세요</p>
                    )}
                  </div>
                )}
                {newCampaign.targetType === 'segment' && (
                  <div>
                    <Label>반려동물 유형</Label>
                    <div className="flex flex-wrap gap-3 mt-2">
                      {segmentData?.petTypes.map((petType) => (
                        <div key={petType.value} className="flex items-center gap-2">
                          <Checkbox
                            id={`pet-${petType.value}`}
                            checked={newCampaign.targetCriteria.petTypes?.includes(petType.value) || false}
                            onCheckedChange={(checked) => {
                              const currentTypes = newCampaign.targetCriteria.petTypes || [];
                              const newTypes = checked
                                ? [...currentTypes, petType.value]
                                : currentTypes.filter((t: string) => t !== petType.value);
                              setNewCampaign({
                                ...newCampaign,
                                targetCriteria: { petTypes: newTypes },
                              });
                            }}
                            data-testid={`checkbox-pet-${petType.value}`}
                          />
                          <Label htmlFor={`pet-${petType.value}`} className="text-sm cursor-pointer">
                            {petType.label} ({petType.count}명)
                          </Label>
                        </div>
                      ))}
                    </div>
                    {(!newCampaign.targetCriteria.petTypes || newCampaign.targetCriteria.petTypes.length === 0) && (
                      <p className="text-xs text-destructive mt-2">반려동물 유형을 하나 이상 선택해주세요</p>
                    )}
                  </div>
                )}
                <div>
                  <Label htmlFor="scheduledAt">예약 발송 (선택)</Label>
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    value={newCampaign.scheduledAt}
                    onChange={(e) => setNewCampaign({ ...newCampaign, scheduledAt: e.target.value })}
                    data-testid="input-scheduled-at"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  {(() => {
                    const isBasicValid = newCampaign.title && newCampaign.message;
                    const isTargetValid =
                      newCampaign.targetType === 'all' ||
                      (newCampaign.targetType === 'role' && newCampaign.targetCriteria.role) ||
                      (newCampaign.targetType === 'segment' && newCampaign.targetCriteria.petTypes?.length > 0);
                    const canSubmit = isBasicValid && isTargetValid;

                    return newCampaign.scheduledAt ? (
                      <Button
                        onClick={() => createCampaignMutation.mutate(newCampaign)}
                        disabled={!canSubmit || createCampaignMutation.isPending}
                        data-testid="button-schedule"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        {createCampaignMutation.isPending ? '예약 중...' : '예약 발송'}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => sendNowMutation.mutate(newCampaign)}
                        disabled={!canSubmit || sendNowMutation.isPending}
                        data-testid="button-send-now"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {sendNowMutation.isPending ? '발송 중...' : '즉시 발송'}
                      </Button>
                    );
                  })()}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">등록된 기기</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{segmentData?.devices.total || 0}</div>
            <div className="text-xs text-muted-foreground flex gap-2 mt-1">
              <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> 웹 {segmentData?.devices.web || 0}</span>
              <span className="flex items-center gap-1"><Smartphone className="h-3 w-3" /> 앱 {(segmentData?.devices.android || 0) + (segmentData?.devices.ios || 0)}</span>
            </div>
          </CardContent>
        </Card>
        {segmentData?.roles.map((role) => (
          <Card key={role.value}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{role.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{role.count}</div>
              <div className="text-xs text-muted-foreground">명</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns" data-testid="tab-campaigns">캠페인 목록</TabsTrigger>
          <TabsTrigger value="scheduled" data-testid="tab-scheduled">예약 발송</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>발송 내역</CardTitle>
              <CardDescription>생성된 캠페인 및 발송 결과를 확인합니다</CardDescription>
            </CardHeader>
            <CardContent>
              {campaignsLoading ? (
                <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
              ) : campaignsData?.campaigns?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">발송 내역이 없습니다</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>제목</TableHead>
                      <TableHead>대상</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>발송 결과</TableHead>
                      <TableHead>생성일</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaignsData?.campaigns?.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">{campaign.title}</TableCell>
                        <TableCell>{getTargetLabel(campaign.targetType, campaign.targetCriteria)}</TableCell>
                        <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                        <TableCell>
                          {campaign.status === 'completed' ? (
                            <span className="text-sm">
                              성공 {campaign.successCount} / 실패 {campaign.failureCount}
                            </span>
                          ) : campaign.status === 'scheduled' ? (
                            <span className="text-sm text-muted-foreground">
                              {campaign.scheduledAt && new Date(campaign.scheduledAt).toLocaleString('ko-KR')}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{new Date(campaign.createdAt).toLocaleDateString('ko-KR')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendCampaignMutation.mutate(campaign.id)}
                                disabled={sendCampaignMutation.isPending}
                                data-testid={`button-send-campaign-${campaign.id}`}
                              >
                                <Send className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedCampaign(campaign)}
                              data-testid={`button-view-campaign-${campaign.id}`}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            {campaign.status !== 'sending' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => deleteCampaignMutation.mutate(campaign.id)}
                                data-testid={`button-delete-campaign-${campaign.id}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle>예약된 발송</CardTitle>
              <CardDescription>예약된 푸시 알림 목록입니다</CardDescription>
            </CardHeader>
            <CardContent>
              {campaignsData?.campaigns?.filter((c) => c.status === 'scheduled').length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">예약된 발송이 없습니다</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>제목</TableHead>
                      <TableHead>대상</TableHead>
                      <TableHead>예약 시간</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaignsData?.campaigns
                      ?.filter((c) => c.status === 'scheduled')
                      .map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell className="font-medium">{campaign.title}</TableCell>
                          <TableCell>{getTargetLabel(campaign.targetType, campaign.targetCriteria)}</TableCell>
                          <TableCell>
                            {campaign.scheduledAt && new Date(campaign.scheduledAt).toLocaleString('ko-KR')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendCampaignMutation.mutate(campaign.id)}
                                data-testid={`button-send-scheduled-${campaign.id}`}
                              >
                                즉시 발송
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => deleteCampaignMutation.mutate(campaign.id)}
                                data-testid={`button-delete-scheduled-${campaign.id}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedCampaign && (
        <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedCampaign.title}</DialogTitle>
              <DialogDescription>캠페인 상세 정보</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">메시지</Label>
                <p className="mt-1">{selectedCampaign.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">상태</Label>
                  <div className="mt-1">{getStatusBadge(selectedCampaign.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">발송 대상</Label>
                  <p className="mt-1">{getTargetLabel(selectedCampaign.targetType, selectedCampaign.targetCriteria)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">생성일</Label>
                  <p className="mt-1">{new Date(selectedCampaign.createdAt).toLocaleString('ko-KR')}</p>
                </div>
                {selectedCampaign.sentAt && (
                  <div>
                    <Label className="text-muted-foreground">발송 완료일</Label>
                    <p className="mt-1">{new Date(selectedCampaign.sentAt).toLocaleString('ko-KR')}</p>
                  </div>
                )}
              </div>
              {selectedCampaign.status === 'completed' && (
                <div className="p-4 bg-muted rounded-lg">
                  <Label className="text-muted-foreground mb-2 block">발송 결과</Label>
                  <div className="grid grid-cols-3 text-center">
                    <div>
                      <p className="text-2xl font-bold">{selectedCampaign.totalRecipients}</p>
                      <p className="text-xs text-muted-foreground">총 대상</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-success">{selectedCampaign.successCount}</p>
                      <p className="text-xs text-muted-foreground">성공</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-destructive">{selectedCampaign.failureCount}</p>
                      <p className="text-xs text-muted-foreground">실패</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// --- EmailNotificationsTab ---
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

function EmailNotificationsTab() {
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
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window === "undefined") return "templates";
    const h = window.location.hash.replace("#", "");
    if (h === "requests" || h === "logs" || h === "certificates" || h === "templates") {
      return h;
    }
    return "templates";
  });
  const [resendRequests, setResendRequests] = useState<ResendRequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [showOnlyUnreadRequests, setShowOnlyUnreadRequests] = useState(true);
  const [processingRequestId, setProcessingRequestId] = useState<number | null>(null);

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

  async function loadResendRequests() {
    setLoadingRequests(true);
    try {
      const r = await fetch(`/api/notifications?page=1&limit=100`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      const list: any[] = Array.isArray(data) ? data : data.notifications || [];
      const filtered: ResendRequestItem[] = list
        .filter((n) => {
          const meta = n.metadata || n.data || null;
          return meta && meta.source === "trainer-cert-resend-request";
        })
        .map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          isRead: !!n.isRead,
          createdAt: n.createdAt,
          actionUrl: n.actionUrl ?? null,
          metadata: n.metadata || n.data || null,
        }));
      setResendRequests(filtered);
    } catch {
      toast({
        title: "재발송 요청을 불러오지 못했습니다",
        variant: "destructive",
      });
    } finally {
      setLoadingRequests(false);
    }
  }

  async function markRequestRead(notificationId: number) {
    const headers = await getCsrfHeaders();
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
        credentials: "include",
        headers,
      });
      setResendRequests((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch {
      /* noop */
    }
  }

  async function resendFromRequest(req: ResendRequestItem) {
    const emailLogId = req.metadata?.emailLogId;
    if (!emailLogId) {
      toast({ title: "이메일 로그 정보를 찾을 수 없습니다", variant: "destructive" });
      return;
    }
    setProcessingRequestId(req.id);
    const headers = await getCsrfHeaders();
    try {
      const r = await fetch(`/api/admin/email-logs/${emailLogId}/resend`, {
        method: "POST",
        credentials: "include",
        headers,
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || "재발송 실패");
      }
      await markRequestRead(req.id);
      toast({ title: "재발송이 큐잉되었습니다" });
      loadLogs();
      loadCertLogs({ offset: 0 });
    } catch (e: any) {
      toast({ title: e?.message || "재발송 실패", variant: "destructive" });
    } finally {
      setProcessingRequestId(null);
    }
  }

  useEffect(() => {
    loadTemplates();
    loadLogs();
    loadCertLogs();
    loadStatus();
    loadResendRequests();
    const id = setInterval(loadStatus, 30_000);
    const reqTimer = setInterval(loadResendRequests, 60_000);
    return () => {
      clearInterval(id);
      clearInterval(reqTimer);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      const h = window.location.hash.replace("#", "");
      if (h === "requests" || h === "logs" || h === "certificates" || h === "templates") {
        setActiveTab(h);
      }
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const unreadRequestCount = useMemo(
    () => resendRequests.filter((r) => !r.isRead).length,
    [resendRequests]
  );

  const visibleRequests = useMemo(
    () =>
      showOnlyUnreadRequests
        ? resendRequests.filter((r) => !r.isRead)
        : resendRequests,
    [resendRequests, showOnlyUnreadRequests]
  );

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

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          if (typeof window !== "undefined") {
            history.replaceState(null, "", `#${v}`);
          }
          if (v === "requests") loadResendRequests();
        }}
      >
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
          <TabsTrigger value="requests" data-testid="tab-resend-requests">
            <BellRing className="w-4 h-4 mr-1" />
            재발송 요청
            {unreadRequestCount > 0 && (
              <Badge
                className="ml-2 bg-destructive text-destructive-foreground"
                data-testid="badge-resend-requests-unread"
              >
                {unreadRequestCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span>트레이너 재발송 요청 ({resendRequests.length})</span>
                <div className="flex items-center gap-2 text-sm font-normal">
                  <Label htmlFor="filter-unread-requests" className="cursor-pointer">
                    읽지 않음만 보기
                  </Label>
                  <Switch
                    id="filter-unread-requests"
                    data-testid="switch-only-unread-requests"
                    checked={showOnlyUnreadRequests}
                    onCheckedChange={setShowOnlyUnreadRequests}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadResendRequests}
                    data-testid="button-refresh-requests"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" /> 새로고침
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRequests ? (
                <p>불러오는 중...</p>
              ) : visibleRequests.length === 0 ? (
                <div
                  className="py-10 text-center text-gray-500"
                  data-testid="text-no-resend-requests"
                >
                  {showOnlyUnreadRequests
                    ? "읽지 않은 재발송 요청이 없습니다"
                    : "재발송 요청이 없습니다"}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>요청 시각</TableHead>
                      <TableHead>요청 내용</TableHead>
                      <TableHead>이메일 로그</TableHead>
                      <TableHead>수신자</TableHead>
                      <TableHead>수료증 번호</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="w-56">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRequests.map((req) => {
                      const meta = req.metadata || {};
                      const isProcessing = processingRequestId === req.id;
                      return (
                        <TableRow
                          key={req.id}
                          className={!req.isRead ? "bg-warning/5" : ""}
                          data-testid={`row-resend-request-${req.id}`}
                        >
                          <TableCell className="text-xs">
                            {new Date(req.createdAt).toLocaleString("ko-KR")}
                          </TableCell>
                          <TableCell className="max-w-md">
                            <div className="font-medium">{req.title}</div>
                            <div className="text-xs text-gray-600 break-words">
                              {req.message}
                            </div>
                          </TableCell>
                          <TableCell>
                            {meta.emailLogId ? (
                              <code className="text-xs">#{meta.emailLogId}</code>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {meta.recipient || "-"}
                          </TableCell>
                          <TableCell>
                            <code className="text-xs">
                              {meta.certificateNo || "-"}
                            </code>
                          </TableCell>
                          <TableCell>
                            {req.isRead ? (
                              <Badge className="bg-gray-100 text-gray-700">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                완료/읽음
                              </Badge>
                            ) : (
                              <Badge className="bg-warning/10 text-warning">
                                대기 중
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="space-x-2">
                            <Button
                              size="sm"
                              onClick={() => resendFromRequest(req)}
                              disabled={isProcessing || !meta.emailLogId}
                              data-testid={`button-process-resend-${req.id}`}
                            >
                              <Send className="w-4 h-4 mr-1" />
                              {isProcessing ? "처리 중..." : "1클릭 재발송"}
                            </Button>
                            {!req.isRead && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markRequestRead(req.id)}
                                data-testid={`button-mark-request-read-${req.id}`}
                              >
                                읽음 처리
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>이메일 템플릿</CardTitle>
              </div>
              <Button size="sm" variant="outline" onClick={loadTemplates}>
                <RefreshCw className="w-4 h-4 mr-1" /> 새로고침
              </Button>
            </CardHeader>
            <CardContent>
              {loadingTpl ? (
                <p>불러오는 중...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>템플릿명 (Key)</TableHead>
                      <CardHeader className="p-0 hidden lg:table-cell">
                        <TableHead>분류</TableHead>
                      </CardHeader>
                      <TableHead>사용 여부</TableHead>
                      <TableHead>SendGrid ID</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((t) => (
                      <TableRow key={t.id} data-testid={`row-template-${t.key}`}>
                        <TableCell>
                          <div className="font-medium">{t.name}</div>
                          <code className="text-xs text-muted-foreground">{t.key}</code>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant="outline">{t.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={t.enabled}
                            onCheckedChange={(v) => toggleTemplate(t, v)}
                            data-testid={`switch-template-${t.key}`}
                          />
                        </TableCell>
                        <TableCell>
                          {t.sendgridTemplateId ? (
                            <code className="text-xs">{t.sendgridTemplateId}</code>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              코드 내장 HTML 사용
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => preview(t)}
                                  data-testid={`button-preview-${t.key}`}
                                >
                                  <Eye className="w-4 h-4 mr-1" /> 미리보기
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>{t.name} 미리보기</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                  <div className="p-3 border rounded bg-muted/30">
                                    <div className="text-xs text-muted-foreground mb-1 font-bold">
                                      제목
                                    </div>
                                    <div className="text-sm">{previewSubject || t.subject}</div>
                                  </div>
                                  <div className="border rounded">
                                    <div className="bg-muted p-2 text-xs font-bold border-b">
                                      본문 미리보기 (샘플 데이터 적용)
                                    </div>
                                    <div
                                      className="p-4 overflow-auto min-h-[200px]"
                                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                                    />
                                  </div>
                                  <div className="flex gap-2 items-end border-t pt-4">
                                    <div className="flex-1">
                                      <Label className="text-xs mb-1 block">
                                        테스트 발송 이메일
                                      </Label>
                                      <Input
                                        value={testTo}
                                        onChange={(e) => setTestTo(e.target.value)}
                                        placeholder="test@example.com"
                                      />
                                    </div>
                                    <Button
                                      onClick={() => testSend(t)}
                                      data-testid={`button-test-send-${t.key}`}
                                    >
                                      <Send className="w-4 h-4 mr-1" /> 테스트 발송
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditing(t)}
                              data-testid={`button-edit-${t.key}`}
                            >
                              수정
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle>발송 이력 ({logTotal})</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    className="w-40 h-8"
                    placeholder="수신자/로그 검색..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                  />
                  <Select value={filterTemplate} onValueChange={setFilterTemplate}>
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue placeholder="템플릿" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      {templates.map((t) => (
                        <SelectItem key={t.key} value={t.key}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-24 h-8">
                      <SelectValue placeholder="상태" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="sent">성공</SelectItem>
                      <SelectItem value="failed">실패</SelectItem>
                      <SelectItem value="queued">대기</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" onClick={loadLogs}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <p>불러오는 중...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>수신자</TableHead>
                      <TableHead>템플릿</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>시도</TableHead>
                      <TableHead>발송일</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                        <TableCell>
                          <div className="text-sm font-medium">{log.recipient}</div>
                          <div className="text-[10px] text-muted-foreground">ID: #{log.id}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {templateMap[log.templateKey]?.name || log.templateKey}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${STATUS_COLOR[log.status] || ""} border-none`}>
                            {log.status === "sent"
                              ? "성공"
                              : log.status === "failed"
                                ? "실패"
                                : log.status === "queued"
                                  ? "대기"
                                  : log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{log.attempts}회</TableCell>
                        <TableCell className="text-xs">
                          {log.sentAt ? new Date(log.sentAt).toLocaleString("ko-KR") : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resend(log.id)}
                            data-testid={`button-resend-${log.id}`}
                          >
                            <RefreshCw className="w-4 h-4 mr-1" /> 재발송
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificates">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>수료증 발송 이력 ({certTotal})</CardTitle>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    className="w-48 h-8"
                    placeholder="수신자/수료번호/로그 검색..."
                    value={certSearch}
                    onChange={(e) => setCertSearch(e.target.value)}
                  />
                  <Select value={certStatus} onValueChange={setCertStatus}>
                    <SelectTrigger className="w-24 h-8">
                      <SelectValue placeholder="상태" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="sent">성공</SelectItem>
                      <SelectItem value="failed">실패</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => loadCertLogs({ offset: 0 })}
                  >
                    검색
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingCerts && certLogs.length === 0 ? (
                <p>불러오는 중...</p>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>수신자</TableHead>
                        <TableHead>수료번호 / 강좌ID</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>시도</TableHead>
                        <TableHead>발송시각</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {certLogs.map((log) => (
                        <TableRow key={log.id} data-testid={`row-cert-log-${log.id}`}>
                          <TableCell>
                            <div className="text-sm font-medium">{log.recipient}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs">
                              {log.payload?.certificateNo ? (
                                <code className="bg-muted px-1 rounded">
                                  {log.payload.certificateNo}
                                </code>
                              ) : (
                                "-"
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              강좌: {log.payload?.courseId || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${STATUS_COLOR[log.status] || ""} border-none`}>
                              {log.status === "sent" ? "성공" : log.status === "failed" ? "실패" : log.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{log.attempts}회</TableCell>
                          <TableCell className="text-xs">
                            {log.sentAt ? new Date(log.sentAt).toLocaleString("ko-KR") : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resend(log.id)}
                              data-testid={`button-resend-cert-${log.id}`}
                            >
                              <RefreshCw className="w-4 h-4 mr-1" /> 재발송
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {certLogs.length < certTotal && (
                    <div className="flex justify-center pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadCertLogs({ append: true, offset: certOffset })}
                        disabled={loadingCerts}
                        data-testid="button-load-more-certs"
                      >
                        {loadingCerts ? "로딩 중..." : "더 보기"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>템플릿 편집: {editing?.name}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>템플릿 이름</Label>
                  <Input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SendGrid Dynamic Template ID (선택)</Label>
                  <Input
                    value={editing.sendgridTemplateId || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, sendgridTemplateId: e.target.value || null })
                    }
                    placeholder="d-xxxxxx"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>이메일 제목</Label>
                <Input
                  value={editing.subject}
                  onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                />
              </div>

              {!editing.sendgridTemplateId && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>HTML 본문 (내장 템플릿용)</Label>
                    <span className="text-[10px] text-muted-foreground">
                      지원 변수:{" "}
                      {Object.keys(editing.variables || {}).map((v) => `{{${v}}}`).join(", ")}
                    </span>
                  </div>
                  <Textarea
                    className="font-mono text-xs min-h-[300px]"
                    value={editing.bodyHtml || ""}
                    onChange={(e) => setEditing({ ...editing, bodyHtml: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>비고 / 설명</Label>
                <Input
                  value={editing.description || ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setEditing(null)}>
                  취소
                </Button>
                <Button onClick={() => saveTemplate(editing)}>저장하기</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- SendNotificationTab ---
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

function SendNotificationTab() {
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
                <div className="text-success">
                  성공: <strong>{lastResult.successCount}건</strong>
                </div>
                <div className={lastResult.failedCount > 0 ? "text-destructive" : ""}>
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

// --- MessagingSettingsTab ---
const initialSettings: MessagingSettings = {
  region: 'ap-northeast-2',
  accessKey: '',
  secretKey: '',
  sesFromEmail: '',
  sesConfigurationSet: '',
  snsDefaultSmsType: 'Transactional',
  snsSenderId: '',
  pinpointAppId: '',
  chimeAppInstanceArn: ''
};

function MessagingSettingsTab() {
  const { userName } = useGlobalAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<MessagingSettings>(initialSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [smsTo, setSmsTo] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingSms, setTestingSms] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/admin/messaging/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        throw new Error('설정을 불러오는데 실패했습니다');
      }
    } catch (error) {
      toast({
        title: "설정 로딩 실패",
        description: "메시징 설정을 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/messaging/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Id': encodeURIComponent(userName || 'admin')
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        toast({
          title: "저장 성공",
          description: "설정이 저장되어 즉시 반영되었습니다.",
          variant: "default"
        });
      } else {
        throw new Error('저장 실패');
      }
    } catch (error) {
      toast({
        title: "저장 실패",
        description: "설정을 저장하는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const testEmail = async () => {
    if (!emailTo) {
      toast({
        title: "이메일 필수",
        description: "테스트할 이메일 주소를 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    setTestingEmail(true);
    try {
      const params = new URLSearchParams({ to: emailTo });
      const response = await fetch(`/api/admin/messaging/test/email?${params}`, {
        method: 'POST'
      });

      if (response.ok) {
        toast({
          title: "이메일 발송 완료",
          description: `${emailTo}로 테스트 이메일을 발송했습니다.`,
          variant: "default"
        });
      } else {
        throw new Error('이메일 발송 실패');
      }
    } catch (error) {
      toast({
        title: "이메일 발송 실패",
        description: "테스트 이메일 발송에 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const testSms = async () => {
    if (!smsTo) {
      toast({
        title: "전화번호 필수",
        description: "테스트할 전화번호를 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    setTestingSms(true);
    try {
      const params = new URLSearchParams({ phone: smsTo });
      const response = await fetch(`/api/admin/messaging/test/sms?${params}`, {
        method: 'POST'
      });

      if (response.ok) {
        toast({
          title: "SMS 발송 완료",
          description: `${smsTo}로 테스트 SMS를 발송했습니다.`,
          variant: "default"
        });
      } else {
        throw new Error('SMS 발송 실패');
      }
    } catch (error) {
      toast({
        title: "SMS 발송 실패",
        description: "테스트 SMS 발송에 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setTestingSms(false);
    }
  };

  const handleInputChange = (field: keyof MessagingSettings) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSettings(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSelectChange = (field: keyof MessagingSettings) => (value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Settings className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">설정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AWS 메시징 설정</h1>
          <p className="text-muted-foreground mt-2">
            Replit Secrets의 기본값을 사용하며, 여기서 저장하면 DB에 암호화되어 저장되고 즉시 적용됩니다.
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          암호화 저장
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* AWS 기본 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              AWS 기본 설정
            </CardTitle>
            <CardDescription>
              AWS 서비스 연결을 위한 기본 인증 정보
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="region">AWS 리전</Label>
              <Input
                id="region"
                value={settings.region}
                onChange={handleInputChange('region')}
                placeholder="ap-northeast-2"
              />
            </div>
            
            <div>
              <Label htmlFor="accessKey">Access Key (마스킹됨)</Label>
              <Input
                id="accessKey"
                type="password"
                value={settings.accessKey}
                onChange={handleInputChange('accessKey')}
                placeholder="AKIA..."
              />
            </div>
            
            <div>
              <Label htmlFor="secretKey">Secret Key (마스킹됨)</Label>
              <Input
                id="secretKey"
                type="password"
                value={settings.secretKey}
                onChange={handleInputChange('secretKey')}
                placeholder="****************"
              />
            </div>
          </CardContent>
        </Card>

        {/* SES 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Amazon SES 설정
            </CardTitle>
            <CardDescription>
              이메일 발송을 위한 SES 구성
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="sesFromEmail">발신 이메일 주소</Label>
              <Input
                id="sesFromEmail"
                type="email"
                value={settings.sesFromEmail}
                onChange={handleInputChange('sesFromEmail')}
                placeholder="noreply@domain.com"
              />
            </div>
            
            <div>
              <Label htmlFor="sesConfigurationSet">Configuration Set (선택)</Label>
              <Input
                id="sesConfigurationSet"
                value={settings.sesConfigurationSet}
                onChange={handleInputChange('sesConfigurationSet')}
                placeholder="기본 설정 사용"
              />
            </div>
          </CardContent>
        </Card>

        {/* SNS 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Amazon SNS 설정
            </CardTitle>
            <CardDescription>
              SMS 발송을 위한 SNS 구성
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="snsDefaultSmsType">SMS 타입</Label>
              <Select
                value={settings.snsDefaultSmsType}
                onValueChange={handleSelectChange('snsDefaultSmsType')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Transactional">Transactional</SelectItem>
                  <SelectItem value="Promotional">Promotional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="snsSenderId">Sender ID (선택)</Label>
              <Input
                id="snsSenderId"
                value={settings.snsSenderId}
                onChange={handleInputChange('snsSenderId')}
                placeholder="발신자 ID"
              />
            </div>

            <div>
              <Label htmlFor="pinpointAppId">Pinpoint App ID (선택)</Label>
              <Input
                id="pinpointAppId"
                value={settings.pinpointAppId}
                onChange={handleInputChange('pinpointAppId')}
                placeholder="Pinpoint 애플리케이션 ID"
              />
            </div>
          </CardContent>
        </Card>

        {/* Chime 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Amazon Chime 설정
            </CardTitle>
            <CardDescription>
              실시간 채팅을 위한 Chime 구성
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="chimeAppInstanceArn">App Instance ARN (선택)</Label>
              <Input
                id="chimeAppInstanceArn"
                value={settings.chimeAppInstanceArn}
                onChange={handleInputChange('chimeAppInstanceArn')}
                placeholder="arn:aws:chime:region:account-id:app-instance/instance-id"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <Button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? '저장 중...' : '설정 저장'}
        </Button>
      </div>

      <Separator />

      {/* 테스트 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            서비스 테스트
          </CardTitle>
          <CardDescription>
            저장된 설정으로 실제 메시징 서비스를 테스트해보세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 이메일 테스트 */}
          <div>
            <Label htmlFor="emailTest">이메일 테스트</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="emailTest"
                type="email"
                placeholder="test@example.com"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={testEmail}
                disabled={testingEmail || !emailTo}
                variant="outline"
              >
                {testingEmail ? '발송 중...' : '이메일 테스트'}
              </Button>
            </div>
          </div>

          {/* SMS 테스트 */}
          <div>
            <Label htmlFor="smsTest">SMS 테스트</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="smsTest"
                type="tel"
                placeholder="+821012345678"
                value={smsTo}
                onChange={(e) => setSmsTo(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={testSms}
                disabled={testingSms || !smsTo}
                variant="outline"
              >
                {testingSms ? '발송 중...' : 'SMS 테스트'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminNotifications() {
  const { userName } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [section, setSection] = useState('inbox');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // 알림 데이터 로드
  useEffect(() => {
    const loadNotifications = async () => {
      setIsLoading(true);
      try {
        // 실제 API 호출
        const response = await fetch('/api/admin/notifications');
        if (response.ok) {
          const data = await response.json();
          const notificationsData = data.notifications || data || [];
          setNotifications(notificationsData);
          setIsLoading(false);
          return;
        }
        
        // API가 실패하면 임시 데이터 사용
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 임시 알림 데이터
        const mockNotifications: Notification[] = [
          {
            id: 1,
            title: '스토리지 서버 용량 경고',
            content: '스토리지 서버가 78% 사용 중입니다. 최적화 또는 확장이 필요합니다.',
            type: 'warning',
            status: 'unread',
            createdAt: '2024-05-12 14:30:22',
            priority: 'high',
            actions: ['server_optimize', 'storage_expand']
          },
          {
            id: 2,
            title: '보안 업데이트 완료',
            content: '모든 시스템에 대한 보안 패치가 성공적으로 적용되었습니다.',
            type: 'security',
            status: 'read',
            createdAt: '2024-05-11 09:15:43',
            priority: 'medium'
          },
          {
            id: 3,
            title: '데이터베이스 백업 완료',
            content: '전체 데이터베이스 백업이 성공적으로 완료되었습니다.',
            type: 'database',
            status: 'read',
            createdAt: '2024-05-10 22:45:10',
            priority: 'low'
          },
          {
            id: 4,
            title: '신규 가입자 급증',
            content: '지난 24시간 동안 가입자 수가 평소보다 150% 증가했습니다. 시스템 자원을 모니터링하세요.',
            type: 'system',
            status: 'unread',
            createdAt: '2024-05-12 08:20:15',
            priority: 'medium'
          },
          {
            id: 5,
            title: '신고 접수 알림',
            content: '새로운 신고가 5건 접수되었습니다. 확인이 필요합니다.',
            type: 'user',
            status: 'unread',
            createdAt: '2024-05-12 11:05:33',
            priority: 'high',
            actions: ['view_reports']
          }
        ];
        
        setNotifications(mockNotifications);
      } catch (error) {
        console.error('알림 데이터 로딩 오류:', error);
        toast({
          title: '데이터 로딩 오류',
          description: '알림 정보를 불러오는 중 오류가 발생했습니다.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadNotifications();
  }, [toast]);
  
  // 필터링된 알림 목록 업데이트
  useEffect(() => {
    let result = [...notifications];
    
    // 탭 필터링
    if (activeTab === 'unread') {
      result = result.filter(notification => notification.status === 'unread');
    } else if (activeTab === 'read') {
      result = result.filter(notification => notification.status === 'read');
    }
    
    // 검색어 필터링
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        notification => 
          notification.title.toLowerCase().includes(query) ||
          notification.content.toLowerCase().includes(query)
      );
    }
    
    // 유형 필터링
    if (filterType && filterType !== 'all') {
      result = result.filter(notification => notification.type === filterType);
    }
    
    // 우선순위 필터링
    if (filterPriority && filterPriority !== 'all') {
      result = result.filter(notification => notification.priority === filterPriority);
    }
    
    // 정렬 (최신순)
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    setFilteredNotifications(result);
  }, [notifications, activeTab, searchQuery, filterType, filterPriority]);
  
  // 페이지네이션 처리
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // 알림 상세 보기
  const handleViewNotification = (notification: Notification) => {
    setSelectedNotification(notification);
    setShowDetailModal(true);
    
    // 읽음 처리
    if (notification.status === 'unread') {
      setNotifications(prev => prev.map(n => 
        n.id === notification.id ? { ...n, status: 'read' } : n
      ));
    }
  };
  
  // 알림 삭제
  const handleDeleteNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast({
      title: '알림 삭제',
      description: '알림이 삭제되었습니다.',
    });
    
    if (selectedNotification?.id === id) {
      setShowDetailModal(false);
    }
  };
  
  // 모든 알림 읽음 처리
  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })));
    toast({
      title: '모든 알림 읽음 처리',
      description: '모든 알림이 읽음 처리되었습니다.',
    });
  };
  
  // 알림 유형별 아이콘 및 색상
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'system':
        return <Bell className="h-5 w-5 text-primary dark:text-primary" />;
      case 'security':
        return <Shield className="h-5 w-5 text-success dark:text-success" />;
      case 'database':
        return <Database className="h-5 w-5 text-primary dark:text-primary" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning dark:text-warning" />;
      case 'user':
        return <Bell className="h-5 w-5 text-secondary-foreground dark:text-secondary-foreground" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
    }
  };
  
  // 알림 유형별 배지
  const getNotificationBadge = (type: string) => {
    switch (type) {
      case 'system':
        return <Badge className="bg-primary">시스템</Badge>;
      case 'security':
        return <Badge variant="success">보안</Badge>;
      case 'database':
        return <Badge className="bg-primary/50">데이터베이스</Badge>;
      case 'warning':
        return <Badge variant="warning">경고</Badge>;
      case 'user':
        return <Badge className="bg-secondary/100">사용자</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };
  
  // 우선순위별 배지
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="outline" className="border-destructive/50 text-destructive">높음</Badge>;
      case 'medium':
        return <Badge variant="outline" className="border-warning/50 text-warning">중간</Badge>;
      case 'low':
        return <Badge variant="outline" className="border-success/50 text-success">낮음</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };
  
  // 알림 액션 처리
  const handleNotificationAction = (action: string, notificationId: number) => {
    // 실제 구현 시 API 호출로 대체
    console.log(`알림 ${notificationId}에 대한 액션 ${action} 실행`);
    
    // 액션 종류에 따른 처리
    switch (action) {
      case 'server_optimize':
        toast({
          title: '서버 최적화',
          description: '서버 최적화 작업이 예약되었습니다.',
        });
        break;
      case 'storage_expand':
        toast({
          title: '스토리지 확장',
          description: '스토리지 확장 요청이 접수되었습니다.',
        });
        break;
      case 'view_reports':
        setLocation('/admin/analytics');
        break;
      default:
        toast({
          title: '액션 실행',
          description: `${action} 액션이 실행되었습니다.`,
        });
    }
  };
  
  // 뒤로 가기
  const handleGoBack = () => {
    setLocation('/admin/dashboard');
  };
  
  // 알림 새로고침
  const handleRefresh = () => {
    setIsLoading(true);
    
    // 실제 구현 시 API 호출로 대체
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: '새로고침 완료',
        description: '알림이 업데이트되었습니다.',
      });
    }, 1000);
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* 알림 상세 모달 */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent>
          {selectedNotification && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  {getNotificationBadge(selectedNotification.type)}
                  {getPriorityBadge(selectedNotification.priority)}
                </div>
                <DialogTitle>{selectedNotification.title}</DialogTitle>
                <DialogDescription>
                  {new Date(selectedNotification.createdAt).toLocaleString()}
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                  {selectedNotification.content}
                </p>
              </div>
              
              {selectedNotification.actions && selectedNotification.actions.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">가능한 작업</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedNotification.actions.map((action) => (
                      <Button
                        key={action}
                        variant="outline"
                        size="sm"
                        onClick={() => handleNotificationAction(action, selectedNotification.id)}
                      >
                        {action === 'server_optimize' && '서버 최적화'}
                        {action === 'storage_expand' && '스토리지 확장'}
                        {action === 'view_reports' && '신고 확인'}
                        {!['server_optimize', 'storage_expand', 'view_reports'].includes(action) && action}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              <DialogFooter className="flex justify-between items-center">
                <Button 
                  variant="outline" 
                  onClick={() => handleDeleteNotification(selectedNotification.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  알림 삭제
                </Button>
                <DialogClose asChild>
                  <Button type="button">
                    <Check className="h-4 w-4 mr-2" />
                    확인
                  </Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">알림·메시지 관리</h1>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'inbox', label: '인앱 알림' },
          { key: 'push', label: '푸시 알림' },
          { key: 'email', label: '이메일' },
          { key: 'send', label: '알림 발송' },
          { key: 'messaging', label: '채널 설정' },
        ].map(({ key, label }) => (
          <Button
            key={key}
            variant={section === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSection(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {section === 'push' && (
        <PushNotificationTab />
      )}
      {section === 'email' && (
        <EmailNotificationsTab />
      )}
      {section === 'send' && (
        <SendNotificationTab />
      )}
      {section === 'messaging' && (
        <MessagingSettingsTab />
      )}

      {section === 'inbox' && (<>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setSection('send')}
            variant="default"
            size="sm"
            data-testid="button-go-send-notification"
          >
            <Bell className="mr-2 h-4 w-4" />
            알림 발송
          </Button>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
          <Button onClick={handleMarkAllAsRead} variant="default" size="sm">
            <Check className="mr-2 h-4 w-4" />
            모두 읽음 처리
          </Button>
        </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="unread">읽지 않음</TabsTrigger>
            <TabsTrigger value="read">읽음</TabsTrigger>
          </TabsList>
          
          <div className="flex space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="알림 검색..."
                className="pl-8 h-9 md:w-[200px] w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={filterType || 'all'} onValueChange={setFilterType}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="알림 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 유형</SelectItem>
                <SelectItem value="system">시스템</SelectItem>
                <SelectItem value="security">보안</SelectItem>
                <SelectItem value="database">데이터베이스</SelectItem>
                <SelectItem value="warning">경고</SelectItem>
                <SelectItem value="user">사용자</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterPriority || 'all'} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="우선순위" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 우선순위</SelectItem>
                <SelectItem value="high">높음</SelectItem>
                <SelectItem value="medium">중간</SelectItem>
                <SelectItem value="low">낮음</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="border-b">
                <div className="flex items-center p-4 text-sm font-medium text-muted-foreground">
                  <div className="w-8"></div>
                  <div className="flex-1">알림</div>
                  <div className="w-24 text-right">상태</div>
                  <div className="w-32 text-right">날짜</div>
                  <div className="w-8"></div>
                </div>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : paginatedNotifications.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  알림이 없습니다
                </div>
              ) : (
                <ul className="divide-y">
                  {paginatedNotifications.map((notification) => (
                    <li 
                      key={notification.id} 
                      className={`p-4 hover:bg-muted transition-colors ${notification.status === 'unread' ? 'bg-muted/50' : ''}`}
                    >
                      <div className="flex items-center">
                        <div className="w-8 flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-medium truncate ${notification.status === 'unread' ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {notification.title}
                            </p>
                            {getNotificationBadge(notification.type)}
                            {getPriorityBadge(notification.priority)}
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {notification.content}
                          </p>
                        </div>
                        <div className="w-24 text-right">
                          {notification.status === 'unread' ? (
                            <Badge variant="default" className="bg-primary">읽지 않음</Badge>
                          ) : (
                            <Badge variant="outline">읽음</Badge>
                          )}
                        </div>
                        <div className="w-32 text-right text-sm text-muted-foreground">
                          {new Date(notification.createdAt).toLocaleString()}
                        </div>
                        <div className="w-8 flex-shrink-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewNotification(notification)}>
                                <Eye className="mr-2 h-4 w-4" />
                                상세 보기
                              </DropdownMenuItem>
                              {notification.status === 'unread' && (
                                <DropdownMenuItem onClick={() => {
                                  setNotifications(prev => prev.map(n => 
                                    n.id === notification.id ? { ...n, status: 'read' } : n
                                  ));
                                }}>
                                  <Check className="mr-2 h-4 w-4" />
                                  읽음 표시
                                </DropdownMenuItem>
                              )}
                              {notification.status === 'read' && (
                                <DropdownMenuItem onClick={() => {
                                  setNotifications(prev => prev.map(n => 
                                    n.id === notification.id ? { ...n, status: 'unread' } : n
                                  ));
                                }}>
                                  <Clock className="mr-2 h-4 w-4" />
                                  읽지 않음 표시
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteNotification(notification.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              
              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center p-4 border-t">
                  <div className="flex space-x-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      <ArrowLeft className="h-4 w-4 transform rotate-180" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="unread" className="space-y-4">
          {/* 동일한 구조 반복 */}
          <Card>
            <CardContent className="p-0">
              <div className="border-b">
                <div className="flex items-center p-4 text-sm font-medium text-muted-foreground">
                  <div className="w-8"></div>
                  <div className="flex-1">알림</div>
                  <div className="w-24 text-right">상태</div>
                  <div className="w-32 text-right">날짜</div>
                  <div className="w-8"></div>
                </div>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : paginatedNotifications.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  읽지 않은 알림이 없습니다
                </div>
              ) : (
                <ul className="divide-y">
                  {paginatedNotifications.map((notification) => (
                    <li 
                      key={notification.id} 
                      className="p-4 hover:bg-muted transition-colors bg-muted/50"
                    >
                      <div className="flex items-center">
                        <div className="w-8 flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate text-foreground">
                              {notification.title}
                            </p>
                            {getNotificationBadge(notification.type)}
                            {getPriorityBadge(notification.priority)}
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {notification.content}
                          </p>
                        </div>
                        <div className="w-24 text-right">
                          <Badge variant="default" className="bg-primary">읽지 않음</Badge>
                        </div>
                        <div className="w-32 text-right text-sm text-muted-foreground">
                          {new Date(notification.createdAt).toLocaleString()}
                        </div>
                        <div className="w-8 flex-shrink-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewNotification(notification)}>
                                <Eye className="mr-2 h-4 w-4" />
                                상세 보기
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setNotifications(prev => prev.map(n => 
                                  n.id === notification.id ? { ...n, status: 'read' } : n
                                ));
                              }}>
                                <Check className="mr-2 h-4 w-4" />
                                읽음 표시
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteNotification(notification.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="read" className="space-y-4">
          {/* 동일한 구조 반복 */}
          <Card>
            <CardContent className="p-0">
              <div className="border-b">
                <div className="flex items-center p-4 text-sm font-medium text-muted-foreground">
                  <div className="w-8"></div>
                  <div className="flex-1">알림</div>
                  <div className="w-24 text-right">상태</div>
                  <div className="w-32 text-right">날짜</div>
                  <div className="w-8"></div>
                </div>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : paginatedNotifications.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  읽은 알림이 없습니다
                </div>
              ) : (
                <ul className="divide-y">
                  {paginatedNotifications.map((notification) => (
                    <li 
                      key={notification.id} 
                      className="p-4 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center">
                        <div className="w-8 flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate text-muted-foreground">
                              {notification.title}
                            </p>
                            {getNotificationBadge(notification.type)}
                            {getPriorityBadge(notification.priority)}
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {notification.content}
                          </p>
                        </div>
                        <div className="w-24 text-right">
                          <Badge variant="outline">읽음</Badge>
                        </div>
                        <div className="w-32 text-right text-sm text-muted-foreground">
                          {new Date(notification.createdAt).toLocaleString()}
                        </div>
                        <div className="w-8 flex-shrink-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewNotification(notification)}>
                                <Eye className="mr-2 h-4 w-4" />
                                상세 보기
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setNotifications(prev => prev.map(n => 
                                  n.id === notification.id ? { ...n, status: 'unread' } : n
                                ));
                              }}>
                                <Clock className="mr-2 h-4 w-4" />
                                읽지 않음 표시
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteNotification(notification.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </>)}
    </div>
  );
}