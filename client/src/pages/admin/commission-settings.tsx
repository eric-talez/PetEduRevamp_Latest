import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { 
  Save, 
  Search, 
  PercentIcon, 
  Settings, 
  DollarSign, 
  AlertCircle,
  Info,
  ShoppingBag,
  PieChart,
  Users,
  Tag,
  Check,
  Undo2
} from "lucide-react";
import { useAuth } from "../../SimpleApp";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// 상품 카테고리 타입 정의
type ProductCategory = 'training' | 'toys' | 'accessories' | 'food' | 'grooming' | 'home';

// 상품 타입 정의 (shop/index.tsx와 일치시켜야 함)
interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  discountRate?: number;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  description: string;
  isNew?: boolean;
  isBestSeller?: boolean;
  isOnSale?: boolean;
  referralCommission?: number;
  inStock: boolean;
}

// 카테고리별 커미션 설정 타입
interface CategoryCommission {
  category: ProductCategory;
  label: string;
  commission: number;
  isDefault: boolean;
}

export default function CommissionSettingsPage() {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState<string>("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryCommissions, setCategoryCommissions] = useState<CategoryCommission[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [useDefaultCommission, setUseDefaultCommission] = useState<{[key: number]: boolean}>({});
  const [defaultCommission, setDefaultCommission] = useState<number>(10);
  
  // 모의 데이터 초기화 (실제로는 API에서 데이터를 가져오도록 구현)
  useEffect(() => {
    // 로컬 스토리지에서 제품 데이터 가져오기
    const storedProducts = localStorage.getItem('adminProductsCommission');
    const storedCategoryCommissions = localStorage.getItem('adminCategoryCommissions');
    const storedDefaultCommission = localStorage.getItem('adminDefaultCommission');
    
    if (storedProducts) {
      setProducts(JSON.parse(storedProducts));
    } else {
      // 초기 제품 데이터 (shop/index.tsx와 동일한 데이터)
      const initialProducts: Product[] = [
        {
          id: 1,
          name: "프리미엄 반려견 훈련용 클리커",
          category: "training",
          price: 15000,
          rating: 4.8,
          reviewCount: 126,
          imageUrl: "https://images.unsplash.com/photo-1598875384021-4a23470c7997?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
          description: "훈련사들이 추천하는 고품질 클리커. 명확한 소리로 반려견 훈련 효과를 높여줍니다.",
          isBestSeller: true,
          referralCommission: 10,
          inStock: true
        },
        {
          id: 2,
          name: "반려견 지능 개발 장난감 세트",
          category: "toys",
          price: 35000,
          discountRate: 15,
          rating: 4.6,
          reviewCount: 89,
          imageUrl: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
          description: "반려견의 지능 개발을 돕는 다양한 퍼즐 장난감 세트. 지루함 해소와 두뇌 발달에 효과적입니다.",
          isOnSale: true,
          referralCommission: 15,
          inStock: true
        },
        {
          id: 3,
          name: "프리미엄 가죽 리드줄",
          category: "accessories",
          price: 45000,
          rating: 4.9,
          reviewCount: 203,
          imageUrl: "https://images.unsplash.com/photo-1581434271564-7e273485524c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
          description: "고급 이탈리안 가죽으로 제작된 내구성 강한 리드줄. 편안한 그립감과 세련된 디자인.",
          isBestSeller: true,
          referralCommission: 12,
          inStock: true
        },
        {
          id: 4,
          name: "유기농 강아지 간식 모음",
          category: "food",
          price: 28000,
          rating: 4.7,
          reviewCount: 156,
          imageUrl: "https://images.unsplash.com/photo-1591946614720-90a587da4a36?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
          description: "100% 유기농 재료로 만든 건강한 간식 모음. 알레르기가 있는 반려견에게도 안전합니다.",
          isNew: true,
          referralCommission: 20,
          inStock: true
        },
        {
          id: 5,
          name: "반려견 행동 교정 훈련 매뉴얼",
          category: "training",
          price: 22000,
          discountRate: 10,
          rating: 4.5,
          reviewCount: 78,
          imageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
          description: "전문 훈련사가 작성한 상세한 행동 교정 가이드. 문제 행동별 단계적 훈련 방법을 제공합니다.",
          referralCommission: 25,
          inStock: true
        },
        {
          id: 6,
          name: "반려견 자동 급식기",
          category: "accessories",
          price: 89000,
          rating: 4.4,
          reviewCount: 112,
          imageUrl: "https://images.unsplash.com/photo-1603189949082-94d05ee232e2?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
          description: "스마트폰으로 제어 가능한 자동 급식기. 정해진 시간에 정확한 양의 사료를 제공합니다.",
          isNew: true,
          referralCommission: 8,
          inStock: false
        },
        {
          id: 7,
          name: "프리미엄 반려견 쿠션",
          category: "home",
          price: 68000,
          discountRate: 20,
          rating: 4.8,
          reviewCount: 95,
          imageUrl: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
          description: "메모리폼 소재의 편안한 반려견 쿠션. 관절이 약한 노령견에게 추천합니다.",
          isOnSale: true,
          referralCommission: 15,
          inStock: true
        },
        {
          id: 8,
          name: "반려견 털 관리 브러쉬 세트",
          category: "grooming",
          price: 42000,
          rating: 4.6,
          reviewCount: 132,
          imageUrl: "https://images.unsplash.com/photo-1541364983171-a8ba01e95cfc?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
          description: "다양한 털 길이와 유형에 맞는 브러쉬 세트. 효과적인 털 관리와 마사지 효과를 제공합니다.",
          isBestSeller: true,
          referralCommission: 18,
          inStock: true
        }
      ];
      
      setProducts(initialProducts);
      localStorage.setItem('adminProductsCommission', JSON.stringify(initialProducts));
      
      // 초기 제품별 기본 커미션 사용 여부 설정
      const initialUseDefaultCommission: {[key: number]: boolean} = {};
      initialProducts.forEach(product => {
        initialUseDefaultCommission[product.id] = false;
      });
      setUseDefaultCommission(initialUseDefaultCommission);
    }
    
    if (storedCategoryCommissions) {
      setCategoryCommissions(JSON.parse(storedCategoryCommissions));
    } else {
      // 초기 카테고리별 커미션 설정
      const initialCategoryCommissions: CategoryCommission[] = [
        { category: 'training', label: '훈련용품', commission: 15, isDefault: false },
        { category: 'toys', label: '장난감', commission: 12, isDefault: false },
        { category: 'accessories', label: '액세서리', commission: 10, isDefault: false },
        { category: 'food', label: '간식/사료', commission: 20, isDefault: false },
        { category: 'grooming', label: '그루밍', commission: 18, isDefault: false },
        { category: 'home', label: '생활용품', commission: 15, isDefault: false }
      ];
      
      setCategoryCommissions(initialCategoryCommissions);
      localStorage.setItem('adminCategoryCommissions', JSON.stringify(initialCategoryCommissions));
    }
    
    if (storedDefaultCommission) {
      setDefaultCommission(parseInt(storedDefaultCommission));
    } else {
      localStorage.setItem('adminDefaultCommission', defaultCommission.toString());
    }
    
  }, []);

  // 필터링된 제품 목록
  const filteredProducts = products.filter(product => {
    if (searchQuery === "") return true;
    
    return (
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // 제품별 커미션 변경
  const handleProductCommissionChange = (productId: number, value: number) => {
    const updatedProducts = products.map(product => {
      if (product.id === productId) {
        return { ...product, referralCommission: value };
      }
      return product;
    });
    
    setProducts(updatedProducts);
  };

  // 카테고리별 커미션 변경
  const handleCategoryCommissionChange = (category: ProductCategory, value: number) => {
    const updatedCategoryCommissions = categoryCommissions.map(cat => {
      if (cat.category === category) {
        return { ...cat, commission: value };
      }
      return cat;
    });
    
    setCategoryCommissions(updatedCategoryCommissions);
  };

  // 기본 커미션 사용 여부 변경
  const handleUseDefaultCommissionChange = (productId: number, value: boolean) => {
    setUseDefaultCommission(prev => ({
      ...prev,
      [productId]: value
    }));

    if (value) {
      // 기본 커미션 사용 시 제품 커미션을 기본 커미션으로 설정
      const product = products.find(p => p.id === productId);
      if (product) {
        const categoryCommission = categoryCommissions.find(c => c.category === product.category);
        const commissionValue = categoryCommission ? categoryCommission.commission : defaultCommission;
        
        handleProductCommissionChange(productId, commissionValue);
      }
    }
  };

  // 변경사항 저장
  const saveChanges = () => {
    setIsSaving(true);
    
    // API 호출을 시뮬레이션
    setTimeout(() => {
      localStorage.setItem('adminProductsCommission', JSON.stringify(products));
      localStorage.setItem('adminCategoryCommissions', JSON.stringify(categoryCommissions));
      localStorage.setItem('adminDefaultCommission', defaultCommission.toString());
      
      setIsSaving(false);
      
      // 실제 구현에서는 쇼핑몰 제품 데이터에도 변경사항을 반영
      const shopProducts = JSON.parse(localStorage.getItem('shopProducts') || '[]');
      if (shopProducts.length > 0) {
        const updatedShopProducts = shopProducts.map((shopProduct: Product) => {
          const updatedProduct = products.find(p => p.id === shopProduct.id);
          if (updatedProduct) {
            return { ...shopProduct, referralCommission: updatedProduct.referralCommission };
          }
          return shopProduct;
        });
        
        localStorage.setItem('shopProducts', JSON.stringify(updatedShopProducts));
      }
    }, 1000);
  };

  // 카테고리에 일괄 적용
  const applyToCategory = (category: string) => {
    const categoryCommission = categoryCommissions.find(c => c.category === category);
    if (!categoryCommission) return;
    
    const updatedProducts = products.map(product => {
      if (product.category === category) {
        return { ...product, referralCommission: categoryCommission.commission };
      }
      return product;
    });
    
    setProducts(updatedProducts);
  };

  // 기본값으로 재설정
  const resetToDefault = () => {
    const updatedProducts = products.map(product => {
      const categoryCommission = categoryCommissions.find(c => c.category === product.category);
      return { 
        ...product, 
        referralCommission: categoryCommission ? categoryCommission.commission : defaultCommission 
      };
    });
    
    setProducts(updatedProducts);
  };

  // 제품의 카테고리 레이블 가져오기
  const getCategoryLabel = (category: string): string => {
    const cat = categoryCommissions.find(c => c.category === category);
    return cat ? cat.label : category;
  };

  // 모든 카테고리에 기본 커미션 적용
  const applyDefaultToAllCategories = () => {
    const updatedCategoryCommissions = categoryCommissions.map(cat => ({
      ...cat,
      commission: defaultCommission,
      isDefault: true
    }));
    
    setCategoryCommissions(updatedCategoryCommissions);
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">커미션 설정</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            제품 및 카테고리별 추천인 커미션 비율을 관리하세요
          </p>
        </div>
        
        <Button 
          className="mt-4 md:mt-0"
          onClick={saveChanges}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <span className="animate-spin mr-2">
                <Settings className="h-4 w-4" />
              </span>
              저장 중...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              변경사항 저장
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 md:col-span-1">
          <div className="flex items-center mb-4">
            <div className="rounded-full bg-primary/10 p-2 mr-3">
              <PercentIcon className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">기본 커미션 설정</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <Label htmlFor="default-commission">전체 기본 커미션 (%)</Label>
                <span className="text-sm font-semibold">{defaultCommission}%</span>
              </div>
              <Slider
                id="default-commission"
                min={0}
                max={50}
                step={1}
                value={[defaultCommission]}
                onValueChange={(values) => setDefaultCommission(values[0])}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                다른 설정이 없는 경우 적용되는 기본값
              </p>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={applyDefaultToAllCategories}
            >
              <Check className="mr-2 h-4 w-4" />
              모든 카테고리에 적용
            </Button>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800/20 rounded-md p-3 mt-4">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-800 dark:text-yellow-400">
                  커미션이 높을수록 추천인들의 홍보 의지가 높아지지만, 플랫폼 수익이 감소할 수 있습니다. 균형있는 설정이 중요합니다.
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="md:col-span-3">
          <Card className="p-6">
            <Tabs defaultValue="products" value={activeTab} onValueChange={setActiveTab}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <TabsList>
                  <TabsTrigger value="products" className="flex items-center">
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    제품별 설정
                  </TabsTrigger>
                  <TabsTrigger value="categories" className="flex items-center">
                    <Tag className="mr-2 h-4 w-4" />
                    카테고리별 설정
                  </TabsTrigger>
                  <TabsTrigger value="statistics" className="flex items-center">
                    <div className="mr-2 h-4 w-4">
                      <PieChart className="h-4 w-4" />
                    </div>
                    통계
                  </TabsTrigger>
                </TabsList>
                
                {activeTab === 'products' && (
                  <div className="mt-4 md:mt-0 relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <Input
                      type="search"
                      placeholder="제품 검색..."
                      className="pl-9 w-[250px]"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                )}
              </div>
              
              <TabsContent value="products" className="m-0">
                {filteredProducts.length > 0 ? (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[300px]">제품명</TableHead>
                          <TableHead>카테고리</TableHead>
                          <TableHead>가격</TableHead>
                          <TableHead className="text-center">기본값 사용</TableHead>
                          <TableHead className="w-[200px]">커미션 (%)</TableHead>
                          <TableHead className="text-right">커미션 금액</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map((product) => {
                          // 해당 카테고리의 기본 커미션 가져오기
                          const categoryCommission = categoryCommissions.find(c => c.category === product.category);
                          const commissionRate = product.referralCommission || 0;
                          const commissionAmount = Math.round(product.price * (commissionRate / 100));
                          
                          return (
                            <TableRow key={product.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 rounded overflow-hidden mr-2 bg-gray-100 dark:bg-gray-800">
                                    <img 
                                      src={product.imageUrl} 
                                      alt={product.name} 
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <span className="line-clamp-1">{product.name}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {getCategoryLabel(product.category)}
                                </Badge>
                              </TableCell>
                              <TableCell>{product.price.toLocaleString()}원</TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={useDefaultCommission[product.id] || false}
                                  onCheckedChange={(checked) => handleUseDefaultCommissionChange(product.id, checked)}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Slider
                                    min={0}
                                    max={50}
                                    step={1}
                                    value={[commissionRate]}
                                    onValueChange={(values) => handleProductCommissionChange(product.id, values[0])}
                                    disabled={useDefaultCommission[product.id]}
                                  />
                                  <span className="font-medium w-10 text-right">{commissionRate}%</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {commissionAmount.toLocaleString()}원
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-10 w-10 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">검색 결과가 없습니다</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-1 mb-4">
                      다른 검색어를 입력하거나 필터를 초기화하세요.
                    </p>
                    <Button variant="outline" onClick={() => setSearchQuery("")}>
                      <Undo2 className="mr-2 h-4 w-4" />
                      필터 초기화
                    </Button>
                  </div>
                )}
                
                <div className="mt-6 flex justify-between items-center">
                  <Button variant="outline" onClick={resetToDefault}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    모두 기본값으로 재설정
                  </Button>
                  
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Info className="h-4 w-4 mr-1.5" />
                    총 {filteredProducts.length}개 제품
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="categories" className="m-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {categoryCommissions.map((category) => (
                    <Card key={category.category} className="p-5 border border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{category.label}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {products.filter(p => p.category === category.category).length}개 제품
                          </p>
                        </div>
                        <Badge variant="outline">{category.category}</Badge>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-1.5">
                            <Label>카테고리 기본 커미션 (%)</Label>
                            <span className="text-sm font-semibold">{category.commission}%</span>
                          </div>
                          <Slider
                            min={0}
                            max={50}
                            step={1}
                            value={[category.commission]}
                            onValueChange={(values) => handleCategoryCommissionChange(category.category as ProductCategory, values[0])}
                          />
                        </div>
                        
                        <div className="flex flex-col xs:flex-row gap-2">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => applyToCategory(category.category)}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            모든 제품에 적용
                          </Button>
                          
                          <Button 
                            variant="secondary" 
                            size="icon"
                            className="flex-shrink-0"
                            onClick={() => handleCategoryCommissionChange(category.category as ProductCategory, defaultCommission)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="statistics" className="m-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <Card className="p-5">
                    <div className="flex items-center">
                      <div className="rounded-full bg-green-50 dark:bg-green-900/20 p-3 mr-3">
                        <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">평균 커미션 비율</p>
                        <h3 className="text-2xl font-bold">
                          {(products.reduce((sum, product) => sum + (product.referralCommission || 0), 0) / products.length).toFixed(1)}%
                        </h3>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-5">
                    <div className="flex items-center">
                      <div className="rounded-full bg-blue-50 dark:bg-blue-900/20 p-3 mr-3">
                        <ShoppingBag className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">최다 커미션 제품</p>
                        <h3 className="text-lg font-bold leading-tight line-clamp-1">
                          {products.reduce((max, product) => 
                            (product.referralCommission || 0) > (max.referralCommission || 0) ? product : max, 
                            products[0]).name}
                        </h3>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-5">
                    <div className="flex items-center">
                      <div className="rounded-full bg-primary/5 dark:bg-primary/15 p-3 mr-3">
                        <Users className="h-6 w-6 text-primary dark:text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">활성 추천인</p>
                        <h3 className="text-2xl font-bold">26명</h3>
                      </div>
                    </div>
                  </Card>
                </div>
                
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">카테고리별 평균 커미션</h3>
                  
                  <div className="space-y-4">
                    {categoryCommissions.map((category) => {
                      const categoryProducts = products.filter(p => p.category === category.category);
                      const avgCommission = categoryProducts.length > 0 
                        ? categoryProducts.reduce((sum, product) => sum + (product.referralCommission || 0), 0) / categoryProducts.length
                        : 0;
                        
                      return (
                        <div key={category.category}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">{category.label}</span>
                            <span className="text-sm font-semibold">{avgCommission.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
                            <div 
                              className="bg-primary h-2.5 rounded-full" 
                              style={{ width: `${(avgCommission / 50) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}