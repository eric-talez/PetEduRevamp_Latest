import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Video, 
  Edit, 
  Trash2, 
  Upload, 
  Play,
  Clock,
  Users,
  BookOpen,
  Star,
  CheckCircle
} from 'lucide-react';

interface VideoContent {
  id: string;
  title: string;
  description: string;
  duration: number; // 분 단위
  videoUrl?: string;
  thumbnailUrl?: string;
  uploadedAt: Date;
  status: 'pending' | 'processing' | 'ready' | 'failed';
}

interface CurriculumModule {
  id: string;
  title: string;
  description: string;
  order: number;
  duration: number; // 분 단위
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  videos: VideoContent[];
  objectives: string[];
  prerequisites: string[];
  isRequired: boolean;
}

interface Course {
  id: string;
  title: string;
  description: string;
  trainerId: string;
  trainerName: string;
  modules: CurriculumModule[];
  totalDuration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  price: number;
  enrollmentCount: number;
  rating: number;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export default function CurriculumManager() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [selectedModule, setSelectedModule] = useState<CurriculumModule | null>(null);
  const { toast } = useToast();

  // 새 강의 생성 폼 상태
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    difficulty: 'beginner' as const,
    price: 0
  });

  // 새 모듈 생성 폼 상태
  const [newModule, setNewModule] = useState({
    title: '',
    description: '',
    duration: 0,
    difficulty: 'beginner' as const,
    objectives: [''],
    prerequisites: [''],
    isRequired: true
  });

  // 비디오 업로드 상태
  const [videoUpload, setVideoUpload] = useState({
    title: '',
    description: '',
    file: null as File | null
  });

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const response = await fetch('/api/courses/curriculum');
      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses || []);
      }
    } catch (error) {
      console.error('강의 목록 로딩 실패:', error);
    }
  };

  const createCourse = async () => {
    if (!newCourse.title.trim() || !newCourse.description.trim()) {
      toast({
        title: "입력 오류",
        description: "강의 제목과 설명을 입력해주세요.",
        variant: "danger"
      });
      return;
    }

    try {
      const response = await fetch('/api/courses/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCourse)
      });

      if (response.ok) {
        const course = await response.json();
        setCourses(prev => [...prev, course]);
        setNewCourse({ title: '', description: '', difficulty: 'beginner', price: 0 });
        setIsCreatingCourse(false);
        toast({
          title: "성공",
          description: "새 강의가 생성되었습니다.",
          variant: "success"
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "강의 생성에 실패했습니다.",
        variant: "danger"
      });
    }
  };

  const createModule = async () => {
    if (!selectedCourse || !newModule.title.trim()) {
      toast({
        title: "입력 오류",
        description: "모듈 제목을 입력해주세요.",
        variant: "danger"
      });
      return;
    }

    try {
      const response = await fetch(`/api/courses/${selectedCourse.id}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newModule,
          objectives: newModule.objectives.filter(obj => obj.trim()),
          prerequisites: newModule.prerequisites.filter(pre => pre.trim())
        })
      });

      if (response.ok) {
        const module = await response.json();
        setSelectedCourse(prev => prev ? {
          ...prev,
          modules: [...prev.modules, module]
        } : null);
        setNewModule({
          title: '',
          description: '',
          duration: 0,
          difficulty: 'beginner',
          objectives: [''],
          prerequisites: [''],
          isRequired: true
        });
        setIsCreatingModule(false);
        toast({
          title: "성공",
          description: "새 모듈이 추가되었습니다.",
          variant: "success"
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "모듈 생성에 실패했습니다.",
        variant: "danger"
      });
    }
  };

  const uploadVideo = async () => {
    if (!selectedModule || !videoUpload.file || !videoUpload.title.trim()) {
      toast({
        title: "입력 오류",
        description: "모든 필드를 입력하고 비디오 파일을 선택해주세요.",
        variant: "danger"
      });
      return;
    }

    setIsUploadingVideo(true);

    try {
      const formData = new FormData();
      formData.append('video', videoUpload.file);
      formData.append('title', videoUpload.title);
      formData.append('description', videoUpload.description);
      formData.append('moduleId', selectedModule.id);

      const response = await fetch('/api/courses/videos/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const video = await response.json();
        setSelectedModule(prev => prev ? {
          ...prev,
          videos: [...prev.videos, video]
        } : null);
        setVideoUpload({ title: '', description: '', file: null });
        toast({
          title: "성공",
          description: "비디오가 업로드되었습니다. 처리 중입니다.",
          variant: "success"
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "비디오 업로드에 실패했습니다.",
        variant: "danger"
      });
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'danger';
      default: return 'secondary';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '초급';
      case 'intermediate': return '중급';
      case 'advanced': return '고급';
      default: return '미정';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'processing': return <Clock className="w-4 h-4 text-warning" />;
      case 'failed': return <Trash2 className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">커리큘럼 관리</h1>
          <p className="text-gray-600">강의와 비디오 콘텐츠를 관리합니다.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 강의 목록 */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    강의 목록
                  </CardTitle>
                  <Button 
                    onClick={() => setIsCreatingCourse(true)}
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    새 강의
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {courses.map(course => (
                  <div
                    key={course.id}
                    onClick={() => setSelectedCourse(course)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedCourse?.id === course.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{course.title}</h3>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {course.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={getDifficultyColor(course.difficulty)} className="text-xs">
                            {getDifficultyText(course.difficulty)}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {course.modules.length}개 모듈
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* 새 강의 생성 폼 */}
                {isCreatingCourse && (
                  <div className="p-4 border border-dashed border-gray-300 rounded-lg">
                    <Input
                      placeholder="강의 제목"
                      value={newCourse.title}
                      onChange={(e) => setNewCourse(prev => ({ ...prev, title: e.target.value }))}
                      className="mb-3"
                    />
                    <Textarea
                      placeholder="강의 설명"
                      value={newCourse.description}
                      onChange={(e) => setNewCourse(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="mb-3"
                    />
                    <div className="flex gap-2">
                      <Button onClick={createCourse} size="sm">생성</Button>
                      <Button 
                        onClick={() => setIsCreatingCourse(false)} 
                        variant="outline" 
                        size="sm"
                      >
                        취소
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 선택된 강의의 모듈 목록 */}
          <div className="lg:col-span-2">
            {selectedCourse ? (
              <div className="space-y-6">
                {/* 강의 정보 */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{selectedCourse.title}</CardTitle>
                        <p className="text-gray-600 mt-1">{selectedCourse.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getDifficultyColor(selectedCourse.difficulty)}>
                          {getDifficultyText(selectedCourse.difficulty)}
                        </Badge>
                        <Badge variant="outline">
                          {selectedCourse.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                          <Users className="w-4 h-4" />
                          <span className="text-sm">수강생</span>
                        </div>
                        <div className="font-semibold">{selectedCourse.enrollmentCount}</div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">총 시간</span>
                        </div>
                        <div className="font-semibold">{selectedCourse.totalDuration}분</div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                          <BookOpen className="w-4 h-4" />
                          <span className="text-sm">모듈</span>
                        </div>
                        <div className="font-semibold">{selectedCourse.modules.length}개</div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                          <Star className="w-4 h-4" />
                          <span className="text-sm">평점</span>
                        </div>
                        <div className="font-semibold">{selectedCourse.rating.toFixed(1)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 모듈 목록 */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>모듈 목록</CardTitle>
                      <Button 
                        onClick={() => setIsCreatingModule(true)}
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        모듈 추가
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedCourse.modules.map((module, index) => (
                        <div
                          key={module.id}
                          onClick={() => setSelectedModule(module)}
                          className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                            selectedModule?.id === module.id 
                              ? 'border-primary bg-primary/5' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium text-gray-500">
                                  모듈 {index + 1}
                                </span>
                                {module.isRequired && (
                                  <Badge variant="danger" className="text-xs">필수</Badge>
                                )}
                              </div>
                              <h3 className="font-medium">{module.title}</h3>
                              <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {module.duration}분
                                </span>
                                <span className="flex items-center gap-1">
                                  <Video className="w-4 h-4" />
                                  {module.videos.length}개 영상
                                </span>
                              </div>
                            </div>
                            <Badge variant={getDifficultyColor(module.difficulty)}>
                              {getDifficultyText(module.difficulty)}
                            </Badge>
                          </div>

                          {/* 비디오 목록 */}
                          {module.videos.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {module.videos.map(video => (
                                  <div 
                                    key={video.id}
                                    className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                                  >
                                    <div className="flex items-center gap-1">
                                      {getStatusIcon(video.status)}
                                      <Play className="w-3 h-3 text-gray-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium truncate">
                                        {video.title}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {video.duration}분
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* 새 모듈 생성 폼 */}
                      {isCreatingModule && (
                        <div className="p-4 border border-dashed border-gray-300 rounded-lg">
                          <Input
                            placeholder="모듈 제목"
                            value={newModule.title}
                            onChange={(e) => setNewModule(prev => ({ ...prev, title: e.target.value }))}
                            className="mb-3"
                          />
                          <Textarea
                            placeholder="모듈 설명"
                            value={newModule.description}
                            onChange={(e) => setNewModule(prev => ({ ...prev, description: e.target.value }))}
                            rows={3}
                            className="mb-3"
                          />
                          <div className="flex gap-2">
                            <Button onClick={createModule} size="sm">생성</Button>
                            <Button 
                              onClick={() => setIsCreatingModule(false)} 
                              variant="outline" 
                              size="sm"
                            >
                              취소
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 선택된 모듈의 비디오 관리 */}
                {selectedModule && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Video className="w-5 h-5" />
                        {selectedModule.title} - 비디오 관리
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* 비디오 업로드 폼 */}
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-medium mb-3">새 비디오 업로드</h4>
                          <div className="space-y-3">
                            <Input
                              placeholder="비디오 제목"
                              value={videoUpload.title}
                              onChange={(e) => setVideoUpload(prev => ({ ...prev, title: e.target.value }))}
                            />
                            <Textarea
                              placeholder="비디오 설명"
                              value={videoUpload.description}
                              onChange={(e) => setVideoUpload(prev => ({ ...prev, description: e.target.value }))}
                              rows={2}
                            />
                            <div className="flex items-center gap-3">
                              <Input
                                type="file"
                                accept="video/*"
                                onChange={(e) => setVideoUpload(prev => ({ 
                                  ...prev, 
                                  file: e.target.files?.[0] || null 
                                }))}
                                className="flex-1"
                              />
                              <Button 
                                onClick={uploadVideo}
                                disabled={isUploadingVideo}
                                className="flex items-center gap-1"
                              >
                                <Upload className="w-4 h-4" />
                                {isUploadingVideo ? '업로드 중...' : '업로드'}
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* 기존 비디오 목록 */}
                        <div className="space-y-2">
                          <h4 className="font-medium">업로드된 비디오</h4>
                          {selectedModule.videos.length > 0 ? (
                            selectedModule.videos.map(video => (
                              <div key={video.id} className="flex items-center gap-3 p-3 border rounded-lg">
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(video.status)}
                                  <Play className="w-4 h-4 text-gray-400" />
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium">{video.title}</div>
                                  <div className="text-sm text-gray-600">{video.description}</div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {video.duration}분 • {new Date(video.uploadedAt).toLocaleDateString()}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button variant="outline" size="sm">
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center text-gray-500 py-8">
                              <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                              <div>업로드된 비디오가 없습니다.</div>
                              <div className="text-sm">위의 폼을 사용해 비디오를 추가해보세요.</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">강의를 선택하세요</h3>
                    <p className="text-gray-500">
                      좌측에서 강의를 선택하거나 새로운 강의를 생성해보세요.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}