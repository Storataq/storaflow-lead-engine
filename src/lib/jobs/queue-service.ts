/**
 * Queue Service — mock in-process implementation.
 *
 * API surface matches a future distributed queue:
 * enqueue / dequeue / pause / resume / cancel / retry / complete / fail
 *
 * Persistence: Supabase scrape_jobs (+ scrape_job_logs).
 * No external brokers yet (Redis/SQS/etc. can plug in behind this interface).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  MOCK_ENGINE_CLAIM,
  PIPELINE_PROGRESS,
  PIPELINE_STAGE_COUNT,
  computeRuntimeMs,
  normalizeJobStatus,
  priorityRank,
} from "@/lib/jobs/constants";
import { appendJobLog } from "@/lib/jobs/logging";
import type { ScrapeJobRow } from "@/lib/jobs/queries";
import type { ScrapeJobPriority } from "@/types/database";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export type QueueServiceResult = {
  success: boolean;
  message: string;
  job?: ScrapeJobRow;
};

async function loadJob(
  supabase: Client,
  organizationId: string,
  jobId: string,
): Promise<ScrapeJobRow | null> {
  const { data, error } = await supabase
    .from("scrape_jobs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", jobId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

async function updateJob(
  supabase: Client,
  organizationId: string,
  jobId: string,
  patch: Database["public"]["Tables"]["scrape_jobs"]["Update"],
): Promise<ScrapeJobRow> {
  const { data, error } = await supabase
    .from("scrape_jobs")
    .update(patch)
    .eq("organization_id", organizationId)
    .eq("id", jobId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Job update failed");
  }
  return data;
}

export type CreateQueuedJobInput = {
  organizationId: string;
  searchQueryId: string;
  sourceCode: string;
  priority?: ScrapeJobPriority;
  retryCount?: number;
};

/**
 * Creates a job in draft → pending and logs Job Created.
 * Call enqueue() to move it into the queue.
 */
