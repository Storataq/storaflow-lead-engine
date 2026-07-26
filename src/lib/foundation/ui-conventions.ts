/**
 * Foundation UI conventions — reference for future feature work.
 * Prefer these shared primitives over one-off empty/loading/error markup.
 */

export const FOUNDATION_VERSION = "0.1" as const;

export const UI_CONVENTIONS = {
  pageHeader: "PageHeader",
  loading: "RouteLoading / PageSkeleton via loading.tsx",
  empty: "EmptyState",
  error: "toUserFacingError + ReloadErrorAlert / PageErrorState",
  crmNav: "CrmSubnav + NAV_ITEMS children",
  display: "lib/ui/format.ts",
} as const;
