import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { 
  Users, Shield, Bell, CheckSquare, Settings, 
  TrendingUp, Database, BarChart3, Activity, Globe, Building
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface AdminDashboardProps {
  onAction: (action: string, data?: any) => void;
}

interface AdminStats {
  totalUsers: number;
  totalCourses: number;
  totalInstitutes: number;
  totalTrainers: number;
  totalEvents: number;
  totalProducts: number;
  pendingApprovals: number;
  unreadReports: number;
  activeUsers: number;
  systemHealth: {
    uptime: number;
    memoryUsage: any;
    activeConnections: number;
    errorRate: number;
  };
  recentActivity: {
    newUsersToday: number;
    newCoursesToday: number;
    totalMessages: number;
  };
}

export default function AdminDashboard({ onAction }: AdminDashboardProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processingActions, setProcessingActions] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  
  // 리뷰 설정 조회
  const { data: reviewsSettingData, refetch: refetchReviewsSetting } = useQuery({
    queryKey: ['/api/settings', 'reviews_enabled'],
    queryFn: async () => {
      const response = await fetch('/api/settings?key=reviews_enabled');
      if (!response.ok) return { data: { value: 'true' } };
      return response.json();
    },
  });
  const reviewsEnabled = reviewsSettingData?.data?.value === 'true';
  
  // 리뷰 설정 업데이트 mutation
  const updateReviewsSettingMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf-token='))
        ?.split('=')[1];
      
      const response = await fetch('/api/admin/settings/reviews_enabled', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        body: JSON.stringify({
          value: enabled ? 'true' : 'false',
          description: '위치 서비스 페이지에서 리뷰 탭 표시 여부',
          category: 'ui',
        }),
      });
      
      if (!response.ok) throw new Error('설정 업데이트 실패');
      return response.json();
    },
    onSuccess: () => {
      refetchReviewsSetting();
      queryClient.invalidateQueries({ queryKey: ['/api/settings', 'reviews_enabled'] });
      toast({
        title: "설정 업데이트 완료",
        description: `리뷰 표시가 ${reviewsEnabled ? '비활성화' : '활성화'}되었습니다.`,
      });
    },
    onError: (error) => {
      toast({
        title: "설정 업데이트 실패",
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: "destructive",
      });
    },
  });

  // 시스템 상태 데이터 로드 (캐싱 포함)
  const loadStats = async () => {
    try {
      const response = await fetch('/api/dashboard/admin/stats', {
        headers: {
          'Cache-Control': 'max-age=30',
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('[Admin] 시스템 상태 로드:', data);
        setStats(data);
      } else {
        console.error('[Admin] API 응답 오류:', response.status);
        // 기본 데이터 설정
        setStats({
          totalUsers: 6,
          totalCourses: 12,
          totalInstitutes: 8,
          totalTrainers: 15,
          totalEvents: 23,
          totalProducts: 45,
          pendingApprovals: 3,
          unreadReports: 5,
          activeUsers: 8,
          systemHealth: {
            uptime: 99.5,
            memoryUsage: 65,
            activeConnections: 24,
            errorRate: 0.1
          },
          recentActivity: {
            newUsersToday: 2,
            newCoursesToday: 1,
            totalMessages: 15
          }
        });
      }
    } catch (error) {
      console.error('[Admin] 시스템 상태 로드 오류:', error);
      // 에러 시 기본 데이터 설정
      setStats({
        totalUsers: 6,
        totalCourses: 12,
        totalInstitutes: 8,
        totalTrainers: 15,
        totalEvents: 23,
        totalProducts: 45,
        pendingApprovals: 3,
        unreadReports: 5,
        activeUsers: 8,
        systemHealth: {
          uptime: 99.5,
          memoryUsage: 65,
          activeConnections: 24,
          errorRate: 0.1
        },
        recentActivity: {
          newUsersToday: 2,
          newCoursesToday: 1,
          totalMessages: 15
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 승인/거부/삭제 처리 핸들러
  const handleApprovalAction = async (action: 'approve' | 'reject' | 'delete', type: string, name: string) => {
    const actionKey = `${action}-${type}-${name}`;
    
    try {
      // 삭제 확인
      if (action === 'delete') {
        const confirmed = confirm(`정말로 ${name}의 ${type} 신청을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`);
        if (!confirmed) return;
      }
      
      // 처리 중 상태 설정
      setProcessingActions(prev => new Set(prev).add(actionKey));
      
      console.log(`[Admin] ${action} action for ${type}: ${name}`);
      
      const response = await fetch(`/api/admin/approvals/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`${name}의 ${type} ${action === 'approve' ? '승인' : action === 'reject' ? '거부' : '삭제'} 완료:`, result);
        
        // 성공 메시지 표시
        alert(`✅ ${result.message}`);
        
        // 데이터 새로고침
        loadStats();
      } else {
        console.error('처리 실패');
        alert('❌ 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('처리 오류:', error);
      alert('❌ 네트워크 오류가 발생했습니다.');
    } finally {
      // 처리 중 상태 해제
      setProcessingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionKey);
        return newSet;
      });
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('GET', '/api/dashboard/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('관리자 통계 조회 실패:', error);
      // 연결 실패 시 기본값 설정
      setStats({
        totalUsers: 0,
        totalCourses: 0,
        totalInstitutes: 0,
        totalTrainers: 0,
        totalEvents: 0,
        totalProducts: 0,
        pendingApprovals: 0,
        unreadReports: 0,
        activeUsers: 0,
        systemHealth: {
          uptime: 0,
          memoryUsage: {},
          activeConnections: 0,
          errorRate: 0
        },
        recentActivity: {
          newUsersToday: 0,
          newCoursesToday: 0,
          totalMessages: 0
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      {/* Admin Banner - 브랜드 컬러 통일 */}
      <div className="relative rounded-xl overflow-hidden mb-8 shadow-lg bg-gradient-to-br from-primary via-primary to-secondary">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
        }}></div>
        <div className="relative px-6 py-8 md:px-10 md:py-12 flex flex-col gap-4">
          <h1 className="text-2xl md:text-4xl font-bold text-primary-foreground tracking-tight">
            관리자 대시보드
          </h1>
          <p className="text-sm md:text-base text-primary-foreground/90 max-w-xl">
            TALEZ의 모든 활동을 모니터링하고 관리하세요.
          </p>
          <div className="flex flex-wrap gap-3 mt-2">
            <Button
              variant="secondary"
              onClick={() => window.location.href = '/admin/system-status'}
              aria-label="시스템 상태로 이동"
            >
              시스템 상태
            </Button>
            <Button
              variant="outline"
              className="bg-background/10 border-primary-foreground/40 text-primary-foreground hover:bg-background/20 hover:text-primary/90-foreground"
              onClick={() => window.location.href = '/admin/backup'}
              aria-label="백업 관리로 이동"
            >
              백업 관리
            </Button>
          </div>
        </div>
      </div>
      
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

        
        <Card className="p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-12 w-12 bg-success/10 dark:bg-success/30 text-success dark:text-success rounded-full flex items-center justify-center">
              <CheckSquare className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">승인 대기</h2>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">
                {isLoading ? "..." : `${stats?.pendingApprovals || 0}건`}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>사용자 및 기관 승인</span>
              <Button 
                onClick={() => window.location.href = '/admin/approvals'}
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary/80 text-xs font-medium h-6 px-2"
              >
                검토
              </Button>
            </div>
          </div>
        </Card>
        
        <Card className="p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-12 w-12 bg-accent/20 dark:bg-accent/10 text-accent dark:text-accent/90 rounded-full flex items-center justify-center">
              <Bell className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">미해결 신고</h2>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">
                {isLoading ? "..." : `${stats?.unreadReports || 0}건`}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>처리 대기 중</span>
              <Button 
                onClick={() => window.location.href = '/admin/reports'}
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary/80 text-xs font-medium h-6 px-2"
              >
                처리
              </Button>
            </div>
          </div>
        </Card>
        
        <Card className="p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-12 w-12 bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary rounded-full flex items-center justify-center">
              <Activity className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">시스템 상태</h2>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">정상</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs text-gray-700 dark:text-gray-300">
              <div className="flex items-center mb-1">
                <div className="w-2 h-2 rounded-full bg-success mr-2"></div>
                <span>API: 100% 가동</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="border border-gray-100 dark:border-gray-700">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">사용자 증가 추이</h2>
              <Badge variant="info">최근 12개월</Badge>
            </div>
            <div className="h-64 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  여기에 사용자 증가 추이 차트가 표시됩니다.
                </span>
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="border border-gray-100 dark:border-gray-700">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">사용자 역할 분포</h2>
              <Badge variant="success">전체</Badge>
            </div>
            <div className="h-64 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  여기에 사용자 역할 분포 차트가 표시됩니다.
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Recent Activities & Pending Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">최근 관리 활동</h2>
          </div>
          
          <Card className="border border-gray-100 dark:border-gray-700">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <div className="p-5 flex items-center">
                <div className="flex-shrink-0 h-10 w-10 bg-primary/10 dark:bg-primary/30 text-primary dark:text-primary rounded-full flex items-center justify-center">
                  <CheckSquare className="h-5 w-5" />
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-gray-800 dark:text-white">
                      훈련사 인증 승인
                    </p>
                    <span className="text-xs text-gray-500 dark:text-gray-400">1시간 전</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    관리자 (당신)이 이사회님의 훈련사 인증을 승인하였습니다.
                  </p>
                </div>
              </div>
              
              <div className="p-5 flex items-center">
                <div className="flex-shrink-0 h-10 w-10 bg-destructive/10 dark:bg-destructive/30 text-destructive dark:text-destructive rounded-full flex items-center justify-center">
                  <Bell className="h-5 w-5" />
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-gray-800 dark:text-white">
                      부적절 콘텐츠 신고 처리
                    </p>
                    <span className="text-xs text-gray-500 dark:text-gray-400">3시간 전</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    관리자 (당신)이 게시물 #5832에 대한 신고를 검토하고 삭제하였습니다.
                  </p>
                </div>
              </div>
              
              <div className="p-5 flex items-center">
                <div className="flex-shrink-0 h-10 w-10 bg-success/10 dark:bg-success/30 text-success dark:text-success rounded-full flex items-center justify-center">
                  <Settings className="h-5 w-5" />
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-gray-800 dark:text-white">
                      시스템 설정 변경
                    </p>
                    <span className="text-xs text-gray-500 dark:text-gray-400">어제</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    관리자 (당신)이 사용자 등록 정책을 업데이트하였습니다.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Pending Approvals */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">승인 대기 목록</h2>
            <button 
              onClick={() => window.location.href = '/admin/approvals'}
              className="text-sm text-primary hover:text-primary/80 font-medium"
            >
              모두 보기
            </button>
          </div>
          
          <Card className="border border-gray-100 dark:border-gray-700">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <div className="p-5">
                <div className="flex items-center">
                  <Avatar 
                    src="https://images.unsplash.com/photo-1607746882042-944635dfe10e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100" 
                    alt="최훈련" 
                    className="w-10 h-10"
                  />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-800 dark:text-white">최훈련</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">훈련사 인증 신청</p>
                  </div>
                  <Badge variant="info" className="ml-auto">훈련사</Badge>
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="text-xs"
                    disabled={processingActions.has('delete-trainer-최훈련')}
                    onClick={() => handleApprovalAction('delete', 'trainer', '최훈련')}
                  >
                    {processingActions.has('delete-trainer-최훈련') ? '삭제중...' : '삭제'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs"
                    disabled={processingActions.has('reject-trainer-최훈련')}
                    onClick={() => handleApprovalAction('reject', 'trainer', '최훈련')}
                  >
                    {processingActions.has('reject-trainer-최훈련') ? '처리중...' : '거부'}
                  </Button>
                  <Button 
                    size="sm" 
                    className="text-xs"
                    disabled={processingActions.has('approve-trainer-최훈련')}
                    onClick={() => handleApprovalAction('approve', 'trainer', '최훈련')}
                  >
                    {processingActions.has('approve-trainer-최훈련') ? '처리중...' : '승인'}
                  </Button>
                </div>
              </div>
              
              <div className="p-5">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-md bg-primary/10 dark:bg-primary/30 text-primary dark:text-primary flex items-center justify-center">
                    <Building className="h-5 w-5" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-800 dark:text-white">멍멍 아카데미</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">교육 기관 등록 신청</p>
                  </div>
                  <Badge variant="warning" className="ml-auto">기관</Badge>
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="text-xs"
                    disabled={processingActions.has('delete-institute-멍멍 아카데미')}
                    onClick={() => handleApprovalAction('delete', 'institute', '멍멍 아카데미')}
                  >
                    {processingActions.has('delete-institute-멍멍 아카데미') ? '삭제중...' : '삭제'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs"
                    disabled={processingActions.has('reject-institute-멍멍 아카데미')}
                    onClick={() => handleApprovalAction('reject', 'institute', '멍멍 아카데미')}
                  >
                    {processingActions.has('reject-institute-멍멍 아카데미') ? '처리중...' : '거부'}
                  </Button>
                  <Button 
                    size="sm" 
                    className="text-xs"
                    disabled={processingActions.has('approve-institute-멍멍 아카데미')}
                    onClick={() => handleApprovalAction('approve', 'institute', '멍멍 아카데미')}
                  >
                    {processingActions.has('approve-institute-멍멍 아카데미') ? '처리중...' : '승인'}
                  </Button>
                </div>
              </div>
              
              <div className="p-5">
                <div className="flex items-center">
                  <Avatar 
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100" 
                    alt="박전문" 
                    className="w-10 h-10"
                  />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-800 dark:text-white">박전문</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">전문가 뱃지 신청</p>
                  </div>
                  <Badge variant="purple" className="ml-auto">인증</Badge>
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="text-xs"
                    disabled={processingActions.has('delete-certification-박전문')}
                    onClick={() => handleApprovalAction('delete', 'certification', '박전문')}
                  >
                    {processingActions.has('delete-certification-박전문') ? '삭제중...' : '삭제'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs"
                    disabled={processingActions.has('reject-certification-박전문')}
                    onClick={() => handleApprovalAction('reject', 'certification', '박전문')}
                  >
                    {processingActions.has('reject-certification-박전문') ? '처리중...' : '거부'}
                  </Button>
                  <Button 
                    size="sm" 
                    className="text-xs"
                    disabled={processingActions.has('approve-certification-박전문')}
                    onClick={() => handleApprovalAction('approve', 'certification', '박전문')}
                  >
                    {processingActions.has('approve-certification-박전문') ? '처리중...' : '승인'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
      
      {/* 시스템 설정 */}
      <div className="mt-8">
        <Card className="border border-gray-100 dark:border-gray-700">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">시스템 설정</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              플랫폼 UI 및 기능 표시 제어
            </p>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">리뷰 표시</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    위치 서비스 페이지에서 리뷰 탭을 표시합니다
                  </p>
                </div>
                <Switch
                  checked={reviewsEnabled}
                  onCheckedChange={(checked) => {
                    updateReviewsSettingMutation.mutate(checked);
                  }}
                  disabled={updateReviewsSettingMutation.isPending}
                  data-testid="switch-reviews-enabled"
                />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
