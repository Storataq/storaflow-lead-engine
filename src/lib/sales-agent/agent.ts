/**
 * Ensure AI Sales Agent is registered in the 27A registry.
 */

import { getAgentBySlug, registerAgent } from "@/ai/agents/registry";
import {
  SALES_AGENT_SLUG,
  SALES_AGENT_VERSION,
} from "@/lib/sales-agent/constants";
import type { AiAgentRow } from "@/ai/types";

export async function ensureSalesAgent(
  organizationId: string,
  ownerUserId?: string | null,
): Promise<AiAgentRow | null> {
  const existing = await getAgentBySlug(organizationId, SALES_AGENT_SLUG);
  if (existing && existing.deleted_at == null) return existing;

  return registerAgent({
    organizationId,
    slug: SALES_AGENT_SLUG,
    name: "AI Sales Agent",
    description:
      "Personal AI sales manager for priorities, follow-ups, forecasting, coaching, and deal risk.",
    version: SALES_AGENT_VERSION,
    ownerUserId,
    isSystem: true,
    capabilities: [
      "daily_briefing",
      "deal_analysis",
      "priority_engine",
      "forecast",
      "risk_detection",
      "email_assistant",
      "meeting_assistant",
      "task_generation",
      "crm_sync",
    ],
    tools: [
      "crm.search_deals",
      "crm.list_tasks",
      "crm.search_companies",
      "crm.search_contacts",
      "memory.save",
      "memory.recall",
      "analytics.summary",
    ],
    permissions: {
      "companies:read": true,
      "contacts:read": true,
      "contacts:write": true,
      "deals:read": true,
      "deals:write": true,
      "tasks:read": true,
      "tasks:write": true,
      "memory:read": true,
      "memory:write": true,
      "analytics:read": true,
    },
    systemPrompt:
      "You are the Storaflow AI Sales Agent. Prioritize real CRM deals, never invent pipeline data, respect tenant isolation and GDPR. Prefer Dutch when the user writes Dutch.",
  });
}

export async function setSalesAgentEnabled(
  organizationId: string,
  enabled: boolean,
): Promise<boolean> {
  const agent = await ensureSalesAgent(organizationId);
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
        sales_agent_enabled: enabled,
      },
    })
    .eq("id", agent.id)
    .eq("organization_id", organizationId);
  return !error;
}
