/**
 * Website enrichment jobs — reuses scrape_jobs (job_type=website_crawl).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { logCrmActivity } from "@/lib/crm/activity";
import { persistEnrichmentResult } from "@/lib/enrichment/persist";
import { runWebsiteEnrichment } from "@/lib/enrichment/run-website-enrichment";
import {
  COMPLIANCE_NOTICE,
  WEBSITE_CRAWLER_CODE,
} from "@/lib/enrichment/types";
import { appendJobLog } from "@/lib/jobs/logging";
import {
  complete as queueComplete,
  enqueue,
  fail as queueFail,
} from "@/lib/jobs/queue-service";
import type { ScrapeJobRow } from "@/lib/jobs/queries";
import type { Database, Json } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export type EnrichmentJobResult = {
  success: boolean;
  message: string;
  jobId: string;
  done: boolean;
};

function asJson(value: Record<string, unknown>): Json {
  return value as Json;
}

export async function createWebsiteEnrichmentJob(
  supabase: Client,
  input: {
    organizationId: string;
    companyId: string;
    websiteUrl: string;
    userId?: string | null;
  },
): Promise<ScrapeJobRow> {
  const { data, error } = await supabase
    .from("scrape_jobs")
    .insert({
      organization_id: input.organizationId,
      search_query_id: null,
      job_type: "website_crawl",
      status: "pending",
      priority: "NORMAL",
      retry_count: 0,
      pages_processed: 0,
      pages_total: 12,
      target_pages: 12,
      companies_found: 0,
      contacts_found: 0,
      progress_percent: 0,
      error_count: 0,
      current_source_code: WEBSITE_CRAWLER_CODE,
      error_message: null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create enrichment job");
  }

  await appendJobLog(supabase, {
    organizationId: input.organizationId,
    jobId: data.id,
    eventCode: "enrichment_queued",
    message: "Website enrichment queued",
    sourceCode: WEBSITE_CRAWLER_CODE,
    metadata: asJson({
      company_id: input.companyId,
      website: input.websiteUrl,
    }),
  });

  await supabase.from("company_sources").insert({
    organization_id: input.organizationId,
    company_id: input.companyId,
    scrape_job_id: data.id,
    source_url: input.websiteUrl,
    source_type: "company_website",
    metadata_json: asJson({
      enrichment_job: true,
      stage: "queued",
    }),
  });

  await logCrmActivity(supabase, {
    organizationId: input.organizationId,
    userId: input.userId,
    eventType: "website_enrichment_queued",
    entityType: "company",
    entityId: input.companyId,
    description: "Website enrichment queued",
    metadata: { jobId: data.id },
  });

  const queued = await enqueue(supabase, input.organizationId, data.id);
  if (!queued.job) {
    throw new Error(queued.message);
  }
  return queued.job;
}

async function resolveCompanyIdForJob(
  supabase: Client,
  organizationId: string,
  jobId: string,
): Promise<string | null> {
  const { data: logs } = await supabase
    .from("scrape_job_logs")
    .select("metadata_json")
    .eq("organization_id", organizationId)
    .eq("scrape_job_id", jobId)
    .eq("event_code", "enrichment_queued")
    .limit(1);
  const meta = logs?.[0]?.metadata_json;
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const companyId = (meta as Record<string, unknown>).company_id;
    if (typeof companyId === "string") return companyId;
  }

  const { data: link } = await supabase
    .from("company_sources")
    .select("company_id")
    .eq("organization_id", organizationId)
    .eq("scrape_job_id", jobId)
    .limit(1)
    .maybeSingle();
  return link?.company_id ?? null;
}

export async function executeWebsiteEnrichmentJob(
  supabase: Client,
  organizationId: string,
  job: ScrapeJobRow,
  userId?: string | null,
): Promise<EnrichmentJobResult> {
  const companyId = await resolveCompanyIdForJob(
    supabase,
    organizationId,
    job.id,
  );
  if (!companyId) {
    await queueFail(
      supabase,
      organizationId,
      job.id,
      "Geen bedrijf gekoppeld aan enrichment job.",
    );
    return {
      success: false,
      message: "Geen bedrijf gekoppeld aan enrichment job.",
      jobId: job.id,
      done: true,
    };
  }

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", companyId)
    .maybeSingle();

  if (!company?.website_url) {
    await queueFail(
      supabase,
      organizationId,
      job.id,
      "Bedrijf heeft geen website-URL.",
    );
    return {
      success: false,
      message: "Bedrijf heeft geen website-URL.",
      jobId: job.id,
      done: true,
    };
  }

  const now = new Date().toISOString();
  await supabase
    .from("scrape_jobs")
    .update({
      status: "active",
      started_at: job.started_at ?? now,
      claimed_at: now,
      claimed_by: "website-enrichment-v1",
      last_heartbeat_at: now,
      progress_percent: Math.max(job.progress_percent, 5),
      current_source_code: WEBSITE_CRAWLER_CODE,
    })
    .eq("id", job.id)
    .eq("organization_id", organizationId);

  await appendJobLog(supabase, {
    organizationId,
    jobId: job.id,
    eventCode: "enrichment_started",
    message: "Website crawl started",
    sourceCode: WEBSITE_CRAWLER_CODE,
    metadata: asJson({ company_id: companyId }),
  });

  await logCrmActivity(supabase, {
    organizationId,
    userId,
    eventType: "website_enrichment_started",
    entityType: "company",
    entityId: companyId,
    description: "Website enrichment started",
    metadata: { jobId: job.id },
  });

  try {
    const result = await runWebsiteEnrichment({
      companyId,
      websiteUrl: company.website_url,
      companyDomain: company.normalized_domain,
      companyCity: company.city,
      companyCountry: company.country,
      onProgress: async (stage, detail) => {
        const progressMap: Record<string, number> = {
          checking_website: 15,
          robots: 25,
          discovering_pages: 40,
          crawling_pages: 60,
          extracting_data: 80,
        };
        await supabase
          .from("scrape_jobs")
          .update({
            progress_percent: progressMap[stage] ?? 50,
            last_heartbeat_at: new Date().toISOString(),
            pages_processed: stage === "crawling_pages" ? 1 : job.pages_processed,
          })
          .eq("id", job.id)
          .eq("organization_id", organizationId);
        await appendJobLog(supabase, {
          organizationId,
          jobId: job.id,
          eventCode: stage,
          message: detail ? `${stage}: ${detail}` : stage,
          sourceCode: WEBSITE_CRAWLER_CODE,
        });
      },
    });

    if (
      result.availability.status !== "reachable" &&
      result.availability.status !== "redirected" &&
      result.pages.length === 0
    ) {
      await queueFail(
        supabase,
        organizationId,
        job.id,
        result.availability.message || "Website unreachable",
      );
      await logCrmActivity(supabase, {
        organizationId,
        userId,
        eventType: "website_unreachable",
        entityType: "company",
        entityId: companyId,
        description: "Website unreachable during enrichment",
        metadata: { status: result.availability.status },
      });
      return {
        success: false,
        message: result.availability.message,
        jobId: job.id,
        done: true,
      };
    }

    await appendJobLog(supabase, {
      organizationId,
      jobId: job.id,
      eventCode: "saving_results",
      message: "Saving enrichment results",
      sourceCode: WEBSITE_CRAWLER_CODE,
    });

    const persisted = await persistEnrichmentResult(supabase, {
      organizationId,
      jobId: job.id,
      result,
    });

    await supabase
      .from("scrape_jobs")
      .update({
        progress_percent: 100,
        pages_processed: result.statistics.pagesProcessed,
        pages_total: result.statistics.pagesDiscovered,
        contacts_found: result.statistics.emailsFound + result.statistics.phonesFound,
        companies_found: 1,
        last_heartbeat_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .eq("organization_id", organizationId);

    await queueComplete(supabase, organizationId, job.id, {
      companiesFound: 1,
      contactsFound: persisted.contactsCreated + persisted.contactsReused,
    });

    const warningCount = result.statistics.warnings.length;
    await appendJobLog(supabase, {
      organizationId,
      jobId: job.id,
      eventCode: warningCount ? "completed_with_warnings" : "enrichment_completed",
      message: warningCount
        ? "Enrichment completed with warnings"
        : "Enrichment completed",
      sourceCode: WEBSITE_CRAWLER_CODE,
      metadata: asJson({
        emails: result.statistics.emailsFound,
        phones: result.statistics.phonesFound,
        pages: result.statistics.pagesProcessed,
        contactsCreated: persisted.contactsCreated,
        compliance: COMPLIANCE_NOTICE,
      }),
    });

    await logCrmActivity(supabase, {
      organizationId,
      userId,
      eventType: warningCount
        ? "website_enrichment_completed_with_warnings"
        : "website_enrichment_completed",
      entityType: "company",
      entityId: companyId,
      description: warningCount
        ? "Website enrichment completed with warnings"
        : "Website enrichment completed",
      metadata: {
        jobId: job.id,
        emails: result.statistics.emailsFound,
        phones: result.statistics.phonesFound,
      },
    });

    return {
      success: true,
      message: `Enrichment voltooid — ${result.statistics.emailsFound} e-mails, ${result.statistics.phonesFound} telefoons`,
      jobId: job.id,
      done: true,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 240) : "Enrichment failed";
    await queueFail(supabase, organizationId, job.id, message);
    await logCrmActivity(supabase, {
      organizationId,
      userId,
      eventType: "website_enrichment_failed",
      entityType: "company",
      entityId: companyId,
      description: "Website enrichment failed",
      metadata: { jobId: job.id },
    });
    return {
      success: false,
      message,
      jobId: job.id,
      done: true,
    };
  }
}
