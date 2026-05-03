import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { LucideIcon } from "lucide-react";
import {
  Shield, CheckCircle, XCircle, Clock, PawPrint, Building,
  Syringe, MapPin, AlertTriangle, Loader2, Fingerprint, Camera,
  RefreshCw, UserCheck, ShieldCheck
} from "lucide-react";

interface VerifyResponse {
  success: boolean;
  consumed?: boolean;
  error?: string;
  errorCode?: string;
  session?: {
    id: number;
    expiresAt: string;
    todayConcern: string | null;
    todayGoal: string | null;
    noseVerified: boolean;
    vaccineStatus: Record<number, { valid: boolean; vaccines: Array<{ name: string; status: string }> }>;
    temperamentLevels: Record<number, string | null>;
    zonePermissions: Record<number, string[]>;
  };
  institute?: { name: string; address: string | null };
  member?: { name: string };
  pets?: Array<{
    id: number; name: string | null; breed: string | null;
    species: string | null; temperamentLevel: string | null;
    hasNoseProfile?: boolean;
  }>;
}

interface NoseVerifyResult {
  success: boolean;
  status: "approved" | "retry" | "rejected";
  similarityScore: number;
  matched: boolean;
  details: string;
  failReason?: string;
}

const TEMPERAMENT_MAP: Record<string, { label: string; color: string; bg: string }> = {
  A: { label: "사회성 양호", color: "text-green-700", bg: "bg-green-100" },
  B: { label: "흥분 조절", color: "text-blue-700", bg: "bg-blue-100" },
  C: { label: "짖음/경계", color: "text-yellow-700", bg: "bg-yellow-100" },
  D: { label: "공격성 주의", color: "text-red-700", bg: "bg-red-100" },
  E: { label: "분리불안", color: "text-primary", bg: "bg-primary/10" },
};

