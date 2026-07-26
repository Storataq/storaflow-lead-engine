import { Skeleton } from "@/components/ui/skeleton";

type PageSkeletonProps = {
  /** Number of filter/control placeholders above the main block */
  filters?: number;
  /** Show a table-like block instead of a single card */
  variant?: "table" | "cards" | "detail" | "dashboard";
};

export function PageSkeleton({
  filters = 3,
  variant = "table",
}: PageSkeletonProps) {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Laden…</span>
      {filters > 0 ? (
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: filters }).map((_, index) => (
            <Skeleton
              key={index}
              className={index === 0 ? "h-8 w-64" : "h-8 w-36"}
            />
          ))}
        </div>
      ) : null}

      {variant === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {variant === "table" ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : null}

      {variant === "detail" ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      ) : null}

      {variant === "dashboard" ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-xl" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-56 w-full rounded-xl" />
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : null}
    </div>
  );
}
