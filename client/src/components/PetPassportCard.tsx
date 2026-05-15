import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeCanvas } from "qrcode.react";
import { ShieldCheck, ShieldAlert, RefreshCw, Loader2, Download, Copy, Check, Siren, MapPin, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Props {
  petId: number;
  petName: string;
  petUid?: string | null;
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
    lostMode?: boolean;
    lostMessage?: string | null;
    lostContactPhone?: string | null;
    lostContactWindow?: string | null;
    lostLastSeenAt?: string | null;
    lostLastSeenLocation?: string | null;
    lostReportCount?: number;
  } | null;
  eligible: boolean;
  missing: string[];
  summary: {
    totalCount: number;
    overallStatus: "all_ok" | "has_expiring" | "has_expired" | "no_records";
  };
}

interface ActiveBadge {
  id: number;
  code: string;
  label: string;
  category: string;
  level: number | null;
  description: string | null;
  iconKey: string | null;
  comment: string | null;
  issuerTrainerName: string | null;
  issuedAt: string;
  expiresAt: string | null;
}

function PetBadgesSection({ petId }: { petId: number }) {
  const { data, isLoading } = useQuery<{ success: boolean; badges: ActiveBadge[] }>({
    queryKey: ["/api/pets", petId, "badges"],
    queryFn: async () => {
      const res = await fetch(`/api/pets/${petId}/badges`, { credentials: "include" });
      if (!res.ok) throw new Error("배지 조회 실패");
      return res.json();
    },
  });
  if (isLoading) return null;
  const badges = data?.badges || [];
  if (badges.length === 0) return null;
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2" data-testid={`section-badges-${petId}`}>
      <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
        <Award className="w-4 h-4" /> 훈련 인증 ({badges.length})
      </div>
      <div className="flex flex-wrap gap-1.5">
        {badges.map((b) => (
          <Badge
            key={b.id}
            variant="outline"
            className="bg-white dark:bg-gray-900 border-primary/40 text-primary text-xs"
            title={`${b.issuerTrainerName ? `${b.issuerTrainerName} 발급 · ` : ""}${new Date(b.issuedAt).toLocaleDateString()}${b.comment ? ` · ${b.comment}` : ""}`}
            data-testid={`badge-cert-${b.id}`}
          >
            <Award className="w-3 h-3 mr-1" />
            {b.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function PetPassportCard({ petId, petName, petUid }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [uidCopied, setUidCopied] = useState(false);

  const handleCopyUid = async () => {
    if (!petUid) return;
    try {
      await navigator.clipboard.writeText(petUid);
      setUidCopied(true);
      toast({ title: "펫 ID가 복사되었습니다", description: petUid });
      setTimeout(() => setUidCopied(false), 2000);
    } catch {
      toast({ title: "복사 실패", description: "브라우저 권한을 확인해주세요", variant: "destructive" });
    }
  };

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

  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [lostForm, setLostForm] = useState({
    message: "",
    contactPhone: "",
    contactWindow: "",
    lastSeenAt: "",
    lastSeenLocation: "",
  });

  const lostMutation = useMutation({
    mutationFn: async (payload: { enabled: boolean } & Partial<typeof lostForm>) => {
      const res = await apiRequest("PATCH", `/api/pets/${petId}/passport/lost-mode`, payload);
      return res.json();
    },
    onSuccess: (_, vars) => {
      toast({
        title: vars.enabled ? "분실모드가 활성화되었습니다" : "분실모드가 해제되었습니다",
        description: vars.enabled ? "QR 스캔 시 발견 제보 폼이 표시됩니다." : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pets", petId, "passport"] });
      setLostDialogOpen(false);
    },
    onError: (e: Error) => {
      toast({ title: "변경 실패", description: e.message || "다시 시도해주세요", variant: "destructive" });
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
    // 캡션(펫 UID + 이름)을 포함한 새 캔버스로 합성
    const padding = 20;
    const captionH = petUid ? 70 : 40;
    const out = document.createElement("canvas");
    out.width = canvas.width + padding * 2;
    out.height = canvas.height + padding * 2 + captionH;
    const ctx = out.getContext("2d");
    if (!ctx) {
      const link = document.createElement("a");
      link.download = `${petName}_예방접종QR.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      return;
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(canvas, padding, padding);
    ctx.textAlign = "center";
    ctx.fillStyle = "#111111";
    if (petUid) {
      ctx.font = "bold 28px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(petUid, out.width / 2, canvas.height + padding + 36);
      ctx.font = "16px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "#555555";
      ctx.fillText(petName, out.width / 2, canvas.height + padding + 60);
    } else {
      ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
      ctx.fillText(petName, out.width / 2, canvas.height + padding + 28);
    }
    const link = document.createElement("a");
    link.download = `${petName}_예방접종QR.png`;
    link.href = out.toDataURL("image/png");
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
        {petUid && (
          <button
            type="button"
            onClick={handleCopyUid}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border bg-primary/5 hover:bg-primary/10 transition-colors"
            data-testid={`button-copy-pet-uid-${petId}`}
          >
            <div className="text-left">
              <div className="text-[11px] text-gray-500">펫 ID (탭하여 복사)</div>
              <div className="font-mono font-bold text-lg tracking-wider text-primary">{petUid}</div>
            </div>
            {uidCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
          </button>
        )}
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

        {data?.passport?.lostMode && (
          <Alert variant="destructive" className="border-red-300 bg-red-50 dark:bg-red-950">
            <Siren className="w-4 h-4" />
            <AlertDescription className="text-sm">
              <div className="font-semibold mb-1">분실모드 활성화 중</div>
              <div className="text-xs">
                QR 스캔 시 발견자에게 빨간 배너와 제보 폼이 표시됩니다.
                {(data.passport.lostReportCount ?? 0) > 0 && (
                  <> 지금까지 <b>{data.passport.lostReportCount}건</b>의 제보가 들어왔습니다.</>
                )}
              </div>
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

            <div className="rounded-lg border border-red-200 dark:border-red-900 p-3 space-y-2 bg-red-50/50 dark:bg-red-950/30">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-300">
                  <Siren className="w-4 h-4" />
                  분실모드
                </Label>
                <Switch
                  checked={!!data.passport.lostMode}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setLostForm({
                        message: data.passport?.lostMessage || "",
                        contactPhone: data.passport?.lostContactPhone || "",
                        contactWindow: data.passport?.lostContactWindow || "",
                        lastSeenAt: data.passport?.lostLastSeenAt || "",
                        lastSeenLocation: data.passport?.lostLastSeenLocation || "",
                      });
                      setLostDialogOpen(true);
                    } else {
                      lostMutation.mutate({ enabled: false });
                    }
                  }}
                  disabled={lostMutation.isPending}
                  data-testid={`switch-lost-mode-${petId}`}
                />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                활성화 시 QR을 스캔한 사람이 위치/메모를 제보할 수 있고, 즉시 푸시 알림이 도착합니다.
              </p>
              {data.passport.lostMode && (
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setLostForm({
                        message: data.passport?.lostMessage || "",
                        contactPhone: data.passport?.lostContactPhone || "",
                        contactWindow: data.passport?.lostContactWindow || "",
                        lastSeenAt: data.passport?.lostLastSeenAt || "",
                        lastSeenLocation: data.passport?.lostLastSeenLocation || "",
                      });
                      setLostDialogOpen(true);
                    }}
                    data-testid={`button-edit-lost-${petId}`}
                  >
                    정보 수정
                  </Button>
                </div>
              )}
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
        <PetBadgesSection petId={petId} />
      </CardContent>

      <Dialog open={lostDialogOpen} onOpenChange={setLostDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Siren className="w-5 h-5" />
              분실모드 정보
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="lost-message" className="text-sm">발견자에게 전할 메시지</Label>
              <Textarea
                id="lost-message"
                placeholder="예: 겁이 많은 아이입니다. 천천히 다가와주세요."
                value={lostForm.message}
                onChange={(e) => setLostForm((p) => ({ ...p, message: e.target.value.slice(0, 500) }))}
                rows={3}
                data-testid="input-lost-message"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="lost-phone" className="text-sm">연락처</Label>
                <Input
                  id="lost-phone"
                  placeholder="010-1234-5678"
                  value={lostForm.contactPhone}
                  onChange={(e) => setLostForm((p) => ({ ...p, contactPhone: e.target.value }))}
                  data-testid="input-lost-phone"
                />
              </div>
              <div>
                <Label htmlFor="lost-window" className="text-sm">연락 가능 시간</Label>
                <Input
                  id="lost-window"
                  placeholder="예: 09-22시"
                  value={lostForm.contactWindow}
                  onChange={(e) => setLostForm((p) => ({ ...p, contactWindow: e.target.value }))}
                  data-testid="input-lost-window"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="lost-seen-at" className="text-sm">마지막 목격 시각</Label>
              <Input
                id="lost-seen-at"
                placeholder="예: 5월 15일 18시"
                value={lostForm.lastSeenAt}
                onChange={(e) => setLostForm((p) => ({ ...p, lastSeenAt: e.target.value }))}
                data-testid="input-lost-seen-at"
              />
            </div>
            <div>
              <Label htmlFor="lost-seen-loc" className="text-sm flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> 마지막 목격 장소
              </Label>
              <Input
                id="lost-seen-loc"
                placeholder="예: 서울 강남구 역삼동 OO공원 인근"
                value={lostForm.lastSeenLocation}
                onChange={(e) => setLostForm((p) => ({ ...p, lastSeenLocation: e.target.value.slice(0, 500) }))}
                data-testid="input-lost-seen-loc"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLostDialogOpen(false)} data-testid="button-lost-cancel">
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => lostMutation.mutate({ enabled: true, ...lostForm })}
              disabled={lostMutation.isPending}
              data-testid="button-lost-save"
            >
              {lostMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {data?.passport?.lostMode ? "정보 저장" : "분실모드 활성화"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
