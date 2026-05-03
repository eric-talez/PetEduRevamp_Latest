import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Award, 
  Camera,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Users,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// 기관 등록 스키마
const instituteRegistrationSchema = z.object({
  basicInfo: z.object({
    instituteName: z.string().min(2, '기관명은 최소 2글자 이상 입력해주세요'),
    businessNumber: z.string().min(10, '사업자 등록번호를 정확히 입력해주세요'),
    representativeName: z.string().min(2, '대표자명을 입력해주세요'),
    establishedYear: z.string().min(4, '설립년도를 입력해주세요'),
    email: z.string().email('올바른 이메일 주소를 입력해주세요'),
    phone: z.string().min(10, '올바른 전화번호를 입력해주세요'),
    website: z.string().optional()
  }),
  locationInfo: z.object({
    address: z.string().min(10, '상세 주소를 입력해주세요'),
    detailAddress: z.string().optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    accessInfo: z.string().min(10, '교통편 정보를 입력해주세요')
  }),
  facilityInfo: z.object({
    totalArea: z.string().min(1, '전체 면적을 입력해주세요'),
    classrooms: z.string().min(1, '강의실 수를 입력해주세요'),
    capacity: z.string().min(1, '최대 수용 인원을 입력해주세요'),
    facilities: z.array(z.string()).min(1, '최소 1개 이상의 시설을 선택해주세요'),
    parkingSpaces: z.string().optional(),
    specialFeatures: z.string().optional()
  }),
  serviceInfo: z.object({
    serviceTypes: z.array(z.string()).min(1, '최소 1개 이상의 서비스를 선택해주세요'),
    targetAudience: z.array(z.string()).min(1, '최소 1개 이상의 대상을 선택해주세요'),
    operatingHours: z.object({
      weekdays: z.string().min(1, '평일 운영시간을 입력해주세요'),
      weekends: z.string().min(1, '주말 운영시간을 입력해주세요'),
      holidays: z.string().optional()
    }),
    description: z.string().min(100, '기관 소개는 최소 100자 이상 작성해주세요')
  }),
  staffInfo: z.object({
    totalStaff: z.string().min(1, '총 직원 수를 입력해주세요'),
    certifiedTrainers: z.string().min(1, '자격증 보유 훈련사 수를 입력해주세요'),
    veterinarians: z.string().optional(),
    otherStaff: z.string().optional()
  })
});

type InstituteRegistrationForm = z.infer<typeof instituteRegistrationSchema>;

const facilityOptions = [
  '실내 훈련장', '야외 훈련장', '대기실', '상담실', '수술실', '입원실',
  '그루밍실', '놀이방', '격리실', '주차장', '카페테리아', '라커룸'
];

const serviceTypeOptions = [
  '기초 훈련', '문제 행동 교정', '사회화 훈련', '아질리티', '리콜 훈련',
  '의료 서비스', '그루밍 서비스', '펜션/호텔', '데이케어', '상담 서비스'
];

const targetAudienceOptions = [
  '퍼피 (6개월 미만)', '어린 강아지 (6개월-1년)', '성견 (1-7년)', 
  '시니어견 (7년 이상)', '소형견', '중형견', '대형견', '문제 행동견'
];

