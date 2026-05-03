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
import { CalendarDays, Clock, Award, Plus, Calendar, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

// 휴식 신청 타입 정의
interface RestApplication {
  id: number;
  startDate: string;
  endDate: string;
  reason: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  substituteRequired: boolean;
  substituteStatus: 'none' | 'requested' | 'confirmed' | 'declined';
  createdAt: string;
  approvedBy?: string;
  rejectedReason?: string;
  rewardAmount?: number;
  rewardStatus?: 'none' | 'pending' | 'approved' | 'paid';
}

// 대체 훈련사 요청은 대체훈련사 게시판에서 관리됩니다.

// 휴식 보상 타입 정의
interface RestReward {
  id: number;
  rewardType: 'points' | 'cash' | 'credit' | 'voucher';
  rewardAmount: number;
  status: 'pending' | 'approved' | 'paid';
  description: string;
  earnedDate: string;
}

// 모의 데이터
const mockRestApplications: RestApplication[] = [
  {
    id: 1,
    startDate: '2025-01-25',
    endDate: '2025-01-27',
    reason: 'personal',
    description: '개인 사정으로 인한 휴식',
    status: 'pending',
    substituteRequired: true,
    substituteStatus: 'requested',
    createdAt: '2025-01-18T10:00:00Z',
    rewardAmount: 50000,
    rewardStatus: 'none'
  },
  {
    id: 2,
    startDate: '2025-02-10',
    endDate: '2025-02-12',
    reason: 'vacation',
    description: '휴가',
    status: 'approved',
    substituteRequired: false,
    substituteStatus: 'none',
    createdAt: '2025-01-15T09:30:00Z',
    approvedBy: '김관리자',
    rewardAmount: 30000,
    rewardStatus: 'approved'
  },
  {
    id: 3,
    startDate: '2025-01-10',
    endDate: '2025-01-12',
    reason: 'sick',
    description: '몸살감기',
    status: 'rejected',
    substituteRequired: true,
    substituteStatus: 'none',
    createdAt: '2025-01-08T14:20:00Z',
    rejectedReason: '대체 인력 확보 불가',
    rewardAmount: 0,
    rewardStatus: 'none'
  }
];

// 대체 훈련사 모집은 대체훈련사 게시판에서 관리됩니다.

const mockRestRewards: RestReward[] = [
  {
    id: 1,
    rewardType: 'points',
    rewardAmount: 1000,
    status: 'paid',
    description: '소규모 훈련소 휴식 보상',
    earnedDate: '2025-01-15'
  },
  {
    id: 2,
    rewardType: 'cash',
    rewardAmount: 30000,
    status: 'approved',
    description: '대체 근무 보상',
    earnedDate: '2025-01-12'
  }
];

const RestManagement: React.FC = () => {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('applications');
  const [isNewApplicationOpen, setIsNewApplicationOpen] = useState(false);
  const [newApplication, setNewApplication] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    description: '',
    substituteRequired: false
  });

  // 휴식 신청 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning/10 text-warning';
      case 'approved': return 'bg-success/10 text-success';
      case 'rejected': return 'bg-destructive/10 text-destructive';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 휴식 신청 상태별 아이콘
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <AlertCircle className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  // 휴식 신청 제출
  const handleSubmitApplication = () => {
    if (!newApplication.startDate || !newApplication.endDate || !newApplication.reason) {
      toast({
        title: "필수 정보 누락",
        description: "시작일, 종료일, 사유를 모두 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "휴식 신청 완료",
      description: "휴식 신청이 성공적으로 제출되었습니다. 승인 결과를 기다려주세요.",
    });

    setIsNewApplicationOpen(false);
    setNewApplication({
      startDate: '',
      endDate: '',
      reason: '',
      description: '',
      substituteRequired: false
    });
  };

  // 대체 훈련사 게시판으로 이동
  const handleSubstituteBoardNavigate = () => {
    window.location.href = '/trainer/substitute-board';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">휴식 관리</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            휴식 신청과 보상 관리를 한 곳에서 처리하세요. 대체 훈련사는 게시판에서 관리됩니다.
          </p>
        </div>
        <Dialog open={isNewApplicationOpen} onOpenChange={setIsNewApplicationOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              새 휴식 신청
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>새 휴식 신청</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">시작일</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={newApplication.startDate}
                    onChange={(e) => setNewApplication({...newApplication, startDate: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">종료일</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={newApplication.endDate}
                    onChange={(e) => setNewApplication({...newApplication, endDate: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="reason">사유</Label>
                <Select value={newApplication.reason} onValueChange={(value) => setNewApplication({...newApplication, reason: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="휴식 사유를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">개인 사정</SelectItem>
                    <SelectItem value="sick">병가</SelectItem>
                    <SelectItem value="family">가족 사정</SelectItem>
                    <SelectItem value="vacation">휴가</SelectItem>
                    <SelectItem value="training">교육 참석</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">상세 설명</Label>
                <Textarea
                  id="description"
                  placeholder="휴식 사유에 대한 상세한 설명을 입력하세요"
                  value={newApplication.description}
                  onChange={(e) => setNewApplication({...newApplication, description: e.target.value})}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="substituteRequired"
                  checked={newApplication.substituteRequired}
                  onCheckedChange={(checked) => setNewApplication({...newApplication, substituteRequired: checked})}
                />
                <div className="flex flex-col">
                  <Label htmlFor="substituteRequired">대체 훈련사 필요</Label>
                  <p className="text-xs text-gray-500">체크하면 대체훈련사 게시판에 자동으로 등록됩니다</p>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsNewApplicationOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleSubmitApplication}>
                  신청하기
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="applications">내 신청 현황</TabsTrigger>
          <TabsTrigger value="rewards">휴식 보상</TabsTrigger>
          <TabsTrigger value="calendar">휴식 달력</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-4">
          <div className="grid gap-4">
            {mockRestApplications.map((application) => (
              <Card key={application.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(application.status)}
                      <CardTitle className="text-lg">
                        {application.startDate} ~ {application.endDate}
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
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">사유:</span> {application.reason}
                    </div>
                    <div>
                      <span className="font-medium">신청일:</span> {new Date(application.createdAt).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">대체 훈련사:</span> {application.substituteRequired ? '필요' : '불필요'}
                      {application.substituteRequired && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="ml-2"
                          onClick={handleSubstituteBoardNavigate}
                        >
                          게시판에서 찾기
                        </Button>
                      )}
                    </div>
                    <div>
                      <span className="font-medium">보상 금액:</span> {application.rewardAmount?.toLocaleString()}원
                    </div>
                  </div>
                  {application.rejectedReason && (
                    <div className="mt-3 p-3 bg-destructive/10 border border-destructive/30 rounded-md">
                      <span className="font-medium text-destructive">거부 사유:</span> {application.rejectedReason}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>



        <TabsContent value="rewards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="w-5 h-5 mr-2" />
                휴식 보상 내역
              </CardTitle>
              <CardDescription>
                소규모 훈련소 휴식 보상 및 대체 근무 보상 내역입니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockRestRewards.map((reward) => (
                  <div key={reward.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{reward.description}</h3>
                        <p className="text-sm text-gray-600">
                          {reward.earnedDate} 지급
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-lg">
                          {reward.rewardType === 'points' ? `${reward.rewardAmount.toLocaleString()}P` : `${reward.rewardAmount.toLocaleString()}원`}
                        </div>
                        <Badge className={reward.status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>
                          {reward.status === 'paid' ? '지급완료' : '지급대기'}
                        </Badge>
                      </div>
                    </div>
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
                휴식 달력
              </CardTitle>
              <CardDescription>
                앞으로의 휴식 일정을 한눈에 확인하세요
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

export default RestManagement;