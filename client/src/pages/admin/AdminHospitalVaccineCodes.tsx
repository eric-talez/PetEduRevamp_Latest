import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Hospital, Copy, Check, Loader2, Trash2 } from "lucide-react";

interface VaccineCode {
  id: number;
  code: string;
  hospitalName: string;
  targetVaccineType: string | null;
  notes: string | null;
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  status: "active" | "used" | "expired" | "revoked";
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  active: { label: "사용 가능", cls: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  used: { label: "사용됨", cls: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  expired: { label: "만료", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  revoked: { label: "회수됨", cls: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200" },
};

export default function AdminHospitalVaccineCodes() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ hospitalName: "", targetVaccineType: "", notes: "", count: 1 });
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const { data, isLoading } = useQuery<{ success: boolean; codes: VaccineCode[] }>({
    queryKey: ["/api/admin/hospital-vaccine-codes"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/hospital-vaccine-codes", form);
      return res.json();
    },
    onSuccess: (resp) => {
      const created = resp?.codes?.length || 0;
      toast({ title: `${created}개 코드가 발급되었습니다`, description: "유효기간: 7일" });
      qc.invalidateQueries({ queryKey: ["/api/admin/hospital-vaccine-codes"] });
      setForm({ hospitalName: form.hospitalName, targetVaccineType: "", notes: "", count: 1 });
    },
    onError: (e: Error) => toast({ title: "발급 실패", description: e.message, variant: "destructive" }),
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/hospital-vaccine-codes/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "코드가 회수되었습니다" });
      qc.invalidateQueries({ queryKey: ["/api/admin/hospital-vaccine-codes"] });
    },
    onError: (e: Error) => toast({ title: "회수 실패", description: e.message, variant: "destructive" }),
  });

  const handleCopy = async (id: number, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast({ title: "복사 실패", variant: "destructive" });
    }
  };

  const codes = data?.codes || [];
  const activeCount = codes.filter((c) => c.status === "active").length;
  const usedCount = codes.filter((c) => c.status === "used").length;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Hospital className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">병원 백신 인증 코드</h1>
          <p className="text-sm text-gray-500">병원에서 발급한 6~8자 코드로 보호자 백신 기록을 인증합니다. 1회 사용·7일 유효.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">새 코드 발급</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <Label htmlFor="hospital-name">병원명 *</Label>
              <Input
                id="hospital-name"
                value={form.hospitalName}
                onChange={(e) => setForm((p) => ({ ...p, hospitalName: e.target.value.slice(0, 200) }))}
                placeholder="예: 강남24시동물의료센터"
                data-testid="input-hospital-name"
              />
            </div>
            <div>
              <Label htmlFor="vaccine-type">백신 종류 (선택)</Label>
              <Input
                id="vaccine-type"
                value={form.targetVaccineType}
                onChange={(e) => setForm((p) => ({ ...p, targetVaccineType: e.target.value.slice(0, 100) }))}
                placeholder="예: 광견병"
                data-testid="input-vaccine-type"
              />
            </div>
            <div>
              <Label htmlFor="count">발급 수량</Label>
              <Input
                id="count"
                type="number"
                min={1}
                max={50}
                value={form.count}
                onChange={(e) => setForm((p) => ({ ...p, count: Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)) }))}
                data-testid="input-count"
              />
            </div>
            <div className="md:col-span-4">
              <Label htmlFor="notes">메모 (선택)</Label>
              <Textarea
                id="notes"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value.slice(0, 1000) }))}
                placeholder="내부 관리용 메모 (보호자에게 노출되지 않습니다)"
                data-testid="input-notes"
              />
            </div>
          </div>
          <Button
            className="mt-3"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !form.hospitalName.trim()}
            data-testid="button-create-code"
          >
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            코드 발급
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="py-4"><div className="text-xs text-gray-500">사용 가능</div><div className="text-2xl font-bold text-green-600">{activeCount}</div></CardContent></Card>
        <Card><CardContent className="py-4"><div className="text-xs text-gray-500">사용됨</div><div className="text-2xl font-bold">{usedCount}</div></CardContent></Card>
        <Card><CardContent className="py-4"><div className="text-xs text-gray-500">전체</div><div className="text-2xl font-bold">{codes.length}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">발급 내역</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
          ) : codes.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-8">발급된 코드가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>코드</TableHead>
                    <TableHead>병원</TableHead>
                    <TableHead>백신 종류</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>만료</TableHead>
                    <TableHead>사용</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((c) => (
                    <TableRow key={c.id} data-testid={`row-code-${c.id}`}>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => handleCopy(c.id, c.code)}
                          className="font-mono font-bold tracking-wider text-primary inline-flex items-center gap-1 hover:underline"
                          data-testid={`button-copy-code-${c.id}`}
                        >
                          {c.code}
                          {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm">{c.hospitalName}</TableCell>
                      <TableCell className="text-sm text-gray-500">{c.targetVaccineType || "전체 허용"}</TableCell>
                      <TableCell><Badge className={STATUS_BADGE[c.status].cls}>{STATUS_BADGE[c.status].label}</Badge></TableCell>
                      <TableCell className="text-xs text-gray-500">{new Date(c.expiresAt).toLocaleDateString("ko-KR")}</TableCell>
                      <TableCell className="text-xs text-gray-500">{c.usedAt ? new Date(c.usedAt).toLocaleString("ko-KR") : "-"}</TableCell>
                      <TableCell className="text-right">
                        {c.status === "active" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { if (confirm("이 코드를 회수하시겠습니까?")) revokeMutation.mutate(c.id); }}
                            disabled={revokeMutation.isPending}
                            data-testid={`button-revoke-${c.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
