import { scoreToColor } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface AcScoreBadgeProps {
  score: number | null | undefined;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AcScoreBadge({
  score,
  label,
  size = "md",
  className,
}: AcScoreBadgeProps) {
  const color = scoreToColor(score);
  const display = score != null ? Math.round(score) : "—";

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5 font-bold",
  };

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full font-semibold text-white",
          sizeClasses[size]
        )}
        style={{ backgroundColor: color }}
      >
        {display}
      </span>
      {label && (
        <Badge variant="outline" className="text-xs">
          {label}
        </Badge>
      )}
    </div>
  );
}
