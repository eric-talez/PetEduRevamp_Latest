import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Link, ExternalLink, Eye, EyeOff, Search, Filter, ShoppingCart, Package, TrendingUp, Settings, Globe, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useGlobalAuth } from '@/hooks/useGlobalAuth';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
  status: 'active' | 'inactive';
  image?: string;
  description?: string;
  sku?: string;
  sales?: number;
}

interface ProductExposure {
  id: number;
  productId: number;
  productName: string;
  exposureType: 'homepage' | 'category' | 'search' | 'promotion';
  position: number;
  priority: number;
  isActive: boolean;
  startDate: string;
  endDate: string;
  targetAudience: string;
  clickCount: number;
  conversionRate: number;
}

const SAMPLE_PRODUCTS: Product[] = [
  {
    id: 1,
    name: '프리미엄 강아지 사료 (2kg)',
    price: 45000,
    stock: 100,
    category: '사료',
    status: 'active',
    description: '전 연령 강아지를 위한 프리미엄 사료',
    sku: 'DOG-FOOD-001',
    sales: 234,
    image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=200&h=200&fit=crop'
  },
  {
    id: 2,
    name: '반려견 장난감 세트 (5개입)',
    price: 25000,
    stock: 50,
    category: '장난감',
    status: 'active',
    description: '다양한 재질의 장난감 세트',
    sku: 'DOG-TOY-002',
    sales: 156,
    image: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=200&h=200&fit=crop'
  },
  {
    id: 3,
    name: '고양이 스크래치 포스트',
    price: 89000,
    stock: 25,
    category: '용품',
    status: 'active',
    description: '대형 고양이 스크래치 포스트',
    sku: 'CAT-SCRATCH-003',
    sales: 78,
    image: 'https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=200&h=200&fit=crop'
  },
  {
    id: 4,
    name: '펫 샴푸 (500ml)',
    price: 35000,
    stock: 80,
    category: '케어',
    status: 'active',
    description: '저자극 펫 전용 샴푸',
    sku: 'PET-SHAMPOO-004',
    sales: 312,
    image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=200&h=200&fit=crop'
  },
  {
    id: 5,
    name: '자동급식기 (스마트)',
    price: 125000,
    stock: 15,
    category: '급식기',
    status: 'inactive',
    description: '스마트폰 연동 자동급식기',
    sku: 'SMART-FEEDER-005',
    sales: 43,
    image: 'https://images.unsplash.com/photo-1564844536308-ab3794b0e491?w=200&h=200&fit=crop'
  }
];

const SAMPLE_EXPOSURES: ProductExposure[] = [
  {
    id: 1,
    productId: 1,
    productName: '프리미엄 강아지 사료 (2kg)',
    exposureType: 'homepage',
    position: 1,
    priority: 10,
    isActive: true,
    startDate: '2025-07-01',
    endDate: '2025-07-31',
    targetAudience: '강아지 보호자',
    clickCount: 1250,
    conversionRate: 12.5
  },
  {
    id: 2,
    productId: 2,
    productName: '반려견 장난감 세트 (5개입)',
    exposureType: 'category',
    position: 2,
    priority: 8,
    isActive: true,
    startDate: '2025-07-01',
    endDate: '2025-07-31',
    targetAudience: '모든 사용자',
    clickCount: 890,
    conversionRate: 9.8
  },
  {
    id: 3,
    productId: 4,
    productName: '펫 샴푸 (500ml)',
    exposureType: 'promotion',
    position: 1,
    priority: 9,
    isActive: true,
    startDate: '2025-07-10',
    endDate: '2025-07-20',
    targetAudience: '케어 제품 관심 고객',
    clickCount: 567,
    conversionRate: 15.2
  },
  {
    id: 4,
    productId: 3,
    productName: '고양이 스크래치 포스트',
    exposureType: 'search',
    position: 3,
    priority: 7,
    isActive: false,
    startDate: '2025-07-01',
    endDate: '2025-07-31',
    targetAudience: '고양이 보호자',
    clickCount: 234,
    conversionRate: 6.7
  }
];

