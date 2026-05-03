import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Settings, 
  Users, 
  Shield, 
  Building, 
  Eye, 
  EyeOff,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  path: string;
  category: string;
  description: string;
  icon: string;
  requiredRole?: string;
}

interface MenuVisibilitySettings {
  role: string;
  visibleMenus: string[];
  hiddenMenus: string[];
}

interface RoleMenuConfig {
  [role: string]: {
    name: string;
    color: string;
    icon: React.ReactNode;
    menuItems: MenuItem[];
  };
}

const MenuVisibilityControl: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>('user');
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({});

  // Fetch current menu visibility settings
  const { data: menuSettings, isLoading } = useQuery({
    queryKey: ['/api/admin/menu-visibility'],
    queryFn: async () => {
      const response = await fetch('/api/admin/menu-visibility');
      if (!response.ok) {
        throw new Error('Failed to fetch menu settings');
      }
      return response.json();
    }
  });

  // Save menu visibility settings
  const saveMenuSettings = useMutation({
    mutationFn: async (data: { role: string; settings: Record<string, boolean> }) => {
      const response = await fetch('/api/admin/menu-visibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error('Failed to save menu settings');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "메뉴 설정 저장됨",
        description: "메뉴 표시 설정이 성공적으로 저장되었습니다."
      });
      setPendingChanges({});
      queryClient.invalidateQueries({ queryKey: ['/api/admin/menu-visibility'] });
    },
    onError: () => {
      toast({
        title: "저장 실패",
        description: "메뉴 설정 저장 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  const roleConfigs: RoleMenuConfig = {
    user: {
      name: '일반 사용자',
      color: 'bg-blue-500',
      icon: <Users className="w-4 h-4" />,
      menuItems: [
        { id: 'home', name: '홈', path: '/', category: '메인', description: '메인 홈페이지', icon: 'Home' },
        { id: 'learning', name: '학습', path: '/learning', category: '학습', description: '학습 관련 메뉴', icon: 'BookOpen' },
        { id: 'my-pets', name: '내 반려동물', path: '/my-pets', category: '개인', description: '반려동물 관리', icon: 'Heart' },
        { id: 'shop', name: '쇼핑', path: '/shop', category: '상거래', description: '온라인 쇼핑몰', icon: 'ShoppingCart' },
        { id: 'community', name: '커뮤니티', path: '/community', category: '소통', description: '사용자 커뮤니티', icon: 'MessageSquare' },
        { id: 'location', name: '위치 서비스', path: '/location', category: '도구', description: '근처 시설 찾기', icon: 'MapPin' },
        { id: 'messages', name: '메시지', path: '/messages', category: '도구', description: '메시지 관리', icon: 'MessageSquare' },
        { id: 'notifications', name: '알림', path: '/notifications', category: '도구', description: '알림 관리', icon: 'Bell' }
      ]
    },
    trainer: {
      name: '훈련사',
      color: 'bg-green-500',
      icon: <Shield className="w-4 h-4" />,
      menuItems: [
        { id: 'trainer-courses', name: '내 강좌', path: '/trainer/courses', category: '교육', description: '강좌 관리', icon: 'BookOpen' },
        { id: 'trainer-notebook', name: '알림장 관리', path: '/trainer/notebook', category: '교육', description: '학생 알림장', icon: 'FileText' },
        { id: 'trainer-students', name: '학생 관리', path: '/trainer/students', category: '교육', description: '담당 학생 관리', icon: 'Users' },
        { id: 'trainer-earnings', name: '수익 관리', path: '/trainer/earnings', category: '재정', description: '수익 현황', icon: 'DollarSign' },
        { id: 'trainer-points', name: '내 포인트', path: '/trainer/my-points', category: '재정', description: '포인트 관리', icon: 'Star' },
        { id: 'trainer-rest', name: '휴식 관리', path: '/trainer/rest-management', category: '관리', description: '휴식 신청', icon: 'Calendar' },
        { id: 'substitute-board', name: '대체 훈련사 게시판', path: '/trainer/substitute-board', category: '관리', description: '대체 훈련사 찾기', icon: 'RefreshCw' },
        { id: 'video-training', name: '영상 훈련', path: '/video-training', category: '도구', description: '영상 기반 훈련', icon: 'Video' },
        { id: 'video-call', name: '화상 수업', path: '/video-call', category: '도구', description: '실시간 화상 수업', icon: 'Video' },
        { id: 'ai-analysis', name: 'AI 분석', path: '/ai-analysis', category: '도구', description: 'AI 분석 도구', icon: 'Brain' }
      ]
    },
    institute: {
      name: '기관 관리자',
      color: 'bg-primary/50',
      icon: <Building className="w-4 h-4" />,
      menuItems: [
        { id: 'institute-trainers', name: '훈련사 관리', path: '/institute/trainers', category: '인사', description: '소속 훈련사 관리', icon: 'UserCog' },
        { id: 'institute-facility', name: '시설 관리', path: '/institute/facility', category: '운영', description: '기관 시설 관리', icon: 'Building' },
        { id: 'institute-rest', name: '휴식 관리', path: '/institute/rest-management', category: '인사', description: '휴식 승인 관리', icon: 'Calendar' },
        { id: 'substitute-management', name: '대체 훈련사 관리', path: '/institute/substitute-management', category: '인사', description: '대체 인력 관리', icon: 'RefreshCw' },
        { id: 'notebook-monitor', name: '알림장 모니터링', path: '/institute/notebook-monitor', category: '교육', description: '알림장 현황 모니터링', icon: 'Monitor' },
        { id: 'institute-points', name: '내 포인트', path: '/institute/my-points', category: '재정', description: '기관 포인트 관리', icon: 'Star' },
        { id: 'institute-earnings', name: '수익 관리', path: '/institute/earnings', category: '재정', description: '기관 수익 현황', icon: 'DollarSign' }
      ]
    },
    admin: {
      name: '시스템 관리자',
      color: 'bg-red-500',
      icon: <Settings className="w-4 h-4" />,
      menuItems: [
        { id: 'admin-dashboard', name: '통합 대시보드', path: '/admin/dashboard', category: '대시보드', description: '전체 시스템 현황', icon: 'BarChart3' },
        { id: 'users-management', name: '사용자 관리', path: '/admin/users', category: '대시보드', description: '전체 사용자 관리', icon: 'Users' },
        { id: 'trainers-management', name: '훈련사 관리', path: '/admin/trainers', category: '대시보드', description: '훈련사 현황 관리', icon: 'UserCheck' },
        { id: 'admin-analytics', name: '심층 분석', path: '/admin/analytics', category: '대시보드', description: '상세 데이터 분석', icon: 'Activity' },
        { id: 'members-status', name: '회원 현황', path: '/admin/members-status', category: '대시보드', description: '전체 회원 현황', icon: 'Users' },
        { id: 'substitute-overview', name: '대체 훈련사 현황', path: '/admin/substitute-overview', category: '대시보드', description: '대체 인력 현황', icon: 'RefreshCw' },
        { id: 'revenue-management', name: '수익 관리', path: '/admin/revenue', category: '대시보드', description: '전체 수익 관리', icon: 'DollarSign' },
        { id: 'curriculum-management', name: '커리큘럼 관리', path: '/admin/curriculum', category: '시스템', description: '교육 과정 관리', icon: 'BookOpen' },
        { id: 'registrations', name: '등록 신청 관리', path: '/admin/registrations', category: '시스템', description: '신규 등록 승인', icon: 'UserPlus' },
        { id: 'trainer-certification', name: '훈련사 인증 관리', path: '/admin/trainer-certification', category: '시스템', description: '훈련사 자격 관리', icon: 'Award' },
        { id: 'institutes-management', name: '기관 관리', path: '/admin/institutes', category: '시스템', description: '협력 기관 관리', icon: 'Building' },
        { id: 'business-registration', name: '업체 등록', path: '/admin/business-registration', category: '시스템', description: '새 업체 등록', icon: 'Building' },
        { id: 'review-management', name: '리뷰 관리', path: '/admin/review-management', category: '시스템', description: '사용자 리뷰 관리', icon: 'MessageSquare' },
        { id: 'info-correction', name: '정보 수정 요청', path: '/admin/info-correction-requests', category: '시스템', description: '정보 수정 승인', icon: 'Edit' },
        { id: 'contents-management', name: '콘텐츠 관리', path: '/admin/contents', category: '시스템', description: '사이트 콘텐츠 관리', icon: 'ImageIcon' },
        { id: 'community-management', name: '커뮤니티 관리', path: '/admin/community', category: '시스템', description: '커뮤니티 관리', icon: 'MessageSquare' },
        { id: 'content-crawler', name: '콘텐츠 크롤링', path: '/admin/content-crawler', category: '시스템', description: '자동 콘텐츠 수집', icon: 'Search' },
        { id: 'content-moderation', name: '콘텐츠 검열', path: '/admin/content-moderation', category: '시스템', description: '콘텐츠 검열 시스템', icon: 'Shield' },
        { id: 'commissions', name: '가격 관리', path: '/admin/commissions', category: '시스템', description: '수수료 및 가격 설정', icon: 'Percent' },
        { id: 'points-management', name: '포인트 관리', path: '/admin/points-management', category: '시스템', description: '포인트 시스템 관리', icon: 'Star' },
        { id: 'payment-integration', name: '결제연동 관리', path: '/admin/payment-integration', category: '시스템', description: '결제 시스템 관리', icon: 'CreditCard' },
        { id: 'shop-management', name: '쇼핑몰 관리', path: '/admin/shop', category: '시스템', description: '온라인 쇼핑몰 관리', icon: 'ShoppingBag' },
        { id: 'api-management', name: 'API 관리', path: '/admin/api-management', category: '시스템', description: 'API 키 및 설정', icon: 'Key' },
        { id: 'ai-api-management', name: 'AI API 관리', path: '/admin/ai-api-management', category: '시스템', description: 'AI 서비스 관리', icon: 'Bot' },
        { id: 'ai-optimization', name: 'AI 최적화', path: '/admin/ai-optimization', category: '시스템', description: 'AI 성능 최적화', icon: 'Brain' },
        { id: 'system-settings', name: '시스템 설정', path: '/admin/settings', category: '시스템', description: '전체 시스템 설정', icon: 'Settings' },
        { id: 'messaging-settings', name: '메시징 설정', path: '/admin/messaging-settings', category: '시스템', description: '메시지 시스템 설정', icon: 'MessageSquare' }
      ]
    }
  };

  const handleMenuToggle = (menuId: string, isVisible: boolean) => {
    setPendingChanges(prev => ({
      ...prev,
      [menuId]: isVisible
    }));
  };

  const handleSaveChanges = () => {
    if (Object.keys(pendingChanges).length === 0) {
      toast({
        title: "변경사항 없음",
        description: "저장할 변경사항이 없습니다."
      });
      return;
    }

    saveMenuSettings.mutate({
      role: selectedRole,
      settings: pendingChanges
    });
  };

  const getMenuVisibility = (menuId: string): boolean => {
    if (pendingChanges.hasOwnProperty(menuId)) {
      return pendingChanges[menuId];
    }
    return menuSettings?.[selectedRole]?.[menuId] ?? true;
  };

  const getVisibleCount = () => {
    const roleMenus = roleConfigs[selectedRole]?.menuItems || [];
    return roleMenus.filter(menu => getMenuVisibility(menu.id)).length;
  };

  const getTotalCount = () => {
    return roleConfigs[selectedRole]?.menuItems?.length || 0;
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">메뉴 표시 제어</h1>
          <p className="text-muted-foreground">
            권한별 사이드바 메뉴의 표시 여부를 관리합니다
          </p>
        </div>
        {hasPendingChanges && (
          <Button onClick={handleSaveChanges} disabled={saveMenuSettings.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {saveMenuSettings.isPending ? '저장 중...' : '변경사항 저장'}
          </Button>
        )}
      </div>

      <Tabs value={selectedRole} onValueChange={setSelectedRole}>
        <TabsList className="grid w-full grid-cols-4">
          {Object.entries(roleConfigs).map(([role, config]) => (
            <TabsTrigger key={role} value={role} className="flex items-center gap-2">
              {config.icon}
              {config.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(roleConfigs).map(([role, config]) => (
          <TabsContent key={role} value={role} className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${config.color} text-white`}>
                      {config.icon}
                    </div>
                    <div>
                      <CardTitle className="text-xl">{config.name} 메뉴 설정</CardTitle>
                      <CardDescription>
                        {config.name}에게 표시할 메뉴를 선택하세요
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {getVisibleCount()}/{getTotalCount()}
                    </div>
                    <div className="text-sm text-muted-foreground">표시 메뉴</div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <div className="space-y-4">
              {['메인', '학습', '교육', '개인', '상거래', '소통', '도구', '인사', '운영', '재정', '관리', '대시보드', '시스템'].map(category => {
                const categoryMenus = config.menuItems.filter(menu => menu.category === category);
                if (categoryMenus.length === 0) return null;

                return (
                  <Card key={category}>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {category === '메인' && <CheckCircle className="w-5 h-5 text-blue-500" />}
                        {category === '학습' && <CheckCircle className="w-5 h-5 text-green-500" />}
                        {category === '교육' && <CheckCircle className="w-5 h-5 text-green-500" />}
                        {category === '개인' && <CheckCircle className="w-5 h-5 text-primary" />}
                        {category === '상거래' && <CheckCircle className="w-5 h-5 text-orange-500" />}
                        {category === '소통' && <CheckCircle className="w-5 h-5 text-secondary-foreground" />}
                        {category === '도구' && <CheckCircle className="w-5 h-5 text-gray-500" />}
                        {category === '인사' && <CheckCircle className="w-5 h-5 text-indigo-500" />}
                        {category === '운영' && <CheckCircle className="w-5 h-5 text-secondary-foreground" />}
                        {category === '재정' && <CheckCircle className="w-5 h-5 text-yellow-500" />}
                        {category === '관리' && <CheckCircle className="w-5 h-5 text-red-500" />}
                        {category === '대시보드' && <CheckCircle className="w-5 h-5 text-blue-600" />}
                        {category === '시스템' && <CheckCircle className="w-5 h-5 text-gray-600" />}
                        {category}
                        <Badge variant="secondary">
                          {categoryMenus.filter(menu => getMenuVisibility(menu.id)).length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      {categoryMenus.map((menu, index) => {
                        const isVisible = getMenuVisibility(menu.id);
                        const hasChanges = pendingChanges.hasOwnProperty(menu.id);
                        
                        return (
                          <div key={menu.id} className="space-y-2">
                            <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                              <div className="flex items-center gap-3">
                                {isVisible ? (
                                  <Eye className="w-5 h-5 text-green-500" />
                                ) : (
                                  <EyeOff className="w-5 h-5 text-gray-400" />
                                )}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{menu.name}</h4>
                                    {hasChanges && (
                                      <Badge variant="outline" className="text-xs">
                                        변경됨
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {menu.description}
                                  </p>
                                  <p className="text-xs text-muted-foreground font-mono">
                                    {menu.path}
                                  </p>
                                </div>
                              </div>
                              <Switch
                                checked={isVisible}
                                onCheckedChange={(checked) => handleMenuToggle(menu.id, checked)}
                              />
                            </div>
                            {index < categoryMenus.length - 1 && <Separator />}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {hasPendingChanges && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-amber-800">
                    <AlertCircle className="w-5 h-5" />
                    <p className="font-medium">
                      저장되지 않은 변경사항이 {Object.keys(pendingChanges).length}개 있습니다.
                    </p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button 
                      onClick={handleSaveChanges} 
                      disabled={saveMenuSettings.isPending}
                      size="sm"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      저장
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setPendingChanges({})}
                      size="sm"
                    >
                      취소
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default MenuVisibilityControl;