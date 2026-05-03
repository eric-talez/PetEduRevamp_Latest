import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Filter, Plus, Eye, Edit, Trash2, BookOpen, Users, Clock, DollarSign } from "lucide-react";
import { useState } from "react";

export default function AdminCourses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({
    title: "",
    institute: "",
    trainer: "",
    category: "기본 훈련",
    level: "초급",
    duration: "",
    price: "",
    maxStudents: "",
    startDate: "",
    endDate: "",
    description: ""
  });

  // 강좌 추가 함수
  const handleAddCourse = async () => {
    if (!newCourse.title || !newCourse.institute || !newCourse.trainer || !newCourse.duration) {
      alert("필수 필드를 모두 입력해주세요.");
      return;
    }
    
    try {
      const response = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newCourse,
          price: parseFloat(newCourse.price) || 0,
          maxStudents: parseInt(newCourse.maxStudents) || 0,
          duration: parseInt(newCourse.duration) || 0
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert("강좌가 성공적으로 추가되었습니다!");
        
        // 폼 초기화
        setNewCourse({
          title: "",
          institute: "",
          trainer: "",
          category: "기본 훈련",
          level: "초급",
          duration: "",
          price: "",
          maxStudents: "",
          startDate: "",
          endDate: "",
          description: ""
        });
        setIsAddCourseOpen(false);
        
        // 페이지 새로고침 또는 데이터 재로드
        window.location.reload();
      } else {
        throw new Error(result.message || '강좌 추가에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('강좌 추가 오류:', error);
      alert(error.message || "강좌 추가 중 오류가 발생했습니다.");
    }
  };

  // 샘플 강좌 데이터
  const courses = [
    {
      id: 1,
      title: "기본 순종 훈련 과정",
      institute: "서울반려견아카데미",
      trainer: "김훈련사",
      category: "기본 훈련",
      level: "초급",
      duration: "8주",
      price: 320000,
      enrolledStudents: 24,
      maxStudents: 30,
      status: "active",
      startDate: "2024-02-15",
      endDate: "2024-04-10",
      description: "강아지의 기본적인 순종 훈련을 위한 체계적인 교육 과정"
    },
    {
      id: 2,
      title: "문제행동 교정 전문과정",
      institute: "부산펫트레이닝센터",
      trainer: "이전문가",
      category: "문제행동",
      level: "중급",
      duration: "12주",
      price: 480000,
      enrolledStudents: 18,
      maxStudents: 20,
      status: "active",
      startDate: "2024-03-01",
      endDate: "2024-05-24",
      description: "공격성, 분리불안 등 문제행동을 전문적으로 교정하는 과정"
    },
    {
      id: 3,
      title: "어질리티 경기 준비반",
      institute: "대구동물교육원",
      trainer: "박마스터",
      category: "어질리티",
      level: "고급",
      duration: "16주",
      price: 640000,
      enrolledStudents: 12,
      maxStudents: 15,
      status: "completed",
      startDate: "2024-01-08",
      endDate: "2024-04-29",
      description: "어질리티 경기 출전을 위한 고급 훈련 과정"
    },
    {
      id: 4,
      title: "강아지 사회화 프로그램",
      institute: "서울반려견아카데미",
      trainer: "김훈련사",
      category: "사회화",
      level: "초급",
      duration: "6주",
      price: 240000,
      enrolledStudents: 28,
      maxStudents: 35,
      status: "recruiting",
      startDate: "2024-03-15",
      endDate: "2024-04-26",
      description: "어린 강아지의 건전한 사회화를 위한 그룹 프로그램"
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-primary/10 text-primary">진행중</Badge>;
      case 'recruiting':
        return <Badge className="bg-success/10 text-success">모집중</Badge>;
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-800">완료</Badge>;
      case 'cancelled':
        return <Badge className="bg-destructive/10 text-destructive">취소</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getLevelBadge = (level: string) => {
    const colors = {
      '초급': 'bg-success/10 text-success border-success/30',
      '중급': 'bg-warning/10 text-warning border-warning/30',
      '고급': 'bg-destructive/10 text-destructive border-destructive/30'
    };
    return <Badge variant="outline" className={colors[level as keyof typeof colors]}>{level}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">강좌 관리</h1>
          <p className="text-muted-foreground">등록된 훈련 강좌들을 관리합니다</p>
        </div>
        <Dialog open={isAddCourseOpen} onOpenChange={setIsAddCourseOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              새 강좌 등록
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>새 강좌 등록</DialogTitle>
              <DialogDescription>
                새로운 훈련 강좌를 플랫폼에 등록합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="course-title" className="text-right">
                  강좌명 *
                </Label>
                <Input
                  id="course-title"
                  value={newCourse.title}
                  onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                  className="col-span-3"
                  placeholder="기본 순종 훈련 과정"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="course-institute" className="text-right">
                  기관명 *
                </Label>
                <Input
                  id="course-institute"
                  value={newCourse.institute}
                  onChange={(e) => setNewCourse({ ...newCourse, institute: e.target.value })}
                  className="col-span-3"
                  placeholder="서울반려견아카데미"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="course-trainer" className="text-right">
                  담당 훈련사 *
                </Label>
                <Input
                  id="course-trainer"
                  value={newCourse.trainer}
                  onChange={(e) => setNewCourse({ ...newCourse, trainer: e.target.value })}
                  className="col-span-3"
                  placeholder="김훈련사"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="course-category" className="text-right">
                  카테고리
                </Label>
                <Select value={newCourse.category} onValueChange={(value) => setNewCourse({ ...newCourse, category: value })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="기본 훈련">기본 훈련</SelectItem>
                    <SelectItem value="문제행동">문제행동</SelectItem>
                    <SelectItem value="어질리티">어질리티</SelectItem>
                    <SelectItem value="사회화">사회화</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="course-level" className="text-right">
                  난이도
                </Label>
                <Select value={newCourse.level} onValueChange={(value) => setNewCourse({ ...newCourse, level: value })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="초급">초급</SelectItem>
                    <SelectItem value="중급">중급</SelectItem>
                    <SelectItem value="고급">고급</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="course-duration" className="text-right">
                  기간 *
                </Label>
                <Input
                  id="course-duration"
                  value={newCourse.duration}
                  onChange={(e) => setNewCourse({ ...newCourse, duration: e.target.value })}
                  className="col-span-3"
                  placeholder="8주"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="course-price" className="text-right">
                  수강료 (원)
                </Label>
                <Input
                  id="course-price"
                  type="number"
                  value={newCourse.price}
                  onChange={(e) => setNewCourse({ ...newCourse, price: e.target.value })}
                  className="col-span-3"
                  placeholder="320000"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="course-max-students" className="text-right">
                  최대 인원
                </Label>
                <Input
                  id="course-max-students"
                  type="number"
                  value={newCourse.maxStudents}
                  onChange={(e) => setNewCourse({ ...newCourse, maxStudents: e.target.value })}
                  className="col-span-3"
                  placeholder="30"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="course-start-date" className="text-right">
                  시작일
                </Label>
                <Input
                  id="course-start-date"
                  type="date"
                  value={newCourse.startDate}
                  onChange={(e) => setNewCourse({ ...newCourse, startDate: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="course-end-date" className="text-right">
                  종료일
                </Label>
                <Input
                  id="course-end-date"
                  type="date"
                  value={newCourse.endDate}
                  onChange={(e) => setNewCourse({ ...newCourse, endDate: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="course-description" className="text-right">
                  강좌 설명
                </Label>
                <Textarea
                  id="course-description"
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  className="col-span-3"
                  placeholder="강좌에 대한 상세 설명을 입력하세요"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddCourse}>
                강좌 등록
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 강좌 수</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses.length}</div>
            <p className="text-xs text-muted-foreground">
              진행중 {courses.filter(c => c.status === 'active').length}개
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 등록생</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {courses.reduce((total, course) => total + course.enrolledStudents, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              모든 강좌 합계
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 수강료</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(courses.reduce((total, course) => total + course.price, 0) / courses.length / 1000)}만원
            </div>
            <p className="text-xs text-muted-foreground">
              강좌당 평균
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 수강률</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((courses.reduce((total, course) => total + (course.enrolledStudents / course.maxStudents), 0) / courses.length) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              정원 대비 등록률
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 검색 및 필터 */}
      <Card>
        <CardHeader>
          <CardTitle>강좌 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="강좌명, 기관명, 훈련사명으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="카테고리 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="기본 훈련">기본 훈련</SelectItem>
                <SelectItem value="문제행동">문제행동</SelectItem>
                <SelectItem value="어질리티">어질리티</SelectItem>
                <SelectItem value="사회화">사회화</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              고급 필터
            </Button>
          </div>

          {/* 강좌 테이블 */}
          <div className="border rounded-lg">
            <div className="grid grid-cols-9 gap-4 p-4 font-medium border-b bg-muted/50">
              <div>강좌명</div>
              <div>기관/훈련사</div>
              <div>카테고리</div>
              <div>레벨</div>
              <div>기간</div>
              <div>수강료</div>
              <div>등록현황</div>
              <div>상태</div>
              <div>작업</div>
            </div>
            {courses.map((course) => (
              <div key={course.id} className="grid grid-cols-9 gap-4 p-4 border-b last:border-b-0">
                <div>
                  <div className="font-medium">{course.title}</div>
                  <div className="text-sm text-muted-foreground line-clamp-2">{course.description}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">{course.institute}</div>
                  <div className="text-sm text-muted-foreground">{course.trainer}</div>
                </div>
                <div className="text-sm">{course.category}</div>
                <div>{getLevelBadge(course.level)}</div>
                <div className="text-sm">
                  <div>{course.duration}</div>
                  <div className="text-muted-foreground">{course.startDate}</div>
                </div>
                <div className="font-medium">
                  {(course.price / 1000).toFixed(0)}만원
                </div>
                <div className="text-center">
                  <div className="font-medium">{course.enrolledStudents}/{course.maxStudents}</div>
                  <div className="text-xs text-muted-foreground">
                    {Math.round((course.enrolledStudents / course.maxStudents) * 100)}% 달성
                  </div>
                </div>
                <div>{getStatusBadge(course.status)}</div>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      console.log('강좌 상세보기:', course.title);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      console.log('강좌 편집:', course.title);
                    }}
                    className="hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all duration-200"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      console.log('강좌 삭제:', course.title);
                    }}
                    className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive/90 hover:border-destructive/40 transition-all duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}