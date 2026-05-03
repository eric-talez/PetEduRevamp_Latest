import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "../../SimpleApp";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ShieldAlert, 
  FileText, 
  ClipboardCheck, 
  Link, 
  Calendar, 
  Percent,
  Tag,
  Building,
  UserRound
} from "lucide-react";

// 추천인 코드 타입 정의
interface ReferralCode {
  id: number;
  code: string;                 // 기관코드(INST) + 훈련사코드(TR)의 형태(예: INST001-TR001)
  institution: string;
  institutionId: number;
  institutionCode: string;      // 기관 고유 코드
  trainerName: string;          // 훈련사 이름
  trainerId: number;            // 훈련사 ID
  trainerCode: string;          // 훈련사 고유 코드
  description: string;
  discount: number;
  status: "pending" | "approved" | "rejected" | "expired";
  requestDate: string;
  approvalDate?: string;
  expiryDate?: string;
  usageCount: number;
  maxUsage?: number;
  createdBy: string;
  approvedBy?: string;
  profitShare: number;          // 수익 공유 비율(%)
}

// 제품 추천 타입 정의
interface ProductRecommendation {
  id: number;
  productName: string;
  category: string;
  brand: string;
  requestedBy: string;
  trainerId: number;
  status: "pending" | "meeting_scheduled" | "negotiating" | "approved" | "rejected";
  requestDate: string;
  description: string;
  meetingDate?: string;
  price?: number;
  quantity?: number;
  commission?: number;
  referralLink?: string;
  approvedBy?: string;
  approvalDate?: string;
}

// 더미 데이터 - 추천인 코드
const dummyReferralCodes: ReferralCode[] = [
  {
    id: 1,
    code: "HPT101-TR001",
    institution: "해피 펫 트레이닝 센터",
    institutionId: 101,
    institutionCode: "HPT101",
    trainerName: "김훈련사",
    trainerId: 1001,
    trainerCode: "TR001",
    description: "신규 고객 할인",
    discount: 10,
    status: "approved",
    requestDate: "2025-04-01",
    approvalDate: "2025-04-02",
    expiryDate: "2025-12-31",
    usageCount: 23,
    maxUsage: 100,
    createdBy: "김관리자",
    approvedBy: "시스템 관리자",
    profitShare: 70 // 70%는 훈련사에게, 30%는 기관에게
  },
  {
    id: 2,
    code: "PLA102-TR005",
    institution: "퍼피 러브 아카데미",
    institutionId: 102,
    institutionCode: "PLA102",
    trainerName: "이훈련사",
    trainerId: 1005,
    trainerCode: "TR005",
    description: "신규 강아지 전용 할인",
    discount: 15,
    status: "pending",
    requestDate: "2025-04-05",
    usageCount: 0,
    createdBy: "이매니저",
    profitShare: 60 // 60%는 훈련사에게, 40%는 기관에게
  },
  {
    id: 3,
    code: "HPT101-TR002",
    institution: "해피 펫 트레이닝 센터",
    institutionId: 101,
    institutionCode: "HPT101",
    trainerName: "박훈련사",
    trainerId: 1002,
    trainerCode: "TR002",
    description: "봄맞이 이벤트 할인",
    discount: 20,
    status: "rejected",
    requestDate: "2025-03-15",
    approvalDate: "2025-03-16",
    usageCount: 0,
    createdBy: "김관리자",
    approvedBy: "시스템 관리자",
    profitShare: 65 // 65%는 훈련사에게, 35%는 기관에게
  },
  {
    id: 4,
    code: "HPT101-TR001",
    institution: "해피 펫 트레이닝 센터",
    institutionId: 101,
    institutionCode: "HPT101",
    trainerName: "김훈련사",
    trainerId: 1001,
    trainerCode: "TR001",
    description: "여름 특별 할인",
    discount: 25,
    status: "approved",
    requestDate: "2025-05-15",
    approvalDate: "2025-05-16",
    expiryDate: "2025-08-31",
    usageCount: 5,
    maxUsage: 50,
    createdBy: "김관리자",
    approvedBy: "시스템 관리자",
    profitShare: 75 // 75%는 훈련사에게, 25%는 기관에게
  }
];

// 제품 추천 타입 수정
interface ProductRecommendation {
  id: number;
  productName: string;
  category: string;
  brand: string;
  requestedBy: string;
  trainerId: number;
  status: "pending" | "meeting_scheduled" | "negotiating" | "approved" | "rejected";
  requestDate: string;
  description: string;
  meetingDate?: string;
  price?: number;
  quantity?: number;
  commission?: number;
  estimatedProfit?: number;
  trainerShare?: number; // 훈련사 몫
  platformShare?: number; // 플랫폼 몫
  referralLink?: string;
  approvedBy?: string;
  approvalDate?: string;
  salesCount?: number; // 판매 횟수
  totalSales?: number; // 총 판매액
}