export default function InstituteRegistration() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState({
    businessLicense: null as File | null,
    facilityImages: [] as File[],
    certificationDocs: [] as File[]
  });
  
  const { toast } = useToast();

  const form = useForm<InstituteRegistrationForm>({
    resolver: zodResolver(instituteRegistrationSchema),
    defaultValues: {
      basicInfo: {
        instituteName: '',
        businessNumber: '',
        representativeName: '',
        establishedYear: '',
        email: '',
        phone: '',
        website: ''
      },
      locationInfo: {
        address: '',
        detailAddress: '',
        latitude: '',
        longitude: '',
        accessInfo: ''
      },
      facilityInfo: {
        totalArea: '',
        classrooms: '',
        capacity: '',
        facilities: [],
        parkingSpaces: '',
        specialFeatures: ''
      },
      serviceInfo: {
        serviceTypes: [],
        targetAudience: [],
        operatingHours: {
          weekdays: '',
          weekends: '',
          holidays: ''
        },
        description: ''
      },
      staffInfo: {
        totalStaff: '',
        certifiedTrainers: '',
        veterinarians: '',
        otherStaff: ''
      }
    }
  });

  const handleFacilityToggle = (facility: string) => {
    const updated = selectedFacilities.includes(facility)
      ? selectedFacilities.filter(f => f !== facility)
      : [...selectedFacilities, facility];
    
    setSelectedFacilities(updated);
    form.setValue('facilityInfo.facilities', updated);
  };

  const handleServiceToggle = (service: string) => {
    const updated = selectedServices.includes(service)
      ? selectedServices.filter(s => s !== service)
      : [...selectedServices, service];
    
    setSelectedServices(updated);
    form.setValue('serviceInfo.serviceTypes', updated);
  };

  const handleTargetToggle = (target: string) => {
    const updated = selectedTargets.includes(target)
      ? selectedTargets.filter(t => t !== target)
      : [...selectedTargets, target];
    
    setSelectedTargets(updated);
    form.setValue('serviceInfo.targetAudience', updated);
  };

  const handleFileUpload = (type: 'businessLicense' | 'facilityImages' | 'certificationDocs', files: FileList | null) => {
    if (!files) return;

    if (type === 'businessLicense') {
      setUploadedFiles(prev => ({ ...prev, businessLicense: files[0] }));
    } else {
      const fileArray = Array.from(files);
      setUploadedFiles(prev => ({
        ...prev,
        [type]: [...prev[type], ...fileArray]
      }));
    }
  };

  const removeFile = (type: 'facilityImages' | 'certificationDocs', index: number) => {
    setUploadedFiles(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof InstituteRegistrationForm)[] = [];
    
    switch (currentStep) {
      case 1:
        fieldsToValidate = ['basicInfo'];
        break;
      case 2:
        fieldsToValidate = ['locationInfo'];
        break;
      case 3:
        fieldsToValidate = ['facilityInfo'];
        break;
      case 4:
        fieldsToValidate = ['serviceInfo'];
        break;
      case 5:
        fieldsToValidate = ['staffInfo'];
        break;
    }

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const onSubmit = async (data: InstituteRegistrationForm) => {
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      
      formData.append('registrationData', JSON.stringify({
        ...data,
        type: 'institute',
        status: 'pending',
        submittedAt: new Date().toISOString()
      }));

      if (uploadedFiles.businessLicense) {
        formData.append('businessLicense', uploadedFiles.businessLicense);
      }
      
      uploadedFiles.facilityImages.forEach((file, index) => {
        formData.append(`facilityImage_${index}`, file);
      });
      
      uploadedFiles.certificationDocs.forEach((file, index) => {
        formData.append(`certificationDoc_${index}`, file);
      });

      const response = await fetch('/api/registration/institute', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        toast({
          title: "기관 등록 신청 완료",
          description: "등록 신청이 성공적으로 제출되었습니다. 검토 후 연락드리겠습니다.",
        });

        setTimeout(() => {
          window.location.href = '/dashboard/institute-pending';
        }, 2000);
        
      } else {
        throw new Error('등록 신청 실패');
      }
    } catch (error) {
      console.error('기관 등록 실패:', error);
      toast({
        title: "등록 실패",
        description: "등록 신청 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">교육 기관 등록</h1>
          <p className="text-gray-600">TALEZ 파트너 교육 기관으로 함께하세요</p>
        </div>

        {/* 진행 단계 표시 */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentStep 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {step < currentStep ? <CheckCircle className="w-5 h-5" /> : step}
              </div>
              {step < 6 && (
                <div className={`w-12 h-1 mx-1 ${
                  step < currentStep ? 'bg-primary' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* 1단계: 기본 정보 */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="w-5 h-5 mr-2" />
                  기본 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="instituteName">기관명 *</Label>
                    <Input
                      id="instituteName"
                      {...form.register('basicInfo.instituteName')}
                      placeholder="서울 펫 트레이닝 센터"
                    />
                    {form.formState.errors.basicInfo?.instituteName && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.basicInfo.instituteName.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="businessNumber">사업자 등록번호 *</Label>
                    <Input
                      id="businessNumber"
                      {...form.register('basicInfo.businessNumber')}
                      placeholder="000-00-00000"
                    />
                    {form.formState.errors.basicInfo?.businessNumber && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.basicInfo.businessNumber.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="representativeName">대표자명 *</Label>
                    <Input
                      id="representativeName"
                      {...form.register('basicInfo.representativeName')}
                      placeholder="홍길동"
                    />
                    {form.formState.errors.basicInfo?.representativeName && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.basicInfo.representativeName.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="establishedYear">설립년도 *</Label>
                    <Input
                      id="establishedYear"
                      {...form.register('basicInfo.establishedYear')}
                      placeholder="2020"
                      type="number"
                    />
                    {form.formState.errors.basicInfo?.establishedYear && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.basicInfo.establishedYear.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">이메일 *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...form.register('basicInfo.email')}
                      placeholder="info@institute.com"
                    />
                    {form.formState.errors.basicInfo?.email && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.basicInfo.email.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">전화번호 *</Label>
                    <Input
                      id="phone"
                      {...form.register('basicInfo.phone')}
                      placeholder="02-123-4567"
                    />
                    {form.formState.errors.basicInfo?.phone && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.basicInfo.phone.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="website">웹사이트</Label>
                  <Input
                    id="website"
                    {...form.register('basicInfo.website')}
                    placeholder="https://www.institute.com"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* 2단계: 위치 정보 */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  위치 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="address">주소 *</Label>
                  <Input
                    id="address"
                    {...form.register('locationInfo.address')}
                    placeholder="서울시 강남구 테헤란로 123"
                  />
                  {form.formState.errors.locationInfo?.address && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.locationInfo.address.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="detailAddress">상세 주소</Label>
                  <Input
                    id="detailAddress"
                    {...form.register('locationInfo.detailAddress')}
                    placeholder="지하 1층, 2층 전체"
                  />
                </div>

                <div>
                  <Label htmlFor="accessInfo">교통편 정보 *</Label>
                  <Textarea
                    id="accessInfo"
                    {...form.register('locationInfo.accessInfo')}
                    placeholder="지하철: 2호선 강남역 3번 출구 도보 5분&#10;버스: 146, 240, 401 강남역 하차&#10;주차: 건물 내 주차장 이용 가능"
                    rows={3}
                  />
                  {form.formState.errors.locationInfo?.accessInfo && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.locationInfo.accessInfo.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 3단계: 시설 정보 */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>시설 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="totalArea">전체 면적 (㎡) *</Label>
                    <Input
                      id="totalArea"
                      {...form.register('facilityInfo.totalArea')}
                      placeholder="300"
                      type="number"
                    />
                    {form.formState.errors.facilityInfo?.totalArea && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.facilityInfo.totalArea.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="classrooms">강의실 수 *</Label>
                    <Input
                      id="classrooms"
                      {...form.register('facilityInfo.classrooms')}
                      placeholder="5"
                      type="number"
                    />
                    {form.formState.errors.facilityInfo?.classrooms && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.facilityInfo.classrooms.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="capacity">최대 수용 인원 *</Label>
                    <Input
                      id="capacity"
                      {...form.register('facilityInfo.capacity')}
                      placeholder="50"
                      type="number"
                    />
                    {form.formState.errors.facilityInfo?.capacity && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.facilityInfo.capacity.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>보유 시설 * (최소 1개 선택)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {facilityOptions.map((facility) => (
                      <div key={facility} className="flex items-center space-x-2">
                        <Checkbox
                          id={facility}
                          checked={selectedFacilities.includes(facility)}
                          onCheckedChange={() => handleFacilityToggle(facility)}
                        />
                        <Label htmlFor={facility} className="text-sm cursor-pointer">
                          {facility}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {selectedFacilities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedFacilities.map((facility) => (
                        <Badge key={facility} variant="secondary">{facility}</Badge>
                      ))}
                    </div>
                  )}
                  {form.formState.errors.facilityInfo?.facilities && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.facilityInfo.facilities.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="parkingSpaces">주차 공간 수</Label>
                    <Input
                      id="parkingSpaces"
                      {...form.register('facilityInfo.parkingSpaces')}
                      placeholder="20"
                      type="number"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="specialFeatures">특별 시설</Label>
                    <Input
                      id="specialFeatures"
                      {...form.register('facilityInfo.specialFeatures')}
                      placeholder="수영장, 야외 놀이터 등"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 4단계: 서비스 정보 */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>서비스 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>제공 서비스 * (최소 1개 선택)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {serviceTypeOptions.map((service) => (
                      <div key={service} className="flex items-center space-x-2">
                        <Checkbox
                          id={service}
                          checked={selectedServices.includes(service)}
                          onCheckedChange={() => handleServiceToggle(service)}
                        />
                        <Label htmlFor={service} className="text-sm cursor-pointer">
                          {service}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {selectedServices.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedServices.map((service) => (
                        <Badge key={service} variant="secondary">{service}</Badge>
                      ))}
                    </div>
                  )}
                  {form.formState.errors.serviceInfo?.serviceTypes && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.serviceInfo.serviceTypes.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label>교육 대상 * (최소 1개 선택)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                    {targetAudienceOptions.map((target) => (
                      <div key={target} className="flex items-center space-x-2">
                        <Checkbox
                          id={target}
                          checked={selectedTargets.includes(target)}
                          onCheckedChange={() => handleTargetToggle(target)}
                        />
                        <Label htmlFor={target} className="text-sm cursor-pointer">
                          {target}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {selectedTargets.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedTargets.map((target) => (
                        <Badge key={target} variant="outline">{target}</Badge>
                      ))}
                    </div>
                  )}
                  {form.formState.errors.serviceInfo?.targetAudience && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.serviceInfo.targetAudience.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-base font-medium mb-4 block">운영 시간 *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="weekdays">평일</Label>
                      <Input
                        id="weekdays"
                        {...form.register('serviceInfo.operatingHours.weekdays')}
                        placeholder="09:00 - 18:00"
                      />
                      {form.formState.errors.serviceInfo?.operatingHours?.weekdays && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.serviceInfo.operatingHours.weekdays.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="weekends">주말</Label>
                      <Input
                        id="weekends"
                        {...form.register('serviceInfo.operatingHours.weekends')}
                        placeholder="10:00 - 17:00"
                      />
                      {form.formState.errors.serviceInfo?.operatingHours?.weekends && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.serviceInfo.operatingHours.weekends.message}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Label htmlFor="holidays">공휴일</Label>
                    <Input
                      id="holidays"
                      {...form.register('serviceInfo.operatingHours.holidays')}
                      placeholder="휴무 또는 10:00 - 15:00"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">기관 소개 * (최소 100자)</Label>
                  <Textarea
                    id="description"
                    {...form.register('serviceInfo.description')}
                    placeholder="기관의 설립 목표, 교육 철학, 특색 있는 프로그램 등을 자세히 소개해주세요"
                    rows={5}
                  />
                  {form.formState.errors.serviceInfo?.description && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.serviceInfo.description.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 5단계: 직원 정보 */}
          {currentStep === 5 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  직원 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="totalStaff">총 직원 수 *</Label>
                    <Input
                      id="totalStaff"
                      {...form.register('staffInfo.totalStaff')}
                      placeholder="15"
                      type="number"
                    />
                    {form.formState.errors.staffInfo?.totalStaff && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.staffInfo.totalStaff.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="certifiedTrainers">자격증 보유 훈련사 *</Label>
                    <Input
                      id="certifiedTrainers"
                      {...form.register('staffInfo.certifiedTrainers')}
                      placeholder="8"
                      type="number"
                    />
                    {form.formState.errors.staffInfo?.certifiedTrainers && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.staffInfo.certifiedTrainers.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="veterinarians">수의사 수</Label>
                    <Input
                      id="veterinarians"
                      {...form.register('staffInfo.veterinarians')}
                      placeholder="2"
                      type="number"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="otherStaff">기타 직원</Label>
                    <Input
                      id="otherStaff"
                      {...form.register('staffInfo.otherStaff')}
                      placeholder="관리직, 청소원 등"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 6단계: 서류 업로드 */}
          {currentStep === 6 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  서류 업로드
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 사업자 등록증 */}
                <div>
                  <Label>사업자 등록증 *</Label>
                  <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload('businessLicense', e.target.files)}
                      className="hidden"
                      id="businessLicense"
                    />
                    <label htmlFor="businessLicense" className="cursor-pointer flex flex-col items-center">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">사업자 등록증 업로드</span>
                    </label>
                    {uploadedFiles.businessLicense && (
                      <div className="mt-2 text-sm text-success">
                        {uploadedFiles.businessLicense.name}
                      </div>
                    )}
                  </div>
                </div>

                {/* 시설 사진 */}
                <div>
                  <Label>시설 사진</Label>
                  <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFileUpload('facilityImages', e.target.files)}
                      className="hidden"
                      id="facilityImages"
                    />
                    <label htmlFor="facilityImages" className="cursor-pointer flex flex-col items-center">
                      <Camera className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">시설 사진 업로드 (다중 선택 가능)</span>
                    </label>
                    {uploadedFiles.facilityImages.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {uploadedFiles.facilityImages.map((file, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="text-success">{file.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile('facilityImages', index)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 인증서류 */}
                <div>
                  <Label>기관 인증서류</Label>
                  <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      multiple
                      onChange={(e) => handleFileUpload('certificationDocs', e.target.files)}
                      className="hidden"
                      id="certificationDocs"
                    />
                    <label htmlFor="certificationDocs" className="cursor-pointer flex flex-col items-center">
                      <Award className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">인증서, 허가증 등</span>
                    </label>
                    {uploadedFiles.certificationDocs.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {uploadedFiles.certificationDocs.map((file, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="text-success">{file.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile('certificationDocs', index)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 심사 안내 */}
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-primary mt-0.5 mr-2" />
                    <div className="text-sm">
                      <p className="font-medium text-primary mb-1">심사 안내</p>
                      <ul className="text-primary space-y-1">
                        <li>• 제출하신 서류는 7-10일 내 심사됩니다</li>
                        <li>• 현장 방문 심사가 진행될 수 있습니다</li>
                        <li>• 심사 통과 후 파트너 기관으로 등록됩니다</li>
                        <li>• 정기적인 재심사가 실시됩니다</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 네비게이션 버튼 */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="w-24"
            >
              이전
            </Button>
            
            {currentStep < 6 ? (
              <Button
                type="button"
                onClick={nextStep}
                className="w-24"
              >
                다음
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-32"
              >
                {isSubmitting ? '제출 중...' : '등록 신청'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}