/**
 * Campaign Manager queries (Phase 21C).
 */

import { createClient } from "@/lib/supabase/server";
import {
  matchesAudienceDefinition,
  summarizeAudienceCandidates,
  paginateAudiencePreview,
  type CampaignAudienceDefinition,
  type AudienceCandidate,
  type AudiencePreview,
} from "@/lib/email/campaign/audience-builder";
import {
  collectDuplicateEmailSet,
  dedupeAudienceCandidates,
} from "@/lib/email/campaign/eligibility";
import { normalizeSuppressionEmail } from "@/lib/email/suppression";
import { createDefaultCampaignReadyAudience } from "@/lib/email/audience";
import type { Database, Json } from "@/types/supabase";

export type EmailCampaignRow =
  Database["public"]["Tables"]["email_campaigns"]["Row"];
export type EmailSenderProfileRow =
  Database["public"]["Tables"]["email_sender_profiles"]["Row"];
export type EmailCampaignApprovalRow =
  Database["public"]["Tables"]["email_campaign_approvals"]["Row"];
export type EmailCampaignValidationRow =
  Database["public"]["Tables"]["email_campaign_validations"]["Row"];
export type EmailCampaignActivityRow =
  Database["public"]["Tables"]["email_campaign_activities"]["Row"];
export type EmailRecipientRow =
  Database["public"]["Tables"]["email_recipients"]["Row"];

export type CampaignListFilters = {
  query?: string;
  status?: string;
  type?: string;
  language?: string;
  ownerUserId?: string;
  templateId?: string;
};

export function parseAudienceDefinition(
  value: Json,
): CampaignAudienceDefinition {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      ...createDefaultCampaignReadyAudience().filter,
      source: "campaign_ready",
    };
  }
  return value as CampaignAudienceDefinition;
}

export function parseCampaignSettings(value: Json): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export async function listEmailCampaigns(
  organizationId: string,
  filters: CampaignListFilters = {},
): Promise<EmailCampaignRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("email_campaigns")
    .select("*")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.type && filters.type !== "all") {
    query = query.eq("campaign_type", filters.type);
  }
  if (filters.language && filters.language !== "all") {
    query = query.eq("language", filters.language);
  }
  if (filters.ownerUserId && filters.ownerUserId !== "all") {
    query = query.eq("owner_user_id", filters.ownerUserId);
  }
  if (filters.templateId && filters.templateId !== "all") {
    query = query.eq("template_id", filters.templateId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let rows = data ?? [];
  if (filters.query?.trim()) {
    const needle = filters.query.trim().toLowerCase();
    rows = rows.filter((row) => {
      const hay = [
        row.name,
        row.description ?? "",
        row.objective ?? "",
        row.campaign_type,
        row.status,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }
  return rows;
}

export async function getEmailCampaign(
  organizationId: string,
  campaignId: string,
): Promise<EmailCampaignRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_campaigns")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", campaignId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getCampaignDashboardStats(organizationId: string) {
  const campaigns = await listEmailCampaigns(organizationId);
  const byStatus = (status: string) =>
    campaigns.filter((c) => c.status === status).length;

  const withBlocking = campaigns.filter((c) => {
    const v = c.last_validation_json;
    if (!v || typeof v !== "object" || Array.isArray(v)) return false;
    const summary = (v as { summary?: { hasBlocking?: boolean } }).summary;
    return Boolean(summary?.hasBlocking);
  }).length;

  const scores = campaigns.map((c) => c.readiness_score);
  const avg =
    scores.length === 0
      ? 0
      : Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  return {
    draft: byStatus("draft"),
    needsReview: byStatus("needs_review"),
    ready: byStatus("ready"),
    approved: byStatus("approved"),
    totalEligible: campaigns.reduce((n, c) => n + c.valid_recipient_count, 0),
    totalExcluded: campaigns.reduce((n, c) => n + c.excluded_recipient_count, 0),
    withBlockingErrors: withBlocking,
    averageReadinessScore: avg,
    total: campaigns.length,
  };
}

export async function listSenderProfiles(
  organizationId: string,
): Promise<EmailSenderProfileRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_sender_profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listActiveTemplatesForCampaign(
  organizationId: string,
  language?: string | null,
) {
  const supabase = await createClient();
  let query = supabase
    .from("email_templates")
    .select(
      "id, name, category, language, version, status, updated_at, variables, subject",
    )
    .eq("organization_id", organizationId)
    .in("status", ["active", "draft"])
    .order("updated_at", { ascending: false })
    .limit(100);
  if (language) query = query.eq("language", language);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).filter(
    (t) => t.status !== "archived" && t.status !== "deprecated",
  );
}

export async function listCampaignRecipients(
  organizationId: string,
  campaignId: string,
  limit = 100,
): Promise<EmailRecipientRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_recipients")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listCampaignActivities(
  organizationId: string,
  campaignId: string,
  limit = 50,
): Promise<EmailCampaignActivityRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_campaign_activities")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listCampaignApprovals(
  organizationId: string,
  campaignId: string,
): Promise<EmailCampaignApprovalRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_campaign_approvals")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listCampaignValidations(
  organizationId: string,
  campaignId: string,
  limit = 10,
): Promise<EmailCampaignValidationRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_campaign_validations")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function loadSuppressedEmails(
  organizationId: string,
): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("email_suppressions")
    .select("email_normalized, status")
    .eq("organization_id", organizationId)
    .neq("status", "active")
    .limit(5000);
  return new Set((data ?? []).map((r) => r.email_normalized));
}

