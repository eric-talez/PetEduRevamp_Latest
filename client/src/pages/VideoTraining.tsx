import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Video, Edit, Trash2, Plus, BookOpen, Clock, Users, Star, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCSRFToken } from '@/lib/csrf';

interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  duration: number;
  modules: any[];
  trainerName: string;
  status: 'draft' | 'published' | 'archived';
  enrollmentCount?: number;
  averageRating?: number;
  createdAt: string;
  updatedAt: string;
}

export default function VideoTraining() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Course>>({});
  const { toast } = useToast();

  // 사용자 역할 확인
  const getUserRole = (): string | null => {
    const authData = localStorage.getItem('petedu_auth');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        return parsed.role || null;
      } catch {
        return null;
      }
    }
    return null;
  };

  const isAdmin = getUserRole() === 'admin' || getUserRole() === 'institute' || getUserRole() === 'trainer';

  // 역할에 따라 표시할 강의 필터링
  const displayedCourses = isAdmin 
    ? courses 
    : courses.filter(course => course.status === 'published');

  // 강의 목록 조회
  const fetchCourses = async () => {
    try {
      setLoading(true);
      console.log('🔥 영상훈련 - 강의 목록 조회 시작');
      
      const response = await fetch('/api/admin/curriculums');
      if (response.ok) {
        const data = await response.json();
        console.log('🔥 커리큘럼 데이터:', data);
        
        // 모든 커리큘럼을 강의 형태로 변환 (발행된 것 우선)
        const allCourses = data.curriculums.map((curriculum: any) => ({
          id: curriculum.id,
          title: curriculum.title,
          description: curriculum.description,
          price: curriculum.price || 0,
          difficulty: curriculum.difficulty || 'beginner',
          category: curriculum.category || '기본 훈련',
          duration: curriculum.duration || 0,
          modules: curriculum.modules || [],
          trainerName: curriculum.trainerName || '전문 훈련사',
          status: curriculum.status || 'draft',
          enrollmentCount: curriculum.enrollmentCount || 0,
          averageRating: curriculum.averageRating || 0,
          createdAt: curriculum.createdAt || new Date().toISOString(),
          updatedAt: curriculum.updatedAt || new Date().toISOString()
        }));
        
        console.log('🔥 변환된 강의 목록:', allCourses);
        setCourses(allCourses);
      } else {
        console.error('🔥 커리큘럼 API 응답 실패:', response.status);
      }
    } catch (error) {
      console.error('🔥 강의 데이터 로딩 실패:', error);
      toast({
        title: "오류",
        description: "강의 목록을 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // 강의 수정
  const handleEditCourse = async (courseId: string) => {
    try {
      const csrfToken = await getCSRFToken();
      const response = await fetch(`/api/admin/curriculums/${courseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify(editFormData)
      });

      if (response.ok) {
        toast({
          title: "수정 완료",
          description: "강의가 성공적으로 수정되었습니다.",
        });
        setShowEditDialog(false);
        setSelectedCourse(null);
        setEditFormData({});
        fetchCourses();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: "오류",
          description: errorData.message || "강의 수정에 실패했습니다.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('강의 수정 실패:', error);
      toast({
        title: "오류",
        description: "강의 수정 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  // 강의 삭제
  const handleDeleteCourse = async (courseId: string) => {
    try {
      const csrfToken = await getCSRFToken();
      const response = await fetch(`/api/admin/curriculums/${courseId}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: "삭제 완료",
          description: "강의가 성공적으로 삭제되었습니다.",
        });
        fetchCourses();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: "오류",
          description: errorData.message || "강의 삭제에 실패했습니다.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('강의 삭제 실패:', error);
      toast({
        title: "오류",
        description: "강의 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  // 강의 상태 변경
  const handleStatusChange = async (courseId: string, newStatus: string) => {
    try {
      const csrfToken = await getCSRFToken();
      const response = await fetch(`/api/admin/curriculums/${courseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        toast({
          title: "상태 변경 완료",
          description: `강의 상태가 ${newStatus === 'published' ? '발행' : newStatus === 'draft' ? '초안' : '보관'}으로 변경되었습니다.`,
        });
        fetchCourses();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: "오류",
          description: errorData.message || "상태 변경에 실패했습니다.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('상태 변경 실패:', error);
      toast({
        title: "오류",
        description: "상태 변경 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (course: Course) => {
    setSelectedCourse(course);
    setEditFormData({
      title: course.title,
      description: course.description,
      price: course.price,
      difficulty: course.difficulty,
      category: course.category,
      duration: course.duration
    });
    setShowEditDialog(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge variant="success">발행됨</Badge>;
      case 'draft':
        return <Badge variant="warning">초안</Badge>;
      case 'archived':
        return <Badge variant="secondary">보관됨</Badge>;
      default:
        return <Badge variant="secondary">알 수 없음</Badge>;
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return <Badge variant="success">초급</Badge>;
      case 'intermediate':
        return <Badge variant="info">중급</Badge>;
      case 'advanced':
        return <Badge variant="danger">고급</Badge>;
      default:
        return <Badge variant="secondary">미설정</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">강의 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Video className="w-8 h-8" />
          영상훈련 관리
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          강의 찾기에 표시되는 강의들을 수정하고 삭제할 수 있습니다.
        </p>
      </div>

      {/* 통계 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isAdmin ? '전체 강의' : '이용 가능한 강의'}
                </p>
                <p className="text-2xl font-bold">{displayedCourses.length}</p>
              </div>
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">발행된 강의</p>
                    <p className="text-2xl font-bold text-success">
                      {courses.filter(c => c.status === 'published').length}
                    </p>
                  </div>
                  <Eye className="w-8 h-8 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">초안 강의</p>
                    <p className="text-2xl font-bold text-primary">
                      {courses.filter(c => c.status === 'draft').length}
                    </p>
                  </div>
                  <Edit className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">총 수강생</p>
                <p className="text-2xl font-bold text-primary">
                  {displayedCourses.reduce((sum, c) => sum + (c.enrollmentCount || 0), 0)}
                </p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 강의 목록 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {displayedCourses.map((course) => (
          <Card key={course.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                <div className="flex flex-col gap-1 ml-2">
                  {getStatusBadge(course.status)}
                  {getDifficultyBadge(course.difficulty)}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                {course.description}
              </p>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4" />
                  <span>{course.trainerName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>{Math.floor(course.duration / 60)}시간 {course.duration % 60}분</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <BookOpen className="w-4 h-4" />
                  <span>{course.modules.length}개 모듈</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Star className="w-4 h-4" />
                  <span>{course.averageRating || 0}점 ({course.enrollmentCount || 0}명 수강)</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-primary">
                  {course.price.toLocaleString()}원
                </span>
                <span className="text-sm text-gray-500">
                  {course.category}
                </span>
              </div>

              {isAdmin ? (
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    onClick={() => openEditDialog(course)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    수정
                  </Button>
                  
                  <Select
                    value={course.status}
                    onValueChange={(value) => handleStatusChange(course.id, value)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">초안</SelectItem>
                      <SelectItem value="published">발행</SelectItem>
                      <SelectItem value="archived">보관</SelectItem>
                    </SelectContent>
                  </Select>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>강의 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                          정말로 이 강의를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteCourse(course.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          삭제
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : (
                <div className="mt-4">
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => window.location.href = `/courses/${course.id}`}
                  >
                    <BookOpen className="w-4 h-4 mr-1" />
                    강의 상세보기
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {displayedCourses.length === 0 && (
        <div className="text-center py-12">
          <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">
            {isAdmin ? '등록된 강의가 없습니다.' : '현재 이용 가능한 강의가 없습니다.'}
          </p>
          <p className="text-gray-400 text-sm">
            {isAdmin ? '커리큘럼을 먼저 등록해주세요.' : '곧 새로운 강의가 추가될 예정입니다.'}
          </p>
        </div>
      )}

      {/* 수정 다이얼로그 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>강의 수정</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">강의 제목</Label>
              <Input
                id="title"
                value={editFormData.title || ''}
                onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="description">강의 설명</Label>
              <Textarea
                id="description"
                value={editFormData.description || ''}
                onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                className="mt-1"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">가격 (원)</Label>
                <Input
                  id="price"
                  type="number"
                  value={editFormData.price || 0}
                  onChange={(e) => setEditFormData({...editFormData, price: parseInt(e.target.value)})}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="duration">수업 시간 (분)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={editFormData.duration || 0}
                  onChange={(e) => setEditFormData({...editFormData, duration: parseInt(e.target.value)})}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="difficulty">난이도</Label>
                <Select
                  value={editFormData.difficulty || 'beginner'}
                  onValueChange={(value) => setEditFormData({...editFormData, difficulty: value as any})}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">초급</SelectItem>
                    <SelectItem value="intermediate">중급</SelectItem>
                    <SelectItem value="advanced">고급</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="category">카테고리</Label>
                <Input
                  id="category"
                  value={editFormData.category || ''}
                  onChange={(e) => setEditFormData({...editFormData, category: e.target.value})}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              취소
            </Button>
            <Button onClick={() => selectedCourse && handleEditCourse(selectedCourse.id)}>
              수정 완료
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}