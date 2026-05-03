import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pencil, Search, Download, FileText, Download as DownloadIcon, BarChart3, PieChart } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

// 임시 데이터 - 실제로는 API에서 가져와야 함
const MOCK_INSTITUTES = [
  { id: 1, name: '서울 애견훈련소', type: '훈련소', status: '운영중' },
  { id: 2, name: '프렌들리 펫 아카데미', type: '훈련학원', status: '운영중' },
  { id: 3, name: '도그스쿨 프리미엄', type: '훈련학원', status: '운영중' },
  { id: 4, name: '우리동네 강아지학교', type: '훈련소', status: '일시중단' },
];

// 정산 내역 임시 데이터
const MOCK_SETTLEMENTS = [
  { 
    id: 1, 
    instituteId: 1, 
    instituteName: '서울 애견훈련소', 
    year: 2025, 
    month: 4, 
    totalAmount: 4250000, 
    commissionAmount: 425000, 
    settlementAmount: 3825000, 
    status: '정산완료',
    settlementDate: '2025-05-01',
    bankInfo: '123-456-7890 / 신한은행 / 홍길동',
    items: [
      { id: 101, name: '기초 사회화 훈련 코스', count: 15, unitPrice: 128000, totalPrice: 1920000 },
      { id: 102, name: '문제행동 교정 프로그램', count: 8, unitPrice: 165000, totalPrice: 1320000 },
      { id: 103, name: '어질리티 초급 과정', count: 5, unitPrice: 185000, totalPrice: 925000 },
      { id: 104, name: '반려견 생활연습 패키지', count: 1, unitPrice: 85000, totalPrice: 85000 },
    ]
  },
  { 
    id: 2, 
    instituteId: 2, 
    instituteName: '프렌들리 펫 아카데미', 
    year: 2025, 
    month: 4, 
    totalAmount: 3125000, 
    commissionAmount: 312500, 
    settlementAmount: 2812500, 
    status: '정산완료',
    settlementDate: '2025-05-01',
    bankInfo: '987-654-3210 / 국민은행 / 김도우',
    items: [
      { id: 201, name: '기초 사회화 훈련 코스', count: 10, unitPrice: 128000, totalPrice: 1280000 },
      { id: 202, name: '문제행동 교정 프로그램', count: 5, unitPrice: 165000, totalPrice: 825000 },
      { id: 203, name: '전문가 원투원 훈련', count: 6, unitPrice: 170000, totalPrice: 1020000 },
    ]
  },
  { 
    id: 3, 
    instituteId: 3, 
    instituteName: '도그스쿨 프리미엄', 
    year: 2025, 
    month: 4, 
    totalAmount: 2875000, 
    commissionAmount: 287500, 
    settlementAmount: 2587500, 
    status: '정산전',
    settlementDate: null,
    bankInfo: '333-777-9999 / 하나은행 / 박도그',
    items: [
      { id: 301, name: '기초 사회화 훈련 코스', count: 8, unitPrice: 128000, totalPrice: 1024000 },
      { id: 302, name: '문제행동 교정 프로그램', count: 7, unitPrice: 165000, totalPrice: 1155000 },
      { id: 303, name: '전문가 훈련 콘설팅', count: 3, unitPrice: 232000, totalPrice: 696000 },
    ]
  },
  { 
    id: 4, 
    instituteId: 1, 
    instituteName: '서울 애견훈련소', 
    year: 2025, 
    month: 3, 
    totalAmount: 3850000, 
    commissionAmount: 385000, 
    settlementAmount: 3465000, 
    status: '정산완료',
    settlementDate: '2025-04-01',
    bankInfo: '123-456-7890 / 신한은행 / 홍길동',
    items: [
      { id: 401, name: '기초 사회화 훈련 코스', count: 12, unitPrice: 128000, totalPrice: 1536000 },
      { id: 402, name: '문제행동 교정 프로그램', count: 7, unitPrice: 165000, totalPrice: 1155000 },
      { id: 403, name: '어질리티 초급 과정', count: 6, unitPrice: 185000, totalPrice: 1110000 },
      { id: 404, name: '반려견 장난감 세트', count: 1, unitPrice: 49000, totalPrice: 49000 },
    ]
  },
];

