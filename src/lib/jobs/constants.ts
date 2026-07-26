import type { ScrapeJobStatus } from "@/types/database";

/**
 * Canonical UI + DB statuses for the modular scrape engine.
 *
 * Legacy aliases still accepted for backward compatibility:
 * - running → active
 * - partially_completed → completed
 * - cancelled stays cancelled (distinct from paused)
 */
export const SCRAPE_JOB_STATUSES = [
  "pending",
  "queued",
  "active",
  "paused",
  "completed",
  "cancelled",
  "failed",
] as const;

export type CanonicalScrapeJobStatus = (typeof SCRAPE_JOB_STATUSES)[number];

export const MOCK_SCRAPE_TARGET_PAGES = 5;
export const MOCK_COMPANIES_PER_PAGE = 2;
export const MOCK_ENGINE_CLAIM = "mock-engine-v1";
export const DEFAULT_CONNECTOR_CODE = "mock";

export function normalizeJobStatus(
  status: ScrapeJobStatus,
): CanonicalScrapeJobStatus {
  switch (status) {
    case "pending":
      return "pending";
    case "queued":
      return "queued";
    case "active":
    case "running":
      return "active";
    case "paused":
      return "paused";
    case "completed":
    case "partially_completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    case "failed":
      return "failed";
    default:
      return "pending";
  }
}

export function jobStatusLabel(status: ScrapeJobStatus | string): string {
  const normalized = normalizeJobStatus(status as ScrapeJobStatus);
  switch (normalized) {
    case "pending":
      return "Pending";
    case "queued":
      return "Queued";
    case "active":
      return "Active";
    case "paused":
      return "Paused";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "failed":
      return "Failed";
  }
}

export function jobProgressPercent(
  pagesProcessed: number,
  targetPages = MOCK_SCRAPE_TARGET_PAGES,
  storedPercent?: number | null,
): number {
  if (typeof storedPercent === "number" && storedPercent >= 0) {
    return Math.min(100, storedPercent);
  }
  if (targetPages <= 0) return 0;
  return Math.min(100, Math.round((pagesProcessed / targetPages) * 100));
}

export function formatRuntimeMs(runtimeMs: number | null | undefined): string {
  if (runtimeMs == null || runtimeMs < 0) return "—";
  if (runtimeMs < 1000) return `${runtimeMs} ms`;
  const seconds = Math.round(runtimeMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest}s`;
}

export function computeRuntimeMs(
  startedAt: string | null,
  endedAt?: string | null,
): number | null {
  if (!startedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return end - start;
}

/** Queue buckets for the overview */
export const QUEUE_BUCKETS = [
  { key: "waiting", label: "Waiting", statuses: ["pending", "queued"] },
  { key: "running", label: "Running", statuses: ["active", "running"] },
  { key: "paused", label: "Paused", statuses: ["paused"] },
  {
    key: "completed",
    label: "Completed",
    statuses: ["completed", "partially_completed"],
  },
  { key: "failed", label: "Failed", statuses: ["failed"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
] as const;

export const JOB_SORT_OPTIONS = [
  { value: "newest", label: "Nieuwste" },
  { value: "oldest", label: "Oudste" },
] as const;

export type JobSortOption = (typeof JOB_SORT_OPTIONS)[number]["value"];

/** @deprecated use normalizeJobStatus */
export function toUiJobStatus(status: ScrapeJobStatus) {
  return normalizeJobStatus(status);
}

/** @deprecated */
export type ScrapeJobUiStatus = CanonicalScrapeJobStatus;
