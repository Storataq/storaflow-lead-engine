import { PageSkeleton } from "@/components/layout/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div>
      <div className="mb-6 space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <PageSkeleton filters={3} variant="table" />
    </div>
  );
}
