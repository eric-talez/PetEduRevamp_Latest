import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Users, 
  ShoppingCart, 
  BookOpen, 
  Calendar,
  Download,
  RefreshCw,
  CreditCard,
  Wallet,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function AdminRevenue() {
  const [timeRange, setTimeRange] = useState('30days');
  const [isLoading, setIsLoading] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['/api/admin/stats'],
  });

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const revenueData = {
    total: stats?.totalRevenue || 15450000,
    training: 9200000,
    shopping: 6250000,
    growth: 23.1,
    transactions: 234,
    avgOrder: 66000
  };

  const monthlyRevenue = [
    { month: '1월', total: 1200000, training: 800000, shopping: 400000 },
    { month: '2월', total: 1450000, training: 950000, shopping: 500000 },
    { month: '3월', total: 1680000, training: 1120000, shopping: 560000 },
    { month: '4월', total: 1950000, training: 1340000, shopping: 610000 },
    { month: '5월', total: 2200000, training: 1580000, shopping: 620000 },
    { month: '6월', total: 2650000, training: 1890000, shopping: 760000 },
    { month: '7월', total: 2950000, training: 2100000, shopping: 850000 },
  ];

  const topTrainers = [
    { name: '김지연 훈련사', revenue: 2450000, sessions: 45 },
    { name: '박민수 훈련사', revenue: 1980000, sessions: 38 },
    { name: '이서현 훈련사', revenue: 1650000, sessions: 32 },
    { name: '최동훈 훈련사', revenue: 1420000, sessions: 28 },
  ];

  const topProducts = [
    { name: '프리미엄 사료', sales: 156, revenue: 3120000 },
    { name: '훈련 간식 세트', sales: 234, revenue: 1170000 },
    { name: '리드줄 세트', sales: 89, revenue: 890000 },
    { name: '훈련용 클리커', sales: 167, revenue: 500000 },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">수익 관리</h1>
          <p className="text-muted-foreground">플랫폼 수익 현황 및 분석</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">최근 7일</SelectItem>
              <SelectItem value="30days">최근 30일</SelectItem>
              <SelectItem value="90days">최근 3개월</SelectItem>
              <SelectItem value="1year">최근 1년</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} disabled={isLoading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            리포트
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 수익</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenueData.total)}</div>
            <div className="flex items-center text-xs text-success mt-1">
              <ArrowUp className="h-3 w-3 mr-1" />
              <span>+{revenueData.growth}% 전월 대비</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">훈련 수익</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenueData.training)}</div>
            <div className="flex items-center text-xs text-success mt-1">
              <ArrowUp className="h-3 w-3 mr-1" />
              <span>+18.5% 전월 대비</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">쇼핑몰 수익</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenueData.shopping)}</div>
            <div className="flex items-center text-xs text-success mt-1">
              <ArrowUp className="h-3 w-3 mr-1" />
              <span>+12.3% 전월 대비</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">거래 건수</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{revenueData.transactions}건</div>
            <div className="text-xs text-muted-foreground mt-1">
              평균 {formatCurrency(revenueData.avgOrder)}/건
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="trainers">훈련사별</TabsTrigger>
          <TabsTrigger value="products">상품별</TabsTrigger>
          <TabsTrigger value="transactions">거래내역</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>월별 수익 추이</CardTitle>
              <CardDescription>훈련 수익 vs 쇼핑몰 수익</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monthlyRevenue.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{item.month}</span>
                      <span>{formatCurrency(item.total)}</span>
                    </div>
                    <div className="flex gap-1 h-3">
                      <div 
                        className="bg-primary rounded-l"
                        style={{ width: `${(item.training / 3000000) * 100}%` }}
                        title={`훈련: ${formatCurrency(item.training)}`}
                      />
                      <div 
                        className="bg-primary/40 rounded-r"
                        style={{ width: `${(item.shopping / 3000000) * 100}%` }}
                        title={`쇼핑: ${formatCurrency(item.shopping)}`}
                      />
                    </div>
                  </div>
                ))}
                <div className="flex gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary rounded"></div>
                    <span>훈련 수익</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary/40 rounded"></div>
                    <span>쇼핑몰 수익</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trainers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>훈련사별 수익</CardTitle>
              <CardDescription>상위 훈련사 수익 현황</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topTrainers.map((trainer, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{trainer.name}</p>
                        <p className="text-sm text-muted-foreground">{trainer.sessions}세션 완료</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatCurrency(trainer.revenue)}</p>
                      <Badge variant="secondary" className="text-success">
                        <ArrowUp className="h-3 w-3 mr-1" />
                        12%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>상품별 수익</CardTitle>
              <CardDescription>인기 상품 판매 현황</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.sales}개 판매</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(product.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>최근 거래 내역</CardTitle>
              <CardDescription>최근 결제 및 정산 현황</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { type: '훈련', customer: '김민지', amount: 150000, date: '2025-12-21 14:30', status: '완료' },
                  { type: '쇼핑', customer: '이준호', amount: 45000, date: '2025-12-21 13:15', status: '완료' },
                  { type: '훈련', customer: '박서연', amount: 200000, date: '2025-12-21 11:00', status: '완료' },
                  { type: '쇼핑', customer: '최지우', amount: 32000, date: '2025-12-20 18:45', status: '완료' },
                  { type: '훈련', customer: '정현우', amount: 180000, date: '2025-12-20 16:20', status: '환불' },
                ].map((tx, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === '훈련' ? 'bg-primary/10' : 'bg-primary/10'}`}>
                        {tx.type === '훈련' ? <BookOpen className="h-4 w-4 text-primary" /> : <ShoppingCart className="h-4 w-4 text-primary" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{tx.customer}</p>
                        <p className="text-xs text-muted-foreground">{tx.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${tx.status === '환불' ? 'text-destructive' : ''}`}>
                        {tx.status === '환불' ? '-' : '+'}{formatCurrency(tx.amount)}
                      </p>
                      <Badge variant={tx.status === '완료' ? 'default' : 'destructive'} className="text-xs">
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
