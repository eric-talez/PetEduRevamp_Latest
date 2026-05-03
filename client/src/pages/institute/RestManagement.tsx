import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CalendarDays, Clock, Coffee, Award, Users, Plus, Calendar, CheckCircle, XCircle, AlertCircle, Building, Search, UserCheck, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// 훈련사 휴식 신청 타입 정의
interface TrainerRestApplication {
  id: number;
  trainerId: number;
  trainerName: string;
  startDate: string;
  endDate: string;
  reason: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  substituteRequired: boolean;
  substituteTrainerId?: number;
  substituteTrainerName?: string;
  substituteStatus: 'none' | 'requested' | 'confirmed' | 'declined';
  createdAt: string;
  rewardAmount?: number;
}

// 훈련소 전체 휴무 타입 정의
interface InstituteClosure {
  id: number;
  startDate: string;
  endDate: string;
  reason: string;
  description: string;
  status: 'planned' | 'active' | 'completed';
  notificationSent: boolean;
  customerNotice: string;
  alternativeOptions: string;
  createdAt: string;
}

// 대체 훈련사 매칭 타입 정의
interface SubstituteMatch {
  id: number;
  restApplicationId: number;
  originalTrainerName: string;
  requiredSkills: string[];
  startDate: string;
  endDate: string;
  compensation: number;
  availableTrainers: { id: number; name: string; skills: string[]; level: string }[];
  selectedTrainerId?: number;
  status: 'open' | 'matched' | 'confirmed';
}

// 모의 데이터
const mockTrainerRestApplications: TrainerRestApplication[] = [
  {
    id: 1,
    trainerId: 1,
    trainerName: '강동훈',
    startDate: '2025-01-25',
    endDate: '2025-01-27',
    reason: 'personal',
    description: '개인 사정으로 인한 휴식',
    status: 'pending',
    substituteRequired: true,
    substituteStatus: 'requested',
    createdAt: '2025-01-18T10:00:00Z',
    rewardAmount: 50000
  },
  {
    id: 2,
    trainerId: 2,
    trainerName: '이준호',
    startDate: '2025-02-10',
    endDate: '2025-02-12',
    reason: 'vacation',
    description: '휴가',
    status: 'approved',
    substituteRequired: true,
    substituteTrainerId: 3,
    substituteTrainerName: '박민수',
    substituteStatus: 'confirmed',
    createdAt: '2025-01-15T09:30:00Z',
    rewardAmount: 30000
  },
  {
    id: 3,
    trainerId: 4,
    trainerName: '김서연',
    startDate: '2025-01-30',
    endDate: '2025-02-01',
    reason: 'sick',
    description: '몸살감기',
    status: 'pending',
    substituteRequired: false,
    substituteStatus: 'none',
    createdAt: '2025-01-20T14:20:00Z',
    rewardAmount: 25000
  }
];

const mockInstituteClosures: InstituteClosure[] = [
  {
    id: 1,
    startDate: '2025-02-15',
    endDate: '2025-02-17',
    reason: 'holiday',
    description: '설날 연휴',
    status: 'planned',
    notificationSent: true,
    customerNotice: '설날 연휴로 인해 휴무합니다. 고객님들의 양해 부탁드립니다.',
    alternativeOptions: '온라인 상담 서비스 이용 가능',
    createdAt: '2025-01-10T10:00:00Z'
  },
  {
    id: 2,
    startDate: '2025-01-05',
    endDate: '2025-01-07',
    reason: 'maintenance',
    description: '시설 점검 및 보수',
    status: 'completed',
    notificationSent: true,
    customerNotice: '시설 점검으로 인해 임시 휴무합니다.',
    alternativeOptions: '인근 지점 이용 가능',
    createdAt: '2024-12-20T15:30:00Z'
  }
];

const mockSubstituteMatches: SubstituteMatch[] = [
  {
    id: 1,
    restApplicationId: 1,
    originalTrainerName: '강동훈',
    requiredSkills: ['기초 복종 훈련', '사회화 훈련'],
    startDate: '2025-01-25',
    endDate: '2025-01-27',
    compensation: 80000,
    availableTrainers: [
      { id: 3, name: '박민수', skills: ['기초 복종 훈련', '사회화 훈련', '공격성 교정'], level: 'expert' },
      { id: 5, name: '최유진', skills: ['기초 복종 훈련', '사회화 훈련'], level: 'intermediate' }
    ],
    status: 'open'
  },
  {
    id: 2,
    restApplicationId: 2,
    originalTrainerName: '이준호',
    requiredSkills: ['분리불안 치료', '노견 관리'],
    startDate: '2025-02-10',
    endDate: '2025-02-12',
    compensation: 120000,
    availableTrainers: [
      { id: 3, name: '박민수', skills: ['분리불안 치료', '노견 관리', '공격성 교정'], level: 'expert' }
    ],
    selectedTrainerId: 3,
    status: 'matched'
  }
];

