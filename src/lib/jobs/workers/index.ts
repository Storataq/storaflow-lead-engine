/**
 * Worker registry — MockWorker is executable; others are reserved codes.
 */

import { DEFAULT_WORKER_CODE } from "@/lib/jobs/constants";
import { mockWorker } from "@/lib/jobs/workers/mock-worker";
import type {
  JobWorker,
  ScrapeJobRow,
  WorkerCode,
  WorkerRegistry,
} from "@/lib/jobs/workers/types";

/** Planned workers (not implemented — registry placeholders for UI/docs). */
export const PLANNED_WORKER_CODES = [
  "google_maps",
  "bing",
  "linkedin",
  "facebook",
  "instagram",
  "yelp",
  "yellow_pages",
  "openstreetmap",
] as const;

const executable = new Map<WorkerCode, JobWorker>([
  [mockWorker.code, mockWorker],
]);

export function listWorkers(): JobWorker[] {
  return [...executable.values()];
}

export function getWorker(code: WorkerCode): JobWorker | null {
  return executable.get(code) ?? null;
}

export function resolveWorkerForJob(job: ScrapeJobRow): JobWorker {
  const preferred = job.current_source_code;
  if (preferred) {
    const worker = getWorker(preferred);
    if (worker) return worker;
  }
  return getWorker(DEFAULT_WORKER_CODE) ?? mockWorker;
}

export const workerRegistry: WorkerRegistry = {
  list: listWorkers,
  get: getWorker,
  resolveForJob: resolveWorkerForJob,
};
