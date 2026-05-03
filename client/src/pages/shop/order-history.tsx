import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingBag, Package, Truck, CheckCircle, Search, FileText, ArrowLeft, Calendar, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

// 주문 상태 타입
type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

// 주문 아이템 타입
interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  options?: { [key: string]: string };
}

// 주문 데이터 타입
interface Order {
  id: string;
  date: Date | string;
  totalAmount: number;
  status: OrderStatus;
  trackingNumber?: string;
  items: OrderItem[];
}

// 주문 상태에 따른 UI 정보
const statusInfo = {
  pending: {
    label: '결제 대기',
    color: 'text-warning bg-warning/10 dark:bg-warning/30',
    icon: <ShoppingBag className="h-4 w-4" />
  },
  processing: {
    label: '주문 처리 중',
    color: 'text-primary bg-primary/10 dark:bg-primary/30',
    icon: <Package className="h-4 w-4" />
  },
  shipped: {
    label: '배송 중',
    color: 'text-primary bg-primary/10 dark:bg-primary/20',
    icon: <Truck className="h-4 w-4" />
  },
  delivered: {
    label: '배송 완료',
    color: 'text-success bg-success/10 dark:bg-success/30',
    icon: <CheckCircle className="h-4 w-4" />
  },
  cancelled: {
    label: '주문 취소',
    color: 'text-destructive bg-destructive/10 dark:bg-destructive/30',
    icon: <FileText className="h-4 w-4" />
  }
};

// 날짜 포맷 함수
function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'yyyy년 MM월 dd일', { locale: ko });
}

// 가격 포맷 함수
function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR') + '원';
}

