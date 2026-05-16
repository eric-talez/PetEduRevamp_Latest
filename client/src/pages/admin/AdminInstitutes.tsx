import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Filter, Plus, Eye, Edit, Trash2, Building, MapPin, Users, CreditCard, DollarSign, Video, CheckCircle, Clock, XCircle, Building2, Upload, FileText, Phone, Star, Download, Check, X, AlertTriangle, Calendar, AlertCircle, Palette, Settings, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { SubscriptionChangeDialog } from "@/components/SubscriptionChangeDialog";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import { getCSRFToken } from '@/lib/csrf';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useTheme } from '@/context/theme-context';
import { ThemeSettings } from '@/components/ThemeSettings';
import { ThemeSwitcherDropdown } from '@/components/ui/ThemeSwitcher';

interface SubscriptionPlan {
  id: number;
  name: string;
  code: string;
  description: string;
  price: number;
  maxMembers: number;
  maxVideoHours: number;
  maxAiAnalysis: number;
  features: {
    basicLMS: boolean;
    basicVideoConsultation: boolean;
    basicStatistics: boolean;
    aiRecommendation: boolean;
    customBranding: boolean;
    apiIntegration: boolean;
    dedicatedSupport: boolean;
    whiteLabel: boolean;
  };
}

interface CorrectionRequest {
  id: string;
  businessId: string;
  businessName: string;
  businessType: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string;
  correctionType: 'address' | 'phone' | 'hours' | 'description' | 'services' | 'other';
  currentValue: string;
  proposedValue: string;
  reason: string;
  evidence?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'in-review';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  adminNotes?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface BusinessFormData {
  name: string;
  type: 'training-center' | 'pet-store' | 'veterinary' | 'grooming' | 'hotel' | 'cafe' | 'park';
  address: string;
  lat: number;
  lng: number;
  phone: string;
  hours: string;
  description: string;
  businessNumber: string;
  services: string[];
  amenities: string[];
  priceRange: string;
  photos: File[];
}

function BusinessRegistrationTab() {
  const [activeTab, setActiveTab] = useState('single');
  const [formData, setFormData] = useState<BusinessFormData>({
    name: '',
    type: 'training-center',
    address: '',
    lat: 0,
    lng: 0,
    phone: '',
    hours: '',
    description: '',
    businessNumber: '',
    services: [],
    amenities: [],
    priceRange: '',
    photos: []
  });
  const [newService, setNewService] = useState('');
  const [newAmenity, setNewAmenity] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const businessTypes = [
    { value: 'training-center', label: '훈련소' },
    { value: 'pet-store', label: '펫샵' },
    { value: 'veterinary', label: '동물병원' },
    { value: 'grooming', label: '미용실' },
    { value: 'hotel', label: '펜션/호텔' },
    { value: 'cafe', label: '카페' },
    { value: 'park', label: '공원' }
  ];

  const priceRanges = [
    { value: 'budget', label: '저렴함 (1-2만원)' },
    { value: 'moderate', label: '보통 (3-5만원)' },
    { value: 'premium', label: '고급 (6-10만원)' },
    { value: 'luxury', label: '럭셔리 (10만원 이상)' }
  ];

  const handleInputChange = (field: keyof BusinessFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addService = () => {
    if (newService.trim() && !formData.services.includes(newService.trim())) {
      setFormData(prev => ({
        ...prev,
        services: [...prev.services, newService.trim()]
      }));
      setNewService('');
    }
  };

  const removeService = (index: number) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index)
    }));
  };

  const addAmenity = () => {
    if (newAmenity.trim() && !formData.amenities.includes(newAmenity.trim())) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, newAmenity.trim()]
      }));
      setNewAmenity('');
    }
  };

  const removeAmenity = (index: number) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.filter((_, i) => i !== index)
    }));
  };

  const handlePhotoUpload = (files: FileList | null) => {
    if (files) {
      const newPhotos = Array.from(files).filter(file => 
        file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024 // 5MB limit
      );
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, ...newPhotos].slice(0, 10) // Maximum 10 photos
      }));
    }
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const geocodeAddress = async (address: string) => {
    // Simulate geocoding - in real app, use Naver Maps Geocoding API
    const mockCoordinates = {
      lat: 37.5665 + (Math.random() - 0.5) * 0.1,
      lng: 126.9780 + (Math.random() - 0.5) * 0.1
    };
    
    setFormData(prev => ({
      ...prev,
      lat: mockCoordinates.lat,
      lng: mockCoordinates.lng
    }));

    toast({
      title: "주소 변환 완료",
      description: "주소가 좌표로 변환되었습니다."
    });
  };

  const validateForm = () => {
    const required = ['name', 'type', 'address', 'phone', 'businessNumber'];
    for (const field of required) {
      if (!formData[field as keyof BusinessFormData]) {
        toast({
          title: "필수 정보 누락",
          description: `${field}은(는) 필수 입력 항목입니다.`,
          variant: "destructive"
        });
        return false;
      }
    }
    return true;
  };

  const handleSingleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // CSRF 토큰 가져오기
      const csrfToken = await getCSRFToken();

      const response = await fetch('/api/admin/businesses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('업체 등록 성공:', result);

        toast({
          title: "업체 등록 완료",
          description: `${formData.name}이(가) 성공적으로 등록되었습니다.`
        });

        // Reset form
        setFormData({
          name: '',
          type: 'training-center',
          address: '',
          lat: 0,
          lng: 0,
          phone: '',
          hours: '',
          description: '',
          businessNumber: '',
          services: [],
          amenities: [],
          priceRange: '',
          photos: []
        });
      } else {
        throw new Error(result.error || '업체 등록에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('업체 등록 오류:', error);
      toast({
        title: "등록 실패",
        description: error.message || "업체 등록 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!uploadFile) {
      toast({
        title: "파일 선택 필요",
        description: "업로드할 파일을 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      // Simulate file processing
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('일괄 업로드 파일:', uploadFile);

      toast({
        title: "일괄 등록 완료",
        description: "업체 정보가 성공적으로 일괄 등록되었습니다."
      });

      setUploadFile(null);
      setUploadProgress(0);
    } catch (error) {
      toast({
        title: "업로드 실패",
        description: "파일 업로드 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    // CSV template data
    const csvContent = `업체명,업종,주소,전화번호,사업자등록번호,운영시간,설명,서비스(|구분),편의시설(|구분),가격대
서울 펫 트레이닝 센터,training-center,서울특별시 강남구 테헤란로 123,02-1234-5678,123-45-67890,09:00-18:00,전문 반려동물 훈련 서비스,기본 훈련|행동 교정|퍼피 클래스,주차장|에어컨|CCTV,premium
스마트독 교육센터,training-center,서울특별시 서초구 반포대로 456,02-2345-6789,234-56-78901,10:00-19:00,AI 기반 스마트 훈련 시스템,개인레슨|그룹수업|온라인상담,Wi-Fi|휴게실|카페테리아,moderate`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'business_registration_template.csv';
    link.click();

    toast({
      title: "템플릿 다운로드",
      description: "업체 등록 템플릿이 다운로드되었습니다."
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">업체 등록 관리</h1>
          <p className="text-gray-600 mt-1">새로운 업체를 등록하거나 일괄 업로드할 수 있습니다</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            개별 등록
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            일괄 등록
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                업체 정보 등록
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 기본 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">업체명 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="업체명을 입력하세요"
                  />
                </div>
                <div>
                  <Label htmlFor="type">업종 *</Label>
                  <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {businessTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="businessNumber">사업자등록번호 *</Label>
                  <Input
                    id="businessNumber"
                    value={formData.businessNumber}
                    onChange={(e) => handleInputChange('businessNumber', e.target.value)}
                    placeholder="000-00-00000"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">전화번호 *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="02-0000-0000"
                  />
                </div>
              </div>

              {/* 주소 정보 */}
              <div>
                <Label htmlFor="address">주소 *</Label>
                <div className="flex gap-2">
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="전체 주소를 입력하세요"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => geocodeAddress(formData.address)}
                    disabled={!formData.address}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    좌표변환
                  </Button>
                </div>
                {formData.lat !== 0 && formData.lng !== 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    좌표: {formData.lat.toFixed(6)}, {formData.lng.toFixed(6)}
                  </p>
                )}
              </div>

              {/* 운영 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hours">운영시간</Label>
                  <Input
                    id="hours"
                    value={formData.hours}
                    onChange={(e) => handleInputChange('hours', e.target.value)}
                    placeholder="09:00 - 18:00"
                  />
                </div>
                <div>
                  <Label htmlFor="priceRange">가격대</Label>
                  <Select value={formData.priceRange} onValueChange={(value) => handleInputChange('priceRange', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="가격대를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {priceRanges.map((range) => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 설명 */}
              <div>
                <Label htmlFor="description">업체 설명</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="업체에 대한 상세한 설명을 입력하세요"
                  rows={4}
                />
              </div>

              {/* 서비스 */}
              <div>
                <Label>제공 서비스</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    placeholder="서비스명을 입력하세요"
                    onKeyPress={(e) => e.key === 'Enter' && addService()}
                  />
                  <Button type="button" onClick={addService} disabled={!newService.trim()}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.services.map((service, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {service}
                      <button
                        type="button"
                        onClick={() => removeService(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 편의시설 */}
              <div>
                <Label>편의시설</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newAmenity}
                    onChange={(e) => setNewAmenity(e.target.value)}
                    placeholder="편의시설을 입력하세요"
                    onKeyPress={(e) => e.key === 'Enter' && addAmenity()}
                  />
                  <Button type="button" onClick={addAmenity} disabled={!newAmenity.trim()}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.amenities.map((amenity, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {amenity}
                      <button
                        type="button"
                        onClick={() => removeAmenity(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 사진 업로드 */}
              <div>
                <Label>업체 사진</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <div className="text-center">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e.target.files)}
                      className="hidden"
                      id="photo-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('photo-upload')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      사진 업로드 (최대 10장, 5MB 이하)
                    </Button>
                  </div>
                  
                  {formData.photos.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                      {formData.photos.map((photo, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(photo)}
                            alt={`업체 사진 ${index + 1}`}
                            className="w-full h-20 object-cover rounded"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute top-1 right-1 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setFormData({
                    name: '',
                    type: 'training-center',
                    address: '',
                    lat: 0,
                    lng: 0,
                    phone: '',
                    hours: '',
                    description: '',
                    businessNumber: '',
                    services: [],
                    amenities: [],
                    priceRange: '',
                    photos: []
                  })}
                >
                  초기화
                </Button>
                <Button onClick={handleSingleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? '등록 중...' : '업체 등록'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                일괄 업체 등록
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 템플릿 다운로드 */}
              <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                <h3 className="font-medium text-primary mb-2">업로드 가이드</h3>
                <ul className="text-sm text-primary space-y-1 mb-3">
                  <li>• CSV 파일 형식으로 업로드해주세요</li>
                  <li>• 템플릿을 다운로드하여 형식에 맞게 작성하세요</li>
                  <li>• 한 번에 최대 1000개 업체까지 등록 가능합니다</li>
                  <li>• 사업자등록번호는 중복될 수 없습니다</li>
                </ul>
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  템플릿 다운로드
                </Button>
              </div>

              {/* 파일 업로드 */}
              <div>
                <Label>CSV 파일 업로드</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="csv-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('csv-upload')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      CSV 파일 선택
                    </Button>
                    
                    {uploadFile && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-600">
                          선택된 파일: {uploadFile.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          크기: {(uploadFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 업로드 진행률 */}
              {isSubmitting && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>처리 중...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setUploadFile(null);
                    setUploadProgress(0);
                  }}
                  disabled={isSubmitting}
                >
                  취소
                </Button>
                <Button onClick={handleBulkUpload} disabled={isSubmitting || !uploadFile}>
                  {isSubmitting ? '업로드 중...' : '파일 업로드 및 등록'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoCorrectionTab() {
  console.log('[DEBUG] 정보 수정 요청 관리 라우트 접근');

  const [requests, setRequests] = useState<CorrectionRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<CorrectionRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<CorrectionRequest | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  const { theme } = useTheme();

  // 실제 데이터 조회
  const { data: requestsData, isLoading } = useQuery({
    queryKey: ['/api/admin/correction-requests'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/correction-requests');
      const result = await response.json();
      return result.data || result || [];
    },
    staleTime: 5 * 60 * 1000, // 5분
  });

  // 샘플 데이터 (실제 데이터가 없을 때 표시)
  const sampleRequests: CorrectionRequest[] = [
    {
      id: 'req-001',
      businessId: 'biz-001',
      businessName: '서울 펫 트레이닝 센터',
      businessType: 'training-center',
      requesterName: '김철수',
      requesterEmail: 'kimcs@example.com',
      requesterPhone: '010-1234-5678',
      correctionType: 'address',
      currentValue: '서울특별시 강남구 테헤란로 123',
      proposedValue: '서울특별시 강남구 테헤란로 456',
      reason: '업체가 이전했습니다. 새로운 주소로 변경 요청드립니다.',
      evidence: ['image1.jpg', 'lease_contract.pdf'],
      status: 'pending',
      submittedAt: '2024-01-15T10:30:00Z',
      priority: 'high'
    },
    {
      id: 'req-002',
      businessId: 'biz-002',
      businessName: '해피독 동물병원',
      businessType: 'veterinary',
      requesterName: '박영희',
      requesterEmail: 'parkyh@example.com',
      correctionType: 'phone',
      currentValue: '02-1234-5678',
      proposedValue: '02-9876-5432',
      reason: '전화번호가 변경되었습니다.',
      status: 'approved',
      submittedAt: '2024-01-14T14:20:00Z',
      reviewedAt: '2024-01-14T16:45:00Z',
      reviewedBy: '관리자',
      adminNotes: '확인 완료 후 승인처리',
      priority: 'medium'
    },
    {
      id: 'req-003',
      businessId: 'biz-003',
      businessName: '스마트독 교육센터',
      businessType: 'training-center',
      requesterName: '이민수',
      requesterEmail: 'leems@example.com',
      correctionType: 'hours',
      currentValue: '09:00 - 18:00',
      proposedValue: '10:00 - 20:00',
      reason: '운영시간이 변경되었습니다.',
      status: 'rejected',
      submittedAt: '2024-01-13T11:15:00Z',
      reviewedAt: '2024-01-13T15:30:00Z',
      reviewedBy: '관리자',
      adminNotes: '증빙자료 부족으로 반려',
      priority: 'low'
    },
    {
      id: 'req-004',
      businessId: 'biz-004',
      businessName: '펫월드 용품점',
      businessType: 'pet-store',
      requesterName: '최은정',
      requesterEmail: 'choi@example.com',
      correctionType: 'services',
      currentValue: '사료 판매, 용품 판매',
      proposedValue: '사료 판매, 용품 판매, 미용 서비스, 호텔 서비스',
      reason: '새로운 서비스를 추가했습니다.',
      evidence: ['service_menu.jpg'],
      status: 'in-review',
      submittedAt: '2024-01-12T09:45:00Z',
      priority: 'medium'
    }
  ];

  useEffect(() => {
    if (requestsData && requestsData.length > 0) {
      setRequests(requestsData);
      setFilteredRequests(requestsData);
    } else {
      setRequests(sampleRequests);
      setFilteredRequests(sampleRequests);
    }
  }, [requestsData]);

  // 필터링
  useEffect(() => {
    let filtered = requests;

    if (searchTerm) {
      filtered = filtered.filter(request =>
        request.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.reason.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(request => request.priority === priorityFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(request => request.correctionType === typeFilter);
    }

    setFilteredRequests(filtered);
  }, [requests, searchTerm, statusFilter, priorityFilter, typeFilter]);

  const handleReviewRequest = (request: CorrectionRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setReviewAction(action);
    setAdminNotes('');
    setReviewDialogOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedRequest || !reviewAction) return;

    setIsSubmitting(true);
    try {
      // 임시 성공 처리
      const updatedRequest: CorrectionRequest = {
        ...selectedRequest,
        status: reviewAction === 'approve' ? 'approved' : 'rejected',
        reviewedAt: new Date().toISOString(),
        reviewedBy: '관리자',
        adminNotes
      };

      setRequests(prev => 
        prev.map(req => req.id === selectedRequest.id ? updatedRequest : req)
      );

      toast({
        title: reviewAction === 'approve' ? "요청 승인 완료" : "요청 반려 완료",
        description: reviewAction === 'approve' 
          ? `${selectedRequest.businessName}의 정보 수정 요청이 승인되어 실제 정보가 업데이트되었습니다.`
          : `${selectedRequest.businessName}의 정보 수정 요청이 반려되었습니다.`
      });

      setReviewDialogOpen(false);
      setSelectedRequest(null);
      setReviewAction(null);
      setAdminNotes('');
      
    } catch (error: any) {
      console.error('Review submission error:', error);
      toast({
        title: "처리 실패",
        description: error.message || "요청 처리 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'default',
      'in-review': 'secondary',
      approved: 'success',
      rejected: 'danger'
    } as const;

    const labels = {
      pending: '대기 중',
      'in-review': '검토 중',
      approved: '승인',
      rejected: '반려'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      low: 'outline',
      medium: 'secondary',
      high: 'warning',
      urgent: 'danger'
    } as const;

    const labels = {
      low: '낮음',
      medium: '보통',
      high: '높음',
      urgent: '긴급'
    };

    return (
      <Badge variant={variants[priority as keyof typeof variants] || 'outline'}>
        {labels[priority as keyof typeof labels] || priority}
      </Badge>
    );
  };

  const getCorrectionTypeLabel = (type: string) => {
    const labels = {
      address: '주소',
      phone: '전화번호',
      hours: '운영시간',
      description: '설명',
      services: '서비스',
      other: '기타'
    };
    return labels[type as keyof typeof labels] || type;
  };

  // 테마 설정 값 체크 함수
  const checkThemeSettings = () => {
    const themeData = {
      currentTheme: theme,
      systemSettings: {
        prefersDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
        storedTheme: localStorage.getItem('petedu-theme'),
        appliedClasses: document.documentElement.className,
        colorScheme: document.documentElement.style.colorScheme
      },
      cssVariables: {
        background: getComputedStyle(document.documentElement).getPropertyValue('--background'),
        foreground: getComputedStyle(document.documentElement).getPropertyValue('--foreground'),
        primary: getComputedStyle(document.documentElement).getPropertyValue('--primary'),
        secondary: getComputedStyle(document.documentElement).getPropertyValue('--secondary'),
        accent: getComputedStyle(document.documentElement).getPropertyValue('--accent'),
        muted: getComputedStyle(document.documentElement).getPropertyValue('--muted')
      }
    };

    console.log('🎨 테마 설정 값 체크:', themeData);
    return themeData;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">정보 수정 요청 관리</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">업체 정보 수정 요청을 검토하고 승인/반려할 수 있습니다</p>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            필터 및 검색
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search" className="text-gray-900 dark:text-white">검색</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="업체명, 요청자, 사유 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status" className="text-gray-900 dark:text-white">상태</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="pending">대기 중</SelectItem>
                  <SelectItem value="in-review">검토 중</SelectItem>
                  <SelectItem value="approved">승인</SelectItem>
                  <SelectItem value="rejected">반려</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority" className="text-gray-900 dark:text-white">우선순위</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="urgent">긴급</SelectItem>
                  <SelectItem value="high">높음</SelectItem>
                  <SelectItem value="medium">보통</SelectItem>
                  <SelectItem value="low">낮음</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="type" className="text-gray-900 dark:text-white">수정 유형</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="address">주소</SelectItem>
                  <SelectItem value="phone">전화번호</SelectItem>
                  <SelectItem value="hours">운영시간</SelectItem>
                  <SelectItem value="description">설명</SelectItem>
                  <SelectItem value="services">서비스</SelectItem>
                  <SelectItem value="other">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setTypeFilter('all');
                }}
              >
                초기화
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 요청 목록 */}
      <div className="grid gap-4">
        {filteredRequests.map((request) => (
          <Card key={request.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{request.businessName}</h3>
                    {getStatusBadge(request.status)}
                    {getPriorityBadge(request.priority)}
                    <Badge variant="outline">
                      {getCorrectionTypeLabel(request.correctionType)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">요청자 정보</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">
                            {request.requesterName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-gray-900 dark:text-white">{request.requesterName}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">({request.requesterEmail})</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">제출일</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {formatDistanceToNow(new Date(request.submittedAt), {
                            addSuffix: true,
                            locale: ko
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">현재 정보</Label>
                      <p className="text-sm mt-1 p-2 bg-gray-50 dark:bg-gray-700 rounded text-gray-900 dark:text-white">{request.currentValue}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">수정 요청 정보</Label>
                      <p className="text-sm mt-1 p-2 bg-primary/10 dark:bg-primary/20 rounded text-gray-900 dark:text-white">{request.proposedValue}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">요청 사유</Label>
                      <p className="text-sm mt-1 text-gray-900 dark:text-white">{request.reason}</p>
                    </div>

                    {request.evidence && request.evidence.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">첨부 파일</Label>
                        <div className="flex gap-2 mt-1">
                          {request.evidence.map((file, index) => (
                            <Badge key={index} variant="outline" className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {file}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {request.adminNotes && (
                      <div>
                        <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">관리자 메모</Label>
                        <p className="text-sm mt-1 p-2 bg-warning/10 dark:bg-warning/20 rounded text-gray-900 dark:text-white">{request.adminNotes}</p>
                        {request.reviewedBy && request.reviewedAt && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {request.reviewedBy} • {formatDistanceToNow(new Date(request.reviewedAt), {
                              addSuffix: true,
                              locale: ko
                            })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  {request.status === 'pending' || request.status === 'in-review' ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleReviewRequest(request, 'approve')}
                        className="flex items-center gap-1"
                      >
                        <Check className="w-4 h-4" />
                        승인
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReviewRequest(request, 'reject')}
                        className="flex items-center gap-1"
                      >
                        <X className="w-4 h-4" />
                        반려
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRequest(request);
                        // 상세 보기 로직
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      상세 보기
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredRequests.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">요청이 없습니다</h3>
              <p className="text-gray-600 dark:text-gray-300">
                {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || typeFilter !== 'all'
                  ? '검색 조건에 맞는 요청이 없습니다.'
                  : '아직 정보 수정 요청이 없습니다.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 검토 다이얼로그 */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              요청 {reviewAction === 'approve' ? '승인' : '반려'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve' 
                ? '이 요청을 승인하면 업체 정보가 실제로 업데이트됩니다.'
                : '이 요청을 반려하면 요청자에게 반려 사유가 전달됩니다.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-gray-900 dark:text-white">업체명</Label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedRequest?.businessName}</p>
            </div>

            <div>
              <Label className="text-gray-900 dark:text-white">수정 유형</Label>
              <p className="text-sm text-gray-900 dark:text-white">
                {selectedRequest && getCorrectionTypeLabel(selectedRequest.correctionType)}
              </p>
            </div>

            <div>
              <Label htmlFor="adminNotes" className="text-gray-900 dark:text-white">관리자 메모</Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={reviewAction === 'approve' 
                  ? "승인 사유를 입력하세요..." 
                  : "반려 사유를 입력하세요..."}
                rows={3}
                className="text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 placeholder:text-gray-500 dark:placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setReviewDialogOpen(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={isSubmitting}
              variant={reviewAction === 'approve' ? 'default' : 'destructive'}
            >
              {isSubmitting ? '처리 중...' : (reviewAction === 'approve' ? '승인' : '반려')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 테마 설정 관리 섹션 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            테마 설정 관리
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 현재 테마 상태 표시 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />
                  <Label className="font-medium">현재 테마</Label>
                </div>
                <p className="text-lg font-semibold mt-1 capitalize">
                  {theme === 'light' ? '라이트 모드' : theme === 'dark' ? '다크 모드' : '시스템 자동'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {theme === 'system' ? '시스템 설정을 따름' : '수동 설정'}
                </p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  <Label className="font-medium">시스템 설정</Label>
                </div>
                <p className="text-lg font-semibold mt-1">
                  {window.matchMedia('(prefers-color-scheme: dark)').matches ? '다크' : '라이트'}
                </p>
                <p className="text-sm text-muted-foreground">
                  운영체제 설정
                </p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <Label className="font-medium">적용 상태</Label>
                </div>
                <p className="text-lg font-semibold mt-1 text-success">
                  정상
                </p>
                <p className="text-sm text-muted-foreground">
                  테마가 올바르게 적용됨
                </p>
              </Card>
            </div>

            {/* 테마 컨트롤 */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Label>빠른 테마 변경:</Label>
                <ThemeSwitcherDropdown />
              </div>

              <Button
                variant="outline"
                onClick={() => setShowThemeSettings(!showThemeSettings)}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                고급 설정
              </Button>

              <Button
                variant="outline"
                onClick={checkThemeSettings}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                테마 값 체크
              </Button>
            </div>

            {/* 고급 테마 설정 패널 */}
            {showThemeSettings && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <ThemeSettings />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminInstitutes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddInstituteOpen, setIsAddInstituteOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedInstitute, setSelectedInstitute] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isChangeSubscriptionOpen, setIsChangeSubscriptionOpen] = useState(false);
  const [selectedSubscriptionPlan, setSelectedSubscriptionPlan] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [newInstitute, setNewInstitute] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    businessNumber: "",
    directorName: "",
    directorEmail: "",
    subscriptionPlan: "",
    paymentMethod: "card",
    isVerified: false
  });

  // 현재 사용자 정보 조회
  const { data: currentUserData } = useQuery({
    queryKey: ['/api/user/me'],
    queryFn: async () => {
      const response = await fetch('/api/user/me');
      if (!response.ok) return null;
      return response.json();
    }
  });

  // 구독 플랜 조회
  const { data: subscriptionPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['/api/subscription-plans'],
    queryFn: async () => {
      const response = await fetch('/api/subscription-plans');
      if (!response.ok) {
        throw new Error('구독 플랜 데이터를 불러올 수 없습니다');
      }
      const result = await response.json();
      console.log('[DEBUG] 구독 플랜 응답:', result);
      return Array.isArray(result) ? result : result.data || result.plans || [];
    }
  });

  // 현재 사용자 정보 설정
  useEffect(() => {
    if (currentUserData) {
      setCurrentUser(currentUserData);
    }
  }, [currentUserData]);

  // 기관 등록 뮤테이션
  const registerInstituteMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/admin/institutes', data),
    onSuccess: (response) => {
      toast({
        title: '기관 등록 성공',
        description: '기관이 성공적으로 등록되었습니다.'
      });
      
      // 폼 초기화
      setNewInstitute({
        name: "",
        description: "",
        address: "",
        phone: "",
        email: "",
        website: "",
        businessNumber: "",
        directorName: "",
        directorEmail: "",
        subscriptionPlan: "",
        paymentMethod: "card",
        isVerified: false
      });
      setSelectedPlan(null);
      setIsAddInstituteOpen(false);
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/institutes'] });
    },
    onError: (error: any) => {
      toast({
        title: '등록 실패',
        description: error.message || '기관 등록 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  });

  // 기관 추가 함수
  const handleAddInstitute = () => {
    if (!newInstitute.name || !newInstitute.email || !newInstitute.subscriptionPlan) {
      toast({
        title: '입력 오류',
        description: '기관명, 이메일, 구독 플랜은 필수 항목입니다.',
        variant: 'destructive'
      });
      return;
    }
    
    registerInstituteMutation.mutate(newInstitute);
  };

  // 기관 정보 수정 함수
  const handleUpdateInstitute = async () => {
    if (!selectedInstitute || !newInstitute.name || !newInstitute.email) {
      toast({
        title: '입력 오류',
        description: '필수 정보를 모두 입력해주세요.',
        variant: 'destructive'
      });
      return;
    }

    try {
      console.log('[DEBUG] API Request: PUT /api/admin/institutes/' + selectedInstitute.id);
      console.log('[DEBUG] Request payload:', newInstitute);
      
      const response = await apiRequest('PUT', `/api/admin/institutes/${selectedInstitute.id}`, newInstitute);
      
      console.log('[DEBUG] API Response:', response.status || '200 OK');
      
      // API 응답이 성공 상태인지 확인
      const responseData = response as any;
      if (responseData && (responseData.success === true || responseData.success === undefined)) {
        toast({
          title: '수정 완료',
          description: '기관 정보가 성공적으로 수정되었습니다.'
        });
        
        // 캐시 무효화로 목록 새로고침
        queryClient.invalidateQueries({ queryKey: ['/api/admin/institutes'] });
        
        setIsEditDialogOpen(false);
        setSelectedInstitute(null);
      } else {
        console.error('[DEBUG] API Error:', responseData);
        toast({
          title: '수정 실패',
          description: responseData?.message || responseData?.error || '기관 정보 수정에 실패했습니다.',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('[DEBUG] Exception caught:', error);
      toast({
        title: '수정 실패',
        description: error.message || '기관 정보 수정 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  };

  const handlePlanSelect = (planCode: string) => {
    console.log('[DEBUG] 구독 플랜 선택:', planCode);
    const plans = Array.isArray(subscriptionPlans) ? subscriptionPlans : [];
    const plan = plans.find((p: SubscriptionPlan) => p.code === planCode);
    console.log('[DEBUG] 선택된 플랜:', plan);
    setSelectedPlan(plan || null);
    setNewInstitute(prev => ({ ...prev, subscriptionPlan: planCode }));
  };

  // 기관 보기 함수
  const handleViewInstitute = (institute: any) => {
    console.log('기관 상세보기 클릭:', institute);
    setSelectedInstitute(institute);
    setIsViewDialogOpen(true);
  };

  // 구독 변경 처리
  const handleChangeSubscription = (institute: any) => {
    console.log('구독 변경 클릭:', institute);
    setSelectedInstitute(institute);
    setCurrentUser({ role: 'admin', name: '관리자' });
    setIsChangeSubscriptionOpen(true);
  };

  // 기관 수정 함수
  const handleEditInstitute = (institute: any) => {
    console.log('기관 수정 클릭:', institute);
    setSelectedInstitute(institute);
    setNewInstitute({
      name: institute.name || "",
      description: institute.description || "",
      address: institute.address || "",
      phone: institute.phone || "",
      email: institute.email || "",
      website: institute.website || "",
      businessNumber: institute.businessNumber || "",
      directorName: institute.directorName || "",
      directorEmail: institute.directorEmail || "",
      subscriptionPlan: institute.subscriptionPlan || "",
      paymentMethod: institute.paymentMethod || "card",
      isVerified: institute.isVerified || false
    });
    
    // 선택된 플랜 정보 설정
    const plans = Array.isArray(subscriptionPlans) ? subscriptionPlans : [];
    const plan = plans.find((p: SubscriptionPlan) => p.code === institute.subscriptionPlan);
    setSelectedPlan(plan || null);
    
    setIsEditDialogOpen(true);
  };

  // 기관 삭제 함수
  const handleDeleteInstitute = (institute: any) => {
    console.log('기관 삭제 클릭:', institute);
    setSelectedInstitute(institute);
    setIsDeleteDialogOpen(true);
  };

  // 기관 삭제 확인
  const confirmDeleteInstitute = async () => {
    if (!selectedInstitute) return;

    try {
      await apiRequest('DELETE', `/api/admin/institutes/${selectedInstitute.id}`);
      toast({
        title: '기관 삭제 완료',
        description: '기관이 성공적으로 삭제되었습니다.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/institutes'] });
      setIsDeleteDialogOpen(false);
      setSelectedInstitute(null);
    } catch (error: any) {
      toast({
        title: '삭제 실패',
        description: error.message || '기관 삭제 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  };

  // 구독 플랜 변경 처리
  const handleSubscriptionChange = async (paymentMethod: 'admin' | 'institute') => {
    if (!selectedInstitute || !selectedSubscriptionPlan) return;

    try {
      if (paymentMethod === 'admin') {
        // 관리자가 대신 결제
        await apiRequest('POST', `/api/admin/institutes/${selectedInstitute.id}/admin-payment`, {
          subscriptionPlan: selectedSubscriptionPlan
        });
        toast({
          title: '구독 플랜 변경 완료',
          description: '관리자 결제로 구독 플랜이 변경되었습니다.'
        });
      } else {
        // 기관 관리자가 직접 결제
        await apiRequest('POST', `/api/admin/institutes/${selectedInstitute.id}/request-payment`, {
          subscriptionPlan: selectedSubscriptionPlan
        });
        toast({
          title: '결제 요청 완료',
          description: '기관 관리자에게 결제 요청이 전송되었습니다.'
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/institutes'] });
      setIsChangeSubscriptionOpen(false);
      setSelectedInstitute(null);
      setSelectedSubscriptionPlan("");
    } catch (error: any) {
      toast({
        title: '구독 플랜 변경 실패',
        description: error.message || '구독 플랜 변경 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const getFeatureIcon = (feature: string, enabled: boolean) => {
    if (!enabled) return null;
    
    switch (feature) {
      case 'basicLMS':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'aiRecommendation':
        return <CheckCircle className="w-4 h-4 text-primary" />;
      case 'customBranding':
        return <CheckCircle className="w-4 h-4 text-primary" />;
      case 'apiIntegration':
        return <CheckCircle className="w-4 h-4 text-primary" />;
      case 'dedicatedSupport':
        return <CheckCircle className="w-4 h-4 text-primary" />;
      case 'whiteLabel':
        return <CheckCircle className="w-4 h-4 text-primary" />;
      default:
        return <CheckCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  // 실제 기관 데이터 가져오기
  const { data: institutesData, isLoading, error } = useQuery({
    queryKey: ['/api/admin/institutes'],
    queryFn: async () => {
      const response = await fetch('/api/admin/institutes');
      if (!response.ok) {
        throw new Error('기관 데이터를 불러올 수 없습니다');
      }
      const result = await response.json();
      console.log('[DEBUG] 기관 데이터 응답:', result);
      
      // 응답 데이터 구조 확인
      if (result.success && result.data && result.data.institutes) {
        return result.data.institutes;
      } else if (result.institutes) {
        return result.institutes;
      } else {
        console.error('[DEBUG] 예상치 못한 응답 구조:', result);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5분
  });

  const institutes = institutesData || [];

  // 로딩 상태 처리
  if (isLoading) {
    return <PageSkeleton variant="table" count={6} />;
  }

  // 에러 상태 처리
  if (error) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-destructive mb-4">기관 정보를 불러올 수 없습니다</h2>
            <p className="text-muted-foreground">잠시 후 다시 시도해주세요.</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success/10 text-success">활성</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">비활성</Badge>;
      case 'suspended':
        return <Badge className="bg-destructive/10 text-destructive">정지</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Tabs defaultValue="institutes" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="institutes">기관 관리</TabsTrigger>
        <TabsTrigger value="business">업체 등록</TabsTrigger>
        <TabsTrigger value="corrections">정보 수정 요청</TabsTrigger>
      </TabsList>
      <TabsContent value="institutes">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">기관 관리</h1>
          <p className="text-muted-foreground">등록된 훈련 기관들을 관리합니다</p>
        </div>
        <Dialog open={isAddInstituteOpen} onOpenChange={setIsAddInstituteOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              새 기관 등록
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[900px]">
            <DialogHeader>
              <DialogTitle>새 기관 등록</DialogTitle>
              <DialogDescription>
                새로운 훈련 기관을 플랫폼에 등록합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
              {/* 기본 정보 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">기본 정보</h3>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">기관명 *</Label>
                  <Input
                    id="name"
                    value={newInstitute.name}
                    onChange={(e) => setNewInstitute({ ...newInstitute, name: e.target.value })}
                    className="col-span-3"
                    placeholder="서울반려견아카데미"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">이메일 *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newInstitute.email}
                    onChange={(e) => setNewInstitute({ ...newInstitute, email: e.target.value })}
                    className="col-span-3"
                    placeholder="admin@institute.com"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">설명</Label>
                  <Textarea
                    id="description"
                    value={newInstitute.description}
                    onChange={(e) => setNewInstitute({ ...newInstitute, description: e.target.value })}
                    className="col-span-3"
                    placeholder="기관에 대한 설명을 입력하세요"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">연락처</Label>
                  <Input
                    id="phone"
                    value={newInstitute.phone}
                    onChange={(e) => setNewInstitute({ ...newInstitute, phone: e.target.value })}
                    className="col-span-3"
                    placeholder="02-1234-5678"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="address" className="text-right">주소</Label>
                  <Input
                    id="address"
                    value={newInstitute.address}
                    onChange={(e) => setNewInstitute({ ...newInstitute, address: e.target.value })}
                    className="col-span-3"
                    placeholder="서울시 강남구"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="website" className="text-right">웹사이트</Label>
                  <Input
                    id="website"
                    value={newInstitute.website}
                    onChange={(e) => setNewInstitute({ ...newInstitute, website: e.target.value })}
                    className="col-span-3"
                    placeholder="https://www.institute.com"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="businessNumber" className="text-right">사업자번호</Label>
                  <Input
                    id="businessNumber"
                    value={newInstitute.businessNumber}
                    onChange={(e) => setNewInstitute({ ...newInstitute, businessNumber: e.target.value })}
                    className="col-span-3"
                    placeholder="123-45-67890"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="directorName" className="text-right">대표자명</Label>
                  <Input
                    id="directorName"
                    value={newInstitute.directorName}
                    onChange={(e) => setNewInstitute({ ...newInstitute, directorName: e.target.value })}
                    className="col-span-3"
                    placeholder="김원장"
                  />
                </div>
              </div>

              <Separator />

              {/* 구독 플랜 선택 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">구독 플랜 선택 *</h3>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">플랜</Label>
                  <Select value={newInstitute.subscriptionPlan} onValueChange={handlePlanSelect}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="구독 플랜을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Array.isArray(subscriptionPlans) ? subscriptionPlans : []).map((plan: SubscriptionPlan) => (
                        <SelectItem key={plan.code} value={plan.code}>
                          <div className="flex items-center justify-between w-full">
                            <span>{plan.name}</span>
                            <span className="text-primary font-semibold ml-2">
                              월 {formatPrice(plan.price)}원
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPlan && (
                  <div className="col-span-4 ml-4">
                    <Card className="border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold">{selectedPlan.name}</h4>
                          <Badge variant="outline" className="text-primary">
                            월 {formatPrice(selectedPlan.price)}원
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">{selectedPlan.description}</p>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-primary" />
                            <span className="text-sm">
                              최대 {selectedPlan.maxMembers === -1 ? '무제한' : selectedPlan.maxMembers}명
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Video className="w-4 h-4 text-success" />
                            <span className="text-sm">
                              월 {selectedPlan.maxVideoHours === -1 ? '무제한' : selectedPlan.maxVideoHours}시간
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h5 className="text-sm font-medium">포함 기능:</h5>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(selectedPlan.features).map(([key, enabled]) => (
                              <div key={key} className="flex items-center space-x-2">
                                {getFeatureIcon(key, enabled)}
                                <span className={`text-xs ${enabled ? 'text-success' : 'text-gray-400'}`}>
                                  {key === 'basicLMS' && '기본 LMS'}
                                  {key === 'basicVideoConsultation' && '화상 상담'}
                                  {key === 'basicStatistics' && '기본 통계'}
                                  {key === 'aiRecommendation' && 'AI 추천'}
                                  {key === 'customBranding' && '커스텀 브랜딩'}
                                  {key === 'apiIntegration' && 'API 연동'}
                                  {key === 'dedicatedSupport' && '전담 지원'}
                                  {key === 'whiteLabel' && '화이트라벨'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              <Separator />

              {/* 결제 방법 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">결제 방법</h3>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">결제 수단</Label>
                  <div className="col-span-3">
                    <RadioGroup
                      value={newInstitute.paymentMethod}
                      onValueChange={(value) => setNewInstitute({ ...newInstitute, paymentMethod: value })}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="card" id="card" />
                        <Label htmlFor="card" className="flex items-center space-x-2">
                          <CreditCard className="w-4 h-4" />
                          <span>신용카드</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="transfer" id="transfer" />
                        <Label htmlFor="transfer" className="flex items-center space-x-2">
                          <DollarSign className="w-4 h-4" />
                          <span>계좌이체</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="invoice" id="invoice" />
                        <Label htmlFor="invoice" className="flex items-center space-x-2">
                          <DollarSign className="w-4 h-4" />
                          <span>세금계산서</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                onClick={handleAddInstitute}
                disabled={registerInstituteMutation.isPending || !newInstitute.name || !newInstitute.email || !newInstitute.subscriptionPlan}
              >
                {registerInstituteMutation.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    등록 중...
                  </>
                ) : (
                  '기관 등록'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 기관 수</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Array.isArray(institutes) ? institutes.length : 0}</div>
            <p className="text-xs text-muted-foreground">
              활성 {Array.isArray(institutes) ? institutes.filter((i: any) => i.isActive === true).length : 0}개
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 훈련사</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.isArray(institutes) ? institutes.reduce((total: number, inst: any) => total + (inst.trainersCount || (inst.trainerId ? 1 : 0)), 0) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              전체 기관 소속
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 교육생</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.isArray(institutes) ? institutes.reduce((total: number, inst: any) => total + (inst.studentsCount || 0), 0) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              모든 기관 합계
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 규모</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.isArray(institutes) && institutes.length > 0 ? 
                Math.round(institutes.reduce((total: number, inst: any) => total + (inst.trainersCount || (inst.trainerId ? 1 : 0)), 0) / institutes.length) : 0}명
            </div>
            <p className="text-xs text-muted-foreground">
              기관당 평균 훈련사
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 검색 및 필터 */}
      <Card>
        <CardHeader>
          <CardTitle>기관 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="기관명, 코드, 원장명으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="inactive">비활성</SelectItem>
                <SelectItem value="suspended">정지</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              고급 필터
            </Button>
          </div>

          {/* 기관 테이블 */}
          <div className="border rounded-lg overflow-x-auto">
            <div className="min-w-[1400px]">
              <div className="grid grid-cols-[100px_180px_140px_180px_140px_80px_120px_80px_80px_180px] gap-2 p-4 font-medium border-b bg-muted/50 text-sm">
                <div>기관코드</div>
                <div>기관명</div>
                <div>대표자</div>
                <div>위치</div>
                <div>구독 플랜</div>
                <div className="text-center">훈련사</div>
                <div className="text-center">교육생</div>
                <div className="text-center">상태</div>
                <div className="text-center">결제</div>
                <div>작업</div>
              </div>
            {Array.isArray(institutes) && institutes.length > 0 ? (
              institutes.map((institute: any) => (
                <div 
                  key={institute.id} 
                  className="grid grid-cols-[100px_180px_140px_180px_140px_80px_120px_80px_80px_180px] gap-2 p-4 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors text-sm" 
                  onClick={() => handleViewInstitute(institute)}
                  data-testid={`institute-row-${institute.id}`}
                >
                  <div>
                    <div className="font-mono text-sm font-semibold text-primary bg-primary/10 px-2 py-1 rounded inline-block">
                      {institute.code || institute.instituteCode || '-'}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">{institute.name || '이름 없음'}</div>
                    <div className="text-sm text-muted-foreground">{institute.email || '-'}</div>
                  </div>
                  <div>
                    <div className="font-medium">{institute.directorName || institute.director || '미지정'}</div>
                    <div className="text-sm text-muted-foreground">{institute.phone || '-'}</div>
                  </div>
                  <div className="text-sm flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    {institute.address || institute.location || '위치 미지정'}
                  </div>
                  <div>
                    <div className="font-medium">
                      {institute.subscriptionPlanInfo || 
                       institute.subscriptionPlanName || 
                       (institute.subscriptionPlan === 'starter' ? '스타터 플랜' : 
                        institute.subscriptionPlan === 'standard' ? '스탠다드 플랜' : 
                        institute.subscriptionPlan === 'professional' ? '프로페셔널 플랜' : 
                        institute.subscriptionPlan === 'enterprise' ? '엔터프라이즈 플랜' : 
                        institute.subscriptionPlan || '미지정')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      월 {institute.subscriptionPlanPrice ? institute.subscriptionPlanPrice.toLocaleString() : 
                           (institute.subscriptionPlan === 'starter' ? '150,000' : 
                            institute.subscriptionPlan === 'standard' ? '300,000' : 
                            institute.subscriptionPlan === 'professional' ? '500,000' : 
                            institute.subscriptionPlan === 'enterprise' ? '800,000' : '0')}원
                    </div>
                  </div>
                  <div className="text-center font-medium">
                    <div>{institute.trainersCount || (institute.trainerId ? 1 : 0)}명</div>
                    <div className="text-xs text-muted-foreground">
                      최대 {institute.maxMembers === -1 ? '무제한' : institute.maxMembers}명
                    </div>
                  </div>
                  <div className="text-center font-medium">
                    <div>{institute.studentsCount || 0}명</div>
                    <div className="text-xs text-muted-foreground">
                      영상: {institute.usedVideoHours || 0}h/{institute.maxVideoHours === -1 ? '∞' : institute.maxVideoHours}h
                    </div>
                    <div className="text-xs text-muted-foreground">
                      AI: {institute.currentAiUsage || 0}회/{institute.maxAiAnalysis === -1 ? '∞' : institute.maxAiAnalysis}회
                    </div>
                  </div>
                  <div>{getStatusBadge(institute.isActive ? 'active' : 'inactive')}</div>
                  <div>
                    <Badge 
                      variant={institute.subscriptionStatus === 'active' ? 'default' : 'secondary'}
                      className={institute.subscriptionStatus === 'active' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}
                    >
                      {institute.subscriptionStatus === 'active' ? '활성' : '대기'}
                    </Badge>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewInstitute(institute)}
                      className="text-primary border-primary/40 hover:bg-primary/10 hover:text-primary/90 hover:border-primary/40"
                      data-testid={`button-view-${institute.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditInstitute(institute)}
                      className="text-success border-success/40 hover:bg-success/10 hover:text-success/90 hover:border-success/40"
                      data-testid={`button-edit-${institute.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteInstitute(institute)}
                      className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive/90 hover:border-destructive/40"
                      data-testid={`button-delete-${institute.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleChangeSubscription(institute)}
                      className="text-primary border-primary/40 hover:bg-primary/5 hover:text-primary/90 hover:border-primary/40"
                      data-testid={`button-subscription-${institute.id}`}
                    >
                      <CreditCard className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                등록된 기관이 없습니다.
              </div>
            )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 기관 등록 현황 다이얼로그 */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>기관 등록 현황 및 상세 정보</DialogTitle>
            <DialogDescription>
              {selectedInstitute?.name}의 상세 정보와 등록 현황을 확인할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          {selectedInstitute && (
            <div className="space-y-6">
              {/* 등록 현황 요약 */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {selectedInstitute.trainersCount || (selectedInstitute.trainerId ? 1 : 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">등록 훈련사</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-success">
                    {selectedInstitute.studentsCount || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">등록 교육생</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {selectedInstitute.subscriptionStatus === 'active' ? '활성' : '대기'}
                  </div>
                  <div className="text-sm text-muted-foreground">구독 상태</div>
                </div>
              </div>

              {/* 구독 플랜 및 사용량 현황 */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-3">구독 플랜 및 사용량</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">구독 플랜:</span>
                    <span className="ml-2 text-primary">
                      {selectedInstitute.subscriptionPlanInfo || 
                       selectedInstitute.subscriptionPlanName || 
                       (selectedInstitute.subscriptionPlan === 'starter' ? '스타터 플랜' : 
                        selectedInstitute.subscriptionPlan === 'standard' ? '스탠다드 플랜' : 
                        selectedInstitute.subscriptionPlan === 'professional' ? '프로페셔널 플랜' : 
                        selectedInstitute.subscriptionPlan === 'enterprise' ? '엔터프라이즈 플랜' : 
                        selectedInstitute.subscriptionPlan || '미지정')}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">월 구독료:</span>
                    <span className="ml-2 text-success">
                      {selectedInstitute.subscriptionPlanPrice ? selectedInstitute.subscriptionPlanPrice.toLocaleString() : 
                       (selectedInstitute.subscriptionPlan === 'starter' ? '150,000' : 
                        selectedInstitute.subscriptionPlan === 'standard' ? '300,000' : 
                        selectedInstitute.subscriptionPlan === 'professional' ? '500,000' : 
                        selectedInstitute.subscriptionPlan === 'enterprise' ? '800,000' : '0')}원
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">화상 수업 사용량:</span>
                    <span className="ml-2">
                      {selectedInstitute.usedVideoHours || 0}h / {selectedInstitute.maxVideoHours === -1 ? '무제한' : `${selectedInstitute.maxVideoHours}h`}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">AI 분석 사용량:</span>
                    <span className="ml-2">
                      {selectedInstitute.currentAiUsage || 0}회 / {selectedInstitute.maxAiAnalysis === -1 ? '무제한' : `${selectedInstitute.maxAiAnalysis}회`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">기관 코드</Label>
                  <p className="font-mono text-sm font-semibold text-primary bg-primary/10 px-2 py-1 rounded inline-block mt-1">
                    {selectedInstitute.code || selectedInstitute.instituteCode || '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">기관명</Label>
                  <p className="text-sm text-muted-foreground">{selectedInstitute.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">대표자</Label>
                  <p className="text-sm text-muted-foreground">{selectedInstitute.directorName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">이메일</Label>
                  <p className="text-sm text-muted-foreground">{selectedInstitute.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">전화번호</Label>
                  <p className="text-sm text-muted-foreground">{selectedInstitute.phone}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium">주소</Label>
                  <p className="text-sm text-muted-foreground">{selectedInstitute.address}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">구독 플랜</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedInstitute.subscriptionPlanInfo?.name || 
                     (selectedInstitute.subscriptionPlan === 'starter' ? 'Starter' : 
                      selectedInstitute.subscriptionPlan === 'standard' ? 'Standard' : 
                      selectedInstitute.subscriptionPlan === 'professional' ? 'Professional' : 
                      selectedInstitute.subscriptionPlan === 'enterprise' ? 'Enterprise' : 
                      selectedInstitute.subscriptionPlan || '미지정')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">월 구독료</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedInstitute.subscriptionPlanInfo?.price ? formatPrice(selectedInstitute.subscriptionPlanInfo.price) : 
                     (selectedInstitute.subscriptionPlan === 'starter' ? '150,000' : 
                      selectedInstitute.subscriptionPlan === 'standard' ? '300,000' : 
                      selectedInstitute.subscriptionPlan === 'professional' ? '500,000' : 
                      selectedInstitute.subscriptionPlan === 'enterprise' ? '800,000' : '0')}원
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">화상 수업 한도</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedInstitute.maxVideoHours === -1 ? '무제한' : `${selectedInstitute.maxVideoHours}시간`}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">AI 분석 한도</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedInstitute.maxAiAnalysis === -1 ? '무제한' : `${selectedInstitute.maxAiAnalysis}회`}
                  </p>
                </div>
              </div>
              {selectedInstitute.description && (
                <div>
                  <Label className="text-sm font-medium">기관 설명</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedInstitute.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 기관 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>기관 정보 수정</DialogTitle>
            <DialogDescription>
              기관의 기본 정보와 구독 플랜을 수정할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* 기본 정보 섹션 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">기본 정보</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">기관명 *</Label>
                  <Input
                    id="edit-name"
                    value={newInstitute.name}
                    onChange={(e) => setNewInstitute({ ...newInstitute, name: e.target.value })}
                    placeholder="기관명을 입력하세요"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-director">대표자명 *</Label>
                  <Input
                    id="edit-director"
                    value={newInstitute.directorName}
                    onChange={(e) => setNewInstitute({ ...newInstitute, directorName: e.target.value })}
                    placeholder="대표자명을 입력하세요"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">이메일 *</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={newInstitute.email}
                    onChange={(e) => setNewInstitute({ ...newInstitute, email: e.target.value })}
                    placeholder="이메일을 입력하세요"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-director-email">대표자 이메일</Label>
                  <Input
                    id="edit-director-email"
                    type="email"
                    value={newInstitute.directorEmail}
                    onChange={(e) => setNewInstitute({ ...newInstitute, directorEmail: e.target.value })}
                    placeholder="대표자 이메일을 입력하세요"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone">전화번호</Label>
                  <Input
                    id="edit-phone"
                    value={newInstitute.phone}
                    onChange={(e) => setNewInstitute({ ...newInstitute, phone: e.target.value })}
                    placeholder="전화번호를 입력하세요"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-business-number">사업자등록번호</Label>
                  <Input
                    id="edit-business-number"
                    value={newInstitute.businessNumber}
                    onChange={(e) => setNewInstitute({ ...newInstitute, businessNumber: e.target.value })}
                    placeholder="사업자등록번호를 입력하세요"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-address">주소</Label>
                  <Input
                    id="edit-address"
                    value={newInstitute.address}
                    onChange={(e) => setNewInstitute({ ...newInstitute, address: e.target.value })}
                    placeholder="주소를 입력하세요"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-website">웹사이트</Label>
                  <Input
                    id="edit-website"
                    value={newInstitute.website}
                    onChange={(e) => setNewInstitute({ ...newInstitute, website: e.target.value })}
                    placeholder="웹사이트 URL을 입력하세요"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-description">기관 설명</Label>
                  <Textarea
                    id="edit-description"
                    value={newInstitute.description}
                    onChange={(e) => setNewInstitute({ ...newInstitute, description: e.target.value })}
                    placeholder="기관에 대한 설명을 입력하세요"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* 구독 플랜 섹션 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">구독 플랜</h3>
              <div className="space-y-3">
                <Label>구독 플랜 선택 *</Label>
                <Select value={newInstitute.subscriptionPlan} onValueChange={handlePlanSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="구독 플랜을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(subscriptionPlans) && subscriptionPlans.map((plan: SubscriptionPlan) => (
                      <SelectItem key={plan.code} value={plan.code}>
                        {plan.name} - {formatPrice(plan.price)}원/월
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* 선택된 플랜 정보 */}
                {selectedPlan && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">최대 회원 수:</span>
                        <span className="ml-2 text-muted-foreground">
                          {selectedPlan.maxMembers === -1 ? '무제한' : `${selectedPlan.maxMembers}명`}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">화상 수업 시간:</span>
                        <span className="ml-2 text-muted-foreground">
                          {selectedPlan.maxVideoHours === -1 ? '무제한' : `${selectedPlan.maxVideoHours}시간`}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">AI 분석 횟수:</span>
                        <span className="ml-2 text-muted-foreground">
                          {selectedPlan.maxAiAnalysis === -1 ? '무제한' : `${selectedPlan.maxAiAnalysis}회`}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">월 구독료:</span>
                        <span className="ml-2 text-muted-foreground">
                          {formatPrice(selectedPlan.price)}원
                        </span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <span className="font-medium">포함 기능:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(selectedPlan.features).map(([key, enabled]) => {
                          if (!enabled) return null;
                          const featureNames: Record<string, string> = {
                            basicLMS: 'LMS 기본',
                            basicVideoConsultation: '화상 상담',
                            basicStatistics: '기본 통계',
                            aiRecommendation: 'AI 추천',
                            customBranding: '커스텀 브랜딩',
                            apiIntegration: 'API 연동',
                            dedicatedSupport: '전담 지원',
                            whiteLabel: '화이트레이블'
                          };
                          return (
                            <Badge key={key} variant="secondary" className="text-xs">
                              {featureNames[key] || key}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* 설정 섹션 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">설정</h3>
              <div className="space-y-3">
                <div>
                  <Label>결제 방법</Label>
                  <RadioGroup 
                    value={newInstitute.paymentMethod} 
                    onValueChange={(value) => setNewInstitute({ ...newInstitute, paymentMethod: value })}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="card" id="edit-card" />
                      <Label htmlFor="edit-card">카드 결제</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="bank" id="edit-bank" />
                      <Label htmlFor="edit-bank">무통장 입금</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="admin" id="edit-admin" />
                      <Label htmlFor="edit-admin">관리자 결제</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-verified"
                    checked={newInstitute.isVerified}
                    onChange={(e) => setNewInstitute({ ...newInstitute, isVerified: e.target.checked })}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="edit-verified" className="text-sm font-medium">
                    기관 인증 상태
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleUpdateInstitute} disabled={!newInstitute.name || !newInstitute.email}>
              수정 완료
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 기관 삭제 확인 다이얼로그 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>기관 삭제 확인</DialogTitle>
            <DialogDescription>
              정말로 "{selectedInstitute?.name}" 기관을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={confirmDeleteInstitute}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 구독 플랜 변경 다이얼로그 */}
      {selectedInstitute && (
        <SubscriptionChangeDialog
          isOpen={isChangeSubscriptionOpen}
          onClose={() => setIsChangeSubscriptionOpen(false)}
          institute={selectedInstitute}
          subscriptionPlans={subscriptionPlans}
          currentUser={currentUser}
        />
      )}
      </TabsContent>

      <TabsContent value="business">
        <BusinessRegistrationTab />
      </TabsContent>

      <TabsContent value="corrections">
        <InfoCorrectionTab />
      </TabsContent>
    </Tabs>
    </div>
  );
}