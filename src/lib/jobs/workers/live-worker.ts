/**
 * In-process worker — claims one queued job and advances it via JobExecutor.
 * Can be called from the client poll path or a future background process.
 */

import "@/lib/scraping/connectors/bootstrap";

import type { SupabaseClient } from "@supabase/supabase-js";

import { defaultJobExecutor } from "@/lib/jobs/execution/mock-job-executor";
import { dequeue } from "@/lib/jobs/queue-service";
import type { ScrapeJobRow } from "@/lib/jobs/queries";
import type { SearchQueryRow } from "@/lib/searches/queries";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export type WorkerTickResult = {
  success: boolean;
  message: string;
  jobId?: string;
  status?: string;
  done?: boolean;
  idle?: boolean;
};

async function loadSearchQuery(
  supabase: Client,
  organizationId: string,
  searchQueryId: string,
): Promise<SearchQueryRow | null> {
  const { data, error } = await supabase
    .from("search_queries")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", searchQueryId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Dequeue one job for the organization and run a single executor advance.
 * Repeat until done for a full process-one-job cycle.
 */
export async function processNextQueuedJob(
  supabase: Client,
  organizationId: string,
): Promise<WorkerTickResult> {
  const claimed = await dequeue(supabase, organizationId);
  if (!claimed.success || !claimed.job) {
    return {
      success: true,
      message: claimed.message || "Geen queued jobs.",
      idle: true,
    };
  }

  const job = claimed.job;
  const searchQuery = job.search_query_id
    ? await loadSearchQuery(supabase, organizationId, job.search_query_id)
    : null;

  // dequeue already moved job to active — run pipeline via advance
  let current: ScrapeJobRow = job;
  let result = await defaultJobExecutor.advance(
    supabase,
    organizationId,
    current,
    searchQuery,
  );

  // If activate left it active with pages_processed 0, advance again to run pipeline
  while (result.success && !result.done) {
    const { data: latest } = await supabase
      .from("scrape_jobs")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", job.id)
      .maybeSingle();
    if (!latest) break;
    current = latest;
    result = await defaultJobExecutor.advance(
      supabase,
      organizationId,
      current,
      searchQuery,
    );
    if (result.status === "active" && !result.done && current.pages_processed === 0) {
      // prevent tight loop if claim failed
      break;
    }
  }

  return {
    success: result.success,
    message: result.message,
    jobId: job.id,
    status: result.status,
    done: result.done,
    idle: false,
  };
}
