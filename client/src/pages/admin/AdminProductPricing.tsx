import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Filter, Plus, Edit, Trash2, Package, DollarSign, Percent, Tag, Calendar, CheckCircle, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { DatePicker } from "@/components/ui/date-picker";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

interface Product {
  id: number;
  name: string;
  category: string;
  originalPrice: number;
  discountPrice?: number;
  discountPercentage?: number;
  discountType: 'none' | 'percentage' | 'fixed';
  discountStartDate?: string;
  discountEndDate?: string;
  isDiscountActive: boolean;
  stock: number;
  status: 'active' | 'inactive' | 'out_of_stock';
  description?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface PricingRule {
  id: number;
  name: string;
  type: 'bulk' | 'seasonal' | 'member' | 'category';
  conditions: {
    minQuantity?: number;
    maxQuantity?: number;
    memberTier?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
  };
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isActive: boolean;
  priority: number;
  createdAt: string;
}

export default function AdminProductPricing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isEditPriceOpen, setIsEditPriceOpen] = useState(false);
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedRule, setSelectedRule] = useState<PricingRule | null>(null);
  
  const [priceForm, setPriceForm] = useState({
    originalPrice: 0,
    discountType: 'none' as 'none' | 'percentage' | 'fixed',
    discountValue: 0,
    discountStartDate: '',
    discountEndDate: '',
    isDiscountActive: false
  });

  const [ruleForm, setRuleForm] = useState({
    name: '',
    type: 'bulk' as 'bulk' | 'seasonal' | 'member' | 'category',
    conditions: {
      minQuantity: 0,
      maxQuantity: 0,
      memberTier: '',
      category: '',
      startDate: '',
      endDate: ''
    },
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 0,
    isActive: true,
    priority: 1
  });

  // 상품 목록 조회
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['/api/admin/products'],
    queryFn: async () => {
      const response = await fetch('/api/admin/products');
      if (!response.ok) throw new Error('상품 목록을 불러올 수 없습니다');
      const result = await response.json();
      return result.success ? result.products : [];
    }
  });

  // 가격 규칙 목록 조회
  const { data: pricingRules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['/api/admin/pricing-rules'],
    queryFn: async () => {
      const response = await fetch('/api/admin/pricing-rules');
      if (!response.ok) throw new Error('가격 규칙을 불러올 수 없습니다');
      const result = await response.json();
      return result.success ? result.rules : [];
    }
  });

  // 가격 업데이트 뮤테이션
  const updatePriceMutation = useMutation({
    mutationFn: async (data: { productId: number; priceData: any }) => {
      const response = await apiRequest('PUT', `/api/admin/products/${data.productId}/pricing`, data.priceData);
      return response;
    },
    onSuccess: () => {
      toast({
        title: '가격 업데이트 완료',
        description: '상품 가격이 성공적으로 업데이트되었습니다.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      setIsEditPriceOpen(false);
      resetPriceForm();
    },
    onError: (error: any) => {
      toast({
        title: '가격 업데이트 실패',
        description: error.message || '가격 업데이트 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  });

  // 가격 규칙 추가/수정 뮤테이션
  const saveRuleMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = selectedRule ? `/api/admin/pricing-rules/${selectedRule.id}` : '/api/admin/pricing-rules';
      const method = selectedRule ? 'PUT' : 'POST';
      return await apiRequest(method, url, data);
    },
    onSuccess: () => {
      toast({
        title: selectedRule ? '규칙 수정 완료' : '규칙 추가 완료',
        description: `가격 규칙이 성공적으로 ${selectedRule ? '수정' : '추가'}되었습니다.`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pricing-rules'] });
      setIsAddRuleOpen(false);
      resetRuleForm();
    },
    onError: (error: any) => {
      toast({
        title: '규칙 저장 실패',
        description: error.message || '규칙 저장 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  });

  // 가격 규칙 삭제 뮤테이션
  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: number) => {
      return await apiRequest('DELETE', `/api/admin/pricing-rules/${ruleId}`);
    },
    onSuccess: () => {
      toast({
        title: '규칙 삭제 완료',
        description: '가격 규칙이 성공적으로 삭제되었습니다.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pricing-rules'] });
    },
    onError: (error: any) => {
      toast({
        title: '규칙 삭제 실패',
        description: error.message || '규칙 삭제 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const calculateDiscountedPrice = (originalPrice: number, discountType: string, discountValue: number) => {
    if (discountType === 'percentage') {
      return originalPrice * (1 - discountValue / 100);
    } else if (discountType === 'fixed') {
      return Math.max(0, originalPrice - discountValue);
    }
    return originalPrice;
  };

  const handleEditPrice = (product: Product) => {
    setSelectedProduct(product);
    setPriceForm({
      originalPrice: product.originalPrice,
      discountType: product.discountType,
      discountValue: product.discountType === 'percentage' ? (product.discountPercentage || 0) : (product.discountPrice ? product.originalPrice - product.discountPrice : 0),
      discountStartDate: product.discountStartDate || '',
      discountEndDate: product.discountEndDate || '',
      isDiscountActive: product.isDiscountActive
    });
    setIsEditPriceOpen(true);
  };

  const handleAddRule = () => {
    setSelectedRule(null);
    resetRuleForm();
    setIsAddRuleOpen(true);
  };

  const handleEditRule = (rule: PricingRule) => {
    setSelectedRule(rule);
    setRuleForm({
      name: rule.name,
      type: rule.type,
      conditions: { ...rule.conditions },
      discountType: rule.discountType,
      discountValue: rule.discountValue,
      isActive: rule.isActive,
      priority: rule.priority
    });
    setIsAddRuleOpen(true);
  };

  const resetPriceForm = () => {
    setPriceForm({
      originalPrice: 0,
      discountType: 'none',
      discountValue: 0,
      discountStartDate: '',
      discountEndDate: '',
      isDiscountActive: false
    });
    setSelectedProduct(null);
  };

  const resetRuleForm = () => {
    setRuleForm({
      name: '',
      type: 'bulk',
      conditions: {
        minQuantity: 0,
        maxQuantity: 0,
        memberTier: '',
        category: '',
        startDate: '',
        endDate: ''
      },
      discountType: 'percentage',
      discountValue: 0,
      isActive: true,
      priority: 1
    });
  };

  const handleSavePrice = () => {
    if (!selectedProduct) return;

    const priceData = {
      originalPrice: priceForm.originalPrice,
      discountType: priceForm.discountType,
      discountValue: priceForm.discountValue,
      discountStartDate: priceForm.discountStartDate,
      discountEndDate: priceForm.discountEndDate,
      isDiscountActive: priceForm.isDiscountActive
    };

    updatePriceMutation.mutate({
      productId: selectedProduct.id,
      priceData
    });
  };

  const handleSaveRule = () => {
    saveRuleMutation.mutate(ruleForm);
  };

  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || product.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const activeRules = pricingRules.filter((rule: PricingRule) => rule.isActive);
  const inactiveRules = pricingRules.filter((rule: PricingRule) => !rule.isActive);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">상품 가격 관리</h1>
          <p className="text-gray-500 dark:text-gray-400">상품 가격 및 할인 정책을 관리합니다</p>
        </div>
        <Button onClick={handleAddRule} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          가격 규칙 추가
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 상품</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">등록된 상품 수</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">할인 상품</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.filter((p: Product) => p.isDiscountActive).length}
            </div>
            <p className="text-xs text-muted-foreground">할인 중인 상품</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활성 규칙</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRules.length}</div>
            <p className="text-xs text-muted-foreground">적용 중인 가격 규칙</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 할인율</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.filter((p: Product) => p.isDiscountActive).length > 0 
                ? Math.round(products.filter((p: Product) => p.isDiscountActive)
                    .reduce((sum: number, p: Product) => sum + (p.discountPercentage || 0), 0) / 
                    products.filter((p: Product) => p.isDiscountActive).length) 
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">할인 상품 평균</p>
          </CardContent>
        </Card>
      </div>

      {/* 상품 가격 관리 */}
      <Card>
        <CardHeader>
          <CardTitle>상품 가격 관리</CardTitle>
          <CardDescription>개별 상품의 가격과 할인 정보를 관리합니다</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 필터 및 검색 */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="상품명 검색..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="카테고리" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 카테고리</SelectItem>
                <SelectItem value="food">사료</SelectItem>
                <SelectItem value="toy">장난감</SelectItem>
                <SelectItem value="accessory">액세서리</SelectItem>
                <SelectItem value="care">케어용품</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="inactive">비활성</SelectItem>
                <SelectItem value="out_of_stock">품절</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 상품 목록 */}
          <div className="space-y-4">
            {filteredProducts.map((product: Product) => (
              <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="text-sm text-gray-500">{product.category}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                        {product.status === 'active' ? '활성' : product.status === 'inactive' ? '비활성' : '품절'}
                      </Badge>
                      {product.isDiscountActive && (
                        <Badge variant="destructive">할인 중</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      {product.isDiscountActive && product.discountPrice ? (
                        <>
                          <span className="text-lg font-bold text-destructive">
                            {formatPrice(product.discountPrice)}원
                          </span>
                          <span className="text-sm text-gray-500 line-through">
                            {formatPrice(product.originalPrice)}원
                          </span>
                        </>
                      ) : (
                        <span className="text-lg font-bold">
                          {formatPrice(product.originalPrice)}원
                        </span>
                      )}
                    </div>
                    {product.isDiscountActive && product.discountPercentage && (
                      <div className="text-sm text-destructive">
                        {product.discountPercentage}% 할인
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEditPrice(product)}
                    className="hover:bg-primary/10 hover:text-primary hover:border-primary/40"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {filteredProducts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                조건에 맞는 상품이 없습니다.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 가격 규칙 관리 */}
      <Card>
        <CardHeader>
          <CardTitle>가격 규칙 관리</CardTitle>
          <CardDescription>대량 구매, 시즌 할인, 회원 등급별 할인 등의 규칙을 관리합니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* 활성 규칙 */}
            <div>
              <h3 className="text-lg font-semibold mb-3">활성 규칙</h3>
              <div className="space-y-3">
                {activeRules.map((rule: PricingRule) => (
                  <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg bg-success/10 dark:bg-success/20">
                    <div>
                      <h4 className="font-semibold">{rule.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {rule.type === 'bulk' && `${rule.conditions.minQuantity}개 이상 구매시`}
                        {rule.type === 'seasonal' && `${rule.conditions.startDate} ~ ${rule.conditions.endDate}`}
                        {rule.type === 'member' && `${rule.conditions.memberTier} 회원`}
                        {rule.type === 'category' && `${rule.conditions.category} 카테고리`}
                        {' '}
                        {rule.discountType === 'percentage' ? `${rule.discountValue}% 할인` : `${formatPrice(rule.discountValue)}원 할인`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">우선순위: {rule.priority}</Badge>
                        <Badge variant="outline">{rule.type}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditRule(rule)}
                        className="hover:bg-primary/10 hover:text-primary hover:border-primary/40"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => deleteRuleMutation.mutate(rule.id)}
                        className="text-destructive border-destructive/40 hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {activeRules.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    활성 규칙이 없습니다.
                  </div>
                )}
              </div>
            </div>

            {/* 비활성 규칙 */}
            {inactiveRules.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">비활성 규칙</h3>
                <div className="space-y-3">
                  {inactiveRules.map((rule: PricingRule) => (
                    <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                      <div>
                        <h4 className="font-semibold text-gray-500">{rule.name}</h4>
                        <p className="text-sm text-gray-400">
                          {rule.type === 'bulk' && `${rule.conditions.minQuantity}개 이상 구매시`}
                          {rule.type === 'seasonal' && `${rule.conditions.startDate} ~ ${rule.conditions.endDate}`}
                          {rule.type === 'member' && `${rule.conditions.memberTier} 회원`}
                          {rule.type === 'category' && `${rule.conditions.category} 카테고리`}
                          {' '}
                          {rule.discountType === 'percentage' ? `${rule.discountValue}% 할인` : `${formatPrice(rule.discountValue)}원 할인`}
                        </p>
                        <Badge variant="secondary" className="mt-1">비활성</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditRule(rule)}
                          className="hover:bg-primary/10 hover:text-primary hover:border-primary/40"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteRuleMutation.mutate(rule.id)}
                          className="text-destructive border-destructive/40 hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 가격 수정 다이얼로그 */}
      <Dialog open={isEditPriceOpen} onOpenChange={setIsEditPriceOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>상품 가격 수정</DialogTitle>
            <DialogDescription>
              "{selectedProduct?.name}" 상품의 가격과 할인 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="original-price" className="text-right">정가</Label>
              <Input
                id="original-price"
                type="number"
                value={priceForm.originalPrice}
                onChange={(e) => setPriceForm({ ...priceForm, originalPrice: Number(e.target.value) })}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="discount-type" className="text-right">할인 유형</Label>
              <Select value={priceForm.discountType} onValueChange={(value: 'none' | 'percentage' | 'fixed') => setPriceForm({ ...priceForm, discountType: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">할인 없음</SelectItem>
                  <SelectItem value="percentage">퍼센트 할인</SelectItem>
                  <SelectItem value="fixed">정액 할인</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {priceForm.discountType !== 'none' && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="discount-value" className="text-right">할인 값</Label>
                  <Input
                    id="discount-value"
                    type="number"
                    value={priceForm.discountValue}
                    onChange={(e) => setPriceForm({ ...priceForm, discountValue: Number(e.target.value) })}
                    className="col-span-3"
                    placeholder={priceForm.discountType === 'percentage' ? '할인 퍼센트' : '할인 금액'}
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="discount-start" className="text-right">할인 시작일</Label>
                  <Input
                    id="discount-start"
                    type="date"
                    value={priceForm.discountStartDate}
                    onChange={(e) => setPriceForm({ ...priceForm, discountStartDate: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="discount-end" className="text-right">할인 종료일</Label>
                  <Input
                    id="discount-end"
                    type="date"
                    value={priceForm.discountEndDate}
                    onChange={(e) => setPriceForm({ ...priceForm, discountEndDate: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="discount-active" className="text-right">할인 활성</Label>
                  <div className="col-span-3">
                    <Switch
                      id="discount-active"
                      checked={priceForm.isDiscountActive}
                      onCheckedChange={(checked) => setPriceForm({ ...priceForm, isDiscountActive: checked })}
                    />
                  </div>
                </div>
                
                {priceForm.discountType !== 'none' && priceForm.discountValue > 0 && (
                  <div className="bg-primary/10 dark:bg-primary/20 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">할인 후 가격</h4>
                    <div className="text-2xl font-bold text-primary">
                      {formatPrice(calculateDiscountedPrice(priceForm.originalPrice, priceForm.discountType, priceForm.discountValue))}원
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      원가 {formatPrice(priceForm.originalPrice)}원에서 {priceForm.discountType === 'percentage' ? `${priceForm.discountValue}%` : `${formatPrice(priceForm.discountValue)}원`} 할인
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditPriceOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSavePrice} disabled={updatePriceMutation.isPending}>
              {updatePriceMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 가격 규칙 추가/수정 다이얼로그 */}
      <Dialog open={isAddRuleOpen} onOpenChange={setIsAddRuleOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{selectedRule ? '가격 규칙 수정' : '가격 규칙 추가'}</DialogTitle>
            <DialogDescription>
              새로운 가격 규칙을 {selectedRule ? '수정' : '추가'}합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rule-name" className="text-right">규칙명</Label>
              <Input
                id="rule-name"
                value={ruleForm.name}
                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                className="col-span-3"
                placeholder="규칙명을 입력하세요"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rule-type" className="text-right">규칙 유형</Label>
              <Select value={ruleForm.type} onValueChange={(value: 'bulk' | 'seasonal' | 'member' | 'category') => setRuleForm({ ...ruleForm, type: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bulk">대량 구매 할인</SelectItem>
                  <SelectItem value="seasonal">시즌 할인</SelectItem>
                  <SelectItem value="member">회원 등급 할인</SelectItem>
                  <SelectItem value="category">카테고리 할인</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* 조건 설정 */}
            {ruleForm.type === 'bulk' && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="min-quantity" className="text-right">최소 수량</Label>
                  <Input
                    id="min-quantity"
                    type="number"
                    value={ruleForm.conditions.minQuantity}
                    onChange={(e) => setRuleForm({ 
                      ...ruleForm, 
                      conditions: { ...ruleForm.conditions, minQuantity: Number(e.target.value) }
                    })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="max-quantity" className="text-right">최대 수량</Label>
                  <Input
                    id="max-quantity"
                    type="number"
                    value={ruleForm.conditions.maxQuantity}
                    onChange={(e) => setRuleForm({ 
                      ...ruleForm, 
                      conditions: { ...ruleForm.conditions, maxQuantity: Number(e.target.value) }
                    })}
                    className="col-span-3"
                    placeholder="제한 없음은 0"
                  />
                </div>
              </>
            )}
            
            {ruleForm.type === 'seasonal' && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="start-date" className="text-right">시작일</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={ruleForm.conditions.startDate}
                    onChange={(e) => setRuleForm({ 
                      ...ruleForm, 
                      conditions: { ...ruleForm.conditions, startDate: e.target.value }
                    })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="end-date" className="text-right">종료일</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={ruleForm.conditions.endDate}
                    onChange={(e) => setRuleForm({ 
                      ...ruleForm, 
                      conditions: { ...ruleForm.conditions, endDate: e.target.value }
                    })}
                    className="col-span-3"
                  />
                </div>
              </>
            )}
            
            {ruleForm.type === 'member' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="member-tier" className="text-right">회원 등급</Label>
                <Select value={ruleForm.conditions.memberTier} onValueChange={(value) => setRuleForm({ 
                  ...ruleForm, 
                  conditions: { ...ruleForm.conditions, memberTier: value }
                })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="회원 등급 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bronze">브론즈</SelectItem>
                    <SelectItem value="silver">실버</SelectItem>
                    <SelectItem value="gold">골드</SelectItem>
                    <SelectItem value="platinum">플래티넘</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {ruleForm.type === 'category' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">카테고리</Label>
                <Select value={ruleForm.conditions.category} onValueChange={(value) => setRuleForm({ 
                  ...ruleForm, 
                  conditions: { ...ruleForm.conditions, category: value }
                })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="food">사료</SelectItem>
                    <SelectItem value="toy">장난감</SelectItem>
                    <SelectItem value="accessory">액세서리</SelectItem>
                    <SelectItem value="care">케어용품</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* 할인 설정 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="discount-type" className="text-right">할인 유형</Label>
              <Select value={ruleForm.discountType} onValueChange={(value: 'percentage' | 'fixed') => setRuleForm({ ...ruleForm, discountType: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">퍼센트 할인</SelectItem>
                  <SelectItem value="fixed">정액 할인</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="discount-value" className="text-right">할인 값</Label>
              <Input
                id="discount-value"
                type="number"
                value={ruleForm.discountValue}
                onChange={(e) => setRuleForm({ ...ruleForm, discountValue: Number(e.target.value) })}
                className="col-span-3"
                placeholder={ruleForm.discountType === 'percentage' ? '할인 퍼센트' : '할인 금액'}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="priority" className="text-right">우선순위</Label>
              <Input
                id="priority"
                type="number"
                value={ruleForm.priority}
                onChange={(e) => setRuleForm({ ...ruleForm, priority: Number(e.target.value) })}
                className="col-span-3"
                placeholder="1이 가장 높음"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="is-active" className="text-right">활성 상태</Label>
              <div className="col-span-3">
                <Switch
                  id="is-active"
                  checked={ruleForm.isActive}
                  onCheckedChange={(checked) => setRuleForm({ ...ruleForm, isActive: checked })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddRuleOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveRule} disabled={saveRuleMutation.isPending}>
              {saveRuleMutation.isPending ? '저장 중...' : (selectedRule ? '수정' : '추가')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}