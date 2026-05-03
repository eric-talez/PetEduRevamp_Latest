import { useState, useEffect } from 'react';
import { useAuth } from '../../SimpleApp';
import { useToast } from '@/hooks/use-toast';
import { PageSkeleton } from '@/components/ui/SkeletonLoader';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  User,
  MapPin,
  Filter,
  Search,
  Plus,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger
} from '@/components/ui/dialog';
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface ClassSession {
  id: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  courseId: number;
  courseName: string;
  studentId: number;
  studentName: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'in-progress';
  type: 'online' | 'offline';
  location?: string;
  description?: string;
  notes?: string;
  zoom_url?: string;
}

export default function TrainerClasses() {
  const { userName } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<ClassSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{start: string | null, end: string | null}>({
    start: null,
    end: null
  });
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);
  const [showSessionDetail, setShowSessionDetail] = useState(false);

  // 수업 일정 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // 실제 구현 시 API 호출로 대체
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 임시 수업 일정 데이터
        const mockSessions: ClassSession[] = [
          {
            id: 1,
            title: '기본 복종 훈련 1차시',
            date: '2024-05-15',
            startTime: '10:00',
            endTime: '11:30',
            courseId: 1,
            courseName: '반려견 기본 훈련 과정',
            studentId: 101,
            studentName: '김철수 (코코)',
            status: 'scheduled',
            type: 'offline',
            location: '서울 강남구 테일즈 펫 트레이닝 센터',
            description: '기본 명령어(앉아, 기다려, 엎드려) 훈련'
          },
          {
            id: 2,
            title: '문제행동 교정 상담',
            date: '2024-05-15',
            startTime: '14:00',
            endTime: '15:00',
            courseId: 2,
            courseName: '문제행동 교정 특별과정',
            studentId: 102,
            studentName: '이영희 (망고)',
            status: 'scheduled',
            type: 'online',
            zoom_url: 'https://zoom.us/j/1234567890',
            description: '짖음 문제와 분리불안 관련 상담'
          },
          {
            id: 3,
            title: '고급 트릭 훈련 2차시',
            date: '2024-05-16',
            startTime: '11:00',
            endTime: '12:30',
            courseId: 3,
            courseName: '고급 트릭 훈련',
            studentId: 104,
            studentName: '정민수 (보리)',
            status: 'scheduled',
            type: 'offline',
            location: '서울 강남구 테일즈 펫 트레이닝 센터',
            description: '점프 관련 트릭 훈련'
          },
          {
            id: 4,
            title: '퍼피 사회화 그룹 수업',
            date: '2024-05-17',
            startTime: '10:00',
            endTime: '11:30',
            courseId: 4,
            courseName: '퍼피 사회화 클래스',
            studentId: 105,
            studentName: '한소희 (루나)',
            status: 'scheduled',
            type: 'offline',
            location: '서울 서초구 반포 공원',
            description: '다른 강아지들과의 사회화 훈련'
          },
          {
            id: 5,
            title: '기본 복종 훈련 1차시',
            date: '2024-05-14',
            startTime: '10:00',
            endTime: '11:30',
            courseId: 1,
            courseName: '반려견 기본 훈련 과정',
            studentId: 107,
            studentName: '장수현 (몽이)',
            status: 'completed',
            type: 'offline',
            location: '서울 강남구 테일즈 펫 트레이닝 센터',
            description: '기본 명령어(앉아, 기다려, 엎드려) 훈련',
            notes: '훈련 완료. 학생은 지속적인 복습 필요함'
          },
          {
            id: 6,
            title: '문제행동 교정 상담',
            date: '2024-05-13',
            startTime: '14:00',
            endTime: '15:00',
            courseId: 2,
            courseName: '문제행동 교정 특별과정',
            studentId: 108,
            studentName: '김민준 (초코)',
            status: 'cancelled',
            type: 'online',
            zoom_url: 'https://zoom.us/j/0987654321',
            description: '공격성 문제 관련 상담',
            notes: '학생이 긴급 상황으로 취소. 재예약 필요'
          }
        ];
        
        setSessions(mockSessions);
      } catch (error) {
        console.error('수업 일정 데이터 로딩 오류:', error);
        toast({
          title: '데이터 로딩 오류',
          description: '수업 일정 정보를 불러오는 중 오류가 발생했습니다.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [toast]);
  
  // 필터링된 세션 업데이트
  useEffect(() => {
    let result = [...sessions];
    
    // 탭 필터링
    if (activeTab === 'upcoming') {
      result = result.filter(session => 
        session.status === 'scheduled' && 
        new Date(`${session.date}T${session.startTime}`) >= new Date()
      );
    } else if (activeTab === 'today') {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      result = result.filter(session => session.date === todayStr);
    } else if (activeTab === 'completed') {
      result = result.filter(session => session.status === 'completed');
    } else if (activeTab === 'cancelled') {
      result = result.filter(session => session.status === 'cancelled');
    }
    
    // 검색어 필터링
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        session => 
          session.title.toLowerCase().includes(query) ||
          session.courseName.toLowerCase().includes(query) ||
          session.studentName.toLowerCase().includes(query) ||
          (session.description && session.description.toLowerCase().includes(query))
      );
    }
    
    // 세션 유형 필터링
    if (filterType) {
      result = result.filter(session => session.type === filterType);
    }
    
    // 상태 필터링
    if (filterStatus) {
      result = result.filter(session => session.status === filterStatus);
    }
    
    // 날짜 범위 필터링
    if (dateRange.start) {
      result = result.filter(session => 
        new Date(session.date) >= new Date(dateRange.start || '')
      );
    }
    
    if (dateRange.end) {
      result = result.filter(session => 
        new Date(session.date) <= new Date(dateRange.end || '')
      );
    }
    
    // 날짜 및 시간 기준 오름차순 정렬
    result.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.startTime}`);
      const dateB = new Date(`${b.date}T${b.startTime}`);
      return dateA.getTime() - dateB.getTime();
    });
    
    setFilteredSessions(result);
  }, [sessions, activeTab, searchQuery, filterType, filterStatus, dateRange]);
  
  // 페이지네이션 처리
  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const paginatedSessions = filteredSessions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // 세션 상세 보기
  const handleViewSession = (session: ClassSession) => {
    setSelectedSession(session);
    setShowSessionDetail(true);
  };
  
  // 세션 상태에 따른 배지 스타일 설정
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'scheduled':
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">예정됨</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-success/10 text-success border-success/30">완료됨</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">취소됨</Badge>;
      case 'in-progress':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">진행 중</Badge>;
      default:
        return <Badge variant="outline">미정</Badge>;
    }
  };
  
  // 데이터 새로고침
  const handleRefresh = () => {
    setIsLoading(true);
    
    // 실제 구현 시 API 호출로 대체
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: '새로고침 완료',
        description: '수업 일정 데이터가 업데이트되었습니다.',
      });
    }, 1000);
  };
  
  // 필터 초기화
  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterType(null);
    setFilterStatus(null);
    setDateRange({ start: null, end: null });
    setActiveTab('upcoming');
  };
  
  // 수업 상태 변경 처리
  const handleStatusChange = (sessionId: number, newStatus: 'scheduled' | 'completed' | 'cancelled') => {
    // 실제 구현 시 API 호출로 대체
    const updatedSessions = sessions.map(session => 
      session.id === sessionId ? {...session, status: newStatus} : session
    );
    
    setSessions(updatedSessions);
    toast({
      title: '상태 변경됨',
      description: `수업 상태가 ${newStatus === 'scheduled' ? '예정됨' : newStatus === 'completed' ? '완료됨' : '취소됨'}으로 변경되었습니다.`,
    });
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* 세션 상세 모달 */}
      <Dialog open={showSessionDetail} onOpenChange={setShowSessionDetail}>
        <DialogContent className="max-w-lg">
          {selectedSession && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedSession.title}</DialogTitle>
                <DialogDescription>
                  {selectedSession.courseName}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">날짜</p>
                    <p className="text-base font-medium flex items-center">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(new Date(selectedSession.date), 'yyyy년 MM월 dd일 (eee)', {locale: ko})}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">시간</p>
                    <p className="text-base font-medium flex items-center">
                      <Clock className="mr-2 h-4 w-4" />
                      {selectedSession.startTime} ~ {selectedSession.endTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">수강생</p>
                    <p className="text-base font-medium flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      {selectedSession.studentName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">상태</p>
                    {getStatusBadge(selectedSession.status)}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">유형</p>
                  <p className="text-base font-medium flex items-center">
                    {selectedSession.type === 'online' 
                      ? <><Video className="mr-2 h-4 w-4" />온라인 수업</>
                      : <><MapPin className="mr-2 h-4 w-4" />오프라인 수업</>}
                  </p>
                </div>
                
                {selectedSession.location && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">장소</p>
                    <p className="text-base">{selectedSession.location}</p>
                  </div>
                )}
                
                {selectedSession.zoom_url && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Zoom 링크</p>
                    <a href={selectedSession.zoom_url} target="_blank" rel="noopener noreferrer" 
                      className="text-base text-primary hover:underline">
                      {selectedSession.zoom_url}
                    </a>
                  </div>
                )}
                
                {selectedSession.description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">수업 내용</p>
                    <p className="text-base">{selectedSession.description}</p>
                  </div>
                )}
                
                {selectedSession.notes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">메모</p>
                    <p className="text-base">{selectedSession.notes}</p>
                  </div>
                )}
              </div>
              
              <DialogFooter className="flex justify-between items-center">
                <div className="flex space-x-2">
                  {selectedSession.status !== 'completed' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        handleStatusChange(selectedSession.id, 'completed');
                        setShowSessionDetail(false);
                      }}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      완료 처리
                    </Button>
                  )}
                  
                  {selectedSession.status !== 'cancelled' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        handleStatusChange(selectedSession.id, 'cancelled');
                        setShowSessionDetail(false);
                      }}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      취소 처리
                    </Button>
                  )}
                </div>
                
                <DialogClose asChild>
                  <Button>확인</Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">수업 일정</h1>
        <div className="flex items-center space-x-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                새 수업 일정
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 수업 일정 추가</DialogTitle>
                <DialogDescription>
                  새로운 수업 일정 정보를 입력하세요.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="title" className="text-right text-sm">수업 제목</label>
                  <Input id="title" placeholder="수업 제목을 입력하세요" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="date" className="text-right text-sm">수업 일자</label>
                  <Input id="date" type="date" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="startTime" className="text-right text-sm">시작 시간</label>
                  <Input id="startTime" type="time" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="endTime" className="text-right text-sm">종료 시간</label>
                  <Input id="endTime" type="time" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="course" className="text-right text-sm">강좌</label>
                  <Select>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="강좌 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="course1">기초 훈련 101</SelectItem>
                      <SelectItem value="course2">고급 훈련 심화</SelectItem>
                      <SelectItem value="course3">문제 행동 교정</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="student" className="text-right text-sm">학생</label>
                  <Select>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="학생 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student1">김철수 (루키)</SelectItem>
                      <SelectItem value="student2">이영희 (해피)</SelectItem>
                      <SelectItem value="student3">박민수 (초코)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="type" className="text-right text-sm">수업 유형</label>
                  <Select defaultValue="offline">
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="수업 유형 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">온라인</SelectItem>
                      <SelectItem value="offline">오프라인</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="location" className="text-right text-sm">위치</label>
                  <Input id="location" placeholder="오프라인 수업 위치" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="zoom" className="text-right text-sm">Zoom URL</label>
                  <Input id="zoom" placeholder="온라인 수업 Zoom URL" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="description" className="text-right text-sm">설명</label>
                  <Input id="description" placeholder="수업에 대한 추가 설명" className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">저장</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
        </div>
      </div>
      
      {/* 탭 및 필터 */}
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="upcoming">예정된 수업</TabsTrigger>
            <TabsTrigger value="today">오늘의 수업</TabsTrigger>
            <TabsTrigger value="completed">완료된 수업</TabsTrigger>
            <TabsTrigger value="cancelled">취소된 수업</TabsTrigger>
            <TabsTrigger value="all">전체</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="수업, 강좌, 학생 검색..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select 
            value={filterType || 'all'} 
            onValueChange={(value) => setFilterType(value === 'all' ? null : value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="유형 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 유형</SelectItem>
              <SelectItem value="online">온라인</SelectItem>
              <SelectItem value="offline">오프라인</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            onClick={handleResetFilters}
            className="shrink-0"
          >
            필터 초기화
          </Button>
        </div>
      </div>
      
      {/* 수업 목록 테이블 */}
      {isLoading ? (
        <PageSkeleton header={false} variant="table" count={6} className="p-0" />
      ) : (
        <div>
          {filteredSessions.length === 0 ? (
            <div className="text-center py-10 border rounded-lg border-dashed">
              <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-2 text-lg font-medium">일정이 없습니다</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeTab === 'upcoming' 
                  ? '예정된 수업이 없습니다.'
                  : activeTab === 'today'
                    ? '오늘 예정된 수업이 없습니다.'
                    : activeTab === 'completed'
                      ? '완료된 수업이 없습니다.'
                      : activeTab === 'cancelled'
                        ? '취소된 수업이 없습니다.'
                        : '조건에 맞는 수업 일정이 없습니다.'
                }
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">날짜 및 시간</TableHead>
                    <TableHead>수업 정보</TableHead>
                    <TableHead>수강생</TableHead>
                    <TableHead className="hidden md:table-cell">유형</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="w-[80px]">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">
                        <div>
                          {format(new Date(session.date), 'yyyy-MM-dd (eee)', {locale: ko})}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {session.startTime} ~ {session.endTime}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{session.title}</div>
                        <div className="text-sm text-muted-foreground">{session.courseName}</div>
                      </TableCell>
                      <TableCell>{session.studentName}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {session.type === 'online' 
                          ? <span className="flex items-center"><Video className="mr-1 h-4 w-4" /> 온라인</span>
                          : <span className="flex items-center"><MapPin className="mr-1 h-4 w-4" /> 오프라인</span>}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(session.status)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>액션</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleViewSession(session)}>
                              상세 보기
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {session.status !== 'completed' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(session.id, 'completed')}>
                                완료 처리
                              </DropdownMenuItem>
                            )}
                            {session.status !== 'cancelled' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(session.id, 'cancelled')}>
                                취소 처리
                              </DropdownMenuItem>
                            )}
                            {(session.status === 'completed' || session.status === 'cancelled') && (
                              <DropdownMenuItem onClick={() => handleStatusChange(session.id, 'scheduled')}>
                                예정됨으로 변경
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                      
                      {Array.from({length: Math.min(5, totalPages)}, (_, i) => {
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
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              isActive={pageNum === currentPage}
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}