import React, { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useAuth } from '../../SimpleApp';
import { 
  BadgeCheck, 
  Package, 
  Truck, 
  CreditCard, 
  Check, 
  AlertCircle, 
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  Save,
  Home,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

// 커스텀 상품 타입 정의
interface CustomProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  options: {
    colors?: string[];
    sizes?: string[];
    designs?: string[];
  };
  customizationFields: {
    name: string;
    label: string;
    type: 'text' | 'select' | 'textarea' | 'file';
    options?: string[];
    required: boolean;
    maxLength?: number;
  }[];
}

// 상품 데이터 (실제로는 API에서 가져와야 함)
const customProducts: CustomProduct[] = [
  {
    id: 1,
    name: '테일즈 공식 유니폼',
    description: '당신의 이름과 로고가 새겨진 고품질 테일즈 공식 유니폼입니다.',
    price: 75000,
    imageUrl: 'https://images.unsplash.com/photo-1622445275463-afa2ab738c34?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    options: {
      colors: ['네이비', '블랙', '그레이'],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      designs: ['스탠다드', '프리미엄', '울트라']
    },
    customizationFields: [
      {
        name: 'trainerName',
        label: '훈련사 이름',
        type: 'text',
        required: true,
        maxLength: 20
      },
      {
        name: 'phoneNumber',
        label: '연락처 (선택사항)',
        type: 'text',
        required: false
      },
      {
        name: 'specialNote',
        label: '특이사항',
        type: 'textarea',
        required: false
      },
      {
        name: 'logoUpload',
        label: '로고 업로드 (선택사항)',
        type: 'file',
        required: false
      }
    ]
  },
  {
    id: 2,
    name: '테일즈 공식 명함',
    description: '프리미엄 디자인의 테일즈 공식 인증 훈련사 명함입니다.',
    price: 35000,
    imageUrl: 'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    options: {
      designs: ['미니멀', '클래식', '모던', '프로페셔널']
    },
    customizationFields: [
      {
        name: 'trainerName',
        label: '훈련사 이름',
        type: 'text',
        required: true,
        maxLength: 20
      },
      {
        name: 'title',
        label: '직함',
        type: 'text',
        required: true,
        maxLength: 30
      },
      {
        name: 'phoneNumber',
        label: '연락처',
        type: 'text',
        required: true
      },
      {
        name: 'email',
        label: '이메일',
        type: 'text',
        required: true
      },
      {
        name: 'address',
        label: '주소',
        type: 'text',
        required: true
      },
      {
        name: 'specialNote',
        label: '특이사항',
        type: 'textarea',
        required: false
      },
      {
        name: 'logoUpload',
        label: '로고 업로드 (선택사항)',
        type: 'file',
        required: false
      }
    ]
  }
];

