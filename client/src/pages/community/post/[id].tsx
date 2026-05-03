import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ArrowLeft, MessageSquare, Heart, Share2, MoreVertical, Edit, Trash2, Loader2 } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { queryClient } from '@/lib/queryClient';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// 댓글 작성 폼 유효성 검사 스키마
const commentFormSchema = z.object({
  content: z.string()
    .min(2, { message: '댓글은 최소 2글자 이상이어야 합니다.' })
    .max(500, { message: '댓글은 최대 500글자까지 가능합니다.' }),
});

type CommentFormValues = z.infer<typeof commentFormSchema>;

const CommentItem = ({ comment, currentUserId, onDelete, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const formatDate = (date: string | Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ko });
  };

  const handleEdit = async () => {
    if (editedContent.trim().length < 2) return;
    
    setIsSubmitting(true);
    try {
      await onEdit(comment.id, editedContent);
      setIsEditing(false);
    } catch (error) {
      console.error('댓글 수정 오류:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAuthor = currentUserId === comment.author.id;

  return (
    <div className="py-4 border-b last:border-0">
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
          <AvatarFallback>{comment.author.name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-medium text-sm">{comment.author.name}</div>
              <div className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</div>
            </div>
            {isAuthor && !isEditing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    수정
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(comment.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          {isEditing ? (
            <div className="mt-2">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[80px] text-sm"
              />
              <div className="flex justify-end mt-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsEditing(false)}
                >
                  취소
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleEdit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    '저장'
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm whitespace-pre-wrap">{comment.content}</div>
          )}
          
          <div className="mt-2 flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
              <Heart className="mr-1 h-3.5 w-3.5" />
              좋아요
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
              <MessageSquare className="mr-1 h-3.5 w-3.5" />
              답글 달기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PostDetailSkeleton = () => (
  <div className="space-y-8">
    <div className="space-y-4">
      <Skeleton className="h-10 w-3/4" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-4 w-1/4" />
    </div>
    <div className="space-y-4">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
    <div className="pt-4">
      <Skeleton className="h-10 w-full" />
    </div>
    <div className="space-y-4">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  </div>
);

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const postId = parseInt(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  
  // 게시글 조회 - 테스트 API 사용
  const { 
    data: post, 
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: [`/api/community/posts/${postId}`],
    queryFn: async () => {
      const response = await fetch(`/api/community/posts/${postId}`);
      if (!response.ok) {
        throw new Error('게시글을 불러오는데 실패했습니다.');
      }
      return await response.json();
    }
  });

  // 댓글 작성 폼
  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: {
      content: '',
    },
  });

  // 댓글 작성 뮤테이션
  const createCommentMutation = useMutation({
    mutationFn: async (data: CommentFormValues) => {
      const response = await fetch(`/api/social/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '댓글 작성에 실패했습니다.');
      }

      return await response.json();
    },
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: [`/api/social/posts/${postId}`] });
      toast({
        title: '댓글이 작성되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '댓글 작성 실패',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // 댓글 수정 뮤테이션
  const editCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: number, content: string }) => {
      const response = await fetch(`/api/social/comments/${commentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '댓글 수정에 실패했습니다.');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/social/posts/${postId}`] });
      toast({
        title: '댓글이 수정되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '댓글 수정 실패',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // 댓글 삭제 뮤테이션
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      const response = await fetch(`/api/social/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '댓글 삭제에 실패했습니다.');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/social/posts/${postId}`] });
      toast({
        title: '댓글이 삭제되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '댓글 삭제 실패',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // 게시글 삭제 뮤테이션
  const deletePostMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/social/posts/${postId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '게시글 삭제에 실패했습니다.');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/posts'] });
      toast({
        title: '게시글이 삭제되었습니다.',
      });
      setLocation('/community');
    },
    onError: (error: Error) => {
      toast({
        title: '게시글 삭제 실패',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // 댓글 작성 제출 핸들러
  const onSubmit = (data: CommentFormValues) => {
    if (!user) {
      toast({
        title: '로그인이 필요합니다',
        description: '댓글을 작성하려면 먼저 로그인해주세요.',
        variant: 'destructive'
      });
      return;
    }
    createCommentMutation.mutate(data);
  };

  // 댓글 수정 핸들러
  const handleCommentEdit = (commentId: number, content: string) => {
    return editCommentMutation.mutateAsync({ commentId, content });
  };

  // 댓글 삭제 핸들러
  const handleCommentDelete = (commentId: number) => {
    deleteCommentMutation.mutate(commentId);
  };

  // 게시글 삭제 핸들러
  const handlePostDelete = () => {
    setDeleteAlertOpen(false);
    deletePostMutation.mutate();
  };

  // 게시글 수정 페이지로 이동
  const handlePostEdit = () => {
    setLocation(`/community/edit/${postId}`);
  };

  // 날짜 포맷 함수
  const formatDate = (date: string | Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ko });
  };

  // 현재 사용자가 게시글 작성자인지 확인
  const isAuthor = user && post && user.id === post.author.id;

  if (isLoading || authLoading) {
    return (
      <div className="container py-6 max-w-4xl">
        <Button variant="ghost" onClick={() => setLocation('/community')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          커뮤니티로 돌아가기
        </Button>
        
        <PostDetailSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container py-6 max-w-4xl">
        <Button variant="ghost" onClick={() => setLocation('/community')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          커뮤니티로 돌아가기
        </Button>
        
        <div className="text-center py-12">
          <p className="text-destructive mb-2">오류가 발생했습니다</p>
          <p className="text-muted-foreground mb-4">{error instanceof Error ? error.message : '게시글을 불러오는데 실패했습니다.'}</p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: [`/api/social/posts/${postId}`] })}>
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-4xl">
      <Button variant="ghost" onClick={() => setLocation('/community')} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        커뮤니티로 돌아가기
      </Button>
      
      <article className="space-y-6">
        {/* 게시글 헤더 */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={post.author.avatar} alt={post.author.name} />
                <AvatarFallback>{post.author.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{post.author.name}</div>
                <div className="text-sm text-muted-foreground">{formatDate(post.createdAt)}</div>
              </div>
            </div>
            {post.tag && (
              <Badge variant="secondary" className="mt-1">
                {post.tag}
              </Badge>
            )}
          </div>
          
          {isAuthor && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handlePostEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  수정
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDeleteAlertOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        <Separator />
        
        {/* 게시글 본문 */}
        <div className="prose prose-sm sm:prose lg:prose-lg max-w-none dark:prose-invert">
          {post.image && (
            <div className="mb-6">
              <img
                src={post.image}
                alt="게시글 이미지"
                className="rounded-md max-h-[500px] object-contain mx-auto"
              />
            </div>
          )}
          <div className="whitespace-pre-wrap">{post.content}</div>
        </div>
        
        {/* 게시글 액션 버튼 */}
        <div className="flex items-center gap-2 pt-4">
          <Button variant="outline" className="gap-1">
            <Heart className="h-4 w-4" />
            좋아요 ({post.likes || 0})
          </Button>
          <Button variant="outline" className="gap-1">
            <MessageSquare className="h-4 w-4" />
            댓글 ({post.comments ? post.comments.length : 0})
          </Button>
          <Button variant="outline" className="gap-1">
            <Share2 className="h-4 w-4" />
            공유
          </Button>
        </div>
        
        <Separator className="my-8" />
        
        {/* 댓글 목록 */}
        <div>
          <h2 className="text-xl font-bold mb-4">
            댓글 {post.comments ? post.comments.length : 0}개
          </h2>
          
          {/* 댓글 작성 폼 */}
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <h3 className="text-md font-medium">댓글 작성</h3>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="댓글을 작성해주세요."
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={createCommentMutation.isPending}
                    >
                      {createCommentMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          댓글 작성 중...
                        </>
                      ) : (
                        '댓글 작성'
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          {/* 댓글 목록 */}
          <Card>
            <CardContent className="p-6">
              {post.comments && post.comments.length > 0 ? (
                <div className="divide-y">
                  {post.comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      currentUserId={user?.id}
                      onDelete={handleCommentDelete}
                      onEdit={handleCommentEdit}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  첫 번째 댓글을 작성해보세요!
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-muted/50 px-6 py-4">
              <div className="text-xs text-muted-foreground">
                건전한 댓글 문화를 위해 타인에 대한 배려와 존중을 담아 의견을 나눠주세요.
              </div>
            </CardFooter>
          </Card>
        </div>
      </article>
      
      {/* 게시글 삭제 확인 대화상자 */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>게시글 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 게시글을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePostDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deletePostMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  삭제 중...
                </>
              ) : (
                '삭제'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}