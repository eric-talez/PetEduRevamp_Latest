import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  Plus, 
  Trash2, 
  Upload, 
  BookOpen,
  Clock,
  FileText,
  Package,
  Settings,
  AlertCircle
} from 'lucide-react';

interface LectureModule {
  id: string;
  title: string;
  description: string;
  duration: number;
  objectives: string[];
  materials: string[];
  format: 'theory' | 'practice' | 'theory_practice';
  isFree: boolean;
  order: number;
}

export default function VideoLectureRegistration() {
  const { userName } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 강의 기본 정보
  const [lectureData, setLectureData] = useState({
    title: '',
    description: '',
    difficulty: 'beginner' as const,
    category: '',
    price: 0,
    estimatedDuration: 0
  });

  // 모듈 목록
  const [modules, setModules] = useState<LectureModule[]>([]);
  const [currentModule, setCurrentModule] = useState<Partial<LectureModule>>({
    title: '',
    description: '',
    duration: 60,
    objectives: [''],
    materials: ['교재 및 학습노트', 'PPT 자료'],
    format: 'theory_practice',
    isFree: false
  });

  const handleAddObjective = () => {
    setCurrentModule({
      ...currentModule,
      objectives: [...(currentModule.objectives || []), '']
    });
  };

  const handleUpdateObjective = (index: number, value: string) => {
    const newObjectives = [...(currentModule.objectives || [])];
    newObjectives[index] = value;
    setCurrentModule({
      ...currentModule,
      objectives: newObjectives
    });
  };

  const handleRemoveObjective = (index: number) => {
    const newObjectives = (currentModule.objectives || []).filter((_, i) => i !== index);
    setCurrentModule({
      ...currentModule,
      objectives: newObjectives
    });
  };

  const handleAddMaterial = () => {
    setCurrentModule({
      ...currentModule,
      materials: [...(currentModule.materials || []), '']
    });
  };

  const handleUpdateMaterial = (index: number, value: string) => {
    const newMaterials = [...(currentModule.materials || [])];
    newMaterials[index] = value;
    setCurrentModule({
      ...currentModule,
      materials: newMaterials
    });
  };

  const handleRemoveMaterial = (index: number) => {
    const newMaterials = (currentModule.materials || []).filter((_, i) => i !== index);
    setCurrentModule({
      ...currentModule,
      materials: newMaterials
    });
  };

  const handleAddModule = () => {
    if (!currentModule.title || !currentModule.description) {
      toast({
        title: "입력 오류",
        description: "모듈 제목과 설명을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    const newModule: LectureModule = {
      id: Date.now().toString(),
      title: currentModule.title!,
      description: currentModule.description!,
      duration: currentModule.duration || 60,
      objectives: (currentModule.objectives || []).filter(obj => obj.trim() !== ''),
      materials: (currentModule.materials || []).filter(mat => mat.trim() !== ''),
      format: currentModule.format || 'theory_practice',
      isFree: currentModule.isFree || false,
      order: modules.length + 1
    };

    setModules([...modules, newModule]);
    
    // 폼 리셋
    setCurrentModule({
      title: '',
      description: '',
      duration: 60,
      objectives: [''],
      materials: ['교재 및 학습노트', 'PPT 자료'],
      format: 'theory_practice',
      isFree: false
    });

    toast({
      title: "모듈 추가 완료",
      description: "새 모듈이 추가되었습니다.",
    });
  };

  const handleRemoveModule = (moduleId: string) => {
    setModules(modules.filter(module => module.id !== moduleId));
  };

  const handleSubmitLecture = async () => {
    if (!lectureData.title || !lectureData.description || modules.length === 0) {
      toast({
        title: "입력 오류",
        description: "강의 제목, 설명, 그리고 최소 1개의 모듈이 필요합니다.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const totalDuration = modules.reduce((sum, module) => sum + module.duration, 0);
      
      const submissionData = {
        ...lectureData,
        instructor: userName,
        totalDuration,
        modules,
        status: 'pending', // 승인 대기 상태로 제출
        rating: 0,
        reviewCount: 0,
        studentCount: 0
      };

      const response = await fetch('/api/video-lectures/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionData)
      });

      if (response.ok) {
        toast({
          title: "강의 등록 완료",
          description: "강의가 성공적으로 등록되었습니다. 관리자 승인을 기다려주세요.",
        });
        
        // 폼 리셋
        setLectureData({
          title: '',
          description: '',
          difficulty: 'beginner',
          category: '',
          price: 0,
          estimatedDuration: 0
        });
        setModules([]);
      } else {
        throw new Error('강의 등록 실패');
      }
    } catch (error) {
      toast({
        title: "등록 실패",
        description: "강의 등록 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">영상강의 등록</h1>
        <p className="text-gray-600 dark:text-gray-400">
          새로운 영상강의를 등록하세요. 관리자 승인 후 공개됩니다.
        </p>
      </div>

      <div className="space-y-6">
        {/* 기본 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              기본 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">강의 제목 *</label>
                <Input
                  value={lectureData.title}
                  onChange={(e) => setLectureData({...lectureData, title: e.target.value})}
                  placeholder="강의 제목을 입력하세요"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">카테고리 *</label>
                <Select 
                  value={lectureData.category} 
                  onValueChange={(value) => setLectureData({...lectureData, category: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="기초훈련">기초훈련</SelectItem>
                    <SelectItem value="문제행동교정">문제행동교정</SelectItem>
                    <SelectItem value="재활치료">재활치료</SelectItem>
                    <SelectItem value="고급훈련">고급훈련</SelectItem>
                    <SelectItem value="특수훈련">특수훈련</SelectItem>
                    <SelectItem value="펫시터교육">펫시터교육</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">강의 설명 *</label>
              <Textarea
                value={lectureData.description}
                onChange={(e) => setLectureData({...lectureData, description: e.target.value})}
                placeholder="강의에 대한 상세한 설명을 입력하세요"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">난이도</label>
                <Select 
                  value={lectureData.difficulty} 
                  onValueChange={(value: 'beginner' | 'intermediate' | 'advanced') => 
                    setLectureData({...lectureData, difficulty: value})
                  }
                >
                  <SelectTrigger>
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
                <label className="text-sm font-medium mb-1 block">가격 (원)</label>
                <Input
                  type="number"
                  value={lectureData.price}
                  onChange={(e) => setLectureData({...lectureData, price: Number(e.target.value)})}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">강사명</label>
                <Input
                  value={userName || ''}
                  disabled
                  className="bg-gray-50 dark:bg-gray-800"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 모듈 추가 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              새 모듈 추가
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">모듈 제목 *</label>
                <Input
                  value={currentModule.title || ''}
                  onChange={(e) => setCurrentModule({...currentModule, title: e.target.value})}
                  placeholder="예: 1강: 기본 개념 이해"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">예상 소요시간 (분)</label>
                <Input
                  type="number"
                  value={currentModule.duration || 60}
                  onChange={(e) => setCurrentModule({...currentModule, duration: Number(e.target.value)})}
                  placeholder="60"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">모듈 설명 *</label>
              <Textarea
                value={currentModule.description || ''}
                onChange={(e) => setCurrentModule({...currentModule, description: e.target.value})}
                placeholder="이 모듈에서 다룰 내용을 설명하세요"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">강의 형식</label>
                <Select 
                  value={currentModule.format || 'theory_practice'} 
                  onValueChange={(value: 'theory' | 'practice' | 'theory_practice') => 
                    setCurrentModule({...currentModule, format: value})
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="theory">이론</SelectItem>
                    <SelectItem value="practice">실습</SelectItem>
                    <SelectItem value="theory_practice">이론+실습</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={currentModule.isFree || false}
                  onChange={(e) => setCurrentModule({...currentModule, isFree: e.target.checked})}
                  className="rounded"
                />
                <label className="text-sm font-medium">무료 강의</label>
              </div>
            </div>

            {/* 학습 목표 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">학습 목표</label>
                <Button size="sm" variant="outline" onClick={handleAddObjective}>
                  <Plus className="h-3 w-3 mr-1" />
                  목표 추가
                </Button>
              </div>
              <div className="space-y-2">
                {(currentModule.objectives || []).map((objective, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={objective}
                      onChange={(e) => handleUpdateObjective(index, e.target.value)}
                      placeholder="학습 목표를 입력하세요"
                    />
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleRemoveObjective(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* 준비물 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">준비물</label>
                <Button size="sm" variant="outline" onClick={handleAddMaterial}>
                  <Plus className="h-3 w-3 mr-1" />
                  준비물 추가
                </Button>
              </div>
              <div className="space-y-2">
                {(currentModule.materials || []).map((material, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={material}
                      onChange={(e) => handleUpdateMaterial(index, e.target.value)}
                      placeholder="준비물을 입력하세요"
                    />
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleRemoveMaterial(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleAddModule}>
                <Plus className="h-4 w-4 mr-1" />
                모듈 추가
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 추가된 모듈 목록 */}
        {modules.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                강의 모듈 목록 ({modules.length}개)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {modules.map((module, index) => (
                  <div key={module.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{module.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{module.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={module.format === 'theory' ? 'secondary' : 
                                       module.format === 'practice' ? 'default' : 'outline'}>
                          {module.format === 'theory' ? '이론' : 
                           module.format === 'practice' ? '실습' : '이론+실습'}
                        </Badge>
                        <span className="text-xs text-gray-500">{module.duration}분</span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleRemoveModule(module.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {module.objectives.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs font-medium text-gray-500">학습 목표:</span>
                        <ul className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-4">
                          {module.objectives.map((objective, idx) => (
                            <li key={idx} className="list-disc">{objective}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {module.materials.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs font-medium text-gray-500">준비물:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {module.materials.map((material, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {material}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 승인 안내 */}
        <Card className="border-primary/30 dark:border-primary/50 bg-primary/10 dark:bg-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium text-primary dark:text-primary mb-1">
                  승인 프로세스 안내
                </h4>
                <p className="text-sm text-primary dark:text-primary">
                  등록된 강의는 관리자 검토 후 승인됩니다. 승인까지 1-3일 정도 소요될 수 있으며, 
                  승인 상태는 마이페이지에서 확인하실 수 있습니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 제출 버튼 */}
        <div className="flex justify-end gap-2">
          <Button variant="outline">
            임시저장
          </Button>
          <Button 
            onClick={handleSubmitLecture}
            disabled={isSubmitting || modules.length === 0}
          >
            {isSubmitting ? '등록 중...' : '강의 등록'}
          </Button>
        </div>
      </div>
    </div>
  );
}