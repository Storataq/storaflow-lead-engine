/**
 * Ensure AI Customer Success Agent is registered in the 27A registry.
 */

import { getAgentBySlug, registerAgent } from "@/ai/agents/registry";
import { CS_AGENT_SLUG, CS_AGENT_VERSION } from "@/lib/customer-success/constants";
import type { AiAgentRow } from "@/ai/types";

export async function ensureCustomerSuccessAgent(
  organizationId: string,
  ownerUserId?: string | null,
): Promise<AiAgentRow | null> {
  const existing = await getAgentBySlug(organizationId, CS_AGENT_SLUG);
  if (existing && existing.deleted_at == null) return existing;

  return registerAgent({
    organizationId,
    slug: CS_AGENT_SLUG,
    name: "AI Customer Success Agent",
    description:
      "Personal CS manager for health scores, churn, renewals, onboarding, upsell, and success plans.",
    version: CS_AGENT_VERSION,
    ownerUserId,
    isSystem: true,
    capabilities: [
      "health_scoring",
      "churn_prediction",
      "renewal_management",
      "onboarding",
      "upsell_detection",
      "success_plans",
      "alerts",
      "crm_sync",
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
      "You are the Storaflow AI Customer Success Agent. Use real CRM and billing signals, never invent health metrics, respect tenant isolation and GDPR. Prefer Dutch when the user writes Dutch.",
  });
}

export async function setCustomerSuccessAgentEnabled(
  organizationId: string,
  enabled: boolean,
): Promise<boolean> {
  const agent = await ensureCustomerSuccessAgent(organizationId);
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
        customer_success_agent_enabled: enabled,
      },
    })
    .eq("id", agent.id)
    .eq("organization_id", organizationId);
  return !error;
}
