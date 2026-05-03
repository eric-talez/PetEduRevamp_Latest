import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../../SimpleApp';
import { 
  Building, 
  Check, 
  Upload, 
  FileText, 
  AlertCircle, 
  MapPin, 
  Phone, 
  Mail, 
  Globe,
  ChevronRight,
  BadgeCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function InstituteCertificationPage() {
  const [location, navigate] = useLocation();
  const { isAuthenticated, userRole } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    instituteName: '',
    ownerName: '',
    businessNumber: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    description: '',
    foundedYear: '',
    trainersCount: '',
  });

  const [uploadedFiles, setUploadedFiles] = useState<{
    businessLicense: File | null;
    institutePhotos: File[];
    certifications: File[];
  }>({
    businessLicense: null,
    institutePhotos: [],
    certifications: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // 폼 입력 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 파일 업로드 핸들러
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'businessLicense' | 'institutePhotos' | 'certifications') => {
    if (!e.target.files) return;

    if (type === 'businessLicense' && e.target.files.length > 0) {
      setUploadedFiles(prev => ({
        ...prev,
        businessLicense: e.target.files![0]
      }));
      
      toast({
        title: "사업자등록증 업로드 완료",
        description: e.target.files[0].name,
      });
    } else if (type === 'institutePhotos' || type === 'certifications') {
      const newFiles = Array.from(e.target.files);
      
      setUploadedFiles(prev => ({
        ...prev,
        [type]: [...prev[type], ...newFiles]
      }));
      
      toast({
        title: `${type === 'institutePhotos' ? '기관 사진' : '인증서'} 업로드 완료`,
        description: `${newFiles.length}개 파일이 업로드되었습니다.`,
      });
    }
  };

  // 업로드된 파일 삭제
  const removeFile = (type: 'businessLicense' | 'institutePhotos' | 'certifications', index?: number) => {
    if (type === 'businessLicense') {
      setUploadedFiles(prev => ({
        ...prev,
        businessLicense: null
      }));
      
      toast({
        title: "사업자등록증 삭제됨",
      });
    } else if (index !== undefined) {
      setUploadedFiles(prev => ({
        ...prev,
        [type]: prev[type].filter((_, i) => i !== index)
      }));
      
      toast({
        title: `${type === 'institutePhotos' ? '기관 사진' : '인증서'} 삭제됨`,
      });
    }
  };

  // 인증 신청 제출
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 필수 필드 검증
    const requiredFields = ['instituteName', 'ownerName', 'businessNumber', 'address', 'phone', 'email'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (missingFields.length > 0) {
      toast({
        title: "필수 정보가 누락되었습니다",
        description: "모든 필수 항목(*)을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    // 사업자등록증 필수 체크
    if (!uploadedFiles.businessLicense) {
      toast({
        title: "사업자등록증을 업로드해주세요",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // 실제로는 API를 호출하여 인증 신청을 제출해야 함
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      
      toast({
        title: "인증 신청이 접수되었습니다",
        description: "신청 검토 후 결과를 이메일로 안내드립니다. (일반적으로 3-5 영업일 소요)",
      });
    }, 2000);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center text-sm text-gray-500 mb-6">
        <a href="/" className="hover:text-primary">홈</a>
        <ChevronRight className="w-4 h-4 mx-1" />
        <a href="/institutes" className="hover:text-primary">교육기관</a>
        <ChevronRight className="w-4 h-4 mx-1" />
        <span className="text-gray-700 font-medium">공식 인증 신청</span>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <Building className="w-6 h-6 mr-2 text-primary" />
          테일즈 공식 기관 인증 신청
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          {isSubmitted ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-success">
                  <Check className="w-5 h-5 mr-2" />
                  인증 신청 완료
                </CardTitle>
                <CardDescription>
                  테일즈 공식 기관 인증 신청이 성공적으로 접수되었습니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>신청 검토 중</AlertTitle>
                  <AlertDescription>
                    신청하신 내용은 테일즈 관리자 검토 후 승인 여부가 결정됩니다. 
                    검토 결과는 입력하신 이메일({formData.email})로 안내드립니다. 
                    일반적으로 검토에는 3-5 영업일이 소요됩니다.
                  </AlertDescription>
                </Alert>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">신청 정보</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex">
                      <span className="font-medium w-32">기관명:</span>
                      <span>{formData.instituteName}</span>
                    </div>
                    <div className="flex">
                      <span className="font-medium w-32">대표자:</span>
                      <span>{formData.ownerName}</span>
                    </div>
                    <div className="flex">
                      <span className="font-medium w-32">사업자번호:</span>
                      <span>{formData.businessNumber}</span>
                    </div>
                    <div className="flex">
                      <span className="font-medium w-32">연락처:</span>
                      <span>{formData.phone}</span>
                    </div>
                    <div className="flex">
                      <span className="font-medium w-32">이메일:</span>
                      <span>{formData.email}</span>
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-600">
                  인증이 승인되면 기관 코드와 관리자 아이디가 발급되며, 위치 서비스에 자동으로 인증 마크와 함께 노출됩니다.
                  또한 소속 훈련사를 등록하고 관리할 수 있는 기능이 제공됩니다.
                </p>
              </CardContent>
              <CardFooter>
                <Button onClick={() => navigate('/institutes')}>
                  교육기관 목록으로 돌아가기
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <form onSubmit={handleSubmit}>
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>기본 정보</CardTitle>
                  <CardDescription>
                    테일즈 공식 기관으로 등록하기 위한 기본 정보를 입력해주세요.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="instituteName">
                        기관명 <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="instituteName"
                        name="instituteName"
                        value={formData.instituteName}
                        onChange={handleInputChange}
                        className="mt-1"
                        placeholder="예: 퍼펙트 펫 아카데미"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="ownerName">
                        대표자 이름 <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="ownerName"
                        name="ownerName"
                        value={formData.ownerName}
                        onChange={handleInputChange}
                        className="mt-1"
                        placeholder="예: 홍길동"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="businessNumber">
                      사업자등록번호 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="businessNumber"
                      name="businessNumber"
                      value={formData.businessNumber}
                      onChange={handleInputChange}
                      className="mt-1"
                      placeholder="예: 123-45-67890"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="address">
                      주소 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="mt-1"
                      placeholder="예: 서울시 강남구 테헤란로 123"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">
                        연락처 <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="mt-1"
                        placeholder="예: 02-1234-5678"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email">
                        이메일 <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="mt-1"
                        placeholder="예: info@perfectpet.co.kr"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="website">
                        웹사이트
                      </Label>
                      <Input
                        id="website"
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        className="mt-1"
                        placeholder="예: https://www.perfectpet.co.kr"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="foundedYear">
                        설립년도
                      </Label>
                      <Input
                        id="foundedYear"
                        name="foundedYear"
                        value={formData.foundedYear}
                        onChange={handleInputChange}
                        className="mt-1"
                        placeholder="예: 2015"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="trainersCount">
                      소속 훈련사 수
                    </Label>
                    <Input
                      id="trainersCount"
                      name="trainersCount"
                      type="number"
                      value={formData.trainersCount}
                      onChange={handleInputChange}
                      className="mt-1"
                      placeholder="예: 5"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">
                      기관 소개
                    </Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      className="mt-1"
                      placeholder="기관에 대한 간략한 소개를 작성해주세요."
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>서류 제출</CardTitle>
                  <CardDescription>
                    인증에 필요한 서류를 업로드해주세요.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="mb-2 block">
                      사업자등록증 <span className="text-destructive">*</span>
                    </Label>
                    
                    {uploadedFiles.businessLicense ? (
                      <div className="flex items-center p-3 border border-gray-200 rounded-md">
                        <FileText className="w-5 h-5 text-primary mr-2" />
                        <span className="flex-1">{uploadedFiles.businessLicense.name}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeFile('businessLicense')}
                          className="text-destructive hover:text-destructive/90"
                        >
                          삭제
                        </Button>
                      </div>
                    ) : (
                      <Label 
                        htmlFor="businessLicense" 
                        className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-6 cursor-pointer hover:border-primary"
                      >
                        <Upload className="w-8 h-8 mb-2 text-gray-500" />
                        <span className="text-sm text-gray-600">사업자등록증 파일을 업로드해주세요</span>
                        <span className="text-xs text-gray-500 mt-1">PDF, JPG, PNG 파일 (최대 5MB)</span>
                      </Label>
                    )}
                    
                    <Input
                      id="businessLicense"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, 'businessLicense')}
                      className="hidden"
                    />
                  </div>
                  
                  <div>
                    <Label className="mb-2 block">
                      기관 사진 (최대 5장)
                    </Label>
                    
                    <div className="space-y-2">
                      {uploadedFiles.institutePhotos.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                          {uploadedFiles.institutePhotos.map((file, index) => (
                            <div key={index} className="flex items-center p-3 border border-gray-200 rounded-md">
                              <FileText className="w-5 h-5 text-success mr-2" />
                              <span className="flex-1 truncate">{file.name}</span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => removeFile('institutePhotos', index)}
                                className="text-destructive hover:text-destructive/90"
                              >
                                삭제
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {uploadedFiles.institutePhotos.length < 5 && (
                        <Label 
                          htmlFor="institutePhotos" 
                          className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-6 cursor-pointer hover:border-primary"
                        >
                          <Upload className="w-8 h-8 mb-2 text-gray-500" />
                          <span className="text-sm text-gray-600">기관 내/외부 사진을 업로드해주세요</span>
                          <span className="text-xs text-gray-500 mt-1">JPG, PNG 파일 (최대 5MB)</span>
                        </Label>
                      )}
                    </div>
                    
                    <Input
                      id="institutePhotos"
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, 'institutePhotos')}
                      className="hidden"
                      disabled={uploadedFiles.institutePhotos.length >= 5}
                    />
                  </div>
                  
                  <div>
                    <Label className="mb-2 block">
                      자격증 및 인증서
                    </Label>
                    
                    <div className="space-y-2">
                      {uploadedFiles.certifications.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                          {uploadedFiles.certifications.map((file, index) => (
                            <div key={index} className="flex items-center p-3 border border-gray-200 rounded-md">
                              <FileText className="w-5 h-5 text-warning mr-2" />
                              <span className="flex-1 truncate">{file.name}</span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => removeFile('certifications', index)}
                                className="text-destructive hover:text-destructive/90"
                              >
                                삭제
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <Label 
                        htmlFor="certifications" 
                        className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-6 cursor-pointer hover:border-primary"
                      >
                        <Upload className="w-8 h-8 mb-2 text-gray-500" />
                        <span className="text-sm text-gray-600">관련 자격증 및 인증서가 있다면 업로드해주세요</span>
                        <span className="text-xs text-gray-500 mt-1">PDF, JPG, PNG 파일 (최대 5MB)</span>
                      </Label>
                    </div>
                    
                    <Input
                      id="certifications"
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, 'certifications')}
                      className="hidden"
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate('/institutes')}
                  >
                    취소
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                        제출 중...
                      </>
                    ) : (
                      '인증 신청하기'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          )}
        </div>
        
        <div className="md:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BadgeCheck className="w-5 h-5 mr-2 text-primary" />
                테일즈 공식 기관 혜택
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-start">
                  <Check className="w-5 h-5 mr-2 text-success flex-shrink-0 mt-0.5" />
                  <span>위치 서비스에 공식 인증 마크와 함께 노출</span>
                </div>
                <div className="flex items-start">
                  <Check className="w-5 h-5 mr-2 text-success flex-shrink-0 mt-0.5" />
                  <span>고유 기관 코드 및 관리자 아이디 발급</span>
                </div>
                <div className="flex items-start">
                  <Check className="w-5 h-5 mr-2 text-success flex-shrink-0 mt-0.5" />
                  <span>소속 훈련사 프로필 관리 및 등록</span>
                </div>
                <div className="flex items-start">
                  <Check className="w-5 h-5 mr-2 text-success flex-shrink-0 mt-0.5" />
                  <span>통합 상담 예약 시스템 제공</span>
                </div>
                <div className="flex items-start">
                  <Check className="w-5 h-5 mr-2 text-success flex-shrink-0 mt-0.5" />
                  <span>검색 노출 우선순위 상향</span>
                </div>
                <div className="flex items-start">
                  <Check className="w-5 h-5 mr-2 text-success flex-shrink-0 mt-0.5" />
                  <span>수수료 우대 혜택 (일반 기관 대비 3% 할인)</span>
                </div>
              </div>
              
              <Separator />
              
              <div className="bg-primary/10 p-4 rounded-lg">
                <h3 className="font-medium text-primary mb-2">인증 절차 안내</h3>
                <ol className="space-y-2 text-sm text-primary">
                  <li className="flex items-start">
                    <span className="font-bold mr-2">1.</span>
                    <span>인증 신청서 작성 및 필요 서류 제출</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">2.</span>
                    <span>테일즈 담당자 검토 (3-5 영업일 소요)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">3.</span>
                    <span>승인 시 기관 코드 및 관리자 계정 발급</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">4.</span>
                    <span>공식 인증 마크 부여 및 위치 서비스 등록</span>
                  </li>
                </ol>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                  <span>서울시 강남구 테헤란로 443, 15층</span>
                </div>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-gray-500" />
                  <span>02-123-4567</span>
                </div>
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-gray-500" />
                  <span>institution@talez.co.kr</span>
                </div>
                <div className="flex items-center">
                  <Globe className="w-4 h-4 mr-2 text-gray-500" />
                  <span>https://www.talez.co.kr</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}