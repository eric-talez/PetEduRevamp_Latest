import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Building2, Upload, FileText, MapPin, Phone, Clock, Star, Plus, Trash2, Download } from 'lucide-react';
import { getCSRFToken } from '@/lib/csrf';

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

export default function BusinessRegistration() {
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
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div>
                  <Label>업로드 진행률</Label>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{uploadProgress}% 완료</p>
                </div>
              )}

              <Separator />

              <div className="flex justify-end">
                <Button
                  onClick={handleBulkUpload}
                  disabled={!uploadFile || isSubmitting}
                >
                  {isSubmitting ? '처리 중...' : '일괄 등록 시작'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}