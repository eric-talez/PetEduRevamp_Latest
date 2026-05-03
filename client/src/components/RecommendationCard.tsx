import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { 
  Sparkles, 
  Heart, 
  Users, 
  Star, 
  ArrowRight, 
  Loader2, 
  ShoppingBag,
  BookOpen,
  TrendingUp,
  Dog,
  ChevronRight
} from 'lucide-react';

interface RecommendedCourse {
  id: number;
  title: string;
  description: string;
  image: string;
  price: string;
  rating: number;
  students: number;
  trainer: {
    name: string;
    image: string;
  };
  tags: string[];
  reason: string;
  reasonType: 'ai' | 'popular' | 'pet-based' | 'similar-users';
}

interface RecommendedProduct {
  id: number;
  name: string;
  description: string;
  image: string;
  price: string;
  originalPrice?: string;
  rating: number;
  reviewCount: number;
  tags: string[];
  reason: string;
}

interface RecommendationData {
  courses: RecommendedCourse[];
  products: RecommendedProduct[];
  petInfo?: {
    name: string;
    breed: string;
    age: string;
  };
}

const reasonIcons: Record<string, typeof Sparkles> = {
  'ai': Sparkles,
  'popular': TrendingUp,
  'pet-based': Dog,
  'similar-users': Users,
};

const reasonLabels: Record<string, string> = {
  'ai': 'AI 맞춤 추천',
  'popular': '인기 강의',
  'pet-based': '반려견 맞춤',
  'similar-users': '비슷한 분들이 선택',
};

export function RecommendationCard() {
  const [, setLocation] = useLocation();

  const { data, isLoading, error } = useQuery<RecommendationData>({
    queryKey: ['/api/recommendations'],
    staleTime: 300000,
  });

  if (isLoading) {
    return (
      <Card className="border-none shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
            <span className="text-sm text-gray-500">추천 콘텐츠 로딩 중...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || (!data?.courses?.length && !data?.products?.length)) {
    return null;
  }

  const { courses, products, petInfo } = data;

  return (
    <div className="space-y-6">
      {courses.length > 0 && (
        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-secondary/5 dark:from-primary/15 dark:to-secondary/15">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {petInfo ? `${petInfo.name}를 위한 추천 강의` : '맞춤 추천 강의'}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation('/courses')} className="text-primary gap-1">
                전체보기 <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {petInfo && (
              <p className="text-sm text-gray-500 mt-1">
                {petInfo.breed} · {petInfo.age}
              </p>
            )}
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {courses.slice(0, 3).map((course) => {
                const ReasonIcon = reasonIcons[course.reasonType] || Sparkles;
                return (
                  <div 
                    key={course.id}
                    className="group bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                    onClick={() => setLocation(`/courses/${course.id}`)}
                  >
                    <div className="relative">
                      <img 
                        src={course.image} 
                        alt={course.title}
                        className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-primary text-white text-xs flex items-center gap-1">
                          <ReasonIcon className="h-3 w-3" />
                          {reasonLabels[course.reasonType] || 'AI 추천'}
                        </Badge>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                        <div className="flex items-center gap-1 text-white text-xs">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{course.rating.toFixed(1)}</span>
                          <span className="mx-1">·</span>
                          <Users className="h-3 w-3" />
                          <span>{course.students}명 수강</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="font-semibold text-sm mb-1 line-clamp-2" style={{ color: 'var(--txt-strong)' }}>
                        {course.title}
                      </h4>
                      <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                        {course.description}
                      </p>
                      <div className="flex items-center gap-2 mb-3">
                        <img 
                          src={course.trainer.image} 
                          alt={course.trainer.name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{course.trainer.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-primary">{course.price}</span>
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                          자세히 <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-primary dark:text-primary flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {course.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {courses.length > 3 && (
              <div className="mt-4 text-center">
                <Button 
                  variant="outline" 
                  onClick={() => setLocation('/recommendations')}
                  className="gap-2"
                >
                  더 많은 추천 강의 보기
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {products.length > 0 && (
        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader className="pb-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-amber-600" />
                이 강의를 들은 분들이 함께 구매한 상품
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation('/shop')} className="text-amber-600 gap-1">
                전체보기 <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              {products.slice(0, 4).map((product) => (
                <div 
                  key={product.id}
                  className="group bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300"
                  onClick={() => setLocation(`/shop/product/${product.id}`)}
                >
                  <div className="relative">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {product.originalPrice && (
                      <Badge className="absolute top-2 left-2 bg-red-500 text-white text-xs">
                        할인
                      </Badge>
                    )}
                  </div>
                  <div className="p-3">
                    <h5 className="font-medium text-xs mb-1 line-clamp-2" style={{ color: 'var(--txt-strong)' }}>
                      {product.name}
                    </h5>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span>{product.rating.toFixed(1)}</span>
                      <span className="text-gray-300">|</span>
                      <span>리뷰 {product.reviewCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary">{product.price}</span>
                      {product.originalPrice && (
                        <span className="text-xs text-gray-400 line-through">{product.originalPrice}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
