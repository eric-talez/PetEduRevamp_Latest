import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Search, Star, Clock, Users, BookOpen, Award, Calendar, MapPin, Filter, Heart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Course {
  id: number;
  title: string;
  description: string;
  instructor: {
    id: number;
    name: string;
    avatar: string;
    rating: number;
  };
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  lessons: number;
  price: number;
  discountPrice?: number;
  rating: number;
  reviewCount: number;
  enrolled: number;
  maxStudents: number;
  thumbnail: string;
  startDate: string;
  endDate: string;
  schedule: string;
  location: string;
  tags: string[];
  isEnrolled: boolean;
  progress?: number;
}

const mockCourses: Course[] = [
  {
    id: 1,
    title: "강아지 기본 복종 훈련",
    description: "앉기, 기다리기, 눕기 등 기본적인 복종 훈련을 배우는 과정입니다. 초보 반려인을 위한 필수 강좌입니다.",
    instructor: {
      id: 1,
      name: "김민수 훈련사",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80",
      rating: 4.8
    },
    category: "기본훈련",
    level: "beginner",
    duration: "4주",
    lessons: 8,
    price: 120000,
    discountPrice: 98000,
    rating: 4.7,
    reviewCount: 156,
    enrolled: 24,
    maxStudents: 30,
    thumbnail: "https://images.unsplash.com/photo-1551717743-49959800b1f6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400&q=80",
    startDate: "2025-06-15",
    endDate: "2025-07-13",
    schedule: "매주 화, 목 19:00-20:30",
    location: "서울시 강남구 훈련센터",
    tags: ["초보자", "기본훈련", "실내"],
    isEnrolled: false
  },
  {
    id: 2,
    title: "퍼피 사회화 프로그램",
    description: "생후 3-6개월 강아지를 위한 사회화 훈련 프로그램입니다. 다른 강아지와 사람들과의 올바른 만남을 배웁니다.",
    instructor: {
      id: 2,
      name: "박지연 훈련사",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b494?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80",
      rating: 4.9
    },
    category: "사회화",
    level: "beginner",
    duration: "6주",
    lessons: 12,
    price: 180000,
    rating: 4.8,
    reviewCount: 89,
    enrolled: 15,
    maxStudents: 20,
    thumbnail: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400&q=80",
    startDate: "2025-06-10",
    endDate: "2025-07-22",
    schedule: "매주 월, 수, 금 18:00-19:00",
    location: "서울시 송파구 반려동물센터",
    tags: ["퍼피", "사회화", "그룹수업"],
    isEnrolled: true,
    progress: 65
  },
  {
    id: 3,
    title: "문제행동 교정 클래스",
    description: "짖기, 물기, 파괴행동 등의 문제행동을 교정하는 고급 훈련 과정입니다.",
    instructor: {
      id: 3,
      name: "이동훈 전문가",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80",
      rating: 4.6
    },
    category: "행동교정",
    level: "advanced",
    duration: "8주",
    lessons: 16,
    price: 250000,
    discountPrice: 200000,
    rating: 4.5,
    reviewCount: 67,
    enrolled: 8,
    maxStudents: 12,
    thumbnail: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400&q=80",
    startDate: "2025-06-20",
    endDate: "2025-08-15",
    schedule: "매주 토, 일 10:00-12:00",
    location: "서울시 마포구 훈련시설",
    tags: ["고급", "문제행동", "1:1"],
    isEnrolled: false
  }
];

