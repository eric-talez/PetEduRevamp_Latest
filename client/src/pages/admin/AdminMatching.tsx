import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Users, 
  Building2, 
  UserCheck, 
  Clock, 
  CheckCircle, 
  XCircle,
  Plus,
  RefreshCw,
  Loader2,
  Link as LinkIcon
} from 'lucide-react';

interface InstituteApplication {
  id: number;
  trainerId: number;
  instituteId: number;
  status: string;
  appliedAt: string;
  trainerName: string | null;
}

interface ClientAssignment {
  id: number;
  trainerId: number;
  clientId: number;
  status: string;
  serviceType: string;
  assignedAt: string;
  clientName: string | null;
  clientEmail: string | null;
}

interface MatchingStats {
  pendingInstituteApplications: number;
  activeClientAssignments: number;
  totalInstituteApplications: number;
  totalClientAssignments: number;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return <Badge variant="warning" className="flex items-center gap-1"><Clock className="w-3 h-3" /> 대기 중</Badge>;
    case 'approved':
    case 'active':
      return <Badge variant="success" className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> 승인됨</Badge>;
    case 'rejected':
      return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="w-3 h-3" /> 거부됨</Badge>;
    case 'completed':
      return <Badge variant="secondary">완료됨</Badge>;
    case 'cancelled':
      return <Badge variant="outline">취소됨</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function AdminMatching() {
  const [loading, setLoading] = useState(true);
  const [instituteApplications, setInstituteApplications] = useState<InstituteApplication[]>([]);
  const [clientAssignments, setClientAssignments] = useState<ClientAssignment[]>([]);
  const [stats, setStats] = useState<MatchingStats | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [newAssignment, setNewAssignment] = useState({
    trainerId: '',
    clientId: '',
    serviceType: 'training',
    notes: ''
  });
  const { toast } = useToast();

  const fetchMatchingData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/matching-overview');
      const data = await response.json();
      
      if (data.success) {
        setInstituteApplications(data.data.instituteApplications || []);
        setClientAssignments(data.data.clientAssignments || []);
        setStats(data.data.stats || null);
      }
    } catch (error) {
      console.error('매칭 데이터 조회 오류:', error);
      toast({
        title: "오류",
        description: "매칭 데이터를 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersForAssignment = async () => {
    try {
      const [trainersRes, usersRes] = await Promise.all([
        fetch('/api/admin/users?role=trainer'),
        fetch('/api/admin/users?role=pet-owner')
      ]);
      
      const trainersData = await trainersRes.json();
      const usersData = await usersRes.json();
      
      if (trainersData.success) {
        setTrainers(trainersData.data || []);
      }
      if (usersData.success) {
        setClients(usersData.data || []);
      }
    } catch (error) {
      console.error('사용자 목록 조회 오류:', error);
    }
  };

  useEffect(() => {
    fetchMatchingData();
    fetchUsersForAssignment();
  }, []);

  const handleCreateAssignment = async () => {
    if (!newAssignment.trainerId || !newAssignment.clientId) {
      toast({
        title: "입력 오류",
        description: "훈련사와 사용자를 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await apiRequest('/api/trainer/client-assignments', {
        method: 'POST',
        body: JSON.stringify({
          trainerId: parseInt(newAssignment.trainerId),
          clientId: parseInt(newAssignment.clientId),
          serviceType: newAssignment.serviceType,
          notes: newAssignment.notes
        })
      });
      
      if (response.success) {
        toast({
          title: "성공",
          description: "훈련사-사용자 매칭이 생성되었습니다."
        });
        setIsCreateDialogOpen(false);
        setNewAssignment({ trainerId: '', clientId: '', serviceType: 'training', notes: '' });
        fetchMatchingData();
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "매칭 생성에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateAssignmentStatus = async (id: number, status: string) => {
    try {
      const response = await apiRequest(`/api/trainer/client-assignments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      
      if (response.success) {
        toast({
          title: "성공",
          description: "매칭 상태가 업데이트되었습니다."
        });
        fetchMatchingData();
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "상태 업데이트에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LinkIcon className="w-6 h-6" />
            매칭 관리
          </h1>
          <p className="text-muted-foreground mt-1">훈련사-기관 연결 및 훈련사-사용자 매칭을 관리합니다.</p>
        </div>
        <Button onClick={fetchMatchingData} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          새로고침
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-warning/10 rounded-lg">
                  <Clock className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">기관 연결 대기</p>
                  <p className="text-2xl font-bold">{stats.pendingInstituteApplications}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-success/10 rounded-lg">
                  <UserCheck className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">활성 사용자 매칭</p>
                  <p className="text-2xl font-bold">{stats.activeClientAssignments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">총 기관 신청</p>
                  <p className="text-2xl font-bold">{stats.totalInstituteApplications}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">총 사용자 매칭</p>
                  <p className="text-2xl font-bold">{stats.totalClientAssignments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="institute" className="space-y-4">
        <TabsList>
          <TabsTrigger value="institute" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            훈련사-기관 연결
          </TabsTrigger>
          <TabsTrigger value="client" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            훈련사-사용자 매칭
          </TabsTrigger>
        </TabsList>

        <TabsContent value="institute">
          <Card>
            <CardHeader>
              <CardTitle>훈련사-기관 연결 신청 현황</CardTitle>
              <CardDescription>훈련사가 기관에 신청한 연결 요청 목록입니다. 기관관리자가 승인/거부합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              {instituteApplications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  연결 신청 내역이 없습니다.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>훈련사</TableHead>
                      <TableHead>기관 ID</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>신청일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {instituteApplications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell>{app.id}</TableCell>
                        <TableCell>{app.trainerName || `훈련사 #${app.trainerId}`}</TableCell>
                        <TableCell>기관 #{app.instituteId}</TableCell>
                        <TableCell><StatusBadge status={app.status} /></TableCell>
                        <TableCell>{new Date(app.appliedAt).toLocaleDateString('ko-KR')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="client">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>훈련사-사용자 매칭 현황</CardTitle>
                <CardDescription>훈련사가 담당하는 사용자 매칭 목록입니다.</CardDescription>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    매칭 생성
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>새 매칭 생성</DialogTitle>
                    <DialogDescription>훈련사와 사용자를 매칭합니다.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>훈련사 선택</Label>
                      <Select value={newAssignment.trainerId} onValueChange={(v) => setNewAssignment({...newAssignment, trainerId: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="훈련사를 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {trainers.map((trainer) => (
                            <SelectItem key={trainer.id} value={trainer.id.toString()}>
                              {trainer.name || trainer.username} ({trainer.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>사용자 선택</Label>
                      <Select value={newAssignment.clientId} onValueChange={(v) => setNewAssignment({...newAssignment, clientId: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="사용자를 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.name || client.username} ({client.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>서비스 유형</Label>
                      <Select value={newAssignment.serviceType} onValueChange={(v) => setNewAssignment({...newAssignment, serviceType: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="서비스 유형 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="training">훈련</SelectItem>
                          <SelectItem value="consultation">상담</SelectItem>
                          <SelectItem value="behavior-correction">행동 교정</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>메모</Label>
                      <Textarea 
                        placeholder="매칭에 대한 메모를 입력하세요"
                        value={newAssignment.notes}
                        onChange={(e) => setNewAssignment({...newAssignment, notes: e.target.value})}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>취소</Button>
                    <Button onClick={handleCreateAssignment}>생성</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {clientAssignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  사용자 매칭 내역이 없습니다.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>훈련사</TableHead>
                      <TableHead>사용자</TableHead>
                      <TableHead>서비스 유형</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>배정일</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientAssignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>{assignment.id}</TableCell>
                        <TableCell>훈련사 #{assignment.trainerId}</TableCell>
                        <TableCell>{assignment.clientName || `사용자 #${assignment.clientId}`}</TableCell>
                        <TableCell>
                          {assignment.serviceType === 'training' ? '훈련' : 
                           assignment.serviceType === 'consultation' ? '상담' : 
                           assignment.serviceType === 'behavior-correction' ? '행동 교정' : 
                           assignment.serviceType}
                        </TableCell>
                        <TableCell><StatusBadge status={assignment.status} /></TableCell>
                        <TableCell>{new Date(assignment.assignedAt).toLocaleDateString('ko-KR')}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {assignment.status === 'pending' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleUpdateAssignmentStatus(assignment.id, 'active')}
                              >
                                활성화
                              </Button>
                            )}
                            {assignment.status === 'active' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleUpdateAssignmentStatus(assignment.id, 'completed')}
                              >
                                완료
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
