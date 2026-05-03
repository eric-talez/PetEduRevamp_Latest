import { useState, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Camera, Upload, CheckCircle, XCircle, RefreshCw, ArrowLeft,
  Loader2, Star, Image as ImageIcon, Fingerprint, AlertCircle
} from "lucide-react";

interface NoseImage {
  url: string;
  qualityScore: number;
}

interface NoseProfile {
  id: number;
  petId: number;
  images: NoseImage[];
  representativeImageUrl: string | null;
  qualityScore: number | null;
  version: number | null;
  createdAt: string;
  updatedAt: string;
}

export default function NoseEnrollment() {
  const { petId } = useParams<{ petId: string }>();

  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImages, setCapturedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const { data: profileData, isLoading: profileLoading } = useQuery<{ success: boolean; profile: NoseProfile | null }>({
    queryKey: ["/api/pets", petId, "nose", "profile"],
    queryFn: async () => {
      const res = await fetch(`/api/pets/${petId}/nose/profile`);
      if (!res.ok) throw new Error("프로필 조회 실패");
      return res.json();
    },
    enabled: !!petId,
  });

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

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], `nose-${Date.now()}.jpg`, { type: "image/jpeg" });
      setCapturedImages(prev => [...prev, file]);
      setPreviewUrls(prev => [...prev, URL.createObjectURL(blob)]);
      if (capturedImages.length + 1 >= 5) {
        stopCamera();
      }
    }, "image/jpeg", 0.9);
  }, [capturedImages.length, stopCamera]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.slice(0, 5 - capturedImages.length);
    setCapturedImages(prev => [...prev, ...newFiles]);
    setPreviewUrls(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))]);
  };

  const removeImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const enrollMutation = useMutation({
    mutationFn: async (files: File[]) => {
      setIsUploading(true);
      const formData = new FormData();
      files.forEach(f => formData.append("images", f));
      const res = await fetch(`/api/pets/${petId}/nose/enroll`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "등록 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pets", petId, "nose", "profile"] });
      setCapturedImages([]);
      setPreviewUrls([]);
      setIsUploading(false);
      toast({ title: "코 등록 완료!", description: "반려견 코 프로필이 성공적으로 등록되었습니다." });
    },
    onError: (err: Error) => {
      setIsUploading(false);
      toast({ title: "등록 실패", description: err.message, variant: "destructive" });
    },
  });

  const profile = profileData?.profile;

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Fingerprint className="w-6 h-6 text-primary" />
            코 프린트 등록
          </h1>
          <p className="text-sm text-muted-foreground">반려견의 코를 촬영하여 생체 인증을 등록합니다</p>
        </div>
      </div>

      {profile && (
        <Card className="border-success/30 bg-success/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-success">코 프로필 등록됨</p>
                <p className="text-sm text-success">
                  품질 점수: {profile.qualityScore}점 · 버전 {profile.version}
                </p>
              </div>
              {profile.representativeImageUrl && (
                <img
                  src={profile.representativeImageUrl}
                  alt="대표 코 사진"
                  className="w-16 h-16 rounded-lg object-cover border"
                />
              )}
            </div>
            <div className="mt-3 flex gap-2">
              {(profile.images as NoseImage[])?.map((img, i) => (
                <div key={i} className="relative">
                  <img
                    src={img.url}
                    alt={`코 사진 ${i + 1}`}
                    className="w-12 h-12 rounded object-cover border"
                  />
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                    {img.qualityScore}
                  </span>
                </div>
              ))}
            </div>
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
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-3">
                <div className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
                  📌 가까이 · 정면으로 · 선명하게
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3 justify-center">
              <Button onClick={capturePhoto} disabled={capturedImages.length >= 5} className="gap-2">
                <Camera className="w-4 h-4" />
                촬영 ({capturedImages.length}/5)
              </Button>
              <Button variant="outline" onClick={stopCamera}>
                닫기
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {!isCameraOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="w-5 h-5" />
              코 사진 촬영
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-sm text-primary">
              <p className="font-medium flex items-center gap-1 mb-1">
                <AlertCircle className="w-4 h-4" />
                촬영 가이드
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>반려견 코에 최대한 가까이 촬영해주세요</li>
                <li>정면에서 촬영해야 정확도가 높아집니다</li>
                <li>코의 주름 패턴이 선명하게 보여야 합니다</li>
                <li>3~5장을 촬영하면 가장 좋은 사진이 자동 선택됩니다</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button onClick={startCamera} className="flex-1 gap-2" disabled={capturedImages.length >= 5}>
                <Camera className="w-4 h-4" />
                카메라 촬영
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={capturedImages.length >= 5}
              >
                <Upload className="w-4 h-4" />
                파일 업로드
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
          </CardContent>
        </Card>
      )}

      {previewUrls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              촬영한 사진 ({previewUrls.length}/5)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {previewUrls.map((url, i) => (
                <div key={i} className="relative group">
                  <img src={url} alt={`촬영 ${i + 1}`} className="w-full aspect-square object-cover rounded-lg border" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <Button
              className="w-full mt-3 gap-2"
              onClick={() => enrollMutation.mutate(capturedImages)}
              disabled={isUploading || enrollMutation.isPending || capturedImages.length < 3}
            >
              {isUploading || enrollMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  품질 평가 및 등록 중...
                </>
              ) : (
                <>
                  <Fingerprint className="w-4 h-4" />
                  {profile ? "코 프로필 업데이트" : "코 프로필 등록"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
