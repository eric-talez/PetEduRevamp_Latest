import { useQuery } from '@tanstack/react-query';
import { useLocation, useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  ClipboardList,
  PawPrint,
  User,
  Target,
  Clock,
  Footprints,
  GraduationCap,
  Star,
  Brain,
  Calendar,
  Mail,
  Phone,
  Loader2,
  AlertTriangle
} from 'lucide-react';

const TEMPERAMENT_LEVELS: Record<string, { label: string; description: string; color: string }> = {
  A: { label: 'A등급 - 사회성 양호', description: '다른 사람/동물에 대해 우호적이며 안정적', color: 'bg-success/10 text-success border-success/40' },
  B: { label: 'B등급 - 흥분 조절 필요', description: '흥분 시 자제력이 부족하나 공격성은 없음', color: 'bg-primary/10 text-primary border-primary/40' },
  C: { label: 'C등급 - 짖음/경계', description: '낯선 자극에 짖거나 경계하는 행동을 보임', color: 'bg-warning/10 text-warning border-warning/40' },
  D: { label: 'D등급 - 공격성 주의', description: '특정 상황에서 공격적 행동 가능성 있음', color: 'bg-primary/10 text-primary border-primary/40' },
  E: { label: 'E등급 - 분리불안', description: '보호자 분리 시 심한 불안 증세를 보임', color: 'bg-destructive/10 text-destructive border-destructive/40' },
};

function InfoRow({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      {icon && <div className="mt-0.5 text-muted-foreground">{icon}</div>}
      <div>
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        <div className="text-sm mt-0.5 whitespace-pre-wrap">{value}</div>
      </div>
    </div>
  );
}

export default function ConsultationDetail() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/consultation-records/:id');
  const id = params?.id;

  const { data, isLoading, error } = useQuery<{ success: boolean; consultation: any }>({
    queryKey: [`/api/consultation-records/${id}`],
    enabled: !!id,
  });

  const c = data?.consultation;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">상담 기록을 불러오는 중...</span>
      </div>
    );
  }

  if (!c) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <AlertTriangle className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">상담 기록을 찾을 수 없습니다</h2>
        <Button variant="outline" onClick={() => setLocation('/consultation-records')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          목록으로
        </Button>
      </div>
    );
  }

  const temperament = c.temperamentLevel ? TEMPERAMENT_LEVELS[c.temperamentLevel] : null;

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="sm" onClick={() => setLocation('/consultation-records')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          목록
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            상담 기록 상세
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{formatDate(c.createdAt)}</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PawPrint className="w-5 h-5 text-primary" />
              반려동물 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">이름</div>
                <div className="font-semibold text-lg">{c.pet?.name || '-'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">품종</div>
                <div>{c.pet?.breed || '-'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">나이</div>
                <div>{c.pet?.age ? `${c.pet.age}세` : '-'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">성별</div>
                <div>{c.pet?.gender === 'male' ? '수컷' : c.pet?.gender === 'female' ? '암컷' : '-'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              보호자 · 훈련사
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">보호자</div>
                <div className="font-medium">{c.ownerName || '-'}</div>
                {c.ownerEmail && <div className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{c.ownerEmail}</div>}
                {c.ownerPhone && <div className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{c.ownerPhone}</div>}
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">상담 훈련사</div>
                <div className="font-medium">{c.trainerName || '-'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {temperament && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="w-5 h-5 text-warning" />
                성향 등급 평가
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`p-4 rounded-lg border-2 ${temperament.color}`}>
                <div className="font-semibold text-lg">{temperament.label}</div>
                <div className="text-sm mt-1">{temperament.description}</div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-destructive" />
              방문 목적 및 주요 문제 행동
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <InfoRow label="방문 목적" value={c.visitPurpose} />
            <Separator />
            <InfoRow label="주요 문제 행동" value={c.mainProblemBehavior} />
          </CardContent>
        </Card>

        {(c.behaviorTiming || c.behaviorTarget || c.recentChanges) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                행동 세부 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow label="행동 발생 시기/상황" value={c.behaviorTiming} />
              <InfoRow label="행동 대상" value={c.behaviorTarget} />
              <InfoRow label="최근 환경 변화" value={c.recentChanges} />
            </CardContent>
          </Card>
        )}

        {(c.walkDuration || c.mealPattern || c.ownerReactionStyle) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Footprints className="w-5 h-5 text-success" />
                일상 패턴
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow label="산책 시간/빈도" value={c.walkDuration} />
              <InfoRow label="식사 패턴" value={c.mealPattern} />
              <InfoRow label="보호자 반응 스타일" value={c.ownerReactionStyle} />
            </CardContent>
          </Card>
        )}

        {(c.previousTrainingExperience || c.desiredGoal) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                훈련 이력 및 목표
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow label="이전 훈련 경험" value={c.previousTrainingExperience} />
              <InfoRow label="보호자 희망 목표" value={c.desiredGoal} />
            </CardContent>
          </Card>
        )}

        {c.additionalNotes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                추가 메모
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm">{c.additionalNotes}</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
