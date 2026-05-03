import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Star,
  Eye,
  EyeOff,
  Trash2,
  Flag,
  RefreshCw,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';

interface AdminReview {
  id: number;
  trainerId: number;
  trainerName?: string;
  authorId: number;
  authorName?: string;
  rating: number;
  title?: string | null;
  content: string;
  photos?: string[] | null;
  status: 'active' | 'hidden' | 'deleted';
  hiddenReason?: string | null;
  reportCount: number;
  createdAt: string;
  reply?: { id: number; content: string; createdAt: string } | null;
  reports?: AdminReport[];
}

interface AdminReport {
  id: number;
  reviewId: number;
  reporterId: number;
  reason: string;
  description?: string | null;
  status: 'pending' | 'reviewed' | 'dismissed';
  createdAt: string;
}

const reasonLabel = (r: string) =>
  ({
    spam: '스팸',
    abuse: '욕설/비방',
    false_info: '허위 정보',
    privacy: '개인정보 노출',
    other: '기타',
  } as Record<string, string>)[r] || r;

export default function ReviewManagement() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeReview, setActiveReview] = useState<AdminReview | null>(null);
  const [actionDialog, setActionDialog] = useState<null | 'hide' | 'delete'>(null);
  const [reasonInput, setReasonInput] = useState('');

  const adminQuery = useQuery<{ success: boolean; reviews: AdminReview[]; reports: AdminReport[] }>({
    queryKey: ['/api/admin/trainer-reviews', statusFilter],
    queryFn: async () => {
      const url = `/api/admin/trainer-reviews?status=${statusFilter}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      return res.json();
    },
  });

  const moderateMutation = useMutation({
    mutationFn: async ({ id, action, reason }: { id: number; action: 'hide' | 'restore' | 'delete'; reason?: string }) => {
      const res = await apiRequest('PATCH', `/api/admin/trainer-reviews/${id}`, { action, reason });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || '처리 실패');
      return data;
    },
    onSuccess: (_d, vars) => {
      const verb = vars.action === 'hide' ? '숨김' : vars.action === 'restore' ? '복원' : '삭제';
      toast({ title: `리뷰 ${verb} 완료` });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/trainer-reviews'] });
      setActionDialog(null);
      setActiveReview(null);
      setReasonInput('');
    },
    onError: (e: unknown) =>
      toast({
        title: '오류',
        description: e instanceof Error ? e.message : '오류가 발생했습니다.',
        variant: 'destructive',
      }),
  });

  const reportMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'reviewed' | 'dismissed' }) => {
      const res = await apiRequest('PATCH', `/api/admin/trainer-reviews/reports/${id}`, { status });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || '처리 실패');
      return data;
    },
    onSuccess: () => {
      toast({ title: '신고가 처리되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/trainer-reviews'] });
    },
    onError: (e: unknown) =>
      toast({
        title: '오류',
        description: e instanceof Error ? e.message : '오류가 발생했습니다.',
        variant: 'destructive',
      }),
  });

  const reviews = adminQuery.data?.reviews || [];
  const reports = adminQuery.data?.reports || [];

  const filtered = useMemo(() => {
    if (!searchTerm) return reviews;
    const q = searchTerm.toLowerCase();
    return reviews.filter(
      (r) =>
        (r.trainerName || '').toLowerCase().includes(q) ||
        (r.authorName || '').toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q),
    );
  }, [reviews, searchTerm]);

  const counts = useMemo(
    () => ({
      all: reviews.length,
      active: reviews.filter((r) => r.status === 'active').length,
      hidden: reviews.filter((r) => r.status === 'hidden').length,
      deleted: reviews.filter((r) => r.status === 'deleted').length,
      reported: reviews.filter((r) => (r.reportCount || 0) > 0).length,
      pendingReports: reports.filter((r) => r.status === 'pending').length,
    }),
    [reviews, reports],
  );

  const renderStars = (rating: number) => (
    <div className="flex items-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? 'text-warning fill-current' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );

  const statusBadge = (s: string, count: number) => {
    if (s === 'hidden') return <Badge className="bg-warning/10 text-warning">숨김</Badge>;
    if (s === 'deleted') return <Badge className="bg-gray-200 text-gray-700">삭제됨</Badge>;
    if (count > 0) return <Badge className="bg-destructive/10 text-destructive">신고 {count}</Badge>;
    return <Badge className="bg-success/10 text-success">활성</Badge>;
  };

  return (
    <div className="space-y-6 p-6" data-testid="page-admin-review-management">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">트레이너 리뷰 관리</h1>
          <p className="text-gray-600 mt-1">신고된 리뷰를 검토하고 모더레이션 조치를 적용하세요</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => adminQuery.refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> 새로고침
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: '전체', val: counts.all, color: 'text-primary' },
          { label: '활성', val: counts.active, color: 'text-success' },
          { label: '숨김', val: counts.hidden, color: 'text-warning' },
          { label: '신고', val: counts.reported, color: 'text-destructive' },
          { label: '미처리 신고', val: counts.pendingReports, color: 'text-primary' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
              <div className="text-sm text-gray-600">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="reviews">
        <TabsList>
          <TabsTrigger value="reviews">리뷰 목록</TabsTrigger>
          <TabsTrigger value="reports">신고 처리 ({counts.pendingReports})</TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="트레이너명/작성자/내용 검색"
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="hidden">숨김</SelectItem>
                <SelectItem value="deleted">삭제됨</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {adminQuery.isLoading ? (
            <div className="text-center py-12 text-muted-foreground">로딩 중...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">표시할 리뷰가 없습니다.</div>
          ) : (
            <div className="space-y-4">
              {filtered.map((review) => (
                <Card key={review.id} data-testid={`admin-review-${review.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{review.trainerName || `트레이너 #${review.trainerId}`}</span>
                          {statusBadge(review.status, review.reportCount)}
                          {renderStars(review.rating)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          작성자 {review.authorName} · {format(new Date(review.createdAt), 'yyyy.MM.dd HH:mm')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {review.status === 'hidden' || review.status === 'deleted' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => moderateMutation.mutate({ id: review.id, action: 'restore' })}
                            data-testid={`button-restore-${review.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" /> 복원
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setActiveReview(review); setActionDialog('hide'); }}
                            data-testid={`button-hide-${review.id}`}
                          >
                            <EyeOff className="h-4 w-4 mr-1" /> 숨김
                          </Button>
                        )}
                        {review.status !== 'deleted' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => { setActiveReview(review); setActionDialog('delete'); }}
                            data-testid={`button-delete-${review.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> 삭제
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {review.title && <h4 className="font-semibold">{review.title}</h4>}
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{review.content}</p>
                    {review.photos && review.photos.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {review.photos.map((src, i) => (
                          <a
                            key={i}
                            href={src}
                            target="_blank"
                            rel="noreferrer"
                            data-testid={`admin-review-photo-${review.id}-${i}`}
                          >
                            <img
                              src={src}
                              alt={`리뷰 사진 ${i + 1}`}
                              loading="lazy"
                              className="h-16 w-16 object-cover rounded border"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </a>
                        ))}
                      </div>
                    )}
                    {review.hiddenReason && (
                      <div className="text-xs text-warning bg-warning/10 rounded p-2 border border-warning/30">
                        숨김 사유: {review.hiddenReason}
                      </div>
                    )}
                    {review.reply && (
                      <div className="text-xs bg-primary/10 border-l-4 border-primary/40 p-2 rounded">
                        <strong>트레이너 답글:</strong> {review.reply.content}
                      </div>
                    )}
                    {review.reports && review.reports.length > 0 && (
                      <div className="bg-destructive/10 border border-destructive/30 rounded p-2 text-xs">
                        <div className="font-medium text-destructive flex items-center gap-1 mb-1">
                          <Flag className="h-3 w-3" /> 신고 {review.reports.length}건
                        </div>
                        <ul className="space-y-1">
                          {review.reports.map((rep) => (
                            <li key={rep.id} className="text-destructive">
                              · {reasonLabel(rep.reason)}
                              {rep.description ? ` — ${rep.description}` : ''} ({rep.status})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-3">
          {reports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">신고 내역이 없습니다.</div>
          ) : (
            reports.map((rep) => {
              const target = reviews.find((r) => r.id === rep.reviewId);
              return (
                <Card key={rep.id} data-testid={`report-${rep.id}`}>
                  <CardContent className="p-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{reasonLabel(rep.reason)}</Badge>
                        <Badge
                          className={
                            rep.status === 'pending'
                              ? 'bg-primary/10 text-primary'
                              : rep.status === 'reviewed'
                              ? 'bg-success/10 text-success'
                              : 'bg-gray-200 text-gray-700'
                          }
                        >
                          {rep.status === 'pending' ? '대기중' : rep.status === 'reviewed' ? '확인됨' : '기각됨'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(rep.createdAt), 'yyyy.MM.dd HH:mm')}
                        </span>
                      </div>
                      {rep.description && (
                        <p className="text-sm text-muted-foreground mb-1">{rep.description}</p>
                      )}
                      {target && (
                        <div className="text-xs bg-muted/50 rounded p-2 mt-2">
                          대상 리뷰 #{target.id} ({target.trainerName}) — {target.content.slice(0, 80)}
                        </div>
                      )}
                    </div>
                    {rep.status === 'pending' && (
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => reportMutation.mutate({ id: rep.id, status: 'reviewed' })}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" /> 확인 처리
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => reportMutation.mutate({ id: rep.id, status: 'dismissed' })}
                        >
                          기각
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={actionDialog !== null} onOpenChange={(o) => !o && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog === 'hide' ? '리뷰 숨김 처리' : '리뷰 삭제 처리'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {actionDialog === 'hide'
                ? '숨김 처리된 리뷰는 보호자/트레이너 화면에 노출되지 않습니다.'
                : '삭제된 리뷰는 복구할 수 있지만 사용자 화면에서는 즉시 사라집니다.'}
            </p>
            <Textarea
              placeholder="조치 사유를 입력하세요"
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>취소</Button>
            <Button
              variant={actionDialog === 'delete' ? 'destructive' : 'default'}
              disabled={moderateMutation.isPending || !activeReview}
              onClick={() =>
                activeReview &&
                moderateMutation.mutate({
                  id: activeReview.id,
                  action: actionDialog === 'delete' ? 'delete' : 'hide',
                  reason: reasonInput || undefined,
                })
              }
            >
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
