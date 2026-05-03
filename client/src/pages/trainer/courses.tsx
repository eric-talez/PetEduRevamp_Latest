import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageSkeleton } from '@/components/ui/SkeletonLoader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { 
  BookOpen, 
  Plus,
  Search, 
  Calendar,
  Clock,
  Users,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Star,
  Award,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface Course {
  id: number;
  title: string;
  description: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  maxStudents: number;
  price: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  // 신청 현황 관련 필드
  enrollmentCount: number;
  totalRevenue: number;
  commissionRate: number;
  trainerRevenue: number;
  trainer: {
    id: number;
    name: string;
    email: string;
  };
  objectives: string[];
  requirements: string;
  curriculum: {
    week: number;
    topic: string;
    content: string;
    objectives: string[];
  }[];
  enrolledStudents: number;
  completedStudents: number;
  averageRating: number;
  reviewComments?: string;
}

export default function TrainerCoursesPage() {
  const { userRole, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isCourseDetailOpen, setIsCourseDetailOpen] = useState(false);
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false);
  const [isEditCourseOpen, setIsEditCourseOpen] = useState(false);

  // 강좌 목록 조회
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['/api/trainer/courses'],
    queryFn: async () => {
      return [
        {
          id: 1,
          title: "기초 복종 훈련",
          description: "반려견의 기본적인 복종 훈련을 위한 8주 과정입니다. 앉기, 기다리기, 이리와 등의 기본 명령어를 학습합니다.",
          category: "기초훈련",
          level: 'beginner',
          duration: "8주",
          maxStudents: 10,
          price: 350000,
          status: 'approved',
          // 신청 현황 관련 데이터
          enrollmentCount: 25,
          totalRevenue: 8750000,
          commissionRate: 70, // 70% 수익률
          trainerRevenue: 6125000,
          createdAt: "2025-01-15T10:00:00Z",
          updatedAt: "2025-01-20T14:30:00Z",
          submittedAt: "2025-01-16T09:00:00Z",
          approvedAt: "2025-01-20T14:30:00Z",
          trainer: { id: 1, name: "김민수", email: "kim@example.com" },
          objectives: ["기본 명령어 이해", "집중력 향상", "사회성 기초 함양"],
          requirements: "건강한 반려견, 최신 예방접종 완료",
          curriculum: [
            {
              week: 1,
              topic: "기본 자세 훈련",
              content: "앉기, 기다리기 기본 자세 훈련",
              objectives: ["올바른 앉기 자세", "5초간 기다리기"]
            },
            {
              week: 2,
              topic: "호명 반응 훈련",
              content: "이름 부르기 반응 및 시선 집중 훈련",
              objectives: ["이름 반응률 90%", "아이컨택 유지"]
            }
          ],
          enrolledStudents: 8,
          completedStudents: 3,
          averageRating: 4.8
        },
        {
          id: 2,
          title: "어질리티 기초",
          description: "반려견의 운동능력 향상을 위한 어질리티 훈련 과정입니다.",
          category: "운동훈련",
          level: 'intermediate',
          duration: "6주",
          maxStudents: 8,
          price: 280000,
          status: 'pending',
          // 신청 현황 관련 데이터 (승인 대기 중이므로 0)
          enrollmentCount: 0,
          totalRevenue: 0,
          commissionRate: 70,
          trainerRevenue: 0,
          createdAt: "2025-01-20T14:30:00Z",
          updatedAt: "2025-01-20T14:30:00Z",
          submittedAt: "2025-01-20T15:00:00Z",
          trainer: { id: 1, name: "김민수", email: "kim@example.com" },
          objectives: ["운동능력 향상", "협응력 개발", "자신감 증진"],
          requirements: "기초 복종 훈련 수료, 관절 건강 양호",
          curriculum: [
            {
              week: 1,
              topic: "장애물 익숙해지기",
              content: "기본 장애물 소개 및 적응 훈련",
              objectives: ["장애물 두려움 극복", "기본 통과"]
            },
            {
              week: 2,
              topic: "점프 훈련",
              content: "높이별 점프 연습",
              objectives: ["안전한 점프", "높이 적응"]
            }
          ],
          enrolledStudents: 0,
          completedStudents: 0,
          averageRating: 0,
          reviewComments: "승인 대기 중입니다. 커리큘럼이 잘 구성되어 있습니다."
        },
        {
          id: 3,
          title: "문제행동 교정",
          description: "짖기, 물기 등의 문제행동을 교정하는 전문 과정입니다.",
          category: "행동교정",
          level: 'advanced',
          duration: "12주",
          maxStudents: 6,
          price: 480000,
          status: 'draft',
          createdAt: "2025-01-18T09:00:00Z",
          updatedAt: "2025-01-21T11:00:00Z",
          trainer: { id: 1, name: "김민수", email: "kim@example.com" },
          objectives: ["문제행동 분석", "교정 기법 적용", "예방법 교육"],
          requirements: "문제행동 진단서, 수의사 소견서",
          curriculum: [
            {
              week: 1,
              topic: "행동 분석",
              content: "문제행동의 원인 분석 및 평가",
              objectives: ["행동 패턴 파악", "원인 규명"]
            }
          ],
          enrolledStudents: 0,
          completedStudents: 0,
          averageRating: 0,
          totalRevenue: 0
        }
      ] as Course[];
    },
    enabled: isAuthenticated
  });

  // 필터링된 강좌 목록
  const filteredCourses = courses?.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || course.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 강좌 제출 (승인 요청)
  const submitCourseMutation = useMutation({
    mutationFn: async (courseId: number) => {
      console.log('강좌 승인 요청:', courseId);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/courses'] });
      toast({
        title: "승인 요청 완료",
        description: "강좌가 승인 요청되었습니다. 검토 후 결과를 알려드리겠습니다."
      });
    }
  });

  // 강좌 삭제
  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId: number) => {
      console.log('강좌 삭제:', courseId);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/courses'] });
      toast({
        title: "강좌 삭제 완료",
        description: "강좌가 성공적으로 삭제되었습니다."
      });
    }
  });

  const getStatusBadge = (status: Course['status']) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">임시저장</Badge>;
      case 'pending':
        return <Badge variant="warning">승인대기</Badge>;
      case 'approved':
        return <Badge variant="success">승인완료</Badge>;
      case 'rejected':
        return <Badge variant="danger">승인거부</Badge>;
      case 'active':
        return <Badge variant="default">진행중</Badge>;
      case 'completed':
        return <Badge variant="outline">완료</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course);
    setIsCourseDetailOpen(true);
  };

  const handleEditCourse = (course: Course) => {
    setSelectedCourse(course);
    setIsEditCourseOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">내 강좌 관리</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            강좌 등록, 관리 및 승인 현황을 확인하세요
          </p>
        </div>
        <Dialog open={isCreateCourseOpen} onOpenChange={setIsCreateCourseOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              새 강좌 등록
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>새 강좌 등록</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">강좌명</Label>
                  <Input id="title" placeholder="강좌명을 입력하세요" />
                </div>
                <div>
                  <Label htmlFor="category">카테고리</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="카테고리 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">기초훈련</SelectItem>
                      <SelectItem value="agility">어질리티</SelectItem>
                      <SelectItem value="behavior">행동교정</SelectItem>
                      <SelectItem value="social">사회화</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="description">강좌 설명</Label>
                <Textarea id="description" placeholder="강좌에 대한 상세 설명을 입력하세요" rows={3} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="duration">수강 기간</Label>
                  <Input id="duration" placeholder="예: 8주" />
                </div>
                <div>
                  <Label htmlFor="maxStudents">최대 수강생</Label>
                  <Input id="maxStudents" type="number" placeholder="10" />
                </div>
                <div>
                  <Label htmlFor="price">수강료 (원)</Label>
                  <Input id="price" type="number" placeholder="350000" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateCourseOpen(false)}>
                취소
              </Button>
              <Button variant="secondary">
                임시저장
              </Button>
              <Button>
                등록 및 승인요청
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 강좌 현황 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">총 강좌</p>
                <p className="text-2xl font-bold">{courses?.length || 0}</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">승인 대기</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {courses?.filter(c => c.status === 'pending').length || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">진행 중</p>
                <p className="text-2xl font-bold text-green-600">
                  {courses?.filter(c => c.status === 'approved' || c.status === 'active').length || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">총 수익</p>
                <p className="text-2xl font-bold text-purple-600">
                  {(courses?.reduce((sum, c) => sum + c.trainerRevenue, 0) || 0).toLocaleString()}원
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 검색 및 필터 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="강좌명 또는 설명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="draft">임시저장</SelectItem>
                <SelectItem value="pending">승인대기</SelectItem>
                <SelectItem value="approved">승인완료</SelectItem>
                <SelectItem value="rejected">승인거부</SelectItem>
                <SelectItem value="active">진행중</SelectItem>
                <SelectItem value="completed">완료</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 강좌 목록 */}
      <div className="grid gap-4">
        {coursesLoading ? (
          <PageSkeleton header={false} variant="list" count={4} className="p-0" />
        ) : filteredCourses && filteredCourses.length > 0 ? (
          filteredCourses.map((course: Course) => (
            <Card 
              key={course.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleCourseClick(course)}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold">{course.title}</h3>
                      {getStatusBadge(course.status)}
                      <Badge variant="outline">{course.category}</Badge>
                      <Badge variant="secondary">{course.level}</Badge>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-400 mb-3">{course.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{course.duration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>최대 {course.maxStudents}명</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        <span>{course.price.toLocaleString()}원</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400" />
                        <span>{course.averageRating > 0 ? course.averageRating.toFixed(1) : 'N/A'}</span>
                      </div>
                    </div>

                    {/* 신청 현황 표시 */}
                    {course.status === 'approved' && course.enrollmentCount > 0 && (
                      <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">신청자:</span>
                            <span className="ml-1 font-medium">{course.enrollmentCount}명</span>
                          </div>
                          <div>
                            <span className="text-gray-600">총 수익:</span>
                            <span className="ml-1 font-medium">{course.totalRevenue.toLocaleString()}원</span>
                          </div>
                          <div>
                            <span className="text-gray-600">수익률:</span>
                            <span className="ml-1 font-medium text-blue-600">{course.commissionRate}%</span>
                          </div>
                          <div>
                            <span className="text-gray-600">내 수익:</span>
                            <span className="ml-1 font-medium text-green-600">{course.trainerRevenue.toLocaleString()}원</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {course.status === 'pending' && course.reviewComments && (
                      <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          <AlertCircle className="h-4 w-4 inline mr-1" />
                          {course.reviewComments}
                        </p>
                      </div>
                    )}

                    {course.status === 'rejected' && course.reviewComments && (
                      <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <p className="text-sm text-red-800 dark:text-red-200">
                          <XCircle className="h-4 w-4 inline mr-1" />
                          거부 사유: {course.reviewComments}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      상세보기
                    </Button>
                    
                    {course.status === 'draft' && (
                      <>
                        <Button variant="outline" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          handleEditCourse(course);
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          편집
                        </Button>
                        <Button size="sm" onClick={(e) => {
                          e.stopPropagation();
                          submitCourseMutation.mutate(course.id);
                        }}>
                          <Send className="h-4 w-4 mr-2" />
                          승인요청
                        </Button>
                      </>
                    )}
                    
                    {(course.status === 'draft' || course.status === 'rejected') && (
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('정말로 삭제하시겠습니까?')) {
                            deleteCourseMutation.mutate(course.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        삭제
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                {searchTerm || statusFilter !== 'all' ? 
                  '검색 조건에 맞는 강좌가 없습니다' : 
                  '등록된 강좌가 없습니다'
                }
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== 'all' ? 
                  '다른 검색어나 필터를 시도해보세요' : 
                  '첫 번째 강좌를 등록해보세요'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Button onClick={() => setIsCreateCourseOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  새 강좌 등록
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* 강좌 상세 모달 */}
      <Dialog open={isCourseDetailOpen} onOpenChange={setIsCourseDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedCourse && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <DialogTitle className="text-xl flex items-center gap-2">
                      <BookOpen className="h-6 w-6" />
                      {selectedCourse.title}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-2">
                      {getStatusBadge(selectedCourse.status)}
                      <Badge variant="outline">{selectedCourse.category}</Badge>
                      <Badge variant="secondary">{selectedCourse.level}</Badge>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">기본 정보</TabsTrigger>
                  <TabsTrigger value="curriculum">커리큘럼</TabsTrigger>
                  <TabsTrigger value="students">수강생</TabsTrigger>
                  <TabsTrigger value="stats">통계</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">강좌 설명</h4>
                    <p className="text-gray-700 dark:text-gray-300 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      {selectedCourse.description}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">강좌 목표</h4>
                      <div className="space-y-1">
                        {selectedCourse.objectives.map((objective, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">{objective}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">참가 요건</h4>
                      <p className="text-sm text-gray-600 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                        {selectedCourse.requirements}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="curriculum" className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-3">주차별 커리큘럼</h4>
                    <div className="space-y-3">
                      {selectedCourse.curriculum.map((item, idx) => (
                        <Card key={idx}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h5 className="font-medium">{item.week}주차: {item.topic}</h5>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{item.content}</p>
                            <div className="flex flex-wrap gap-1">
                              {item.objectives.map((obj, objIdx) => (
                                <Badge key={objIdx} variant="outline" className="text-xs">{obj}</Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="students" className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{selectedCourse.enrollmentCount}</div>
                      <div className="text-sm text-gray-600">신청자</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{selectedCourse.completedStudents}</div>
                      <div className="text-sm text-gray-600">수료생</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{selectedCourse.maxStudents}</div>
                      <div className="text-sm text-gray-600">최대 정원</div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="stats" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {selectedCourse.averageRating > 0 ? selectedCourse.averageRating.toFixed(1) : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600">평균 평점</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{selectedCourse.commissionRate}%</div>
                      <div className="text-sm text-gray-600">수익률</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {selectedCourse.totalRevenue.toLocaleString()}원
                      </div>
                      <div className="text-sm text-gray-600">총 수익</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {selectedCourse.trainerRevenue.toLocaleString()}원
                      </div>
                      <div className="text-sm text-gray-600">내 수익</div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCourseDetailOpen(false)}>
                  닫기
                </Button>
                {selectedCourse.status === 'draft' && (
                  <Button onClick={() => {
                    setIsCourseDetailOpen(false);
                    handleEditCourse(selectedCourse);
                  }}>
                    <Edit className="h-4 w-4 mr-2" />
                    편집
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}