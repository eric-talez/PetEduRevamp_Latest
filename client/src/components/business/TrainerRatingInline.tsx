import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";

type TrainerReviewSummary = {
  success: boolean;
  trainerId: number;
  average: number;
  count: number;
  distribution?: Record<string, number>;
};

interface TrainerRatingInlineProps {
  trainerId: number | string;
  fallbackRating?: number;
  fallbackReviews?: number;
  initialAverage?: number;
  initialCount?: number;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  compact?: boolean;
}

export function TrainerRatingInline({
  trainerId,
  fallbackRating,
  fallbackReviews,
  initialAverage,
  initialCount,
  className,
  iconClassName,
  textClassName,
  compact = false,
}: TrainerRatingInlineProps) {
  const numericId = typeof trainerId === "string" ? parseInt(trainerId, 10) : trainerId;

  const { data } = useQuery<TrainerReviewSummary>({
    queryKey: ["/api/trainer-reviews/summary", numericId],
    queryFn: async () => {
      const res = await fetch(`/api/trainer-reviews/summary/${numericId}`);
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    enabled: Number.isFinite(numericId),
    staleTime: 60_000,
    initialData:
      initialAverage !== undefined && initialCount !== undefined
        ? {
            success: true,
            trainerId: numericId,
            average: initialAverage,
            count: initialCount,
          }
        : undefined,
  });

  const hasSummary = data !== undefined;
  const avg = hasSummary ? data.average : fallbackRating ?? 0;
  const count = hasSummary ? data.count : fallbackReviews ?? 0;
  const hasRating = hasSummary ? data.count > 0 : avg > 0;

  return (
    <div
      className={className ?? "flex items-center"}
      data-testid={`trainer-rating-${numericId}`}
    >
      <Star
        className={
          iconClassName ?? "h-4 w-4 text-yellow-500 fill-yellow-500 mr-2"
        }
      />
      <span
        className={
          textClassName ?? "text-sm text-gray-700 dark:text-gray-300"
        }
      >
        {hasRating ? Number(avg).toFixed(1) : "-"}
        {compact ? "" : ` (${count} 후기)`}
        {compact && (
          <span className="ml-1 text-xs text-gray-500">({count})</span>
        )}
      </span>
    </div>
  );
}

export default TrainerRatingInline;
