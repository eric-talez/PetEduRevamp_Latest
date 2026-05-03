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
  UserPlus, 
  Filter, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  UserRoundCheck,
  Shield,
  Calendar,
  BadgeCheck,
  Loader2,
  Star, 
  Mail,
  Phone,
  Download,
  FileText,
  Award,
  MessagesSquare,
  FileBarChart,
  AlertTriangle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";

// 훈련사 정보 인터페이스
interface Trainer {
  id: number;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  certification: string[];
  image: string;
  status: 'active' | 'pending' | 'inactive';
  rating: number;
  courseCount: number;
  studentCount: number;
  approvalDate?: string;
  isVerified: boolean;
  completionRate: number;
  specialties: string[];
}

export default function InstituteTrainersManagement() {
  const { userName } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [showTrainerDetailsDialog, setShowTrainerDetailsDialog] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterSpecialty, setFilterSpecialty] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  
  // API에서 훈련사 데이터 로딩
  const { data: trainers = [], isLoading, isError, refetch } = useQuery<Trainer[]>({
    queryKey: ['/api/institute/trainers'],
  });
  
  // 훈련사 상태에 따른 필터링
  const getFilteredTrainers = () => {
    let filtered = [...trainers];
    
    // 탭에 따른 필터링
    if (activeTab === 'active') {
      filtered = filtered.filter(trainer => trainer.status === 'active');
    } else if (activeTab === 'pending') {
      filtered = filtered.filter(trainer => trainer.status === 'pending');
    } else if (activeTab === 'inactive') {
      filtered = filtered.filter(trainer => trainer.status === 'inactive');
    }
    
    // 검색어 필터링
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(trainer => 
        trainer.name.toLowerCase().includes(query) || 
        trainer.email.toLowerCase().includes(query) ||
        trainer.specialty.toLowerCase().includes(query)
      );
    }
    
    // 전문 분야 필터링
    if (filterSpecialty) {
      filtered = filtered.filter(trainer => 
        trainer.specialties.some(spec => spec.toLowerCase() === filterSpecialty.toLowerCase())
      );
    }
    
    // 상태 필터링
    if (filterStatus) {
      filtered = filtered.filter(trainer => trainer.status === filterStatus);
    }
    
    // 정렬
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc' 
          ? a.name.localeCompare(b.name) 
          : b.name.localeCompare(a.name);
      } else if (sortBy === 'rating') {
        return sortOrder === 'asc' 
          ? a.rating - b.rating 
          : b.rating - a.rating;
      } else if (sortBy === 'studentCount') {
        return sortOrder === 'asc' 
          ? a.studentCount - b.studentCount 
          : b.studentCount - a.studentCount;
      }
      return 0;
    });
    
    return filtered;
  };
  
  // 페이지네이션 처리
  const filteredTrainers = getFilteredTrainers();
  const totalPages = Math.ceil(filteredTrainers.length / itemsPerPage);
  const paginatedTrainers = filteredTrainers.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );
  
  // 훈련사 상태 변경 함수
  const updateTrainerStatus = (trainerId: number, newStatus: 'active' | 'pending' | 'inactive') => {
    setTrainers(prev => prev.map(trainer => 
      trainer.id === trainerId ? { ...trainer, status: newStatus } : trainer
    ));
    
    toast({
      title: "훈련사 상태 업데이트",
      description: `훈련사 상태가 ${newStatus === 'active' ? '활성화' : newStatus === 'pending' ? '대기 중' : '비활성화'}로 변경되었습니다.`,
      variant: newStatus === 'active' ? 'default' : 'destructive',
    });
  };
  
  // 훈련사 상세 정보 보기
  const viewTrainerDetails = (trainer: Trainer) => {
    setSelectedTrainer(trainer);
    setShowTrainerDetailsDialog(true);
  };
  
  // 새 훈련사 초대 핸들러
  const handleInviteTrainer = () => {
    toast({
      title: "훈련사 초대",
      description: "새 훈련사 초대 이메일이 발송되었습니다.",
    });
  };
  
  // 새로고침 핸들러
  const handleRefresh = () => {
    refetch();
    toast({
      title: "데이터 새로고침",
      description: "훈련사 목록이 업데이트되었습니다.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">훈련사 데이터 로딩 중...</p>
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
          <h1 className="text-3xl font-bold tracking-tight">기관 소속 훈련사 관리</h1>
          <p className="text-muted-foreground mt-1">기관에 소속된 훈련사를 관리하고 모니터링합니다.</p>
        </div>
        <Button onClick={handleInviteTrainer}>
          <UserPlus className="mr-2 h-4 w-4" />
          훈련사 초대
        </Button>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">전체 ({trainers.length})</TabsTrigger>
            <TabsTrigger value="active">활성 ({trainers.filter(t => t.status === 'active').length})</TabsTrigger>
            <TabsTrigger value="pending">승인 대기 ({trainers.filter(t => t.status === 'pending').length})</TabsTrigger>
            <TabsTrigger value="inactive">비활성 ({trainers.filter(t => t.status === 'inactive').length})</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-md px-3 py-1">
              <Search className="h-4 w-4 text-muted-foreground mr-2" />
              <Input 
                placeholder="훈련사 검색..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="border-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
              />
            </div>
            
            <Select value={filterSpecialty || ''} onValueChange={setFilterSpecialty}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="전문 분야" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 분야</SelectItem>
                <SelectItem value="기초 훈련">기초 훈련</SelectItem>
                <SelectItem value="고급 훈련">고급 훈련</SelectItem>
                <SelectItem value="문제행동 교정">문제행동 교정</SelectItem>
                <SelectItem value="사회화">사회화</SelectItem>
                <SelectItem value="특수 작업견 훈련">특수 작업견 훈련</SelectItem>
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
                    <TableHead>훈련사</TableHead>
                    <TableHead className="hidden md:table-cell">전문 분야</TableHead>
                    <TableHead className="hidden md:table-cell">코스 수</TableHead>
                    <TableHead className="hidden md:table-cell">학생 수</TableHead>
                    <TableHead className="hidden md:table-cell">평점</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTrainers.length > 0 ? (
                    paginatedTrainers.map((trainer, index) => (
                      <TableRow key={trainer.id} className="cursor-pointer hover:bg-muted/50" onClick={() => viewTrainerDetails(trainer)}>
                        <TableCell className="font-medium w-[50px]">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={trainer.image} alt={trainer.name} />
                              <AvatarFallback>{trainer.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{trainer.name}</div>
                              <div className="text-sm text-muted-foreground">{trainer.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{trainer.specialty}</TableCell>
                        <TableCell className="hidden md:table-cell">{trainer.courseCount}</TableCell>
                        <TableCell className="hidden md:table-cell">{trainer.studentCount}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center">
                            <span className="mr-1">{trainer.rating.toFixed(1)}</span>
                            <Star className="h-4 w-4 fill-warning text-warning" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            trainer.status === 'active' ? 'default' : 
                            trainer.status === 'pending' ? 'outline' : 
                            'destructive'
                          }>
                            {trainer.status === 'active' ? '활성' : 
                             trainer.status === 'pending' ? '승인 대기' : 
                             '비활성'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {trainer.status === 'pending' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateTrainerStatus(trainer.id, 'active');
                                }}
                              >
                                <Check className="h-4 w-4 text-success" />
                              </Button>
                            )}
                            {trainer.status === 'inactive' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateTrainerStatus(trainer.id, 'active');
                                }}
                              >
                                <Check className="h-4 w-4 text-success" />
                              </Button>
                            )}
                            {trainer.status === 'active' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateTrainerStatus(trainer.id, 'inactive');
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
                      <TableCell colSpan={8} className="h-24 text-center">
                        표시할 훈련사가 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex items-center justify-between py-4">
              <div className="text-sm text-muted-foreground">
                총 {filteredTrainers.length}명의 훈련사 중 {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredTrainers.length)}명 표시
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
          {/* 활성 훈련사 탭 내용 - 기본 탭과 동일한 구조 */}
        </TabsContent>
        
        <TabsContent value="pending" className="mt-4 p-0">
          {/* 승인 대기 훈련사 탭 내용 - 기본 탭과 동일한 구조 */}
        </TabsContent>
        
        <TabsContent value="inactive" className="mt-4 p-0">
          {/* 비활성 훈련사 탭 내용 - 기본 탭과 동일한 구조 */}
        </TabsContent>
      </Tabs>
      
      {/* 훈련사 상세 정보 다이얼로그 */}
      <Dialog open={showTrainerDetailsDialog} onOpenChange={setShowTrainerDetailsDialog}>
        <DialogContent className="max-w-4xl">
          {selectedTrainer && (
            <>
              <DialogHeader>
                <DialogTitle>훈련사 상세 정보</DialogTitle>
                <DialogDescription>
                  훈련사의 자세한 정보 및 활동 현황을 확인합니다.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                <div className="col-span-1">
                  <div className="flex flex-col items-center">
                    <Avatar className="h-24 w-24 mb-4">
                      <AvatarImage src={selectedTrainer.image} alt={selectedTrainer.name} />
                      <AvatarFallback className="text-2xl">{selectedTrainer.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <h3 className="text-xl font-semibold">{selectedTrainer.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{selectedTrainer.specialty}</p>
                    <Badge className="mb-4" variant={
                      selectedTrainer.status === 'active' ? 'default' : 
                      selectedTrainer.status === 'pending' ? 'outline' : 
                      'destructive'
                    }>
                      {selectedTrainer.status === 'active' ? '활성' : 
                       selectedTrainer.status === 'pending' ? '승인 대기' : 
                       '비활성'}
                    </Badge>
                    
                    <div className="w-full space-y-3 mt-2">
                      <div className="flex items-center text-sm">
                        <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{selectedTrainer.email}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{selectedTrainer.phone}</span>
                      </div>
                      {selectedTrainer.approvalDate && (
                        <div className="flex items-center text-sm">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>승인: {selectedTrainer.approvalDate}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="w-full mt-4">
                      <h4 className="text-sm font-medium mb-2">전문 분야</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedTrainer.specialties.map((specialty, index) => (
                          <Badge key={index} variant="secondary">{specialty}</Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="w-full mt-4">
                      <h4 className="text-sm font-medium mb-2">자격증</h4>
                      <div className="flex flex-col gap-2">
                        {selectedTrainer.certification.map((cert, index) => (
                          <div key={index} className="flex items-center text-sm">
                            <BadgeCheck className="h-4 w-4 mr-2 text-success" />
                            <span>{cert}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="col-span-1 md:col-span-2">
                  <Tabs defaultValue="performance">
                    <TabsList className="grid grid-cols-3 mb-4">
                      <TabsTrigger value="performance">성과</TabsTrigger>
                      <TabsTrigger value="courses">강의</TabsTrigger>
                      <TabsTrigger value="students">수강생</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="performance" className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex flex-col items-center">
                              <Star className="h-8 w-8 text-warning fill-warning mb-2" />
                              <div className="text-2xl font-bold">{selectedTrainer.rating.toFixed(1)}</div>
                              <p className="text-xs text-muted-foreground">평균 평점</p>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex flex-col items-center">
                              <FileText className="h-8 w-8 text-primary mb-2" />
                              <div className="text-2xl font-bold">{selectedTrainer.courseCount}</div>
                              <p className="text-xs text-muted-foreground">활성 코스</p>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex flex-col items-center">
                              <Award className="h-8 w-8 text-success mb-2" />
                              <div className="text-2xl font-bold">{selectedTrainer.completionRate}%</div>
                              <p className="text-xs text-muted-foreground">완료율</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle>강의 통계</CardTitle>
                          <CardDescription>월별 수강생 및 완료 수업 현황</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                            {/* 실제 구현 시 차트 컴포넌트로 대체 */}
                            <FileBarChart className="h-16 w-16 opacity-20" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle>활동 히스토리</CardTitle>
                          <CardDescription>최근 활동 기록</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex items-start">
                              <div className="h-2 w-2 rounded-full bg-primary mt-2 mr-3"></div>
                              <div>
                                <p className="text-sm font-medium">신규 강의 등록: 중급 반려견 사회화 과정</p>
                                <p className="text-xs text-muted-foreground">2023년 5월 2일</p>
                              </div>
                            </div>
                            <div className="flex items-start">
                              <div className="h-2 w-2 rounded-full bg-success mt-2 mr-3"></div>
                              <div>
                                <p className="text-sm font-medium">강의 완료: 기초 훈련 과정 (5명 수강)</p>
                                <p className="text-xs text-muted-foreground">2023년 4월 15일</p>
                              </div>
                            </div>
                            <div className="flex items-start">
                              <div className="h-2 w-2 rounded-full bg-warning mt-2 mr-3"></div>
                              <div>
                                <p className="text-sm font-medium">새 자격증 추가: 특수 반려견 행동 전문가</p>
                                <p className="text-xs text-muted-foreground">2023년 3월 21일</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    <TabsContent value="courses">
                      <Card>
                        <CardHeader>
                          <CardTitle>제공 중인 강의</CardTitle>
                          <CardDescription>훈련사가 현재 진행 중인 교육 과정</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>강의명</TableHead>
                                <TableHead>수강생</TableHead>
                                <TableHead>상태</TableHead>
                                <TableHead>완료율</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell>
                                  <div className="font-medium">기초 복종 훈련 A반</div>
                                  <div className="text-xs text-muted-foreground">8주 과정</div>
                                </TableCell>
                                <TableCell>12명</TableCell>
                                <TableCell><Badge>진행중</Badge></TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Progress value={60} className="h-2" />
                                    <span className="text-xs">60%</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>
                                  <div className="font-medium">문제행동 교정 심화</div>
                                  <div className="text-xs text-muted-foreground">12주 과정</div>
                                </TableCell>
                                <TableCell>8명</TableCell>
                                <TableCell><Badge>진행중</Badge></TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Progress value={35} className="h-2" />
                                    <span className="text-xs">35%</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>
                                  <div className="font-medium">사회화 트레이닝</div>
                                  <div className="text-xs text-muted-foreground">6주 과정</div>
                                </TableCell>
                                <TableCell>15명</TableCell>
                                <TableCell><Badge variant="outline">예정</Badge></TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Progress value={0} className="h-2" />
                                    <span className="text-xs">0%</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    <TabsContent value="students">
                      <Card>
                        <CardHeader>
                          <CardTitle>수강생 명단</CardTitle>
                          <CardDescription>훈련사의 현재 수강생 목록</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>수강생</TableHead>
                                <TableHead>반려견</TableHead>
                                <TableHead>강의</TableHead>
                                <TableHead>진행 현황</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback>한</AvatarFallback>
                                    </Avatar>
                                    <span>한지민</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <span>초코</span>
                                    <Badge variant="outline" className="text-xs">말티즈</Badge>
                                  </div>
                                </TableCell>
                                <TableCell>기초 복종 훈련 A반</TableCell>
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
                                      <AvatarFallback>김</AvatarFallback>
                                    </Avatar>
                                    <span>김철수</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <span>벤지</span>
                                    <Badge variant="outline" className="text-xs">비숑</Badge>
                                  </div>
                                </TableCell>
                                <TableCell>문제행동 교정 심화</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Progress value={40} className="h-2 w-20" />
                                    <span className="text-xs">40%</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback>박</AvatarFallback>
                                    </Avatar>
                                    <span>박영희</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <span>루시</span>
                                    <Badge variant="outline" className="text-xs">골든</Badge>
                                  </div>
                                </TableCell>
                                <TableCell>사회화 트레이닝</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Progress value={10} className="h-2 w-20" />
                                    <span className="text-xs">10%</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
              
              <DialogFooter className="flex justify-between items-center">
                <div className="flex gap-2">
                  {selectedTrainer.status === 'active' && (
                    <Button variant="outline" size="sm" onClick={() => {
                      updateTrainerStatus(selectedTrainer.id, 'inactive');
                      setShowTrainerDetailsDialog(false);
                    }}>
                      <X className="mr-2 h-4 w-4" />
                      비활성화
                    </Button>
                  )}
                  {selectedTrainer.status === 'inactive' && (
                    <Button variant="outline" size="sm" onClick={() => {
                      updateTrainerStatus(selectedTrainer.id, 'active');
                      setShowTrainerDetailsDialog(false);
                    }}>
                      <Check className="mr-2 h-4 w-4" />
                      활성화
                    </Button>
                  )}
                  {selectedTrainer.status === 'pending' && (
                    <Button size="sm" onClick={() => {
                      updateTrainerStatus(selectedTrainer.id, 'active');
                      setShowTrainerDetailsDialog(false);
                    }}>
                      <Check className="mr-2 h-4 w-4" />
                      승인하기
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    <MessagesSquare className="mr-2 h-4 w-4" />
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
    </div>
  );
}