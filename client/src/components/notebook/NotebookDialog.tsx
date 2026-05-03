import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  X,
  Image,
  Video,
  ClipboardList,
  Sparkles,
  Brain,
} from 'lucide-react';
interface Pet {
  id: number;
  name: string;
  avatar?: string;
  breed: string;
}

interface PetOwner {
  id: number;
  name: string;
  email?: string;
  petIds?: number[]; // 소유한 반려동물 ID 목록
}

import { useToast } from '@/hooks/use-toast';
import ActivityRecorder, { Activity } from './ActivityRecorder';
import { TemplateType } from './TemplateSelector';

interface NotebookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pets: Pet[];
  onSubmit: (data: any) => void;
  onShowTemplateDialog: () => void;
  initialData?: any;
  petOwners?: PetOwner[]; // 견주 목록 (훈련사 권한일 때 사용)
}

// 활동 데이터를 텍스트로 변환하는 함수
const generateActivityText = (activities: Activity): string => {
  const parts: string[] = [];

  // 식사 활동 텍스트 생성
  if (activities.meal) {
    const mealParts = [];
    if (activities.meal.breakfast) mealParts.push('아침');
    if (activities.meal.lunch) mealParts.push('점심');
    if (activities.meal.dinner) mealParts.push('저녁');
    if (activities.meal.snack) mealParts.push('간식');
    if (activities.meal.water) mealParts.push('물');

    if (mealParts.length > 0) {
      parts.push(`[식사] ${mealParts.join(', ')} 식사를 했습니다.`);
      if (activities.meal.custom) parts.push(`특이사항: ${activities.meal.custom}`);
    }
  }

  // 배변 활동 텍스트 생성
  if (activities.potty) {
    const pottyParts = [];
    if (activities.potty.pee) pottyParts.push('소변');
    if (activities.potty.poop) pottyParts.push('대변');

    if (pottyParts.length > 0) {
      let text = `[배변] ${pottyParts.join(', ')}`;
      if (activities.potty.count) text += `, ${activities.potty.count}회`;
      if (activities.potty.quality) {
        const qualityText = {
          'good': '좋음',
          'normal': '보통',
          'bad': '나쁨'
        }[activities.potty.quality];
        text += `, 상태: ${qualityText}`;
      }
      parts.push(text);
    }
  }

  // 산책 활동 텍스트 생성
  if (activities.walk) {
    const walkParts = [];
    if (activities.walk.morning) walkParts.push('아침');
    if (activities.walk.afternoon) walkParts.push('오후');
    if (activities.walk.evening) walkParts.push('저녁');

    if (walkParts.length > 0 || activities.walk.duration || activities.walk.distance) {
      let text = '[산책]';
      if (walkParts.length > 0) text += ` ${walkParts.join(', ')} 산책했습니다.`;
      if (activities.walk.duration) text += ` 시간: ${activities.walk.duration}분`;
      if (activities.walk.distance) text += ` 거리: ${(activities.walk.distance / 1000).toFixed(1)}km`;
      parts.push(text);
    }
  }

  // 훈련 활동 텍스트 생성
  if (activities.training) {
    const trainingParts = [];
    if (activities.training.sit) trainingParts.push('앉아');
    if (activities.training.stay) trainingParts.push('기다려');
    if (activities.training.come) trainingParts.push('이리와');
    if (activities.training.down) trainingParts.push('엎드려');
    if (activities.training.paw) trainingParts.push('손');

    if (trainingParts.length > 0) {
      parts.push(`[훈련] ${trainingParts.join(', ')} 훈련을 했습니다.`);
      if (activities.training.custom) parts.push(`추가 훈련: ${activities.training.custom}`);
    }
  }

  // 놀이 활동 텍스트 생성
  if (activities.play) {
    const playParts = [];
    if (activities.play.fetch) playParts.push('물건 가져오기');
    if (activities.play.tug) playParts.push('터그놀이');
    if (activities.play.chase) playParts.push('쫓기 놀이');
    if (activities.play.puzzle) playParts.push('퍼즐 장난감');

    if (playParts.length > 0) {
      parts.push(`[놀이] ${playParts.join(', ')} 놀이를 했습니다.`);
      if (activities.play.custom) parts.push(`기타 놀이: ${activities.play.custom}`);
    }
  }

  return parts.join('\n');
};

