import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Eye,
  EyeOff,
  Plus,
  Edit,
  Trash2,
  Menu as MenuIcon,
  ChevronDown,
  ChevronRight,
  Settings,
  Users,
  Shield,
  Building,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuItemEntry {
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
    menuItems: MenuItemEntry[];
  };
}

// ─── MenuStructureTab ─────────────────────────────────────────────────────────

function MenuStructureTab() {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    main: true,
    features: true,
    admin: true
  });

  const menuGroups = [
    {
      id: 'main',
      name: '메인 메뉴',
      description: '기본 네비게이션 메뉴',
      visible: true,
      order: 1,
      items: [
        { id: 'home', name: '홈', path: '/', visible: true, roles: ['all'] },
        { id: 'courses', name: '강의', path: '/courses', visible: true, roles: ['all'] },
        { id: 'trainers', name: '훈련사', path: '/trainers', visible: true, roles: ['all'] },
        { id: 'institutes', name: '기관', path: '/institutes', visible: true, roles: ['all'] }
      ]
    },
    {
      id: 'features',
      name: '특별 기능',
      description: '고급 기능 메뉴',
      visible: true,
      order: 2,
      items: [
        { id: 'video-training', name: '영상 훈련', path: '/video-training', visible: true, roles: ['all'] },
        { id: 'video-call', name: '화상 상담', path: '/video-call', visible: true, roles: ['user', 'trainer'] },
        { id: 'ai-analysis', name: 'AI 분석', path: '/ai-analysis', visible: true, roles: ['user'] },
        { id: 'chatbot', name: '챗봇', path: '/chatbot', visible: true, roles: ['all'] }
      ]
    },
    {
      id: 'admin',
      name: '관리자',
      description: '관리자 전용 메뉴',
      visible: true,
      order: 3,
      items: [
        { id: 'admin-dashboard', name: '관리자 대시보드', path: '/admin/dashboard', visible: true, roles: ['admin'] },
        { id: 'user-management', name: '사용자 관리', path: '/admin/users', visible: true, roles: ['admin'] },
        { id: 'menu-management', name: '메뉴 관리', path: '/admin/menu-management', visible: true, roles: ['admin'] }
      ]
    }
  ];

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const getRolesBadge = (roles: string[]) => {
    if (roles.includes('all')) {
      return <Badge className="bg-success/10 text-success">모든 사용자</Badge>;
    }
    return (
      <div className="flex gap-1 flex-wrap">
        {roles.map(role => {
          const roleMap: Record<string, { label: string; className: string }> = {
            admin: { label: '관리자', className: 'bg-destructive/10 text-destructive' },
            trainer: { label: '훈련사', className: 'bg-primary/10 text-primary' },
            'institute-admin': { label: '기관관리자', className: 'bg-primary/10 text-primary' },
            user: { label: '일반회원', className: 'bg-gray-100 text-gray-800' }
          };
          const roleInfo = roleMap[role] || { label: role, className: 'bg-gray-100 text-gray-800' };
          return (
            <Badge key={role} className={roleInfo.className}>
              {roleInfo.label}
            </Badge>
          );
        })}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>메뉴 구조 편집</CardTitle>
        <CardDescription>현재 사이드바 메뉴 구조 및 항목 표시 설정</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {menuGroups.map((group) => (
          <div key={group.id} className="border rounded-lg overflow-hidden">
            <div
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 cursor-pointer"
              onClick={() => toggleGroup(group.id)}
            >
              <div className="flex items-center gap-2">
                {expandedGroups[group.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <MenuIcon className="h-4 w-4" />
                <span className="font-medium">{group.name}</span>
                <Badge variant="outline">{group.description}</Badge>
              </div>
              <div className="flex items-center gap-2">
                {group.visible ? <Eye className="h-4 w-4 text-green-500" /> : <EyeOff className="h-4 w-4 text-red-500" />}
                <Switch checked={group.visible} />
              </div>
            </div>
            {expandedGroups[group.id] && (
              <div className="divide-y">
                {group.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 pl-8">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">{item.path}</code>
                      {getRolesBadge(item.roles)}
                    </div>
                    <div className="flex items-center gap-2">
                      {item.visible ? <Eye className="h-4 w-4 text-green-500" /> : <EyeOff className="h-4 w-4 text-red-500" />}
                      <Switch checked={item.visible} />
                      <Button variant="ghost" size="sm"><Edit className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="sm" className="text-red-500"><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
                <div className="p-3 pl-8">
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    메뉴 항목 추가
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── MenuVisibilityControlTab (inlined from MenuVisibilityControl.tsx) ────────

function MenuVisibilityControlTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>('user');
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({});

  const { data: menuSettings, isLoading } = useQuery({
    queryKey: ['/api/admin/menu-visibility'],
    queryFn: async () => {
      const response = await fetch('/api/admin/menu-visibility');
      if (!response.ok) throw new Error('Failed to fetch menu settings');
      return response.json();
    }
  });

  const saveMenuSettings = useMutation({
    mutationFn: async (data: { role: string; settings: Record<string, boolean> }) => {
      const response = await fetch('/api/admin/menu-visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to save menu settings');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "메뉴 설정 저장됨", description: "메뉴 표시 설정이 성공적으로 저장되었습니다." });
      setPendingChanges({});
      queryClient.invalidateQueries({ queryKey: ['/api/admin/menu-visibility'] });
    },
    onError: () => {
      toast({ title: "저장 실패", description: "메뉴 설정 저장 중 오류가 발생했습니다.", variant: "destructive" });
    }
  });

  const roleConfigs: RoleMenuConfig = {
    user: {
      name: '일반 사용자',
      color: 'bg-primary',
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
      color: 'bg-success',
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
      color: 'bg-destructive',
      icon: <Settings className="w-4 h-4" />,
      menuItems: [
        { id: 'admin-dashboard', name: '통합 대시보드', path: '/admin/dashboard', category: '대시보드', description: '전체 시스템 현황', icon: 'BarChart3' },
        { id: 'users-management', name: '사용자 관리', path: '/admin/users', category: '대시보드', description: '전체 사용자 관리', icon: 'Users' },
        { id: 'trainers-management', name: '훈련사 관리', path: '/admin/trainers', category: '대시보드', description: '훈련사 현황 관리', icon: 'UserCheck' },
        { id: 'admin-analytics', name: '심층 분석', path: '/admin/analytics', category: '대시보드', description: '상세 데이터 분석', icon: 'Activity' },
        { id: 'revenue-management', name: '수익 관리', path: '/admin/revenue', category: '대시보드', description: '전체 수익 관리', icon: 'DollarSign' },
        { id: 'curriculum-management', name: '커리큘럼 관리', path: '/admin/curriculum', category: '시스템', description: '교육 과정 관리', icon: 'BookOpen' },
        { id: 'courses-management', name: '강의 관리', path: '/admin/courses', category: '시스템', description: '강의 관리', icon: 'Presentation' },
        { id: 'institutes-management', name: '기관 관리', path: '/admin/institutes', category: '시스템', description: '협력 기관 관리', icon: 'Building' },
        { id: 'contents-management', name: '콘텐츠 관리', path: '/admin/contents', category: '시스템', description: '사이트 콘텐츠 관리', icon: 'ImageIcon' },
        { id: 'community-management', name: '커뮤니티 관리', path: '/admin/community', category: '시스템', description: '커뮤니티 관리', icon: 'MessageSquare' },
        { id: 'commissions', name: '정산·수수료', path: '/admin/commission', category: '시스템', description: '수수료 및 가격 설정', icon: 'Percent' },
        { id: 'shop-management', name: '쇼핑몰 관리', path: '/admin/shop', category: '시스템', description: '온라인 쇼핑몰 관리', icon: 'ShoppingBag' },
        { id: 'ai-api-management', name: 'AI·API 관리', path: '/admin/ai-api-management', category: '시스템', description: 'AI 서비스 관리', icon: 'Bot' },
        { id: 'system-settings', name: '시스템 설정', path: '/admin/settings', category: '시스템', description: '전체 시스템 설정', icon: 'Settings' },
        { id: 'notifications-management', name: '알림 관리', path: '/admin/notifications', category: '시스템', description: '알림 및 채널 관리', icon: 'Bell' }
      ]
    }
  };

  const handleMenuToggle = (menuId: string, isVisible: boolean) => {
    setPendingChanges(prev => ({ ...prev, [menuId]: isVisible }));
  };

  const handleSaveChanges = () => {
    if (Object.keys(pendingChanges).length === 0) {
      toast({ title: "변경사항 없음", description: "저장할 변경사항이 없습니다." });
      return;
    }
    saveMenuSettings.mutate({ role: selectedRole, settings: pendingChanges });
  };

  const getMenuVisibility = (menuId: string): boolean => {
    if (Object.prototype.hasOwnProperty.call(pendingChanges, menuId)) {
      return pendingChanges[menuId];
    }
    return menuSettings?.[selectedRole]?.[menuId] ?? true;
  };

  const getVisibleCount = () => {
    const roleMenus = roleConfigs[selectedRole]?.menuItems || [];
    return roleMenus.filter(menu => getMenuVisibility(menu.id)).length;
  };

  const getTotalCount = () => roleConfigs[selectedRole]?.menuItems?.length || 0;

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
          <h2 className="text-xl font-bold">메뉴 표시 제어</h2>
          <p className="text-muted-foreground">권한별 사이드바 메뉴의 표시 여부를 관리합니다</p>
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
                      <CardDescription>{config.name}에게 표시할 메뉴를 선택하세요</CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{getVisibleCount()}/{getTotalCount()}</div>
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
                        <CheckCircle className="w-5 h-5 text-primary" />
                        {category}
                        <Badge variant="secondary">
                          {categoryMenus.filter(menu => getMenuVisibility(menu.id)).length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      {categoryMenus.map((menu, index) => {
                        const isVisible = getMenuVisibility(menu.id);
                        const hasChanges = Object.prototype.hasOwnProperty.call(pendingChanges, menu.id);
                        return (
                          <div key={menu.id} className="space-y-2">
                            <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                              <div className="flex items-center gap-3">
                                {isVisible ? <Eye className="w-5 h-5 text-success" /> : <EyeOff className="w-5 h-5 text-gray-400" />}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{menu.name}</h4>
                                    {hasChanges && <Badge variant="outline" className="text-xs">변경됨</Badge>}
                                  </div>
                                  <p className="text-sm text-muted-foreground">{menu.description}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{menu.path}</p>
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
              <Card className="border-warning/30 bg-warning/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-warning">
                    <AlertCircle className="w-5 h-5" />
                    <p className="font-medium">저장되지 않은 변경사항이 {Object.keys(pendingChanges).length}개 있습니다.</p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button onClick={handleSaveChanges} disabled={saveMenuSettings.isPending} size="sm">
                      <Save className="w-4 h-4 mr-2" />저장
                    </Button>
                    <Button variant="outline" onClick={() => setPendingChanges({})} size="sm">취소</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function AdminMenuManagement() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">메뉴 관리</h1>
      <Tabs defaultValue="structure">
        <TabsList>
          <TabsTrigger value="structure">메뉴 구조</TabsTrigger>
          <TabsTrigger value="visibility">표시 설정</TabsTrigger>
        </TabsList>
        <TabsContent value="structure" className="mt-4">
          <MenuStructureTab />
        </TabsContent>
        <TabsContent value="visibility" className="mt-4">
          <MenuVisibilityControlTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
