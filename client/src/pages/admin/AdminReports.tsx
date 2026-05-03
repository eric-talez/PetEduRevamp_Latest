import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Search,
  AlertTriangle,
  Check,
  X,
  Eye,
  Clock,
  MessageSquare,
  Flag,
  User,
  FileText,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface Report {
  id: number;
  reportType: 'spam' | 'inappropriate' | 'harassment' | 'fake' | 'other';
  reporterId: number | null;
  targetType: 'user' | 'course' | 'comment' | 'post' | 'product' | 'content';
  targetId: number;
  targetName: string | null;
  reason: string;
  description: string | null;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  resolvedBy?: number | null;
  resolvedAt?: string | null;
  resolutionComment?: string | null;
}

interface ReportStats {
  pending: number;
  investigating: number;
  resolved: number;
  dismissed: number;
  urgent: number;
  total: number;
}

export default function AdminReports() {
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [actionComment, setActionComment] = useState('');
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ success: boolean; data: { reports: Report[]; stats: ReportStats } }>({
    queryKey: ['/api/admin/reports'],
  });
  const reports: Report[] = data?.data?.reports ?? [];
  const stats: ReportStats = data?.data?.stats ?? {
    pending: 0, investigating: 0, resolved: 0, dismissed: 0, urgent: 0, total: 0,
  };

  const updateMutation = useMutation({
    mutationFn: async (vars: { id: number; status: 'resolved' | 'dismissed'; comment?: string }) => {
      const res = await apiRequest('PATCH', `/api/admin/reports/${vars.id}`, {
        status: vars.status,
        resolutionComment: vars.comment || undefined,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard/stats'] });
      toast({
        title: vars.status === 'resolved' ? '처리 완료' : '기각 완료',
        description: `신고가 ${vars.status === 'resolved' ? '처리' : '기각'}되었습니다.`,
      });
      setIsDetailModalOpen(false);
      setSelectedReport(null);
      setActionComment('');
    },
    onError: () => {
      toast({ title: '처리 실패', description: '신고 처리 중 오류가 발생했습니다.', variant: 'destructive' });
    },
  });
  const isProcessing = updateMutation.isPending;

  useEffect(() => {
    let filtered = reports;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        (r.targetName || '').toLowerCase().includes(term) ||
        (r.reason || '').toLowerCase().includes(term) ||
        String(r.reporterId ?? '').includes(term)
      );
    }
    if (statusFilter !== 'all') filtered = filtered.filter(r => r.status === statusFilter);
    if (priorityFilter !== 'all') filtered = filtered.filter(r => r.priority === priorityFilter);
    setFilteredReports(filtered);
  }, [reports, searchTerm, statusFilter, priorityFilter]);

  const handleReportAction = (reportId: number, action: 'resolve' | 'dismiss', comment?: string) => {
    updateMutation.mutate({
      id: reportId,
      status: action === 'resolve' ? 'resolved' : 'dismissed',
      comment,
    });
  };

  const handleViewDetail = (report: Report) => {
    setSelectedReport(report);
    setIsDetailModalOpen(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'spam': return <MessageSquare className="h-4 w-4" />;
      case 'inappropriate': return <Flag className="h-4 w-4" />;
      case 'harassment': return <AlertTriangle className="h-4 w-4" />;
      case 'fake': return <User className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'spam': return '스팸';
      case 'inappropriate': return '부적절한 내용';
      case 'harassment': return '괴롭힘';
      case 'fake': return '허위 정보';
      default: return '기타';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">긴급</Badge>;
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800">높음</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">보통</Badge>;
      case 'low':
        return <Badge variant="secondary">낮음</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">대기중</Badge>;
      case 'investigating':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">조사중</Badge>;
      case 'resolved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">처리됨</Badge>;
      case 'dismissed':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">기각됨</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">신고 관리</h1>
        <p className="text-gray-600">사용자 신고를 검토하고 적절한 조치를 취합니다.</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">대기중</p>
                <p className="text-2xl font-bold" data-testid="stat-pending">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">조사중</p>
                <p className="text-2xl font-bold" data-testid="stat-investigating">{stats.investigating}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">긴급</p>
                <p className="text-2xl font-bold" data-testid="stat-urgent">{stats.urgent}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">처리됨</p>
                <p className="text-2xl font-bold" data-testid="stat-resolved">{stats.resolved}</p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 및 검색 */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="신고 내용이나 신고자로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 상태</SelectItem>
                <SelectItem value="pending">대기중</SelectItem>
                <SelectItem value="investigating">조사중</SelectItem>
                <SelectItem value="resolved">처리됨</SelectItem>
                <SelectItem value="dismissed">기각됨</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="우선순위" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 우선순위</SelectItem>
                <SelectItem value="urgent">긴급</SelectItem>
                <SelectItem value="high">높음</SelectItem>
                <SelectItem value="medium">보통</SelectItem>
                <SelectItem value="low">낮음</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 신고 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>신고 목록</CardTitle>
          <CardDescription>총 {filteredReports.length}건의 신고가 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="rounded-full bg-gray-200 h-12 w-12"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-8">
              <Flag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">조건에 맞는 신고가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarFallback>{report.reporterId ? `#${report.reporterId}` : '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {getTypeIcon(report.reportType)}
                        <span className="font-semibold">{report.targetName || `${report.targetType} #${report.targetId}`}</span>
                        <Badge variant="outline">{getTypeName(report.reportType)}</Badge>
                        {getPriorityBadge(report.priority)}
                        {getStatusBadge(report.status)}
                      </div>
                      <p className="text-sm text-gray-600">{report.reason}</p>
                      <p className="text-xs text-gray-400">
                        {report.reporterId ? `신고자 #${report.reporterId}` : '익명'} · {new Date(report.createdAt).toLocaleDateString()} 신고
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDetail(report)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      상세보기
                    </Button>
                    {(report.status === 'pending' || report.status === 'investigating') && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => handleReportAction(report.id, 'resolve')}
                          disabled={isProcessing}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          처리
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => handleReportAction(report.id, 'dismiss')}
                          disabled={isProcessing}
                        >
                          <X className="h-4 w-4 mr-1" />
                          기각
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 상세보기 모달 */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedReport && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getTypeIcon(selectedReport.reportType)}
                  {selectedReport.targetName || `${selectedReport.targetType} #${selectedReport.targetId}`} 신고
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">신고자</Label>
                    <p className="mt-1 font-semibold">{selectedReport.reporterId ? `#${selectedReport.reporterId}` : '익명'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">신고 유형</Label>
                    <p className="mt-1">{getTypeName(selectedReport.reportType)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">우선순위</Label>
                    <div className="mt-1">{getPriorityBadge(selectedReport.priority)}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">현재 상태</Label>
                    <div className="mt-1">{getStatusBadge(selectedReport.status)}</div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">신고 사유</Label>
                  <p className="mt-1 font-semibold">{selectedReport.reason}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">상세 설명</Label>
                  <p className="mt-1 text-gray-700">{selectedReport.description}</p>
                </div>

                {(selectedReport.status === 'pending' || selectedReport.status === 'investigating') && (
                  <div>
                    <Label className="text-sm font-medium">처리 의견</Label>
                    <Textarea
                      placeholder="처리/기각 시 전달할 메시지를 입력하세요..."
                      value={actionComment}
                      onChange={(e) => setActionComment(e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                )}

                {(selectedReport.status === 'pending' || selectedReport.status === 'investigating') && (
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button 
                      variant="outline"
                      onClick={() => setIsDetailModalOpen(false)}
                      disabled={isProcessing}
                    >
                      닫기
                    </Button>
                    <Button 
                      variant="outline"
                      className="text-red-600 border-red-600 hover:bg-red-50"
                      onClick={() => handleReportAction(selectedReport.id, 'dismiss', actionComment)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? '처리중...' : '기각'}
                    </Button>
                    <Button 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleReportAction(selectedReport.id, 'resolve', actionComment)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? '처리중...' : '처리'}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}