import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, ChevronRight, FileText, AlertCircle, ListChecks } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface NotebookEntry {
  id: number;
  title: string;
  content: string;
  trainerId: number;
  petOwnerId: number;
  petId: number;
  trainingDate: string;
  trainingType?: string | null;
  isRead: boolean;
  status: string;
  createdAt: string;
}

interface NotebookListResponse {
  success: boolean;
  data: NotebookEntry[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export function NotebookHomeCard() {
  const { data, isLoading, isError, refetch } = useQuery<NotebookListResponse>({
    queryKey: ['/api/notebook/entries?page=1&limit=10&sortBy=createdAt&sortOrder=desc'],
  });

  const entries = data?.data ?? [];
  const unreadCount = entries.filter((e) => !e.isRead).length;

  const { data: overdueData } = useQuery<{ success: boolean; overdue: number }>({
    queryKey: ['/api/notebook/homework/overdue-count'],
    queryFn: async () => {
      const res = await fetch('/api/notebook/homework/overdue-count', { credentials: 'include' });
      if (!res.ok) return { success: true, overdue: 0 };
      return res.json();
    },
    refetchInterval: 60000,
  });
  const overdueCount = overdueData?.overdue || 0;

  return (
    <Card className="w-full" data-testid="card-notebook-home">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5 text-primary" />
          알림장
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-1" data-testid="badge-notebook-unread">
              미확인 {unreadCount}
            </Badge>
          )}
          {overdueCount > 0 && (
            <Badge variant="destructive" className="ml-1" data-testid="badge-notebook-overdue-homework">
              <ListChecks className="h-3 w-3 mr-1" />
              지연 숙제 {overdueCount}
            </Badge>
          )}
        </CardTitle>
        <Link href="/notebook">
          <Button variant="ghost" size="sm" data-testid="button-notebook-viewall">
            전체보기
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <AlertCircle className="mb-2 h-8 w-8 text-destructive opacity-70" />
            <p className="text-sm">알림장을 불러오지 못했습니다.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => refetch()}
              data-testid="button-notebook-retry"
            >
              다시 시도
            </Button>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <FileText className="mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">아직 받은 알림장이 없습니다.</p>
          </div>
        ) : (
          entries.slice(0, 3).map((entry) => (
            <Link key={entry.id} href={`/notebook?entryId=${entry.id}`}>
              <div
                className="flex cursor-pointer items-start justify-between gap-3 rounded-md border p-3 transition-colors hover:bg-accent"
                data-testid={`item-notebook-${entry.id}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="truncate text-sm font-semibold">{entry.title}</h4>
                    {!entry.isRead && (
                      <Badge variant="destructive" className="h-4 shrink-0 px-1.5 text-[10px]">
                        NEW
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{entry.content}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {format(new Date(entry.trainingDate || entry.createdAt), 'yyyy년 M월 d일 (E)', { locale: ko })}
                  </p>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default NotebookHomeCard;
