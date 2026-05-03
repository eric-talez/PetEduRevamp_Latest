import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Scale, Notebook, ArrowRight, AlertCircle, Dog } from 'lucide-react';

interface RecentNote {
  date: string;
  note: string;
  tags: string[];
  mood?: string;
  energyLevel?: number;
}

interface OverviewItem {
  pet: {
    id: number;
    name: string;
    breed?: string;
    species?: string;
    imageUrl?: string;
    ownerId?: number;
    ownerName?: string | null;
    trainingStatus?: string;
    trainingType?: string;
  };
  summary: {
    logCount: number;
    latestWeightKg: number | null;
    weightDeltaKg: number | null;
    totalExerciseMinutes: number;
    avgExerciseMinutes: number;
    lastLogDate: string | null;
    recentNotes: RecentNote[];
  };
}

interface OverviewResponse {
  success: boolean;
  rangeStart: string;
  rangeEnd: string;
  totalAssignedPets: number;
  sharedPetCount: number;
  overview: OverviewItem[];
}

export default function TrainerDiaryOverview() {
  const { data, isLoading, isError, error } = useQuery<OverviewResponse>({
    queryKey: ['/api/diary/trainer-overview'],
  });

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6" data-testid="page-trainer-diary-overview">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Notebook className="w-6 h-6 text-primary" />
            담당 반려견 다이어리 모아보기
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            보호자가 공유를 켠 담당 반려견의 최근 7일 요약을 한눈에 확인할 수 있어요.
          </p>
        </div>
        {data && (
          <div className="flex gap-2 items-center text-sm text-muted-foreground">
            <Badge variant="secondary" data-testid="badge-range">
              {data.rangeStart} ~ {data.rangeEnd}
            </Badge>
            <Badge data-testid="badge-counts">
              공유 {data.sharedPetCount} / 담당 {data.totalAssignedPets}
            </Badge>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isError && (
        <Card data-testid="card-error">
          <CardContent className="pt-6 flex items-start gap-3 text-destructive">
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <div>
              <p className="font-medium">다이어리를 불러오지 못했습니다.</p>
              <p className="text-sm text-muted-foreground mt-1">
                {(error as Error)?.message || '잠시 후 다시 시도해주세요.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && data && data.overview.length === 0 && (
        <Card data-testid="card-empty">
          <CardContent className="pt-6 text-center space-y-2">
            <Dog className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="font-medium">표시할 다이어리가 없습니다.</p>
            <p className="text-sm text-muted-foreground">
              담당 반려견이 없거나, 보호자가 다이어리 공유를 아직 켜지 않았어요.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && data && data.overview.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="grid-overview">
          {data.overview.map(item => (
            <Card key={item.pet.id} data-testid={`card-pet-${item.pet.id}`} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={item.pet.imageUrl} alt={item.pet.name} />
                    <AvatarFallback>{item.pet.name?.[0] || '🐶'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate" data-testid={`text-pet-name-${item.pet.id}`}>
                      {item.pet.name}
                    </CardTitle>
                    <CardDescription className="truncate">
                      {item.pet.breed || item.pet.species || ''}
                      {item.pet.ownerName ? ` · 보호자 ${item.pet.ownerName}` : ''}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted/50 p-2">
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Scale className="w-3 h-3" /> 체중
                    </div>
                    <div className="font-semibold text-sm mt-1" data-testid={`text-weight-${item.pet.id}`}>
                      {item.summary.latestWeightKg !== null ? `${item.summary.latestWeightKg}kg` : '-'}
                    </div>
                    {item.summary.weightDeltaKg !== null && (
                      <div className={`text-[11px] mt-0.5 ${item.summary.weightDeltaKg > 0 ? 'text-primary' : item.summary.weightDeltaKg < 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                        {item.summary.weightDeltaKg > 0 ? '+' : ''}{item.summary.weightDeltaKg}kg
                      </div>
                    )}
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Activity className="w-3 h-3" /> 운동
                    </div>
                    <div className="font-semibold text-sm mt-1" data-testid={`text-exercise-${item.pet.id}`}>
                      {item.summary.totalExerciseMinutes}분
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      평균 {item.summary.avgExerciseMinutes}분
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Notebook className="w-3 h-3" /> 기록
                    </div>
                    <div className="font-semibold text-sm mt-1" data-testid={`text-logs-${item.pet.id}`}>
                      {item.summary.logCount}건
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {item.summary.lastLogDate || '기록 없음'}
                    </div>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="text-xs font-medium text-muted-foreground mb-2">최근 특이사항</div>
                  {item.summary.recentNotes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">최근 7일간 메모가 없습니다.</p>
                  ) : (
                    <ul className="space-y-2">
                      {item.summary.recentNotes.map((n, idx) => (
                        <li key={idx} className="text-sm border-l-2 border-primary/30 pl-2" data-testid={`note-${item.pet.id}-${idx}`}>
                          <div className="text-[11px] text-muted-foreground">{n.date}</div>
                          {n.note && <p className="line-clamp-2">{n.note}</p>}
                          {n.tags && n.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {n.tags.slice(0, 4).map((t, ti) => (
                                <Badge key={ti} variant="outline" className="text-[10px] px-1 py-0">{t}</Badge>
                              ))}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <Link href={`/pet-care/health-diary?petId=${item.pet.id}`}>
                  <Button variant="outline" size="sm" className="w-full" data-testid={`button-detail-${item.pet.id}`}>
                    상세 다이어리 보기
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