export async function createDraftJob(
  supabase: Client,
  input: CreateQueuedJobInput,
): Promise<ScrapeJobRow> {
  const pagesTotal = PIPELINE_STAGE_COUNT;
  const { data, error } = await supabase
    .from("scrape_jobs")
    .insert({
      organization_id: input.organizationId,
      search_query_id: input.searchQueryId,
      job_type: "search_discovery",
      status: "draft",
      priority: input.priority ?? "NORMAL",
      retry_count: input.retryCount ?? 0,
      pages_processed: 0,
      pages_total: pagesTotal,
      target_pages: pagesTotal,
      companies_found: 0,
      contacts_found: 0,
      progress_percent: PIPELINE_PROGRESS.created,
      error_count: 0,
      current_source_code: input.sourceCode,
      error_message: null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create job");
  }

  await appendJobLog(supabase, {
    organizationId: input.organizationId,
    jobId: data.id,
    eventCode: "job_created",
    message: "Job created",
    sourceCode: input.sourceCode,
    metadata: {
      priority: data.priority,
      progress_percent: PIPELINE_PROGRESS.created,
    },
  });

  const pending = await updateJob(supabase, input.organizationId, data.id, {
    status: "pending",
    last_heartbeat_at: new Date().toISOString(),
  });

  await appendJobLog(supabase, {
    organizationId: input.organizationId,
    jobId: pending.id,
    eventCode: "pending",
    message: "Pending",
    sourceCode: input.sourceCode,
  });

  return pending;
}

/** Move pending/draft → queued */
export async function enqueue(
  supabase: Client,
  organizationId: string,
  jobId: string,
): Promise<QueueServiceResult> {
  const job = await loadJob(supabase, organizationId, jobId);
  if (!job) return { success: false, message: "Taak niet gevonden." };

  const status = normalizeJobStatus(job.status);
  if (!["draft", "pending", "paused"].includes(status)) {
    return {
      success: false,
      message: "Alleen Draft/Pending/Paused jobs kunnen in de queue.",
    };
  }

  const updated = await updateJob(supabase, organizationId, jobId, {
    status: "queued",
    progress_percent: Math.max(
      job.progress_percent,
      PIPELINE_PROGRESS.queued,
    ),
    last_heartbeat_at: new Date().toISOString(),
    completed_at: null,
    error_message: null,
  });

  await appendJobLog(supabase, {
    organizationId,
    jobId,
    eventCode: "job_queued",
    message: "Job queued",
    sourceCode: job.current_source_code,
    metadata: { progress_percent: PIPELINE_PROGRESS.queued },
  });

  return { success: true, message: "Queued", job: updated };
}

/**
 * Claim the next queued job for an organization (priority DESC, created_at ASC).
 * Mock dequeue — future workers call this across fleets.
 */
export async function dequeue(
  supabase: Client,
  organizationId: string,
): Promise<QueueServiceResult> {
  const { data: candidates, error } = await supabase
    .from("scrape_jobs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) return { success: false, message: error.message };

  const sorted = [...(candidates ?? [])].sort((a, b) => {
    const rank = priorityRank(b.priority) - priorityRank(a.priority);
    if (rank !== 0) return rank;
    return a.created_at.localeCompare(b.created_at);
  });

  const next = sorted[0];
  if (!next) {
    return { success: false, message: "Geen queued jobs." };
  }

  const now = new Date().toISOString();
  const updated = await updateJob(supabase, organizationId, next.id, {
    status: "active",
    started_at: next.started_at ?? now,
    claimed_at: now,
    claimed_by: MOCK_ENGINE_CLAIM,
    last_heartbeat_at: now,
    progress_percent: Math.max(next.progress_percent, 0),
  });

  await appendJobLog(supabase, {
    organizationId,
    jobId: next.id,
    eventCode: "worker_assigned",
    message: `Worker Assigned (${MOCK_ENGINE_CLAIM})`,
    sourceCode: next.current_source_code,
  });
  await appendJobLog(supabase, {
    organizationId,
    jobId: next.id,
    eventCode: "started",
    message: "Started",
    sourceCode: next.current_source_code,
  });

  return { success: true, message: "Active", job: updated };
}

export async function pause(
  supabase: Client,
  organizationId: string,
  jobId: string,
): Promise<QueueServiceResult> {
  const job = await loadJob(supabase, organizationId, jobId);
  if (!job) return { success: false, message: "Taak niet gevonden." };

  const status = normalizeJobStatus(job.status);
  if (!["pending", "queued", "active"].includes(status)) {
    return { success: false, message: "Job kan niet worden gepauzeerd." };
  }

  const updated = await updateJob(supabase, organizationId, jobId, {
    status: "paused",
    runtime_ms: computeRuntimeMs(job.started_at),
    last_heartbeat_at: new Date().toISOString(),
  });

  await appendJobLog(supabase, {
    organizationId,
    jobId,
    eventCode: "paused",
    message: "Paused",
    sourceCode: job.current_source_code,
  });

  return { success: true, message: "Paused", job: updated };
}

export async function resume(
  supabase: Client,
  organizationId: string,
  jobId: string,
): Promise<QueueServiceResult> {
  const job = await loadJob(supabase, organizationId, jobId);
  if (!job) return { success: false, message: "Taak niet gevonden." };

  if (normalizeJobStatus(job.status) !== "paused") {
    return { success: false, message: "Alleen Paused jobs kunnen hervatten." };
  }

  const updated = await updateJob(supabase, organizationId, jobId, {
    status: "queued",
    completed_at: null,
    last_heartbeat_at: new Date().toISOString(),
  });

  await appendJobLog(supabase, {
    organizationId,
    jobId,
    eventCode: "resumed",
    message: "Resumed",
    sourceCode: job.current_source_code,
  });

  return { success: true, message: "Resumed → Queued", job: updated };
}

export async function cancel(
  supabase: Client,
  organizationId: string,
  jobId: string,
): Promise<QueueServiceResult> {
  const job = await loadJob(supabase, organizationId, jobId);
  if (!job) return { success: false, message: "Taak niet gevonden." };

  const status = normalizeJobStatus(job.status);
  if (["completed", "cancelled", "failed"].includes(status)) {
    return { success: false, message: "Job is al afgerond." };
  }

  const now = new Date().toISOString();
  const updated = await updateJob(supabase, organizationId, jobId, {
    status: "cancelled",
    completed_at: now,
    runtime_ms: computeRuntimeMs(job.started_at, now),
    last_heartbeat_at: now,
    error_message: "Cancelled by user",
  });

  await appendJobLog(supabase, {
    organizationId,
    jobId,
    eventCode: "cancelled",
    message: "Cancelled",
    level: "warn",
    sourceCode: job.current_source_code,
  });

  return { success: true, message: "Cancelled", job: updated };
}

export async function complete(
  supabase: Client,
  organizationId: string,
  jobId: string,
  extras?: { companiesFound?: number; contactsFound?: number },
): Promise<QueueServiceResult> {
  const job = await loadJob(supabase, organizationId, jobId);
  if (!job) return { success: false, message: "Taak niet gevonden." };

  const now = new Date().toISOString();
  const updated = await updateJob(supabase, organizationId, jobId, {
    status: "completed",
    progress_percent: 100,
    completed_at: now,
    runtime_ms: computeRuntimeMs(job.started_at, now),
    last_heartbeat_at: now,
    companies_found: extras?.companiesFound ?? job.companies_found,
    contacts_found: extras?.contactsFound ?? job.contacts_found,
    error_message: null,
  });

  await appendJobLog(supabase, {
    organizationId,
    jobId,
    eventCode: "completed",
    message: "Completed",
    sourceCode: job.current_source_code,
  });

  return { success: true, message: "Completed", job: updated };
}

export async function fail(
  supabase: Client,
  organizationId: string,
  jobId: string,
  errorMessage: string,
): Promise<QueueServiceResult> {
  const job = await loadJob(supabase, organizationId, jobId);
  if (!job) return { success: false, message: "Taak niet gevonden." };

  const now = new Date().toISOString();
  const updated = await updateJob(supabase, organizationId, jobId, {
    status: "failed",
    completed_at: now,
    runtime_ms: computeRuntimeMs(job.started_at, now),
    last_heartbeat_at: now,
    error_message: errorMessage,
    error_count: (job.error_count ?? 0) + 1,
  });

  await appendJobLog(supabase, {
    organizationId,
    jobId,
    eventCode: "failed",
    message: `Failed — ${errorMessage}`,
    level: "error",
    sourceCode: job.current_source_code,
  });

  return { success: true, message: "Failed", job: updated };
}

/**
 * Retry creates a NEW job for the same search query (history preserved).
 * Increments retry_count on the new job.
 */
export async function retry(
  supabase: Client,
  organizationId: string,
  jobId: string,
): Promise<QueueServiceResult> {
  const job = await loadJob(supabase, organizationId, jobId);
  if (!job) return { success: false, message: "Taak niet gevonden." };

  const status = normalizeJobStatus(job.status);
  if (!["failed", "cancelled", "paused", "completed"].includes(status)) {
    return {
      success: false,
      message: "Retry alleen voor Failed/Cancelled/Paused/Completed.",
    };
  }
  if (!job.search_query_id) {
    return { success: false, message: "Geen gekoppelde zoekopdracht." };
  }

  await appendJobLog(supabase, {
    organizationId,
    jobId,
    eventCode: "retry",
    message: "Retry requested",
    sourceCode: job.current_source_code,
  });

  const created = await createDraftJob(supabase, {
    organizationId,
    searchQueryId: job.search_query_id,
    sourceCode: job.current_source_code ?? "mock",
    priority: job.priority,
    retryCount: (job.retry_count ?? 0) + 1,
  });

  const queued = await enqueue(supabase, organizationId, created.id);
  return {
    success: queued.success,
    message: queued.success ? "Retry — nieuwe job in queue" : queued.message,
    job: queued.job ?? created,
  };
}

export type QueueService = {
  createDraftJob: typeof createDraftJob;
  enqueue: typeof enqueue;
  dequeue: typeof dequeue;
  pause: typeof pause;
  resume: typeof resume;
  cancel: typeof cancel;
  retry: typeof retry;
  complete: typeof complete;
  fail: typeof fail;
};

export const queueService: QueueService = {
  createDraftJob,
  enqueue,
  dequeue,
  pause,
  resume,
  cancel,
  retry,
  complete,
  fail,
};
