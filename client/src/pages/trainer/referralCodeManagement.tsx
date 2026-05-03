import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Copy, Eye, Edit, Trash2, Users, TrendingUp, DollarSign } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function ReferralCodeManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  // 샘플 추천 코드 데이터
  const referralCodes = [
    {
      id: 1,
      code: "TRAINER2024",
      description: "2024년 신규 훈련생 할인",
      discount: 20,
      discountType: "percentage",
      usageLimit: 100,
      usageCount: 23,
      status: "active",
      validUntil: "2024-12-31",
      createdAt: "2024-01-01"
    },
    {
      id: 2,
      code: "BASIC15",
      description: "기본 훈련 코스 할인",
      discount: 15000,
      discountType: "fixed",
      usageLimit: 50,
      usageCount: 12,
      status: "active",
      validUntil: "2024-06-30",
      createdAt: "2024-01-15"
    },
    {
      id: 3,
      code: "EXPIRED2023",
      description: "2023년 연말 이벤트",
      discount: 25,
      discountType: "percentage",
      usageLimit: 200,
      usageCount: 180,
      status: "expired",
      validUntil: "2023-12-31",
      createdAt: "2023-11-01"
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success/10 text-success">활성</Badge>;
      case 'expired':
        return <Badge className="bg-destructive/10 text-destructive">만료</Badge>;
      case 'paused':
        return <Badge className="bg-warning/10 text-warning">일시정지</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getDiscountText = (discount: number, type: string) => {
    return type === 'percentage' ? `${discount}%` : `${discount.toLocaleString()}원`;
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "코드 복사됨",
      description: `추천 코드 "${code}"가 클립보드에 복사되었습니다.`,
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">추천 코드 관리</h1>
          <p className="text-muted-foreground">훈련생 유치를 위한 추천 코드를 생성하고 관리합니다</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          새 추천 코드 생성
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 추천 코드</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralCodes.length}</div>
            <p className="text-xs text-muted-foreground">
              활성 코드 {referralCodes.filter(code => code.status === 'active').length}개
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 사용 횟수</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {referralCodes.reduce((total, code) => total + code.usageCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              이번달 +15회
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">예상 할인 금액</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,450,000원</div>
            <p className="text-xs text-muted-foreground">
              총 할인 제공 금액
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전환율</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78%</div>
            <p className="text-xs text-muted-foreground">
              코드 사용 → 등록
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 검색 및 필터 */}
      <Card>
        <CardHeader>
          <CardTitle>추천 코드 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="코드명, 설명으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="expired">만료</SelectItem>
                <SelectItem value="paused">일시정지</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 추천 코드 테이블 */}
          <div className="border rounded-lg">
            <div className="grid grid-cols-8 gap-4 p-4 font-medium border-b bg-muted/50">
              <div>코드</div>
              <div>설명</div>
              <div>할인</div>
              <div>사용현황</div>
              <div>상태</div>
              <div>유효기간</div>
              <div>생성일</div>
              <div>작업</div>
            </div>
            {referralCodes.map((code) => (
              <div key={code.id} className="grid grid-cols-8 gap-4 p-4 border-b last:border-b-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium">{code.code}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => copyCode(code.code)}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-sm">{code.description}</div>
                <div className="font-medium text-success">
                  {getDiscountText(code.discount, code.discountType)}
                </div>
                <div className="text-sm">
                  {code.usageCount}/{code.usageLimit}
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                    <div 
                      className="bg-primary h-1 rounded-full" 
                      style={{ width: `${(code.usageCount / code.usageLimit) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div>{getStatusBadge(code.status)}</div>
                <div className="text-sm">{code.validUntil}</div>
                <div className="text-sm">{code.createdAt}</div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}