import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Copy, Share2, Gift, Users, CheckCircle, Clock, XCircle } from "lucide-react";

interface InviteCodeResponse {
  inviteCode: string;
}

interface CreditHistory {
  id: number;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
}

interface CreditsResponse {
  totalCredits: number;
  availableCredits: number;
  history: CreditHistory[];
}

interface Invitation {
  id: number;
  friendName: string;
  status: "pending" | "registered" | "cancelled";
  invitedAt: string;
}

interface InviteHistoryResponse {
  invitations: Invitation[];
}

export default function FriendInvite() {
  const { toast } = useToast();

  const { data: codeData, isLoading: isCodeLoading } = useQuery<InviteCodeResponse>({
    queryKey: ["/api/invite/my-code"],
  });

  const { data: creditsData, isLoading: isCreditsLoading } = useQuery<CreditsResponse>({
    queryKey: ["/api/invite/credits"],
  });

  const { data: historyData, isLoading: isHistoryLoading } = useQuery<InviteHistoryResponse>({
    queryKey: ["/api/invite/history"],
  });

  const handleCopyCode = async () => {
    if (!codeData?.inviteCode) return;

    try {
      await navigator.clipboard.writeText(codeData.inviteCode);
      toast({
        title: "복사 완료",
        description: "초대 코드가 클립보드에 복사되었습니다.",
      });
    } catch (error) {
      toast({
        title: "복사 실패",
        description: "초대 코드를 복사하는 데 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    if (!codeData?.inviteCode) return;

    const shareData = {
      title: "친구 초대",
      text: `TALEZ에서 함께 반려동물 교육을 받아보세요! 초대 코드: ${codeData.inviteCode}`,
      url: `${window.location.origin}/register?invite=${codeData.inviteCode}`,
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        toast({
          title: "공유 완료",
          description: "초대 링크가 공유되었습니다.",
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          toast({
            title: "공유 실패",
            description: "공유하는 데 실패했습니다.",
            variant: "destructive",
          });
        }
      }
    } else {
      handleCopyCode();
    }
  };

  const getStatusBadge = (status: Invitation["status"]) => {
    switch (status) {
      case "registered":
        return (
          <Badge className="bg-success/10 text-success dark:bg-success/20 dark:text-success/70">
            <CheckCircle className="w-3 h-3 mr-1" />
            가입 완료
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning/70">
            <Clock className="w-3 h-3 mr-1" />
            대기 중
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive/70">
            <XCircle className="w-3 h-3 mr-1" />
            취소됨
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Users className="w-8 h-8 text-primary" />
          친구 초대
        </h1>
        <p className="text-muted-foreground mt-2">
          친구를 초대하고 교육 참여 기회를 받으세요!
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5" />
              내 초대 코드
            </CardTitle>
            <CardDescription>
              아래 코드를 친구에게 공유하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isCodeLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-muted rounded-lg p-4 text-center">
                  <span className="text-2xl font-mono font-bold tracking-wider text-primary">
                    {codeData?.inviteCode || "코드를 불러오는 중..."}
                  </span>
                </div>
                <div className="flex gap-3 justify-center flex-wrap">
                  <Button onClick={handleCopyCode} variant="outline" className="gap-2">
                    <Copy className="w-4 h-4" />
                    코드 복사
                  </Button>
                  <Button onClick={handleShare} className="gap-2">
                    <Share2 className="w-4 h-4" />
                    카카오톡/SMS 공유
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              교육 참여 기회 현황
            </CardTitle>
            <CardDescription>
              친구 초대로 받은 교육 참여 기회(크레딧)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isCreditsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-primary/10 rounded-lg p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-1">사용 가능</p>
                  <p className="text-4xl font-bold text-primary">
                    {creditsData?.availableCredits ?? 0}
                    <span className="text-lg font-normal ml-1">회</span>
                  </p>
                </div>
                <div className="bg-muted rounded-lg p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-1">총 적립</p>
                  <p className="text-4xl font-bold text-foreground">
                    {creditsData?.totalCredits ?? 0}
                    <span className="text-lg font-normal ml-1">회</span>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              초대 내역
            </CardTitle>
            <CardDescription>
              내가 초대한 친구 목록
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isHistoryLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : historyData?.invitations && historyData.invitations.length > 0 ? (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>친구 이름</TableHead>
                      <TableHead>가입 상태</TableHead>
                      <TableHead className="text-right">초대 날짜</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyData.invitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">
                          {invitation.friendName}
                        </TableCell>
                        <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatDate(invitation.invitedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>아직 초대한 친구가 없습니다.</p>
                <p className="text-sm mt-1">위 코드를 친구에게 공유해보세요!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
