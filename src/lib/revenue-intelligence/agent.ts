/**
 * Ensure AI Revenue Intelligence Agent is registered in the 27A registry.
 */

import { getAgentBySlug, registerAgent } from "@/ai/agents/registry";
import {
  REVENUE_AGENT_SLUG,
  REVENUE_AGENT_VERSION,
} from "@/lib/revenue-intelligence/constants";
import type { AiAgentRow } from "@/ai/types";

export async function ensureRevenueIntelligenceAgent(
  organizationId: string,
  ownerUserId?: string | null,
): Promise<AiAgentRow | null> {
  const existing = await getAgentBySlug(organizationId, REVENUE_AGENT_SLUG);
  if (existing && existing.deleted_at == null) return existing;

  return registerAgent({
    organizationId,
    slug: REVENUE_AGENT_SLUG,
    name: "AI Revenue Intelligence Agent",
    description:
      "Financial intelligence for MRR/ARR, forecasting, pipeline, churn, expansion, scenarios, and executive advice.",
    version: REVENUE_AGENT_VERSION,
    ownerUserId,
    isSystem: true,
    capabilities: [
      "revenue_analysis",
      "forecasting",
      "pipeline_forecast",
      "kpi_engine",
      "growth_analysis",
      "churn_analysis",
      "expansion",
      "scenarios",
      "executive_reports",
      "alerts",
    ],
    tools: [
      "crm.search_deals",
      "crm.search_companies",
      "analytics.summary",
      "memory.save",
      "memory.recall",
    ],
    permissions: {
      "companies:read": true,
      "deals:read": true,
      "analytics:read": true,
      "memory:read": true,
      "memory:write": true,
    },
    systemPrompt:
      "You are the Storaflow AI Revenue Intelligence Agent. Compute KPIs from real CRM and billing data, never invent revenue figures, respect tenant isolation and GDPR. Prefer Dutch when the user writes Dutch.",
  });
}

export async function setRevenueIntelligenceAgentEnabled(
  organizationId: string,
  enabled: boolean,
): Promise<boolean> {
  const agent = await ensureRevenueIntelligenceAgent(organizationId);
  if (!agent) return false;
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_agents")
    .update({
      status: enabled ? "idle" : "paused",
      metadata_json: {
        ...(typeof agent.metadata_json === "object" &&
        agent.metadata_json &&
        !Array.isArray(agent.metadata_json)
          ? agent.metadata_json
          : {}),
        revenue_intelligence_enabled: enabled,
      },
    })
    .eq("id", agent.id)
    .eq("organization_id", organizationId);
  return !error;
}
