
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { 
  Star, 
  Clock, 
  Users, 
  MapPin, 
  Heart,
  BookOpen,
  Award,
  TrendingUp,
  ArrowRight,
  ChevronRight
} from "lucide-react";

// 추천 아이템 타입 정의
interface RecommendationItem {
  id: string;
  type: 'course' | 'trainer' | 'community' | 'product';
  title: string;
  description: string;
  image?: string;
  rating?: number;
  price?: number;
  location?: string;
  instructor?: string;
  duration?: string;
  level?: string;
  category?: string;
  popularity?: number;
  isHot?: boolean;
  isNew?: boolean;
}

// 샘플 추천 데이터
const sampleRecommendations: RecommendationItem[] = [
  {
    id: '1',
    type: 'course',
    title: '기본 훈련 마스터 클래스',
    description: '반려견의 기본적인 예의와 행동 교정을 위한 체계적인 훈련 프로그램입니다.',
    rating: 4.8,
    price: 150000,
    instructor: '김훈련사',
    duration: '8주',
    level: '초급',
    category: '기본훈련',
    isHot: true
  },
  {
    id: '2',
    type: 'trainer',
    title: '박정민 전문 훈련사',
    description: '10년 경력의 전문 반려견 행동 교정 전문가입니다.',
    rating: 4.9,
    location: '서울 강남구',
    category: '행동교정',
    popularity: 95
  },
  {
    id: '3',
    type: 'community',
    title: '골든리트리버 건강 관리 팁',
    description: '대형견 특성에 맞는 건강 관리 방법과 운동량 조절에 대한 실용적인 정보를 공유합니다.',
    category: '건강관리',
    popularity: 234,
    isNew: true
  },
  {
    id: '4',
    type: 'course',
    title: '어질리티 입문 과정',
    description: '반려견과 함께하는 어질리티 스포츠의 기초를 배우는 재미있는 수업입니다.',
    rating: 4.7,
    price: 200000,
    instructor: '이코치',
    duration: '12주',
    level: '중급',
    category: '스포츠',
    isNew: true
  }
];

// 추천 카드 컴포넌트
const RecommendationCard = ({ item, onClick }: { item: RecommendationItem; onClick: () => void }) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'course': return <BookOpen className="w-5 h-5" />;
      case 'trainer': return <Award className="w-5 h-5" />;
      case 'community': return <Users className="w-5 h-5" />;
      default: return <Star className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'course': return 'bg-primary/10 text-primary';
      case 'trainer': return 'bg-success/10 text-success';
      case 'community': return 'bg-primary/10 text-primary';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'course': return '강의';
      case 'trainer': return '전문가';
      case 'community': return '커뮤니티';
      default: return '추천';
    }
  };

  return (
    <Card 
      className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer group"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start mb-2">
          <Badge className={`${getTypeColor(item.type)} flex items-center gap-1`}>
            {getTypeIcon(item.type)}
            {getTypeName(item.type)}
          </Badge>
          <div className="flex gap-1">
            {item.isHot && (
              <Badge variant="destructive" className="text-xs">
                HOT
              </Badge>
            )}
            {item.isNew && (
              <Badge variant="outline" className="text-xs">
                NEW
              </Badge>
            )}
          </div>
        </div>
        <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
          {item.title}
        </CardTitle>
        <CardDescription className="line-clamp-2">
          {item.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="space-y-2">
          {item.rating && (
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <Star className="w-4 h-4 fill-warning text-warning" />
                <span className="text-sm font-medium ml-1">{item.rating}</span>
              </div>
              <span className="text-xs text-muted-foreground">평점</span>
            </div>
          )}

          {item.instructor && (
            <div className="flex items-center gap-2 text-sm">
              <Avatar className="w-5 h-5">
                <AvatarFallback className="text-xs">{item.instructor[0]}</AvatarFallback>
              </Avatar>
              <span>{item.instructor}</span>
            </div>
          )}

          {item.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{item.location}</span>
            </div>
          )}

          {item.duration && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{item.duration}</span>
            </div>
          )}

          {item.popularity && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span>{item.popularity}명이 관심</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-3">
        <div className="flex justify-between items-center w-full">
          {item.price ? (
            <div className="text-lg font-bold text-primary">
              {item.price.toLocaleString()}원
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {item.category}
            </div>
          )}
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </CardFooter>
    </Card>
  );
};

// 상세 모달 컴포넌트
const RecommendationDetailModal = ({ 
  item, 
  isOpen, 
  onClose 
}: { 
  item: RecommendationItem | null; 
  isOpen: boolean; 
  onClose: () => void; 
}) => {
  const [, setLocation] = useLocation();

  if (!item) return null;

  const handleNavigate = () => {
    onClose();
    
    // 타입에 따라 적절한 페이지로 이동
    switch (item.type) {
      case 'course':
        setLocation(`/courses/detail?id=${item.id}`);
        break;
      case 'trainer':
        setLocation(`/trainers/detail?id=${item.id}`);
        break;
      case 'community':
        setLocation('/community');
        break;
      default:
        break;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {item.type === 'course' && <BookOpen className="w-5 h-5" />}
            {item.type === 'trainer' && <Award className="w-5 h-5" />}
            {item.type === 'community' && <Users className="w-5 h-5" />}
            {item.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Badge variant="secondary">{item.category}</Badge>
            {item.isHot && <Badge variant="destructive">HOT</Badge>}
            {item.isNew && <Badge variant="outline">NEW</Badge>}
          </div>

          <p className="text-muted-foreground leading-relaxed">
            {item.description}
          </p>

          <div className="grid grid-cols-2 gap-4">
            {item.rating && (
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-warning text-warning" />
                <span className="font-medium">{item.rating}점</span>
              </div>
            )}

            {item.instructor && (
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="text-xs">{item.instructor[0]}</AvatarFallback>
                </Avatar>
                <span>{item.instructor}</span>
              </div>
            )}

            {item.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{item.location}</span>
              </div>
            )}

            {item.duration && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{item.duration}</span>
              </div>
            )}

            {item.level && (
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>{item.level}</span>
              </div>
            )}

            {item.popularity && (
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                <span>{item.popularity}명이 관심</span>
              </div>
            )}
          </div>

          {item.price && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {item.price.toLocaleString()}원
              </div>
              <div className="text-sm text-muted-foreground">
                {item.duration && `${item.duration} 과정`}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button onClick={handleNavigate} className="flex-1">
              상세 페이지로 이동
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" onClick={onClose}>
              닫기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function RecommendationsPage() {
  const { user } = useAuth();
  const [selectedItem, setSelectedItem] = useState<RecommendationItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 실제 추천 데이터 조회 (현재는 샘플 데이터 사용)
  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['/api/recommendations'],
    queryFn: async () => {
      // TODO: 실제 API 호출로 대체
      return { recommendations: sampleRecommendations };
    }
  });

  const handleCardClick = (item: RecommendationItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="h-64">
                <CardHeader>
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">맞춤 추천</h1>
          <p className="text-muted-foreground">
            {user?.userName || '회원'}님을 위한 개인 맞춤 추천 콘텐츠입니다.
          </p>
        </div>

        {/* 추천 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations?.recommendations.map((item) => (
            <RecommendationCard
              key={item.id}
              item={item}
              onClick={() => handleCardClick(item)}
            />
          ))}
        </div>

        {/* 더 많은 추천 버튼 */}
        <div className="text-center pt-6">
          <Button variant="outline" size="lg">
            더 많은 추천 보기
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* 상세 모달 */}
      <RecommendationDetailModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
