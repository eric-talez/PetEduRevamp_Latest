import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
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
  PlusCircle, 
  Filter, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Loader2,
  PawPrint,
  Pencil,
  FileText,
  MessageSquare,
  Mail,
  ArrowUpRight,
  BookOpen,
  UserRoundCheck,
  Activity,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

// 수강생 정보 인터페이스
interface Student {
  id: number;
  name: string;
  email: string;
  phone: string;
  petName: string;
  petBreed: string;
  petAge: number;
  joinDate: string;
  status: 'active' | 'inactive' | 'pending';
  courseCount: number;
  completedCourses: number;
  image?: string;
  petImage?: string;
  lastActive: string;
  missedClasses: number;
  notes?: string;
  activeCourses: {
    id: number;
    name: string;
    progress: number;
    trainer: string;
    nextClass?: string;
  }[];
}

// 훈련사 간단 정보 인터페이스
interface Trainer {
  id: number;
  name: string;
  image?: string;
  specialty: string;
}

export default function InstituteStudentsManagement() {
  const { userName } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentDetailsDialog, setShowStudentDetailsDialog] = useState(false);
  const [showAddStudentDialog, setShowAddStudentDialog] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterCourse, setFilterCourse] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  
  // API에서 수강생 데이터 로딩
  const { data: students = [], isLoading, isError, refetch } = useQuery<Student[]>({
    queryKey: ['/api/institute/students'],
  });

  // API에서 훈련사 데이터 로딩
  const { data: trainers = [] } = useQuery<Trainer[]>({
    queryKey: ['/api/institute/trainers'],
  });
  
  // 수강생 상태에 따른 필터링
  const getFilteredStudents = () => {
    let filtered = [...students];
    
    // 탭에 따른 필터링
    if (activeTab === 'active') {
      filtered = filtered.filter(student => student.status === 'active');
    } else if (activeTab === 'pending') {
      filtered = filtered.filter(student => student.status === 'pending');
    } else if (activeTab === 'inactive') {
      filtered = filtered.filter(student => student.status === 'inactive');
    }
    
    // 검색어 필터링
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(student => 
        student.name.toLowerCase().includes(query) || 
        student.email.toLowerCase().includes(query) ||
        student.petName.toLowerCase().includes(query) ||
        student.petBreed.toLowerCase().includes(query)
      );
    }
    
    // 수업 필터링 (활성 수업이 있는 학생들만)
    if (filterCourse === 'active') {
      filtered = filtered.filter(student => student.activeCourses.length > 0);
    }
    
    // 상태 필터링
    if (filterStatus) {
      filtered = filtered.filter(student => student.status === filterStatus);
    }
    
    // 정렬
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc' 
          ? a.name.localeCompare(b.name) 
          : b.name.localeCompare(a.name);
      } else if (sortBy === 'joinDate') {
        return sortOrder === 'asc' 
          ? new Date(a.joinDate).getTime() - new Date(b.joinDate).getTime() 
          : new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime();
      } else if (sortBy === 'courseCount') {
        return sortOrder === 'asc' 
          ? a.courseCount - b.courseCount 
          : b.courseCount - a.courseCount;
      }
      return 0;
    });
    
    return filtered;
  };
  
  // 페이지네이션 처리
  const filteredStudents = getFilteredStudents();
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );
  
  // 수강생 상태 변경 함수
  const updateStudentStatus = (studentId: number, newStatus: 'active' | 'inactive' | 'pending') => {
    setStudents(prev => prev.map(student => 
      student.id === studentId ? { ...student, status: newStatus } : student
    ));
    
    toast({
      title: "수강생 상태 업데이트",
      description: `수강생 상태가 ${
        newStatus === 'active' ? '활성화' : 
        newStatus === 'pending' ? '대기 중' : 
        '비활성화'
      }로 변경되었습니다.`,
      variant: newStatus === 'active' ? 'default' : 'destructive',
    });
  };
  
  // 수강생 상세 정보 보기
  const viewStudentDetails = (student: Student) => {
    setSelectedStudent(student);
    setShowStudentDetailsDialog(true);
  };
  
  // 새 수강생 추가 핸들러
  const handleAddStudent = () => {
    setShowAddStudentDialog(true);
  };
  
  // 데이터 새로고침 핸들러
  const handleRefresh = () => {
    refetch();
    toast({
      title: "데이터 새로고침",
      description: "수강생 목록이 업데이트되었습니다.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">수강생 데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
        <p className="text-lg font-medium mb-2">데이터를 불러오는데 실패했습니다</p>
        <p className="text-sm text-muted-foreground mb-4">잠시 후 다시 시도해주세요</p>
        <Button onClick={() => refetch()}>다시 시도</Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">수강생 관리</h1>
          <p className="text-muted-foreground mt-1">기관의 수강생과 반려견 정보를 관리합니다.</p>
        </div>
        <Button onClick={handleAddStudent}>
          <PlusCircle className="mr-2 h-4 w-4" />
          신규 수강생 등록
        </Button>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">전체 ({students.length})</TabsTrigger>
            <TabsTrigger value="active">활성 ({students.filter(s => s.status === 'active').length})</TabsTrigger>
            <TabsTrigger value="pending">승인 대기 ({students.filter(s => s.status === 'pending').length})</TabsTrigger>
            <TabsTrigger value="inactive">비활성 ({students.filter(s => s.status === 'inactive').length})</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-md px-3 py-1">
              <Search className="h-4 w-4 text-muted-foreground mr-2" />
              <Input 
                placeholder="수강생 또는 반려견 검색..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="border-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
              />
            </div>
            
            <Select value={filterCourse || ''} onValueChange={setFilterCourse}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="수업 상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 수강생</SelectItem>
                <SelectItem value="active">활성 수업 있음</SelectItem>
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
                    <TableHead>수강생</TableHead>
                    <TableHead>반려견</TableHead>
                    <TableHead className="hidden md:table-cell">과정 수</TableHead>
                    <TableHead className="hidden md:table-cell">최근 활동</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedStudents.length > 0 ? (
                    paginatedStudents.map((student, index) => (
                      <TableRow key={student.id} className="cursor-pointer hover:bg-muted/50" onClick={() => viewStudentDetails(student)}>
                        <TableCell className="font-medium w-[50px]">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={student.image} alt={student.name} />
                              <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{student.name}</div>
                              <div className="text-sm text-muted-foreground">{student.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={student.petImage} alt={student.petName} />
                              <AvatarFallback>
                                <PawPrint className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{student.petName}</div>
                              <div className="text-sm text-muted-foreground">{student.petBreed} ({student.petAge}세)</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-1">
                            <span>{student.activeCourses.length} 진행중</span>
                            {student.completedCourses > 0 && (
                              <span className="text-success text-sm ml-1">
                                {student.completedCourses} 완료
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {student.lastActive}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            student.status === 'active' ? 'default' : 
                            student.status === 'pending' ? 'outline' : 
                            'destructive'
                          }>
                            {student.status === 'active' ? '활성' : 
                             student.status === 'pending' ? '승인 대기' : 
                             '비활성'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {student.status === 'pending' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateStudentStatus(student.id, 'active');
                                }}
                              >
                                <Check className="h-4 w-4 text-success" />
                              </Button>
                            )}
                            {student.status === 'inactive' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateStudentStatus(student.id, 'active');
                                }}
                              >
                                <Check className="h-4 w-4 text-success" />
                              </Button>
                            )}
                            {student.status === 'active' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateStudentStatus(student.id, 'inactive');
                                }}
                              >
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        표시할 수강생이 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex items-center justify-between py-4">
              <div className="text-sm text-muted-foreground">
                총 {filteredStudents.length}명의 수강생 중 {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredStudents.length)}명 표시
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
          {/* 활성 수강생 탭 내용 - 기본 탭과 동일한 구조 */}
        </TabsContent>
        
        <TabsContent value="pending" className="mt-4 p-0">
          {/* 승인 대기 수강생 탭 내용 - 기본 탭과 동일한 구조 */}
        </TabsContent>
        
        <TabsContent value="inactive" className="mt-4 p-0">
          {/* 비활성 수강생 탭 내용 - 기본 탭과 동일한 구조 */}
        </TabsContent>
      </Tabs>
      
      {/* 수강생 상세 정보 다이얼로그 */}
      <Dialog open={showStudentDetailsDialog} onOpenChange={setShowStudentDetailsDialog}>
        <DialogContent className="max-w-4xl">
          {selectedStudent && (
            <>
              <DialogHeader>
                <DialogTitle>수강생 상세 정보</DialogTitle>
                <DialogDescription>
                  수강생과 반려견의 자세한 정보 및 수업 현황을 확인합니다.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                <div className="col-span-1">
                  <div className="flex flex-col items-center">
                    <Avatar className="h-24 w-24 mb-4">
                      <AvatarImage src={selectedStudent.image} alt={selectedStudent.name} />
                      <AvatarFallback className="text-2xl">{selectedStudent.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <h3 className="text-xl font-semibold">{selectedStudent.name}</h3>
                    <Badge className="mt-2 mb-4" variant={
                      selectedStudent.status === 'active' ? 'default' : 
                      selectedStudent.status === 'pending' ? 'outline' : 
                      'destructive'
                    }>
                      {selectedStudent.status === 'active' ? '활성' : 
                       selectedStudent.status === 'pending' ? '승인 대기' : 
                       '비활성'}
                    </Badge>
                    
                    <Card className="w-full mt-2">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">수강생 정보</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center text-sm">
                          <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{selectedStudent.email}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{selectedStudent.phone}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>가입일: {selectedStudent.joinDate}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Activity className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>최근 활동: {selectedStudent.lastActive}</span>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="w-full mt-4">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">반려견 정보</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center mb-4">
                          <Avatar className="h-16 w-16 mr-4">
                            <AvatarImage src={selectedStudent.petImage} alt={selectedStudent.petName} />
                            <AvatarFallback>
                              <PawPrint className="h-6 w-6" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="text-lg font-medium">{selectedStudent.petName}</h3>
                            <p className="text-sm text-muted-foreground">{selectedStudent.petBreed}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">나이</span>
                            <span className="text-sm font-medium">{selectedStudent.petAge}세</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">수업 누락</span>
                            <span className="text-sm font-medium">{selectedStudent.missedClasses}회</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                
                <div className="col-span-1 md:col-span-2">
                  <Tabs defaultValue="courses">
                    <TabsList className="grid grid-cols-3 mb-4">
                      <TabsTrigger value="courses">수업 현황</TabsTrigger>
                      <TabsTrigger value="history">이력</TabsTrigger>
                      <TabsTrigger value="notes">메모</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="courses" className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">진행 중인 과정</h3>
                        <Button variant="outline" size="sm">
                          <PlusCircle className="h-4 w-4 mr-2" />
                          수업 추가
                        </Button>
                      </div>
                      
                      {selectedStudent.activeCourses.length > 0 ? (
                        <div className="space-y-4">
                          {selectedStudent.activeCourses.map(course => (
                            <Card key={course.id}>
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <h4 className="font-medium">{course.name}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      훈련사: {course.trainer}
                                    </p>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => {
                                      toast({
                                        title: "과정 상세보기",
                                        description: `${course.name} 과정 상세 정보를 확인합니다.`,
                                      });
                                      setLocation(`/courses/${course.id}`);
                                    }}
                                    data-testid={`button-view-course-${course.id}`}
                                  >
                                    <ArrowUpRight className="h-4 w-4" />
                                  </Button>
                                </div>
                                
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center text-sm">
                                    <span>진행률</span>
                                    <span>{course.progress}%</span>
                                  </div>
                                  <Progress value={course.progress} className="h-2" />
                                  
                                  {course.nextClass && (
                                    <div className="flex items-center justify-between mt-3">
                                      <div className="flex items-center text-xs text-muted-foreground">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        다음 수업
                                      </div>
                                      <span className="text-xs font-medium">{course.nextClass}</span>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <Card>
                          <CardContent className="p-6 text-center">
                            <p className="text-muted-foreground mb-4">현재 진행 중인 과정이 없습니다.</p>
                            <Button 
                              variant="outline"
                              onClick={() => {
                                toast({
                                  title: "과정 등록",
                                  description: "과정 등록 페이지로 이동합니다.",
                                });
                                setLocation("/courses");
                              }}
                              data-testid="button-register-course"
                            >
                              과정 등록하기
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                      
                      {selectedStudent.completedCourses > 0 && (
                        <div className="mt-6">
                          <h3 className="text-lg font-medium mb-4">완료된 과정</h3>
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h4 className="font-medium">반려견 기초 사회화 과정</h4>
                                  <p className="text-sm text-muted-foreground">
                                    완료일: 2023-03-15
                                  </p>
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    toast({
                                      title: "과정 결과 보기",
                                      description: "반려견 기초 사회화 과정의 결과를 확인합니다.",
                                    });
                                  }}
                                  data-testid="button-view-completed-course-result"
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  결과 보기
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="history">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">활동 기록</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex items-start">
                              <div className="h-2 w-2 rounded-full bg-primary mt-2 mr-3"></div>
                              <div>
                                <p className="text-sm font-medium">'기초 복종 훈련 A반' 수업 참석</p>
                                <p className="text-xs text-muted-foreground">2023년 5월 8일</p>
                              </div>
                            </div>
                            <div className="flex items-start">
                              <div className="h-2 w-2 rounded-full bg-success mt-2 mr-3"></div>
                              <div>
                                <p className="text-sm font-medium">'사회화 훈련' 과정 등록</p>
                                <p className="text-xs text-muted-foreground">2023년 4월 15일</p>
                              </div>
                            </div>
                            <div className="flex items-start">
                              <div className="h-2 w-2 rounded-full bg-destructive mt-2 mr-3"></div>
                              <div>
                                <p className="text-sm font-medium">'기초 복종 훈련 A반' 수업 불참</p>
                                <p className="text-xs text-muted-foreground">2023년 4월 10일</p>
                              </div>
                            </div>
                            <div className="flex items-start">
                              <div className="h-2 w-2 rounded-full bg-primary mt-2 mr-3"></div>
                              <div>
                                <p className="text-sm font-medium">'기초 복종 훈련 A반' 수업 참석</p>
                                <p className="text-xs text-muted-foreground">2023년 4월 3일</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    <TabsContent value="notes">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">강사 메모</CardTitle>
                          <CardDescription>수강생에 대한 메모 및 특이사항</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {selectedStudent.notes ? (
                            <div className="space-y-4">
                              <div className="bg-muted/50 p-3 rounded-md">
                                <p className="text-sm">{selectedStudent.notes}</p>
                                <div className="flex justify-end mt-2">
                                  <p className="text-xs text-muted-foreground">김영수 훈련사 - 2023년 4월 25일</p>
                                </div>
                              </div>
                              <div className="bg-muted/50 p-3 rounded-md">
                                <p className="text-sm">사회화 트레이닝 중 다른 강아지와 상호작용이 개선되고 있습니다. 다만 갑작스러운 소리에 여전히 민감하게 반응하는 편입니다.</p>
                                <div className="flex justify-end mt-2">
                                  <p className="text-xs text-muted-foreground">박지민 훈련사 - 2023년 3월 10일</p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-6">
                              <p className="text-muted-foreground mb-4">등록된 메모가 없습니다.</p>
                              <Button variant="outline" size="sm">
                                <Pencil className="h-4 w-4 mr-2" />
                                메모 추가
                              </Button>
                            </div>
                          )}
                        </CardContent>
                        <CardFooter>
                          <div className="w-full">
                            <div className="flex space-x-2 w-full">
                              <Input placeholder="새 메모 작성..." />
                              <Button variant="default">
                                저장
                              </Button>
                            </div>
                          </div>
                        </CardFooter>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
              
              <DialogFooter className="flex justify-between items-center">
                <div className="flex gap-2">
                  {selectedStudent.status !== 'active' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        updateStudentStatus(selectedStudent.id, 'active');
                        setShowStudentDetailsDialog(false);
                      }}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      활성화
                    </Button>
                  )}
                  {selectedStudent.status === 'active' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        updateStudentStatus(selectedStudent.id, 'inactive');
                        setShowStudentDetailsDialog(false);
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      비활성화
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    <Pencil className="mr-2 h-4 w-4" />
                    정보 수정
                  </Button>
                  <Button variant="outline" size="sm">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    메시지 보내기
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
      
      {/* 신규 수강생 등록 다이얼로그 */}
      <Dialog open={showAddStudentDialog} onOpenChange={setShowAddStudentDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>신규 수강생 등록</DialogTitle>
            <DialogDescription>
              새로운 수강생 및 반려견 정보를 등록합니다.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="owner">
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger value="owner">수강생 정보</TabsTrigger>
              <TabsTrigger value="pet">반려견 정보</TabsTrigger>
            </TabsList>
            
            <TabsContent value="owner">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    이름
                  </Label>
                  <Input
                    id="name"
                    placeholder="이름 입력"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    이메일
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="이메일 주소"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">
                    연락처
                  </Label>
                  <Input
                    id="phone"
                    placeholder="전화번호"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="address" className="text-right">
                    주소
                  </Label>
                  <Input
                    id="address"
                    placeholder="주소 입력"
                    className="col-span-3"
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="pet">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="petName" className="text-right">
                    반려견 이름
                  </Label>
                  <Input
                    id="petName"
                    placeholder="반려견 이름"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="petBreed" className="text-right">
                    견종
                  </Label>
                  <Input
                    id="petBreed"
                    placeholder="견종 입력"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="petAge" className="text-right">
                    나이
                  </Label>
                  <Input
                    id="petAge"
                    type="number"
                    placeholder="만 나이"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">성별</Label>
                  <div className="flex items-center space-x-4 col-span-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="male" />
                      <label htmlFor="male" className="text-sm">수컷</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="female" />
                      <label htmlFor="female" className="text-sm">암컷</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="neutered" />
                      <label htmlFor="neutered" className="text-sm">중성화 완료</label>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="specialNeeds" className="text-right">
                    특이사항
                  </Label>
                  <Input
                    id="specialNeeds"
                    placeholder="건강 상태, 알러지 등"
                    className="col-span-3"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button 
              onClick={() => {
                toast({
                  title: "수강생 등록",
                  description: "새 수강생이 등록되었습니다.",
                });
                setShowAddStudentDialog(false);
              }}
            >
              등록하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}