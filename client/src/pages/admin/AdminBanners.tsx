import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  PlusCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Eye,
  MoreVertical,
  Image as ImageIcon,
  Upload,
  Link,
  Calendar,
  ArrowUpDown,
  Check,
  ExternalLink,
  Save,
  Store,
  Home,
  MonitorSmartphone,
  X,

} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// 배너 타입 정의
interface Banner {
  id: number;
  title: string;
  description?: string;
  imageUrl: string;
  linkUrl?: string;
  target?: '_blank' | '_self';
  type: 'main' | 'shop' | 'promotion';
  position: 'hero' | 'sidebar' | 'footer' | 'popup';
  order: number;
  startDate?: string;
  endDate?: string;
  status: 'active' | 'inactive' | 'scheduled';
  createdAt: string;
  updatedAt: string;
  viewCount?: number;
  clickCount?: number;
  responsiveImage?: {
    mobile?: string;
    tablet?: string;
    desktop: string;
  }
}

export default function AdminBanners() {
  const { userName } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('main');
  const [banners, setBanners] = useState<Banner[]>([]);
  const [filteredBanners, setFilteredBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPosition, setFilterPosition] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'add'>('view');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // 배너 데이터 로드
  useEffect(() => {
    const loadBanners = async () => {
      setIsLoading(true);
      try {
        // 실제 API 호출
        const response = await fetch('/api/admin/banners');
        if (response.ok) {
          const data = await response.json();
          const bannersData = data.banners || data || [];
          setBanners(bannersData);
          setIsLoading(false);
          return;
        }
        
        // API가 실패하면 임시 데이터 사용
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 임시 배너 데이터
        const mockBanners: Banner[] = [
          {
            id: 1,
            title: '여름 특별 훈련 프로그램',
            description: '여름 시즌 반려견 수영 및 야외 활동 특별 프로그램을 소개합니다.',
            imageUrl: 'https://placedog.net/1200/400?id=1',
            linkUrl: '/courses/summer-special',
            type: 'main',
            position: 'hero',
            order: 1,
            startDate: '2024-06-01',
            endDate: '2024-08-31',
            status: 'scheduled',
            createdAt: '2024-05-01 13:45:22',
            updatedAt: '2024-05-01 13:45:22',
            responsiveImage: {
              mobile: 'https://placedog.net/600/400?id=1',
              tablet: 'https://placedog.net/900/400?id=1',
              desktop: 'https://placedog.net/1200/400?id=1'
            }
          },
          {
            id: 2,
            title: '신규 가입 할인',
            description: '신규 가입 시 모든 강의 20% 할인 혜택',
            imageUrl: 'https://placedog.net/1200/400?id=2',
            linkUrl: '/register',
            type: 'main',
            position: 'hero',
            order: 2,
            status: 'active',
            createdAt: '2024-04-15 10:22:45',
            updatedAt: '2024-04-15 10:22:45',
            viewCount: 1245,
            clickCount: 380,
            responsiveImage: {
              mobile: 'https://placedog.net/600/400?id=2',
              tablet: 'https://placedog.net/900/400?id=2',
              desktop: 'https://placedog.net/1200/400?id=2'
            }
          },
          {
            id: 3,
            title: '훈련사 인증 프로그램',
            description: '전문 훈련사가 되기 위한 인증 과정을 소개합니다.',
            imageUrl: 'https://placedog.net/1200/400?id=3',
            linkUrl: '/certification',
            type: 'main',
            position: 'sidebar',
            order: 1,
            status: 'active',
            createdAt: '2024-04-10 09:15:32',
            updatedAt: '2024-04-10 09:15:32',
            viewCount: 890,
            clickCount: 245
          },
          {
            id: 4,
            title: '여름 장난감 세일',
            description: '모든 반려견 장난감 최대 30% 할인',
            imageUrl: 'https://placedog.net/1200/400?id=4',
            linkUrl: '/shop/toys',
            target: '_blank',
            type: 'shop',
            position: 'hero',
            order: 1,
            startDate: '2024-06-01',
            endDate: '2024-06-30',
            status: 'scheduled',
            createdAt: '2024-05-05 14:20:10',
            updatedAt: '2024-05-05 14:20:10',
            responsiveImage: {
              mobile: 'https://placedog.net/600/400?id=4',
              tablet: 'https://placedog.net/900/400?id=4',
              desktop: 'https://placedog.net/1200/400?id=4'
            }
          },
          {
            id: 5,
            title: '특가 사료 할인',
            description: '프리미엄 사료 브랜드 할인 프로모션',
            imageUrl: 'https://placedog.net/1200/400?id=5',
            linkUrl: '/shop/food',
            type: 'shop',
            position: 'hero',
            order: 2,
            status: 'active',
            createdAt: '2024-04-20 11:30:45',
            updatedAt: '2024-04-20 11:30:45',
            viewCount: 1560,
            clickCount: 640,
            responsiveImage: {
              mobile: 'https://placedog.net/600/400?id=5',
              tablet: 'https://placedog.net/900/400?id=5',
              desktop: 'https://placedog.net/1200/400?id=5'
            }
          },
          {
            id: 6,
            title: '모바일 앱 출시 안내',
            description: '펫에듀 모바일 앱 출시 소식을 전합니다.',
            imageUrl: 'https://placedog.net/600/300?id=6',
            linkUrl: '/app-download',
            type: 'promotion',
            position: 'popup',
            order: 1,
            startDate: '2024-05-15',
            endDate: '2024-06-15',
            status: 'scheduled',
            createdAt: '2024-05-10 16:45:30',
            updatedAt: '2024-05-10 16:45:30'
          }
        ];
        
        setBanners(mockBanners);
      } catch (error) {
        console.error('배너 데이터 로딩 오류:', error);
        toast({
          title: '데이터 로딩 오류',
          description: '배너 정보를 불러오는 중 오류가 발생했습니다.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadBanners();
  }, [toast]);
  
  // 필터링된 배너 목록 업데이트
  useEffect(() => {
    let result = [...banners];
    
    // 탭 필터링
    result = result.filter(banner => banner.type === activeTab);
    
    // 검색어 필터링
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        banner => 
          banner.title.toLowerCase().includes(query) ||
          (banner.description && banner.description.toLowerCase().includes(query))
      );
    }
    
    // 위치 필터링
    if (filterPosition && filterPosition !== 'all') {
      result = result.filter(banner => banner.position === filterPosition);
    }
    
    // 상태 필터링
    if (filterStatus && filterStatus !== 'all') {
      result = result.filter(banner => banner.status === filterStatus);
    }
    
    // 순서로 정렬
    result.sort((a, b) => a.order - b.order);
    
    setFilteredBanners(result);
  }, [banners, activeTab, searchQuery, filterPosition, filterStatus]);
  
  // 페이지네이션 처리
  const totalPages = Math.ceil(filteredBanners.length / itemsPerPage);
  const paginatedBanners = filteredBanners.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );
  
  // 배너 순서 변경
  const handleMoveOrder = (bannerId: number, direction: 'up' | 'down') => {
    const bannerIndex = banners.findIndex(b => b.id === bannerId);
    if (bannerIndex === -1) return;
    
    const banner = banners[bannerIndex];
    const type = banner.type;
    const position = banner.position;
    
    // 같은 타입, 같은 위치에 있는 배너들만 필터링
    const sameCategoryBanners = banners.filter(b => b.type === type && b.position === position);
    
    // 현재 배너의 해당 카테고리 내 인덱스
    const categoryIndex = sameCategoryBanners.findIndex(b => b.id === bannerId);
    
    // 방향에 따라 순서 변경
    if (direction === 'up' && categoryIndex > 0) {
      // 이전 배너
      const prevBanner = sameCategoryBanners[categoryIndex - 1];
      
      // 순서 변경
      setBanners(prev => prev.map(b => {
        if (b.id === bannerId) return { ...b, order: prevBanner.order };
        if (b.id === prevBanner.id) return { ...b, order: banner.order };
        return b;
      }));
    } else if (direction === 'down' && categoryIndex < sameCategoryBanners.length - 1) {
      // 다음 배너
      const nextBanner = sameCategoryBanners[categoryIndex + 1];
      
      // 순서 변경
      setBanners(prev => prev.map(b => {
        if (b.id === bannerId) return { ...b, order: nextBanner.order };
        if (b.id === nextBanner.id) return { ...b, order: banner.order };
        return b;
      }));
    }
    
    toast({
      title: '배너 순서 변경',
      description: '배너 순서가 변경되었습니다.',
    });
  };
  
  // 배너 상세 보기
  const handleViewBanner = (banner: Banner) => {
    setSelectedBanner(banner);
    setModalMode('view');
    setShowBannerModal(true);
  };
  
  // 배너 편집
  const handleEditBanner = (banner: Banner) => {
    setSelectedBanner(banner);
    setModalMode('edit');
    setShowBannerModal(true);
    setPreviewImage(banner.imageUrl);
  };
  
  // 새 배너 추가
  const handleAddBanner = () => {
    setSelectedBanner(null);
    setModalMode('add');
    setShowBannerModal(true);
    setPreviewImage(null);
  };
  
  // 배너 삭제
  const handleDeleteBanner = (bannerId: number) => {
    if (window.confirm('정말로 이 배너를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      setBanners(prev => prev.filter(banner => banner.id !== bannerId));
      
      toast({
        title: '배너 삭제',
        description: '배너가 성공적으로 삭제되었습니다.',
      });
      
      if (showBannerModal && selectedBanner && selectedBanner.id === bannerId) {
        setShowBannerModal(false);
      }
    }
  };
  
  // 배너 상태 변경
  const handleToggleStatus = (bannerId: number) => {
    setBanners(prev => prev.map(banner => 
      banner.id === bannerId ? 
        { 
          ...banner, 
          status: banner.status === 'active' ? 'inactive' : 'active' 
        } : 
        banner
    ));
    
    toast({
      title: '배너 상태 변경',
      description: '배너 상태가 변경되었습니다.',
    });
    
    if (selectedBanner && selectedBanner.id === bannerId) {
      setSelectedBanner({ 
        ...selectedBanner, 
        status: selectedBanner.status === 'active' ? 'inactive' : 'active' 
      });
    }
  };
  
  // 배너 저장 (추가 또는 편집)
  const handleSaveBanner = (formData: FormData) => {
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const linkUrl = formData.get('linkUrl') as string;
    const position = formData.get('position') as 'hero' | 'sidebar' | 'footer' | 'popup';
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const status = formData.get('status') as 'active' | 'inactive' | 'scheduled';
    const target = formData.get('target') as '_blank' | '_self';
    
    // 이미지 URL은 실제 구현에서는 파일 업로드 후 URL을 받아야 함
    // 여기서는 예시로 미리보기 이미지나 기본 이미지 사용
    const imageUrl = previewImage || 'https://placedog.net/1200/400?random=' + Math.random();
    
    if (modalMode === 'add') {
      const newBanner: Banner = {
        id: Math.max(...banners.map(b => b.id), 0) + 1,
        title,
        description,
        imageUrl,
        linkUrl,
        target,
        type: activeTab as 'main' | 'shop' | 'promotion',
        position,
        order: Math.max(...banners.filter(b => b.type === activeTab && b.position === position).map(b => b.order), 0) + 1,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status,
        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        viewCount: 0,
        clickCount: 0
      };
      
      setBanners(prev => [...prev, newBanner]);
      
      toast({
        title: '배너 추가',
        description: '새 배너가 추가되었습니다.',
      });
    } else if (modalMode === 'edit' && selectedBanner) {
      const updatedBanner: Banner = {
        ...selectedBanner,
        title,
        description,
        imageUrl,
        linkUrl,
        target,
        position,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status,
        updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
      };
      
      setBanners(prev => prev.map(banner => 
        banner.id === selectedBanner.id ? updatedBanner : banner
      ));
      
      toast({
        title: '배너 수정',
        description: '배너가 수정되었습니다.',
      });
    }
    
    setShowBannerModal(false);
  };
  
  // 이미지 미리보기 (실제 구현에서는 파일 업로드로 대체)
  const handleImagePreview = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // 데이터 새로고침
  const handleRefresh = () => {
    setIsLoading(true);
    
    // 실제 구현 시 API 호출로 대체
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: '새로고침 완료',
        description: '배너 데이터가 업데이트되었습니다.',
      });
    }, 1000);
  };
  
  // 상태별 배지 색상
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">활성화</span>;
      case 'inactive':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">비활성화</span>;
      case 'scheduled':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">예약됨</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };
  
  // 위치별 아이콘
  const getPositionIcon = (position: string) => {
    switch (position) {
      case 'hero':
        return <span className="text-primary text-xs">히어로</span>;
      case 'sidebar':
        return <span className="text-primary text-xs">사이드바</span>;
      case 'footer':
        return <span className="text-gray-500 text-xs">푸터</span>;
      case 'popup':
        return <span className="text-warning text-xs">팝업</span>;
      default:
        return <span className="text-gray-500 text-xs">{position}</span>;
    }
  };
  
  // 위치 선택 옵션
  const positionOptions = [
    { value: 'hero', label: '히어로 영역' },
    { value: 'sidebar', label: '사이드바' },
    { value: 'footer', label: '푸터' },
    { value: 'popup', label: '팝업' }
  ];
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">배너 관리</h1>
        <div className="flex items-center space-x-2">
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
          <Button onClick={handleAddBanner}>
            <PlusCircle className="mr-2 h-4 w-4" />
            새 배너 추가
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="main">
              <Home className="h-4 w-4 mr-2" />
              메인 배너
            </TabsTrigger>
            <TabsTrigger value="shop">
              <Store className="h-4 w-4 mr-2" />
              쇼핑몰 배너
            </TabsTrigger>
            <TabsTrigger value="promotion">
              <MonitorSmartphone className="h-4 w-4 mr-2" />
              프로모션 배너
            </TabsTrigger>
          </TabsList>
          
          <div className="flex space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="배너명 검색..."
                className="pl-8 h-9 md:w-[200px] w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={filterPosition || 'all'} onValueChange={setFilterPosition}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="위치" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 위치</SelectItem>
                <SelectItem value="hero">히어로 영역</SelectItem>
                <SelectItem value="sidebar">사이드바</SelectItem>
                <SelectItem value="footer">푸터</SelectItem>
                <SelectItem value="popup">팝업</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterStatus || 'all'} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 상태</SelectItem>
                <SelectItem value="active">활성화</SelectItem>
                <SelectItem value="inactive">비활성화</SelectItem>
                <SelectItem value="scheduled">예약됨</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">순서</TableHead>
                  <TableHead>배너</TableHead>
                  <TableHead>위치</TableHead>
                  <TableHead>기간</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>통계</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      <div className="flex justify-center">
                        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">데이터를 불러오고 있습니다...</div>
                    </TableCell>
                  </TableRow>
                ) : paginatedBanners.length > 0 ? (
                  paginatedBanners.map((banner, index) => (
                    <TableRow key={banner.id}>
                      <TableCell>
                        <div className="flex flex-col items-center">
                          <span className="font-medium">{banner.order}</span>
                          <div className="flex space-x-1 mt-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5"
                              onClick={() => handleMoveOrder(banner.id, 'up')}
                              disabled={index === 0 || filteredBanners[index - 1]?.position !== banner.position}
                            >
                              <ChevronLeft className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5"
                              onClick={() => handleMoveOrder(banner.id, 'down')}
                              disabled={index === paginatedBanners.length - 1 || filteredBanners[index + 1]?.position !== banner.position}
                            >
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 h-10 w-16 rounded-md bg-muted overflow-hidden">
                            {banner.imageUrl ? (
                              <img 
                                src={banner.imageUrl} 
                                alt={banner.title}
                                className="h-full w-full object-cover" 
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full w-full bg-secondary">
                                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{banner.title}</div>
                            {banner.linkUrl && (
                              <div className="text-xs text-muted-foreground flex items-center">
                                <Link className="h-3 w-3 mr-1" />
                                <span className="truncate max-w-[200px]" title={banner.linkUrl}>
                                  {banner.linkUrl}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getPositionIcon(banner.position)}
                      </TableCell>
                      <TableCell>
                        {banner.startDate && banner.endDate ? (
                          <div className="text-xs flex items-center">
                            <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                            <span>{banner.startDate}</span>
                            <span className="mx-1">~</span>
                            <span>{banner.endDate}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">영구적</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(banner.status)}</TableCell>
                      <TableCell>
                        {(banner.viewCount !== undefined && banner.clickCount !== undefined) ? (
                          <div className="text-xs">
                            <div>노출: {banner.viewCount.toLocaleString()}</div>
                            <div>클릭: {banner.clickCount.toLocaleString()}</div>
                            <div>CTR: {banner.viewCount > 0 ? ((banner.clickCount / banner.viewCount) * 100).toFixed(1) + '%' : '0%'}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">데이터 없음</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewBanner(banner)}>
                                <Eye className="h-4 w-4 mr-2" />
                                상세 보기
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditBanner(banner)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                배너 편집
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleToggleStatus(banner.id)}>
                                {banner.status === 'active' ? (
                                  <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    비활성화
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-4 w-4 mr-2" />
                                    활성화
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteBanner(banner.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      <div className="text-muted-foreground">등록된 배너가 없습니다</div>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={handleAddBanner}
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        새 배너 추가
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
          {!isLoading && totalPages > 1 && (
            <CardFooter className="flex justify-between py-4">
              <div className="text-sm text-muted-foreground">
                총 {filteredBanners.length}개 중 {(currentPage - 1) * itemsPerPage + 1}-
                {Math.min(currentPage * itemsPerPage, filteredBanners.length)}개 표시
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = currentPage > 3 ? currentPage - 3 + i + 1 : i + 1;
                  if (pageNum <= totalPages) {
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  }
                  return null;
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      </Tabs>
      
      {/* 배너 상세/편집 모달 */}
      <Dialog open={showBannerModal} onOpenChange={setShowBannerModal}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>
              {modalMode === 'view' ? '배너 상세 정보' : modalMode === 'edit' ? '배너 편집' : '새 배너 추가'}
            </DialogTitle>
            <DialogDescription>
              {modalMode === 'view'
                ? selectedBanner ? `${selectedBanner.title} 배너의 상세 정보입니다.` : ''
                : modalMode === 'edit'
                ? '배너 정보를 수정합니다.'
                : '새로운 배너를 추가합니다.'}
            </DialogDescription>
          </DialogHeader>
          
          {modalMode === 'view' && selectedBanner && (
            <div className="space-y-6">
              <div className="rounded-md overflow-hidden h-40 bg-muted">
                {selectedBanner.imageUrl ? (
                  <img 
                    src={selectedBanner.imageUrl} 
                    alt={selectedBanner.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">제목</h3>
                  <p className="font-medium">{selectedBanner.title}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">상태</h3>
                  <div>{getStatusBadge(selectedBanner.status)}</div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">설명</h3>
                <p className="text-sm">{selectedBanner.description || '설명 없음'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">위치</h3>
                  <p>{positionOptions.find(p => p.value === selectedBanner.position)?.label || selectedBanner.position}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">순서</h3>
                  <p>{selectedBanner.order}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">링크</h3>
                {selectedBanner.linkUrl ? (
                  <div className="flex items-center">
                    <a href={selectedBanner.linkUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[500px]">
                      {selectedBanner.linkUrl}
                    </a>
                    <ExternalLink className="h-3 w-3 ml-1 text-muted-foreground" />
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">링크 없음</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">시작일</h3>
                  <p>{selectedBanner.startDate || '지정되지 않음'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">종료일</h3>
                  <p>{selectedBanner.endDate || '지정되지 않음'}</p>
                </div>
              </div>
              
              {(selectedBanner.viewCount !== undefined && selectedBanner.clickCount !== undefined) && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">통계</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-muted p-3 rounded-md text-center">
                      <div className="text-xs text-muted-foreground mb-1">노출 수</div>
                      <div className="font-bold">{selectedBanner.viewCount.toLocaleString()}</div>
                    </div>
                    <div className="bg-muted p-3 rounded-md text-center">
                      <div className="text-xs text-muted-foreground mb-1">클릭 수</div>
                      <div className="font-bold">{selectedBanner.clickCount.toLocaleString()}</div>
                    </div>
                    <div className="bg-muted p-3 rounded-md text-center">
                      <div className="text-xs text-muted-foreground mb-1">클릭률</div>
                      <div className="font-bold">
                        {selectedBanner.viewCount > 0 ? 
                          ((selectedBanner.clickCount / selectedBanner.viewCount) * 100).toFixed(1) + '%' : 
                          '0%'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <DialogFooter className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => handleEditBanner(selectedBanner)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  배너 편집
                </Button>
                <Button
                  variant={selectedBanner.status === 'active' ? 'outline' : 'default'}
                  onClick={() => handleToggleStatus(selectedBanner.id)}
                >
                  {selectedBanner.status === 'active' ? (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      비활성화
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      활성화
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
          
          {(modalMode === 'edit' || modalMode === 'add') && (
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveBanner(new FormData(e.currentTarget));
              }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">배너 제목</Label>
                    <Input 
                      id="title" 
                      name="title"
                      defaultValue={selectedBanner?.title || ''}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">설명 (선택사항)</Label>
                    <Textarea 
                      id="description" 
                      name="description"
                      defaultValue={selectedBanner?.description || ''}
                      rows={3}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>배너 이미지</Label>
                  <div 
                    className="border border-dashed rounded-md p-4 text-center"
                  >
                    {previewImage ? (
                      <div className="relative max-h-[200px] overflow-hidden rounded-md">
                        <img 
                          src={previewImage} 
                          alt="배너 미리보기" 
                          className="w-full h-auto max-h-[200px] object-contain"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => setPreviewImage(null)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                        <div className="text-sm text-muted-foreground mb-2">이미지를 업로드하세요</div>
                      </>
                    )}
                    
                    <div className="mt-2">
                      <label 
                        htmlFor="banner-image" 
                        className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer text-sm font-medium"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        이미지 선택
                      </label>
                      <input 
                        id="banner-image" 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImagePreview}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="linkUrl">링크 URL (선택사항)</Label>
                    <Input 
                      id="linkUrl" 
                      name="linkUrl"
                      defaultValue={selectedBanner?.linkUrl || ''}
                      placeholder="e.g., /courses/summer-special"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="target">링크 타겟</Label>
                    <Select 
                      name="target"
                      defaultValue={selectedBanner?.target || '_self'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="타겟 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_self">현재 창에서 열기</SelectItem>
                        <SelectItem value="_blank">새 창에서 열기</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="position">위치</Label>
                    <Select 
                      name="position" 
                      defaultValue={selectedBanner?.position || 'hero'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="위치 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {positionOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="status">상태</Label>
                    <Select 
                      name="status" 
                      defaultValue={selectedBanner?.status || 'active'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="상태 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">활성화</SelectItem>
                        <SelectItem value="inactive">비활성화</SelectItem>
                        <SelectItem value="scheduled">예약됨</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">시작일 (선택사항)</Label>
                    <Input 
                      id="startDate" 
                      name="startDate"
                      type="date" 
                      defaultValue={selectedBanner?.startDate || ''}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="endDate">종료일 (선택사항)</Label>
                    <Input 
                      id="endDate" 
                      name="endDate"
                      type="date" 
                      defaultValue={selectedBanner?.endDate || ''}
                    />
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setShowBannerModal(false)}
                >
                  취소
                </Button>
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  {modalMode === 'add' ? '배너 추가' : '배너 저장'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}