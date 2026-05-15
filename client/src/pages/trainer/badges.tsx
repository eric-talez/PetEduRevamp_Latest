import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Award, Loader2, Plus, Trash2, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface BadgeDefinition {
  id: number;
  code: string;
  label: string;
  category: string;
  level: number | null;
  description: string | null;
  iconKey: string | null;
  issuerScope: string;
  isActive: boolean;
}

interface IssuedBadge {
  id: number;
  petId: number;
  petName: string | null;
  petUid: string | null;
  comment: string | null;
  issuedAt: string;
  revokedAt: string | null;
  revokeReason: string | null;
  expiresAt: string | null;
  code: string;
  label: string;
  category: string;
  level: number | null;
  iconKey: string | null;
}

interface TrainerStudent {
  id?: number;
  petId?: number;
  pet?: { id: number; name: string; petUid?: string | null };
  petName?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  social: "사회성",
  manner: "매너",
  leash: "리드워크",
  control: "컨트롤",
  behavior: "행동교정",
  enrichment: "엔리치먼트",
  obedience: "복종훈련",
  custom: "커스텀",
};

export default function TrainerBadgesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchPetId, setSearchPetId] = useState<string>("");
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({ petId: "", badgeDefinitionId: "", comment: "", expiresAt: "", sourceJournalId: "" });
  const [revokeTarget, setRevokeTarget] = useState<IssuedBadge | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  const definitionsQuery = useQuery<{ success: boolean; definitions: BadgeDefinition[] }>({
    queryKey: ["/api/badge-definitions"],
  });

  const studentsQuery = useQuery<{ assignments?: TrainerStudent[]; students?: TrainerStudent[] }>({
    queryKey: ["/api/trainer/clients"],
  });

  const badgesQuery = useQuery<{ success: boolean; badges: IssuedBadge[] }>({
    queryKey: ["/api/trainer/badges", searchPetId || "all"],
    queryFn: async () => {
      const url = searchPetId
        ? `/api/trainer/badges?petId=${encodeURIComponent(searchPetId)}`
        : "/api/trainer/badges";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("조회 실패");
      return res.json();
    },
  });

  const studentOptions = useMemo(() => {
    const raw = studentsQuery.data?.assignments || studentsQuery.data?.students || [];
    const seen = new Set<number>();
    const opts: Array<{ petId: number; label: string }> = [];
    for (const s of raw) {
      const pid = s.petId ?? s.pet?.id;
      if (!pid || seen.has(pid)) continue;
      seen.add(pid);
      const name = s.pet?.name || s.petName || `반려동물 #${pid}`;
      opts.push({ petId: pid, label: `${name} (#${pid})` });
    }
    return opts;
  }, [studentsQuery.data]);

  const issueMutation = useMutation({
    mutationFn: async () => {
      const petId = Number(issueForm.petId);
      const badgeDefinitionId = Number(issueForm.badgeDefinitionId);
      if (!Number.isFinite(petId) || petId <= 0) throw new Error("반려동물을 선택해주세요");
      if (!Number.isFinite(badgeDefinitionId) || badgeDefinitionId <= 0) throw new Error("배지를 선택해주세요");
      let expiresAtIso: string | null = null;
      if (issueForm.expiresAt) {
        const d = new Date(issueForm.expiresAt);
        if (Number.isNaN(d.getTime())) throw new Error("만료일 형식이 올바르지 않습니다");
        if (d.getTime() <= Date.now()) throw new Error("만료일은 오늘 이후여야 합니다");
        expiresAtIso = d.toISOString();
      }
      const sourceJournalId = issueForm.sourceJournalId.trim()
        ? Number(issueForm.sourceJournalId)
        : null;
      if (sourceJournalId !== null && (!Number.isFinite(sourceJournalId) || sourceJournalId <= 0)) {
        throw new Error("근거 일지 ID는 양의 정수여야 합니다");
      }
      const res = await apiRequest("POST", "/api/trainer/badges", {
        petId,
        badgeDefinitionId,
        comment: issueForm.comment || null,
        expiresAt: expiresAtIso,
        sourceJournalId,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "발급 실패");
      return data;
    },
    onSuccess: () => {
      toast({ title: "배지가 발급되었습니다", description: "보호자에게 알림이 전송됩니다." });
      setIssueOpen(false);
      setIssueForm({ petId: "", badgeDefinitionId: "", comment: "", expiresAt: "", sourceJournalId: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/badges"] });
    },
    onError: (e: Error) => toast({ title: "발급 실패", description: e.message, variant: "destructive" }),
  });

  const revokeMutation = useMutation({
    mutationFn: async () => {
      if (!revokeTarget) throw new Error("대상 배지가 없습니다");
      const reason = revokeReason.trim();
      if (!reason) throw new Error("회수 사유를 입력해주세요");
      const res = await apiRequest("DELETE", `/api/trainer/badges/${revokeTarget.id}`, { reason });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "회수 실패");
      return data;
    },
    onSuccess: () => {
      toast({ title: "배지가 회수되었습니다" });
      setRevokeTarget(null);
      setRevokeReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/badges"] });
    },
    onError: (e: Error) => toast({ title: "회수 실패", description: e.message, variant: "destructive" }),
  });

  const definitions = definitionsQuery.data?.definitions || [];
  const badges = badgesQuery.data?.badges || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="w-6 h-6 text-primary" />
            훈련 인증 배지
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            담당 반려동물에게 훈련 성취 배지를 발급하고 관리합니다.
          </p>
        </div>
        <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-issue-badge">
              <Plus className="w-4 h-4 mr-1" />
              배지 발급
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 배지 발급</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">반려동물</Label>
                {studentOptions.length > 0 ? (
                  <Select value={issueForm.petId} onValueChange={(v) => setIssueForm((p) => ({ ...p, petId: v }))}>
                    <SelectTrigger data-testid="select-issue-pet">
                      <SelectValue placeholder="담당 반려동물 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {studentOptions.map((o) => (
                        <SelectItem key={o.petId} value={String(o.petId)}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type="number"
                    placeholder="반려동물 ID 직접 입력"
                    value={issueForm.petId}
                    onChange={(e) => setIssueForm((p) => ({ ...p, petId: e.target.value }))}
                    data-testid="input-issue-pet-id"
                  />
                )}
              </div>
              <div>
                <Label className="text-sm">배지</Label>
                <Select
                  value={issueForm.badgeDefinitionId}
                  onValueChange={(v) => setIssueForm((p) => ({ ...p, badgeDefinitionId: v }))}
                >
                  <SelectTrigger data-testid="select-issue-badge-def">
                    <SelectValue placeholder="발급할 배지 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {definitions.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.label} ({CATEGORY_LABELS[d.category] || d.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">코멘트 (선택)</Label>
                <Textarea
                  value={issueForm.comment}
                  onChange={(e) => setIssueForm((p) => ({ ...p, comment: e.target.value.slice(0, 500) }))}
                  rows={3}
                  placeholder="보호자에게 전달할 평가 메모"
                  data-testid="input-issue-comment"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{issueForm.comment.length}/500</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-sm">만료일 (선택)</Label>
                  <Input
                    type="date"
                    value={issueForm.expiresAt}
                    onChange={(e) => setIssueForm((p) => ({ ...p, expiresAt: e.target.value }))}
                    data-testid="input-issue-expires"
                  />
                </div>
                <div>
                  <Label className="text-sm">근거 일지 ID (선택)</Label>
                  <Input
                    type="number"
                    placeholder="예: 123"
                    value={issueForm.sourceJournalId}
                    onChange={(e) => setIssueForm((p) => ({ ...p, sourceJournalId: e.target.value }))}
                    data-testid="input-issue-source-journal"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIssueOpen(false)}>취소</Button>
              <Button onClick={() => issueMutation.mutate()} disabled={issueMutation.isPending} data-testid="button-issue-badge-submit">
                {issueMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                발급
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-4">
        <CardContent className="py-4 flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <Input
            type="number"
            placeholder="반려동물 ID로 필터 (비워두면 전체)"
            value={searchPetId}
            onChange={(e) => setSearchPetId(e.target.value)}
            className="max-w-xs"
            data-testid="input-search-pet-id"
          />
          {searchPetId && (
            <Button variant="ghost" size="sm" onClick={() => setSearchPetId("")}>초기화</Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">발급한 배지 ({badges.length}건)</CardTitle>
        </CardHeader>
        <CardContent>
          {badgesQuery.isLoading ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : badges.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">아직 발급한 배지가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {badges.map((b) => {
                const isRevoked = !!b.revokedAt;
                return (
                  <div
                    key={b.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${isRevoked ? "bg-gray-50 dark:bg-gray-900/40 opacity-70" : "bg-white dark:bg-gray-900"}`}
                    data-testid={`row-badge-${b.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-primary/10 text-primary border-primary/30">
                          <Award className="w-3 h-3 mr-1" /> {b.label}
                        </Badge>
                        <span className="text-xs text-gray-500">{CATEGORY_LABELS[b.category] || b.category}</span>
                        {isRevoked && <Badge variant="destructive" className="text-[10px]">회수됨</Badge>}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {b.petName || `반려동물 #${b.petId}`}
                        {b.petUid && <span className="font-mono ml-1">({b.petUid})</span>}
                        <span className="mx-1">·</span>
                        발급 {new Date(b.issuedAt).toLocaleDateString()}
                      </div>
                      {b.comment && (
                        <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 truncate">메모: {b.comment}</p>
                      )}
                      {isRevoked && b.revokeReason && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">회수 사유: {b.revokeReason}</p>
                      )}
                    </div>
                    {!isRevoked && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive/40"
                        onClick={() => { setRevokeTarget(b); setRevokeReason(""); }}
                        data-testid={`button-revoke-${b.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        회수
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!revokeTarget} onOpenChange={(open) => { if (!open) { setRevokeTarget(null); setRevokeReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>배지 회수</DialogTitle>
          </DialogHeader>
          {revokeTarget && (
            <div className="space-y-3">
              <div className="text-sm">
                <strong>{revokeTarget.label}</strong> 배지를 회수합니다. 회수 사유는 보호자에게 알림으로 전달됩니다.
              </div>
              <div>
                <Label className="text-sm">회수 사유</Label>
                <Textarea
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value.slice(0, 500))}
                  rows={3}
                  placeholder="예: 재평가 결과 기준 미달"
                  data-testid="input-revoke-reason"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRevokeTarget(null); setRevokeReason(""); }}>취소</Button>
            <Button
              variant="destructive"
              onClick={() => revokeMutation.mutate()}
              disabled={revokeMutation.isPending || !revokeReason.trim()}
              data-testid="button-revoke-submit"
            >
              {revokeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              회수
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
