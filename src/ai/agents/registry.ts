/**
 * Agent registry + lifecycle transitions.
 */

import { SYSTEM_AGENT_SLUG, type AgentLifecycleStatus } from "@/ai/constants";
import { emitAiEvent } from "@/ai/events/bus";
import type { AiAgentRow } from "@/ai/types";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

const ALLOWED_TRANSITIONS: Record<AgentLifecycleStatus, AgentLifecycleStatus[]> =
  {
    created: ["idle", "cancelled"],
    idle: ["planning", "running", "paused", "cancelled"],
    planning: ["waiting", "running", "needs_approval", "failed", "cancelled"],
    waiting: ["running", "needs_approval", "paused", "cancelled", "failed"],
    running: [
      "waiting",
      "needs_approval",
      "paused",
      "retrying",
      "failed",
      "completed",
      "cancelled",
    ],
    needs_approval: ["running", "paused", "cancelled", "failed", "completed"],
    paused: ["idle", "running", "cancelled"],
    retrying: ["running", "failed", "cancelled"],
    failed: ["idle", "retrying", "cancelled"],
    completed: ["idle"],
    cancelled: ["idle"],
  };

export function canTransition(
  from: AgentLifecycleStatus,
  to: AgentLifecycleStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function registerAgent(params: {
  organizationId: string;
  slug: string;
  name: string;
  description?: string;
  version?: string;
  ownerUserId?: string | null;
  capabilities?: string[];
  tools?: string[];
  permissions?: Record<string, boolean>;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  approvalMode?: string;
  systemPrompt?: string;
  isSystem?: boolean;
}): Promise<AiAgentRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_agents")
    .upsert(
      {
        organization_id: params.organizationId,
        slug: params.slug,
        name: params.name,
        description: params.description ?? "",
        version: params.version ?? "1.0.0",
        status: "idle",
        owner_user_id: params.ownerUserId ?? null,
        capabilities_json: (params.capabilities ?? []) as Json,
        tools_json: (params.tools ?? []) as Json,
        permissions_json: (params.permissions ?? {
          "companies:read": true,
          "contacts:read": true,
          "deals:read": true,
          "tasks:read": true,
          "memory:read": true,
          "memory:write": true,
          "knowledge:read": true,
          "analytics:read": true,
        }) as Json,
        provider: params.provider ?? "openai",
        model: params.model ?? "gpt-4.1-mini",
        temperature: params.temperature ?? 0.3,
        max_tokens: params.maxTokens ?? 4096,
        timeout_ms: params.timeoutMs ?? 60_000,
        approval_mode: params.approvalMode ?? "approval_required",
        system_prompt:
          params.systemPrompt ??
          "You are a Storaflow AI agent. Be precise, cite CRM facts, and never invent tenant data.",
        is_system: params.isSystem ?? false,
        deleted_at: null,
      },
      { onConflict: "organization_id,slug" },
    )
    .select("*")
    .single();

  if (error || !data) return null;

  await emitAiEvent({
    organizationId: params.organizationId,
    eventType: "agent.registered",
    agentId: data.id,
    payload: { slug: params.slug, version: params.version ?? "1.0.0" },
  });

  return data as AiAgentRow;
}

export async function ensureSystemKernelAgent(
  organizationId: string,
  ownerUserId?: string | null,
): Promise<AiAgentRow | null> {
  return registerAgent({
    organizationId,
    slug: SYSTEM_AGENT_SLUG,
    name: "Storaflow Kernel Assistant",
    description:
      "System agent that powers the AI Agent Platform kernel for CRM-aware assistance.",
    version: "1.0.0",
    ownerUserId,
    isSystem: true,
    capabilities: ["planning", "tools", "memory", "knowledge"],
    tools: [
      "crm.search_companies",
      "crm.search_contacts",
      "crm.search_deals",
      "crm.list_tasks",
      "memory.save",
      "memory.recall",
      "knowledge.search",
      "analytics.summary",
    ],
    systemPrompt:
      "You are the Storaflow Kernel Assistant for a multi-tenant CRM. Use only provided context and tool results. Refuse cross-tenant requests. Prefer Dutch when the user writes Dutch.",
  });
}

export async function setAgentStatus(params: {
  organizationId: string;
  agentId: string;
  from: AgentLifecycleStatus;
  to: AgentLifecycleStatus;
}): Promise<boolean> {
  if (!canTransition(params.from, params.to)) return false;
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_agents")
    .update({ status: params.to })
    .eq("id", params.agentId)
    .eq("organization_id", params.organizationId)
    .eq("status", params.from)
    .is("deleted_at", null);

  if (error) return false;

  await emitAiEvent({
    organizationId: params.organizationId,
    eventType: "agent.status_changed",
    agentId: params.agentId,
    payload: { from: params.from, to: params.to },
  });
  return true;
}

export async function listAgents(
  organizationId: string,
): Promise<AiAgentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("name");
  return (data ?? []) as AiAgentRow[];
}

export async function getAgentBySlug(
  organizationId: string,
  slug: string,
): Promise<AiAgentRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();
  return (data as AiAgentRow | null) ?? null;
}
