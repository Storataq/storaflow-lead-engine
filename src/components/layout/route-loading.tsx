import { PageSkeleton } from "@/components/layout/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

type RouteLoadingProps = {
  variant?: "table" | "cards" | "detail" | "dashboard";
  filters?: number;
};

/**
 * Shared route-level loading chrome (header skeleton + PageSkeleton).
 * Use from `loading.tsx` files to keep CRM/search/detail pages consistent.
 */
export function RouteLoading({
  variant = "table",
  filters,
}: RouteLoadingProps) {
  const filterCount =
    filters ??
    (variant === "detail" ? 0 : variant === "dashboard" ? 4 : 3);

  return (
    <div>
      <div className="mb-6 space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <PageSkeleton filters={filterCount} variant={variant} />
    </div>
  );
}
