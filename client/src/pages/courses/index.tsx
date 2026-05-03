import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, Filter, SlidersHorizontal, Star, BookOpen, Package, Video, VideoOff, Play, Clock, Eye, ChevronRight, ShoppingCart, Heart, Share2, LayoutGrid, List, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import CoursesBannerImage from '@assets/stock_images/online_pet_dog_train_c9e8e79a.jpg';
import { PageBanner } from '@/components/PageBanner';

interface CoursesPageProps {
  mode?: 'view' | 'create' | 'edit';
  userType?: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  duration: number;
  modules: any[];
  trainerName: string;
  status: 'draft' | 'published' | 'archived';
  enrollmentCount?: number;
  averageRating?: number;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl?: string;
  hasAnyVideo?: boolean;
  totalVideos?: number;
  modulesWithVideoCount?: number;
}

export default function Courses(props?: CoursesPageProps) {
  const { mode = 'view', userType } = props || {};
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Advanced filter states
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
  const [hasVideoOnly, setHasVideoOnly] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [durationRange, setDurationRange] = useState<[number, number]>([0, 600]);
  
  const { toast } = useToast();

  // 강의 구매 처리 함수
  const handlePurchase = (courseId: string | number) => {
    console.log('강의 구매 클릭:', courseId);
    navigate(`/checkout?courseId=${courseId}&type=course`);
  };

  // 강좌 상세보기 핸들러
  const handleCourseDetail = (courseId: number) => {
    console.log('강좌 상세보기 클릭:', courseId);
    navigate(`/courses/${courseId}`);
  };

  // 강좌 참여하기 핸들러
  const handleJoinCourse = (courseId: string) => {
    console.log('강좌 참여하기 클릭:', courseId);
    // 로그인 체크 후 수강 신청 프로세스 시작
    handleEnroll();
  };

  // 미리보기 핸들러
  const handlePreview = (courseId: string) => {
    console.log('미리보기 클릭:', courseId);
    const course = courses.find(c => c.id === courseId);
    if (course) {
      setSelectedCourse(course);
      setShowCourseModal(true);
    }
  };

  // 수강신청 핸들러
  const handleEnroll = () => {
    toast({
      title: "수강신청 완료",
      description: "수강신청이 완료되었습니다!",
    });
    setShowCourseModal(false);
  };

  // 영상 재생 핸들러
  const handlePlayVideo = (module: any) => {
    setSelectedModule(module);
    setShowVideoModal(true);
  };

  // 상품 정보 핸들러
  const handleProductClick = (productName: string) => {
    // 실제 상품 정보를 위한 mock 데이터 생성
    const productInfo = {
      name: productName,
      price: Math.floor(Math.random() * 50000) + 5000,
      description: `${productName}에 대한 상세한 설명입니다. 반려견 훈련에 꼭 필요한 전문 용품으로 높은 품질을 자랑합니다.`,
      image: `/attached_assets/image_1746582251297.png`,
      category: "훈련용품",
      rating: 4.5,
      reviews: Math.floor(Math.random() * 200) + 10,
      inStock: true,
      brand: "TALEZ",
      features: [
        "고품질 소재 사용",
        "반려견 안전 인증",
        "훈련 전문가 추천",
        "내구성 보장"
      ]
    };
    setSelectedProduct(productInfo);
    setShowProductModal(true);
  };

  // 장바구니 추가 핸들러
  const handleAddToCart = () => {
    toast({
      title: "장바구니에 추가됨",
      description: `${selectedProduct?.name}이(가) 장바구니에 추가되었습니다.`,
    });
    setShowProductModal(false);
  };

  // 상품 구매 핸들러
  const handleBuyProduct = () => {
    if (selectedProduct) {
      // 결제 페이지로 이동하면서 상품 정보 전달
      const productData = {
        id: `product_${Date.now()}`,
        name: selectedProduct.name,
        price: selectedProduct.price,
        image: selectedProduct.image,
        type: 'product'
      };
      
      // URL 파라미터로 상품 정보 전달
      const queryParams = new URLSearchParams({
        productId: productData.id,
        productName: productData.name,
        price: productData.price.toString(),
        type: productData.type
      });
      
      const url = `/checkout?${queryParams.toString()}`;
      console.log('상품 구매 URL:', url);
      
      // wouter를 사용하여 페이지 이동
      navigate(url);
      setShowProductModal(false);
    }
  };

  // 실제 등록된 커리큘럼에서 발행된 강의만 조회
  const fetchPublishedCourses = async () => {
    try {
      setLoading(true);
      console.log('🔥 강의 찾기 - 발행된 강의 목록 조회 시작');
      
      const response = await fetch('/api/public/curriculums');
      if (response.ok) {
        const data = await response.json();
        console.log('🔥 커리큘럼 데이터:', data);
        
        // 공개 API는 이미 발행된 커리큘럼만 반환하므로 추가 필터링 불필요
        const publishedCourses = (data.curriculums || [])
          .map((curriculum: any) => {
            // 각 모듈의 영상 정보 포함하여 매핑
            const modulesWithVideos = (curriculum.modules || []).map((module: any) => ({
              ...module,
              hasVideo: module.videos && module.videos.length > 0,
              videoCount: module.videos ? module.videos.length : 0,
              videos: module.videos || []
            }));
            
            // 전체 강의의 영상 통계
            const totalVideos = modulesWithVideos.reduce((sum: number, module: any) => sum + module.videoCount, 0);
            const modulesWithVideoCount = modulesWithVideos.filter((module: any) => module.hasVideo).length;
            
            return {
              id: curriculum.id,
              title: curriculum.title,
              description: curriculum.description,
              price: curriculum.price || 0,
              difficulty: curriculum.difficulty || 'beginner',
              category: curriculum.category || '기본 훈련',
              duration: curriculum.duration || 0,
              modules: modulesWithVideos,
              trainerName: curriculum.trainerName || '전문 훈련사',
              status: curriculum.status,
              enrollmentCount: curriculum.enrollmentCount || 0,
              averageRating: curriculum.averageRating || 0,
              createdAt: curriculum.createdAt || new Date().toISOString(),
              updatedAt: curriculum.updatedAt || new Date().toISOString(),
              // 영상 관련 정보 추가
              totalVideos,
              modulesWithVideoCount,
              hasAnyVideo: totalVideos > 0
            };
          });
        
        console.log('🔥 발행된 강의 목록:', publishedCourses);
        setCourses(publishedCourses);
      } else {
        console.error('🔥 커리큘럼 API 응답 실패:', response.status);
        toast({
          title: "오류",
          description: "강의 목록을 불러오는데 실패했습니다.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('🔥 강의 데이터 로딩 실패:', error);
      toast({
        title: "오류",
        description: "강의 목록을 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublishedCourses();
  }, []);

  // 필터링된 강의 목록
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.trainerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Basic filter (difficulty or category)
    let matchesBasicFilter = true;
    if (filter === "all") matchesBasicFilter = true;
    else if (filter === "beginner") matchesBasicFilter = course.difficulty === "beginner";
    else if (filter === "intermediate") matchesBasicFilter = course.difficulty === "intermediate";
    else if (filter === "advanced") matchesBasicFilter = course.difficulty === "advanced";
    else matchesBasicFilter = course.category === filter;
    
    // Advanced filters
    const matchesPrice = course.price >= priceRange[0] && course.price <= priceRange[1];
    const matchesDuration = course.duration >= durationRange[0] && course.duration <= durationRange[1];
    const matchesRating = minRating === 0 || (course.averageRating ?? 0) >= minRating;
    const matchesVideo = !hasVideoOnly || course.hasAnyVideo === true;
    
    return matchesSearch && matchesBasicFilter && matchesPrice && matchesDuration && matchesRating && matchesVideo;
  });

  // 페이지네이션을 위한 현재 페이지 강의 목록
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCourses = filteredCourses.slice(startIndex, endIndex);

  // 검색/필터 변경 시 첫 페이지로 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filter, priceRange, durationRange, minRating, hasVideoOnly]);

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return <Badge variant="success">초급</Badge>;
      case 'intermediate':
        return <Badge className="bg-primary text-white">중급</Badge>;
      case 'advanced':
        return <Badge variant="danger">고급</Badge>;
      default:
        return <Badge variant="secondary">미설정</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">강의 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 검색 기능
  const handleSearch = () => {
    console.log('검색 실행:', searchTerm);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    console.log('검색어 변경:', e.target.value);
  };

  return (
    <div className="pb-8">
      <PageBanner
        imageSrc={CoursesBannerImage}
        imageAlt="반려견 전문 교육 과정"
        title="체계적인 반려견 교육"
        description="평생 함께할 반려견에게 필요한 훈련과 교육을 전문가와 함께 시작하세요"
        onBannerClick={() => {
          const searchInput = document.querySelector('input[placeholder*="강의"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          }
        }}
      />

      {/* 검색 섹션 */}
      <div className="mb-8 px-4 sm:px-6 lg:px-8 mt-8">
        <div className="max-w-2xl mx-auto">
          
          {/* Search Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex items-center p-2">
            <div className="px-2">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="원하는 강의를 검색하세요" 
              value={searchTerm}
              onChange={handleSearchChange}
              className="flex-1 py-2 px-2 bg-transparent focus:outline-none text-gray-800 dark:text-gray-200"
            />
            <Button className="ml-2" onClick={handleSearch}>
              검색
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mr-4">
          <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400 ml-2 mr-1" />
          <span className="text-sm text-gray-700 dark:text-gray-300 mr-2">필터:</span>
        </div>

        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
          className="text-xs"
        >
          전체
        </Button>

        <Button
          variant={filter === "beginner" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("beginner")}
          className="text-xs"
        >
          초급
        </Button>

        <Button
          variant={filter === "intermediate" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("intermediate")}
          className="text-xs"
        >
          중급
        </Button>

        <Button
          variant={filter === "advanced" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("advanced")}
          className="text-xs"
        >
          고급
        </Button>

        <Button
          variant={filter === "기본 훈련" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("기본 훈련")}
          className="text-xs"
        >
          기본 훈련
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="ml-auto text-xs"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 mr-1" />
          고급 필터
        </Button>

        {/* View Mode Toggle */}
        <div className="flex border rounded-md overflow-hidden">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none px-3"
            onClick={() => setViewMode('grid')}
            data-testid="button-view-grid"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none px-3"
            onClick={() => setViewMode('list')}
            data-testid="button-view-list"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700" data-testid="advanced-filters-panel">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">고급 필터</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowAdvancedFilters(false)}
              data-testid="button-close-filters"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Price Range */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">가격 범위</Label>
              <Slider
                value={[priceRange[0], priceRange[1]]}
                onValueChange={(value) => setPriceRange([value[0], value[1]])}
                min={0}
                max={500000}
                step={10000}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{priceRange[0].toLocaleString()}원</span>
                <span>{priceRange[1].toLocaleString()}원</span>
              </div>
            </div>

            {/* Duration Range */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">강의 시간 (분)</Label>
              <Slider
                value={[durationRange[0], durationRange[1]]}
                onValueChange={(value) => setDurationRange([value[0], value[1]])}
                min={0}
                max={600}
                step={30}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{durationRange[0]}분</span>
                <span>{durationRange[1]}분</span>
              </div>
            </div>

            {/* Minimum Rating */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">최소 평점</Label>
              <div className="flex items-center gap-2">
                {[0, 1, 2, 3, 4, 5].map((rating) => (
                  <Button
                    key={rating}
                    variant={minRating === rating ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setMinRating(rating)}
                    data-testid={`button-rating-${rating}`}
                  >
                    {rating === 0 ? "전체" : rating}
                  </Button>
                ))}
              </div>
              {minRating > 0 && (
                <div className="flex items-center text-xs text-gray-500">
                  <Star className="h-3 w-3 text-warning fill-warning mr-1" />
                  {minRating}점 이상
                </div>
              )}
            </div>

            {/* Video Only Toggle */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">추가 옵션</Label>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="hasVideoOnly" 
                  checked={hasVideoOnly}
                  onCheckedChange={(checked) => setHasVideoOnly(checked as boolean)}
                  data-testid="checkbox-video-only"
                />
                <Label htmlFor="hasVideoOnly" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                  영상 강의만 보기
                </Label>
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setPriceRange([0, 500000]);
                setHasVideoOnly(false);
                setSelectedCategories([]);
                setMinRating(0);
                setDurationRange([0, 600]);
              }}
              data-testid="button-reset-filters"
            >
              초기화
            </Button>
            <Button 
              size="sm"
              onClick={() => {
                toast({
                  title: "필터 적용됨",
                  description: "선택한 필터가 적용되었습니다.",
                });
                setShowAdvancedFilters(false);
              }}
              data-testid="button-apply-filters"
            >
              필터 적용
            </Button>
          </div>
        </div>
      )}

      {/* Course Grid/List */}
      <div className={viewMode === 'grid' 
        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
        : "flex flex-col gap-4"
      }>
        {currentCourses.length > 0 ? (
          currentCourses.map((course) => (
            viewMode === 'grid' ? (
              // Grid View Card
              <Card key={course.id} className="overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow" data-testid={`card-course-${course.id}`}>
                <div className="relative h-40 overflow-hidden">
                  {course.thumbnailUrl ? (
                    <img 
                      src={course.thumbnailUrl} 
                      alt={course.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.className += ' bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center';
                          parent.innerHTML += course.hasAnyVideo 
                            ? '<div class="w-16 h-16 text-success"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></div>'
                            : '<div class="w-16 h-16 text-primary"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div>';
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                      {course.hasAnyVideo ? (
                        <Video className="w-16 h-16 text-success" />
                      ) : (
                        <BookOpen className="w-16 h-16 text-primary" />
                      )}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20"></div>
                  <Badge variant="default" className="absolute top-2 right-2">
                    발행됨
                  </Badge>
                  {course.hasAnyVideo && (
                    <Badge className="absolute top-2 left-2 bg-success text-white">
                      <Video className="w-3 h-3 mr-1" />
                      영상 {course.totalVideos}개
                    </Badge>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">{course.title}</h3>

                  <div className="flex items-center mb-2">
                    <Star className="h-4 w-4 text-warning fill-warning" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 ml-1 mr-2">
                      {course.averageRating || 0}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({course.enrollmentCount || 0} 수강생)
                    </span>

                    <div className="ml-auto">
                      {getDifficultyBadge(course.difficulty)}
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                    {course.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Avatar className="w-7 h-7">
                        <AvatarFallback>{course.trainerName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="ml-2 text-xs text-gray-700 dark:text-gray-300">{course.trainerName}</span>
                    </div>

                    <span className="font-medium text-sm text-primary">{course.price.toLocaleString()}원</span>
                  </div>

                  <div className="mt-3 text-xs text-gray-500">
                    <span>{Math.floor(course.duration / 60)}시간 {course.duration % 60}분</span>
                    <span className="mx-2">•</span>
                    <span>{course.modules.length}개 모듈</span>
                    {course.hasAnyVideo && (
                      <>
                        <span className="mx-2">•</span>
                        <span className="text-success font-medium">
                          <Video className="w-3 h-3 inline mr-1" />
                          영상 {course.modulesWithVideoCount}/{course.modules.length}
                        </span>
                      </>
                    )}
                    <span className="mx-2">•</span>
                    <span>{course.category}</span>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 px-5 py-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => handlePreview(course.id)}
                    >
                      미리보기
                    </Button>
                    <Button 
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => handlePurchase(course.id)}
                    >
                      구매하기
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              // List View Card
              <Card key={course.id} className="overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow" data-testid={`card-course-list-${course.id}`}>
                <div className="flex flex-col sm:flex-row">
                  {/* Thumbnail */}
                  <div className="relative w-full sm:w-48 h-32 sm:h-auto flex-shrink-0 overflow-hidden">
                    {course.thumbnailUrl ? (
                      <img 
                        src={course.thumbnailUrl} 
                        alt={course.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.className += ' bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center';
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full min-h-[100px] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                        {course.hasAnyVideo ? (
                          <Video className="w-12 h-12 text-success" />
                        ) : (
                          <BookOpen className="w-12 h-12 text-primary" />
                        )}
                      </div>
                    )}
                    <Badge variant="default" className="absolute top-2 left-2 text-xs">
                      발행됨
                    </Badge>
                    {course.hasAnyVideo && (
                      <Badge className="absolute bottom-2 left-2 bg-success text-white text-xs">
                        <Video className="w-3 h-3 mr-1" />
                        영상 {course.totalVideos}개
                      </Badge>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">{course.title}</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-warning fill-warning" />
                            <span className="text-sm text-gray-700 dark:text-gray-300 ml-1">
                              {course.averageRating || 0}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({course.enrollmentCount || 0} 수강생)
                          </span>
                          {getDifficultyBadge(course.difficulty)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-lg text-primary">{course.price.toLocaleString()}원</span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                      {course.description}
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                        <div className="flex items-center">
                          <Avatar className="w-6 h-6 mr-1">
                            <AvatarFallback className="text-xs">{course.trainerName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span>{course.trainerName}</span>
                        </div>
                        <span>{Math.floor(course.duration / 60)}시간 {course.duration % 60}분</span>
                        <span>{course.modules.length}개 모듈</span>
                        {course.hasAnyVideo && (
                          <span className="text-success font-medium">
                            <Video className="w-3 h-3 inline mr-1" />
                            영상 {course.modulesWithVideoCount}/{course.modules.length}
                          </span>
                        )}
                        <span>{course.category}</span>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-xs"
                          onClick={() => handlePreview(course.id)}
                        >
                          미리보기
                        </Button>
                        <Button 
                          size="sm"
                          className="text-xs"
                          onClick={() => handlePurchase(course.id)}
                        >
                          구매하기
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">현재 발행된 강의가 없습니다.</p>
            <p className="text-gray-400 text-sm">관리자가 강의를 발행하면 이곳에 표시됩니다.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredCourses.length > itemsPerPage && (
        <div className="mt-10 flex justify-center">
          <nav className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              이전
            </Button>
            
            {Array.from({ length: Math.ceil(filteredCourses.length / itemsPerPage) }, (_, i) => i + 1)
              .filter(page => {
                const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);
                if (totalPages <= 7) return true;
                if (page === 1 || page === totalPages) return true;
                if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                return false;
              })
              .map((page, index, array) => {
                const shouldShowEllipsis = index > 0 && array[index - 1] !== page - 1;
                return (
                  <div key={page} className="flex items-center">
                    {shouldShowEllipsis && (
                      <span className="px-2 text-gray-500 dark:text-gray-400">...</span>
                    )}
                    <Button
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className="text-sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  </div>
                );
              })}
            
            <Button 
              variant="outline" 
              size="sm" 
              className="text-sm"
              onClick={() => setCurrentPage(Math.min(Math.ceil(filteredCourses.length / itemsPerPage), currentPage + 1))}
              disabled={currentPage === Math.ceil(filteredCourses.length / itemsPerPage)}
            >
              다음
            </Button>
          </nav>
        </div>
      )}

      {/* 강의 상세 정보 모달 */}
      <Dialog open={showCourseModal} onOpenChange={setShowCourseModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {selectedCourse?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedCourse && (
            <div className="space-y-6">
              {/* 기본 정보 */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="text-sm">
                    {selectedCourse.category}
                  </Badge>
                  {getDifficultyBadge(selectedCourse.difficulty)}
                  <span className="text-sm text-gray-500">
                    {Math.floor(selectedCourse.duration / 60)}시간 {selectedCourse.duration % 60}분
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>{selectedCourse.trainerName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{selectedCourse.trainerName}</span>
                  </div>
                  <span className="text-2xl font-bold text-primary">
                    {selectedCourse.price.toLocaleString()}원
                  </span>
                </div>
              </div>

              {/* 강의 소개 */}
              <div>
                <h4 className="text-lg font-semibold mb-3">강의 소개</h4>
                <p className="text-gray-700 leading-relaxed">{selectedCourse.description}</p>
              </div>

              {/* 커리큘럼 모듈 */}
              {selectedCourse.modules && selectedCourse.modules.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold mb-3">커리큘럼</h4>
                  <div className="space-y-3">
                    {selectedCourse.modules.map((module: any, index: number) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-semibold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <h5 className="font-semibold text-gray-900 mb-1">{module.title}</h5>
                            {module.description && (
                              <p className="text-gray-600 text-sm mb-2">{module.description}</p>
                            )}
                            
                            {/* 시간 및 가격 정보 */}
                            <div className="flex items-center gap-4 mb-3">
                              {module.duration && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm text-gray-500">{module.duration}분</span>
                                </div>
                              )}
                              {module.price !== undefined && (
                                <div className="flex items-center gap-1">
                                  <span className="text-sm text-gray-500">
                                    {module.isFree ? '무료' : `${module.price?.toLocaleString()}원`}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* 준비물 정보 */}
                            {module.materials && module.materials.length > 0 && (
                              <div className="mb-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <Package className="w-4 h-4 text-primary" />
                                  <span className="text-sm font-medium text-gray-700">준비물</span>
                                </div>
                                <div className="flex flex-wrap gap-1 ml-6">
                                  {module.materials.map((material: string, idx: number) => (
                                    <Badge 
                                      key={idx} 
                                      variant="outline" 
                                      className="text-xs cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary transition-colors"
                                      onClick={() => handleProductClick(material)}
                                    >
                                      {material}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* 영상 정보 */}
                            <div className="mt-3">
                              {module.hasVideo ? (
                                <div className="flex items-center justify-between gap-2 p-3 bg-success/10 rounded-lg border border-success/30">
                                  <div className="flex items-center gap-2">
                                    <Video className="w-4 h-4 text-success" />
                                    <span className="text-sm font-medium text-success">
                                      영상 강의 {module.videoCount}개 업로드됨
                                    </span>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-success text-white border-success/50 hover:bg-success/90"
                                    onClick={() => handlePlayVideo(module)}
                                  >
                                    <Play className="w-3 h-3 mr-1" />
                                    재생
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                  <VideoOff className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm text-gray-600">영상 준비 중...</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 하단 버튼 */}
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCourseModal(false)}
                  className="flex-1"
                >
                  닫기
                </Button>
                <Button 
                  onClick={handleEnroll}
                  className="flex-1"
                >
                  수강 신청
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 영상 재생 모달 */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {selectedModule?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedModule && (
            <div className="space-y-4">
              {/* 영상 플레이어 */}
              <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                {selectedModule.videoUrl ? (
                  <video 
                    controls 
                    className="w-full h-full rounded-lg"
                    src={selectedModule.videoUrl}
                  >
                    브라우저에서 비디오를 지원하지 않습니다.
                  </video>
                ) : selectedModule.attachments?.some((att: any) => att.type === 'video') ? (
                  <video 
                    controls 
                    className="w-full h-full rounded-lg"
                    src={selectedModule.attachments.find((att: any) => att.type === 'video')?.url}
                  >
                    브라우저에서 비디오를 지원하지 않습니다.
                  </video>
                ) : (
                  <div className="text-center text-white">
                    <VideoOff className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">영상 준비 중</p>
                    <p className="text-sm opacity-75">곧 업로드될 예정입니다.</p>
                  </div>
                )}
              </div>

              {/* 모듈 정보 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">{selectedModule.title}</h4>
                {selectedModule.description && (
                  <p className="text-gray-600 text-sm mb-3">{selectedModule.description}</p>
                )}
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {selectedModule.duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{selectedModule.duration}분</span>
                    </div>
                  )}
                  {selectedModule.price !== undefined && (
                    <div className="flex items-center gap-1">
                      <span>{selectedModule.isFree ? '무료' : `${selectedModule.price?.toLocaleString()}원`}</span>
                    </div>
                  )}
                </div>

                {/* 준비물 */}
                {selectedModule.materials && selectedModule.materials.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-primary" />
                      <span className="font-medium text-gray-700">준비물</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedModule.materials.map((material: string, idx: number) => (
                        <Badge 
                          key={idx} 
                          variant="outline" 
                          className="text-xs cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary transition-colors"
                          onClick={() => handleProductClick(material)}
                        >
                          {material}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 닫기 버튼 */}
              <div className="flex justify-end">
                <Button 
                  onClick={() => setShowVideoModal(false)}
                  variant="outline"
                >
                  닫기
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 상품 정보 팝업 모달 */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              상품 정보
            </DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-6">
              {/* 상품 이미지 */}
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <img 
                  src={selectedProduct.image} 
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* 상품 기본 정보 */}
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedProduct.name}
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-sm">
                        {selectedProduct.category}
                      </Badge>
                      <Badge variant="outline" className="text-sm">
                        {selectedProduct.brand}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary mb-1">
                      {selectedProduct.price.toLocaleString()}원
                    </div>
                    <div className="text-sm text-success">
                      {selectedProduct.inStock ? '재고 있음' : '품절'}
                    </div>
                  </div>
                </div>

                {/* 평점 및 리뷰 */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-warning fill-warning" />
                    <span className="font-medium">{selectedProduct.rating}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {selectedProduct.reviews}개 리뷰
                  </div>
                </div>

                {/* 상품 설명 */}
                <div>
                  <h4 className="font-semibold mb-2">상품 설명</h4>
                  <p className="text-gray-700 leading-relaxed">
                    {selectedProduct.description}
                  </p>
                </div>

                {/* 상품 특징 */}
                <div>
                  <h4 className="font-semibold mb-2">상품 특징</h4>
                  <ul className="space-y-1">
                    {selectedProduct.features.map((feature: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-3 pt-4 border-t">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Heart className="w-4 h-4" />
                    찜하기
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Share2 className="w-4 h-4" />
                    공유
                  </Button>
                </div>
                <div className="flex-1 flex gap-2">
                  <Button 
                    variant="outline"
                    className="flex-1 flex items-center gap-1"
                    onClick={handleAddToCart}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    장바구니
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={handleBuyProduct}
                    disabled={!selectedProduct.inStock}
                  >
                    구매하기
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}