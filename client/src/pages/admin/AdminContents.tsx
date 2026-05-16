import { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '@/lib/auth-compat';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  PlusCircle,
  Eye,
  Edit2,
  Trash2,
  RefreshCw,
  Filter,
  ChevronDown,
  MoreHorizontal,
  Image,
  Video,
  FileText,
  Layout,
  LayoutGrid,
  ExternalLink,
  Link as LinkIcon,
  BarChart,
  Calendar
} from 'lucide-react';

const AdminBannersSection = lazy(() => import('./AdminBanners'));
const ContentCrawlerSection = lazy(() => import('./ContentCrawler'));
const AdminContentModerationSection = lazy(() => import('./AdminContentModeration'));

// 콘텐츠 타입 정의
interface Content {
  id: number;
  title: string;
  type: 'banner' | 'image' | 'video' | 'article' | 'event';
  status: 'active' | 'inactive' | 'draft' | 'scheduled';
  publishDate: string;
  location: string;
  views: number;
  clicks?: number;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminContents() {
  const { userName } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [section, setSection] = useState('contents');
  const [contents, setContents] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [showContentModal, setShowContentModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'add'>('view');
  
  // 커뮤니티 관리 상태
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityPage, setCommunityPage] = useState(1);
  const [communitySearch, setCommunitySearch] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [postToDelete, setPostToDelete] = useState<any>(null);
  
  // Banner management state
  const [showBannerDialog, setShowBannerDialog] = useState(false);
  const [bannerFormData, setBannerFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    altText: '',
    linkUrl: '',
    targetBlank: true,
    type: 'main' as 'main' | 'event' | 'shop' | 'course' | 'trainer',
    position: 'hero' as 'hero' | 'sidebar' | 'footer' | 'popup',
    order: 1,
    startDate: '',
    endDate: '',
    status: 'active' as 'active' | 'inactive' | 'scheduled'
  });

