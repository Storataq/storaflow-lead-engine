import { Badge } from "@/components/ui/badge";
import { searchStatusLabel } from "@/lib/searches/constants";
import { cn } from "@/lib/utils";

const statusClassName: Record<string, string> = {
  active: "border-transparent bg-emerald-100 text-emerald-800",
  draft: "border-transparent bg-amber-100 text-amber-900",
  paused: "border-transparent bg-zinc-200 text-zinc-700",
};

type SearchStatusBadgeProps = {
  status: string;
  className?: string;
};

export function SearchStatusBadge({
  status,
  className,
}: SearchStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(statusClassName[status] ?? "", className)}
    >
      {searchStatusLabel(status)}
    </Badge>
  );
}
