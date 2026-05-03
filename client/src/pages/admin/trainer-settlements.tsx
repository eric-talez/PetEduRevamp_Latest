import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Download, Lock, RefreshCw, Trash2, Plus, CheckCircle2, Ban } from 'lucide-react';
import { SkeletonTable, FetchingOverlay } from '@/components/ui/SkeletonLoader';
import { keepPreviousData } from '@tanstack/react-query';

interface MonthlyRow {
  trainerId: number;
  trainerName?: string | null;
  trainerEmail?: string | null;
  itemCount: number;
  totalGross: number | string;
  totalFee: number | string;
  totalNet: number | string;
  pendingCount: number;
  lockedCount: number;
}
interface MonthlyResponse { success: boolean; data: { month: string; rows: MonthlyRow[] } }

interface ItemRow {
  id: number;
  trainerId: number;
  trainerName?: string | null;
  sourceType: string;
  sourceId: number;
  sourceName: string | null;
  grossAmount: string;
  commissionRate: string;
  platformFee: string;
  netAmount: string;
  status: string;
  occurredAt: string;
}
interface ItemsResponse { success: boolean; data: ItemRow[] }

interface RateRow {
  id: number;
  trainerId: number | null;
  trainerName?: string | null;
  category: string | null;
  ratePercent: string;
  description: string | null;
  isActive: boolean;
}
interface RatesResponse { success: boolean; data: RateRow[] }

interface CloseResult { success: boolean; data?: { closed?: number } }
interface BackfillResult { success: boolean; data?: { created?: number } }

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: '예정', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: '확정', color: 'bg-blue-100 text-blue-800' },
  locked: { label: '마감', color: 'bg-purple-100 text-purple-800' },
  paid: { label: '지급완료', color: 'bg-green-100 text-green-800' },
  canceled: { label: '취소', color: 'bg-red-100 text-red-800' },
};

const monthOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export default function AdminTrainerSettlementsPage() {
  const { toast } = useToast();
  const [month, setMonth] = useState<string>(monthOf(new Date()));
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // 월별 집계
  const { data: monthlyRes } = useQuery<MonthlyResponse>({
    queryKey: ['/api/admin/trainer-settlements/monthly', month],
    queryFn: async () => {
      const res = await fetch(`/api/admin/trainer-settlements/monthly?month=${month}`);
      return res.json();
    },
  });

  // 상세 항목
  const { data: itemsRes, isLoading, isFetching } = useQuery<ItemsResponse>({
    queryKey: ['/api/admin/trainer-settlements/items', month, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ month });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/admin/trainer-settlements/items?${params}`);
      return res.json();
    },
    placeholderData: keepPreviousData,
  });

  // 수수료율 목록
  const { data: ratesRes } = useQuery<RatesResponse>({
    queryKey: ['/api/admin/trainer-commission-rates'],
  });

  const closeMonth = useMutation({
    mutationFn: async (): Promise<CloseResult> => {
      const res = await apiRequest('POST', '/api/admin/trainer-settlements/close', { month });
      return (await res.json()) as CloseResult;
    },
    onSuccess: (data) => {
      toast({ title: '월 마감 완료', description: `${data?.data?.closed || 0}건 마감 처리됨` });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/trainer-settlements/items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/trainer-settlements/monthly'] });
    },
    onError: (e: Error) => toast({ title: '마감 실패', description: e?.message, variant: 'destructive' }),
  });

  const cancelItem = useMutation({
    mutationFn: async (id: number) => apiRequest('POST', `/api/admin/trainer-settlements/items/${id}/cancel`, { reason: '관리자 취소' }),
    onSuccess: () => {
      toast({ title: '항목 취소됨' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/trainer-settlements/items'] });
    },
  });

  const backfill = useMutation({
    mutationFn: async (): Promise<BackfillResult> => {
      const res = await apiRequest('POST', '/api/admin/trainer-settlements/backfill', {});
      return (await res.json()) as BackfillResult;
    },
    onSuccess: (data) => {
      toast({ title: '백필 완료', description: `${data?.data?.created || 0}건 생성` });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/trainer-settlements/items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/trainer-settlements/monthly'] });
    },
  });

  const downloadCsv = () => {
    window.open(`/api/admin/trainer-settlements/export.csv?month=${month}`, '_blank');
  };
  const openStatement = () => {
    window.open(`/api/admin/trainer-settlements/statement.html?month=${month}`, '_blank');
  };

  const monthly = monthlyRes?.data;
  const items = itemsRes?.data || [];
  const rates = ratesRes?.data || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">트레이너 정산 관리</h1>
          <p className="text-muted-foreground">수업/상품 판매에 따른 트레이너 수수료 정산을 관리합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />
          <Button variant="outline" onClick={() => backfill.mutate()} disabled={backfill.isPending}>
            <RefreshCw className="h-4 w-4 mr-2" /> 누락 동기화
          </Button>
          <Button variant="outline" onClick={downloadCsv}>
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
          <Button variant="outline" onClick={openStatement}>
            <Download className="h-4 w-4 mr-2" /> PDF 명세서
          </Button>
          <Button onClick={() => closeMonth.mutate()} disabled={closeMonth.isPending}>
            <Lock className="h-4 w-4 mr-2" /> {month} 마감
          </Button>
        </div>
      </div>

      <Tabs defaultValue="monthly">
        <TabsList>
          <TabsTrigger value="monthly">월별 집계</TabsTrigger>
          <TabsTrigger value="items">상세 항목</TabsTrigger>
          <TabsTrigger value="rates">수수료율 관리</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle>{monthly?.month || month} 트레이너별 집계</CardTitle>
              <CardDescription>해당 월에 발생한 정산 항목을 트레이너별로 합산한 결과입니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>트레이너</TableHead>
                    <TableHead className="text-right">건수</TableHead>
                    <TableHead className="text-right">총 매출</TableHead>
                    <TableHead className="text-right">플랫폼 수수료</TableHead>
                    <TableHead className="text-right">정산액</TableHead>
                    <TableHead>마감 현황</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(monthly?.rows || []).length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">데이터 없음</TableCell></TableRow>
                  )}
                  {(monthly?.rows || []).map((r) => (
                    <TableRow key={r.trainerId}>
                      <TableCell>
                        <div className="font-medium">{r.trainerName || `Trainer #${r.trainerId}`}</div>
                        <div className="text-xs text-muted-foreground">{r.trainerEmail}</div>
                      </TableCell>
                      <TableCell className="text-right">{r.itemCount}건</TableCell>
                      <TableCell className="text-right">{Number(r.totalGross).toLocaleString()}원</TableCell>
                      <TableCell className="text-right text-red-600">{Number(r.totalFee).toLocaleString()}원</TableCell>
                      <TableCell className="text-right font-semibold">{Number(r.totalNet).toLocaleString()}원</TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">예정 {r.pendingCount} / 마감 {r.lockedCount}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>정산 항목</CardTitle>
                <CardDescription>각 거래별 정산 항목 상세</CardDescription>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="상태" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="pending">예정</SelectItem>
                  <SelectItem value="confirmed">확정</SelectItem>
                  <SelectItem value="locked">마감</SelectItem>
                  <SelectItem value="paid">지급완료</SelectItem>
                  <SelectItem value="canceled">취소</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="relative">
              {isLoading ? (
                <SkeletonTable rows={6} columns={9} />
              ) : (
              <FetchingOverlay isFetching={isFetching && !isLoading}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>발생일</TableHead>
                    <TableHead>트레이너</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>상품/강의</TableHead>
                    <TableHead className="text-right">총금액</TableHead>
                    <TableHead className="text-right">수수료</TableHead>
                    <TableHead className="text-right">정산액</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">항목 없음</TableCell></TableRow>
                  )}
                  {items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>{new Date(it.occurredAt).toLocaleDateString('ko-KR')}</TableCell>
                      <TableCell>{it.trainerName || `#${it.trainerId}`}</TableCell>
                      <TableCell><Badge variant="outline">{it.sourceType}</Badge></TableCell>
                      <TableCell>{it.sourceName || `#${it.sourceId}`}</TableCell>
                      <TableCell className="text-right">{Number(it.grossAmount).toLocaleString()}원</TableCell>
                      <TableCell className="text-right text-red-600">{Number(it.platformFee).toLocaleString()}원 ({Number(it.commissionRate)}%)</TableCell>
                      <TableCell className="text-right font-semibold">{Number(it.netAmount).toLocaleString()}원</TableCell>
                      <TableCell><Badge className={STATUS_LABEL[it.status]?.color}>{STATUS_LABEL[it.status]?.label || it.status}</Badge></TableCell>
                      <TableCell>
                        {!['paid', 'locked', 'canceled'].includes(it.status) && (
                          <Button size="sm" variant="ghost" onClick={() => cancelItem.mutate(it.id)}>
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </FetchingOverlay>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates">
          <CommissionRatesPanel rates={rates} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CommissionRatesPanel({ rates }: { rates: RateRow[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ trainerId: '', category: '', ratePercent: '20', description: '' });

  const create = useMutation({
    mutationFn: async () => {
      const body: {
        ratePercent: string;
        description?: string;
        trainerId?: number;
        category?: string;
      } = {
        ratePercent: form.ratePercent,
        description: form.description || undefined,
      };
      if (form.trainerId) body.trainerId = Number(form.trainerId);
      if (form.category) body.category = form.category;
      return apiRequest('POST', '/api/admin/trainer-commission-rates', body);
    },
    onSuccess: () => {
      toast({ title: '수수료율 등록 완료' });
      setOpen(false);
      setForm({ trainerId: '', category: '', ratePercent: '20', description: '' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/trainer-commission-rates'] });
    },
    onError: (e: Error) => toast({ title: '등록 실패', description: e?.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => apiRequest('DELETE', `/api/admin/trainer-commission-rates/${id}`),
    onSuccess: () => {
      toast({ title: '삭제 완료' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/trainer-commission-rates'] });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>수수료율 정책</CardTitle>
          <CardDescription>트레이너별, 카테고리별 수수료율을 설정할 수 있습니다. 우선순위: 트레이너+카테고리 → 트레이너 → 카테고리 → 전역(기본 20%).</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> 수수료율 추가</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>수수료율 등록</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>트레이너 ID (비우면 전역/카테고리 정책)</Label>
                <Input value={form.trainerId} onChange={(e) => setForm({ ...form, trainerId: e.target.value })} placeholder="예: 2" />
              </div>
              <div>
                <Label>카테고리 (비우면 모든 카테고리)</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="예: 기초 훈련" />
              </div>
              <div>
                <Label>수수료율 (%)</Label>
                <Input type="number" step="0.01" value={form.ratePercent} onChange={(e) => setForm({ ...form, ratePercent: e.target.value })} />
              </div>
              <div>
                <Label>설명</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => create.mutate()} disabled={create.isPending}>등록</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>대상 트레이너</TableHead>
              <TableHead>카테고리</TableHead>
              <TableHead className="text-right">수수료율</TableHead>
              <TableHead>설명</TableHead>
              <TableHead>상태</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">수수료율이 없습니다. 기본 20%가 적용됩니다.</TableCell></TableRow>
            )}
            {rates.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.trainerName ? `${r.trainerName} (#${r.trainerId})` : <span className="text-muted-foreground">전체</span>}</TableCell>
                <TableCell>{r.category || <span className="text-muted-foreground">전체</span>}</TableCell>
                <TableCell className="text-right font-semibold">{Number(r.ratePercent)}%</TableCell>
                <TableCell>{r.description || '-'}</TableCell>
                <TableCell>
                  {r.isActive ? <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />활성</Badge> : <Badge variant="outline">비활성</Badge>}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => remove.mutate(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
