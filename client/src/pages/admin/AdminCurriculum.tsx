import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { 
  Plus, 
  Video, 
  Edit, 
  Trash2, 
  Upload, 
  Play,
  Clock,
  Users,
  User,
  BookOpen,
  Star,
  CheckCircle,
  FileText,
  Save,
  Eye,
  XCircle,
  AlertCircle,
  Package,
  Send,
  Settings,
  Download,
  Lock,
  Unlock,
  Calendar,
  DollarSign,
  TrendingUp,
  GraduationCap,
  Award,
  ChevronRight,
  ChevronDown,
  ShoppingCart,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import { getCSRFToken } from '@/lib/csrf';

interface CurriculumData {
  id: string;
  title: string;
  description: string;
  trainerId: string;
  trainerName: string;
  trainerEmail?: string;
  trainerPhone?: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  price: number;
  modules: ModuleData[];
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  // 수익 정산 관련 필드
  revenueShare: {
    trainerShare: number; // 훈련사 수익 분배율 (%)
    platformShare: number; // 플랫폼 수익 분배율 (%)
  };
  totalRevenue: number; // 총 수익
  enrollmentCount: number; // 등록 학생 수
  lastSaleDate?: Date; // 마지막 판매일
}

interface ModuleData {
  id: string;
  title: string;
  description: string;
  order: number;
  duration: number;
  objectives: string[];
  content: string;
  detailedContent?: {
    introduction?: string;
    mainTopics?: string[];
    practicalExercises?: string[];
    keyPoints?: string[];
    homework?: string;
    resources?: string[];
    preparation?: string;
    activities?: string[];
  };
  videos: VideoData[];
  isRequired: boolean;
  isFree?: boolean;
  price?: number;
  materials?: string[];  // 준비물 리스트 추가
}

interface VideoData {
  id: string;
  title: string;
  description: string;
  duration: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  uploadedAt: Date;
}

// 영상강의 관련 인터페이스
interface VideoLecture {
  id: string;
  title: string;
  instructor: string;
  description: string;
  totalDuration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  price: number;
  rating: number;
  reviewCount: number;
  studentCount: number;
  modules: LectureModule[];
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

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

// 상품 정보 인터페이스
interface ProductInfo {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  brand: string;
  rating: number;
  reviewCount: number;
  availability: 'in_stock' | 'out_of_stock' | 'pre_order';
  specifications: { [key: string]: string };
}

export default function AdminCurriculum() {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const queryClientInstance = useQueryClient();
  
  // TanStack Query로 커리큘럼 데이터 관리
  const { 
    data: curriculums = [], 
    isLoading: isLoadingCurriculums,
    error: curriculumsError,
    refetch: refetchCurriculums
  } = useQuery({
    queryKey: ['/api/admin/curriculum'],
    staleTime: 1000 * 60 * 2, // 2분간 fresh 상태 유지
    gcTime: 1000 * 60 * 10, // 10분간 캐시 유지
  });

  const [selectedCurriculum, setSelectedCurriculum] = useState<CurriculumData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showAdvancedCreation, setShowAdvancedCreation] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [creationStep, setCreationStep] = useState(1); // 생성 단계 추가
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    duration: 0,
    price: 0,
    trainerName: '',
    trainerEmail: '',
    trainerPhone: ''
  });
  
  const [newCurriculum, setNewCurriculum] = useState({
    title: '',
    description: '',
    category: '',
    difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    duration: 0,
    price: 0,
    trainerName: '',
    trainerId: '',
    trainerEmail: '',
    trainerPhone: '',
    modules: [] as any[] // 추출된 모듈 데이터를 저장하기 위한 속성
  });
  
  // 영상강의 관련 상태
  const [videoLectures, setVideoLectures] = useState<VideoLecture[]>([]);
  const [selectedLecture, setSelectedLecture] = useState<VideoLecture | null>(null);
  const [activeTab, setActiveTab] = useState('curriculum');
  const [previewCurriculum, setPreviewCurriculum] = useState<CurriculumData | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showCreationWizard, setShowCreationWizard] = useState(false);
  const [showProductInfo, setShowProductInfo] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductInfo | null>(null);
  
  // 모듈 수정 관련 상태
  const [isEditingModule, setIsEditingModule] = useState(false);
  const [selectedModuleForEdit, setSelectedModuleForEdit] = useState<any>(null);
  const [newModule, setNewModule] = useState({
    id: '',
    title: '',
    duration: 0,
    description: '',
    objectives: [''],
    materials: [''],
    attachments: [],
    detailedContent: {
      introduction: '',
      mainTopics: [''],
      practicalExercises: [''],
      keyPoints: [''],
      homework: '',
      preparation: '',
      activities: [''],
      resources: ['']
    }
  });

  // 모듈 선택 핸들러
  const handleModuleSelect = (module: any) => {
    setSelectedModuleForEdit(module);
    setIsEditingModule(true);
    setNewModule({
      id: module.id,
      title: module.title,
      duration: module.duration,
      description: module.description,
      objectives: module.objectives || [''],
      materials: module.materials || [''],
      attachments: module.attachments || [],
      detailedContent: module.detailedContent || {
        preparation: '',
        keyPoints: [''],
        activities: [''],
        homework: ''
      }
    });
  };

  // 파일 업로드 핸들러
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    processFiles(files);
  };

  // 파일 처리 함수
  const processFiles = (files: FileList) => {
    const maxFileSize = 100 * 1024 * 1024; // 100MB
    const newAttachments = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (file.size > maxFileSize) {
        toast({
          title: "파일 크기 초과",
          description: `${file.name}이(가) 100MB를 초과합니다.`,
          variant: "destructive",
        });
        continue;
      }

      newAttachments.push({
        name: file.name,
        size: file.size,
        type: file.type,
        file: file,
        id: Date.now() + Math.random() // 임시 ID
      });
    }

    if (newAttachments.length > 0) {
      setNewModule(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...newAttachments]
      }));
      
      toast({
        title: "파일 첨부 완료",
        description: `${newAttachments.length}개의 파일이 첨부되었습니다.`,
      });
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  };

  // 모듈 저장 핸들러
  const handleSaveModule = async () => {
    if (!selectedModuleForEdit || !selectedCurriculum) return;
    
    try {
      const response = await fetch(`/api/admin/curriculums/${selectedCurriculum.id}/modules/${selectedModuleForEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newModule),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // 로컬 데이터 업데이트
          setSelectedCurriculum(prev => {
            if (!prev) return prev;
            const updatedModules = prev.modules.map(module => 
              module.id === selectedModuleForEdit.id ? { ...module, ...newModule } : module
            );
            return { ...prev, modules: updatedModules };
          });
          
          setIsEditingModule(false);
          toast({
            title: "저장 완료",
            description: "강의 내용이 성공적으로 저장되었습니다.",
          });
        } else {
          throw new Error(result.message || '저장 실패');
        }
      } else {
        throw new Error('서버 응답 오류');
      }
    } catch (error) {
      console.error('모듈 저장 실패:', error);
      toast({
        title: "저장 실패",
        description: error.message || "강의 내용 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 준비물 클릭 시 상품 정보 가져오기 함수
  const handleMaterialClick = async (materialName: string) => {
    try {
      // 실제 API 호출 대신 샘플 데이터 사용
      const mockProducts: ProductInfo[] = [
        {
          id: 'product-1',
          name: '강아지 목줄',
          description: '강아지 훈련용 고품질 목줄입니다. 조절 가능한 길이로 다양한 크기의 강아지에 적합합니다.',
          price: 25000,
          imageUrl: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=300&fit=crop',
          category: '훈련용품',
          brand: 'PetTraining Pro',
          rating: 4.8,
          reviewCount: 156,
          availability: 'in_stock',
          specifications: {
            '재질': '나일론',
            '길이': '120cm',
            '너비': '2cm',
            '무게': '150g'
          }
        },
        {
          id: 'product-2',
          name: '간식 파우치',
          description: '훈련용 간식을 보관하고 휴대하기 편한 파우치입니다. 방수 기능이 있어 실용적입니다.',
          price: 15000,
          imageUrl: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&h=300&fit=crop',
          category: '훈련용품',
          brand: 'DogTrainer',
          rating: 4.5,
          reviewCount: 89,
          availability: 'in_stock',
          specifications: {
            '재질': '방수 나일론',
            '크기': '15x10x5cm',
            '용량': '200ml',
            '무게': '80g'
          }
        },
        {
          id: 'product-3',
          name: '클리커',
          description: '강아지 훈련용 클리커입니다. 일정한 소리로 정확한 타이밍에 신호를 줄 수 있습니다.',
          price: 8000,
          imageUrl: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400&h=300&fit=crop',
          category: '훈련용품',
          brand: 'ClickTrain',
          rating: 4.9,
          reviewCount: 234,
          availability: 'in_stock',
          specifications: {
            '재질': '플라스틱',
            '소리': '55dB',
            '크기': '6x4x2cm',
            '무게': '30g'
          }
        }
      ];

      // 준비물 이름과 유사한 상품 찾기
      const product = mockProducts.find(p => 
        materialName.includes(p.name.substring(0, 2)) || 
        p.name.includes(materialName.substring(0, 2))
      ) || mockProducts[0];

      setSelectedProduct(product);
      setShowProductInfo(true);
    } catch (error) {
      console.error('상품 정보 가져오기 오류:', error);
      toast({
        title: "상품 정보 오류",
        description: "상품 정보를 가져오는 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  // 양식 다운로드 함수
  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/admin/curriculum/template/download');
      
      if (!response.ok) {
        throw new Error('양식 다운로드에 실패했습니다.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'TALEZ_커리큘럼_작성양식.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "양식 다운로드 완료",
        description: "표준 커리큘럼 작성 양식이 다운로드되었습니다.",
      });
    } catch (error) {
      console.error('양식 다운로드 오류:', error);
      toast({
        title: "다운로드 실패",
        description: "양식 다운로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 모듈 가격 설정 Mutation
  const updateModulePriceMutation = useMutation({
    mutationFn: async ({ curriculumId, moduleId, isFree, price }: {
      curriculumId: string;
      moduleId: string;
      isFree: boolean;
      price: number;
    }) => {
      return await apiRequest('PUT', `/api/admin/curriculum/${curriculumId}/modules/${moduleId}/price`, {
        isFree,
        price: isFree ? 0 : price
      });
    },
    onSuccess: (_, variables) => {
      // 캐시 업데이트
      queryClientInstance.setQueryData(['/api/admin/curriculum'], (oldData: CurriculumData[] = []) => {
        return oldData.map(curriculum => {
          if (curriculum.id === variables.curriculumId) {
            return {
              ...curriculum,
              modules: curriculum.modules.map(module => {
                if (module.id === variables.moduleId) {
                  return {
                    ...module,
                    isFree: variables.isFree,
                    price: variables.isFree ? 0 : variables.price
                  };
                }
                return module;
              })
            };
          }
          return curriculum;
        });
      });
      
      toast({
        title: "가격 설정 완료",
        description: `모듈이 ${variables.isFree ? '무료' : `${variables.price.toLocaleString()}원`}로 설정되었습니다.`,
      });
    }
  });

  const handleModulePriceUpdate = (curriculumId: string, moduleId: string, isFree: boolean, price: number = 0) => {
    updateModulePriceMutation.mutate({ curriculumId, moduleId, isFree, price });
  };

  // 쉬운 커리큘럼 생성을 위한 마법사 함수들
  const resetCreationForm = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      difficulty: 'beginner',
      duration: 0,
      price: 0,
      trainerName: '',
      trainerEmail: '',
      trainerPhone: ''
    });
    setCreationStep(1);
  };

  // 새 커리큘럼 상태 초기화
  const resetNewCurriculum = () => {
    setNewCurriculum({
      title: '',
      description: '',
      category: '',
      difficulty: 'beginner',
      duration: 0,
      price: 0,
      trainerName: '',
      trainerId: '',
      trainerEmail: '',
      trainerPhone: '',
      modules: []
    });
  };

  const handleStartCreation = () => {
    resetCreationForm();
    setShowCreationWizard(true);
  };

  const handleNextStep = () => {
    if (!validateCurrentStep()) {
      const errorMessage = getStepValidationMessage(creationStep);
      toast({
        title: "입력값 확인 필요",
        description: errorMessage,
        variant: "destructive"
      });
      return;
    }
    
    if (creationStep < 3) {
      setCreationStep(creationStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (creationStep > 1) {
      setCreationStep(creationStep - 1);
    }
  };

  const validateCurrentStep = () => {
    switch (creationStep) {
      case 1:
        return formData.title.trim() && formData.description.trim() && formData.category.trim();
      case 2:
        return formData.difficulty && formData.duration > 0 && formData.price >= 0;
      case 3:
        return formData.trainerName.trim() && formData.trainerEmail.trim();
      default:
        return false;
    }
  };

  const getStepValidationMessage = (step: number): string => {
    switch (step) {
      case 1:
        const step1Errors = [];
        if (!formData.title.trim()) step1Errors.push("커리큘럼 제목");
        if (!formData.description.trim()) step1Errors.push("커리큘럼 설명");
        if (!formData.category.trim()) step1Errors.push("카테고리");
        return step1Errors.length > 0 ? `다음 항목을 입력해주세요: ${step1Errors.join(", ")}` : "";
      
      case 2:
        const step2Errors = [];
        if (!formData.difficulty) step2Errors.push("난이도");
        if (formData.duration <= 0) step2Errors.push("총 강의 시간 (0분 이상)");
        if (formData.price < 0) step2Errors.push("수강료 (0원 이상)");
        return step2Errors.length > 0 ? `다음 항목을 확인해주세요: ${step2Errors.join(", ")}` : "";
      
      case 3:
        const step3Errors = [];
        if (!formData.trainerName.trim()) step3Errors.push("강사 이름");
        if (!formData.trainerEmail.trim()) step3Errors.push("강사 이메일");
        return step3Errors.length > 0 ? `다음 항목을 입력해주세요: ${step3Errors.join(", ")}` : "";
      
      default:
        return "";
    }
  };

  const handleFormDataChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 단계별 커리큘럼 생성 (formData 사용)
  const handleCreateCurriculum = async () => {
    // 최종 검증 (모든 단계)
    if (!validateCurrentStep()) {
      const errorMessage = getStepValidationMessage(creationStep);
      toast({
        title: "입력값 확인 필요",
        description: errorMessage,
        variant: "destructive"
      });
      return;
    }

    // 전체 폼 데이터 검증
    const allFieldsValid = 
      formData.title.trim() && 
      formData.description.trim() && 
      formData.category.trim() &&
      formData.difficulty &&
      formData.duration > 0 &&
      formData.price >= 0 &&
      formData.trainerName.trim() &&
      formData.trainerEmail.trim();

    if (!allFieldsValid) {
      toast({
        title: "모든 정보를 입력해주세요",
        description: "커리큘럼 생성을 위해 모든 필수 정보를 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    try {
      const curriculumData = {
        ...formData,
        id: `curriculum-${Date.now()}`,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        modules: [
          {
            id: 'module-1',
            title: '1주차: 기본 소개',
            description: '커리큘럼 기본 내용 소개',
            order: 1,
            duration: 60,
            objectives: ['기본 개념 이해'],
            isRequired: true,
            videos: []
          }
        ]
      };

      // CSRF 토큰 가져오기
      const csrfToken = await getCSRFToken();

      const response = await fetch('/api/admin/curriculums', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken 
        },
        credentials: 'include',
        body: JSON.stringify(curriculumData)
      });

      if (response.ok) {
        const newCurriculum = await response.json();
        // TanStack Query 캐시 업데이트
        queryClientInstance.setQueryData(['/api/admin/curriculum'], (oldData: CurriculumData[] = []) => {
          return [...oldData, newCurriculum];
        });
        setShowCreationWizard(false);
        resetCreationForm();
        toast({
          title: "커리큘럼 생성 완료",
          description: `"${formData.title}" 커리큘럼이 성공적으로 생성되었습니다.`,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || '서버 오류가 발생했습니다.');
      }
    } catch (error: any) {
      console.error('커리큘럼 생성 오류 상세:', {
        error,
        message: error.message,
        stack: error.stack,
        name: error.name,
        formData
      });
      toast({
        title: "생성 실패",
        description: error.message || `커리큘럼 생성 중 오류가 발생했습니다: ${error.toString()}`,
        variant: "destructive"
      });
    }
  };

  // 고급 생성 다이얼로그용 커리큘럼 생성 함수 (newCurriculum 사용)
  const handleAdvancedCreateCurriculum = async () => {
    // 입력값 검증
    if (!newCurriculum.title.trim() || !newCurriculum.description.trim() || !newCurriculum.category.trim()) {
      toast({
        title: "입력값 확인 필요",
        description: "커리큘럼 제목, 설명, 카테고리는 필수 입력 항목입니다.",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('[클라이언트] 커리큘럼 생성 시도 - 모듈 개수:', newCurriculum.modules?.length || 0);
      console.log('[클라이언트] newCurriculum 상태:', JSON.stringify(newCurriculum, null, 2));
      
      const curriculumData = {
        ...newCurriculum,
        id: `curriculum-${Date.now()}`,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        modules: newCurriculum.modules && newCurriculum.modules.length > 0 ? newCurriculum.modules : [
          {
            id: 'module-1',
            title: '1주차: 기본 소개',
            description: '커리큘럼 기본 내용 소개',
            order: 1,
            duration: newCurriculum.duration || 60,
            objectives: ['기본 개념 이해'],
            content: '기본 커리큘럼 내용',
            isRequired: true,
            videos: []
          }
        ]
      };
      
      console.log('[클라이언트] 서버로 전송할 데이터 - 모듈 개수:', curriculumData.modules?.length || 0);

      // CSRF 토큰 가져오기
      const csrfToken = await getCSRFToken();

      const response = await fetch('/api/admin/curriculums', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken 
        },
        credentials: 'include',
        body: JSON.stringify(curriculumData)
      });

      if (response.ok) {
        const createdCurriculum = await response.json();
        // 캐시 무효화로 처리
        queryClientInstance.invalidateQueries({ queryKey: ['/api/admin/curriculum'] });
        setShowAdvancedCreation(false);
        resetNewCurriculum();
        toast({
          title: "커리큘럼 생성 완료",
          description: `"${newCurriculum.title}" 커리큘럼이 성공적으로 생성되었습니다.`,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || '서버 오류가 발생했습니다.');
      }
    } catch (error: any) {
      console.error('커리큘럼 생성 오류 상세:', {
        error,
        message: error.message,
        stack: error.stack,
        name: error.name,
        formData
      });
      toast({
        title: "생성 실패",
        description: error.message || `커리큘럼 생성 중 오류가 발생했습니다: ${error.toString()}`,
        variant: "destructive"
      });
    }
  };

  // 샘플 데이터는 관련 useEffect와 함께 제거됨 - TanStack Query가 처리

  const handleApproveLecture = async (lectureId: string) => {
    try {
      setVideoLectures(videoLectures.map(lecture => 
        lecture.id === lectureId 
          ? { ...lecture, status: 'approved' as const }
          : lecture
      ));
      toast({
        title: "강의 승인 완료",
        description: "영상강의가 승인되어 공개되었습니다.",
      });
    } catch (error) {
      toast({
        title: "승인 실패",
        description: "영상강의 승인 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  // 영상강의를 커리큘럼 형태로 변환하여 미리보기
  const handlePreviewVideoLecture = (lecture: VideoLecture) => {
    const curriculumData: CurriculumData = {
      id: lecture.id,
      title: lecture.title,
      description: lecture.description,
      trainerId: 'video-lecture-trainer',
      trainerName: lecture.instructor,
      category: lecture.category,
      difficulty: lecture.difficulty,
      duration: lecture.totalDuration,
      price: lecture.price,
      modules: lecture.modules.map(module => ({
        id: module.id,
        title: module.title,
        description: module.description,
        order: module.order,
        duration: module.duration,
        objectives: module.objectives,
        content: module.materials.join('\n'),
        videos: [],
        isRequired: !module.isFree
      })),
      status: lecture.status === 'approved' ? 'published' : 'draft',
      createdAt: lecture.createdAt,
      updatedAt: lecture.updatedAt,
      // 누락된 필드 추가
      revenueShare: {
        trainerShare: 70,
        platformShare: 30
      },
      totalRevenue: 0,
      enrollmentCount: 0,
      lastSaleDate: undefined
    };

    setPreviewCurriculum(curriculumData);
    setShowPreviewModal(true);
  };

  const handleRejectLecture = async (lectureId: string) => {
    try {
      setVideoLectures(videoLectures.map(lecture => 
        lecture.id === lectureId 
          ? { ...lecture, status: 'rejected' as const }
          : lecture
      ));
      toast({
        title: "강의 반려 완료",
        description: "영상강의가 반려되었습니다.",
      });
    } catch (error) {
      toast({
        title: "반려 실패",
        description: "영상강의 반려 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteLecture = async (lectureId: string) => {
    if (!confirm('정말로 이 영상강의를 삭제하시겠습니까?')) return;

    try {
      setVideoLectures(videoLectures.filter(lecture => lecture.id !== lectureId));
      toast({
        title: "강의 삭제 완료",
        description: "영상강의가 성공적으로 삭제되었습니다.",
      });
    } catch (error) {
      toast({
        title: "삭제 실패",
        description: "영상강의 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  // 미리 정의된 실제 커리큘럼 템플릿 (첨부 파일 기반)
  const realCurriculumTemplates = [
    {
      id: 'template-basic-obedience',
      title: "기초 복종훈련 완전정복",
      description: "반려견의 기본적인 복종훈련부터 고급 명령어까지 체계적으로 학습하는 종합 과정입니다.",
      trainerId: 'trainer-hanseongkyu',
      trainerName: '한성규',
      trainerEmail: 'hanseongkyu@talez.co.kr',
      trainerPhone: '010-1234-5678',
      category: "기초훈련",
      difficulty: "beginner" as const,
      duration: 480, // 8시간
      price: 180000,
      status: 'draft' as const,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date(),
      revenueShare: {
        trainerShare: 70, // 훈련사 70%
        platformShare: 30  // 플랫폼 30%
      },
      totalRevenue: 450000, // 실제 수익 예시
      enrollmentCount: 25,   // 등록 학생 수
      lastSaleDate: new Date('2025-01-05'),
      modules: [
        {
          title: "1주차: 기본자세와 친화관계 형성",
          description: "훈련사와 반려견의 첫 만남, 기본적인 신뢰관계 구축",
          duration: 60,
          objectives: [
            "반려견과의 신뢰관계 형성",
            "기본적인 터치 훈련",
            "이름 부르기 반응 훈련"
          ],
          content: `
# 1주차: 기본자세와 친화관계 형성

## 목표
- 반려견과 훈련사 간의 신뢰관계 구축
- 기본적인 접촉과 소통 방법 익히기
- 이름을 부르면 반응하는 훈련

## 세부 커리큘럼

### 1. 첫 만남과 관계형성 (15분)
- 반려견의 성격과 특성 파악
- 긴장감 해소를 위한 자연스러운 접근
- 간식을 통한 긍정적 인상 만들기

### 2. 기본 터치 훈련 (20분)
- 목, 등, 가슴 등 편안한 부위부터 시작
- 점진적으로 발, 귀, 입 주변 터치
- 터치와 동시에 보상 제공

### 3. 이름 부르기 훈련 (25분)
- 조용한 환경에서 이름 부르기
- 반응 시 즉시 보상
- 점차 산만한 환경에서도 반응하도록 연습
          `,
          isRequired: true
        },
        {
          title: "2주차: 앉아, 엎드려 기본 명령어",
          description: "가장 기본이 되는 앉아와 엎드려 명령어를 완벽하게 마스터",
          duration: 60,
          objectives: [
            "앉아 명령어 완전 숙지",
            "엎드려 명령어 습득",
            "명령어와 손신호 연결"
          ],
          content: `
# 2주차: 앉아, 엎드려 기본 명령어

## 목표
- '앉아' 명령어 100% 성공률 달성
- '엎드려' 명령어 기본 습득
- 음성 명령과 손신호 동시 학습

## 세부 커리큘럼

### 1. 앉아 명령어 완성 (25분)
- 간식을 이용한 유도 방법
- 명령어와 동작의 정확한 타이밍
- 보상의 적절한 시점과 방법
- 다양한 장소에서의 반복 연습

### 2. 엎드려 명령어 도입 (25분)
- 앉은 자세에서 엎드려로 유도
- 점진적인 손신호 도입
- 자세 유지 시간 점차 증가

### 3. 명령어 복합 연습 (10분)
- 앉아 → 엎드려 연속 명령
- 다양한 환경에서의 적용 연습
          `,
          isRequired: true
        },
        {
          title: "3주차: 기다려와 이리와 명령어",
          description: "안전을 위한 필수 명령어인 기다려와 이리와를 집중 훈련",
          duration: 60,
          objectives: [
            "기다려 명령어로 충동 억제",
            "이리와 명령어로 리콜 훈련",
            "긴급상황 대응 능력 개발"
          ],
          content: `
# 3주차: 기다려와 이리와 명령어

## 목표
- 위험 상황에서의 정지 능력 개발
- 확실한 리콜(부름에 오기) 훈련
- 충동 억제 능력 향상

## 세부 커리큘럼

### 1. 기다려 명령어 훈련 (30분)
- 짧은 시간부터 점차 연장
- 다양한 유혹 상황에서의 기다리기
- 허용 신호까지 완벽한 대기

### 2. 이리와 명령어 훈련 (25분)
- 실내에서의 기본 리콜 훈련
- 긴 리드줄을 이용한 안전한 야외 연습
- 높은 보상가치 간식 활용

### 3. 실전 응용 연습 (5분)
- 산책 중 갑작스러운 상황 대응
- 다른 개나 사람 만날 때의 제어
          `,
          isRequired: true
        }
      ]
    },
    {
      id: 'template-behavior-correction',
      title: "문제행동 교정 전문과정",
      description: "짖음, 물기, 분리불안 등 다양한 문제행동을 체계적으로 교정하는 전문 과정입니다.",
      trainerId: 'trainer-hanseongkyu',
      trainerName: '한성규',
      trainerEmail: 'hanseongkyu@talez.co.kr',
      trainerPhone: '010-1234-5678',
      category: "문제행동교정",
      difficulty: "intermediate" as const,
      duration: 600, // 10시간
      price: 300000,
      status: 'draft' as const,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date(),
      revenueShare: {
        trainerShare: 75, // 전문과정이므로 높은 수익 분배
        platformShare: 25
      },
      totalRevenue: 1800000, // 높은 수익
      enrollmentCount: 60,
      lastSaleDate: new Date('2025-01-06'),
      modules: [
        {
          title: "1단계: 문제행동 원인 분석",
          description: "반려견의 문제행동 근본 원인을 파악하고 맞춤형 교정 계획 수립",
          duration: 90,
          objectives: [
            "문제행동의 정확한 원인 분석",
            "개별 맞춤형 교정 계획 수립",
            "보호자 교육과 역할 이해"
          ],
          content: `
# 1단계: 문제행동 원인 분석

## 목표
- 문제행동의 근본 원인 정확한 파악
- 개체별 특성을 고려한 맞춤형 접근
- 보호자의 역할과 책임 이해

## 세부 분석 과정

### 1. 행동 관찰 및 기록 (30분)
- 문제행동 발생 패턴 분석
- 트리거(방아쇠) 상황 파악
- 행동 전후 환경 요인 조사

### 2. 개체 특성 평가 (30분)
- 성격, 기질, 사회화 정도 평가
- 스트레스 요인 및 두려움 대상 파악
- 학습 능력 및 집중력 테스트

### 3. 교정 계획 수립 (30분)
- 단계별 교정 로드맵 작성
- 목표 설정 및 성공 지표 정의
- 보호자 교육 내용 및 방법 결정
          `,
          isRequired: true
        },
        {
          title: "2단계: 과도한 짖음 교정",
          description: "경계, 요구, 스트레스성 짖음 등 원인별 맞춤 교정법 적용",
          duration: 120,
          objectives: [
            "짖음 유형별 원인 이해",
            "단계적 짖음 줄이기 훈련",
            "대체 행동 학습"
          ],
          content: `
# 2단계: 과도한 짖음 교정

## 짖음 유형별 분석 및 교정

### 1. 경계성 짖음 교정 (40분)
- 문밖 소리나 외부 자극에 대한 과도한 반응
- 점진적 둔감화 훈련
- '조용히' 명령어 학습
- 적절한 경계 수준 유지 방법

### 2. 요구성 짖음 교정 (40분)
- 관심 끌기, 간식 요구 등의 목적성 짖음
- 무시 기법과 타이밍의 중요성
- 올바른 요구 방법 대체 학습
- 보상 체계 재정립

### 3. 스트레스성 짖음 교정 (40분)
- 분리불안, 환경 변화 등으로 인한 짖음
- 스트레스 요인 제거 및 완화
- 안정감 제공 훈련
- 점진적 적응 훈련
          `,
          isRequired: true
        }
      ]
    }
  ];



  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [selectedModule, setSelectedModule] = useState<ModuleData | null>(null);
  
  // AI 커리큘럼 분석 상태
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);
  const [showAiPreview, setShowAiPreview] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    videoFile: null as File | null
  });

  // 모듈 편집 상태
  const [editingModule, setEditingModule] = useState<ModuleData | null>(null);

  // loadCurriculums 함수 제거됨 - TanStack Query가 처리

  const createFromTemplate = async (template: typeof realCurriculumTemplates[0]) => {
    try {
      const curriculumData = {
        ...template,
        trainerId: '100', // 강동훈 훈련사 ID
        trainerName: '강동훈',
        modules: template.modules.map((module, index) => ({
          ...module,
          id: `module-${Date.now()}-${index}`,
          order: index + 1,
          videos: []
        }))
      };

      // CSRF 토큰 가져오기
      const csrfToken = await getCSRFToken();

      const response = await fetch('/api/admin/curriculums', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken 
        },
        credentials: 'include',
        body: JSON.stringify(curriculumData)
      });

      if (response.ok) {
        const result = await response.json();
        // 캐시 무효화로 처리
        queryClientInstance.invalidateQueries({ queryKey: ['/api/admin/curriculum'] });
        toast({
          title: "성공",
          description: `"${template.title}" 커리큘럼이 생성되었습니다.`,
          variant: "default"
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "커리큘럼 생성에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleCurriculumFileUpload = async (file: File) => {
    if (!file) return;

    // 파일 타입 검증 (HWP는 지원하지 않으므로 제외)
    const allowedTypes = ['.hwpx', '.docx', '.doc', '.txt', '.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(fileExtension)) {
      toast({
        title: "파일 형식 오류",
        description: "지원하는 파일 형식: .hwpx, .docx, .doc, .txt, .xlsx, .xls (HWP 파일은 HWPX 형식으로 저장해주세요)",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setUploadedFile(file);

    try {
      toast({
        title: "AI 분석 시작",
        description: "파일을 분석하여 커리큘럼을 자동 생성 중입니다...",
        variant: "default"
      });

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/ai/curriculum/analyze', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        
        console.log('[AI 커리큘럼] 분석 결과:', result);
        
        // AI 분석 결과 저장
        setAiAnalysisResult(result.data);
        
        // AI 미리보기 모달 표시
        setShowAiPreview(true);

        toast({
          title: "AI 분석 완료",
          description: `AI가 "${result.data.curriculum.title}" 커리큘럼을 생성했습니다. 미리보기에서 확인하고 수정하세요.`,
          variant: "default"
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || '파일 분석 실패');
      }
    } catch (error) {
      console.error('[AI 커리큘럼] 분석 실패:', error);
      toast({
        title: "AI 분석 실패",
        description: `파일 분석 중 오류가 발생했습니다: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 커리큘럼 업데이트 Mutation
  const updateCurriculumMutation = useMutation({
    mutationFn: async (curriculum: CurriculumData) => {
      console.log('[커리큘럼 저장] Mutation 시작 - 커리큘럼 ID:', curriculum.id);
      
      const updateData = {
        ...curriculum,
        updatedAt: new Date().toISOString()
      };
      
      console.log('[커리큘럼 저장] 업데이트 데이터:', updateData);
      
      const response = await apiRequest('PUT', `/api/admin/curriculum/${curriculum.id}`, updateData);
      return response;
    },
    onSuccess: (updatedCurriculum, variables) => {
      console.log('[커리큘럼 저장] 성공 응답:', updatedCurriculum);
      
      // 캐시 무효화 및 업데이트
      queryClientInstance.setQueryData(['/api/admin/curriculum'], (oldData: CurriculumData[] = []) => {
        return oldData.map(c => c.id === variables.id ? updatedCurriculum : c);
      });
      
      // 선택된 커리큘럼도 업데이트
      setSelectedCurriculum(updatedCurriculum as unknown as CurriculumData);
      setIsEditing(false);
      
      toast({
        title: "저장 완료",
        description: `"${variables.title}" 커리큘럼이 성공적으로 저장되었습니다.`,
        variant: "default"
      });
    },
    onError: (error: any) => {
      console.error('[커리큘럼 저장] 오류 발생:', error);
      toast({
        title: "저장 실패",
        description: "커리큘럼 저장에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    }
  });

  const updateCurriculum = (curriculum: CurriculumData) => {
    updateCurriculumMutation.mutate(curriculum);
  };

  // 커리큘럼 삭제 Mutation
  const deleteCurriculumMutation = useMutation({
    mutationFn: async (curriculumId: string) => {
      console.log('[커리큘럼 삭제] Mutation 시작 - ID:', curriculumId);
      return await apiRequest('DELETE', `/api/admin/curriculum/${curriculumId}`);
    },
    onSuccess: (_, curriculumId) => {
      console.log('[커리큘럼 삭제] 성공');
      
      // 캐시에서 해당 커리큘럼 제거
      queryClientInstance.setQueryData(['/api/admin/curriculum'], (oldData: CurriculumData[] = []) => {
        return oldData.filter(c => c.id !== curriculumId);
      });
      
      setSelectedCurriculum(null);
      setIsEditing(false);
      
      toast({
        title: "삭제 완료",
        description: "커리큘럼이 성공적으로 삭제되었습니다.",
        variant: "default"
      });
    },
    onError: (error: any) => {
      console.error('[커리큘럼 삭제] 오류:', error);
      toast({
        title: "삭제 실패",
        description: "커리큘럼 삭제에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    }
  });

  const deleteCurriculum = (curriculumId: string) => {
    if (!confirm('정말로 이 커리큘럼을 삭제하시겠습니까?')) {
      return;
    }
    deleteCurriculumMutation.mutate(curriculumId);
  };

  // 영상 업로드 함수
  const uploadVideoToModule = async (moduleId: string) => {
    console.log('[영상 업로드 클라이언트] 시작 - moduleId:', moduleId);
    console.log('[영상 업로드 클라이언트] selectedCurriculum:', selectedCurriculum?.id);
    console.log('[영상 업로드 클라이언트] newVideo 상태:', {
      hasVideoFile: !!newVideo.videoFile,
      title: newVideo.title,
      description: newVideo.description,
      videoFileName: newVideo.videoFile?.name,
      videoFileSize: newVideo.videoFile?.size
    });

    if (!newVideo.videoFile || !newVideo.title.trim()) {
      toast({
        title: "입력 오류",
        description: "영상 파일과 제목을 모두 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedCurriculum?.id) {
      toast({
        title: "오류",
        description: "커리큘럼 정보가 없습니다.",
        variant: "destructive"
      });
      return;
    }

    try {
      setVideoUploadProgress(0);
      const formData = new FormData();
      formData.append('video', newVideo.videoFile);
      formData.append('title', newVideo.title);
      formData.append('description', newVideo.description);
      formData.append('moduleId', moduleId);
      formData.append('curriculumId', selectedCurriculum.id.toString());

      console.log('[영상 업로드 클라이언트] FormData 생성 완료, API 호출 시작');

      const response = await fetch('/api/admin/curriculum/videos/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      console.log('[영상 업로드 클라이언트] API 응답 상태:', response.status);
      
      if (response.ok) {
        const videoData = await response.json();
        console.log('[영상 업로드 클라이언트] 성공 응답 데이터:', videoData);
        
        // 커리큘럼 상태 업데이트
        if (selectedCurriculum) {
          const updatedCurriculum = {
            ...selectedCurriculum,
            modules: selectedCurriculum.modules.map(module =>
              module.id === moduleId
                ? { 
                    ...module, 
                    videos: [...(module.videos || []), videoData] 
                  }
                : module
            )
          };
          setSelectedCurriculum(updatedCurriculum);
          
          // 캐시는 자동으로 업데이트됨
        }

        // 업로드 성공 후 폼만 초기화 (모달은 유지하여 연속 업로드 가능)
        setNewVideo({ title: '', description: '', videoFile: null });
        // 파일 input도 초기화
        const fileInput = document.querySelector('input[type="file"][accept="video/*"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        toast({
          title: "업로드 완료",
          description: "영상이 성공적으로 업로드되었습니다. 추가 영상을 업로드하거나 완료 버튼을 눌러주세요.",
          variant: "default"
        });
      } else {
        console.error('[영상 업로드 클라이언트] API 응답 오류:', response.status, response.statusText);
        const errorData = await response.text();
        console.error('[영상 업로드 클라이언트] 오류 내용:', errorData);
        toast({
          title: "업로드 실패",
          description: `서버 오류: ${response.status} ${response.statusText}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('[영상 업로드 클라이언트] 네트워크 오류:', error);
      toast({
        title: "오류",
        description: "영상 업로드에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  // 영상 삭제 함수
  const deleteVideoFromModule = async (moduleId: string, videoId: string) => {
    if (!confirm('정말로 이 영상을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/curriculum/videos/${videoId}`, {
        method: 'DELETE'
      });

      if (response.ok && selectedCurriculum) {
        const updatedCurriculum = {
          ...selectedCurriculum,
          modules: selectedCurriculum.modules.map(module =>
            module.id === moduleId
              ? { ...module, videos: module.videos.filter(v => v.id !== videoId) }
              : module
          )
        };
        setSelectedCurriculum(updatedCurriculum);
        
        toast({
          title: "성공",
          description: "영상이 삭제되었습니다.",
          variant: "default"
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "영상 삭제에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  // 커리큘럼 미리보기 함수
  const handlePreviewCurriculum = (curriculum: CurriculumData | string) => {
    let targetCurriculum: CurriculumData | null = null;
    
    if (typeof curriculum === 'string') {
      // ID로 전달된 경우 해당 커리큘럼 찾기
      targetCurriculum = (curriculums as CurriculumData[] | undefined)?.find(c => c.id === curriculum) || null;
    } else {
      // 객체로 전달된 경우
      targetCurriculum = curriculum;
    }
    
    if (targetCurriculum) {
      setPreviewCurriculum(targetCurriculum);
      setShowPreviewModal(true);
    } else {
      toast({
        title: "오류",
        description: "미리보기할 커리큘럼을 찾을 수 없습니다.",
        variant: "destructive"
      });
    }
  };

  // 파일 선택 상태
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [showFileSelector, setShowFileSelector] = useState(false);

  // 첨부된 파일들을 자동으로 커리큘럼으로 등록하는 함수
  const handleAutoRegister = () => {
    setShowFileSelector(true);
  };

  // 실제 파일 등록 처리
  const processAutoRegister = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast({
        title: "파일 선택 필요",
        description: "등록할 파일을 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessingFile(true);
    
    try {
      const formData = new FormData();
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('files', selectedFiles[i]);
      }

      const response = await fetch('/api/admin/curriculum/auto-register', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "자동 등록 완료",
          description: data.message || `${selectedFiles.length}개의 파일이 성공적으로 등록되었습니다.`,
          variant: "default"
        });
        
        // 커리큘럼 목록 새로고침
        refetchCurriculums();
        setShowFileSelector(false);
        setSelectedFiles(null);
      } else {
        throw new Error(data.message || '자동 등록에 실패했습니다.');
      }
    } catch (error: any) {
      console.error("자동 등록 오류:", error);
      let errorMessage = error?.message || "자동 등록 중 오류가 발생했습니다.";
      
      // 특정 오류 타입에 따른 맞춤형 안내
      if (errorMessage.includes('length') || errorMessage.includes('undefined')) {
        errorMessage = "파일 양식이 맞지 않습니다. 엑셀 파일의 컬럼 순서와 내용을 확인해주세요.";
      } else if (errorMessage.includes('parsing') || errorMessage.includes('읽기')) {
        errorMessage = "파일을 읽을 수 없습니다. 파일이 손상되었거나 지원되지 않는 형식일 수 있습니다.";
      }
      
      toast({
        title: "자동 등록 실패",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsProcessingFile(false);
    }
  };

  // 중복된 삭제 함수 제거됨

  const publishCurriculum = async (curriculumId: string) => {
    try {
      const curriculum = (curriculums as CurriculumData[] | undefined)?.find(c => c.id === curriculumId);
      if (!curriculum) {
        throw new Error('커리큘럼을 찾을 수 없습니다.');
      }

      // 발행 전 검증
      if (!curriculum.modules || curriculum.modules.length === 0) {
        toast({
          title: "발행 불가",
          description: "모듈이 없는 커리큘럼은 발행할 수 없습니다.",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch(`/api/admin/curriculums/${curriculumId}/submit-for-approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(curriculum)
      });

      if (response.ok) {
        const result = await response.json();
        
        // 캐시 업데이트 - pending_approval로 설정
        queryClientInstance.setQueryData(['/api/admin/curriculum'], (oldData: CurriculumData[] = []) => {
          return oldData.map(curr => 
            curr.id === curriculumId 
              ? { ...curr, status: 'pending_approval' as any }
              : curr
          );
        });

        toast({
          title: "발행 신청 완료",
          description: "커리큘럼 발행 신청이 완료되었습니다. 등록신청관리에서 최종 승인을 기다립니다.",
          variant: "default"
        });
      } else {
        throw new Error('발행 신청 실패');
      }
    } catch (error) {
      console.error('커리큘럼 발행 신청 실패:', error);
      toast({
        title: "발행 신청 실패",
        description: "커리큘럼 발행 신청 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  // 커리큘럼 발행 상태 초기화 함수
  const unpublishCurriculum = async (curriculumId: string) => {
    if (!confirm('정말로 이 커리큘럼의 발행 상태를 초기화하시겠습니까?\n초기화 후 다시 발행 신청을 해야 합니다.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/curriculums/${curriculumId}/unpublish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // 캐시 업데이트 - draft로 초기화
        queryClientInstance.setQueryData(['/api/admin/curriculum'], (oldData: CurriculumData[] = []) => {
          return oldData.map(curr => 
            curr.id === curriculumId 
              ? { ...curr, status: 'draft' as any }
              : curr
          );
        });

        toast({
          title: "초기화 완료",
          description: "커리큘럼이 draft 상태로 초기화되었습니다. 다시 발행 신청할 수 있습니다.",
          variant: "default"
        });
      } else {
        throw new Error('초기화 실패');
      }
    } catch (error) {
      console.error('커리큘럼 초기화 실패:', error);
      toast({
        title: "초기화 실패",
        description: "커리큘럼 초기화 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const createCustomCurriculum = async () => {
    // 입력값 검증
    const validationErrors: string[] = [];
    
    if (!newCurriculum.title.trim()) {
      validationErrors.push("커리큘럼 제목을 입력해주세요.");
    }
    
    if (!newCurriculum.description.trim()) {
      validationErrors.push("커리큘럼 설명을 입력해주세요.");
    }
    
    if (!newCurriculum.category.trim()) {
      validationErrors.push("카테고리를 선택해주세요.");
    }
    
    if (!newCurriculum.trainerName.trim()) {
      validationErrors.push("강사명을 입력해주세요.");
    }
    
    if (newCurriculum.duration <= 0) {
      validationErrors.push("총 강의 시간을 입력해주세요. (0분 이상)");
    }
    
    if (newCurriculum.price < 0) {
      validationErrors.push("가격은 0원 이상이어야 합니다.");
    }

    if (validationErrors.length > 0) {
      toast({
        title: "입력값 오류",
        description: (
          <div className="space-y-1">
            <p className="font-medium mb-2">다음 항목을 확인해주세요:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        ),
        variant: "destructive"
      });
      return;
    }

    try {
      const curriculumData = {
        ...newCurriculum,
        id: `curriculum-${Date.now()}`,
        modules: [],
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // CSRF 토큰 가져오기
      const csrfToken = await getCSRFToken();

      const response = await fetch('/api/admin/curriculums', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken 
        },
        credentials: 'include',
        body: JSON.stringify(curriculumData)
      });

      if (response.ok) {
        const result = await response.json();
        // 캐시 무효화로 처리
        queryClientInstance.invalidateQueries({ queryKey: ['/api/admin/curriculum'] });
        setNewCurriculum({
          title: '',
          description: '',
          category: '',
          difficulty: 'beginner',
          duration: 0,
          price: 0,
          trainerId: '',
          trainerName: '',
          trainerEmail: '',
          trainerPhone: '',
          modules: []
        });
        setIsCreating(false);
        toast({
          title: "커리큘럼 생성 완료",
          description: "새로운 커리큘럼이 성공적으로 생성되었습니다.",
          variant: "default"
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || '서버 오류가 발생했습니다.');
      }
    } catch (error: any) {
      console.error('커리큘럼 생성 오류:', error);
      toast({
        title: "커리큘럼 생성 실패",
        description: error.message || "커리큘럼 생성 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
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




  // 영상강의 관련 헬퍼 함수
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">초안</Badge>;
      case 'pending':
        return <Badge variant="warning">검토중</Badge>;
      case 'approved':
        return <Badge variant="success">승인됨</Badge>;
      case 'rejected':
        return <Badge variant="danger">반려됨</Badge>;
      default:
        return <Badge variant="outline">알 수 없음</Badge>;
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return <Badge variant="default">초급</Badge>;
      case 'intermediate':
        return <Badge variant="secondary">중급</Badge>;
      case 'advanced':
        return <Badge variant="outline">고급</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">커리큘럼 & 영상강의 관리</h1>
          <p className="text-gray-600 dark:text-gray-300">훈련 프로그램 커리큘럼과 영상강의를 통합 관리합니다.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <TabsTrigger 
              value="curriculum" 
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-primary text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              커리큘럼 & 영상 관리
            </TabsTrigger>
            <TabsTrigger 
              value="revenue-management" 
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-primary text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <DollarSign className="w-4 h-4" />
              수익 정산
            </TabsTrigger>
          </TabsList>

          <TabsContent value="curriculum" className="space-y-6">

        {/* 간단한 커리큘럼 생성 프로세스 */}
        <Card className="bg-gradient-to-r from-primary to-secondary dark:from-primary/20 dark:to-secondary/20 border-2 border-dashed border-primary/40 dark:border-primary/50 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Plus className="w-6 h-6 text-primary dark:text-primary" />
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">새 커리큘럼 만들기</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-normal">커리큘럼 생성부터 영상 등록까지 한 번에!</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={handleStartCreation}
                className="h-20 bg-gradient-to-r from-primary to-secondary hover:from-primary hover:to-secondary text-white shadow-sm hover:shadow-md transition-all duration-200 focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label="새 커리큘럼 직접 작성하기"
              >
                <div className="text-center">
                  <Edit className="w-6 h-6 mx-auto mb-2" />
                  <div className="font-semibold">직접 작성</div>
                  <div className="text-xs opacity-90">단계별 가이드</div>
                </div>
              </Button>
              <Button 
                onClick={handleAutoRegister}
                variant="outline" 
                className="h-20 border-2 border-success/40 dark:border-success/50 hover:bg-success/10 dark:hover:bg-success/20 shadow-sm hover:shadow-md transition-all duration-200 focus:ring-2 focus:ring-success focus:ring-offset-2"
                aria-label="파일 업로드로 커리큘럼 생성하기"
              >
                <div className="text-center">
                  <Package className="w-6 h-6 mx-auto mb-2 text-success dark:text-success" />
                  <div className="font-semibold text-success dark:text-success">파일 업로드</div>
                  <div className="text-xs text-success dark:text-success">HWP/HWPX/XLSX 자동 분석</div>
                </div>
              </Button>
              <Button 
                onClick={handleDownloadTemplate}
                variant="outline" 
                className="h-20 border-2 border-primary/40 dark:border-primary/50 hover:bg-primary/10 dark:hover:bg-primary/20 shadow-sm hover:shadow-md transition-all duration-200 focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label="커리큘럼 작성 양식 다운로드"
              >
                <div className="text-center">
                  <Download className="w-6 h-6 mx-auto mb-2 text-primary dark:text-primary" />
                  <div className="font-semibold text-primary dark:text-primary">양식 다운로드</div>
                  <div className="text-xs text-primary dark:text-primary">엑셀 표준 양식</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 기존 커리큘럼 목록 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <BookOpen className="w-5 h-5 text-primary dark:text-primary" />
                    등록된 커리큘럼
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleStartCreation}
                      size="sm"
                      className="flex items-center gap-1 bg-gradient-to-r from-primary to-secondary hover:from-primary hover:to-secondary shadow-sm hover:shadow-md transition-all duration-200 focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      aria-label="쉬운 커리큘럼 생성 시작하기"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      쉬운 생성
                    </Button>
                    <Button 
                      onClick={() => setIsCreating(true)}
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/20 shadow-sm hover:shadow-md transition-all duration-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                      aria-label="고급 커리큘럼 생성 시작하기"
                    >
                      <Settings className="w-4 h-4" />
                      고급 생성
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {realCurriculumTemplates.map((template, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 hover:shadow-lg bg-white dark:bg-gray-800/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">{template.title}</h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">{template.description}</p>
                        <div className="flex items-center gap-3 mb-3">
                          <Badge variant={getDifficultyColor(template.difficulty)}>
                            {getDifficultyText(template.difficulty)}
                          </Badge>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {Math.floor(template.duration / 60)}시간
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {template.modules.length}개 모듈
                          </span>
                          <span className="text-sm font-medium text-success">
                            ₩{template.price.toLocaleString()}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {template.modules.map((module, moduleIndex) => (
                            <div key={moduleIndex} className="text-xs text-gray-500 dark:text-gray-400">
                              • {module.title} ({module.duration}분)
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button 
                        onClick={() => createFromTemplate(template)}
                        className="flex items-center gap-1 shadow-sm hover:shadow-md transition-all duration-200 focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        size="sm"
                        aria-label={`${template.title} 템플릿으로 커리큘럼 생성`}
                      >
                        <Plus className="w-4 h-4" />
                        커리큘럼 생성
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex items-center gap-1 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/20 shadow-sm hover:shadow-md transition-all duration-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                        onClick={() => handlePreviewCurriculum(template as CurriculumData)}
                        aria-label={`${template.title} 미리보기`}
                      >
                        <Eye className="w-4 h-4" />
                        미리보기
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* 등록된 커리큘럼 목록 */}
          <div>
            <Card className="bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <BookOpen className="w-5 h-5 text-primary dark:text-primary" />
                    등록된 커리큘럼 (관리중)
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleStartCreation}
                      size="sm"
                      className="bg-gradient-to-r from-primary to-secondary hover:from-primary hover:to-secondary text-white shadow-sm hover:shadow-md transition-all duration-200 focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      aria-label="쉬운 방법으로 커리큘럼 생성하기"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      쉬운 생성
                    </Button>
                    <Button 
                      onClick={() => setShowAdvancedCreation(true)}
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/20 shadow-sm hover:shadow-md transition-all duration-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                      aria-label="고급 방법으로 커리큘럼 생성하기"
                    >
                      <Settings className="w-4 h-4" />
                      고급 생성
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {((curriculums as CurriculumData[] | undefined) || []).map(curriculum => (
                  <div
                    key={curriculum.id}
                    onClick={() => handlePreviewCurriculum(curriculum)}
                    className="p-3 rounded-lg border cursor-pointer transition-colors border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">{curriculum.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                          {curriculum.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={getDifficultyColor(curriculum.difficulty)} className="text-xs">
                            {getDifficultyText(curriculum.difficulty)}
                          </Badge>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {curriculum.modules?.length || 0}개 모듈
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {curriculum.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCurriculum(curriculum);
                            setIsEditing(true);
                          }}
                          className="flex items-center gap-1 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all duration-200"
                        >
                          <Edit className="w-3 h-3" />
                          수정
                        </Button>
                        {curriculum.status === 'published' ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              unpublishCurriculum(curriculum.id);
                            }}
                            className="flex items-center gap-1 text-primary border-primary/40 hover:bg-primary/10 hover:text-primary/90 hover:border-primary/40 transition-all duration-200"
                          >
                            <XCircle className="w-3 h-3" />
                            초기화
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              publishCurriculum(curriculum.id);
                            }}
                            className="flex items-center gap-1 text-success border-success/40"
                          >
                            <Send className="w-3 h-3" />
                            발행신청
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCurriculum(curriculum.id);
                          }}
                          className="flex items-center gap-1 text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive/90 hover:border-destructive/40 transition-all duration-200"
                        >
                          <Trash2 className="w-3 h-3" />
                          삭제
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* 커스텀 커리큘럼 생성 폼 */}
                {isCreating && (
                  <div className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800/50">
                    <h4 className="font-medium mb-3 text-gray-900 dark:text-white">고급 커리큘럼 생성</h4>
                    <div className="space-y-4">
                      {/* 파일 업로드 섹션 */}
                      <div className="p-3 border-2 border-dashed border-primary/40 rounded-lg bg-primary/10 dark:bg-primary/20">
                        <div className="text-center">
                          <Upload className="w-8 h-8 mx-auto mb-2 text-primary" />
                          <p className="text-sm font-medium text-primary dark:text-primary mb-1">파일에서 커리큘럼 생성</p>
                          <p className="text-xs text-primary dark:text-primary mb-3">
                            한글파일(.hwp), 워드(.docx), 엑셀(.xlsx/.xls), 텍스트(.txt) 파일을 업로드하세요
                          </p>
                          <p className="text-xs text-success dark:text-success mb-3">
                            💡 엑셀 파일: 회차별 유료/무료 정보 자동 추출
                          </p>
                          <input
                            type="file"
                            accept=".hwpx,.docx,.doc,.txt,.xlsx,.xls"
                            disabled={isAnalyzing}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file && !isAnalyzing) handleCurriculumFileUpload(file);
                            }}
                            className="hidden"
                            id="curriculum-file-upload"
                          />
                          <label
                            htmlFor="curriculum-file-upload"
                            className={`inline-flex items-center px-4 py-2 text-white text-sm font-medium rounded-md transition-colors ${
                              isAnalyzing 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-primary hover:bg-primary/90 cursor-pointer'
                            }`}
                          >
                            {isAnalyzing ? (
                              <>
                                <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                                AI 분석 중...
                              </>
                            ) : (
                              <>
                                <FileText className="w-4 h-4 mr-2" />
                                AI로 커리큘럼 생성
                              </>
                            )}
                          </label>
                          {(isProcessingFile || isAnalyzing) && (
                            <div className="mt-2">
                              <div className="text-xs text-primary flex items-center gap-2">
                                <RotateCcw className="w-3 h-3 animate-spin" />
                                {isAnalyzing ? 'AI가 파일을 분석하여 커리큘럼을 생성중입니다...' : '파일 처리 중...'}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                ⚡ 파일 크기와 내용에 따라 1-3분 소요될 수 있습니다
                              </div>
                            </div>
                          )}
                          {uploadedFile && (
                            <div className="mt-2 text-xs text-success">
                              업로드됨: {uploadedFile.name}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-center text-gray-500 dark:text-gray-400 text-sm font-medium">또는 직접 입력</div>

                      {/* 수동 입력 폼 - 개선된 버전 */}
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">커리큘럼 제목 *</label>
                          <Input
                            placeholder="예: 반려견 기초 훈련 완전정복"
                            value={newCurriculum.title}
                            onChange={(e) => setNewCurriculum(prev => ({ ...prev, title: e.target.value }))}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">커리큘럼 설명 *</label>
                          <Textarea
                            placeholder="커리큘럼의 목표와 내용을 설명해주세요"
                            value={newCurriculum.description}
                            onChange={(e) => setNewCurriculum(prev => ({ ...prev, description: e.target.value }))}
                            rows={3}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">카테고리 *</label>
                            <Select
                              value={newCurriculum.category}
                              onValueChange={(value) => setNewCurriculum(prev => ({ ...prev, category: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="카테고리 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="기초훈련">기초훈련</SelectItem>
                                <SelectItem value="문제행동교정">문제행동교정</SelectItem>
                                <SelectItem value="어질리티">어질리티</SelectItem>
                                <SelectItem value="사회화">사회화</SelectItem>
                                <SelectItem value="전문가과정">전문가과정</SelectItem>
                                <SelectItem value="재활치료">재활치료</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">난이도 *</label>
                            <Select
                              value={newCurriculum.difficulty}
                              onValueChange={(value) => setNewCurriculum(prev => ({ ...prev, difficulty: value as any }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="난이도 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="beginner">초급</SelectItem>
                                <SelectItem value="intermediate">중급</SelectItem>
                                <SelectItem value="advanced">고급</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">총 시간 (분) *</label>
                            <Input
                              type="number"
                              placeholder="예: 480 (8시간)"
                              value={newCurriculum.duration}
                              onChange={(e) => setNewCurriculum(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">가격 (원) *</label>
                            <Input
                              type="number"
                              placeholder="예: 150000"
                              value={newCurriculum.price}
                              onChange={(e) => setNewCurriculum(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">강사명 *</label>
                            <Input
                              placeholder="강사 이름"
                              value={newCurriculum.trainerName}
                              onChange={(e) => setNewCurriculum(prev => ({ ...prev, trainerName: e.target.value }))}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">강사 ID</label>
                            <Input
                              placeholder="강사 ID (선택사항)"
                              value={newCurriculum.trainerId}
                              onChange={(e) => setNewCurriculum(prev => ({ ...prev, trainerId: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button onClick={createCustomCurriculum} size="sm" disabled={isProcessingFile} className="bg-success hover:bg-success/90">
                          <Save className="w-4 h-4 mr-1" />
                          커리큘럼 생성
                        </Button>
                        <Button 
                          onClick={() => {
                            setIsCreating(false);
                            setUploadedFile(null);
                            setNewCurriculum({
                              title: '',
                              description: '',
                              category: '',
                              difficulty: 'beginner',
                              duration: 0,
                              price: 0,
                              trainerId: '',
                              trainerName: '',
                              trainerEmail: '',
                              trainerPhone: '',
                              modules: []
                            });
                          }} 
                          variant="outline" 
                          size="sm"
                        >
                          취소
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {(!(curriculums as CurriculumData[] | undefined) || (curriculums as CurriculumData[] | undefined)!.length === 0) && !isCreating && (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <div>등록된 커리큘럼이 없습니다.</div>
                    <div className="text-sm">템플릿을 사용하거나 직접 생성해보세요.</div>
                  </div>
                )}
              </CardContent>
            </Card>



            {/* 커리큘럼 편집 다이얼로그 */}
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
              <DialogContent className="max-w-4xl" aria-describedby="curriculum-edit-description">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Edit className="w-5 h-5" />
                    커리큘럼 수정
                  </DialogTitle>
                </DialogHeader>
                <div id="curriculum-edit-description" className="sr-only">
                  커리큘럼 정보를 수정할 수 있는 대화상자입니다.
                </div>
                {selectedCurriculum && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">커리큘럼 제목</label>
                        <Input
                          placeholder="커리큘럼 제목을 입력하세요"
                          value={selectedCurriculum?.title || ''}
                          onChange={(e) => setSelectedCurriculum(prev => prev ? { ...prev, title: e.target.value } : null)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">커리큘럼 설명</label>
                        <Textarea
                          placeholder="커리큘럼 설명을 입력하세요"
                          value={selectedCurriculum?.description || ''}
                          onChange={(e) => setSelectedCurriculum(prev => prev ? { ...prev, description: e.target.value } : null)}
                          rows={4}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">카테고리</label>
                        <Input
                          placeholder="카테고리"
                          value={selectedCurriculum?.category || ''}
                          onChange={(e) => setSelectedCurriculum(prev => prev ? { ...prev, category: e.target.value } : null)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">가격 (원)</label>
                        <Input
                          type="number"
                          placeholder="가격"
                          value={selectedCurriculum?.price || 0}
                          onChange={(e) => setSelectedCurriculum(prev => prev ? { ...prev, price: parseInt(e.target.value) } : null)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">총 시간 (분)</label>
                        <Input
                          type="number"
                          placeholder="총 시간 (분)"
                          value={selectedCurriculum?.duration || 0}
                          onChange={(e) => setSelectedCurriculum(prev => prev ? { ...prev, duration: parseInt(e.target.value) } : null)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">난이도</label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                          value={selectedCurriculum?.difficulty || 'beginner'}
                          onChange={(e) => setSelectedCurriculum(prev => prev ? { ...prev, difficulty: e.target.value as 'beginner' | 'intermediate' | 'advanced' } : null)}
                        >
                          <option value="beginner">초급</option>
                          <option value="intermediate">중급</option>
                          <option value="advanced">고급</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                      >
                        취소
                      </Button>
                      <Button
                        onClick={() => selectedCurriculum && handlePreviewCurriculum(selectedCurriculum)}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        미리보기
                      </Button>
                      <Button
                        onClick={() => selectedCurriculum && publishCurriculum(selectedCurriculum.id)}
                        className="bg-success hover:bg-success/90"
                        disabled={selectedCurriculum?.status === 'published'}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {selectedCurriculum?.status === 'published' ? '발행됨' : '강의로 발행'}
                      </Button>
                      <Button
                        onClick={() => {
                          console.log('[저장 버튼] 클릭됨!');
                          console.log('[저장 버튼] selectedCurriculum:', selectedCurriculum);
                          if (selectedCurriculum) {
                            console.log('[저장 버튼] updateCurriculum 호출 시작');
                            updateCurriculum(selectedCurriculum);
                          } else {
                            console.error('[저장 버튼] selectedCurriculum이 없습니다!');
                          }
                        }}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90"
                      >
                        <Save className="w-4 h-4" />
                        저장
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* 영상 업로드 모달 */}
            {isAddingVideo && selectedModule && (
              <Card className="mt-6 border-success/30 bg-success/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-success">
                    <Video className="w-5 h-5" />
                    영상 업로드 - {selectedModule.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">영상 제목</label>
                      <Input
                        placeholder="예: 1강 - 기본자세 익히기"
                        value={newVideo.title}
                        onChange={(e) => setNewVideo(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">영상 설명</label>
                      <Textarea
                        placeholder="영상 내용에 대한 간단한 설명을 입력해주세요"
                        value={newVideo.description}
                        onChange={(e) => setNewVideo(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">영상 파일</label>
                      <input
                        type="file"
                        accept="video/*"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            // 첫 번째 파일을 기본으로 설정하고, 나머지는 대기열에 추가
                            setNewVideo(prev => ({ ...prev, videoFile: files[0] }));
                            if (files.length > 1) {
                              // 여러 파일 선택 시 알림
                              toast({
                                title: "여러 파일 선택됨",
                                description: `${files.length}개 파일이 선택되었습니다. 하나씩 업로드해주세요.`,
                                variant: "default"
                              });
                            }
                          }
                        }}
                        className="block w-full text-base text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-base file:font-medium file:bg-primary/10 dark:file:bg-primary/20 file:text-primary dark:file:text-primary hover:file:bg-primary/10 dark:hover:file:bg-primary"
                      />
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        지원 형식: MP4, AVI, MOV (최대 500MB) - 여러 파일 선택 가능
                      </p>
                      {newVideo.videoFile && (
                        <div className="mt-2 p-2 bg-primary/10 dark:bg-primary/20 border border-primary/30 dark:border-primary/50 rounded text-sm">
                          <span className="font-medium text-primary dark:text-primary/70">선택된 파일:</span> <span className="text-primary dark:text-primary">{newVideo.videoFile.name}</span>
                          <span className="text-primary dark:text-primary ml-2">
                            ({(newVideo.videoFile.size / (1024 * 1024)).toFixed(1)}MB)
                          </span>
                        </div>
                      )}
                    </div>

                    {videoUploadProgress > 0 && (
                      <div>
                        <div className="flex justify-between text-base text-gray-900 dark:text-gray-100 mb-1">
                          <span>업로드 진행률</span>
                          <span>{videoUploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-success h-2 rounded-full transition-all duration-300"
                            style={{ width: `${videoUploadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          console.log('[영상 업로드 버튼] 클릭됨 - selectedModule:', selectedModule?.id);
                          console.log('[영상 업로드 버튼] newVideo 상태:', {
                            hasTitle: !!newVideo.title.trim(),
                            hasVideoFile: !!newVideo.videoFile,
                            title: newVideo.title,
                            fileName: newVideo.videoFile?.name
                          });
                          
                          if (!selectedModule || !selectedModule.id) {
                            console.error('[영상 업로드 버튼] selectedModule이 없음:', selectedModule);
                            toast({
                              title: "오류",
                              description: "모듈 정보가 선택되지 않았습니다.",
                              variant: "destructive"
                            });
                            return;
                          }
                          
                          uploadVideoToModule(selectedModule.id);
                        }}
                        className="flex-1"
                        disabled={!newVideo.videoFile || !newVideo.title.trim() || !selectedModule?.id}
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        업로드
                      </Button>
                      <Button
                        onClick={() => {
                          // 업로드 후 폼만 초기화하고 모달은 유지 (연속 업로드를 위해)
                          setNewVideo({ title: '', description: '', videoFile: null });
                          // 파일 input도 초기화
                          const fileInput = document.querySelector('input[type="file"][accept="video/*"]') as HTMLInputElement;
                          if (fileInput) fileInput.value = '';
                          toast({
                            title: "폼 초기화",
                            description: "새로운 영상을 추가할 수 있습니다.",
                            variant: "default"
                          });
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        폼 초기화
                      </Button>
                      <Button
                        onClick={() => {
                          setIsAddingVideo(false);
                          setSelectedModule(null);
                          setNewVideo({ title: '', description: '', videoFile: null });
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        완료
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </TabsContent>

          {/* 영상강의 관리 탭 */}
          <TabsContent value="video-lectures" className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">커리큘럼 영상 등록 현황</h2>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                총 {(curriculums as CurriculumData[] | undefined)?.length || 0}개 커리큘럼 등록됨
              </div>
            </div>

            <div className="space-y-4">
              {((curriculums as CurriculumData[] | undefined) || []).map((curriculum) => {
                const modules = curriculum.modules || [];
                const totalModules = modules.length;
                const modulesWithVideos = modules.filter(module => 
                  module.videos && module.videos.length > 0
                ).length;
                const totalVideos = modules.reduce((sum, module) => 
                  sum + (module.videos ? module.videos.length : 0), 0
                );
                const readyVideos = modules.reduce((sum, module) => 
                  sum + (module.videos ? module.videos.filter(v => v.status === 'ready').length : 0), 0
                );
                const videoProgress = totalVideos > 0 ? (readyVideos / totalVideos) * 100 : 0;

                return (
                  <Card key={curriculum.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{curriculum.title}</h3>
                            <Badge variant={curriculum.status === 'published' ? 'default' : 'secondary'}>
                              {curriculum.status === 'published' ? '발행됨' : '초안'}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 mb-3 text-base text-gray-700 dark:text-gray-300">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>{curriculum.trainerName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <BookOpen className="w-4 h-4" />
                              <span>{curriculum.category}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{curriculum.duration}분</span>
                            </div>
                          </div>

                          <p className="text-gray-700 dark:text-gray-300 text-base mb-4">{curriculum.description}</p>
                          
                          {/* 영상 등록 현황 */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div className="bg-primary/10 p-3 rounded-lg">
                              <div className="text-xs text-primary font-medium mb-1">총 모듈</div>
                              <div className="text-lg font-bold text-primary">{totalModules}개</div>
                            </div>
                            <div className="bg-success/10 p-3 rounded-lg">
                              <div className="text-xs text-success font-medium mb-1">영상 등록 모듈</div>
                              <div className="text-lg font-bold text-success">{modulesWithVideos}개</div>
                            </div>
                            <div className="bg-primary/10 p-3 rounded-lg">
                              <div className="text-xs text-primary font-medium mb-1">총 영상</div>
                              <div className="text-lg font-bold text-primary">{totalVideos}개</div>
                            </div>
                            <div className="bg-primary/5 p-3 rounded-lg">
                              <div className="text-xs text-primary font-medium mb-1">준비된 영상</div>
                              <div className="text-lg font-bold text-primary">{readyVideos}개</div>
                            </div>
                          </div>

                          {/* 수익 정산 정보 */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-gradient-to-r from-primary to-secondary/5 rounded-lg border">
                            <div className="text-center">
                              <div className="text-xs text-primary font-medium mb-1">총 수익</div>
                              <div className="text-lg font-bold text-primary">
                                ₩{(curriculum.totalRevenue || 0).toLocaleString()}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                등록학생: {curriculum.enrollmentCount || 0}명
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-success font-medium mb-1">훈련사 수익</div>
                              <div className="text-lg font-bold text-success">
                                ₩{((curriculum.totalRevenue || 0) * (curriculum.revenueShare?.trainerShare || 70) / 100).toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                분배율: {curriculum.revenueShare?.trainerShare || 70}%
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-primary font-medium mb-1">플랫폼 수익</div>
                              <div className="text-lg font-bold text-primary">
                                ₩{((curriculum.totalRevenue || 0) * (curriculum.revenueShare?.platformShare || 30) / 100).toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                분배율: {curriculum.revenueShare?.platformShare || 30}%
                              </div>
                            </div>
                          </div>

                          {/* 등록자 정보 */}
                          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">등록자 정보</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">훈련사:</span>
                                <span className="ml-2 font-medium text-gray-900 dark:text-white">{curriculum.trainerName}</span>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">이메일:</span>
                                <span className="ml-2 text-gray-900 dark:text-white">{curriculum.trainerEmail || '미등록'}</span>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">연락처:</span>
                                <span className="ml-2 text-gray-900 dark:text-white">{curriculum.trainerPhone || '미등록'}</span>
                              </div>
                            </div>
                            {curriculum.lastSaleDate && (
                              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                마지막 판매: {curriculum.lastSaleDate ? (typeof curriculum.lastSaleDate === 'string' ? new Date(curriculum.lastSaleDate).toLocaleDateString() : curriculum.lastSaleDate.toLocaleDateString()) : '미판매'}
                              </div>
                            )}
                          </div>

                          {/* 영상 준비 진행률 */}
                          <div className="mb-4">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-gray-600">영상 준비 진행률</span>
                              <span className="font-medium">{Math.round(videoProgress)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${videoProgress}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* 모듈별 영상 썸네일 및 제목 표시 */}
                          {modules.length > 0 && (
                            <div className="border-t pt-4">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">모듈별 영상 강의</h4>
                              <div className="space-y-3">
                                {modules.slice(0, 6).map((module, index) => (
                                  <div key={module.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                    <div className="flex items-start gap-3">
                                      <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded font-medium flex-shrink-0">
                                        {index + 1}강
                                      </span>
                                      <div className="flex-1">
                                        <h5 className="font-medium text-sm text-gray-900 dark:text-white mb-2">{module.title}</h5>
                                        
                                        {/* 영상 목록 표시 */}
                                        {module.videos && module.videos.length > 0 ? (
                                          <div className="space-y-2">
                                            {module.videos.map((video, videoIndex) => (
                                              <div key={video.id || videoIndex} className="flex items-center gap-3 bg-white dark:bg-gray-700 rounded p-2">
                                                {/* 영상 썸네일 */}
                                                <div className="w-16 h-10 bg-gradient-to-br from-primary to-secondary rounded flex items-center justify-center flex-shrink-0">
                                                  <Video className="w-4 h-4 text-white" />
                                                </div>
                                                
                                                {/* 영상 정보 */}
                                                <div className="flex-1 min-w-0">
                                                  <div className="text-xs font-medium text-gray-900 dark:text-white truncate">
                                                    {video.title}
                                                  </div>
                                                  {video.description && (
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                      {video.description}
                                                    </div>
                                                  )}
                                                  <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="text-xs">
                                                      {video.duration || '00:00'}
                                                    </Badge>
                                                    <Badge variant={video.status === 'ready' ? 'default' : 'secondary'} className="text-xs">
                                                      {video.status === 'ready' ? '준비완료' : '처리중'}
                                                    </Badge>
                                                  </div>
                                                </div>
                                                
                                                {/* 영상 액션 버튼 */}
                                                <div className="flex items-center gap-1">
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-6 px-2 text-xs"
                                                    onClick={() => {
                                                      // 영상 미리보기 기능 (추후 구현)
                                                      toast({
                                                        title: "미리보기",
                                                        description: "영상 미리보기 기능은 준비중입니다.",
                                                        variant: "default"
                                                      });
                                                    }}
                                                  >
                                                    <Eye className="w-3 h-3" />
                                                  </Button>
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-6 px-2 text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
                                                    onClick={() => deleteVideoFromModule(module.id, video.id)}
                                                  >
                                                    <Trash2 className="w-3 h-3" />
                                                  </Button>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded">
                                            <div className="text-center">
                                              <Video className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">등록된 영상이 없습니다</p>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-xs"
                                                onClick={() => {
                                                  setSelectedModule(module);
                                                  setIsAddingVideo(true);
                                                }}
                                              >
                                                <Upload className="w-3 h-3 mr-1" />
                                                영상 업로드
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* 영상 추가 버튼 (이미 영상이 있는 경우) */}
                                        {module.videos && module.videos.length > 0 && (
                                          <div className="mt-2">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="w-full text-xs"
                                              onClick={() => {
                                                setSelectedModule(module);
                                                setIsAddingVideo(true);
                                              }}
                                            >
                                              <Plus className="w-3 h-3 mr-1" />
                                              영상 추가
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {modules.length > 6 && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                                    외 {modules.length - 6}개 모듈
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex gap-2 justify-end border-t pt-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handlePreviewCurriculum(curriculum)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          미리보기
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedCurriculum(curriculum)}
                        >
                          <Video className="w-4 h-4 mr-1" />
                          영상 관리
                        </Button>
                        {curriculum.status !== 'published' && (
                          <Button 
                            size="sm"
                            onClick={() => publishCurriculum(curriculum.id)}
                            className="bg-success hover:bg-success/90"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            발행
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {((curriculums as CurriculumData[] | undefined) || []).length === 0 && (
              <Card className="bg-gray-50">
                <CardContent className="p-8 text-center">
                  <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="font-medium text-gray-900 mb-2">
                    등록된 커리큘럼이 없습니다
                  </h3>
                  <p className="text-gray-500 text-sm">
                    먼저 커리큘럼을 생성한 후 영상을 등록해주세요.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 수익 정산 탭 */}
          <TabsContent value="revenue-management" className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">수익 정산 관리</h2>
              <div className="text-sm text-gray-500">
                총 {((curriculums as CurriculumData[] | undefined) || []).length}개 커리큘럼
              </div>
            </div>

            {/* 전체 수익 요약 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gradient-to-r from-primary to-secondary text-white">
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold mb-2">
                    ₩{((curriculums as CurriculumData[] | undefined) || []).reduce((sum, c) => sum + (c.totalRevenue || 0), 0).toLocaleString()}
                  </div>
                  <div className="text-primary/70">총 수익</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-primary to-secondary text-white">
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold mb-2">
                    ₩{((curriculums as CurriculumData[] | undefined) || []).reduce((sum, c) => sum + ((c.totalRevenue || 0) * (c.revenueShare?.trainerShare || 70) / 100), 0).toLocaleString()}
                  </div>
                  <div className="text-success/70">훈련사 수익</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-primary/50 to-primary text-white">
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold mb-2">
                    ₩{((curriculums as CurriculumData[] | undefined) || []).reduce((sum, c) => sum + ((c.totalRevenue || 0) * (c.revenueShare?.platformShare || 30) / 100), 0).toLocaleString()}
                  </div>
                  <div className="text-primary-foreground">플랫폼 수익</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-primary to-secondary text-white">
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold mb-2">
                    {((curriculums as CurriculumData[] | undefined) || []).reduce((sum, c) => sum + (c.enrollmentCount || 0), 0)}
                  </div>
                  <div className="text-primary/70">총 등록 학생</div>
                </CardContent>
              </Card>
            </div>

            {/* 커리큘럼별 수익 상세 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">커리큘럼별 수익 현황</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200 dark:border-gray-700 rounded-lg">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">커리큘럼</th>
                      <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">등록자</th>
                      <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">가격</th>
                      <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">등록학생</th>
                      <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">총 수익</th>
                      <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">훈련사 수익</th>
                      <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">플랫폼 수익</th>
                      <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-center font-semibold text-gray-900 dark:text-white">분배율</th>
                      <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-center font-semibold text-gray-900 dark:text-white">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((curriculums as CurriculumData[] | undefined) || []).map((curriculum) => {
                      const trainerRevenue = (curriculum.totalRevenue || 0) * (curriculum.revenueShare?.trainerShare || 70) / 100;
                      const platformRevenue = (curriculum.totalRevenue || 0) * (curriculum.revenueShare?.platformShare || 30) / 100;
                      
                      return (
                        <tr key={curriculum.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{curriculum.title}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{curriculum.category}</div>
                            </div>
                          </td>
                          <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{curriculum.trainerName}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{curriculum.trainerEmail || '이메일 미등록'}</div>
                            </div>
                          </td>
                          <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                            ₩{curriculum.price.toLocaleString()}
                          </td>
                          <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-right text-gray-900 dark:text-white">
                            {curriculum.enrollmentCount || 0}명
                          </td>
                          <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-right font-bold text-primary">
                            ₩{(curriculum.totalRevenue || 0).toLocaleString()}
                          </td>
                          <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-right font-medium text-success">
                            ₩{trainerRevenue.toLocaleString()}
                          </td>
                          <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-right font-medium text-primary">
                            ₩{platformRevenue.toLocaleString()}
                          </td>
                          <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-center">
                            <div className="text-sm">
                              <div className="text-success">{curriculum.revenueShare?.trainerShare || 70}%</div>
                              <div className="text-primary">{curriculum.revenueShare?.platformShare || 30}%</div>
                            </div>
                          </td>
                          <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-center">
                            <Badge variant={curriculum.status === 'published' ? 'default' : 'secondary'}>
                              {curriculum.status === 'published' ? '발행됨' : '초안'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {((curriculums as CurriculumData[] | undefined) || []).length === 0 && (
                <Card className="bg-gray-50 dark:bg-gray-800">
                  <CardContent className="p-8 text-center">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      수익 데이터가 없습니다
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      발행된 커리큘럼이 없거나 아직 등록 학생이 없습니다.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 수익 정산 설정 */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  수익 분배 설정
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">기본 수익 분배율</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-700 dark:text-gray-300">훈련사 수익:</span>
                        <span className="font-medium text-success">70%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700 dark:text-gray-300">플랫폼 수익:</span>
                        <span className="font-medium text-primary">30%</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">전문과정 수익 분배율</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-700 dark:text-gray-300">훈련사 수익:</span>
                        <span className="font-medium text-success">75%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700 dark:text-gray-300">플랫폼 수익:</span>
                        <span className="font-medium text-primary">25%</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm text-primary">
                    <strong>정산 안내:</strong> 매월 말일 자동 정산되며, 훈련사에게는 등록된 계좌로 입금됩니다. 
                    세금계산서는 별도 발행됩니다.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 승인 대기 탭 */}
          <TabsContent value="pending-approval" className="space-y-6">
            {userRole === 'admin' ? (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">승인 대기 중인 영상강의</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {videoLectures.filter(lecture => lecture.status === 'pending').map((lecture) => (
                    <Card key={lecture.id} className="border-primary/30 dark:border-primary/50">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-lg mb-1">{lecture.title}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {lecture.instructor} • {lecture.category}
                            </p>
                          </div>
                          <Badge variant="warning">검토중</Badge>
                        </div>
                        
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                          {lecture.description}
                        </p>

                        <div className="mb-4">
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">모듈 정보:</div>
                          <div className="space-y-1">
                            {lecture.modules.slice(0, 3).map((module, idx) => (
                              <div key={idx} className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                <BookOpen className="h-3 w-3" />
                                <span>{module.title} ({module.duration}분)</span>
                                <Badge variant="outline" className="text-xs">
                                  {module.format === 'theory' ? '이론' : 
                                   module.format === 'practice' ? '실습' : '이론+실습'}
                                </Badge>
                              </div>
                            ))}
                            {lecture.modules.length > 3 && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                외 {lecture.modules.length - 3}개 모듈
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => handleApproveLecture(lecture.id)}
                            className="bg-success hover:bg-success/90 text-white shadow-sm hover:shadow-md transition-all duration-200 focus:ring-2 focus:ring-success focus:ring-offset-2"
                            aria-label={`${lecture.title} 강의 승인`}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            승인
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleRejectLecture(lecture.id)}
                            className="bg-destructive hover:bg-destructive/90 text-white shadow-sm hover:shadow-md transition-all duration-200 focus:ring-2 focus:ring-destructive focus:ring-offset-2"
                            aria-label={`${lecture.title} 강의 반려`}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            반려
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handlePreviewVideoLecture(lecture)}
                            className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/20 shadow-sm hover:shadow-md transition-all duration-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                            aria-label={`${lecture.title} 강의 미리보기`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            미리보기
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {videoLectures.filter(lecture => lecture.status === 'pending').length === 0 && (
                  <Card className="bg-gray-50 dark:bg-gray-800/50">
                    <CardContent className="p-8 text-center">
                      <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                        승인 대기 중인 강의가 없습니다
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        새로운 강의 등록이 있을 때까지 기다려주세요.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="bg-primary/10 dark:bg-primary/20 border-primary/30 dark:border-primary/50">
                <CardContent className="p-6 text-center">
                  <AlertCircle className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="font-medium text-primary dark:text-primary mb-2">
                    관리자 전용 기능
                  </h3>
                  <p className="text-primary dark:text-primary">
                    강의 승인 기능은 관리자만 사용할 수 있습니다.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* 영상강의 상세 보기 모달 */}
        {selectedLecture && (
          <Dialog open={!!selectedLecture} onOpenChange={() => setSelectedLecture(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <Video className="h-5 w-5 text-primary dark:text-primary" />
                  {selectedLecture.title}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">기본 정보</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">강사:</span> {selectedLecture.instructor}</div>
                      <div><span className="font-medium">카테고리:</span> {selectedLecture.category}</div>
                      <div><span className="font-medium">난이도:</span> {getDifficultyBadge(selectedLecture.difficulty)}</div>
                      <div><span className="font-medium">상태:</span> {getStatusBadge(selectedLecture.status)}</div>
                      <div><span className="font-medium">가격:</span> ₩{selectedLecture.price.toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">통계</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">총 시간:</span> {Math.floor(selectedLecture.totalDuration / 60)}시간</div>
                      <div><span className="font-medium">평점:</span> {selectedLecture.rating} / 5.0</div>
                      <div><span className="font-medium">리뷰 수:</span> {selectedLecture.reviewCount}개</div>
                      <div><span className="font-medium">수강생:</span> {selectedLecture.studentCount}명</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">강의 설명</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {selectedLecture.description}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">강의 모듈 ({selectedLecture.modules.length}개)</h4>
                  <div className="space-y-3">
                    {selectedLecture.modules.map((module, index) => (
                      <div key={module.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium">{module.title}</h5>
                          <div className="flex items-center gap-2">
                            <Badge variant={module.format === 'theory' ? 'secondary' : 
                                           module.format === 'practice' ? 'default' : 'outline'}>
                              {module.format === 'theory' ? '이론' : 
                               module.format === 'practice' ? '실습' : '이론+실습'}
                            </Badge>
                            <span className="text-xs text-gray-500">{module.duration}분</span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {module.description}
                        </p>
                        
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
                </div>

                <div className="flex justify-end gap-2">
                  {userRole === 'admin' && selectedLecture.status === 'pending' && (
                    <>
                      <Button 
                        variant="default"
                        onClick={() => {
                          handleApproveLecture(selectedLecture.id);
                          setSelectedLecture(null);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        승인
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={() => {
                          handleRejectLecture(selectedLecture.id);
                          setSelectedLecture(null);
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        반려
                      </Button>
                    </>
                  )}
                  <Button variant="outline" onClick={() => setSelectedLecture(null)}>
                    닫기
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* 고급 생성 다이얼로그 */}
        <Dialog open={showAdvancedCreation} onOpenChange={setShowAdvancedCreation}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="advanced-creation-description">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Settings className="w-5 h-5" />
                고급 커리큘럼 생성
              </DialogTitle>
            </DialogHeader>
            <div id="advanced-creation-description" className="sr-only">
              고급 옵션을 사용하여 커리큘럼을 생성하는 대화상자입니다.
            </div>
            
            <div className="space-y-6">
              {/* 파일 업로드 섹션 */}
              <div className="p-4 border-2 border-dashed border-primary/40 rounded-lg bg-primary/10 dark:bg-primary/20">
                <div className="text-center">
                  <Upload className="w-10 h-10 mx-auto mb-3 text-primary" />
                  <h3 className="text-lg font-semibold text-primary dark:text-primary mb-2">파일에서 커리큘럼 생성</h3>
                  <p className="text-sm text-primary dark:text-primary mb-4">
                    Excel 파일(.xlsx, .xls), 한글파일(.hwp, .hwpx), 워드파일(.docx, .doc) 지원
                  </p>
                  <p className="text-sm text-success dark:text-success mb-4">
                    💡 Excel 파일: 회차별 세부 정보 및 가격 정보 자동 추출
                  </p>
                  <input
                    type="file"
                    accept=".hwpx,.docx,.doc,.txt,.xlsx,.xls"
                    disabled={isAnalyzing}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && !isAnalyzing) {
                        handleCurriculumFileUpload(file);
                        setShowAdvancedCreation(false);
                      }
                    }}
                    className="hidden"
                    id="advanced-file-upload"
                  />
                  <label
                    htmlFor="advanced-file-upload"
                    className={`inline-flex items-center px-6 py-3 text-white text-sm font-medium rounded-lg transition-colors shadow-sm hover:shadow-md ${
                      isAnalyzing 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-primary hover:bg-primary/90 cursor-pointer'
                    }`}
                  >
                    {isAnalyzing ? (
                      <>
                        <RotateCcw className="w-5 h-5 mr-2 animate-spin" />
                        AI 분석 중...
                      </>
                    ) : (
                      <>
                        <FileText className="w-5 h-5 mr-2" />
                        AI로 커리큘럼 생성
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="text-center">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500">또는</span>
                  </div>
                </div>
              </div>

              {/* 직접 입력 섹션 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">직접 입력</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">커리큘럼 제목 *</label>
                    <Input
                      placeholder="예: 반려견 기초 훈련 완전정복"
                      value={newCurriculum.title}
                      onChange={(e) => setNewCurriculum(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">카테고리 *</label>
                    <Select
                      value={newCurriculum.category}
                      onValueChange={(value) => setNewCurriculum(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="카테고리 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="기초훈련">기초훈련</SelectItem>
                        <SelectItem value="문제행동교정">문제행동교정</SelectItem>
                        <SelectItem value="어질리티">어질리티</SelectItem>
                        <SelectItem value="사회화">사회화</SelectItem>
                        <SelectItem value="전문가과정">전문가과정</SelectItem>
                        <SelectItem value="재활치료">재활치료</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">커리큘럼 설명 *</label>
                  <Textarea
                    placeholder="커리큘럼의 목표와 내용을 자세히 설명해주세요"
                    value={newCurriculum.description}
                    onChange={(e) => setNewCurriculum(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">난이도 *</label>
                    <Select
                      value={newCurriculum.difficulty}
                      onValueChange={(value) => setNewCurriculum(prev => ({ ...prev, difficulty: value as 'beginner' | 'intermediate' | 'advanced' }))}
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
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">총 시간 (분) *</label>
                    <Input
                      type="number"
                      placeholder="480"
                      value={newCurriculum.duration}
                      onChange={(e) => setNewCurriculum(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">가격 (원) *</label>
                    <Input
                      type="number"
                      placeholder="300000"
                      value={newCurriculum.price}
                      onChange={(e) => setNewCurriculum(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">담당 훈련사 *</label>
                    <Input
                      placeholder="예: 강동훈"
                      value={newCurriculum.trainerName}
                      onChange={(e) => setNewCurriculum(prev => ({ ...prev, trainerName: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">훈련사 ID</label>
                    <Input
                      placeholder="예: trainer-001"
                      value={newCurriculum.trainerId}
                      onChange={(e) => setNewCurriculum(prev => ({ ...prev, trainerId: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowAdvancedCreation(false)}
                >
                  취소
                </Button>
                <Button
                  onClick={handleAdvancedCreateCurriculum}
                  disabled={!newCurriculum.title || !newCurriculum.description || !newCurriculum.category}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  커리큘럼 생성
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 커리큘럼 미리보기 모달 */}
        {showPreviewModal && previewCurriculum && (
          <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  커리큘럼 미리보기
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* 커리큘럼 기본 정보 */}
                <div className="bg-gradient-to-r from-primary to-secondary p-6 rounded-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">{previewCurriculum.title}</h2>
                      <p className="text-gray-600 mb-3">{previewCurriculum.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">강사:</span>
                          <span>{previewCurriculum.trainerName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">카테고리:</span>
                          <Badge variant="outline">{previewCurriculum.category}</Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{previewCurriculum.duration}분</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary mb-1">
                        ₩{previewCurriculum.price.toLocaleString()}
                      </div>
                      <Badge variant={previewCurriculum.difficulty === 'beginner' ? 'default' : 
                                   previewCurriculum.difficulty === 'intermediate' ? 'secondary' : 'outline'}>
                        {previewCurriculum.difficulty === 'beginner' ? '초급' : 
                         previewCurriculum.difficulty === 'intermediate' ? '중급' : '고급'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* 커리큘럼 모듈 */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    커리큘럼 구성 ({previewCurriculum.modules?.length || 0}개 모듈)
                  </h3>
                  
                  <div className="space-y-4">
                    {previewCurriculum.modules && previewCurriculum.modules.length > 0 ? (
                      previewCurriculum.modules.map((module, index) => (
                        <Card key={module.id || index} className="border-l-4 border-l-blue-500">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="bg-primary/10 text-primary text-sm font-medium px-2 py-1 rounded">
                                    {index + 1}강
                                  </span>
                                  <h4 className="font-semibold">{module.title || '제목 없음'}</h4>
                                  {module.isFree ? (
                                    <Badge variant="secondary" className="text-xs bg-success/10 text-success">
                                      무료
                                    </Badge>
                                  ) : (
                                    <Badge variant="default" className="text-xs bg-primary/10 text-primary">
                                      유료 (₩{module.price?.toLocaleString() || '0'})
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-gray-600 text-sm mb-3">{module.description || '설명 없음'}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleModuleSelect(module)}
                                  className="flex items-center gap-1 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all duration-200"
                                >
                                  <Edit className="w-3 h-3" />
                                  수정
                                </Button>
                              </div>
                            </div>
                              
                              {/* 학습 목표 */}
                              {module.objectives && Array.isArray(module.objectives) && module.objectives.length > 0 && (
                                <div className="mb-3">
                                  <h5 className="text-sm font-medium text-primary mb-2">🎯 학습 목표:</h5>
                                  <ul className="space-y-1">
                                    {module.objectives.map((objective, objIndex) => (
                                      <li key={objIndex} className="flex items-center gap-2 text-sm text-gray-600">
                                        <div className="w-1 h-1 bg-primary rounded-full"></div>
                                        <span>{objective}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {/* 강의 내용 */}
                              {module.content && (
                                <div className="mb-3">
                                  <h5 className="text-sm font-medium text-success mb-2">📚 강의 내용:</h5>
                                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{module.content}</p>
                                </div>
                              )}
                              
                              {/* 상세 내용 */}
                              {module.detailedContent && (
                                <div className="mb-3 space-y-2">
                                  {module.detailedContent.introduction && (
                                    <div>
                                      <h6 className="text-xs font-medium text-primary mb-1">🚀 수업 소개:</h6>
                                      <p className="text-xs text-gray-600 bg-primary/5 p-2 rounded">{module.detailedContent.introduction}</p>
                                    </div>
                                  )}
                                  
                                  {module.detailedContent.mainTopics && Array.isArray(module.detailedContent.mainTopics) && module.detailedContent.mainTopics.length > 0 && (
                                    <div>
                                      <h6 className="text-xs font-medium text-primary mb-1">📖 주요 토픽:</h6>
                                      <ul className="text-xs text-gray-600 bg-primary/10 p-2 rounded space-y-1">
                                        {module.detailedContent.mainTopics.map((topic, topicIndex) => (
                                          <li key={topicIndex} className="flex items-start gap-1">
                                            <span>•</span>
                                            <span>{topic}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  
                                  {module.detailedContent.practicalExercises && Array.isArray(module.detailedContent.practicalExercises) && module.detailedContent.practicalExercises.length > 0 && (
                                    <div>
                                      <h6 className="text-xs font-medium text-destructive mb-1">🏃‍♂️ 실습:</h6>
                                      <ul className="text-xs text-gray-600 bg-destructive/10 p-2 rounded space-y-1">
                                        {module.detailedContent.practicalExercises.map((exercise, exerciseIndex) => (
                                          <li key={exerciseIndex} className="flex items-start gap-1">
                                            <span>•</span>
                                            <span>{exercise}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* 준비물 섹션 */}
                              {module.materials && Array.isArray(module.materials) && module.materials.length > 0 && (
                                <div className="mb-3">
                                  <h5 className="text-sm font-medium text-primary mb-2">🛒 준비물/용품:</h5>
                                  <div className="flex flex-wrap gap-2">
                                    {module.materials.map((material, matIndex) => (
                                      <button
                                        key={matIndex}
                                        onClick={() => handleMaterialClick(material)}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs hover:bg-primary/15 transition-colors cursor-pointer"
                                      >
                                        <Package className="w-3 h-3" />
                                        <span>{material}</span>
                                        <span className="text-xs opacity-70">(클릭하여 구매)</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* 영상 정보 */}
                              {module.videos && Array.isArray(module.videos) && module.videos.length > 0 && (
                                <div className="mt-3 pt-3 border-t">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Video className="w-4 h-4 text-success" />
                                    <span className="text-sm font-medium text-gray-700">
                                      등록된 영상: {module.videos.length}개
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {module.videos.slice(0, 4).map((video) => (
                                      <div key={video.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
                                        <Play className="w-3 h-3 text-primary" />
                                        <span className="font-medium truncate">{video.title}</span>
                                        <Badge 
                                          variant={video.status === 'ready' ? 'default' : 'secondary'}
                                          className="text-xs"
                                        >
                                          {video.status === 'ready' ? '준비' : '대기'}
                                        </Badge>
                                      </div>
                                    ))}
                                    {module.videos.length > 4 && (
                                      <div className="text-xs text-gray-500 flex items-center">
                                        외 {module.videos.length - 4}개 영상
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                          </CardContent>
                      </Card>
                    ))
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-gray-500 mb-2">
                          <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>등록된 모듈이 없습니다.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    상태: <Badge variant={previewCurriculum.status === 'published' ? 'default' : 'secondary'}>
                      {previewCurriculum.status === 'published' ? '발행됨' : '초안'}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    {previewCurriculum.status !== 'published' && (
                      <Button 
                        onClick={() => {
                          publishCurriculum(previewCurriculum.id);
                          setShowPreviewModal(false);
                        }}
                        className="bg-success hover:bg-success/90"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        강의로 발행
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
                      닫기
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* 쉬운 커리큘럼 생성 마법사 */}
        <Dialog open={showCreationWizard} onOpenChange={setShowCreationWizard}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                쉬운 커리큘럼 생성 마법사
              </DialogTitle>
            </DialogHeader>

            {/* 단계 표시기 */}
            <div className="flex items-center justify-between mb-6">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= creationStep 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step}
                  </div>
                  {step < 3 && (
                    <div className={`w-12 h-1 mx-2 ${
                      step < creationStep ? 'bg-primary' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* 단계별 제목 */}
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">
                {creationStep === 1 && '기본 정보 입력'}
                {creationStep === 2 && '강의 설정'}
                {creationStep === 3 && '강사 정보'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {creationStep === 1 && '커리큘럼의 제목, 설명, 카테고리를 입력하세요'}
                {creationStep === 2 && '난이도, 시간, 가격을 설정하세요'}
                {creationStep === 3 && '담당 강사 정보를 입력하세요'}
              </p>
            </div>

            {/* 단계별 폼 */}
            <div className="space-y-4">
              {creationStep === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">커리큘럼 제목 *</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => handleFormDataChange('title', e.target.value)}
                      placeholder="예: 반려견 기초 훈련 완전정복"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">커리큘럼 설명 *</label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => handleFormDataChange('description', e.target.value)}
                      placeholder="커리큘럼의 목표와 내용을 간단히 설명해주세요"
                      rows={3}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">카테고리 *</label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => handleFormDataChange('category', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="카테고리를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="기초훈련">기초훈련</SelectItem>
                        <SelectItem value="문제행동교정">문제행동교정</SelectItem>
                        <SelectItem value="어질리티">어질리티</SelectItem>
                        <SelectItem value="사회화">사회화</SelectItem>
                        <SelectItem value="전문가과정">전문가과정</SelectItem>
                        <SelectItem value="재활치료">재활치료</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {creationStep === 2 && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">난이도 *</label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(value) => handleFormDataChange('difficulty', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">초급 (처음 시작하는 분)</SelectItem>
                        <SelectItem value="intermediate">중급 (기본기가 있는 분)</SelectItem>
                        <SelectItem value="advanced">고급 (전문적인 과정)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">총 강의 시간 (분) *</label>
                    <Input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => handleFormDataChange('duration', parseInt(e.target.value) || 0)}
                      placeholder="예: 480 (8시간)"
                      min="0"
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">권장: 초급 180-360분, 중급 360-600분, 고급 600분 이상</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">수강료 (원) *</label>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) => handleFormDataChange('price', parseInt(e.target.value) || 0)}
                      placeholder="예: 150000"
                      min="0"
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">무료 강의는 0원으로 입력하세요</p>
                  </div>
                </>
              )}

              {creationStep === 3 && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">강사 이름 *</label>
                    <Input
                      value={formData.trainerName}
                      onChange={(e) => handleFormDataChange('trainerName', e.target.value)}
                      placeholder="예: 김민수"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">강사 이메일 *</label>
                    <Input
                      type="email"
                      value={formData.trainerEmail}
                      onChange={(e) => handleFormDataChange('trainerEmail', e.target.value)}
                      placeholder="예: trainer@example.com"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">강사 연락처</label>
                    <Input
                      value={formData.trainerPhone}
                      onChange={(e) => handleFormDataChange('trainerPhone', e.target.value)}
                      placeholder="예: 010-1234-5678"
                      className="w-full"
                    />
                  </div>
                  
                  {/* 미리보기 */}
                  <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <h4 className="font-semibold text-base mb-4 text-gray-900 dark:text-gray-100">생성될 커리큘럼 미리보기</h4>
                    <div className="space-y-3 text-base">
                      <div className="text-gray-900 dark:text-gray-100"><span className="font-semibold text-gray-700 dark:text-gray-300">제목:</span> <span className="ml-2">{formData.title}</span></div>
                      <div className="text-gray-900 dark:text-gray-100"><span className="font-semibold text-gray-700 dark:text-gray-300">카테고리:</span> <span className="ml-2">{formData.category}</span></div>
                      <div className="text-gray-900 dark:text-gray-100"><span className="font-semibold text-gray-700 dark:text-gray-300">난이도:</span> <span className="ml-2">{
                        formData.difficulty === 'beginner' ? '초급' :
                        formData.difficulty === 'intermediate' ? '중급' : '고급'
                      }</span></div>
                      <div className="text-gray-900 dark:text-gray-100"><span className="font-semibold text-gray-700 dark:text-gray-300">시간:</span> <span className="ml-2">{formData.duration}분 ({Math.floor(formData.duration / 60)}시간 {formData.duration % 60}분)</span></div>
                      <div className="text-gray-900 dark:text-gray-100"><span className="font-semibold text-gray-700 dark:text-gray-300">가격:</span> <span className="ml-2">₩{formData.price.toLocaleString()}</span></div>
                      <div className="text-gray-900 dark:text-gray-100"><span className="font-semibold text-gray-700 dark:text-gray-300">강사:</span> <span className="ml-2">{formData.trainerName}</span></div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 네비게이션 버튼 */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                onClick={handlePrevStep}
                variant="outline"
                disabled={creationStep === 1}
              >
                이전
              </Button>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowCreationWizard(false)}
                  variant="outline"
                >
                  취소
                </Button>
                
                {creationStep < 3 ? (
                  <Button
                    onClick={handleNextStep}
                    disabled={!validateCurrentStep()}
                    className="bg-primary hover:bg-primary/90"
                  >
                    다음
                  </Button>
                ) : (
                  <Button
                    onClick={handleCreateCurriculum}
                    disabled={!validateCurrentStep()}
                    className="bg-success hover:bg-success/90"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    커리큘럼 생성
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 파일 선택기 모달 */}
        <Dialog open={showFileSelector} onOpenChange={setShowFileSelector}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                첨부파일 자동 등록
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  커리큘럼 파일 선택 (복수 선택 가능)
                </label>
                <input
                  type="file"
                  multiple
                  accept=".hwp,.hwpx,.docx,.doc,.txt,.xlsx,.xls"
                  onChange={(e) => setSelectedFiles(e.target.files)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
                <div className="mt-2 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                  <h4 className="text-sm font-medium text-warning mb-2">📋 엑셀 파일 양식 안내</h4>
                  <div className="text-xs text-warning space-y-1">
                    <p><strong>컬럼 순서:</strong> 회차 | 제목 | 내용 | 설명 | 준비물 | 유료/무료</p>
                    <p><strong>유료/무료 컬럼:</strong> "유료" 또는 "무료"로 입력</p>
                    <p><strong>첫 번째 행:</strong> 커리큘럼 제목 (필수)</p>
                    <p><strong>두 번째 행:</strong> 커리큘럼 설명 (선택사항)</p>
                    <p><strong>세 번째 행부터:</strong> 각 회차별 모듈 정보</p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-warning/30">
                    <p className="text-xs text-warning">
                      <strong>⚠️ 주의:</strong> 양식이 맞지 않으면 오류가 발생할 수 있습니다. 
                      <button 
                        onClick={handleDownloadTemplate}
                        className="text-primary hover:text-primary/90 underline ml-1"
                      >
                        표준 양식 다운로드
                      </button>
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  지원 형식: .hwp, .hwpx, .docx, .doc, .txt, .xlsx, .xls
                </p>
              </div>
              
              {selectedFiles && selectedFiles.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium mb-2">선택된 파일:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {Array.from(selectedFiles).map((file, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowFileSelector(false);
                  setSelectedFiles(null);
                }}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                onClick={processAutoRegister}
                disabled={!selectedFiles || selectedFiles.length === 0 || isProcessingFile}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {isProcessingFile ? (
                  <>
                    <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    처리중...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    자동 등록
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 모듈 상세 편집 모달 */}
        {isEditingModule && editingModule && (
          <Dialog open={isEditingModule} onOpenChange={setIsEditingModule}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  강의 내용 상세 편집 - {editingModule.title}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* 기본 정보 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">강의 제목</label>
                    <Input
                      value={newModule.title}
                      onChange={(e) => setNewModule(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="예: 1강 - 기본 자세 익히기"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">수업 시간 (분)</label>
                    <Input
                      type="number"
                      value={newModule.duration}
                      onChange={(e) => setNewModule(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                      placeholder="60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">강의 설명</label>
                  <Textarea
                    value={newModule.description}
                    onChange={(e) => setNewModule(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="이 강의에서 배울 내용을 간략히 설명해주세요"
                    rows={3}
                  />
                </div>

                {/* 상세 강의 내용 */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    상세 강의 내용
                  </h3>
                  
                  <div className="space-y-4">
                    {/* 도입부 */}
                    <div>
                      <label className="block text-sm font-medium mb-2">도입부 (강의 시작 부분)</label>
                      <Textarea
                        value={newModule.detailedContent.introduction || ''}
                        onChange={(e) => setNewModule(prev => ({
                          ...prev,
                          detailedContent: { ...prev.detailedContent, introduction: e.target.value }
                        }))}
                        placeholder="이 강의를 시작하며 어떤 내용을 소개할지 작성해주세요"
                        rows={2}
                      />
                    </div>

                    {/* 주요 토픽들 */}
                    <div>
                      <label className="block text-sm font-medium mb-2">주요 토픽들</label>
                      {(newModule.detailedContent.mainTopics || []).map((topic, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <Input
                            value={topic}
                            onChange={(e) => {
                              const newTopics = [...(newModule.detailedContent.mainTopics || [])];
                              newTopics[index] = e.target.value;
                              setNewModule(prev => ({
                                ...prev,
                                detailedContent: { ...prev.detailedContent, mainTopics: newTopics }
                              }));
                            }}
                            placeholder={`주요 토픽 ${index + 1}`}
                          />
                          {(newModule.detailedContent.mainTopics || []).length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newTopics = (newModule.detailedContent.mainTopics || []).filter((_, i) => i !== index);
                                setNewModule(prev => ({
                                  ...prev,
                                  detailedContent: { ...prev.detailedContent, mainTopics: newTopics }
                                }));
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewModule(prev => ({
                            ...prev,
                            detailedContent: {
                              ...prev.detailedContent,
                              mainTopics: [...(prev.detailedContent.mainTopics || []), '']
                            }
                          }));
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        토픽 추가
                      </Button>
                    </div>

                    {/* 실습 내용 */}
                    <div>
                      <label className="block text-sm font-medium mb-2">실습 내용</label>
                      {(newModule.detailedContent.practicalExercises || []).map((exercise, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <Input
                            value={exercise}
                            onChange={(e) => {
                              const newExercises = [...(newModule.detailedContent.practicalExercises || [])];
                              newExercises[index] = e.target.value;
                              setNewModule(prev => ({
                                ...prev,
                                detailedContent: { ...prev.detailedContent, practicalExercises: newExercises }
                              }));
                            }}
                            placeholder={`실습 ${index + 1}`}
                          />
                          {(newModule.detailedContent.practicalExercises || []).length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newExercises = (newModule.detailedContent.practicalExercises || []).filter((_, i) => i !== index);
                                setNewModule(prev => ({
                                  ...prev,
                                  detailedContent: { ...prev.detailedContent, practicalExercises: newExercises }
                                }));
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewModule(prev => ({
                            ...prev,
                            detailedContent: {
                              ...prev.detailedContent,
                              practicalExercises: [...(prev.detailedContent.practicalExercises || []), '']
                            }
                          }));
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        실습 추가
                      </Button>
                    </div>

                    {/* 핵심 포인트 */}
                    <div>
                      <label className="block text-sm font-medium mb-2">핵심 포인트</label>
                      {(newModule.detailedContent.keyPoints || []).map((point, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <Input
                            value={point}
                            onChange={(e) => {
                              const newPoints = [...(newModule.detailedContent.keyPoints || [])];
                              newPoints[index] = e.target.value;
                              setNewModule(prev => ({
                                ...prev,
                                detailedContent: { ...prev.detailedContent, keyPoints: newPoints }
                              }));
                            }}
                            placeholder={`핵심 포인트 ${index + 1}`}
                          />
                          {(newModule.detailedContent.keyPoints || []).length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newPoints = (newModule.detailedContent.keyPoints || []).filter((_, i) => i !== index);
                                setNewModule(prev => ({
                                  ...prev,
                                  detailedContent: { ...prev.detailedContent, keyPoints: newPoints }
                                }));
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewModule(prev => ({
                            ...prev,
                            detailedContent: {
                              ...prev.detailedContent,
                              keyPoints: [...(prev.detailedContent.keyPoints || []), '']
                            }
                          }));
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        포인트 추가
                      </Button>
                    </div>

                    {/* 과제 */}
                    <div>
                      <label className="block text-sm font-medium mb-2">과제</label>
                      <Textarea
                        value={newModule.detailedContent.homework || ''}
                        onChange={(e) => setNewModule(prev => ({
                          ...prev,
                          detailedContent: { ...prev.detailedContent, homework: e.target.value }
                        }))}
                        placeholder="수강생들이 다음 강의까지 연습해야 할 과제를 작성해주세요"
                        rows={3}
                      />
                    </div>

                    {/* 준비물 */}
                    <div>
                      <label className="block text-sm font-medium mb-2">준비물/용품</label>
                      {(newModule.materials || []).map((material, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <Input
                            value={material}
                            onChange={(e) => {
                              const newMaterials = [...(newModule.materials || [])];
                              newMaterials[index] = e.target.value;
                              setNewModule(prev => ({ ...prev, materials: newMaterials }));
                            }}
                            placeholder={`준비물 ${index + 1} (예: 리드줄, 간식)`}
                          />
                          {(newModule.materials || []).length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newMaterials = (newModule.materials || []).filter((_, i) => i !== index);
                                setNewModule(prev => ({ ...prev, materials: newMaterials }));
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewModule(prev => ({
                            ...prev,
                            materials: [...(prev.materials || []), '']
                          }));
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        준비물 추가
                      </Button>
                    </div>

                    {/* 파일 첨부 */}
                    <div>
                      <label className="block text-sm font-medium mb-2">강의 자료 첨부</label>
                      <div className="space-y-2">
                        {(newModule.attachments || []).map((attachment, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                            <FileText className="w-4 h-4 text-primary" />
                            <span className="text-sm flex-1">{attachment.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newAttachments = (newModule.attachments || []).filter((_, i) => i !== index);
                                setNewModule(prev => ({ ...prev, attachments: newAttachments }));
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.hwp,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const newAttachment = {
                                  name: file.name,
                                  url: URL.createObjectURL(file),
                                  type: file.type
                                };
                                setNewModule(prev => ({
                                  ...prev,
                                  attachments: [...(prev.attachments || []), newAttachment]
                                }));
                              }
                            }}
                            className="hidden"
                            id="attachment-upload"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('attachment-upload')?.click()}
                          >
                            <Upload className="w-4 h-4 mr-1" />
                            파일 첨부
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                          PDF, Word, PowerPoint, HWP, 이미지 파일 등을 첨부할 수 있습니다.
                        </p>
                      </div>
                    </div>

                    {/* 학습 목표 */}
                    <div>
                      <label className="block text-sm font-medium mb-2">학습 목표</label>
                      {(newModule.objectives || []).map((objective, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <Input
                            value={objective}
                            onChange={(e) => {
                              const newObjectives = [...(newModule.objectives || [])];
                              newObjectives[index] = e.target.value;
                              setNewModule(prev => ({ ...prev, objectives: newObjectives }));
                            }}
                            placeholder={`학습 목표 ${index + 1}`}
                          />
                          {(newModule.objectives || []).length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newObjectives = (newModule.objectives || []).filter((_, i) => i !== index);
                                setNewModule(prev => ({ ...prev, objectives: newObjectives }));
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewModule(prev => ({
                            ...prev,
                            objectives: [...(prev.objectives || []), '']
                          }));
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        목표 추가
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-6 border-t">
                  <Button variant="outline" onClick={() => setIsEditingModule(false)}>
                    취소
                  </Button>
                  <Button onClick={handleSaveModule}>
                    <Save className="w-4 h-4 mr-1" />
                    저장
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* 상품 정보 팝업 다이얼로그 */}
        {showProductInfo && selectedProduct && (
          <Dialog open={showProductInfo} onOpenChange={setShowProductInfo}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  상품 정보
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* 상품 이미지 */}
                <div className="flex justify-center">
                  <img 
                    src={selectedProduct.imageUrl} 
                    alt={selectedProduct.name}
                    className="w-full max-w-md h-64 object-cover rounded-lg shadow-md"
                  />
                </div>

                {/* 상품 기본 정보 */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedProduct.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{selectedProduct.brand}</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-primary">
                      ₩{selectedProduct.price.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`w-4 h-4 ${i < Math.floor(selectedProduct.rating) ? 'text-warning' : 'text-gray-300'}`}>
                            ⭐
                          </div>
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">({selectedProduct.reviewCount}개 리뷰)</span>
                    </div>
                    <Badge variant={selectedProduct.availability === 'in_stock' ? 'default' : 'secondary'}>
                      {selectedProduct.availability === 'in_stock' ? '재고 있음' : 
                       selectedProduct.availability === 'out_of_stock' ? '품절' : '예약 주문'}
                    </Badge>
                  </div>
                </div>

                {/* 상품 설명 */}
                <div>
                  <h4 className="font-semibold mb-2">상품 설명</h4>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{selectedProduct.description}</p>
                </div>

                {/* 상품 사양 */}
                <div>
                  <h4 className="font-semibold mb-2">상품 사양</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(selectedProduct.specifications).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{key}:</span>
                        <span className="text-sm text-gray-900 dark:text-white">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 카테고리 */}
                <div>
                  <Badge variant="outline" className="text-sm">
                    {selectedProduct.category}
                  </Badge>
                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowProductInfo(false)}
                    className="flex-1"
                  >
                    닫기
                  </Button>
                  <Button 
                    className="flex-1 bg-primary hover:bg-primary/90"
                    onClick={() => {
                      // 실제 구매 페이지로 이동하는 로직 구현
                      toast({
                        title: "쇼핑몰 연결",
                        description: "상품 구매 페이지로 이동합니다.",
                      });
                      setShowProductInfo(false);
                    }}
                  >
                    <Package className="w-4 h-4 mr-2" />
                    구매하기
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* 모듈 편집 모달 */}
        <Dialog open={isEditingModule} onOpenChange={setIsEditingModule}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>모듈 편집</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">모듈 제목 *</label>
                  <Input
                    value={newModule.title}
                    onChange={(e) => setNewModule(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="모듈 제목을 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">소요 시간 (분) *</label>
                  <Input
                    type="number"
                    value={newModule.duration}
                    onChange={(e) => setNewModule(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                    placeholder="예: 60"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">모듈 설명</label>
                <Textarea
                  value={newModule.description}
                  onChange={(e) => setNewModule(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="모듈의 내용을 간단히 설명하세요"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">학습 목표</label>
                {newModule.objectives.map((objective, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      value={objective}
                      onChange={(e) => {
                        const newObjectives = [...newModule.objectives];
                        newObjectives[index] = e.target.value;
                        setNewModule(prev => ({ ...prev, objectives: newObjectives }));
                      }}
                      placeholder={`학습 목표 ${index + 1}`}
                    />
                    {newModule.objectives.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newObjectives = newModule.objectives.filter((_, i) => i !== index);
                          setNewModule(prev => ({ ...prev, objectives: newObjectives }));
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewModule(prev => ({
                      ...prev,
                      objectives: [...prev.objectives, '']
                    }));
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  목표 추가
                </Button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">준비물/용품</label>
                {newModule.materials.map((material, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      value={material}
                      onChange={(e) => {
                        const newMaterials = [...newModule.materials];
                        newMaterials[index] = e.target.value;
                        setNewModule(prev => ({ ...prev, materials: newMaterials }));
                      }}
                      placeholder={`준비물 ${index + 1} (예: 리드줄, 간식)`}
                    />
                    {newModule.materials.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newMaterials = newModule.materials.filter((_, i) => i !== index);
                          setNewModule(prev => ({ ...prev, materials: newMaterials }));
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewModule(prev => ({
                      ...prev,
                      materials: [...prev.materials, '']
                    }));
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  준비물 추가
                </Button>
              </div>

              {/* 파일 첨부 섹션 */}
              <div>
                <label className="block text-sm font-medium mb-2">강의 자료 첨부</label>
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary/50 hover:bg-primary/10 transition-colors"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.avi,.mov,.mkv,.jpg,.jpeg,.png,.gif"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="w-8 h-8 text-gray-400" />
                    <div className="text-sm">
                      <span className="font-medium text-primary">파일 선택</span>
                      <span className="text-gray-500"> 또는 드래그 앤 드롭</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      지원 형식: PDF, DOC, PPT, MP4, AVI, MOV, JPG, PNG (최대 100MB)
                    </p>
                  </label>
                </div>
                
                {/* 업로드된 파일 목록 */}
                {newModule.attachments && newModule.attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium">첨부된 파일 ({newModule.attachments.length}개)</h4>
                    {newModule.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          {attachment.type?.startsWith('video/') ? (
                            <Video className="w-5 h-5 text-destructive" />
                          ) : attachment.type?.startsWith('image/') ? (
                            <FileText className="w-5 h-5 text-success" />
                          ) : (
                            <FileText className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {attachment.size ? `${(attachment.size / 1024 / 1024).toFixed(1)}MB` : '크기 정보 없음'}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newAttachments = newModule.attachments.filter((_, i) => i !== index);
                            setNewModule(prev => ({ ...prev, attachments: newAttachments }));
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsEditingModule(false)}
              >
                취소
              </Button>
              <Button
                onClick={handleSaveModule}
                className="bg-primary hover:bg-primary/90"
              >
                <Save className="w-4 h-4 mr-2" />
                저장
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* AI 커리큘럼 미리보기 모달 */}
        <Dialog open={showAiPreview} onOpenChange={setShowAiPreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                AI 커리큘럼 분석 결과
              </DialogTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                AI가 분석한 커리큘럼을 확인하고 필요한 부분을 수정한 후 적용하세요.
              </p>
            </DialogHeader>

            {aiAnalysisResult && (
              <div className="space-y-6">
                {/* 기본 정보 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">커리큘럼 제목</label>
                    <Input
                      value={aiAnalysisResult.curriculum?.title || ''}
                      onChange={(e) => setAiAnalysisResult(prev => ({
                        ...prev,
                        curriculum: { ...prev.curriculum, title: e.target.value }
                      }))}
                      placeholder="커리큘럼 제목"
                      data-testid="input-ai-curriculum-title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">카테고리</label>
                    <Select
                      value={aiAnalysisResult.curriculum?.category || ''}
                      onValueChange={(value) => setAiAnalysisResult(prev => ({
                        ...prev,
                        curriculum: { ...prev.curriculum, category: value }
                      }))}
                    >
                      <SelectTrigger data-testid="select-ai-curriculum-category">
                        <SelectValue placeholder="카테고리 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="기초훈련">기초훈련</SelectItem>
                        <SelectItem value="문제행동교정">문제행동교정</SelectItem>
                        <SelectItem value="어질리티">어질리티</SelectItem>
                        <SelectItem value="사회화">사회화</SelectItem>
                        <SelectItem value="전문가과정">전문가과정</SelectItem>
                        <SelectItem value="재활치료">재활치료</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">커리큘럼 설명</label>
                  <Textarea
                    value={aiAnalysisResult.curriculum?.description || ''}
                    onChange={(e) => setAiAnalysisResult(prev => ({
                      ...prev,
                      curriculum: { ...prev.curriculum, description: e.target.value }
                    }))}
                    placeholder="커리큘럼 설명"
                    rows={3}
                    data-testid="textarea-ai-curriculum-description"
                  />
                </div>

                {/* 가격 정보 */}
                {aiAnalysisResult.pricing && (
                  <div className="bg-warning/10 dark:bg-warning/20 p-4 rounded-lg border border-warning/30 dark:border-warning/50">
                    <h3 className="font-semibold text-warning dark:text-warning/70 mb-2 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      AI 가격 제안
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-warning dark:text-warning">제안 가격</p>
                        <p className="text-lg font-bold text-warning dark:text-warning/70">
                          ₩{aiAnalysisResult.pricing.suggestedPrice?.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-warning dark:text-warning">가격 범위</p>
                        <p className="text-sm text-warning dark:text-warning/70">
                          ₩{aiAnalysisResult.pricing.priceRange?.min?.toLocaleString()} - 
                          ₩{aiAnalysisResult.pricing.priceRange?.max?.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-warning dark:text-warning">신뢰도</p>
                        <p className="text-sm text-warning dark:text-warning/70">
                          {Math.round((aiAnalysisResult.pricing.confidence || 0) * 100)}%
                        </p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-base text-warning dark:text-warning mb-1">가격 산정 근거:</p>
                      <p className="text-base text-warning dark:text-warning/70">
                        {aiAnalysisResult.pricing.reasoning}
                      </p>
                    </div>
                  </div>
                )}

                {/* 모듈 목록 */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    커리큘럼 모듈 ({aiAnalysisResult.curriculum?.modules?.length || 0}개)
                  </h3>
                  <div className="space-y-4 max-h-60 overflow-y-auto">
                    {aiAnalysisResult.curriculum?.modules?.map((module, index) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">모듈 제목</label>
                            <Input
                              value={module.title || ''}
                              onChange={(e) => {
                                const newModules = [...(aiAnalysisResult.curriculum?.modules || [])];
                                newModules[index] = { ...newModules[index], title: e.target.value };
                                setAiAnalysisResult(prev => ({
                                  ...prev,
                                  curriculum: { ...prev.curriculum, modules: newModules }
                                }));
                              }}
                              placeholder="모듈 제목"
                              className="text-sm"
                              data-testid={`input-ai-module-title-${index}`}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">소요 시간 (분)</label>
                            <Input
                              type="number"
                              value={module.duration || 0}
                              onChange={(e) => {
                                const newModules = [...(aiAnalysisResult.curriculum?.modules || [])];
                                newModules[index] = { ...newModules[index], duration: parseInt(e.target.value) || 0 };
                                setAiAnalysisResult(prev => ({
                                  ...prev,
                                  curriculum: { ...prev.curriculum, modules: newModules }
                                }));
                              }}
                              placeholder="60"
                              className="text-sm"
                              data-testid={`input-ai-module-duration-${index}`}
                            />
                          </div>
                        </div>
                        <div className="mt-2">
                          <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">모듈 설명</label>
                          <Textarea
                            value={module.description || ''}
                            onChange={(e) => {
                              const newModules = [...(aiAnalysisResult.curriculum?.modules || [])];
                              newModules[index] = { ...newModules[index], description: e.target.value };
                              setAiAnalysisResult(prev => ({
                                ...prev,
                                curriculum: { ...prev.curriculum, modules: newModules }
                              }));
                            }}
                            placeholder="모듈 설명"
                            rows={2}
                            className="text-sm"
                            data-testid={`textarea-ai-module-description-${index}`}
                          />
                        </div>
                        {module.objectives && module.objectives.length > 0 && (
                          <div className="mt-2">
                            <label className="block text-xs font-medium mb-1">학습 목표</label>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {module.objectives.map((objective, objIndex) => (
                                <div key={objIndex} className="flex items-start gap-1">
                                  <span className="text-primary mt-1">•</span>
                                  <span>{objective}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 원본 파일 정보 */}
                {aiAnalysisResult.sourceFile && (
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      원본 파일 정보
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-base text-gray-700 dark:text-gray-300">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">파일명</p>
                        <p className="font-medium">{aiAnalysisResult.sourceFile.name}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">파일 크기</p>
                        <p className="font-medium">{(aiAnalysisResult.sourceFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">추출된 텍스트</p>
                        <p className="font-medium">{aiAnalysisResult.sourceFile.metadata?.extractedTextLength || 0} 자</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 액션 버튼 */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAiPreview(false);
                      setAiAnalysisResult(null);
                    }}
                    data-testid="button-ai-preview-cancel"
                  >
                    취소
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        // AI 생성 커리큘럼을 기본 폼에 적용
                        const curriculum = aiAnalysisResult.curriculum;
                        const pricing = aiAnalysisResult.pricing;
                        
                        setNewCurriculum(prev => ({
                          ...prev,
                          title: curriculum.title || '',
                          description: curriculum.description || '',
                          category: curriculum.category || '',
                          difficulty: curriculum.difficulty || 'intermediate',
                          duration: curriculum.duration || 0,
                          price: pricing?.suggestedPrice || 0,
                          trainerName: curriculum.trainerName || '관리자',
                          modules: curriculum.modules || []
                        }));

                        // 새 커리큘럼 생성 모드로 전환
                        setIsCreating(true);
                        setSelectedCurriculum(null);
                        setShowAiPreview(false);

                        toast({
                          title: "AI 커리큘럼 적용 완료",
                          description: "AI가 생성한 커리큘럼이 편집기에 적용되었습니다.",
                          variant: "default"
                        });
                      } catch (error) {
                        toast({
                          title: "적용 실패",
                          description: "커리큘럼 적용 중 오류가 발생했습니다.",
                          variant: "destructive"
                        });
                      }
                    }}
                    className="bg-primary hover:bg-primary/90"
                    data-testid="button-ai-preview-apply"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    커리큘럼 적용
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        const saveData = {
                          curriculum: aiAnalysisResult.curriculum,
                          pricing: aiAnalysisResult.pricing,
                          sourceInfo: aiAnalysisResult.sourceFile
                        };

                        const response = await fetch('/api/ai/curriculum/save-draft', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(saveData)
                        });

                        if (response.ok) {
                          const result = await response.json();
                          
                          // 캐시 무효화
                          queryClient.invalidateQueries({ queryKey: ['/api/admin/curriculum'] });
                          
                          setShowAiPreview(false);
                          setAiAnalysisResult(null);

                          toast({
                            title: "AI 커리큘럼 저장 완료",
                            description: "AI가 생성한 커리큘럼이 임시저장되었습니다.",
                            variant: "default"
                          });
                        } else {
                          throw new Error('저장 실패');
                        }
                      } catch (error) {
                        toast({
                          title: "저장 실패",
                          description: "커리큘럼 저장 중 오류가 발생했습니다.",
                          variant: "destructive"
                        });
                      }
                    }}
                    className="bg-success hover:bg-success/90"
                    data-testid="button-ai-preview-save"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    임시저장
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}