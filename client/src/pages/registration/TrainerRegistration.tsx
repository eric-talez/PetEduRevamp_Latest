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
  UserPlus, 
  MapPin, 
  Phone, 
  Mail, 
  Award, 
  Camera,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Building2,
  Search,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// 훈련사 등록 스키마
const trainerRegistrationSchema = z.object({
  personalInfo: z.object({
    name: z.string().min(2, '이름은 최소 2글자 이상 입력해주세요'),
    email: z.string().email('올바른 이메일 주소를 입력해주세요'),
    phone: z.string().min(10, '올바른 전화번호를 입력해주세요'),
    address: z.string().min(5, '상세 주소를 입력해주세요'),
    dateOfBirth: z.string().min(1, '생년월일을 입력해주세요')
  }),
  professionalInfo: z.object({
    experience: z.string().min(1, '경력을 선택해주세요'),
    specialties: z.array(z.string()).min(1, '최소 1개 이상의 전문 분야를 선택해주세요'),
    certifications: z.array(z.string()),
    bio: z.string().min(50, '자기소개는 최소 50자 이상 작성해주세요'),
    serviceArea: z.string().min(1, '서비스 지역을 입력해주세요')
  }),
  businessInfo: z.object({
    businessType: z.string().min(1, '사업자 유형을 선택해주세요'),
    businessNumber: z.string().optional(),
    businessName: z.string().optional(),
    hourlyRate: z.string().min(1, '시간당 요금을 입력해주세요'),
    instituteCode: z.string().optional()
  }),
  documents: z.object({
    profileImage: z.any().optional(),
    certificationDocs: z.array(z.any()).optional(),
    portfolioImages: z.array(z.any()).optional()
  })
});

type TrainerRegistrationForm = z.infer<typeof trainerRegistrationSchema>;

const specialtyOptions = [
  '기초 복종 훈련', '사회화 훈련', '문제 행동 교정', '아질리티 훈련', 
  '보호견 훈련', '동물 보조 치료', '퍼피 트레이닝', '시니어견 케어',
  '공격성 개선', '분리불안 해결', '하우스 트레이닝', '리콜 훈련'
];

const certificationOptions = [
  '국가공인 반려동물 행동지도사', 'KKF 공인 핸들러', 'CCPDT 인증',
  '동물 매개 치료사', 'IAABC 회원', '반려동물 관리사 1급',
  '동물 훈련사 자격증', '펫시터 자격증', '기타'
];

