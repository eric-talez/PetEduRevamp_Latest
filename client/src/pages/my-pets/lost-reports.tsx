import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { ArrowLeft, Siren, MapPin, Phone, Clock, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface LostReport {
  id: number;
  petId: number;
  passportId: number;
  finderName: string | null;
  finderPhone: string | null;
  lat: number | null;
  lng: number | null;
  locationText: string | null;
  memo: string | null;
  createdAt: string;
  ownerNotifiedAt: string | null;
}

export default function LostReportsPage() {
  const search = useSearch();
  const highlightId = new URLSearchParams(search).get("reportId");

  const { data, isLoading } = useQuery<{ success: boolean; reports: LostReport[] }>({
    queryKey: ["/api/pets/lost-reports"],
    queryFn: async () => {
      const res = await fetch("/api/pets/lost-reports", { credentials: "include" });
      if (!res.ok) throw new Error("불러오기 실패");
      return res.json();
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (highlightId) {
      const el = document.getElementById(`report-${highlightId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId, data]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/my-pets">
            <Button variant="ghost" size="sm" data-testid="button-back-mypets">
              <ArrowLeft className="w-4 h-4 mr-1" /> 내 반려동물로
            </Button>
          </Link>
          <Badge variant="destructive" className="gap-1">
            <Siren className="w-3.5 h-3.5" /> 분실 제보
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">발견 제보 이력</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              QR을 스캔한 분들이 보내주신 발견 제보 목록입니다.
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : !data?.reports?.length ? (
              <p className="text-sm text-center text-gray-500 py-8">
                아직 받은 제보가 없습니다.
              </p>
            ) : (
              <div className="space-y-3">
                {data.reports.map((r) => (
                  <div
                    id={`report-${r.id}`}
                    key={r.id}
                    className={`p-4 rounded-lg border ${
                      String(r.id) === highlightId
                        ? "border-red-400 bg-red-50 dark:bg-red-950"
                        : "bg-white dark:bg-gray-900"
                    }`}
                    data-testid={`report-card-${r.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(r.createdAt).toLocaleString()}
                      </div>
                      <Badge variant="secondary">제보 #{r.id}</Badge>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      {r.locationText && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <span>{r.locationText}</span>
                        </div>
                      )}
                      {(r.lat != null && r.lng != null) && (
                        <a
                          href={`https://www.google.com/maps?q=${r.lat},${r.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 underline ml-6"
                          data-testid={`link-map-${r.id}`}
                        >
                          지도에서 보기 ({r.lat.toFixed(5)}, {r.lng.toFixed(5)})
                        </a>
                      )}
                      {r.memo && (
                        <p className="text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                          {r.memo}
                        </p>
                      )}
                      {(r.finderName || r.finderPhone) && (
                        <div className="flex flex-wrap gap-3 pt-2 border-t mt-2">
                          {r.finderName && (
                            <span className="text-sm">발견자: <b>{r.finderName}</b></span>
                          )}
                          {r.finderPhone && (
                            <a
                              href={`tel:${r.finderPhone}`}
                              className="inline-flex items-center gap-1 text-sm text-red-600 font-semibold underline"
                              data-testid={`link-call-${r.id}`}
                            >
                              <Phone className="w-3.5 h-3.5" /> {r.finderPhone}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
