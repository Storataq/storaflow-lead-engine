/**
 * Cost ledger — realtime AI spend by org / user / agent / day.
 */

import { createClient } from "@/lib/supabase/server";
import type { AiCostLedgerRow } from "@/ai/types";
import type { Json } from "@/types/supabase";

export async function recordCost(params: {
  organizationId: string;
  userId?: string | null;
  agentId?: string | null;
  runId?: string | null;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = await createClient();
  const dayKey = new Date().toISOString().slice(0, 10);
  await supabase.from("ai_cost_ledger").insert({
    organization_id: params.organizationId,
    user_id: params.userId ?? null,
    agent_id: params.agentId ?? null,
    run_id: params.runId ?? null,
    provider: params.provider,
    model: params.model,
    tokens_in: params.tokensIn,
    tokens_out: params.tokensOut,
    cost_usd: params.costUsd,
    day_key: dayKey,
    metadata_json: (params.metadata ?? {}) as Json,
  });
}

export async function sumCost(params: {
  organizationId: string;
  fromDay?: string;
  toDay?: string;
}): Promise<number> {
  const supabase = await createClient();
  let q = supabase
    .from("ai_cost_ledger")
    .select("cost_usd")
    .eq("organization_id", params.organizationId);
  if (params.fromDay) q = q.gte("day_key", params.fromDay);
  if (params.toDay) q = q.lte("day_key", params.toDay);
  const { data } = await q;
  return (data ?? []).reduce(
    (sum, row) => sum + Number(row.cost_usd ?? 0),
    0,
  );
}

export async function listCostLedger(
  organizationId: string,
  limit = 50,
): Promise<AiCostLedgerRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_cost_ledger")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AiCostLedgerRow[];
}
