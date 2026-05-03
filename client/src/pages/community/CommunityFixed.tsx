import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink, useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Heart, Eye, Clock, Tag, Plus, ArrowLeft, MoreVertical, Edit, Trash2, X, Search, Grid, List, Link, ExternalLink, Users, UserCheck, MapPin, TrendingUp, BarChart3, Download, RefreshCw, Play, PlayCircle, Map } from 'lucide-react';
import { GoogleMapView } from '@/components/GoogleMapView';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-compat';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ObjectUploader } from '@/components/ui/ObjectUploader';

// 게시글 카드 컴포넌트
const PostCard = ({ post, onClick }: { post: any; onClick: (post: any) => void }) => {
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ko });
    } catch {
      return post.user?.time || '방금 전';
    }
  };

  return (
    <Card className="h-full cursor-pointer hover:shadow-md transition-shadow" onClick={() => onClick(post)}>
      {/* 영상 썸네일 영역 */}
      {post.videoUrl ? (
        <div className="relative w-full h-48 overflow-hidden rounded-t-lg bg-black">
          {post.videoThumbnail ? (
            <img 
              src={post.videoThumbnail} 
              alt="영상 썸네일" 
              className="w-full h-full object-cover" 
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center">
              <PlayCircle className="h-16 w-16 text-white opacity-80" />
            </div>
          )}
          {/* 재생 버튼 오버레이 */}
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <div className="bg-white bg-opacity-90 rounded-full p-3">
              <Play className="h-8 w-8 text-gray-900 ml-1" />
            </div>
          </div>
          {/* 영상 시간 표시 */}
          {post.videoDuration > 0 && (
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
              {Math.floor(post.videoDuration / 60)}:{String(post.videoDuration % 60).padStart(2, '0')}
            </div>
          )}
          {/* 영상 배지 */}
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="bg-destructive text-white">
              영상
            </Badge>
          </div>
        </div>
      ) : post.linkInfo?.image ? (
        /* 일반 링크 썸네일 영역 */
        <div className="relative w-full h-48 overflow-hidden rounded-t-lg">
          <img 
            src={post.linkInfo.image} 
            alt={post.linkInfo.title || post.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      ) : (
        /* 썸네일이 없는 경우 기본 플레이스홀더 */
        <div className="relative w-full h-48 overflow-hidden rounded-t-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
          <div className="w-full h-full flex items-center justify-center">
            {post.tag === '설문' ? (
              <BarChart3 className="h-16 w-16 text-gray-400 dark:text-gray-500" />
            ) : post.tag === '법률정보' ? (
              <svg className="h-16 w-16 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            ) : (
              <MessageSquare className="h-16 w-16 text-gray-400 dark:text-gray-500" />
            )}
          </div>
          {post.tag && (
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="bg-white/90 dark:bg-gray-800/90">
                {post.tag}
              </Badge>
            </div>
          )}
        </div>
      )}
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-2">{post.title}</CardTitle>
          {post.tag && (
            <Badge variant="secondary" className="ml-2 shrink-0">
              {post.tag}
            </Badge>
          )}
        </div>
        <CardDescription className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <Avatar className="h-5 w-5">
              <AvatarImage src={post.author?.image} alt={post.author?.name} />
              <AvatarFallback>{post.author?.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <span>{post.author?.name || '익명 사용자'}</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatDate(post.createdAt)}</span>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-sm text-gray-600 line-clamp-3">{post.content}</p>
        
        {/* 설문 통계 정보 (설문 게시글인 경우) */}
        {post.tag === '설문' && (
          <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/30">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">설문 참여 현황</span>
            </div>
            
            {/* 전체 참여율 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <UserCheck className="h-3 w-3 text-success" />
                  <span>총 참여자</span>
                </div>
                <span className="font-medium text-success">{post.surveyStats?.totalParticipants || 0}명</span>
              </div>
              
              {/* 참여율 프로그레스 바 */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(100, (post.surveyStats?.totalParticipants || 0) / 100 * 100)}%` }}
                ></div>
              </div>
              
              {/* 성별/지역 분포 */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="text-xs">
                  <div className="flex items-center gap-1 mb-1">
                    <Users className="h-3 w-3 text-primary" />
                    <span>성별 분포</span>
                  </div>
                  <div className="text-gray-600">
                    남성 {post.surveyStats?.genderStats?.male || 0}% • 여성 {post.surveyStats?.genderStats?.female || 0}%
                  </div>
                </div>
                <div className="text-xs">
                  <div className="flex items-center gap-1 mb-1">
                    <MapPin className="h-3 w-3 text-primary" />
                    <span>지역 분포</span>
                  </div>
                  <div className="text-gray-600">
                    서울 {post.surveyStats?.regionStats?.seoul || 0}% • 기타 {post.surveyStats?.regionStats?.others || 0}%
                  </div>
                </div>
              </div>
              
              {/* 설문 종료일 */}
              {post.surveyEndDate && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-2 pt-2 border-t border-primary/30">
                  <Clock className="h-3 w-3" />
                  <span>종료: {new Date(post.surveyEndDate).toLocaleDateString('ko-KR')}</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* 링크 정보 미리보기 (썸네일이 없을 때만) */}
        {post.linkInfo && !post.linkInfo.image && post.tag !== '설문' && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h4 className="font-medium text-sm line-clamp-1">{post.linkInfo.title}</h4>
                <p className="text-xs text-gray-600 line-clamp-2 mt-1">{post.linkInfo.description}</p>
                <p className="text-xs text-primary mt-1 truncate">{post.linkInfo.url}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2 flex justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            <span>{post.likes || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            <span>{Array.isArray(post.comments) ? post.comments.length : (post.comments || 0)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            <span>{post.views || 0}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

// 로딩 스켈레톤
const PostCardSkeleton = () => (
  <Card className="h-full">
    <CardHeader className="pb-2">
      <Skeleton className="h-6 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2" />
    </CardHeader>
    <CardContent className="pb-2">
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3" />
    </CardContent>
    <CardFooter className="pt-2">
      <Skeleton className="h-4 w-1/3" />
    </CardFooter>
  </Card>
);

// 뉴스 아티클 타입
interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  image: string | null;
  source: string;
  publishedAt: string;
  category: string;
}

// 뉴스 카드 컴포넌트 (카드형/리스트형 지원)
const NewsCard = ({ article, viewType = 'card', onOpenDetail }: { article: NewsArticle; viewType?: 'card' | 'list'; onOpenDetail?: (article: NewsArticle) => void }) => {
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ko });
    } catch {
      return '최근';
    }
  };

  const handleClick = () => {
    if (onOpenDetail) {
      onOpenDetail(article);
    }
  };

  // 리스트형 뷰
  if (viewType === 'list') {
    return (
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow" 
        onClick={handleClick}
        data-testid={`news-list-${article.id}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* 썸네일 이미지 */}
            <div className="flex-shrink-0 w-24 h-24 overflow-hidden rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
              {article.image ? (
                <img 
                  src={article.image} 
                  alt={article.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ExternalLink className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-primary text-white text-xs">
                  뉴스
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  외부 링크
                </Badge>
                <span className="text-xs text-gray-500">
                  {article.source} • {formatDate(article.publishedAt)}
                </span>
              </div>
              <h3 className="font-semibold text-lg mb-2 line-clamp-1">{article.title}</h3>
              <p className="text-gray-600 text-sm line-clamp-2">{article.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 카드형 뷰 (기본)
  return (
    <Card 
      className="h-full cursor-pointer hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-primary/20" 
      onClick={handleClick}
      data-testid={`news-card-${article.id}`}
    >
      {/* 뉴스 이미지 영역 */}
      <div className="relative w-full h-48 overflow-hidden rounded-t-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
        {article.image ? (
          <img 
            src={article.image} 
            alt={article.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ExternalLink className="h-16 w-16 text-gray-400 dark:text-gray-500" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="bg-primary text-white">
            뉴스
          </Badge>
        </div>
        <div className="absolute top-2 right-2">
          <Badge variant="outline" className="bg-white/90 dark:bg-gray-800/90 text-xs">
            <ExternalLink className="h-3 w-3 mr-1" />
            외부 링크
          </Badge>
        </div>
      </div>
      
      <CardHeader className="pb-2">
        <CardTitle className="text-lg line-clamp-2">{article.title}</CardTitle>
        <CardDescription className="flex items-center gap-2 text-xs">
          <span className="text-primary font-medium">{article.source}</span>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatDate(article.publishedAt)}</span>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-sm text-gray-600 line-clamp-3">{article.description}</p>
      </CardContent>
    </Card>
  );
};

// 뉴스 섹션 스켈레톤
const NewsCardSkeleton = () => (
  <Card className="h-full">
    <div className="h-48 bg-gray-200 animate-pulse rounded-t-lg" />
    <CardHeader className="pb-2">
      <Skeleton className="h-6 w-full mb-2" />
      <Skeleton className="h-4 w-1/2" />
    </CardHeader>
    <CardContent className="pb-4">
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3" />
    </CardContent>
  </Card>
);

// 뉴스 탭 확인 함수 (최신글, 인기글에서도 뉴스 포함)
const isNewsTab = (tab: string) => ['latest', 'popular', 'training', 'survey', 'info', 'events'].includes(tab);

// 메인 커뮤니티 페이지 컴포넌트
function CommunityPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, userRole, userName, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  
  // 이벤트/행사 크롤링 mutation
  const crawlEventsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/community/crawl-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        let errorMessage = '크롤링에 실패했습니다.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // JSON 파싱 실패 시 상태 코드에 따른 메시지
          if (response.status === 401) {
            errorMessage = '로그인이 필요합니다.';
          } else if (response.status === 403) {
            errorMessage = '관리자 권한이 필요합니다.';
          } else if (response.status === 429) {
            errorMessage = '요청이 너무 빠릅니다. 잠시 후 다시 시도해주세요.';
          }
        }
        throw new Error(errorMessage);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "크롤링 완료",
        description: data.message || `${data.createdCount || data.events || 0}개의 이벤트/행사 정보가 수집되었습니다.`,
      });
      // 게시글 목록 새로고침 (이벤트 탭 전용)
      queryClient.invalidateQueries({ queryKey: ['/api/community/posts', 'events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/community/posts'] });
    },
    onError: (error) => {
      toast({
        title: "크롤링 실패",
        description: error.message || '이벤트/행사 크롤링 중 오류가 발생했습니다.',
        variant: "destructive",
      });
    }
  });
  
  // URL 파라미터에서 검색 쿼리 추출
  const urlParams = new URLSearchParams(window.location.search);
  const urlSearchQuery = urlParams.get('q') || '';
  
  const [activeTab, setActiveTab] = useState('latest');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [viewType, setViewType] = useState<'card' | 'list'>('card');
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [isPostDetailOpen, setIsPostDetailOpen] = useState(false);
  const [selectedNewsArticle, setSelectedNewsArticle] = useState<NewsArticle | null>(null);
  const [isNewsDetailOpen, setIsNewsDetailOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    category: "일반",
    tags: "",
    linkUrl: "",
    linkTitle: "",
    linkDescription: "",
    linkImage: "",
    // 훈련팁 전용 필드
    difficulty: "",
    duration: "",
    trainingType: "",
    // 영상 관련 필드
    videoUrl: "",
    videoThumbnail: "",
    videoDuration: 0,
    videoFileSize: 0,
    // 설문 전용 필드
    surveyType: "",
    surveyOptions: "",
    surveyEndDate: "",
    // 정보공유 전용 필드
    infoSource: "",
    infoCategory: "",
    // 공지사항 전용 필드
    noticeType: "",
    noticeEndDate: "",
    // 이벤트/행사 전용 필드
    eventDate: "",
    eventLocation: "",
    organizer: "",
    ticketPrice: "",
    eventWebsite: "",
    // 이벤트/행사 위치 정보 (지도 표시용)
    locationName: "",
    locationAddress: "",
    locationLatitude: "",
    locationLongitude: ""
  });
  const [showLinkSection, setShowLinkSection] = useState(false);
  const [isExtractingLink, setIsExtractingLink] = useState(false);
  const [eventsViewMode, setEventsViewMode] = useState<'list' | 'map'>('list');

  const itemsPerPage = 8;

  // URL 파라미터 변경 감지
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const newSearchQuery = urlParams.get('q') || '';
    if (newSearchQuery !== searchQuery) {
      setSearchQuery(newSearchQuery);
    }
  }, [window.location.search]);

  // 카테고리 목록
  const categories = ['일반', '훈련팁', '건강', '행동교정', '사회화', '질문', '후기'];

  // 게시글 목록 조회 (탭별 필터링)
  const { data: postsData = [], isLoading, error } = useQuery({
    queryKey: ['/api/community/posts', activeTab, searchQuery],
    queryFn: async () => {
      try {
        let url = '/api/community/posts';
        const params = new URLSearchParams();
        
        // 검색 쿼리 추가
        if (searchQuery) {
          params.append('q', searchQuery);
        }
        
        // 탭별 카테고리 필터링
        if (activeTab === 'training') {
          params.append('category', '훈련팁');
        } else if (activeTab === 'survey') {
          params.append('category', '설문');
        } else if (activeTab === 'info') {
          params.append('category', '정보공유');
        } else if (activeTab === 'notices') {
          params.append('category', '공지사항');
        } else if (activeTab === 'popular') {
          params.append('sort', 'popular');
        }
        
        if (params.toString()) {
          url += '?' + params.toString();
        }
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('게시글을 불러올 수 없습니다');
        }
        const data = await response.json();
        console.log(`API에서 받은 게시글 데이터 (${activeTab}):`, data);
        // API 응답의 posts 배열을 반환
        return Array.isArray(data.posts) ? data.posts : [];
      } catch (error) {
        console.error('게시글 조회 오류:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // 게시글 데이터 (API에서 이미 필터링됨)
  const filteredPosts = useMemo(() => {
    if (!postsData) return [];
    // API에서 이미 검색 필터링이 적용되어 있으므로 그대로 반환
    return postsData;
  }, [postsData]);

  // 뉴스 API 조회 (뉴스 탭일 때만)
  const { data: newsData, isLoading: newsLoading } = useQuery({
    queryKey: ['/api/news/search', activeTab],
    queryFn: async () => {
      try {
        // 최신글/인기글 탭에서는 다양한 카테고리의 뉴스를 가져옴
        const category = (activeTab === 'latest' || activeTab === 'popular') ? 'all' : activeTab;
        const response = await fetch(`/api/news/search?category=${category}`);
        if (!response.ok) {
          throw new Error('뉴스를 불러올 수 없습니다');
        }
        const data = await response.json();
        console.log(`뉴스 API 응답 (${activeTab}):`, data);
        return data;
      } catch (error) {
        console.error('뉴스 조회 오류:', error);
        return { articles: [], success: false };
      }
    },
    enabled: isNewsTab(activeTab),
    staleTime: 10 * 60 * 1000, // 10분간 캐시
  });

  // 뉴스 아티클 목록
  const newsArticles: NewsArticle[] = newsData?.articles || [];

  // 최신글/인기글 탭에서는 게시글과 뉴스를 통합하여 날짜순 정렬
  const combinedPosts = useMemo(() => {
    // 최신글이나 인기글 탭일 경우에만 뉴스를 게시글과 통합
    if ((activeTab === 'latest' || activeTab === 'popular') && newsArticles.length > 0) {
      // 뉴스를 게시글 형태로 변환
      const newsAsPosts = newsArticles.map((article, index) => ({
        id: `news-${article.url?.replace(/[^a-zA-Z0-9]/g, '-')}-${index}`,
        title: article.title,
        content: article.description,
        tag: '뉴스',
        category: '뉴스',
        isNews: true,
        newsData: article,
        author: { name: article.source || '뉴스', image: '' },
        createdAt: article.publishedAt,
        likes: 0,
        comments: 0,
        views: 0,
        linkInfo: {
          url: article.url,
          title: article.title,
          description: article.description,
          image: article.image
        }
      }));

      // 게시글과 뉴스를 합친 후 날짜순 정렬 (최신순)
      const combined = [...filteredPosts, ...newsAsPosts].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // 최신순
      });

      return combined;
    }
    return filteredPosts;
  }, [filteredPosts, newsArticles, activeTab]);

  // 페이지네이션 (통합된 게시글 기준)
  const totalPages = Math.ceil(combinedPosts.length / itemsPerPage);
  const paginatedPosts = combinedPosts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  console.log('페이지네이션 정보:', {
    totalPages,
    currentPage,
    itemsPerPage,
    filteredPostsLength: filteredPosts.length,
    paginatedPostsLength: paginatedPosts.length,
    activeTab
  });

  // 페이지 변경 시 탭 변경도 페이지 리셋
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 탭 변경 시 페이지 리셋
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  // 게시글 작성 뮤테이션
  const createPostMutation = useMutation({
    mutationFn: async (postData: typeof newPost) => {
      // 영상이 포함된 훈련팁 게시글인 경우 영상 API 사용
      const isVideoPost = activeTab === 'training' && postData.videoUrl;
      const apiUrl = isVideoPost ? '/api/community/posts/video' : '/api/community/posts';
      
      const requestBody = {
        title: postData.title,
        content: postData.content,
        category: activeTab === 'training' ? '훈련팁' : postData.category,
        ...(isVideoPost && {
          videoUrl: postData.videoUrl,
          videoThumbnail: postData.videoThumbnail,
          videoDuration: postData.videoDuration,
          videoFileSize: postData.videoFileSize
        })
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('게시글 작성에 실패했습니다.');
      }

      return response.json();
    },
    onSuccess: (newPostData) => {
      console.log('새 게시글 데이터:', newPostData);
      
      // 즉시 캐시 업데이트 - 새 게시글을 기존 목록 앞에 추가
      queryClient.setQueryData(['/api/community/posts', activeTab], (oldData: any) => {
        console.log('기존 캐시 데이터:', oldData);
        if (Array.isArray(oldData)) {
          const updatedData = [newPostData, ...oldData];
          console.log('업데이트된 캐시 데이터:', updatedData);
          return updatedData;
        }
        return [newPostData];
      });
      
      toast({
        title: "게시글 작성 완료",
        description: "새 게시글이 성공적으로 작성되었습니다.",
      });

      setNewPost({
        title: "",
        content: "",
        category: "일반",
        tags: "",
        linkUrl: "",
        linkTitle: "",
        linkDescription: "",
        linkImage: "",
        // 훈련팁 전용 필드
        difficulty: "",
        duration: "",
        trainingType: "",
        // 영상 관련 필드
        videoUrl: "",
        videoThumbnail: "",
        videoDuration: 0,
        videoFileSize: 0,
        // 설문 전용 필드
        surveyType: "",
        surveyOptions: "",
        surveyEndDate: "",
        // 정보공유 전용 필드
        infoSource: "",
        infoCategory: "",
        infoReliability: ""
      });
      setShowLinkSection(false);
      setIsCreatePostOpen(false);
      setCurrentPage(1);
    },
    onError: (error: Error) => {
      toast({
        title: "작성 실패",
        description: error.message || "게시글 작성에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // 게시글 상세 보기 (뉴스인 경우 뉴스 모달 열기)
  const handlePostClick = (post: any) => {
    if (post.isNews && post.newsData) {
      // 뉴스 게시글인 경우 뉴스 상세 모달 열기
      setSelectedNewsArticle(post.newsData);
      setIsNewsDetailOpen(true);
    } else {
      setSelectedPost(post);
      setIsPostDetailOpen(true);
    }
  };

  // 뉴스 상세 보기
  const handleNewsDetailOpen = (article: NewsArticle) => {
    setSelectedNewsArticle(article);
    setIsNewsDetailOpen(true);
  };

  // 게시글 작성 핸들러
  const handleSubmitPost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      toast({
        title: "작성 오류",
        description: "제목과 내용을 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    createPostMutation.mutate(newPost);
  };

  // 링크 URL 변경 핸들러
  const handleLinkUrlChange = async (url: string) => {
    setNewPost(prev => ({ ...prev, linkUrl: url }));
    
    if (url && url.startsWith('http')) {
      setIsExtractingLink(true);
      try {
        const response = await fetch('/api/community/extract-link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }),
        });

        if (response.ok) {
          const linkData = await response.json();
          setNewPost(prev => ({
            ...prev,
            linkTitle: linkData.title || '',
            linkDescription: linkData.description || '',
            linkImage: linkData.image || ''
          }));
        }
      } catch (error) {
        console.error('링크 정보 추출 오류:', error);
      } finally {
        setIsExtractingLink(false);
      }
    }
  };

  // 댓글 작성 핸들러
  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment = {
      id: Date.now(),
      content: newComment,
      author: {
        name: user?.username || '익명 사용자',
        image: user?.image || null
      },
      createdAt: new Date().toISOString(),
      replies: []
    };

    setComments(prev => [...prev, comment]);
    setNewComment('');
  };

  // 답글 작성 핸들러
  const handleAddReply = (commentId: number) => {
    if (!replyText.trim()) return;

    const reply = {
      id: Date.now(),
      content: replyText,
      author: {
        name: user?.username || '익명 사용자',
        image: user?.image || null
      },
      createdAt: new Date().toISOString()
    };

    setComments(prev => prev.map(comment => 
      comment.id === commentId 
        ? { ...comment, replies: [...(comment.replies || []), reply] }
        : comment
    ));
    setReplyText('');
    setReplyingTo(null);
  };

  // 탭별 글쓰기 다이얼로그 제목
  const getWriteDialogTitle = (tabValue: string) => {
    const titles = {
      'latest': '새 게시글 작성',
      'popular': '새 게시글 작성',
      'training': '훈련팁 공유하기',
      'survey': '설문조사 만들기',
      'info': '정보 공유하기',
      'events': '이벤트/행사 등록하기',
      'notices': '공지사항 작성'
    };
    return titles[tabValue as keyof typeof titles] || titles.latest;
  };

  // 탭별 글쓰기 다이얼로그 설명
  const getWriteDialogDescription = (tabValue: string) => {
    const descriptions = {
      'latest': '커뮤니티에 공유할 게시글을 작성해주세요.',
      'popular': '커뮤니티에 공유할 게시글을 작성해주세요.',
      'training': '반려동물 훈련 노하우와 팁을 체계적으로 공유해주세요.',
      'survey': '커뮤니티 구성원들의 의견을 수집하는 설문을 만들어주세요.',
      'info': '유용한 정보와 자료를 다른 회원들과 공유해주세요.',
      'events': '전국의 반려동물 관련 이벤트와 행사 정보를 등록해주세요.',
      'notices': '중요한 공지사항을 작성해주세요.'
    };
    return descriptions[tabValue as keyof typeof descriptions] || descriptions.latest;
  };

  // 탭별 제목 플레이스홀더
  const getTitlePlaceholder = (tabValue: string) => {
    const placeholders = {
      'latest': '게시글 제목을 입력하세요',
      'popular': '게시글 제목을 입력하세요',
      'training': '훈련 방법의 제목을 입력하세요 (예: 강아지 기본 앉아 훈련법)',
      'survey': '설문 제목을 입력하세요 (예: 반려동물 사료 선호도 조사)',
      'info': '정보 제목을 입력하세요 (예: 2024년 동물병원 진료비 안내)',
      'events': '이벤트/행사 제목을 입력하세요 (예: 서울 펫페어 2024)',
      'notices': '공지사항 제목을 입력하세요'
    };
    return placeholders[tabValue as keyof typeof placeholders] || placeholders.latest;
  };

  // 탭별 메시지 정의
  const getEmptyMessage = (tabValue: string) => {
    const messages = {
      'training': {
        title: '훈련팁이 없습니다',
        description: '펫 훈련 관련 팁과 노하우를 공유해주세요!'
      },
      'survey': {
        title: '설문조사가 없습니다',
        description: '커뮤니티 설문조사에 참여해보세요!'
      },
      'info': {
        title: '정보공유 게시글이 없습니다',
        description: '유용한 정보를 공유해주세요!'
      },
      'events': {
        title: '이벤트/행사가 없습니다',
        description: '전국의 반려동물 관련 이벤트와 행사 정보를 등록해주세요!'
      },
      'notices': {
        title: '공지사항이 없습니다',
        description: '공지사항을 확인해주세요!'
      },
      'popular': {
        title: '인기 게시글이 없습니다',
        description: '좋아요가 많은 게시글이 여기에 표시됩니다.'
      },
      'latest': {
        title: '게시글이 없습니다',
        description: '첫 번째 게시글을 작성해보세요!'
      }
    };
    return messages[tabValue as keyof typeof messages] || messages.latest;
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">커뮤니티</h1>
            <p className="text-gray-600 mt-1">반려동물 교육과 훈련 정보를 공유하는 공간입니다</p>
          </div>

          {/* 이벤트/행사 탭에서만 크롤링 버튼 표시 (관리자 전용) */}
          {activeTab === 'events' && isAuthenticated && (userRole === 'admin' || userRole === 'institute-admin') && (
            <Button 
              onClick={() => crawlEventsMutation.mutate()}
              disabled={crawlEventsMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-white mr-2"
              data-testid="button-crawl-events"
            >
              {crawlEventsMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {crawlEventsMutation.isPending ? '수집 중...' : '이벤트 수집'}
            </Button>
          )}

          {/* 게시글 작성 버튼 */}
          <Dialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen}>
            <DialogTrigger asChild>
              <Button className="bg-success hover:bg-success/90 text-white">
                <Plus className="h-4 w-4 mr-2" />
                글쓰기
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{getWriteDialogTitle(activeTab)}</DialogTitle>
                <DialogDescription>
                  {getWriteDialogDescription(activeTab)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* 제목 필드 - 탭별 플레이스홀더 */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">제목</Label>
                  <Input
                    id="title"
                    value={newPost.title}
                    onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                    placeholder={getTitlePlaceholder(activeTab)}
                    className="col-span-3"
                  />
                </div>
                
                {/* 훈련팁 전용 필드 */}
                {activeTab === 'training' && (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="difficulty" className="text-right">난이도</Label>
                      <Select value={newPost.difficulty || '초급'} onValueChange={(value) => setNewPost(prev => ({ ...prev, difficulty: value }))}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="초급">초급 (기본적인 훈련)</SelectItem>
                          <SelectItem value="중급">중급 (일정 경험 필요)</SelectItem>
                          <SelectItem value="고급">고급 (전문 지식 필요)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="duration" className="text-right">소요시간</Label>
                      <Input
                        id="duration"
                        value={newPost.duration || ''}
                        onChange={(e) => setNewPost(prev => ({ ...prev, duration: e.target.value }))}
                        placeholder="예: 10-15분"
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="trainingType" className="text-right">훈련유형</Label>
                      <Select value={newPost.trainingType || ''} onValueChange={(value) => setNewPost(prev => ({ ...prev, trainingType: value }))}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="훈련 유형을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="기본훈련">기본훈련 (앉아, 기다려, 오라)</SelectItem>
                          <SelectItem value="사회화">사회화 훈련</SelectItem>
                          <SelectItem value="행동교정">문제행동 교정</SelectItem>
                          <SelectItem value="놀이훈련">놀이를 통한 훈련</SelectItem>
                          <SelectItem value="화장실훈련">화장실 훈련</SelectItem>
                          <SelectItem value="산책훈련">산책 훈련</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* 영상 업로드 섹션 */}
                    <div className="col-span-4 space-y-3">
                      <Label className="text-sm font-medium">훈련 영상 업로드 (선택사항)</Label>
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <ObjectUploader
                          onUploadComplete={(videoUrl, metadata) => {
                            setNewPost(prev => ({
                              ...prev,
                              videoUrl,
                              videoThumbnail: metadata.thumbnail || '',
                              videoDuration: metadata.duration || 0,
                              videoFileSize: metadata.fileSize || 0
                            }));
                          }}
                          accept="video/*"
                          maxSizeInMB={100}
                          className="w-full"
                        />
                        {newPost.videoUrl && (
                          <div className="mt-3 p-3 bg-success/10 border border-success/30 rounded-lg">
                            <p className="text-sm text-success font-medium">
                              ✅ 영상이 성공적으로 업로드되었습니다!
                            </p>
                            {newPost.videoDuration > 0 && (
                              <p className="text-xs text-success mt-1">
                                재생시간: {Math.floor(newPost.videoDuration / 60)}분 {newPost.videoDuration % 60}초
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* 설문 전용 필드 */}
                {activeTab === 'survey' && (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="surveyType" className="text-right">설문유형</Label>
                      <Select value={newPost.surveyType || '객관식'} onValueChange={(value) => setNewPost(prev => ({ ...prev, surveyType: value }))}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="객관식">객관식 (선택지 제공)</SelectItem>
                          <SelectItem value="주관식">주관식 (자유 응답)</SelectItem>
                          <SelectItem value="복수선택">복수선택 (여러 개 선택 가능)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label htmlFor="surveyOptions" className="text-right pt-2">선택지</Label>
                      <Textarea
                        id="surveyOptions"
                        value={newPost.surveyOptions || ''}
                        onChange={(e) => setNewPost(prev => ({ ...prev, surveyOptions: e.target.value }))}
                        placeholder={`각 선택지를 한 줄씩 입력하세요\n예:\n찬성\n반대\n모르겠음`}
                        className="col-span-3 min-h-[100px]"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="surveyEndDate" className="text-right">종료일</Label>
                      <Input
                        id="surveyEndDate"
                        type="date"
                        value={newPost.surveyEndDate || ''}
                        onChange={(e) => setNewPost(prev => ({ ...prev, surveyEndDate: e.target.value }))}
                        className="col-span-3"
                      />
                    </div>
                  </>
                )}

                {/* 정보공유 전용 필드 */}
                {activeTab === 'info' && (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="infoSource" className="text-right">정보출처</Label>
                      <Input
                        id="infoSource"
                        value={newPost.infoSource || ''}
                        onChange={(e) => setNewPost(prev => ({ ...prev, infoSource: e.target.value }))}
                        placeholder="출처를 입력하세요 (예: 농림축산식품부)"
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="infoCategory" className="text-right">정보분야</Label>
                      <Select value={newPost.infoCategory || ''} onValueChange={(value) => setNewPost(prev => ({ ...prev, infoCategory: value }))}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="정보 분야를 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="건강정보">건강정보</SelectItem>
                          <SelectItem value="법률정보">법률정보</SelectItem>
                          <SelectItem value="정책뉴스">정책뉴스</SelectItem>
                          <SelectItem value="연구자료">연구자료</SelectItem>
                          <SelectItem value="제품정보">제품정보</SelectItem>
                          <SelectItem value="시설정보">시설정보</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* 공지사항 전용 필드 */}
                {activeTab === 'notices' && (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="noticeType" className="text-right">공지유형</Label>
                      <Select value={newPost.noticeType || '일반'} onValueChange={(value) => setNewPost(prev => ({ ...prev, noticeType: value }))}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="일반">일반 공지</SelectItem>
                          <SelectItem value="중요">중요 공지</SelectItem>
                          <SelectItem value="긴급">긴급 공지</SelectItem>
                          <SelectItem value="이벤트">이벤트 공지</SelectItem>
                          <SelectItem value="점검">시스템 점검</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="noticeEndDate" className="text-right">공지종료일</Label>
                      <Input
                        id="noticeEndDate"
                        type="date"
                        value={newPost.noticeEndDate || ''}
                        onChange={(e) => setNewPost(prev => ({ ...prev, noticeEndDate: e.target.value }))}
                        className="col-span-3"
                      />
                    </div>
                  </>
                )}
                {/* 이벤트/행사 탭 전용 필드들 */}
                {activeTab === 'events' && (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="eventDate" className="text-right">행사 일정</Label>
                      <Input
                        id="eventDate"
                        type="date"
                        value={newPost.eventDate || ''}
                        onChange={(e) => setNewPost(prev => ({ ...prev, eventDate: e.target.value }))}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="eventLocation" className="text-right">행사 장소</Label>
                      <Input
                        id="eventLocation"
                        value={newPost.eventLocation || ''}
                        onChange={(e) => setNewPost(prev => ({ ...prev, eventLocation: e.target.value }))}
                        placeholder="예: 서울시 강남구 삼성동 코엑스"
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="organizer" className="text-right">주최기관</Label>
                      <Input
                        id="organizer"
                        value={newPost.organizer || ''}
                        onChange={(e) => setNewPost(prev => ({ ...prev, organizer: e.target.value }))}
                        placeholder="예: 서울시청, 한국펫협회"
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="ticketPrice" className="text-right">참가비</Label>
                      <Input
                        id="ticketPrice"
                        value={newPost.ticketPrice || ''}
                        onChange={(e) => setNewPost(prev => ({ ...prev, ticketPrice: e.target.value }))}
                        placeholder="예: 무료, 10,000원, 성인 15,000원"
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="eventWebsite" className="text-right">홈페이지</Label>
                      <Input
                        id="eventWebsite"
                        value={newPost.eventWebsite || ''}
                        onChange={(e) => setNewPost(prev => ({ ...prev, eventWebsite: e.target.value }))}
                        placeholder="예: https://event.example.com"
                        className="col-span-3"
                      />
                    </div>
                    
                    {/* 위치 정보 섹션 (지도 표시용) */}
                    <div className="col-span-4 mt-4">
                      <div className="border rounded-lg p-4 bg-primary/10">
                        <div className="flex items-center gap-2 mb-3">
                          <MapPin className="h-5 w-5 text-primary" />
                          <h4 className="font-semibold text-primary">위치 정보 (지도 표시용)</h4>
                        </div>
                        <p className="text-sm text-primary mb-4">
                          위치 정보를 입력하면 지도에서 이벤트 위치를 확인할 수 있습니다.
                        </p>
                        
                        <div className="space-y-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="locationName" className="text-right">장소명</Label>
                            <Input
                              id="locationName"
                              value={newPost.locationName || ''}
                              onChange={(e) => setNewPost(prev => ({ ...prev, locationName: e.target.value }))}
                              placeholder="예: 코엑스 A홀"
                              className="col-span-3"
                              data-testid="input-location-name"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="locationAddress" className="text-right">주소</Label>
                            <Input
                              id="locationAddress"
                              value={newPost.locationAddress || ''}
                              onChange={(e) => setNewPost(prev => ({ ...prev, locationAddress: e.target.value }))}
                              placeholder="예: 서울시 강남구 영동대로 513"
                              className="col-span-3"
                              data-testid="input-location-address"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="locationLatitude" className="text-right">위도</Label>
                            <Input
                              id="locationLatitude"
                              type="number"
                              step="any"
                              value={newPost.locationLatitude || ''}
                              onChange={(e) => setNewPost(prev => ({ ...prev, locationLatitude: e.target.value }))}
                              placeholder="예: 37.5112"
                              className="col-span-3"
                              data-testid="input-location-lat"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="locationLongitude" className="text-right">경도</Label>
                            <Input
                              id="locationLongitude"
                              type="number"
                              step="any"
                              value={newPost.locationLongitude || ''}
                              onChange={(e) => setNewPost(prev => ({ ...prev, locationLongitude: e.target.value }))}
                              placeholder="예: 127.0590"
                              className="col-span-3"
                              data-testid="input-location-lng"
                            />
                          </div>
                          <p className="text-xs text-gray-500 ml-4">
                            💡 위도/경도는 선택사항입니다. Google Maps에서 위치를 검색하여 좌표를 확인할 수 있습니다.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="content" className="text-right pt-2">내용</Label>
                  <Textarea
                    id="content"
                    value={newPost.content}
                    onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                    placeholder={activeTab === 'events' ? 
                      "이벤트/행사의 상세 내용을 입력하세요. (프로그램, 참가 방법, 주의사항 등)" : 
                      "게시글 내용을 입력하세요"
                    }
                    className="col-span-3 min-h-[120px]"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">카테고리</Label>
                  <Select value={newPost.category} onValueChange={(value) => setNewPost(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="카테고리를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="tags" className="text-right">태그</Label>
                  <Input
                    id="tags"
                    value={newPost.tags}
                    onChange={(e) => setNewPost(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="태그를 쉼표로 구분해서 입력하세요"
                    className="col-span-3"
                  />
                </div>

                {/* 링크 추가 버튼 */}
                {!showLinkSection && (
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowLinkSection(true)}
                      className="flex items-center gap-2"
                    >
                      <Link className="h-4 w-4" />
                      링크 추가
                    </Button>
                  </div>
                )}

                {/* 링크 정보 섹션 */}
                {showLinkSection && (
                  <div className="border rounded-lg p-4 bg-primary/10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Link className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-primary">
                          링크 정보 추가
                        </h3>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowLinkSection(false)}
                        className="text-primary hover:text-primary/90"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <p className="text-primary mb-4">
                      URL을 입력하면 자동으로 링크 정보를 추출하여 게시글을 더 풍부하게 만들 수 있습니다.
                    </p>
                    
                    <div className="space-y-4">
                      {/* 링크 URL */}
                      <div>
                        <Label className="block text-sm font-medium mb-2">
                          링크 URL
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            value={newPost.linkUrl}
                            onChange={(e) => handleLinkUrlChange(e.target.value)}
                            placeholder="https://example.com"
                            className="flex-1"
                          />
                          {isExtractingLink && (
                            <div className="flex items-center px-3">
                              <div className="animate-spin w-4 h-4 border-2 border-primary/50 border-t-transparent rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 링크 정보 미리보기 */}
                      {(newPost.linkTitle || newPost.linkDescription || newPost.linkImage) && (
                        <div className="border rounded-lg p-4 bg-white">
                          <h4 className="font-medium mb-3">링크 미리보기</h4>
                          
                          <div className="grid grid-cols-4 items-center gap-4 mb-3">
                            <Label className="text-right">제목</Label>
                            <Input
                              value={newPost.linkTitle}
                              onChange={(e) => setNewPost(prev => ({ ...prev, linkTitle: e.target.value }))}
                              placeholder="링크 제목"
                              className="col-span-3"
                            />
                          </div>
                          
                          <div className="grid grid-cols-4 items-start gap-4 mb-3">
                            <Label className="text-right pt-2">설명</Label>
                            <Textarea
                              value={newPost.linkDescription}
                              onChange={(e) => setNewPost(prev => ({ ...prev, linkDescription: e.target.value }))}
                              placeholder="링크 설명"
                              className="col-span-3 min-h-[60px]"
                            />
                          </div>
                          
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">이미지 URL</Label>
                            <div className="col-span-3 space-y-2">
                              <Input
                                value={newPost.linkImage}
                                onChange={(e) => setNewPost(prev => ({ ...prev, linkImage: e.target.value }))}
                                placeholder="이미지 URL"
                              />
                              {newPost.linkImage && (
                                <div className="relative inline-block">
                                  <img
                                    src={newPost.linkImage}
                                    alt="링크 썸네일"
                                    className="w-20 h-20 object-cover rounded border"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setNewPost(prev => ({ ...prev, linkImage: '' }))}
                                    className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreatePostOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleSubmitPost} disabled={createPostMutation.isPending}>
                  {createPostMutation.isPending ? '작성 중...' : '게시'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 검색 및 뷰 컨트롤 */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="게시글 제목, 내용, 작성자로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewType === 'card' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewType('card')}
          >
            <Grid className="h-4 w-4 mr-2" />
            카드형
          </Button>
          <Button
            variant={viewType === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewType('list')}
          >
            <List className="h-4 w-4 mr-2" />
            리스트
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="latest">최신 글</TabsTrigger>
          <TabsTrigger value="popular">인기 글</TabsTrigger>
          <TabsTrigger value="training">훈련팁</TabsTrigger>
          <TabsTrigger value="survey">설문</TabsTrigger>
          <TabsTrigger value="info">정보공유</TabsTrigger>
          <TabsTrigger value="events">이벤트/행사</TabsTrigger>
          <TabsTrigger value="notices">공지사항</TabsTrigger>
        </TabsList>

        {/* 모든 탭에서 사용할 공통 콘텐츠 */}
        {['latest', 'popular', 'training', 'survey', 'info', 'events', 'notices'].map(tabValue => (
          <TabsContent key={tabValue} value={tabValue} className="mt-6">
            {/* 뉴스 섹션 - 뉴스 탭(훈련팁, 설문, 정보공유, 이벤트)에서만 표시 */}
            {isNewsTab(tabValue) && (
              <div className="mb-8" data-testid={`news-section-${tabValue}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <ExternalLink className="h-5 w-5 text-primary" />
                    관련 뉴스
                  </h3>
                  {newsData?.message && (
                    <span className="text-xs text-gray-500">{newsData.message}</span>
                  )}
                </div>
                
                {newsLoading && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <NewsCardSkeleton key={i} />
                    ))}
                  </div>
                )}

                {!newsLoading && newsArticles.length > 0 && (
                  viewType === 'card' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {newsArticles.map((article: NewsArticle) => (
                        <NewsCard key={article.id} article={article} viewType="card" onOpenDetail={handleNewsDetailOpen} />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {newsArticles.map((article: NewsArticle) => (
                        <NewsCard key={article.id} article={article} viewType="list" onOpenDetail={handleNewsDetailOpen} />
                      ))}
                    </div>
                  )
                )}

                {!newsLoading && newsArticles.length === 0 && (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <ExternalLink className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">관련 뉴스가 없습니다</p>
                  </div>
                )}

                {/* 구분선 */}
                <div className="border-t border-gray-200 mt-6 pt-6">
                  <h3 className="text-xl font-bold mb-4">커뮤니티 게시글</h3>
                </div>
              </div>
            )}

            {/* 이벤트/행사 탭 전용: 지도/리스트 뷰 토글 */}
            {tabValue === 'events' && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    이벤트/행사 위치
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      variant={eventsViewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEventsViewMode('list')}
                      data-testid="events-list-view-btn"
                    >
                      <List className="h-4 w-4 mr-2" />
                      리스트 보기
                    </Button>
                    <Button
                      variant={eventsViewMode === 'map' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEventsViewMode('map')}
                      data-testid="events-map-view-btn"
                    >
                      <Map className="h-4 w-4 mr-2" />
                      지도 보기
                    </Button>
                  </div>
                </div>

                {/* 지도 모드일 때 GoogleMapView 표시 */}
                {eventsViewMode === 'map' && (
                  <div className="mb-6">
                    <GoogleMapView
                      locations={
                        paginatedPosts
                          .filter((post: any) => 
                            post.locationLatitude && 
                            post.locationLongitude &&
                            !isNaN(parseFloat(post.locationLatitude)) &&
                            !isNaN(parseFloat(post.locationLongitude))
                          )
                          .map((post: any) => ({
                            id: post.id,
                            name: post.locationName || post.title,
                            address: post.locationAddress || post.eventLocation || '',
                            type: 'event',
                            coordinates: {
                              lat: parseFloat(post.locationLatitude),
                              lng: parseFloat(post.locationLongitude)
                            }
                          }))
                      }
                      onLocationSelect={(location) => {
                        const post = paginatedPosts.find((p: any) => p.id === location.id);
                        if (post) {
                          handlePostClick(post);
                        }
                      }}
                      height="400px"
                      center={{ lat: 37.5665, lng: 126.9780 }}
                    />
                    {paginatedPosts.filter((post: any) => 
                      post.locationLatitude && 
                      post.locationLongitude
                    ).length === 0 && (
                      <div className="text-center py-4 bg-gray-50 rounded-lg mt-4">
                        <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">위치 정보가 있는 이벤트가 없습니다</p>
                        <p className="text-xs text-gray-400 mt-1">
                          이벤트 작성 시 위치 정보를 추가하면 지도에 표시됩니다
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <PostCardSkeleton key={i} />
                ))}
              </div>
            )}

            {error && (
              <div className="text-center py-8">
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 max-w-md mx-auto">
                  <div className="text-destructive font-medium mb-2">게시글을 불러올 수 없습니다</div>
                  <div className="text-destructive text-sm">{error?.message || '알 수 없는 오류가 발생했습니다'}</div>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="mt-3 px-4 py-2 bg-destructive text-white rounded hover:bg-destructive/90 text-sm"
                  >
                    새로고침
                  </button>
                </div>
              </div>
            )}

            {!isLoading && !error && paginatedPosts && paginatedPosts.length > 0 && (
              <>
                {viewType === 'card' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedPosts.map((post: any) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onClick={handlePostClick}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paginatedPosts.map((post: any) => (
                      <Card key={post.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handlePostClick(post)}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {/* 썸네일 이미지 (리스트뷰용) */}
                            {post.linkInfo?.image && (
                              <div className="flex-shrink-0 w-24 h-24 overflow-hidden rounded-lg">
                                <img 
                                  src={post.linkInfo.image} 
                                  alt={post.linkInfo.title || post.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="secondary" className="text-xs">
                                  {post.tag}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {post.author?.name || '익명 사용자'} • {(() => {
                                    try {
                                      return formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ko });
                                    } catch {
                                      return '방금 전';
                                    }
                                  })()}
                                </span>
                              </div>
                              <h3 className="font-semibold text-lg mb-2 line-clamp-1">{post.title}</h3>
                              <p className="text-gray-600 text-sm mb-3 line-clamp-2">{post.content}</p>
                              
                              {/* 링크 정보 미리보기 (썸네일이 없고 리스트뷰일 때) */}
                              {post.linkInfo && !post.linkInfo.image && (
                                <div className="mb-3 p-2 bg-gray-50 rounded border text-xs">
                                  <div className="font-medium line-clamp-1">{post.linkInfo.title}</div>
                                  <div className="text-gray-600 line-clamp-1 mt-1">{post.linkInfo.description}</div>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Heart className="h-3 w-3" />
                                  <span>{post.likes || 0}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  <span>{post.comments || 0}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  <span>{post.views || 0}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* 작성자 아바타 (오른쪽 끝) */}
                            <div className="flex-shrink-0">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={post.author?.image} alt={post.author?.name} />
                                <AvatarFallback>{post.author?.name?.[0] || 'U'}</AvatarFallback>
                              </Avatar>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <div className="flex items-center gap-2">
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
                    </div>
                  </div>
                )}
              </>
            )}

            {!isLoading && !error && (!paginatedPosts || paginatedPosts.length === 0) && (
              <div className="text-center py-12">
                <p className="text-xl mb-2">{getEmptyMessage(tabValue).title}</p>
                <p className="text-muted-foreground mb-4">{getEmptyMessage(tabValue).description}</p>
                <Button onClick={() => setIsCreatePostOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  글쓰기
                </Button>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* 게시글 상세 보기 다이얼로그 */}
      <Dialog open={isPostDetailOpen} onOpenChange={setIsPostDetailOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          {selectedPost && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedPost.title}</DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={selectedPost.author?.image} alt={selectedPost.author?.name} />
                    <AvatarFallback>{selectedPost.author?.name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <span>{selectedPost.author?.name || '익명 사용자'}</span>
                  <span>•</span>
                  <span>{(() => {
                    try {
                      return formatDistanceToNow(new Date(selectedPost.createdAt), { addSuffix: true, locale: ko });
                    } catch {
                      return '방금 전';
                    }
                  })()}</span>
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4 space-y-4">
                {/* 게시글 내용 */}
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap">{selectedPost.content}</p>
                </div>

                {/* 영상 재생 영역 */}
                {selectedPost.videoUrl && (
                  <div className="mt-4">
                    <div className="bg-black rounded-lg overflow-hidden">
                      <video 
                        controls 
                        className="w-full h-auto max-h-96"
                        preload="metadata"
                        poster={selectedPost.videoThumbnail}
                      >
                        <source src={selectedPost.videoUrl} type="video/mp4" />
                        <source src={selectedPost.videoUrl} type="video/webm" />
                        <source src={selectedPost.videoUrl} type="video/ogg" />
                        브라우저가 비디오 재생을 지원하지 않습니다.
                      </video>
                    </div>
                    {selectedPost.videoDuration > 0 && (
                      <div className="mt-2 text-sm text-gray-600">
                        재생시간: {Math.floor(selectedPost.videoDuration / 60)}분 {selectedPost.videoDuration % 60}초
                        {selectedPost.videoFileSize > 0 && (
                          <span className="ml-4">
                            파일크기: {(selectedPost.videoFileSize / 1024 / 1024).toFixed(1)}MB
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 링크 정보 */}
                {!selectedPost.videoUrl && selectedPost.linkInfo && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start gap-4">
                      {selectedPost.linkInfo.image && (
                        <div className="flex-shrink-0 w-24 h-24 overflow-hidden rounded-lg">
                          <img 
                            src={selectedPost.linkInfo.image} 
                            alt={selectedPost.linkInfo.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium text-lg mb-2">{selectedPost.linkInfo.title}</h4>
                        <p className="text-gray-600 text-sm mb-2">{selectedPost.linkInfo.description}</p>
                        <a 
                          href={selectedPost.linkInfo.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/90 text-sm flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          링크 바로가기
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* 반응 버튼 */}
                <div className="flex items-center gap-4 py-2 border-t border-b">
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    좋아요 {selectedPost.likes || 0}
                  </Button>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    댓글 {selectedPost.comments || 0}
                  </Button>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    조회 {selectedPost.views || 0}
                  </Button>
                </div>

                {/* 댓글 섹션 */}
                <div className="space-y-4">
                  <h4 className="font-medium">댓글</h4>
                  
                  {/* 댓글 작성 */}
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.image} alt={user?.username} />
                      <AvatarFallback>{user?.username?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <Textarea
                        placeholder="댓글을 작성하세요..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[60px]"
                      />
                      <Button size="sm" onClick={handleAddComment}>
                        댓글 작성
                      </Button>
                    </div>
                  </div>

                  {/* 댓글 목록 */}
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.author.image} alt={comment.author.name} />
                          <AvatarFallback>{comment.author.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{comment.author.name}</span>
                              <span className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ko })}
                              </span>
                            </div>
                            <p className="text-sm">{comment.content}</p>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setReplyingTo(comment.id)}
                              className="text-xs"
                            >
                              답글
                            </Button>
                          </div>

                          {/* 답글 작성 */}
                          {replyingTo === comment.id && (
                            <div className="mt-3 flex gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={user?.image} alt={user?.username} />
                                <AvatarFallback>{user?.username?.[0] || 'U'}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 space-y-2">
                                <Textarea
                                  placeholder="답글을 작성하세요..."
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  className="min-h-[50px] text-sm"
                                />
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleAddReply(comment.id)}
                                    className="text-xs"
                                  >
                                    답글 작성
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setReplyingTo(null)}
                                    className="text-xs"
                                  >
                                    취소
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 답글 목록 */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="mt-3 ml-4 space-y-3">
                              {comment.replies.map((reply: any) => (
                                <div key={reply.id} className="flex gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={reply.author.image} alt={reply.author.name} />
                                    <AvatarFallback>{reply.author.name[0]}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="bg-gray-100 rounded-lg p-2">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-xs">{reply.author.name}</span>
                                        <span className="text-xs text-gray-500">
                                          {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true, locale: ko })}
                                        </span>
                                      </div>
                                      <p className="text-xs">{reply.content}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 뉴스 상세 모달 */}
      <Dialog open={isNewsDetailOpen} onOpenChange={setIsNewsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedNewsArticle && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="bg-primary text-white">
                    뉴스
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {selectedNewsArticle.source}
                  </span>
                  <span className="text-sm text-gray-400">•</span>
                  <span className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(selectedNewsArticle.publishedAt), { addSuffix: true, locale: ko })}
                  </span>
                </div>
                <DialogTitle className="text-xl font-bold leading-tight">
                  {selectedNewsArticle.title}
                </DialogTitle>
              </DialogHeader>
              
              {/* 뉴스 이미지 */}
              {selectedNewsArticle.image && (
                <div className="my-4 rounded-lg overflow-hidden">
                  <img 
                    src={selectedNewsArticle.image} 
                    alt={selectedNewsArticle.title}
                    className="w-full h-auto max-h-80 object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              {/* 뉴스 내용 */}
              <div className="space-y-4">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {selectedNewsArticle.description}
                </p>
                
                {/* 원문 링크 */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.open(selectedNewsArticle.url, '_blank', 'noopener,noreferrer')}
                    data-testid="news-detail-external-link"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    원문 기사 보기
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CommunityPage;