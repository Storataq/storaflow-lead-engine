/**
 * Resource accessors for /api/v1 — org-scoped via service client.
 */

import { createServiceClient } from "@/lib/supabase/admin";
import {
  parseListQuery,
  paginationMeta,
  type ListQuery,
} from "@/lib/platform-api/list-query";
import { publishPlatformEvent } from "@/lib/platform-api/event-bus";
import type { Json } from "@/types/supabase";

function applyCommonFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  q: any,
  query: ListQuery,
  opts?: {
    nameColumn?: string;
    statusColumn?: string;
    ownerColumn?: string | null;
  },
) {
  const nameCol = opts?.nameColumn ?? "name";
  const statusCol = opts?.statusColumn ?? "status";
  if (query.q) q = q.ilike(nameCol, `%${query.q}%`);
  if (query.status) q = q.eq(statusCol, query.status);
  if (query.country) q = q.eq("country", query.country);
  if (query.industry) q = q.eq("industry", query.industry);
  if (query.createdAfter) q = q.gte("created_at", query.createdAfter);
  if (query.createdBefore) q = q.lte("created_at", query.createdBefore);
  const ownerCol = opts?.ownerColumn;
  if (query.ownerId && ownerCol) q = q.eq(ownerCol, query.ownerId);
  return q;
}

export async function listCompaniesApi(
  organizationId: string,
  url: URL,
) {
  const query = parseListQuery(url);
  const supabase = createServiceClient();
  const from = (query.page - 1) * query.pageSize;
  let q = supabase
    .from("companies")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId);
  q = applyCommonFilters(q, query, { nameColumn: "company_name" });
  q = q
    .order(query.sort === "name" ? "company_name" : query.sort, {
      ascending: query.order === "asc",
    })
    .range(from, from + query.pageSize - 1);
  const { data, error, count } = await q;
  if (error) throw new Error(error.message);
  return {
    items: data ?? [],
    meta: paginationMeta({
      page: query.page,
      pageSize: query.pageSize,
      total: count ?? 0,
      nextCursor: null,
    }),
  };
}

export async function getCompanyApi(
  organizationId: string,
  id: string,
) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

function normalizeCompanyName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function createCompanyApi(
  organizationId: string,
  body: Record<string, unknown>,
) {
  const supabase = createServiceClient();
  const companyName = String(body.name ?? body.company_name ?? "Untitled").trim();
  const { data, error } = await supabase
    .from("companies")
    .insert({
      organization_id: organizationId,
      company_name: companyName,
      normalized_company_name: normalizeCompanyName(companyName),
      website_url: body.website
        ? String(body.website)
        : body.website_url
          ? String(body.website_url)
          : null,
      country: body.country ? String(body.country) : null,
      city: body.city ? String(body.city) : null,
      industry: body.industry ? String(body.industry) : null,
      status: (body.status as
        | "new"
        | "reviewed"
        | "qualified"
        | "not_relevant"
        | "contacted"
        | "customer"
        | "blocked"
        | undefined) ?? "new",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  await publishPlatformEvent({
    organizationId,
    eventType: "company.created",
    payload: { id: data.id, name: data.company_name },
  });
  return data;
}

export async function updateCompanyApi(
  organizationId: string,
  id: string,
  body: Record<string, unknown>,
) {
  const supabase = createServiceClient();
  const patch: {
    company_name?: string;
    normalized_company_name?: string;
    website_url?: string | null;
    country?: string | null;
    city?: string | null;
    industry?: string | null;
    status?:
      | "new"
      | "reviewed"
      | "qualified"
      | "not_relevant"
      | "contacted"
      | "customer"
      | "blocked";
  } = {};
  if (body.name !== undefined || body.company_name !== undefined) {
    const companyName = String(body.name ?? body.company_name);
    patch.company_name = companyName;
    patch.normalized_company_name = normalizeCompanyName(companyName);
  }
  if (body.website !== undefined || body.website_url !== undefined) {
    patch.website_url = body.website != null || body.website_url != null
      ? String(body.website ?? body.website_url)
      : null;
  }
  if (body.country !== undefined) {
    patch.country = body.country == null ? null : String(body.country);
  }
  if (body.city !== undefined) {
    patch.city = body.city == null ? null : String(body.city);
  }
  if (body.industry !== undefined) {
    patch.industry = body.industry == null ? null : String(body.industry);
  }
  if (body.status !== undefined) {
    patch.status = body.status as typeof patch.status;
  }
  const { data, error } = await supabase
    .from("companies")
    .update(patch)
    .eq("organization_id", organizationId)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) {
    await publishPlatformEvent({
      organizationId,
      eventType: "company.updated",
      payload: { id: data.id, name: data.company_name },
    });
  }
  return data;
}

export async function deleteCompanyApi(
  organizationId: string,
  id: string,
) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("companies")
    .delete()
    .eq("organization_id", organizationId)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) {
    await publishPlatformEvent({
      organizationId,
      eventType: "company.deleted",
      payload: { id },
    });
  }
  return data;
}

