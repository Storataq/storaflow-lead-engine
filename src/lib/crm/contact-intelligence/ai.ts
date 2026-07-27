/**
 * Optional AI enrichment for contact intelligence summaries.
 */

import { createAIProvider } from "@/lib/email/ai/provider";
import { getDefaultAiModel } from "@/lib/email/ai/constants";
import type { ContactIntelligenceSignals } from "@/lib/crm/contact-intelligence/signals";
import type {
  ContactAiSummary,
  ContactIntelligenceResult,
} from "@/lib/crm/contact-intelligence/types";

type AiPayload = {
  who?: string;
  currentRole?: string;
  responsibilities?: string;
  decisionMakingInfluence?: string;
  possibleInterests?: string[];
  communicationStyle?: string;
  potentialValue?: string;
  confidence?: number;
  insights?: string[];
  recommendations?: Array<{ action: string; rationale: string }>;
};

function mergeSummary(
  base: ContactAiSummary,
  ai: AiPayload,
): ContactAiSummary {
  const pick = (next: string | undefined, fallback: string) =>
    typeof next === "string" && next.trim() ? next.trim() : fallback;

  return {
    who: pick(ai.who, base.who),
    currentRole: pick(ai.currentRole, base.currentRole),
    responsibilities: pick(ai.responsibilities, base.responsibilities),
    decisionMakingInfluence: pick(
      ai.decisionMakingInfluence,
      base.decisionMakingInfluence,
    ),
    possibleInterests:
      Array.isArray(ai.possibleInterests) && ai.possibleInterests.length
        ? ai.possibleInterests
            .filter((s): s is string => typeof s === "string")
            .slice(0, 6)
        : base.possibleInterests,
    communicationStyle: pick(ai.communicationStyle, base.communicationStyle),
    potentialValue: pick(ai.potentialValue, base.potentialValue),
    confidence: Math.max(
      0,
      Math.min(100, Number(ai.confidence ?? base.confidence)),
    ),
  };
}

export async function enrichContactIntelligenceWithOptionalAI(input: {
  signals: ContactIntelligenceSignals;
  deterministic: ContactIntelligenceResult;
}): Promise<ContactIntelligenceResult> {
  const provider = createAIProvider();
  if (!provider.isConfigured()) {
    return input.deterministic;
  }

  try {
    const model = getDefaultAiModel();
    const response = await provider.complete({
      model,
      system:
        "You are a B2B contact intelligence analyst. Use only provided evidence. Never invent emails, phones, or employers. Return JSON only. Be concise.",
      user: JSON.stringify(
        {
          task: "Enrich the contact intelligence summary. Return JSON only.",
          contact: {
            name: input.signals.fullName,
            title: input.signals.jobTitle,
            email: Boolean(input.signals.email),
            phone: Boolean(input.signals.phone),
            linkedin: Boolean(input.signals.linkedinUrl),
            company: input.signals.leadCompanyName,
            industry: input.signals.leadIndustry,
            country: input.signals.leadCountry,
          },
          deterministic: input.deterministic.summary,
          decisionMaker: input.deterministic.decisionMaker,
          outputSchema: {
            who: "string",
            currentRole: "string",
            responsibilities: "string",
            decisionMakingInfluence: "string",
            possibleInterests: ["string"],
            communicationStyle: "string",
            potentialValue: "string",
            confidence: "0-100",
            insights: ["string"],
            recommendations: [{ action: "string", rationale: "string" }],
          },
        },
        null,
        2,
      ),
      responseFormat: "json",
      maxOutputTokens: 900,
      timeoutMs: 30000,
    });

    const parsed = JSON.parse(response.content) as AiPayload;
    const summary = mergeSummary(input.deterministic.summary, parsed);

    const insights = [...input.deterministic.insights];
    if (Array.isArray(parsed.insights)) {
      for (const label of parsed.insights.slice(0, 4)) {
        if (typeof label !== "string" || !label.trim()) continue;
        insights.push({
          id: `ai-${insights.length}`,
          label: label.trim(),
          severity: "info",
          confidence: summary.confidence,
        });
      }
    }

    const recommendations = [...input.deterministic.recommendations];
    if (Array.isArray(parsed.recommendations)) {
      for (const rec of parsed.recommendations.slice(0, 3)) {
        if (!rec || typeof rec.action !== "string") continue;
        recommendations.push({
          id: `ai-rec-${recommendations.length}`,
          action: rec.action.trim(),
          priority: "medium",
          rationale:
            typeof rec.rationale === "string"
              ? rec.rationale.trim()
              : "AI suggestion",
        });
      }
    }

    return {
      ...input.deterministic,
      summary,
      insights: insights.slice(0, 12),
      recommendations: recommendations.slice(0, 10),
      confidence: Math.max(input.deterministic.confidence, summary.confidence),
      analyzedBy: "hybrid",
      provider: provider.code,
      model: response.model,
      needsReview: summary.confidence < 60 || input.deterministic.needsReview,
    };
  } catch {
    return {
      ...input.deterministic,
      analyzedBy: "hybrid",
      provider: provider.code,
      needsReview: true,
    };
  }
}
