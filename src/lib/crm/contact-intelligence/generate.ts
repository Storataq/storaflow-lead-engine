/**
 * Assemble deterministic contact intelligence + optional AI enrichment.
 */

import { enrichContactIntelligenceWithOptionalAI } from "@/lib/crm/contact-intelligence/ai";
import {
  buildBadges,
  buildDeterministicSummary,
  buildInsights,
  buildRecommendations,
  buildTimeline,
  estimateCommunication,
  inferContactProfile,
  scoreContactHealth,
  scoreContactQuality,
  scoreDecisionMaker,
} from "@/lib/crm/contact-intelligence/score";
import {
  buildContactIntelligenceSignals,
  type ContactIntelligenceSignals,
} from "@/lib/crm/contact-intelligence/signals";
import type { ContactIntelligenceResult } from "@/lib/crm/contact-intelligence/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export function buildDeterministicContactIntelligence(
  signals: ContactIntelligenceSignals,
): ContactIntelligenceResult {
  const profile = inferContactProfile(signals);
  const decisionMaker = scoreDecisionMaker(signals, profile);
  const health = scoreContactHealth(signals, profile, decisionMaker);
  const quality = scoreContactQuality(signals, profile, decisionMaker);
  const communication = estimateCommunication(signals, profile);
  const timeline = buildTimeline(signals);
  const insights = buildInsights(
    signals,
    profile,
    decisionMaker,
    health,
    quality,
  );
  const recommendations = buildRecommendations(
    signals,
    decisionMaker,
    communication,
    quality,
  );
  const badges = buildBadges(signals, profile, decisionMaker, quality);
  const summary = buildDeterministicSummary(
    signals,
    profile,
    decisionMaker,
    quality,
  );

  const confidence = Math.round(
    (summary.confidence + health.score + quality.score) / 3,
  );

  return {
    summary,
    profile,
    decisionMaker,
    communication,
    health,
    quality,
    timeline,
    insights,
    recommendations,
    badges,
    confidence,
    needsReview: confidence < 55 || !signals.email,
    analyzedBy: "automatic",
    provider: null,
    model: null,
    signalsSummary: {
      hasEmail: Boolean(signals.email),
      hasPhone: Boolean(signals.phone),
      hasLinkedIn: Boolean(signals.linkedinUrl),
      isPrimary: signals.isPrimary,
      leadId: signals.leadId,
      company: signals.leadCompanyName,
      noteCount: signals.noteCount,
      taskCount: signals.taskCount,
      activityCount: signals.activityCount,
    },
  };
}

export async function generateContactIntelligence(input: {
  organizationId: string;
  contactId: string;
  supabase?: Client;
  useAi?: boolean;
}): Promise<{
  signals: ContactIntelligenceSignals;
  result: ContactIntelligenceResult;
}> {
  const signals = await buildContactIntelligenceSignals(
    input.organizationId,
    input.contactId,
    input.supabase,
  );
  const deterministic = buildDeterministicContactIntelligence(signals);
  if (input.useAi === false) {
    return { signals, result: deterministic };
  }
  const result = await enrichContactIntelligenceWithOptionalAI({
    signals,
    deterministic,
  });
  return { signals, result };
}
