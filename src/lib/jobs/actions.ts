"use server";

import { revalidatePath } from "next/cache";

import { appendJobLog } from "@/lib/jobs/logging";
import {
  cancel as queueCancel,
  createDraftJob,
  dequeue,
  enqueue,
  fail as queueFail,
  pause as queuePause,
  resume as queueResume,
  retry as queueRetry,
  complete as queueComplete,
} from "@/lib/jobs/queue-service";
import { resolveWorkerForJob } from "@/lib/jobs/workers";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { resolveJobConnector } from "@/lib/scraping/connectors";
import { createClient } from "@/lib/supabase/server";
import type { ScrapeJobPriority } from "@/types/database";

export type JobActionResult = {
  success: boolean;
  message: string;
  jobId?: string;
  status?: string;
  done?: boolean;
};

function revalidateJobPaths(jobId: string, searchQueryId?: string | null) {
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/companies");
  revalidatePath("/dashboard");
  if (searchQueryId) {
    revalidatePath(`/zoekopdrachten/${searchQueryId}`);
  }
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim();
}

function domainFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

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

  const connector = resolveJobConnector(searchQuery.sources ?? []);

  try {
    const draft = await createDraftJob(supabase, {
      organizationId: orgId,
      searchQueryId: searchQuery.id,
      sourceCode: connector.manifest.code,
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
      message: "Scrape job queued.",
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
  const result = await enqueue(supabase, context.organization.id, jobId);
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
 * Advances the mock queue/worker by one step.
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

  const status = job.status;

  if (
    status === "completed" ||
    status === "partially_completed" ||
    status === "failed" ||
    status === "cancelled" ||
    status === "paused"
  ) {
    return {
      success: true,
      message: "Taak is niet actief.",
      jobId,
      status,
      done: true,
    };
  }

  if (status === "draft" || status === "pending") {
    const queued = await enqueue(supabase, orgId, jobId);
    revalidateJobPaths(jobId, job.search_query_id);
    return {
      success: queued.success,
      message: queued.message,
      jobId,
      status: "queued",
      done: false,
    };
  }

  if (status === "queued") {
    // Prefer claiming this specific job (single-job mock runner).
    const now = new Date().toISOString();
    const { data: activated, error } = await supabase
      .from("scrape_jobs")
      .update({
        status: "active",
        started_at: job.started_at ?? now,
        claimed_at: now,
        claimed_by: "mock-worker-v1",
        last_heartbeat_at: now,
        progress_percent: Math.max(job.progress_percent, 0),
      })
      .eq("id", jobId)
      .eq("organization_id", orgId)
      .eq("status", "queued")
      .select("*")
      .maybeSingle();

    if (error) return { success: false, message: error.message };
    if (!activated) {
      // Race: another worker claimed — try org dequeue
      const claimed = await dequeue(supabase, orgId);
      revalidateJobPaths(jobId, job.search_query_id);
      return {
        success: claimed.success,
        message: claimed.message,
        jobId: claimed.job?.id ?? jobId,
        status: claimed.job?.status ?? "queued",
        done: false,
      };
    }

    await appendJobLog(supabase, {
      organizationId: orgId,
      jobId,
      eventCode: "worker_assigned",
      message: "Worker Assigned (mock-worker-v1)",
      sourceCode: job.current_source_code,
    });
    await appendJobLog(supabase, {
      organizationId: orgId,
      jobId,
      eventCode: "started",
      message: "Started",
      sourceCode: job.current_source_code,
    });

    revalidateJobPaths(jobId, job.search_query_id);
    return {
      success: true,
      message: "Active",
      jobId,
      status: "active",
      done: false,
    };
  }

  // active / running — MockWorker tick
  if (!job.search_query_id) {
    const failed = await queueFail(
      supabase,
      orgId,
      jobId,
      "Geen gekoppelde zoekopdracht.",
    );
    return {
      success: false,
      message: failed.message,
      jobId,
      status: "failed",
      done: true,
    };
  }

  const { data: searchQuery, error: searchError } = await supabase
    .from("search_queries")
    .select("*")
    .eq("id", job.search_query_id)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (searchError || !searchQuery) {
    await queueFail(
      supabase,
      orgId,
      jobId,
      searchError?.message ?? "Zoekopdracht ontbreekt.",
    );
    return {
      success: false,
      message: searchError?.message ?? "Zoekopdracht ontbreekt.",
      jobId,
      status: "failed",
      done: true,
    };
  }

  const worker = resolveWorkerForJob(job);
  const stepIndex = job.pages_processed;
  const tick = await worker.processTick({
    organizationId: orgId,
    job,
    searchQuery,
    stepIndex,
  });

  await appendJobLog(supabase, {
    organizationId: orgId,
    jobId,
    eventCode: "progress",
    message: tick.message,
    sourceCode: tick.workerCode,
    metadata: { progressPercent: tick.progressPercent, stepIndex },
  });

  let inserted = 0;
  for (const item of tick.companies) {
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        organization_id: orgId,
        company_name: item.companyName,
        normalized_company_name: normalizeName(item.companyName),
        website_url: item.websiteUrl ?? null,
        normalized_domain: domainFromUrl(item.websiteUrl),
        description: `Mock worker result (${tick.workerCode})`,
        industry: item.industry ?? null,
        city: item.city ?? null,
        region: item.region ?? null,
        country: item.country ?? null,
        source_url: item.sourceUrl,
        source_type: item.sourceType,
        last_checked_at: new Date().toISOString(),
        status: "new",
        notes: "Generated by MockWorker (fase 5 queue engine).",
        linkedin_url: searchQuery.linkedin_required
          ? `https://www.linkedin.com/company/${normalizeName(item.companyName).replace(/\s+/g, "-")}`
          : null,
      })
      .select("id")
      .single();

    if (companyError || !company) {
      return {
        success: false,
        message: companyError?.message ?? "Kon bedrijf niet opslaan.",
        jobId,
        status: "active",
      };
    }

    await supabase.from("company_sources").insert({
      organization_id: orgId,
      company_id: company.id,
      scrape_job_id: jobId,
      source_url: item.sourceUrl,
      source_type: item.sourceType,
      metadata_json: {
        mock: true,
        worker: tick.workerCode,
        step: stepIndex + 1,
      },
    });

    await supabase.from("scrape_results").insert({
      organization_id: orgId,
      scrape_job_id: jobId,
      source_code: tick.workerCode,
      company_name: item.companyName,
      website_url: item.websiteUrl ?? null,
      city: item.city ?? null,
      region: item.region ?? null,
      country: item.country ?? null,
      industry: item.industry ?? null,
      company_id: company.id,
      status: "normalized",
      raw_payload: {
        mock: true,
        progressPercent: tick.progressPercent,
        stepIndex,
      },
    });

    inserted += 1;
  }

  const nextPages = job.pages_processed + 1;
  const nextCompanies = job.companies_found + inserted;
  const nextContacts = job.contacts_found + tick.contactsFound;
  const pagesTotal = job.pages_total || job.target_pages || 5;
  const now = new Date().toISOString();

  if (tick.done) {
    await supabase
      .from("scrape_jobs")
      .update({
        pages_processed: nextPages,
        pages_total: pagesTotal,
        target_pages: pagesTotal,
        companies_found: nextCompanies,
        contacts_found: nextContacts,
        progress_percent: 100,
        current_source_code: tick.workerCode,
        last_heartbeat_at: now,
      })
      .eq("id", jobId)
      .eq("organization_id", orgId);

    await queueComplete(supabase, orgId, jobId, {
      companiesFound: nextCompanies,
      contactsFound: nextContacts,
    });

    revalidateJobPaths(jobId, job.search_query_id);
    return {
      success: true,
      message: `Completed — ${nextCompanies} mock companies`,
      jobId,
      status: "completed",
      done: true,
    };
  }

  const { error: progressError } = await supabase
    .from("scrape_jobs")
    .update({
      pages_processed: nextPages,
      pages_total: pagesTotal,
      target_pages: pagesTotal,
      companies_found: nextCompanies,
      contacts_found: nextContacts,
      progress_percent: tick.progressPercent,
      current_source_code: tick.workerCode,
      last_heartbeat_at: now,
    })
    .eq("id", jobId)
    .eq("organization_id", orgId);

  if (progressError) {
    return { success: false, message: progressError.message, jobId };
  }

  revalidateJobPaths(jobId, job.search_query_id);
  return {
    success: true,
    message: tick.message,
    jobId,
    status: "active",
    done: false,
  };
}
