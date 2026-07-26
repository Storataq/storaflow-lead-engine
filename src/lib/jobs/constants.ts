/**
 * Job Queue & Worker Engine — shared constants (fase 5).
 */

import type { ScrapeJobPriority, ScrapeJobStatus } from "@/types/database";

/**
 * Lifecycle (canonical):
 * Draft → Pending → Queued → Active → (Paused) → Completed | Failed | Cancelled → Retry
 */
export const SCRAPE_JOB_STATUSES = [
  "draft",
  "pending",
  "queued",
  "active",
  "paused",
  "completed",
  "cancelled",
  "failed",
] as const;

export type CanonicalScrapeJobStatus = (typeof SCRAPE_JOB_STATUSES)[number];

export const JOB_PRIORITIES: {
  value: ScrapeJobPriority;
  label: string;
  rank: number;
}[] = [
  { value: "LOW", label: "Low", rank: 1 },
  { value: "NORMAL", label: "Normal", rank: 2 },
  { value: "HIGH", label: "High", rank: 3 },
  { value: "CRITICAL", label: "Critical", rank: 4 },
];

/** Higher number = claimed first by dequeue(). */
export function priorityRank(priority: ScrapeJobPriority | string): number {
  return JOB_PRIORITIES.find((item) => item.value === priority)?.rank ?? 2;
}

/**
 * Mock progress milestones (local simulation only).
 * Active → 10% → 35% → 60% → 85% → 100% → Completed
 */
export const MOCK_PROGRESS_STEPS = [10, 35, 60, 85, 100] as const;

export const MOCK_COMPANIES_PER_STEP = 2;
export const MOCK_ENGINE_CLAIM = "mock-worker-v1";
export const DEFAULT_CONNECTOR_CODE = "mock";
export const DEFAULT_WORKER_CODE = "mock";

/** @deprecated use MOCK_PROGRESS_STEPS.length */
export const MOCK_SCRAPE_TARGET_PAGES = MOCK_PROGRESS_STEPS.length;

export function normalizeJobStatus(
  status: ScrapeJobStatus,
): CanonicalScrapeJobStatus {
  switch (status) {
    case "draft":
      return "draft";
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
    case "draft":
      return "Draft";
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

export function jobPriorityLabel(priority: string | null | undefined): string {
  return JOB_PRIORITIES.find((item) => item.value === priority)?.label ?? priority ?? "—";
}

export function jobProgressPercent(
  pagesProcessed: number,
  targetPages: number = MOCK_PROGRESS_STEPS.length,
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

/** Clickable queue overview cards */
export const QUEUE_BUCKETS = [
  { key: "pending", label: "Pending", statuses: ["pending", "draft"] as const },
  { key: "queued", label: "Queued", statuses: ["queued"] as const },
  { key: "running", label: "Running", statuses: ["active", "running"] as const },
  { key: "paused", label: "Paused", statuses: ["paused"] as const },
  {
    key: "completed",
    label: "Completed",
    statuses: ["completed", "partially_completed"] as const,
  },
  { key: "failed", label: "Failed", statuses: ["failed"] as const },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled"] as const },
] as const;

export type QueueBucketKey = (typeof QUEUE_BUCKETS)[number]["key"];

export const JOB_SORT_OPTIONS = [
  { value: "newest", label: "Nieuwste" },
  { value: "oldest", label: "Oudste" },
  { value: "priority", label: "Prioriteit" },
] as const;

export type JobSortOption = (typeof JOB_SORT_OPTIONS)[number]["value"];

/** @deprecated */
export function toUiJobStatus(status: ScrapeJobStatus) {
  return normalizeJobStatus(status);
}

/** @deprecated */
export type ScrapeJobUiStatus = CanonicalScrapeJobStatus;
