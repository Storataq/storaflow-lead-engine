"use server";

import { revalidatePath } from "next/cache";

import {
  createWebsiteEnrichmentJob,
  executeWebsiteEnrichmentJob,
} from "@/lib/enrichment/jobs";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export type EnrichmentActionResult = {
  success: boolean;
  message: string;
  jobId?: string;
};

export async function startWebsiteEnrichmentAction(
  companyId: string,
): Promise<EnrichmentActionResult> {
  const context = await getActiveOrganization();
  if (!context) {
    return { success: false, message: "Geen actieve organisatie." };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  try {
    const { data: company, error } = await supabase
      .from("companies")
      .select("id, website_url, company_name")
      .eq("organization_id", orgId)
      .eq("id", companyId)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        message: toUserFacingError(error, "Kon bedrijf niet laden."),
      };
    }
    if (!company) return { success: false, message: "Bedrijf niet gevonden." };
    if (!company.website_url?.trim()) {
      return {
        success: false,
        message: "Dit bedrijf heeft geen website-URL om te verrijken.",
      };
    }

    // Prevent duplicate in-flight enrichment for same company
    const { data: activeLinks } = await supabase
      .from("company_sources")
      .select("scrape_job_id")
      .eq("organization_id", orgId)
      .eq("company_id", companyId)
      .not("scrape_job_id", "is", null)
      .order("discovered_at", { ascending: false })
      .limit(5);

    const jobIds = (activeLinks ?? [])
      .map((row) => row.scrape_job_id)
      .filter((id): id is string => Boolean(id));

    if (jobIds.length) {
      const { data: activeJobs } = await supabase
        .from("scrape_jobs")
        .select("id, status, job_type")
        .eq("organization_id", orgId)
        .eq("job_type", "website_crawl")
        .in("id", jobIds)
        .in("status", ["pending", "queued", "active", "running"]);

      if (activeJobs?.[0]) {
        return {
          success: true,
          message: "Er loopt al een website-enrichment voor dit bedrijf.",
          jobId: activeJobs[0].id,
        };
      }
    }

    const job = await createWebsiteEnrichmentJob(supabase, {
      organizationId: orgId,
      companyId,
      websiteUrl: company.website_url,
      userId: context.membership.user_id,
    });

    // Run immediately (same pattern as scrape advance) for responsive UX
    const result = await executeWebsiteEnrichmentJob(
      supabase,
      orgId,
      job,
      context.membership.user_id,
    );

    revalidatePath(`/companies/${companyId}`);
    revalidatePath(`/companies/${companyId}/enrichment`);
    revalidatePath("/companies");
    revalidatePath("/contacts");
    revalidatePath("/jobs");
    revalidatePath(`/jobs/${job.id}`);
    revalidatePath("/activity");
    revalidatePath("/enrichment");

    return {
      success: result.success,
      message: result.message,
      jobId: job.id,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(
        error,
        "Kon website-enrichment niet starten.",
      ),
    };
  }
}

const BULK_MAX = 10;
const RECENT_SKIP_HOURS = 24;

export type BulkEnrichmentResult = {
  success: boolean;
  message: string;
  queued: number;
  skipped: number;
  failed: number;
  jobIds: string[];
};

/**
 * Controlled bulk enrichment for selected companies with websites.
 * Caps batch size and skips recently enriched companies.
 */
export async function startBulkWebsiteEnrichmentAction(
  companyIds: string[],
  options?: { skipRecentlyEnriched?: boolean; confirmed?: boolean },
): Promise<BulkEnrichmentResult> {
  const context = await getActiveOrganization();
  if (!context) {
    return {
      success: false,
      message: "Geen actieve organisatie.",
      queued: 0,
      skipped: 0,
      failed: 0,
      jobIds: [],
    };
  }
  if (!options?.confirmed) {
    return {
      success: false,
      message: "Bevestiging vereist voor bulk enrichment.",
      queued: 0,
      skipped: 0,
      failed: 0,
      jobIds: [],
    };
  }

  const uniqueIds = [...new Set(companyIds)].slice(0, BULK_MAX);
  if (uniqueIds.length === 0) {
    return {
      success: false,
      message: "Geen bedrijven geselecteerd.",
      queued: 0,
      skipped: 0,
      failed: 0,
      jobIds: [],
    };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;
  const skipRecent = options.skipRecentlyEnriched !== false;
  const cutoff = new Date(
    Date.now() - RECENT_SKIP_HOURS * 60 * 60 * 1000,
  ).toISOString();

  let queued = 0;
  let skipped = 0;
  let failed = 0;
  const jobIds: string[] = [];

  for (const companyId of uniqueIds) {
    try {
      const { data: company } = await supabase
        .from("companies")
        .select("id, website_url")
        .eq("organization_id", orgId)
        .eq("id", companyId)
        .maybeSingle();

      if (!company?.website_url?.trim()) {
        skipped += 1;
        continue;
      }

      if (skipRecent) {
        const { data: recent } = await supabase
          .from("company_sources")
          .select("discovered_at, metadata_json")
          .eq("organization_id", orgId)
          .eq("company_id", companyId)
          .gte("discovered_at", cutoff)
          .order("discovered_at", { ascending: false })
          .limit(5);
        const recentlyEnriched = (recent ?? []).some((row) => {
          const meta = row.metadata_json;
          return (
            meta &&
            typeof meta === "object" &&
            !Array.isArray(meta) &&
            (meta as Record<string, unknown>).enrichment === true
          );
        });
        if (recentlyEnriched) {
          skipped += 1;
          continue;
        }
      }

      const job = await createWebsiteEnrichmentJob(supabase, {
        organizationId: orgId,
        companyId,
        websiteUrl: company.website_url,
        userId: context.membership.user_id,
      });
      // Queue only for bulk — process via existing job advance / sequential execute
      const result = await executeWebsiteEnrichmentJob(
        supabase,
        orgId,
        job,
        context.membership.user_id,
      );
      jobIds.push(job.id);
      if (result.success) queued += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }

  revalidatePath("/companies");
  revalidatePath("/enrichment");
  revalidatePath("/jobs");
  revalidatePath("/contacts");

  return {
    success: failed === 0,
    message: `Bulk enrichment: ${queued} voltooid, ${skipped} overgeslagen, ${failed} mislukt (max ${BULK_MAX}).`,
    queued,
    skipped,
    failed,
    jobIds,
  };
}
