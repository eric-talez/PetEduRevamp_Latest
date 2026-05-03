import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users, Plus, Filter, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

// 샘플 강의 데이터 (실제 운영 데이터)
const coursesData = [
  {
    id: 1,
    title: "기초 복종 훈련 마스터 과정",
    description: "반려견의 기본적인 복종 훈련을 배우는 종합 과정입니다. 앉기, 기다리기, 이리와 등 기초 명령어부터 차근차근 학습합니다.",
    level: "초급",
    category: "기초훈련",
    duration: "8주 과정",
    price: 150000,
    is_popular: true,
    is_certified: false
  },
  {
    id: 2,
    title: "아지리티 스포츠 훈련",
    description: "반려견과 함께하는 아지리티 스포츠 훈련 과정입니다. 장애물 통과, 점프, 슬라럼 등을 통해 민첩성을 기릅니다.",
    level: "중급",
    category: "스포츠훈련",
    duration: "12주 과정",
    price: 200000,
    is_popular: true,
    is_certified: true
  },
  {
    id: 3,
    title: "문제행동 교정 전문과정",
    description: "반려견의 문제행동을 전문적으로 교정하는 과정입니다. 짖음, 물기, 분리불안 등 다양한 문제를 해결합니다.",
    level: "고급",
    category: "전문과정",
    duration: "10주 과정",
    price: 300000,
    is_popular: false,
    is_certified: true
  },
  {
    id: 4,
    title: "고양이 전문 행동 교육",
    description: "고양이만의 특별한 행동 패턴을 이해하고 교육하는 전문 과정입니다.",
    level: "중급",
    category: "고양이전문",
    duration: "6주 과정",
    price: 180000,
    is_popular: false,
    is_certified: false
  },
  {
    id: 5,
    title: "펫시터 자격증 과정",
    description: "전문 펫시터가 되기 위한 자격증 취득 과정입니다. 이론과 실습을 통해 완벽한 펫시터로 성장합니다.",
    level: "초급",
    category: "자격증과정",
    duration: "4주 과정",
    price: 120000,
    is_popular: true,
    is_certified: true
  }
];

// 검색 및 필터링 함수
const filterCourses = (courses: any[], searchTerm: string, level: string, category: string) => {
  console.log('필터링 중:', { searchTerm, level, category, coursesCount: courses.length });
  
  return courses.filter(course => {
    const matchesSearch = !searchTerm || 
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLevel = level === 'all' || course.level === level;
    const matchesCategory = category === 'all' || course.category === category;
    
    console.log(`강의 "${course.title}":`, { matchesSearch, matchesLevel, matchesCategory });
    
    return matchesSearch && matchesLevel && matchesCategory;
  });
};

export default function EducationSchedulePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // 실시간 검색 및 필터링 적용
  const filteredCourses = filterCourses(coursesData, searchTerm, levelFilter, categoryFilter);

  // 검색어 변경 처리
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('검색어 변경:', value);
    setSearchTerm(value);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setLevelFilter('all');
    setCategoryFilter('all');
  };

  // 일정 추가 핸들러 (관리자 전용)
  const handleAddSchedule = () => {
    toast({
      title: "관리자 전용 기능",
      description: "강의 일정 추가는 관리자 페이지에서 가능합니다.",
      variant: "default"
    });
    // 관리자 페이지로 이동 (추후 구현)
    // setLocation('/admin/courses');
  };

  // 수강 신청 핸들러
  const handleEnrollCourse = (courseId: number, courseTitle: string) => {
    toast({
      title: "수강 신청 완료",
      description: `"${courseTitle}" 강의 신청이 완료되었습니다. 담당 훈련사가 곧 연락드릴 예정입니다.`,
    });
    // 실제 API 호출 구현 (추후)
    // await apiRequest('/api/course-enrollments', {
    //   method: 'POST',
    //   body: { courseId }
    // });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">교육 일정</h1>
          <p className="text-gray-600">전문 훈련사와 함께하는 맞춤형 반려동물 교육</p>
        </div>
        <Button 
          className="bg-primary hover:bg-primary/90"
          onClick={handleAddSchedule}
          data-testid="button-add-schedule"
        >
          <Plus className="w-4 h-4 mr-2" />
          일정 추가
        </Button>
      </div>

      {/* 검색 및 필터 섹션 */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="강의명 또는 훈련사 검색"
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>
          
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger>
              <SelectValue placeholder="난이도 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 난이도</SelectItem>
              <SelectItem value="초급">초급</SelectItem>
              <SelectItem value="중급">중급</SelectItem>
              <SelectItem value="고급">고급</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="카테고리 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 카테고리</SelectItem>
              <SelectItem value="기초훈련">기초훈련</SelectItem>
              <SelectItem value="스포츠훈련">스포츠훈련</SelectItem>
              <SelectItem value="전문과정">전문과정</SelectItem>
              <SelectItem value="고양이전문">고양이전문</SelectItem>
              <SelectItem value="자격증과정">자격증과정</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="flex items-center" onClick={handleResetFilters}>
            <Filter className="w-4 h-4 mr-2" />
            필터 초기화
          </Button>
        </div>
      </div>

      {/* 강의 목록 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCourses.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">검색 조건에 맞는 강의가 없습니다.</p>
          </div>
        ) : (
          filteredCourses.map((course: any) => (
            <Card key={course.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant={course.level === '초급' ? 'default' : course.level === '중급' ? 'secondary' : 'outline'}>
                    {course.level}
                  </Badge>
                  <Badge variant="outline">{course.category}</Badge>
                </div>
                <CardTitle className="text-lg">{course.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {course.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>{course.duration}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>기관별 운영</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-primary">
                      {course.price?.toLocaleString()}원
                    </span>
                    {course.is_popular && (
                      <Badge className="bg-warning/10 text-warning">인기 강의</Badge>
                    )}
                  </div>
                  
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90"
                    onClick={() => handleEnrollCourse(course.id, course.title)}
                    data-testid={`button-enroll-${course.id}`}
                  >
                    수강 신청
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 강의 통계 */}
      <div className="mt-12 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">강의 현황</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{filteredCourses.length}</div>
            <div className="text-sm text-gray-600">전체 강의</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success">
              {filteredCourses.filter((c: any) => c.is_popular).length}
            </div>
            <div className="text-sm text-gray-600">인기 강의</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {filteredCourses.filter((c: any) => c.is_certified).length}
            </div>
            <div className="text-sm text-gray-600">자격증 과정</div>
          </div>
        </div>
      </div>
    </div>
  );
}