export default function VisitVerifyPage() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const calledRef = useRef(false);
  const [isStaff, setIsStaff] = useState(false);

  const [noseStep, setNoseStep] = useState<"idle" | "camera" | "verifying" | "result">("idle");
  const [noseResult, setNoseResult] = useState<NoseVerifyResult | null>(null);
  const [noseVerified, setNoseVerified] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (!token || calledRef.current) return;
    calledRef.current = true;

    (async () => {
      try {
        const res = await apiRequest("POST", `/api/visit-sessions/confirm/${token}`);
        const result: VerifyResponse = await res.json();
        setData(result);
        if (result.session?.noseVerified) setNoseVerified(true);

        try {
          const userRes = await fetch("/api/auth/me", { credentials: "include" });
          if (userRes.ok) {
            const userData = await userRes.json();
            if (userData && ['admin', 'institute-admin', 'trainer'].includes(userData.role)) {
              setIsStaff(true);
            }
          }
        } catch {}
      } catch {
        setData({ success: false, error: "네트워크 오류가 발생했습니다.", errorCode: "NETWORK" });
      } finally {
        setIsLoading(false);
      }
    })();
  }, [token]);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setStream(mediaStream);
      setNoseStep("camera");
    } catch {
      toast({ title: "카메라를 사용할 수 없습니다", variant: "destructive" });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  }, [stream]);

  const captureAndVerify = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !data?.session) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      stopCamera();
      setNoseStep("verifying");

      try {
        const formData = new FormData();
        formData.append("image", new File([blob], "nose-verify.jpg", { type: "image/jpeg" }));
        const res = await fetch(`/api/visit-sessions/${token}/verify-nose`, {
          method: "POST",
          body: formData,
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          toast({ title: "코 인증 오류", description: result.error || "인증 실패", variant: "destructive" });
          setNoseStep("idle");
          return;
        }
        setNoseResult(result as NoseVerifyResult);
        setNoseStep("result");
        if (result.status === "approved") {
          setNoseVerified(true);
          toast({ title: "코 인증 성공!", description: "반려견 신원이 확인되었습니다." });
        }
      } catch {
        toast({ title: "코 인증 오류", variant: "destructive" });
        setNoseStep("idle");
      }
    }, "image/jpeg", 0.9);
  }, [data, stopCamera, toast]);

  const manualApprove = useCallback(async () => {
    if (!data?.session) return;
    try {
      await apiRequest("POST", `/api/visit-sessions/${data.session.id}/manual-approve-nose`);
      setNoseVerified(true);
      setNoseResult({ success: true, status: "approved", similarityScore: 100, matched: true, details: "관리자 수동 승인" });
      setNoseStep("result");
      toast({ title: "수동 승인 완료" });
    } catch {
      toast({ title: "수동 승인 실패", variant: "destructive" });
    }
  }, [data, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg font-medium">방문 세션 확인 중...</p>
            <p className="text-sm text-muted-foreground mt-1">QR 코드를 검증하고 있습니다.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data?.success || data.error) {
    const errorMessages: Record<string, { icon: LucideIcon; title: string; desc: string; bgColor: string }> = {
      INVALID: { icon: XCircle, title: "유효하지 않은 QR", desc: "해당 방문 세션을 찾을 수 없습니다. 올바른 QR 코드인지 확인해 주세요.", bgColor: "from-red-50" },
      USED: { icon: CheckCircle, title: "이미 사용된 QR", desc: "이 방문 세션은 이미 체크인에 사용되었습니다. 1회용 QR은 재사용할 수 없습니다.", bgColor: "from-gray-50" },
      EXPIRED: { icon: Clock, title: "만료된 QR", desc: "이 방문 세션의 유효시간(10분)이 경과했습니다. 새 QR을 발급받아 주세요.", bgColor: "from-orange-50" },
      NETWORK: { icon: AlertTriangle, title: "연결 오류", desc: "서버와 통신할 수 없습니다. 인터넷 연결을 확인해 주세요.", bgColor: "from-red-50" },
    };
    const errInfo = errorMessages[data?.errorCode || ''] || { icon: AlertTriangle, title: "오류", desc: data?.error || "알 수 없는 오류", bgColor: "from-red-50" };
    const ErrIcon = errInfo.icon;

    return (
      <div className={`min-h-screen flex items-center justify-center bg-gradient-to-b ${errInfo.bgColor} to-background p-4`}>
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <ErrIcon className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-xl font-bold mb-2">{errInfo.title}</h2>
            <p className="text-muted-foreground">{errInfo.desc}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const session = data.session!;
  const vaccineStatus = session.vaccineStatus || {};
  const temperamentLevels = session.temperamentLevels || {};
  const zonePermissions = session.zonePermissions || {};
  const hasPetsWithNoseProfile = data.pets?.some(p => p.hasNoseProfile);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-background p-4">
      <div className="max-w-md mx-auto space-y-4 pt-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-green-800">체크인 완료!</h1>
          <p className="text-sm text-muted-foreground mt-1">QR 스캔과 동시에 체크인이 자동 완료되었습니다.</p>
        </div>

        {data.institute && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Building className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-bold text-lg">{data.institute.name}</p>
                  {data.institute.address && (
                    <p className="text-sm text-muted-foreground">{data.institute.address}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {data.member && (
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">보호자:</span>
                <span>{data.member.name}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {data.pets && data.pets.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <PawPrint className="w-4 h-4" />
                반려동물 신뢰 인증 결과
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.pets.map(pet => {
                const petVaccine = vaccineStatus[pet.id];
                const petTemperament = temperamentLevels[pet.id] as string;
                const petZones = zonePermissions[pet.id] || [];
                const tempInfo = petTemperament ? TEMPERAMENT_MAP[petTemperament] : null;

                return (
                  <div key={pet.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <PawPrint className="w-5 h-5 text-primary" />
                        <span className="font-bold text-lg">{pet.name || '이름 미등록'}</span>
                      </div>
                      {tempInfo && (
                        <Badge className={`${tempInfo.bg} ${tempInfo.color}`}>
                          {petTemperament} ({tempInfo.label})
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      {pet.breed || ''} {pet.species ? `· ${pet.species}` : ''}
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Syringe className="w-4 h-4" />
                        <span className="text-sm font-medium">접종 상태:</span>
                        {petVaccine?.valid ? (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            접종 완료
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            미접종/만료
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Fingerprint className="w-4 h-4" />
                        <span className="text-sm font-medium">코 인증:</span>
                        {noseVerified ? (
                          <Badge className="bg-primary/10 text-primary text-xs">
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            인증 완료
                          </Badge>
                        ) : pet.hasNoseProfile ? (
                          <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                            대기 중
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600 text-xs">
                            미등록
                          </Badge>
                        )}
                      </div>

                      {petZones.length > 0 && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-0.5" />
                          <div>
                            <span className="text-sm font-medium">입장 가능 구역:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {petZones.map(zone => (
                                <Badge key={zone} variant="outline" className="text-xs">
                                  {zone}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {hasPetsWithNoseProfile && !noseVerified && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-primary" />
                2단계: 코 인증
              </CardTitle>
            </CardHeader>
            <CardContent>
              {noseStep === "idle" && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    반려견의 코를 촬영하여 등록된 코 프로필과 비교합니다.
                  </p>
                  <Button onClick={startCamera} className="gap-2">
                    <Camera className="w-4 h-4" />
                    코 인증 시작
                  </Button>
                </div>
              )}

              {noseStep === "camera" && (
                <div>
                  <div className="relative">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-36 h-36 border-4 border-dashed border-primary/60 rounded-full flex items-center justify-center">
                        <p className="text-primary text-xs font-bold bg-white/80 px-2 py-1 rounded">
                          코를 원 안에
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 justify-center">
                    <Button onClick={captureAndVerify} className="gap-2">
                      <Camera className="w-4 h-4" />
                      촬영 후 인증
                    </Button>
                    <Button variant="outline" onClick={() => { stopCamera(); setNoseStep("idle"); }}>
                      취소
                    </Button>
                  </div>
                </div>
              )}

              {noseStep === "verifying" && (
                <div className="text-center py-6">
                  <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-primary" />
                  <p className="font-medium">코 비교 중...</p>
                  <p className="text-xs text-muted-foreground">AI가 등록된 코와 비교하고 있습니다</p>
                </div>
              )}

              {noseStep === "result" && noseResult && !noseVerified && (
                <div className="text-center py-4">
                  {noseResult.status === "retry" && (
                    <>
                      <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                      <p className="font-medium text-yellow-700">재촬영 권장</p>
                      <p className="text-sm text-muted-foreground mb-2">유사도: {noseResult.similarityScore}%</p>
                      {noseResult.failReason && <p className="text-xs text-yellow-600 mb-3">{noseResult.failReason}</p>}
                    </>
                  )}
                  {noseResult.status === "rejected" && (
                    <>
                      <XCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
                      <p className="font-medium text-red-700">인증 실패</p>
                      <p className="text-sm text-muted-foreground mb-2">유사도: {noseResult.similarityScore}%</p>
                      {noseResult.failReason && <p className="text-xs text-red-600 mb-3">{noseResult.failReason}</p>}
                    </>
                  )}
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => { setNoseStep("idle"); setNoseResult(null); startCamera(); }} className="gap-2">
                      <RefreshCw className="w-4 h-4" />
                      다시 촬영
                    </Button>
                    {isStaff && (
                      <Button variant="outline" onClick={manualApprove} className="gap-2">
                        <UserCheck className="w-4 h-4" />
                        수동 승인
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {noseVerified && noseResult && (
          <Card className="border-green-300">
            <CardContent className="py-4 text-center">
              <div className="flex items-center justify-center gap-2 text-green-700">
                <ShieldCheck className="w-6 h-6" />
                <span className="font-bold">코 인증 완료</span>
                {noseResult.similarityScore > 0 && (
                  <Badge className="bg-green-100 text-green-700 text-xs">유사도 {noseResult.similarityScore}%</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <canvas ref={canvasRef} className="hidden" />

        {(session.todayConcern || session.todayGoal) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">오늘의 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {session.todayConcern && (
                <div>
                  <span className="font-medium text-muted-foreground">고민:</span>
                  <p>{session.todayConcern}</p>
                </div>
              )}
              {session.todayGoal && (
                <div>
                  <span className="font-medium text-muted-foreground">목표:</span>
                  <p>{session.todayGoal}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground pb-4">
          이 QR은 1회용으로, 스캔 즉시 자동 폐기되었습니다.
        </p>
      </div>
    </div>
  );
}
