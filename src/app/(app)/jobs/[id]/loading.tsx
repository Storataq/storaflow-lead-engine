import { PageSkeleton } from "@/components/layout/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function JobDetailLoading() {
  return (
    <div>
      <div className="mb-6 space-y-3">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <PageSkeleton filters={0} variant="detail" />
    </div>
  );
}
