import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Filter, UserPlus, Eye, Edit, Trash2, Shield } from "lucide-react";
import { useState } from "react";
import { getCSRFToken } from "@/lib/csrf";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

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

  // 실제 사용자 데이터 가져오기
  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['/api/admin/users'],
    select: (data: any) => data?.data || []
  });

  // 통계 데이터 가져오기
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/platform-stats'],
    select: (data: any) => data || {}
  });

  // 사용자 추가 mutation
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
      // 데이터 새로고침
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

  // 사용자 추가 함수
  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      alert("모든 필드를 입력해주세요.");
      return;
    }
    addUserMutation.mutate(newUser);
  };

  // 역할별 사용자 수 계산
  const usersByRole = (users || []).reduce((acc: any, user: any) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {});

  // 활성 사용자 수 계산 (최근 30일 내 로그인)
  const activeUsers = (users || []).filter((user: any) => {
    if (!user.lastLogin) return false;
    const lastLogin = new Date(user.lastLogin);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return lastLogin > thirtyDaysAgo;
  }).length;

  // 검색 및 필터링된 사용자
  const filteredUsers = (users || []).filter((user: any) => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-100 text-red-800"><Shield className="w-3 h-3 mr-1" />관리자</Badge>;
      case 'trainer':
        return <Badge className="bg-blue-100 text-blue-800">훈련사</Badge>;
      case 'institute-admin':
        return <Badge className="bg-primary/10 text-primary">기관관리자</Badge>;
      case 'user':
        return <Badge className="bg-green-100 text-green-800">일반회원</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">활성</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">비활성</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-800">정지</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 헤더 */}
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
                <Label htmlFor="name" className="text-right">
                  이름
                </Label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="col-span-3"
                  placeholder="홍길동"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  이메일
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="col-span-3"
                  placeholder="user@example.com"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">
                  비밀번호
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="col-span-3"
                  placeholder="••••••••"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  역할
                </Label>
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
              <Button 
                type="submit" 
                onClick={handleAddUser}
                disabled={addUserMutation.isPending}
              >
                {addUserMutation.isPending ? '추가 중...' : '사용자 추가'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 사용자</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{users.length || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              실시간 업데이트
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활성 사용자</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{activeUsers}</div>
            )}
            <p className="text-xs text-muted-foreground">
              최근 30일 내 접속
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">훈련사</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{usersByRole['trainer'] || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              전문 훈련사
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">기관관리자</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{usersByRole['institute-admin'] || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              기관 관리자
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 검색 및 필터 */}
      <Card>
        <CardHeader>
          <CardTitle>사용자 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="사용자명, 이메일로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="역할 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="admin">관리자</SelectItem>
                <SelectItem value="trainer">훈련사</SelectItem>
                <SelectItem value="institute-admin">기관관리자</SelectItem>
                <SelectItem value="user">일반회원</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              고급 필터
            </Button>
          </div>

          {/* 사용자 테이블 */}
          <div className="border rounded-lg">
            <div className="grid grid-cols-7 gap-4 p-4 font-medium border-b bg-muted/50">
              <div>사용자명</div>
              <div>이메일</div>
              <div>역할</div>
              <div>상태</div>
              <div>최종 접속</div>
              <div>가입일</div>
              <div>작업</div>
            </div>
            {usersLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="grid grid-cols-7 gap-4 p-4 border-b">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              ))
            ) : usersError ? (
              <div className="p-8 text-center text-red-500">
                데이터를 불러오는 중 오류가 발생했습니다.
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {searchTerm || roleFilter !== 'all' ? '검색 결과가 없습니다.' : '등록된 사용자가 없습니다.'}
              </div>
            ) : (
              filteredUsers.map((user: any) => (
                <div key={user.id} className="grid grid-cols-7 gap-4 p-4 border-b last:border-b-0">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                  <div>{getRoleBadge(user.role)}</div>
                  <div>{getStatusBadge(user.isVerified ? 'active' : 'inactive')}</div>
                  <div className="text-sm">{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('ko-KR') : '없음'}</div>
                  <div className="text-sm">{new Date(user.createdAt).toLocaleDateString('ko-KR')}</div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        console.log('사용자 상세보기:', user.name);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        console.log('사용자 편집:', user.name);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        console.log('사용자 삭제:', user.name);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}