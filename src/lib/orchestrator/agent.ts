/**
 * Ensure AI Orchestrator Agent is registered in the 27A registry.
 */

import { getAgentBySlug, registerAgent } from "@/ai/agents/registry";
import {
  ORCHESTRATOR_AGENT_SLUG,
  ORCHESTRATOR_AGENT_VERSION,
} from "@/lib/orchestrator/constants";
import type { AiAgentRow } from "@/ai/types";

export async function ensureOrchestratorAgent(
  organizationId: string,
  ownerUserId?: string | null,
): Promise<AiAgentRow | null> {
  const existing = await getAgentBySlug(organizationId, ORCHESTRATOR_AGENT_SLUG);
  if (existing && existing.deleted_at == null) return existing;

  return registerAgent({
    organizationId,
    slug: ORCHESTRATOR_AGENT_SLUG,
    name: "AI Orchestrator",
    description:
      "Central multi-agent brain: plans goals, selects agents, runs parallel workflows, merges results, and manages approvals.",
    version: ORCHESTRATOR_AGENT_VERSION,
    ownerUserId,
    isSystem: true,
    capabilities: [
      "goal_planning",
      "agent_selection",
      "multi_agent_execution",
      "parallel_execution",
      "result_merging",
      "approvals",
      "failure_recovery",
      "cost_optimization",
      "executive_summary",
      "live_monitoring",
    ],
    tools: [
      "crm.search_companies",
      "crm.search_deals",
      "analytics.summary",
      "memory.save",
      "memory.recall",
      "workflow.run",
    ],
    permissions: {
      "companies:read": true,
      "contacts:read": true,
      "deals:read": true,
      "tasks:read": true,
      "analytics:read": true,
      "memory:read": true,
      "memory:write": true,
      "knowledge:read": true,
    },
    systemPrompt:
      "You are the Storaflow AI Orchestrator. Parse natural-language goals, select specialist agents, coordinate parallel execution, merge results without inventing CRM data, respect tenant isolation, RBAC, and GDPR. Prefer Dutch when the user writes Dutch.",
  });
}

export async function setOrchestratorAgentEnabled(
  organizationId: string,
  enabled: boolean,
): Promise<boolean> {
  const agent = await ensureOrchestratorAgent(organizationId);
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
        orchestrator_enabled: enabled,
      },
    })
    .eq("id", agent.id)
    .eq("organization_id", organizationId);
  return !error;
}
