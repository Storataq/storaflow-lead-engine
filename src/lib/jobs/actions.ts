"use server";

import { revalidatePath } from "next/cache";

import {
  MOCK_COMPANIES_PER_PAGE,
  MOCK_ENGINE_CLAIM,
  MOCK_SCRAPE_TARGET_PAGES,
} from "@/lib/jobs/constants";
import { buildMockCompaniesForPage } from "@/lib/jobs/mock-data";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";

export type JobActionResult = {
  success: boolean;
  message: string;
  jobId?: string;
  status?: string;
  done?: boolean;
};

export async function startScrapeAction(
  searchQueryId: string,
): Promise<JobActionResult> {
  const context = await getActiveOrganization();
  if (!context) {
    return { success: false, message: "Geen actieve organisatie." };
  }

  const supabase = await createClient();

  const { data: searchQuery, error: searchError } = await supabase
    .from("search_queries")
    .select("*")
    .eq("organization_id", context.organization.id)
    .eq("id", searchQueryId)
    .maybeSingle();

  if (searchError) {
    return { success: false, message: searchError.message };
  }
  if (!searchQuery) {
    return { success: false, message: "Zoekopdracht niet gevonden." };
  }

  const { data: job, error: insertError } = await supabase
    .from("scrape_jobs")
    .insert({
      organization_id: context.organization.id,
      search_query_id: searchQuery.id,
      job_type: "search_discovery",
      status: "queued",
      pages_processed: 0,
      companies_found: 0,
      contacts_found: 0,
    })
    .select("id")
    .single();

  if (insertError || !job) {
    return {
      success: false,
      message: insertError?.message ?? "Kon scrape-taak niet aanmaken.",
    };
  }

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${job.id}`);
  revalidatePath(`/zoekopdrachten/${searchQueryId}`);
  revalidatePath("/dashboard");

  return {
    success: true,
    message: "Scrape-taak aangemaakt (Pending).",
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
  const { data: job, error } = await supabase
    .from("scrape_jobs")
    .select("id, status")
    .eq("organization_id", context.organization.id)
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    return { success: false, message: error.message };
  }
  if (!job) {
    return { success: false, message: "Taak niet gevonden." };
  }
  if (job.status === "completed" || job.status === "failed") {
    return { success: false, message: "Afgeronde taken kunnen niet worden gepauzeerd." };
  }
  if (job.status === "cancelled") {
    return { success: true, message: "Taak is al gepauzeerd.", jobId, status: "cancelled", done: true };
  }

  const { error: updateError } = await supabase
    .from("scrape_jobs")
    .update({
      status: "cancelled",
      error_message: "Paused by user (mock engine).",
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("organization_id", context.organization.id);

  if (updateError) {
    return { success: false, message: updateError.message };
  }

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);

  return {
    success: true,
    message: "Scrape gepauzeerd.",
    jobId,
    status: "cancelled",
    done: true,
  };
}

/**
 * Advances the mock scrape by one page.
 * Client polls this while status is queued/running.
 */
export async function advanceMockScrapeAction(
  jobId: string,
): Promise<JobActionResult> {
  const context = await getActiveOrganization();
  if (!context) {
    return { success: false, message: "Geen actieve organisatie." };
  }

  const supabase = await createClient();
  const { data: job, error: jobError } = await supabase
    .from("scrape_jobs")
    .select("*")
    .eq("organization_id", context.organization.id)
    .eq("id", jobId)
    .maybeSingle();

  if (jobError) {
    return { success: false, message: jobError.message };
  }
  if (!job) {
    return { success: false, message: "Taak niet gevonden." };
  }

  if (
    job.status === "completed" ||
    job.status === "partially_completed" ||
    job.status === "failed" ||
    job.status === "cancelled"
  ) {
    return {
      success: true,
      message: "Taak is al afgerond.",
      jobId,
      status: job.status,
      done: true,
    };
  }

  if (job.status === "queued") {
    const { error: startError } = await supabase
      .from("scrape_jobs")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
        claimed_at: new Date().toISOString(),
        claimed_by: MOCK_ENGINE_CLAIM,
        error_message: null,
      })
      .eq("id", jobId)
      .eq("organization_id", context.organization.id);

    if (startError) {
      return { success: false, message: startError.message };
    }

    revalidatePath("/jobs");
    revalidatePath(`/jobs/${jobId}`);

    return {
      success: true,
      message: "Scrape gestart (Active).",
      jobId,
      status: "running",
      done: false,
    };
  }

  if (!job.search_query_id) {
    await supabase
      .from("scrape_jobs")
      .update({
        status: "failed",
        error_message: "Geen gekoppelde zoekopdracht.",
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

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
    .eq("organization_id", context.organization.id)
    .maybeSingle();

  if (searchError || !searchQuery) {
    await supabase
      .from("scrape_jobs")
      .update({
        status: "failed",
        error_message: searchError?.message ?? "Zoekopdracht ontbreekt.",
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return {
      success: false,
      message: searchError?.message ?? "Zoekopdracht ontbreekt.",
      jobId,
      status: "failed",
      done: true,
    };
  }

  const pageIndex = job.pages_processed;
  const seeds = buildMockCompaniesForPage({
    organizationId: context.organization.id,
    searchQuery,
    jobId,
    pageIndex,
    count: MOCK_COMPANIES_PER_PAGE,
  });

  let insertedCount = 0;

  for (const seed of seeds) {
    const { sourceUrl, ...companyPayload } = seed;
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert(companyPayload)
      .select("id")
      .single();

    if (companyError || !company) {
      return {
        success: false,
        message: companyError?.message ?? "Kon mock-bedrijf niet opslaan.",
        jobId,
        status: "running",
      };
    }

    const { error: linkError } = await supabase.from("company_sources").insert({
      organization_id: context.organization.id,
      company_id: company.id,
      scrape_job_id: jobId,
      source_url: sourceUrl,
      source_type: "search_result",
      metadata_json: { mock: true, page: pageIndex + 1 },
    });

    if (linkError) {
      return { success: false, message: linkError.message, jobId };
    }

    insertedCount += 1;
  }

  const nextPages = job.pages_processed + 1;
  const nextCompanies = job.companies_found + insertedCount;
  const finished = nextPages >= MOCK_SCRAPE_TARGET_PAGES;

  const { error: progressError } = await supabase
    .from("scrape_jobs")
    .update({
      pages_processed: nextPages,
      companies_found: nextCompanies,
      contacts_found: job.contacts_found,
      ...(finished
        ? {
            status: "completed" as const,
            completed_at: new Date().toISOString(),
          }
        : {}),
    })
    .eq("id", jobId)
    .eq("organization_id", context.organization.id);

  if (progressError) {
    return { success: false, message: progressError.message, jobId };
  }

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/companies");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: finished
      ? `Scrape voltooid — ${nextCompanies} mock-bedrijven.`
      : `Pagina ${nextPages}/${MOCK_SCRAPE_TARGET_PAGES} verwerkt.`,
    jobId,
    status: finished ? "completed" : "running",
    done: finished,
  };
}