const InstituteRestManagement: React.FC = () => {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('applications');
  const [isNewClosureOpen, setIsNewClosureOpen] = useState(false);
  const [newClosure, setNewClosure] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    description: '',
    customerNotice: '',
    alternativeOptions: ''
  });

  // 휴식 신청 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning/10 text-warning';
      case 'approved': return 'bg-success/10 text-success';
      case 'rejected': return 'bg-destructive/10 text-destructive';
      case 'planned': return 'bg-primary/10 text-primary';
      case 'active': return 'bg-primary/10 text-primary';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 휴식 신청 상태별 아이콘
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <AlertCircle className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'planned': return <Calendar className="w-4 h-4" />;
      case 'active': return <Clock className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  // 휴식 신청 승인/거부
  const handleApplicationAction = (applicationId: number, action: 'approve' | 'reject') => {
    const actionText = action === 'approve' ? '승인' : '거부';
    toast({
      title: `휴식 신청 ${actionText}`,
      description: `훈련사의 휴식 신청이 ${actionText}되었습니다.`,
    });
  };

  // 대체 훈련사 배정
  const handleAssignSubstitute = (matchId: number, trainerId: number) => {
    toast({
      title: "대체 훈련사 배정 완료",
      description: "대체 훈련사가 성공적으로 배정되었습니다.",
    });
  };

  // 훈련소 휴무 등록
  const handleSubmitClosure = () => {
    if (!newClosure.startDate || !newClosure.endDate || !newClosure.reason) {
      toast({
        title: "필수 정보 누락",
        description: "시작일, 종료일, 사유를 모두 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "훈련소 휴무 등록 완료",
      description: "훈련소 휴무가 성공적으로 등록되었습니다.",
    });

    setIsNewClosureOpen(false);
    setNewClosure({
      startDate: '',
      endDate: '',
      reason: '',
      description: '',
      customerNotice: '',
      alternativeOptions: ''
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">훈련소 휴식 관리</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            훈련사 휴식 신청 승인, 대체 인력 배정, 훈련소 휴무 관리를 처리하세요
          </p>
        </div>
        <Dialog open={isNewClosureOpen} onOpenChange={setIsNewClosureOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Building className="w-4 h-4 mr-2" />
              훈련소 휴무 등록
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>훈련소 휴무 등록</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">시작일</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={newClosure.startDate}
                    onChange={(e) => setNewClosure({...newClosure, startDate: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">종료일</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={newClosure.endDate}
                    onChange={(e) => setNewClosure({...newClosure, endDate: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="reason">사유</Label>
                <Select value={newClosure.reason} onValueChange={(value) => setNewClosure({...newClosure, reason: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="휴무 사유를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="holiday">공휴일</SelectItem>
                    <SelectItem value="maintenance">시설 점검</SelectItem>
                    <SelectItem value="event">특별 행사</SelectItem>
                    <SelectItem value="training">직원 교육</SelectItem>
                    <SelectItem value="emergency">긴급 상황</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">상세 설명</Label>
                <Textarea
                  id="description"
                  placeholder="휴무 사유에 대한 상세한 설명을 입력하세요"
                  value={newClosure.description}
                  onChange={(e) => setNewClosure({...newClosure, description: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="customerNotice">고객 안내문</Label>
                <Textarea
                  id="customerNotice"
                  placeholder="고객들에게 안내할 메시지를 입력하세요"
                  value={newClosure.customerNotice}
                  onChange={(e) => setNewClosure({...newClosure, customerNotice: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="alternativeOptions">대체 서비스 안내</Label>
                <Textarea
                  id="alternativeOptions"
                  placeholder="대체 서비스나 옵션에 대한 안내를 입력하세요"
                  value={newClosure.alternativeOptions}
                  onChange={(e) => setNewClosure({...newClosure, alternativeOptions: e.target.value})}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsNewClosureOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleSubmitClosure}>
                  등록하기
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="applications">훈련사 신청 관리</TabsTrigger>
          <TabsTrigger value="substitute">대체 인력 배정</TabsTrigger>
          <TabsTrigger value="closure">훈련소 휴무</TabsTrigger>
          <TabsTrigger value="calendar">휴무 달력</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-4">
          <div className="grid gap-4">
            {mockTrainerRestApplications.map((application) => (
              <Card key={application.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(application.status)}
                      <CardTitle className="text-lg">
                        {application.trainerName} 훈련사
                      </CardTitle>
                    </div>
                    <Badge className={getStatusColor(application.status)}>
                      {application.status === 'pending' && '대기중'}
                      {application.status === 'approved' && '승인됨'}
                      {application.status === 'rejected' && '거부됨'}
                    </Badge>
                  </div>
                  <CardDescription>{application.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="font-medium">휴식 기간:</span> {application.startDate} ~ {application.endDate}
                    </div>
                    <div>
                      <span className="font-medium">사유:</span> {application.reason}
                    </div>
                    <div>
                      <span className="font-medium">대체 훈련사:</span> {application.substituteRequired ? '필요' : '불필요'}
                    </div>
                    <div>
                      <span className="font-medium">보상 금액:</span> {application.rewardAmount?.toLocaleString()}원
                    </div>
                  </div>
                  {application.substituteTrainerName && (
                    <div className="mb-3 p-3 bg-success/10 border border-success/30 rounded-md">
                      <span className="font-medium text-success">대체 훈련사:</span> {application.substituteTrainerName}
                    </div>
                  )}
                  {application.status === 'pending' && (
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleApplicationAction(application.id, 'approve')}
                        className="bg-success hover:bg-success/90"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        승인
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleApplicationAction(application.id, 'reject')}
                        className="text-destructive border-destructive/40 hover:bg-destructive/10"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        거부
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="substitute" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                대체 인력 배정 관리
              </CardTitle>
              <CardDescription>
                훈련사 휴식 기간 동안 대체할 인력을 배정하고 관리합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockSubstituteMatches.map((match) => (
                  <div key={match.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{match.originalTrainerName} 훈련사 대체 인력</h3>
                        <p className="text-sm text-gray-600">
                          {match.startDate} ~ {match.endDate}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-lg text-primary">
                          {match.compensation.toLocaleString()}원
                        </div>
                        <Badge variant="outline">
                          {match.status === 'open' && '매칭 대기'}
                          {match.status === 'matched' && '매칭 완료'}
                          {match.status === 'confirmed' && '확정'}
                        </Badge>
                      </div>
                    </div>
                    <div className="mb-3">
                      <p className="text-sm font-medium mb-1">필요 스킬:</p>
                      <div className="flex flex-wrap gap-1">
                        {match.requiredSkills.map((skill, index) => (
                          <Badge key={index} variant="secondary">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">대체 가능한 훈련사:</p>
                      {match.availableTrainers.map((trainer) => (
                        <div key={trainer.id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <span className="font-medium">{trainer.name}</span>
                            <span className="text-sm text-gray-600 ml-2">({trainer.level})</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {trainer.skills.map((skill, index) => (
                                <Badge key={index} variant="outline" className="text-xs">{skill}</Badge>
                              ))}
                            </div>
                          </div>
                          <Button 
                            size="sm"
                            onClick={() => handleAssignSubstitute(match.id, trainer.id)}
                            disabled={match.selectedTrainerId === trainer.id}
                          >
                            {match.selectedTrainerId === trainer.id ? '배정됨' : '배정'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="closure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="w-5 h-5 mr-2" />
                훈련소 휴무 관리
              </CardTitle>
              <CardDescription>
                훈련소 전체 휴무 일정을 관리하고 고객 안내를 처리합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockInstituteClosures.map((closure) => (
                  <div key={closure.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(closure.status)}
                        <div>
                          <h3 className="font-semibold">{closure.description}</h3>
                          <p className="text-sm text-gray-600">
                            {closure.startDate} ~ {closure.endDate}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(closure.status)}>
                        {closure.status === 'planned' && '계획됨'}
                        {closure.status === 'active' && '진행중'}
                        {closure.status === 'completed' && '완료됨'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="font-medium">사유:</span> {closure.reason}
                      </div>
                      <div>
                        <span className="font-medium">알림 발송:</span> {closure.notificationSent ? '완료' : '대기'}
                      </div>
                    </div>
                    {closure.customerNotice && (
                      <div className="mb-3 p-3 bg-primary/10 border border-primary/30 rounded-md">
                        <p className="font-medium text-primary mb-1">고객 안내문:</p>
                        <p className="text-sm text-primary">{closure.customerNotice}</p>
                      </div>
                    )}
                    {closure.alternativeOptions && (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                        <p className="font-medium text-gray-800 mb-1">대체 서비스:</p>
                        <p className="text-sm text-gray-700">{closure.alternativeOptions}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarDays className="w-5 h-5 mr-2" />
                휴무 달력 관리
              </CardTitle>
              <CardDescription>
                훈련소 전체 휴무 일정을 달력 형태로 관리하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">달력 기능은 곧 추가될 예정입니다.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InstituteRestManagement;