export default function TrainerRegistration() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedCertifications, setSelectedCertifications] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState({
    profileImage: null as File | null,
    certificationDocs: [] as File[],
    portfolioImages: [] as File[]
  });
  
  // 기관 코드 검증 상태
  const [instituteCodeInput, setInstituteCodeInput] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [verifiedInstitute, setVerifiedInstitute] = useState<{
    id: number;
    name: string;
    code: string;
    address: string;
  } | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  
  const { toast } = useToast();
  
  // 기관 코드 검증 함수
  const verifyInstituteCode = async () => {
    if (!instituteCodeInput.trim()) {
      setCodeError('기관 코드를 입력해주세요');
      return;
    }
    
    setIsVerifyingCode(true);
    setCodeError(null);
    setVerifiedInstitute(null);
    
    try {
      const response = await fetch(`/api/institutes/verify-code/${instituteCodeInput.toUpperCase()}`);
      const data = await response.json();
      
      if (data.success) {
        setVerifiedInstitute(data.data);
        form.setValue('businessInfo.instituteCode', data.data.code);
        toast({
          title: '기관 확인 완료',
          description: `${data.data.name} 기관이 확인되었습니다.`
        });
      } else {
        setCodeError(data.message || '기관 코드를 찾을 수 없습니다');
      }
    } catch (error) {
      setCodeError('기관 코드 확인 중 오류가 발생했습니다');
    } finally {
      setIsVerifyingCode(false);
    }
  };
  
  // 기관 연결 해제
  const clearInstituteCode = () => {
    setVerifiedInstitute(null);
    setInstituteCodeInput('');
    setCodeError(null);
    form.setValue('businessInfo.instituteCode', '');
  };

  const form = useForm<TrainerRegistrationForm>({
    resolver: zodResolver(trainerRegistrationSchema),
    defaultValues: {
      personalInfo: {
        name: '',
        email: '',
        phone: '',
        address: '',
        dateOfBirth: ''
      },
      professionalInfo: {
        experience: '',
        specialties: [],
        certifications: [],
        bio: '',
        serviceArea: ''
      },
      businessInfo: {
        businessType: '',
        businessNumber: '',
        businessName: '',
        hourlyRate: '',
        instituteCode: ''
      },
      documents: {
        profileImage: null,
        certificationDocs: [],
        portfolioImages: []
      }
    }
  });

  const handleSpecialtyToggle = (specialty: string) => {
    const updated = selectedSpecialties.includes(specialty)
      ? selectedSpecialties.filter(s => s !== specialty)
      : [...selectedSpecialties, specialty];
    
    setSelectedSpecialties(updated);
    form.setValue('professionalInfo.specialties', updated);
  };

  const handleCertificationToggle = (certification: string) => {
    const updated = selectedCertifications.includes(certification)
      ? selectedCertifications.filter(c => c !== certification)
      : [...selectedCertifications, certification];
    
    setSelectedCertifications(updated);
    form.setValue('professionalInfo.certifications', updated);
  };

  const handleFileUpload = (type: 'profileImage' | 'certificationDocs' | 'portfolioImages', files: FileList | null) => {
    if (!files) return;

    if (type === 'profileImage') {
      setUploadedFiles(prev => ({ ...prev, profileImage: files[0] }));
    } else {
      const fileArray = Array.from(files);
      setUploadedFiles(prev => ({
        ...prev,
        [type]: [...prev[type], ...fileArray]
      }));
    }
  };

  const removeFile = (type: 'certificationDocs' | 'portfolioImages', index: number) => {
    setUploadedFiles(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof TrainerRegistrationForm)[] = [];
    
    switch (currentStep) {
      case 1:
        fieldsToValidate = ['personalInfo'];
        break;
      case 2:
        fieldsToValidate = ['professionalInfo'];
        break;
      case 3:
        fieldsToValidate = ['businessInfo'];
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

  const onSubmit = async (data: TrainerRegistrationForm) => {
    setIsSubmitting(true);
    
    try {
      // FormData 생성
      const formData = new FormData();
      
      // 기본 정보 추가 (기관 정보 포함)
      formData.append('registrationData', JSON.stringify({
        ...data,
        type: 'trainer',
        status: 'pending',
        submittedAt: new Date().toISOString(),
        // 검증된 기관 정보 추가
        verifiedInstitute: verifiedInstitute ? {
          id: verifiedInstitute.id,
          name: verifiedInstitute.name,
          code: verifiedInstitute.code
        } : null
      }));

      // 파일 추가
      if (uploadedFiles.profileImage) {
        formData.append('profileImage', uploadedFiles.profileImage);
      }
      
      uploadedFiles.certificationDocs.forEach((file, index) => {
        formData.append(`certificationDoc_${index}`, file);
      });
      
      uploadedFiles.portfolioImages.forEach((file, index) => {
        formData.append(`portfolioImage_${index}`, file);
      });

      const response = await fetch('/api/registration/trainer', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        
        toast({
          title: "훈련사 등록 신청 완료",
          description: "등록 신청이 성공적으로 제출되었습니다. 검토 후 연락드리겠습니다.",
        });

        // 성공 페이지로 이동 또는 대시보드로 리다이렉트
        setTimeout(() => {
          window.location.href = '/dashboard/trainer-pending';
        }, 2000);
        
      } else {
        throw new Error('등록 신청 실패');
      }
    } catch (error) {
      console.error('훈련사 등록 실패:', error);
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
          <h1 className="text-3xl font-bold mb-2">훈련사 등록</h1>
          <p className="text-gray-600">TALEZ와 함께 전문 훈련사로 활동해보세요</p>
        </div>

        {/* 진행 단계 표시 */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentStep 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {step < currentStep ? <CheckCircle className="w-5 h-5" /> : step}
              </div>
              {step < 4 && (
                <div className={`w-16 h-1 mx-2 ${
                  step < currentStep ? 'bg-primary' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* 1단계: 개인 정보 */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserPlus className="w-5 h-5 mr-2" />
                  개인 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">이름 *</Label>
                    <Input
                      id="name"
                      {...form.register('personalInfo.name')}
                      placeholder="홍길동"
                    />
                    {form.formState.errors.personalInfo?.name && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.personalInfo.name.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="email">이메일 *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...form.register('personalInfo.email')}
                      placeholder="trainer@example.com"
                    />
                    {form.formState.errors.personalInfo?.email && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.personalInfo.email.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">전화번호 *</Label>
                    <Input
                      id="phone"
                      {...form.register('personalInfo.phone')}
                      placeholder="010-1234-5678"
                    />
                    {form.formState.errors.personalInfo?.phone && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.personalInfo.phone.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="dateOfBirth">생년월일 *</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      {...form.register('personalInfo.dateOfBirth')}
                    />
                    {form.formState.errors.personalInfo?.dateOfBirth && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.personalInfo.dateOfBirth.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">주소 *</Label>
                  <Input
                    id="address"
                    {...form.register('personalInfo.address')}
                    placeholder="서울시 강남구 테헤란로 123번길 45"
                  />
                  {form.formState.errors.personalInfo?.address && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.personalInfo.address.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 2단계: 전문 정보 */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="w-5 h-5 mr-2" />
                  전문 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>경력 *</Label>
                  <Select onValueChange={(value) => form.setValue('professionalInfo.experience', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="경력을 선택해주세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">1년 미만</SelectItem>
                      <SelectItem value="intermediate">1-3년</SelectItem>
                      <SelectItem value="experienced">3-5년</SelectItem>
                      <SelectItem value="expert">5-10년</SelectItem>
                      <SelectItem value="master">10년 이상</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.professionalInfo?.experience && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.professionalInfo.experience.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label>전문 분야 * (최소 1개 선택)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {specialtyOptions.map((specialty) => (
                      <div key={specialty} className="flex items-center space-x-2">
                        <Checkbox
                          id={specialty}
                          checked={selectedSpecialties.includes(specialty)}
                          onCheckedChange={() => handleSpecialtyToggle(specialty)}
                        />
                        <Label htmlFor={specialty} className="text-sm cursor-pointer">
                          {specialty}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {selectedSpecialties.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedSpecialties.map((specialty) => (
                        <Badge key={specialty} variant="secondary">{specialty}</Badge>
                      ))}
                    </div>
                  )}
                  {form.formState.errors.professionalInfo?.specialties && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.professionalInfo.specialties.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label>보유 자격증</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {certificationOptions.map((certification) => (
                      <div key={certification} className="flex items-center space-x-2">
                        <Checkbox
                          id={certification}
                          checked={selectedCertifications.includes(certification)}
                          onCheckedChange={() => handleCertificationToggle(certification)}
                        />
                        <Label htmlFor={certification} className="text-sm cursor-pointer">
                          {certification}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {selectedCertifications.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedCertifications.map((certification) => (
                        <Badge key={certification} variant="outline">{certification}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="serviceArea">서비스 지역 *</Label>
                  <Input
                    id="serviceArea"
                    {...form.register('professionalInfo.serviceArea')}
                    placeholder="서울시 전체, 경기도 남부 등"
                  />
                  {form.formState.errors.professionalInfo?.serviceArea && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.professionalInfo.serviceArea.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="bio">자기소개 * (최소 50자)</Label>
                  <Textarea
                    id="bio"
                    {...form.register('professionalInfo.bio')}
                    placeholder="훈련 철학, 경력, 전문성 등을 자세히 소개해주세요"
                    rows={4}
                  />
                  {form.formState.errors.professionalInfo?.bio && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.professionalInfo.bio.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 3단계: 사업 정보 */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>사업 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>사업자 유형 *</Label>
                  <Select onValueChange={(value) => form.setValue('businessInfo.businessType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="사업자 유형을 선택해주세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">개인 사업자</SelectItem>
                      <SelectItem value="corporate">법인 사업자</SelectItem>
                      <SelectItem value="freelancer">프리랜서</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.businessInfo?.businessType && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.businessInfo.businessType.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="businessNumber">사업자 등록번호</Label>
                    <Input
                      id="businessNumber"
                      {...form.register('businessInfo.businessNumber')}
                      placeholder="000-00-00000"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="businessName">상호명</Label>
                    <Input
                      id="businessName"
                      {...form.register('businessInfo.businessName')}
                      placeholder="훈련소 이름 등"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="hourlyRate">시간당 요금 * (원)</Label>
                  <Input
                    id="hourlyRate"
                    {...form.register('businessInfo.hourlyRate')}
                    placeholder="80000"
                    type="number"
                  />
                  {form.formState.errors.businessInfo?.hourlyRate && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.businessInfo.hourlyRate.message}
                    </p>
                  )}
                </div>

                {/* 기관 코드 입력 (선택사항) */}
                <div className="border-t pt-4 mt-4">
                  <Label className="flex items-center mb-2">
                    <Building2 className="w-4 h-4 mr-2" />
                    소속 기관 코드 (선택사항)
                  </Label>
                  <p className="text-sm text-gray-500 mb-3">
                    소속된 교육기관이 있다면 기관 코드를 입력하여 연결할 수 있습니다.
                  </p>
                  
                  {!verifiedInstitute ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          id="instituteCode"
                          data-testid="input-institute-code"
                          value={instituteCodeInput}
                          onChange={(e) => setInstituteCodeInput(e.target.value.toUpperCase())}
                          placeholder="예: WZ-001"
                          className="flex-1"
                          disabled={isVerifyingCode}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={verifyInstituteCode}
                          disabled={isVerifyingCode || !instituteCodeInput.trim()}
                          data-testid="button-verify-institute"
                        >
                          {isVerifyingCode ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Search className="w-4 h-4 mr-1" />
                              확인
                            </>
                          )}
                        </Button>
                      </div>
                      {codeError && (
                        <p className="text-sm text-destructive flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {codeError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-success/10 border border-success/30 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-success mr-2" />
                          <div>
                            <p className="font-medium text-success">{verifiedInstitute.name}</p>
                            <p className="text-sm text-success">
                              코드: {verifiedInstitute.code} | {verifiedInstitute.address || '주소 정보 없음'}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearInstituteCode}
                          className="text-gray-500 hover:text-destructive"
                          data-testid="button-clear-institute"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 4단계: 서류 업로드 */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  서류 업로드
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 프로필 사진 */}
                <div>
                  <Label>프로필 사진</Label>
                  <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload('profileImage', e.target.files)}
                      className="hidden"
                      id="profileImage"
                    />
                    <label htmlFor="profileImage" className="cursor-pointer flex flex-col items-center">
                      <Camera className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">프로필 사진 업로드</span>
                    </label>
                    {uploadedFiles.profileImage && (
                      <div className="mt-2 text-sm text-success">
                        {uploadedFiles.profileImage.name}
                      </div>
                    )}
                  </div>
                </div>

                {/* 자격증 서류 */}
                <div>
                  <Label>자격증 서류</Label>
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
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">자격증 파일 업로드 (다중 선택 가능)</span>
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

                {/* 포트폴리오 이미지 */}
                <div>
                  <Label>포트폴리오 이미지</Label>
                  <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFileUpload('portfolioImages', e.target.files)}
                      className="hidden"
                      id="portfolioImages"
                    />
                    <label htmlFor="portfolioImages" className="cursor-pointer flex flex-col items-center">
                      <Camera className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">훈련 과정 사진, 성과 사진 등</span>
                    </label>
                    {uploadedFiles.portfolioImages.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {uploadedFiles.portfolioImages.map((file, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="text-success">{file.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile('portfolioImages', index)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 주의사항 */}
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-warning mt-0.5 mr-2" />
                    <div className="text-sm">
                      <p className="font-medium text-warning mb-1">검토 안내</p>
                      <ul className="text-warning space-y-1">
                        <li>• 제출하신 서류는 3-5일 내 검토됩니다</li>
                        <li>• 추가 서류 요청 시 이메일로 안내드립니다</li>
                        <li>• 승인 완료 후 훈련사 활동이 가능합니다</li>
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
            
            {currentStep < 4 ? (
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