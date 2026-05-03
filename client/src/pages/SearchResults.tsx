import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  MapPin, 
  Star, 
  Phone, 
  Clock, 
  Users,
  Calendar,
  Award,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';

interface SearchResult {
  id: number;
  type: 'trainer' | 'course' | 'institute';
  title: string;
  description: string;
  rating?: number;
  reviewCount?: number;
  location?: string;
  category?: string;
  features?: string[];
  phone?: string;
  experience?: number;
  certifications?: string[];
  price?: number;
  duration?: string;
}

export default function SearchResults() {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  // URL에서 검색어 추출
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q') || '';
    setSearchQuery(query);
    
    if (query.trim()) {
      performSearch(query);
    }
  }, []);

  const performSearch = async (query: string) => {
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      console.log(`[검색] "${query}" 검색 실행`);
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&page=1&limit=20`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[검색] 결과:', data);
        setSearchResults(data.results || []);
        setTotalResults(data.total || data.results?.length || 0);
      } else {
        console.error('[검색] API 오류:', response.status);
        setSearchResults([]);
        setTotalResults(0);
      }
    } catch (error) {
      console.error('[검색] 네트워크 오류:', error);
      setSearchResults([]);
      setTotalResults(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // URL 업데이트
      const newUrl = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
      window.history.pushState({}, '', newUrl);
      performSearch(searchQuery.trim());
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'trainer': return '👨‍🏫';
      case 'course': return '📚';
      case 'institute': return '🏫';
      default: return '📍';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'trainer': return '훈련사';
      case 'course': return '강의';
      case 'institute': return '기관';
      default: return '기타';
    }
  };

  const handleResultClick = (result: SearchResult) => {
    // 결과 타입에 따라 적절한 페이지로 이동
    switch (result.type) {
      case 'trainer':
        setLocation(`/trainers/${result.id}`);
        break;
      case 'course':
        setLocation(`/courses/${result.id}`);
        break;
      case 'institute':
        setLocation(`/institutes/${result.id}`);
        break;
      default:
        console.log('클릭된 결과:', result);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setLocation('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              홈으로
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">검색 결과</h1>
          </div>

          {/* 검색창 */}
          <form onSubmit={handleSearchSubmit} className="relative max-w-2xl">
            <Input
              type="text"
              placeholder="훈련사, 강의, 기관을 검색하세요..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 text-lg"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Button 
              type="submit" 
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
              size="sm"
            >
              검색
            </Button>
          </form>
        </div>

        {/* 검색 상태 */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">검색 중...</p>
          </div>
        )}

        {/* 검색 결과 헤더 */}
        {!isLoading && searchQuery && (
          <div className="mb-6">
            <p className="text-gray-600">
              <span className="font-semibold text-primary">"{searchQuery}"</span>에 대한 
              <span className="font-semibold text-success ml-1">{totalResults}개</span>의 결과
            </p>
          </div>
        )}

        {/* 검색 결과 */}
        {!isLoading && searchResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {searchResults.map((result) => (
              <Card 
                key={`${result.type}-${result.id}`} 
                className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
                onClick={() => handleResultClick(result)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getTypeIcon(result.type)}</span>
                      <Badge variant="outline" className="text-xs">
                        {getTypeName(result.type)}
                      </Badge>
                    </div>
                    {result.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-warning text-warning" />
                        <span className="text-sm font-medium">{result.rating}</span>
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-lg font-semibold line-clamp-2">
                    {result.title}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <p className="text-gray-600 text-sm line-clamp-2">
                    {result.description}
                  </p>

                  {/* 위치 정보 */}
                  {result.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <MapPin className="w-4 h-4" />
                      <span>{result.location}</span>
                    </div>
                  )}

                  {/* 연락처 */}
                  {result.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Phone className="w-4 h-4" />
                      <span>{result.phone}</span>
                    </div>
                  )}

                  {/* 경력/기간 */}
                  {result.experience && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Users className="w-4 h-4" />
                      <span>{result.experience}년 경력</span>
                    </div>
                  )}

                  {result.duration && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>{result.duration}</span>
                    </div>
                  )}

                  {/* 특징/자격증 */}
                  {result.features && result.features.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {result.features.slice(0, 3).map((feature, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {result.features.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{result.features.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* 가격 */}
                  {result.price && (
                    <div className="text-right">
                      <span className="text-lg font-semibold text-primary">
                        {result.price.toLocaleString()}원
                      </span>
                    </div>
                  )}

                  {/* 리뷰 수 */}
                  {result.reviewCount && result.reviewCount > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Award className="w-4 h-4" />
                      <span>리뷰 {result.reviewCount}개</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 검색 결과 없음 */}
        {!isLoading && searchQuery && searchResults.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              검색 결과가 없습니다
            </h3>
            <p className="text-gray-600 mb-6">
              "<span className="font-medium">{searchQuery}</span>"에 대한 결과를 찾을 수 없습니다.
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>• 다른 검색어로 시도해보세요</p>
              <p>• 검색어의 철자를 확인해보세요</p>
              <p>• 더 일반적인 검색어를 사용해보세요</p>
            </div>
          </div>
        )}

        {/* 초기 상태 (검색어 없음) */}
        {!isLoading && !searchQuery && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              검색어를 입력하세요
            </h3>
            <p className="text-gray-600">
              훈련사, 강의, 기관 등을 검색할 수 있습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}