/**
 * Worker Engine contracts.
 *
 * Every future connector becomes a worker (GoogleMapsWorker, LinkedInWorker, …).
 * This phase ships the interface + MockWorker only — no network I/O.
 */

import type { Database } from "@/types/supabase";
import type { SearchQueryRow } from "@/lib/searches/queries";
import type { DiscoveredCompany } from "@/lib/scraping/types";

export type ScrapeJobRow = Database["public"]["Tables"]["scrape_jobs"]["Row"];

export type WorkerCode = string;

export type WorkerTickContext = {
  organizationId: string;
  job: ScrapeJobRow;
  searchQuery: SearchQueryRow;
  /** 0-based step index into MOCK_PROGRESS_STEPS */
  stepIndex: number;
};

export type WorkerTickResult = {
  workerCode: WorkerCode;
  progressPercent: number;
  companies: DiscoveredCompany[];
  contactsFound: number;
  done: boolean;
  message: string;
  meta?: Record<string, unknown>;
};

/**
 * Shared worker interface — real adapters implement this later.
 */
export interface JobWorker {
  readonly code: WorkerCode;
  readonly displayName: string;
  canHandle(job: ScrapeJobRow): boolean;
  processTick(context: WorkerTickContext): Promise<WorkerTickResult>;
}

export type WorkerRegistry = {
  list(): JobWorker[];
  get(code: WorkerCode): JobWorker | null;
  resolveForJob(job: ScrapeJobRow): JobWorker;
};
