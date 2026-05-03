import { useState } from 'react';
import { useAuth } from '@/lib/auth-compat';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Search,
  Trash2,
  Eye,
  ExternalLink,
  Calendar,
  User,
  MessageSquare,
  Heart,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface CommunityPost {
  id: number;
  title: string;
  content: string;
  tag: string;
  category: string;
  authorId: number;
  author: {
    id: number;
    name: string;
  };
  likes: number;
  comments: number;
  views: number;
  createdAt: string;
  updatedAt: string;
  hidden: boolean;
  linkInfo?: {
    url: string;
    title: string;
    description: string;
    image?: string;
  };
}

export default function AdminCommunityManagement() {
  const { userName } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [postToDelete, setPostToDelete] = useState<CommunityPost | null>(null);
  const [showPostDetail, setShowPostDetail] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);

  // 커뮤니티 게시글 데이터 조회
  const { data: communityData = { posts: [], total: 0 }, isLoading: communityPostsLoading, refetch: refetchCommunityPosts } = useQuery({
    queryKey: ['/api/community/posts', currentPage, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchQuery && { searchQuery: searchQuery })
      });
      const response = await fetch(`/api/community/posts?${params}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('커뮤니티 게시글을 불러오는데 실패했습니다');
      }
      return response.json();
    }
  });

  // 커뮤니티 게시글 삭제 mutation
  const deletePostMutation = useMutation({
    mutationFn: async (postId: number) => {
      const response = await fetch(`/api/admin/community/posts/${postId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('게시글 삭제에 실패했습니다');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: '삭제 완료', 
        description: `게시글 "${data.deletedPost.title}"이 성공적으로 삭제되었습니다.` 
      });
      setShowDeleteConfirm(false);
      setPostToDelete(null);
      refetchCommunityPosts();
    },
    onError: (error: Error) => {
      toast({
        title: '삭제 실패',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // 삭제 확인 다이얼로그 열기
  const handleDeleteClick = (post: CommunityPost) => {
    setPostToDelete(post);
    setShowDeleteConfirm(true);
  };

  // 게시글 상세보기
  const handleViewPost = (post: CommunityPost) => {
    setSelectedPost(post);
    setShowPostDetail(true);
  };

  // 페이지 변경
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // 태그 색상 결정
  const getTagColor = (tag: string) => {
    const colors = {
      '법률정보': 'bg-red-100 text-red-800',
      '여행정보': 'bg-blue-100 text-blue-800',
      '의료정보': 'bg-green-100 text-green-800',
      '생활정보': 'bg-primary/10 text-primary',
      '건강관리': 'bg-orange-100 text-orange-800',
      '훈련정보': 'bg-yellow-100 text-yellow-800',
      '사회화': 'bg-secondary/15 text-primary',
      '안전관리': 'bg-indigo-100 text-indigo-800',
      '시니어케어': 'bg-gray-100 text-gray-800',
      '고양이케어': 'bg-secondary/15 text-secondary-foreground',
      '동물보호': 'bg-secondary/15 text-secondary-foreground',
    };
    return colors[tag as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const totalPages = Math.ceil(communityData.total / 10);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">커뮤니티 관리</h1>
        <div className="flex items-center space-x-2">
          <Button onClick={() => refetchCommunityPosts()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>커뮤니티 게시글 관리</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="제목, 내용, 작성자 검색..."
                  className="pl-8 h-9 md:w-[300px] w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">ID</TableHead>
                <TableHead>제목</TableHead>
                <TableHead>태그</TableHead>
                <TableHead>작성자</TableHead>
                <TableHead className="text-center">조회수</TableHead>
                <TableHead className="text-center">좋아요</TableHead>
                <TableHead className="text-center">댓글</TableHead>
                <TableHead>작성일</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {communityPostsLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10">
                    <div className="flex justify-center">
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      게시글 데이터 로딩 중...
                    </div>
                  </TableCell>
                </TableRow>
              ) : communityData.posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10">
                    <div className="text-muted-foreground">
                      {searchQuery 
                        ? '검색 조건에 맞는 게시글이 없습니다.' 
                        : '게시글이 없습니다.'}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                communityData.posts.map((post: CommunityPost) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium">{post.id}</TableCell>
                    <TableCell>
                      <div className="max-w-[300px]">
                        <div className="font-medium truncate">{post.title}</div>
                        <div className="text-xs text-muted-foreground truncate mt-1">
                          {post.content.substring(0, 50)}...
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getTagColor(post.tag)} text-xs`}>
                        {post.tag}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-1 text-muted-foreground" />
                        {post.author.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{post.views.toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        <Heart className="w-4 h-4 mr-1 text-red-500" />
                        {post.likes}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 mr-1 text-blue-500" />
                        {post.comments}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewPost(post)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {post.linkInfo && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(post.linkInfo!.url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClick(post)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300 transition-all duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                이전
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                다음
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
              게시글 삭제 확인
            </AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 게시글을 삭제하시겠습니까?
              <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                <strong>제목:</strong> {postToDelete?.title}
              </div>
              <div className="mt-2 text-red-600 text-sm">
                ⚠️ 이 작업은 되돌릴 수 없습니다.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => postToDelete && deletePostMutation.mutate(postToDelete.id)}
              disabled={deletePostMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletePostMutation.isPending ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 게시글 상세보기 다이얼로그 */}
      <Dialog open={showPostDetail} onOpenChange={setShowPostDetail}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPost?.title}</DialogTitle>
            <DialogDescription>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-2">
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  {selectedPost?.author.name}
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {selectedPost && new Date(selectedPost.createdAt).toLocaleDateString('ko-KR')}
                </div>
                <Badge className={`${selectedPost && getTagColor(selectedPost.tag)} text-xs`}>
                  {selectedPost?.tag}
                </Badge>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPost?.linkInfo && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">링크 정보</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-3">
                    {selectedPost.linkInfo.image && (
                      <img
                        src={selectedPost.linkInfo.image}
                        alt={selectedPost.linkInfo.title}
                        className="w-16 h-16 rounded object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-sm">{selectedPost.linkInfo.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {selectedPost.linkInfo.description}
                      </div>
                      <a
                        href={selectedPost.linkInfo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 text-xs mt-1 inline-flex items-center"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        원본 보기
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-sm">{selectedPost?.content}</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPostDetail(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}