export async function listContactsApi(organizationId: string, url: URL) {
  const query = parseListQuery(url);
  const supabase = createServiceClient();
  const from = (query.page - 1) * query.pageSize;
  let q = supabase
    .from("crm_lead_contacts")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId);
  if (query.q) {
    q = q.or(
      `first_name.ilike.%${query.q}%,last_name.ilike.%${query.q}%,email.ilike.%${query.q}%`,
    );
  }
  if (query.status) q = q.eq("intelligence_status", query.status);
  q = q
    .order(query.sort === "name" ? "last_name" : query.sort, {
      ascending: query.order === "asc",
    })
    .range(from, from + query.pageSize - 1);
  const { data, error, count } = await q;
  if (error) throw new Error(error.message);
  return {
    items: data ?? [],
    meta: paginationMeta({
      page: query.page,
      pageSize: query.pageSize,
      total: count ?? 0,
    }),
  };
}

export async function listDealsApi(organizationId: string, url: URL) {
  const query = parseListQuery(url);
  const supabase = createServiceClient();
  const from = (query.page - 1) * query.pageSize;
  let q = supabase
    .from("crm_deals")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId);
  q = applyCommonFilters(q, query, {
    nameColumn: "title",
    ownerColumn: "owner_user_id",
  });
  q = q
    .order(query.sort, { ascending: query.order === "asc" })
    .range(from, from + query.pageSize - 1);
  const { data, error, count } = await q;
  if (error) throw new Error(error.message);
  return {
    items: data ?? [],
    meta: paginationMeta({
      page: query.page,
      pageSize: query.pageSize,
      total: count ?? 0,
    }),
  };
}

export async function listTasksApi(organizationId: string, url: URL) {
  const query = parseListQuery(url);
  const supabase = createServiceClient();
  const from = (query.page - 1) * query.pageSize;
  let q = supabase
    .from("crm_tasks")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId);
  q = applyCommonFilters(q, query, {
    nameColumn: "title",
    ownerColumn: "assigned_user_id",
  });
  q = q
    .order(query.sort, { ascending: query.order === "asc" })
    .range(from, from + query.pageSize - 1);
  const { data, error, count } = await q;
  if (error) throw new Error(error.message);
  return {
    items: data ?? [],
    meta: paginationMeta({
      page: query.page,
      pageSize: query.pageSize,
      total: count ?? 0,
    }),
  };
}

export async function listCampaignsApi(organizationId: string, url: URL) {
  const query = parseListQuery(url);
  const supabase = createServiceClient();
  const from = (query.page - 1) * query.pageSize;
  let q = supabase
    .from("email_campaigns")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId);
  q = applyCommonFilters(q, query, { ownerColumn: "owner_user_id" });
  q = q
    .order(query.sort, { ascending: query.order === "asc" })
    .range(from, from + query.pageSize - 1);
  const { data, error, count } = await q;
  if (error) throw new Error(error.message);
  return {
    items: data ?? [],
    meta: paginationMeta({
      page: query.page,
      pageSize: query.pageSize,
      total: count ?? 0,
    }),
  };
}

export async function listAutomationsApi(organizationId: string, url: URL) {
  const query = parseListQuery(url);
  const supabase = createServiceClient();
  const from = (query.page - 1) * query.pageSize;
  let q = supabase
    .from("crm_automations")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId);
  q = applyCommonFilters(q, query);
  q = q
    .order(query.sort, { ascending: query.order === "asc" })
    .range(from, from + query.pageSize - 1);
  const { data, error, count } = await q;
  if (error) {
    // Table may not exist if migration pending
    if (error.message.includes("crm_automations")) {
      return {
        items: [],
        meta: paginationMeta({ page: 1, pageSize: query.pageSize, total: 0 }),
      };
    }
    throw new Error(error.message);
  }
  return {
    items: data ?? [],
    meta: paginationMeta({
      page: query.page,
      pageSize: query.pageSize,
      total: count ?? 0,
    }),
  };
}

export async function listReportsApi(organizationId: string, url: URL) {
  const query = parseListQuery(url);
  const supabase = createServiceClient();
  const from = (query.page - 1) * query.pageSize;
  let q = supabase
    .from("crm_executive_reports")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId);
  q = applyCommonFilters(q, query, { nameColumn: "name" });
  q = q
    .order(query.sort, { ascending: query.order === "asc" })
    .range(from, from + query.pageSize - 1);
  const { data, error, count } = await q;
  if (error) {
    if (error.message.includes("crm_executive_reports")) {
      return {
        items: [],
        meta: paginationMeta({ page: 1, pageSize: query.pageSize, total: 0 }),
      };
    }
    throw new Error(error.message);
  }
  return {
    items: data ?? [],
    meta: paginationMeta({
      page: query.page,
      pageSize: query.pageSize,
      total: count ?? 0,
    }),
  };
}