  // Banner creation mutation
  const createBannerMutation = useMutation({
    mutationFn: async (bannerData: any) => {
      const response = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bannerData),
      });
      if (!response.ok) throw new Error('배너 생성에 실패했습니다');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: '성공', description: '배너가 성공적으로 등록되었습니다.' });
      setShowBannerDialog(false);
      setBannerFormData({
        title: '',
        description: '',
        imageUrl: '',
        altText: '',
        linkUrl: '',
        targetBlank: true,
        type: 'main' as 'main' | 'event' | 'shop' | 'course' | 'trainer',
        position: 'hero' as 'hero' | 'sidebar' | 'footer' | 'popup',
        order: 1,
        startDate: '',
        endDate: '',
        status: 'active' as 'active' | 'inactive' | 'scheduled'
      });
      refetchBanners();
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // 커뮤니티 게시글 데이터 조회
  const { data: communityData = { posts: [], total: 0 }, isLoading: communityPostsLoading, refetch: refetchCommunityPosts } = useQuery({
    queryKey: ['/api/community/posts', communityPage, communitySearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: communityPage.toString(),
        limit: '10',
        ...(communitySearch && { searchQuery: communitySearch })
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
        title: '성공', 
        description: `게시글 "${data.deletedPost.title}"이 성공적으로 삭제되었습니다.` 
      });
      setShowDeleteConfirm(false);
      setPostToDelete(null);
      refetchCommunityPosts();
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Fetch banners
  const { data: banners = [], isLoading: bannersLoading, refetch: refetchBanners } = useQuery({
    queryKey: ['/api/admin/banners'],
    queryFn: async () => {
      const response = await fetch('/api/admin/banners', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('배너 데이터를 불러오는데 실패했습니다');
      }
      return response.json();
    }
  });

  // Mock contents data for display purposes
  const mockContents: Content[] = [
    {
      id: 1,
      title: '펫 교육 프로그램 소개',
      type: 'article',
      status: 'active',
      publishDate: '2024-01-15',
      location: '메인페이지',
      views: 1250,
      clicks: 89,
      author: '관리자',
      createdAt: '2024-01-15T09:00:00Z',
      updatedAt: '2024-01-15T09:00:00Z'
    },
    {
      id: 2,
      title: '신년 특별 이벤트 배너',
      type: 'banner',
      status: 'active',
      publishDate: '2024-01-01',
      location: '메인배너',
      views: 3450,
      clicks: 234,
      author: '마케팅팀',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-10T14:30:00Z'
    },
    {
      id: 3,
      title: '펫 훈련 영상 시리즈',
      type: 'video',
      status: 'draft',
      publishDate: '',
      location: '교육센터',
      views: 0,
      author: '교육팀',
      createdAt: '2024-01-20T11:15:00Z',
      updatedAt: '2024-01-20T11:15:00Z'
    },
    {
      id: 4,
      title: '반려동물 건강 체크 이벤트',
      type: 'event',
      status: 'scheduled',
      publishDate: '2024-02-01',
      location: '이벤트페이지',
      views: 0,
      author: '이벤트팀',
      createdAt: '2024-01-18T16:45:00Z',
      updatedAt: '2024-01-18T16:45:00Z'
    },
    {
      id: 5,
      title: '프리미엄 사료 광고',
      type: 'image',
      status: 'inactive',
      publishDate: '2023-12-20',
      location: '사이드바',
      views: 890,
      clicks: 45,
      author: '광고팀',
      createdAt: '2023-12-20T13:20:00Z',
      updatedAt: '2024-01-05T10:10:00Z'
    }
  ];

  // 새 콘텐츠 상태
  const [newContent, setNewContent] = useState({
    title: '',
    type: 'article' as Content['type'],
    status: 'draft' as Content['status'],
    location: '',
    publishDate: '',
    description: '',
    tags: ''
  });

  // 콘텐츠 데이터 로딩
  useEffect(() => {
    const loadContents = async () => {
      try {
        setIsLoading(true);
        
        // 실제 API 호출로 대체 가능
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setContents(mockContents);
      } catch (error) {
        console.error('콘텐츠 데이터 로딩 오류:', error);
        toast({
          title: '데이터 로딩 오류',
          description: '콘텐츠 정보를 불러오는 중 오류가 발생했습니다.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadContents();
  }, [toast]);
  
  // 콘텐츠 타입에 따른 아이콘 표시
  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'banner':
        return <Layout className="w-4 h-4 mr-1" />;
      case 'image':
        return <Image className="w-4 h-4 mr-1" />;
      case 'video':
        return <Video className="w-4 h-4 mr-1" />;
      case 'article':
        return <FileText className="w-4 h-4 mr-1" />;
      case 'event':
        return <Calendar className="w-4 h-4 mr-1" />;
      default:
        return <Image className="w-4 h-4 mr-1" />;
    }
  };
  
  // 상태에 따른 배지 표시
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success">활성</Badge>;
      case 'inactive':
        return <Badge variant="outline" className="text-gray-500">비활성</Badge>;
      case 'draft':
        return <Badge variant="outline" className="text-warning border-warning/50">초안</Badge>;
      case 'scheduled':
        return <Badge className="bg-primary">예약됨</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  // 필터링 및 검색 기능
  const getFilteredContents = () => {
    let filtered = [...contents];
    
    // 탭 필터링
    if (activeTab !== 'all') {
      filtered = filtered.filter(content => content.status === activeTab);
    }
    
    // 검색어 필터링
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(content => 
        content.title.toLowerCase().includes(query) ||
        content.author.toLowerCase().includes(query) ||
        content.location.toLowerCase().includes(query)
      );
    }
    
    // 콘텐츠 타입 필터링
    if (filterType) {
      filtered = filtered.filter(content => content.type === filterType);
    }
    
    // 상태 필터링
    if (filterStatus) {
      filtered = filtered.filter(content => content.status === filterStatus);
    }
    
    return filtered;
  };
  
  // 페이지네이션 구현
  const filteredContents = getFilteredContents();
  const totalPages = Math.ceil(filteredContents.length / itemsPerPage);
  const paginatedContents = filteredContents.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );
  
  // 콘텐츠 상세 보기
  const handleViewContent = (content: Content) => {
    setSelectedContent(content);
    setModalMode('view');
    setShowContentModal(true);
  };
  
  // 콘텐츠 편집 모드
  const handleEditContent = (content: Content) => {
    setSelectedContent(content);
    setModalMode('edit');
    setShowContentModal(true);
  };
  
  // 새 콘텐츠 추가 모드
  const handleAddContent = () => {
    setSelectedContent(null);
    setModalMode('add');
    setShowContentModal(true);
  };
  
  // 콘텐츠 저장
  const handleSaveContent = async () => {
    try {
      if (modalMode === 'add') {
        // 새 콘텐츠 추가 로직
        const newId = Math.max(...contents.map(c => c.id)) + 1;
        const newContentItem: Content = {
          id: newId,
          title: newContent.title,
          type: newContent.type,
          status: newContent.status,
          location: newContent.location,
          publishDate: newContent.publishDate,
          views: 0,
          author: userName || '관리자',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        setContents([...contents, newContentItem]);
        
        toast({
          title: '콘텐츠 추가 완료',
          description: '새로운 콘텐츠가 성공적으로 추가되었습니다.',
        });
      }
      
      setShowContentModal(false);
    } catch (error) {
      toast({
        title: '저장 오류',
        description: '콘텐츠 저장 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };
  
  // 새로고침 기능
  const handleRefresh = () => {
    toast({
      title: '새로고침 완료',
      description: '콘텐츠 목록이 업데이트되었습니다.',
    });
    
    // 실제로는 API 재호출
    setTimeout(() => {
      setContents([...mockContents]);
    }, 1000);
  };
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">콘텐츠 관리</h1>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'contents', label: '콘텐츠' },
          { key: 'banners', label: '배너 관리' },
          { key: 'crawler', label: '자동 수집' },
          { key: 'moderation', label: '신고·모더레이션' },
        ].map(({ key, label }) => (
          <Button
            key={key}
            variant={section === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSection(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {section === 'banners' && (
        <Suspense fallback={<div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>}>
          <AdminBannersSection />
        </Suspense>
      )}
      {section === 'crawler' && (
        <Suspense fallback={<div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>}>
          <ContentCrawlerSection />
        </Suspense>
      )}
      {section === 'moderation' && (
        <Suspense fallback={<div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>}>
          <AdminContentModerationSection />
        </Suspense>
      )}

      {section === 'contents' && <>
      <div className="flex items-center space-x-2">
          <Button onClick={() => setShowBannerDialog(true)} variant="default">
            <Layout className="mr-2 h-4 w-4" />
            배너 등록
          </Button>
          <Button onClick={handleAddContent} variant="outline">
            <PlusCircle className="mr-2 h-4 w-4" />
            콘텐츠 추가
          </Button>
        </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="active">활성</TabsTrigger>
            <TabsTrigger value="draft">초안</TabsTrigger>
            <TabsTrigger value="scheduled">예약됨</TabsTrigger>
            <TabsTrigger value="inactive">비활성</TabsTrigger>
          </TabsList>
          
          <div className="flex space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="제목, 작성자, 위치 검색..."
                className="pl-8 h-9 md:w-[300px] w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={filterType || 'all'} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="콘텐츠 타입" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 타입</SelectItem>
                <SelectItem value="banner">배너</SelectItem>
                <SelectItem value="image">이미지</SelectItem>
                <SelectItem value="video">비디오</SelectItem>
                <SelectItem value="article">아티클</SelectItem>
                <SelectItem value="event">이벤트</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="ghost" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">ID</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead>타입</TableHead>
                  <TableHead>위치</TableHead>
                  <TableHead>게시일</TableHead>
                  <TableHead className="text-center">조회수</TableHead>
                  <TableHead className="text-center">상태</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10">
                      <div className="flex justify-center">
                        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        콘텐츠 데이터 로딩 중...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedContents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10">
                      <div className="text-muted-foreground">
                        {searchQuery 
                          ? '검색 조건에 맞는 콘텐츠가 없습니다.' 
                          : '콘텐츠가 없습니다.'}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedContents.map((content) => (
                    <TableRow key={content.id}>
                      <TableCell className="font-medium">{content.id}</TableCell>
                      <TableCell>
                        <div className="font-medium">{content.title}</div>
                        <div className="text-xs text-muted-foreground">
                          작성자: {content.author}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {getContentTypeIcon(content.type)}
                          <span className="capitalize">
                            {content.type === 'banner' && '배너'}
                            {content.type === 'image' && '이미지'}
                            {content.type === 'video' && '비디오'}
                            {content.type === 'article' && '아티클'}
                            {content.type === 'event' && '이벤트'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{content.location}</TableCell>
                      <TableCell>
                        {content.publishDate || 
                          <span className="text-muted-foreground">미설정</span>}
                      </TableCell>
                      <TableCell className="text-center">{content.views.toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(content.status)}
                      </TableCell>
                      <TableCell className="flex items-center justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewContent(content)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditContent(content)}
                          className="hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all duration-200"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Tabs>

      {/* Content Modal */}
      <Dialog open={showContentModal} onOpenChange={setShowContentModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {modalMode === 'view' && '콘텐츠 상세 정보'}
              {modalMode === 'edit' && '콘텐츠 수정'}
              {modalMode === 'add' && '새 콘텐츠 추가'}
            </DialogTitle>
            <DialogDescription>
              {modalMode === 'view' && '콘텐츠 정보를 확인할 수 있습니다.'}
              {modalMode === 'edit' && '콘텐츠 정보를 수정할 수 있습니다.'}
              {modalMode === 'add' && '새로운 콘텐츠를 추가할 수 있습니다.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4 overflow-y-auto flex-1 pr-2">
            {modalMode === 'add' && (
              <div className="grid gap-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="content-title" className="text-right">
                    제목 *
                  </Label>
                  <Input
                    id="content-title"
                    value={newContent.title}
                    onChange={(e) => setNewContent({ ...newContent, title: e.target.value })}
                    className="col-span-3"
                    placeholder="콘텐츠 제목을 입력하세요"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="content-type" className="text-right">
                    타입 *
                  </Label>
                  <Select value={newContent.type} onValueChange={(value: any) => setNewContent({ ...newContent, type: value })}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="banner">배너</SelectItem>
                      <SelectItem value="image">이미지</SelectItem>
                      <SelectItem value="video">비디오</SelectItem>
                      <SelectItem value="article">아티클</SelectItem>
                      <SelectItem value="event">이벤트</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="content-status" className="text-right">
                    상태
                  </Label>
                  <Select value={newContent.status} onValueChange={(value: any) => setNewContent({ ...newContent, status: value })}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">초안</SelectItem>
                      <SelectItem value="active">활성</SelectItem>
                      <SelectItem value="scheduled">예약됨</SelectItem>
                      <SelectItem value="inactive">비활성</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="content-location" className="text-right">
                    위치 *
                  </Label>
                  <Input
                    id="content-location"
                    value={newContent.location}
                    onChange={(e) => setNewContent({ ...newContent, location: e.target.value })}
                    className="col-span-3"
                    placeholder="홈페이지, 메인배너, 사이드바 등"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="content-publishDate" className="text-right">
                    게시일
                  </Label>
                  <Input
                    id="content-publishDate"
                    type="date"
                    value={newContent.publishDate}
                    onChange={(e) => setNewContent({ ...newContent, publishDate: e.target.value })}
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="content-description" className="text-right pt-2">
                    설명
                  </Label>
                  <Textarea
                    id="content-description"
                    value={newContent.description}
                    onChange={(e) => setNewContent({ ...newContent, description: e.target.value })}
                    className="col-span-3"
                    placeholder="콘텐츠에 대한 설명을 입력하세요"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="content-tags" className="text-right">
                    태그
                  </Label>
                  <Input
                    id="content-tags"
                    value={newContent.tags}
                    onChange={(e) => setNewContent({ ...newContent, tags: e.target.value })}
                    className="col-span-3"
                    placeholder="태그를 쉼표로 구분하여 입력"
                  />
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex-shrink-0 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowContentModal(false)}>
              취소
            </Button>
            {modalMode === 'add' && (
              <Button onClick={handleSaveContent}>
                콘텐츠 추가
              </Button>
            )}
            {modalMode === 'edit' && (
              <Button onClick={() => {
                toast({
                  title: '수정 완료',
                  description: '콘텐츠 정보가 수정되었습니다.',
                });
                setShowContentModal(false);
              }}>
                수정 저장
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Banner Registration Dialog */}
      <Dialog open={showBannerDialog} onOpenChange={setShowBannerDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>새 배너 등록</DialogTitle>
            <DialogDescription>
              메인 페이지에 표시될 배너를 등록하세요.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4 overflow-y-auto flex-1 pr-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="banner-title" className="text-right">제목 *</Label>
              <Input
                id="banner-title"
                value={bannerFormData.title}
                onChange={(e) => setBannerFormData({ ...bannerFormData, title: e.target.value })}
                className="col-span-3"
                placeholder="배너 제목을 입력하세요"
              />
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="banner-description" className="text-right pt-2">설명</Label>
              <Textarea
                id="banner-description"
                value={bannerFormData.description}
                onChange={(e) => setBannerFormData({ ...bannerFormData, description: e.target.value })}
                className="col-span-3"
                placeholder="배너 설명을 입력하세요"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="banner-image" className="text-right">이미지 URL *</Label>
              <Input
                id="banner-image"
                value={bannerFormData.imageUrl}
                onChange={(e) => setBannerFormData({ ...bannerFormData, imageUrl: e.target.value })}
                className="col-span-3"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="banner-alt" className="text-right">Alt 텍스트</Label>
              <Input
                id="banner-alt"
                value={bannerFormData.altText}
                onChange={(e) => setBannerFormData({ ...bannerFormData, altText: e.target.value })}
                className="col-span-3"
                placeholder="이미지 설명"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="banner-link" className="text-right">링크 URL</Label>
              <Input
                id="banner-link"
                value={bannerFormData.linkUrl}
                onChange={(e) => setBannerFormData({ ...bannerFormData, linkUrl: e.target.value })}
                className="col-span-3"
                placeholder="https://example.com"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="banner-type" className="text-right">배너 타입</Label>
              <Select value={bannerFormData.type} onValueChange={(value: any) => setBannerFormData({ ...bannerFormData, type: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">메인 배너</SelectItem>
                  <SelectItem value="event">이벤트 배너</SelectItem>
                  <SelectItem value="shop">쇼핑 배너</SelectItem>
                  <SelectItem value="course">강의 배너</SelectItem>
                  <SelectItem value="trainer">훈련사 배너</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="banner-position" className="text-right">위치</Label>
              <Select value={bannerFormData.position} onValueChange={(value: any) => setBannerFormData({ ...bannerFormData, position: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hero">메인 히어로</SelectItem>
                  <SelectItem value="sidebar">사이드바</SelectItem>
                  <SelectItem value="footer">푸터</SelectItem>
                  <SelectItem value="popup">팝업</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="banner-order" className="text-right">순서</Label>
              <Input
                id="banner-order"
                type="number"
                value={bannerFormData.order}
                onChange={(e) => setBannerFormData({ ...bannerFormData, order: parseInt(e.target.value) || 1 })}
                className="col-span-3"
                min="1"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="banner-start" className="text-right">시작일</Label>
              <Input
                id="banner-start"
                type="date"
                value={bannerFormData.startDate}
                onChange={(e) => setBannerFormData({ ...bannerFormData, startDate: e.target.value })}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="banner-end" className="text-right">종료일</Label>
              <Input
                id="banner-end"
                type="date"
                value={bannerFormData.endDate}
                onChange={(e) => setBannerFormData({ ...bannerFormData, endDate: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter className="flex-shrink-0 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowBannerDialog(false)}>
              취소
            </Button>
            <Button 
              onClick={() => createBannerMutation.mutate(bannerFormData)}
              disabled={createBannerMutation.isPending || !bannerFormData.title || !bannerFormData.imageUrl}
            >
              {createBannerMutation.isPending ? '등록 중...' : '배너 등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>}
    </div>
  );
}