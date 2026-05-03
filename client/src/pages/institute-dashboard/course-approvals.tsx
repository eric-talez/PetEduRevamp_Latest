import { useState, useEffect } from 'react';
import { Calendar, Clock, Users, MessageSquare, Check, X, ArrowRight, Edit, Trash2, Search, Filter } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/SimpleApp';

export default function InstituteCourseApprovals() {
  // 상태 관리
  const [pendingCourses, setPendingCourses] = useState<any[]>([]);
  const [approvedCourses, setApprovedCourses] = useState<any[]>([]);
  const [rejectedCourses, setRejectedCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [filterValue, setFilterValue] = useState('all');
  const [searchValue, setSearchValue] = useState('');
  
  useEffect(() => {
    // 모의 데이터 로드 (실제로는 API에서 가져와야 함)
    loadMockData();
  }, []);
  
  const loadMockData = () => {
    // 대기 중인 수업
    setPendingCourses([
      {
        id: 1,
        title: '반려견 기초 훈련 클래스',
        type: '그룹 수업',
        maxParticipants: 5,
        duration: '60분',
        price: 25000,
        status: 'pending',
        submittedAt: '2025년 5월 5일',
        description: '반려견과 견주를 위한 기초 훈련 클래스입니다. 앉아, 엎드려, 기다려 등의 기본 명령어를 훈련합니다.',
        trainer: {
          id: 1,
          name: '김훈련',
          avatar: 'https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200',
        },
        location: '서울시 강남구 테헤란로 123',
        timeSlots: ['10:00-11:00 (월,수)', '14:00-15:00 (화,목)'],
        commission: 20 // 수수료 비율(%)
      },
      {
        id: 2,
        title: '반려견 어질리티 입문',
        type: '그룹 수업',
        maxParticipants: 4,
        duration: '90분',
        price: 30000,
        status: 'pending',
        submittedAt: '2025년 5월 6일',
        description: '반려견의 민첩성과 순발력을 향상시키는 어질리티 입문 과정입니다. 다양한 장애물을 활용한 훈련을 진행합니다.',
        trainer: {
          id: 2,
          name: '박민첩',
          avatar: 'https://images.unsplash.com/photo-1548535537-3cfaf1fc327c?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200',
        },
        location: '서울시 송파구 올림픽로 300',
        timeSlots: ['13:00-14:30 (토,일)'],
        commission: 20 // 수수료 비율(%)
      }
    ]);
    
    // 승인된 수업
    setApprovedCourses([
      {
        id: 3,
        title: '문제 행동 교정 1:1 상담',
        type: '1:1 상담',
        maxParticipants: 1,
        duration: '50분',
        price: 50000,
        status: 'approved',
        submittedAt: '2025년 5월 1일',
        approvedAt: '2025년 5월 2일',
        description: '짖음, 분리불안, 공격성 등 반려견의 문제 행동을 분석하고 교정하는 1:1 맞춤형 상담입니다.',
        trainer: {
          id: 1,
          name: '김훈련',
          avatar: 'https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200',
        },
        location: '서울시 강남구 테헤란로 123',
        timeSlots: ['11:00-12:00 (월-금)', '17:00-18:00 (월-금)'],
        commission: 25, // 수수료 비율(%)
        bookings: 5 // 현재까지의 예약 수
      },
      {
        id: 4,
        title: '반려견 사회화 훈련',
        type: '그룹 수업',
        maxParticipants: 6,
        duration: '60분',
        price: 28000,
        status: 'approved',
        submittedAt: '2025년 4월 25일',
        approvedAt: '2025년 4월 27일',
        description: '다른 반려견, 사람, 환경에 적응할 수 있도록 돕는 사회화 훈련 클래스입니다.',
        trainer: {
          id: 3,
          name: '이사회',
          avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200',
        },
        location: '서울시 마포구 월드컵로 100',
        timeSlots: ['15:00-16:00 (화,목)', '16:00-17:00 (토,일)'],
        commission: 20, // 수수료 비율(%)
        bookings: 12 // 현재까지의 예약 수
      }
    ]);
    
    // 거절된 수업
    setRejectedCourses([
      {
        id: 5,
        title: '고급 트릭 훈련',
        type: '그룹 수업',
        maxParticipants: 4,
        duration: '45분',
        price: 40000,
        status: 'rejected',
        submittedAt: '2025년 5월 3일',
        rejectedAt: '2025년 5월 4일',
        rejectionReason: '유사한 수업이 이미 개설되어 있으며, 가격이 시장 평균보다 너무 높습니다.',
        description: '재미있는 고급 트릭 훈련을 통해 반려견의 두뇌 발달과 집중력 향상을 도와줍니다.',
        trainer: {
          id: 5,
          name: '박재미',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200',
        },
        location: '인천시 부평구 부평대로 123',
        timeSlots: ['19:00-19:45 (월,수,금)'],
        commission: 20 // 수수료 비율(%)
      }
    ]);
  };
  
  // 데이터 필터링 함수
  const filterCourses = (courses: any[]) => {
    return courses.filter(course => 
      (filterValue === 'all' || course.type === filterValue) &&
      (searchValue === '' || 
       course.title.toLowerCase().includes(searchValue.toLowerCase()) ||
       course.trainer.name.toLowerCase().includes(searchValue.toLowerCase()))
    );
  };
  
  // 수업 세부 정보 보기
  const handleViewDetails = (course: any) => {
    setSelectedCourse(course);
    setDetailsDialogOpen(true);
  };
  
  // 수업 승인 처리
  const handleApproveCourse = (courseId: number) => {
    // 실제로는 API 호출을 통해 수업 승인
    console.log(`수업 ID ${courseId} 승인`);
    
    // 모의 데이터 업데이트
    const course = pendingCourses.find(c => c.id === courseId);
    if (course) {
      setPendingCourses(pendingCourses.filter(c => c.id !== courseId));
      setApprovedCourses([...approvedCourses, {
        ...course,
        status: 'approved',
        approvedAt: '2025년 5월 7일', // 현재 날짜 사용
        bookings: 0 // 초기 예약 수는 0
      }]);
    }
    
    // 다이얼로그 닫기
    setDetailsDialogOpen(false);
  };
  
  // 수업 거절 처리
  const handleRejectCourse = (courseId: number, reason: string) => {
    // 실제로는 API 호출을 통해 수업 거절
    console.log(`수업 ID ${courseId} 거절: ${reason}`);
    
    // 모의 데이터 업데이트
    const course = pendingCourses.find(c => c.id === courseId);
    if (course) {
      setPendingCourses(pendingCourses.filter(c => c.id !== courseId));
      setRejectedCourses([...rejectedCourses, {
        ...course,
        status: 'rejected',
        rejectedAt: '2025년 5월 7일', // 현재 날짜 사용
        rejectionReason: reason
      }]);
    }
    
    // 다이얼로그 닫기
    setDetailsDialogOpen(false);
  };
  
  // 수수료 수정 처리
  const handleUpdateCommission = (courseId: number, newCommission: number) => {
    // 실제로는 API 호출을 통해 수수료 업데이트
    console.log(`수업 ID ${courseId}의 수수료를 ${newCommission}%로 업데이트`);
    
    // 모의 데이터 업데이트
    const updatedApprovedCourses = approvedCourses.map(course => 
      course.id === courseId ? { ...course, commission: newCommission } : course
    );
    setApprovedCourses(updatedApprovedCourses);
  };
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">수업 관리 및 승인</h1>
      
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input
              type="search" 
              placeholder="수업명 또는 훈련사 검색" 
              className="pl-9"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
        </div>
        <Select value={filterValue} onValueChange={setFilterValue}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="모든 유형" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 유형</SelectItem>
            <SelectItem value="그룹 수업">그룹 수업</SelectItem>
            <SelectItem value="1:1 상담">1:1 상담</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="relative">
            대기 중
            {pendingCourses.length > 0 && (
              <Badge className="ml-2 bg-primary">{pendingCourses.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">승인됨</TabsTrigger>
          <TabsTrigger value="rejected">거절됨</TabsTrigger>
        </TabsList>
        
        {/* 대기 중인 수업 탭 */}
        <TabsContent value="pending">
          <Card className="p-4">
            <Table>
              <TableCaption>대기 중인 수업 목록</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">수업명</TableHead>
                  <TableHead>훈련사</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>최대 인원</TableHead>
                  <TableHead>가격</TableHead>
                  <TableHead>제출일</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filterCourses(pendingCourses).length > 0 ? (
                  filterCourses(pendingCourses).map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">{course.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full overflow-hidden">
                            <img 
                              src={course.trainer.avatar} 
                              alt={course.trainer.name}
                              className="w-full h-full object-cover" 
                            />
                          </div>
                          <span>{course.trainer.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={course.type === '1:1 상담' ? 'bg-primary' : 'bg-success'}>
                          {course.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{course.maxParticipants}명</TableCell>
                      <TableCell>{course.price.toLocaleString()}원</TableCell>
                      <TableCell>{course.submittedAt}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(course)}>
                          상세 보기
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24 text-gray-500">
                      대기 중인 수업이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        
        {/* 승인된 수업 탭 */}
        <TabsContent value="approved">
          <Card className="p-4">
            <Table>
              <TableCaption>승인된 수업 목록</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">수업명</TableHead>
                  <TableHead>훈련사</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>가격</TableHead>
                  <TableHead>수수료</TableHead>
                  <TableHead>예약 수</TableHead>
                  <TableHead>승인일</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filterCourses(approvedCourses).length > 0 ? (
                  filterCourses(approvedCourses).map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">{course.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full overflow-hidden">
                            <img 
                              src={course.trainer.avatar} 
                              alt={course.trainer.name}
                              className="w-full h-full object-cover" 
                            />
                          </div>
                          <span>{course.trainer.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={course.type === '1:1 상담' ? 'bg-primary' : 'bg-success'}>
                          {course.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{course.price.toLocaleString()}원</TableCell>
                      <TableCell>{course.commission}%</TableCell>
                      <TableCell>{course.bookings}명</TableCell>
                      <TableCell>{course.approvedAt}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(course)}>
                          상세 보기
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-24 text-gray-500">
                      승인된 수업이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        
        {/* 거절된 수업 탭 */}
        <TabsContent value="rejected">
          <Card className="p-4">
            <Table>
              <TableCaption>거절된 수업 목록</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">수업명</TableHead>
                  <TableHead>훈련사</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>가격</TableHead>
                  <TableHead>거절일</TableHead>
                  <TableHead>거절 사유</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filterCourses(rejectedCourses).length > 0 ? (
                  filterCourses(rejectedCourses).map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">{course.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full overflow-hidden">
                            <img 
                              src={course.trainer.avatar} 
                              alt={course.trainer.name}
                              className="w-full h-full object-cover" 
                            />
                          </div>
                          <span>{course.trainer.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={course.type === '1:1 상담' ? 'bg-primary' : 'bg-success'}>
                          {course.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{course.price.toLocaleString()}원</TableCell>
                      <TableCell>{course.rejectedAt}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{course.rejectionReason}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(course)}>
                          상세 보기
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24 text-gray-500">
                      거절된 수업이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* 수업 상세 정보 다이얼로그 */}
      {selectedCourse && (
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{selectedCourse.title}</DialogTitle>
              <DialogDescription>
                {selectedCourse.status === 'pending' ? '대기 중인 수업' : 
                 selectedCourse.status === 'approved' ? '승인된 수업' : '거절된 수업'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">수업 정보</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <div className="font-medium">수업 유형</div>
                    <div>
                      <Badge className={selectedCourse.type === '1:1 상담' ? 'bg-primary' : 'bg-success'}>
                        {selectedCourse.type}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <div className="font-medium">훈련사</div>
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                        <img 
                          src={selectedCourse.trainer.avatar} 
                          alt={selectedCourse.trainer.name}
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <span>{selectedCourse.trainer.name}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <div className="font-medium">최대 인원</div>
                    <div>{selectedCourse.maxParticipants}명</div>
                  </div>
                  
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <div className="font-medium">소요 시간</div>
                    <div>{selectedCourse.duration}</div>
                  </div>
                  
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <div className="font-medium">수업 시간</div>
                    <div>
                      <ul className="list-disc list-inside">
                        {selectedCourse.timeSlots.map((slot: string, index: number) => (
                          <li key={index}>{slot}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <div className="font-medium">장소</div>
                    <div>{selectedCourse.location}</div>
                  </div>
                  
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <div className="font-medium">가격</div>
                    <div className="font-bold text-primary">{selectedCourse.price.toLocaleString()}원</div>
                  </div>
                  
                  {selectedCourse.status === 'approved' && (
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <div className="font-medium">수수료</div>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number" 
                          defaultValue={selectedCourse.commission}
                          className="w-20"
                          min="0"
                          max="50"
                        /> %
                        <Button size="sm" variant="outline" onClick={() => 
                          handleUpdateCommission(selectedCourse.id, 
                                              parseInt((document.querySelector('input[type="number"]') as HTMLInputElement).value))
                        }>
                          변경
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">수업 설명</h3>
                <p className="mb-4 whitespace-pre-line">{selectedCourse.description}</p>
                
                <Separator className="my-4" />
                
                <div className="space-y-4">
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <div className="font-medium">제출일</div>
                    <div>{selectedCourse.submittedAt}</div>
                  </div>
                  
                  {selectedCourse.status === 'approved' && (
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <div className="font-medium">승인일</div>
                      <div>{selectedCourse.approvedAt}</div>
                    </div>
                  )}
                  
                  {selectedCourse.status === 'rejected' && (
                    <>
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <div className="font-medium">거절일</div>
                        <div>{selectedCourse.rejectedAt}</div>
                      </div>
                      
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <div className="font-medium">거절 사유</div>
                        <div>{selectedCourse.rejectionReason}</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {selectedCourse.status === 'pending' && (
              <DialogFooter className="mt-6 flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="rejection-reason" className="text-sm mb-1 block">거절 사유 (선택사항)</Label>
                  <Input id="rejection-reason" placeholder="거절 사유를 입력하세요" />
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="destructive" 
                    onClick={() => handleRejectCourse(
                      selectedCourse.id, 
                      (document.getElementById('rejection-reason') as HTMLInputElement).value || '사유 없음'
                    )}
                  >
                    거절
                  </Button>
                  <Button onClick={() => handleApproveCourse(selectedCourse.id)}>
                    승인
                  </Button>
                </div>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}