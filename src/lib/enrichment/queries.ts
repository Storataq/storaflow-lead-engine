/**
 * Read helpers for website enrichment jobs and result snapshots.
 */

import { createClient } from "@/lib/supabase/server";
import type { ScrapeJobRow } from "@/lib/jobs/queries";

export type EnrichmentDashboardStats = {
  queued: number;
  running: number;
  completed: number;
  failed: number;
  companiesEnriched: number;
  unreachable: number;
  emailsDiscovered: number;
  phonesDiscovered: number;
  namedContactsFound: number;
  duplicatesPrevented: number;
  withWarnings: number;
  averageDurationMs: number;
  recentJobs: Array<{
    id: string;
    status: string;
    createdAt: string;
    completedAt: string | null;
    contactsFound: number;
    pagesProcessed: number;
    companyId: string | null;
    companyName: string | null;
    website: string | null;
  }>;
};

export type CompanyEnrichmentSnapshot = {
  jobId: string | null;
  discoveredAt: string | null;
  availability: string | null;
  emails: number;
  phones: number;
  socials: number;
  people: number;
  pages: number;
  warnings: string[];
  contactPage: string | null;
  aboutPage: string | null;
  teamPage: string | null;
  emailPreview: Array<Record<string, unknown>>;
  phonePreview: Array<Record<string, unknown>>;
  socialPreview: Array<Record<string, unknown>>;
  peoplePreview: Array<Record<string, unknown>>;
  pagePreview: Array<Record<string, unknown>>;
  duplicatesPrevented: number;
  durationMs: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
}

export async function getLatestCompanyEnrichmentSnapshot(
  organizationId: string,
  companyId: string,
): Promise<CompanyEnrichmentSnapshot | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_sources")
    .select("scrape_job_id, discovered_at, metadata_json")
    .eq("organization_id", organizationId)
    .eq("company_id", companyId)
    .order("discovered_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);

  const row = (data ?? []).find((item) => {
    const meta = asRecord(item.metadata_json);
    return meta.enrichment === true;
  });
  if (!row) return null;

  const meta = asRecord(row.metadata_json);
  return {
    jobId: row.scrape_job_id,
    discoveredAt: row.discovered_at,
    availability: typeof meta.availability === "string" ? meta.availability : null,
    emails: Number(meta.emails ?? 0),
    phones: Number(meta.phones ?? 0),
    socials: Number(meta.socials ?? 0),
    people: Number(meta.people ?? 0),
    pages: Number(meta.pages ?? 0),
    warnings: Array.isArray(meta.warnings)
      ? meta.warnings.filter((w): w is string => typeof w === "string")
      : [],
    contactPage: typeof meta.contactPage === "string" ? meta.contactPage : null,
    aboutPage: typeof meta.aboutPage === "string" ? meta.aboutPage : null,
    teamPage: typeof meta.teamPage === "string" ? meta.teamPage : null,
    emailPreview: asArray(meta.emailPreview),
    phonePreview: asArray(meta.phonePreview),
    socialPreview: asArray(meta.socialPreview),
    peoplePreview: asArray(meta.peoplePreview),
    pagePreview: asArray(meta.pagePreview),
    duplicatesPrevented: Number(meta.duplicatesPrevented ?? 0),
    durationMs: Number(meta.durationMs ?? 0),
  };
}

export async function listCompanyContacts(
  organizationId: string,
  companyId: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getEnrichmentDashboardStats(
  organizationId: string,
): Promise<EnrichmentDashboardStats> {
  const supabase = await createClient();
  const { data: jobs, error } = await supabase
    .from("scrape_jobs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("job_type", "website_crawl")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  const list = (jobs ?? []) as ScrapeJobRow[];
  const queued = list.filter((j) =>
    ["pending", "queued"].includes(j.status),
  ).length;
  const running = list.filter((j) =>
    ["active", "running"].includes(j.status),
  ).length;
  const completed = list.filter((j) => j.status === "completed").length;
  const failed = list.filter((j) => j.status === "failed").length;

  const { data: enrichmentSources } = await supabase
    .from("company_sources")
    .select("company_id, metadata_json, scrape_job_id, discovered_at")
    .eq("organization_id", organizationId)
    .order("discovered_at", { ascending: false })
    .limit(200);

  const enrichedCompanyIds = new Set<string>();
  let emailsDiscovered = 0;
  let phonesDiscovered = 0;
  let namedContactsFound = 0;
  let duplicatesPrevented = 0;
  let unreachable = 0;
  let withWarnings = 0;
  let durationSum = 0;
  let durationCount = 0;

  const companyByJob = new Map<string, string>();
  for (const source of enrichmentSources ?? []) {
    const meta = asRecord(source.metadata_json);
    if (meta.enrichment !== true) continue;
    enrichedCompanyIds.add(source.company_id);
    emailsDiscovered += Number(meta.emails ?? 0);
    phonesDiscovered += Number(meta.phones ?? 0);
    namedContactsFound += Number(meta.people ?? 0);
    duplicatesPrevented += Number(meta.duplicatesPrevented ?? 0);
    if (meta.availability === "unreachable") unreachable += 1;
    if (Array.isArray(meta.warnings) && meta.warnings.length > 0) {
      withWarnings += 1;
    }
    const duration = Number(meta.durationMs ?? 0);
    if (duration > 0) {
      durationSum += duration;
      durationCount += 1;
    }
    if (source.scrape_job_id) {
      companyByJob.set(source.scrape_job_id, source.company_id);
    }
  }

  const companyIds = [...new Set(companyByJob.values())];
  const companyNameById = new Map<string, string>();
  if (companyIds.length) {
    const { data: companies } = await supabase
      .from("companies")
      .select("id, company_name, website_url")
      .eq("organization_id", organizationId)
      .in("id", companyIds.slice(0, 80));
    for (const company of companies ?? []) {
      companyNameById.set(company.id, company.company_name);
    }
  }

  const websiteByCompany = new Map<string, string | null>();
  if (companyIds.length) {
    const { data: companies } = await supabase
      .from("companies")
      .select("id, website_url")
      .eq("organization_id", organizationId)
      .in("id", companyIds.slice(0, 80));
    for (const company of companies ?? []) {
      websiteByCompany.set(company.id, company.website_url);
    }
  }

  return {
    queued,
    running,
    completed,
    failed,
    companiesEnriched: enrichedCompanyIds.size,
    unreachable,
    emailsDiscovered,
    phonesDiscovered,
    namedContactsFound,
    duplicatesPrevented,
    withWarnings,
    averageDurationMs:
      durationCount > 0 ? Math.round(durationSum / durationCount) : 0,
    recentJobs: list.slice(0, 20).map((job) => {
      const companyId = companyByJob.get(job.id) ?? null;
      return {
        id: job.id,
        status: job.status,
        createdAt: job.created_at,
        completedAt: job.completed_at,
        contactsFound: job.contacts_found,
        pagesProcessed: job.pages_processed,
        companyId,
        companyName: companyId ? companyNameById.get(companyId) ?? null : null,
        website: companyId ? websiteByCompany.get(companyId) ?? null : null,
      };
    }),
  };
}
