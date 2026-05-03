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
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PageSkeleton, SkeletonTable } from '@/components/ui/SkeletonLoader';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Pencil,
  Trash2,
  Package,
  CircleDollarSign,
  DollarSign,
  Building,
  User,
  Calendar,
  CalendarCheck,
  Check,
  Download,
  FileText,
  BarChart3,
  Percent,
  MoreVertical,
  HeartHandshake,
  ArrowRightLeft,
  FileSpreadsheet,
  Store,
  Save,
  CreditCard,
  BadgeDollarSign,
  Landmark,
  Calculator,
  Eye,
  X,
  GraduationCap
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';

// 커미션 정책 타입
interface CommissionPolicy {
  id: number;
  name: string;
  type: 'trainer' | 'institute';
  baseRate: number;
  tiers: CommissionTier[];
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  description?: string;
}

// 커미션 등급 타입
interface CommissionTier {
  id: number;
  policyId: number;
  name: string;
  minSales: number;
  rate: number;
}

// 커미션 트랜잭션 타입
interface CommissionTransaction {
  id: number;
  userId: number;
  userName: string;
  userAvatar?: string;
  userType: 'trainer' | 'institute';
  orderNumber: string;
  productName: string;
  orderAmount: number;
  commissionAmount: number;
  commissionRate: number;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: string;
  paidAt?: string;
  referralCode: string;
}

// 정산 보고서 타입
interface SettlementReport {
  id: number;
  userId: number;
  userName: string;
  userAvatar?: string;
  userType: 'trainer' | 'institute';
  periodStart: string;
  periodEnd: string;
  totalCommission: number;
  transactionCount: number;
  status: 'pending' | 'processed' | 'paid';
  createdAt: string;
  updatedAt?: string;
  paidAt?: string;
  paymentMethod?: string;
  bankInfo?: string;
}

// 커리큘럼 수익 타입
interface CurriculumRevenue {
  id: string;
  title: string;
  trainerId: string;
  trainerName: string;
  trainerEmail?: string;
  category: string;
  price: number;
  enrollmentCount: number;
  totalRevenue: number;
  trainerRevenue: number;
  platformRevenue: number;
  revenueShare: {
    trainerShare: number;
    platformShare: number;
  };
  status: 'draft' | 'published';
  lastSaleDate?: Date;
  createdAt: Date;
}

