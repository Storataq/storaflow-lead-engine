import { createClient } from "@/lib/supabase/server";
import type { JobSortOption } from "@/lib/jobs/constants";
import type { ScrapeJobStatus } from "@/types/database";
import type { Database } from "@/types/supabase";

export type ScrapeJobRow = Database["public"]["Tables"]["scrape_jobs"]["Row"];
export type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];
export type ScrapeJobLogRow =
  Database["public"]["Tables"]["scrape_job_logs"]["Row"];
export type ScrapeResultRow =
  Database["public"]["Tables"]["scrape_results"]["Row"];

export type ScrapeJobWithSearch = ScrapeJobRow & {
  search_queries: { id: string; name: string } | null;
};

export type ListScrapeJobsInput = {
  organizationId: string;
  status?: ScrapeJobStatus | "all";
  sort?: JobSortOption;
};

async function attachSearchNames(
  organizationId: string,
  jobs: ScrapeJobRow[],
): Promise<ScrapeJobWithSearch[]> {
  const searchIds = [
    ...new Set(
      jobs
        .map((job) => job.search_query_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (searchIds.length === 0) {
    return jobs.map((job) => ({ ...job, search_queries: null }));
  }

  const supabase = await createClient();
  const { data: searches, error } = await supabase
    .from("search_queries")
    .select("id, name")
    .eq("organization_id", organizationId)
    .in("id", searchIds);

  if (error) {
    throw new Error(error.message);
  }

  const byId = new Map((searches ?? []).map((row) => [row.id, row]));

  return jobs.map((job) => ({
    ...job,
    search_queries: job.search_query_id
      ? (byId.get(job.search_query_id) ?? null)
      : null,
  }));
}

export async function listScrapeJobs(
  input: ListScrapeJobsInput,
): Promise<ScrapeJobWithSearch[]> {
  const supabase = await createClient();
  let query = supabase
    .from("scrape_jobs")
    .select("*")
    .eq("organization_id", input.organizationId);

  if (input.status && input.status !== "all") {
    query = query.eq("status", input.status);
  }

  query =
    input.sort === "oldest"
      ? query.order("created_at", { ascending: true })
      : query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return attachSearchNames(input.organizationId, data ?? []);
}

export async function getScrapeJob(
  organizationId: string,
  id: string,
): Promise<ScrapeJobWithSearch | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scrape_jobs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  const [withSearch] = await attachSearchNames(organizationId, [data]);
  return withSearch ?? null;
}

export async function listCompaniesForJob(
  organizationId: string,
  jobId: string,
): Promise<CompanyRow[]> {
  const supabase = await createClient();
  const { data: links, error: linksError } = await supabase
    .from("company_sources")
    .select("company_id")
    .eq("organization_id", organizationId)
    .eq("scrape_job_id", jobId);

  if (linksError) {
    throw new Error(linksError.message);
  }

  const companyIds = [
    ...new Set((links ?? []).map((row) => row.company_id).filter(Boolean)),
  ];

  if (companyIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("organization_id", organizationId)
    .in("id", companyIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listJobLogs(
  organizationId: string,
  jobId: string,
  limit = 100,
): Promise<ScrapeJobLogRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scrape_job_logs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("scrape_job_id", jobId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listJobResults(
  organizationId: string,
  jobId: string,
  limit = 100,
): Promise<ScrapeResultRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scrape_results")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("scrape_job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