export default function OrderHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // API에서 주문 데이터 조회
  const { data: ordersData, isLoading, isError } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  // 기간 및 상태 필터링
  const filteredOrders = useMemo(() => {
    if (!ordersData) return [];

    const now = new Date();
    
    return ordersData.filter(order => {
      // 기간 필터
      const orderDate = new Date(order.date);
      if (activeTab !== 'all') {
        let cutoffDate = new Date(now);
        switch (activeTab) {
          case '1month':
            cutoffDate.setMonth(now.getMonth() - 1);
            break;
          case '3months':
            cutoffDate.setMonth(now.getMonth() - 3);
            break;
          case '6months':
            cutoffDate.setMonth(now.getMonth() - 6);
            break;
        }
        if (orderDate < cutoffDate) return false;
      }

      // 상태 필터
      if (filterStatus !== 'all' && order.status !== filterStatus) {
        return false;
      }
      
      // 검색어 필터
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          order.id.toLowerCase().includes(searchLower) ||
          order.items.some(item => item.name.toLowerCase().includes(searchLower))
        );
      }
      
      return true;
    });
  }, [ordersData, activeTab, filterStatus, searchTerm]);

  // 배송 추적 함수
  const trackOrder = (trackingNumber: string) => {
    toast({
      title: "배송 추적",
      description: `택배사 웹사이트에서 ${trackingNumber} 번호로 배송 상태를 확인합니다.`,
    });
    window.open(`https://tracker.delivery/#/${trackingNumber}`, '_blank');
  };

  // 주문 취소 함수
  const cancelOrder = (orderId: string) => {
    toast({
      title: "주문 취소 요청",
      description: "주문 취소 요청이 접수되었습니다. 관리자 확인 후 처리됩니다.",
    });
  };

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
        <div className="flex items-center mb-4 md:mb-0">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mr-3"
            onClick={() => setLocation('/shop')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            쇼핑몰로 돌아가기
          </Button>
          <h1 className="text-2xl font-bold">주문 내역</h1>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.print()}
            className="hidden md:flex"
          >
            <FileText className="h-4 w-4 mr-2" />
            주문 내역 인쇄
          </Button>
        </div>
      </div>
      
      <div className="bg-muted/30 rounded-lg p-4 mb-6">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList className="grid w-full md:w-auto grid-cols-4 md:grid-cols-4 bg-background">
            <TabsTrigger value="all">전체 기간</TabsTrigger>
            <TabsTrigger value="1month">1개월</TabsTrigger>
            <TabsTrigger value="3months">3개월</TabsTrigger>
            <TabsTrigger value="6months">6개월</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Input
              placeholder="주문 번호 또는 상품명 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Search className="h-4 w-4" />
            </div>
          </div>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-48 bg-background">
              <SelectValue placeholder="상태 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 상태</SelectItem>
              <SelectItem value="pending">결제 대기</SelectItem>
              <SelectItem value="processing">주문 처리 중</SelectItem>
              <SelectItem value="shipped">배송 중</SelectItem>
              <SelectItem value="delivered">배송 완료</SelectItem>
              <SelectItem value="cancelled">주문 취소</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {isLoading ? (
        <div className="space-y-8">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden border-2">
              <CardHeader className="bg-muted/30 border-b-2 border-primary/10">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div>
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-8 w-24 rounded-full" />
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Skeleton className="w-20 h-20 rounded-md" />
                  <div className="flex-grow">
                    <Skeleton className="h-5 w-48 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="text-center p-10">
          <div className="flex flex-col items-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
            <p className="text-xl font-medium mb-2">주문 내역이 없습니다</p>
            <p className="text-muted-foreground mb-6">
              {!ordersData || ordersData.length === 0 
                ? '아직 주문하신 내역이 없습니다.' 
                : '해당 기간에 주문한 내역이 없거나 검색 조건에 맞는 주문이 없습니다.'}
            </p>
            <Button onClick={() => setLocation('/shop')}>
              테일즈 샵 가기
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="overflow-hidden border-2 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="bg-muted/30 border-b-2 border-primary/10">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div>
                    <div className="flex items-center">
                      <CardTitle className="text-lg font-bold">{order.id}</CardTitle>
                      <span className="text-sm text-muted-foreground ml-4 bg-background px-2 py-1 rounded-md">
                        <Calendar className="h-3.5 w-3.5 inline-block mr-1" />
                        {formatDate(order.date)}
                      </span>
                    </div>
                    <CardDescription className="mt-1.5 text-sm">
                      {order.items.length}개 상품 · {formatPrice(order.totalAmount)}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className={`px-3 py-1.5 rounded-full flex items-center shadow-sm ${statusInfo[order.status].color}`}>
                      {statusInfo[order.status].icon}
                      <span className="ml-1.5 text-sm font-medium">{statusInfo[order.status].label}</span>
                    </div>
                    {order.status === 'shipped' && order.trackingNumber && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => trackOrder(order.trackingNumber!)}
                        className="font-medium"
                      >
                        <Truck className="h-3.5 w-3.5 mr-1.5" />
                        배송 조회
                      </Button>
                    )}
                    {(order.status === 'pending' || order.status === 'processing') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelOrder(order.id)}
                        className="font-medium"
                      >
                        주문 취소
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex p-4 gap-4 hover:bg-muted/40 transition-colors">
                      <div className="w-20 h-20 rounded-md overflow-hidden shrink-0 border border-border">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-medium text-base mb-2">{item.name}</h4>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end">
                          <div className="text-sm text-muted-foreground mb-2 sm:mb-0">
                            <div className="flex items-center text-foreground">
                              <span className="font-medium mr-1">{formatPrice(item.price)}</span> 
                              <span className="mx-1">×</span> 
                              <span>{item.quantity}개</span>
                            </div>
                            {item.options && (
                              <div className="mt-2 text-xs flex flex-wrap gap-2">
                                {Object.entries(item.options).map(([key, value]) => (
                                  <span key={key} className="px-2 py-1 bg-secondary text-secondary-foreground rounded-full">
                                    {key}: {value}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="font-medium text-lg">
                            {formatPrice(item.price * item.quantity)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row justify-between bg-muted/20 p-4 gap-3">
                <div className="flex items-center">
                  <span className="text-sm font-medium mr-2">주문 금액:</span>
                  <span className="text-lg font-bold text-primary">{formatPrice(order.totalAmount)}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.open(`/shop/order-invoice/${order.id}`, '_blank')}>
                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                    영수증
                  </Button>
                  <Button variant="default" size="sm" onClick={() => setLocation(`/shop/order-detail/${order.id}`)}>
                    주문 상세 보기
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}