export default function AdminCommission() {
  const { userName } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('policies');
  const [isLoading, setIsLoading] = useState(true);
  const [policies, setPolicies] = useState<CommissionPolicy[]>([]);
  const [transactions, setTransactions] = useState<CommissionTransaction[]>([]);
  const [settlements, setSettlements] = useState<SettlementReport[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<CommissionTransaction[]>([]);
  const [filteredSettlements, setFilteredSettlements] = useState<SettlementReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<CommissionPolicy | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'add'>('view');
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<SettlementReport | null>(null);
  
  // 커리큘럼 수익 상태
  const [curriculumRevenues, setCurriculumRevenues] = useState<CurriculumRevenue[]>([]);
  
  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // 실제 구현 시 API 호출로 대체
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 임시 커미션 정책 데이터
        const mockPolicies: CommissionPolicy[] = [
          {
            id: 1,
            name: '훈련사 기본 커미션',
            type: 'trainer',
            baseRate: 10,
            tiers: [
              { id: 101, policyId: 1, name: '브론즈', minSales: 0, rate: 10 },
              { id: 102, policyId: 1, name: '실버', minSales: 500000, rate: 12 },
              { id: 103, policyId: 1, name: '골드', minSales: 1000000, rate: 15 },
              { id: 104, policyId: 1, name: '플래티넘', minSales: 3000000, rate: 18 }
            ],
            status: 'active',
            createdAt: '2024-01-15',
            updatedAt: '2024-04-10',
            description: '훈련사에게 적용되는 기본 커미션 정책입니다. 월 매출에 따라 등급이 결정됩니다.'
          },
          {
            id: 2,
            name: '기관 기본 커미션',
            type: 'institute',
            baseRate: 8,
            tiers: [
              { id: 201, policyId: 2, name: '스탠다드', minSales: 0, rate: 8 },
              { id: 202, policyId: 2, name: '프리미엄', minSales: 1000000, rate: 10 },
              { id: 203, policyId: 2, name: '엘리트', minSales: 5000000, rate: 12 }
            ],
            status: 'active',
            createdAt: '2024-01-15',
            updatedAt: '2024-03-20',
            description: '교육 기관에 적용되는 기본 커미션 정책입니다. 월 매출에 따라 등급이 결정됩니다.'
          },
          {
            id: 3,
            name: '프리미엄 훈련사 커미션',
            type: 'trainer',
            baseRate: 15,
            tiers: [
              { id: 301, policyId: 3, name: '프리미엄', minSales: 0, rate: 15 },
              { id: 302, policyId: 3, name: '프리미엄 플러스', minSales: 2000000, rate: 20 }
            ],
            status: 'inactive',
            createdAt: '2024-03-01',
            updatedAt: '2024-04-15',
            description: '선발된 프리미엄 훈련사에게 적용되는 특별 커미션 정책입니다.'
          }
        ];
        
        // 임시 커미션 트랜잭션 데이터
        const mockTransactions: CommissionTransaction[] = [
          {
            id: 1,
            userId: 3,
            userName: '박훈련',
            userType: 'trainer',
            orderNumber: 'ORD-20240510-001',
            productName: '프리미엄 건식 사료 1kg',
            orderAmount: 29900,
            commissionAmount: 2990,
            commissionRate: 10,
            status: 'pending',
            createdAt: '2024-05-10 09:23:45',
            referralCode: 'TRAINER001'
          },
          {
            id: 2,
            userId: 2,
            userName: '알파 트레이닝 센터',
            userType: 'institute',
            orderNumber: 'ORD-20240509-002',
            productName: '올인원 훈련 클리커 세트',
            orderAmount: 19800,
            commissionAmount: 1584,
            commissionRate: 8,
            status: 'pending',
            createdAt: '2024-05-09 15:45:12',
            referralCode: 'INST001'
          },
          {
            id: 3,
            userId: 103,
            userName: '이하은',
            userType: 'trainer',
            orderNumber: 'ORD-20240507-004',
            productName: '독투스 치석 제거 장난감',
            orderAmount: 14800,
            commissionAmount: 1480,
            commissionRate: 10,
            status: 'pending',
            createdAt: '2024-05-07 18:05:22',
            referralCode: 'TRAINER003'
          },
          {
            id: 4,
            userId: 3,
            userName: '박훈련',
            userType: 'trainer',
            orderNumber: 'ORD-20240425-012',
            productName: '울트라 컴포트 하네스 (중형견)',
            orderAmount: 52000,
            commissionAmount: 7800,
            commissionRate: 15,
            status: 'paid',
            createdAt: '2024-04-25 11:32:18',
            paidAt: '2024-05-01 14:20:35',
            referralCode: 'TRAINER001'
          },
          {
            id: 5,
            userId: 104,
            userName: '베타 애견 학교',
            userType: 'institute',
            orderNumber: 'ORD-20240418-023',
            productName: '고단백 습식 사료 세트 (10개입)',
            orderAmount: 45000,
            commissionAmount: 3600,
            commissionRate: 8,
            status: 'paid',
            createdAt: '2024-04-18 09:45:22',
            paidAt: '2024-05-01 14:20:35',
            referralCode: 'INST002'
          }
        ];
        
        // 임시 정산 보고서 데이터
        const mockSettlements: SettlementReport[] = [
          {
            id: 1,
            userId: 3,
            userName: '박훈련',
            userType: 'trainer',
            periodStart: '2024-04-01',
            periodEnd: '2024-04-30',
            totalCommission: 45600,
            transactionCount: 6,
            status: 'paid',
            createdAt: '2024-05-01 00:01:22',
            paidAt: '2024-05-03 15:30:45',
            paymentMethod: '계좌이체',
            bankInfo: '신한은행 110-123-456789'
          },
          {
            id: 2,
            userId: 2,
            userName: '알파 트레이닝 센터',
            userType: 'institute',
            periodStart: '2024-04-01',
            periodEnd: '2024-04-30',
            totalCommission: 38400,
            transactionCount: 5,
            status: 'paid',
            createdAt: '2024-05-01 00:01:22',
            paidAt: '2024-05-03 15:32:10',
            paymentMethod: '계좌이체',
            bankInfo: '국민은행 123-45-67890'
          },
          {
            id: 3,
            userId: 103,
            userName: '이하은',
            userType: 'trainer',
            periodStart: '2024-04-01',
            periodEnd: '2024-04-30',
            totalCommission: 32100,
            transactionCount: 4,
            status: 'paid',
            createdAt: '2024-05-01 00:01:22',
            paidAt: '2024-05-03 15:33:25',
            paymentMethod: '계좌이체',
            bankInfo: '우리은행 1002-123-456789'
          },
          {
            id: 4,
            userId: 3,
            userName: '박훈련',
            userType: 'trainer',
            periodStart: '2024-05-01',
            periodEnd: '2024-05-31',
            totalCommission: 2990,
            transactionCount: 1,
            status: 'pending',
            createdAt: '2024-05-10 09:30:22'
          },
          {
            id: 5,
            userId: 2,
            userName: '알파 트레이닝 센터',
            userType: 'institute',
            periodStart: '2024-05-01',
            periodEnd: '2024-05-31',
            totalCommission: 1584,
            transactionCount: 1,
            status: 'pending',
            createdAt: '2024-05-09 15:50:22'
          }
        ];
        
        // 커리큘럼 수익 데이터 초기화
        const mockCurriculumRevenues: CurriculumRevenue[] = [
          {
            id: 'curriculum-basic-obedience',
            title: '기초 복종훈련 완전정복',
            trainerId: 'trainer-hanseongkyu',
            trainerName: '한성규',
            trainerEmail: 'hanseongkyu@talez.co.kr',
            category: '기초훈련',
            price: 180000,
            enrollmentCount: 25,
            totalRevenue: 4500000,
            trainerRevenue: 3150000, // 70%
            platformRevenue: 1350000, // 30%
            revenueShare: {
              trainerShare: 70,
              platformShare: 30
            },
            status: 'published',
            lastSaleDate: new Date('2025-01-05'),
            createdAt: new Date('2025-01-01')
          },
          {
            id: 'curriculum-behavior-correction',
            title: '문제행동 교정 전문과정',
            trainerId: 'trainer-hanseongkyu',
            trainerName: '한성규',
            trainerEmail: 'hanseongkyu@talez.co.kr',
            category: '문제행동교정',
            price: 300000,
            enrollmentCount: 60,
            totalRevenue: 18000000,
            trainerRevenue: 13500000, // 75%
            platformRevenue: 4500000, // 25%
            revenueShare: {
              trainerShare: 75,
              platformShare: 25
            },
            status: 'published',
            lastSaleDate: new Date('2025-01-06'),
            createdAt: new Date('2025-01-01')
          }
        ];

        setPolicies(mockPolicies);
        setTransactions(mockTransactions);
        setSettlements(mockSettlements);
        setCurriculumRevenues(mockCurriculumRevenues);
      } catch (error) {
        console.error('데이터 로딩 오류:', error);
        toast({
          title: '데이터 로딩 오류',
          description: '커미션 데이터를 불러오는 중 오류가 발생했습니다.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [toast]);
  
  // 트랜잭션 필터링
  useEffect(() => {
    let filtered = [...transactions];
    
    // 검색어 필터링
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        transaction => 
          transaction.userName.toLowerCase().includes(query) ||
          transaction.orderNumber.toLowerCase().includes(query) ||
          transaction.productName.toLowerCase().includes(query) ||
          transaction.referralCode.toLowerCase().includes(query)
      );
    }
    
    // 상태 필터링
    if (filterStatus && filterStatus !== 'all') {
      filtered = filtered.filter(transaction => transaction.status === filterStatus);
    }
    
    // 유형 필터링
    if (filterType && filterType !== 'all') {
      filtered = filtered.filter(transaction => transaction.userType === filterType);
    }
    
    // 정렬
    filtered = filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'orderAmount':
          comparison = a.orderAmount - b.orderAmount;
          break;
        case 'commissionAmount':
          comparison = a.commissionAmount - b.commissionAmount;
          break;
        default:
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    setFilteredTransactions(filtered);
  }, [transactions, searchQuery, filterStatus, filterType, sortBy, sortOrder]);
  
  // 정산 보고서 필터링
  useEffect(() => {
    let filtered = [...settlements];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        settlement => 
          settlement.userName.toLowerCase().includes(query)
      );
    }
    
    if (filterStatus && filterStatus !== 'all') {
      filtered = filtered.filter(settlement => settlement.status === filterStatus);
    }
    
    if (filterType && filterType !== 'all') {
      filtered = filtered.filter(settlement => settlement.userType === filterType);
    }
    
    filtered = filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'totalCommission':
          comparison = a.totalCommission - b.totalCommission;
          break;
        case 'periodStart':
          comparison = new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime();
          break;
        default:
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    setFilteredSettlements(filtered);
  }, [settlements, searchQuery, filterStatus, filterType, sortBy, sortOrder]);
  
  // 페이지네이션 처리 (트랜잭션)
  const totalTransactionPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );
  
  // 페이지네이션 처리 (정산 보고서)
  const totalSettlementPages = Math.ceil(filteredSettlements.length / itemsPerPage);
  const paginatedSettlements = filteredSettlements.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );
  
  // 정책 상세 보기
  const handleViewPolicy = (policy: CommissionPolicy) => {
    setSelectedPolicy(policy);
    setModalMode('view');
    setShowPolicyModal(true);
  };
  
  // 정책 편집
  const handleEditPolicy = (policy: CommissionPolicy) => {
    setSelectedPolicy(policy);
    setModalMode('edit');
    setShowPolicyModal(true);
  };
  
  // 새 정책 추가
  const handleAddPolicy = () => {
    setSelectedPolicy(null);
    setModalMode('add');
    setShowPolicyModal(true);
  };
  
  // 정책 상태 변경
  const handleTogglePolicyStatus = (policyId: number) => {
    setPolicies(prev => prev.map(policy => 
      policy.id === policyId 
        ? { ...policy, status: policy.status === 'active' ? 'inactive' : 'active' } 
        : policy
    ));
    
    toast({
      title: '정책 상태 변경',
      description: '커미션 정책 상태가 변경되었습니다.',
    });
    
    if (selectedPolicy && selectedPolicy.id === policyId) {
      setSelectedPolicy({ 
        ...selectedPolicy, 
        status: selectedPolicy.status === 'active' ? 'inactive' : 'active' 
      });
    }
  };
  
  // 정책 삭제
  const handleDeletePolicy = (policyId: number) => {
    if (window.confirm('정말로 이 커미션 정책을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      setPolicies(prev => prev.filter(policy => policy.id !== policyId));
      
      toast({
        title: '정책 삭제',
        description: '커미션 정책이 성공적으로 삭제되었습니다.',
      });
      
      if (showPolicyModal && selectedPolicy && selectedPolicy.id === policyId) {
        setShowPolicyModal(false);
      }
    }
  };
  
  // 정산 보고서 상세 보기
  const handleViewSettlement = (settlement: SettlementReport) => {
    setSelectedSettlement(settlement);
    setShowSettlementModal(true);
  };
  
  // 정산 처리
  const handleProcessSettlement = (settlementId: number) => {
    setSettlements(prev => prev.map(settlement => 
      settlement.id === settlementId 
        ? { 
            ...settlement, 
            status: 'processed',
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
          } 
        : settlement
    ));
    
    toast({
      title: '정산 처리',
      description: '정산 보고서가 처리 완료 상태로 변경되었습니다.',
    });
    
    if (selectedSettlement && selectedSettlement.id === settlementId) {
      setSelectedSettlement({ 
        ...selectedSettlement, 
        status: 'processed',
        updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
      } as SettlementReport);
    }
  };
  
  // 지급 처리
  const handlePaySettlement = (settlementId: number) => {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    setSettlements(prev => prev.map(settlement => 
      settlement.id === settlementId 
        ? { 
            ...settlement, 
            status: 'paid',
            paidAt: now,
            updatedAt: now
          } 
        : settlement
    ));
    
    toast({
      title: '지급 완료',
      description: '정산금 지급이 완료되었습니다.',
    });
    
    if (selectedSettlement && selectedSettlement.id === settlementId) {
      setSelectedSettlement({ 
        ...selectedSettlement, 
        status: 'paid',
        paidAt: now,
        updatedAt: now
      } as SettlementReport);
    }
  };
  
  // 데이터 새로고침
  const handleRefresh = () => {
    setIsLoading(true);
    
    // 실제 구현 시 API 호출로 대체
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: '새로고침 완료',
        description: '커미션 데이터가 업데이트되었습니다.',
      });
    }, 1000);
  };
  
  // 정산 처리 일괄 진행
  const handleProcessAllPending = () => {
    if (window.confirm('모든 대기 중인 정산을 처리하시겠습니까?')) {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      
      setSettlements(prev => prev.map(settlement => 
        settlement.status === 'pending'
          ? { 
              ...settlement, 
              status: 'processed',
              updatedAt: now
            } 
          : settlement
      ));
      
      toast({
        title: '일괄 처리 완료',
        description: '모든 대기 중인 정산이 처리 완료되었습니다.',
      });
    }
  };
  
  // 커미션 지급 보고서 다운로드
  const handleDownloadReport = () => {
    toast({
      title: '보고서 다운로드',
      description: '커미션 보고서가 다운로드됩니다.',
    });
    
    // 실제 구현 시 파일 다운로드 로직 추가
  };
  
  // 상태별 배지 색상 (정책)
  const getPolicyStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success">활성화됨</Badge>;
      case 'inactive':
        return <Badge variant="outline" className="text-gray-500">비활성화됨</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  // 상태별 배지 색상 (트랜잭션)
  const getTransactionStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-warning">미정산</Badge>;
      case 'paid':
        return <Badge className="bg-success">지급 완료</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-gray-500">취소됨</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  // 상태별 배지 색상 (정산)
  const getSettlementStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-warning">정산 대기</Badge>;
      case 'processed':
        return <Badge className="bg-primary">처리 완료</Badge>;
      case 'paid':
        return <Badge className="bg-success">지급 완료</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  // 추천인 유형 배지
  const getUserTypeBadge = (type: string) => {
    switch (type) {
      case 'trainer':
        return <Badge variant="outline" className="border-primary/50 text-primary">훈련사</Badge>;
      case 'institute':
        return <Badge variant="outline" className="border-primary/50 text-primary">기관</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">커미션 설정</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
          <Button variant="outline" onClick={handleDownloadReport}>
            <Download className="mr-2 h-4 w-4" />
            보고서 다운로드
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="policies">
              <Percent className="h-4 w-4 mr-2" />
              커미션 정책
            </TabsTrigger>
            <TabsTrigger value="transactions">
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              트랜잭션
            </TabsTrigger>
            <TabsTrigger value="settlements">
              <BadgeDollarSign className="h-4 w-4 mr-2" />
              정산 관리
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              커미션 분석
            </TabsTrigger>
            <TabsTrigger value="curriculum-revenue">
              <GraduationCap className="h-4 w-4 mr-2" />
              커리큘럼 수익
            </TabsTrigger>
          </TabsList>
        </div>
        
        {/* 커미션 정책 탭 */}
        <TabsContent value="policies">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-xl font-semibold">현재 커미션 정책</div>
              <Button onClick={handleAddPolicy}>
                <PlusCircle className="h-4 w-4 mr-2" />
                새 정책 추가
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isLoading ? (
                <div className="col-span-2">
                  <PageSkeleton header={false} variant="grid" count={4} className="p-0" />
                </div>
              ) : policies.length > 0 ? (
                policies.map(policy => (
                  <Card key={policy.id} className={policy.status === 'inactive' ? 'opacity-70' : ''}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{policy.name}</CardTitle>
                        {getPolicyStatusBadge(policy.status)}
                      </div>
                      <CardDescription>{policy.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">적용 대상</span>
                          <span>{getUserTypeBadge(policy.type)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">기본 수수료율</span>
                          <span className="font-medium">{policy.baseRate}%</span>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="text-sm font-medium">등급별 수수료</div>
                          <div className="space-y-1">
                            {policy.tiers.map(tier => (
                              <div key={tier.id} className="flex justify-between text-sm">
                                <span>
                                  {tier.name} 
                                  <span className="text-xs text-muted-foreground ml-1">
                                    (₩{tier.minSales.toLocaleString()} 이상)
                                  </span>
                                </span>
                                <span className="font-medium">{tier.rate}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2">
                      <div className="flex space-x-2 w-full">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleViewPolicy(policy)}
                        >
                          상세 보기
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditPolicy(policy)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              정책 편집
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleTogglePolicyStatus(policy.id)}>
                              {policy.status === 'active' ? (
                                <>
                                  <Check className="h-4 w-4 mr-2 text-gray-500" />
                                  비활성화
                                </>
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-2 text-success" />
                                  활성화
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeletePolicy(policy.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="col-span-2 text-center py-10 text-muted-foreground">
                  등록된 커미션 정책이 없습니다
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        
        {/* 트랜잭션 탭 */}
        <TabsContent value="transactions">
          <div className="space-y-4">
            <div className="flex space-x-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="사용자명, 주문번호, 상품명 검색..."
                  className="pl-8 h-9 md:w-[300px] w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Select value={filterStatus || 'all'} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 상태</SelectItem>
                  <SelectItem value="pending">미정산</SelectItem>
                  <SelectItem value="paid">지급 완료</SelectItem>
                  <SelectItem value="cancelled">취소됨</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterType || 'all'} onValueChange={setFilterType}>
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="유형" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 유형</SelectItem>
                  <SelectItem value="trainer">훈련사</SelectItem>
                  <SelectItem value="institute">기관</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>추천인</TableHead>
                      <TableHead>주문번호</TableHead>
                      <TableHead>상품</TableHead>
                      <TableHead>주문 금액</TableHead>
                      <TableHead>수수료</TableHead>
                      <TableHead>수수료율</TableHead>
                      <TableHead>발생일</TableHead>
                      <TableHead>상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="p-0">
                          <SkeletonTable rows={6} columns={8} showHeader={false} className="border-0 rounded-none" />
                        </TableCell>
                      </TableRow>
                    ) : paginatedTransactions.length > 0 ? (
                      paginatedTransactions.map(transaction => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={transaction.userAvatar} alt={transaction.userName} />
                                <AvatarFallback>{transaction.userName.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div>{transaction.userName}</div>
                                <div className="flex items-center space-x-1">
                                  {getUserTypeBadge(transaction.userType)}
                                  <span className="text-xs text-muted-foreground">{transaction.referralCode}</span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{transaction.orderNumber}</div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[180px] truncate" title={transaction.productName}>
                              {transaction.productName}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{transaction.orderAmount.toLocaleString()}원</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{transaction.commissionAmount.toLocaleString()}원</div>
                          </TableCell>
                          <TableCell>
                            <div>{transaction.commissionRate}%</div>
                          </TableCell>
                          <TableCell>
                            <div className="whitespace-nowrap">
                              {transaction.createdAt.split(' ')[0]}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getTransactionStatusBadge(transaction.status)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10">
                          <div className="text-muted-foreground">검색 결과가 없습니다</div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
              {!isLoading && totalTransactionPages > 1 && (
                <CardFooter className="flex justify-between py-4">
                  <div className="text-sm text-muted-foreground">
                    총 {filteredTransactions.length}개 중 {(currentPage - 1) * itemsPerPage + 1}-
                    {Math.min(currentPage * itemsPerPage, filteredTransactions.length)}개 표시
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(5, totalTransactionPages) }, (_, i) => {
                      const pageNum = currentPage > 3 ? currentPage - 3 + i + 1 : i + 1;
                      if (pageNum <= totalTransactionPages) {
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
                      }
                      return null;
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalTransactionPages))}
                      disabled={currentPage === totalTransactionPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>
          </div>
        </TabsContent>
        
        {/* 정산 관리 탭 */}
        <TabsContent value="settlements">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="추천인 검색..."
                    className="pl-8 h-9 md:w-[300px] w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <Select value={filterStatus || 'all'} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px] h-9">
                    <SelectValue placeholder="상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 상태</SelectItem>
                    <SelectItem value="pending">정산 대기</SelectItem>
                    <SelectItem value="processed">처리 완료</SelectItem>
                    <SelectItem value="paid">지급 완료</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterType || 'all'} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[150px] h-9">
                    <SelectValue placeholder="유형" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 유형</SelectItem>
                    <SelectItem value="trainer">훈련사</SelectItem>
                    <SelectItem value="institute">기관</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button onClick={handleProcessAllPending} disabled={!settlements.some(s => s.status === 'pending')}>
                <BadgeDollarSign className="h-4 w-4 mr-2" />
                대기 정산 일괄 처리
              </Button>
            </div>
            
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>추천인</TableHead>
                      <TableHead>정산 기간</TableHead>
                      <TableHead>트랜잭션 수</TableHead>
                      <TableHead>정산 금액</TableHead>
                      <TableHead>생성일</TableHead>
                      <TableHead>지급일</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="p-0">
                          <SkeletonTable rows={6} columns={8} showHeader={false} className="border-0 rounded-none" />
                        </TableCell>
                      </TableRow>
                    ) : paginatedSettlements.length > 0 ? (
                      paginatedSettlements.map(settlement => (
                        <TableRow key={settlement.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={settlement.userAvatar} alt={settlement.userName} />
                                <AvatarFallback>{settlement.userName.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div>{settlement.userName}</div>
                                <div>{getUserTypeBadge(settlement.userType)}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="whitespace-nowrap">
                              {settlement.periodStart} ~ {settlement.periodEnd}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>{settlement.transactionCount}건</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{settlement.totalCommission.toLocaleString()}원</div>
                          </TableCell>
                          <TableCell>
                            <div className="whitespace-nowrap">
                              {settlement.createdAt.split(' ')[0]}
                            </div>
                          </TableCell>
                          <TableCell>
                            {settlement.paidAt ? (
                              <div className="whitespace-nowrap">
                                {settlement.paidAt.split(' ')[0]}
                              </div>
                            ) : (
                              <div className="text-muted-foreground text-sm">-</div>
                            )}
                          </TableCell>
                          <TableCell>
                            {getSettlementStatusBadge(settlement.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end space-x-1">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleViewSettlement(settlement)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              
                              {settlement.status === 'pending' && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleProcessSettlement(settlement.id)}
                                >
                                  <Check className="h-4 w-4 text-primary" />
                                </Button>
                              )}
                              
                              {settlement.status === 'processed' && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handlePaySettlement(settlement.id)}
                                >
                                  <CreditCard className="h-4 w-4 text-success" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10">
                          <div className="text-muted-foreground">검색 결과가 없습니다</div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
              {!isLoading && totalSettlementPages > 1 && (
                <CardFooter className="flex justify-between py-4">
                  <div className="text-sm text-muted-foreground">
                    총 {filteredSettlements.length}개 중 {(currentPage - 1) * itemsPerPage + 1}-
                    {Math.min(currentPage * itemsPerPage, filteredSettlements.length)}개 표시
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(5, totalSettlementPages) }, (_, i) => {
                      const pageNum = currentPage > 3 ? currentPage - 3 + i + 1 : i + 1;
                      if (pageNum <= totalSettlementPages) {
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
                      }
                      return null;
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalSettlementPages))}
                      disabled={currentPage === totalSettlementPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>
          </div>
        </TabsContent>
        
        {/* 커미션 분석 탭 */}
        <TabsContent value="analytics">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <div className="text-muted-foreground text-sm">총 커미션 지급액</div>
                    <div className="text-3xl font-bold">₩1,283,500</div>
                    <div className="text-sm text-success flex items-center">
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.14645 2.14645C7.34171 1.95118 7.65829 1.95118 7.85355 2.14645L11.8536 6.14645C12.0488 6.34171 12.0488 6.65829 11.8536 6.85355C11.6583 7.04882 11.3417 7.04882 11.1464 6.85355L8 3.70711V12.5C8 12.7761 7.77614 13 7.5 13C7.22386 13 7 12.7761 7 12.5V3.70711L3.85355 6.85355C3.65829 7.04882 3.34171 7.04882 3.14645 6.85355C2.95118 6.65829 2.95118 6.34171 3.14645 6.14645L7.14645 2.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                      </svg>
                      <span className="ml-1">15.8% 증가</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <div className="text-muted-foreground text-sm">총 트랜잭션 수</div>
                    <div className="text-3xl font-bold">245</div>
                    <div className="text-sm text-success flex items-center">
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.14645 2.14645C7.34171 1.95118 7.65829 1.95118 7.85355 2.14645L11.8536 6.14645C12.0488 6.34171 12.0488 6.65829 11.8536 6.85355C11.6583 7.04882 11.3417 7.04882 11.1464 6.85355L8 3.70711V12.5C8 12.7761 7.77614 13 7.5 13C7.22386 13 7 12.7761 7 12.5V3.70711L3.85355 6.85355C3.65829 7.04882 3.34171 7.04882 3.14645 6.85355C2.95118 6.65829 2.95118 6.34171 3.14645 6.14645L7.14645 2.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                      </svg>
                      <span className="ml-1">12.3% 증가</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <div className="text-muted-foreground text-sm">평균 커미션율</div>
                    <div className="text-3xl font-bold">11.2%</div>
                    <div className="text-sm text-success flex items-center">
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.14645 2.14645C7.34171 1.95118 7.65829 1.95118 7.85355 2.14645L11.8536 6.14645C12.0488 6.34171 12.0488 6.65829 11.8536 6.85355C11.6583 7.04882 11.3417 7.04882 11.1464 6.85355L8 3.70711V12.5C8 12.7761 7.77614 13 7.5 13C7.22386 13 7 12.7761 7 12.5V3.70711L3.85355 6.85355C3.65829 7.04882 3.34171 7.04882 3.14645 6.85355C2.95118 6.65829 2.95118 6.34171 3.14645 6.14645L7.14645 2.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                      </svg>
                      <span className="ml-1">0.8% 증가</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <div className="text-muted-foreground text-sm">이번 달 정산 예정액</div>
                    <div className="text-3xl font-bold">₩258,900</div>
                    <div className="text-sm text-destructive flex items-center">
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.14645 12.8536C7.34171 13.0488 7.65829 13.0488 7.85355 12.8536L11.8536 8.85355C12.0488 8.65829 12.0488 8.34171 11.8536 8.14645C11.6583 7.95118 11.3417 7.95118 11.1464 8.14645L8 11.2929V2.5C8 2.22386 7.77614 2 7.5 2C7.22386 2 7 2.22386 7 2.5V11.2929L3.85355 8.14645C3.65829 7.95118 3.34171 7.95118 3.14645 8.14645C2.95118 8.34171 2.95118 8.65829 3.14645 8.85355L7.14645 12.8536Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                      </svg>
                      <span className="ml-1">5.2% 감소</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>추천인 유형별 커미션</CardTitle>
                  <CardDescription>훈련사 vs 기관 커미션 배분</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                      <p>차트 데이터 로딩 중...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>월별 커미션 추이</CardTitle>
                  <CardDescription>지난 6개월간 커미션 트랜드</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                      <p>차트 데이터 로딩 중...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>수익성 높은 추천인</CardTitle>
                <CardDescription>가장 많은 수수료를 발생시킨 상위 추천인</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>순위</TableHead>
                      <TableHead>이름</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>트랜잭션 수</TableHead>
                      <TableHead>총 판매액</TableHead>
                      <TableHead>평균 커미션율</TableHead>
                      <TableHead>총 커미션</TableHead>
                      <TableHead>최근 정산일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">1</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>박</AvatarFallback>
                          </Avatar>
                          <div>박훈련</div>
                        </div>
                      </TableCell>
                      <TableCell>{getUserTypeBadge('trainer')}</TableCell>
                      <TableCell>62</TableCell>
                      <TableCell>₩4,523,000</TableCell>
                      <TableCell>12.5%</TableCell>
                      <TableCell className="font-medium">₩565,375</TableCell>
                      <TableCell>2024-05-03</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">2</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>알</AvatarFallback>
                          </Avatar>
                          <div>알파 트레이닝 센터</div>
                        </div>
                      </TableCell>
                      <TableCell>{getUserTypeBadge('institute')}</TableCell>
                      <TableCell>48</TableCell>
                      <TableCell>₩3,850,000</TableCell>
                      <TableCell>10.0%</TableCell>
                      <TableCell className="font-medium">₩385,000</TableCell>
                      <TableCell>2024-05-03</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">3</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>이</AvatarFallback>
                          </Avatar>
                          <div>이하은</div>
                        </div>
                      </TableCell>
                      <TableCell>{getUserTypeBadge('trainer')}</TableCell>
                      <TableCell>45</TableCell>
                      <TableCell>₩2,785,000</TableCell>
                      <TableCell>11.8%</TableCell>
                      <TableCell className="font-medium">₩328,630</TableCell>
                      <TableCell>2024-05-03</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 커리큘럼 수익 탭 */}
        <TabsContent value="curriculum-revenue">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold">커리큘럼 수익 관리</h3>
                <p className="text-muted-foreground">등록된 커리큘럼의 수익 현황을 확인하고 관리합니다.</p>
              </div>
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                새로고침
              </Button>
            </div>

            {/* 수익 요약 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">총 수익</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₩{curriculumRevenues.reduce((sum, curr) => sum + curr.totalRevenue, 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    전체 커리큘럼 수익 합계
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">훈련사 수익</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    ₩{curriculumRevenues.reduce((sum, curr) => sum + curr.trainerRevenue, 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    훈련사 총 수익금
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">플랫폼 수익</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">
                    ₩{curriculumRevenues.reduce((sum, curr) => sum + curr.platformRevenue, 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    플랫폼 총 수익금
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 커리큘럼 수익 테이블 */}
            <Card>
              <CardHeader>
                <CardTitle>커리큘럼별 수익 현황</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>커리큘럼</TableHead>
                      <TableHead>훈련사</TableHead>
                      <TableHead>카테고리</TableHead>
                      <TableHead>가격</TableHead>
                      <TableHead>수강생 수</TableHead>
                      <TableHead>총 수익</TableHead>
                      <TableHead>수익 분배</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {curriculumRevenues.map((curriculum) => (
                      <TableRow key={curriculum.id}>
                        <TableCell>
                          <div className="font-medium">{curriculum.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {curriculum.lastSaleDate && 
                              `최근 판매: ${curriculum.lastSaleDate.toLocaleDateString()}`
                            }
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{curriculum.trainerName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{curriculum.trainerName}</div>
                              <div className="text-sm text-muted-foreground">
                                {curriculum.trainerEmail}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{curriculum.category}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          ₩{curriculum.price.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <div className="font-medium">{curriculum.enrollmentCount}명</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            ₩{curriculum.totalRevenue.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>훈련사:</span>
                              <span className="font-medium">{curriculum.revenueShare.trainerShare}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>플랫폼:</span>
                              <span className="font-medium">{curriculum.revenueShare.platformShare}%</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={curriculum.status === 'published' ? 'default' : 'secondary'}>
                            {curriculum.status === 'published' ? '운영중' : '준비중'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* 정책 상세/편집 모달 */}
      <Dialog open={showPolicyModal} onOpenChange={setShowPolicyModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {modalMode === 'view' ? '커미션 정책 상세' : modalMode === 'edit' ? '정책 편집' : '새 정책 추가'}
            </DialogTitle>
            <DialogDescription>
              {modalMode === 'view'
                ? selectedPolicy ? `${selectedPolicy.name} 정책의 상세 정보입니다.` : ''
                : modalMode === 'edit'
                ? '정책 정보를 수정합니다.'
                : '새로운 커미션 정책을 추가합니다.'}
            </DialogDescription>
          </DialogHeader>
          
          {(modalMode === 'view' || modalMode === 'edit') && selectedPolicy && (
            <div className="space-y-6">
              {modalMode === 'view' ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">{selectedPolicy.name}</h3>
                    {getPolicyStatusBadge(selectedPolicy.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedPolicy.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">적용 대상</div>
                      <div>{getUserTypeBadge(selectedPolicy.type)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">기본 수수료율</div>
                      <div className="font-medium">{selectedPolicy.baseRate}%</div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="text-base font-medium mb-3">등급별 수수료 설정</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>등급명</TableHead>
                          <TableHead>최소 매출액</TableHead>
                          <TableHead>수수료율</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPolicy.tiers.map(tier => (
                          <TableRow key={tier.id}>
                            <TableCell>{tier.name}</TableCell>
                            <TableCell>₩{tier.minSales.toLocaleString()}</TableCell>
                            <TableCell className="font-medium">{tier.rate}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className="text-xs text-muted-foreground pt-4">
                    <div>생성일: {selectedPolicy.createdAt}</div>
                    <div>최종 업데이트: {selectedPolicy.updatedAt}</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">정책명</Label>
                    <Input id="name" defaultValue={selectedPolicy.name} />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">설명</Label>
                    <Textarea id="description" defaultValue={selectedPolicy.description} rows={3} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">적용 대상</Label>
                      <Select defaultValue={selectedPolicy.type}>
                        <SelectTrigger>
                          <SelectValue placeholder="대상 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trainer">훈련사</SelectItem>
                          <SelectItem value="institute">교육 기관</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="baseRate">기본 수수료율 (%)</Label>
                      <Input 
                        id="baseRate" 
                        type="number" 
                        defaultValue={selectedPolicy.baseRate} 
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-base font-medium">등급별 수수료 설정</h4>
                      <Button variant="outline" size="sm">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        등급 추가
                      </Button>
                    </div>
                    
                    {selectedPolicy.tiers.map((tier, index) => (
                      <div key={tier.id} className="bg-secondary/50 p-3 rounded-md mb-3">
                        <div className="flex justify-between items-center mb-2">
                          <div className="font-medium">등급 {index + 1}</div>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label htmlFor={`tierName-${tier.id}`}>등급명</Label>
                            <Input id={`tierName-${tier.id}`} defaultValue={tier.name} />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`tierMinSales-${tier.id}`}>최소 매출액</Label>
                            <Input 
                              id={`tierMinSales-${tier.id}`} 
                              type="number" 
                              defaultValue={tier.minSales} 
                              min="0"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`tierRate-${tier.id}`}>수수료율 (%)</Label>
                            <Input 
                              id={`tierRate-${tier.id}`} 
                              type="number" 
                              defaultValue={tier.rate} 
                              min="0"
                              max="100"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="status" className="flex-1 cursor-pointer">
                      <div>정책 활성화</div>
                      <p className="text-sm font-normal text-muted-foreground">
                        이 정책을 즉시 적용합니다.
                      </p>
                    </Label>
                    <Switch 
                      id="status" 
                      defaultChecked={selectedPolicy.status === 'active'}
                    />
                  </div>
                </div>
              )}
              
              <DialogFooter>
                {modalMode === 'view' ? (
                  <div className="flex space-x-2 w-full">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setModalMode('edit')}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      정책 편집
                    </Button>
                    <Button
                      variant={selectedPolicy.status === 'active' ? 'outline' : 'default'}
                      className="flex-1"
                      onClick={() => handleTogglePolicyStatus(selectedPolicy.id)}
                    >
                      {selectedPolicy.status === 'active' ? (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          비활성화
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          활성화
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => modalMode === 'edit' ? setModalMode('view') : setShowPolicyModal(false)}>
                      취소
                    </Button>
                    <Button>
                      <Save className="h-4 w-4 mr-2" />
                      저장
                    </Button>
                  </>
                )}
              </DialogFooter>
            </div>
          )}
          
          {modalMode === 'add' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">정책명</Label>
                <Input id="name" placeholder="정책명 입력" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">설명</Label>
                <Textarea id="description" placeholder="정책에 대한 설명 입력" rows={3} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">적용 대상</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="대상 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trainer">훈련사</SelectItem>
                      <SelectItem value="institute">교육 기관</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="baseRate">기본 수수료율 (%)</Label>
                  <Input 
                    id="baseRate" 
                    type="number" 
                    placeholder="10" 
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              
              <Separator />
              
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-base font-medium">등급별 수수료 설정</h4>
                  <Button variant="outline" size="sm">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    등급 추가
                  </Button>
                </div>
                
                <div className="bg-secondary/50 p-3 rounded-md mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium">등급 1</div>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="tierName-1">등급명</Label>
                      <Input id="tierName-1" placeholder="브론즈" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="tierMinSales-1">최소 매출액</Label>
                      <Input 
                        id="tierMinSales-1" 
                        type="number" 
                        placeholder="0" 
                        min="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="tierRate-1">수수료율 (%)</Label>
                      <Input 
                        id="tierRate-1" 
                        type="number" 
                        placeholder="10" 
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="status" className="flex-1 cursor-pointer">
                  <div>정책 활성화</div>
                  <p className="text-sm font-normal text-muted-foreground">
                    이 정책을 즉시 적용합니다.
                  </p>
                </Label>
                <Switch id="status" defaultChecked />
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPolicyModal(false)}>
                  취소
                </Button>
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  정책 추가
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* 정산 상세 모달 */}
      <Dialog open={showSettlementModal} onOpenChange={setShowSettlementModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>정산 상세 정보</DialogTitle>
            <DialogDescription>
              {selectedSettlement ? `${selectedSettlement.userName}의 ${selectedSettlement.periodStart} ~ ${selectedSettlement.periodEnd} 기간 정산 내역입니다.` : ''}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSettlement && (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedSettlement.userAvatar} alt={selectedSettlement.userName} />
                    <AvatarFallback>{selectedSettlement.userName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{selectedSettlement.userName}</div>
                    <div>{getUserTypeBadge(selectedSettlement.userType)}</div>
                  </div>
                </div>
                <div>
                  {getSettlementStatusBadge(selectedSettlement.status)}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">정산 정보</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary/50 p-3 rounded-md">
                    <div className="text-sm text-muted-foreground mb-1">정산 기간</div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                      <span>{selectedSettlement.periodStart}</span>
                      <span className="mx-1">~</span>
                      <span>{selectedSettlement.periodEnd}</span>
                    </div>
                  </div>
                  <div className="bg-secondary/50 p-3 rounded-md">
                    <div className="text-sm text-muted-foreground mb-1">트랜잭션 수</div>
                    <div className="flex items-center">
                      <ArrowRightLeft className="h-4 w-4 mr-1 text-muted-foreground" />
                      <span>{selectedSettlement.transactionCount}건</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-secondary/50 p-3 rounded-md">
                  <div className="text-sm text-muted-foreground mb-1">정산 금액</div>
                  <div className="flex items-center">
                    <BadgeDollarSign className="h-4 w-4 mr-1 text-success" />
                    <span className="text-xl font-bold">{selectedSettlement.totalCommission.toLocaleString()}원</span>
                  </div>
                  {selectedSettlement.status === 'paid' && selectedSettlement.paymentMethod && (
                    <div className="mt-2">
                      <div className="text-sm text-muted-foreground mb-1">결제 정보</div>
                      <div className="flex items-center">
                        <CreditCard className="h-4 w-4 mr-1 text-muted-foreground" />
                        <span>{selectedSettlement.paymentMethod}</span>
                      </div>
                      {selectedSettlement.bankInfo && (
                        <div className="text-sm mt-1">
                          {selectedSettlement.bankInfo}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">처리 정보</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">생성 일시</span>
                    <span>{selectedSettlement.createdAt}</span>
                  </div>
                  {selectedSettlement.status === 'paid' && selectedSettlement.paidAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">지급 일시</span>
                      <span>{selectedSettlement.paidAt}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <DialogFooter>
                {selectedSettlement.status === 'pending' && (
                  <Button
                    onClick={() => {
                      handleProcessSettlement(selectedSettlement.id);
                      setShowSettlementModal(false);
                    }}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    처리 완료로 변경
                  </Button>
                )}
                
                {selectedSettlement.status === 'processed' && (
                  <Button
                    onClick={() => {
                      handlePaySettlement(selectedSettlement.id);
                      setShowSettlementModal(false);
                    }}
                  >
                    <BadgeDollarSign className="h-4 w-4 mr-2" />
                    지급 완료로 변경
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSettlementModal(false);
                  }}
                >
                  닫기
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}