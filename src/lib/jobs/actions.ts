"use server";

import { revalidatePath } from "next/cache";

import {
  DEFAULT_CONNECTOR_CODE,
  MOCK_COMPANIES_PER_PAGE,
  MOCK_ENGINE_CLAIM,
  MOCK_SCRAPE_TARGET_PAGES,
  computeRuntimeMs,
  jobProgressPercent,
  normalizeJobStatus,
} from "@/lib/jobs/constants";
import { appendJobLog } from "@/lib/jobs/logging";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { resolveJobConnector } from "@/lib/scraping/connectors";
import { createClient } from "@/lib/supabase/server";
import type { ScrapeJobStatus } from "@/types/database";

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

  const preferredSources = searchQuery.sources ?? [];
  const connector = resolveJobConnector(preferredSources);

  const { data: job, error: insertError } = await supabase
    .from("scrape_jobs")
    .insert({
      organization_id: orgId,
      search_query_id: searchQuery.id,
      job_type: "search_discovery",
      status: "pending",
      pages_processed: 0,
      companies_found: 0,
      contacts_found: 0,
      progress_percent: 0,
      error_count: 0,
      target_pages: MOCK_SCRAPE_TARGET_PAGES,
      current_source_code: connector.manifest.code,
      error_message: null,
    })
    .select("id")
    .single();

  if (insertError || !job) {
    return {
      success: false,
      message: insertError?.message ?? "Kon scrape-taak niet aanmaken.",
    };
  }

  await appendJobLog(supabase, {
    organizationId: orgId,
    jobId: job.id,
    eventCode: "job_created",
    message: "Job created",
    sourceCode: connector.manifest.code,
    metadata: { searchQueryId, connector: connector.manifest.code },
  });

  const { error: queueError } = await supabase
    .from("scrape_jobs")
    .update({
      status: "queued",
      last_heartbeat_at: new Date().toISOString(),
    })
    .eq("id", job.id)
    .eq("organization_id", orgId);

  if (queueError) {
    return { success: false, message: queueError.message, jobId: job.id };
  }

  await appendJobLog(supabase, {
    organizationId: orgId,
    jobId: job.id,
    eventCode: "queue_started",
    message: "Queue started",
    sourceCode: connector.manifest.code,
  });

  revalidateJobPaths(job.id, searchQueryId);

  return {
    success: true,
    message: "Scrape-taak in queue (Queued).",
    jobId: job.id,
    status: "queued",
  };
}

