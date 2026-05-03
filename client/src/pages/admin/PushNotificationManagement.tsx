import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Bell, Send, Calendar, Users, Smartphone, Globe, Trash2, Eye, RefreshCw } from 'lucide-react';

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

export default function PushNotificationManagement() {
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
      return apiRequest('/api/admin/push/send-now', {
        method: 'POST',
        body: JSON.stringify({
          title: data.title,
          message: data.message,
          targetType: data.targetType,
          targetCriteria: data.targetCriteria,
        }),
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
      return apiRequest('/api/admin/push/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          title: data.title,
          message: data.message,
          targetType: data.targetType,
          targetCriteria: data.targetCriteria,
          scheduledAt: data.scheduledAt || null,
          status: data.scheduledAt ? 'scheduled' : 'draft',
        }),
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
      return apiRequest(`/api/admin/push/campaigns/${id}/send`, { method: 'POST' });
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
      return apiRequest(`/api/admin/push/campaigns/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast({ title: '삭제됨', description: '캠페인이 삭제되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/push/campaigns'] });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      draft: { label: '초안', variant: 'secondary' },
      scheduled: { label: '예약됨', variant: 'outline' },
      sending: { label: '발송 중', variant: 'default' },
      completed: { label: '완료', variant: 'default' },
      cancelled: { label: '취소됨', variant: 'destructive' },
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
                  <Label className="text-muted-foreground">대상</Label>
                  <p className="mt-1">{getTargetLabel(selectedCampaign.targetType, selectedCampaign.targetCriteria)}</p>
                </div>
              </div>
              {selectedCampaign.status === 'completed' && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground">전체</Label>
                    <p className="text-xl font-bold">{selectedCampaign.totalRecipients}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">성공</Label>
                    <p className="text-xl font-bold text-success">{selectedCampaign.successCount}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">실패</Label>
                    <p className="text-xl font-bold text-destructive">{selectedCampaign.failureCount}</p>
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
