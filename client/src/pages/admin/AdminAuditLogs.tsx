import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, RotateCw, ChevronLeft, ChevronRight } from 'lucide-react';

interface AuditLog {
  id: number;
  actorId: number | null;
  actorRole: string | null;
  actorName: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetName: string | null;
  payload: any;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  route: string | null;
  status: string | null;
  errorMessage: string | null;
  createdAt: string;
}

interface AuditLogResponse {
  success: boolean;
  items: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

const ACTION_OPTIONS = [
  { value: '', label: '전체 액션' },
  { value: 'admin.user.approve', label: '사용자 승인' },
  { value: 'admin.user.reject', label: '사용자 거부' },
  { value: 'admin.member.status_change', label: '회원 상태 변경' },
  { value: 'admin.institute.status_change', label: '기관 상태 변경' },
  { value: 'admin.trainer_application', label: '훈련사 신청 처리' },
  { value: 'institute.trainer_application', label: '기관 훈련사 매칭' },
  { value: 'admin.commission', label: '수수료 변경' },
  { value: 'admin.settlement', label: '정산 승인' },
];

export default function AdminAuditLogs() {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const limit = 50;

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (action) params.set('action', action);
  if (targetType) params.set('targetType', targetType);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  params.set('limit', String(limit));
  params.set('offset', String(page * limit));

  const queryKey = ['/api/admin/audit-logs', params.toString()];
  const { data, isLoading, refetch, isFetching } = useQuery<AuditLogResponse>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('감사 로그 조회 실패');
      return res.json();
    },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const reset = () => {
    setSearch('');
    setAction('');
    setTargetType('');
    setFrom('');
    setTo('');
    setPage(0);
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-admin-audit-logs">
      <div>
        <h1 className="text-3xl font-bold">관리자 감사 로그</h1>
        <p className="text-muted-foreground mt-1">
          승인/수수료/정산 등 관리자가 수행한 민감 행위 기록을 조회합니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>필터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-2">
              <Label>검색 (액터/대상명/대상ID)</Label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="이름, ID 등으로 검색"
                data-testid="input-audit-search"
              />
            </div>
            <div>
              <Label>액션</Label>
              <Select value={action || 'all'} onValueChange={(v) => setAction(v === 'all' ? '' : v)}>
                <SelectTrigger data-testid="select-audit-action">
                  <SelectValue placeholder="전체 액션" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value || 'all'} value={opt.value || 'all'}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>대상 타입</Label>
              <Input
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                placeholder="user, institute…"
                data-testid="input-audit-target-type"
              />
            </div>
            <div>
              <Label>시작일</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} data-testid="input-audit-from" />
            </div>
            <div>
              <Label>종료일</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} data-testid="input-audit-to" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={() => { setPage(0); refetch(); }} data-testid="button-audit-search">
              <Search className="w-4 h-4 mr-2" />검색
            </Button>
            <Button variant="outline" onClick={reset} data-testid="button-audit-reset">
              <RotateCw className="w-4 h-4 mr-2" />초기화
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>감사 기록 ({total}건)</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0 || isFetching}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              data-testid="button-audit-prev"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">{page + 1} / {totalPages}</span>
            <Button
              size="sm"
              variant="outline"
              disabled={page + 1 >= totalPages || isFetching}
              onClick={() => setPage((p) => p + 1)}
              data-testid="button-audit-next"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center text-muted-foreground py-12">로딩 중...</div>
          ) : items.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">기록이 없습니다.</div>
          ) : (
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>시각</TableHead>
                    <TableHead>액터</TableHead>
                    <TableHead>액션</TableHead>
                    <TableHead>대상</TableHead>
                    <TableHead>경로</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Payload</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.id} data-testid={`row-audit-${row.id}`}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {new Date(row.createdAt).toLocaleString('ko-KR')}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{row.actorName || '-'}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.actorRole || '-'} {row.actorId ? `#${row.actorId}` : ''}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{row.action}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{row.targetName || row.targetId || '-'}</div>
                        <div className="text-xs text-muted-foreground">{row.targetType || ''}</div>
                      </TableCell>
                      <TableCell className="text-xs max-w-xs truncate">{row.route || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={row.status === 'failure' ? 'destructive' : 'outline'}>
                          {row.status || 'success'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{row.ip || '-'}</TableCell>
                      <TableCell className="max-w-md">
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-32">
                          {row.payload ? JSON.stringify(row.payload, null, 2) : '-'}
                        </pre>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
