import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  UserCheck, 
  Clock, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Loader2,
  Eye,
  Mail,
  Calendar
} from 'lucide-react';

interface TrainerApplication {
  id: number;
  trainerId: number;
  instituteId: number;
  status: string;
  applicationMessage: string | null;
  appliedAt: string;
  trainerName: string | null;
  trainerEmail: string | null;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return <Badge variant="warning" className="flex items-center gap-1"><Clock className="w-3 h-3" /> 대기 중</Badge>;
    case 'approved':
      return <Badge variant="success" className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> 승인됨</Badge>;
    case 'rejected':
      return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="w-3 h-3" /> 거부됨</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function TrainerApprovals() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<TrainerApplication[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<TrainerApplication | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/institute/trainer-applications');
      const data = await response.json();
      
      if (data.success) {
        setApplications(data.data || []);
      } else {
        console.error('신청 목록 조회 실패:', data.message);
      }
    } catch (error) {
      console.error('신청 목록 조회 오류:', error);
      toast({
        title: "오류",
        description: "신청 목록을 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleApprove = async (id: number) => {
    try {
      setProcessing(true);
      const response = await apiRequest(`/api/institute/trainer-applications/${id}/approve`, {
        method: 'POST'
      });
      
      if (response.success) {
        toast({
          title: "승인 완료",
          description: "훈련사 연결 신청이 승인되었습니다."
        });
        setIsDetailOpen(false);
        fetchApplications();
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "승인 처리에 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApplication) return;
    
    try {
      setProcessing(true);
      const response = await apiRequest(`/api/institute/trainer-applications/${selectedApplication.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason })
      });
      
      if (response.success) {
        toast({
          title: "거부 완료",
          description: "훈련사 연결 신청이 거부되었습니다."
        });
        setIsRejectDialogOpen(false);
        setIsDetailOpen(false);
        setRejectReason('');
        fetchApplications();
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "거부 처리에 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const openDetail = (app: TrainerApplication) => {
    setSelectedApplication(app);
    setIsDetailOpen(true);
  };

  const openRejectDialog = (app: TrainerApplication) => {
    setSelectedApplication(app);
    setIsRejectDialogOpen(true);
  };

  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const approvedCount = applications.filter(a => a.status === 'approved').length;
  const rejectedCount = applications.filter(a => a.status === 'rejected').length;

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
            <UserCheck className="w-6 h-6" />
            훈련사 연결 승인
          </h1>
          <p className="text-muted-foreground mt-1">훈련사의 기관 연결 신청을 관리합니다.</p>
        </div>
        <Button onClick={fetchApplications} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          새로고침
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-warning/10 rounded-lg">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">대기 중</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-success/10 rounded-lg">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">승인됨</p>
                <p className="text-2xl font-bold">{approvedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-destructive/10 rounded-lg">
                <XCircle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">거부됨</p>
                <p className="text-2xl font-bold">{rejectedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>연결 신청 목록</CardTitle>
          <CardDescription>훈련사가 기관 연결을 신청한 내역입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              연결 신청 내역이 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>훈련사</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>신청일</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.trainerName || `훈련사 #${app.trainerId}`}</TableCell>
                    <TableCell>{app.trainerEmail || '-'}</TableCell>
                    <TableCell><StatusBadge status={app.status} /></TableCell>
                    <TableCell>{new Date(app.appliedAt).toLocaleDateString('ko-KR')}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => openDetail(app)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {app.status === 'pending' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => handleApprove(app.id)}
                              disabled={processing}
                            >
                              승인
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => openRejectDialog(app)}
                              disabled={processing}
                            >
                              거부
                            </Button>
                          </>
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

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>신청 상세 정보</DialogTitle>
            <DialogDescription>훈련사의 기관 연결 신청 상세 정보입니다.</DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">훈련사</p>
                  <p className="font-medium">{selectedApplication.trainerName || `훈련사 #${selectedApplication.trainerId}`}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">이메일</p>
                  <p className="font-medium">{selectedApplication.trainerEmail || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">신청일</p>
                  <p className="font-medium">{new Date(selectedApplication.appliedAt).toLocaleString('ko-KR')}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">신청 메시지</p>
                <p className="p-3 bg-muted rounded-md">{selectedApplication.applicationMessage || '메시지 없음'}</p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">상태:</p>
                <StatusBadge status={selectedApplication.status} />
              </div>
            </div>
          )}
          {selectedApplication?.status === 'pending' && (
            <DialogFooter>
              <Button 
                variant="destructive" 
                onClick={() => {
                  setIsDetailOpen(false);
                  openRejectDialog(selectedApplication);
                }}
                disabled={processing}
              >
                거부
              </Button>
              <Button 
                onClick={() => handleApprove(selectedApplication.id)}
                disabled={processing}
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                승인
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>연결 신청 거부</DialogTitle>
            <DialogDescription>거부 사유를 입력해주세요.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>거부 사유</Label>
            <Textarea 
              placeholder="거부 사유를 입력하세요..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>취소</Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              거부
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
