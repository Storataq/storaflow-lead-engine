/**
 * Customer Success queries.
 */

import { ensureCustomerSuccessAgent } from "@/lib/customer-success/agent";
import {
  ensureCsSettings,
  getCsDashboard,
  loadCustomerSignals,
} from "@/lib/customer-success/engine";
import type {
  CsAlertRow,
  CsFilters,
  CsHistoryEventRow,
  CsOnboardingRow,
  CsPlanRow,
  CsProfileRow,
  CsRecommendationRow,
  CsRenewalRow,
} from "@/lib/customer-success/types";
import { createClient } from "@/lib/supabase/server";

export async function bootstrapCustomerSuccess(
  organizationId: string,
  userId?: string | null,
) {
  const [settings, agent] = await Promise.all([
    ensureCsSettings(organizationId),
    ensureCustomerSuccessAgent(organizationId, userId),
  ]);
  return { settings, agent };
}

export { getCsDashboard, loadCustomerSignals, ensureCsSettings };

export async function listCsProfiles(
  organizationId: string,
  filters: CsFilters = {},
  limit = 100,
): Promise<CsProfileRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("customer_success_profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .order("health_score", { ascending: true })
    .limit(limit);

  if (filters.minHealth != null) q = q.gte("health_score", filters.minHealth);
  if (filters.maxHealth != null) q = q.lte("health_score", filters.maxHealth);
  if (filters.healthClass) q = q.eq("health_class", filters.healthClass);
  if (filters.minChurn != null) {
    q = q.gte("churn_probability", filters.minChurn);
  }
  if (filters.ownerUserId) q = q.eq("owner_user_id", filters.ownerUserId);
  if (filters.minConfidence != null) {
    q = q.gte("ai_confidence", filters.minConfidence);
  }

  const { data } = await q;
  return (data ?? []) as CsProfileRow[];
}

export async function listCsPlans(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("customer_success_plans")
    .select("*")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(100);
  return (data ?? []) as CsPlanRow[];
}

export async function listCsRenewals(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("customer_success_renewals")
    .select("*")
    .eq("organization_id", organizationId)
    .order("contract_ends_at", { ascending: true })
    .limit(100);
  return (data ?? []) as CsRenewalRow[];
}

export async function listCsOnboarding(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("customer_success_onboarding")
    .select("*")
    .eq("organization_id", organizationId)
    .order("progress_percent", { ascending: true })
    .limit(100);
  return (data ?? []) as CsOnboardingRow[];
}

export async function listCsRecommendations(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("customer_success_recommendations")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "open")
    .order("priority", { ascending: false })
    .limit(100);
  return (data ?? []) as CsRecommendationRow[];
}

export async function listCsAlerts(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("customer_success_alerts")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []) as CsAlertRow[];
}

export async function listCsHistory(organizationId: string, limit = 100) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("customer_success_history_events")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as CsHistoryEventRow[];
}

export async function listCustomerCompanies(
  organizationId: string,
  filters: CsFilters = {},
) {
  const supabase = await createClient();
  let q = supabase
    .from("companies")
    .select(
      "id, company_name, status, industry, country, updated_at, intelligence_score",
    )
    .eq("organization_id", organizationId)
    .eq("status", "customer")
    .order("company_name", { ascending: true })
    .limit(100);

  if (filters.country) q = q.eq("country", filters.country);
  if (filters.industry) q = q.ilike("industry", `%${filters.industry}%`);
  if (filters.q) q = q.ilike("company_name", `%${filters.q}%`);

  const { data } = await q;
  return data ?? [];
}
