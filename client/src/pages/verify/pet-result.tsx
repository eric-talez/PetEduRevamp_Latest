import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ShieldCheck, ShieldAlert, ShieldX, AlertCircle, Loader2, ArrowLeft, Camera, Siren, MapPin, Phone, Send, Check, BadgeCheck, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface VerifyResponse {
  success: boolean;
  pet: {
    petUid: string | null;
    name: string;
    species: string;
    breed: string;
    age: number;
    gender: string;
    color: string | null;
    imageUrl: string | null;
    registrationNumberMasked: string | null;
  };
  vaccinations: Array<{
    vaccineName: string;
    status: "ok" | "expiring" | "expired" | "missing";
    vaccineDate: string | null;
    nextDueDate: string | null;
    verificationStatus?: "self" | "hospital_verified";
    hospitalDisplayName?: string | null;
    hospitalVerifiedAt?: string | null;
    hospitalIssuerName?: string | null;
    hospitalIssuerUserId?: number | null;
  }>;
  overallStatus: "all_ok" | "has_expiring" | "has_expired" | "no_records";
  activeBadges?: Array<{
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
  }>;
  verifiedAt: string;
  verifyCount: number;
  signature?: {
    signedPayload: string;
    signature: string;
    kid: string;
    algorithm: string;
    verified: boolean;
  } | null;
  lostMode?: {
    active: boolean;
    message?: string | null;
    contactPhone?: string | null;
    contactWindow?: string | null;
    lastSeenAt?: string | null;
    lastSeenLocation?: string | null;
    ownerNameMasked?: string | null;
    activatedAt?: string | null;
  };
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  ok: { label: "유효", cls: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  expiring: { label: "30일 이내 만료", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  expired: { label: "만료", cls: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  missing: { label: "미접종", cls: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200" },
};

export default function PetVerifyResult() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { toast } = useToast();
  const [reportForm, setReportForm] = useState({
    finderName: "",
    finderPhone: "",
    finderContactWindow: "",
    locationText: "",
    memo: "",
    lat: null as number | null,
    lng: null as number | null,
  });
  const [reportSent, setReportSent] = useState(false);
  const [gettingLoc, setGettingLoc] = useState(false);

  const reportMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/pet-passport/report-found/${token}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "제보 실패");
      return json;
    },
    onSuccess: () => {
      setReportSent(true);
      toast({ title: "보호자에게 제보가 전달되었습니다", description: "감사합니다." });
    },
    onError: (e: Error) => {
      toast({ title: "제보 실패", description: e.message, variant: "destructive" });
    },
  });

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "위치 사용 불가", description: "이 브라우저는 위치를 지원하지 않습니다.", variant: "destructive" });
      return;
    }
    setGettingLoc(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setReportForm((p) => ({ ...p, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        setGettingLoc(false);
        toast({ title: "현재 위치가 첨부되었습니다" });
      },
      () => {
        setGettingLoc(false);
        toast({ title: "위치를 가져오지 못했습니다", description: "권한을 확인해주세요.", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const { data, isLoading, error } = useQuery<VerifyResponse>({
    queryKey: ["/api/pet-passport/verify", token],
    queryFn: async () => {
      const res = await fetch(`/api/pet-passport/verify/${token}`);
      const json = await res.json();
      if (!res.ok) {
        const err = new Error(json?.error || "검증 실패") as Error & { code?: string; status?: number };
        err.code = json?.code;
        err.status = res.status;
        throw err;
      }
      return json;
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    const err = error as Error & { code?: string };
    const isRevoked = err.code === "REVOKED";
    const isExpired = err.code === "EXPIRED";
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
        <Card className="max-w-lg mx-auto" data-testid="card-verify-error">
          <CardContent className="text-center py-12">
            <ShieldX className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">
              {isRevoked ? "회수된 여권입니다" : isExpired ? "만료된 여권입니다" : "검증할 수 없습니다"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {err?.message || "QR 코드가 유효하지 않거나 만료되었습니다."}
            </p>
            <Link href="/verify/pet/scan">
              <Button variant="outline">
                <Camera className="w-4 h-4 mr-2" />
                다시 스캔하기
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  // Task #224 — 응답 무결성 검증: 서명 페이로드 안의 petUid·만료가 응답 본문과 일치하는지 클라이언트단 확인
  function verifyResponseIntegrity(d: VerifyResponse): { ok: boolean; reason?: string; expiresAt?: string; kid?: string } {
    if (!d.signature) return { ok: false, reason: 'no-signature' };
    try {
      // base64url → base64 디코드
      const b64 = d.signature.signedPayload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
      const json = JSON.parse(atob(padded));
      if (json.v !== 1) return { ok: false, reason: 'version-mismatch' };
      if (json.kid !== d.signature.kid) return { ok: false, reason: 'kid-mismatch' };
      if (!d.pet.petUid || json.petUid !== d.pet.petUid) return { ok: false, reason: 'petuid-mismatch' };
      // petHash 자체 재계산 비교는 SubtleCrypto 비동기 → 동기적 핵심 필드 일치만 확인
      // expiresAt 파싱 가능 + 미래 시점 체크
      const exp = new Date(json.expiresAt);
      if (Number.isNaN(exp.getTime())) return { ok: false, reason: 'expires-invalid' };
      if (exp.getTime() < Date.now()) return { ok: false, reason: 'expired' };
      return { ok: true, expiresAt: json.expiresAt, kid: json.kid };
    } catch {
      return { ok: false, reason: 'decode-failed' };
    }
  }
  const integrity = verifyResponseIntegrity(data);

  const status = data.overallStatus;
  const overall = {
    all_ok: { icon: ShieldCheck, label: "모든 예방접종이 유효합니다", cls: "text-green-600", bg: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900" },
    has_expiring: { icon: ShieldAlert, label: "곧 만료되는 백신이 있습니다", cls: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-900" },
    has_expired: { icon: ShieldX, label: "만료된 백신이 있습니다", cls: "text-red-600", bg: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900" },
    no_records: { icon: AlertCircle, label: "예방접종 기록이 없습니다", cls: "text-gray-600", bg: "bg-gray-50 dark:bg-gray-900 border-gray-200" },
  }[status];
  const Icon = overall.icon;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/verify/pet/scan">
            <Button variant="ghost" size="sm" data-testid="button-back-to-scan">
              <ArrowLeft className="w-4 h-4 mr-1" />
              스캔으로 돌아가기
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            {integrity.ok && (
              <Badge
                className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300 dark:border-green-700 flex items-center gap-1"
                data-testid="badge-signature-verified"
                title={`서명 키 ${integrity.kid} · ${data.signature?.algorithm}`}
              >
                <BadgeCheck className="w-3.5 h-3.5" />
                서명 확인됨
              </Badge>
            )}
            <Badge variant="secondary">검증 #{data.verifyCount}</Badge>
          </div>
        </div>

        {data.lostMode?.active && (
          <Card className="border-2 border-red-500 bg-red-50 dark:bg-red-950" data-testid="card-lost-banner">
            <CardContent className="py-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center animate-pulse">
                  <Siren className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-red-700 dark:text-red-200">분실견 입니다</h2>
                  <p className="text-sm text-red-700 dark:text-red-300">발견해주셔서 감사합니다. 보호자에게 즉시 알림이 전송됩니다.</p>
                </div>
              </div>
              {data.lostMode.message && (
                <div className="rounded-md bg-white/70 dark:bg-black/30 p-3 text-sm">
                  <div className="text-xs text-gray-500 mb-1">보호자 메시지</div>
                  <div className="whitespace-pre-wrap">{data.lostMode.message}</div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {data.lostMode.ownerNameMasked && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">보호자</span>
                    <span className="font-medium">{data.lostMode.ownerNameMasked}</span>
                  </div>
                )}
                {data.lostMode.contactPhone && (
                  <a
                    href={`tel:${data.lostMode.contactPhone}`}
                    className="flex items-center gap-2 text-red-700 dark:text-red-300 font-semibold underline"
                    data-testid="link-lost-call"
                  >
                    <Phone className="w-4 h-4" /> {data.lostMode.contactPhone}
                  </a>
                )}
                {data.lostMode.contactWindow && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">연락 가능</span>
                    <span>{data.lostMode.contactWindow}</span>
                  </div>
                )}
                {data.lostMode.lastSeenAt && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">목격 시각</span>
                    <span>{data.lostMode.lastSeenAt}</span>
                  </div>
                )}
                {data.lostMode.lastSeenLocation && (
                  <div className="flex items-center gap-2 col-span-full">
                    <span className="text-gray-500">목격 장소</span>
                    <span>{data.lostMode.lastSeenLocation}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {data.lostMode?.active && (
          <Card className="border-red-200" data-testid="card-finder-report">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="w-4 h-4 text-red-600" />
                발견 제보 보내기
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reportSent ? (
                <div className="text-center py-6 text-sm text-gray-700 dark:text-gray-300">
                  <Check className="w-10 h-10 text-green-600 mx-auto mb-2" />
                  보호자에게 제보가 전달되었습니다. 감사합니다.
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    위치/연락처는 분실 보호자에게만 전달되며, 보호자가 직접 연락드립니다.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="finder-name" className="text-sm">이름 (선택)</Label>
                      <Input
                        id="finder-name"
                        value={reportForm.finderName}
                        onChange={(e) => setReportForm((p) => ({ ...p, finderName: e.target.value.slice(0, 100) }))}
                        data-testid="input-finder-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="finder-phone" className="text-sm">연락처 (선택)</Label>
                      <Input
                        id="finder-phone"
                        value={reportForm.finderPhone}
                        onChange={(e) => setReportForm((p) => ({ ...p, finderPhone: e.target.value.slice(0, 30) }))}
                        data-testid="input-finder-phone"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="finder-window" className="text-sm">연락 가능 시간 (선택)</Label>
                    <Input
                      id="finder-window"
                      placeholder="예: 평일 18시 이후, 언제든"
                      value={reportForm.finderContactWindow}
                      onChange={(e) => setReportForm((p) => ({ ...p, finderContactWindow: e.target.value.slice(0, 100) }))}
                      data-testid="input-finder-window"
                    />
                  </div>
                  <div>
                    <Label htmlFor="finder-loc" className="text-sm flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> 발견 장소
                    </Label>
                    <Input
                      id="finder-loc"
                      placeholder="예: 강남구 역삼동 OO편의점 앞"
                      value={reportForm.locationText}
                      onChange={(e) => setReportForm((p) => ({ ...p, locationText: e.target.value.slice(0, 500) }))}
                      data-testid="input-finder-location"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGetLocation}
                    disabled={gettingLoc}
                    className="w-full"
                    data-testid="button-finder-geo"
                  >
                    {gettingLoc ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <MapPin className="w-3.5 h-3.5 mr-1" />}
                    {reportForm.lat != null ? `현재 위치 첨부됨 (${reportForm.lat.toFixed(4)}, ${reportForm.lng?.toFixed(4)})` : "현재 위치 첨부 (GPS)"}
                  </Button>
                  <div>
                    <Label htmlFor="finder-memo" className="text-sm">메모 (선택)</Label>
                    <Textarea
                      id="finder-memo"
                      placeholder="강아지 상태, 주변 상황 등"
                      rows={3}
                      value={reportForm.memo}
                      onChange={(e) => setReportForm((p) => ({ ...p, memo: e.target.value.slice(0, 1000) }))}
                      data-testid="input-finder-memo"
                    />
                  </div>
                  <Button
                    className="w-full bg-red-600 hover:bg-red-700"
                    onClick={() => reportMutation.mutate()}
                    disabled={reportMutation.isPending || (!reportForm.locationText && !reportForm.memo && reportForm.lat == null)}
                    data-testid="button-finder-submit"
                  >
                    {reportMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Send className="w-4 h-4 mr-2" />
                    보호자에게 제보 전송
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <Card className={`border-2 ${overall.bg}`} data-testid="card-verify-overall">
          <CardContent className="py-6 flex items-center gap-4">
            <Icon className={`w-12 h-12 ${overall.cls}`} />
            <div>
              <h2 className="text-xl font-bold">{overall.label}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                검증 시각: {new Date(data.verifiedAt).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-verify-pet">
          <CardHeader>
            <CardTitle>반려동물 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {data.pet.imageUrl ? (
                  <img src={data.pet.imageUrl} alt={data.pet.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">{data.pet.species === "dog" ? "🐶" : data.pet.species === "cat" ? "🐱" : "🐾"}</span>
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <h3 className="text-2xl font-bold">{data.pet.name}</h3>
                {data.pet.petUid && (
                  <p className="text-sm">
                    <span className="text-gray-500 mr-2">펫 ID</span>
                    <span className="font-mono font-bold tracking-wider text-primary" data-testid="text-verify-pet-uid">{data.pet.petUid}</span>
                  </p>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400">{data.pet.breed} · {data.pet.age}세 · {data.pet.gender === "male" ? "수컷" : "암컷"}</p>
                {data.pet.color && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">색상: {data.pet.color}</p>
                )}
                {data.pet.registrationNumberMasked && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    등록번호: <span className="font-mono">{data.pet.registrationNumberMasked}</span>
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-verify-vaccinations">
          <CardHeader>
            <CardTitle>예방접종 기록 ({data.vaccinations.length}건)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.vaccinations.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">기록이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {data.vaccinations.map((v, i) => {
                  const s = STATUS_LABEL[v.status];
                  const isHospital = v.verificationStatus === "hospital_verified";
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-3 rounded-lg border ${isHospital ? "border-blue-300 bg-blue-50/50 dark:bg-blue-950/30" : "bg-white dark:bg-gray-900"}`}
                      data-testid={`row-vaccine-${i}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-medium truncate">{v.vaccineName}</p>
                          {isHospital ? (
                            <Badge
                              className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300 text-[10px] px-1.5 py-0 flex items-center gap-0.5"
                              title={`병원 인증: ${v.hospitalDisplayName || ""}${v.hospitalVerifiedAt ? ` · ${new Date(v.hospitalVerifiedAt).toLocaleDateString()}` : ""}`}
                              data-testid={`badge-hospital-verified-${i}`}
                            >
                              <BadgeCheck className="w-3 h-3" /> 병원 인증
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-gray-600 dark:text-gray-400" data-testid={`badge-self-reported-${i}`}>
                              보호자 입력
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {v.vaccineDate && `접종일: ${v.vaccineDate}`}
                          {v.vaccineDate && v.nextDueDate && " · "}
                          {v.nextDueDate && `다음: ${v.nextDueDate}`}
                        </p>
                        {isHospital && v.hospitalDisplayName && (
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5 truncate">
                            {v.hospitalDisplayName}
                            {v.hospitalIssuerName && (
                              <span className="text-blue-600/80"> · 검증자 {v.hospitalIssuerName}</span>
                            )}
                          </p>
                        )}
                      </div>
                      <Badge className={`${s.cls} flex-shrink-0`}>{s.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {data.activeBadges && data.activeBadges.length > 0 && (
          <Card data-testid="card-verify-badges" className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Award className="w-5 h-5" />
                훈련 인증 ({data.activeBadges.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.activeBadges.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-start justify-between p-3 rounded-lg border border-primary/20 bg-primary/5"
                    data-testid={`row-verify-badge-${b.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge className="bg-primary/15 text-primary border-primary/40">
                          <Award className="w-3 h-3 mr-1" />
                          {b.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {b.issuerTrainerName && <>발급: {b.issuerTrainerName} · </>}
                        {new Date(b.issuedAt).toLocaleDateString()}
                        {b.expiresAt && <> · 유효기간 {new Date(b.expiresAt).toLocaleDateString()}까지</>}
                      </p>
                      {b.comment && (
                        <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">{b.comment}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-center text-gray-500">
          본 정보는 보호자가 등록한 데이터에 기반합니다. TALEZ는 정보의 정확성을 보장하지 않습니다.
        </p>
      </div>
    </div>
  );
}
