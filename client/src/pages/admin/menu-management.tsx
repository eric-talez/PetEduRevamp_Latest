import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { 
  Settings, 
  Eye, 
  EyeOff, 
  Plus, 
  Edit, 
  Trash2, 
  Menu as MenuIcon,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { useState } from "react";

export default function AdminMenuManagement() {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    main: true,
    features: true,
    admin: true
  });

  // 샘플 메뉴 구조 데이터
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
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const getRolesBadge = (roles: string[]) => {
    if (roles.includes('all')) {
      return <Badge className="bg-green-100 text-green-800">모든 사용자</Badge>;
    }
    return (
      <div className="flex gap-1 flex-wrap">
        {roles.map(role => {
          const roleMap: Record<string, { label: string; className: string }> = {
            admin: { label: '관리자', className: 'bg-red-100 text-red-800' },
            trainer: { label: '훈련사', className: 'bg-blue-100 text-blue-800' },
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
    <div className="container mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">메뉴 관리</h1>
          <p className="text-muted-foreground">사이드바 메뉴 구조와 권한을 관리합니다</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            전역 설정
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            새 메뉴 추가
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 메뉴 그룹</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{menuGroups.length}</div>
            <p className="text-xs text-muted-foreground">
              활성 그룹 {menuGroups.filter(g => g.visible).length}개
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 메뉴 항목</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {menuGroups.reduce((total, group) => total + group.items.length, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              활성 항목 {menuGroups.reduce((total, group) => 
                total + group.items.filter(item => item.visible).length, 0
              )}개
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">공개 메뉴</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {menuGroups.reduce((total, group) => 
                total + group.items.filter(item => item.roles.includes('all')).length, 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              모든 사용자 접근 가능
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">관리자 전용</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {menuGroups.reduce((total, group) => 
                total + group.items.filter(item => 
                  item.roles.includes('admin') && !item.roles.includes('all')
                ).length, 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              관리자만 접근 가능
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 메뉴 구조 */}
      <Card>
        <CardHeader>
          <CardTitle>메뉴 구조</CardTitle>
          <CardDescription>
            메뉴 그룹과 항목들을 관리하고 표시 순서를 조정할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {menuGroups.map((group) => (
            <div key={group.id} className="border rounded-lg p-4">
              {/* 그룹 헤더 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleGroup(group.id)}
                    className="p-0 h-auto"
                  >
                    {expandedGroups[group.id] ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  <MenuIcon className="h-4 w-4" />
                  <div>
                    <h3 className="font-semibold">{group.name}</h3>
                    <p className="text-sm text-muted-foreground">{group.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">순서: {group.order}</span>
                  <Switch checked={group.visible} />
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      // 메뉴 그룹 편집 기능 구현
                      alert(`${group.name} 그룹 편집 기능은 곧 구현됩니다.`);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      // 메뉴 그룹 삭제 확인 및 기능 구현
                      if (confirm(`${group.name} 그룹을 정말 삭제하시겠습니까?`)) {
                        alert(`${group.name} 그룹 삭제 기능은 곧 구현됩니다.`);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* 그룹 항목들 */}
              {expandedGroups[group.id] && (
                <div className="ml-6 space-y-2">
                  {group.items.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full" />
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">{item.path}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getRolesBadge(item.roles)}
                        <div className="flex items-center gap-1">
                          {item.visible ? (
                            <Eye className="h-4 w-4 text-green-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          )}
                          <Switch checked={item.visible} />
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            // 메뉴 항목 편집 기능 구현
                            alert(`${item.name} 항목 편집 기능은 곧 구현됩니다.`);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            // 메뉴 항목 삭제 확인 및 기능 구현
                            if (confirm(`${item.name} 항목을 정말 삭제하시겠습니까?`)) {
                              alert(`${item.name} 항목 삭제 기능은 곧 구현됩니다.`);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="ml-5 mt-2"
                    onClick={() => {
                      // 메뉴 항목 추가 기능 구현
                      alert(`${group.name} 그룹에 새 항목 추가 기능은 곧 구현됩니다.`);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    메뉴 항목 추가
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}