export default function InstitutionSettlementManagement() {
  const [settlements, setSettlements] = useState(MOCK_SETTLEMENTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('2025');
  const [monthFilter, setMonthFilter] = useState<string>('전체');
  const [statusFilter, setStatusFilter] = useState<string>('전체');
  const [selectedSettlement, setSelectedSettlement] = useState<typeof MOCK_SETTLEMENTS[0] | null>(null);
  
  // 정산 내역 필터링
  const filteredSettlements = settlements.filter(settlement => {
    const matchesSearch = settlement.instituteName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = yearFilter === '전체' || settlement.year === parseInt(yearFilter);
    const matchesMonth = monthFilter === '전체' || settlement.month === parseInt(monthFilter);
    const matchesStatus = statusFilter === '전체' || settlement.status === statusFilter;
    return matchesSearch && matchesYear && matchesMonth && matchesStatus;
  });

  // 정산 상세 정보 조회
  const handleViewDetails = (settlement: typeof MOCK_SETTLEMENTS[0]) => {
    setSelectedSettlement(settlement);
  };

  // 정산 처리 기능
  const handleProcessSettlement = (settlementId: number) => {
    setSettlements(prev => 
      prev.map(item => 
        item.id === settlementId 
          ? { ...item, status: '정산완료', settlementDate: '2025-05-05' }
          : item
      )
    );
    
    // 선택된 정산 내역 업데이트
    if (selectedSettlement?.id === settlementId) {
      setSelectedSettlement({
        ...selectedSettlement,
        status: '정산완료',
        settlementDate: '2025-05-05'
      });
    }
    
    alert('정산 처리가 완료되었습니다.');
  };

  // 정산서 다운로드
  const handleDownloadSettlementDocument = (settlement: typeof MOCK_SETTLEMENTS[0]) => {
    console.log(`정산서 다운로드: ${settlement.instituteName} (${settlement.year}년 ${settlement.month}월)`);
    alert(`${settlement.instituteName}(${settlement.year}년 ${settlement.month}월) 정산서가 다운로드 되었습니다.`);
  };

  // 뒤로가기 핸들러
  const handleBack = () => {
    setSelectedSettlement(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold">기관별 정산 관리</h1>
      </div>
      
      {selectedSettlement ? (
        <Card>
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0">
            <div>
              <CardTitle>정산 상세 정보</CardTitle>
              <CardDescription className="mt-1">
                {selectedSettlement.instituteName} - {selectedSettlement.year}년 {selectedSettlement.month}월 정산 내역
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleBack}>
                목록으로 돌아가기
              </Button>
              <Button
                variant="outline"
                className="gap-1"
                onClick={() => handleDownloadSettlementDocument(selectedSettlement)}
              >
                <DownloadIcon className="h-4 w-4" />
                정산서 다운로드
              </Button>
              {selectedSettlement.status === '정산전' && (
                <Button 
                  onClick={() => handleProcessSettlement(selectedSettlement.id)}
                >
                  정산 처리
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-sm">기관명</Label>
                <div>{selectedSettlement.instituteName}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-sm">정산 상태</Label>
                <div>
                  <Badge 
                    variant={selectedSettlement.status === '정산완료' ? 'default' : 'outline'}
                  >
                    {selectedSettlement.status}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-sm">정산 금액</Label>
                <div className="font-semibold">{selectedSettlement.settlementAmount.toLocaleString()}원</div>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-sm">정산일</Label>
                <div>{selectedSettlement.settlementDate || '-'}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-sm">은행 정보</Label>
                <div>{selectedSettlement.bankInfo}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-sm">정산 기간</Label>
                <div>{selectedSettlement.year}년 {selectedSettlement.month}월 (1일 ~ 마지막일)</div>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">정산 내역</h3>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>상품명</TableHead>
                      <TableHead className="text-right">판매수량</TableHead>
                      <TableHead className="text-right">단가</TableHead>
                      <TableHead className="text-right">총 금액</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSettlement.items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right">{item.count}개</TableCell>
                        <TableCell className="text-right">{item.unitPrice.toLocaleString()}원</TableCell>
                        <TableCell className="text-right">{item.totalPrice.toLocaleString()}원</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-medium">총 수익액</TableCell>
                      <TableCell className="text-right font-semibold">{selectedSettlement.totalAmount.toLocaleString()}원</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-medium">수수료 (10%)</TableCell>
                      <TableCell className="text-right">{selectedSettlement.commissionAmount.toLocaleString()}원</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-medium">최종 정산액</TableCell>
                      <TableCell className="text-right font-bold">{selectedSettlement.settlementAmount.toLocaleString()}원</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>정산 내역</CardTitle>
            <CardDescription>
              기관별 정산 내역을 관리하고 정산 처리를 진행할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 통계 정보 원형 진행률 바 */}
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <div className="bg-slate-800 dark:bg-slate-700 text-white p-4 rounded-xl">
                <h4 className="text-sm mb-2">정산 완료율</h4>
                <div className="w-20 h-20 mx-auto mb-2">
                  <CircularProgressbar 
                    value={67} 
                    text="67%" 
                    styles={buildStyles({
                      textColor: "white",
                      pathColor: "hsl(var(--success))",
                      trailColor: "hsl(var(--foreground))"
                    })}
                  />
                </div>
                <p className="text-xs text-center text-gray-300">2/3 기관 정산 완료</p>
              </div>
              <div className="bg-slate-800 dark:bg-slate-700 text-white p-4 rounded-xl">
                <h4 className="text-sm mb-2">월간 정산액</h4>
                <div className="w-20 h-20 mx-auto mb-2">
                  <CircularProgressbar 
                    value={85} 
                    text="85%" 
                    styles={buildStyles({
                      textColor: "white",
                      pathColor: "hsl(var(--primary))",
                      trailColor: "hsl(var(--foreground))"
                    })}
                  />
                </div>
                <p className="text-xs text-center text-gray-300">₩9,225,000</p>
              </div>
              <div className="bg-slate-800 dark:bg-slate-700 text-white p-4 rounded-xl">
                <h4 className="text-sm mb-2">평균 수수료율</h4>
                <div className="w-20 h-20 mx-auto mb-2">
                  <CircularProgressbar 
                    value={10} 
                    text="10%" 
                    styles={buildStyles({
                      textColor: "white",
                      pathColor: "hsl(var(--warning))",
                      trailColor: "hsl(var(--foreground))"
                    })}
                  />
                </div>
                <p className="text-xs text-center text-gray-300">표준 수수료율</p>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="기관명 검색"
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 md:w-auto">
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger className="w-full md:w-[100px]">
                    <SelectValue placeholder="연도" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="전체">전체</SelectItem>
                    <SelectItem value="2025">2025년</SelectItem>
                    <SelectItem value="2024">2024년</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                  <SelectTrigger className="w-full md:w-[100px]">
                    <SelectValue placeholder="월" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="전체">전체</SelectItem>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <SelectItem key={month} value={month.toString()}>{month}월</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[120px]">
                    <SelectValue placeholder="상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="전체">전체</SelectItem>
                    <SelectItem value="정산전">정산전</SelectItem>
                    <SelectItem value="정산완료">정산완료</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>기관명</TableHead>
                    <TableHead>정산기간</TableHead>
                    <TableHead className="text-right">총 수익액</TableHead>
                    <TableHead className="text-right">수수료</TableHead>
                    <TableHead className="text-right">정산액</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSettlements.map(settlement => (
                    <TableRow key={settlement.id}>
                      <TableCell className="font-medium">{settlement.instituteName}</TableCell>
                      <TableCell>{settlement.year}년 {settlement.month}월</TableCell>
                      <TableCell className="text-right">{settlement.totalAmount.toLocaleString()}원</TableCell>
                      <TableCell className="text-right">{settlement.commissionAmount.toLocaleString()}원</TableCell>
                      <TableCell className="text-right font-medium">{settlement.settlementAmount.toLocaleString()}원</TableCell>
                      <TableCell>
                        <Badge 
                          variant={settlement.status === '정산완료' ? 'default' : 'outline'}
                        >
                          {settlement.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleViewDetails(settlement)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleDownloadSettlementDocument(settlement)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {settlement.status === '정산전' && (
                            <Button
                              size="sm"
                              onClick={() => handleProcessSettlement(settlement.id)}
                            >
                              정산
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredSettlements.length === 0 && (
                <div className="py-6 text-center text-muted-foreground">
                  검색 결과가 없습니다.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}