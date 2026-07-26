"use server";

import { revalidatePath } from "next/cache";

import { normalizeJobStatus } from "@/lib/jobs/constants";
import { mockJobExecutor } from "@/lib/jobs/execution/mock-job-executor";
import { resolveJobConnectorCode } from "@/lib/jobs/resolve-connector-code";
import {
  cancel as queueCancel,
  createDraftJob,
  enqueue,
  pause as queuePause,
  resume as queueResume,
  retry as queueRetry,
} from "@/lib/jobs/queue-service";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import type { ScrapeJobPriority } from "@/types/database";

export type JobActionResult = {
  success: boolean;
  message: string;
  jobId?: string;
  status?: string;
  done?: boolean;
};

const IN_FLIGHT_STATUSES = [
  "draft",
  "pending",
  "queued",
  "active",
  "running",
  "paused",
] as const;

function revalidateJobPaths(jobId: string, searchQueryId?: string | null) {
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/companies");
  revalidatePath("/dashboard");
  if (searchQueryId) {
    revalidatePath(`/zoekopdrachten/${searchQueryId}`);
  }
}

/**
 * Starts exactly one scrape job for a search query (Google Maps MVP by default).
 * Blocks duplicate in-flight jobs for the same search query.
 * organization_id always comes from the server-side org context.
 */
export async function startScrapeAction(
  searchQueryId: string,
  priority: ScrapeJobPriority = "NORMAL",
): Promise<JobActionResult> {
  const context = await getActiveOrganization();
  if (!context) {
    return { success: false, message: "Geen actieve organisatie." };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  const { data: searchQuery, error: searchError } = await supabase
    .from("search_queries")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", searchQueryId)
    .maybeSingle();

  if (searchError) {
    return { success: false, message: searchError.message };
  }
  if (!searchQuery) {
    return { success: false, message: "Zoekopdracht niet gevonden." };
  }

  const { data: existingJobs, error: existingError } = await supabase
    .from("scrape_jobs")
    .select("id, status")
    .eq("organization_id", orgId)
    .eq("search_query_id", searchQueryId)
    .in("status", [...IN_FLIGHT_STATUSES])
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingError) {
    return { success: false, message: existingError.message };
  }

  const existing = existingJobs?.[0];
  if (existing) {
    revalidateJobPaths(existing.id, searchQueryId);
    return {
      success: true,
      message: "Er loopt al een scrape voor deze zoekopdracht.",
      jobId: existing.id,
      status: existing.status,
    };
  }

  const sourceCode = resolveJobConnectorCode(searchQuery.sources ?? []);

  try {
    const draft = await createDraftJob(supabase, {
      organizationId: orgId,
      searchQueryId: searchQuery.id,
      sourceCode,
      priority,
    });

    const queued = await enqueue(supabase, orgId, draft.id);
    if (!queued.success || !queued.job) {
      return {
        success: false,
        message: queued.message,
        jobId: draft.id,
      };
    }

    revalidateJobPaths(queued.job.id, searchQueryId);
    return {
      success: true,
      message: `Scrape job queued (${sourceCode}).`,
      jobId: queued.job.id,
      status: "queued",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Kon job niet starten.",
    };
  }
}

