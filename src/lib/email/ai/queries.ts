/**
 * Phase 21K — AI query helpers.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createServiceClient } from "@/lib/supabase/admin";

type SupabaseLike = any;

export async function listAIGenerations(input: {
  organizationId: string;
  limit?: number;
  generationType?: string;
  status?: string;
}) {
  const supabase = createServiceClient() as SupabaseLike;
  let query = supabase
    .from("email_ai_generations")
    .select(
      "id, generation_type, feature, status, approval_state, provider_code, model, confidence, warnings_json, error_message, source_template_id, source_sequence_id, source_campaign_id, duration_ms, created_at, requested_by",
    )
    .eq("organization_id", input.organizationId)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 50);

  if (input.generationType) {
    query = query.eq("generation_type", input.generationType);
  }
  if (input.status) {
    query = query.eq("approval_state", input.status);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("[email_ai] list_generations_failed", error.message);
    return [];
  }
  return data ?? [];
}

export async function getAIGenerationDetail(input: {
  organizationId: string;
  generationId: string;
}) {
  const supabase = createServiceClient() as SupabaseLike;
  const [{ data: generation }, { data: variants }] = await Promise.all([
    supabase
      .from("email_ai_generations")
      .select("*")
      .eq("organization_id", input.organizationId)
      .eq("id", input.generationId)
      .maybeSingle(),
    supabase
      .from("email_ai_generation_variants")
      .select("*")
      .eq("organization_id", input.organizationId)
      .eq("generation_id", input.generationId)
      .order("variant_index", { ascending: true }),
  ]);
  return { generation, variants: variants ?? [] };
}

export async function listBrandVoices(organizationId: string) {
  const supabase = createServiceClient() as SupabaseLike;
  const { data, error } = await supabase
    .from("email_ai_brand_voices")
    .select("*")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function listAIInsights(organizationId: string, limit = 30) {
  const supabase = createServiceClient() as SupabaseLike;
  const { data, error } = await supabase
    .from("email_ai_insights")
    .select("*")
    .eq("organization_id", organizationId)
    .order("generated_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return data ?? [];
}

export async function listAIUsageSummary(organizationId: string) {
  const supabase = createServiceClient() as SupabaseLike;
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { data } = await supabase
    .from("email_ai_usage")
    .select("estimated_cost, input_tokens, output_tokens, status, created_at")
    .eq("organization_id", organizationId)
    .gte("created_at", monthStart.toISOString());

  const rows = data ?? [];
  return {
    requests: rows.length,
    estimatedCost: rows.reduce(
      (s: number, r: any) => s + Number(r.estimated_cost ?? 0),
      0,
    ),
    inputTokens: rows.reduce(
      (s: number, r: any) => s + Number(r.input_tokens ?? 0),
      0,
    ),
    outputTokens: rows.reduce(
      (s: number, r: any) => s + Number(r.output_tokens ?? 0),
      0,
    ),
  };
}
