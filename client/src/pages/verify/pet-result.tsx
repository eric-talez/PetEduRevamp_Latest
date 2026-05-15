import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ShieldCheck, ShieldAlert, ShieldX, AlertCircle, Loader2, ArrowLeft, Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  }>;
  overallStatus: "all_ok" | "has_expiring" | "has_expired" | "no_records";
  verifiedAt: string;
  verifyCount: number;
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
          <Badge variant="secondary">검증 #{data.verifyCount}</Badge>
        </div>

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
                  return (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-gray-900">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{v.vaccineName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {v.vaccineDate && `접종일: ${v.vaccineDate}`}
                          {v.vaccineDate && v.nextDueDate && " · "}
                          {v.nextDueDate && `다음: ${v.nextDueDate}`}
                        </p>
                      </div>
                      <Badge className={`${s.cls} flex-shrink-0`}>{s.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-center text-gray-500">
          본 정보는 보호자가 등록한 데이터에 기반합니다. TALEZ는 정보의 정확성을 보장하지 않습니다.
        </p>
      </div>
    </div>
  );
}
