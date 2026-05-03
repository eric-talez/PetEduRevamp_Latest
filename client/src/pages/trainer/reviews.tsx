import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Star,
  Search,
  Filter,
  MessageSquare,
  ThumbsUp,
  RefreshCw,
  Reply,
  Flag,
} from 'lucide-react';
import { format } from 'date-fns';

interface TrainerReview {
  id: number;
  trainerId: number;
  authorId: number;
  authorName?: string;
  rating: number;
  title?: string | null;
  content: string;
  photos?: string[];
  status: string;
  reportCount: number;
  createdAt: string;
  reply?: { id: number; content: string; createdAt: string } | null;
}

export default function TrainerReviews() {
  const { toast } = useToast();
  const meQuery = useQuery<{ id: number; role?: string } | null>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.user || data || null;
    },
    staleTime: 60_000,
  });
  const trainerId: number | undefined = meQuery.data?.id;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});

  const reviewsQuery = useQuery<{ success: boolean; reviews: TrainerReview[] }>({
    queryKey: ['/api/trainer-reviews', { trainerId: trainerId ?? 'self' }],
    queryFn: async () => {
      const url = trainerId ? `/api/trainer-reviews?trainerId=${trainerId}` : '/api/trainer-reviews';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      return res.json();
    },
  });

  const summaryQuery = useQuery<{ success: boolean; count: number; average: number; distribution: Record<string, number> }>({
    queryKey: ['/api/trainer-reviews/summary', trainerId],
    enabled: !!trainerId,
    queryFn: async () => {
      const res = await fetch(`/api/trainer-reviews/summary/${trainerId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      return res.json();
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ reviewId, content }: { reviewId: number; content: string }) => {
      const res = await apiRequest('POST', `/api/trainer-reviews/${reviewId}/reply`, { content });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || '답글 작성 실패');
      return data;
    },
    onSuccess: () => {
      toast({ title: '답글이 등록되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['/api/trainer-reviews'] });
    },
    onError: (e: unknown) =>
      toast({
        title: '오류',
        description: e instanceof Error ? e.message : '오류가 발생했습니다.',
        variant: 'destructive',
      }),
  });

  const reviews = reviewsQuery.data?.reviews || [];

  const filteredReviews = useMemo(() => {
    let result = reviews.slice();
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          (r.title || '').toLowerCase().includes(q) ||
          r.content.toLowerCase().includes(q) ||
          (r.authorName || '').toLowerCase().includes(q),
      );
    }
    if (selectedRating !== 'all') {
      result = result.filter((r) => r.rating === parseInt(selectedRating, 10));
    }
    return result;
  }, [reviews, searchQuery, selectedRating]);

  const stats = summaryQuery.data;
  const averageRating = stats?.average?.toFixed(1) ?? '0.0';
  const totalReviews = stats?.count ?? reviews.length;
  const repliedCount = reviews.filter((r) => r.reply).length;

  const renderStars = (rating: number) => (
    <div className="flex items-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? 'text-warning fill-current' : 'text-gray-300'}`}
        />
      ))}
      <span className="ml-1 text-sm text-muted-foreground">({rating})</span>
    </div>
  );

  if (reviewsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-2">
          <Star className="h-8 w-8 animate-pulse text-primary" />
          <p className="text-sm text-muted-foreground">리뷰 정보 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-trainer-reviews">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">리뷰 관리</h1>
          <p className="text-muted-foreground">수강생들의 소중한 피드백을 확인하고 답변을 남겨보세요</p>
        </div>
        <Button onClick={() => reviewsQuery.refetch()} variant="outline" size="sm" data-testid="button-refresh-reviews">
          <RefreshCw className="h-4 w-4 mr-2" /> 새로고침
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center">
            <Star className="h-8 w-8 text-warning" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">평균 평점</p>
              <p className="text-2xl font-bold" data-testid="stat-average">{averageRating}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center">
            <MessageSquare className="h-8 w-8 text-primary" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">총 리뷰</p>
              <p className="text-2xl font-bold" data-testid="stat-total">{totalReviews}개</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center">
            <Reply className="h-8 w-8 text-success" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">답변 완료</p>
              <p className="text-2xl font-bold">{repliedCount}개</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center">
            <ThumbsUp className="h-8 w-8 text-primary" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">최근 평점 분포</p>
              <p className="text-xs">
                {[5, 4, 3, 2, 1].map((s) => `${s}★ ${stats?.distribution?.[s] ?? 0}`).join(' · ')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="리뷰 내용/작성자 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={selectedRating}
            onChange={(e) => setSelectedRating(e.target.value)}
            className="px-3 py-2 border border-input bg-background rounded-md text-sm"
          >
            <option value="all">모든 평점</option>
            {[5, 4, 3, 2, 1].map((s) => (
              <option key={s} value={String(s)}>{'★'.repeat(s)} ({s}점)</option>
            ))}
          </select>
        </div>
      </div>

      {filteredReviews.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">아직 등록된 리뷰가 없습니다</h3>
          <p className="text-muted-foreground">수업이 완료되면 보호자가 리뷰를 남길 수 있어요.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredReviews.map((review) => (
            <Card key={review.id} data-testid={`review-card-${review.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{(review.authorName || '보')[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{review.authorName || '보호자'}</span>
                        {renderStars(review.rating)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(review.createdAt), 'yyyy.MM.dd')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    {review.reply ? (
                      <Badge className="bg-success/10 text-success border-success/30">답변 완료</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">답변 대기</Badge>
                    )}
                    {review.reportCount > 0 && (
                      <div className="flex items-center text-xs text-primary justify-end">
                        <Flag className="h-3 w-3 mr-1" /> 신고 {review.reportCount}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {review.title && <h3 className="font-semibold">{review.title}</h3>}
                <p className="text-sm leading-relaxed text-muted-foreground">{review.content}</p>
                {review.photos && review.photos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {review.photos.map((src, i) => (
                      <a
                        key={i}
                        href={src}
                        target="_blank"
                        rel="noreferrer"
                        data-testid={`trainer-review-photo-${review.id}-${i}`}
                      >
                        <img
                          src={src}
                          alt={`리뷰 사진 ${i + 1}`}
                          loading="lazy"
                          className="h-20 w-20 object-cover rounded border"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </a>
                    ))}
                  </div>
                )}

                {review.reply ? (
                  <div className="bg-primary/10 p-4 rounded-lg border-l-4 border-primary/50">
                    <div className="flex items-center space-x-2 mb-2">
                      <Reply className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-primary">트레이너 답변</span>
                      <span className="text-xs text-primary">
                        {format(new Date(review.reply.createdAt), 'yyyy.MM.dd')}
                      </span>
                    </div>
                    <p className="text-sm text-primary">{review.reply.content}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="답변을 작성하세요 (1회만 가능)"
                      value={replyDrafts[review.id] || ''}
                      onChange={(e) => setReplyDrafts((d) => ({ ...d, [review.id]: e.target.value }))}
                      data-testid={`textarea-reply-${review.id}`}
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        disabled={replyMutation.isPending || !(replyDrafts[review.id] || '').trim()}
                        onClick={() =>
                          replyMutation.mutate({ reviewId: review.id, content: replyDrafts[review.id] })
                        }
                        data-testid={`button-submit-reply-${review.id}`}
                      >
                        <Reply className="h-4 w-4 mr-2" /> 답변 등록
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
