import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Download, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { SkeletonTable, FetchingOverlay } from '@/components/ui/SkeletonLoader';
import { keepPreviousData } from '@tanstack/react-query';

interface SummaryData {
  currentMonth: string;
  expected: number;
  confirmed: number;
  totalLifetime: number;
  history: Array<{ month: string; totalGross: number; totalNet: number; count: number; status: string }>;
}

interface ItemRow {
  id: number;
  sourceType: string;
  sourceId: number;
  sourceName: string | null;
  category: string | null;
  grossAmount: string;
  commissionRate: string;
  platformFee: string;
  netAmount: string;
  settlementMonth: string;
  status: string;
  occurredAt: string;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: '예정', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: '확정', color: 'bg-blue-100 text-blue-800' },
  locked: { label: '마감', color: 'bg-purple-100 text-purple-800' },
  paid: { label: '지급완료', color: 'bg-green-100 text-green-800' },
  canceled: { label: '취소', color: 'bg-red-100 text-red-800' },
};

export default function TrainerSettlementsPage() {
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: summaryRes, isLoading: loadingSummary } = useQuery<{ success: boolean; data: SummaryData }>({
    queryKey: ['/api/trainer/settlements/summary'],
  });
  const { data: itemsRes, isLoading: loadingItems, isFetching: fetchingItems } = useQuery<{ success: boolean; data: ItemRow[] }>({
    queryKey: ['/api/trainer/settlements/items', monthFilter !== 'all' ? monthFilter : '', statusFilter !== 'all' ? statusFilter : ''],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (monthFilter !== 'all') params.set('month', monthFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/trainer/settlements/items?${params}`);
      return res.json();
    },
    placeholderData: keepPreviousData,
  });

  const summary = summaryRes?.data;
  const items = itemsRes?.data || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">정산 내역</h1>
          <p className="text-muted-foreground">자동으로 집계되는 수수료 정산 현황입니다.</p>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm text-muted-foreground">정산월</p>
                <p className="text-xl font-bold">{summary?.currentMonth || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm text-muted-foreground">이번 달 예상 정산액</p>
                <p className="text-2xl font-bold">{(summary?.expected || 0).toLocaleString()}원</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm text-muted-foreground">이번 달 확정 정산액</p>
                <p className="text-2xl font-bold">{(summary?.confirmed || 0).toLocaleString()}원</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm text-muted-foreground">누적 정산액</p>
                <p className="text-2xl font-bold">{(summary?.totalLifetime || 0).toLocaleString()}원</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 월별 이력 */}
      <Card>
        <CardHeader>
          <CardTitle>월별 정산 이력</CardTitle>
          <CardDescription>마감/지급 상태를 확인하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSummary ? (
            <SkeletonTable rows={4} columns={5} />
          ) : (summary?.history?.length || 0) === 0 ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              아직 정산 이력이 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>정산월</TableHead>
                  <TableHead className="text-right">건수</TableHead>
                  <TableHead className="text-right">총 매출</TableHead>
                  <TableHead className="text-right">정산액</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary!.history.map((h) => (
                  <TableRow key={h.month}>
                    <TableCell className="font-medium">{h.month}</TableCell>
                    <TableCell className="text-right">{h.count}건</TableCell>
                    <TableCell className="text-right">{h.totalGross.toLocaleString()}원</TableCell>
                    <TableCell className="text-right font-semibold">{h.totalNet.toLocaleString()}원</TableCell>
                    <TableCell>
                      <Badge className={STATUS_LABEL[h.status]?.color || ''}>{STATUS_LABEL[h.status]?.label || h.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 상세 항목 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>정산 항목 상세</CardTitle>
            <CardDescription>각 거래별 수수료 및 정산 내역</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-32"><SelectValue placeholder="월" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 월</SelectItem>
                {(summary?.history || []).map((h) => (
                  <SelectItem key={h.month} value={h.month}>{h.month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32"><SelectValue placeholder="상태" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="pending">예정</SelectItem>
                <SelectItem value="confirmed">확정</SelectItem>
                <SelectItem value="locked">마감</SelectItem>
                <SelectItem value="paid">지급완료</SelectItem>
                <SelectItem value="canceled">취소</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="relative">
          {loadingItems ? (
            <SkeletonTable rows={6} columns={8} />
          ) : items.length === 0 ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              조회된 항목이 없습니다.
            </div>
          ) : (
            <FetchingOverlay isFetching={fetchingItems && !loadingItems}>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>발생일</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>상품/강의명</TableHead>
                    <TableHead className="text-right">총 금액</TableHead>
                    <TableHead className="text-right">수수료율</TableHead>
                    <TableHead className="text-right">플랫폼 수수료</TableHead>
                    <TableHead className="text-right">정산액</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>{new Date(it.occurredAt).toLocaleDateString('ko-KR')}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{it.sourceType}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{it.sourceName || `#${it.sourceId}`}</TableCell>
                      <TableCell className="text-right">{Number(it.grossAmount).toLocaleString()}원</TableCell>
                      <TableCell className="text-right">{Number(it.commissionRate)}%</TableCell>
                      <TableCell className="text-right text-red-600">-{Number(it.platformFee).toLocaleString()}원</TableCell>
                      <TableCell className="text-right font-semibold">{Number(it.netAmount).toLocaleString()}원</TableCell>
                      <TableCell>
                        <Badge className={STATUS_LABEL[it.status]?.color || ''}>{STATUS_LABEL[it.status]?.label || it.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </FetchingOverlay>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
