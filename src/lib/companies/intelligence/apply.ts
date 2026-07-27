/**
 * Persist company intelligence profiles + run history.
 */

import type { IntelligenceSource } from "@/lib/companies/intelligence/constants";
import type { CompanyIntelligenceResult } from "@/lib/companies/intelligence/types";
import type { Json } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

function asJson(value: unknown): Json {
  return value as Json;
}

export async function applyIntelligenceResult(
  supabase: Client,
  input: {
    organizationId: string;
    companyId: string;
    result: CompanyIntelligenceResult;
    source: IntelligenceSource;
    actorUserId?: string | null;
    durationMs?: number | null;
    errorMessage?: string | null;
    status?: "completed" | "failed";
  },
) {
  const now = new Date().toISOString();
  const status = input.status ?? "completed";
  const analyzedBy = input.result.analyzedBy;

  const profilePayload = {
    organization_id: input.organizationId,
    company_id: input.companyId,
    status,
    summary_json: asJson(input.result.summary),
    business_profile_json: asJson(input.result.businessProfile),
    online_presence_json: asJson(input.result.onlinePresence),
    insights_json: asJson(input.result.insights),
    health_json: asJson(input.result.health),
    lead_potential_json: asJson(input.result.leadPotential),
    contact_quality_json: asJson(input.result.contactQuality),
    growth_signals_json: asJson(input.result.growthSignals),
    recommendations_json: asJson(input.result.recommendations),
    signals_json: asJson(input.result.signalsSummary),
    health_score: input.result.health.score,
    lead_potential_score: input.result.leadPotential.score,
    confidence: input.result.confidence,
    needs_review: input.result.needsReview,
    provider: input.result.provider,
    model: input.result.model,
    analyzed_by: analyzedBy,
    source: input.source,
    actor_user_id: input.actorUserId ?? null,
    error_message: input.errorMessage ?? null,
    analyzed_at: now,
    updated_at: now,
  };

  const { data: existing } = await supabase
    .from("company_intelligence_profiles")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("company_id", input.companyId)
    .maybeSingle();

  let profileId: string | null = existing?.id ?? null;

  if (existing?.id) {
    const { error } = await supabase
      .from("company_intelligence_profiles")
      .update(profilePayload)
      .eq("id", existing.id)
      .eq("organization_id", input.organizationId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase
      .from("company_intelligence_profiles")
      .insert(profilePayload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    profileId = data.id;
  }

  const { error: runError } = await supabase
    .from("company_intelligence_runs")
    .insert({
      organization_id: input.organizationId,
      company_id: input.companyId,
      profile_id: profileId,
      status,
      input_summary_json: asJson(input.result.signalsSummary),
      output_json: asJson({
        healthScore: input.result.health.score,
        leadScore: input.result.leadPotential.score,
        confidence: input.result.confidence,
        temperature: input.result.leadPotential.temperature,
        band: input.result.health.band,
      }),
      error_message: input.errorMessage ?? null,
      provider: input.result.provider,
      model: input.result.model,
      duration_ms: input.durationMs ?? null,
      actor_user_id: input.actorUserId ?? null,
      source: input.source,
      completed_at: now,
    });

  if (runError) throw new Error(runError.message);

  const { error: companyError } = await supabase
    .from("companies")
    .update({
      intelligence_score: input.result.health.score,
      lead_potential_score: input.result.leadPotential.score,
      intelligence_status: status === "completed" ? "completed" : "failed",
      intelligence_analyzed_at: now,
      intelligence_needs_review: input.result.needsReview,
    })
    .eq("organization_id", input.organizationId)
    .eq("id", input.companyId);

  if (companyError) throw new Error(companyError.message);

  return { profileId };
}

export async function markIntelligenceProcessing(
  supabase: Client,
  organizationId: string,
  companyId: string,
) {
  await supabase
    .from("companies")
    .update({ intelligence_status: "processing" })
    .eq("organization_id", organizationId)
    .eq("id", companyId);

  const { data: existing } = await supabase
    .from("company_intelligence_profiles")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("company_intelligence_profiles")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  }
}
