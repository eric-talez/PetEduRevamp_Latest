import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Check, 
  X, 
  Search, 
  Plus, 
  Filter, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Loader2,
  Edit,
  Trash2,
  Eye,
  PlusCircle,
  Users,
  Clock,
  FileText,
  BarChart4,
  CheckCircle2,
  PawPrint
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

// 교육 과정 인터페이스
interface Course {
  id: number;
  title: string;
  description: string;
  type: string;
  duration: number; // 주 단위
  status: 'active' | 'draft' | 'completed' | 'archived';
  studentCount: number;
  trainerCount: number;
  rating: number;
  createdAt: string;
  startDate?: string;
  endDate?: string;
  completionRate: number;
  thumbnail?: string;
  tags: string[];
  maxStudents: number;
  price: number;
  level: 'beginner' | 'intermediate' | 'advanced';
}

export default function InstituteCoursesManagement() {
  const { userName } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCourseDetailsDialog, setShowCourseDetailsDialog] = useState(false);
  const [showNewCourseDialog, setShowNewCourseDialog] = useState(false);
  
  // Dialog 상태 변경 디버깅용
  useEffect(() => {
    console.log('showNewCourseDialog 상태 변경:', showNewCourseDialog);
  }, [showNewCourseDialog]);
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<string | null>(null);
  
  // 임시 교육 과정 데이터
  const [courses, setCourses] = useState<Course[]>([]);
  
  // 교육 과정 데이터 로딩
  useEffect(() => {
    const loadCourses = async () => {
      setIsLoading(true);
      try {
        // 실제 API 구현 시 이 부분을 API 호출로 대체
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 임시 데이터
        const mockCourses: Course[] = [
          {
            id: 1,
            title: '기초 복종 훈련 A반',
            description: '기본적인 복종 명령과 사회화 훈련을 포함한 초급 과정입니다.',
            type: '기초 훈련',
            duration: 8,
            status: 'active',
            studentCount: 15,
            trainerCount: 2,
            rating: 4.7,
            createdAt: '2023-01-10',
            startDate: '2023-02-01',
            endDate: '2023-03-28',
            completionRate: 65,
            tags: ['기초', '복종', '사회화'],
            maxStudents: 20,
            price: 350000,
            level: 'beginner'
          },
          {
            id: 2,
            title: '문제행동 교정 심화 과정',
            description: '공격성, 분리불안 등 다양한 문제행동을 교정하는 심화 과정입니다.',
            type: '문제행동 교정',
            duration: 12,
            status: 'active',
            studentCount: 8,
            trainerCount: 1,
            rating: 4.8,
            createdAt: '2023-02-15',
            startDate: '2023-03-10',
            endDate: '2023-06-02',
            completionRate: 42,
            tags: ['문제행동', '심화', '공격성', '분리불안'],
            maxStudents: 10,
            price: 480000,
            level: 'advanced'
          },
          {
            id: 3,
            title: '사회화 트레이닝',
            description: '여러 환경과 상황에서 안정적으로 행동할 수 있도록 사회화를 진행하는 과정입니다.',
            type: '사회화',
            duration: 6,
            status: 'draft',
            studentCount: 0,
            trainerCount: 1,
            rating: 0,
            createdAt: '2023-04-05',
            completionRate: 0,
            tags: ['사회화', '환경 적응', '스트레스 관리'],
            maxStudents: 15,
            price: 300000,
            level: 'intermediate'
          },
          {
            id: 4,
            title: '어질리티 기초 과정',
            description: '반려견 스포츠인 어질리티의 기초를 배우는 과정입니다.',
            type: '특수 훈련',
            duration: 10,
            status: 'completed',
            studentCount: 12,
            trainerCount: 1,
            rating: 4.6,
            createdAt: '2022-10-10',
            startDate: '2022-11-01',
            endDate: '2023-01-10',
            completionRate: 100,
            tags: ['어질리티', '스포츠', '신체 활동'],
            maxStudents: 12,
            price: 420000,
            level: 'intermediate'
          },
          {
            id: 5,
            title: '반려견 매너 교실',
            description: '일상생활에서 필요한 기본 예절과 매너를 가르치는 과정입니다.',
            type: '기초 훈련',
            duration: 4,
            status: 'active',
            studentCount: 18,
            trainerCount: 2,
            rating: 4.5,
            createdAt: '2023-03-20',
            startDate: '2023-04-15',
            endDate: '2023-05-13',
            completionRate: 80,
            tags: ['매너', '예절', '기초'],
            maxStudents: 20,
            price: 200000,
            level: 'beginner'
          }
        ];
        
        setCourses(mockCourses);
      } catch (error) {
        toast({
          title: "데이터 로딩 오류",
          description: "교육 과정 정보를 불러오는 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCourses();
  }, [toast]);
  
  // 교육 과정 상태에 따른 필터링
  const getFilteredCourses = () => {
    let filtered = [...courses];
    
    // 탭에 따른 필터링
    if (activeTab === 'active') {
      filtered = filtered.filter(course => course.status === 'active');
    } else if (activeTab === 'draft') {
      filtered = filtered.filter(course => course.status === 'draft');
    } else if (activeTab === 'completed') {
      filtered = filtered.filter(course => course.status === 'completed');
    } else if (activeTab === 'archived') {
      filtered = filtered.filter(course => course.status === 'archived');
    }
    
    // 검색어 필터링
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(course => 
        course.title.toLowerCase().includes(query) || 
        course.description.toLowerCase().includes(query) ||
        course.type.toLowerCase().includes(query)
      );
    }
    
    // 과정 유형 필터링
    if (filterType) {
      filtered = filtered.filter(course => course.type === filterType);
    }
    
    // 난이도 필터링
    if (filterLevel) {
      filtered = filtered.filter(course => course.level === filterLevel);
    }
    
    // 정렬
    filtered.sort((a, b) => {
      if (sortBy === 'title') {
        return sortOrder === 'asc' 
          ? a.title.localeCompare(b.title) 
          : b.title.localeCompare(a.title);
      } else if (sortBy === 'studentCount') {
        return sortOrder === 'asc' 
          ? a.studentCount - b.studentCount 
          : b.studentCount - a.studentCount;
      } else if (sortBy === 'rating') {
        return sortOrder === 'asc' 
          ? a.rating - b.rating 
          : b.rating - a.rating;
      }
      return 0;
    });
    
    return filtered;
  };
  
  // 페이지네이션 처리
  const filteredCourses = getFilteredCourses();
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);
  const paginatedCourses = filteredCourses.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );
  
  // 교육 과정 상태 변경 함수
  const updateCourseStatus = (courseId: number, newStatus: 'active' | 'draft' | 'completed' | 'archived') => {
    setCourses(prev => prev.map(course => 
      course.id === courseId ? { ...course, status: newStatus } : course
    ));
    
    toast({
      title: "교육 과정 상태 업데이트",
      description: `교육 과정 상태가 ${
        newStatus === 'active' ? '활성화' : 
        newStatus === 'draft' ? '초안' : 
        newStatus === 'completed' ? '완료' : 
        '보관'
      }로 변경되었습니다.`,
    });
  };
  
  // 교육 과정 상세 정보 보기
  const viewCourseDetails = (course: Course) => {
    setSelectedCourse(course);
    setShowCourseDetailsDialog(true);
  };
  
  // 새 교육 과정 생성 핸들러
  const handleCreateCourse = () => {
    console.log('handleCreateCourse 함수 실행됨');
    setShowNewCourseDialog(true);
    console.log('Dialog 표시 요청됨:', showNewCourseDialog);
  };
  
  // 새로고침 핸들러
  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      toast({
        title: "데이터 새로고침",
        description: "교육 과정 목록이 업데이트되었습니다.",
      });
      setIsLoading(false);
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">교육 과정 데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">교육 과정 관리</h1>
          <p className="text-muted-foreground mt-1">기관의 교육 과정을 관리하고 새로운 과정을 개설합니다.</p>
        </div>
        <Button 
          onClick={(e) => {
            console.log('새 교육 과정 버튼 클릭됨');
            e.preventDefault();
            handleCreateCourse();
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          새 교육 과정
        </Button>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">전체 ({courses.length})</TabsTrigger>
            <TabsTrigger value="active">활성 ({courses.filter(c => c.status === 'active').length})</TabsTrigger>
            <TabsTrigger value="draft">초안 ({courses.filter(c => c.status === 'draft').length})</TabsTrigger>
            <TabsTrigger value="completed">완료 ({courses.filter(c => c.status === 'completed').length})</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-md px-3 py-1">
              <Search className="h-4 w-4 text-muted-foreground mr-2" />
              <Input 
                placeholder="교육 과정 검색..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="border-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
              />
            </div>
            
            <Select value={filterType || ''} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="과정 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 유형</SelectItem>
                <SelectItem value="기초 훈련">기초 훈련</SelectItem>
                <SelectItem value="문제행동 교정">문제행동 교정</SelectItem>
                <SelectItem value="사회화">사회화</SelectItem>
                <SelectItem value="특수 훈련">특수 훈련</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="ghost" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <TabsContent value="all" className="mt-4 p-0">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">No.</TableHead>
                    <TableHead>과정명</TableHead>
                    <TableHead className="hidden md:table-cell">유형</TableHead>
                    <TableHead className="hidden md:table-cell">기간</TableHead>
                    <TableHead className="hidden md:table-cell">수강생</TableHead>
                    <TableHead className="hidden md:table-cell">진행률</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCourses.length > 0 ? (
                    paginatedCourses.map((course, index) => (
                      <TableRow key={course.id} className="cursor-pointer hover:bg-muted/50" onClick={() => viewCourseDetails(course)}>
                        <TableCell className="font-medium w-[50px]">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>
                          <div className="font-medium">{course.title}</div>
                          <div className="text-sm text-muted-foreground">{course.description.substring(0, 50)}...</div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{course.type}</TableCell>
                        <TableCell className="hidden md:table-cell">{course.duration}주</TableCell>
                        <TableCell className="hidden md:table-cell">{course.studentCount}/{course.maxStudents}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <Progress value={course.completionRate} className="h-2 w-16" />
                            <span className="text-sm">{course.completionRate}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            course.status === 'active' ? 'default' : 
                            course.status === 'draft' ? 'outline' : 
                            course.status === 'completed' ? 'secondary' :
                            'destructive'
                          }>
                            {course.status === 'active' ? '진행중' : 
                             course.status === 'draft' ? '초안' : 
                             course.status === 'completed' ? '완료' : 
                             '보관'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={(e) => {
                                e.stopPropagation();
                                viewCourseDetails(course);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {course.status !== 'active' && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateCourseStatus(course.id, 'active');
                                }}
                              >
                                <Check className="h-4 w-4 text-success" />
                              </Button>
                            )}
                            {course.status === 'active' && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateCourseStatus(course.id, 'completed');
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        표시할 교육 과정이 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex items-center justify-between py-4">
              <div className="text-sm text-muted-foreground">
                총 {filteredCourses.length}개 과정 중 {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredCourses.length)}개 표시
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {currentPage} / {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="active" className="mt-4 p-0">
          {/* 활성 교육 과정 탭 내용 - 기본 탭과 동일한 구조 */}
        </TabsContent>
        
        <TabsContent value="draft" className="mt-4 p-0">
          {/* 초안 교육 과정 탭 내용 - 기본 탭과 동일한 구조 */}
        </TabsContent>
        
        <TabsContent value="completed" className="mt-4 p-0">
          {/* 완료된 교육 과정 탭 내용 - 기본 탭과 동일한 구조 */}
        </TabsContent>
      </Tabs>
      
      {/* 교육 과정 상세 정보 다이얼로그 */}
      <Dialog open={showCourseDetailsDialog} onOpenChange={setShowCourseDetailsDialog}>
        <DialogContent className="max-w-4xl">
          {selectedCourse && (
            <>
              <DialogHeader>
                <DialogTitle>교육 과정 상세 정보</DialogTitle>
                <DialogDescription>
                  교육 과정의 자세한 정보 및 현황을 확인합니다.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                <div className="col-span-1">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{selectedCourse.title}</CardTitle>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedCourse.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">교육 과정 설명</p>
                        <p className="text-sm">{selectedCourse.description}</p>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">과정 유형</span>
                          <span className="text-sm font-medium">{selectedCourse.type}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">기간</span>
                          <span className="text-sm font-medium">{selectedCourse.duration}주</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">난이도</span>
                          <span className="text-sm font-medium">
                            {selectedCourse.level === 'beginner' ? '초급' : 
                             selectedCourse.level === 'intermediate' ? '중급' : 
                             '고급'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">수강료</span>
                          <span className="text-sm font-medium">{selectedCourse.price.toLocaleString()}원</span>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">상태</span>
                          <Badge variant={
                            selectedCourse.status === 'active' ? 'default' : 
                            selectedCourse.status === 'draft' ? 'outline' : 
                            selectedCourse.status === 'completed' ? 'secondary' :
                            'destructive'
                          }>
                            {selectedCourse.status === 'active' ? '진행중' : 
                             selectedCourse.status === 'draft' ? '초안' : 
                             selectedCourse.status === 'completed' ? '완료' : 
                             '보관'}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">훈련사 수</span>
                          <span className="text-sm font-medium">{selectedCourse.trainerCount}명</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">수강생 수</span>
                          <span className="text-sm font-medium">{selectedCourse.studentCount}/{selectedCourse.maxStudents}명</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">평점</span>
                          <span className="text-sm font-medium">
                            {selectedCourse.rating > 0 ? selectedCourse.rating.toFixed(1) : '-'}
                          </span>
                        </div>
                      </div>
                      
                      {selectedCourse.startDate && selectedCourse.endDate && (
                        <>
                          <Separator />
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">시작일</span>
                              <span className="text-sm font-medium">{selectedCourse.startDate}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">종료일</span>
                              <span className="text-sm font-medium">{selectedCourse.endDate}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
                
                <div className="col-span-1 md:col-span-2">
                  <Tabs defaultValue="progress">
                    <TabsList className="grid grid-cols-3 mb-4">
                      <TabsTrigger value="progress">진행 현황</TabsTrigger>
                      <TabsTrigger value="students">수강생</TabsTrigger>
                      <TabsTrigger value="trainers">훈련사</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="progress" className="space-y-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">과정 진행 현황</CardTitle>
                          <CardDescription>전체 진행률 및 주차별 상태</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium">전체 진행률</span>
                              <span className="text-sm">{selectedCourse.completionRate}%</span>
                            </div>
                            <Progress value={selectedCourse.completionRate} className="h-2" />
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-sm font-medium mb-2">주차별 진행 상태</p>
                            {Array.from({ length: selectedCourse.duration }).map((_, index) => (
                              <div key={index} className="flex items-center">
                                <div className="w-8 text-sm text-muted-foreground">{index + 1}주차</div>
                                <div className="flex-1 ml-4">
                                  <div className="flex items-center">
                                    <div 
                                      className={`w-full h-2 rounded ${
                                        index < Math.floor(selectedCourse.duration * (selectedCourse.completionRate / 100)) 
                                          ? 'bg-primary' 
                                          : index === Math.floor(selectedCourse.duration * (selectedCourse.completionRate / 100))
                                            ? 'bg-warning/40'
                                            : 'bg-gray-200 dark:bg-gray-700'
                                      }`}
                                    ></div>
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      {index < Math.floor(selectedCourse.duration * (selectedCourse.completionRate / 100)) 
                                        ? '완료' 
                                        : index === Math.floor(selectedCourse.duration * (selectedCourse.completionRate / 100))
                                          ? '진행중'
                                          : '예정'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex flex-col items-center text-center">
                              <Users className="h-8 w-8 text-primary mb-2" />
                              <div className="text-2xl font-bold">{selectedCourse.studentCount}</div>
                              <p className="text-xs text-muted-foreground">현재 수강생</p>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex flex-col items-center text-center">
                              <Clock className="h-8 w-8 text-warning mb-2" />
                              <div className="text-2xl font-bold">{selectedCourse.duration}주</div>
                              <p className="text-xs text-muted-foreground">총 교육 기간</p>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex flex-col items-center text-center">
                              <PawPrint className="h-8 w-8 text-success mb-2" />
                              <div className="text-2xl font-bold">{Math.floor(selectedCourse.studentCount * 0.85)}</div>
                              <p className="text-xs text-muted-foreground">집중 훈련견</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">최근 현황</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex items-start">
                              <div className="h-2 w-2 rounded-full bg-primary mt-2 mr-3"></div>
                              <div>
                                <p className="text-sm font-medium">주간 보고서 업데이트</p>
                                <p className="text-xs text-muted-foreground">5월 2일에 8주차 보고서가 업데이트되었습니다.</p>
                              </div>
                            </div>
                            <div className="flex items-start">
                              <div className="h-2 w-2 rounded-full bg-success mt-2 mr-3"></div>
                              <div>
                                <p className="text-sm font-medium">새 수강생 등록</p>
                                <p className="text-xs text-muted-foreground">2명의 새로운 수강생이 등록되었습니다.</p>
                              </div>
                            </div>
                            <div className="flex items-start">
                              <div className="h-2 w-2 rounded-full bg-warning mt-2 mr-3"></div>
                              <div>
                                <p className="text-sm font-medium">평가 진행</p>
                                <p className="text-xs text-muted-foreground">7주차 중간 평가가 진행되었습니다.</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    <TabsContent value="students">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">수강생 명단</CardTitle>
                          <CardDescription>현재 등록된 수강생 목록</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>수강생</TableHead>
                                <TableHead>반려견</TableHead>
                                <TableHead>등록일</TableHead>
                                <TableHead>진행률</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback>김</AvatarFallback>
                                    </Avatar>
                                    <span>김철수</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <span>코코</span>
                                    <Badge variant="outline" className="text-xs">푸들</Badge>
                                  </div>
                                </TableCell>
                                <TableCell>2023-02-05</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Progress value={75} className="h-2 w-20" />
                                    <span className="text-xs">75%</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback>박</AvatarFallback>
                                    </Avatar>
                                    <span>박지영</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <span>몽이</span>
                                    <Badge variant="outline" className="text-xs">말티즈</Badge>
                                  </div>
                                </TableCell>
                                <TableCell>2023-02-10</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Progress value={65} className="h-2 w-20" />
                                    <span className="text-xs">65%</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback>이</AvatarFallback>
                                    </Avatar>
                                    <span>이미나</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <span>달래</span>
                                    <Badge variant="outline" className="text-xs">시바견</Badge>
                                  </div>
                                </TableCell>
                                <TableCell>2023-02-12</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Progress value={70} className="h-2 w-20" />
                                    <span className="text-xs">70%</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    <TabsContent value="trainers">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">담당 훈련사</CardTitle>
                          <CardDescription>교육 과정 담당 훈련사 목록</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-center">
                                  <Avatar className="h-10 w-10 mr-4">
                                    <AvatarFallback>김</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <h3 className="font-medium">김영수</h3>
                                    <p className="text-sm text-muted-foreground">수석 훈련사</p>
                                    <div className="flex items-center mt-1">
                                      <Badge variant="secondary" className="text-xs mr-1">기초 훈련</Badge>
                                      <Badge variant="secondary" className="text-xs">사회화</Badge>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-center">
                                  <Avatar className="h-10 w-10 mr-4">
                                    <AvatarFallback>박</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <h3 className="font-medium">박지민</h3>
                                    <p className="text-sm text-muted-foreground">보조 훈련사</p>
                                    <div className="flex items-center mt-1">
                                      <Badge variant="secondary" className="text-xs">사회화</Badge>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
              
              <DialogFooter className="flex justify-between items-center">
                <div className="flex gap-2">
                  {selectedCourse.status !== 'active' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        updateCourseStatus(selectedCourse.id, 'active');
                        setShowCourseDetailsDialog(false);
                      }}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      활성화
                    </Button>
                  )}
                  {selectedCourse.status === 'active' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        updateCourseStatus(selectedCourse.id, 'completed');
                        setShowCourseDetailsDialog(false);
                      }}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      완료 처리
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    <Edit className="mr-2 h-4 w-4" />
                    수정
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileText className="mr-2 h-4 w-4" />
                    보고서
                  </Button>
                </div>
                <DialogClose asChild>
                  <Button variant="secondary" size="sm">
                    닫기
                  </Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* 새 교육 과정 생성 다이얼로그 */}
      <Dialog 
        open={showNewCourseDialog} 
        onOpenChange={(open) => {
          console.log('Dialog onOpenChange:', open);
          setShowNewCourseDialog(open);
        }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>새 교육 과정 생성</DialogTitle>
            <DialogDescription>
              새로운 교육 과정 정보를 입력하세요. 나중에 수정할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                과정명
              </Label>
              <Input
                id="title"
                placeholder="교육 과정 이름"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                설명
              </Label>
              <Input
                id="description"
                placeholder="과정에 대한 간략한 설명"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                유형
              </Label>
              <Select>
                <SelectTrigger id="type" className="col-span-3">
                  <SelectValue placeholder="과정 유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="기초 훈련">기초 훈련</SelectItem>
                  <SelectItem value="문제행동 교정">문제행동 교정</SelectItem>
                  <SelectItem value="사회화">사회화</SelectItem>
                  <SelectItem value="특수 훈련">특수 훈련</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="duration" className="text-right">
                기간 (주)
              </Label>
              <Input
                id="duration"
                type="number"
                min="1"
                placeholder="8"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="maxStudents" className="text-right">
                최대 수강생
              </Label>
              <Input
                id="maxStudents"
                type="number"
                min="1"
                placeholder="20"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                수강료
              </Label>
              <Input
                id="price"
                type="number"
                min="0"
                placeholder="350000"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="level" className="text-right">
                난이도
              </Label>
              <Select>
                <SelectTrigger id="level" className="col-span-3">
                  <SelectValue placeholder="난이도 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">초급</SelectItem>
                  <SelectItem value="intermediate">중급</SelectItem>
                  <SelectItem value="advanced">고급</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => {
                toast({
                  title: "교육 과정 생성",
                  description: "새 교육 과정이 초안으로 생성되었습니다.",
                });
                setShowNewCourseDialog(false);
              }}
            >
              과정 생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}