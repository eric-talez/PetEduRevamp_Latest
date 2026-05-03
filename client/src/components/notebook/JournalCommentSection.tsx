import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { secureRequest } from '@/lib/csrf';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const REACTION_EMOJIS = ['👍', '❤️', '🎉', '😍', '👏', '🐶'];

interface JournalComment {
  id: number;
  journalId: number;
  authorId: number;
  authorName: string;
  authorRole: string | null;
  authorAvatar: string | null;
  content: string;
  parentCommentId: number | null;
  createdAt: string;
  canDelete: boolean;
}

interface ReactionMap {
  [emoji: string]: { count: number; mine: boolean };
}

interface CommentsResponse {
  success: boolean;
  comments: JournalComment[];
  reactions: ReactionMap;
  total: number;
}

interface Props {
  journalId: number;
  canComment?: boolean;
}

export function JournalCommentSection({ journalId, canComment = true }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [draft, setDraft] = useState('');

  const queryKey = ['/api/notebook/entries', journalId, 'comments'];

  const { data, isLoading } = useQuery<CommentsResponse>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/notebook/entries/${journalId}/comments`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('댓글 조회 실패');
      return res.json();
    },
    enabled: Number.isFinite(journalId),
  });

  const applyResponse = (json: any) => {
    if (json && json.success) {
      queryClient.setQueryData<CommentsResponse>(queryKey, {
        success: true,
        comments: json.comments || [],
        reactions: json.reactions || {},
        total: json.total ?? (json.comments?.length || 0),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/notebook/comments/counts'] });
    }
  };

  const createMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await secureRequest(`/api/notebook/entries/${journalId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || '댓글 작성 실패');
      }
      return json;
    },
    onSuccess: (json) => {
      setDraft('');
      applyResponse(json);
    },
    onError: (err: any) => {
      toast({ title: '댓글 작성 실패', description: err?.message || '오류가 발생했습니다.', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: number) => {
      const res = await secureRequest(`/api/notebook/comments/${commentId}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || '댓글 삭제 실패');
      }
      return json;
    },
    onSuccess: (json) => applyResponse(json),
    onError: (err: any) => {
      toast({ title: '댓글 삭제 실패', description: err?.message || '오류가 발생했습니다.', variant: 'destructive' });
    },
  });

  const reactionMutation = useMutation({
    mutationFn: async (emoji: string) => {
      const res = await secureRequest(`/api/notebook/entries/${journalId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || '반응 처리 실패');
      }
      return json;
    },
    onSuccess: (json) => applyResponse(json),
    onError: (err: any) => {
      toast({ title: '반응 처리 실패', description: err?.message || '오류가 발생했습니다.', variant: 'destructive' });
    },
  });

  const handleSubmit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed);
  };

  const reactions = data?.reactions || {};
  const comments = data?.comments || [];

  const formatTime = (iso: string) => {
    try {
      return format(new Date(iso), 'M월 d일 HH:mm', { locale: ko });
    } catch {
      return iso;
    }
  };

  return (
    <div className="border-t pt-6 mt-2 space-y-4" data-testid="journal-comment-section">
      {/* 이모지 반응 바 */}
      <div>
        <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
          반응 남기기
        </h4>
        <div className="flex flex-wrap gap-2">
          {REACTION_EMOJIS.map((emoji) => {
            const r = reactions[emoji] || { count: 0, mine: false };
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => reactionMutation.mutate(emoji)}
                disabled={reactionMutation.isPending}
                data-testid={`reaction-${emoji}`}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm transition ${
                  r.mine
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary/40 hover:bg-primary/5'
                } disabled:opacity-50`}
              >
                <span className="text-lg leading-none">{emoji}</span>
                {r.count > 0 && <span className="font-medium tabular-nums">{r.count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 댓글 목록 */}
      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
          <MessageSquare className="h-4 w-4" />
          댓글 {comments.length > 0 && <Badge variant="secondary">{comments.length}</Badge>}
        </h4>

        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> 불러오는 중...
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            아직 댓글이 없습니다. 첫 댓글을 남겨보세요.
          </p>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => (
              <div
                key={c.id}
                className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                data-testid={`comment-${c.id}`}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  {c.authorAvatar ? <AvatarImage src={c.authorAvatar} alt={c.authorName} /> : null}
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {c.authorName.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{c.authorName}</span>
                    {c.authorRole === 'trainer' && (
                      <Badge variant="outline" className="text-[10px] py-0">훈련사</Badge>
                    )}
                    {c.authorRole === 'pet-owner' && (
                      <Badge variant="outline" className="text-[10px] py-0">보호자</Badge>
                    )}
                    <span className="text-xs text-gray-400">{formatTime(c.createdAt)}</span>
                    {c.canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1 ml-auto text-gray-400 hover:text-destructive"
                        onClick={() => {
                          if (window.confirm('이 댓글을 삭제하시겠습니까?')) {
                            deleteMutation.mutate(c.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        data-testid={`comment-delete-${c.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-200 mt-1 whitespace-pre-wrap break-words">
                    {c.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 댓글 입력 */}
      {canComment ? (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="댓글을 입력하세요..."
            rows={2}
            maxLength={2000}
            disabled={createMutation.isPending}
            data-testid="comment-input"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              ⌘/Ctrl + Enter 로 빠르게 전송 ({draft.length}/2000)
            </span>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!draft.trim() || createMutation.isPending}
              data-testid="comment-submit"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              댓글 등록
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-3">
          댓글을 작성하려면 로그인이 필요합니다.
        </p>
      )}
    </div>
  );
}
