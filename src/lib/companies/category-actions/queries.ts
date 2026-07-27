import { createClient } from "@/lib/supabase/server";
import type {
  CategoryActivityItem,
  CategoryCompanyListItem,
  CategoryInsights,
  CategoryOverviewStats,
} from "@/lib/companies/category-actions/types";

export async function listCompaniesInCategory(
  organizationId: string,
  categoryId: string,
): Promise<
  Array<{
    id: string;
    company_name: string;
    website_url: string | null;
    city: string | null;
    country: string | null;
    status: string;
    industry: string | null;
    first_found_at: string;
    category_confidence: number | null;
    category_needs_review: boolean;
  }>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select(
      "id, company_name, website_url, city, country, status, industry, first_found_at, category_confidence, category_needs_review",
    )
    .eq("organization_id", organizationId)
    .eq("company_category_id", categoryId)
    .order("company_name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCategoryOverviewStats(
  organizationId: string,
  categoryId: string,
): Promise<CategoryOverviewStats> {
  const supabase = await createClient();
  const companies = await listCompaniesInCategory(organizationId, categoryId);
  const companyIds = companies.map((c) => c.id);

  if (companyIds.length === 0) {
    return {
      companies: 0,
      contacts: 0,
      qualifiedLeads: 0,
      campaignReady: 0,
      emailCampaigns: 0,
      funnelsActivated: 0,
      openTasks: 0,
      lastActivityAt: null,
    };
  }

  const [
    contactsRes,
    leadsRes,
    readinessRes,
    funnelRes,
    tasksRes,
    activityRes,
    campaignsRes,
  ] = await Promise.all([
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("company_id", companyIds),
    supabase
      .from("crm_leads")
      .select("id, status, company_id")
      .eq("organization_id", organizationId)
      .in("company_id", companyIds),
    supabase
      .from("campaign_readiness")
      .select("id, status, company_id")
      .eq("organization_id", organizationId)
      .in("company_id", companyIds),
    supabase
      .from("funnel_activation_runs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("source_company_category_id", categoryId),
    supabase
      .from("crm_tasks")
      .select("id, status, lead_id")
      .eq("organization_id", organizationId)
      .in("status", ["todo", "in_progress"])
      .limit(500),
    supabase
      .from("activity_events")
      .select("created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("email_campaigns")
      .select("id, audience_definition_json, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const leads = leadsRes.data ?? [];
  const leadIds = new Set(leads.map((l) => l.id));
  const qualifiedLeads = leads.filter((l) => l.status === "open").length;

  const campaignReady = (readinessRes.data ?? []).filter(
    (r) => r.status === "ready" || r.status === "ready_with_review",
  ).length;

  const openTasks = (tasksRes.data ?? []).filter(
    (t) => t.lead_id && leadIds.has(t.lead_id),
  ).length;

  let emailCampaigns = 0;
  for (const campaign of campaignsRes.data ?? []) {
    const audience = campaign.audience_definition_json;
    if (!audience || typeof audience !== "object" || Array.isArray(audience)) {
      continue;
    }
    const def = audience as Record<string, unknown>;
    const cats = def.companyCategoryIds;
    if (
      Array.isArray(cats) &&
      cats.some((id) => typeof id === "string" && id === categoryId)
    ) {
      emailCampaigns += 1;
    }
  }

  return {
    companies: companies.length,
    contacts: contactsRes.count ?? 0,
    qualifiedLeads,
    campaignReady,
    emailCampaigns,
    funnelsActivated: funnelRes.count ?? 0,
    openTasks,
    lastActivityAt: activityRes.data?.[0]?.created_at ?? null,
  };
}

export async function listCategoryCompaniesDetailed(
  organizationId: string,
  categoryId: string,
): Promise<CategoryCompanyListItem[]> {
  const supabase = await createClient();
  const companies = await listCompaniesInCategory(organizationId, categoryId);
  if (companies.length === 0) return [];

  const companyIds = companies.map((c) => c.id);
  const [{ data: leads }, { data: readiness }] = await Promise.all([
    supabase
      .from("crm_leads")
      .select("id, company_id, status, owner_user_id, tags")
      .eq("organization_id", organizationId)
      .in("company_id", companyIds),
    supabase
      .from("campaign_readiness")
      .select("company_id, status")
      .eq("organization_id", organizationId)
      .in("company_id", companyIds),
  ]);

  const leadByCompany = new Map<
    string,
    {
      id: string;
      status: string;
      owner_user_id: string | null;
      tags: string[] | null;
    }
  >();
  for (const lead of leads ?? []) {
    if (!lead.company_id) continue;
    if (!leadByCompany.has(lead.company_id)) {
      leadByCompany.set(lead.company_id, lead);
    }
  }

  const readyByCompany = new Map<string, string>();
  for (const row of readiness ?? []) {
    if (!row.company_id) continue;
    readyByCompany.set(row.company_id, row.status);
  }

  return companies.map((company) => {
    const lead = leadByCompany.get(company.id);
    const readyStatus = readyByCompany.get(company.id) ?? null;
    return {
      ...company,
      leadId: lead?.id ?? null,
      leadStatus: lead?.status ?? null,
      ownerUserId: lead?.owner_user_id ?? null,
      tags: lead?.tags ?? [],
      campaignReady:
        readyStatus === "ready" || readyStatus === "ready_with_review",
      campaignReadyStatus: readyStatus,
    };
  });
}

export async function getCategoryInsights(
  organizationId: string,
  categoryId: string,
): Promise<CategoryInsights> {
  const stats = await getCategoryOverviewStats(organizationId, categoryId);
  const supabase = await createClient();
  const companies = await listCompaniesInCategory(organizationId, categoryId);
  const companyIds = companies.map((c) => c.id);

  let wonDeals = 0;
  let meetings = 0;
  if (companyIds.length) {
    const { data: leads } = await supabase
      .from("crm_leads")
      .select("id, status")
      .eq("organization_id", organizationId)
      .in("company_id", companyIds);
    const leadIds = (leads ?? []).map((l) => l.id);
    wonDeals = (leads ?? []).filter((l) => l.status === "won").length;

    if (leadIds.length) {
      const { count } = await supabase
        .from("crm_tasks")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .in("lead_id", leadIds)
        .ilike("title", "%meeting%");
      meetings = count ?? 0;
    }
  }

  const conversionEstimate =
    stats.companies > 0
      ? Math.round((wonDeals / stats.companies) * 1000) / 10
      : null;

  return {
    companies: stats.companies,
    contacts: stats.contacts,
    campaigns: stats.emailCampaigns,
    funnels: stats.funnelsActivated,
    conversionEstimate,
    openRate: null,
    replyRate: null,
    meetings,
    wonDeals,
  };
}

export async function listCategoryRecentActivity(
  organizationId: string,
  categoryId: string,
  limit = 20,
): Promise<CategoryActivityItem[]> {
  const supabase = await createClient();
  const items: CategoryActivityItem[] = [];

  const { data: actionRuns } = await supabase
    .from("company_category_action_runs")
    .select("id, action_type, company_count, created_at, status")
    .eq("organization_id", organizationId)
    .eq("company_category_id", categoryId)
    .order("created_at", { ascending: false })
    .limit(10);

  for (const run of actionRuns ?? []) {
    items.push({
      id: run.id,
      kind: "category_action",
      title: run.action_type.replaceAll("_", " "),
      description: `${run.company_count} companies · ${run.status}`,
      at: run.created_at,
    });
  }

  const companies = await listCompaniesInCategory(organizationId, categoryId);
  const companyIds = companies.map((c) => c.id).slice(0, 80);
  if (companyIds.length) {
    const { data: funnelRuns } = await supabase
      .from("funnel_activation_runs")
      .select("id, status, trigger_source, created_at, company_id")
      .eq("organization_id", organizationId)
      .in("company_id", companyIds)
      .order("created_at", { ascending: false })
      .limit(10);

    for (const run of funnelRuns ?? []) {
      items.push({
        id: run.id,
        kind: "funnel",
        title: "Funnel activation",
        description: `${run.trigger_source} · ${run.status}`,
        at: run.created_at,
      });
    }

    const { data: leads } = await supabase
      .from("crm_leads")
      .select("id, company_name, updated_at, status")
      .eq("organization_id", organizationId)
      .in("company_id", companyIds)
      .order("updated_at", { ascending: false })
      .limit(10);

    for (const lead of leads ?? []) {
      items.push({
        id: lead.id,
        kind: "crm",
        title: lead.company_name,
        description: `Lead status: ${lead.status}`,
        at: lead.updated_at,
      });
    }
  }

  return items
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}