export default function CoursePage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>(mockCourses);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>(mockCourses);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    filterCourses();
  }, [searchTerm, selectedCategory, selectedLevel, activeTab]);

  const filterCourses = () => {
    let filtered = courses;

    // 탭 필터
    if (activeTab === 'enrolled') {
      filtered = filtered.filter(course => course.isEnrolled);
    } else if (activeTab === 'available') {
      filtered = filtered.filter(course => !course.isEnrolled);
    }

    // 검색어 필터
    if (searchTerm) {
      filtered = filtered.filter(course => 
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.instructor.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 카테고리 필터
    if (selectedCategory) {
      filtered = filtered.filter(course => course.category === selectedCategory);
    }

    // 레벨 필터
    if (selectedLevel) {
      filtered = filtered.filter(course => course.level === selectedLevel);
    }

    setFilteredCourses(filtered);
  };

  const [reviews, setReviews] = useState<any[]>([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [favoriteList, setFavoriteList] = useState<number[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<any[]>([]);

  // 리뷰 데이터 로드
  const loadReviews = async (courseId: number) => {
    try {
      const response = await fetch(`/api/courses/${courseId}/reviews`);
      const reviewData = await response.json();
      setReviews(reviewData);
    } catch (error) {
      console.error('리뷰 로드 오류:', error);
    }
  };

  // 즐겨찾기 토글
  const toggleFavorite = async (courseId: number) => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    const isFavorite = favoriteList.includes(courseId);
    const action = isFavorite ? 'remove' : 'add';

    try {
      const response = await fetch(`/api/courses/${courseId}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, action })
      });

      const result = await response.json();
      if (result.success) {
        if (action === 'add') {
          setFavoriteList(prev => [...prev, courseId]);
        } else {
          setFavoriteList(prev => prev.filter(id => id !== courseId));
        }
      }
    } catch (error) {
      console.error('즐겨찾기 오류:', error);
    }
  };

  // 리뷰 작성
  const submitReview = async (courseId: number) => {
    if (!user || !newReview.comment.trim()) {
      alert('리뷰 내용을 입력해주세요.');
      return;
    }

    try {
      const response = await fetch(`/api/courses/${courseId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          rating: newReview.rating,
          comment: newReview.comment
        })
      });

      const result = await response.json();
      if (result.success) {
        setReviews(prev => [result.review, ...prev]);
        setNewReview({ rating: 5, comment: '' });
        alert('리뷰가 등록되었습니다.');
      }
    } catch (error) {
      console.error('리뷰 작성 오류:', error);
    }
  };

  // 추천 강의 로드
  const loadRecommendations = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/users/${user.id}/recommended-courses`);
      const recommendations = await response.json();
      setRecommendedCourses(recommendations);
    } catch (error) {
      console.error('추천 강의 로드 오류:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadRecommendations();
    }
  }, [user]);

  const handleEnrollCourse = async (courseId: number) => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      const response = await fetch('/api/courses/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courseId, userId: user.id }),
      });

      const result = await response.json();

      if (result.success) {
        alert('수강신청이 완료되었습니다!');
        // 강좌 상태 업데이트
        setCourses(prev => prev.map(course => 
          course.id === courseId 
            ? { ...course, isEnrolled: true, enrolled: course.enrolled + 1 }
            : course
        ));
        setIsDetailOpen(false);
      } else {
        alert('수강신청에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('수강신청 오류:', error);
      alert('네트워크 오류가 발생했습니다.');
    }
  };

  const getLevelBadge = (level: string) => {
    const levelConfig = {
      beginner: { label: '초급', variant: 'secondary' as const, color: 'bg-success/10 text-success' },
      intermediate: { label: '중급', variant: 'default' as const, color: 'bg-primary/10 text-primary' },
      advanced: { label: '고급', variant: 'destructive' as const, color: 'bg-destructive/10 text-destructive' }
    };

    const config = levelConfig[level as keyof typeof levelConfig] || levelConfig.beginner;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const categories = [...new Set(courses.map(course => course.category))];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">강좌</h1>
        <p className="text-gray-600">전문 훈련사와 함께하는 체계적인 반려동물 교육</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">전체 강좌</TabsTrigger>
          <TabsTrigger value="available">수강 가능</TabsTrigger>
          <TabsTrigger value="enrolled">내 강좌</TabsTrigger>
        </TabsList>

        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="강좌명, 강사명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="카테고리" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">전체 카테고리</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedLevel} onValueChange={setSelectedLevel}>
            <SelectTrigger className="w-full md:w-32">
              <SelectValue placeholder="레벨" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">전체 레벨</SelectItem>
              <SelectItem value="beginner">초급</SelectItem>
              <SelectItem value="intermediate">중급</SelectItem>
              <SelectItem value="advanced">고급</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value={activeTab} className="space-y-6">
          {/* 추천 강의 섹션 */}
          {user && recommendedCourses.length > 0 && activeTab === 'all' && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">👨‍🏫 당신을 위한 추천 강의</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {recommendedCourses.slice(0, 3).map((course) => (
                  <Card key={course.id} className="border-primary/30 bg-primary/30">
                    <div className="relative">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-32 object-cover rounded-t-lg"
                      />
                      <Badge className="absolute top-2 left-2 bg-primary">추천</Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm mb-1">{course.title}</h3>
                      <p className="text-xs text-primary mb-2">{course.reason}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-warning text-warning" />
                          <span className="text-xs">{course.rating}</span>
                        </div>
                        <span className="text-sm font-medium">{course.price.toLocaleString()}원</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course) => (
              <Card key={course.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                <div className="relative">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-48 object-cover"
                  />
                  {course.isEnrolled && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-success">수강중</Badge>
                    </div>
                  )}
                  {course.discountPrice && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="danger">할인</Badge>
                    </div>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={course.instructor.avatar} alt={course.instructor.name} />
                          <AvatarFallback>{course.instructor.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-gray-600">{course.instructor.name}</span>
                      </div>
                    </div>
                    {getLevelBadge(course.level)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600 line-clamp-2">{course.description}</p>

                  {course.isEnrolled && course.progress !== undefined && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>진행률</span>
                        <span>{course.progress}%</span>
                      </div>
                      <Progress value={course.progress} className="h-2" />
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {course.duration}
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {course.lessons}강
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {course.enrolled}/{course.maxStudents}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-warning text-warning" />
                      <span className="text-sm font-medium">{course.rating}</span>
                      <span className="text-sm text-gray-500">({course.reviewCount})</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {course.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                      {course.discountPrice ? (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-destructive">
                            {course.discountPrice.toLocaleString()}원
                          </span>
                          <span className="text-sm text-gray-500 line-through">
                            {course.price.toLocaleString()}원
                          </span>
                        </div>
                      ) : (
                        <span className="text-lg font-bold">{course.price.toLocaleString()}원</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite(course.id)}
                        className={favoriteList.includes(course.id) ? "text-destructive" : "text-gray-400"}
                      >
                        <Heart className={`h-4 w-4 ${favoriteList.includes(course.id) ? 'fill-current' : ''}`} />
                      </Button>
                      <Dialog open={isDetailOpen && selectedCourse?.id === course.id} onOpenChange={setIsDetailOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            variant={course.isEnrolled ? "outline" : "default"}
                            onClick={() => {
                              setSelectedCourse(course);
                              loadReviews(course.id);
                            }}
                          >
                            {course.isEnrolled ? "강좌 보기" : "상세 정보"}
                          </Button>
                        </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{course.title}</DialogTitle>
                          <DialogDescription>
                            {course.instructor.name} • {course.category} • {course.level}
                          </DialogDescription>
                        </DialogHeader>
                        {selectedCourse && (
                          <div className="space-y-6">
                            <img
                              src={selectedCourse.thumbnail}
                              alt={selectedCourse.title}
                              className="w-full h-64 object-cover rounded-lg"
                            />

                            <div className="grid md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div>
                                  <h3 className="font-semibold mb-2">강좌 소개</h3>
                                  <p className="text-gray-600">{selectedCourse.description}</p>
                                </div>

                                <div>
                                  <h3 className="font-semibold mb-2">강사 정보</h3>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="w-12 h-12">
                                      <AvatarImage src={selectedCourse.instructor.avatar} alt={selectedCourse.instructor.name} />
                                      <AvatarFallback>{selectedCourse.instructor.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium">{selectedCourse.instructor.name}</p>
                                      <div className="flex items-center gap-1">
                                        <Star className="h-4 w-4 fill-warning text-warning" />
                                        <span className="text-sm">{selectedCourse.instructor.rating}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div>
                                  <h3 className="font-semibold mb-2">강좌 정보</h3>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4" />
                                      <span>{selectedCourse.startDate} ~ {selectedCourse.endDate}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4" />
                                      <span>{selectedCourse.schedule}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-4 w-4" />
                                      <span>{selectedCourse.location}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <BookOpen className="h-4 w-4" />
                                      <span>총 {selectedCourse.lessons}강 • {selectedCourse.duration}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4" />
                                      <span>수강생 {selectedCourse.enrolled}/{selectedCourse.maxStudents}명</span>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <h3 className="font-semibold mb-2">수강료</h3>
                                  {selectedCourse.discountPrice ? (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-2xl font-bold text-destructive">
                                          {selectedCourse.discountPrice.toLocaleString()}원
                                        </span>
                                        <Badge variant="danger">할인</Badge>
                                      </div>
                                      <span className="text-gray-500 line-through">
                                        {selectedCourse.price.toLocaleString()}원
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-2xl font-bold">
                                      {selectedCourse.price.toLocaleString()}원
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* 리뷰 섹션 */}
                            <div className="border-t pt-4">
                              <h3 className="font-semibold mb-4">수강생 리뷰 ({reviews.length})</h3>
                              
                              {/* 리뷰 작성 */}
                              {selectedCourse.isEnrolled && (
                                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                  <h4 className="font-medium mb-3">리뷰 작성하기</h4>
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className="text-sm">평점:</span>
                                    {[1,2,3,4,5].map((star) => (
                                      <button
                                        key={star}
                                        onClick={() => setNewReview(prev => ({...prev, rating: star}))}
                                        className={`${newReview.rating >= star ? 'text-warning' : 'text-gray-300'}`}
                                      >
                                        <Star className="h-4 w-4 fill-current" />
                                      </button>
                                    ))}
                                  </div>
                                  <textarea
                                    value={newReview.comment}
                                    onChange={(e) => setNewReview(prev => ({...prev, comment: e.target.value}))}
                                    placeholder="강의에 대한 솔직한 후기를 남겨주세요..."
                                    className="w-full p-3 border rounded-lg resize-none"
                                    rows={3}
                                  />
                                  <Button 
                                    onClick={() => submitReview(selectedCourse.id)}
                                    className="mt-2"
                                    size="sm"
                                  >
                                    리뷰 등록
                                  </Button>
                                </div>
                              )}

                              {/* 리뷰 목록 */}
                              <div className="space-y-4 max-h-64 overflow-y-auto">
                                {reviews.map((review) => (
                                  <div key={review.id} className="flex gap-3 p-3 border rounded-lg">
                                    <Avatar className="w-10 h-10">
                                      <AvatarImage src={review.userAvatar} alt={review.userName} />
                                      <AvatarFallback>{review.userName[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-sm">{review.userName}</span>
                                        <div className="flex">
                                          {Array.from({length: review.rating}).map((_, i) => (
                                            <Star key={i} className="h-3 w-3 fill-warning text-warning" />
                                          ))}
                                        </div>
                                        <span className="text-xs text-gray-500">{review.createdAt}</span>
                                      </div>
                                      <p className="text-sm text-gray-700">{review.comment}</p>
                                      <div className="flex items-center gap-2 mt-2">
                                        <button className="text-xs text-gray-500 hover:text-primary">
                                          도움됨 ({review.helpful})
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="flex gap-2 pt-4 border-t">
                              <Button 
                                onClick={() => setIsDetailOpen(false)} 
                                variant="outline" 
                                className="flex-1"
                              >
                                닫기
                              </Button>
                              {!selectedCourse.isEnrolled && (
                                <Button 
                                  onClick={() => handleEnrollCourse(selectedCourse.id)} 
                                  className="flex-1"
                                  disabled={selectedCourse.enrolled >= selectedCourse.maxStudents}
                                >
                                  {selectedCourse.enrolled >= selectedCourse.maxStudents ? '정원 마감' : '수강신청'}
                                </Button>
                              )}
                              {selectedCourse.isEnrolled && (
                                <Button 
                                  onClick={() => window.location.href = `/courses/detail/${selectedCourse.id}`} 
                                  className="flex-1"
                                >
                                  강좌 들어가기
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredCourses.length === 0 && (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-600">검색 조건에 맞는 강좌가 없습니다.</p>
                  <Button className="mt-4" onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('');
                    setSelectedLevel('');
                  }}>
                    필터 초기화
                  </Button>
                </CardContent>
              </Card>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}