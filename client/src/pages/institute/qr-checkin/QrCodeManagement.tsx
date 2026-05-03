import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { QrCode, Plus, Trash2, Copy, Edit2, Check, X, Download, Printer, Shield, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import type { InstituteQrCode } from "@shared/schema";

interface QrCodeListResponse {
  success: boolean;
  qrCodes: InstituteQrCode[];
}

interface QrUpdatePayload {
  label?: string;
  isActive?: boolean;
}

export default function QrCodeManagement() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [previewQr, setPreviewQr] = useState<InstituteQrCode | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery<QrCodeListResponse>({
    queryKey: ["/api/institute/qr-codes"],
  });

  const createMutation = useMutation({
    mutationFn: (label: string) => apiRequest("POST", "/api/institute/qr-codes", { label }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/institute/qr-codes"] });
      setNewLabel("");
      toast({ title: "QR 코드 생성 완료", description: "새 QR 코드가 생성되었습니다." });
    },
    onError: () => {
      toast({ title: "오류", description: "QR 코드 생성에 실패했습니다.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: QrUpdatePayload }) =>
      apiRequest("PUT", `/api/institute/qr-codes/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/institute/qr-codes"] });
      setEditingId(null);
      toast({ title: "수정 완료" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/institute/qr-codes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/institute/qr-codes"] });
      toast({ title: "삭제 완료", description: "QR 코드가 삭제되었습니다." });
    },
  });

  const qrCodes = data?.qrCodes ?? [];

  const getCheckinUrl = (token: string) => `${window.location.origin}/checkin/${token}`;

  const copyCheckinUrl = (token: string) => {
    navigator.clipboard.writeText(getCheckinUrl(token));
    toast({ title: "복사 완료", description: "체크인 URL이 클립보드에 복사되었습니다." });
  };

  const downloadQrImage = useCallback((token: string, label: string) => {
    const svg = document.getElementById(`qr-svg-${token}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "hsl(var(--background))";
      ctx.fillRect(0, 0, 300, 300);
      ctx.drawImage(img, 0, 0, 300, 300);
      const link = document.createElement("a");
      link.download = `qr-${label || token}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  }, []);

  const printQr = useCallback((token: string, label: string) => {
    const svg = document.getElementById(`qr-svg-${token}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>QR 코드 - ${label}</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;}
      h2{margin-bottom:8px;}p{color:hsl(var(--muted-foreground));font-size:14px;}</style></head>
      <body><h2>${label}</h2><div>${svgData}</div>
      <p>${getCheckinUrl(token)}</p>
      <script>window.onload=()=>{window.print();window.close();}<\/script></body></html>
    `);
    printWindow.document.close();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <QrCode className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">QR 코드 관리</h1>
          <p className="text-gray-500 text-sm">기관 체크인용 QR 코드를 생성하고 관리합니다</p>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/institute/visit-sessions")}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-primary">방문 신뢰 QR 발급</p>
                <p className="text-sm text-muted-foreground">접종·성향 기반 1회용 신뢰 인증 QR을 발급합니다</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-primary" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">새 QR 코드 생성</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="label" className="text-sm">QR 코드 이름</Label>
              <Input
                id="label"
                placeholder="예: 1층 프론트 데스크, 2층 훈련실"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
            </div>
            <Button
              className="self-end"
              onClick={() => createMutation.mutate(newLabel || '기본 QR 코드')}
              disabled={createMutation.isPending}
            >
              <Plus className="w-4 h-4 mr-1" />
              생성
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      ) : qrCodes.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <QrCode className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">아직 생성된 QR 코드가 없습니다</p>
            <p className="text-gray-400 text-sm mt-1">위에서 새 QR 코드를 생성해 주세요</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {qrCodes.map((qr) => (
            <Card key={qr.id} className={!qr.isActive ? "opacity-60" : ""}>
              <CardContent className="py-4 px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setPreviewQr(qr)}
                    >
                      <QRCodeSVG
                        id={`qr-svg-${qr.token}`}
                        value={getCheckinUrl(qr.token)}
                        size={64}
                        level="M"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingId === qr.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="h-8"
                          />
                          <Button size="sm" variant="ghost" onClick={() => updateMutation.mutate({ id: qr.id, payload: { label: editLabel } })}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <p className="font-medium">{qr.label}</p>
                          <p className="text-xs text-gray-400 truncate">{getCheckinUrl(qr.token)}</p>
                        </>
                      )}
                    </div>
                    <Badge variant={qr.isActive ? "default" : "secondary"}>
                      {qr.isActive ? "활성" : "비활성"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1 ml-4">
                    <Switch
                      checked={qr.isActive ?? true}
                      onCheckedChange={(checked) => updateMutation.mutate({ id: qr.id, payload: { isActive: checked } })}
                    />
                    <Button size="sm" variant="ghost" title="URL 복사" onClick={() => copyCheckinUrl(qr.token)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" title="다운로드" onClick={() => downloadQrImage(qr.token, qr.label ?? '')}>
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" title="인쇄" onClick={() => printQr(qr.token, qr.label ?? '')}>
                      <Printer className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" title="이름 수정" onClick={() => { setEditingId(qr.id); setEditLabel(qr.label ?? ""); }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" title="삭제" onClick={() => {
                      if (confirm("이 QR 코드를 삭제하시겠습니까?")) deleteMutation.mutate(qr.id);
                    }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!previewQr} onOpenChange={() => setPreviewQr(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{previewQr?.label ?? 'QR 코드'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4" ref={qrRef}>
            {previewQr && (
              <>
                <QRCodeSVG
                  id={`qr-preview-${previewQr.token}`}
                  value={getCheckinUrl(previewQr.token)}
                  size={240}
                  level="H"
                  includeMargin
                />
                <p className="text-xs text-gray-500 text-center break-all">{getCheckinUrl(previewQr.token)}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => downloadQrImage(previewQr.token, previewQr.label ?? '')}>
                    <Download className="w-4 h-4 mr-1" />
                    다운로드
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => printQr(previewQr.token, previewQr.label ?? '')}>
                    <Printer className="w-4 h-4 mr-1" />
                    인쇄
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copyCheckinUrl(previewQr.token)}>
                    <Copy className="w-4 h-4 mr-1" />
                    URL 복사
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
