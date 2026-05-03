import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, TrendingUp, TrendingDown, Minus, ArrowRightLeft, Sparkles, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface TrendsTabProps {
  petId: number | null;
  petName?: string;
  analyses: any[];
}

const PERIOD_PRESETS: { value: string; label: string }[] = [
  { value: '7d', label: '1주' },
  { value: '30d', label: '1달' },
  { value: '90d', label: '3달' },
  { value: 'custom', label: '사용자 지정' },
];

const MOOD_LABELS: Record<string, string> = {
  happy: '행복', sad: '슬픔', anxious: '불안', calm: '평온',
  energetic: '활발', tired: '피곤', unknown: '미상',
};
const MOOD_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#94a3b8'];

function fetchJson(url: string) {
  return fetch(url, { credentials: 'include' }).then((r) => r.json());
}

export function TrendsTab({ petId, petName, analyses }: TrendsTabProps) {
  const [period, setPeriod] = useState<string>('30d');
  const [customStart, setCustomStart] = useState<string>(
    new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  );
  const [customEnd, setCustomEnd] = useState<string>(new Date().toISOString().split('T')[0]);

  const trendsQuery = useQuery({
    queryKey: ['/api/ai-analysis/trends', petId, period, customStart, customEnd],
    enabled: !!petId,
    queryFn: () => {
      const params = new URLSearchParams({ petId: String(petId), period });
      if (period === 'custom') {
        params.set('startDate', customStart);
        params.set('endDate', customEnd);
      }
      return fetchJson(`/api/ai-analysis/trends?${params}`);
    },
  });

  const trends = trendsQuery.data;

  const chartSeries = useMemo(() => {
    if (!trends?.series) return [];
    return trends.series.map((d: any) => ({
      ...d,
      dateLabel: format(new Date(d.date), 'M.d', { locale: ko }),
    }));
  }, [trends]);

  const moodPieData = useMemo(() => {
    if (!trends?.summary?.moodDistribution) return [];
    return Object.entries(trends.summary.moodDistribution as Record<string, number>).map(
      ([mood, value]) => ({ name: MOOD_LABELS[mood] || mood, value })
    );
  }, [trends]);

  // 비교 모드
  const [compareMode, setCompareMode] = useState(false);
  const [analysisIdA, setAnalysisIdA] = useState<string>('');
  const [analysisIdB, setAnalysisIdB] = useState<string>('');

  const compareQuery = useQuery({
    queryKey: ['/api/ai-analysis/compare', analysisIdA, analysisIdB],
    enabled: compareMode && !!analysisIdA && !!analysisIdB && analysisIdA !== analysisIdB,
    queryFn: () =>
      fetchJson(`/api/ai-analysis/compare?analysisIdA=${analysisIdA}&analysisIdB=${analysisIdB}`),
  });

  const renderInsightIcon = (severity: string) => {
    if (severity === 'positive') return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (severity === 'negative') return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  if (!petId) {
    return (
      <Card>
        <CardContent className="text-center py-8 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>반려동물을 선택하면 분석 이력 추이가 표시됩니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 기간 선택 + 비교 모드 토글 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {petName ? `${petName}의 ` : ''}분석 이력 추이
          </CardTitle>
          <CardDescription>기간을 선택하면 핵심 지표의 변화를 시각화합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {PERIOD_PRESETS.map((p) => (
              <Button
                key={p.value}
                size="sm"
                variant={period === p.value ? 'default' : 'outline'}
                onClick={() => setPeriod(p.value)}
                data-testid={`button-period-${p.value}`}
              >
                {p.label}
              </Button>
            ))}
            <div className="ml-auto">
              <Button
                size="sm"
                variant={compareMode ? 'default' : 'outline'}
                onClick={() => setCompareMode((v) => !v)}
                data-testid="button-toggle-compare"
              >
                <ArrowRightLeft className="w-4 h-4 mr-1" />
                {compareMode ? '비교 모드 끄기' : '비교 모드 켜기'}
              </Button>
            </div>
          </div>
          {period === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-600">시작일</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  data-testid="input-trend-start"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">종료일</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  data-testid="input-trend-end"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 추이 데이터 */}
      {trendsQuery.isLoading ? (
        <Card><CardContent className="py-8 text-center text-gray-500">불러오는 중...</CardContent></Card>
      ) : trends?.isEmpty ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>선택한 기간에 알림장 데이터가 없습니다.</p>
            <p className="text-xs mt-1">기간을 늘리거나 알림장을 먼저 작성해 보세요.</p>
          </CardContent>
        </Card>
      ) : trends?.success ? (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryStat
              label="총 알림장"
              value={trends.summary.totalLogs}
              suffix="건"
              previous={trends.previousSummary.totalLogs}
              betterWhenLower={false}
            />
            <SummaryStat
              label="평균 스트레스"
              value={trends.summary.avgStress}
              suffix="/10"
              previous={trends.previousSummary.avgStress}
              betterWhenLower
            />
            <SummaryStat
              label="평균 활동성"
              value={trends.summary.avgEnergy}
              suffix="/5"
              previous={trends.previousSummary.avgEnergy}
              betterWhenLower={false}
            />
            <SummaryStat
              label="정상 배변 비율"
              value={trends.summary.poopNormalRate}
              suffix="%"
              previous={trends.previousSummary.poopNormalRate}
              betterWhenLower={false}
            />
          </div>

          {/* 인사이트 코멘트 */}
          {trends.insights?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  자동 인사이트
                </CardTitle>
                <CardDescription>이전 동일 기간과 비교해 변화가 큰 지표를 자동으로 강조합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {trends.insights.map((ins: any, i: number) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 p-3 rounded-md border ${
                      ins.severity === 'positive'
                        ? 'bg-green-50 border-green-200'
                        : ins.severity === 'negative'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                    data-testid={`insight-${ins.metric}`}
                  >
                    {renderInsightIcon(ins.severity)}
                    <div className="text-sm flex-1">{ins.comment}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 스트레스/활동성 라인 차트 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">스트레스 점수 & 활동성 추이</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dateLabel" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="avgStress" stroke="#ef4444" name="스트레스 점수" />
                    <Line type="monotone" dataKey="avgEnergy" stroke="#3b82f6" name="활동성" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 정상 신호 막대 차트 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">일별 정상/이상 신호</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dateLabel" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="poopNormal" stackId="poop" fill="#22c55e" name="정상 배변" />
                    <Bar dataKey="poopAbnormal" stackId="poop" fill="#ef4444" name="이상 배변" />
                    <Bar dataKey="mealNormal" stackId="meal" fill="#3b82f6" name="정상 식사" />
                    <Bar dataKey="mealAbnormal" stackId="meal" fill="#f59e0b" name="이상 식사" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 감정 분포 파이 */}
          {moodPieData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">감정 분포</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={moodPieData} dataKey="value" nameKey="name" outerRadius={80} label>
                        {moodPieData.map((_, idx) => (
                          <Cell key={idx} fill={MOOD_COLORS[idx % MOOD_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}

      {/* 비교 모드 */}
      {compareMode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" />
              두 분석 결과 비교
            </CardTitle>
            <CardDescription>분석 이력 중 두 개를 선택하면 좌우로 비교하고 큰 변화를 강조합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <AnalysisPicker
                label="기준 분석 (이전)"
                value={analysisIdA}
                onChange={setAnalysisIdA}
                analyses={analyses}
                testId="select-compare-a"
              />
              <AnalysisPicker
                label="비교 분석 (이후)"
                value={analysisIdB}
                onChange={setAnalysisIdB}
                analyses={analyses}
                testId="select-compare-b"
              />
            </div>
            {analyses.length < 2 && (
              <p className="text-xs text-amber-600">비교에는 최소 2개의 분석 기록이 필요합니다.</p>
            )}

            {compareQuery.isLoading && (
              <p className="text-sm text-gray-500 text-center py-4">비교 중...</p>
            )}

            {compareQuery.data?.success && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <ComparisonPanel title="이전" data={compareQuery.data.analysisA} />
                  <ComparisonPanel title="이후" data={compareQuery.data.analysisB} />
                </div>

                {/* 변화량 표 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">지표 변화</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {compareQuery.data.diffs.map((d: any) => (
                      <div
                        key={d.metric}
                        className={`flex items-center justify-between text-sm p-2 rounded ${
                          d.severity === 'positive' ? 'bg-green-50' :
                          d.severity === 'negative' ? 'bg-red-50' : 'bg-gray-50'
                        }`}
                        data-testid={`diff-${d.metric}`}
                      >
                        <span>{d.label}</span>
                        <span className="flex items-center gap-2">
                          <span className="text-gray-600">{d.before ?? '-'}</span>
                          <ArrowRightLeft className="w-3 h-3 text-gray-400" />
                          <span className="font-semibold">{d.after ?? '-'}</span>
                          {d.delta !== null && (
                            <Badge variant={d.severity === 'positive' ? 'default' : d.severity === 'negative' ? 'destructive' : 'outline'}>
                              {d.delta > 0 ? '+' : ''}{d.delta}
                            </Badge>
                          )}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {compareQuery.data.highlights?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        주요 변화 하이라이트
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {compareQuery.data.highlights.map((h: any, i: number) => (
                        <div
                          key={i}
                          className={`p-2 rounded text-sm border ${
                            h.severity === 'positive' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                          }`}
                          data-testid={`highlight-${h.metric}`}
                        >
                          {h.comment}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryStat({
  label, value, suffix, previous, betterWhenLower,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  previous: number | null;
  betterWhenLower: boolean;
}) {
  const delta = value !== null && previous !== null ? +(value - previous).toFixed(2) : null;
  const isImprovement = delta !== null && (betterWhenLower ? delta < 0 : delta > 0);
  const isFlat = delta === null || Math.abs(delta) < 0.05;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-2xl font-bold mt-1">
          {value === null ? '-' : value}
          {suffix && <span className="text-sm font-normal ml-1">{suffix}</span>}
        </div>
        {!isFlat && delta !== null && (
          <div className={`text-xs mt-1 flex items-center gap-1 ${isImprovement ? 'text-green-600' : 'text-red-600'}`}>
            {isImprovement ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            이전 대비 {delta > 0 ? '+' : ''}{delta}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AnalysisPicker({
  label, value, onChange, analyses, testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  analyses: any[];
  testId: string;
}) {
  return (
    <div>
      <label className="text-xs text-gray-600 mb-1 block">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger data-testid={testId}>
          <SelectValue placeholder="분석 선택" />
        </SelectTrigger>
        <SelectContent>
          {analyses.map((a) => (
            <SelectItem key={a.id} value={String(a.id)}>
              #{a.id} · {format(new Date(a.createdAt), 'M월 d일 HH:mm', { locale: ko })} · {a.model}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ComparisonPanel({ title, data }: { title: string; data: any }) {
  const r = data.resultJson || {};
  const c = data.computed || {};
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{title}</span>
          <Badge variant="outline">#{data.id}</Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          {format(new Date(data.createdAt), 'yyyy.M.d HH:mm', { locale: ko })} · {data.model}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div>
          <div className="text-xs text-gray-500">종합</div>
          <div className="line-clamp-3">{r.summary || '-'}</div>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <Stat label="스트레스" value={c.avgStress} suffix="/10" />
          <Stat label="활동성" value={c.avgEnergy} suffix="/5" />
          <Stat label="정상 배변" value={c.poopNormalRate} suffix="%" />
          <Stat label="정상 식사" value={c.mealNormalRate} suffix="%" />
        </div>
        {r.redFlags?.length > 0 && (
          <div className="pt-2 border-t">
            <div className="text-xs text-amber-600 mb-1">주의사항</div>
            <ul className="text-xs list-disc list-inside space-y-0.5">
              {r.redFlags.slice(0, 3).map((f: string, i: number) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, suffix }: { label: string; value: any; suffix?: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-semibold">{value ?? '-'}{suffix}</div>
    </div>
  );
}