export async function listLeadScoresApi(organizationId: string, url: URL) {
  const query = parseListQuery(url);
  const supabase = createServiceClient();
  const from = (query.page - 1) * query.pageSize;
  let q = supabase
    .from("crm_leads")
    .select(
      "id, organization_id, company_id, status, lead_score, ai_lead_score, score_classification, owner_user_id, updated_at, created_at",
      { count: "exact" },
    )
    .eq("organization_id", organizationId);
  if (query.leadScoreMin != null && !Number.isNaN(query.leadScoreMin)) {
    q = q.gte("ai_lead_score", query.leadScoreMin);
  }
  if (query.leadScoreMax != null && !Number.isNaN(query.leadScoreMax)) {
    q = q.lte("ai_lead_score", query.leadScoreMax);
  }
  if (query.status) {
    q = q.eq("status", query.status as "open" | "won" | "lost" | "archived");
  }
  if (query.ownerId) q = q.eq("owner_user_id", query.ownerId);
  q = q
    .order("ai_lead_score", { ascending: query.order === "asc", nullsFirst: false })
    .range(from, from + query.pageSize - 1);
  const { data, error, count } = await q;
  if (error) throw new Error(error.message);
  return {
    items: data ?? [],
    meta: paginationMeta({
      page: query.page,
      pageSize: query.pageSize,
      total: count ?? 0,
    }),
  };
}

export async function getCompanyIntelligenceApi(
  organizationId: string,
  companyId: string,
) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("company_intelligence_profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) {
    if (error.message.includes("company_intelligence")) return null;
    throw new Error(error.message);
  }
  return data;
}

export async function getContactIntelligenceApi(
  organizationId: string,
  contactId: string,
) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("contact_intelligence_profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("contact_id", contactId)
    .maybeSingle();
  if (error) {
    if (error.message.includes("contact_intelligence")) return null;
    throw new Error(error.message);
  }
  return data;
}

export async function getAnalyticsSummaryApi(organizationId: string) {
  const supabase = createServiceClient();
  const [companies, deals, tasks] = await Promise.all([
    supabase
      .from("companies")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("crm_deals")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("crm_tasks")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
  ]);
  return {
    companies: companies.count ?? 0,
    deals: deals.count ?? 0,
    tasks: tasks.count ?? 0,
    generatedAt: new Date().toISOString(),
  };
}

export async function runBulkOperationApi(input: {
  organizationId: string;
  operation: string;
  resource: string;
  ids?: string[];
  payload?: Record<string, unknown>;
}) {
  const supabase = createServiceClient();
  const ids = input.ids ?? [];
  const result: Record<string, unknown> = {
    operation: input.operation,
    resource: input.resource,
    requested: ids.length,
    affected: 0,
    status: "accepted",
    note: "Bulk jobs are accepted synchronously for small batches; large jobs should use the queue worker.",
  };

  if (input.resource === "companies" && input.operation === "delete" && ids.length) {
    const { data, error } = await supabase
      .from("companies")
      .delete()
      .eq("organization_id", input.organizationId)
      .in("id", ids.slice(0, 100))
      .select("id");
    if (error) throw new Error(error.message);
    result.affected = data?.length ?? 0;
    for (const row of data ?? []) {
      await publishPlatformEvent({
        organizationId: input.organizationId,
        eventType: "company.deleted",
        payload: { id: row.id, bulk: true },
      });
    }
  } else if (
    input.resource === "companies" &&
    input.operation === "update" &&
    ids.length &&
    input.payload
  ) {
    const { data, error } = await supabase
      .from("companies")
      .update(input.payload as { status?: "new" | "reviewed" | "qualified" | "not_relevant" | "contacted" | "customer" | "blocked"; industry?: string | null; country?: string | null })
      .eq("organization_id", input.organizationId)
      .in("id", ids.slice(0, 100))
      .select("id");
    if (error) throw new Error(error.message);
    result.affected = data?.length ?? 0;
  } else if (input.operation === "export") {
    result.status = "queued";
    result.note = "Export queued — download via /exports UI (placeholder job id).";
    result.jobId = `bulk_export_${Date.now()}`;
  } else {
    result.status = "accepted";
    result.note = `Bulk ${input.operation} scaffolded for ${input.resource}; extend resource adapters as needed.`;
    result.payload = (input.payload ?? {}) as Json;
  }

  return result;
}
