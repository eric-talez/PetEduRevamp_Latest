import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Clock, MapPin, Users, DollarSign, Eye, TrendingUp, AlertTriangle, CheckCircle, XCircle, Building, Star } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface PlatformOverview {
  totalSubstitutePosts: number;
  totalApplications: number;
  totalAssignments: number;
  totalPayments: number;
  monthlyGrowth: number;
  averageCompensation: number;
  topPerformingInstitutes: string[];
  urgentRequests: number;
}

interface InstituteStats {
  id: string;
  name: string;
  totalTrainers: number;
  activeSubstitutes: number;
  totalRequests: number;
  completedAssignments: number;
  totalPayments: number;
  averageRating: number;
  pendingRequests: number;
}

interface SystemAlert {
  id: string;
  type: 'urgent' | 'warning' | 'info';
  title: string;
  message: string;
  instituteId: string;
  instituteName: string;
  timestamp: string;
  isResolved: boolean;
}

interface TrainerPerformance {
  id: string;
  name: string;
  instituteName: string;
  tier: 'general' | 'semi_certified' | 'certified';
  totalSubstitutes: number;
  successRate: number;
  averageRating: number;
  totalEarnings: number;
  lastActiveDate: string;
}

const MOCK_OVERVIEW: PlatformOverview = {
  totalSubstitutePosts: 42,
  totalApplications: 86,
  totalAssignments: 35,
  totalPayments: 2850000,
  monthlyGrowth: 23.5,
  averageCompensation: 75000,
  topPerformingInstitutes: ['강남 펫 아카데미', '서울 반려견 훈련소', '대구 왕짱스쿨'],
  urgentRequests: 3
};

const MOCK_INSTITUTES: InstituteStats[] = [
  {
    id: '1',
    name: '강남 펫 아카데미',
    totalTrainers: 12,
    activeSubstitutes: 8,
    totalRequests: 15,
    completedAssignments: 12,
    totalPayments: 960000,
    averageRating: 4.8,
    pendingRequests: 2
  },
  {
    id: '2',
    name: '서울 반려견 훈련소',
    totalTrainers: 8,
    activeSubstitutes: 5,
    totalRequests: 10,
    completedAssignments: 8,
    totalPayments: 640000,
    averageRating: 4.6,
    pendingRequests: 1
  },
  {
    id: '3',
    name: '대구 왕짱스쿨',
    totalTrainers: 6,
    activeSubstitutes: 4,
    totalRequests: 8,
    completedAssignments: 6,
    totalPayments: 480000,
    averageRating: 4.7,
    pendingRequests: 0
  }
];

const MOCK_ALERTS: SystemAlert[] = [
  {
    id: '1',
    type: 'urgent',
    title: '긴급 대체 훈련사 필요',
    message: '내일 오전 10시 수업에 대체 훈련사가 필요합니다.',
    instituteId: '1',
    instituteName: '강남 펫 아카데미',
    timestamp: '2025-01-24 09:30',
    isResolved: false
  },
  {
    id: '2',
    type: 'warning',
    title: '수업료 지급 지연',
    message: '3건의 수업료 지급이 지연되고 있습니다.',
    instituteId: '2',
    instituteName: '서울 반려견 훈련소',
    timestamp: '2025-01-24 08:15',
    isResolved: false
  },
  {
    id: '3',
    type: 'info',
    title: '새로운 대체 훈련사 등록',
    message: '박대체훈련사가 대체 훈련사로 등록되었습니다.',
    instituteId: '3',
    instituteName: '대구 왕짱스쿨',
    timestamp: '2025-01-24 07:45',
    isResolved: true
  }
];

const MOCK_PERFORMERS: TrainerPerformance[] = [
  {
    id: '1',
    name: '박대체훈련사',
    instituteName: '강남 펫 아카데미',
    tier: 'certified',
    totalSubstitutes: 15,
    successRate: 96.7,
    averageRating: 4.9,
    totalEarnings: 1200000,
    lastActiveDate: '2025-01-24'
  },
  {
    id: '2',
    name: '최대체훈련사',
    instituteName: '서울 반려견 훈련소',
    tier: 'semi_certified',
    totalSubstitutes: 12,
    successRate: 91.7,
    averageRating: 4.7,
    totalEarnings: 960000,
    lastActiveDate: '2025-01-23'
  },
  {
    id: '3',
    name: '이대체훈련사',
    instituteName: '대구 왕짱스쿨',
    tier: 'general',
    totalSubstitutes: 8,
    successRate: 87.5,
    averageRating: 4.5,
    totalEarnings: 640000,
    lastActiveDate: '2025-01-22'
  }
];