/** Start / enqueue an existing draft or pending job. */
export async function startExistingJobAction(
  jobId: string,
): Promise<JobActionResult> {
  const context = await getActiveOrganization();
  if (!context) {
    return { success: false, message: "Geen actieve organisatie." };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  const { data: job, error } = await supabase
    .from("scrape_jobs")
    .select("id, status, search_query_id")
    .eq("organization_id", orgId)
    .eq("id", jobId)
    .maybeSingle();

  if (error) return { success: false, message: error.message, jobId };
  if (!job) return { success: false, message: "Taak niet gevonden.", jobId };

  const status = normalizeJobStatus(job.status);
  if (status === "completed") {
    return {
      success: false,
      message: "Completed jobs kunnen niet opnieuw gestart worden. Gebruik Retry.",
      jobId,
      status,
      done: true,
    };
  }
  if (status === "active" || status === "queued") {
    return {
      success: false,
      message: "Job is al gestart.",
      jobId,
      status,
      done: false,
    };
  }

  const result = await enqueue(supabase, orgId, jobId);
  if (!result.success || !result.job) {
    return { success: false, message: result.message, jobId };
  }

  revalidateJobPaths(jobId, result.job.search_query_id);
  return {
    success: true,
    message: result.message,
    jobId,
    status: result.job.status,
  };
}

export async function pauseScrapeAction(jobId: string): Promise<JobActionResult> {
  const context = await getActiveOrganization();
  if (!context) {
    return { success: false, message: "Geen actieve organisatie." };
  }

  const supabase = await createClient();
  const result = await queuePause(supabase, context.organization.id, jobId);
  if (!result.success || !result.job) {
    return { success: false, message: result.message, jobId };
  }

  revalidateJobPaths(jobId, result.job.search_query_id);
  return {
    success: true,
    message: result.message,
    jobId,
    status: "paused",
    done: true,
  };
}

export async function resumeScrapeAction(jobId: string): Promise<JobActionResult> {
  const context = await getActiveOrganization();
  if (!context) {
    return { success: false, message: "Geen actieve organisatie." };
  }

  const supabase = await createClient();
  const result = await queueResume(supabase, context.organization.id, jobId);
  if (!result.success || !result.job) {
    return { success: false, message: result.message, jobId };
  }

  revalidateJobPaths(jobId, result.job.search_query_id);
  return {
    success: true,
    message: result.message,
    jobId,
    status: "queued",
    done: false,
  };
}

export async function cancelScrapeAction(jobId: string): Promise<JobActionResult> {
  const context = await getActiveOrganization();
  if (!context) {
    return { success: false, message: "Geen actieve organisatie." };
  }

  const supabase = await createClient();
  const result = await queueCancel(supabase, context.organization.id, jobId);
  if (!result.success || !result.job) {
    return { success: false, message: result.message, jobId };
  }

  revalidateJobPaths(jobId, result.job.search_query_id);
  return {
    success: true,
    message: result.message,
    jobId,
    status: "cancelled",
    done: true,
  };
}

export async function retryScrapeAction(jobId: string): Promise<JobActionResult> {
  const context = await getActiveOrganization();
  if (!context) {
    return { success: false, message: "Geen actieve organisatie." };
  }

  const supabase = await createClient();
  const result = await queueRetry(supabase, context.organization.id, jobId);
  if (!result.success || !result.job) {
    return { success: false, message: result.message, jobId };
  }

  revalidateJobPaths(result.job.id, result.job.search_query_id);
  return {
    success: true,
    message: result.message,
    jobId: result.job.id,
    status: result.job.status,
    done: false,
  };
}

export async function deleteScrapeAction(jobId: string): Promise<JobActionResult> {
  const context = await getActiveOrganization();
  if (!context) {
    return { success: false, message: "Geen actieve organisatie." };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  const { data: job, error: loadError } = await supabase
    .from("scrape_jobs")
    .select("id, search_query_id, status")
    .eq("organization_id", orgId)
    .eq("id", jobId)
    .maybeSingle();

  if (loadError) return { success: false, message: loadError.message };
  if (!job) return { success: false, message: "Taak niet gevonden." };

  const { error } = await supabase
    .from("scrape_jobs")
    .delete()
    .eq("organization_id", orgId)
    .eq("id", jobId);

  if (error) {
    return {
      success: false,
      message:
        error.message.includes("policy") || error.code === "42501"
          ? "Verwijderen vereist owner/admin (en migratie 000007)."
          : error.message,
    };
  }

  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  if (job.search_query_id) {
    revalidatePath(`/zoekopdrachten/${job.search_query_id}`);
  }

  return { success: true, message: "Job verwijderd.", jobId, done: true };
}

/**
 * Advances the mock job lifecycle / pipeline by one step.
 * Client polls while job is pending/queued/active.
 */
export async function advanceMockScrapeAction(
  jobId: string,
): Promise<JobActionResult> {
  const context = await getActiveOrganization();
  if (!context) {
    return { success: false, message: "Geen actieve organisatie." };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  const { data: job, error: jobError } = await supabase
    .from("scrape_jobs")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", jobId)
    .maybeSingle();

  if (jobError) return { success: false, message: jobError.message };
  if (!job) return { success: false, message: "Taak niet gevonden." };

  let searchQuery = null;
  if (job.search_query_id) {
    const { data } = await supabase
      .from("search_queries")
      .select("*")
      .eq("id", job.search_query_id)
      .eq("organization_id", orgId)
      .maybeSingle();
    searchQuery = data;
  }

  const result = await mockJobExecutor.advance(
    supabase,
    orgId,
    job,
    searchQuery,
  );

  revalidateJobPaths(jobId, job.search_query_id);
  return {
    success: result.success,
    message: result.message,
    jobId: result.jobId,
    status: result.status,
    done: result.done,
  };
}
