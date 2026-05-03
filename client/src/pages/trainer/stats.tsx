import { useState, useEffect } from 'react';
import { useAuth } from '../../SimpleApp';
import { useToast } from '@/hooks/use-toast';
import { PageSkeleton } from '@/components/ui/SkeletonLoader';
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
import {
  DollarSign,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  RefreshCw,
  HelpCircle,
  Share2,
  PieChart,
  BarChart,
  TrendingUp
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format } from 'date-fns';

interface Transaction {
  id: number;
  date: string;
  type: 'course' | 'referral' | 'payout';
  description: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  referenceId?: string;
  courseName?: string;
  courseId?: number;
  studentName?: string;
  studentId?: number;
  productName?: string;
}

interface EarningsSummary {
  totalEarnings: number;
  pendingEarnings: number;
  thisMonthEarnings: number;
  courseEarnings: number;
  referralEarnings: number;
  previousMonthEarnings: number;
  monthlyGrowth: number;
}

interface EarningsReport {
  year: number;
  month: number;
  earnings: {
    total: number;
    course: number;
    referral: number;
  };
}

export default function TrainerStats() {
  const { userName } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{start: string | null, end: string | null}>({
    start: null,
    end: null
  });
  const [earningsSummary, setEarningsSummary] = useState<EarningsSummary>({
    totalEarnings: 0,
    pendingEarnings: 0,
    thisMonthEarnings: 0,
    courseEarnings: 0,
    referralEarnings: 0,
    previousMonthEarnings: 0,
    monthlyGrowth: 0
  });
  const [monthlyReports, setMonthlyReports] = useState<EarningsReport[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);

  // 거래 내역 및 요약 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // 실제 구현 시 API 호출로 대체
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 임시 거래 내역 데이터
        const mockTransactions: Transaction[] = [
          {
            id: 1,
            date: '2024-05-01',
            type: 'course',
            description: '반려견 기본 훈련 과정 수강료',
            amount: 120000,
            status: 'completed',
            referenceId: 'CRS-2024-0501',
            courseName: '반려견 기본 훈련 과정',
            courseId: 1,
            studentName: '김철수',
            studentId: 101
          },
          {
            id: 2,
            date: '2024-05-03',
            type: 'course',
            description: '문제행동 교정 특별과정 수강료',
            amount: 150000,
            status: 'completed',
            referenceId: 'CRS-2024-0503',
            courseName: '문제행동 교정 특별과정',
            courseId: 2,
            studentName: '이영희',
            studentId: 102
          },
          {
            id: 3,
            date: '2024-05-05',
            type: 'referral',
            description: '프리미엄 강아지 사료 추천 수수료',
            amount: 8000,
            status: 'completed',
            referenceId: 'REF-2024-0505',
            productName: '프리미엄 강아지 사료'
          },
          {
            id: 4,
            date: '2024-05-08',
            type: 'course',
            description: '고급 트릭 훈련 수강료',
            amount: 200000,
            status: 'completed',
            referenceId: 'CRS-2024-0508',
            courseName: '고급 트릭 훈련',
            courseId: 3,
            studentName: '정민수',
            studentId: 104
          },
          {
            id: 5,
            date: '2024-05-10',
            type: 'payout',
            description: '5월 첫째주 정산',
            amount: -270000,
            status: 'completed',
            referenceId: 'PAY-2024-0510'
          },
          {
            id: 6,
            date: '2024-05-12',
            type: 'course',
            description: '퍼피 사회화 클래스 수강료',
            amount: 100000,
            status: 'pending',
            referenceId: 'CRS-2024-0512',
            courseName: '퍼피 사회화 클래스',
            courseId: 4,
            studentName: '한소희',
            studentId: 105
          },
          {
            id: 7,
            date: '2024-05-15',
            type: 'referral',
            description: '강아지 장난감 세트 추천 수수료',
            amount: 5000,
            status: 'pending',
            referenceId: 'REF-2024-0515',
            productName: '강아지 장난감 세트'
          }
        ];
        
        // 임시 수입 요약 데이터
        const mockSummary: EarningsSummary = {
          totalEarnings: 583000,
          pendingEarnings: 105000,
          thisMonthEarnings: 313000,
          courseEarnings: 570000,
          referralEarnings: 13000,
          previousMonthEarnings: 270000,
          monthlyGrowth: 15.9
        };
        
        // 임시 월간 보고서 데이터
        const mockMonthlyReports: EarningsReport[] = [
          {
            year: 2024,
            month: 1,
            earnings: {
              total: 230000,
              course: 220000,
              referral: 10000
            }
          },
          {
            year: 2024,
            month: 2,
            earnings: {
              total: 240000,
              course: 225000,
              referral: 15000
            }
          },
          {
            year: 2024,
            month: 3,
            earnings: {
              total: 270000,
              course: 250000,
              referral: 20000
            }
          },
          {
            year: 2024,
            month: 4,
            earnings: {
              total: 270000,
              course: 260000,
              referral: 10000
            }
          },
          {
            year: 2024,
            month: 5,
            earnings: {
              total: 313000,
              course: 300000,
              referral: 13000
            }
          }
        ];
        
        setTransactions(mockTransactions);
        setEarningsSummary(mockSummary);
        setMonthlyReports(mockMonthlyReports);
      } catch (error) {
        console.error('수입 데이터 로딩 오류:', error);
        toast({
          title: '데이터 로딩 오류',
          description: '수입 정보를 불러오는 중 오류가 발생했습니다.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [toast]);
  
  // 필터링된 거래 내역 업데이트
  useEffect(() => {
    let result = [...transactions];
    
    // 탭 필터링
    if (activeTab === 'course') {
      result = result.filter(transaction => transaction.type === 'course');
    } else if (activeTab === 'referral') {
      result = result.filter(transaction => transaction.type === 'referral');
    } else if (activeTab === 'payout') {
      result = result.filter(transaction => transaction.type === 'payout');
    } else if (activeTab === 'pending') {
      result = result.filter(transaction => transaction.status === 'pending');
    }
    
    // 검색어 필터링
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        transaction => 
          transaction.description.toLowerCase().includes(query) ||
          transaction.referenceId?.toLowerCase().includes(query) ||
          transaction.courseName?.toLowerCase().includes(query) ||
          transaction.studentName?.toLowerCase().includes(query) ||
          transaction.productName?.toLowerCase().includes(query)
      );
    }
    
    // 거래 유형 필터링
    if (filterType) {
      result = result.filter(transaction => transaction.type === filterType);
    }
    
    // 상태 필터링
    if (filterStatus) {
      result = result.filter(transaction => transaction.status === filterStatus);
    }
    
    // 날짜 범위 필터링
    if (dateRange.start) {
      result = result.filter(transaction => 
        new Date(transaction.date) >= new Date(dateRange.start || '')
      );
    }
    
    if (dateRange.end) {
      result = result.filter(transaction => 
        new Date(transaction.date) <= new Date(dateRange.end || '')
      );
    }
    
    // 날짜 기준 내림차순 정렬
    result.sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    
    setFilteredTransactions(result);
  }, [transactions, activeTab, searchQuery, filterType, filterStatus, dateRange]);
  
  // 페이지네이션 처리
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // 거래 내역 상세 보기
  const handleViewTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionDetail(true);
  };
  
  // 숫자 포맷팅 (통화)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // 데이터 새로고침
  const handleRefresh = () => {
    setIsLoading(true);
    
    // 실제 구현 시 API 호출로 대체
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: '새로고침 완료',
        description: '수입 데이터가 업데이트되었습니다.',
      });
    }, 1000);
  };
  
  // 필터 초기화
  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterType(null);
    setFilterStatus(null);
    setDateRange({ start: null, end: null });
    setActiveTab('all');
  };
  
  // CSV 다운로드
  const handleDownloadCSV = () => {
    // 실제 구현 시 API 호출 또는 프론트엔드 로직으로 대체
    toast({
      title: 'CSV 다운로드',
      description: '거래 내역이 다운로드되었습니다.',
    });
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* 거래 내역 상세 모달 */}
      <Dialog open={showTransactionDetail} onOpenChange={setShowTransactionDetail}>
        <DialogContent className="max-w-lg">
          {selectedTransaction && (
            <>
              <DialogHeader>
                <DialogTitle>거래 상세 정보</DialogTitle>
                <DialogDescription>
                  거래 ID: {selectedTransaction.referenceId}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">거래 유형</p>
                    <p className="text-base font-medium">
                      {selectedTransaction.type === 'course' ? '강좌 수입' : 
                       selectedTransaction.type === 'referral' ? '추천 수수료' : '출금'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">상태</p>
                    <Badge 
                      variant={selectedTransaction.status === 'completed' ? 'default' : 
                              selectedTransaction.status === 'pending' ? 'outline' : 'destructive'}
                    >
                      {selectedTransaction.status === 'completed' ? '완료' : 
                       selectedTransaction.status === 'pending' ? '대기 중' : '실패'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">날짜</p>
                    <p className="text-base">{selectedTransaction.date}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">금액</p>
                    <p className={`text-base font-medium ${selectedTransaction.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {formatCurrency(selectedTransaction.amount)}
                    </p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">설명</p>
                  <p className="text-base">{selectedTransaction.description}</p>
                </div>
                
                {selectedTransaction.type === 'course' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">강좌명</p>
                      <p className="text-base">{selectedTransaction.courseName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">수강생</p>
                      <p className="text-base">{selectedTransaction.studentName}</p>
                    </div>
                  </div>
                )}
                
                {selectedTransaction.type === 'referral' && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">추천 상품</p>
                    <p className="text-base">{selectedTransaction.productName}</p>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button>확인</Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">수익 관리</h1>
        <div className="flex items-center space-x-2">
          <Button onClick={handleDownloadCSV} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            CSV 다운로드
          </Button>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
        </div>
      </div>
      
      {/* 요약 카드 */}
      {isLoading ? (
        <PageSkeleton header={false} variant="grid" count={3} className="p-0" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex justify-between">
                <span>총 수익</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>모든 강좌 수익과 추천 수수료의 합계</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">{formatCurrency(earningsSummary.totalEarnings)}</div>
              <div className="text-sm text-muted-foreground flex justify-between">
                <span>대기 중</span>
                <span>{formatCurrency(earningsSummary.pendingEarnings)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">이번 달 수익</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">{formatCurrency(earningsSummary.thisMonthEarnings)}</div>
              <div className="text-sm flex items-center">
                {earningsSummary.monthlyGrowth > 0 ? (
                  <>
                    <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-500">{earningsSummary.monthlyGrowth}% 증가</span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-red-500">{Math.abs(earningsSummary.monthlyGrowth)}% 감소</span>
                  </>
                )}
                <span className="text-muted-foreground ml-1">(전월 대비)</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">수익 분석</CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">강좌 수익</span>
                  <div className="flex items-center">
                    <span className="text-sm font-medium">{formatCurrency(earningsSummary.courseEarnings)}</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({Math.round(earningsSummary.courseEarnings / earningsSummary.totalEarnings * 100)}%)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary rounded-full h-2" 
                    style={{ width: `${Math.round(earningsSummary.courseEarnings / earningsSummary.totalEarnings * 100)}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">추천 수수료</span>
                  <div className="flex items-center">
                    <span className="text-sm font-medium">{formatCurrency(earningsSummary.referralEarnings)}</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({Math.round(earningsSummary.referralEarnings / earningsSummary.totalEarnings * 100)}%)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-blue-500 rounded-full h-2" 
                    style={{ width: `${Math.round(earningsSummary.referralEarnings / earningsSummary.totalEarnings * 100)}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* 월간 추세 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">월간 수익 추세</CardTitle>
          <CardDescription>최근 5개월 수익 추세 차트</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <PageSkeleton header={false} variant="detail" count={1} className="p-0" />
          ) : (
            <div className="h-64 relative">
              {/* 실제 구현 시 Recharts와 같은 차트 라이브러리로 대체 */}
              <div className="absolute inset-0 flex items-end justify-between p-4">
                {monthlyReports.map((report, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div className="flex h-40 items-end space-x-1">
                      <div 
                        className="w-4 bg-primary rounded-t-sm" 
                        style={{ height: `${report.earnings.course / 3000}px` }}
                      ></div>
                      <div 
                        className="w-4 bg-blue-500 rounded-t-sm" 
                        style={{ height: `${report.earnings.referral / 3000}px` }}
                      ></div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {report.year}/{String(report.month).padStart(2, '0')}
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute top-0 left-0 h-full border-r border-dashed border-muted-foreground/20"></div>
              
              <div className="absolute bottom-14 left-0 right-0 flex justify-between px-6">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-primary rounded-sm mr-1"></div>
                  <span className="text-xs">강좌</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-sm mr-1"></div>
                  <span className="text-xs">추천</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 거래 내역 테이블 */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList>
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="course">강좌</TabsTrigger>
            <TabsTrigger value="referral">추천</TabsTrigger>
            <TabsTrigger value="payout">출금</TabsTrigger>
            <TabsTrigger value="pending">대기 중</TabsTrigger>
          </TabsList>
          
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Input
                type="search"
                placeholder="거래 내역 검색..."
                className="pl-8 h-9 w-full sm:w-[200px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
            
            <Select value={filterType || 'all'} onValueChange={setFilterType}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue placeholder="유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 유형</SelectItem>
                <SelectItem value="course">강좌</SelectItem>
                <SelectItem value="referral">추천</SelectItem>
                <SelectItem value="payout">출금</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterStatus || 'all'} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 상태</SelectItem>
                <SelectItem value="completed">완료</SelectItem>
                <SelectItem value="pending">대기 중</SelectItem>
                <SelectItem value="failed">실패</SelectItem>
              </SelectContent>
            </Select>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Calendar className="mr-2 h-4 w-4" />
                  날짜 범위
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">시작 날짜</h4>
                    <Input
                      type="date"
                      value={dateRange.start || ''}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">종료 날짜</h4>
                    <Input
                      type="date"
                      value={dateRange.end || ''}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    />
                  </div>
                  <Button onClick={handleResetFilters} variant="outline">필터 초기화</Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <PageSkeleton header={false} variant="list" count={5} className="p-4" />
            ) : paginatedTransactions.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                조건에 맞는 거래 내역이 없습니다
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>날짜</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>설명</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">상세</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">{transaction.date}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          transaction.type === 'course' ? 'border-primary text-primary' :
                          transaction.type === 'referral' ? 'border-blue-500 text-blue-500' :
                          'border-orange-500 text-orange-500'
                        }>
                          {transaction.type === 'course' ? '강좌' : 
                           transaction.type === 'referral' ? '추천' : '출금'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate">
                        {transaction.description}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${transaction.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          transaction.status === 'completed' ? 'default' :
                          transaction.status === 'pending' ? 'outline' : 'destructive'
                        } className="text-xs">
                          {transaction.status === 'completed' ? '완료' : 
                           transaction.status === 'pending' ? '대기 중' : '실패'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleViewTransaction(transaction)}
                        >
                          상세
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex justify-center p-4 border-t">
                <div className="flex space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    이전
                  </Button>
                  <div className="flex space-x-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    다음
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>
      
      {/* FAQ 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle>자주 묻는 질문</CardTitle>
          <CardDescription>수익 관리에 관한 질문과 답변</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>수익은 어떻게 계산되나요?</AccordionTrigger>
              <AccordionContent>
                수업 수익은 수강생이 지불한 수강료에서 플랫폼 수수료(15%)를 제외한 금액입니다. 
                추천 수수료는 훈련사가 추천한 제품이 판매될 때 제품 가격의 일정 비율(5-10%)로 계산됩니다.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>정산은 언제 이루어지나요?</AccordionTrigger>
              <AccordionContent>
                정산은 매월 15일과 말일에 이루어집니다. 누적된 수익이 50,000원 이상일 경우 자동으로 등록된 계좌로 
                입금됩니다. 50,000원 미만인 경우는 다음 정산일로 이월됩니다.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>세금 계산서는 어떻게 발행받나요?</AccordionTrigger>
              <AccordionContent>
                세금 계산서는 매출 발생 시 시스템에서 자동으로 발행됩니다. '설정 &gt; 세금계산서' 메뉴에서 
                사업자등록번호와 이메일 주소를 등록하면 세금계산서가 이메일로 발송됩니다.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}