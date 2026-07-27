/**
 * Multi-agent workflow engine — configurable agent chains.
 */

import type { AiWorkflowRow } from "@/ai/types";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export type WorkflowStep = {
  agentSlug: string;
  inputFrom?: "user" | "previous";
  approvalMode?: string;
};

export type WorkflowDefinition = {
  steps: WorkflowStep[];
};

export async function upsertWorkflow(params: {
  organizationId: string;
  slug: string;
  name: string;
  description?: string;
  definition: WorkflowDefinition;
  createdBy?: string | null;
  status?: string;
}): Promise<AiWorkflowRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_workflows")
    .upsert(
      {
        organization_id: params.organizationId,
        slug: params.slug,
        name: params.name,
        description: params.description ?? "",
        definition_json: params.definition as unknown as Json,
        status: params.status ?? "active",
        created_by: params.createdBy ?? null,
        deleted_at: null,
      },
      { onConflict: "organization_id,slug" },
    )
    .select("*")
    .single();
  if (error) return null;
  return data as AiWorkflowRow;
}

export function parseWorkflowDefinition(
  json: Json,
): WorkflowDefinition | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const steps = (json as { steps?: unknown }).steps;
  if (!Array.isArray(steps)) return null;
  const parsed: WorkflowStep[] = [];
  for (const step of steps) {
    if (!step || typeof step !== "object") continue;
    const slug = (step as { agentSlug?: unknown }).agentSlug;
    if (typeof slug !== "string" || !slug) continue;
    parsed.push({
      agentSlug: slug,
      inputFrom:
        (step as { inputFrom?: "user" | "previous" }).inputFrom ?? "previous",
      approvalMode: (step as { approvalMode?: string }).approvalMode,
    });
  }
  return { steps: parsed };
}

export async function listWorkflows(
  organizationId: string,
): Promise<AiWorkflowRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_workflows")
    .select("*")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("name");
  return (data ?? []) as AiWorkflowRow[];
}
