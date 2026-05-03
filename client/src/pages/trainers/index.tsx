import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, Filter, MapPin, Star, Briefcase, Award, Sparkles, X, AlertCircle, Loader2 } from "lucide-react";
import TrainerBannerImage from '@assets/stock_images/professional_certifi_526f360a.jpg';
import { PageBanner } from '@/components/PageBanner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth"; // 모듈화된 useAuth 훅 사용
import { UnifiedTrainerProfileModal } from "@/components/UnifiedTrainerProfileModal";
import { GoogleMapView } from "@/components/GoogleMapView";
import { useQuery } from "@tanstack/react-query";
import { TrainerRatingInline } from "@/components/business/TrainerRatingInline";

export default function Trainers() {
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTrainer, setSelectedTrainer] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showMemberAlert, setShowMemberAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState({ title: "", description: "" });
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  // 지도 팝업 관련 state
  const [showMapDialog, setShowMapDialog] = useState(false);
  const [selectedTrainerForMap, setSelectedTrainerForMap] = useState<any>(null);

  // 고급 필터링 상태
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [locationFilter, setLocationFilter] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState(200000);
  const [sortBy, setSortBy] = useState("rating");
  const [sortOrder, setSortOrder] = useState("desc");

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // 즐겨찾기 상태
  const [favorites, setFavorites] = useState<number[]>([]);

  // API에서 훈련사 데이터 로드
  const fetchTrainers = async () => {
    try {
      setLoading(true);
      setError(null);

        const params = new URLSearchParams();

        // 기본 필터
        if (filter !== "all") {
          if (filter === "certification") {
            params.append('certification', 'true');
          } else if (filter === "featured") {
            params.append('featured', 'true');
          } else {
            params.append('specialty', filter);
          }
        }

        // 고급 필터
        if (searchTerm) params.append('search', searchTerm);
        if (locationFilter) params.append('location', locationFilter);
        if (minRating > 0) params.append('minRating', minRating.toString());
        if (maxPrice < 200000) params.append('maxPrice', maxPrice.toString());

        // 정렬 및 페이지네이션
        params.append('sortBy', sortBy);
        params.append('sortOrder', sortOrder);
        params.append('page', currentPage.toString());
        params.append('limit', '12');
        params.append('withReviewSummary', 'true');

        const response = await fetch(`/api/trainers?${params.toString()}`, {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        if (!response.ok) {
          throw new Error('훈련사 데이터를 불러오는데 실패했습니다.');
        }

        const data = await response.json();
        setTrainers(data.trainers || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.totalCount || 0);
      } catch (err) {
        console.error('훈련사 데이터 로드 오류:', err);
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
        // 오류 시 기본 데이터 사용
        setTrainers(getDefaultTrainers());
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    fetchTrainers();
  }, [filter, locationFilter, minRating, maxPrice, sortBy, sortOrder, currentPage]);

  // 즐겨찾기 로드
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favoriteTrainers');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  // 즐겨찾기 토글
  const toggleFavorite = (trainerId: number) => {
    const newFavorites = favorites.includes(trainerId)
      ? favorites.filter(id => id !== trainerId)
      : [...favorites, trainerId];

    setFavorites(newFavorites);
    localStorage.setItem('favoriteTrainers', JSON.stringify(newFavorites));
  };

  // 기본 훈련사 데이터 (API 오류 시 사용)
  const getDefaultTrainers = () => [
    {
      id: 1,
      name: "김훈련",
      title: "수석 훈련사",
      specialty: "반려견 기본 훈련",
      avatar: "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200",
      background: "https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=350",
      location: "서울시 강남구",
      rating: 4.9,
      reviews: 56,
      courses: 5,
      experience: "10년+",
      category: "기본 훈련",
      certification: true,
      featured: true,
      bio: "10년 이상의 경력을 가진 전문 훈련사로서 수천 마리의 반려견을 교육했습니다."
    }
  ];

  const openTrainerModal = async (trainer: any) => {
    console.log("🔥 새 모달 시스템 - 프로필 보기 버튼 클릭:", trainer.name);
    
    // 최신 훈련사 데이터를 API에서 직접 가져오기
    try {
      const response = await fetch(`/api/trainers/${trainer.id}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (response.ok) {
        const latestTrainer = await response.json();
        console.log("🔥 새 모달 시스템 - 최신 훈련사 데이터:", { id: latestTrainer.id, name: latestTrainer.name, avatar: latestTrainer.avatar });
        setSelectedTrainer(latestTrainer);
      } else {
        console.log("API 응답 실패, 기존 데이터 사용:", trainer);
        setSelectedTrainer(trainer);
      }
    } catch (error) {
      console.error("훈련사 데이터 로드 실패:", error);
      setSelectedTrainer(trainer);
    }
    
    setIsModalOpen(true);
  };

  const closeTrainerModal = () => {
    console.log("훈련사 프로필 닫기");
    setIsModalOpen(false);
  };

  const handleViewCourses = (trainerId: number) => {
    console.log(`${trainerId}번 훈련사의 강의 목록 보기`);
    closeTrainerModal();
    setLocation(`/courses?trainer=${trainerId}`);
  };

  const handleBookConsultation = async (trainerId: number) => {
    console.log(`${trainerId}번 훈련사와 상담 예약하기`);

    if (!isAuthenticated) {
      closeTrainerModal();
      setAlertMessage({
        title: "회원 전용 서비스",
        description: "상담 예약은 로그인 후 이용 가능합니다. 로그인 페이지로 이동하시겠습니까?"
      });
      setShowMemberAlert(true);
      return;
    }

    try {
      // 실제 상담 예약 API 호출
      const response = await fetch(`/api/trainers/${trainerId}/consultation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 1, // 실제로는 현재 로그인한 사용자 ID
          date: new Date().toISOString().split('T')[0],
          time: "14:00",
          message: "상담 예약 요청입니다."
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('상담 예약 성공:', data);
        closeTrainerModal();
        setLocation(`/video-call?trainer=${trainerId}&consultation=${data.consultation.id}`);
      } else {
        console.error('상담 예약 실패');
        closeTrainerModal();
        setLocation(`/video-call?trainer=${trainerId}`);
      }
    } catch (error) {
      console.error('상담 예약 오류:', error);
      closeTrainerModal();
      setLocation(`/video-call?trainer=${trainerId}`);
    }
  };

  const handleCourseReservation = (trainerId: number) => {
    console.log(`${trainerId}번 훈련사의 화상수업 예약하기`);

    if (!isAuthenticated) {
      closeTrainerModal();
      setAlertMessage({
        title: "회원 전용 서비스",
        description: "화상수업 예약은 로그인 후 이용 가능합니다. 로그인 페이지로 이동하시겠습니까?"
      });
      setShowMemberAlert(true);
      return;
    }

    closeTrainerModal();
    setLocation(`/course-reservation?trainer=${trainerId}`);
  };

  const handleLocationClick = (trainer: any) => {
    console.log('위치 클릭:', trainer.name);
    setSelectedTrainerForMap(trainer);
    setShowMapDialog(true);
  };

  const handleLoginRedirect = () => {
    setShowMemberAlert(false);
    setLocation('/auth');
  };

  // 로딩 상태 처리
  if (loading) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-gray-600 dark:text-gray-400">훈련사 정보를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  // 에러 상태 처리
  if (error) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8 animate-slide-up">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
            <p className="text-destructive dark:text-destructive mb-4">{error}</p>
            <Button 
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchTrainers();
              }}
              className="focus-visible-enhanced"
            >
              다시 시도
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 검색 기능
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/trainers/search?q=${encodeURIComponent(searchTerm)}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const searchResults = await response.json();
        setTrainers(searchResults);
        setCurrentPage(1);
      } else {
        console.error('검색 실패');
      }
    } catch (error) {
      console.error('검색 중 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    // 실시간 검색 구현 (디바운스 적용)
    if (e.target.value.trim()) {
      const timer = setTimeout(() => {
        handleSearch();
      }, 500);
      return () => clearTimeout(timer);
    }
  };

  // 검색 결과 표시 (API에서 이미 필터링된 데이터 사용)
  const filteredTrainers = trainers;

  return (
    <div className="pb-8">
      <PageBanner
        imageSrc={TrainerBannerImage}
        imageAlt="TALEZ 인증 전문 훈련사"
        title="전문 반려견 훈련사"
        description="경험이 풍부한 인증 훈련사들이 당신과 반려견의 행복한 생활을 도와드립니다"
        onBannerClick={() => {
          const searchInput = document.querySelector('input[placeholder*="훈련사"]') as HTMLInputElement;
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
              placeholder="지역, 전문 분야로 훈련사 찾기" 
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              className="flex-1 py-2 px-2 bg-transparent focus:outline-none text-gray-800 dark:text-gray-200 focus-visible-enhanced"
              aria-label="훈련사 검색"
            />
            <Button 
              className="ml-2 focus-visible-enhanced" 
              onClick={handleSearch}
              aria-label="검색 실행"
            >
              검색
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-8 space-y-4">
        {/* 기본 필터 */}
        <div className="flex flex-wrap items-center gap-2">
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
            variant={filter === "certification" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("certification")}
            className="text-xs"
          >
            인증 훈련사
          </Button>

          <Button
            variant={filter === "featured" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("featured")}
            className="text-xs"
          >
            추천 훈련사
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
            variant={filter === "행동 교정" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("행동 교정")}
            className="text-xs"
          >
            행동 교정
          </Button>

          <Button
            variant={filter === "특수 훈련" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("특수 훈련")}
            className="text-xs"
          >
            특수 훈련
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="text-xs ml-auto"
          >
            고급 필터 {showAdvancedFilters ? '숨기기' : '보기'}
          </Button>
        </div>

        {/* 고급 필터 */}
        {showAdvancedFilters && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">지역</label>
                <input
                  type="text"
                  placeholder="예: 강남구"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">최소 평점</label>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value={0}>전체</option>
                  <option value={4.5}>4.5점 이상</option>
                  <option value={4.0}>4.0점 이상</option>
                  <option value={3.5}>3.5점 이상</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">최대 금액</label>
                <select
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value={200000}>제한 없음</option>
                  <option value={150000}>15만원 이하</option>
                  <option value={100000}>10만원 이하</option>
                  <option value={50000}>5만원 이하</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">정렬 기준</label>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [sort, order] = e.target.value.split('-');
                    setSortBy(sort);
                    setSortOrder(order);
                  }}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="rating-desc">평점 높은순</option>
                  <option value="reviews-desc">후기 많은순</option>
                  <option value="experience-desc">경력 많은순</option>
                  <option value="price-asc">가격 낮은순</option>
                  <option value="price-desc">가격 높은순</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
              <span>총 {totalCount}명의 훈련사</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLocationFilter("");
                  setMinRating(0);
                  setMaxPrice(200000);
                  setSortBy("rating");
                  setSortOrder("desc");
                  setCurrentPage(1);
                }}
              >
                필터 초기화
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Trainers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTrainers.map((trainer) => (
          <Card 
            key={trainer.id} 
            className="overflow-hidden border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">

            {/* 프로필 이미지를 맨 위로 이동 */}
            <div className="relative h-24 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full overflow-hidden shadow-xl border-2 border-white dark:border-gray-700 bg-white dark:bg-gray-800">
                <img 
                  src={trainer.avatar || trainer.image || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(trainer.name)}&backgroundColor=6366f1&textColor=ffffff`}
                  alt={trainer.name} 
                  className="w-full h-full object-cover" 
                  style={{ 
                    filter: 'none !important', 
                    WebkitFilter: 'none !important'
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(trainer.name)}&backgroundColor=6366f1&textColor=ffffff`;
                  }}
                />
              </div>

              {trainer.featured && (
                <Badge variant="warning" className="absolute top-2 right-2">
                  <Sparkles className="h-3 w-3 mr-1" />
                  추천 훈련사
                </Badge>
              )}
            </div>

            <div className="p-5">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">{trainer.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">{trainer.title}</p>
              </div>

              <div className="space-y-3 mb-4">
                <div 
                  className="flex items-center cursor-pointer hover:text-primary transition-colors group"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLocationClick(trainer);
                  }}
                  data-testid={`location-${trainer.id}`}
                >
                  <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2 group-hover:text-primary" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:underline">{trainer.location}</span>
                </div>

                <TrainerRatingInline
                  trainerId={trainer.id}
                  fallbackRating={trainer.rating}
                  fallbackReviews={trainer.reviews}
                  initialAverage={trainer.ratingSummary?.average}
                  initialCount={trainer.ratingSummary?.count}
                />

                <div className="flex items-center">
                  <Briefcase className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">경력 {trainer.experience}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-foreground">
                  {trainer.specialty}
                </Badge>

                {trainer.certification && (
                  <Badge variant="success" className="flex items-center">
                    <Award className="h-3 w-3 mr-1" />
                    인증
                  </Badge>
                )}
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                {trainer.bio}
              </p>

              <div className="flex justify-between items-center">
                <div className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400">강의 </span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{trainer.courses}개</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(trainer.id);
                    }}
                    className="h-8 w-8"
                  >
                    <Star 
                      className={`h-4 w-4 ${
                        favorites.includes(trainer.id) 
                          ? 'fill-warning text-warning' 
                          : 'text-gray-400'
                      }`} 
                    />
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => {
                      console.log("프로필 보기 버튼 클릭:", trainer.name);
                      openTrainerModal(trainer);
                    }}
                  >
                    프로필 보기
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex justify-center">
          <nav className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="text-sm"
            >
              이전
            </Button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="text-sm"
                >
                  {pageNum}
                </Button>
              );
            })}

            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="text-sm"
            >
              다음
            </Button>
          </nav>
        </div>
      )}

      {/* 회원 전용 서비스 알림 */}
      <AlertDialog open={showMemberAlert} onOpenChange={setShowMemberAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 text-warning mr-2" />
              {alertMessage.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {alertMessage.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowMemberAlert(false)}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleLoginRedirect}>
              로그인 페이지로 이동
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 위치 지도 팝업 */}
      <Dialog open={showMapDialog} onOpenChange={setShowMapDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              {selectedTrainerForMap?.name} - 위치
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 훈련사 정보 */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                  <img 
                    src={selectedTrainerForMap?.avatar || selectedTrainerForMap?.image || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedTrainerForMap?.name || '')}&backgroundColor=6366f1&textColor=ffffff`}
                    alt={selectedTrainerForMap?.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base mb-1">{selectedTrainerForMap?.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{selectedTrainerForMap?.title}</p>
                  <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <MapPin className="h-4 w-4 mr-1" />
                    {selectedTrainerForMap?.location}
                  </div>
                </div>
              </div>
            </div>

            {/* 지도 */}
            {selectedTrainerForMap && (selectedTrainerForMap.latitude && selectedTrainerForMap.longitude) ? (
              <GoogleMapView
                locations={[
                  {
                    id: selectedTrainerForMap.id,
                    name: selectedTrainerForMap.name,
                    address: selectedTrainerForMap.location || selectedTrainerForMap.address || '',
                    type: 'trainer',
                    coordinates: {
                      lat: parseFloat(selectedTrainerForMap.latitude),
                      lng: parseFloat(selectedTrainerForMap.longitude)
                    }
                  }
                ]}
                center={{
                  lat: parseFloat(selectedTrainerForMap.latitude),
                  lng: parseFloat(selectedTrainerForMap.longitude)
                }}
                height="400px"
                zoom={15}
              />
            ) : (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 text-center">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  이 훈련사의 정확한 위치 정보가 등록되어 있지 않습니다.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  주소: {selectedTrainerForMap?.location || '정보 없음'}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 트레이너 프로필 모달 */}
      {isModalOpen && selectedTrainer && (
        <UnifiedTrainerProfileModal
          trainer={selectedTrainer}
          isOpen={isModalOpen}
          onClose={closeTrainerModal}
          onReservationClick={(trainer) => {
            console.log(`${trainer.id}번 훈련사의 화상수업 예약하기`);
            closeTrainerModal();
          }}
        />
      )}
    </div>
  );
}