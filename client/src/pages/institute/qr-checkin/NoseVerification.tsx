import { useState, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Camera, CheckCircle, XCircle, RefreshCw, ArrowLeft,
  Loader2, Fingerprint, AlertTriangle, ShieldCheck, UserCheck
} from "lucide-react";

interface VerifyResult {
  success: boolean;
  status: "approved" | "retry" | "rejected";
  similarityScore: number;
  matched: boolean;
  details: string;
  failReason?: string;
}

export default function NoseVerification() {
  const { sessionToken } = useParams<{ sessionToken: string }>();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const { data: userData } = useQuery<{ role: string }>({
    queryKey: ["/api/auth/me"],
  });
  const isStaff = userData && ['admin', 'institute-admin', 'trainer'].includes(userData.role);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setIsCameraOpen(true);
    } catch {
      toast({ title: "카메라를 사용할 수 없습니다", description: "카메라 권한을 확인해주세요.", variant: "destructive" });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  }, [stream]);

  const captureAndVerify = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
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
      setIsVerifying(true);

      try {
        const formData = new FormData();
        formData.append("image", new File([blob], "nose-verify.jpg", { type: "image/jpeg" }));

        const res = await fetch(`/api/visit-sessions/${sessionToken}/verify-nose`, {
          method: "POST",
          body: formData,
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          toast({ title: "인증 오류", description: result.error || "인증에 실패했습니다.", variant: "destructive" });
          return;
        }
        setVerifyResult(result as VerifyResult);

        if (result.status === "approved") {
          toast({ title: "코 인증 성공!", description: "반려견 신원이 확인되었습니다." });
        } else if (result.status === "retry") {
          toast({ title: "재촬영 필요", description: "유사도가 낮습니다. 다시 촬영해주세요.", variant: "destructive" });
        } else {
          toast({ title: "인증 실패", description: result.failReason || "등록된 코와 일치하지 않습니다.", variant: "destructive" });
        }
      } catch {
        toast({ title: "오류", description: "코 인증 중 오류가 발생했습니다.", variant: "destructive" });
      } finally {
        setIsVerifying(false);
      }
    }, "image/jpeg", 0.9);
  }, [sessionToken, stopCamera, toast]);

  const manualApproveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/visit-sessions/${sessionToken}/manual-approve-nose-by-token`);
      return res.json();
    },
    onSuccess: () => {
      setVerifyResult({ success: true, status: "approved", similarityScore: 100, matched: true, details: "관리자 수동 승인" });
      toast({ title: "수동 승인 완료", description: "관리자에 의해 코 인증이 승인되었습니다." });
    },
    onError: () => {
      toast({ title: "수동 승인 실패", variant: "destructive" });
    },
  });

  const retryVerification = () => {
    setVerifyResult(null);
    startCamera();
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-success";
    if (score >= 75) return "text-warning";
    return "text-destructive";
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 85) return "bg-success";
    if (score >= 75) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Fingerprint className="w-6 h-6 text-primary" />
            코 인증
          </h1>
          <p className="text-sm text-muted-foreground">반려견 코를 촬영하여 신원을 확인합니다</p>
        </div>
      </div>

      {verifyResult && verifyResult.status === "approved" && (
        <Card className="border-success/40 bg-success/10">
          <CardContent className="py-6 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
              <ShieldCheck className="w-10 h-10 text-success" />
            </div>
            <h2 className="text-xl font-bold text-success mb-1">인증 성공</h2>
            <p className="text-success mb-3">{verifyResult.details}</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-bold text-success">{verifyResult.similarityScore}%</span>
              <Badge className="bg-success/20 text-success">일치</Badge>
            </div>
            <div className="w-48 mx-auto mt-3">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-success rounded-full transition-all" style={{ width: `${verifyResult.similarityScore}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {verifyResult && verifyResult.status === "retry" && (
        <Card className="border-warning/40 bg-warning/10">
          <CardContent className="py-6 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-warning" />
            </div>
            <h2 className="text-xl font-bold text-warning mb-1">재촬영 권장</h2>
            <p className="text-warning mb-3">유사도가 기준치에 약간 미달합니다</p>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className={`text-2xl font-bold ${getScoreColor(verifyResult.similarityScore)}`}>
                {verifyResult.similarityScore}%
              </span>
              <Badge className="bg-warning/20 text-warning">재촬영 필요</Badge>
            </div>
            <div className="w-48 mx-auto mb-4">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${getScoreBarColor(verifyResult.similarityScore)}`} style={{ width: `${verifyResult.similarityScore}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>0</span>
                <span className="text-warning">75</span>
                <span className="text-success">85</span>
                <span>100</span>
              </div>
            </div>
            {verifyResult.failReason && (
              <p className="text-sm text-warning mb-3">
                사유: {verifyResult.failReason}
              </p>
            )}
            <div className="flex gap-2 justify-center">
              <Button onClick={retryVerification} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                다시 촬영
              </Button>
              {isStaff && (
                <Button
                  variant="outline"
                  onClick={() => manualApproveMutation.mutate()}
                  disabled={manualApproveMutation.isPending}
                  className="gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  수동 승인
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {verifyResult && verifyResult.status === "rejected" && (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardContent className="py-6 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-destructive mb-1">인증 실패</h2>
            <p className="text-destructive mb-3">등록된 코와 일치하지 않습니다</p>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-2xl font-bold text-destructive">{verifyResult.similarityScore}%</span>
              <Badge className="bg-destructive/20 text-destructive">불일치</Badge>
            </div>
            {verifyResult.failReason && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-2 mb-3">
                {verifyResult.failReason}
              </p>
            )}
            <div className="flex gap-2 justify-center">
              <Button onClick={retryVerification} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                다시 촬영
              </Button>
              {isStaff && (
                <Button
                  variant="outline"
                  onClick={() => manualApproveMutation.mutate()}
                  disabled={manualApproveMutation.isPending}
                  className="gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  관리자 수동 승인
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isVerifying && (
        <Card>
          <CardContent className="py-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-lg font-bold mb-1">코 비교 중...</h2>
            <p className="text-sm text-muted-foreground">AI가 등록된 코와 비교하고 있습니다</p>
          </CardContent>
        </Card>
      )}

      {isCameraOpen && (
        <Card>
          <CardContent className="p-2">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-lg"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-40 h-40 border-4 border-dashed border-primary/60 rounded-full flex items-center justify-center">
                  <p className="text-primary text-xs font-bold bg-white/80 px-2 py-1 rounded">
                    코를 원 안에 맞춰주세요
                  </p>
                </div>
              </div>
              <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                <div className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
                  📌 가까이 · 정면으로 · 선명하게
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3 justify-center">
              <Button onClick={captureAndVerify} className="gap-2">
                <Camera className="w-4 h-4" />
                촬영 후 인증
              </Button>
              <Button variant="outline" onClick={stopCamera}>
                취소
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {!isCameraOpen && !isVerifying && !verifyResult && (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Fingerprint className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-bold mb-2">코 인증을 시작합니다</h2>
            <p className="text-sm text-muted-foreground mb-4">
              반려견의 코를 카메라에 가까이 대고 촬영해주세요.
              등록된 코 프로필과 자동으로 비교됩니다.
            </p>
            <Button onClick={startCamera} className="gap-2">
              <Camera className="w-4 h-4" />
              카메라 시작
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