// 더미 데이터 - 제품 추천
const dummyProductRecommendations: ProductRecommendation[] = [
  {
    id: 1,
    productName: "프리미엄 강아지 사료",
    category: "사료",
    brand: "네이처스 초이스",
    requestedBy: "김트레이너",
    trainerId: 201,
    status: "approved",
    requestDate: "2025-03-10",
    description: "알러지가 있는 강아지도 먹을 수 있는 고품질 사료",
    meetingDate: "2025-03-15",
    price: 55000,
    quantity: 100,
    commission: 15,
    trainerShare: 10, // 훈련사가 가져가는 비율
    platformShare: 5, // 플랫폼이 가져가는 비율
    estimatedProfit: 825000, // 예상 수익 (55000 * 100 * 0.15)
    referralLink: "https://petshop.example.com/ref/TRAINER201",
    approvedBy: "시스템 관리자",
    approvalDate: "2025-03-20",
    salesCount: 32,
    totalSales: 1760000 // 판매된 금액 (55000 * 32)
  },
  {
    id: 2,
    productName: "행동 교정용 클리커",
    category: "훈련도구",
    brand: "펫 프로",
    requestedBy: "박트레이너",
    trainerId: 202,
    status: "meeting_scheduled",
    requestDate: "2025-04-01",
    description: "소음이 적고 효과적인 훈련용 클리커",
    meetingDate: "2025-04-15"
  },
  {
    id: 3,
    productName: "노즈워크 매트",
    category: "지능개발",
    brand: "스마트 펫",
    requestedBy: "이트레이너",
    trainerId: 203,
    status: "pending",
    requestDate: "2025-04-05",
    description: "스트레스 해소와 두뇌 발달에 도움이 되는 노즈워크 매트"
  },
  {
    id: 4,
    productName: "반려동물 자동 급식기",
    category: "생활용품",
    brand: "스마트 펫케어",
    requestedBy: "김트레이너",
    trainerId: 201,
    status: "negotiating",
    requestDate: "2025-03-25",
    description: "정해진 시간에 자동으로 사료를 제공하는 스마트 급식기",
    meetingDate: "2025-04-02",
    price: 78000,
    quantity: 50,
    commission: 18,
    trainerShare: 12,
    platformShare: 6,
    estimatedProfit: 702000 // 예상 수익 (78000 * 50 * 0.18)
  }
];

// 상태 배지 색상 결정 함수
function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "approved":
      return "success";
    case "pending":
      return "warning";
    case "rejected":
      return "destructive";
    case "expired":
      return "secondary";
    case "meeting_scheduled":
      return "info";
    case "negotiating":
      return "purple";
    default:
      return "outline";
  }
}

// 상태 표시 텍스트
function getStatusText(status: string) {
  switch (status) {
    case "approved":
      return "승인됨";
    case "pending":
      return "대기중";
    case "rejected":
      return "거부됨";
    case "expired":
      return "만료됨";
    case "meeting_scheduled":
      return "미팅 예정";
    case "negotiating":
      return "협상중";
    default:
      return status;
  }
}