async function loadAudienceCandidates(
  organizationId: string,
  definition: CampaignAudienceDefinition,
): Promise<AudienceCandidate[]> {
  const supabase = await createClient();

  const { data: readiness, error } = await supabase
    .from("campaign_readiness")
    .select("*")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);
  const rows = readiness ?? [];
  if (rows.length === 0) return [];

  const leadIds = [...new Set(rows.map((r) => r.lead_id))];
  const { data: leads } = await supabase
    .from("crm_leads")
    .select(
      "id, company_name, owner_user_id, source, industry, city, country, tags, email, contact_name, notes, lead_score, ai_lead_score",
    )
    .eq("organization_id", organizationId)
    .in("id", leadIds);

  const leadMap = new Map((leads ?? []).map((l) => [l.id, l]));

  const companyIds = [
    ...new Set(
      rows
        .map((r) => r.company_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const companyCategoryMap = new Map<string, string | null>();
  if (companyIds.length) {
    const { data: companies } = await supabase
      .from("companies")
      .select("id, company_category_id")
      .eq("organization_id", organizationId)
      .in("id", companyIds);
    for (const company of companies ?? []) {
      companyCategoryMap.set(company.id, company.company_category_id);
    }
  }

  const candidates: AudienceCandidate[] = [];
  for (const row of rows) {
    const lead = leadMap.get(row.lead_id);
    const personalizationRaw = row.personalization_json;
    const personalization: Record<string, string | null> = {};
    if (
      personalizationRaw &&
      typeof personalizationRaw === "object" &&
      !Array.isArray(personalizationRaw)
    ) {
      for (const [k, v] of Object.entries(personalizationRaw)) {
        personalization[k] = v == null ? null : String(v);
      }
    }
    if (!personalization.companyName) {
      personalization.companyName =
        lead?.company_name ?? row.preferred_name ?? null;
    }
    if (!personalization.email) {
      personalization.email = row.preferred_email;
    }

    candidates.push({
      leadId: row.lead_id,
      companyId: row.company_id,
      companyCategoryId: row.company_id
        ? companyCategoryMap.get(row.company_id) ?? null
        : null,
      contactId: row.contact_id,
      companyName: lead?.company_name ?? "Unknown",
      preferredEmail: row.preferred_email ?? lead?.email ?? null,
      preferredName: row.preferred_name ?? lead?.contact_name ?? null,
      language: null,
      ownerUserId: lead?.owner_user_id ?? null,
      source: lead?.source ?? null,
      readinessStatus: row.status,
      approvalStatus: row.approval_status,
      salesPriority: row.sales_priority,
      personalizationStatus: row.personalization_status,
      qualificationScore: row.qualification_score,
      opportunityScore: row.opportunity_score,
      priorityScore: row.priority_score,
      leadScore: Number(lead?.ai_lead_score ?? lead?.lead_score ?? 0) || 0,
      industry: lead?.industry ?? null,
      city: lead?.city ?? null,
      country: lead?.country ?? null,
      tags: lead?.tags ?? [],
      personalization,
    });
  }

  return candidates.filter((c) => matchesAudienceDefinition(c, definition));
}

export async function previewCampaignAudience(input: {
  organizationId: string;
  definition: CampaignAudienceDefinition;
  page?: number;
  pageSize?: number;
}): Promise<AudiencePreview> {
  const matched = await loadAudienceCandidates(
    input.organizationId,
    input.definition,
  );
  const suppressed = await loadSuppressedEmails(input.organizationId);
  const duplicateEmails = collectDuplicateEmailSet(matched);
  const { statistics, exclusions } = summarizeAudienceCandidates({
    candidates: matched,
    suppressedEmails: suppressed,
    duplicateEmails,
  });

  return paginateAudiencePreview({
    candidates: matched,
    exclusions,
    statistics,
    page: input.page,
    pageSize: input.pageSize,
  });
}

export async function buildEligibleAudienceForSnapshot(input: {
  organizationId: string;
  definition: CampaignAudienceDefinition;
  campaignLanguage?: string | null;
}) {
  const matched = await loadAudienceCandidates(
    input.organizationId,
    input.definition,
  );
  const suppressed = await loadSuppressedEmails(input.organizationId);
  const deduped = dedupeAudienceCandidates(matched);

  return {
    matched,
    suppressed,
    deduped,
    kept: deduped.filter((d) => d.kept),
  };
}

export type SuppressionLookup = Map<
  string,
  { status: string; reason: string }
>;

export async function loadSuppressionLookup(
  organizationId: string,
): Promise<SuppressionLookup> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("email_suppressions")
    .select("email_normalized, status, reason")
    .eq("organization_id", organizationId)
    .limit(5000);
  const map: SuppressionLookup = new Map();
  for (const row of data ?? []) {
    map.set(row.email_normalized, {
      status: row.status,
      reason: row.reason,
    });
  }
  return map;
}

export function lookupSuppressionStatus(
  lookup: SuppressionLookup,
  email: string | null,
): string {
  if (!email) return "active";
  const hit = lookup.get(normalizeSuppressionEmail(email));
  if (!hit) return "active";
  return hit.status === "active" ? "active" : hit.status;
}
