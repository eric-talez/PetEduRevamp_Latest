import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ListChecks, Plus, Trash2, AlertTriangle, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface HomeworkItem {
  id: number;
  journalId: number;
  label: string;
  dueDate: string | null;
  completedAt: string | null;
  completedByUserId: number | null;
  sortOrder: number;
  createdAt: string;
}
interface HomeworkResponse {
  success: boolean;
  items: HomeworkItem[];
  stats: { total: number; completed: number; completionRate: number };
}

interface Props {
  journalId: number;
  canEdit: boolean;
}

export function JournalHomeworkChecklist({ journalId, canEdit }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const queryKey = ['/api/notebook/entries', journalId, 'homework'];

  const { data, isLoading } = useQuery<HomeworkResponse>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/notebook/entries/${journalId}/homework`, { credentials: 'include' });
      if (!res.ok) throw new Error('숙제 조회 실패');
      return res.json();
    },
    enabled: Number.isFinite(journalId) && journalId > 0,
  });

  const items = data?.items || [];
  const stats = data?.stats || { total: 0, completed: 0, completionRate: 0 };

  const [newLabel, setNewLabel] = useState('');
  const [newDue, setNewDue] = useState('');

  const addMutation = useMutation({
    mutationFn: async () => {
      const { secureRequest } = await import('@/lib/csrf');
      const res = await secureRequest(`/api/notebook/entries/${journalId}/homework`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel.trim(), dueDate: newDue || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || '추가 실패');
      return json;
    },
    onSuccess: () => {
      setNewLabel('');
      setNewDue('');
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: any) => toast({ title: '숙제 추가 실패', description: e?.message, variant: 'destructive' }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const { secureRequest } = await import('@/lib/csrf');
      const res = await secureRequest(`/api/notebook/homework/${id}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || '처리 실패');
      return json;
    },
    onMutate: async ({ id, completed }) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<HomeworkResponse>(queryKey);
      if (prev) {
        const next = {
          ...prev,
          items: prev.items.map((i) =>
            i.id === id ? { ...i, completedAt: completed ? new Date().toISOString() : null } : i,
          ),
        };
        next.stats = {
          total: next.items.length,
          completed: next.items.filter((i) => !!i.completedAt).length,
          completionRate: next.items.length
            ? Math.round((next.items.filter((i) => !!i.completedAt).length / next.items.length) * 100)
            : 0,
        };
        qc.setQueryData(queryKey, next);
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast({ title: '체크 처리 실패', variant: 'destructive' });
    },
    onSuccess: (json) => {
      if (json?.allCompleted) {
        toast({ title: '모든 숙제 완료!', description: '훈련사에게 알림이 전달됩니다.' });
      }
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ['/api/notebook/homework/overdue-count'] });
      qc.invalidateQueries({ queryKey: ['/api/notebook/homework/weekly-stats'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { secureRequest } = await import('@/lib/csrf');
      const res = await secureRequest(`/api/notebook/homework/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || '삭제 실패');
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError: (e: any) => toast({ title: '삭제 실패', description: e?.message, variant: 'destructive' }),
  });

  const now = Date.now();

  return (
    <Card data-testid="card-homework">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            숙제 체크리스트
          </span>
          {stats.total > 0 && (
            <Badge variant={stats.completionRate === 100 ? 'default' : 'secondary'} data-testid="badge-homework-rate">
              {stats.completed}/{stats.total} · {stats.completionRate}%
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">불러오는 중…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {canEdit ? '아직 숙제가 없습니다. 아래에서 항목을 추가해 주세요.' : '이 알림장에는 숙제가 없습니다.'}
          </p>
        ) : (
          items.map((item) => {
            const overdue = !item.completedAt && item.dueDate && new Date(item.dueDate).getTime() < now;
            return (
              <div
                key={item.id}
                className={`flex items-start gap-3 rounded-md border p-3 ${overdue ? 'border-destructive/50 bg-destructive/5' : ''}`}
                data-testid={`item-homework-${item.id}`}
              >
                <Checkbox
                  checked={!!item.completedAt}
                  onCheckedChange={(v) => toggleMutation.mutate({ id: item.id, completed: !!v })}
                  className="mt-0.5"
                  data-testid={`checkbox-homework-${item.id}`}
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${item.completedAt ? 'line-through text-muted-foreground' : ''}`}>
                    {item.label}
                  </p>
                  {item.dueDate && (
                    <p className={`mt-1 flex items-center gap-1 text-xs ${overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      {overdue ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                      마감 {format(new Date(item.dueDate), 'M월 d일 (E)', { locale: ko })}
                      {overdue && ' · 지연'}
                    </p>
                  )}
                  {item.completedAt && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" />
                      완료 {format(new Date(item.completedAt), 'M월 d일 HH:mm', { locale: ko })}
                    </p>
                  )}
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => deleteMutation.mutate(item.id)}
                    data-testid={`button-homework-delete-${item.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            );
          })
        )}

        {canEdit && (
          <div className="mt-3 flex flex-col gap-2 rounded-md border border-dashed p-3 sm:flex-row">
            <Input
              placeholder="새 숙제 (예: 매일 아침 5분 앉아 훈련)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              maxLength={200}
              data-testid="input-homework-label"
            />
            <Input
              type="date"
              value={newDue}
              onChange={(e) => setNewDue(e.target.value)}
              className="sm:w-44"
              data-testid="input-homework-duedate"
            />
            <Button
              type="button"
              onClick={() => addMutation.mutate()}
              disabled={!newLabel.trim() || addMutation.isPending}
              data-testid="button-homework-add"
            >
              <Plus className="mr-1 h-4 w-4" />
              추가
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default JournalHomeworkChecklist;
