import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

export type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];

export async function listCompanies(
  organizationId: string,
  limit = 200,
): Promise<CompanyRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function countCompanies(organizationId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("companies")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function getCompany(
  organizationId: string,
  companyId: string,
): Promise<CompanyRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", companyId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function listCompanySources(
  organizationId: string,
  companyId: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_sources")
    .select("id, source_url, source_type, discovered_at, scrape_job_id, metadata_json")
    .eq("organization_id", organizationId)
    .eq("company_id", companyId)
    .order("discovered_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
