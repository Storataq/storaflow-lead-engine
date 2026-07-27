/**
 * Phase 21K — reply classification (deterministic preserved + optional AI).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { runAIGeneration } from "@/lib/email/ai/generate";
import { isHighImpactReplyClassification } from "@/lib/email/ai/safety";
import { ensureEmailAISettings, toGenerationPolicy } from "@/lib/email/ai/settings";
import type { AIReplyClassificationResult } from "@/lib/email/ai/types";
import { createServiceClient } from "@/lib/supabase/admin";

type SupabaseLike = any;

export function classifyReplyDeterministic(input: {
  subject?: string | null;
  body?: string | null;
}): {
  classification: string;
  requiresManualReview: boolean;
} {
  const text = `${input.subject ?? ""}\n${input.body ?? ""}`.toLowerCase();

  if (
    /\bunsubscribe\b|\bopt[-\s]?out\b|\bremove me\b|\bafmelden\b|\buitschrijven\b/.test(
      text,
    )
  ) {
    return { classification: "unsubscribe_request", requiresManualReview: true };
  }
  if (/\bcomplaint\b|\blegal\b|\blawyer\b|\bgdpr\b|\baverage\b/.test(text)) {
    return { classification: "complaint_like", requiresManualReview: true };
  }
  if (
    /\bout of office\b|\bautomatic reply\b|\bafwezigheid\b|\bautosvar\b/.test(
      text,
    )
  ) {
    return { classification: "out_of_office", requiresManualReview: false };
  }
  if (/\bmeet(ing)?\b|\bcalendar\b|\bafspraak\b|\binplanen\b/.test(text)) {
    return { classification: "meeting_request", requiresManualReview: false };
  }
  if (
    /\bnot interested\b|\bno thanks\b|\bgeen interesse\b|\bstop\b/.test(text)
  ) {
    return { classification: "not_interested", requiresManualReview: true };
  }
  if (/\binterested\b|\bklinkt goed\b|\blaag drempelig\b|\byes\b/.test(text)) {
    return { classification: "interested", requiresManualReview: false };
  }
  if (/\?/.test(text)) {
    return { classification: "question", requiresManualReview: false };
  }
  return { classification: "unknown", requiresManualReview: true };
}

export async function classifyReplyWithOptionalAI(input: {
  organizationId: string;
  userId: string;
  subject?: string | null;
  body?: string | null;
  trackingEventId?: string | null;
  queueItemId?: string | null;
  campaignExecutionId?: string | null;
  enrollmentId?: string | null;
}): Promise<AIReplyClassificationResult> {
  const deterministic = classifyReplyDeterministic({
    subject: input.subject,
    body: input.body,
  });

  const settings = await ensureEmailAISettings(input.organizationId);
  const policy = toGenerationPolicy(settings);

  let aiClassification: string | null = null;
  let confidence: AIReplyClassificationResult["confidence"] = "medium";
  let explanation = "Deterministic heuristic classification.";
  let evidence: string[] = [];
  let generationId: string | null = null;
  let nextActions: AIReplyClassificationResult["nextActions"] = [];
  let requiresManualReview = deterministic.requiresManualReview;

  if (policy.replyClassificationEnabled && input.body) {
    const result = await runAIGeneration({
      organizationId: input.organizationId,
      userId: input.userId,
      generationType: "reply_classification",
      context: {
        replyText: `${input.subject ?? ""}\n${input.body}`,
        useReplyContent: true,
      },
      sourceReplyEventId: input.trackingEventId,
    });
    generationId = result.generationId !== "none" ? result.generationId : null;
    const payload = result.variants.length
      ? null
      : (result as any);
    void payload;
    // Classification lives on result_json for this type; pull from warnings/error path safely.
    if (!result.error) {
      // Re-read stored result
      const supabase = createServiceClient() as SupabaseLike;
      const { data } = await supabase
        .from("email_ai_generations")
        .select("result_json, confidence")
        .eq("id", result.generationId)
        .maybeSingle();
      const rj = data?.result_json ?? {};
      aiClassification = rj.classification ?? null;
      confidence = (data?.confidence as any) ?? result.confidence;
      explanation = rj.explanation ?? explanation;
      evidence = rj.evidenceSnippets ?? [];
      requiresManualReview =
        Boolean(rj.requiresManualReview) || requiresManualReview;
      nextActions = (rj.nextActions ?? []).map((a: any) => ({
        actionCode: String(a.actionCode ?? "wait"),
        reason: String(a.reason ?? ""),
        confidence: a.confidence ?? "medium",
        humanApprovalRequired: true,
      }));
    }
  }

  // High-impact: prefer review; never erase deterministic unsubscribe/complaint.
  let finalClassification = deterministic.classification;
  let finalSource: "deterministic" | "ai" | "human" = "deterministic";

  if (
    aiClassification &&
    !isHighImpactReplyClassification(deterministic.classification)
  ) {
    finalClassification = aiClassification;
    finalSource = "ai";
  } else if (
    isHighImpactReplyClassification(deterministic.classification)
  ) {
    finalClassification = deterministic.classification;
    finalSource = "deterministic";
    requiresManualReview = true;
  }

  if (isHighImpactReplyClassification(aiClassification)) {
    requiresManualReview = true;
  }

  const supabase = createServiceClient() as SupabaseLike;
  const { data: row } = await supabase
    .from("email_ai_reply_classifications")
    .insert({
      organization_id: input.organizationId,
      tracking_event_id: input.trackingEventId ?? null,
      queue_item_id: input.queueItemId ?? null,
      campaign_execution_id: input.campaignExecutionId ?? null,
      enrollment_id: input.enrollmentId ?? null,
      deterministic_classification: deterministic.classification,
      ai_classification: aiClassification,
      ai_confidence: confidence,
      ai_explanation: explanation,
      evidence_snippets_json: evidence,
      final_classification: finalClassification,
      final_classification_source: finalSource,
      generation_id: generationId,
      requires_manual_review: requiresManualReview,
    })
    .select("id")
    .single();

  if (row?.id && nextActions.length) {
    await supabase.from("email_ai_next_action_suggestions").insert(
      nextActions.map((a) => ({
        organization_id: input.organizationId,
        generation_id: generationId,
        classification_id: row.id,
        action_code: a.actionCode,
        reason: a.reason || "Suggested by AI; human approval required.",
        supporting_evidence_json: evidence,
        confidence: a.confidence,
        human_approval_required: true,
        status: "suggested",
      })),
    );
  } else if (row?.id) {
    // Default safe suggestions from deterministic path
    const defaultAction =
      finalClassification === "unsubscribe_request" ||
      finalClassification === "complaint_like"
        ? "suppress_recipient"
        : finalClassification === "meeting_request"
          ? "send_meeting_link"
          : finalClassification === "interested"
            ? "reply_manually"
            : "wait";
    await supabase.from("email_ai_next_action_suggestions").insert({
      organization_id: input.organizationId,
      classification_id: row.id,
      action_code: defaultAction,
      reason: "Deterministic suggestion; not executed automatically.",
      confidence: "medium",
      human_approval_required: true,
      status: "suggested",
    });
  }

  return {
    classificationId: row?.id ?? "unpersisted",
    deterministicClassification: deterministic.classification,
    aiClassification: aiClassification as any,
    confidence,
    explanation,
    evidenceSnippets: evidence,
    finalClassification,
    finalSource,
    requiresManualReview,
    nextActions:
      nextActions.length > 0
        ? nextActions
        : [
            {
              actionCode: "wait",
              reason: "Default wait; no automatic action.",
              confidence: "medium",
              humanApprovalRequired: true,
            },
          ],
  };
}