export default function NotebookDialog({
  open,
  onOpenChange,
  pets,
  onSubmit,
  onShowTemplateDialog,
  initialData,
  petOwners = []  // 기본값은 빈 배열
}: NotebookDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: '',
    content: '',
    petId: 0,
    mood: 'happy' as 'happy' | 'sad' | 'neutral' | 'excited' | 'tired',
    taggedItems: [] as string[],
    photos: [] as string[],
    videos: [] as string[],
    activities: {} as Activity,
    isShared: false,      // 알림장 공유 여부
    ownerId: null as number | null,  // 공유 대상 견주 ID
    ownerName: '' as string // 공유 대상 견주 이름
  });

  const [tagInput, setTagInput] = useState('');
  const [mediaPreview, setMediaPreview] = useState<{photos: string[], videos: string[]}>({photos: [], videos: []});
  const [useAIMode, setUseAIMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'activities' | 'media' | 'ai'>('basic');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // 초기 데이터로 폼 초기화
  useEffect(() => {
    console.log('NotebookDialog useEffect - Dialog open:', open, 'activeTab:', activeTab);
    if (initialData) {
      setForm(initialData);
      setMediaPreview({
        photos: initialData.photos || [],
        videos: initialData.videos || []
      });
    } else {
      resetForm();
    }
  }, [initialData, open]);

  // 탭 상태 디버깅
  useEffect(() => {
    console.log('NotebookDialog activeTab changed to:', activeTab);
  }, [activeTab]);

  // 폼 초기화
  const resetForm = () => {
    setForm({
      title: '',
      content: '',
      petId: pets.length > 0 ? pets[0].id : 0,
      mood: 'happy',
      taggedItems: [],
      photos: [],
      videos: [],
      activities: {},
      isShared: false,
      ownerId: null,
      ownerName: ''
    });
    setMediaPreview({photos: [], videos: []});
    setTagInput('');
    setUseAIMode(false);
  };

  // 폼 제출
  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast({
        title: "제목을 입력해주세요",
        variant: "destructive"
      });
      return;
    }

    if (!form.petId) {
      toast({
        title: "반려견을 선택해주세요",
        variant: "destructive"
      });
      return;
    }

    onSubmit(form);
    resetForm();
    onOpenChange(false);
  };

  // 사진 파일 선택
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const newPhotos: string[] = [];

      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const photoUrl = event.target.result.toString();
            newPhotos.push(photoUrl);

            if (newPhotos.length === files.length) {
              setForm(prev => ({
                ...prev,
                photos: [...prev.photos, ...newPhotos]
              }));

              setMediaPreview(prev => ({
                ...prev,
                photos: [...prev.photos, ...newPhotos]
              }));
            }
          }
        };
        reader.readAsDataURL(file);
      });

      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 동영상 파일 선택
  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const newVideos: string[] = [];

      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const videoUrl = event.target.result.toString();
            newVideos.push(videoUrl);

            if (newVideos.length === files.length) {
              setForm(prev => ({
                ...prev,
                videos: [...prev.videos, ...newVideos]
              }));

              setMediaPreview(prev => ({
                ...prev,
                videos: [...prev.videos, ...newVideos]
              }));
            }
          }
        };
        reader.readAsDataURL(file);
      });

      // 파일 입력 초기화
      if (videoInputRef.current) {
        videoInputRef.current.value = '';
      }
    }
  };

  // AI 콘텐츠 생성 함수 (기본)
  const generateAIContent = () => {
    toast({
      title: "AI 콘텐츠 생성 중",
      description: "AI가 알림장 내용을 생성하고 있습니다..."
    });

    // AI 콘텐츠 생성 로직을 여기에 추가
    // 현재는 기본 텍스트로 설정
    const aiContent = "AI가 생성한 알림장 내용입니다. 오늘 반려견이 활발하고 건강한 모습을 보였습니다.";

    setTimeout(() => {
      setForm(prev => ({
        ...prev,
        content: prev.content ? `${prev.content}\n\n${aiContent}` : aiContent
      }));

      toast({
        title: "AI 콘텐츠 생성 완료",
        description: "AI가 생성한 내용이 추가되었습니다."
      });
    }, 1000);
  };

  // 미디어 파일 제거
  const handleDeleteMedia = (type: 'photo' | 'video', index: number) => {
    if (type === 'photo') {
      setForm(prev => ({
        ...prev,
        photos: prev.photos.filter((_, i) => i !== index)
      }));

      setMediaPreview(prev => ({
        ...prev,
        photos: prev.photos.filter((_, i) => i !== index)
      }));
    } else {
      setForm(prev => ({
        ...prev,
        videos: prev.videos.filter((_, i) => i !== index)
      }));

      setMediaPreview(prev => ({
        ...prev,
        videos: prev.videos.filter((_, i) => i !== index)
      }));
    }
  };

  // AI로 내용 생성 (개선된 함수)
  const handleGenerateAIContent = async () => {
    if (!form.petId) {
      toast({
        title: "반려견을 선택해주세요",
        variant: "destructive"
      });
      return;
    }

    try {
      const pet = pets.find(p => p.id === form.petId);
      if (!pet) return;

      toast({
        title: "AI로 내용 생성 중...",
        description: "잠시만 기다려주세요."
      });

      const { generateNotebookEntry } = await import('@/lib/notebook-ai');
      const result = await generateNotebookEntry(
        pet.name,
        pet.breed,
        form.activities,
        form.content
      );

      setForm(prev => ({
        ...prev,
        title: result.title,
        content: result.content
      }));

      toast({
        title: "AI 생성 완료",
        description: "내용이 자동으로 생성되었습니다."
      });
    } catch (error) {
      console.error("AI 생성 오류:", error);
      toast({
        title: "AI 생성 실패",
        description: "내용 생성에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? '알림장 수정' : '새 알림장 작성'}</DialogTitle>
          <DialogDescription>
            {initialData ? '알림장을 수정합니다.' : '새로운 알림장을 작성합니다.'}
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="mb-4 p-2 bg-yellow-100 border-2 border-yellow-400 rounded-lg">
          <div className="text-xs text-blue-600 font-medium mb-1 text-center">탭 네비게이션 시스템</div>
          <div className="text-xs text-red-600 font-medium mb-2 text-center">현재 활성 탭: {activeTab}</div>
          <div className="flex space-x-1 bg-gradient-to-r from-primary/10 to-secondary/10 p-2 rounded-lg border-2 border-primary/30 shadow-lg">
            <button 
              onClick={() => {
                console.log('Tab clicked: basic');
                setActiveTab('basic');
              }}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'basic' 
                  ? 'bg-white shadow-sm text-gray-900 border-2 border-blue-500' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              📝 기본 정보
            </button>
            <button 
              onClick={() => {
                console.log('Tab clicked: activities');
                setActiveTab('activities');
              }}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'activities' 
                  ? 'bg-white shadow-sm text-gray-900 border-2 border-blue-500' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              📊 활동 기록
            </button>
            <button 
              onClick={() => {
                console.log('Tab clicked: media');
                setActiveTab('media');
              }}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'media' 
                  ? 'bg-white shadow-sm text-gray-900 border-2 border-blue-500' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              📸 미디어
            </button>
            <button 
              onClick={() => {
                console.log('Tab clicked: ai');
                setActiveTab('ai');
              }}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'ai' 
                  ? 'bg-white shadow-sm text-gray-900 border-2 border-blue-500' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              🤖 AI 도우미
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="grid gap-4 py-4">
          {activeTab === 'basic' && (
            <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="petId">반려견 선택</Label>
            <Select 
              value={form.petId.toString()} 
              onValueChange={(value) => {
                setForm(prev => ({
                  ...prev,
                  petId: parseInt(value)
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="반려견을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {pets.map(pet => (
                  <SelectItem key={pet.id} value={pet.id.toString()}>
                    {pet.name} ({pet.breed})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">제목</Label>
            <div className="flex gap-2">
              <Input
                id="title"
                value={form.title}
                onChange={e => setForm(prev => ({
                  ...prev,
                  title: e.target.value
                }))}
                placeholder="알림장 제목을 입력하세요"
              />
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setUseAIMode(!useAIMode)}
                className={useAIMode ? "bg-primary/20" : ""}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                AI 활용
              </Button>
            </div>
          </div>

          {useAIMode && (
            <ActivityRecorder 
              value={form.activities} 
              onChange={(activities) => {
                // 활동 정보를 텍스트로 변환
                const activityText = generateActivityText(activities);

                // 기존 내용에서 활동 관련 텍스트 제거 (중복 방지)
                let cleanContent = form.content;

                // [식사], [배변], [산책], [훈련], [놀이] 태그로 시작하는 줄 제거
                const activityLabels = ['[식사]', '[배변]', '[산책]', '[훈련]', '[놀이]'];
                const contentLines = cleanContent.split('\n');
                const filteredLines = contentLines.filter(line => {
                  // 특이사항, 추가 훈련, 기타 놀이와 같은 부가 설명 줄도 제거
                  const isActivityRelated = line.trim().startsWith('특이사항:') 
                    || line.trim().startsWith('추가 훈련:') 
                    || line.trim().startsWith('기타 놀이:');

                  // 활동 라벨로 시작하거나 부가 설명인 경우 제거
                  return !activityLabels.some(label => line.trim().startsWith(label)) && !isActivityRelated;
                });

                // 정제된 내용 사용
                cleanContent = filteredLines.join('\n');

                // 폼 업데이트
                setForm(prev => ({
                  ...prev,
                  activities,
                  // 정제된 내용 끝에 새 활동 텍스트 추가
                  content: activityText ? 
                    // 내용이 있으면 줄바꿈 후 추가, 없으면 그대로 추가
                    (cleanContent.trim() ? `${cleanContent.trim()}\n\n${activityText}` : activityText) : 
                    cleanContent
                }));

                // 알림 표시
                toast({
                  title: "활동 정보가 추가되었습니다",
                  description: "선택한 활동이 알림장 내용에 반영되었습니다."
                });
              }}
            />
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="content">내용</Label>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={onShowTemplateDialog}
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  템플릿 사용
                </Button>
                {useAIMode && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={generateAIContent}
                  >
                    <Brain className="mr-2 h-4 w-4" />
                    AI로 내용 생성
                  </Button>
                )}
              </div>
            </div>
            <Textarea
              id="content"
              value={form.content}
              onChange={e => setForm(prev => ({
                ...prev,
                content: e.target.value
              }))}
              placeholder="알림장 내용을 입력하세요"
              rows={8}
            />
          </div>
          <div className="space-y-2">
            <Label>기분</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={form.mood === 'happy' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setForm(prev => ({ ...prev, mood: 'happy' }))}
              >
                행복해요 😊
              </Button>
              <Button
                type="button"
                variant={form.mood === 'sad' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setForm(prev => ({ ...prev, mood: 'sad' }))}
              >
                슬퍼요 😢
              </Button>
              <Button
                type="button"
                variant={form.mood === 'neutral' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setForm(prev => ({ ...prev, mood: 'neutral' }))}
              >
                보통이에요 😐
              </Button>
              <Button
                type="button"
                variant={form.mood === 'excited' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setForm(prev => ({ ...prev, mood: 'excited' }))}
              >
                신나요 😃
              </Button>
              <Button
                type="button"
                variant={form.mood === 'tired' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setForm(prev => ({ ...prev, mood: 'tired' }))}
              >
                피곤해요 😴
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>관련 태그</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.taggedItems.map((tag, index) => (
                <Badge key={index} variant="secondary">
                  {tag}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => {
                      setForm(prev => ({
                        ...prev,
                        taggedItems: prev.taggedItems.filter((_, i) => i !== index)
                      }));
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                placeholder="태그 입력"
                onKeyDown={e => {
                  if (e.key === 'Enter' && tagInput.trim()) {
                    e.preventDefault();
                    setForm(prev => ({
                      ...prev,
                      taggedItems: [...prev.taggedItems, tagInput.trim()]
                    }));
                    setTagInput('');
                  }
                }}
              />
              <Button
                type="button"
                onClick={() => {
                  if (tagInput.trim()) {
                    setForm(prev => ({
                      ...prev,
                      taggedItems: [...prev.taggedItems, tagInput.trim()]
                    }));
                    setTagInput('');
                  }
                }}
              >
                추가
              </Button>
            </div>
          </div>
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <h3 className="text-lg font-medium mb-2">📊 활동 기록</h3>
                <p className="text-gray-600 mb-4">반려견의 다양한 활동을 기록해보세요.</p>
              </div>
              <ActivityRecorder 
                value={form.activities} 
                onChange={(activities) => {
                  const activityText = generateActivityText(activities);
                  let cleanContent = form.content;

                  const activityLabels = ['[식사]', '[배변]', '[산책]', '[훈련]', '[놀이]'];
                  const contentLines = cleanContent.split('\n');
                  const filteredLines = contentLines.filter(line => {
                    const isActivityRelated = line.trim().startsWith('특이사항:') 
                      || line.trim().startsWith('추가 훈련:') 
                      || line.trim().startsWith('기타 놀이:');

                    return !activityLabels.some(label => line.trim().startsWith(label)) && !isActivityRelated;
                  });

                  cleanContent = filteredLines.join('\n');

                  setForm(prev => ({
                    ...prev,
                    activities,
                    content: activityText ? 
                      (cleanContent.trim() ? `${cleanContent.trim()}\n\n${activityText}` : activityText) : 
                      cleanContent
                  }));

                  toast({
                    title: "활동 정보가 추가되었습니다",
                    description: "선택한 활동이 알림장 내용에 반영되었습니다."
                  });
                }}
              />
            </div>
          )}

          {activeTab === 'media' && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <h3 className="text-lg font-medium mb-2">📸 미디어 관리</h3>
                <p className="text-gray-600 mb-4">사진과 동영상을 추가하여 알림장을 더욱 풍성하게 만들어보세요.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium">사진</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Image className="mr-2 h-4 w-4" />
                      사진 추가
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                      multiple
                    />
                  </div>
                  {mediaPreview.photos.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {mediaPreview.photos.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`미리보기 ${index + 1}`}
                            className="w-full h-24 object-cover rounded-md cursor-pointer"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteMedia('photo', index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-24 bg-muted rounded-md">
                      <p className="text-sm text-muted-foreground">사진 없음</p>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium">동영상</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => videoInputRef.current?.click()}
                    >
                      <Video className="mr-2 h-4 w-4" />
                      동영상 추가
                    </Button>
                    <input
                      type="file"
                      ref={videoInputRef}
                      className="hidden"
                      accept="video/*"
                      onChange={handleVideoChange}
                      multiple
                    />
                  </div>
                  {mediaPreview.videos.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {mediaPreview.videos.map((url, index) => (
                        <div key={index} className="relative group">
                          <video
                            src={url}
                            className="w-full h-24 object-cover rounded-md cursor-pointer"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteMedia('video', index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-24 bg-muted rounded-md">
                      <p className="text-sm text-muted-foreground">동영상 없음</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                <div className="text-center">
                  <Sparkles className="h-12 w-12 mx-auto mb-3 text-yellow-500" />
                  <h3 className="text-lg font-medium mb-2">AI 알림장 도우미</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    입력한 반려견 정보와 활동 내용을 바탕으로 AI가 자동으로 알림장을 작성해드립니다.
                  </p>

                  {!form.petId ? (
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-md p-3 mb-4">
                      <p className="text-xs text-yellow-800 dark:text-yellow-200">
                        ⚠️ AI 생성을 위해서는 먼저 반려견을 선택해주세요.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-white dark:bg-gray-800 rounded-md p-3 text-left">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">AI가 다음 정보를 활용합니다:</p>
                        <ul className="text-xs space-y-1 text-gray-700 dark:text-gray-300">
                          <li>✓ 반려견 정보</li>
                          <li>✓ 활동 기록</li>
                          <li>✓ 기존 작성 내용</li>
                        </ul>
                      </div>
                      <Button
                        onClick={handleGenerateAIContent}
                        size="lg"
                        className="w-full gap-2"
                        disabled={!form.petId}
                      >
                        <Brain className="h-5 w-5" />
                        AI로 알림장 생성하기
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
          >
            취소
          </Button>
          <Button type="button" onClick={handleSubmit}>
            {initialData ? '수정' : '작성'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}