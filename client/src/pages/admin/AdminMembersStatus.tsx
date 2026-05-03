import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  UserCheck, 
  Building2, 
  PawPrint, 
  Crown,
  Loader2,
  Shield,
  Heart,
  GraduationCap,
  RefreshCw
} from 'lucide-react';

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

export default function AdminMembersStatus() {
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
        // setStats(data.data.stats || { // There is not setStats function in origin code, should not be added
        //   totalUsers: 0//   activeUsers: 0,
        //   pendingUsers: 0,
        //   inactiveUsers: 0,
        //   verifiedUsers: 0,
        //   byRole: {
        //     'pet-owner': 0,
        //     'trainer': 0,
        //     'institute-admin': 0,
        //     'admin': 0
        //   },
        //   recentJoins: 0
        // });
      } else {
        console.error('회원 상태 조회 실패:', result.message);
        setError(result.message || '데이터를 가져오는데 실패했습니다.');
        // 기본값 설정
        // setStats({ // There is not setStats function in origin code, should not be added
        //   totalUsers: 0,
        //   activeUsers: 0,
        //   pendingUsers: 0,
        //   inactiveUsers: 0,
        //   verifiedUsers: 0,
        //   byRole: {
        //     'pet-owner': 0,
        //     'trainer': 0,
        //     'institute-admin': 0,
        //     'admin': 0
        //   },
        //   recentJoins: 0
        // });
      }
    } catch (err) {
      console.error('회원 상태 조회 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      // 에러 시 기본값 설정
      // setStats({ // There is not setStats function in origin code, should not be added
      //   totalUsers: 0,
      //   activeUsers: 0,
      //   pendingUsers: 0,
      //   inactiveUsers: 0,
      //   verifiedUsers: 0,
      //   byRole: {
      //     'pet-owner': 0,
      //     'trainer': 0,
      //     'institute-admin': 0,
      //     'admin': 0
      //   },
      //   recentJoins: 0
      // });
        //setError('데이터를 불러오는데 실패했습니다.'); // Add error handling
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

      {/* 요약 카드 */}
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