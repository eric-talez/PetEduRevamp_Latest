import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Filter, UserPlus, Eye, Edit, Trash2, Shield, Users, UserCheck, Building2, PawPrint, Crown, Loader2, Heart, GraduationCap, RefreshCw, Check, X, Clock, User, Building, BookOpen, AlertCircle, MessageSquare, CheckCircle, XCircle, FileText, MapPin, Phone, Mail, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { getCSRFToken } from "@/lib/csrf";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";

interface MemberStatusData {
  membersByRole: {
    'pet-owner': any[];
    'trainer': any[];
    'institute-admin': any[];
    'admin': any[];
  };
  instituteMemberships: any[];
  trainerConnections: any[];
  summary: {
    totalUsers: number;
    totalTrainers: number;
    totalInstitutes: number;
    totalPets: number;
    petOwners: number;
    instituteAdmins: number;
    verifiedMembers: number;
  };
}

function MembersStatusTab() {
  const [data, setData] = useState<MemberStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembersStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/members-status');

      if (!response.ok) {
        throw new Error('회원 상태 정보를 가져오는데 실패했습니다.');
      }

      const result = await response.json();

      if (result.success && result.data) {
        setData(result.data);
      } else {
        console.error('회원 상태 조회 실패:', result.message);
        setError(result.message || '데이터를 가져오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('회원 상태 조회 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembersStatus();
  }, []);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive';
      case 'institute-admin': return 'bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning';
      case 'trainer': return 'bg-success/10 text-success dark:bg-success/20 dark:text-success';
      case 'pet-owner': return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return '관리자';
      case 'institute-admin': return '기관 관리자';
      case 'trainer': return '훈련사';
      case 'pet-owner': return '견주';
      default: return '일반 사용자';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-4 h-4" />;
      case 'institute-admin': return <Building2 className="w-4 h-4" />;
      case 'trainer': return <GraduationCap className="w-4 h-4" />;
      case 'pet-owner': return <Heart className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">회원 상태 정보 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchMembersStatus}>
            <RefreshCw className="w-4 h-4 mr-2" />
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="text-muted-foreground">데이터를 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">회원 현황 및 매칭 관리</h1>
          <p className="text-muted-foreground mt-1">등록된 회원과 기관 매칭 상태를 관리합니다.</p>
        </div>
        <Button onClick={fetchMembersStatus} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          새로고침
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 회원</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.summary?.totalUsers || 0}명</div>
            <p className="text-xs text-muted-foreground">
              인증 회원: {data?.summary?.verifiedMembers || 0}명
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">견주 회원</CardTitle>
            <PawPrint className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.summary?.petOwners || 0}명</div>
            <p className="text-xs text-muted-foreground">
              반려동물: {data?.summary?.totalPets || 0}마리
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전문 훈련사</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.summary?.totalTrainers || 0}명</div>
            <p className="text-xs text-muted-foreground">
              등록된 전문 훈련사
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">기관 관리자</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.summary?.instituteAdmins || 0}명</div>
            <p className="text-xs text-muted-foreground">
              총 {data?.summary?.totalInstitutes || 0}개 기관
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">역할별 회원</TabsTrigger>
          <TabsTrigger value="institutes">기관 매칭</TabsTrigger>
          <TabsTrigger value="connections">훈련사 연결</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(data?.membersByRole || {}).map(([role, members]) => (
              <Card key={role}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getRoleIcon(role)}
                    {getRoleLabel(role)} ({members.length}명)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {members.length === 0 ? (
                        <p className="text-sm text-muted-foreground">등록된 회원이 없습니다.</p>
                      ) : (
                        members.map((member: any) => (
                          <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                {member.avatar ? (
                                  <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full" />
                                ) : (
                                  <span className="text-xs">{member.name.substring(0, 1)}</span>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{member.name}</p>
                                <p className="text-xs text-muted-foreground">{member.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {member.isVerified && (
                                <Shield className="w-4 h-4 text-success" />
                              )}
                              <Badge className={getRoleColor(member.role)}>
                                {getRoleLabel(member.role)}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="institutes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>기관 소속 회원 현황</CardTitle>
              <CardDescription>
                기관에 소속된 회원들의 매칭 상태를 확인할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data?.instituteMemberships?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  기관에 소속된 회원이 없습니다.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>회원명</TableHead>
                      <TableHead>역할</TableHead>
                      <TableHead>소속 기관</TableHead>
                      <TableHead>가입일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.instituteMemberships?.map((membership: any, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {membership.userName}
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleColor(membership.userRole)}>
                            {getRoleLabel(membership.userRole)}
                          </Badge>
                        </TableCell>
                        <TableCell>{membership.instituteName}</TableCell>
                        <TableCell>
                          {new Date(membership.joinedAt).toLocaleDateString('ko-KR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>훈련사-견주 연결 현황</CardTitle>
              <CardDescription>
                훈련사와 연결된 견주들의 관계를 확인할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data?.trainerConnections?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  연결된 훈련사-견주 관계가 없습니다.
                </p>
              ) : (
                <div className="space-y-4">
                  {data?.trainerConnections?.map((connection: any, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <GraduationCap className="w-5 h-5 text-success" />
                        <h4 className="font-semibold">{connection.trainerName} 훈련사</h4>
                        <Badge variant="outline">
                          {connection.connectedOwners.length}명 연결
                        </Badge>
                      </div>
                      <div className="grid gap-2 ml-7">
                        {connection.connectedOwners.map((owner: any) => (
                          <div key={owner.id} className="flex items-center gap-2 text-sm">
                            <Heart className="w-4 h-4 text-primary" />
                            <span>{owner.name}</span>
                            <span className="text-muted-foreground">({owner.email})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface PendingApproval {
  id: number;
  type: 'user' | 'institute' | 'course' | 'trainer';
  applicantName: string;
  applicantEmail: string;
  appliedAt: string;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected';
  details: {
    title?: string;
    description?: string;
    experience?: string;
    certification?: string;
    instituteName?: string;
    businessNumber?: string;
    address?: string;
  };
  documents?: string[];
}

function ApprovalsTab() {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [filteredApprovals, setFilteredApprovals] = useState<PendingApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadApprovals();
  }, []);

  useEffect(() => {
    filterApprovals();
  }, [approvals, searchTerm, statusFilter, typeFilter]);

  const loadApprovals = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('GET', '/api/admin/users/pending');
      const data = await response.json();
      
      if (data.success && data.users && data.users.length > 0) {
        const realApprovals: PendingApproval[] = data.users.map((user: any) => ({
          id: user.id,
          type: user.role === 'trainer' ? 'trainer' : user.role === 'institute_admin' ? 'institute' : 'user',
          applicantName: user.name || user.username,
          applicantEmail: user.email,
          appliedAt: user.createdAt,
          status: 'pending' as const,
          details: {
            title: user.role === 'trainer' ? '훈련사 등록 신청' : 
                   user.role === 'institute_admin' ? '기관 관리자 등록 신청' : 
                   '사용자 계정 승인 요청',
            description: `${user.role} 역할로 등록 요청`
          }
        }));
        setApprovals(realApprovals);
      } else {
        setApprovals([]);
      }
    } catch (error) {
      console.error('승인 목록 로딩 실패:', error);
      toast({
        title: "데이터 로딩 실패",
        description: "승인 목록을 불러올 수 없습니다.",
        variant: "destructive"
      });
      setApprovals([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterApprovals = () => {
    let filtered = approvals;
    if (searchTerm) {
      filtered = filtered.filter(approval => 
        approval.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        approval.applicantEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        approval.details.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(approval => approval.status === statusFilter);
    }
    if (typeFilter !== 'all') {
      filtered = filtered.filter(approval => approval.type === typeFilter);
    }
    setFilteredApprovals(filtered);
  };

  const handleApprovalAction = async (approvalId: number, action: 'approve' | 'reject', comment?: string) => {
    setIsProcessing(true);
    try {
      const endpoint = action === 'approve' 
        ? `/api/admin/users/${approvalId}/approve`
        : `/api/admin/users/${approvalId}/reject`;
      const body = action === 'reject' && comment ? { reason: comment } : undefined;
      const response = await apiRequest('POST', endpoint, body);
      const data = await response.json();
      if (data.success) {
        setApprovals(prev => prev.filter(approval => approval.id !== approvalId));
        toast({
          title: action === 'approve' ? "승인 완료" : "거부 완료",
          description: `${action === 'approve' ? '승인' : '거부'}이 정상적으로 처리되었습니다.`,
          variant: action === 'approve' ? "default" : "destructive"
        });
        setIsDetailModalOpen(false);
        setSelectedApproval(null);
        setReviewComment('');
      } else {
        throw new Error(data.message || '처리 실패');
      }
    } catch (error) {
      console.error('승인 처리 실패:', error);
      toast({
        title: "처리 실패",
        description: "승인 처리 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewDetail = (approval: PendingApproval) => {
    setSelectedApproval(approval);
    setIsDetailModalOpen(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'user': return <User className="h-4 w-4" />;
      case 'institute': return <Building className="h-4 w-4" />;
      case 'trainer': return <User className="h-4 w-4" />;
      case 'course': return <BookOpen className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'user': return '반려인';
      case 'institute': return '기관';
      case 'trainer': return '훈련사';
      case 'course': return '강좌';
      default: return '기타';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-warning/10 text-warning">대기중</Badge>;
      case 'reviewing':
        return <Badge variant="secondary" className="bg-primary/10 text-primary">검토중</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-success/10 text-success">승인됨</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-destructive/10 text-destructive">거부됨</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">승인 관리</h1>
        <p className="text-gray-600">사용자, 기관, 훈련사 및 강좌 등록 신청을 검토하고 승인 처리합니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">전체 대기</p>
                <p className="text-2xl font-bold">{approvals.filter(a => a.status === 'pending').length}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">검토중</p>
                <p className="text-2xl font-bold">{approvals.filter(a => a.status === 'reviewing').length}</p>
              </div>
              <Eye className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">승인됨</p>
                <p className="text-2xl font-bold">{approvals.filter(a => a.status === 'approved').length}</p>
              </div>
              <Check className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">거부됨</p>
                <p className="text-2xl font-bold">{approvals.filter(a => a.status === 'rejected').length}</p>
              </div>
              <X className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="이름, 이메일 또는 제목으로 검색..."
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
                <SelectItem value="reviewing">검토중</SelectItem>
                <SelectItem value="approved">승인됨</SelectItem>
                <SelectItem value="rejected">거부됨</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="유형 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 유형</SelectItem>
                <SelectItem value="user">반려인</SelectItem>
                <SelectItem value="trainer">훈련사</SelectItem>
                <SelectItem value="institute">기관</SelectItem>
                <SelectItem value="course">강좌</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>승인 대기 목록</CardTitle>
          <CardDescription>총 {filteredApprovals.length}건의 신청이 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <PageSkeleton header={false} variant="list" count={5} className="p-0" />
          ) : filteredApprovals.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">조건에 맞는 승인 신청이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApprovals.map((approval) => (
                <div key={approval.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={`https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100&q=80`} />
                      <AvatarFallback>{approval.applicantName[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {getTypeIcon(approval.type)}
                        <span className="font-semibold">{approval.applicantName}</span>
                        <Badge variant="outline">{getTypeName(approval.type)}</Badge>
                        {getStatusBadge(approval.status)}
                      </div>
                      <p className="text-sm text-gray-600">{approval.details.title}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(approval.appliedAt).toLocaleDateString()} 신청
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleViewDetail(approval)}>
                      <Eye className="h-4 w-4 mr-1" /> 상세보기
                    </Button>
                    {approval.status === 'pending' && (
                      <>
                        <Button variant="outline" size="sm" className="text-success border-success/50 hover:bg-success/10" onClick={() => handleApprovalAction(approval.id, 'approve')} disabled={isProcessing}>
                          <Check className="h-4 w-4 mr-1" /> 승인
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive border-destructive/50 hover:bg-destructive/10" onClick={() => handleApprovalAction(approval.id, 'reject')} disabled={isProcessing}>
                          <X className="h-4 w-4 mr-1" /> 거부
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

      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedApproval && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getTypeIcon(selectedApproval.type)}
                  {selectedApproval.details.title}
                </DialogTitle>
                <DialogDescription>
                  {getTypeName(selectedApproval.type)} 등록 신청 상세 정보
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">신청자</Label>
                    <p className="mt-1 font-semibold">{selectedApproval.applicantName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">이메일</Label>
                    <p className="mt-1">{selectedApproval.applicantEmail}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">신청일</Label>
                    <p className="mt-1">{new Date(selectedApproval.appliedAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">현재 상태</Label>
                    <div className="mt-1">{getStatusBadge(selectedApproval.status)}</div>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">상세 설명</Label>
                  <p className="mt-1 text-gray-700">{selectedApproval.details.description}</p>
                </div>
                {selectedApproval.details.experience && (
                  <div>
                    <Label className="text-sm font-medium">경력</Label>
                    <p className="mt-1">{selectedApproval.details.experience}</p>
                  </div>
                )}
                {selectedApproval.details.certification && (
                  <div>
                    <Label className="text-sm font-medium">자격증/인증</Label>
                    <p className="mt-1">{selectedApproval.details.certification}</p>
                  </div>
                )}
                {selectedApproval.details.instituteName && (
                  <div>
                    <Label className="text-sm font-medium">기관명</Label>
                    <p className="mt-1">{selectedApproval.details.instituteName}</p>
                  </div>
                )}
                {selectedApproval.details.businessNumber && (
                  <div>
                    <Label className="text-sm font-medium">사업자등록번호</Label>
                    <p className="mt-1">{selectedApproval.details.businessNumber}</p>
                  </div>
                )}
                {selectedApproval.details.address && (
                  <div>
                    <Label className="text-sm font-medium">주소</Label>
                    <p className="mt-1">{selectedApproval.details.address}</p>
                  </div>
                )}
                {selectedApproval.status === 'pending' && (
                  <div>
                    <Label className="text-sm font-medium">검토 의견</Label>
                    <Textarea
                      placeholder="승인/거부 시 전달할 메시지를 입력하세요..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                )}
                {selectedApproval.status === 'pending' && (
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsDetailModalOpen(false)} disabled={isProcessing}>닫기</Button>
                    <Button variant="outline" className="text-destructive border-destructive/50 hover:bg-destructive/10" onClick={() => handleApprovalAction(selectedApproval.id, 'reject', reviewComment)} disabled={isProcessing}>
                      {isProcessing ? '처리중...' : '거부'}
                    </Button>
                    <Button className="bg-success hover:bg-success/90" onClick={() => handleApprovalAction(selectedApproval.id, 'approve', reviewComment)} disabled={isProcessing}>
                      {isProcessing ? '처리중...' : '승인'}
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

interface RegistrationApplication {
  id: string;
  type: 'trainer' | 'institute' | 'curriculum';
  applicantInfo: any;
  documents?: any;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewerId?: string;
  reviewedAt?: string;
  notes?: string;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return <Badge className="bg-warning/10 text-warning border-warning/20">검토 중</Badge>;
    case 'approved':
      return <Badge className="bg-success/10 text-success border-success/20">승인됨</Badge>;
    case 'rejected':
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20">거부됨</Badge>;
    default:
      return <Badge variant="secondary">알 수 없음</Badge>;
  }
}

function TypeBadge({ type }: { type: string }) {
  switch (type) {
    case 'trainer':
      return <Badge variant="outline" className="text-primary border-primary/20">훈련사</Badge>;
    case 'institute':
      return <Badge variant="outline" className="text-purple-600 border-purple-200">기관</Badge>;
    case 'curriculum':
      return <Badge variant="secondary">커리큘럼</Badge>;
    default:
      return <Badge variant="secondary">알 수 없음</Badge>;
  }
}

function ApplicationDetails({ application, reviewNotes, setReviewNotes, onReview }: { 
  application: RegistrationApplication; 
  reviewNotes: string; 
  setReviewNotes: (notes: string) => void; 
  onReview: (id: string, status: 'approved' | 'rejected' | 'pending') => void; 
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {application.type === 'trainer' ? '훈련사 등록 신청 상세' :
           application.type === 'institute' ? '기관 등록 신청 상세' :
           '커리큘럼 발행 신청 상세'}
        </h2>
        <StatusBadge status={application.status} />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          {application.type === 'trainer' ? <User className="w-5 h-5" /> :
           application.type === 'institute' ? <Building className="w-5 h-5" /> :
           <FileText className="w-5 h-5" />}
          기본 정보
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {application.type === 'trainer' && (
            <>
              <div><Label>이름</Label><p className="mt-1 p-2 border rounded">{application.applicantInfo?.personalInfo?.name || '-'}</p></div>
              <div><Label>연락처</Label><p className="mt-1 p-2 border rounded">{application.applicantInfo?.personalInfo?.phone || '-'}</p></div>
              <div><Label>이메일</Label><p className="mt-1 p-2 border rounded">{application.applicantInfo?.personalInfo?.email || '-'}</p></div>
              <div><Label>주소</Label><p className="mt-1 p-2 border rounded">{application.applicantInfo?.personalInfo?.address || '-'}</p></div>
            </>
          )}
          {application.type === 'institute' && (
            <>
              <div><Label>기관명</Label><p className="mt-1 p-2 border rounded">{application.applicantInfo?.basicInfo?.instituteName || '-'}</p></div>
              <div><Label>설립년도</Label><p className="mt-1 p-2 border rounded">{application.applicantInfo?.basicInfo?.establishedYear || '-'}</p></div>
              <div><Label>연락처</Label><p className="mt-1 p-2 border rounded">{application.applicantInfo?.basicInfo?.phone || '-'}</p></div>
              <div><Label>이메일</Label><p className="mt-1 p-2 border rounded">{application.applicantInfo?.basicInfo?.email || '-'}</p></div>
            </>
          )}
          {application.type === 'curriculum' && (
            <>
              <div><Label>제목</Label><p className="mt-1 p-2 border rounded">{application.applicantInfo?.curriculumInfo?.title || '-'}</p></div>
              <div><Label>카테고리</Label><p className="mt-1 p-2 border rounded">{application.applicantInfo?.curriculumInfo?.category || '-'}</p></div>
              <div><Label>작성자</Label><p className="mt-1 p-2 border rounded">{application.applicantInfo?.curriculumInfo?.trainerName || '-'}</p></div>
              <div><Label>가격</Label><p className="mt-1 p-2 border rounded">₩{(application.applicantInfo?.curriculumInfo?.price || 0).toLocaleString()}</p></div>
            </>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">{application.status === 'pending' ? '검토' : '상태 변경'}</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="review-notes">검토 의견</Label>
            <Textarea id="review-notes" placeholder="승인/거부/초기화 사유를 입력하세요..." value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} className="mt-1" />
          </div>
          <div className="flex gap-2">
            {application.status !== 'approved' && (
              <Button onClick={() => onReview(application.id, 'approved')} className="bg-success hover:bg-success/90">
                <CheckCircle className="w-4 h-4 mr-2" /> 승인
              </Button>
            )}
            {application.status !== 'rejected' && (
              <Button onClick={() => onReview(application.id, 'rejected')} variant="destructive">
                <XCircle className="w-4 h-4 mr-2" /> 거부
              </Button>
            )}
            <Button onClick={() => onReview(application.id, 'pending')} variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">
              <RotateCcw className="w-4 h-4 mr-2" /> 초기화
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegistrationsTab() {
  const [applications, setApplications] = useState<RegistrationApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<RegistrationApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/registrations');
      if (!response.ok) throw new Error('데이터 로딩 실패');
      const data = await response.json();
      setApplications(data.applications || []);
    } catch (error) {
      console.error('데이터 가져오기 실패:', error);
      toast({ title: "오류", description: "데이터를 불러오는데 실패했습니다.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id: string, status: 'approved' | 'rejected' | 'pending') => {
    try {
      const response = await fetch(`/api/admin/registrations/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes: reviewNotes })
      });
      if (!response.ok) throw new Error('검토 처리 실패');
      fetchApplications();
      if (selectedApplication) {
        setSelectedApplication({ ...selectedApplication, status, notes: reviewNotes, reviewedAt: new Date().toISOString() });
      }
      setReviewNotes('');
      toast({ title: "성공", description: `신청이 ${status === 'approved' ? '승인' : status === 'rejected' ? '거부' : '초기화'}되었습니다.` });
    } catch (error) {
      toast({ title: "오류", description: "검토 처리에 실패했습니다.", variant: "destructive" });
    }
  };

  const handleClearProcessed = async () => {
    try {
      const response = await fetch('/api/admin/registrations/clear-processed', { method: 'DELETE' });
      if (!response.ok) throw new Error('초기화 실패');
      fetchApplications();
      if (selectedApplication && ['approved', 'rejected'].includes(selectedApplication.status)) {
        setSelectedApplication(null);
      }
      toast({ title: "성공", description: "처리 완료된 신청이 초기화되었습니다." });
    } catch (error) {
      toast({ title: "오류", description: "초기화 중 오류가 발생했습니다.", variant: "destructive" });
    }
  };

  const stats = {
    pending: applications.filter(app => app.status === 'pending').length,
    approved: applications.filter(app => app.status === 'approved').length,
    rejected: applications.filter(app => app.status === 'rejected').length,
    total: applications.length
  };

  const filteredApplications = applications.filter(app => activeSubTab === 'all' || app.status === activeSubTab);

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">등록 신청 관리</h1>
        {(stats.approved > 0 || stats.rejected > 0) && (
          <Button onClick={handleClearProcessed} variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10">
            <Trash2 className="w-4 h-4 mr-2" /> 초기화 (승인: {stats.approved}, 거부: {stats.rejected})
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-sm text-gray-600">대기 중</p><p className="text-2xl font-bold text-primary">{stats.pending}</p></div><Clock className="w-8 h-8 text-primary" /></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-sm text-gray-600">승인됨</p><p className="text-2xl font-bold text-success">{stats.approved}</p></div><CheckCircle className="w-8 h-8 text-success" /></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-sm text-gray-600">거부됨</p><p className="text-2xl font-bold text-destructive">{stats.rejected}</p></div><XCircle className="w-8 h-8 text-destructive" /></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-sm text-gray-600">전체</p><p className="text-2xl font-bold text-primary">{stats.total}</p></div><FileText className="w-8 h-8 text-primary" /></CardContent></Card>
      </div>

      <div className="mb-6 border-b">
        <nav className="-mb-px flex space-x-8">
          {['all', 'pending', 'approved', 'rejected'].map(tab => (
            <button key={tab} onClick={() => setActiveSubTab(tab as any)} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeSubTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab === 'all' ? '전체' : tab === 'pending' ? '대기 중' : tab === 'approved' ? '승인됨' : '거부됨'} ({tab === 'all' ? stats.total : stats[tab as keyof typeof stats]})
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {filteredApplications.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-gray-500">등록 신청이 없습니다.</CardContent></Card>
          ) : (
            filteredApplications.map(app => (
              <Card key={app.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedApplication(app)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {app.type === 'trainer' ? <User className="w-6 h-6 text-primary" /> : app.type === 'institute' ? <Building className="w-6 h-6 text-primary" /> : <FileText className="w-6 h-6 text-success" />}
                      <div><h3 className="font-semibold">{app.type === 'trainer' ? app.applicantInfo?.personalInfo?.name : app.type === 'institute' ? app.applicantInfo?.basicInfo?.instituteName : app.applicantInfo?.curriculumInfo?.title}</h3><p className="text-sm text-gray-600">{new Date(app.submittedAt).toLocaleDateString()}</p></div>
                    </div>
                    <div className="flex flex-col gap-1 items-end"><TypeBadge type={app.type} /><StatusBadge status={app.status} /></div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        <div>
          {selectedApplication ? <ApplicationDetails application={selectedApplication} reviewNotes={reviewNotes} setReviewNotes={setReviewNotes} onReview={handleReview} /> : <div className="text-center py-12 text-gray-500"><FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />신청을 선택하세요.</div>}
        </div>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "user",
    password: ""
  });

  const queryClient = useQueryClient();

  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['/api/admin/users'],
    select: (data: any) => data?.data || []
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/platform-stats'],
    select: (data: any) => data || {}
  });

  const addUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const csrfToken = await getCSRFToken();
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(userData),
      });
      if (!response.ok) throw new Error('사용자 추가 실패');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/platform-stats'] });
      alert('사용자가 성공적으로 추가되었습니다!');
      setNewUser({ name: "", email: "", role: "user", password: "" });
      setIsAddUserOpen(false);
    },
    onError: (error: any) => {
      console.error('사용자 추가 오류:', error);
      alert(error.message || '사용자 추가 중 오류가 발생했습니다.');
    }
  });

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      alert("모든 필드를 입력해주세요.");
      return;
    }
    addUserMutation.mutate(newUser);
  };

  const usersByRole = (users || []).reduce((acc: any, user: any) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {});

  const activeUsers = (users || []).filter((user: any) => {
    if (!user.lastLogin) return false;
    const lastLogin = new Date(user.lastLogin);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return lastLogin > thirtyDaysAgo;
  }).length;

  const filteredUsers = (users || []).filter((user: any) => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-destructive/10 text-destructive"><Shield className="w-3 h-3 mr-1" />관리자</Badge>;
      case 'trainer':
        return <Badge className="bg-primary/10 text-primary">훈련사</Badge>;
      case 'institute-admin':
        return <Badge className="bg-primary/10 text-primary">기관관리자</Badge>;
      case 'user':
        return <Badge className="bg-success/10 text-success">일반회원</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success/10 text-success">활성</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">비활성</Badge>;
      case 'suspended':
        return <Badge className="bg-destructive/10 text-destructive">정지</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Tabs defaultValue="users" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="users">사용자 목록</TabsTrigger>
        <TabsTrigger value="members">회원 현황</TabsTrigger>
        <TabsTrigger value="approvals">승인 대기</TabsTrigger>
        <TabsTrigger value="registrations">등록 신청</TabsTrigger>
      </TabsList>
      <TabsContent value="users">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">사용자 관리</h1>
          <p className="text-muted-foreground">플랫폼의 모든 사용자를 관리합니다</p>
        </div>
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              신규 사용자 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>신규 사용자 추가</DialogTitle>
              <DialogDescription>
                새로운 사용자를 플랫폼에 등록합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">이름</Label>
                <Input id="name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="col-span-3" placeholder="홍길동" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">이메일</Label>
                <Input id="email" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="col-span-3" placeholder="user@example.com" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">비밀번호</Label>
                <Input id="password" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="col-span-3" placeholder="••••••••" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">역할</Label>
                <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">일반회원</SelectItem>
                    <SelectItem value="trainer">훈련사</SelectItem>
                    <SelectItem value="institute-admin">기관관리자</SelectItem>
                    <SelectItem value="admin">관리자</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddUser} disabled={addUserMutation.isPending}>
                {addUserMutation.isPending ? '추가 중...' : '사용자 추가'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">전체 사용자</CardTitle></CardHeader><CardContent>{statsLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{users.length || 0}</div>}<p className="text-xs text-muted-foreground">실시간 업데이트</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">활성 사용자</CardTitle></CardHeader><CardContent>{statsLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{activeUsers}</div>}<p className="text-xs text-muted-foreground">최근 30일 내 접속</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">훈련사</CardTitle></CardHeader><CardContent>{statsLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{usersByRole['trainer'] || 0}</div>}<p className="text-xs text-muted-foreground">전문 훈련사</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">기관관리자</CardTitle></CardHeader><CardContent>{statsLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{usersByRole['institute-admin'] || 0}</div>}<p className="text-xs text-muted-foreground">기관 관리자</p></CardContent></Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>사용자 목록</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="사용자명, 이메일로 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="역할 필터" /></SelectTrigger>
              <SelectContent><SelectItem value="all">전체</SelectItem><SelectItem value="admin">관리자</SelectItem><SelectItem value="trainer">훈련사</SelectItem><SelectItem value="institute-admin">기관관리자</SelectItem><SelectItem value="user">일반회원</SelectItem></SelectContent>
            </Select>
            <Button variant="outline"><Filter className="h-4 w-4 mr-2" />고급 필터</Button>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-7 gap-4 p-4 font-medium border-b bg-muted/50"><div>사용자명</div><div>이메일</div><div>역할</div><div>상태</div><div>최종 접속</div><div>가입일</div><div>작업</div></div>
            {usersLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="grid grid-cols-7 gap-4 p-4 border-b">
                  <Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-12" /><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-16" />
                  <div className="flex gap-2"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></div>
                </div>
              ))
            ) : usersError ? (
              <div className="p-8 text-center text-destructive">데이터를 불러오는 중 오류가 발생했습니다.</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">{searchTerm || roleFilter !== 'all' ? '검색 결과가 없습니다.' : '등록된 사용자가 없습니다.'}</div>
            ) : (
              filteredUsers.map((user: any) => (
                <div key={user.id} className="grid grid-cols-7 gap-4 p-4 border-b last:border-b-0">
                  <div className="font-medium">{user.name}</div><div className="text-sm text-muted-foreground truncate">{user.email}</div><div>{getRoleBadge(user.role)}</div><div>{getStatusBadge(user.isVerified ? 'active' : 'inactive')}</div><div className="text-sm">{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('ko-KR') : '없음'}</div><div className="text-sm">{new Date(user.createdAt).toLocaleDateString('ko-KR')}</div>
                  <div className="flex gap-2"><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="sm"><Trash2 className="h-4 w-4" /></Button></div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="members"><MembersStatusTab /></TabsContent>
      <TabsContent value="approvals"><ApprovalsTab /></TabsContent>
      <TabsContent value="registrations"><RegistrationsTab /></TabsContent>
    </Tabs>
    </div>
  );
}
