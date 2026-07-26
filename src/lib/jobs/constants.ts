import type { ScrapeJobStatus } from "@/types/database";

/**
 * UI labels for scrape jobs (fase 4).
 * Mapped onto existing DB enum values — no schema changes.
 *
 * Pending  → queued
 * Active   → running
 * Completed → completed | partially_completed
 * Failed   → failed
 * Paused   → cancelled (pause action uses cancelled)
 */
export const SCRAPE_JOB_UI_STATUSES = [
  "pending",
  "active",
  "completed",
  "failed",
  "paused",
] as const;

export type ScrapeJobUiStatus = (typeof SCRAPE_JOB_UI_STATUSES)[number];

export const MOCK_SCRAPE_TARGET_PAGES = 5;
export const MOCK_COMPANIES_PER_PAGE = 2;
export const MOCK_ENGINE_CLAIM = "mock-engine-v1";

export function toUiJobStatus(status: ScrapeJobStatus): ScrapeJobUiStatus {
  switch (status) {
    case "queued":
      return "pending";
    case "running":
      return "active";
    case "completed":
    case "partially_completed":
      return "completed";
    case "failed":
      return "failed";
    case "cancelled":
      return "paused";
    default:
      return "pending";
  }
}

export function jobStatusLabel(status: ScrapeJobStatus | ScrapeJobUiStatus): string {
  const ui =
    status === "pending" ||
    status === "active" ||
    status === "completed" ||
    status === "failed" ||
    status === "paused"
      ? status
      : toUiJobStatus(status);

  switch (ui) {
    case "pending":
      return "Pending";
    case "active":
      return "Active";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "paused":
      return "Paused";
  }
}

export function jobProgressPercent(
  pagesProcessed: number,
  targetPages = MOCK_SCRAPE_TARGET_PAGES,
): number {
  if (targetPages <= 0) return 0;
  return Math.min(100, Math.round((pagesProcessed / targetPages) * 100));
}

export const JOB_SORT_OPTIONS = [
  { value: "newest", label: "Nieuwste" },
  { value: "oldest", label: "Oudste" },
] as const;

export type JobSortOption = (typeof JOB_SORT_OPTIONS)[number]["value"];