export async function pauseScrapeAction(jobId: string): Promise<JobActionResult> {
  const context = await getActiveOrganization();
  if (!context) {
    return { success: false, message: "Geen actieve organisatie." };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  const { data: job, error } = await supabase
    .from("scrape_jobs")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", jobId)
    .maybeSingle();

  if (error) return { success: false, message: error.message };
  if (!job) return { success: false, message: "Taak niet gevonden." };

  const status = normalizeJobStatus(job.status);
  if (!["pending", "queued", "active"].includes(status)) {
    return {
      success: false,
      message: "Alleen Waiting/Active taken kunnen worden gepauzeerd.",
    };
  }

  const runtimeMs = computeRuntimeMs(job.started_at);
  const { error: updateError } = await supabase
    .from("scrape_jobs")
    .update({
      status: "paused",
      runtime_ms: runtimeMs,
      last_heartbeat_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", jobId)
    .eq("organization_id", orgId);

  if (updateError) return { success: false, message: updateError.message };

  await appendJobLog(supabase, {
    organizationId: orgId,
    jobId,
    eventCode: "job_paused",
    message: "Paused",
    sourceCode: job.current_source_code,
  });

  revalidateJobPaths(jobId, job.search_query_id);
  return {
    success: true,
    message: "Scrape gepauzeerd.",
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
  const orgId = context.organization.id;

  const { data: job, error } = await supabase
    .from("scrape_jobs")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", jobId)
    .maybeSingle();

  if (error) return { success: false, message: error.message };
  if (!job) return { success: false, message: "Taak niet gevonden." };

  if (normalizeJobStatus(job.status) !== "paused") {
    return { success: false, message: "Alleen gepauzeerde taken kunnen hervatten." };
  }

  const { error: updateError } = await supabase
    .from("scrape_jobs")
    .update({
      status: "queued",
      completed_at: null,
      last_heartbeat_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("organization_id", orgId);

  if (updateError) return { success: false, message: updateError.message };

  await appendJobLog(supabase, {
    organizationId: orgId,
    jobId,
    eventCode: "job_resumed",
    message: "Resumed — back in queue",
    sourceCode: job.current_source_code,
  });

  revalidateJobPaths(jobId, job.search_query_id);
  return {
    success: true,
    message: "Scrape hervat (Queued).",
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
  const orgId = context.organization.id;

  const { data: job, error } = await supabase
    .from("scrape_jobs")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", jobId)
    .maybeSingle();

  if (error) return { success: false, message: error.message };
  if (!job) return { success: false, message: "Taak niet gevonden." };

  const status = normalizeJobStatus(job.status);
  if (["completed", "cancelled", "failed"].includes(status)) {
    return { success: false, message: "Deze taak is al afgerond." };
  }

  const now = new Date().toISOString();
  const runtimeMs = computeRuntimeMs(job.started_at, now);

  const { error: updateError } = await supabase
    .from("scrape_jobs")
    .update({
      status: "cancelled",
      completed_at: now,
      runtime_ms: runtimeMs,
      last_heartbeat_at: now,
      error_message: "Cancelled by user",
    })
    .eq("id", jobId)
    .eq("organization_id", orgId);

  if (updateError) return { success: false, message: updateError.message };

  await appendJobLog(supabase, {
    organizationId: orgId,
    jobId,
    eventCode: "job_cancelled",
    message: "Cancelled",
    level: "warn",
    sourceCode: job.current_source_code,
  });

  revalidateJobPaths(jobId, job.search_query_id);
  return {
    success: true,
    message: "Scrape geannuleerd.",
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
  const orgId = context.organization.id;

  const { data: job, error } = await supabase
    .from("scrape_jobs")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", jobId)
    .maybeSingle();

  if (error) return { success: false, message: error.message };
  if (!job) return { success: false, message: "Taak niet gevonden." };

  const status = normalizeJobStatus(job.status);
  if (!["failed", "cancelled", "paused", "completed"].includes(status)) {
    return {
      success: false,
      message: "Retry is beschikbaar voor Failed, Cancelled, Paused of Completed.",
    };
  }

  if (!job.search_query_id) {
    return { success: false, message: "Geen gekoppelde zoekopdracht voor retry." };
  }

  // New job keeps history intact (foundation for distributed retries).
  return startScrapeAction(job.search_query_id);
}

/**
 * Advances the mock scrape engine by one step/page.
 * Client polls while status is queued/active (and legacy running).
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

  const status = normalizeJobStatus(job.status);

  if (["completed", "failed", "cancelled", "paused"].includes(status)) {
    return {
      success: true,
      message: "Taak is niet actief.",
      jobId,
      status: job.status,
      done: true,
    };
  }

  if (status === "pending") {
    await supabase
      .from("scrape_jobs")
      .update({ status: "queued", last_heartbeat_at: new Date().toISOString() })
      .eq("id", jobId);
    await appendJobLog(supabase, {
      organizationId: orgId,
      jobId,
      eventCode: "queue_started",
      message: "Queue started",
    });
    revalidateJobPaths(jobId, job.search_query_id);
    return {
      success: true,
      message: "Queued",
      jobId,
      status: "queued",
      done: false,
    };
  }

  if (status === "queued") {
    const now = new Date().toISOString();
    const sourceCode = job.current_source_code ?? DEFAULT_CONNECTOR_CODE;
    await supabase
      .from("scrape_jobs")
      .update({
        status: "active",
        started_at: job.started_at ?? now,
        claimed_at: now,
        claimed_by: MOCK_ENGINE_CLAIM,
        current_source_code: sourceCode,
        last_heartbeat_at: now,
        error_message: null,
      })
      .eq("id", jobId)
      .eq("organization_id", orgId);

    await appendJobLog(supabase, {
      organizationId: orgId,
      jobId,
      eventCode: "connector_loaded",
      message: `Connector loaded: ${sourceCode}`,
      sourceCode,
    });
    await appendJobLog(supabase, {
      organizationId: orgId,
      jobId,
      eventCode: "searching",
      message: "Searching...",
      sourceCode,
    });

    revalidateJobPaths(jobId, job.search_query_id);
    return {
      success: true,
      message: "Scrape active",
      jobId,
      status: "active",
      done: false,
    };
  }

  // active / running
  if (!job.search_query_id) {
    const now = new Date().toISOString();
    await supabase
      .from("scrape_jobs")
      .update({
        status: "failed",
        error_message: "Geen gekoppelde zoekopdracht.",
        completed_at: now,
        runtime_ms: computeRuntimeMs(job.started_at, now),
        error_count: (job.error_count ?? 0) + 1,
      })
      .eq("id", jobId);

    await appendJobLog(supabase, {
      organizationId: orgId,
      jobId,
      eventCode: "failed",
      message: "Failed — missing search query",
      level: "error",
    });

    return {
      success: false,
      message: "Geen gekoppelde zoekopdracht.",
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
    const now = new Date().toISOString();
    await supabase
      .from("scrape_jobs")
      .update({
        status: "failed",
        error_message: searchError?.message ?? "Zoekopdracht ontbreekt.",
        completed_at: now,
        runtime_ms: computeRuntimeMs(job.started_at, now),
        error_count: (job.error_count ?? 0) + 1,
      })
      .eq("id", jobId);

    await appendJobLog(supabase, {
      organizationId: orgId,
      jobId,
      eventCode: "failed",
      message: "Failed",
      level: "error",
    });

    return {
      success: false,
      message: searchError?.message ?? "Zoekopdracht ontbreekt.",
      jobId,
      status: "failed",
      done: true,
    };
  }

  const connector = resolveJobConnector(
    job.current_source_code
      ? [job.current_source_code, ...(searchQuery.sources ?? [])]
      : searchQuery.sources,
  );
  const pageIndex = job.pages_processed;
  const targetPages = job.target_pages || MOCK_SCRAPE_TARGET_PAGES;

  const page = await connector.searchPage({
    organizationId: orgId,
    jobId,
    pageIndex,
    pageSize: MOCK_COMPANIES_PER_PAGE,
    search: {
      keyword: searchQuery.keyword,
      keywords: searchQuery.keywords,
      industry: searchQuery.industry ?? undefined,
      industries: searchQuery.industries,
      city: searchQuery.city ?? undefined,
      cities: searchQuery.cities,
      region: searchQuery.region ?? undefined,
      regions: searchQuery.regions,
      country: searchQuery.country ?? undefined,
      countries: searchQuery.countries,
      languages: searchQuery.languages,
      sources: searchQuery.sources,
      searchPrompt: searchQuery.search_prompt,
      maxResults: targetPages * MOCK_COMPANIES_PER_PAGE,
    },
  });

  await appendJobLog(supabase, {
    organizationId: orgId,
    jobId,
    eventCode: "searching",
    message: `Searching... page ${pageIndex + 1}/${targetPages}`,
    sourceCode: page.sourceCode,
    metadata: { pageIndex, items: page.items.length },
  });

  let insertedCount = 0;

  for (const item of page.items) {
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        organization_id: orgId,
        company_name: item.companyName,
        normalized_company_name: normalizeName(item.companyName),
        website_url: item.websiteUrl ?? null,
        normalized_domain: domainFromUrl(item.websiteUrl),
        description: `Mock connector result (${page.sourceCode})`,
        industry: item.industry ?? null,
        city: item.city ?? null,
        region: item.region ?? null,
        country: item.country ?? null,
        source_url: item.sourceUrl,
        source_type: item.sourceType,
        last_checked_at: new Date().toISOString(),
        status: "new",
        notes: "Generated by modular mock scrape engine.",
        linkedin_url: searchQuery.linkedin_required
          ? `https://www.linkedin.com/company/${normalizeName(item.companyName).replace(/\s+/g, "-")}`
          : null,
      })
      .select("id")
      .single();

    if (companyError || !company) {
      await supabase
        .from("scrape_jobs")
        .update({ error_count: (job.error_count ?? 0) + 1 })
        .eq("id", jobId);

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
      metadata_json: { mock: true, connector: page.sourceCode, page: pageIndex + 1 },
    });

    await supabase.from("scrape_results").insert({
      organization_id: orgId,
      scrape_job_id: jobId,
      source_code: page.sourceCode,
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
        sourceUrl: item.sourceUrl,
        pageIndex,
      },
    });

    insertedCount += 1;
  }

  const nextPages = job.pages_processed + 1;
  const nextCompanies = job.companies_found + insertedCount;
  const progress = jobProgressPercent(nextPages, targetPages);
  const finished = nextPages >= targetPages;
  const now = new Date().toISOString();

  const updatePayload: {
    pages_processed: number;
    companies_found: number;
    progress_percent: number;
    current_source_code: string;
    last_heartbeat_at: string;
    status?: ScrapeJobStatus;
    completed_at?: string;
    runtime_ms?: number | null;
  } = {
    pages_processed: nextPages,
    companies_found: nextCompanies,
    progress_percent: finished ? 100 : progress,
    current_source_code: page.sourceCode,
    last_heartbeat_at: now,
  };

  if (finished) {
    updatePayload.status = "completed";
    updatePayload.completed_at = now;
    updatePayload.runtime_ms = computeRuntimeMs(job.started_at, now);
  }

  const { error: progressError } = await supabase
    .from("scrape_jobs")
    .update(updatePayload)
    .eq("id", jobId)
    .eq("organization_id", orgId);

  if (progressError) {
    return { success: false, message: progressError.message, jobId };
  }

  if (finished) {
    await appendJobLog(supabase, {
      organizationId: orgId,
      jobId,
      eventCode: "finished",
      message: `Finished — ${nextCompanies} companies`,
      sourceCode: page.sourceCode,
      metadata: { companies: nextCompanies, pages: nextPages },
    });
  }

  revalidateJobPaths(jobId, job.search_query_id);

  return {
    success: true,
    message: finished
      ? `Scrape voltooid — ${nextCompanies} mock-bedrijven.`
      : `Pagina ${nextPages}/${targetPages} verwerkt.`,
    jobId,
    status: finished ? "completed" : "active",
    done: finished,
  };
}
