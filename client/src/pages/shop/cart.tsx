import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { 
  ChevronRight, 
  Trash2, 
  ShoppingBag, 
  ShoppingCart, 
  CreditCard, 
  Shield, 
  Check, 
  ChevronDown, 
  ChevronUp,
  Info,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { FreeShippingProgressBar, TrustBadges, RecommendedProducts } from '@/components/shop/MiniCart';

export default function Cart() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // 장바구니 상태
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<number, number>>({});
  
  // 가격 계산 상태
  const [subtotal, setSubtotal] = useState(0);
  const [shippingFee, setShippingFee] = useState(0);
  const [total, setTotal] = useState(0);
  const [discountTotal, setDiscountTotal] = useState(0);
  
  // 수수료 합계 상태
  const [commissionSummary, setCommissionSummary] = useState<Record<string, any>>({});
  
  // 페이지 로드 시 장바구니 데이터 로드
  useEffect(() => {
    try {
      const cartItemsString = localStorage.getItem('petedu_cart') || '[]';
      const items = JSON.parse(cartItemsString);
      setCartItems(items);
      
      // 기본적으로 모든 아이템 선택
      setSelectedItems(items.map((item: any) => item.id));
      
      // 수량 상태 초기화
      const counts: Record<number, number> = {};
      items.forEach((item: any) => {
        counts[item.id] = item.quantity || 1;
      });
      setItemCounts(counts);
      
    } catch (err) {
      console.error('장바구니 데이터 로드 오류:', err);
      toast({
        title: "장바구니 데이터 로드 실패",
        variant: "destructive",
      });
    }
  }, [toast]);
  
  // 선택된 항목이나 수량이 변경될 때 가격 계산
  useEffect(() => {
    const selected = cartItems.filter(item => 
      selectedItems.includes(item.id)
    );
    
    let subtotalPrice = 0;
    let discountAmount = 0;
    
    // 수수료 집계를 위한 객체
    const commissions: Record<string, {
      source: 'institute' | 'trainer';
      name: string;
      code: string;
      items: any[];
      totalAmount: number;
      commissionRate: number;
      commissionAmount: number;
    }> = {};
    
    selected.forEach(item => {
      const quantity = itemCounts[item.id] || 1;
      const itemPrice = (item.price + (item.extraPrice || 0)) * quantity;
      
      subtotalPrice += itemPrice;
      
      // 추천 코드가 있는 경우 수수료 정보 수집
      if (item.referralCode && item.referralInfo && item.commissionRate) {
        const referralCode = item.referralCode;
        
        if (!commissions[referralCode]) {
          commissions[referralCode] = {
            source: item.referralSource,
            name: item.referralInfo.name,
            code: referralCode,
            items: [],
            totalAmount: 0,
            commissionRate: item.commissionRate,
            commissionAmount: 0
          };
        }
        
        commissions[referralCode].items.push({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity,
          totalPrice: itemPrice
        });
        
        commissions[referralCode].totalAmount += itemPrice;
        commissions[referralCode].commissionAmount += (itemPrice * (item.commissionRate / 100));
      }
    });
    
    // 배송비 계산 (3만원 이상 무료)
    const calculatedShippingFee = subtotalPrice >= 30000 ? 0 : 3000;
    
    setSubtotal(subtotalPrice);
    setShippingFee(calculatedShippingFee);
    setTotal(subtotalPrice + calculatedShippingFee - discountAmount);
    setDiscountTotal(discountAmount);
    
    // 수수료 정보 업데이트
    setCommissionSummary(commissions);
    
  }, [cartItems, selectedItems, itemCounts]);
  
  // 항목 선택 상태 변경
  const toggleSelectItem = (id: number) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };
  
  // 전체 선택 토글
  const toggleSelectAll = () => {
    if (selectedItems.length === cartItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cartItems.map(item => item.id));
    }
  };
  
  // 수량 증가
  const increaseQuantity = (id: number) => {
    setItemCounts({
      ...itemCounts,
      [id]: (itemCounts[id] || 1) + 1
    });
    
    // 로컬 스토리지에도 반영
    updateStorageQuantity(id, (itemCounts[id] || 1) + 1);
  };
  
  // 수량 감소
  const decreaseQuantity = (id: number) => {
    if (itemCounts[id] > 1) {
      setItemCounts({
        ...itemCounts,
        [id]: itemCounts[id] - 1
      });
      
      // 로컬 스토리지에도 반영
      updateStorageQuantity(id, itemCounts[id] - 1);
    }
  };
  
  // 아이템 삭제
  const removeItem = (id: number) => {
    const newCartItems = cartItems.filter(item => item.id !== id);
    setCartItems(newCartItems);
    setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    
    // 로컬 스토리지에서도 삭제
    localStorage.setItem('petedu_cart', JSON.stringify(newCartItems));
    
    // 이벤트 발생 (장바구니 아이콘 카운트 업데이트를 위함)
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cartItems: newCartItems } }));
    
    toast({
      title: "상품이 장바구니에서 제거되었습니다",
    });
  };
  
  // 선택된 항목 삭제
  const removeSelectedItems = () => {
    if (selectedItems.length === 0) return;
    
    const newCartItems = cartItems.filter(item => !selectedItems.includes(item.id));
    setCartItems(newCartItems);
    setSelectedItems([]);
    
    // 로컬 스토리지에서도 삭제
    localStorage.setItem('petedu_cart', JSON.stringify(newCartItems));
    
    // 이벤트 발생 (장바구니 아이콘 카운트 업데이트를 위함)
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cartItems: newCartItems } }));
    
    toast({
      title: `${selectedItems.length}개 상품이 장바구니에서 제거되었습니다`,
    });
  };
  
  // 로컬 스토리지의 수량 업데이트
  const updateStorageQuantity = (id: number, quantity: number) => {
    try {
      const cartItemsString = localStorage.getItem('petedu_cart') || '[]';
      const items = JSON.parse(cartItemsString);
      
      const updatedItems = items.map((item: any) => 
        item.id === id ? { ...item, quantity } : item
      );
      
      localStorage.setItem('petedu_cart', JSON.stringify(updatedItems));
      
      // 이벤트 발생 (장바구니 아이콘 카운트는 변경 안됨)
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cartItems: updatedItems, skipCountUpdate: true } }));
      
    } catch (err) {
      console.error('장바구니 수량 업데이트 오류:', err);
    }
  };
  
  // 결제 진행
  const proceedToCheckout = () => {
    if (selectedItems.length === 0) {
      toast({
        title: "선택된 상품이 없습니다",
        description: "결제할 상품을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    // 선택된 항목만 결제 진행
    const checkoutItems = cartItems.filter(item => selectedItems.includes(item.id));
    
    // 수량 적용
    const itemsWithUpdatedQuantity = checkoutItems.map(item => ({
      ...item,
      quantity: itemCounts[item.id] || 1
    }));
    
    // 결제 정보를 세션 스토리지에 저장 (새로고침해도 유지되어야 함)
    sessionStorage.setItem('checkout_items', JSON.stringify({
      items: itemsWithUpdatedQuantity,
      subtotal,
      shippingFee,
      total,
      discountTotal,
      commissionSummary
    }));
    
    // 결제 페이지로 이동
    navigate('/shop/checkout');
  };
  
  // 쇼핑 계속하기
  const continueShopping = () => {
    navigate('/shop');
  };
  
  // 장바구니가 비어있는 경우
  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center py-16">
          <ShoppingCart className="h-20 w-20 mx-auto mb-6 text-gray-300" />
          <h2 className="text-2xl font-bold mb-4">장바구니가 비어있습니다</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            장바구니에 상품을 담고 테일즈 샵을 계속 이용해보세요.
          </p>
          <Button 
            onClick={continueShopping}
            className="bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))] text-white"
          >
            <ShoppingBag className="mr-2 h-5 w-5" />
            테일즈 샵 계속하기
          </Button>
        </div>
      </div>
    );
  }
  
  const handleAddRecommendedProduct = (product: any) => {
    const newItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1
    };
    
    const updatedCart = [...cartItems, newItem];
    setCartItems(updatedCart);
    setSelectedItems([...selectedItems, product.id]);
    setItemCounts({...itemCounts, [product.id]: 1});
    localStorage.setItem('petedu_cart', JSON.stringify(updatedCart));
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cartItems: updatedCart } }));
    
    toast({
      title: "상품이 추가되었습니다",
      description: product.name,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">장바구니</h1>
      
      <div className="mb-6">
        <FreeShippingProgressBar currentTotal={subtotal} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 왼쪽: 장바구니 아이템 목록 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Checkbox 
                    id="select-all"
                    checked={selectedItems.length === cartItems.length}
                    onCheckedChange={toggleSelectAll}
                  />
                  <label htmlFor="select-all" className="ml-2 text-sm font-medium">
                    전체 선택 ({selectedItems.length}/{cartItems.length})
                  </label>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={removeSelectedItems}
                  disabled={selectedItems.length === 0}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  선택 삭제
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              {cartItems.map(item => (
                <div 
                  key={`${item.id}-${item.option}`}
                  className="py-4 border-b last:border-b-0 flex items-start"
                >
                  <Checkbox 
                    className="mt-6 mr-4"
                    checked={selectedItems.includes(item.id)}
                    onCheckedChange={() => toggleSelectItem(item.id)}
                  />
                  
                  <div className="w-20 h-20 rounded overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                    {item.image ? (
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                        <ShoppingBag className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4 flex-1">
                    <div className="flex flex-col md:flex-row md:justify-between">
                      <div>
                        <h3 className="font-medium text-base">{item.name}</h3>
                        
                        {item.option && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            옵션: {item.option}
                            {item.extraPrice > 0 && ` (+${item.extraPrice.toLocaleString()}원)`}
                          </p>
                        )}
                        
                        {/* 추천 코드 표시 */}
                        {item.referralCode && item.referralInfo && (
                          <div className="mt-2 flex items-center">
                            <Badge variant="outline" className="text-xs py-1">
                              {item.referralSource === 'institute' ? '기관' : '트레이너'} 추천: {item.referralInfo.name}
                            </Badge>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3.5 w-3.5 ml-1 text-gray-400" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">
                                    구매 시 {item.commissionRate}%의 수수료가 
                                    {item.referralSource === 'institute' ? ' 기관' : ' 트레이너'}에게 적립됩니다.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-3 md:mt-0 flex items-center">
                        <div className="flex items-center mr-6">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7 rounded-md"
                            onClick={() => decreaseQuantity(item.id)}
                            disabled={itemCounts[item.id] <= 1}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                          
                          <span className="w-8 text-center text-sm mx-1">
                            {itemCounts[item.id] || 1}
                          </span>
                          
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7 rounded-md"
                            onClick={() => increaseQuantity(item.id)}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-semibold">
                            {(
                              (item.price + (item.extraPrice || 0)) * 
                              (itemCounts[item.id] || 1)
                            ).toLocaleString()}원
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-xs text-gray-500"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        삭제
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          
          {/* 수수료 정보 카드 */}
          {Object.keys(commissionSummary).length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">추천 수수료 정보</CardTitle>
                <CardDescription>
                  구매 시 적용되는 추천 수수료 정보입니다.
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {Object.entries(commissionSummary).map(([code, data]: [string, any]) => (
                    <AccordionItem key={code} value={code}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center">
                          <Badge variant="outline" className="mr-2">
                            {data.source === 'institute' ? '기관' : '트레이너'}
                          </Badge>
                          <span className="font-medium">{data.name}</span>
                          <span className="text-sm text-gray-500 ml-4">{data.code}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="text-sm">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>상품명</TableHead>
                                <TableHead className="text-right">수량</TableHead>
                                <TableHead className="text-right">금액</TableHead>
                                <TableHead className="text-right">수수료</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {data.items.map((item: any) => (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium">{item.name}</TableCell>
                                  <TableCell className="text-right">{item.quantity}</TableCell>
                                  <TableCell className="text-right">{item.totalPrice.toLocaleString()}원</TableCell>
                                  <TableCell className="text-right">
                                    {Math.round(item.totalPrice * (data.commissionRate / 100)).toLocaleString()}원
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          
                          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                            <div className="flex justify-between font-medium">
                              <span>추천 수수료 합계 ({data.commissionRate}%)</span>
                              <span>{Math.round(data.commissionAmount).toLocaleString()}원</span>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* 오른쪽: 주문 요약 */}
        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>주문 요약</CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">상품 금액</span>
                  <span>{subtotal.toLocaleString()}원</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">배송비</span>
                  <span>
                    {shippingFee > 0 
                      ? `${shippingFee.toLocaleString()}원` 
                      : '무료'}
                  </span>
                </div>
                
                {discountTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">할인 금액</span>
                    <span className="text-destructive">-{discountTotal.toLocaleString()}원</span>
                  </div>
                )}
                
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center font-bold">
                    <span>결제 금액</span>
                    <span className="text-xl">{total.toLocaleString()}원</span>
                  </div>
                  
                  {Object.keys(commissionSummary).length > 0 && (
                    <div className="mt-2 text-xs text-gray-500 flex items-start">
                      <Info className="h-3.5 w-3.5 mr-1.5 mt-0.5 flex-shrink-0" />
                      <span>
                        구매 시 추천인에게 총 
                        {Object.values(commissionSummary).reduce((sum: number, data: any) => 
                          sum + Math.round(data.commissionAmount), 0
                        ).toLocaleString()}원의 
                        수수료가 적립됩니다.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex-col gap-4">
              <Button 
                className="w-full bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))] text-white"
                onClick={proceedToCheckout}
                disabled={selectedItems.length === 0}
              >
                <CreditCard className="mr-2 h-5 w-5" />
                결제하기 ({selectedItems.length}개)
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={continueShopping}
              >
                <ShoppingBag className="mr-2 h-5 w-5" />
                테일즈 샵 계속하기
              </Button>
            </CardFooter>
          </Card>
          
          <div className="mt-4">
            <TrustBadges />
          </div>
          
          <div className="mt-4">
            <RecommendedProducts onAddToCart={handleAddRecommendedProduct} />
          </div>
        </div>
      </div>
    </div>
  );
}