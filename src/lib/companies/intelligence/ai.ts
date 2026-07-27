/**
 * Optional AI enrichment for company intelligence summaries.
 * Uses the shared email AI provider abstraction (no vendor lock-in).
 */

import { createAIProvider } from "@/lib/email/ai/provider";
import { getDefaultAiModel } from "@/lib/email/ai/constants";
import type { IntelligenceSignals } from "@/lib/companies/intelligence/signals";
import type {
  AiSummaryBlock,
  CompanyIntelligenceResult,
} from "@/lib/companies/intelligence/types";

type AiPayload = {
  whatTheyDo?: string;
  targetAudience?: string;
  productsServices?: string;
  businessModel?: string;
  estimatedSize?: string;
  marketPosition?: string;
  strengths?: string[];
  weaknesses?: string[];
  opportunities?: string[];
  confidence?: number;
  insights?: string[];
  recommendations?: Array<{ action: string; rationale: string }>;
};

function buildUserPrompt(
  signals: IntelligenceSignals,
  deterministic: CompanyIntelligenceResult,
): string {
  return JSON.stringify(
    {
      task: "Enrich the company intelligence summary. Return JSON only.",
      company: {
        name: signals.companyName,
        website: signals.websiteUrl,
        industry: signals.industry,
        category: signals.categoryName,
        description: signals.description,
        notes: signals.notes,
        location: [signals.city, signals.region, signals.country]
          .filter(Boolean)
          .join(", "),
        websiteTitle: signals.websiteTitle,
        metaDescription: signals.metaDescription,
        aboutText: signals.aboutText?.slice(0, 2500),
        homepageText: signals.homepageText?.slice(0, 2500),
      },
      deterministicSummary: deterministic.summary,
      healthScore: deterministic.health.score,
      leadScore: deterministic.leadPotential.score,
      outputSchema: {
        whatTheyDo: "string",
        targetAudience: "string",
        productsServices: "string",
        businessModel: "string",
        estimatedSize: "string",
        marketPosition: "string",
        strengths: ["string"],
        weaknesses: ["string"],
        opportunities: ["string"],
        confidence: "0-100",
        insights: ["short observation"],
        recommendations: [{ action: "string", rationale: "string" }],
      },
    },
    null,
    2,
  );
}

function mergeSummary(
  base: AiSummaryBlock,
  ai: AiPayload,
): AiSummaryBlock {
  const pick = (next: string | undefined, fallback: string) =>
    typeof next === "string" && next.trim() ? next.trim() : fallback;

  return {
    whatTheyDo: pick(ai.whatTheyDo, base.whatTheyDo),
    targetAudience: pick(ai.targetAudience, base.targetAudience),
    productsServices: pick(ai.productsServices, base.productsServices),
    businessModel: pick(ai.businessModel, base.businessModel),
    estimatedSize: pick(ai.estimatedSize, base.estimatedSize),
    marketPosition: pick(ai.marketPosition, base.marketPosition),
    strengths:
      Array.isArray(ai.strengths) && ai.strengths.length
        ? ai.strengths.filter((s): s is string => typeof s === "string").slice(0, 6)
        : base.strengths,
    weaknesses:
      Array.isArray(ai.weaknesses) && ai.weaknesses.length
        ? ai.weaknesses.filter((s): s is string => typeof s === "string").slice(0, 6)
        : base.weaknesses,
    opportunities:
      Array.isArray(ai.opportunities) && ai.opportunities.length
        ? ai.opportunities
            .filter((s): s is string => typeof s === "string")
            .slice(0, 6)
        : base.opportunities,
    confidence: Math.max(
      0,
      Math.min(100, Number(ai.confidence ?? base.confidence)),
    ),
  };
}

export async function enrichIntelligenceWithOptionalAI(input: {
  signals: IntelligenceSignals;
  deterministic: CompanyIntelligenceResult;
}): Promise<CompanyIntelligenceResult> {
  const provider = createAIProvider();
  if (!provider.isConfigured()) {
    return input.deterministic;
  }

  try {
    const model = getDefaultAiModel();
    const response = await provider.complete({
      model,
      system:
        "You are a B2B company intelligence analyst. Use only provided evidence. Never invent contact details or financials. Return JSON only. Be concise.",
      user: buildUserPrompt(input.signals, input.deterministic),
      responseFormat: "json",
      maxOutputTokens: 1200,
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
