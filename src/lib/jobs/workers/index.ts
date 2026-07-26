/**
 * Worker entry documentation + re-exports.
 * Production claim loop can call `processNextQueuedJob` with a service-role client.
 * In development, JobRunnerControls continues to poll `advanceMockScrapeAction`.
 */

export { processNextQueuedJob } from "@/lib/jobs/workers/live-worker";
export type { WorkerTickResult } from "@/lib/jobs/workers/live-worker";
