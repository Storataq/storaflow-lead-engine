/**
 * Phase 25D — AI Email Campaign Builder queries.
 */

import { createClient } from "@/lib/supabase/server";
import {
  emptyWorkflowGraph,
  parseWorkflowGraph,
} from "@/lib/email/campaign-builder/graph";
import type {
  AiBrief,
  CalendarMetadata,
  WorkflowGraph,
} from "@/lib/email/campaign-builder/types";
import type { EmailCampaignRow } from "@/lib/email/campaign/queries";
import type { Database, Json } from "@/types/supabase";

export type EmailAbTestRow =
  Database["public"]["Tables"]["email_campaign_ab_tests"]["Row"];
export type EmailAbVariantRow =
  Database["public"]["Tables"]["email_campaign_ab_variants"]["Row"];
export type EmailSubjectScoreRow =
  Database["public"]["Tables"]["email_ai_subject_scores"]["Row"];
export type EmailChannelPlanRow =
  Database["public"]["Tables"]["email_campaign_channel_plans"]["Row"];

export type BuilderCampaignFilters = {
  query?: string;
  status?: string;
  type?: string;
  ownerUserId?: string;
  tag?: string;
  industry?: string;
  country?: string;
  leadScoreMin?: number;
  dateFrom?: string;
  dateTo?: string;
};

export function parseAiBrief(value: Json | null | undefined): AiBrief {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as AiBrief;
}

export function parseCalendarMetadata(
  value: Json | null | undefined,
): CalendarMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as CalendarMetadata;
}

export function getCampaignWorkflowGraph(
  campaign: EmailCampaignRow,
): WorkflowGraph {
  const graph = parseWorkflowGraph(campaign.workflow_graph_json);
  if (graph.nodes.length === 0) return emptyWorkflowGraph();
  return graph;
}

export async function listCampaignAbTests(
  organizationId: string,
  campaignId: string,
): Promise<(EmailAbTestRow & { variants: EmailAbVariantRow[] })[]> {
  const supabase = await createClient();
  const { data: tests, error } = await supabase
    .from("email_campaign_ab_tests")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  if (!tests?.length) return [];

  const ids = tests.map((t) => t.id);
  const { data: variants, error: vErr } = await supabase
    .from("email_campaign_ab_variants")
    .select("*")
    .eq("organization_id", organizationId)
    .in("ab_test_id", ids);
  if (vErr) throw new Error(vErr.message);

  return tests.map((test) => ({
    ...test,
    variants: (variants ?? []).filter((v) => v.ab_test_id === test.id),
  }));
}

export async function listSubjectScores(
  organizationId: string,
  campaignId?: string | null,
  limit = 24,
): Promise<EmailSubjectScoreRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("email_ai_subject_scores")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (campaignId) query = query.eq("campaign_id", campaignId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listChannelPlans(
  organizationId: string,
  campaignId: string,
): Promise<EmailChannelPlanRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_campaign_channel_plans")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("campaign_id", campaignId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listCampaignsForCalendar(
  organizationId: string,
): Promise<EmailCampaignRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_campaigns")
    .select("*")
    .eq("organization_id", organizationId)
    .order("scheduled_for", { ascending: true, nullsFirst: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export function filterBuilderCampaigns(
  campaigns: EmailCampaignRow[],
  filters: BuilderCampaignFilters,
): EmailCampaignRow[] {
  return campaigns.filter((row) => {
    if (filters.status && filters.status !== "all" && row.status !== filters.status) {
      return false;
    }
    if (filters.type && filters.type !== "all" && row.campaign_type !== filters.type) {
      return false;
    }
    if (
      filters.ownerUserId &&
      filters.ownerUserId !== "all" &&
      row.owner_user_id !== filters.ownerUserId
    ) {
      return false;
    }
    if (filters.tag?.trim()) {
      const tag = filters.tag.trim().toLowerCase();
      if (!(row.tags ?? []).some((t) => t.toLowerCase() === tag)) return false;
    }
    if (filters.dateFrom && row.scheduled_for) {
      if (row.scheduled_for < filters.dateFrom) return false;
    }
    if (filters.dateTo && row.scheduled_for) {
      if (row.scheduled_for > filters.dateTo) return false;
    }
    if (filters.query?.trim()) {
      const needle = filters.query.trim().toLowerCase();
      const hay = [
        row.name,
        row.description ?? "",
        row.objective ?? "",
        row.campaign_type,
        row.status,
        ...(row.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    // industry / country / leadScore filter against audience JSON when present
    const audience =
      row.audience_definition_json &&
      typeof row.audience_definition_json === "object" &&
      !Array.isArray(row.audience_definition_json)
        ? (row.audience_definition_json as Record<string, unknown>)
        : {};
    if (filters.industry?.trim()) {
      const industries = Array.isArray(audience.industries)
        ? audience.industries.map(String)
        : [];
      if (
        industries.length > 0 &&
        !industries.some(
          (i) => i.toLowerCase() === filters.industry!.trim().toLowerCase(),
        )
      ) {
        return false;
      }
    }
    if (filters.country?.trim()) {
      const countries = Array.isArray(audience.countries)
        ? audience.countries.map(String)
        : [];
      if (
        countries.length > 0 &&
        !countries.some(
          (c) => c.toLowerCase() === filters.country!.trim().toLowerCase(),
        )
      ) {
        return false;
      }
    }
    if (typeof filters.leadScoreMin === "number") {
      const minScore =
        typeof audience.minLeadScore === "number"
          ? audience.minLeadScore
          : typeof audience.leadScoreMin === "number"
            ? audience.leadScoreMin
            : null;
      if (minScore != null && minScore < filters.leadScoreMin) return false;
    }
    return true;
  });
}

export function buildCampaignPerformanceWidgets(campaigns: EmailCampaignRow[]) {
  const byStatus = (status: string) =>
    campaigns.filter((c) => c.status === status).length;

  const upcoming = campaigns
    .filter((c) => c.scheduled_for && ["scheduled", "approved", "ready"].includes(c.status))
    .sort((a, b) =>
      String(a.scheduled_for).localeCompare(String(b.scheduled_for)),
    )
    .slice(0, 8);

  const best = [...campaigns]
    .filter((c) => c.status === "completed" || c.status === "running")
    .sort((a, b) => b.readiness_score - a.readiness_score)
    .slice(0, 5);

  const topEmails = [...campaigns]
    .filter((c) => c.template_subject_snapshot)
    .sort((a, b) => b.valid_recipient_count - a.valid_recipient_count)
    .slice(0, 5)
    .map((c) => ({
      campaignId: c.id,
      campaignName: c.name,
      subject: c.template_subject_snapshot!,
      recipients: c.valid_recipient_count,
    }));

  return {
    active: byStatus("running") + byStatus("scheduled"),
    completed: byStatus("completed"),
    draft: byStatus("draft"),
    paused: byStatus("paused"),
    upcoming,
    bestPerforming: best,
    topEmails,
  };
}
