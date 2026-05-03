import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  Activity,
  Users,
  MessageSquare,
  Eye,
  Clock,
  Wifi,
  RefreshCw,
} from 'lucide-react';

interface MetricsResponse {
  success: boolean;
  data: {
    filter: { streamId: number | null; from: string | null; to: string | null };
    summary: {
      streamCount: number;
      totalViews: number;
      peakViewers: number;
      avgPeakViewers: number;
      avgDurationSeconds: number;
      avgWatchTimeSeconds: number;
      totalWatchTimeSeconds: number;
      uniqueViewers: number;
      totalViewerSessions: number;
      chatMessageCount: number;
      chatActiveUsers: number;
    };
    statusDistribution: { status: string; count: number }[];
    categoryDistribution: { category: string; count: number }[];
    connectionQualityDistribution: { quality: string; count: number }[];
    eventDistribution: { eventType: string; count: number }[];
    topStreams: {
      id: number;
      title: string;
      peakViewers: number;
      totalViews: number;
      duration: number;
      status: string;
    }[];
    dailyTrend: { date: string; streams: number; views: number }[];
  };
}

interface StreamListResponse {
  success: boolean;
  data: {
    streams: {
      id: number;
      title: string;
      status: string;
      peakViewers: number | null;
      totalViews: number | null;
      createdAt: string | null;
    }[];
  };
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const STATUS_LABELS: Record<string, string> = {
  scheduled: '예정',
  live: '진행중',
  ended: '종료됨',
  cancelled: '취소됨',
  unknown: '미상',
};

function formatSeconds(s: number): string {
  if (!s || s < 0) return '0초';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분 ${sec}초`;
  return `${sec}초`;
}

function defaultDateRange() {
  const now = new Date();
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return {
    from: from.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

export default function AdminLiveStreamingMetrics() {
  const initial = defaultDateRange();
  const [streamId, setStreamId] = useState<string>('all');
  const [from, setFrom] = useState<string>(initial.from);
  const [to, setTo] = useState<string>(initial.to);

  const queryKey = useMemo(
    () => ['/api/admin/live-streaming/metrics', streamId, from, to] as const,
    [streamId, from, to],
  );

  const { data, isLoading, isFetching, refetch } = useQuery<MetricsResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (streamId && streamId !== 'all') params.set('streamId', streamId);
      if (from) params.set('from', new Date(from).toISOString());
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        params.set('to', end.toISOString());
      }
      const res = await fetch(`/api/admin/live-streaming/metrics?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('메트릭을 불러오지 못했습니다.');
      return res.json();
    },
  });

  const { data: streamList } = useQuery<StreamListResponse>({
    queryKey: ['/api/admin/live-streaming/streams'],
    queryFn: async () => {
      const res = await fetch('/api/admin/live-streaming/streams', { credentials: 'include' });
      if (!res.ok) throw new Error('스트림 목록을 불러오지 못했습니다.');
      return res.json();
    },
  });

  const summary = data?.data.summary;
  const statusData = data?.data.statusDistribution || [];
  const categoryData = data?.data.categoryDistribution || [];
  const qualityData = data?.data.connectionQualityDistribution || [];
  const dailyTrend = data?.data.dailyTrend || [];
  const topStreams = data?.data.topStreams || [];
  const eventData = data?.data.eventDistribution || [];

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6" data-testid="admin-live-metrics">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            화상수업 품질·참여 통계
          </h1>
          <p className="text-sm text-muted-foreground">
            라이브 수업의 시청자, 채팅 활성도, 연결 품질 등 운영 지표를 확인합니다.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          data-testid="button-refresh-metrics"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">필터</CardTitle>
          <CardDescription>특정 수업 또는 기간의 지표를 확인할 수 있어요.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="stream-select">수업</Label>
              <Select value={streamId} onValueChange={setStreamId}>
                <SelectTrigger id="stream-select" data-testid="select-stream">
                  <SelectValue placeholder="전체 수업" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 수업</SelectItem>
                  {(streamList?.data.streams || []).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      #{s.id} {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="from-date">시작일</Label>
              <Input
                id="from-date"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                data-testid="input-from-date"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="to-date">종료일</Label>
              <Input
                id="to-date"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                data-testid="input-to-date"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  const d = defaultDateRange();
                  setStreamId('all');
                  setFrom(d.from);
                  setTo(d.to);
                }}
                data-testid="button-reset-filters"
              >
                초기화
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              icon={<Eye className="h-4 w-4" />}
              label="총 수업 수"
              value={summary?.streamCount ?? 0}
              hint={`총 시청 ${summary?.totalViews ?? 0}회`}
              testId="metric-stream-count"
            />
            <SummaryCard
              icon={<Users className="h-4 w-4" />}
              label="피크 동시 시청자"
              value={summary?.peakViewers ?? 0}
              hint={`평균 피크 ${summary?.avgPeakViewers ?? 0}명`}
              testId="metric-peak-viewers"
            />
            <SummaryCard
              icon={<Clock className="h-4 w-4" />}
              label="평균 시청 시간"
              value={formatSeconds(summary?.avgWatchTimeSeconds ?? 0)}
              hint={`평균 수업 길이 ${formatSeconds(summary?.avgDurationSeconds ?? 0)}`}
              testId="metric-avg-watch"
            />
            <SummaryCard
              icon={<MessageSquare className="h-4 w-4" />}
              label="채팅 메시지"
              value={summary?.chatMessageCount ?? 0}
              hint={`참여자 ${summary?.chatActiveUsers ?? 0}명`}
              testId="metric-chat"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">일자별 수업/시청 추이</CardTitle>
                <CardDescription>수업 개수와 누적 시청 수</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {dailyTrend.length === 0 ? (
                  <EmptyState text="해당 기간에 데이터가 없어요." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="streams" name="수업 수" stroke="#6366f1" />
                      <Line type="monotone" dataKey="views" name="시청 수" stroke="#10b981" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wifi className="h-4 w-4" />
                  연결 품질 분포
                </CardTitle>
                <CardDescription>실시간 피어 연결 품질 통계</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {qualityData.length === 0 ? (
                  <EmptyState text="연결 품질 데이터가 없어요." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={qualityData}
                        dataKey="count"
                        nameKey="quality"
                        outerRadius={90}
                        label={(entry) => `${entry.quality}: ${entry.count}`}
                      >
                        {qualityData.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">종료 사유(상태) 분포</CardTitle>
                <CardDescription>수업 상태별 개수</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {statusData.length === 0 ? (
                  <EmptyState text="상태 데이터가 없어요." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={statusData.map((s) => ({
                        ...s,
                        label: STATUS_LABELS[s.status] || s.status,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" name="수업 수" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">카테고리 분포</CardTitle>
                <CardDescription>수업 카테고리별 비율</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {categoryData.length === 0 ? (
                  <EmptyState text="카테고리 데이터가 없어요." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="count"
                        nameKey="category"
                        outerRadius={90}
                        label={(entry) => `${entry.category}: ${entry.count}`}
                      >
                        {categoryData.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">이벤트 활동(분석 로그)</CardTitle>
              <CardDescription>스트림 분석 이벤트 유형별 발생 수</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              {eventData.length === 0 ? (
                <EmptyState text="이벤트 데이터가 없어요." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eventData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="eventType" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">상위 수업 (피크 시청자 기준)</CardTitle>
              <CardDescription>시청자가 가장 많이 몰린 수업</CardDescription>
            </CardHeader>
            <CardContent>
              {topStreams.length === 0 ? (
                <EmptyState text="표시할 수업이 없어요." />
              ) : (
                <Table data-testid="table-top-streams">
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>제목</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">피크 시청자</TableHead>
                      <TableHead className="text-right">총 시청</TableHead>
                      <TableHead className="text-right">진행 시간</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topStreams.map((s) => (
                      <TableRow key={s.id} data-testid={`row-stream-${s.id}`}>
                        <TableCell>#{s.id}</TableCell>
                        <TableCell className="max-w-[280px] truncate">{s.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {STATUS_LABELS[s.status] || s.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{s.peakViewers}</TableCell>
                        <TableCell className="text-right">{s.totalViews}</TableCell>
                        <TableCell className="text-right">{formatSeconds(s.duration)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  hint?: string;
  testId?: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          {icon}
          {label}
        </CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      {hint && (
        <CardContent>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      )}
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
