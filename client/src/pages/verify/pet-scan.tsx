import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Camera, CameraOff, Keyboard, ShieldCheck, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

type DetectedBarcode = { rawValue: string };
type BarcodeDetectorCtor = new (opts: { formats: string[] }) => {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
};
declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorCtor;
  }
}

function extractTokenFromUrl(text: string): string | null {
  try {
    const url = new URL(text);
    const m = url.pathname.match(/\/verify\/pet\/([^/?#]+)/);
    if (m) return decodeURIComponent(m[1]);
  } catch {
    // 직접 토큰만 입력했을 가능성
    const trimmed = text.trim();
    if (/^[A-Za-z0-9_-]{32,128}$/.test(trimmed)) return trimmed;
  }
  return null;
}

export default function PetVerifyScan() {
  const [, navigate] = useLocation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("BarcodeDetector" in window)) {
      setSupported(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopRef.current = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startScan = async () => {
    setError(null);
    if (!window.BarcodeDetector) {
      setSupported(false);
      setError("이 브라우저는 카메라 QR 인식을 지원하지 않습니다. 아래 직접 입력을 사용해주세요.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      stopRef.current = false;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);

      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const tick = async () => {
        if (stopRef.current || !videoRef.current) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const raw = barcodes[0].rawValue || "";
            const token = extractTokenFromUrl(raw);
            if (token) {
              stopScan();
              navigate(`/verify/pet/${token}`);
              return;
            }
          }
        } catch {
          // 일시적 오류는 무시하고 다음 프레임 시도
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "카메라를 시작할 수 없습니다.";
      setError(msg);
      setScanning(false);
    }
  };

  const stopScan = () => {
    stopRef.current = true;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  const handleManual = (e: React.FormEvent) => {
    e.preventDefault();
    const token = extractTokenFromUrl(manualInput);
    if (!token) {
      setError("유효한 QR 링크 또는 토큰을 입력해주세요.");
      return;
    }
    navigate(`/verify/pet/${token}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              반려견 예방접종 QR 검증
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              보호자가 발급한 QR 코드를 카메라로 비추거나, 링크를 직접 입력해 검증할 수 있습니다.
            </p>

            <div className="aspect-square bg-black rounded-lg overflow-hidden relative" data-testid="container-video">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!scanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <Camera className="w-16 h-16 text-white/40" />
                </div>
              )}
              {scanning && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-8 border-2 border-white/70 rounded-lg" />
                </div>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {supported ? (
              scanning ? (
                <Button onClick={stopScan} variant="outline" className="w-full" data-testid="button-stop-scan">
                  <CameraOff className="w-4 h-4 mr-2" />
                  스캔 중지
                </Button>
              ) : (
                <Button onClick={startScan} className="w-full" data-testid="button-start-scan">
                  <Camera className="w-4 h-4 mr-2" />
                  카메라로 스캔 시작
                </Button>
              )
            ) : (
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription className="text-sm">
                  이 브라우저는 자동 QR 인식을 지원하지 않습니다. 휴대폰의 기본 카메라 앱으로 QR을 스캔하면 검증 페이지가 열립니다.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Keyboard className="w-4 h-4" />
              직접 입력
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManual} className="space-y-3">
              <Input
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="QR 링크 (https://.../verify/pet/...) 또는 토큰"
                data-testid="input-manual-token"
              />
              <Button type="submit" variant="outline" className="w-full" data-testid="button-manual-verify">
                검증하기
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
