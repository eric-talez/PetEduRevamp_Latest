import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Search, Filter, Briefcase, Award, Sparkles, Loader2 } from 'lucide-react';
import { UnifiedTrainerProfileModal, type UnifiedTrainer } from '@/components/UnifiedTrainerProfileModal';
import { TalezTrainerCertificationBadge } from '@/components/business/TalezTrainerCertificationBadge';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

export default function Trainers() {
  const [selectedTrainer, setSelectedTrainer] = useState<UnifiedTrainer | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCertifiedOnly, setShowCertifiedOnly] = useState(false);

  // API로부터 트레이너 데이터 가져오기
  const { data: trainersResponse, isLoading, error } = useQuery<{trainers: UnifiedTrainer[], pagination: any, filters: any}>({
    queryKey: ['/api/trainers'],
  });

  // 상태 변경 감지
  useEffect(() => {
    console.log("Trainers - 상태 변경:", { selectedTrainer: selectedTrainer?.name, isProfileOpen });
  }, [selectedTrainer, isProfileOpen]);

  // 데이터 로딩 상태 처리
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <p>훈련사 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    console.error("훈련사 데이터 로딩 오류:", error);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <p className="text-destructive mb-4">훈련사 정보를 불러오는데 문제가 발생했습니다.</p>
        <Button onClick={() => window.location.reload()}>다시 시도</Button>
      </div>
    );
  }

  // API에서 가져온 데이터 또는 기본 빈 배열
  const trainers: UnifiedTrainer[] = trainersResponse?.trainers || [];

  // 훈련사 프로필 열기
  const openTrainerProfile = (trainer: UnifiedTrainer) => {
    console.log("프로필 열기 클릭", trainer.name);
    try {
      setSelectedTrainer(trainer);
      setIsProfileOpen(true);
      console.log("isProfileOpen 값:", true);
      // 디버깅을 위한 추가 로그
      setTimeout(() => {
        console.log("모달 상태 확인:", { 
          isOpen: isProfileOpen, 
          selectedTrainer: selectedTrainer?.name 
        });
      }, 100);
    } catch (error) {
      console.error("프로필 열기 오류:", error);
    }
  };

  // 필터된 훈련사 목록
  const getFilteredTrainers = () => {
    let filtered = [...trainers];

    // 검색어 필터링
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(trainer => 
        trainer.name.toLowerCase().includes(query) ||
        trainer.specialty.toLowerCase().includes(query) ||
        trainer.location?.toLowerCase().includes(query) ||
        trainer.description.toLowerCase().includes(query)
      );
    }

    // TALEZ 인증 필터링
    if (showCertifiedOnly) {
      // 샘플 데이터에서는 모든 훈련사를 인증된 것으로 표시하므로 필터링하지 않음
      // 실제 구현에서는 trainer.talezCertificationStatus === 'verified' 조건 사용
      filtered = filtered; // 모든 훈련사가 인증된 것으로 간주
    }

    // 카테고리 필터링
    if (filter !== "all") {
      filtered = filtered.filter(trainer => {
        if (filter === "certification") {
          return trainer.certifications && trainer.certifications.some(cert => cert.includes("공인") || cert.includes("인증"));
        } else if (filter === "featured") {
          return trainer.rating >= 4.8;
        } else {
          return trainer.specialty.includes(filter);
        }
      });
    }

    return filtered;
  };

  const filteredTrainers = getFilteredTrainers();

  return (
    <div className="py-8 px-4 sm:px-6">
      {/* Banner */}
      <div className="relative rounded-xl overflow-hidden h-48 md:h-64 mb-8 bg-gradient-to-r from-primary/80 to-accent/80 shadow-lg">
        <img 
          src="/attached_assets/KakaoTalk_Photo_2025-07-05-22-37-00 001_1751722697059.png" 
          alt="훈련사 찾기"
          className="w-full h-full object-cover absolute"
        />

        {/* 이미지 필터 제거하여 원본 이미지 표시 */}

        <div className="relative h-full flex flex-col justify-center px-6 md:px-10">
          <h1 className="text-gray-900 dark:text-white text-xl md:text-3xl font-bold mb-2 md:mb-4 max-w-xl bg-white/95 dark:bg-gray-800/95 p-3 rounded-lg shadow-sm">
            전문 반려견 훈련사를 만나보세요
          </h1>
          <p className="text-gray-800 dark:text-gray-200 text-sm md:text-base max-w-xl mb-4 bg-white/95 dark:bg-gray-800/95 p-3 rounded-lg shadow-sm">
            경험이 풍부한 훈련사들이 당신과 반려견의 행복한 생활을 도와드립니다.
          </p>

          {/* Search Bar */}
          <div className="max-w-lg bg-white dark:bg-gray-800 rounded-lg flex items-center p-1">
            <div className="px-2">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="지역, 전문 분야로 훈련사 찾기" 
              className="flex-1 py-2 px-2 bg-transparent focus:outline-none text-gray-800 dark:text-gray-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button 
              className="ml-2 bg-primary hover:bg-primary/90 text-white font-semibold border border-primary/10 shadow-sm"
              aria-label="훈련사 검색"
            >
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
          className={cn(
            "text-xs font-medium transition-all duration-200",
            filter === "all" 
              ? "bg-primary hover:bg-primary/90 text-white border-primary shadow-sm" 
              : "border-2 border-input hover:bg-accent hover:text-accent-foreground"
          )}
        >
          전체
        </Button>

        <Button
          variant={filter === "certification" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("certification")}
          className={cn(
            "text-xs font-medium transition-all duration-200",
            filter === "certification" 
              ? "bg-primary hover:bg-primary/90 text-white border-primary shadow-sm" 
              : "border-2 border-input hover:bg-accent hover:text-accent-foreground"
          )}
        >
          인증 훈련사
        </Button>

        <Button
          variant={filter === "featured" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("featured")}
          className={cn(
            "text-xs font-medium transition-all duration-200",
            filter === "featured" 
              ? "bg-primary hover:bg-primary/90 text-white border-primary shadow-sm" 
              : "border-2 border-input hover:bg-accent hover:text-accent-foreground"
          )}
        >
          추천 훈련사
        </Button>

        <Button
          variant={filter === "기초 훈련" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("기초 훈련")}
          className={cn(
            "text-xs font-medium transition-all duration-200",
            filter === "기초 훈련" 
              ? "bg-primary hover:bg-primary/90 text-white border-primary shadow-sm" 
              : "border-2 border-input hover:bg-accent hover:text-accent-foreground"
          )}
        >
          기본 훈련
        </Button>

        <Button
          variant={filter === "행동 교정" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("행동 교정")}
          className={cn(
            "text-xs font-medium transition-all duration-200",
            filter === "행동 교정" 
              ? "bg-primary hover:bg-primary/90 text-white border-primary shadow-sm" 
              : "border-2 border-input hover:bg-accent hover:text-accent-foreground"
          )}
        >
          행동 교정
        </Button>

        <Button
          variant={filter === "특수 훈련" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("특수 훈련")}
          className={cn(
            "text-xs font-medium transition-all duration-200",
            filter === "특수 훈련" 
              ? "bg-primary hover:bg-primary/90 text-white border-primary shadow-sm" 
              : "border-2 border-input hover:bg-accent hover:text-accent-foreground"
          )}
        >
          특수 훈련
        </Button>

        <Button
          variant={showCertifiedOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowCertifiedOnly(!showCertifiedOnly)}
          className={cn(
            "text-xs font-semibold transition-all duration-200",
            showCertifiedOnly 
              ? "bg-primary hover:bg-primary/90 text-white border-primary shadow-sm" 
              : "border-2 border-primary text-primary hover:bg-primary hover:text-white"
          )}
        >
          <Award className="h-3 w-3 mr-1" />
          TALEZ 인증
        </Button>
      </div>

      {/* 검색 결과 카운트 */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          총 <span className="font-medium">{filteredTrainers.length}</span>명의 훈련사가 검색되었습니다.
        </p>
      </div>

      {/* Trainers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTrainers.map((trainer) => (
          <Card key={trainer.id} className="overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="relative h-32 bg-gradient-to-r from-primary/20 to-accent/20">
              {trainer.rating >= 4.8 && (
                <Badge variant="warning" className="absolute top-2 right-2">
                  <Sparkles className="h-3 w-3 mr-1" />
                  추천 훈련사
                </Badge>
              )}
            </div>

            <CardContent className="pt-0 p-5">
              <div className="flex flex-col">
                <div className="flex items-end -mt-10 mb-4">
                  
                  <Avatar className="h-16 w-16 mr-4">
                    <AvatarImage 
                      src={trainer.image || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(trainer.name)}&backgroundColor=6366f1&textColor=ffffff`}
                      alt={trainer.name}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(trainer.name)}&backgroundColor=6366f1&textColor=ffffff`;
                      }}
                    />
                    <AvatarFallback className="text-lg bg-primary text-white">{trainer.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="ml-4 pb-1 flex-1">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{trainer.name}</h3>
                    <p className="text-sm text-primary mb-2">{trainer.specialty}</p>
                    <TalezTrainerCertificationBadge 
                      trainerData={{
                        id: trainer.id.toString(),
                        name: trainer.name,
                        talezCertificationStatus: 'verified',
                        talezCertificationLevel: 'expert',
                        talezCertificationDate: '2024-01-15',
                        licenseNumber: `TZ-${trainer.id.toString().padStart(4, '0')}`
                      }}
                      size="sm"
                    />
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  {trainer.location && (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{trainer.location}</span>
                    </div>
                  )}

                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-warning fill-warning mr-2" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{trainer.rating} ({trainer.reviewCount} 후기)</span>
                  </div>

                  {trainer.experience && (
                    <div className="flex items-center">
                      <Briefcase className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">경력 {trainer.experience.split(',')[0]}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {trainer.certifications.slice(0, 2).map((cert, idx) => (
                    <Badge key={idx} variant="outline" className="bg-primary/10 dark:bg-primary/5 text-xs">
                      {cert.length > 15 ? `${cert.substring(0, 15)}...` : cert}
                    </Badge>
                  ))}

                  {trainer.certifications.length > 2 && (
                    <Badge variant="outline" className="text-xs">+{trainer.certifications.length - 2}</Badge>
                  )}
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                  {trainer.description}
                </p>

                <div className="flex justify-between items-center mt-auto">
                  <div className="text-sm">
                    <span className="text-gray-500 dark:text-gray-400">강의 </span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{trainer.coursesCount}개</span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      alert(`${trainer.name} 프로필을 열려고 합니다.`);
                      console.log("프로필 버튼 클릭됨:", trainer.name);
                      setSelectedTrainer(trainer);
                      setIsProfileOpen(true);
                    }}
                    className="border-2 border-primary text-primary hover:bg-primary hover:text-white font-medium transition-all duration-200"
                    aria-label={`${trainer.name} 프로필 보기`}
                  >
                    프로필 보기
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredTrainers.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium mb-2">검색 결과가 없습니다</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
            다른 검색어나 필터를 사용해 보세요. 더 많은 훈련사를 찾을 수 있을 거예요.
          </p>
          <Button 
            onClick={() => {setFilter("all"); setSearchQuery("");}}
            className="bg-primary hover:bg-primary/90 text-white font-semibold border border-primary/10 shadow-sm"
          >
            모든 훈련사 보기
          </Button>
        </div>
      )}

      {/* Pagination */}
      {filteredTrainers.length > 0 && (
        <div className="mt-10 flex justify-center">
          <nav className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="text-sm">
              이전
            </Button>
            <Button variant="default" size="sm" className="text-sm">
              1
            </Button>
            <Button variant="outline" size="sm" className="text-sm">
              2
            </Button>
            <Button variant="outline" size="sm" className="text-sm">
              3
            </Button>
            <Button variant="outline" size="sm" className="text-sm">
              다음
            </Button>
          </nav>
        </div>
      )}

      {/* 간단한 테스트 모달 섹션 */}
      <div className="mt-8 bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">모달 테스트 섹션</h2>
        <p className="mb-4">아래 버튼을 클릭하여 기본 모달 작동을 테스트해 보세요.</p>
        <Button 
          onClick={() => {
            console.log("테스트 모달 버튼 클릭");
            alert("테스트 모달을 열려고 합니다.");
            setIsProfileOpen(true);
          }}
          variant="default"
        >
          테스트 모달 열기
        </Button>
      </div>

      {/* 훈련사 프로필 모달 */}
      {isProfileOpen && selectedTrainer && (
        <UnifiedTrainerProfileModal
          trainer={selectedTrainer}
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
        />
      )}
    </div>
  );
}