export default function AdminShopPage() {
  const { userRole, isAuthenticated } = useGlobalAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>(SAMPLE_PRODUCTS);
  const [exposures, setExposures] = useState<ProductExposure[]>(SAMPLE_EXPOSURES);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [exposureFilter, setExposureFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isExposureDialogOpen, setIsExposureDialogOpen] = useState(false);

  if (!isAuthenticated || userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <h1 className="text-2xl font-bold text-destructive">접근 권한이 없습니다</h1>
      </div>
    );
  }

  const categories = ['all', '사료', '장난감', '용품', '케어', '급식기'];
  const exposureTypes = ['all', 'homepage', 'category', 'search', 'promotion'];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const filteredExposures = exposures.filter(exposure => {
    const matchesSearch = exposure.productName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = exposureFilter === 'all' || exposure.exposureType === exposureFilter;
    
    return matchesSearch && matchesType;
  });

  const toggleExposureStatus = (id: number) => {
    setExposures(prev => prev.map(exposure => 
      exposure.id === id ? { ...exposure, isActive: !exposure.isActive } : exposure
    ));
    toast({
      title: "노출 상태 변경",
      description: "상품 노출 상태가 성공적으로 변경되었습니다.",
    });
  };

  const addNewExposure = (product: Product) => {
    const newExposure: ProductExposure = {
      id: Math.max(...exposures.map(e => e.id), 0) + 1,
      productId: product.id,
      productName: product.name,
      exposureType: 'homepage',
      position: exposures.length + 1,
      priority: 5,
      isActive: true,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      targetAudience: '모든 사용자',
      clickCount: 0,
      conversionRate: 0
    };
    
    setExposures(prev => [...prev, newExposure]);
    toast({
      title: "노출 연결 추가",
      description: `${product.name}이 성공적으로 노출 연결되었습니다.`,
    });
  };

  const removeExposure = (id: number) => {
    setExposures(prev => prev.filter(exposure => exposure.id !== id));
    toast({
      title: "노출 연결 제거",
      description: "상품 노출 연결이 성공적으로 제거되었습니다.",
    });
  };

  const getExposureTypeBadge = (type: string) => {
    const colors = {
      homepage: 'bg-primary/10 text-primary',
      category: 'bg-success/10 text-success',
      search: 'bg-warning/10 text-warning',
      promotion: 'bg-primary/10 text-primary'
    };
    
    const labels = {
      homepage: '홈페이지',
      category: '카테고리',
      search: '검색',
      promotion: '프로모션'
    };
    
    return (
      <Badge className={colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {labels[type as keyof typeof labels] || type}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">쇼핑몰 관리</h1>
          <p className="text-gray-600 mt-1">상품 관리 및 노출 연결 설정</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <RefreshCw size={16} />
            새로고침
          </Button>
          <Button className="gap-2">
            <Plus size={16} />
            새 상품 등록
          </Button>
        </div>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package size={16} />
            상품 관리
          </TabsTrigger>
          <TabsTrigger value="exposure" className="flex items-center gap-2">
            <Globe size={16} />
            상품 노출 연결
          </TabsTrigger>
        </TabsList>

        {/* 상품 관리 탭 */}
        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart size={20} />
                상품 목록
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <Input
                      placeholder="상품명, 설명, SKU 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category === 'all' ? '모든 카테고리' : category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="상태 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 상태</SelectItem>
                    <SelectItem value="active">판매중</SelectItem>
                    <SelectItem value="inactive">판매중지</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이미지</TableHead>
                      <TableHead>상품명</TableHead>
                      <TableHead>카테고리</TableHead>
                      <TableHead>가격</TableHead>
                      <TableHead>재고</TableHead>
                      <TableHead>판매량</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          {product.image && (
                            <img 
                              src={product.image} 
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded-md"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-500">{product.description}</div>
                            <div className="text-xs text-gray-400">SKU: {product.sku}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.category}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{product.price.toLocaleString()}원</TableCell>
                        <TableCell>
                          <span className={product.stock < 20 ? 'text-destructive font-medium' : ''}>
                            {product.stock}개
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <TrendingUp size={14} className="text-success" />
                            <span>{product.sales}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                            {product.status === 'active' ? '판매중' : '판매중지'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedProduct(product);
                                setIsExposureDialogOpen(true);
                              }}
                              className="gap-1"
                            >
                              <Link size={14} />
                              노출연결
                            </Button>
                            <Button variant="outline" size="sm" className="gap-1 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all duration-200">
                              <Pencil size={14} />
                              수정
                            </Button>
                            <Button variant="outline" size="sm" className="gap-1 text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive/90 hover:border-destructive/40 transition-all duration-200">
                              <Trash2 size={14} />
                              삭제
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 상품 노출 연결 탭 */}
        <TabsContent value="exposure" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">전체 노출</div>
                    <div className="text-2xl font-bold">{exposures.length}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success/10 rounded-lg">
                    <Eye className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">활성 노출</div>
                    <div className="text-2xl font-bold">{exposures.filter(e => e.isActive).length}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">평균 전환율</div>
                    <div className="text-2xl font-bold">
                      {exposures.length > 0 ? 
                        (exposures.reduce((acc, e) => acc + e.conversionRate, 0) / exposures.length).toFixed(1) : 0}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-warning/10 rounded-lg">
                    <Settings className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">총 클릭</div>
                    <div className="text-2xl font-bold">
                      {exposures.reduce((acc, e) => acc + e.clickCount, 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link size={20} />
                상품 노출 연결 목록
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <Input
                      placeholder="상품명 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={exposureFilter} onValueChange={setExposureFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="노출 유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {exposureTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type === 'all' ? '모든 유형' : 
                         type === 'homepage' ? '홈페이지' :
                         type === 'category' ? '카테고리' :
                         type === 'search' ? '검색' :
                         type === 'promotion' ? '프로모션' : type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>상품명</TableHead>
                      <TableHead>노출 유형</TableHead>
                      <TableHead>위치</TableHead>
                      <TableHead>우선순위</TableHead>
                      <TableHead>타겟 고객</TableHead>
                      <TableHead>클릭수</TableHead>
                      <TableHead>전환율</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExposures.map((exposure) => (
                      <TableRow key={exposure.id}>
                        <TableCell>
                          <div className="font-medium">{exposure.productName}</div>
                          <div className="text-sm text-gray-500">
                            {exposure.startDate} ~ {exposure.endDate}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getExposureTypeBadge(exposure.exposureType)}
                        </TableCell>
                        <TableCell className="font-medium">{exposure.position}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{exposure.priority}</Badge>
                        </TableCell>
                        <TableCell>{exposure.targetAudience}</TableCell>
                        <TableCell className="font-medium">{exposure.clickCount.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={exposure.conversionRate >= 10 ? 'text-success font-medium' : 
                                         exposure.conversionRate >= 5 ? 'text-warning' : 'text-destructive'}>
                            {exposure.conversionRate}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={exposure.isActive}
                              onCheckedChange={() => toggleExposureStatus(exposure.id)}
                            />
                            <span className="text-sm">
                              {exposure.isActive ? '활성' : '비활성'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" className="gap-1">
                              <Pencil size={14} />
                              수정
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="gap-1 text-destructive hover:text-destructive/90"
                              onClick={() => removeExposure(exposure.id)}
                            >
                              <Trash2 size={14} />
                              삭제
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 노출 연결 추가 다이얼로그 */}
      <Dialog open={isExposureDialogOpen} onOpenChange={setIsExposureDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>상품 노출 연결 추가</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {selectedProduct.image && (
                  <img 
                    src={selectedProduct.image} 
                    alt={selectedProduct.name}
                    className="w-16 h-16 object-cover rounded-md"
                  />
                )}
                <div>
                  <h3 className="font-medium">{selectedProduct.name}</h3>
                  <p className="text-sm text-gray-500">{selectedProduct.description}</p>
                  <p className="text-sm font-medium text-success">
                    {selectedProduct.price.toLocaleString()}원
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">노출 유형</Label>
                  <Select defaultValue="homepage">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homepage">홈페이지</SelectItem>
                      <SelectItem value="category">카테고리</SelectItem>
                      <SelectItem value="search">검색</SelectItem>
                      <SelectItem value="promotion">프로모션</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">우선순위</Label>
                  <Select defaultValue="5">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">높음 (10)</SelectItem>
                      <SelectItem value="8">보통 (8)</SelectItem>
                      <SelectItem value="5">낮음 (5)</SelectItem>
                      <SelectItem value="3">최저 (3)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">타겟 고객</Label>
                <Input placeholder="예: 강아지 보호자, 모든 사용자" defaultValue="모든 사용자" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">시작일</Label>
                  <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <Label className="text-sm font-medium">종료일</Label>
                  <Input type="date" defaultValue={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsExposureDialogOpen(false)}>
                  취소
                </Button>
                <Button onClick={() => {
                  if (selectedProduct) {
                    addNewExposure(selectedProduct);
                    setIsExposureDialogOpen(false);
                  }
                }}>
                  노출 연결 추가
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}