export default function CustomOrderPage() {
  const [match, params] = useRoute<{ id: string }>('/shop/custom-order/:id');
  const [location, navigate] = useLocation();
  const { isAuthenticated, userRole } = useAuth();
  const { toast } = useToast();

  const [product, setProduct] = useState<CustomProduct | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [customizationData, setCustomizationData] = useState<Record<string, string>>({});
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [deliveryInfo, setDeliveryInfo] = useState({
    name: '',
    phone: '',
    zipcode: '',
    address1: '',
    address2: '',
    memo: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('card');

  // 제품 정보 로드
  useEffect(() => {
    if (params && params.id) {
      const foundProduct = customProducts.find(p => p.id === Number(params.id));
      if (foundProduct) {
        setProduct(foundProduct);
        
        // 기본 옵션 설정
        const defaultOptions: Record<string, string> = {};
        if (foundProduct.options.colors?.length) {
          defaultOptions.color = foundProduct.options.colors[0];
        }
        if (foundProduct.options.sizes?.length) {
          defaultOptions.size = foundProduct.options.sizes[0];
        }
        if (foundProduct.options.designs?.length) {
          defaultOptions.design = foundProduct.options.designs[0];
        }
        setSelectedOptions(defaultOptions);
      } else {
        navigate('/trainer-dashboard/certification');
      }
    }
  }, [params, navigate]);

  // 인증되지 않은 사용자나 훈련사가 아닌 사용자 리디렉션
  useEffect(() => {
    if (!isAuthenticated || userRole !== 'trainer') {
      toast({
        title: "접근 권한이 없습니다",
        description: "인증된 훈련사만 접근할 수 있는 페이지입니다.",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [isAuthenticated, userRole, navigate, toast]);

  // 파일 업로드 처리
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // 파일 크기 제한 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "파일 크기 초과",
          description: "파일 크기는 5MB 이하여야 합니다.",
          variant: "destructive",
        });
        return;
      }
      
      // 파일 형식 제한
      const validTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "지원되지 않는 파일 형식",
          description: "JPG, PNG, SVG 파일만 업로드 가능합니다.",
          variant: "destructive",
        });
        return;
      }
      
      setUploadedFile(file);
      toast({
        title: "파일 업로드 완료",
        description: file.name,
      });
    }
  };

  // 각 단계별 상태 유효성 검사
  const validateStep = (step: number): boolean => {
    switch(step) {
      case 0: // 옵션 선택 단계
        return Object.keys(selectedOptions).length > 0;
        
      case 1: // 커스터마이징 단계
        if (!product) return false;
        
        // 필수 필드 검사
        const requiredFields = product.customizationFields
          .filter(field => field.required)
          .map(field => field.name);
        
        return requiredFields.every(field => 
          customizationData[field] && customizationData[field].trim() !== ''
        );
        
      case 2: // 배송 정보 단계
        return (
          deliveryInfo.name.trim() !== '' &&
          deliveryInfo.phone.trim() !== '' &&
          deliveryInfo.zipcode.trim() !== '' &&
          deliveryInfo.address1.trim() !== ''
        );
        
      default:
        return true;
    }
  };

  // 다음 단계로 이동
  const goToNextStep = () => {
    if (!validateStep(currentStep)) {
      toast({
        title: "필수 항목을 입력해주세요",
        variant: "destructive",
      });
      return;
    }
    
    setCurrentStep(prev => prev + 1);
  };

  // 이전 단계로 이동
  const goToPrevStep = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  // 주문 제출
  const submitOrder = () => {
    if (!validateStep(currentStep)) {
      toast({
        title: "필수 항목을 입력해주세요",
        variant: "destructive",
      });
      return;
    }
    
    // 실제로는 API 호출을 통해 주문을 제출해야 함
    toast({
      title: "주문이 성공적으로 제출되었습니다",
      description: "주문 내역은 마이페이지에서 확인할 수 있습니다.",
    });
    
    // 주문 확인 페이지로 이동
    navigate('/shop/order-complete');
  };

  // 커스터마이징 데이터 업데이트
  const updateCustomizationData = (name: string, value: string) => {
    setCustomizationData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 배송 정보 업데이트
  const updateDeliveryInfo = (name: string, value: string) => {
    setDeliveryInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!product) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center text-sm text-gray-500 mb-6">
        <a href="/shop" className="hover:text-primary">쇼핑</a>
        <ChevronRight className="w-4 h-4 mx-1" />
        <a href="/trainer-dashboard/certification" className="hover:text-primary">인증 마크</a>
        <ChevronRight className="w-4 h-4 mx-1" />
        <span className="text-gray-700 font-medium">커스텀 주문</span>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <BadgeCheck className="w-5 h-5 mr-2 text-primary" />
          {product.name} 주문
        </h1>
        <Badge className="bg-warning/10 text-warning border-warning/30">
          테일즈 인증 훈련사 전용
        </Badge>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg mb-8">
        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep >= 0 ? 'bg-primary text-white' : 'bg-gray-300'
          }`}>
            1
          </div>
          <div className="h-1 bg-gray-300 flex-1">
            <div 
              className="h-full bg-primary transition-all" 
              style={{ width: currentStep >= 1 ? '100%' : '0%' }}
            ></div>
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep >= 1 ? 'bg-primary text-white' : 'bg-gray-300'
          }`}>
            2
          </div>
          <div className="h-1 bg-gray-300 flex-1">
            <div 
              className="h-full bg-primary transition-all" 
              style={{ width: currentStep >= 2 ? '100%' : '0%' }}
            ></div>
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep >= 2 ? 'bg-primary text-white' : 'bg-gray-300'
          }`}>
            3
          </div>
          <div className="h-1 bg-gray-300 flex-1">
            <div 
              className="h-full bg-primary transition-all" 
              style={{ width: currentStep >= 3 ? '100%' : '0%' }}
            ></div>
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep >= 3 ? 'bg-primary text-white' : 'bg-gray-300'
          }`}>
            4
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-600">
          <span>옵션 선택</span>
          <span>커스터마이징</span>
          <span>배송 정보</span>
          <span>결제</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          {/* 단계 1: 옵션 선택 */}
          {currentStep === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>옵션 선택</CardTitle>
                <CardDescription>
                  {product.name}의 옵션을 선택해주세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {product.options.colors && (
                  <div>
                    <Label className="text-base">색상</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {product.options.colors.map((color) => (
                        <Button
                          key={color}
                          type="button"
                          variant={selectedOptions.color === color ? 'default' : 'outline'}
                          className="w-full"
                          onClick={() => setSelectedOptions({...selectedOptions, color})}
                        >
                          {color}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {product.options.sizes && (
                  <div>
                    <Label className="text-base">사이즈</Label>
                    <div className="grid grid-cols-5 gap-2 mt-2">
                      {product.options.sizes.map((size) => (
                        <Button
                          key={size}
                          type="button"
                          variant={selectedOptions.size === size ? 'default' : 'outline'}
                          className="w-full"
                          onClick={() => setSelectedOptions({...selectedOptions, size})}
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {product.options.designs && (
                  <div>
                    <Label className="text-base">디자인</Label>
                    <RadioGroup 
                      defaultValue={product.options.designs[0]}
                      value={selectedOptions.design}
                      onValueChange={(value) => setSelectedOptions({...selectedOptions, design: value})}
                      className="grid grid-cols-1 gap-2 mt-2"
                    >
                      {product.options.designs.map((design) => (
                        <div key={design} className="flex items-center space-x-2 border border-gray-200 rounded-md p-3">
                          <RadioGroupItem value={design} id={design} />
                          <Label htmlFor={design} className="flex-1 cursor-pointer font-medium">
                            {design}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => navigate('/trainer-dashboard/certification')}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  돌아가기
                </Button>
                <Button onClick={goToNextStep}>
                  다음
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* 단계 2: 커스터마이징 */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>커스터마이징</CardTitle>
                <CardDescription>
                  {product.name}의 커스터마이징 정보를 입력해주세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {product.customizationFields.map((field) => (
                  <div key={field.name}>
                    <Label htmlFor={field.name} className="text-base">
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    
                    {field.type === 'text' && (
                      <Input
                        id={field.name}
                        placeholder={field.label}
                        value={customizationData[field.name] || ''}
                        onChange={(e) => updateCustomizationData(field.name, e.target.value)}
                        className="mt-2"
                        maxLength={field.maxLength}
                      />
                    )}
                    
                    {field.type === 'textarea' && (
                      <Textarea
                        id={field.name}
                        placeholder={field.label}
                        value={customizationData[field.name] || ''}
                        onChange={(e) => updateCustomizationData(field.name, e.target.value)}
                        className="mt-2"
                      />
                    )}
                    
                    {field.type === 'select' && field.options && (
                      <Select
                        value={customizationData[field.name]}
                        onValueChange={(value) => updateCustomizationData(field.name, value)}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder={`${field.label} 선택`} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    {field.type === 'file' && (
                      <div className="mt-2">
                        <Label
                          htmlFor={field.name}
                          className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-6 cursor-pointer hover:border-primary"
                        >
                          {uploadedFile ? (
                            <div className="flex items-center text-success">
                              <Check className="w-5 h-5 mr-2" />
                              <span>{uploadedFile.name}</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center text-gray-500">
                              <UploadCloud className="w-8 h-8 mb-2" />
                              <span className="text-sm">클릭하여 파일 업로드</span>
                              <span className="text-xs mt-1">JPG, PNG, SVG 파일 (최대 5MB)</span>
                            </div>
                          )}
                        </Label>
                        <Input
                          id={field.name}
                          type="file"
                          accept=".jpg,.jpeg,.png,.svg"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={goToPrevStep}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  이전
                </Button>
                <Button onClick={goToNextStep}>
                  다음
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* 단계 3: 배송 정보 */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>배송 정보</CardTitle>
                <CardDescription>
                  {product.name}을 받을 배송지 정보를 입력해주세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="name" className="text-base">
                    수령인 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="수령인 이름"
                    value={deliveryInfo.name}
                    onChange={(e) => updateDeliveryInfo('name', e.target.value)}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone" className="text-base">
                    연락처 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phone"
                    placeholder="연락 가능한 전화번호"
                    value={deliveryInfo.phone}
                    onChange={(e) => updateDeliveryInfo('phone', e.target.value)}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="zipcode" className="text-base">
                    우편번호 <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="zipcode"
                      placeholder="우편번호"
                      value={deliveryInfo.zipcode}
                      onChange={(e) => updateDeliveryInfo('zipcode', e.target.value)}
                      className="flex-1"
                    />
                    <Button variant="outline">우편번호 찾기</Button>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="address1" className="text-base">
                    주소 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="address1"
                    placeholder="기본 주소"
                    value={deliveryInfo.address1}
                    onChange={(e) => updateDeliveryInfo('address1', e.target.value)}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="address2" className="text-base">
                    상세 주소
                  </Label>
                  <Input
                    id="address2"
                    placeholder="상세 주소 (선택사항)"
                    value={deliveryInfo.address2}
                    onChange={(e) => updateDeliveryInfo('address2', e.target.value)}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="memo" className="text-base">
                    배송 메모
                  </Label>
                  <Textarea
                    id="memo"
                    placeholder="배송시 요청사항 (선택사항)"
                    value={deliveryInfo.memo}
                    onChange={(e) => updateDeliveryInfo('memo', e.target.value)}
                    className="mt-2"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={goToPrevStep}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  이전
                </Button>
                <Button onClick={goToNextStep}>
                  다음
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* 단계 4: 결제 */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>결제</CardTitle>
                <CardDescription>
                  결제 방법을 선택하고 주문을 완료합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base">결제 방법</Label>
                  <RadioGroup 
                    defaultValue="card"
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    className="grid grid-cols-1 gap-2 mt-2"
                  >
                    <div className="flex items-center space-x-2 border border-gray-200 rounded-md p-3">
                      <RadioGroupItem value="card" id="card" />
                      <Label htmlFor="card" className="flex-1 cursor-pointer font-medium">
                        신용카드
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 border border-gray-200 rounded-md p-3">
                      <RadioGroupItem value="bank" id="bank" />
                      <Label htmlFor="bank" className="flex-1 cursor-pointer font-medium">
                        무통장 입금
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 border border-gray-200 rounded-md p-3">
                      <RadioGroupItem value="phone" id="phone" />
                      <Label htmlFor="phone" className="flex-1 cursor-pointer font-medium">
                        휴대폰 결제
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>무통장 입금 안내</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 text-sm">
                        <p>입금은행: XXX은행</p>
                        <p>계좌번호: 123-456-789</p>
                        <p>예금주: (주)테일즈</p>
                        <p className="text-destructive">
                          * 주문 후 3일 이내 미입금 시 자동으로 주문이 취소됩니다.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">주문 내용 확인</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
                      <Check className="w-4 h-4 mr-2 text-success" />
                      상품: {product.name}
                    </li>
                    {selectedOptions.color && (
                      <li className="flex items-center">
                        <Check className="w-4 h-4 mr-2 text-success" />
                        색상: {selectedOptions.color}
                      </li>
                    )}
                    {selectedOptions.size && (
                      <li className="flex items-center">
                        <Check className="w-4 h-4 mr-2 text-success" />
                        사이즈: {selectedOptions.size}
                      </li>
                    )}
                    {selectedOptions.design && (
                      <li className="flex items-center">
                        <Check className="w-4 h-4 mr-2 text-success" />
                        디자인: {selectedOptions.design}
                      </li>
                    )}
                    <li className="flex items-center">
                      <Check className="w-4 h-4 mr-2 text-success" />
                      배송지: {deliveryInfo.zipcode} {deliveryInfo.address1} {deliveryInfo.address2}
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 mr-2 text-success" />
                      수령인: {deliveryInfo.name} ({deliveryInfo.phone})
                    </li>
                  </ul>
                </div>
                
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="agreement" 
                    className="mr-2"
                  />
                  <Label htmlFor="agreement" className="text-sm cursor-pointer">
                    주문 내용 확인 및 결제에 동의합니다.
                  </Label>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={goToPrevStep}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  이전
                </Button>
                <Button onClick={submitOrder}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  결제하기
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>

        {/* 주문 요약 정보 */}
        <div className="md:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>주문 요약</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center">
                <div className="w-20 h-20 rounded-md overflow-hidden mr-4 flex-shrink-0">
                  <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-medium">{product.name}</h3>
                  <Badge className="mt-1">테일즈 인증 전용</Badge>
                </div>
              </div>
              
              <Separator />
              
              {Object.keys(selectedOptions).length > 0 && (
                <>
                  <div className="space-y-2">
                    <h3 className="font-medium">선택 옵션</h3>
                    {selectedOptions.color && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">색상</span>
                        <span>{selectedOptions.color}</span>
                      </div>
                    )}
                    {selectedOptions.size && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">사이즈</span>
                        <span>{selectedOptions.size}</span>
                      </div>
                    )}
                    {selectedOptions.design && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">디자인</span>
                        <span>{selectedOptions.design}</span>
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                </>
              )}
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">상품 금액</span>
                  <span>{product.price.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">배송비</span>
                  <span>무료</span>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex justify-between font-bold text-lg">
                <span>총 결제 금액</span>
                <span>{product.price.toLocaleString()}원</span>
              </div>
              
              <div className="bg-warning/10 border border-warning/30 rounded-md p-3 text-sm text-warning">
                <div className="flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>
                    테일즈 인증 훈련사 전용 상품입니다. 주문 후 제작되어 약 7-10일 내로 배송됩니다.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}