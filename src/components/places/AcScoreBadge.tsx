import { scoreToColor, formatFrostScore } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface AcScoreBadgeProps {
  score?: number | null;
  frostScore?: number | null;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AcScoreBadge({
  score,
  frostScore,
  label,
  size = "md",
  className,
}: AcScoreBadgeProps) {
  const color = scoreToColor(score);
  const display =
    frostScore != null
      ? formatFrostScore(frostScore)
      : score != null
        ? formatFrostScore(1 + (score / 100) * 4)
        : "—";

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5 font-bold",
  };

  return (
    <div className={cn("inline-flex flex-col items-end gap-1", className)}>
      <div className="inline-flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full font-semibold text-white",
            sizeClasses[size]
          )}
          style={{ backgroundColor: color }}
          title="Frost Score (1–5)"
        >
          {display}
        </span>
        {label && (
          <Badge variant="outline" className="text-xs">
            {label}
          </Badge>
        )}
      </div>
      <span className="text-[10px] uppercase tracking-wide text-frost-500">
        Frost Score
      </span>
    </div>
  );
}
