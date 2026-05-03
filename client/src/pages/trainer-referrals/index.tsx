import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tag,
  Search,
  RefreshCw,
  Copy,
  Check,
  PlusCircle,
  ShoppingCart,
  ExternalLink,
  ArrowUpRight,
  Percent,
  CircleDollarSign,
  Clipboard,
  Share,
  MoreVertical
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  imageUrl: string;
  availableForReferral: boolean;
  commissionRate: number;
  manufacturer: string;
  ratings: number;
  isRecommended: boolean;
}

interface Referral {
  id: string;
  code: string;
  productId: string;
  productName: string;
  productImageUrl: string;
  productPrice: number;
  created: Date;
  clicks: number;
  purchases: number;
  commission: number;
  commissionRate: number;
  status: 'active' | 'inactive';
}

interface CommissionSummary {
  totalCommission: number;
  pendingCommission: number;
  paidCommission: number;
  referralsCount: number;
  clicksCount: number;
  purchasesCount: number;
  conversionRate: number;
}

export default function TrainerReferrals() {
  const { userName } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('my-referrals');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showReferralStats, setShowReferralStats] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [commissionSummary, setCommissionSummary] = useState<CommissionSummary>({
    totalCommission: 0,
    pendingCommission: 0,
    paidCommission: 0,
    referralsCount: 0,
    clicksCount: 0,
    purchasesCount: 0,
    conversionRate: 0
  });
  const [instituteCode, setInstituteCode] = useState('TALES');
  const [trainerCode, setTrainerCode] = useState('TR123');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [showShareOptions, setShowShareOptions] = useState(false);
  
  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // 실제 구현 시 API 호출로 대체
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 임시 상품 데이터
        const mockProducts: Product[] = [
          {
            id: '1',
            name: '프리미엄 강아지 사료 - 닭고기와 현미',
            description: '영양 균형이 완벽한 프리미엄 강아지 사료입니다. 국내산 신선한 닭고기와 현미를 주 원료로 하여 반려견의 건강한 성장과 유지에 필요한 모든 영양소를 함유하고 있습니다. 인공색소, 향료, 방부제를 첨가하지 않았습니다.',
            category: '사료',
            price: 65000,
            imageUrl: 'https://placehold.co/400x300/png?text=Premium+Dog+Food',
            availableForReferral: true,
            commissionRate: 10,
            manufacturer: '건강한 펫푸드',
            ratings: 4.8,
            isRecommended: true
          },
          {
            id: '2',
            name: '반려동물 자동 급식기',
            description: '스마트폰으로 제어 가능한 자동 급식기입니다. 정해진 시간에 자동으로 사료를 제공하며, 원격으로 제어할 수 있어 외출이 잦은 보호자에게 적합합니다. 최대 5끼 분량을 저장할 수 있으며, 청소가 용이한 구조입니다.',
            category: '용품',
            price: 89000,
            imageUrl: 'https://placehold.co/400x300/png?text=Auto+Feeder',
            availableForReferral: true,
            commissionRate: 8,
            manufacturer: '스마트펫 테크',
            ratings: 4.5,
            isRecommended: true
          },
          {
            id: '3',
            name: '강아지 노즈워크 장난감 세트',
            description: '반려견의 두뇌 발달과 스트레스 해소에 효과적인 노즈워크 장난감 세트입니다. 다양한 난이도의 퍼즐 5종이 포함되어 있어 단계별로 훈련이 가능합니다. 식품 등급 소재로 제작되어 안전합니다.',
            category: '장난감',
            price: 45000,
            imageUrl: 'https://placehold.co/400x300/png?text=Nose+Work+Toys',
            availableForReferral: true,
            commissionRate: 12,
            manufacturer: '펫플레이',
            ratings: 4.7,
            isRecommended: true
          },
          {
            id: '4',
            name: '강아지 방수 패딩',
            description: '추운 겨울에 반려견을 따뜻하게 보호해주는 고급 패딩입니다. 방수 소재로 제작되어 눈이나 비가 오는 날에도 사용할 수 있으며, 내부는 부드러운 양털 소재로 보온성이 뛰어납니다. 사이즈는 XS부터 XL까지 다양하게 구비되어 있습니다.',
            category: '의류',
            price: 52000,
            imageUrl: 'https://placehold.co/400x300/png?text=Dog+Padding',
            availableForReferral: true,
            commissionRate: 9,
            manufacturer: '펫패션',
            ratings: 4.6,
            isRecommended: false
          },
          {
            id: '5',
            name: '반려동물 목욕 샤워기',
            description: '반려동물 전용 샤워기로, 수압 조절이 가능하며 샴푸 디스펜서가 내장되어 있습니다. 실리콘 브러시 헤드가 포함되어 있어 목욕 중 마사지 효과를 줄 수 있으며, 표준 수도꼭지에 쉽게 장착할 수 있습니다.',
            category: '미용',
            price: 37000,
            imageUrl: 'https://placehold.co/400x300/png?text=Pet+Shower',
            availableForReferral: true,
            commissionRate: 7,
            manufacturer: '클린펫',
            ratings: 4.3,
            isRecommended: false
          },
          {
            id: '6',
            name: '고양이 스크래처 타워',
            description: '고양이의 본능적인 행동을 충족시켜주는 대형 스크래처 타워입니다. 견고한 기둥과 여러 층으로 구성되어 있으며, 숨을 수 있는 공간과 놀이 공간이 포함되어 있습니다. 고품질 사이잘 소재로 제작되어 내구성이 뛰어납니다.',
            category: '용품',
            price: 120000,
            imageUrl: 'https://placehold.co/400x300/png?text=Cat+Tower',
            availableForReferral: true,
            commissionRate: 8.5,
            manufacturer: '캣하우스',
            ratings: 4.9,
            isRecommended: false
          }
        ];
        
        // 임시 추천 링크 데이터
        const mockReferrals: Referral[] = [
          {
            id: '1',
            code: 'TALES-TR123-FOOD1',
            productId: '1',
            productName: '프리미엄 강아지 사료 - 닭고기와 현미',
            productImageUrl: 'https://placehold.co/400x300/png?text=Premium+Dog+Food',
            productPrice: 65000,
            created: new Date('2024-05-01'),
            clicks: 124,
            purchases: 18,
            commission: 117000,
            commissionRate: 10,
            status: 'active'
          },
          {
            id: '2',
            code: 'TALES-TR123-FEEDER',
            productId: '2',
            productName: '반려동물 자동 급식기',
            productImageUrl: 'https://placehold.co/400x300/png?text=Auto+Feeder',
            productPrice: 89000,
            created: new Date('2024-05-05'),
            clicks: 85,
            purchases: 7,
            commission: 49840,
            commissionRate: 8,
            status: 'active'
          },
          {
            id: '3',
            code: 'TALES-TR123-TOYS',
            productId: '3',
            productName: '강아지 노즈워크 장난감 세트',
            productImageUrl: 'https://placehold.co/400x300/png?text=Nose+Work+Toys',
            productPrice: 45000,
            created: new Date('2024-05-08'),
            clicks: 56,
            purchases: 5,
            commission: 27000,
            commissionRate: 12,
            status: 'active'
          }
        ];
        
        // 임시 요약 데이터
        const mockSummary: CommissionSummary = {
          totalCommission: 193840,
          pendingCommission: 42500,
          paidCommission: 151340,
          referralsCount: 3,
          clicksCount: 265,
          purchasesCount: 30,
          conversionRate: 11.32
        };
        
        setProducts(mockProducts);
        setFilteredProducts(mockProducts);
        setReferrals(mockReferrals);
        setCommissionSummary(mockSummary);
        
      } catch (error) {
        console.error('데이터 로딩 오류:', error);
        toast({
          title: '데이터 로딩 오류',
          description: '데이터를 불러오는 중 오류가 발생했습니다.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [toast]);
  
  // 필터링
  useEffect(() => {
    let result = [...products];
    
    // 검색어 필터링
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        product => 
          product.name.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query) ||
          product.manufacturer.toLowerCase().includes(query)
      );
    }
    
    // 카테고리 필터링
    if (categoryFilter) {
      result = result.filter(product => product.category === categoryFilter);
    }
    
    setFilteredProducts(result);
  }, [products, searchQuery, categoryFilter]);
  
  // 숫자 포맷팅 (가격)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // 날짜 포맷팅
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ko-KR').format(date);
  };
  
  // 추천 코드 생성
  const generateReferralCode = (product: Product) => {
    const productSlug = product.name
      .split(' ')[0]
      .toUpperCase();
    return `${instituteCode}-${trainerCode}-${productSlug}`;
  };
  
  // 특정 상품에 대한 추천 링크 생성
  const createReferral = (product: Product) => {
    // 이미 같은 상품에 대한 추천 링크가 있는지 확인
    const existingReferral = referrals.find(r => r.productId === product.id);
    if (existingReferral) {
      setSelectedReferral(existingReferral);
      setShowReferralStats(true);
      return;
    }
    
    const code = generateReferralCode(product);
    
    const newReferral: Referral = {
      id: Date.now().toString(),
      code,
      productId: product.id,
      productName: product.name,
      productImageUrl: product.imageUrl,
      productPrice: product.price,
      created: new Date(),
      clicks: 0,
      purchases: 0,
      commission: 0,
      commissionRate: product.commissionRate,
      status: 'active'
    };
    
    setReferrals(prev => [newReferral, ...prev]);
    setCommissionSummary(prev => ({
      ...prev,
      referralsCount: prev.referralsCount + 1
    }));
    
    setSelectedReferral(newReferral);
    setShowReferralStats(true);
    
    toast({
      title: '추천 링크 생성됨',
      description: `${product.name}에 대한 추천 링크가 생성되었습니다.`,
    });
  };
  
  // 추천 링크 복사
  const copyReferralLink = (code: string) => {
    const referralLink = `https://shop.talespet.com/?ref=${code}`;
    navigator.clipboard.writeText(referralLink);
    setCopySuccess(code);
    
    setTimeout(() => {
      setCopySuccess(null);
    }, 2000);
    
    toast({
      title: '링크 복사됨',
      description: '추천 링크가 클립보드에 복사되었습니다.',
    });
  };
  
  // 상품 상세 보기
  const viewProductDetail = (product: Product) => {
    setSelectedProduct(product);
    setShowProductDetail(true);
  };
  
  // 추천 링크 통계 보기
  const viewReferralStats = (referral: Referral) => {
    setSelectedReferral(referral);
    setShowReferralStats(true);
  };
  
  // 데이터 새로고침
  const handleRefresh = () => {
    setIsLoading(true);
    
    // 실제 구현 시 API 호출로 대체
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: '새로고침 완료',
        description: '데이터가 업데이트되었습니다.',
      });
    }, 1000);
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* 상품 상세 모달 */}
      <Dialog open={showProductDetail} onOpenChange={setShowProductDetail}>
        <DialogContent className="max-w-4xl">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {selectedProduct.name}
                </DialogTitle>
                <DialogDescription>
                  {selectedProduct.category} · {selectedProduct.manufacturer}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="aspect-square rounded-md overflow-hidden bg-muted">
                    <img 
                      src={selectedProduct.imageUrl} 
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">상품 설명</h3>
                    <p className="text-muted-foreground">
                      {selectedProduct.description}
                    </p>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">판매가</p>
                      <p className="text-xl font-bold">{formatCurrency(selectedProduct.price)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">수수료율</p>
                      <p className="text-xl font-bold text-success">{selectedProduct.commissionRate}%</p>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-2">이 상품을 구매하면 얻는 수수료:</p>
                    <p className="text-lg font-bold text-success">
                      {formatCurrency(selectedProduct.price * (selectedProduct.commissionRate / 100))}
                    </p>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <div className="flex justify-between w-full">
                  <Button variant="outline" asChild>
                    <a href={`https://shop.talespet.com/products/${selectedProduct.id}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      상품 페이지 보기
                    </a>
                  </Button>
                  <Button onClick={() => createReferral(selectedProduct)}>
                    <Tag className="h-4 w-4 mr-2" />
                    추천 링크 생성
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* 추천 링크 통계 모달 */}
      <Dialog open={showReferralStats} onOpenChange={setShowReferralStats}>
        <DialogContent className="max-w-3xl">
          {selectedReferral && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">추천 링크 정보</DialogTitle>
                <DialogDescription>
                  {selectedReferral.productName}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium">클릭수</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{selectedReferral.clicks}</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium">구매수</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{selectedReferral.purchases}</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium">전환율</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {selectedReferral.clicks > 0 
                          ? ((selectedReferral.purchases / selectedReferral.clicks) * 100).toFixed(1) 
                          : '0.0'}%
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">추천 코드</h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyReferralLink(selectedReferral.code)}
                      className="h-8"
                    >
                      {copySuccess === selectedReferral.code ? (
                        <Check className="h-4 w-4 mr-1 text-success" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1" />
                      )}
                      복사
                    </Button>
                  </div>
                  <div className="bg-muted p-2 rounded flex items-center">
                    <code className="text-sm flex-1">{selectedReferral.code}</code>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <h3 className="font-medium">추천 링크</h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyReferralLink(selectedReferral.code)}
                      className="h-8"
                    >
                      {copySuccess === selectedReferral.code ? (
                        <Check className="h-4 w-4 mr-1 text-success" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1" />
                      )}
                      복사
                    </Button>
                  </div>
                  <div className="bg-muted p-2 rounded flex items-center">
                    <code className="text-sm truncate flex-1">
                      https://shop.talespet.com/?ref={selectedReferral.code}
                    </code>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">수익 정보</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>상품가격</TableHead>
                        <TableHead>수수료율</TableHead>
                        <TableHead>건당 수수료</TableHead>
                        <TableHead className="text-right">총 수익</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>{formatCurrency(selectedReferral.productPrice)}</TableCell>
                        <TableCell>{selectedReferral.commissionRate}%</TableCell>
                        <TableCell>{formatCurrency(selectedReferral.productPrice * (selectedReferral.commissionRate / 100))}</TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(selectedReferral.commission)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              <DialogFooter>
                <div className="flex justify-between w-full">
                  <DialogTrigger asChild>
                    <Button variant="outline" onClick={() => setShowShareOptions(true)}>
                      <Share className="h-4 w-4 mr-2" />
                      공유하기
                    </Button>
                  </DialogTrigger>
                  <div>
                    <Button asChild className="ml-2">
                      <a 
                        href={`https://shop.talespet.com/?ref=${selectedReferral.code}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        링크 테스트
                      </a>
                    </Button>
                  </div>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* 공유 옵션 모달 */}
      <Dialog open={showShareOptions} onOpenChange={setShowShareOptions}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>추천 링크 공유하기</DialogTitle>
            <DialogDescription>
              다양한 채널로 추천 링크를 공유해보세요
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Button variant="outline" className="w-full justify-start" onClick={() => {
              toast({
                title: '카카오톡으로 공유',
                description: '카카오톡 공유가 실행되었습니다.',
              });
            }}>
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="hsl(var(--warning))">
                <path d="M12 3C6.921 3 3 6.921 3 12c0 5.079 6.921 9 12 9s9-3.921 9-9c0-5.079-3.921-9-9-9zm0 14.25c-.375 0-.675-.3-.675-.675s.3-.675.675-.675.675.3.675.675-.3.675-.675.675zm3.12-5.64H8.88c-.36 0-.66-.3-.66-.66s.3-.66.66-.66h6.24c.36 0 .66.3.66.66s-.3.66-.66.66z"/>
              </svg>
              카카오톡으로 공유
            </Button>
            
            <Button variant="outline" className="w-full justify-start" onClick={() => {
              toast({
                title: '페이스북으로 공유',
                description: '페이스북 공유가 실행되었습니다.',
              });
            }}>
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="hsl(var(--primary))">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
              </svg>
              페이스북으로 공유
            </Button>
            
            <Button variant="outline" className="w-full justify-start" onClick={() => {
              toast({
                title: '문자 메시지로 공유',
                description: '문자 메시지 공유가 실행되었습니다.',
              });
            }}>
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
              </svg>
              문자 메시지로 공유
            </Button>
            
            <Button variant="outline" className="w-full justify-start" onClick={() => {
              copyReferralLink(selectedReferral?.code || '');
            }}>
              <Clipboard className="h-5 w-5 mr-2" />
              링크 복사하기
            </Button>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowShareOptions(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">수익 추천 관리</h1>
        <div className="flex items-center space-x-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                새 추천 링크
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>카테고리 선택</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCategoryFilter('사료')}>
                사료
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCategoryFilter('용품')}>
                용품
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCategoryFilter('장난감')}>
                장난감
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCategoryFilter('의류')}>
                의류
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCategoryFilter('미용')}>
                미용
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCategoryFilter(null)}>
                전체 보기
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* 요약 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">총 수익</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(commissionSummary.totalCommission)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(commissionSummary.pendingCommission)} 정산 대기 중
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">추천 링크</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{commissionSummary.referralsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              활성 추천 링크 수
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">클릭 / 구매</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{commissionSummary.clicksCount} / {commissionSummary.purchasesCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              전환율: {commissionSummary.conversionRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">추천코드 설정</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm flex items-center gap-2 mb-2">
              <Label htmlFor="instituteCode" className="w-20">기관코드:</Label>
              <Input 
                id="instituteCode" 
                value={instituteCode} 
                onChange={(e) => setInstituteCode(e.target.value.toUpperCase())} 
                className="h-8"
              />
            </div>
            <div className="text-sm flex items-center gap-2">
              <Label htmlFor="trainerCode" className="w-20">훈련사코드:</Label>
              <Input 
                id="trainerCode" 
                value={trainerCode} 
                onChange={(e) => setTrainerCode(e.target.value.toUpperCase())} 
                className="h-8"
              />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="my-referrals" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="my-referrals">내 추천 링크</TabsTrigger>
          <TabsTrigger value="available-products">추천 가능 상품</TabsTrigger>
        </TabsList>
        
        <TabsContent value="my-referrals" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : referrals.length === 0 ? (
            <div className="text-center p-12 border rounded-lg">
              <Tag className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">추천 링크가 없습니다</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                아직 생성된 추천 링크가 없습니다. '추천 가능 상품' 탭에서 원하는 상품을 선택하여 추천 링크를 만들어보세요.
              </p>
              <Button 
                className="mt-4"
                onClick={() => setActiveTab('available-products')}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                새 추천 링크 만들기
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Input
                  placeholder="추천 링크 검색..."
                  className="max-w-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="flex space-x-2">
                  <Select value={categoryFilter || 'all'} onValueChange={(value) => setCategoryFilter(value === 'all' ? null : value)}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="카테고리" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">모든 카테고리</SelectItem>
                      <SelectItem value="사료">사료</SelectItem>
                      <SelectItem value="용품">용품</SelectItem>
                      <SelectItem value="장난감">장난감</SelectItem>
                      <SelectItem value="의류">의류</SelectItem>
                      <SelectItem value="미용">미용</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {referrals.map((referral) => (
                  <Card key={referral.id} className="overflow-hidden">
                    <div className="aspect-[4/3] relative">
                      <img 
                        src={referral.productImageUrl} 
                        alt={referral.productName}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                    <CardHeader className="pb-0">
                      <div className="flex justify-between items-center">
                        <Badge variant="outline">
                          {referral.commissionRate}% 수수료
                        </Badge>
                        <p className="text-sm font-medium">
                          {formatCurrency(referral.productPrice)}
                        </p>
                      </div>
                      <CardTitle className="mt-2 text-lg truncate">{referral.productName}</CardTitle>
                      <div className="flex space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <ArrowUpRight className="mr-1 h-4 w-4" />
                          {referral.clicks} 클릭
                        </div>
                        <div className="flex items-center">
                          <ShoppingCart className="mr-1 h-4 w-4" />
                          {referral.purchases} 구매
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">추천 코드:</span>
                          <code className="bg-muted px-1 rounded text-xs">{referral.code}</code>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">수익:</span>
                          <span className="font-bold text-success">{formatCurrency(referral.commission)}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyReferralLink(referral.code)}
                      >
                        {copySuccess === referral.code ? (
                          <Check className="mr-1 h-4 w-4 text-success" />
                        ) : (
                          <Copy className="mr-1 h-4 w-4" />
                        )}
                        링크 복사
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewReferralStats(referral)}
                      >
                        통계 보기
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="available-products" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="상품 검색..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex space-x-2">
                  <Select value={categoryFilter || 'all'} onValueChange={(value) => setCategoryFilter(value === 'all' ? null : value)}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="카테고리" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">모든 카테고리</SelectItem>
                      <SelectItem value="사료">사료</SelectItem>
                      <SelectItem value="용품">용품</SelectItem>
                      <SelectItem value="장난감">장난감</SelectItem>
                      <SelectItem value="의류">의류</SelectItem>
                      <SelectItem value="미용">미용</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>상품명</TableHead>
                      <TableHead>카테고리</TableHead>
                      <TableHead>가격</TableHead>
                      <TableHead>수수료율</TableHead>
                      <TableHead className="text-right">액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <p className="text-muted-foreground">검색 결과가 없습니다</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product) => {
                        // 이미 추천 링크가 있는 상품인지 확인
                        const hasReferral = referrals.some(r => r.productId === product.id);
                        return (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded overflow-hidden bg-muted">
                                  <img 
                                    src={product.imageUrl} 
                                    alt={product.name}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <div>
                                  <p className="font-medium">{product.name}</p>
                                  <p className="text-xs text-muted-foreground">{product.manufacturer}</p>
                                </div>
                                {product.isRecommended && (
                                  <Badge variant="secondary" className="ml-2">추천 상품</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{product.category}</TableCell>
                            <TableCell>{formatCurrency(product.price)}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Percent className="h-3 w-3 mr-1 text-success" />
                                <span className="font-medium text-success">{product.commissionRate}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => viewProductDetail(product)}
                                >
                                  상세 보기
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => createReferral(product)}
                                  disabled={hasReferral}
                                >
                                  {hasReferral ? '링크 생성됨' : '링크 생성'}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}