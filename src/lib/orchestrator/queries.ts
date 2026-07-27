/**
 * Orchestrator queries.
 */

import { ensureOrchestratorAgent } from "@/lib/orchestrator/agent";
import {
  ensureOrchestratorSettings,
  getOrchestratorDashboard,
} from "@/lib/orchestrator/engine";
import type {
  OrchestratorApprovalRow,
  OrchestratorExecutionRow,
  OrchestratorGoalRow,
  OrchestratorHistoryEventRow,
  OrchestratorPlanRow,
  OrchestratorTaskRow,
} from "@/lib/orchestrator/types";
import { createClient } from "@/lib/supabase/server";

export async function bootstrapOrchestrator(
  organizationId: string,
  userId?: string | null,
) {
  const [settings, agent] = await Promise.all([
    ensureOrchestratorSettings(organizationId),
    ensureOrchestratorAgent(organizationId, userId),
  ]);
  return { settings, agent };
}

export { getOrchestratorDashboard, ensureOrchestratorSettings };

export async function listOrchestratorGoals(organizationId: string, limit = 40) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orchestrator_goals")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as OrchestratorGoalRow[];
}

export async function listOrchestratorPlans(organizationId: string, limit = 40) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orchestrator_plans")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as OrchestratorPlanRow[];
}

export async function listOrchestratorExecutions(
  organizationId: string,
  limit = 50,
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orchestrator_executions")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as OrchestratorExecutionRow[];
}

export async function listLiveExecutions(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orchestrator_executions")
    .select("*")
    .eq("organization_id", organizationId)
    .in("status", ["queued", "running", "paused", "awaiting_approval"])
    .order("created_at", { ascending: false })
    .limit(30);
  return (data ?? []) as OrchestratorExecutionRow[];
}

export async function listFailedExecutions(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orchestrator_executions")
    .select("*")
    .eq("organization_id", organizationId)
    .in("status", ["failed", "partial", "cancelled"])
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as OrchestratorExecutionRow[];
}

export async function listOrchestratorTasks(
  organizationId: string,
  limit = 100,
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orchestrator_tasks")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as OrchestratorTaskRow[];
}

export async function listOrchestratorApprovals(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orchestrator_approvals")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as OrchestratorApprovalRow[];
}

export async function listOrchestratorHistory(
  organizationId: string,
  limit = 80,
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orchestrator_history_events")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as OrchestratorHistoryEventRow[];
}

export async function listRegisteredCollaborators(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_agents")
    .select("id, slug, name, status, version, capabilities_json, metadata_json")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("name");
  return data ?? [];
}
