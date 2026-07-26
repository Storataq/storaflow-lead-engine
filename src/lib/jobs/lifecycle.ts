/**
 * Job lifecycle helpers for Phase 20B readiness.
 * Maps DB statuses to UI phases without adding a new enum value to Postgres.
 *
 * Retry flow today: failed → (user retry) → queued → active → …
 * "Retrying" is a UI phase while a previously failed job is again queued/active.
 */

import {
  normalizeJobStatus,
  type CanonicalScrapeJobStatus,
} from "@/lib/jobs/constants";
import type { ScrapeJobStatus } from "@/types/database";

export type JobLifecyclePhase =
  | "queued"
  | "running"
  | "retrying"
  | "completed"
  | "failed"
  | "cancelled"
  | "paused"
  | "draft"
  | "pending";

/**
 * Derive a UI lifecycle phase. Pass `hadFailure` when the job previously failed
 * and was re-queued (retry). Without that flag, queued/active map to normal phases.
 */
export function jobLifecyclePhase(
  status: ScrapeJobStatus,
  options?: { hadFailure?: boolean },
): JobLifecyclePhase {
  const normalized = normalizeJobStatus(status);
  if (
    options?.hadFailure &&
    (normalized === "queued" ||
      normalized === "pending" ||
      normalized === "active")
  ) {
    return "retrying";
  }

  switch (normalized) {
    case "draft":
      return "draft";
    case "pending":
      return "pending";
    case "queued":
      return "queued";
    case "active":
      return "running";
    case "paused":
      return "paused";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    default:
      return "pending";
  }
}

export function jobLifecycleLabel(phase: JobLifecyclePhase): string {
  switch (phase) {
    case "draft":
      return "Draft";
    case "pending":
      return "Pending";
    case "queued":
      return "Queued";
    case "running":
      return "Running";
    case "retrying":
      return "Retrying";
    case "paused":
      return "Paused";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
  }
}

/** Statuses that the Jobs UI must keep supporting for Phase 20B live workers. */
export const PHASE_20B_SUPPORTED_PHASES: readonly JobLifecyclePhase[] = [
  "queued",
  "running",
  "retrying",
  "completed",
  "failed",
  "cancelled",
] as const;

export function isTerminalJobStatus(status: ScrapeJobStatus): boolean {
  const normalized: CanonicalScrapeJobStatus = normalizeJobStatus(status);
  return (
    normalized === "completed" ||
    normalized === "failed" ||
    normalized === "cancelled"
  );
}
