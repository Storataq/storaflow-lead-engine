/**
 * Ensure AI Marketing Agent is registered in the 27A registry.
 */

import { getAgentBySlug, registerAgent } from "@/ai/agents/registry";
import {
  MARKETING_AGENT_SLUG,
  MARKETING_AGENT_VERSION,
} from "@/lib/marketing-agent/constants";
import type { AiAgentRow } from "@/ai/types";

export async function ensureMarketingAgent(
  organizationId: string,
  ownerUserId?: string | null,
): Promise<AiAgentRow | null> {
  const existing = await getAgentBySlug(organizationId, MARKETING_AGENT_SLUG);
  if (existing && existing.deleted_at == null) return existing;

  return registerAgent({
    organizationId,
    slug: MARKETING_AGENT_SLUG,
    name: "AI Marketing Agent",
    description:
      "AI marketing manager for campaigns, segments, content, automation, A/B tests, and optimization.",
    version: MARKETING_AGENT_VERSION,
    ownerUserId,
    isSystem: true,
    capabilities: [
      "campaign_builder",
      "segmentation",
      "content_generation",
      "email_generation",
      "social_content",
      "landing_analysis",
      "ab_testing",
      "marketing_automation",
      "lead_nurturing",
      "analytics",
      "optimization",
    ],
    tools: [
      "crm.search_companies",
      "crm.search_contacts",
      "crm.search_deals",
      "crm.list_tasks",
      "memory.save",
      "memory.recall",
      "analytics.summary",
    ],
    permissions: {
      "companies:read": true,
      "contacts:read": true,
      "contacts:write": true,
      "deals:read": true,
      "tasks:read": true,
      "tasks:write": true,
      "memory:read": true,
      "memory:write": true,
      "analytics:read": true,
    },
    systemPrompt:
      "You are the Storaflow AI Marketing Agent. Build real campaigns from CRM and email data, never invent metrics, respect tenant isolation, brand voice, GDPR and approval modes. Prefer Dutch when the user writes Dutch.",
  });
}

export async function setMarketingAgentEnabled(
  organizationId: string,
  enabled: boolean,
): Promise<boolean> {
  const agent = await ensureMarketingAgent(organizationId);
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
        marketing_agent_enabled: enabled,
      },
    })
    .eq("id", agent.id)
    .eq("organization_id", organizationId);
  return !error;
}
