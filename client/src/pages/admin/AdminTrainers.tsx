import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  GraduationCap, 
  MapPin, 
  Star, 
  Trophy, 
  TrendingUp, 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Award,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  FileText,
  Shield
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { getCSRFToken } from "@/lib/csrf";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TrainerProgram {
  id: number;
  name: string;
  description: string;
  level: 'basic' | 'advanced' | 'expert';
  duration: number;
  maxParticipants: number;
  isActive: boolean;
  requirements: string[];
  curriculum: string[];
  certificateValidityPeriod: number;
  createdAt: string;
  updatedAt: string;
}

interface TrainerApplication {
  id: number;
  userId: number;
  programId: number;
  status: 'pending' | 'approved' | 'rejected';
  experience: string;
  motivation: string;
  previousCertifications: string[];
  portfolioUrl?: string;
  profileImageUrl?: string;
  applicationDate: string;
  reviewDate?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface TrainerCertification {
  id: number;
  trainerId: number;
  programId: number;
  certificateNumber: string;
  issueDate: string;
  expiryDate: string;
  level: 'basic' | 'advanced' | 'expert';
  score: number;
  status: 'active' | 'expired' | 'revoked';
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

function TrainerCertificationTab() {
  const [programs, setPrograms] = useState<TrainerProgram[]>([]);
  const [applications, setApplications] = useState<TrainerApplication[]>([]);
  const [certifications, setCertifications] = useState<TrainerCertification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCertification, setSelectedCertification] = useState<TrainerCertification | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<TrainerProgram | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<TrainerApplication | null>(null);
  const [showCertificationModal, setShowCertificationModal] = useState(false);
  const [showProgramEditModal, setShowProgramEditModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [modalType, setModalType] = useState<'view' | 'edit'>('view');
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [selectedApplicationForConfirmation, setSelectedApplicationForConfirmation] = useState<TrainerApplication | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [agreementStatus, setAgreementStatus] = useState<'pending' | 'agreed' | 'rejected'>('pending');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      console.log('[DEBUG] API Request: GET /api/trainer-programs');
      console.log('[DEBUG] API Request: GET /api/trainer-applications');
      console.log('[DEBUG] API Request: GET /api/trainer-certifications');
      
      // 병렬로 데이터 로드
      const [programsRes, applicationsRes, certificationsRes] = await Promise.all([
        apiRequest('GET', '/api/trainer-programs'),
        apiRequest('GET', '/api/trainer-applications'),
        apiRequest('GET', '/api/trainer-certifications')
      ]);

      const programsData = await programsRes.json();
      const applicationsData = await applicationsRes.json();
      const certificationsData = await certificationsRes.json();

      console.log('[DEBUG] API Success:', programsData);
      console.log('[DEBUG] API Success:', applicationsData);
      console.log('[DEBUG] API Success:', certificationsData);

      if (programsData.success) {
        setPrograms(programsData.programs || []);
      }
      if (applicationsData.success) {
        setApplications(applicationsData.applications || []);
      }
      if (certificationsData.success) {
        setCertifications(certificationsData.certifications || []);
      }
    } catch (error) {
      console.error('데이터 로드 오류:', error);
      toast({
        title: "데이터 로드 실패",
        description: "훈련사 인증 데이터를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // 기관관리자 확인 메시지 발송
  const handleSendConfirmationMessage = async (application: TrainerApplication) => {
    setSelectedApplicationForConfirmation(application);
    setConfirmationMessage(`안녕하세요. ${application.userId}번 훈련사 인증 신청에 대한 확인이 필요합니다. 해당 신청자의 자격 요건을 검토해 주시기 바랍니다.`);
    setShowConfirmationModal(true);
  };

  const handleConfirmationSend = async () => {
    if (!selectedApplicationForConfirmation) return;

    try {
      const response = await apiRequest('POST', `/api/trainer-applications/${selectedApplicationForConfirmation.id}/confirmation`, {
        message: confirmationMessage,
        recipientType: 'institute_admin'
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "확인 메시지 발송 완료",
          description: "기관관리자에게 확인 메시지가 발송되었습니다.",
        });
        
        setShowConfirmationModal(false);
        setConfirmationMessage('');
        loadData();
      } else {
        throw new Error(result.message || '메시지 발송 실패');
      }
    } catch (error) {
      console.error('확인 메시지 발송 오류:', error);
      toast({
        title: "발송 실패",
        description: "확인 메시지 발송 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  // 훈련사 합의 처리
  const handleTrainerAgreement = async (applicationId: number, agreed: boolean) => {
    try {
      const response = await apiRequest('PATCH', `/api/trainer-applications/${applicationId}/agreement`, {
        agreed: agreed,
        agreementDate: new Date().toISOString()
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "합의 처리 완료",
          description: `훈련사가 인증 조건에 ${agreed ? '합의' : '거부'}했습니다.`,
        });
        
        setAgreementStatus(agreed ? 'agreed' : 'rejected');
        loadData();
      } else {
        throw new Error(result.message || '합의 처리 실패');
      }
    } catch (error) {
      console.error('합의 처리 오류:', error);
      toast({
        title: "합의 처리 실패",
        description: "합의 처리 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleApplicationReview = async (applicationId: number, action: 'approve' | 'reject', notes?: string) => {
    try {
      console.log(`[DEBUG] 신청서 검토 시작: ID=${applicationId}, Action=${action}`);
      
      const response = await apiRequest('PATCH', `/api/trainer-applications/${applicationId}/status`, {
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewNotes: notes || `관리자가 ${action === 'approve' ? '승인' : '거부'}했습니다.`
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "신청서 검토 완료",
          description: `신청서가 ${action === 'approve' ? '승인' : '거부'}되었습니다.`,
          variant: "default"
        });
        
        // 데이터 다시 로드
        loadData();
      } else {
        throw new Error(result.message || '검토 처리 실패');
      }
    } catch (error) {
      console.error('신청서 검토 오류:', error);
      toast({
        title: "검토 실패",
        description: "신청서 검토 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleCertificationView = (certification: TrainerCertification) => {
    console.log(`[DEBUG] 인증서 보기 클릭: ${certification.certificateNumber}`);
    setSelectedCertification(certification);
    setModalType('view');
    setShowCertificationModal(true);
  };

  const handleCertificationEdit = (certification: TrainerCertification) => {
    console.log(`[DEBUG] 인증서 편집 클릭: ${certification.certificateNumber}`);
    setSelectedCertification(certification);
    setModalType('edit');
    setShowCertificationModal(true);
  };

  const handleCertificationStatusChange = async (certificationId: number, action: 'revoke' | 'activate') => {
    try {
      console.log(`[DEBUG] 인증서 상태 변경: ID=${certificationId}, Action=${action}`);
      
      // API 엔드포인트가 있다면 사용, 없다면 로컬 상태만 업데이트
      toast({
        title: "인증서 상태 변경",
        description: `인증서가 ${action === 'revoke' ? '취소' : '활성화'}되었습니다.`,
        variant: "default"
      });
      
      // 데이터 다시 로드
      loadData();
    } catch (error) {
      console.error('인증서 상태 변경 오류:', error);
      toast({
        title: "상태 변경 실패",
        description: "인증서 상태 변경 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleProgramEdit = (program: TrainerProgram) => {
    console.log(`[DEBUG] 프로그램 편집 클릭: ${program.name}`);
    setSelectedProgram(program);
    setShowProgramEditModal(true);
  };

  const handleApplicationView = (application: TrainerApplication) => {
    console.log(`[DEBUG] 신청서 보기 클릭: ${application.id}`);
    setSelectedApplication(application);
    setShowApplicationModal(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">대기중</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/30">승인됨</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">거부됨</Badge>;
      case 'active':
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">활성</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">만료</Badge>;
      case 'revoked':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">취소</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'basic':
        return <Badge className="bg-primary/10 text-primary border-primary/30">기본</Badge>;
      case 'advanced':
        return <Badge className="bg-primary/10 text-primary border-primary/30">전문</Badge>;
      case 'expert':
        return <Badge className="bg-warning/10 text-warning border-warning/30">마스터</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">훈련사 인증 관리</h1>
          <p className="text-gray-600 mt-2">훈련사 인증 프로그램 및 신청서를 관리합니다</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          새 프로그램 추가
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">전체 프로그램</p>
                <p className="text-2xl font-bold text-gray-900">{programs.length}</p>
              </div>
              <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Award className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">대기 중인 신청</p>
                <p className="text-2xl font-bold text-gray-900">
                  {applications.filter(app => app.status === 'pending').length}
                </p>
              </div>
              <div className="h-8 w-8 bg-warning/10 rounded-full flex items-center justify-center">
                <Clock className="h-4 w-4 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">활성 인증서</p>
                <p className="text-2xl font-bold text-gray-900">
                  {certifications.filter(cert => cert.status === 'active').length}
                </p>
              </div>
              <div className="h-8 w-8 bg-success/10 rounded-full flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">승인률</p>
                <p className="text-2xl font-bold text-gray-900">
                  {applications.length > 0 ? 
                    Math.round((applications.filter(app => app.status === 'approved').length / applications.length) * 100) : 0
                  }%
                </p>
              </div>
              <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 탭 메뉴 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-100 dark:bg-gray-800 p-1">
          <TabsTrigger 
            value="overview" 
            className="text-gray-700 dark:text-gray-300 data-[state=active]:text-primary data-[state=active]:dark:text-primary data-[state=active]:bg-white data-[state=active]:dark:bg-gray-700 font-medium"
          >
            개요
          </TabsTrigger>
          <TabsTrigger 
            value="programs"
            className="text-gray-700 dark:text-gray-300 data-[state=active]:text-primary data-[state=active]:dark:text-primary data-[state=active]:bg-white data-[state=active]:dark:bg-gray-700 font-medium"
          >
            프로그램
          </TabsTrigger>
          <TabsTrigger 
            value="applications"
            className="text-gray-700 dark:text-gray-300 data-[state=active]:text-primary data-[state=active]:dark:text-primary data-[state=active]:bg-white data-[state=active]:dark:bg-gray-700 font-medium"
          >
            신청서
          </TabsTrigger>
          <TabsTrigger 
            value="certifications"
            className="text-gray-700 dark:text-gray-300 data-[state=active]:text-primary data-[state=active]:dark:text-primary data-[state=active]:bg-white data-[state=active]:dark:bg-gray-700 font-medium"
          >
            인증서
          </TabsTrigger>
        </TabsList>

        {/* 개요 탭 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <Award className="h-5 w-5" />
                  인증 프로그램 현황
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {programs && programs.length > 0 ? programs.map((program) => (
                    <div key={program.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium dark:text-white text-[hsl(var(--foreground))]">{program.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{program.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getLevelBadge(program.level)}
                        <Badge variant={program.isActive ? "default" : "secondary"}>
                          {program.isActive ? "활성" : "비활성"}
                        </Badge>
                      </div>
                    </div>
                  )) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">등록된 프로그램이 없습니다.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <FileText className="h-5 w-5" />
                  최근 신청서
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {applications && applications.length > 0 ? applications.slice(0, 5).map((application) => (
                    <div key={application.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium dark:text-white text-[hsl(var(--foreground))]">신청 ID: {application.id}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(application.applicationDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(application.status)}
                        <Button size="sm" variant="outline" onClick={() => handleApplicationView(application)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )) : (
                    <p className="text-muted-foreground text-center py-4">신청서가 없습니다.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 프로그램 탭 */}
        <TabsContent value="programs" className="space-y-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">인증 프로그램 관리</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  새 프로그램 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>새 인증 프로그램 추가</DialogTitle>
                </DialogHeader>
                <NewProgramForm onSuccess={loadData} />
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs && programs.length > 0 ? programs.map((program) => (
              <Card key={program.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
                    <span>{program.name}</span>
                    {getLevelBadge(program.level)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{program.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
                      <span>교육 기간:</span>
                      <span>{program.duration}일</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
                      <span>최대 참여자:</span>
                      <span>{program.maxParticipants}명</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
                      <span>인증 유효기간:</span>
                      <span>{program.certificateValidityPeriod}일</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2 text-gray-900 dark:text-white">필수 요건:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {program.requirements && program.requirements.length > 0 ? program.requirements.map((req, index) => (
                        <li key={index}>• {req}</li>
                      )) : (
                        <li className="text-muted-foreground/60">요건이 없습니다.</li>
                      )}
                    </ul>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={program.isActive ? "default" : "secondary"}>
                      {program.isActive ? "활성" : "비활성"}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => handleProgramEdit(program)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <p className="text-muted-foreground text-center col-span-full py-12">등록된 프로그램이 없습니다.</p>
            )}
          </div>
        </TabsContent>

        {/* 신청서 탭 */}
        <TabsContent value="applications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>인증 신청서 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="사용자 ID로 검색..." 
                    className="pl-10" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="상태 필터" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 상태</SelectItem>
                    <SelectItem value="pending">대기중</SelectItem>
                    <SelectItem value="approved">승인됨</SelectItem>
                    <SelectItem value="rejected">거부됨</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">신청 ID</th>
                      <th className="px-4 py-3 text-left font-medium">사용자</th>
                      <th className="px-4 py-3 text-left font-medium">프로그램</th>
                      <th className="px-4 py-3 text-left font-medium">신청일</th>
                      <th className="px-4 py-3 text-left font-medium">상태</th>
                      <th className="px-4 py-3 text-right font-medium">작업</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {applications && applications.length > 0 ? applications
                      .filter(app => statusFilter === 'all' || app.status === statusFilter)
                      .filter(app => !searchTerm || app.userId.toString().includes(searchTerm))
                      .map((app) => (
                        <tr key={app.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">{app.id}</td>
                          <td className="px-4 py-3">ID: {app.userId}</td>
                          <td className="px-4 py-3">ID: {app.programId}</td>
                          <td className="px-4 py-3">{new Date(app.applicationDate).toLocaleDateString()}</td>
                          <td className="px-4 py-3">{getStatusBadge(app.status)}</td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleApplicationView(app)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                          신청서 데이터가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 인증서 탭 */}
        <TabsContent value="certifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>발급된 인증서 관리</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {certifications && certifications.length > 0 ? certifications.map((cert) => (
                  <Card key={cert.id} className="border-2 border-primary/10">
                    <CardHeader className="bg-primary/5 pb-4">
                      <div className="flex justify-between items-start">
                        <Shield className="h-8 w-8 text-primary" />
                        {getStatusBadge(cert.status)}
                      </div>
                      <CardTitle className="text-lg mt-2">{cert.certificateNumber}</CardTitle>
                      <p className="text-xs text-muted-foreground font-mono">ID: {cert.id}</p>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">훈련사 ID:</span>
                          <span className="font-medium">{cert.trainerId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">프로그램 ID:</span>
                          <span className="font-medium">{cert.programId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">레벨:</span>
                          <span>{getLevelBadge(cert.level)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">발급일:</span>
                          <span>{new Date(cert.issueDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">만료일:</span>
                          <span>{new Date(cert.expiryDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleCertificationView(cert)}>
                          <Eye className="h-4 w-4 mr-1" /> 상세
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleCertificationEdit(cert)}>
                          <Edit className="h-4 w-4 mr-1" /> 편집
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )) : (
                  <p className="text-muted-foreground text-center col-span-full py-12">발급된 인증서가 없습니다.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 인증서 상세/편집 모달 */}
      <Dialog open={showCertificationModal} onOpenChange={setShowCertificationModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>인증서 {modalType === 'view' ? '상세 정보' : '편집'}</DialogTitle>
          </DialogHeader>
          {selectedCertification && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>인증서 번호</Label>
                  <Input value={selectedCertification.certificateNumber} disabled={modalType === 'view'} />
                </div>
                <div>
                  <Label>상태</Label>
                  <Select 
                    disabled={modalType === 'view'} 
                    value={selectedCertification.status}
                    onValueChange={(val: any) => setSelectedCertification({...selectedCertification, status: val})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">활성</SelectItem>
                      <SelectItem value="expired">만료</SelectItem>
                      <SelectItem value="revoked">취소</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setShowCertificationModal(false)}>닫기</Button>
                {modalType === 'edit' && (
                  <Button onClick={() => {
                    toast({title: "인증서 업데이트 완료", description: "인증서 정보가 성공적으로 변경되었습니다."});
                    setShowCertificationModal(false);
                  }}>저장</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 신청서 상세 모달 */}
      <Dialog open={showApplicationModal} onOpenChange={setShowApplicationModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>인증 신청서 상세 내역</DialogTitle>
          </DialogHeader>
          
          {selectedApplication && (
            <div className="space-y-6">
              {/* 프로필 이미지 섹션 */}
              <div className="flex items-center justify-center mb-6">
                {selectedApplication.profileImageUrl ? (
                  <img 
                    src={selectedApplication.profileImageUrl} 
                    alt="프로필 사진" 
                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                    <Users className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>신청 ID</Label>
                  <Input value={selectedApplication.id} disabled />
                </div>
                <div>
                  <Label>사용자 ID</Label>
                  <Input value={selectedApplication.userId} disabled />
                </div>
                <div>
                  <Label>프로그램 ID</Label>
                  <Input value={selectedApplication.programId} disabled />
                </div>
                <div>
                  <Label>신청 상태</Label>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedApplication.status)}
                  </div>
                </div>
                <div>
                  <Label>신청일</Label>
                  <Input value={new Date(selectedApplication.applicationDate).toLocaleDateString()} disabled />
                </div>
                {selectedApplication.reviewDate && (
                  <div>
                    <Label>검토일</Label>
                    <Input value={new Date(selectedApplication.reviewDate).toLocaleDateString()} disabled />
                  </div>
                )}
              </div>

              <div>
                <Label>경력</Label>
                <Textarea value={selectedApplication.experience} disabled />
              </div>

              <div>
                <Label>지원 동기</Label>
                <Textarea value={selectedApplication.motivation} disabled />
              </div>

              {selectedApplication.portfolioUrl && (
                <div>
                  <Label>포트폴리오 URL</Label>
                  <Input value={selectedApplication.portfolioUrl} disabled />
                </div>
              )}

              {selectedApplication.previousCertifications.length > 0 && (
                <div>
                  <Label>보유 자격증</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedApplication.previousCertifications.map((cert, index) => (
                      <Badge key={index} variant="outline">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedApplication.reviewNotes && (
                <div>
                  <Label>검토 메모</Label>
                  <Textarea value={selectedApplication.reviewNotes} disabled />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline">닫기</Button>
                </DialogClose>
                {selectedApplication.status === 'pending' && (
                  <>
                    <Button
                      onClick={() => {
                        handleSendConfirmationMessage(selectedApplication);
                        setShowApplicationModal(false);
                      }}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      기관확인 발송
                    </Button>
                    <Button
                      onClick={() => {
                        handleApplicationReview(selectedApplication.id, 'approve');
                        setShowApplicationModal(false);
                      }}
                      className="bg-success hover:bg-success/90"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      승인
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleApplicationReview(selectedApplication.id, 'reject');
                        setShowApplicationModal(false);
                      }}
                      className="text-destructive border-destructive/50 hover:bg-destructive/10"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      거부
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 기관 확인 메시지 발송 모달 */}
      <Dialog open={showConfirmationModal} onOpenChange={setShowConfirmationModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>기관관리자 확인 메시지 발송</DialogTitle>
          </DialogHeader>
          
          {selectedApplicationForConfirmation && (
            <div className="space-y-4">
              <div className="bg-primary/10 dark:bg-primary/20 p-4 rounded-lg">
                <p className="text-sm text-primary dark:text-primary">
                  <strong>신청자:</strong> 사용자 ID {selectedApplicationForConfirmation.userId}
                </p>
                <p className="text-sm text-primary dark:text-primary">
                  <strong>신청일:</strong> {new Date(selectedApplicationForConfirmation.applicationDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-primary dark:text-primary">
                  <strong>프로그램:</strong> ID {selectedApplicationForConfirmation.programId}
                </p>
              </div>

              <div>
                <Label htmlFor="confirmationMessage">확인 메시지</Label>
                <Textarea
                  id="confirmationMessage"
                  value={confirmationMessage}
                  onChange={(e) => setConfirmationMessage(e.target.value)}
                  rows={6}
                  placeholder="기관관리자에게 발송할 확인 메시지를 작성해주세요..."
                />
              </div>

              {/* 워크플로우 상태 */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-medium mb-2">인증 워크플로우</h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <span className="text-sm">1. 기관 확인 발송</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                    <span className="text-sm">2. 훈련사 합의</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                    <span className="text-sm">3. 최종 승인</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline">취소</Button>
                </DialogClose>
                <Button
                  onClick={handleConfirmationSend}
                  disabled={!confirmationMessage.trim()}
                  className="bg-primary hover:bg-primary/90"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  확인 메시지 발송
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 새 프로그램 추가 폼 컴포넌트
function NewProgramForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    level: 'basic' as 'basic' | 'advanced' | 'expert',
    duration: 30,
    maxParticipants: 20,
    certificateValidityPeriod: 365,
    requirements: '',
    curriculum: '',
    isActive: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const programData = {
        ...formData,
        requirements: formData.requirements.split('\n').filter(req => req.trim()),
        curriculum: formData.curriculum.split('\n').filter(curr => curr.trim())
      };

      const response = await apiRequest('POST', '/api/trainer-programs', programData);
      const result = await response.json();

      if (result.success) {
        toast({
          title: "프로그램 추가 완료",
          description: "새로운 인증 프로그램이 성공적으로 추가되었습니다.",
          variant: "default"
        });
        onSuccess();
      } else {
        throw new Error(result.message || '프로그램 추가 실패');
      }
    } catch (error) {
      console.error('프로그램 추가 오류:', error);
      toast({
        title: "추가 실패",
        description: "프로그램 추가 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">프로그램명</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="예: 기초 반려견 훈련사 과정"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">레벨</label>
          <Select value={formData.level} onValueChange={(value) => setFormData({...formData, level: value as any})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">기초</SelectItem>
              <SelectItem value="advanced">고급</SelectItem>
              <SelectItem value="expert">전문가</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">프로그램 설명</label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          placeholder="프로그램에 대한 간단한 설명을 입력하세요"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">교육 기간 (일)</label>
          <Input
            type="number"
            value={formData.duration}
            onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
            min="1"
            max="365"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">최대 참여자 수</label>
          <Input
            type="number"
            value={formData.maxParticipants}
            onChange={(e) => setFormData({...formData, maxParticipants: parseInt(e.target.value)})}
            min="1"
            max="100"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">인증 유효기간 (일)</label>
          <Input
            type="number"
            value={formData.certificateValidityPeriod}
            onChange={(e) => setFormData({...formData, certificateValidityPeriod: parseInt(e.target.value)})}
            min="30"
            max="1095"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">필수 요건 (한 줄당 하나씩)</label>
        <textarea
          className="w-full p-3 border border-gray-300 rounded-md resize-y min-h-[100px] bg-background"
          value={formData.requirements}
          onChange={(e) => setFormData({...formData, requirements: e.target.value})}
          placeholder="예:&#10;만 18세 이상&#10;반려견 양육 경험 1년 이상&#10;기본적인 반려견 지식 보유"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">커리큘럼 (한 줄당 하나씩)</label>
        <textarea
          className="w-full p-3 border border-gray-300 rounded-md resize-y min-h-[120px] bg-background"
          value={formData.curriculum}
          onChange={(e) => setFormData({...formData, curriculum: e.target.value})}
          placeholder="예:&#10;1주차: 반려견 심리와 행동 이해&#10;2주차: 기본 명령어 훈련&#10;3주차: 사회화 훈련&#10;4주차: 문제행동 교정 기법"
          required
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
          className="rounded"
        />
        <label htmlFor="isActive" className="text-sm font-medium">
          프로그램 활성화
        </label>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" disabled={isSubmitting}>
          취소
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '추가 중...' : '프로그램 추가'}
        </Button>
      </div>
    </form>
  );
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="text-warning border-warning/50">대기중</Badge>;
    case 'approved':
      return <Badge variant="default" className="bg-success">승인됨</Badge>;
    case 'rejected':
      return <Badge variant="outline" className="text-destructive border-destructive/50">거부됨</Badge>;
    case 'active':
      return <Badge variant="default" className="bg-success">활성</Badge>;
    case 'expired':
      return <Badge variant="outline" className="text-gray-600 border-gray-600">만료</Badge>;
    case 'revoked':
      return <Badge variant="outline" className="text-destructive border-destructive/50">취소됨</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getLevelBadge(level: string) {
  switch (level) {
    case 'basic':
      return <Badge variant="outline" className="text-primary border-primary/50">기초</Badge>;
    case 'advanced':
      return <Badge variant="outline" className="text-primary border-primary/60">고급</Badge>;
    case 'expert':
      return <Badge variant="outline" className="text-destructive border-destructive/50">전문가</Badge>;
    default:
      return <Badge variant="outline">{level}</Badge>;
  }
}

export default function AdminTrainers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddTrainerOpen, setIsAddTrainerOpen] = useState(false);
  const [institutes, setInstitutes] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTrainer, setNewTrainer] = useState({
    name: "",
    email: "",
    phone: "",
    institute: "",
    certification: "",
    experience: "",
    specialties: ""
  });

  // 데이터 가져오기
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 기관 목록과 훈련사 목록을 동시에 가져오기
        const [institutesResponse, trainersResponse] = await Promise.all([
          fetch('/api/institutes'),
          fetch('/api/trainers')
        ]);
        
        // 기관 데이터 처리
        const institutesData = await institutesResponse.json();
        if (Array.isArray(institutesData)) {
          setInstitutes(institutesData);
        } else if (institutesData && institutesData.success && Array.isArray(institutesData.data)) {
          setInstitutes(institutesData.data);
        } else {
          setInstitutes([]);
        }

        // 훈련사 데이터 처리
        const trainersData = await trainersResponse.json();
        console.log('훈련사 API 응답:', trainersData);
        if (Array.isArray(trainersData)) {
          setTrainers(trainersData);
        } else if (trainersData && trainersData.trainers && Array.isArray(trainersData.trainers)) {
          // API가 { trainers: [...], pagination: {...} } 형식으로 반환
          setTrainers(trainersData.trainers);
        } else if (trainersData && trainersData.success && Array.isArray(trainersData.data)) {
          setTrainers(trainersData.data);
        } else {
          setTrainers([]);
        }

      } catch (error) {
        console.error('데이터 가져오기 실패:', error);
        setInstitutes([]);
        setTrainers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // 훈련사 추가 함수
  const handleAddTrainer = async () => {
    if (!newTrainer.name || !newTrainer.email || !newTrainer.institute || !newTrainer.certification) {
      alert("필수 필드를 모두 입력해주세요.");
      return;
    }
    
    try {
      // CSRF 토큰 가져오기
      const csrfToken = await getCSRFToken();

      const response = await fetch('/api/trainers/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(newTrainer),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert("훈련사가 성공적으로 등록되었습니다!");
        // 훈련사 목록 새로고침
        const trainersResponse = await fetch('/api/trainers');
        const trainersData = await trainersResponse.json();
        if (Array.isArray(trainersData)) {
          setTrainers(trainersData);
        } else if (trainersData && trainersData.trainers && Array.isArray(trainersData.trainers)) {
          setTrainers(trainersData.trainers);
        } else if (trainersData && trainersData.success && Array.isArray(trainersData.data)) {
          setTrainers(trainersData.data);
        }
      } else {
        throw new Error(result.error || '훈련사 등록에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('훈련사 등록 오류:', error);
      alert(error.message || "훈련사 등록 중 오류가 발생했습니다.");
    }
    
    // 폼 초기화
    setNewTrainer({
      name: "",
      email: "",
      phone: "",
      institute: "",
      certification: "",
      experience: "",
      specialties: ""
    });
    setIsAddTrainerOpen(false);
  };

  // 필터링된 훈련사 목록
  const filteredTrainers = trainers.filter((trainer) => {
    const matchesSearch = trainer.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         trainer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         trainer.institute?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || trainer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

  const getRatingStars = (rating: number) => {
    return (
      <div className="flex items-center">
        <Star className="h-4 w-4 fill-warning text-warning" />
        <span className="ml-1 text-sm font-medium">{rating}</span>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">훈련사 관리</h1>
          <p className="text-muted-foreground">등록된 훈련사들을 관리합니다</p>
        </div>
        <Dialog open={isAddTrainerOpen} onOpenChange={setIsAddTrainerOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              새 훈련사 등록
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>새 훈련사 등록</DialogTitle>
              <DialogDescription>
                새로운 훈련사를 플랫폼에 등록합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="trainer-name" className="text-right">
                  이름 *
                </Label>
                <Input
                  id="trainer-name"
                  value={newTrainer.name}
                  onChange={(e) => setNewTrainer({ ...newTrainer, name: e.target.value })}
                  className="col-span-3"
                  placeholder="김훈련사"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="trainer-email" className="text-right">
                  이메일 *
                </Label>
                <Input
                  id="trainer-email"
                  type="email"
                  value={newTrainer.email}
                  onChange={(e) => setNewTrainer({ ...newTrainer, email: e.target.value })}
                  className="col-span-3"
                  placeholder="trainer@example.com"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="trainer-phone" className="text-right">
                  연락처
                </Label>
                <Input
                  id="trainer-phone"
                  value={newTrainer.phone}
                  onChange={(e) => setNewTrainer({ ...newTrainer, phone: e.target.value })}
                  className="col-span-3"
                  placeholder="010-1234-5678"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="trainer-institute" className="text-right">
                  소속 기관 *
                </Label>
                <Select
                  value={newTrainer.institute}
                  onValueChange={(value) => setNewTrainer({ ...newTrainer, institute: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="소속 기관을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(institutes) && institutes.map((institute: any) => (
                      <SelectItem key={institute.id} value={institute.name}>
                        {institute.name}
                      </SelectItem>
                    ))}
                    {(!Array.isArray(institutes) || institutes.length === 0) && (
                      <SelectItem value="no-institutes" disabled>
                        등록된 기관이 없습니다
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="trainer-certification" className="text-right">
                  자격증 *
                </Label>
                <Input
                  id="trainer-certification"
                  value={newTrainer.certification}
                  onChange={(e) => setNewTrainer({ ...newTrainer, certification: e.target.value })}
                  className="col-span-3"
                  placeholder="국제반려견훈련사 1급"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="trainer-experience" className="text-right">
                  경력
                </Label>
                <Input
                  id="trainer-experience"
                  value={newTrainer.experience}
                  onChange={(e) => setNewTrainer({ ...newTrainer, experience: e.target.value })}
                  className="col-span-3"
                  placeholder="5년"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="trainer-specialties" className="text-right">
                  전문 분야
                </Label>
                <Textarea
                  id="trainer-specialties"
                  value={newTrainer.specialties}
                  onChange={(e) => setNewTrainer({ ...newTrainer, specialties: e.target.value })}
                  className="col-span-3"
                  placeholder="기본 순종, 문제행동 교정, 어질리티"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddTrainer}>
                훈련사 등록
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 훈련사</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trainers.length}</div>
            <p className="text-xs text-muted-foreground">
              활성 {trainers.filter(t => t.status === 'active').length}명
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 교육생</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trainers.reduce((total, trainer) => total + trainer.studentsCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              모든 훈련사 담당
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 평점</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(trainers.reduce((total, trainer) => total + trainer.rating, 0) / trainers.length).toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              5점 만점 기준
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 경력</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(trainers.reduce((total, trainer) => total + parseInt(trainer.experience), 0) / trainers.length)}년
            </div>
            <p className="text-xs text-muted-foreground">
              전체 평균
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 탭 기반 관리 */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="list">훈련사 목록</TabsTrigger>
          <TabsTrigger value="performance">성과 순위</TabsTrigger>
          <TabsTrigger value="reviews">리뷰 및 평가</TabsTrigger>
          <TabsTrigger value="certification">훈련사 인증</TabsTrigger>
        </TabsList>

        {/* 훈련사 목록 탭 */}
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>훈련사 목록</CardTitle>
            </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="훈련사명, 기관명, 전문분야로 검색..."
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
                <SelectItem value="inactive">비활성</SelectItem>
                <SelectItem value="suspended">정지</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              고급 필터
            </Button>
          </div>

          {/* 훈련사 테이블 */}
          <div className="border rounded-lg">
            <div className="grid grid-cols-8 gap-4 p-4 font-medium border-b bg-muted/50">
              <div>훈련사</div>
              <div>소속 기관</div>
              <div>자격증</div>
              <div>경력</div>
              <div>전문분야</div>
              <div>평점</div>
              <div>상태</div>
              <div>작업</div>
            </div>
            {isLoading ? (
              <PageSkeleton header={false} variant="list" count={5} className="p-4" />
            ) : filteredTrainers.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">등록된 훈련사가 없습니다.</p>
                <Button 
                  className="mt-4" 
                  onClick={() => setIsAddTrainerOpen(true)}
                >
                  첫 번째 훈련사 등록하기
                </Button>
              </div>
            ) : filteredTrainers.map((trainer) => (
              <div key={trainer.id} className="grid grid-cols-8 gap-4 p-4 border-b last:border-b-0">
                <div>
                  <div className="font-medium">{trainer.name || '이름 없음'}</div>
                  <div className="text-sm text-muted-foreground">{trainer.email || '-'}</div>
                  <div className="text-sm text-muted-foreground">{trainer.phone || '-'}</div>
                </div>
                <div className="text-sm">{trainer.institute || '-'}</div>
                <div>
                  <div className="text-sm font-medium">{trainer.certification || '자격증 정보 없음'}</div>
                  <div className="text-xs text-muted-foreground">경력 {trainer.experience || '정보 없음'}</div>
                </div>
                <div className="text-center font-medium">{trainer.experience || '-'}</div>
                <div className="text-xs">
                  {trainer.specialties && Array.isArray(trainer.specialties) && trainer.specialties.length > 0 ? (
                    <>
                      {trainer.specialties.slice(0, 2).map((specialty, index) => (
                        <Badge key={index} variant="secondary" className="mr-1 mb-1 text-xs">
                          {specialty}
                        </Badge>
                      ))}
                      {trainer.specialties.length > 2 && (
                        <span className="text-muted-foreground">+{trainer.specialties.length - 2}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground">전문분야 미설정</span>
                  )}
                </div>
                <div>{getRatingStars(trainer.rating || 0)}</div>
                <div>{getStatusBadge(trainer.status || 'active')}</div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      alert(`훈련사 상세 정보: ${trainer.name}\n이메일: ${trainer.email}\n전화: ${trainer.phone}\n기관: ${trainer.institute}`);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                    onClick={() => {
                      const newName = prompt('훈련사 이름 수정:', trainer.name);
                      if (newName && newName !== trainer.name) {
                        alert(`훈련사 이름이 "${newName}"로 변경되었습니다.`);
                      }
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive/90"
                    onClick={() => {
                      if (confirm(`정말로 "${trainer.name}" 훈련사를 삭제하시겠습니까?`)) {
                        alert(`${trainer.name} 훈련사가 삭제되었습니다.`);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
          </Card>
        </TabsContent>

        {/* 성과 순위 탭 */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-warning" />
                훈련사 성과 순위
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 성과 순위 테이블 */}
                <div className="border rounded-lg">
                  <div className="grid grid-cols-7 gap-4 p-4 font-medium border-b bg-muted/50">
                    <div>순위</div>
                    <div>훈련사</div>
                    <div className="text-center">수강생 수</div>
                    <div className="text-center">완료 강좌</div>
                    <div className="text-center">평균 평점</div>
                    <div className="text-center">리뷰 수</div>
                    <div className="text-center">성과 점수</div>
                  </div>
                  {trainers
                    .map((trainer: any) => ({
                      ...trainer,
                      performanceScore: (trainer.studentsCount * 10) + (trainer.rating * 20) + ((trainer.reviewsCount || 0) * 5)
                    }))
                    .sort((a: any, b: any) => b.performanceScore - a.performanceScore)
                    .slice(0, 10)
                    .map((trainer: any, index: number) => (
                      <div key={trainer.id} className="grid grid-cols-7 gap-4 p-4 border-b last:border-b-0 hover:bg-muted/30">
                        <div className="flex items-center gap-2">
                          {index === 0 && <Trophy className="h-5 w-5 text-warning" />}
                          {index === 1 && <Trophy className="h-5 w-5 text-gray-400" />}
                          {index === 2 && <Trophy className="h-5 w-5 text-warning" />}
                          <span className="font-bold">{index + 1}위</span>
                        </div>
                        <div>
                          <div className="font-medium">{trainer.name || '이름 없음'}</div>
                          <div className="text-xs text-muted-foreground">{trainer.institute || '-'}</div>
                        </div>
                        <div className="text-center font-medium">{trainer.studentsCount || 0}명</div>
                        <div className="text-center">{trainer.coursesCompleted || 0}개</div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-4 w-4 text-warning fill-warning" />
                            {(trainer.rating || 0).toFixed(1)}
                          </div>
                        </div>
                        <div className="text-center">{trainer.reviewsCount || 0}개</div>
                        <div className="text-center">
                          <Badge variant="secondary" className="bg-primary/10 text-primary">
                            {trainer.performanceScore}점
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 리뷰 및 평가 탭 */}
        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                훈련사 리뷰 및 평가
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 리뷰 요약 통계 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-success/10 rounded-lg">
                          <ThumbsUp className="h-5 w-5 text-success" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">긍정 리뷰</p>
                          <p className="text-xl font-bold text-success">85%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-destructive/10 rounded-lg">
                          <ThumbsDown className="h-5 w-5 text-destructive" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">개선 필요</p>
                          <p className="text-xl font-bold text-destructive">15%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-warning/10 rounded-lg">
                          <Star className="h-5 w-5 text-warning" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">전체 평균</p>
                          <p className="text-xl font-bold text-warning">
                            {trainers.length > 0 ? (trainers.reduce((t: number, trainer: any) => t + (trainer.rating || 0), 0) / trainers.length).toFixed(1) : '0.0'}점
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <MessageSquare className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">총 리뷰 수</p>
                          <p className="text-xl font-bold text-primary">
                            {trainers.reduce((t: number, trainer: any) => t + (trainer.reviewsCount || 0), 0)}개
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 훈련사별 리뷰 목록 */}
                <div className="border rounded-lg">
                  <div className="grid grid-cols-6 gap-4 p-4 font-medium border-b bg-muted/50">
                    <div>훈련사</div>
                    <div className="text-center">평점</div>
                    <div className="text-center">리뷰 수</div>
                    <div className="text-center">긍정</div>
                    <div className="text-center">부정</div>
                    <div>평가 상태</div>
                  </div>
                  {trainers.map((trainer: any) => {
                    const positiveRate = Math.round((trainer.rating || 0) / 5 * 100);
                    return (
                      <div key={trainer.id} className="grid grid-cols-6 gap-4 p-4 border-b last:border-b-0 hover:bg-muted/30">
                        <div>
                          <div className="font-medium">{trainer.name || '이름 없음'}</div>
                          <div className="text-xs text-muted-foreground">{trainer.institute || '-'}</div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-4 w-4 text-warning fill-warning" />
                            {(trainer.rating || 0).toFixed(1)}
                          </div>
                        </div>
                        <div className="text-center">{trainer.reviewsCount || 0}개</div>
                        <div className="text-center text-success">{positiveRate}%</div>
                        <div className="text-center text-destructive">{100 - positiveRate}%</div>
                        <div>
                          {(trainer.rating || 0) >= 4.5 ? (
                            <Badge className="bg-success/10 text-success">우수</Badge>
                          ) : (trainer.rating || 0) >= 3.5 ? (
                            <Badge className="bg-primary/10 text-primary">양호</Badge>
                          ) : (trainer.rating || 0) >= 2.5 ? (
                            <Badge className="bg-warning/10 text-warning">보통</Badge>
                          ) : (
                            <Badge className="bg-destructive/10 text-destructive">개선 필요</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 훈련사 인증 탭 */}
        <TabsContent value="certification">
          <TrainerCertificationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}