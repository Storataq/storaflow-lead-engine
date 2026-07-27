/**
 * Deterministic company intelligence generation + optional AI enrichment.
 */

import { enrichIntelligenceWithOptionalAI } from "@/lib/companies/intelligence/ai";
import {
  buildGrowthSignals,
  buildInsights,
  buildOnlinePresence,
  buildRecommendations,
  scoreContactQuality,
  scoreHealth,
  scoreLeadPotential,
} from "@/lib/companies/intelligence/score";
import {
  buildIntelligenceSignals,
  type IntelligenceSignals,
} from "@/lib/companies/intelligence/signals";
import type {
  AiSummaryBlock,
  BusinessProfileBlock,
  CompanyIntelligenceResult,
} from "@/lib/companies/intelligence/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

function guessAudience(signals: IntelligenceSignals): BusinessProfileBlock["audience"] {
  const hay = [
    signals.industry,
    signals.categoryName,
    signals.categorySlug,
    signals.description,
    signals.aboutText,
    signals.metaDescription,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const b2b = /\b(b2b|business|zakelijk|enterprise|wholesale|saas|agency)\b/.test(
    hay,
  );
  const b2c = /\b(b2c|consumer|retail|shop|winkel|horeca|klant)\b/.test(hay);
  if (b2b && b2c) return "both";
  if (b2b) return "b2b";
  if (b2c) return "b2c";
  return "unknown";
}

function buildBusinessProfile(
  signals: IntelligenceSignals,
): BusinessProfileBlock {
  const languages: string[] = [];
  if (signals.country) {
    const c = signals.country.toLowerCase();
    if (["nl", "netherlands", "nederland", "belgie", "belgium", "be"].some((x) =>
      c.includes(x),
    )) {
      languages.push("nl");
    }
    if (["de", "germany", "deutschland", "at", "ch"].some((x) => c.includes(x))) {
      languages.push("de");
    }
    if (
      ["uk", "gb", "us", "united", "ireland", "ie", "ca", "au"].some((x) =>
        c.includes(x),
      )
    ) {
      languages.push("en");
    }
  }
  if (languages.length === 0 && signals.websiteUrl) languages.push("unknown");

  return {
    industry: signals.industry,
    subIndustry: signals.categoryName,
    businessCategory: signals.categoryName,
    companyType: signals.categorySlug,
    audience: guessAudience(signals),
    estimatedEmployees: null,
    estimatedRevenue: null,
    foundedYear: null,
    country: signals.country,
    region: signals.region ?? signals.city,
    languages,
  };
}

function buildDeterministicSummary(
  signals: IntelligenceSignals,
  onlineQuality: number,
  contactScore: number,
): AiSummaryBlock {
  const whatTheyDo =
    signals.description?.trim() ||
    signals.metaDescription?.trim() ||
    signals.aboutText?.slice(0, 280)?.trim() ||
    (signals.categoryName
      ? `${signals.companyName} operates in ${signals.categoryName}.`
      : `${signals.companyName} — limited public description available.`);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const opportunities: string[] = [];

  if (signals.websiteUrl) strengths.push("Online presence via website");
  if (signals.linkedinUrl) strengths.push("LinkedIn profile available");
  if (contactScore >= 60) strengths.push("Reachable contact data");
  if (onlineQuality >= 70) strengths.push("Solid website quality signals");
  if (!signals.websiteUrl) weaknesses.push("No website on file");
  if (contactScore < 40) weaknesses.push("Limited contactability");
  if (signals.enrichment && !signals.enrichment.contactPage) {
    weaknesses.push("Contact page not discovered");
  }
  if (signals.categoryName) {
    opportunities.push(`Targeted outreach in ${signals.categoryName}`);
  }
  if (contactScore < 50) {
    opportunities.push("Enrich contacts before campaign enrollment");
  }
  if (onlineQuality < 50 && signals.websiteUrl) {
    opportunities.push("Digital modernization angle for outreach");
  }

  const confidence = Math.round(
    (signals.description ? 25 : 10) +
      (signals.websiteUrl ? 20 : 0) +
      (signals.categoryName ? 20 : 0) +
      (signals.enrichment ? 20 : 0) +
      (signals.metaDescription || signals.aboutText ? 15 : 0),
  );

  return {
    whatTheyDo,
    targetAudience:
      guessAudience(signals) === "unknown"
        ? "Not enough evidence to determine audience"
        : `Likely ${guessAudience(signals).toUpperCase()}`,
    productsServices:
      signals.categoryName ??
      signals.industry ??
      "Products/services not yet inferred",
    businessModel:
      guessAudience(signals) === "b2b"
        ? "Likely B2B / business services"
        : guessAudience(signals) === "b2c"
          ? "Likely B2C / consumer-facing"
          : "Business model unclear from current signals",
    estimatedSize: "Unknown — employee/revenue signals not available yet",
    marketPosition:
      onlineQuality >= 70
        ? "Digitally established relative to peers with thin presence"
        : "Emerging or under-documented digital footprint",
    strengths: strengths.length ? strengths : ["Profile still thin — gather more signals"],
    weaknesses: weaknesses.length ? weaknesses : ["No major weaknesses flagged yet"],
    opportunities: opportunities.length
      ? opportunities
      : ["Re-run enrichment and intelligence after more data"],
    confidence: Math.min(95, confidence),
  };
}

export function buildDeterministicIntelligence(
  signals: IntelligenceSignals,
): CompanyIntelligenceResult {
  const onlinePresence = buildOnlinePresence(signals);
  const contactQuality = scoreContactQuality(signals);
  const health = scoreHealth(signals, onlinePresence, contactQuality);
  const leadPotential = scoreLeadPotential(
    signals,
    onlinePresence,
    contactQuality,
    health.score,
  );
  const insights = buildInsights(signals, onlinePresence, contactQuality);
  const growthSignals = buildGrowthSignals(signals, onlinePresence);
  const recommendations = buildRecommendations(
    signals,
    contactQuality,
    leadPotential,
    onlinePresence,
  );
  const summary = buildDeterministicSummary(
    signals,
    onlinePresence.websiteQualityScore,
    contactQuality.score,
  );
  const businessProfile = buildBusinessProfile(signals);

  const confidence = Math.round(
    (summary.confidence + health.score + contactQuality.score) / 3,
  );

  return {
    summary,
    businessProfile,
    onlinePresence,
    insights,
    health,
    leadPotential,
    contactQuality,
    growthSignals,
    recommendations,
    confidence,
    needsReview: confidence < 55 || !signals.websiteUrl,
    analyzedBy: "automatic",
    provider: null,
    model: null,
    signalsSummary: {
      hasWebsite: Boolean(signals.websiteUrl),
      contactCount: signals.contactCount,
      emailContacts: signals.emailContactCount,
      phoneContacts: signals.phoneContactCount,
      enrichmentAvailable: Boolean(signals.enrichment),
      category: signals.categoryName,
    },
  };
}

export async function generateCompanyIntelligence(input: {
  organizationId: string;
  companyId: string;
  supabase?: Client;
  useAi?: boolean;
}): Promise<{
  signals: IntelligenceSignals;
  result: CompanyIntelligenceResult;
}> {
  const signals = await buildIntelligenceSignals(
    input.organizationId,
    input.companyId,
    input.supabase,
  );
  const deterministic = buildDeterministicIntelligence(signals);
  if (input.useAi === false) {
    return { signals, result: deterministic };
  }
  const result = await enrichIntelligenceWithOptionalAI({
    signals,
    deterministic,
  });
  return { signals, result };
}
