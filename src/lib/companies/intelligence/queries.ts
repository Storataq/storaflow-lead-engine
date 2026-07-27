/**
 * Read helpers for company intelligence profiles and runs.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  CompanyIntelligenceProfileRow,
  CompanyIntelligenceRunRow,
} from "@/lib/companies/intelligence/types";

export async function getCompanyIntelligenceProfile(
  organizationId: string,
  companyId: string,
): Promise<CompanyIntelligenceProfileRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_intelligence_profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getLatestIntelligenceRun(
  organizationId: string,
  companyId: string,
): Promise<CompanyIntelligenceRunRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_intelligence_runs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function listRecentIntelligenceRuns(
  organizationId: string,
  companyId: string,
  limit = 10,
): Promise<CompanyIntelligenceRunRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_intelligence_runs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}