export default function ReferralCodeManagement() {
  const auth = useAuth();
  // 임시 역할 처리 (호환성 문제)
  const userRole = auth.userRole || window.__peteduAuthState?.userRole || 'user';
  const isAdmin = userRole === "admin";
  const isInstituteAdmin = userRole === "institute-admin";
  const isTrainer = userRole === "trainer" || userRole === "pet-trainer";

  // 상태 관리
  const [activeTab, setActiveTab] = useState("referral-codes");
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>(dummyReferralCodes);
  const [productRecommendations, setProductRecommendations] = useState<ProductRecommendation[]>(dummyProductRecommendations);
  
  // 대화상자 상태
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [dialogMode, setDialogMode] = useState<"view" | "add" | "edit" | "approve">("view");

  // 대화상자 열기 함수
  const openReferralDialog = (mode: "view" | "add" | "edit" | "approve", item?: ReferralCode) => {
    setDialogMode(mode);
    if (item) setSelectedItem(item);
    setReferralDialogOpen(true);
  };

  const openProductDialog = (mode: "view" | "add" | "edit" | "approve", item?: ProductRecommendation) => {
    setDialogMode(mode);
    if (item) setSelectedItem(item);
    setProductDialogOpen(true);
  };

  const openDetailsDialog = (item: ReferralCode | ProductRecommendation) => {
    setSelectedItem(item);
    setDetailsDialogOpen(true);
  };

  // 필터링 함수
  const getFilteredReferralCodes = () => {
    if (isAdmin) {
      return referralCodes;
    } else if (isInstituteAdmin) {
      // 기관 관리자는 자신의 기관 코드만 볼 수 있음
      return referralCodes.filter(code => code.institutionId === 101); // 예시 기관 ID
    }
    return [];
  };

  const getFilteredProductRecommendations = () => {
    if (isAdmin) {
      return productRecommendations;
    } else if (isTrainer) {
      // 훈련사는 자신이 요청한 제품만 볼 수 있음
      return productRecommendations.filter(product => product.trainerId === 201); // 예시 훈련사 ID
    }
    return [];
  };

  // 접근 권한 확인
  const canManageReferralCodes = isAdmin || isInstituteAdmin;
  const canManageProductRecommendations = isAdmin || isTrainer;
  
  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">추천 관리</h1>
        <p className="text-gray-500 mt-1">추천인 코드 및 제품 추천 관리를 위한 페이지입니다.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="referral-codes">
            <ShieldAlert className="w-4 h-4 mr-2" />
            추천인 코드 관리
          </TabsTrigger>
          <TabsTrigger value="product-recommendations">
            <ClipboardCheck className="w-4 h-4 mr-2" />
            제품 추천 관리
          </TabsTrigger>
        </TabsList>

        {/* 추천인 코드 관리 탭 */}
        <TabsContent value="referral-codes" className="space-y-4">
          {canManageReferralCodes ? (
            <>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">추천인 코드</h2>
                  <p className="text-sm text-gray-500">
                    {isAdmin 
                      ? "모든 기관의 추천인 코드 승인 요청 및 관리" 
                      : "기관의 추천인 코드 발급 요청 및 관리"}
                  </p>
                </div>
                {isInstituteAdmin && (
                  <Button onClick={() => openReferralDialog("add")}>
                    새 추천인 코드 요청
                  </Button>
                )}
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>코드</TableHead>
                        <TableHead>기관</TableHead>
                        <TableHead>훈련사</TableHead>
                        <TableHead>할인율</TableHead>
                        <TableHead>수익공유</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>사용횟수</TableHead>
                        <TableHead>액션</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredReferralCodes().map((code) => (
                        <TableRow key={code.id}>
                          <TableCell className="font-medium">{code.code}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{code.institution}</span>
                              <span className="text-xs text-muted-foreground">{code.institutionCode}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{code.trainerName}</span>
                              <span className="text-xs text-muted-foreground">{code.trainerCode}</span>
                            </div>
                          </TableCell>
                          <TableCell>{code.discount}%</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <span className="font-medium text-blue-600">{code.profitShare}%</span>
                              <span className="text-xs text-muted-foreground ml-1">훈련사</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(code.status)}>
                              {getStatusText(code.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {code.usageCount}{code.maxUsage ? `/${code.maxUsage}` : ""}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline" onClick={() => openDetailsDialog(code)}>
                                상세
                              </Button>
                              {isAdmin && code.status === "pending" && (
                                <Button size="sm" onClick={() => openReferralDialog("approve", code)}>
                                  승인
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {getFilteredReferralCodes().length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4">
                            추천인 코드가 없습니다.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {isInstituteAdmin && (
                <Card className="p-4 bg-gray-50 dark:bg-gray-800 border-dashed">
                  <CardHeader className="p-2">
                    <CardTitle className="text-lg">추천인 코드 승인 절차</CardTitle>
                    <CardDescription>
                      추천인 코드는 다음 절차를 통해 승인됩니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-2">
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li>기관에서 추천인 코드 발급을 요청합니다.</li>
                      <li>시스템 관리자가 요청을 검토합니다.</li>
                      <li>관리자는 할인율, 사용 횟수 등을 확인 후 승인합니다.</li>
                      <li>승인된 코드는 즉시 사용 가능합니다.</li>
                      <li>코드 사용 현황은 실시간으로 모니터링됩니다.</li>
                    </ol>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="p-6">
              <CardHeader>
                <CardTitle>접근 권한 없음</CardTitle>
                <CardDescription>
                  추천인 코드 관리 기능은 기관 관리자 또는 시스템 관리자만 사용할 수 있습니다.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>

        {/* 제품 추천 관리 탭 */}
        <TabsContent value="product-recommendations" className="space-y-4">
          {canManageProductRecommendations ? (
            <>
              {isTrainer && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <Percent className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" /> 수익 현황
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {(264000).toLocaleString()}원
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        총 누적 수익
                      </p>
                      <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex justify-between">
                          <span>이번 달 수익</span>
                          <span className="font-medium">{(118000).toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span>지난 달 대비</span>
                          <span className="font-medium text-primary dark:text-primary">+23%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/20 dark:to-primary/30 border-primary/30 dark:border-primary/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <ClipboardCheck className="mr-2 h-5 w-5 text-primary dark:text-primary" /> 판매 현황
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-primary dark:text-primary">
                        32
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        총 판매 건수
                      </p>
                      <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex justify-between">
                          <span>이번 달 판매</span>
                          <span className="font-medium">12건</span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span>총 판매액</span>
                          <span className="font-medium">{(1760000).toLocaleString()}원</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <Calendar className="mr-2 h-5 w-5 text-amber-600 dark:text-amber-400" /> 추천 현황
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                        4
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        요청한 추천 상품
                      </p>
                      <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex justify-between">
                          <span>승인됨</span>
                          <span className="font-medium">1</span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span>진행중</span>
                          <span className="font-medium">2</span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span>대기중</span>
                          <span className="font-medium">1</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">제품 추천</h2>
                  <p className="text-sm text-gray-500">
                    {isAdmin 
                      ? "훈련사가 요청한 제품 추천 승인 및 관리" 
                      : "제품 추천 요청 및 수익 공유 관리"}
                  </p>
                </div>
                {isTrainer && (
                  <Button onClick={() => openProductDialog("add")}>
                    새 제품 추천 요청
                  </Button>
                )}
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>제품명</TableHead>
                        <TableHead>브랜드</TableHead>
                        <TableHead>카테고리</TableHead>
                        <TableHead>요청자</TableHead>
                        <TableHead>상태</TableHead>
                        {isAdmin ? (
                          <TableHead>수익 배분</TableHead>
                        ) : isTrainer ? (
                          <TableHead>내 수익률</TableHead>
                        ) : null}
                        <TableHead>요청일</TableHead>
                        <TableHead>액션</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredProductRecommendations().map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.productName}</TableCell>
                          <TableCell>{product.brand}</TableCell>
                          <TableCell>{product.category}</TableCell>
                          <TableCell>{product.requestedBy}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(product.status)}>
                              {getStatusText(product.status)}
                            </Badge>
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              {product.trainerShare && product.platformShare ? (
                                <div className="flex items-center space-x-1">
                                  <span className="text-green-600 dark:text-green-400">{product.trainerShare}%</span>
                                  <span className="text-gray-400">/</span>
                                  <span className="text-blue-600 dark:text-blue-400">{product.platformShare}%</span>
                                  <span className="text-xs text-gray-500 ml-1">(훈련사/플랫폼)</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">미설정</span>
                              )}
                            </TableCell>
                          )}
                          {isTrainer && (
                            <TableCell>
                              {product.trainerShare ? (
                                <div className="font-medium text-green-600 dark:text-green-400">
                                  {product.trainerShare}%
                                  {product.estimatedProfit && product.status === "approved" && (
                                    <span className="text-xs text-gray-500 block">
                                      예상: {Math.round(product.estimatedProfit * (product.trainerShare / 100)).toLocaleString()}원
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">미설정</span>
                              )}
                            </TableCell>
                          )}
                          <TableCell>{product.requestDate}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline" onClick={() => openDetailsDialog(product)}>
                                상세
                              </Button>
                              {isAdmin && ["pending", "meeting_scheduled", "negotiating"].includes(product.status) && (
                                <Button size="sm" onClick={() => openProductDialog("approve", product)}>
                                  진행
                                </Button>
                              )}
                              {product.status === "approved" && product.referralLink && (
                                <Button size="sm" variant="outline" className="text-blue-600 border-blue-300">
                                  <Link className="h-4 w-4 mr-1" />
                                  링크
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {getFilteredProductRecommendations().length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4">
                            제품 추천 요청이 없습니다.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {isTrainer && (
                <Card className="p-4 bg-gray-50 dark:bg-gray-800 border-dashed">
                  <CardHeader className="p-2">
                    <CardTitle className="text-lg">제품 추천 절차</CardTitle>
                    <CardDescription>
                      제품 추천은 다음 절차를 통해 진행됩니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-2">
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li>훈련사가 제품 추천을 요청합니다.</li>
                      <li>관리자가 요청을 검토하고 업체와 미팅을 주선합니다.</li>
                      <li>미팅 후 가격, 수량 등 세부 조건을 협상합니다.</li>
                      <li>협상이 완료되면 관리자가 최종 정보를 확인하고 입력합니다.</li>
                      <li>제품 추천 링크가 발행되며 훈련사는 이를 공유할 수 있습니다.</li>
                    </ol>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="p-6">
              <CardHeader>
                <CardTitle>접근 권한 없음</CardTitle>
                <CardDescription>
                  제품 추천 관리 기능은 훈련사 또는 시스템 관리자만 사용할 수 있습니다.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* 추천인 코드 대화상자 */}
      <Dialog open={referralDialogOpen} onOpenChange={setReferralDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "add" 
                ? "새 추천인 코드 요청" 
                : dialogMode === "edit" 
                ? "추천인 코드 수정" 
                : dialogMode === "approve" 
                ? "추천인 코드 승인" 
                : "추천인 코드 상세"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "add" 
                ? "새로운 추천인 코드 발급을 요청합니다." 
                : dialogMode === "approve" 
                ? "추천인 코드 요청을 검토하고 승인합니다."
                : "추천인 코드 정보를 확인합니다."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {dialogMode === "add" && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="institutionCode" className="text-right text-sm">기관 코드</label>
                  <Select defaultValue="HPT101">
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="기관 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HPT101">해피 펫 트레이닝 센터 (HPT101)</SelectItem>
                      <SelectItem value="PLA102">퍼피 러브 아카데미 (PLA102)</SelectItem>
                      <SelectItem value="PCT103">펫케어 트레이닝 (PCT103)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="trainerCode" className="text-right text-sm">훈련사 코드</label>
                  <Select defaultValue="TR001">
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="훈련사 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TR001">김훈련사 (TR001)</SelectItem>
                      <SelectItem value="TR002">박훈련사 (TR002)</SelectItem>
                      <SelectItem value="TR005">이훈련사 (TR005)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm">생성된 코드</label>
                  <div className="col-span-3 flex items-center space-x-2">
                    <Input
                      value="HPT101-TR001"
                      readOnly
                      className="font-medium text-blue-600"
                    />
                    <Button variant="outline" size="sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                      복사
                    </Button>
                  </div>
                </div>
              </>
            )}
            
            {(dialogMode === "view" || dialogMode === "approve" || dialogMode === "edit") && (
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="code" className="text-right text-sm">코드</label>
                <Input
                  id="code"
                  className="col-span-3"
                  placeholder="추천인 코드 입력"
                  defaultValue={selectedItem?.code || ""}
                  readOnly={dialogMode === "view" || dialogMode === "approve"}
                />
              </div>
            )}
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="description" className="text-right text-sm">설명</label>
              <Input
                id="description"
                className="col-span-3"
                placeholder="코드 설명"
                defaultValue={selectedItem?.description || ""}
                readOnly={dialogMode === "view" || dialogMode === "approve"}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="discount" className="text-right text-sm">할인율 (%)</label>
              <Input
                id="discount"
                type="number"
                min="0"
                max="100"
                className="col-span-3"
                placeholder="할인율"
                defaultValue={selectedItem?.discount || "10"}
                readOnly={dialogMode === "view" || dialogMode === "approve"}
              />
            </div>
            
            {dialogMode === "add" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="profitShare" className="text-right text-sm">수익 공유 (%)</label>
                <div className="col-span-3 flex items-center space-x-2">
                  <Input
                    id="profitShare"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue="70"
                    className="flex-1"
                    placeholder="훈련사 수익 비율"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">훈련사 수익률</span>
                </div>
              </div>
            )}
            {(dialogMode === "approve" || dialogMode === "view") && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="institution" className="text-right text-sm">기관</label>
                  <Input
                    id="institution"
                    className="col-span-3"
                    defaultValue={selectedItem?.institution || ""}
                    readOnly
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="requestDate" className="text-right text-sm">요청일</label>
                  <Input
                    id="requestDate"
                    className="col-span-3"
                    defaultValue={selectedItem?.requestDate || ""}
                    readOnly
                  />
                </div>
              </>
            )}
            {dialogMode === "approve" && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="status" className="text-right text-sm">상태</label>
                  <Select defaultValue={selectedItem?.status || "pending"}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="상태 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">승인</SelectItem>
                      <SelectItem value="rejected">거부</SelectItem>
                      <SelectItem value="pending">대기중</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="trainerDetails" className="text-right text-sm">훈련사 정보</label>
                  <div className="col-span-3 bg-muted p-2 rounded-md">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{selectedItem?.trainerName}</span>
                      <span className="text-xs text-muted-foreground">({selectedItem?.trainerCode})</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="profitShare" className="text-right text-sm">수익 공유 (%)</label>
                  <div className="col-span-3 flex items-center space-x-2">
                    <Input
                      id="profitShare"
                      type="number"
                      min="0"
                      max="100"
                      className="flex-1"
                      defaultValue={selectedItem?.profitShare || "70"}
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">훈련사 수익률</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="expiryDate" className="text-right text-sm">만료일</label>
                  <Input
                    id="expiryDate"
                    type="date"
                    className="col-span-3"
                    defaultValue={selectedItem?.expiryDate || ""}
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="maxUsage" className="text-right text-sm">최대 사용 횟수</label>
                  <Input
                    id="maxUsage"
                    type="number"
                    min="1"
                    className="col-span-3"
                    placeholder="제한 없음"
                    defaultValue={selectedItem?.maxUsage || ""}
                  />
                </div>
                
                <div className="mt-2 bg-blue-50 dark:bg-blue-950 p-3 rounded-md text-sm">
                  <p className="text-blue-600 dark:text-blue-400 font-medium mb-1">수익 배분 정보</p>
                  <div className="flex items-center space-x-2">
                    <Percent className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                    <span>훈련사 <span className="font-medium">{selectedItem?.profitShare || 70}%</span></span>
                    <span className="text-gray-400">/</span>
                    <span>기관 <span className="font-medium">{100 - (selectedItem?.profitShare || 70)}%</span></span>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            {dialogMode === "add" && (
              <Button type="submit" onClick={() => setReferralDialogOpen(false)}>
                요청 제출
              </Button>
            )}
            {dialogMode === "approve" && (
              <Button type="submit" onClick={() => setReferralDialogOpen(false)}>
                승인 완료
              </Button>
            )}
            {dialogMode === "view" && (
              <Button variant="outline" onClick={() => setReferralDialogOpen(false)}>
                닫기
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 제품 추천 대화상자 */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "add" 
                ? "새 제품 추천 요청" 
                : dialogMode === "edit" 
                ? "제품 추천 수정" 
                : dialogMode === "approve" 
                ? "제품 추천 진행" 
                : "제품 추천 상세"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "add" 
                ? "새로운 제품 추천을 요청합니다." 
                : dialogMode === "approve" 
                ? "제품 추천 요청의 진행 상태를 업데이트합니다."
                : "제품 추천 정보를 확인합니다."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="productName" className="text-right text-sm">제품명</label>
              <Input
                id="productName"
                className="col-span-3"
                placeholder="제품명 입력"
                defaultValue={selectedItem?.productName || ""}
                readOnly={dialogMode === "view" || dialogMode === "approve"}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="brand" className="text-right text-sm">브랜드</label>
              <Input
                id="brand"
                className="col-span-3"
                placeholder="브랜드명"
                defaultValue={selectedItem?.brand || ""}
                readOnly={dialogMode === "view" || dialogMode === "approve"}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="category" className="text-right text-sm">카테고리</label>
              <Input
                id="category"
                className="col-span-3"
                placeholder="카테고리"
                defaultValue={selectedItem?.category || ""}
                readOnly={dialogMode === "view" || dialogMode === "approve"}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="description" className="text-right text-sm">설명</label>
              <Input
                id="description"
                className="col-span-3"
                placeholder="제품 설명"
                defaultValue={selectedItem?.description || ""}
                readOnly={dialogMode === "view" || dialogMode === "approve"}
              />
            </div>
            {(dialogMode === "approve" || dialogMode === "view") && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="requestedBy" className="text-right text-sm">요청자</label>
                  <Input
                    id="requestedBy"
                    className="col-span-3"
                    defaultValue={selectedItem?.requestedBy || ""}
                    readOnly
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="requestDate" className="text-right text-sm">요청일</label>
                  <Input
                    id="requestDate"
                    className="col-span-3"
                    defaultValue={selectedItem?.requestDate || ""}
                    readOnly
                  />
                </div>
              </>
            )}
            {dialogMode === "approve" && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="status" className="text-right text-sm">상태</label>
                  <Select defaultValue={selectedItem?.status || "pending"}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="상태 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">대기중</SelectItem>
                      <SelectItem value="meeting_scheduled">미팅 예정</SelectItem>
                      <SelectItem value="negotiating">협상중</SelectItem>
                      <SelectItem value="approved">승인</SelectItem>
                      <SelectItem value="rejected">거부</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="meetingDate" className="text-right text-sm">미팅일</label>
                  <Input
                    id="meetingDate"
                    type="date"
                    className="col-span-3"
                    defaultValue={selectedItem?.meetingDate || ""}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="price" className="text-right text-sm">가격</label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    className="col-span-3"
                    placeholder="가격"
                    defaultValue={selectedItem?.price || ""}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="quantity" className="text-right text-sm">수량</label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    className="col-span-3"
                    placeholder="수량"
                    defaultValue={selectedItem?.quantity || ""}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="commission" className="text-right text-sm">총 수수료 (%)</label>
                  <Input
                    id="commission"
                    type="number"
                    min="0"
                    max="100"
                    className="col-span-3"
                    placeholder="총 수수료 비율"
                    defaultValue={selectedItem?.commission || ""}
                  />
                </div>
                
                <div className="border rounded-md p-4 col-span-4 mt-2 bg-gray-50 dark:bg-gray-800">
                  <h3 className="text-md font-medium mb-3">수익 배분 설정</h3>
                  
                  <div className="grid grid-cols-4 items-center gap-4 mb-2">
                    <label htmlFor="trainerShare" className="text-right text-sm">훈련사 몫 (%)</label>
                    <div className="col-span-3">
                      <Input
                        id="trainerShare"
                        type="number"
                        min="0"
                        max="100"
                        placeholder="훈련사에게 배분할 비율"
                        defaultValue={selectedItem?.trainerShare || ""}
                      />
                      {selectedItem?.price && selectedItem?.commission && selectedItem?.trainerShare && (
                        <div className="text-xs text-gray-500 mt-1">
                          예상 수익: {Math.round(selectedItem.price * (selectedItem.commission / 100) * (selectedItem.trainerShare / 100) * (selectedItem.quantity || 1)).toLocaleString()}원
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="platformShare" className="text-right text-sm">플랫폼 몫 (%)</label>
                    <div className="col-span-3">
                      <Input
                        id="platformShare"
                        type="number"
                        min="0"
                        max="100"
                        placeholder="플랫폼에 배분할 비율"
                        defaultValue={selectedItem?.platformShare || ""}
                      />
                      {selectedItem?.price && selectedItem?.commission && selectedItem?.platformShare && (
                        <div className="text-xs text-gray-500 mt-1">
                          예상 수익: {Math.round(selectedItem.price * (selectedItem.commission / 100) * (selectedItem.platformShare / 100) * (selectedItem.quantity || 1)).toLocaleString()}원
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-400 mt-3">
                    참고: 총 수수료 비율 내에서 훈련사와 플랫폼 간 배분 비율을 설정합니다. (훈련사 몫 + 플랫폼 몫 = 100%)
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="referralLink" className="text-right text-sm">추천 링크</label>
                  <Input
                    id="referralLink"
                    className="col-span-3"
                    placeholder="추천 링크"
                    defaultValue={selectedItem?.referralLink || ""}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            {dialogMode === "add" && (
              <Button type="submit" onClick={() => setProductDialogOpen(false)}>
                요청 제출
              </Button>
            )}
            {dialogMode === "approve" && (
              <Button type="submit" onClick={() => setProductDialogOpen(false)}>
                상태 업데이트
              </Button>
            )}
            {dialogMode === "view" && (
              <Button variant="outline" onClick={() => setProductDialogOpen(false)}>
                닫기
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 상세 정보 대화상자 */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {selectedItem && "code" in selectedItem 
                ? "추천인 코드 상세 정보" 
                : "제품 추천 상세 정보"}
            </DialogTitle>
          </DialogHeader>

          {selectedItem && (
            "code" in selectedItem ? (
              <div className="space-y-4 py-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4 mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h3 className="text-lg font-bold mb-1">{selectedItem.code}</h3>
                      <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
                    </div>
                    <Badge 
                      className="text-sm"
                      variant={getStatusBadgeVariant(selectedItem.status)}
                    >
                      {getStatusText(selectedItem.status)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-1.5">
                      <Tag size={16} className="text-blue-500" />
                      <span className="text-sm">할인율: <span className="font-medium">{selectedItem.discount}%</span></span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Calendar size={16} className="text-blue-500" />
                      <span className="text-sm">만료: <span className="font-medium">{selectedItem.expiryDate || "제한없음"}</span></span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div className="border rounded-md p-3">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">기관 정보</h3>
                    <div className="space-y-2">
                      <div className="flex flex-col">
                        <span className="font-medium">{selectedItem.institution}</span>
                        <span className="text-xs text-muted-foreground">{selectedItem.institutionCode}</span>
                      </div>
                      <div className="text-sm mt-2">
                        <div className="flex items-center space-x-1.5">
                          <Building size={16} className="text-gray-400" />
                          <span>기관 ID: {selectedItem.institutionId}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border rounded-md p-3">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">훈련사 정보</h3>
                    <div className="space-y-2">
                      <div className="flex flex-col">
                        <span className="font-medium">{selectedItem.trainerName}</span>
                        <span className="text-xs text-muted-foreground">{selectedItem.trainerCode}</span>
                      </div>
                      <div className="text-sm mt-2">
                        <div className="flex items-center space-x-1.5">
                          <UserRound size={16} className="text-gray-400" />
                          <span>훈련사 ID: {selectedItem.trainerId}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-2">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-500">생성자</h3>
                    <p>{selectedItem.createdBy}</p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-500">요청일</h3>
                    <p>{selectedItem.requestDate}</p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-500">승인자</h3>
                    <p>{selectedItem.approvedBy || "-"}</p>
                  </div>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                  <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">수익 배분 정보</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-md text-center">
                      <div className="text-xl font-bold text-green-600 dark:text-green-400">
                        {selectedItem.profitShare}%
                      </div>
                      <div className="text-xs text-gray-500">훈련사 수익</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-md text-center">
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {100 - (selectedItem.profitShare || 0)}%
                      </div>
                      <div className="text-xs text-gray-500">기관 수익</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-md text-center">
                      <div className="text-xl font-bold text-gray-600 dark:text-gray-400">
                        {selectedItem.usageCount || 0}
                      </div>
                      <div className="text-xs text-gray-500">사용 횟수</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-500">제품명</h3>
                    <p className="font-medium">{selectedItem.productName}</p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-500">브랜드</h3>
                    <p>{selectedItem.brand}</p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-500">카테고리</h3>
                    <p>{selectedItem.category}</p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-500">상태</h3>
                    <Badge variant={getStatusBadgeVariant(selectedItem.status)}>
                      {getStatusText(selectedItem.status)}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-500">요청자</h3>
                    <p>{selectedItem.requestedBy}</p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-500">요청일</h3>
                    <p>{selectedItem.requestDate}</p>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <h3 className="text-sm font-medium text-gray-500">설명</h3>
                    <p>{selectedItem.description}</p>
                  </div>
                  {selectedItem.meetingDate && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-500">미팅일</h3>
                      <p>{selectedItem.meetingDate}</p>
                    </div>
                  )}
                  {selectedItem.price && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-500">가격</h3>
                      <p>{selectedItem.price.toLocaleString()}원</p>
                    </div>
                  )}
                  {selectedItem.quantity && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-500">수량</h3>
                      <p>{selectedItem.quantity}</p>
                    </div>
                  )}
                  {selectedItem.commission && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-500">총 수수료</h3>
                      <p>{selectedItem.commission}%</p>
                    </div>
                  )}
                  {selectedItem.estimatedProfit && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-500">예상 총 수익</h3>
                      <p>{selectedItem.estimatedProfit.toLocaleString()}원</p>
                    </div>
                  )}
                  {selectedItem.trainerShare && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-500">훈련사 몫</h3>
                      <p className="text-green-600 dark:text-green-400">
                        {selectedItem.trainerShare}% 
                        {selectedItem.estimatedProfit && (
                          <span className="text-gray-600 dark:text-gray-400 text-sm ml-2">
                            ({Math.round(selectedItem.estimatedProfit * (selectedItem.trainerShare / 100)).toLocaleString()}원)
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                  {selectedItem.platformShare && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-500">플랫폼 몫</h3>
                      <p className="text-blue-600 dark:text-blue-400">
                        {selectedItem.platformShare}%
                        {selectedItem.estimatedProfit && (
                          <span className="text-gray-600 dark:text-gray-400 text-sm ml-2">
                            ({Math.round(selectedItem.estimatedProfit * (selectedItem.platformShare / 100)).toLocaleString()}원)
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                  {selectedItem.salesCount && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-500">판매 횟수</h3>
                      <p>{selectedItem.salesCount}회</p>
                    </div>
                  )}
                  {selectedItem.totalSales && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-500">총 판매액</h3>
                      <p>{selectedItem.totalSales.toLocaleString()}원</p>
                    </div>
                  )}
                  {selectedItem.referralLink && (
                    <div className="space-y-2 col-span-2">
                      <h3 className="text-sm font-medium text-gray-500">추천 링크</h3>
                      <div className="flex items-center space-x-2">
                        <Input value={selectedItem.referralLink} readOnly />
                        <Button size="sm" variant="outline">
                          <Link className="h-4 w-4 mr-1" />
                          복사
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}