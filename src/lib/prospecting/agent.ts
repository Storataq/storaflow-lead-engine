/**
 * Ensure the AI Prospecting Agent is registered in the 27A agent registry.
 */

import { registerAgent, getAgentBySlug } from "@/ai/agents/registry";
import {
  PROSPECTING_AGENT_SLUG,
  PROSPECTING_AGENT_VERSION,
} from "@/lib/prospecting/constants";
import type { AiAgentRow } from "@/ai/types";

export async function ensureProspectingAgent(
  organizationId: string,
  ownerUserId?: string | null,
): Promise<AiAgentRow | null> {
  const existing = await getAgentBySlug(organizationId, PROSPECTING_AGENT_SLUG);
  if (existing && existing.deleted_at == null) {
    return existing;
  }

  return registerAgent({
    organizationId,
    slug: PROSPECTING_AGENT_SLUG,
    name: "AI Prospecting Agent",
    description:
      "Finds, researches, scores, and prepares high-quality company prospects for sales.",
    version: PROSPECTING_AGENT_VERSION,
    ownerUserId,
    isSystem: true,
    capabilities: [
      "prospect_search",
      "website_research",
      "company_analysis",
      "enrichment",
      "lead_scoring",
      "opportunity_detection",
      "crm_sync",
    ],
    tools: [
      "crm.search_companies",
      "crm.search_contacts",
      "knowledge.search",
      "memory.save",
      "memory.recall",
      "analytics.summary",
    ],
    permissions: {
      "companies:read": true,
      "companies:write": true,
      "contacts:read": true,
      "contacts:write": true,
      "deals:read": true,
      "deals:write": true,
      "tasks:read": true,
      "tasks:write": true,
      "memory:read": true,
      "memory:write": true,
      "knowledge:read": true,
      "analytics:read": true,
    },
    systemPrompt:
      "You are the Storaflow AI Prospecting Agent. Research companies using provided website and CRM context only. Never invent tenant data. Prefer Dutch when the user writes Dutch. Flag duplicates and respect GDPR/privacy.",
  });
}

export async function setProspectingAgentEnabled(
  organizationId: string,
  enabled: boolean,
): Promise<boolean> {
  const agent = await ensureProspectingAgent(organizationId);
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
        prospecting_enabled: enabled,
      },
    })
    .eq("id", agent.id)
    .eq("organization_id", organizationId);
  return !error;
}
