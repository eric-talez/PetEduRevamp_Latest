import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeCanvas } from "qrcode.react";
import { ShieldCheck, ShieldAlert, RefreshCw, Loader2, Download, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Props {
  petId: number;
  petName: string;
}

interface PassportResponse {
  success: boolean;
  passport: {
    id: number;
    token: string;
    isActive: boolean;
    issuedAt: string;
    expiresAt: string | null;
    verifyCount: number;
    lastVerifiedAt: string | null;
  } | null;
  eligible: boolean;
  missing: string[];
  summary: {
    totalCount: number;
    overallStatus: "all_ok" | "has_expiring" | "has_expired" | "no_records";
  };
}

export function PetPassportCard({ petId, petName }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery<PassportResponse>({
    queryKey: ["/api/pets", petId, "passport"],
    queryFn: async () => {
      const res = await fetch(`/api/pets/${petId}/passport`, { credentials: "include" });
      if (!res.ok) throw new Error("조회 실패");
      return res.json();
    },
  });

  const issueMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/pets/${petId}/passport/issue`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "QR 여권이 발급되었습니다" });
      queryClient.invalidateQueries({ queryKey: ["/api/pets", petId, "passport"] });
    },
    onError: (e: Error) => {
      toast({ title: "발급 실패", description: e.message || "다시 시도해주세요", variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/pets/${petId}/passport/revoke`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "QR 여권이 회수되었습니다" });
      queryClient.invalidateQueries({ queryKey: ["/api/pets", petId, "passport"] });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  const verifyUrl = data?.passport
    ? `${window.location.origin}/verify/pet/${data.passport.token}`
    : "";

  const handleCopy = async () => {
    if (!verifyUrl) return;
    await navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const canvas = document.querySelector<HTMLCanvasElement>(`#pet-passport-qr-${petId}`);
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${petName}_예방접종QR.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <Card data-testid={`card-passport-${petId}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          예방접종 QR 여권
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!data?.eligible && !data?.passport && (
          <Alert>
            <ShieldAlert className="w-4 h-4" />
            <AlertDescription className="text-sm">
              발급을 위해서는 다음 항목이 필요합니다:
              <ul className="mt-2 list-disc list-inside space-y-1">
                {data?.missing?.includes("registrationNumber") && (
                  <li>강아지 등록번호를 입력해주세요 (반려동물 정보 수정)</li>
                )}
                {data?.missing?.includes("vaccinations") && (
                  <li>예방접종 기록을 1건 이상 등록해주세요</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {data?.passport ? (
          <>
            <div className="flex justify-center bg-white p-4 rounded-lg border">
              <QRCodeCanvas
                id={`pet-passport-qr-${petId}`}
                value={verifyUrl}
                size={200}
                level="M"
                includeMargin
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>발급일</span>
                <span>{new Date(data.passport.issuedAt).toLocaleDateString()}</span>
              </div>
              {data.passport.expiresAt && (
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>만료일</span>
                  <span>{new Date(data.passport.expiresAt).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>검증 횟수</span>
                <Badge variant="secondary">{data.passport.verifyCount}회</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                data-testid={`button-copy-passport-${petId}`}
              >
                {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                링크 복사
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownload}
                data-testid={`button-download-passport-${petId}`}
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                저장
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => issueMutation.mutate()}
                disabled={issueMutation.isPending}
                data-testid={`button-reissue-passport-${petId}`}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                재발급
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-destructive border-destructive/40"
                onClick={() => revokeMutation.mutate()}
                disabled={revokeMutation.isPending}
                data-testid={`button-revoke-passport-${petId}`}
              >
                회수
              </Button>
            </div>
          </>
        ) : (
          <Button
            className="w-full"
            disabled={!data?.eligible || issueMutation.isPending}
            onClick={() => issueMutation.mutate()}
            data-testid={`button-issue-passport-${petId}`}
          >
            {issueMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4 mr-2" />
            )}
            QR 여권 발급하기
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
