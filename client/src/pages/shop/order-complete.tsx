import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { 
  CheckCircle2, 
  ShoppingBag, 
  ChevronRight, 
  Truck, 
  Clock, 
  Package, 
  Home,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function OrderComplete() {
  const [location] = useLocation();
  // URL에서 주문 번호 추출
  const orderNumber = new URLSearchParams(location.split('?')[1]).get('order');
  
  // 주문 정보 상태
  const [orderData, setOrderData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 페이지 로드 시 주문 정보 불러오기
  useEffect(() => {
    try {
      if (!orderNumber) {
        setError('주문 정보를 찾을 수 없습니다.');
        setIsLoading(false);
        return;
      }
      
      // 로컬 스토리지에서 주문 내역 불러오기 (실제 구현에서는 API 호출)
      const ordersHistory = JSON.parse(localStorage.getItem('petedu_orders') || '[]');
      const order = ordersHistory.find((o: any) => o.orderNumber === orderNumber);
      
      if (!order) {
        setError('해당 주문 내역을 찾을 수 없습니다.');
        setIsLoading(false);
        return;
      }
      
      setOrderData(order);
      
      // 페이지 타이틀 업데이트
      document.title = `주문 완료 - ${orderNumber} | 테일즈 샵`;
      
    } catch (err) {
      console.error('주문 정보 로드 오류:', err);
      setError('주문 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [orderNumber]);
  
  // 날짜 포맷 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // 배송 예정일 계산 (주문일 + 3일)
  const calculateExpectedDeliveryDate = (orderDate: string) => {
    const date = new Date(orderDate);
    date.setDate(date.getDate() + 3);
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
  };
  
  // 로딩 중이거나 오류 발생 시 표시
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[500px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[hsl(var(--success))] border-solid mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">주문 정보를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }
  
  if (error || !orderData) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center py-16">
          <div className="text-destructive text-5xl mb-6">⚠️</div>
          <h2 className="text-2xl font-bold mb-4">주문 정보 오류</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            {error || '주문 정보를 불러올 수 없습니다.'}
          </p>
          <Button 
            asChild
            variant="outline"
          >
            <Link href="/shop">
              쇼핑몰로 돌아가기
            </Link>
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-success/10 dark:bg-success/20 rounded-full mb-4">
          <CheckCircle2 className="h-8 w-8 text-success dark:text-success" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-3">주문이 완료되었습니다</h1>
        <p className="text-gray-600 dark:text-gray-400">
          주문번호: <span className="font-medium">{orderData.orderNumber}</span>
        </p>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          주문일시: {formatDate(orderData.orderDate)}
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 왼쪽: 주문 정보 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 주문 상품 목록 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Package className="h-5 w-5 mr-2" />
                주문 상품 정보
              </CardTitle>
              <CardDescription>
                {orderData.items.length}개 상품
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">상품</TableHead>
                    <TableHead>정보</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderData.items.map((item: any) => (
                    <TableRow key={`${item.id}-${item.option}`}>
                      <TableCell>
                        <div className="w-12 h-12 rounded overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                          {item.image ? (
                            <img 
                              src={item.image} 
                              alt={item.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                              <ShoppingBag className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.option && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              옵션: {item.option}
                              {item.extraPrice > 0 && ` (+${item.extraPrice.toLocaleString()}원)`}
                            </p>
                          )}
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            수량: {item.quantity}개
                          </p>
                          
                          {/* 추천 코드 표시 */}
                          {item.referralCode && item.referralInfo && (
                            <div className="mt-1">
                              <Badge variant="outline" className="text-xs text-[hsl(var(--success))] border-[hsl(var(--success))]">
                                {item.referralSource === 'institute' ? '기관' : '트레이너'} 추천: {item.referralInfo.name}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {((item.price + (item.extraPrice || 0)) * item.quantity).toLocaleString()}원
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          {/* 배송 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Truck className="h-5 w-5 mr-2" />
                배송 정보
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">수령인</h3>
                    <p>{orderData.orderInfo.recipientName}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">연락처</h3>
                    <p>{orderData.orderInfo.phone}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">배송지 주소</h3>
                  <p>
                    [{orderData.orderInfo.zipCode}] {orderData.orderInfo.address1} {orderData.orderInfo.address2 || ''}
                  </p>
                </div>
                
                {orderData.orderInfo.deliveryRequest && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">배송 요청사항</h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      {orderData.orderInfo.deliveryRequest}
                    </p>
                  </div>
                )}
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">배송 예정일</h3>
                  <p className="text-[hsl(var(--success))] font-medium">
                    {calculateExpectedDeliveryDate(orderData.orderDate)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    (배송사 사정에 따라 배송일이 변경될 수 있습니다)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* 결제 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                결제 정보
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">결제 수단</span>
                  <span className="font-medium">
                    {orderData.orderInfo.paymentMethod === 'card' && '신용카드'}
                    {orderData.orderInfo.paymentMethod === 'trans' && '계좌이체'}
                    {orderData.orderInfo.paymentMethod === 'phone' && '휴대폰 결제'}
                    {orderData.orderInfo.paymentMethod === 'kakao' && '카카오페이'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">상품 금액</span>
                  <span>{orderData.paymentDetails.subtotal.toLocaleString()}원</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">배송비</span>
                  <span>
                    {orderData.paymentDetails.shippingFee > 0 
                      ? `${orderData.paymentDetails.shippingFee.toLocaleString()}원` 
                      : '무료'}
                  </span>
                </div>
                
                {orderData.paymentDetails.discountTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">할인 금액</span>
                    <span className="text-destructive">-{orderData.paymentDetails.discountTotal.toLocaleString()}원</span>
                  </div>
                )}
                
                <div className="border-t pt-4 flex justify-between items-center">
                  <span className="font-medium">총 결제 금액</span>
                  <span className="text-xl font-bold">{orderData.paymentDetails.total.toLocaleString()}원</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* 추천 수수료 정보 (있는 경우) */}
          {orderData.commissionSummary && Object.keys(orderData.commissionSummary).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">추천 수수료 정보</CardTitle>
                <CardDescription>
                  이 주문으로 발생한 추천 수수료 정보입니다
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {Object.entries(orderData.commissionSummary).map(([code, data]: [string, any]) => (
                    <AccordionItem key={code} value={code}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center">
                          <Badge variant="outline" className="mr-2">
                            {data.source === 'institute' ? '기관' : '트레이너'}
                          </Badge>
                          <span className="font-medium">{data.name}</span>
                          <span className="ml-auto text-[hsl(var(--success))] font-semibold">
                            {Math.round(data.commissionAmount).toLocaleString()}원
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="text-sm">
                          <div className="border rounded-md overflow-hidden">
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
                          </div>
                          
                          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                            <div className="flex justify-between font-medium">
                              <span>추천 수수료 합계 ({data.commissionRate}%)</span>
                              <span className="text-[hsl(var(--success))]">{Math.round(data.commissionAmount).toLocaleString()}원</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              이 금액은 매월 정산일에 {data.source === 'institute' ? '기관' : '트레이너'}의 계정에 자동으로 정산됩니다.
                            </p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                
                <div className="mt-4 bg-success/10 dark:bg-success/20 p-4 rounded-md text-sm">
                  <p className="flex items-start">
                    <CheckCircle2 className="h-4 w-4 text-success dark:text-success mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-success dark:text-success">
                      수수료 정보가 정상적으로 등록되었습니다. 해당 수수료는 추천인의 정산 내역에 반영됩니다.
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* 오른쪽: 주문 요약 및 작업 버튼 */}
        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>주문 현황</CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="flex items-center">
                <div className="relative w-full flex justify-between">
                  {/* 진행 단계 표시 */}
                  <div className="absolute top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-gray-700"></div>
                  
                  <div className="relative flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-[hsl(var(--success))] text-white flex items-center justify-center z-10">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <span className="text-xs mt-2">주문완료</span>
                  </div>
                  
                  <div className="relative flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center z-10">
                      <Package className="h-5 w-5" />
                    </div>
                    <span className="text-xs mt-2">상품준비</span>
                  </div>
                  
                  <div className="relative flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center z-10">
                      <Truck className="h-5 w-5" />
                    </div>
                    <span className="text-xs mt-2">배송중</span>
                  </div>
                  
                  <div className="relative flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center z-10">
                      <Home className="h-5 w-5" />
                    </div>
                    <span className="text-xs mt-2">배송완료</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 text-gray-700 dark:text-gray-300 text-sm space-y-2">
                <p className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-[hsl(var(--success))]" />
                  {formatDate(orderData.orderDate)}에 주문이 완료되었습니다.
                </p>
                <p className="flex items-center">
                  <Truck className="h-4 w-4 mr-2 text-[hsl(var(--success))]" />
                  상품 준비가 완료되면 배송이 시작됩니다.
                </p>
                {orderData.paymentDetails.total >= 30000 && (
                  <p className="flex items-center font-medium text-[hsl(var(--success))]">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    무료 배송 혜택이 적용되었습니다.
                  </p>
                )}
              </div>
            </CardContent>
            
            <CardFooter className="flex-col gap-4">
              <Button asChild className="w-full">
                <Link href="/shop/my-orders">
                  주문 내역 확인하기
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="w-full">
                <Link href="/shop">
                  쇼핑 계속하기
                </Link>
              </Button>
            </CardFooter>
          </Card>
          
          {/* 추가 안내사항 */}
          <div className="mt-6 space-y-4 text-sm">
            <div className="border rounded-md p-4">
              <h3 className="font-medium mb-2">주문 안내</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li className="flex items-start">
                  <span className="text-xs mr-2 mt-0.5">•</span>
                  주문하신 상품의 결제 금액은 <span className="font-medium">{orderData.paymentDetails.total.toLocaleString()}원</span>입니다.
                </li>
                <li className="flex items-start">
                  <span className="text-xs mr-2 mt-0.5">•</span>
                  주문내역은 마이페이지에서 확인 가능합니다.
                </li>
                <li className="flex items-start">
                  <span className="text-xs mr-2 mt-0.5">•</span>
                  배송 관련 문의사항은 고객센터(1234-5678)로 문의해주세요.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}