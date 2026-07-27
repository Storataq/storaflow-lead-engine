/**
 * Approval engine — autonomy levels per org / agent / run.
 */

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export {
  resolveEffectiveApprovalMode,
  requiresHumanApproval,
} from "@/ai/approvals/policy";

export async function requestApproval(params: {
  organizationId: string;
  runId: string;
  taskId?: string | null;
  requestedBy?: string | null;
  actionSummary: string;
  payload?: Record<string, unknown>;
}): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_approvals")
    .insert({
      organization_id: params.organizationId,
      run_id: params.runId,
      task_id: params.taskId ?? null,
      requested_by: params.requestedBy ?? null,
      status: "pending",
      action_summary: params.actionSummary,
      payload_json: (params.payload ?? {}) as Json,
    })
    .select("id")
    .single();
  if (error) return null;
  return data.id as string;
}

export async function resolveApproval(params: {
  organizationId: string;
  approvalId: string;
  reviewerUserId: string;
  decision: "approved" | "rejected";
  note?: string;
}): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_approvals")
    .update({
      status: params.decision,
      reviewed_by: params.reviewerUserId,
      review_note: params.note ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", params.approvalId)
    .eq("organization_id", params.organizationId)
    .eq("status", "pending");
  return !error;
}
