/**
 * Persist lead scoring profiles, history, alerts, and denorm fields.
 */

import { emitPipelineAutomationEvent } from "@/lib/crm/pipeline/automation";
import type { LeadScoringResult } from "@/lib/crm/lead-scoring/types";
import type { Json } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

function asJson(value: unknown): Json {
  return value as Json;
}

export async function applyLeadScoringResult(
  supabase: Client,
  input: {
    organizationId: string;
    leadId: string;
    companyId?: string | null;
    result: LeadScoringResult;
    source?: string;
    actorUserId?: string | null;
    reason?: string;
  },
) {
  const now = new Date().toISOString();
  const source = input.source ?? "manual";

  const { data: existing } = await supabase
    .from("lead_scoring_profiles")
    .select("id, overall_score, classification, opportunity_band, risk_score")
    .eq("organization_id", input.organizationId)
    .eq("entity_type", "lead")
    .eq("lead_id", input.leadId)
    .maybeSingle();

  const oldScore =
    existing?.overall_score != null ? Number(existing.overall_score) : null;
  const newScore = input.result.overallScore;
  const delta =
    oldScore == null ? null : Math.round((newScore - oldScore) * 100) / 100;

  const profilePayload = {
    organization_id: input.organizationId,
    entity_type: "lead" as const,
    lead_id: input.leadId,
    company_id: input.companyId ?? null,
    overall_score: newScore,
    classification: input.result.classification,
    opportunity_band: input.result.opportunityBand,
    opportunity_confidence: input.result.opportunityConfidence,
    risk_score: input.result.riskScore,
    buying_readiness: input.result.buyingReadiness,
    confidence: input.result.confidence,
    category_scores_json: asJson(input.result.categoryScores),
    sub_scores_json: asJson(input.result.subScores),
    explanations_json: asJson(input.result.explanations),
    risks_json: asJson(input.result.risks),
    next_best_actions_json: asJson(input.result.nextBestActions),
    signals_json: asJson(input.result.signalsSummary),
    weights_snapshot_json: asJson(input.result.weightsSnapshot),
    provider: input.result.provider,
    model: input.result.model,
    source,
    actor_user_id: input.actorUserId ?? null,
    scored_at: now,
    updated_at: now,
  };

  let profileId = existing?.id ?? null;
  if (existing?.id) {
    const { error } = await supabase
      .from("lead_scoring_profiles")
      .update(profilePayload)
      .eq("id", existing.id)
      .eq("organization_id", input.organizationId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase
      .from("lead_scoring_profiles")
      .insert(profilePayload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    profileId = data.id;
  }

  await supabase.from("lead_scoring_history").insert({
    organization_id: input.organizationId,
    profile_id: profileId,
    entity_type: "lead",
    lead_id: input.leadId,
    company_id: input.companyId ?? null,
    old_score: oldScore,
    new_score: newScore,
    delta,
    old_classification: existing?.classification ?? null,
    new_classification: input.result.classification,
    reason: input.reason ?? "recalculated",
    explanations_json: asJson(input.result.explanations),
    source,
    actor_user_id: input.actorUserId ?? null,
  });

  // Denorm onto lead — also sync classic lead_score for existing UI
  await supabase
    .from("crm_leads")
    .update({
      ai_lead_score: newScore,
      lead_score: Math.round(newScore),
      score_classification: input.result.classification,
      opportunity_band: input.result.opportunityBand,
      opportunity_confidence: input.result.opportunityConfidence,
      risk_score: input.result.riskScore,
      buying_readiness: input.result.buyingReadiness,
      scoring_confidence: input.result.confidence,
      scored_at: now,
      score_delta: delta,
      updated_at: now,
    })
    .eq("id", input.leadId)
    .eq("organization_id", input.organizationId);

  // Mirror onto open deals for pipeline badges
  await supabase
    .from("crm_deals")
    .update({
      lead_ai_score: newScore,
      lead_score_classification: input.result.classification,
      updated_at: now,
    })
    .eq("organization_id", input.organizationId)
    .eq("lead_id", input.leadId)
    .eq("status", "open");

  const alerts: Array<{
    alert_type: string;
    severity: "info" | "warning" | "critical";
    title: string;
    message: string;
    eventType: string;
  }> = [];

  if (
    (input.result.classification === "hot" ||
      input.result.classification === "very_hot") &&
    existing?.classification !== "hot" &&
    existing?.classification !== "very_hot"
  ) {
    alerts.push({
      alert_type: "became_hot",
      severity: "critical",
      title: "Lead became Hot",
      message: `Classification moved to ${input.result.classification} (score ${newScore}).`,
      eventType: "lead_became_hot",
    });
  }
  if (delta != null && delta >= 8) {
    alerts.push({
      alert_type: "score_increased",
      severity: "info",
      title: "Lead score increased",
      message: `Score ${oldScore} → ${newScore} (+${delta}).`,
      eventType: "lead_score_increased",
    });
  }
  if (delta != null && delta <= -8) {
    alerts.push({
      alert_type: "score_decreased",
      severity: "warning",
      title: "Lead score decreased",
      message: `Score ${oldScore} → ${newScore} (${delta}).`,
      eventType: "lead_score_decreased",
    });
  }
  if (
    existing?.opportunity_band &&
    ["low", "very_low", "medium"].includes(existing.opportunity_band) &&
    ["high", "very_high"].includes(input.result.opportunityBand)
  ) {
    alerts.push({
      alert_type: "opportunity_increased",
      severity: "info",
      title: "Opportunity increased",
      message: `Opportunity band is now ${input.result.opportunityBand}.`,
      eventType: "lead_opportunity_increased",
    });
  }
  if (
    existing?.risk_score != null &&
    input.result.riskScore >= Number(existing.risk_score) + 15
  ) {
    alerts.push({
      alert_type: "risk_increased",
      severity: "warning",
      title: "Risk increased",
      message: `Risk score rose to ${input.result.riskScore}.`,
      eventType: "lead_risk_increased",
    });
  }
  if (
    input.result.explanations.some((e) => e.code === "decision_makers") &&
    input.result.explanations.find((e) => e.code === "decision_makers")
      ?.sentiment === "positive"
  ) {
    alerts.push({
      alert_type: "decision_maker_found",
      severity: "info",
      title: "Decision maker found",
      message: "Decision-maker signals improved the lead score.",
      eventType: "lead_decision_maker_found",
    });
  }
  if (
    input.result.classification === "very_cold" ||
    input.result.riskScore >= 60
  ) {
    alerts.push({
      alert_type: "needs_attention",
      severity: "warning",
      title: "Needs attention",
      message: "Lead needs review due to low score or elevated risk.",
      eventType: "lead_needs_attention",
    });
  }

  for (const alert of alerts.slice(0, 4)) {
    await supabase.from("lead_scoring_alerts").insert({
      organization_id: input.organizationId,
      lead_id: input.leadId,
      company_id: input.companyId ?? null,
      alert_type: alert.alert_type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      payload_json: asJson({
        oldScore,
        newScore,
        classification: input.result.classification,
      }),
    });
    await emitPipelineAutomationEvent(supabase, {
      organizationId: input.organizationId,
      eventType: alert.eventType,
      entityType: "lead",
      entityId: input.leadId,
      payload: {
        oldScore,
        newScore,
        classification: input.result.classification,
        alertType: alert.alert_type,
      },
    });
  }

  await emitPipelineAutomationEvent(supabase, {
    organizationId: input.organizationId,
    eventType: "lead_score_recalculated",
    entityType: "lead",
    entityId: input.leadId,
    payload: {
      score: newScore,
      classification: input.result.classification,
      opportunityBand: input.result.opportunityBand,
      riskScore: input.result.riskScore,
      buyingReadiness: input.result.buyingReadiness,
    },
  });

  return { profileId, oldScore, newScore, delta };
}
