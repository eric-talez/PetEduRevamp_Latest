import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { 
  CalendarDays, 
  Plus, 
  Search, 
  Filter, 
  BookOpen, 
  Heart, 
  Camera,
  MessageSquare,
  Star,
  Clock,
  MapPin,
  User,
  PawPrint,
  Stethoscope,
  Utensils,
  Gamepad2,
  Moon,
  Sun,
  Activity,
  Sparkles,
  FileText,
  Image as ImageIcon,
  Video,
  Mic,
  Download,
  Share,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { format, isToday, isYesterday, subDays, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-compat';
import { secureRequest, getCSRFToken } from '@/lib/csrf';
import NotebookBannerImage from '@assets/stock_images/pet_training_journal_3a3d5b29.jpg';
import { PageBanner } from '@/components/PageBanner';

// 알림장 엔트리 타입 정의
interface NotebookEntry {
  id: string;
  date: string;
  petName: string;
  petId: string;
  trainerName: string;
  trainerId: string;
  title: string;
  content: string;
  activities: {
    training?: {
      type?: string;
      focus?: string;
      achievement?: string;
    };
    play?: {
      duration?: string;
      type?: string;
      intensity?: string;
    };
    meal?: {
      frequency?: string;
      amount?: string;
      time1?: string;
      time2?: string;
      snacks?: string;
    };
    health?: {
      weight?: string;
      temperature?: string;
      water?: string;
      special?: string;
    };
    bathroom?: {
      urination?: string;
      defecation?: string;
      condition?: string;
    };
    behavior?: string[];
  };
  mood: 'excellent' | 'good' | 'normal' | 'tired' | 'anxious';
  photos: string[];
  videos: string[];
  notes: string;
  nextGoals: string[];
  weather: string;
  duration: number; // 분 단위
  location: string;
  tags: string[];
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

// 템플릿 타입 정의
interface NotebookTemplate {
  id: string;
  name: string;
  description: string;
  activities: string[];
  defaultContent: string;
  tags: string[];
  activityPreset?: {
    training?: { type?: string; focus?: string; achievement?: string; };
    play?: { duration?: string; type?: string; intensity?: string; };
    meal?: { frequency?: string; amount?: string; time1?: string; time2?: string; snacks?: string; };
    health?: { weight?: string; temperature?: string; water?: string; special?: string; };
    bathroom?: { urination?: string; defecation?: string; condition?: string; };
  };
}

export default function NotebookPage() {
  const { toast } = useToast();
  const { isAuthenticated, userRole, userName } = useAuth();
  const [entries, setEntries] = useState<NotebookEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<NotebookEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPet, setSelectedPet] = useState('all');
  const [selectedTrainer, setSelectedTrainer] = useState('all');
  const [selectedEntry, setSelectedEntry] = useState<NotebookEntry | null>(null);
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAIHelperOpen, setIsAIHelperOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'pet' | 'trainer'>('date');
  const [showRead, setShowRead] = useState(true);
  const [showUnread, setShowUnread] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingVideos, setUploadingVideos] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(undefined);
  const [showCalendar, setShowCalendar] = useState(false);
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [activeTab, setActiveTab] = useState<'basic' | 'activities' | 'media' | 'ai'>('basic');
  const [selectedAIPetId, setSelectedAIPetId] = useState<string>('');
  
  // 반려동물 목록 조회
  const petsQuery = useQuery({
    queryKey: ['/api/pets'],
  });
  
  const petsData = petsQuery.data as any;
  const pets = Array.isArray(petsData) 
    ? petsData 
    : (petsData?.pets || petsData?.data || []);
  
  // 파일 업로드 상태
  const [uploadedFiles, setUploadedFiles] = useState<{
    images: { file: File; preview: string }[];
    videos: { file: File; preview: string }[];
  }>({
    images: [],
    videos: []
  });
  const [isUploading, setIsUploading] = useState(false);

  // 새 알림장 폼 상태
  const [newEntry, setNewEntry] = useState({
    petName: '',
    petId: '',
    trainerName: '',
    trainerId: '',
    title: '',
    content: '',
    activities: {
      training: {
        type: 'basic' as string,
        focus: 'medium' as string,
        achievement: 'medium' as string
      },
      play: {
        duration: '30' as string,
        type: 'fetch' as string,
        intensity: 'medium' as string
      },
      meal: {
        frequency: '2' as string,
        amount: 'normal' as string,
        time1: '' as string,
        time2: '' as string,
        snacks: '0' as string
      },
      health: {
        weight: '' as string,
        temperature: '' as string,
        water: 'normal' as string,
        special: 'none' as string
      },
      bathroom: {
        urination: '0' as string,
        defecation: '0' as string,
        condition: 'normal' as string
      },
      behavior: [] as string[]
    },
    mood: 'good' as NotebookEntry['mood'],
    photos: [] as string[],
    videos: [] as string[],
    notes: '',
    nextGoals: [] as string[],
    weather: '',
    duration: 60,
    location: '',
    tags: [] as string[]
  });

  // 템플릿 데이터
  const templates: NotebookTemplate[] = [
    {
      id: 'basic-training',
      name: '기본 훈련 템플릿',
      description: '일반적인 반려동물 기본 훈련 세션용',
      activities: ['기본 명령어', '리드줄 훈련', '사회화 훈련'],
      defaultContent: '오늘 {petName}는 기본 훈련을 진행했습니다.',
      tags: ['기본훈련', '초급'],
      activityPreset: {
        training: { type: 'basic', focus: 'high', achievement: 'good' },
        play: { duration: '60', type: 'fetch', intensity: 'medium' },
        meal: { frequency: '2', amount: 'normal', time1: '08:00', time2: '18:00', snacks: '1' },
        health: { water: 'normal', special: 'none' },
        bathroom: { urination: '4', defecation: '2', condition: 'normal' }
      }
    },
    {
      id: 'behavior-correction',
      name: '행동 교정 템플릿',
      description: '문제 행동 교정을 위한 세션용',
      activities: ['문제행동 분석', '교정 훈련', '대안행동 제시'],
      defaultContent: '{petName}의 행동 교정을 위한 훈련을 실시했습니다.',
      tags: ['행동교정', '치료'],
      activityPreset: {
        training: { type: 'behavior', focus: 'medium', achievement: 'fair' },
        play: { duration: '30', type: 'puzzle', intensity: 'low' },
        meal: { frequency: '2', amount: 'normal', time1: '09:00', time2: '19:00', snacks: '0' },
        health: { water: 'normal', special: 'none' },
        bathroom: { urination: '3', defecation: '1', condition: 'normal' }
      }
    },
    {
      id: 'socialization',
      name: '사회화 훈련 템플릿',
      description: '다른 동물이나 사람과의 사회화 훈련용',
      activities: ['타 반려동물과의 만남', '사람과의 교감', '환경 적응'],
      defaultContent: '{petName}의 사회화 능력 향상을 위한 훈련을 진행했습니다.',
      tags: ['사회화', '적응'],
      activityPreset: {
        training: { type: 'socialization', focus: 'high', achievement: 'good' },
        play: { duration: '90', type: 'social', intensity: 'medium' },
        meal: { frequency: '2', amount: 'normal', time1: '07:30', time2: '17:30', snacks: '2' },
        health: { water: 'normal', special: 'none' },
        bathroom: { urination: '5', defecation: '2', condition: 'normal' }
      }
    }
  ];

  // 기분 이모지 매핑
  const moodEmojis = {
    excellent: '😊',
    good: '🙂',
    normal: '😐',
    tired: '😴',
    anxious: '😰'
  };

  const moodLabels = {
    excellent: '최고',
    good: '좋음',
    normal: '보통',
    tired: '피곤',
    anxious: '불안'
  };

  // 사용자 권한 확인 함수
  const canCreateNotebook = useMemo(() => {
    // 훈련사나 기관 관리자만 알림장 작성 가능
    return userRole === 'trainer' || userRole === 'institute-admin';
  }, [userRole]);

  const canEditNotebook = useMemo(() => {
    // 훈련사나 기관 관리자만 알림장 수정 가능
    return userRole === 'trainer' || userRole === 'institute-admin';
  }, [userRole]);

  // 알림장 자동 로드 - mock 제거됨, 실제 API 사용

  // 필터링 및 검색
  useEffect(() => {
    let filtered = entries;

    // 검색 필터
    if (searchQuery) {
      filtered = filtered.filter(entry => 
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.petName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.trainerName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 반려동물 필터
    if (selectedPet !== 'all') {
      filtered = filtered.filter(entry => entry.petId === selectedPet);
    }

    // 훈련사 필터
    if (selectedTrainer !== 'all') {
      filtered = filtered.filter(entry => entry.trainerId === selectedTrainer);
    }

    // 날짜 필터
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    if (dateFilterMode === 'today') {
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= startOfToday && entryDate < new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
      });
    } else if (dateFilterMode === 'week') {
      const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= startOfWeek && entryDate < endOfWeek;
      });
    } else if (dateFilterMode === 'month') {
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= startOfMonth && entryDate <= endOfMonth;
      });
    } else if (dateFilterMode === 'custom' && selectedCalendarDate) {
      const selectedDateStart = new Date(selectedCalendarDate.getFullYear(), selectedCalendarDate.getMonth(), selectedCalendarDate.getDate());
      const selectedDateEnd = new Date(selectedDateStart.getTime() + 24 * 60 * 60 * 1000);
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= selectedDateStart && entryDate < selectedDateEnd;
      });
    }

    // 읽음/안읽음 필터
    if (!showRead && !showUnread) {
      filtered = [];
    } else if (!showRead) {
      filtered = filtered.filter(entry => !entry.isRead);
    } else if (!showUnread) {
      filtered = filtered.filter(entry => entry.isRead);
    }

    // 날짜 정렬
    if (sortBy === 'date') {
      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (sortBy === 'pet') {
      filtered.sort((a, b) => a.petName.localeCompare(b.petName));
    } else if (sortBy === 'trainer') {
      filtered.sort((a, b) => a.trainerName.localeCompare(b.trainerName));
    }

    setFilteredEntries(filtered);
  }, [entries, searchQuery, selectedPet, selectedTrainer, sortBy, showRead, showUnread, dateFilterMode, selectedCalendarDate]);

  // 알림장 목록 조회
  const fetchEntries = useCallback(async () => {
    try {
      setIsLoading(true);

      const queryParams = new URLSearchParams();
      if (selectedPet !== 'all') queryParams.append('petId', selectedPet);
      if (selectedTrainer !== 'all') queryParams.append('trainerId', selectedTrainer);

      const response = await fetch(`/api/notebook/entries?${queryParams}`, { credentials: 'include' });
      const data = await response.json();

      if (data.success) {
        type NotebookEntryApi = {
          id: number | string;
          trainingDate?: string;
          createdAt?: string;
          updatedAt?: string;
          petId?: number | string;
          petName?: string;
          pet?: { id?: number | string; name?: string };
          trainerId?: number | string;
          trainerName?: string;
          trainer?: { id?: number | string; name?: string };
          title?: string;
          content?: string;
          activities?: NotebookEntry['activities'];
          mood?: NotebookEntry['mood'];
          attachments?: string[];
          photos?: string[];
          videos?: string[];
          behaviorNotes?: string;
          notes?: string;
          nextGoals?: string | string[];
          weather?: string;
          trainingDuration?: number;
          duration?: number;
          location?: string;
          tags?: string[];
          isRead?: boolean;
        };
        const list: NotebookEntryApi[] = data.data || data.entries || [];
        // 서버 trainingJournals 스키마를 NotebookEntry 표시 형식으로 매핑
        const mapped: NotebookEntry[] = list.map((j) => ({
          id: String(j.id),
          date: (j.trainingDate || j.createdAt || '').toString().slice(0, 10),
          petName: j.petName || j.pet?.name || '반려동물',
          petId: String(j.petId ?? j.pet?.id ?? ''),
          trainerName: j.trainerName || j.trainer?.name || '훈련사',
          trainerId: String(j.trainerId ?? j.trainer?.id ?? ''),
          title: j.title || '훈련 일지',
          content: j.content || '',
          activities: j.activities || {},
          mood: j.mood || 'normal',
          photos: Array.isArray(j.attachments) ? j.attachments.filter((u: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(u)) : (j.photos || []),
          videos: Array.isArray(j.attachments) ? j.attachments.filter((u: string) => /\.(mp4|mov|webm)$/i.test(u)) : (j.videos || []),
          notes: j.behaviorNotes || j.notes || '',
          nextGoals: Array.isArray(j.nextGoals) ? j.nextGoals : (j.nextGoals ? [j.nextGoals] : []),
          weather: j.weather || '',
          duration: j.trainingDuration || j.duration || 0,
          location: j.location || '',
          tags: j.tags || [],
          isRead: !!j.isRead,
          createdAt: j.createdAt || new Date().toISOString(),
          updatedAt: j.updatedAt || j.createdAt || new Date().toISOString(),
        }));
        setEntries(mapped);
      } else {
        throw new Error(data.error || '알림장을 불러올 수 없습니다');
      }
    } catch (error) {
      console.error('알림장 조회 실패:', error);
      toast({
        title: "오류",
        description: "알림장을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedPet, selectedTrainer, toast]);

  // 마운트 및 필터 변경 시 알림장 자동 조회
  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // 파일 업로드 핸들러
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>, type: 'images' | 'videos') => {
    const files = event.target.files;
    if (!files) return;

    const newFiles = Array.from(files).map((file: File) => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    setUploadedFiles(prev => ({
      ...prev,
      [type]: [...prev[type], ...newFiles]
    }));
  }, []);

  // 파일 삭제 핸들러
  const handleFileRemove = useCallback((index: number, type: 'images' | 'videos') => {
    setUploadedFiles(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  }, []);

  // 파일을 서버에 업로드하는 함수
  const uploadFilesToServer = useCallback(async (files: { file: File; preview: string }[]) => {
    const uploadPromises = files.map(async ({ file }) => {
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error('Upload failed');
        }
        
        const result = await response.json();
        return result.url;
      } catch (error) {
        console.error('File upload error:', error);
        throw error;
      }
    });

    return Promise.all(uploadPromises);
  }, []);

  // 이미지 업로드 핸들러
  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const validFiles = Array.from(files).filter((file: File) => {
      // 10MB 제한
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "파일 크기 제한",
          description: "이미지 파일은 10MB 이하만 업로드 가능합니다.",
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploadingImages(true);
    
    for (const file of validFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('업로드 실패');
        }

        const result = await response.json();
        
        if (result.success) {
          setNewEntry(prev => ({
            ...prev,
            photos: [...prev.photos, result.fullUrl]
          }));
          
          toast({
            title: "이미지 업로드 성공",
            description: "이미지가 성공적으로 업로드되었습니다.",
          });
        } else {
          throw new Error(result.message || '업로드 실패');
        }
      } catch (error) {
        console.error('이미지 업로드 오류:', error);
        toast({
          title: "이미지 업로드 실패",
          description: "이미지 업로드 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    }

    setUploadingImages(false);
    // 입력 필드 초기화
    event.target.value = '';
  }, [toast]);

  // 동영상 업로드 핸들러
  const handleVideoUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const validFiles = Array.from(files).filter(file => {
      // 50MB 제한
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "파일 크기 제한",
          description: "동영상 파일은 50MB 이하만 업로드 가능합니다.",
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploadingVideos(true);
    
    for (const file of validFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload/video', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('업로드 실패');
        }

        const result = await response.json();
        
        if (result.success) {
          setNewEntry(prev => ({
            ...prev,
            videos: [...prev.videos, result.fullUrl]
          }));
          
          toast({
            title: "동영상 업로드 성공",
            description: "동영상이 성공적으로 업로드되었습니다.",
          });
        } else {
          throw new Error(result.message || '업로드 실패');
        }
      } catch (error) {
        console.error('동영상 업로드 오류:', error);
        toast({
          title: "동영상 업로드 실패",
          description: "동영상 업로드 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    }

    setUploadingVideos(false);
    // 입력 필드 초기화
    event.target.value = '';
  }, [toast]);

  // 사진 삭제 핸들러
  const removePhoto = useCallback((index: number) => {
    setNewEntry(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  }, []);

  // 동영상 삭제 핸들러
  const removeVideo = useCallback((index: number) => {
    setNewEntry(prev => ({
      ...prev,
      videos: prev.videos.filter((_, i) => i !== index)
    }));
  }, []);

  // 새 알림장 저장
  const handleSaveEntry = async () => {
    if (!newEntry.title || !newEntry.content || !newEntry.petName) {
      toast({
        title: '필수 항목 누락',
        description: '제목, 내용, 반려동물 이름을 입력해주세요.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    setIsUploading(true);

    try {
      // 파일 업로드 처리
      let photoUrls: string[] = [];
      let videoUrls: string[] = [];

      if (uploadedFiles.images.length > 0) {
        photoUrls = await uploadFilesToServer(uploadedFiles.images);
      }

      if (uploadedFiles.videos.length > 0) {
        videoUrls = await uploadFilesToServer(uploadedFiles.videos);
      }

      const csrfToken = await getCSRFToken();
      const response = await fetch('/api/notebook/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({
          ...newEntry,
          date: format(selectedDate, 'yyyy-MM-dd'),
          photos: photoUrls,
          videos: videoUrls
        }),
      });

      const data = await response.json();

      if (data.success) {
        const entry: NotebookEntry = {
          id: data.entry.id,
          date: format(selectedDate, 'yyyy-MM-dd'),
          ...newEntry,
          photos: photoUrls,
          videos: videoUrls,
          isRead: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        setEntries(prev => [entry, ...prev]);

        // 폼 초기화
        setNewEntry({
          petName: '',
          petId: '',
          trainerName: '',
          trainerId: '',
          title: '',
          content: '',
          activities: {
            training: { type: '', focus: '', achievement: '' },
            play: { duration: '', type: '', intensity: '' },
            meal: { frequency: '', amount: '', time1: '', time2: '', snacks: '' },
            health: { weight: '', temperature: '', water: '', special: '' },
            bathroom: { urination: '', defecation: '', condition: '' },
            behavior: []
          },
          mood: 'good',
          photos: [],
          videos: [],
          notes: '',
          nextGoals: [],
          weather: '',
          duration: 60,
          location: '',
          tags: []
        });

        setIsNewEntryOpen(false);

        toast({
          title: '알림장 저장 완료',
          description: '새로운 알림장이 성공적으로 저장되었습니다.'
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: '저장 실패',
        description: '알림장 저장 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // 권한별 알림장 접근 제어
  const checkNotebookAccess = (entry: any) => {
    if (!userRole) return false;

    // 기관 관리자는 소속 훈련사의 알림장 조회 가능
    if (userRole === 'institute-admin') {
      return true; // 임시로 모든 접근 허용
    }

    // 훈련사는 자신이 담당하는 반려동물의 알림장만 접근
    if (userRole === 'trainer') {
      return true; // 임시로 모든 접근 허용
    }

    // 반려인은 자신의 반려동물 알림장만 접근
    if (userRole === 'pet-owner') {
      return true; // 임시로 모든 접근 허용
    }

    // 관리자는 모든 알림장 접근 가능
    return userRole === 'admin';
  };

  // AI 알림장 생성 (중복 제거)
  const handleAIGenerate = async () => {
    // 권한 체크
    if (!['trainer', 'institute-admin', 'admin'].includes(userRole || '')) {
      toast({
        title: "권한 부족",
        description: "AI 알림장 생성은 훈련사 이상의 권한이 필요합니다.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/notebook/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petName: newEntry.petName,
          petBreed: '',
          activities: Object.values(newEntry.activities).flat(),
          additionalContext: newEntry.notes
        })
      });

      const data = await response.json();

      if (data.success) {
        setNewEntry(prev => ({
          ...prev,
          content: data.content.content,
          title: data.content.title,
          tags: data.content.tags,
          activities: {
            ...prev.activities,
            training: data.content.activities || prev.activities.training
          },
          nextGoals: data.content.nextGoals || prev.nextGoals
        }));

        toast({
          title: 'AI 내용 생성 완료',
          description: 'AI가 알림장 내용을 생성했습니다. 필요에 따라 수정해주세요.'
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: 'AI 생성 실패',
        description: 'AI 내용 생성 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setIsAIHelperOpen(false);
    }
  };

  // 템플릿 적용
  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    setNewEntry(prev => {
      const mergedActivities = { ...prev.activities };
      if (template.activityPreset) {
        Object.keys(template.activityPreset).forEach(key => {
          const val = template.activityPreset?.[key as keyof typeof template.activityPreset];
          if (val) {
            (mergedActivities as any)[key] = val;
          }
        });
      }
      return {
        ...prev,
        title: template.defaultContent.replace('{petName}', prev.petName || '[반려동물 이름]'),
        content: template.defaultContent.replace('{petName}', prev.petName || '[반려동물 이름]'),
        tags: template.tags,
        activities: mergedActivities
      };
    });

    setSelectedTemplate(templateId);

    toast({
      title: '템플릿 적용 완료',
      description: `${template.name}이 적용되었습니다.`
    });
  };

  // 날짜 포맷팅
  const formatEntryDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return '오늘';
    if (isYesterday(date)) return '어제';
    return format(date, 'MM월 dd일', { locale: ko });
  };

  // 날짜별 알림장 통계 계산
  const getDateStats = useMemo(() => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const todayCount = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= startOfToday && entryDate < new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    }).length;

    const weekCount = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
      return entryDate >= startOfWeek && entryDate < endOfWeek;
    }).length;

    const monthCount = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return entryDate >= startOfMonth && entryDate <= endOfMonth;
    }).length;

    const selectedDateCount = selectedCalendarDate ? entries.filter(entry => {
      const entryDate = new Date(entry.date);
      const selectedDateStart = new Date(selectedCalendarDate.getFullYear(), selectedCalendarDate.getMonth(), selectedCalendarDate.getDate());
      const selectedDateEnd = new Date(selectedDateStart.getTime() + 24 * 60 * 60 * 1000);
      return entryDate >= selectedDateStart && entryDate < selectedDateEnd;
    }).length : 0;

    return {
      today: todayCount,
      week: weekCount,
      month: monthCount,
      selectedDate: selectedDateCount
    };
  }, [entries, selectedCalendarDate]);

  // 알림장 읽음 처리
  const markAsRead = async (entryId: string) => {
    try {
      const response = await fetch(`/api/notebook/entries/${entryId}/read`, {
        method: 'PATCH'
      });

      if (response.ok) {
        setEntries(prev => prev.map(entry => 
          entry.id === entryId ? { ...entry, isRead: true } : entry
        ));
      }
    } catch (error) {
      console.error('읽음 처리 실패:', error);
    }
  };





  return (
    <div className="pb-8">
      <PageBanner
        title="반려견 훈련 알림장"
        subtitle="매일매일 반려견의 훈련 기록과 성장 과정을 체계적으로 관리하세요"
        imageUrl={NotebookBannerImage}
        actions={canCreateNotebook ? [{
          label: "새 알림장",
          onClick: () => setIsNewEntryOpen(true)
        }] : []}
      />
      
      <div className="container mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            알림장
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">반려동물의 일일 훈련 기록과 상태를 관리하세요</p>
        </div>

        <div className="flex gap-2">
          {canCreateNotebook && (
            <>
              <Dialog open={isAIHelperOpen} onOpenChange={setIsAIHelperOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    AI 도우미
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>AI 알림장 도우미</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      AI가 반려동물 정보를 바탕으로 알림장 내용을 자동 생성해드립니다.
                    </p>
                    
                    {/* 반려동물 선택 */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">반려동물 선택</label>
                      {petsQuery.isLoading ? (
                        <div className="text-sm text-gray-500">로딩 중...</div>
                      ) : pets.length === 0 ? (
                        <div className="text-sm text-gray-500 p-4 border rounded-lg text-center">
                          등록된 반려동물이 없습니다.
                          <br />
                          <span className="text-xs">먼저 반려동물을 등록해주세요.</span>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {pets.map((pet: any) => (
                            <div
                              key={pet.id}
                              onClick={() => {
                                setSelectedAIPetId(pet.id.toString());
                                setNewEntry(prev => ({
                                  ...prev,
                                  petName: pet.name,
                                  petId: pet.id.toString()
                                }));
                              }}
                              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                selectedAIPetId === pet.id.toString()
                                  ? 'border-primary bg-primary/10'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                              }`}
                            >
                              <Avatar className="h-10 w-10">
                                <AvatarImage 
                                  src={`https://api.dicebear.com/7.x/big-ears-neutral/svg?seed=${pet.name}`}
                                  alt={pet.name}
                                />
                                <AvatarFallback>
                                  <PawPrint className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="font-medium">{pet.name}</div>
                                <div className="text-xs text-gray-500">
                                  {pet.breed || '품종 미등록'} · {pet.age ? `${pet.age}세` : '나이 미등록'}
                                </div>
                              </div>
                              {selectedAIPetId === pet.id.toString() && (
                                <div className="text-primary">✓</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <Button 
                      onClick={handleAIGenerate} 
                      disabled={loading || !selectedAIPetId} 
                      className="w-full"
                    >
                      {loading ? '생성 중...' : 'AI로 내용 생성'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isNewEntryOpen} onOpenChange={setIsNewEntryOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    새 알림장 작성
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-gray-200">
                        <AvatarImage 
                          src={`https://api.dicebear.com/7.x/big-ears-neutral/svg?seed=${newEntry.petName || 'pet'}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&eyesColor=2563eb,7c3aed,dc2626,059669,ea580c&mouthColor=2563eb,7c3aed,dc2626,059669`} 
                          alt={newEntry.petName || '반려동물'}
                        />
                        <AvatarFallback className="bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-foreground">
                          <PawPrint className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h2 className="text-xl font-bold">새 알림장 작성</h2>
                        <p className="text-sm text-gray-600">{newEntry.petName || '반려동물'}의 일일 기록</p>
                      </div>
                    </DialogTitle>
                  </DialogHeader>

                  {/* Debug Console Logging */}
                  {(() => { console.log('🚀 Dialog rendering with activeTab:', activeTab); return null; })()}

                  {/* Tab Navigation - Custom Implementation */}
                  <div className="mb-4 p-4 bg-yellow-200 border-4 border-red-500 rounded-lg">
                    <div className="text-lg text-red-700 font-bold mb-2 text-center">🔥 TAB NAVIGATION SYSTEM 🔥</div>
                    <div className="text-sm text-black font-medium mb-2 text-center">현재 활성 탭: {activeTab}</div>
                    <div className="flex space-x-1 bg-gradient-to-r from-primary/10 to-primary/5 p-2 rounded-lg border-2 border-primary shadow-lg"
                         data-tab-system="custom-v2">
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
                  {activeTab === 'basic' && (
                    <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">반려동물 이름 *</label>
                      <Input
                        value={newEntry.petName}
                        onChange={(e) => setNewEntry(prev => ({ ...prev, petName: e.target.value }))}
                        placeholder="반려동물 이름을 입력하세요"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">훈련사 이름</label>
                      <Input
                        value={newEntry.trainerName}
                        onChange={(e) => setNewEntry(prev => ({ ...prev, trainerName: e.target.value }))}
                        placeholder="훈련사 이름을 입력하세요"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">제목 *</label>
                    <Input
                      value={newEntry.title}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="알림장 제목을 입력하세요"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">내용 *</label>
                    <Textarea
                      value={newEntry.content}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="오늘의 훈련 내용과 반려동물의 상태를 자세히 기록해주세요"
                      rows={6}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">기분 상태</label>
                      <Select value={newEntry.mood} onValueChange={(value: NotebookEntry['mood']) => 
                        setNewEntry(prev => ({ ...prev, mood: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(moodLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {moodEmojis[key as keyof typeof moodEmojis]} {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">훈련 시간 (분)</label>
                      <Input
                        type="number"
                        value={newEntry.duration}
                        onChange={(e) => setNewEntry(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                        placeholder="60"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">장소</label>
                      <Input
                        value={newEntry.location}
                        onChange={(e) => setNewEntry(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="훈련 장소"
                      />
                    </div>
                  </div>
                    </div>
                  )}

                  {activeTab === 'activities' && (
                    <div className="space-y-4">
                  <div className="space-y-6">
                    <div className="bg-primary/10 dark:bg-primary/20 p-4 rounded-lg mb-4">
                      <h2 className="text-lg font-semibold text-primary dark:text-primary-foreground mb-2">📊 상세 활동 추적 시스템</h2>
                      <p className="text-sm text-primary dark:text-gray-300">반려동물의 일일 활동을 체계적으로 기록하고 관리하세요.</p>
                    </div>

                    {/* 배변 활동 */}
                    <div className="p-4 border rounded-lg">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                          🚽
                        </div>
                        배변 활동
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">소변 횟수</label>
                          <Select value={newEntry.activities.bathroom?.urination || '0'} onValueChange={(value) => setNewEntry(prev => ({
                            ...prev,
                            activities: {
                              ...prev.activities,
                              bathroom: { ...prev.activities.bathroom, urination: value }
                            }
                          }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="횟수 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                <SelectItem key={num} value={num.toString()}>{num}회</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">대변 횟수</label>
                          <Select value={newEntry.activities.bathroom?.defecation || '0'} onValueChange={(value) => setNewEntry(prev => ({
                            ...prev,
                            activities: {
                              ...prev.activities,
                              bathroom: { ...prev.activities.bathroom, defecation: value }
                            }
                          }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="횟수 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {[0, 1, 2, 3, 4, 5].map(num => (
                                <SelectItem key={num} value={num.toString()}>{num}회</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">배변 상태</label>
                          <Select value={newEntry.activities.bathroom?.condition || 'normal'} onValueChange={(value) => setNewEntry(prev => ({
                            ...prev,
                            activities: {
                              ...prev.activities,
                              bathroom: { ...prev.activities.bathroom, condition: value }
                            }
                          }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="상태 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">정상</SelectItem>
                              <SelectItem value="soft">무른편</SelectItem>
                              <SelectItem value="hard">딱딱함</SelectItem>
                              <SelectItem value="diarrhea">설사</SelectItem>
                              <SelectItem value="constipation">변비</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* 식사 활동 */}
                    <div className="p-4 border rounded-lg">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          🍽️
                        </div>
                        식사 활동
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">식사 횟수</label>
                          <Select value={newEntry.activities.meal?.frequency || '2'} onValueChange={(value) => setNewEntry(prev => ({
                            ...prev,
                            activities: {
                              ...prev.activities,
                              meal: { ...prev.activities.meal, frequency: value }
                            }
                          }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="횟수 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5, 6].map(num => (
                                <SelectItem key={num} value={num.toString()}>{num}회</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">식사량</label>
                          <Select value={newEntry.activities.meal?.amount || 'normal'} onValueChange={(value) => setNewEntry(prev => ({
                            ...prev,
                            activities: {
                              ...prev.activities,
                              meal: { ...prev.activities.meal, amount: value }
                            }
                          }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="양 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">안먹음</SelectItem>
                              <SelectItem value="little">조금</SelectItem>
                              <SelectItem value="normal">보통</SelectItem>
                              <SelectItem value="much">많이</SelectItem>
                              <SelectItem value="all">완식</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">식사 시간</label>
                          <div className="space-y-2">
                            <Input
                              type="time"
                              value={newEntry.activities.meal?.time1 || ''}
                              onChange={(e) => setNewEntry(prev => ({
                                ...prev,
                                activities: {
                                  ...prev.activities,
                                  meal: { ...prev.activities.meal, time1: e.target.value }
                                }
                              }))}
                              placeholder="첫 번째 식사"
                            />
                            <Input
                              type="time"
                              value={newEntry.activities.meal?.time2 || ''}
                              onChange={(e) => setNewEntry(prev => ({
                                ...prev,
                                activities: {
                                  ...prev.activities,
                                  meal: { ...prev.activities.meal, time2: e.target.value }
                                }
                              }))}
                              placeholder="두 번째 식사"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">간식 횟수</label>
                          <Select value={newEntry.activities.meal?.snacks || '0'} onValueChange={(value) => setNewEntry(prev => ({
                            ...prev,
                            activities: {
                              ...prev.activities,
                              meal: { ...prev.activities.meal, snacks: value }
                            }
                          }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="간식 횟수" />
                            </SelectTrigger>
                            <SelectContent>
                              {[0, 1, 2, 3, 4, 5].map(num => (
                                <SelectItem key={num} value={num.toString()}>{num}회</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* 놀이 활동 */}
                    <div className="p-4 border rounded-lg">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          🎾
                        </div>
                        놀이 활동
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">놀이 시간 (분)</label>
                          <Select value={newEntry.activities.play?.duration || '30'} onValueChange={(value) => setNewEntry(prev => ({
                            ...prev,
                            activities: {
                              ...prev.activities,
                              play: { ...prev.activities.play, duration: value }
                            }
                          }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="시간 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0분</SelectItem>
                              <SelectItem value="15">15분</SelectItem>
                              <SelectItem value="30">30분</SelectItem>
                              <SelectItem value="60">1시간</SelectItem>
                              <SelectItem value="90">1시간 30분</SelectItem>
                              <SelectItem value="120">2시간</SelectItem>
                              <SelectItem value="180">3시간 이상</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">놀이 종류</label>
                          <Select value={newEntry.activities.play?.type || 'fetch'} onValueChange={(value) => setNewEntry(prev => ({
                            ...prev,
                            activities: {
                              ...prev.activities,
                              play: { ...prev.activities.play, type: value }
                            }
                          }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="놀이 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fetch">공 던지기</SelectItem>
                              <SelectItem value="tugwar">줄다리기</SelectItem>
                              <SelectItem value="running">달리기</SelectItem>
                              <SelectItem value="walking">산책</SelectItem>
                              <SelectItem value="swimming">수영</SelectItem>
                              <SelectItem value="puzzle">퍼즐게임</SelectItem>
                              <SelectItem value="social">사회화놀이</SelectItem>
                              <SelectItem value="other">기타</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">활동 강도</label>
                          <Select value={newEntry.activities.play?.intensity || 'medium'} onValueChange={(value) => setNewEntry(prev => ({
                            ...prev,
                            activities: {
                              ...prev.activities,
                              play: { ...prev.activities.play, intensity: value }
                            }
                          }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="강도 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">낮음</SelectItem>
                              <SelectItem value="medium">보통</SelectItem>
                              <SelectItem value="high">높음</SelectItem>
                              <SelectItem value="very-high">매우 높음</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* 건강 체크 */}
                    <div className="p-4 border rounded-lg">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          🏥
                        </div>
                        건강 체크
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">체중 (kg)</label>
                          <Input
                            type="number"
                            step="0.1"
                            value={newEntry.activities.health?.weight || ''}
                            onChange={(e) => setNewEntry(prev => ({
                              ...prev,
                              activities: {
                                ...prev.activities,
                                health: { ...prev.activities.health, weight: e.target.value }
                              }
                            }))}
                            placeholder="예: 25.5"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">체온 (°C)</label>
                          <Input
                            type="number"
                            step="0.1"
                            value={newEntry.activities.health?.temperature || ''}
                            onChange={(e) => setNewEntry(prev => ({
                              ...prev,
                              activities: {
                                ...prev.activities,
                                health: { ...prev.activities.health, temperature: e.target.value }
                              }
                            }))}
                            placeholder="예: 38.5"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">수분 섭취</label>
                          <Select value={newEntry.activities.health?.water || 'normal'} onValueChange={(value) => setNewEntry(prev => ({
                            ...prev,
                            activities: {
                              ...prev.activities,
                              health: { ...prev.activities.health, water: value }
                            }
                          }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="수분 섭취량" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">안마심</SelectItem>
                              <SelectItem value="little">조금</SelectItem>
                              <SelectItem value="normal">보통</SelectItem>
                              <SelectItem value="much">많이</SelectItem>
                              <SelectItem value="excessive">과도하게</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">특이사항</label>
                          <Select value={newEntry.activities.health?.special || 'none'} onValueChange={(value) => setNewEntry(prev => ({
                            ...prev,
                            activities: {
                              ...prev.activities,
                              health: { ...prev.activities.health, special: value }
                            }
                          }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="특이사항" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">없음</SelectItem>
                              <SelectItem value="cough">기침</SelectItem>
                              <SelectItem value="vomit">구토</SelectItem>
                              <SelectItem value="diarrhea">설사</SelectItem>
                              <SelectItem value="lethargy">기력저하</SelectItem>
                              <SelectItem value="loss-appetite">식욕부진</SelectItem>
                              <SelectItem value="other">기타</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* 훈련 활동 */}
                    <div className="p-4 border rounded-lg">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          🎓
                        </div>
                        훈련 활동
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">훈련 종류</label>
                          <Select value={newEntry.activities.training?.type || 'basic'} onValueChange={(value) => setNewEntry(prev => ({
                            ...prev,
                            activities: {
                              ...prev.activities,
                              training: { ...prev.activities.training, type: value }
                            }
                          }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="훈련 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="basic">기본명령</SelectItem>
                              <SelectItem value="obedience">복종훈련</SelectItem>
                              <SelectItem value="socialization">사회화</SelectItem>
                              <SelectItem value="behavior">행동교정</SelectItem>
                              <SelectItem value="agility">민첩성</SelectItem>
                              <SelectItem value="trick">트릭</SelectItem>
                              <SelectItem value="other">기타</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">집중도</label>
                          <Select value={newEntry.activities.training?.focus || 'medium'} onValueChange={(value) => setNewEntry(prev => ({
                            ...prev,
                            activities: {
                              ...prev.activities,
                              training: { ...prev.activities.training, focus: value }
                            }
                          }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="집중도" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">낮음</SelectItem>
                              <SelectItem value="medium">보통</SelectItem>
                              <SelectItem value="high">높음</SelectItem>
                              <SelectItem value="excellent">탁월</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">성과</label>
                          <Select value={newEntry.activities.training?.achievement || 'medium'} onValueChange={(value) => setNewEntry(prev => ({
                            ...prev,
                            activities: {
                              ...prev.activities,
                              training: { ...prev.activities.training, achievement: value }
                            }
                          }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="성과" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="poor">미흡</SelectItem>
                              <SelectItem value="fair">보통</SelectItem>
                              <SelectItem value="good">좋음</SelectItem>
                              <SelectItem value="excellent">우수</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* 특별 노트 */}
                    <div className="p-4 border rounded-lg">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                          📝
                        </div>
                        특별 노트
                      </h3>
                      <Textarea
                        value={newEntry.notes}
                        onChange={(e) => setNewEntry(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="특별히 기록하고 싶은 내용이나 다음 세션을 위한 메모를 작성하세요"
                        rows={4}
                        className="w-full"
                      />
                    </div>
                  </div>
                    </div>
                  )}

                  {activeTab === 'media' && (
                    <div className="space-y-4">
                  <div className="space-y-6">
                    {/* 이미지 업로드 섹션 */}
                    <div>
                      <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        사진 업로드
                      </label>
                      <div 
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
                          if (files.length > 0) {
                            const event = { target: { files } } as any;
                            handleImageUpload(event);
                          }
                        }}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                        />
                        <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center justify-center">
                          {uploadingImages ? (
                            <>
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                              <span className="text-sm text-primary font-medium">이미지 업로드 중...</span>
                            </>
                          ) : (
                            <>
                              <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                              <span className="text-sm text-gray-600 font-medium">클릭하여 사진 선택하거나 드래그하여 업로드</span>
                              <span className="text-xs text-gray-500 mt-1">JPG, PNG 등 (최대 10MB, 여러 파일 가능)</span>
                            </>
                          )}
                        </label>
                      </div>
                      {/* 업로드된 이미지 미리보기 */}
                      {newEntry.photos.length > 0 && (
                        <div className="grid grid-cols-3 gap-3 mt-4">
                          {newEntry.photos.map((photo, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={photo}
                                alt={`Photo ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border shadow-sm"
                              />
                              <button
                                type="button"
                                onClick={() => removePhoto(index)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 동영상 업로드 섹션 */}
                    <div>
                      <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        동영상 업로드
                      </label>
                      <div 
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('video/'));
                          if (files.length > 0) {
                            const event = { target: { files } } as any;
                            handleVideoUpload(event);
                          }
                        }}
                      >
                        <input
                          type="file"
                          accept="video/*"
                          multiple
                          onChange={handleVideoUpload}
                          className="hidden"
                          id="video-upload"
                        />
                        <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center justify-center">
                          {uploadingVideos ? (
                            <>
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                              <span className="text-sm text-primary font-medium">동영상 업로드 중...</span>
                            </>
                          ) : (
                            <>
                              <Video className="h-8 w-8 text-gray-400 mb-2" />
                              <span className="text-sm text-gray-600 font-medium">클릭하여 동영상 선택하거나 드래그하여 업로드</span>
                              <span className="text-xs text-gray-500 mt-1">MP4, AVI, MOV 등 (최대 50MB, 여러 파일 가능)</span>
                            </>
                          )}
                        </label>
                      </div>
                      {/* 업로드된 동영상 미리보기 */}
                      {newEntry.videos.length > 0 && (
                        <div className="space-y-3 mt-4">
                          {newEntry.videos.map((video, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center">
                                  <Video className="h-6 w-6 text-primary dark:text-primary-foreground" />
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-gray-700">동영상 {index + 1}</span>
                                  <p className="text-xs text-gray-500 mt-1">업로드 완료</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeVideo(index)}
                                className="text-red-500 hover:text-red-700 text-sm font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                              >
                                삭제
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 미디어 업로드 도움말 */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">미디어 업로드 팁</h4>
                      <ul className="text-xs text-blue-800 space-y-1">
                        <li>• 여러 파일을 한 번에 선택하거나 드래그하여 업로드할 수 있습니다</li>
                        <li>• 이미지는 JPG, PNG 형식을 권장합니다 (최대 10MB)</li>
                        <li>• 동영상은 MP4, AVI, MOV 형식을 권장합니다 (최대 50MB)</li>
                        <li>• 업로드된 파일은 언제든지 삭제할 수 있습니다</li>
                      </ul>
                    </div>
                  </div>
                    </div>
                  )}

                  {activeTab === 'ai' && (
                    <div className="space-y-4">
                  <div className="text-center p-8 border border-primary rounded-lg bg-primary/10 dark:bg-primary/20">
                    <Sparkles className="h-12 w-12 text-primary dark:text-primary-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">AI 알림장 도우미</h3>
                    <p className="text-gray-600 mb-4">
                      AI가 반려동물 정보를 바탕으로 알림장 내용을 자동 생성해드립니다.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                      {templates.map(template => (
                        <Card 
                          key={template.id} 
                          className={`cursor-pointer transition-colors ${selectedTemplate === template.id ? 'border-blue-500 bg-blue-50' : ''}`}
                          onClick={() => applyTemplate(template.id)}
                        >
                          <CardContent className="p-3 text-center">
                            <h4 className="font-medium text-sm">{template.name}</h4>
                            <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Button onClick={handleAIGenerate} disabled={loading}>
                      {loading ? '생성 중...' : 'AI로 내용 생성'}
                    </Button>
                  </div>
                    </div>
                  )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsNewEntryOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleSaveEntry} disabled={loading}>
                  {loading ? '저장 중...' : '저장'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
            </>
          )}
          
          {!canCreateNotebook && (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
              <Eye className="h-4 w-4" />
              읽기 전용 모드
            </div>
          )}
        </div>
      </div>

      {/* 필터 및 검색 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* 첫 번째 줄: 검색 및 기본 필터 */}
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="제목, 내용, 반려동물 이름으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2 items-center">
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-read"
                    checked={showRead}
                    onCheckedChange={setShowRead}
                  />
                  <label htmlFor="show-read" className="text-sm">읽음</label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="show-unread"
                    checked={showUnread}
                    onCheckedChange={setShowUnread}
                  />
                  <label htmlFor="show-unread" className="text-sm">안읽음</label>
                </div>

                <Select value={selectedPet} onValueChange={setSelectedPet}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="반려동물" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 반려동물</SelectItem>
                    <SelectItem value="pet1">멍멍이</SelectItem>
                    <SelectItem value="pet2">야옹이</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedTrainer} onValueChange={setSelectedTrainer}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="훈련사" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 훈련사</SelectItem>
                    <SelectItem value="trainer1">김민수</SelectItem>
                    <SelectItem value="trainer2">이영희</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value: 'date' | 'pet' | 'trainer') => setSortBy(value)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">날짜순</SelectItem>
                    <SelectItem value="pet">반려동물순</SelectItem>
                    <SelectItem value="trainer">훈련사순</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 두 번째 줄: 날짜 필터 */}
            <div className="flex flex-col sm:flex-row gap-4 items-center border-t pt-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">날짜 필터:</span>
              </div>

              <div className="flex gap-2 items-center">
                <Button
                  variant={dateFilterMode === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateFilterMode('all')}
                >
                  전체 <Badge variant="secondary" className="ml-1">{entries.length}</Badge>
                </Button>
                <Button
                  variant={dateFilterMode === 'today' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateFilterMode('today')}
                >
                  오늘 <Badge variant="secondary" className="ml-1">{getDateStats.today}</Badge>
                </Button>
                <Button
                  variant={dateFilterMode === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateFilterMode('week')}
                >
                  이번 주 <Badge variant="secondary" className="ml-1">{getDateStats.week}</Badge>
                </Button>
                <Button
                  variant={dateFilterMode === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateFilterMode('month')}
                >
                  이번 달 <Badge variant="secondary" className="ml-1">{getDateStats.month}</Badge>
                </Button>
                <Button
                  variant={dateFilterMode === 'custom' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowCalendar(true)}
                >
                  날짜 선택
                  {dateFilterMode === 'custom' && selectedCalendarDate && (
                    <Badge variant="secondary" className="ml-1">{getDateStats.selectedDate}</Badge>
                  )}
                </Button>
              </div>

              {/* 선택된 날짜 표시 */}
              {dateFilterMode === 'custom' && selectedCalendarDate && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>선택된 날짜:</span>
                  <Badge variant="outline">
                    {format(selectedCalendarDate, 'yyyy년 MM월 dd일', { locale: ko })}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCalendarDate(undefined);
                      setDateFilterMode('all');
                    }}
                  >
                    ×
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 캘린더 다이얼로그 */}
      <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>날짜 선택</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedCalendarDate}
              onSelect={(date) => {
                setSelectedCalendarDate(date);
                setDateFilterMode('custom');
                setShowCalendar(false);
              }}
              locale={ko}
              className="rounded-md border"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* 결과 상태 표시 */}
      {filteredEntries.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">
              {dateFilterMode === 'all' 
                ? `전체 ${filteredEntries.length}개의 알림장` 
                : `${dateFilterMode === 'today' ? '오늘' : 
                     dateFilterMode === 'week' ? '이번 주' : 
                     dateFilterMode === 'month' ? '이번 달' : 
                     '선택된 날짜'} ${filteredEntries.length}개의 알림장`
              }
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>읽지 않음: {filteredEntries.filter(e => !e.isRead).length}개</span>
            <span>미디어 포함: {filteredEntries.filter(e => e.photos.length > 0 || e.videos.length > 0).length}개</span>
          </div>
        </div>
      )}

      {/* 알림장 목록 */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">알림장을 불러오는 중...</p>
            </CardContent>
          </Card>
        ) : filteredEntries.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">알림장이 없습니다</h3>
              <p className="text-gray-500 mb-4">
                {canCreateNotebook ? '첫 번째 알림장을 작성해보세요!' : '훈련사가 작성한 알림장이 여기에 표시됩니다.'}
              </p>
              {canCreateNotebook && (
                <Button onClick={() => setIsNewEntryOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  새 알림장 작성
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredEntries.map((entry) => (
            <Card 
              key={entry.id} 
              className={`transition-all hover:shadow-md cursor-pointer ${!entry.isRead ? 'border-blue-200 bg-blue-50/30' : ''}`}
              onClick={() => {
                setSelectedEntry(entry);
                if (!entry.isRead) {
                  markAsRead(entry.id);
                }
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-gray-200">
                      <AvatarImage 
                        src={`https://api.dicebear.com/7.x/big-ears${entry.petId === 'pet1' ? '-neutral' : ''}/svg?seed=${entry.petName}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&eyesColor=2563eb,7c3aed,dc2626,059669,ea580c&mouthColor=2563eb,7c3aed,dc2626,059669`} 
                        alt={entry.petName}
                      />
                      <AvatarFallback className="bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-foreground">
                        <PawPrint className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{entry.title}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <PawPrint className="h-3 w-3" />
                          {entry.petName}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {entry.trainerName}
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {formatEntryDate(entry.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {entry.duration}분
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-xl" title={moodLabels[entry.mood]}>
                      {moodEmojis[entry.mood]}
                    </div>
                    {!entry.isRead && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        새로움
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed line-clamp-3">{entry.content}</p>

                {/* 활동 태그 */}
                {Object.entries(entry.activities).some(([_, activities]) => Array.isArray(activities) && activities.length > 0) && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-600">오늘의 활동</h4>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(entry.activities).map(([category, activities]) =>
                        Array.isArray(activities) ? activities.map((activity, index) => (
                          <Badge key={`${category}-${index}`} variant="outline" className="text-xs">
                            {activity}
                          </Badge>
                        )) : null
                      )}
                    </div>
                  </div>
                )}

                {/* 미디어 미리보기 */}
                {(entry.photos.length > 0 || entry.videos.length > 0) && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-600">첨부 파일</h4>
                    <div className="flex gap-2">
                      {/* 이미지 미리보기 */}
                      {entry.photos.slice(0, 3).map((photo, index) => (
                        <div key={index} className="relative">
                          <img
                            src={photo}
                            alt={`Photo ${index + 1}`}
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          />
                          {entry.photos.length > 3 && index === 2 && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                              <span className="text-white text-xs font-medium">+{entry.photos.length - 3}</span>
                            </div>
                          )}
                        </div>
                      ))}
                      {/* 동영상 미리보기 */}
                      {entry.videos.slice(0, 2).map((video, index) => (
                        <div key={index} className="relative">
                          <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                            <Video className="h-6 w-6 text-gray-400" />
                          </div>
                          {entry.videos.length > 2 && index === 1 && (
                            <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              {entry.videos.length - 2}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 추가 정보 */}
                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                  {entry.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {entry.location}
                    </span>
                  )}
                  {entry.weather && (
                    <span className="flex items-center gap-1">
                      <Sun className="h-3 w-3" />
                      {entry.weather}
                    </span>
                  )}
                  {entry.tags.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {entry.tags.join(', ')}
                    </span>
                  )}
                  {/* 미디어 개수 표시 */}
                  {entry.photos.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Camera className="h-3 w-3" />
                      {entry.photos.length}개 사진
                    </span>
                  )}
                  {entry.videos.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Video className="h-3 w-3" />
                      {entry.videos.length}개 동영상
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 알림장 상세 보기 모달 */}
      {selectedEntry && (
        <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-gray-200">
                  <AvatarImage 
                    src={`https://api.dicebear.com/7.x/big-ears${selectedEntry.petId === 'pet1' ? '-neutral' : ''}/svg?seed=${selectedEntry.petName}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&eyesColor=2563eb,7c3aed,dc2626,059669,ea580c&mouthColor=2563eb,7c3aed,dc2626,059669`} 
                    alt={selectedEntry.petName}
                  />
                  <AvatarFallback className="bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-foreground">
                    <PawPrint className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold">{selectedEntry.title}</h2>
                  <p className="text-sm text-gray-600">{selectedEntry.petName}의 알림장</p>
                </div>
                <div className="text-2xl ml-auto">{moodEmojis[selectedEntry.mood]}</div>
              </DialogTitle>
            </DialogHeader>

            {/* PDF 다운로드 / 공유 링크 */}
            <div className="flex flex-wrap items-center gap-2 -mt-2 mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.open(`/api/notebook/entries/${selectedEntry.id}/pdf`, '_blank');
                }}
                data-testid="button-notebook-download-pdf"
              >
                <Download className="h-4 w-4 mr-1" />
                PDF 다운로드
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const res = await secureRequest(`/api/notebook/entries/${selectedEntry.id}/share-token`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ expiresInHours: 24 }),
                    });
                    const data = await res.json();
                    if (!res.ok || !data?.shareUrl) {
                      throw new Error(data?.error || '공유 링크 생성에 실패했습니다.');
                    }
                    try {
                      await navigator.clipboard.writeText(data.shareUrl);
                      toast({
                        title: '공유 링크가 복사되었습니다',
                        description: `만료: ${new Date(data.expiresAt).toLocaleString('ko-KR')}`,
                      });
                    } catch {
                      window.prompt('공유 링크 (24시간 유효)', data.shareUrl);
                    }
                  } catch (e: any) {
                    toast({
                      title: '오류',
                      description: e?.message || '공유 링크 생성 중 오류가 발생했습니다.',
                      variant: 'destructive',
                    });
                  }
                }}
                data-testid="button-notebook-share"
              >
                <Share className="h-4 w-4 mr-1" />
                공유 링크 발급
              </Button>
            </div>

            <div className="space-y-6">
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm text-gray-600">반려동물:</span>
                  <div className="flex items-center gap-2 font-medium">
                    <PawPrint className="h-4 w-4 text-blue-500" />
                    {selectedEntry.petName}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">훈련사:</span>
                  <p className="font-medium">{selectedEntry.trainerName}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">날짜:</span>
                  <p className="font-medium">{formatEntryDate(selectedEntry.date)}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">훈련 시간:</span>
                  <p className="font-medium">{selectedEntry.duration}분</p>
                </div>
              </div>

              {/* 내용 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">훈련 내용</h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selectedEntry.content}
                </p>
              </div>

              {/* 활동 */}
              {Object.entries(selectedEntry.activities).some(([_, activities]) => Array.isArray(activities) && activities.length > 0) && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">오늘의 활동</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(selectedEntry.activities).map(([category, activities]) => (
                      Array.isArray(activities) && activities.length > 0 && (
                        <div key={category}>
                          <h4 className="font-medium text-gray-600 mb-2 capitalize">{category}</h4>
                          <div className="flex flex-wrap gap-1">
                            {activities.map((activity, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {activity}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* 다음 목표 */}
              {selectedEntry.nextGoals.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">다음 목표</h3>
                  <ul className="space-y-2">
                    {selectedEntry.nextGoals.map((goal, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        {goal}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 미디어 갤러리 */}
              {(selectedEntry.photos.length > 0 || selectedEntry.videos.length > 0) && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">미디어 갤러리</h3>
                  <div className="space-y-4">
                    {/* 이미지 갤러리 */}
                    {selectedEntry.photos.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-600 mb-2">사진 ({selectedEntry.photos.length}장)</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {selectedEntry.photos.map((photo, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={photo}
                                alt={`Photo ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(photo, '_blank')}
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                                <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* 동영상 갤러리 */}
                    {selectedEntry.videos.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-600 mb-2">동영상 ({selectedEntry.videos.length}개)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedEntry.videos.map((video, index) => (
                            <div key={index} className="relative">
                              <video
                                src={video}
                                controls
                                className="w-full h-40 object-cover rounded-lg border border-gray-200"
                                preload="metadata"
                              />
                              <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                                동영상 {index + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 특별 노트 */}
              {selectedEntry.notes && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <h4 className="font-medium text-yellow-800 mb-2">특별 노트</h4>
                  <p className="text-yellow-700">{selectedEntry.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
      </div>
    </div>
  );
}