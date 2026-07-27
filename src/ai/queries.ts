/**
 * AI Platform queries (server).
 */

import { ensureSystemKernelAgent } from "@/ai/agents/registry";
import { ensureOrgAiSettings } from "@/ai/kernel/execute";
import { getMonitoringSnapshot } from "@/ai/monitoring/dashboard";
import type {
  AiAgentRow,
  AiApprovalRow,
  AiCostLedgerRow,
  AiEventRow,
  AiExecutionLogRow,
  AiKnowledgeDocumentRow,
  AiMemoryEntryRow,
  AiOrgSettingsRow,
  AiPromptTemplateRow,
  AiRunRow,
  AiTaskRow,
  AiToolDefinitionRow,
  AiWorkflowRow,
  MonitoringSnapshot,
} from "@/ai/types";
import { createClient } from "@/lib/supabase/server";

export async function bootstrapAiPlatform(
  organizationId: string,
  userId?: string | null,
): Promise<{ settings: AiOrgSettingsRow; agent: AiAgentRow | null }> {
  const settings = await ensureOrgAiSettings(organizationId);
  const agent = await ensureSystemKernelAgent(organizationId, userId);
  // Ensure prospecting agent is registerable alongside the kernel (Phase 27B).
  try {
    const { ensureProspectingAgent } = await import(
      "@/lib/prospecting/agent"
    );
    await ensureProspectingAgent(organizationId, userId);
  } catch {
    /* prospecting module optional until migration applied */
  }
  try {
    const { ensureSalesAgent } = await import("@/lib/sales-agent/agent");
    await ensureSalesAgent(organizationId, userId);
  } catch {
    /* sales agent optional until migration applied */
  }
  try {
    const { ensureCustomerSuccessAgent } = await import(
      "@/lib/customer-success/agent"
    );
    await ensureCustomerSuccessAgent(organizationId, userId);
  } catch {
    /* customer success optional until migration applied */
  }
  try {
    const { ensureRevenueIntelligenceAgent } = await import(
      "@/lib/revenue-intelligence/agent"
    );
    await ensureRevenueIntelligenceAgent(organizationId, userId);
  } catch {
    /* revenue intelligence optional until migration applied */
  }
  try {
    const { ensureOrchestratorAgent } = await import(
      "@/lib/orchestrator/agent"
    );
    await ensureOrchestratorAgent(organizationId, userId);
  } catch {
    /* orchestrator optional until migration applied */
  }
  return { settings, agent };
}

export async function getAiOverview(organizationId: string): Promise<{
  monitoring: MonitoringSnapshot;
  recentRuns: AiRunRow[];
  pendingApprovals: AiApprovalRow[];
}> {
  const supabase = await createClient();
  const [monitoring, runs, approvals] = await Promise.all([
    getMonitoringSnapshot(organizationId),
    supabase
      .from("ai_runs")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("ai_approvals")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return {
    monitoring,
    recentRuns: (runs.data ?? []) as AiRunRow[],
    pendingApprovals: (approvals.data ?? []) as AiApprovalRow[],
  };
}

export async function listAiAgents(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("name");
  return (data ?? []) as AiAgentRow[];
}

export async function listAiTasks(organizationId: string, limit = 50) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_tasks")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AiTaskRow[];
}

export async function listAiWorkflows(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_workflows")
    .select("*")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("name");
  return (data ?? []) as AiWorkflowRow[];
}

export async function listAiMemory(organizationId: string, limit = 50) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_memory_entries")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AiMemoryEntryRow[];
}

export async function listAiKnowledge(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_knowledge_documents")
    .select("*")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);
  return (data ?? []) as AiKnowledgeDocumentRow[];
}

export async function listAiPrompts(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_prompt_templates")
    .select("*")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("slug")
    .order("version", { ascending: false });
  return (data ?? []) as AiPromptTemplateRow[];
}

export async function listAiTools(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_tool_definitions")
    .select("*")
    .eq("is_active", true)
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
    .order("tool_key");
  return (data ?? []) as AiToolDefinitionRow[];
}

export async function listAiCosts(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_cost_ledger")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []) as AiCostLedgerRow[];
}

export async function listAiLogs(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_execution_logs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []) as AiExecutionLogRow[];
}

export async function listAiEvents(organizationId: string, limit = 50) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_events")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AiEventRow[];
}

export async function getAiOrgSettings(organizationId: string) {
  return ensureOrgAiSettings(organizationId);
}

export async function getAiRun(
  organizationId: string,
  runId: string,
): Promise<AiRunRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_runs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", runId)
    .maybeSingle();
  return (data as AiRunRow | null) ?? null;
}