export default function SubstituteTrainerOverview() {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedInstitute, setSelectedInstitute] = useState<any>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [alertDialog, setAlertDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 전체 현황 조회
  const { data: overview = {}, isLoading: isLoadingOverview } = useQuery({
    queryKey: ['/api/substitute-overview'],
    queryFn: () => apiRequest('GET', '/api/substitute-overview')
  });

  // 기관별 현황 조회
  const { data: institutes = [], isLoading: isLoadingInstitutes } = useQuery({
    queryKey: ['/api/substitute-institutes'],
    queryFn: () => apiRequest('GET', '/api/substitute-institutes')
  });

  // 시스템 알림 조회
  const { data: alerts = [], isLoading: isLoadingAlerts } = useQuery({
    queryKey: ['/api/substitute-alerts'],
    queryFn: () => apiRequest('GET', '/api/substitute-alerts')
  });

  // 훈련사 성과 조회
  const { data: trainers = [], isLoading: isLoadingTrainers } = useQuery({
    queryKey: ['/api/substitute-trainers'],
    queryFn: () => apiRequest('GET', '/api/substitute-trainers')
  });

  // 알림 해결 처리
  const resolveAlertMutation = useMutation({
    mutationFn: (alertId: string) => apiRequest('PUT', `/api/substitute-alerts/${alertId}/resolve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/substitute-alerts'] });
      toast({
        title: "알림 해결",
        description: "알림이 해결되었습니다.",
      });
    }
  });

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'certified': return 'bg-primary/50';
      case 'semi_certified': return 'bg-blue-500';
      case 'general': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getTierText = (tier: string) => {
    switch (tier) {
      case 'certified': return '인증 훈련사';
      case 'semi_certified': return '준인증 훈련사';
      case 'general': return '일반 훈련사';
      default: return '일반';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'urgent': return 'bg-red-500';
      case 'warning': return 'bg-orange-500';
      case 'info': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const handleViewInstituteDetail = (institute: any) => {
    setSelectedInstitute(institute);
    setDetailDialog(true);
  };

  const handleViewAlert = (alert: any) => {
    setSelectedAlert(alert);
    setAlertDialog(true);
  };

  const handleResolveAlert = (alertId: string) => {
    resolveAlertMutation.mutate(alertId);
    setAlertDialog(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">대체 훈련사 현황 관리</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          플랫폼 전체의 대체 훈련사 시스템 현황과 성과를 모니터링하고 관리하세요
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">전체 현황</TabsTrigger>
          <TabsTrigger value="institutes">기관별 현황</TabsTrigger>
          <TabsTrigger value="alerts">시스템 알림</TabsTrigger>
          <TabsTrigger value="performance">성과 분석</TabsTrigger>
          <TabsTrigger value="reports">보고서</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  총 대체 요청
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {MOCK_OVERVIEW.totalSubstitutePosts}
                </div>
                <p className="text-sm text-gray-600">이번 달</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600" />
                  총 신청 수
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {MOCK_OVERVIEW.totalApplications}
                </div>
                <p className="text-sm text-gray-600">신청 건수</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  완료된 배정
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {MOCK_OVERVIEW.totalAssignments}
                </div>
                <p className="text-sm text-gray-600">배정 완료</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-orange-600" />
                  총 지급액
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {MOCK_OVERVIEW.totalPayments.toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">원</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  월간 성장률
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  +{MOCK_OVERVIEW.monthlyGrowth}%
                </div>
                <p className="text-sm text-gray-600">지난 달 대비</p>
                <div className="mt-4">
                  <div className="text-sm text-gray-600 mb-1">평균 수업료</div>
                  <div className="text-xl font-semibold text-green-600">
                    {MOCK_OVERVIEW.averageCompensation.toLocaleString()}원
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  주요 알림
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">긴급 요청</span>
                    <Badge className="bg-red-500 text-white">
                      {MOCK_OVERVIEW.urgentRequests}건
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    최상위 수행 기관:
                  </div>
                  <div className="space-y-1">
                    {MOCK_OVERVIEW.topPerformingInstitutes.map((institute, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm">{institute}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="institutes" className="mt-6">
          <div className="grid gap-4">
            {MOCK_INSTITUTES.map(institute => (
              <Card key={institute.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building className="h-5 w-5 text-blue-600" />
                        {institute.name}
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-600 mt-1">
                        총 {institute.totalTrainers}명의 훈련사 | 활성 대체 훈련사 {institute.activeSubstitutes}명
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">{institute.averageRating}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-600">총 요청</div>
                      <div className="text-xl font-semibold text-blue-600">
                        {institute.totalRequests}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">완료된 배정</div>
                      <div className="text-xl font-semibold text-green-600">
                        {institute.completedAssignments}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">총 지급액</div>
                      <div className="text-xl font-semibold text-orange-600">
                        {institute.totalPayments.toLocaleString()}원
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">대기 중</div>
                      <div className="text-xl font-semibold text-yellow-600">
                        {institute.pendingRequests}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      성공률: {((institute.completedAssignments / institute.totalRequests) * 100).toFixed(1)}%
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleViewInstituteDetail(institute)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      상세보기
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <div className="grid gap-4">
            {MOCK_ALERTS.map(alert => (
              <Card key={alert.id} className={`hover:shadow-md transition-shadow ${alert.isResolved ? 'opacity-60' : ''}`}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <Badge className={`${getAlertColor(alert.type)} text-white`}>
                        {alert.type === 'urgent' ? '긴급' : 
                         alert.type === 'warning' ? '경고' : '정보'}
                      </Badge>
                      <div>
                        <h3 className="font-medium">{alert.title}</h3>
                        <p className="text-sm text-gray-600">{alert.instituteName}</p>
                      </div>
                    </div>
                    {alert.isResolved && (
                      <Badge className="bg-green-500 text-white">해결됨</Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-3">{alert.message}</p>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{alert.timestamp}</span>
                    {!alert.isResolved && (
                      <Button 
                        size="sm"
                        onClick={() => handleViewAlert(alert)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        처리하기
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>대체 훈련사 성과 순위</CardTitle>
              <CardDescription>
                대체 수업 성과가 우수한 훈련사들을 확인하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>순위</TableHead>
                    <TableHead>훈련사명</TableHead>
                    <TableHead>소속 기관</TableHead>
                    <TableHead>등급</TableHead>
                    <TableHead>대체 수업 수</TableHead>
                    <TableHead>성공률</TableHead>
                    <TableHead>평균 평점</TableHead>
                    <TableHead>총 수익</TableHead>
                    <TableHead>최근 활동</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_PERFORMERS.map((performer, index) => (
                    <TableRow key={performer.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{performer.name}</TableCell>
                      <TableCell>{performer.instituteName}</TableCell>
                      <TableCell>
                        <Badge className={`${getTierColor(performer.tier)} text-white`}>
                          {getTierText(performer.tier)}
                        </Badge>
                      </TableCell>
                      <TableCell>{performer.totalSubstitutes}</TableCell>
                      <TableCell>{performer.successRate}%</TableCell>
                      <TableCell className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        {performer.averageRating}
                      </TableCell>
                      <TableCell>{performer.totalEarnings.toLocaleString()}원</TableCell>
                      <TableCell>{performer.lastActiveDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>월간 보고서</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">총 대체 요청</span>
                    <span className="font-medium">42건</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">평균 처리 시간</span>
                    <span className="font-medium">2.3시간</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">성공률</span>
                    <span className="font-medium">89.5%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">평균 만족도</span>
                    <span className="font-medium">4.7/5.0</span>
                  </div>
                </div>
                <Button className="w-full mt-4">
                  상세 보고서 다운로드
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>수익 분석</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">총 수수료 수익</span>
                    <span className="font-medium">285,000원</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">평균 수수료율</span>
                    <span className="font-medium">10%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">대체 훈련사 수익</span>
                    <span className="font-medium">2,565,000원</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">월간 성장률</span>
                    <span className="font-medium text-green-600">+23.5%</span>
                  </div>
                </div>
                <Button className="w-full mt-4">
                  수익 분석 보고서
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 기관 상세 정보 다이얼로그 */}
      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>기관 상세 정보</DialogTitle>
            <DialogDescription>
              {selectedInstitute?.name}의 대체 훈련사 시스템 운영 현황
            </DialogDescription>
          </DialogHeader>
          {selectedInstitute && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">총 훈련사 수</Label>
                  <p className="text-sm">{selectedInstitute.totalTrainers}명</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">활성 대체 훈련사</Label>
                  <p className="text-sm">{selectedInstitute.activeSubstitutes}명</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">총 요청 수</Label>
                  <p className="text-sm">{selectedInstitute.totalRequests}건</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">완료된 배정</Label>
                  <p className="text-sm">{selectedInstitute.completedAssignments}건</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">총 지급액</Label>
                  <p className="text-sm">{selectedInstitute.totalPayments.toLocaleString()}원</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">평균 평점</Label>
                  <p className="text-sm flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    {selectedInstitute.averageRating}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">대기 중인 요청</Label>
                  <p className="text-sm">{selectedInstitute.pendingRequests}건</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">성공률</Label>
                  <p className="text-sm">
                    {((selectedInstitute.completedAssignments / selectedInstitute.totalRequests) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 알림 처리 다이얼로그 */}
      <Dialog open={alertDialog} onOpenChange={setAlertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>알림 처리</DialogTitle>
            <DialogDescription>
              시스템 알림을 확인하고 처리하세요
            </DialogDescription>
          </DialogHeader>
          {selectedAlert && (
            <div className="py-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={`${getAlertColor(selectedAlert.type)} text-white`}>
                    {selectedAlert.type === 'urgent' ? '긴급' : 
                     selectedAlert.type === 'warning' ? '경고' : '정보'}
                  </Badge>
                  <span className="font-medium">{selectedAlert.title}</span>
                </div>
                <p><strong>기관:</strong> {selectedAlert.instituteName}</p>
                <p><strong>메시지:</strong> {selectedAlert.message}</p>
                <p><strong>시간:</strong> {selectedAlert.timestamp}</p>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setAlertDialog(false)}>
                  취소
                </Button>
                <Button onClick={() => handleResolveAlert(selectedAlert.id)}>
                  해결 완료
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}