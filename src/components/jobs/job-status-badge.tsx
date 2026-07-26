import { Badge } from "@/components/ui/badge";
import { jobStatusLabel, normalizeJobStatus } from "@/lib/jobs/constants";
import type { ScrapeJobStatus } from "@/types/database";
import { cn } from "@/lib/utils";

const statusClassName: Record<string, string> = {
  pending: "border-transparent bg-amber-50 text-amber-900",
  queued: "border-transparent bg-amber-100 text-amber-900",
  active: "border-transparent bg-sky-100 text-sky-900",
  paused: "border-transparent bg-zinc-200 text-zinc-700",
  completed: "border-transparent bg-emerald-100 text-emerald-800",
  cancelled: "border-transparent bg-orange-100 text-orange-900",
  failed: "border-transparent bg-red-100 text-red-800",
};

type JobStatusBadgeProps = {
  status: ScrapeJobStatus;
  className?: string;
};

export function JobStatusBadge({ status, className }: JobStatusBadgeProps) {
  const ui = normalizeJobStatus(status);
  return (
    <Badge
      variant="outline"
      className={cn(statusClassName[ui] ?? "", className)}
    >
      {jobStatusLabel(ui)}
    </Badge>
  );
}
