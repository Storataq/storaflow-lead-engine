/**
 * Persist contact intelligence profiles + run history + contact denorm.
 */

import type { IntelligenceSource } from "@/lib/crm/contact-intelligence/constants";
import type { ContactIntelligenceResult } from "@/lib/crm/contact-intelligence/types";
import type { Json } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

function asJson(value: unknown): Json {
  return value as Json;
}

export async function applyContactIntelligenceResult(
  supabase: Client,
  input: {
    organizationId: string;
    contactId: string;
    leadId: string;
    result: ContactIntelligenceResult;
    source: IntelligenceSource;
    actorUserId?: string | null;
    durationMs?: number | null;
    errorMessage?: string | null;
    status?: "completed" | "failed";
  },
) {
  const now = new Date().toISOString();
  const status = input.status ?? "completed";

  const profilePayload = {
    organization_id: input.organizationId,
    contact_id: input.contactId,
    lead_id: input.leadId,
    status,
    summary_json: asJson(input.result.summary),
    profile_json: asJson(input.result.profile),
    decision_maker_json: asJson(input.result.decisionMaker),
    communication_json: asJson(input.result.communication),
    health_json: asJson(input.result.health),
    quality_json: asJson(input.result.quality),
    timeline_json: asJson(input.result.timeline),
    insights_json: asJson(input.result.insights),
    recommendations_json: asJson(input.result.recommendations),
    badges_json: asJson(input.result.badges),
    signals_json: asJson(input.result.signalsSummary),
    health_score: input.result.health.score,
    quality_score: input.result.quality.score,
    confidence: input.result.confidence,
    needs_review: input.result.needsReview,
    provider: input.result.provider,
    model: input.result.model,
    analyzed_by: input.result.analyzedBy,
    source: input.source,
    actor_user_id: input.actorUserId ?? null,
    error_message: input.errorMessage ?? null,
    analyzed_at: now,
    updated_at: now,
  };

  const { data: existing } = await supabase
    .from("contact_intelligence_profiles")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("contact_id", input.contactId)
    .maybeSingle();

  let profileId: string | null = existing?.id ?? null;

  if (existing?.id) {
    const { error } = await supabase
      .from("contact_intelligence_profiles")
      .update(profilePayload)
      .eq("id", existing.id)
      .eq("organization_id", input.organizationId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase
      .from("contact_intelligence_profiles")
      .insert(profilePayload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    profileId = data.id;
  }

  const { error: runError } = await supabase
    .from("contact_intelligence_runs")
    .insert({
      organization_id: input.organizationId,
      contact_id: input.contactId,
      lead_id: input.leadId,
      profile_id: profileId,
      status,
      input_summary_json: asJson(input.result.signalsSummary),
      output_json: asJson({
        healthScore: input.result.health.score,
        qualityScore: input.result.quality.score,
        confidence: input.result.confidence,
        isDecisionMaker: input.result.decisionMaker.isDecisionMaker,
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

  const { error: contactError } = await supabase
    .from("crm_lead_contacts")
    .update({
      health_score: input.result.health.score,
      quality_score: input.result.quality.score,
      intelligence_confidence: input.result.confidence,
      intelligence_status: status === "completed" ? "completed" : "failed",
      intelligence_analyzed_at: now,
      intelligence_needs_review: input.result.needsReview,
      is_decision_maker: input.result.decisionMaker.isDecisionMaker,
      department: input.result.profile.department,
      management_level: input.result.profile.managementLevel,
      decision_maker_level: input.result.profile.decisionMakerLevel,
      preferred_channel: input.result.communication.preferredChannel,
      primary_language: input.result.profile.primaryLanguage,
      country: input.result.profile.country,
      badges_json: asJson(input.result.badges),
    })
    .eq("organization_id", input.organizationId)
    .eq("id", input.contactId);

  if (contactError) throw new Error(contactError.message);

  return { profileId };
}

export async function markContactIntelligenceProcessing(
  supabase: Client,
  organizationId: string,
  contactId: string,
) {
  await supabase
    .from("crm_lead_contacts")
    .update({ intelligence_status: "processing" })
    .eq("organization_id", organizationId)
    .eq("id", contactId);

  const { data: existing } = await supabase
    .from("contact_intelligence_profiles")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("contact_id", contactId)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("contact_intelligence_profiles")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  }
}
