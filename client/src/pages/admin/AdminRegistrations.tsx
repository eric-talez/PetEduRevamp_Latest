import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  FileText, 
  User, 
  Building, 
  Phone, 
  Mail, 
  MapPin,
  RotateCcw,
  Trash2
} from 'lucide-react';

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
      return <Badge variant="warning">검토 중</Badge>;
    case 'approved':
      return <Badge variant="success">승인됨</Badge>;
    case 'rejected':
      return <Badge variant="danger">거부됨</Badge>;
    default:
      return <Badge variant="secondary">알 수 없음</Badge>;
  }
}

function TypeBadge({ type }: { type: string }) {
  switch (type) {
    case 'trainer':
      return <Badge variant="info">훈련사</Badge>;
    case 'institute':
      return <Badge variant="purple">기관</Badge>;
    case 'curriculum':
      return <Badge variant="secondary">커리큘럼</Badge>;
    default:
      return <Badge variant="secondary">알 수 없음</Badge>;
  }
}

export default function AdminRegistrations() {
  const [applications, setApplications] = useState<RegistrationApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<RegistrationApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const { toast } = useToast();

  // 등록 신청 데이터 가져오기
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await fetch('/api/admin/registrations');
        if (!response.ok) {
          throw new Error('등록 신청 데이터를 가져오는데 실패했습니다.');
        }
        const data = await response.json();
        console.log('📋 등록 신청 데이터:', data);
        // API 응답 구조에 맞춰 데이터 추출
        const applicationsArray = data.applications || [];
        setApplications(applicationsArray);
      } catch (error) {
        console.error('등록 신청 데이터 가져오기 실패:', error);
        toast({
          title: "오류",
          description: "등록 신청 데이터를 불러오는데 실패했습니다.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [toast]);

  // 등록 신청 검토 처리
  const handleReview = async (id: string, status: 'approved' | 'rejected' | 'pending') => {
    try {
      const response = await fetch(`/api/admin/registrations/${id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          notes: reviewNotes
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '검토 처리에 실패했습니다.');
      }

      const data = await response.json();
      console.log('✅ 검토 처리 완료:', data);

      // 목록 새로고침
      const refreshResponse = await fetch('/api/admin/registrations');
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        const refreshArray = refreshData.applications || [];
        setApplications(refreshArray);
      }

      // 선택된 신청 업데이트
      if (selectedApplication) {
        const updatedApp = { ...selectedApplication, status, notes: reviewNotes, reviewedAt: new Date().toISOString() };
        setSelectedApplication(updatedApp);
      }

      // 폼 리셋
      setReviewNotes('');

      toast({
        title: "성공",
        description: `등록 신청이 ${status === 'approved' ? '승인' : status === 'rejected' ? '거부' : '초기화'}되었습니다.`
      });
    } catch (error) {
      console.error('검토 처리 실패:', error);
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "검토 처리에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  // 처리 완료된 신청 초기화
  const handleClearProcessed = async () => {
    try {
      const response = await fetch('/api/admin/registrations/clear-processed', {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '초기화에 실패했습니다.');
      }

      const data = await response.json();
      console.log('🧹 처리 완료된 신청 초기화:', data);

      // 목록 새로고침
      const refreshResponse = await fetch('/api/admin/registrations');
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        const refreshArray = refreshData.applications || [];
        setApplications(refreshArray);
      }

      // 선택된 신청이 삭제되었다면 선택 해제
      if (selectedApplication && ['approved', 'rejected'].includes(selectedApplication.status)) {
        setSelectedApplication(null);
      }

      toast({
        title: "성공",
        description: data.message || "처리 완료된 신청이 초기화되었습니다."
      });
    } catch (error) {
      console.error('처리 완료된 신청 초기화 실패:', error);
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "초기화 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  // 통계 계산
  const stats = {
    pending: applications.filter(app => app.status === 'pending').length,
    approved: applications.filter(app => app.status === 'approved').length,
    rejected: applications.filter(app => app.status === 'rejected').length,
    total: applications.length
  };

  // 탭별 필터링된 신청 목록
  const filteredApplications = applications.filter(app => {
    if (activeTab === 'all') return true;
    return app.status === activeTab;
  });

  const handleApplicationClick = (application: RegistrationApplication) => {
    console.log('🔥 등록 신청 카드 클릭:', application.id, application.type);
    setSelectedApplication(application);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">등록 신청을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">등록 신청 관리</h1>
        {(stats.approved > 0 || stats.rejected > 0) && (
          <Button 
            onClick={handleClearProcessed}
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            처리 완료된 신청 초기화 (승인: {stats.approved}, 거부: {stats.rejected})
          </Button>
        )}
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">대기 중</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">승인됨</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">거부됨</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">전체</p>
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 탭 인터페이스 */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              전체 ({stats.total})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              대기 중 ({stats.pending})
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'approved'
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              승인됨 ({stats.approved})
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'rejected'
                  ? 'border-red-500 text-red-600 dark:text-red-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              거부됨 ({stats.rejected})
            </button>
          </nav>
        </div>
      </div>

      {/* 신청 목록 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {activeTab === 'all' ? '전체 등록 신청' : 
             activeTab === 'pending' ? '대기 중인 신청' :
             activeTab === 'approved' ? '승인된 신청' :
             '거부된 신청'} ({filteredApplications.length})
          </h2>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {filteredApplications.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    {activeTab === 'all' ? '등록 신청이 없습니다.' : 
                     activeTab === 'pending' ? '대기 중인 신청이 없습니다.' :
                     activeTab === 'approved' ? '승인된 신청이 없습니다.' :
                     '거부된 신청이 없습니다.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredApplications.map((application) => (
                <Card 
                  key={application.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleApplicationClick(application)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {application.type === 'trainer' ? 
                          <User className="w-6 h-6 text-blue-600" /> : 
                          application.type === 'institute' ?
                          <Building className="w-6 h-6 text-primary" /> :
                          <FileText className="w-6 h-6 text-green-600" />
                        }
                        <div>
                          <h3 className="font-semibold">
                            {application.type === 'trainer' 
                              ? application.applicantInfo?.personalInfo?.name 
                              : application.type === 'institute' 
                              ? application.applicantInfo?.basicInfo?.instituteName
                              : application.applicantInfo?.curriculumInfo?.title
                            }
                          </h3>
                          <p className="text-sm text-gray-600">
                            {new Date(application.submittedAt).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <TypeBadge type={application.type} />
                        <StatusBadge status={application.status} />
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      {application.type === 'trainer' ? (
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {application.applicantInfo?.personalInfo?.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {application.applicantInfo?.personalInfo?.email}
                          </span>
                        </div>
                      ) : application.type === 'institute' ? (
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Building className="w-4 h-4" />
                            {application.applicantInfo?.basicInfo?.instituteName}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {application.applicantInfo?.locationInfo?.address}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {application.applicantInfo?.curriculumInfo?.category}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {application.applicantInfo?.curriculumInfo?.trainerName}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* 상세 정보 */}
        <div>
          {selectedApplication ? (
            <ApplicationDetails 
              application={selectedApplication}
              reviewNotes={reviewNotes}
              setReviewNotes={setReviewNotes}
              onReview={handleReview}
            />
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">신청을 선택하여 상세 정보를 확인하세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ApplicationDetailsProps {
  application: RegistrationApplication;
  reviewNotes: string;
  setReviewNotes: (notes: string) => void;
  onReview: (id: string, status: 'approved' | 'rejected' | 'pending') => void;
}

function ApplicationDetails({ application, reviewNotes, setReviewNotes, onReview }: ApplicationDetailsProps) {
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

      {/* 기본 정보 */}
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
              <div>
                <Label>이름</Label>
                <p className="mt-1 p-2 border rounded">{application.applicantInfo?.personalInfo?.name || '-'}</p>
              </div>
              <div>
                <Label>연락처</Label>
                <p className="mt-1 p-2 border rounded">{application.applicantInfo?.personalInfo?.phone || '-'}</p>
              </div>
              <div>
                <Label>이메일</Label>
                <p className="mt-1 p-2 border rounded">{application.applicantInfo?.personalInfo?.email || '-'}</p>
              </div>
              <div>
                <Label>주소</Label>
                <p className="mt-1 p-2 border rounded">{application.applicantInfo?.personalInfo?.address || '-'}</p>
              </div>
            </>
          )}
          {application.type === 'institute' && (
            <>
              <div>
                <Label>기관명</Label>
                <p className="mt-1 p-2 border rounded">{application.applicantInfo?.basicInfo?.instituteName || '-'}</p>
              </div>
              <div>
                <Label>설립년도</Label>
                <p className="mt-1 p-2 border rounded">{application.applicantInfo?.basicInfo?.establishedYear || '-'}</p>
              </div>
              <div>
                <Label>연락처</Label>
                <p className="mt-1 p-2 border rounded">{application.applicantInfo?.basicInfo?.phone || '-'}</p>
              </div>
              <div>
                <Label>이메일</Label>
                <p className="mt-1 p-2 border rounded">{application.applicantInfo?.basicInfo?.email || '-'}</p>
              </div>
            </>
          )}
          {application.type === 'curriculum' && (
            <>
              <div>
                <Label>제목</Label>
                <p className="mt-1 p-2 border rounded">{application.applicantInfo?.curriculumInfo?.title || '-'}</p>
              </div>
              <div>
                <Label>카테고리</Label>
                <p className="mt-1 p-2 border rounded">{application.applicantInfo?.curriculumInfo?.category || '-'}</p>
              </div>
              <div>
                <Label>작성자</Label>
                <p className="mt-1 p-2 border rounded">{application.applicantInfo?.curriculumInfo?.trainerName || '-'}</p>
              </div>
              <div>
                <Label>가격</Label>
                <p className="mt-1 p-2 border rounded">₩{(application.applicantInfo?.curriculumInfo?.price || 0).toLocaleString()}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 검토 및 상태 변경 섹션 */}
      <div>
        <h3 className="text-lg font-semibold mb-3">
          {application.status === 'pending' ? '검토' : '상태 변경'}
        </h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="review-notes">검토 의견</Label>
            <Textarea
              id="review-notes"
              placeholder="승인/거부/초기화 사유를 입력하세요..."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex gap-2">
            {application.status !== 'approved' && (
              <Button 
                onClick={() => onReview(application.id, 'approved')}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                승인
              </Button>
            )}
            {application.status !== 'rejected' && (
              <Button 
                onClick={() => onReview(application.id, 'rejected')}
                variant="destructive"
              >
                <XCircle className="w-4 h-4 mr-2" />
                거부
              </Button>
            )}
            <Button 
              onClick={() => onReview(application.id, 'pending')}
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              초기화 (대기중으로 변경)
            </Button>
          </div>
        </div>
      </div>

      {/* 처리 결과 표시 */}
      {application.status !== 'pending' && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">
          <h4 className="font-semibold mb-2">현재 처리 상태</h4>
          <p><strong>상태:</strong> {application.status === 'approved' ? '승인됨' : '거부됨'}</p>
          <p><strong>처리일:</strong> {application.reviewedAt ? new Date(application.reviewedAt).toLocaleString('ko-KR') : '-'}</p>
          {application.notes && (
            <p><strong>검토 의견:</strong> {application.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}