import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, Flag, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface PublicReview {
  id: number;
  authorName?: string;
  rating: number;
  title?: string | null;
  content: string;
  photos?: string[] | null;
  createdAt: string;
  reply?: { id: number; content: string; createdAt: string } | null;
}

const REASONS: { value: "spam" | "abuse" | "false_info" | "privacy" | "other"; label: string }[] = [
  { value: "spam", label: "스팸/광고" },
  { value: "abuse", label: "욕설/비방" },
  { value: "false_info", label: "허위 정보" },
  { value: "privacy", label: "개인정보 노출" },
  { value: "other", label: "기타" },
];

export function PublicTrainerReviews({ trainerId }: { trainerId: number }) {
  const { toast } = useToast();
  const [reportTarget, setReportTarget] = useState<PublicReview | null>(null);
  const [reportReason, setReportReason] = useState<typeof REASONS[number]["value"]>("spam");
  const [reportDesc, setReportDesc] = useState("");

  const reviewsQuery = useQuery<{ success: boolean; reviews: PublicReview[] }>({
    queryKey: ["/api/trainer-reviews", { trainerId }],
    queryFn: async () => {
      const res = await fetch(`/api/trainer-reviews?trainerId=${trainerId}`, { credentials: "include" });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });

  const summaryQuery = useQuery<{ success: boolean; average: number; count: number; distribution: Record<string, number> }>({
    queryKey: ["/api/trainer-reviews/summary", trainerId],
    queryFn: async () => {
      const res = await fetch(`/api/trainer-reviews/summary/${trainerId}`);
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!reportTarget) throw new Error("리뷰가 선택되지 않았습니다.");
      const res = await apiRequest("POST", `/api/trainer-reviews/${reportTarget.id}/report`, {
        reason: reportReason,
        description: reportDesc.trim() || undefined,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "신고 실패");
      return data;
    },
    onSuccess: () => {
      toast({ title: "신고가 접수되었습니다.", description: "관리자가 검토 후 조치합니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-reviews"] });
      setReportTarget(null);
      setReportDesc("");
      setReportReason("spam");
    },
    onError: (e: unknown) =>
      toast({
        title: "신고 실패",
        description: e instanceof Error ? e.message : "오류가 발생했습니다.",
        variant: "destructive",
      }),
  });

  const renderStars = (rating: number) => (
    <div className="flex items-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? "text-yellow-400 fill-current" : "text-gray-300"}`}
        />
      ))}
    </div>
  );

  const reviews = reviewsQuery.data?.reviews || [];
  const summary = summaryQuery.data;

  return (
    <div className="space-y-4" data-testid="public-trainer-reviews">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-3xl font-bold">
            {summary?.count ? Number(summary.average).toFixed(1) : "-"}
          </div>
          {renderStars(Math.round(summary?.average || 0))}
          <div className="text-sm text-muted-foreground">총 {summary?.count ?? 0}개의 리뷰</div>
        </div>
      </div>

      {reviewsQuery.isLoading ? (
        <div className="text-center py-8 text-muted-foreground">불러오는 중...</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
          <MessageSquare className="h-10 w-10" />
          아직 등록된 리뷰가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id} data-testid={`public-review-${r.id}`}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{r.authorName || "보호자"}</Badge>
                    {renderStars(r.rating)}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(r.createdAt), "yyyy.MM.dd")}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-red-600"
                    onClick={() => setReportTarget(r)}
                    data-testid={`button-report-review-${r.id}`}
                  >
                    <Flag className="h-4 w-4 mr-1" /> 신고
                  </Button>
                </div>
                {r.title && <h4 className="font-semibold">{r.title}</h4>}
                <p className="text-sm whitespace-pre-wrap">{r.content}</p>
                {r.photos && r.photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {r.photos.map((src, i) => (
                      <a
                        key={i}
                        href={src}
                        target="_blank"
                        rel="noreferrer"
                        data-testid={`review-photo-${r.id}-${i}`}
                      >
                        <img
                          src={src}
                          alt={`리뷰 사진 ${i + 1}`}
                          loading="lazy"
                          className="h-20 w-20 object-cover rounded border"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </a>
                    ))}
                  </div>
                )}
                {r.reply && (
                  <div className="bg-blue-50 border-l-4 border-blue-400 rounded p-2 text-sm">
                    <span className="font-medium text-blue-700">트레이너 답변:</span> {r.reply.content}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!reportTarget} onOpenChange={(o) => !o && setReportTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>리뷰 신고</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={reportReason} onValueChange={(v) => setReportReason(v as typeof reportReason)}>
              <SelectTrigger data-testid="select-report-reason"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="신고 사유를 자세히 적어주세요 (선택)"
              value={reportDesc}
              onChange={(e) => setReportDesc(e.target.value)}
              data-testid="textarea-report-description"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportTarget(null)}>취소</Button>
            <Button
              variant="destructive"
              disabled={reportMutation.isPending}
              onClick={() => reportMutation.mutate()}
              data-testid="button-submit-report"
            >
              신고 접수
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PublicTrainerReviews;
