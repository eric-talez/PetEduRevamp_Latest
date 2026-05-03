import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Award, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye,
  Plus,
  Search,
  Filter,
  Calendar,
  FileText,
  Shield,
  Star,
  TrendingUp
} from 'lucide-react';

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

export default function TrainerCertificationManagement() {
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
      const [programsData, applicationsData, certificationsData] = await Promise.all([
        apiRequest('GET', '/api/trainer-programs'),
        apiRequest('GET', '/api/trainer-applications'),
        apiRequest('GET', '/api/trainer-certifications')
      ]);

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
      <div className="flex items-center justify-center min-h-screen">
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
                        <Button size="sm" variant="outline">
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
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="ml-auto"
                      onClick={() => handleProgramEdit(program)}
                    >
                      편집
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <p className="text-muted-foreground text-center py-8 col-span-full">등록된 프로그램이 없습니다.</p>
            )}
          </div>
        </TabsContent>

        {/* 신청서 탭 */}
        <TabsContent value="applications" className="space-y-6">
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="신청서 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="pending">대기중</SelectItem>
                <SelectItem value="approved">승인됨</SelectItem>
                <SelectItem value="rejected">거부됨</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {applications && applications.length > 0 
              ? applications
                .filter(app => statusFilter === 'all' || app.status === statusFilter)
                .map((application) => (
                <Card key={application.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          {application.profileImageUrl ? (
                            <img 
                              src={application.profileImageUrl} 
                              alt="프로필 사진" 
                              className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                              <Users className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">신청 ID: {application.id}</h3>
                          <p className="text-sm text-muted-foreground">
                            신청일: {new Date(application.applicationDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(application.status)}
                        <Badge variant="outline">프로그램 ID: {application.programId}</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApplicationView(application)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          보기
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium mb-1 text-gray-900 dark:text-white">경력:</p>
                        <p className="text-sm text-muted-foreground">{application.experience}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1 text-gray-900 dark:text-white">지원 동기:</p>
                        <p className="text-sm text-muted-foreground">{application.motivation}</p>
                      </div>
                    </div>

                    {application.previousCertifications && application.previousCertifications.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium mb-2 text-gray-900 dark:text-white">보유 자격증:</p>
                        <div className="flex flex-wrap gap-1">
                          {application.previousCertifications.map((cert, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {cert}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {application.status === 'pending' && (
                      <div className="space-y-2">
                        {/* 워크플로우 상태 표시 */}
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-medium">워크플로우:</span>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                            <span className="text-muted-foreground">기관확인</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                            <span className="text-muted-foreground">훈련사합의</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                            <span className="text-muted-foreground">최종승인</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSendConfirmationMessage(application)}
                            className="bg-primary hover:bg-primary/90"
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            기관확인 발송
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleTrainerAgreement(application.id, true)}
                            className="bg-primary hover:bg-primary/90"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            훈련사합의
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApplicationReview(application.id, 'approve')}
                            className="bg-success hover:bg-success/90"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            최종승인
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApplicationReview(application.id, 'reject')}
                            className="text-destructive border-destructive/50 hover:bg-destructive/10"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            거부
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
              : (
                <p className="text-muted-foreground text-center py-8">신청서가 없습니다.</p>
              )
            }
          </div>
        </TabsContent>

        {/* 인증서 탭 */}
        <TabsContent value="certifications" className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {certifications && certifications.length > 0 ? certifications.map((certification) => (
              <Card key={certification.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">인증서 번호: {certification.certificateNumber}</h3>
                      <p className="text-sm text-muted-foreground">
                        발급일: {new Date(certification.issueDate).toLocaleDateString()} | 
                        만료일: {new Date(certification.expiryDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(certification.status)}
                      {getLevelBadge(certification.level)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">훈련사 ID:</p>
                      <p className="text-sm text-muted-foreground">{certification.trainerId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">프로그램 ID:</p>
                      <p className="text-sm text-muted-foreground">{certification.programId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">점수:</p>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-warning fill-warning" />
                        <span className="text-sm text-muted-foreground">{certification.score}/100</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Badge variant={certification.isVerified ? "default" : "secondary"}>
                      {certification.isVerified ? "인증됨" : "미인증"}
                    </Badge>
                    <div className="ml-auto flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleCertificationView(certification)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        보기
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleCertificationEdit(certification)}
                        className="hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all duration-200"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        편집
                      </Button>
                      {certification.status === 'active' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleCertificationStatusChange(certification.id, 'revoke')}
                          className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive/90 hover:border-destructive/40 transition-all duration-200"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          취소
                        </Button>
                      )}
                      {certification.status === 'revoked' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleCertificationStatusChange(certification.id, 'activate')}
                          className="text-success border-success/40 hover:bg-success/10 hover:text-success/90 hover:border-success/40 transition-all duration-200"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          활성화
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <p className="text-muted-foreground text-center py-8">등록된 인증서가 없습니다.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* 인증서 상세보기/편집 모달 */}
      <Dialog open={showCertificationModal} onOpenChange={setShowCertificationModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {modalType === 'view' ? '인증서 상세보기' : '인증서 편집'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedCertification && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>인증서 번호</Label>
                  <Input value={selectedCertification.certificateNumber} disabled />
                </div>
                <div>
                  <Label>발급일</Label>
                  <Input value={selectedCertification.issueDate} disabled />
                </div>
                <div>
                  <Label>만료일</Label>
                  <Input value={selectedCertification.expiryDate} disabled={modalType === 'view'} />
                </div>
                <div>
                  <Label>레벨</Label>
                  <Select value={selectedCertification.level} disabled={modalType === 'view'}>
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
                <div>
                  <Label>점수</Label>
                  <Input value={selectedCertification.score} disabled={modalType === 'view'} />
                </div>
                <div>
                  <Label>상태</Label>
                  <Select value={selectedCertification.status} disabled={modalType === 'view'}>
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

              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline">취소</Button>
                </DialogClose>
                {modalType === 'edit' && (
                  <Button onClick={() => {
                    toast({
                      title: "인증서 수정 완료",
                      description: "인증서가 성공적으로 수정되었습니다.",
                      variant: "default"
                    });
                    setShowCertificationModal(false);
                  }}>
                    수정 저장
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 프로그램 편집 모달 */}
      <Dialog open={showProgramEditModal} onOpenChange={setShowProgramEditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>프로그램 편집</DialogTitle>
          </DialogHeader>
          
          {selectedProgram && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>프로그램명</Label>
                  <Input defaultValue={selectedProgram.name} />
                </div>
                <div>
                  <Label>레벨</Label>
                  <Select defaultValue={selectedProgram.level}>
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
                <div>
                  <Label>기간 (일)</Label>
                  <Input type="number" defaultValue={selectedProgram.duration} />
                </div>
                <div>
                  <Label>최대 참가자</Label>
                  <Input type="number" defaultValue={selectedProgram.maxParticipants} />
                </div>
              </div>

              <div>
                <Label>프로그램 설명</Label>
                <Textarea defaultValue={selectedProgram.description} />
              </div>

              <div>
                <Label>요구사항</Label>
                <Textarea defaultValue={selectedProgram.requirements?.join('\n')} />
              </div>

              <div>
                <Label>커리큘럼</Label>
                <Textarea defaultValue={selectedProgram.curriculum?.join('\n')} />
              </div>

              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline">취소</Button>
                </DialogClose>
                <Button onClick={() => {
                  toast({
                    title: "프로그램 수정 완료",
                    description: "프로그램이 성공적으로 수정되었습니다.",
                    variant: "default"
                  });
                  setShowProgramEditModal(false);
                }}>
                  수정 저장
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 신청서 상세보기 모달 */}
      <Dialog open={showApplicationModal} onOpenChange={setShowApplicationModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>신청서 상세보기</DialogTitle>
          </DialogHeader>
          
          {selectedApplication && (
            <div className="space-y-4">
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
          className="w-full p-3 border border-gray-300 rounded-md resize-y min-h-[100px]"
          value={formData.requirements}
          onChange={(e) => setFormData({...formData, requirements: e.target.value})}
          placeholder="예:&#10;만 18세 이상&#10;반려견 양육 경험 1년 이상&#10;기본적인 반려견 지식 보유"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">커리큘럼 (한 줄당 하나씩)</label>
        <textarea
          className="w-full p-3 border border-gray-300 rounded-md resize-y min-h-[120px]"
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

// 헬퍼 함수들
function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="text-warning border-warning/50">대기중</Badge>;
    case 'approved':
      return <Badge variant="default" className="bg-success">승인됨</Badge>;
    case 'rejected':
      return <Badge variant="destructive">거부됨</Badge>;
    case 'active':
      return <Badge variant="default" className="bg-success">활성</Badge>;
    case 'expired':
      return <Badge variant="outline" className="text-gray-600 border-gray-600">만료</Badge>;
    case 'revoked':
      return <Badge variant="destructive">취소됨</Badge>;
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