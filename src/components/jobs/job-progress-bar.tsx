import { jobProgressPercent } from "@/lib/jobs/constants";
import { cn } from "@/lib/utils";

type JobProgressBarProps = {
  pagesProcessed: number;
  targetPages?: number;
  status?: string;
  className?: string;
};

export function JobProgressBar({
  pagesProcessed,
  targetPages,
  status,
  className,
}: JobProgressBarProps) {
  const percent =
    status === "completed" || status === "partially_completed"
      ? 100
      : jobProgressPercent(pagesProcessed, targetPages);

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Voortgang</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            status === "failed"
              ? "bg-destructive"
              : status === "cancelled"
                ? "bg-zinc-400"
                : "bg-primary",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
