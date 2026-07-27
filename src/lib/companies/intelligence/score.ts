/**
 * Deterministic health + lead potential scoring for company intelligence.
 */

import {
  healthBandFromScore,
  leadTemperatureFromScore,
} from "@/lib/companies/intelligence/constants";
import type { IntelligenceSignals } from "@/lib/companies/intelligence/signals";
import type {
  ContactQualityBlock,
  GrowthSignalItem,
  HealthBlock,
  InsightItem,
  LeadPotentialBlock,
  OnlinePresenceBlock,
  RecommendationItem,
} from "@/lib/companies/intelligence/types";

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function hasHttps(url: string | null): boolean {
  if (!url) return false;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return /^https:\/\//i.test(url);
  }
}

function socialFlags(signals: IntelligenceSignals): OnlinePresenceBlock["social"] {
  const preview = signals.enrichment?.socialPreview ?? [];
  const joined = preview
    .map((row) =>
      [row.platform, row.url, row.network, row.type]
        .filter((v): v is string => typeof v === "string")
        .join(" ")
        .toLowerCase(),
    )
    .join(" ");

  const has = (keys: string[]) =>
    keys.some(
      (k) =>
        joined.includes(k) ||
        (signals.linkedinUrl?.toLowerCase().includes(k) ?? false) ||
        (signals.facebookUrl?.toLowerCase().includes(k) ?? false) ||
        (signals.instagramUrl?.toLowerCase().includes(k) ?? false),
    );

  return {
    facebook: Boolean(signals.facebookUrl) || has(["facebook", "fb.com"]),
    instagram: Boolean(signals.instagramUrl) || has(["instagram"]),
    linkedin: Boolean(signals.linkedinUrl) || has(["linkedin"]),
    x: has(["twitter.com", "x.com", "twitter"]),
    youtube: has(["youtube", "youtu.be"]),
    tiktok: has(["tiktok"]),
  };
}

export function buildOnlinePresence(
  signals: IntelligenceSignals,
): OnlinePresenceBlock {
  const social = socialFlags(signals);
  const socialCount = Object.values(social).filter(Boolean).length;
  const websiteAvailable = Boolean(signals.websiteUrl);
  const sslLikely = hasHttps(signals.websiteUrl);
  const enrichmentOk =
    signals.enrichment?.availability === "reachable" ||
    (signals.enrichment?.pages ?? 0) > 0;

  let websiteQualityScore = 0;
  if (websiteAvailable) websiteQualityScore += 30;
  if (sslLikely) websiteQualityScore += 15;
  if (enrichmentOk) websiteQualityScore += 15;
  if (signals.enrichment?.aboutPage) websiteQualityScore += 10;
  if (signals.enrichment?.contactPage) websiteQualityScore += 10;
  if ((signals.enrichment?.pages ?? 0) >= 3) websiteQualityScore += 10;
  if (socialCount >= 2) websiteQualityScore += 10;

  return {
    websiteAvailable,
    sslLikely,
    mobileFriendlyUnknown: true,
    social,
    googleBusiness: Boolean(
      signals.enrichment?.socialPreview.some((row) =>
        JSON.stringify(row).toLowerCase().includes("google"),
      ),
    ),
    reviewPlatforms: Boolean(
      signals.enrichment?.socialPreview.some((row) =>
        /review|trustpilot|yelp|google/i.test(JSON.stringify(row)),
      ),
    ),
    websiteQualityScore: clamp(websiteQualityScore),
  };
}

export function scoreContactQuality(
  signals: IntelligenceSignals,
): ContactQualityBlock {
  const emailAvailable =
    signals.emailContactCount > 0 || (signals.enrichment?.emails ?? 0) > 0;
  const phoneAvailable =
    Boolean(signals.phone) ||
    signals.phoneContactCount > 0 ||
    (signals.enrichment?.phones ?? 0) > 0;
  const linkedinPresence = Boolean(signals.linkedinUrl);
  const decisionMakersLikely =
    signals.decisionMakerHints > 0 || (signals.enrichment?.people ?? 0) >= 2;

  let score = 20;
  if (emailAvailable) score += 25;
  if (phoneAvailable) score += 20;
  if (linkedinPresence) score += 15;
  if (decisionMakersLikely) score += 15;
  if (signals.namedContactCount > 0) score += 5;

  const parts: string[] = [];
  if (emailAvailable) parts.push("email available");
  else parts.push("no email yet");
  if (phoneAvailable) parts.push("phone available");
  else parts.push("no phone yet");
  if (decisionMakersLikely) parts.push("decision-maker signals");
  if (linkedinPresence) parts.push("LinkedIn present");

  return {
    score: clamp(score),
    emailAvailable,
    phoneAvailable,
    decisionMakersLikely,
    linkedinPresence,
    summary: parts.join(" · "),
  };
}

export function scoreHealth(
  signals: IntelligenceSignals,
  online: OnlinePresenceBlock,
  contact: ContactQualityBlock,
): HealthBlock {
  const factors: HealthBlock["factors"] = [
    {
      id: "website",
      label: "Website",
      score: online.websiteQualityScore,
      weight: 0.25,
    },
    {
      id: "contact",
      label: "Contact information",
      score: contact.score,
      weight: 0.25,
    },
    {
      id: "social",
      label: "Social activity",
      score: clamp(
        Object.values(online.social).filter(Boolean).length * 18,
      ),
      weight: 0.15,
    },
    {
      id: "completeness",
      label: "Business completeness",
      score: clamp(
        (signals.description ? 20 : 0) +
          (signals.industry || signals.categoryName ? 20 : 0) +
          (signals.country || signals.city ? 15 : 0) +
          (signals.websiteUrl ? 20 : 0) +
          (signals.categoryConfidence ?? 0) * 0.25,
      ),
      weight: 0.2,
    },
    {
      id: "reviews",
      label: "Reviews / public presence",
      score: clamp(
        (online.reviewPlatforms ? 40 : 0) +
          (online.googleBusiness ? 30 : 0) +
          (online.social.linkedin ? 20 : 0),
      ),
      weight: 0.1,
    },
    {
      id: "maturity",
      label: "Company maturity signals",
      score: clamp(
        (signals.enrichment?.aboutPage ? 25 : 0) +
          (signals.enrichment?.teamPage ? 25 : 0) +
          ((signals.enrichment?.pages ?? 0) >= 5 ? 25 : 0) +
          (signals.categoryName ? 25 : 0),
      ),
      weight: 0.05,
    },
  ];

  const score = clamp(
    factors.reduce((sum, f) => sum + f.score * f.weight, 0),
  );

  return {
    score,
    band: healthBandFromScore(score),
    factors,
  };
}

export function scoreLeadPotential(
  signals: IntelligenceSignals,
  online: OnlinePresenceBlock,
  contact: ContactQualityBlock,
  healthScore: number,
): LeadPotentialBlock {
  const reasons: string[] = [];
  let score = 25;

  if (online.websiteAvailable) {
    score += 12;
    reasons.push("Website available");
  }
  if (online.websiteQualityScore >= 70) {
    score += 12;
    reasons.push("Modern / complete website signals");
  }
  if (contact.emailAvailable) {
    score += 12;
    reasons.push("Email contact available");
  }
  if (contact.phoneAvailable) {
    score += 8;
    reasons.push("Phone contact available");
  }
  if (contact.decisionMakersLikely) {
    score += 10;
    reasons.push("Decision-maker signals present");
  }
  if (signals.categoryName) {
    score += 8;
    reasons.push(`Categorized as ${signals.categoryName}`);
  }
  if ((signals.enrichment?.pages ?? 0) >= 4) {
    score += 6;
    reasons.push("Active multi-page web presence");
  }
  if (!online.sslLikely && online.websiteAvailable) {
    score -= 8;
    reasons.push("No HTTPS detected (weaker digital maturity)");
  }
  if (!contact.emailAvailable && !contact.phoneAvailable) {
    score -= 10;
    reasons.push("Hard to reach — limited contact data");
  }
  if (healthScore >= 75) {
    score += 8;
    reasons.push("Strong company health score");
  }

  score = clamp(score);
  if (reasons.length === 0) {
    reasons.push("Limited signals — score is provisional");
  }

  return {
    score,
    temperature: leadTemperatureFromScore(score),
    reasons: reasons.slice(0, 6),
  };
}

export function buildInsights(
  signals: IntelligenceSignals,
  online: OnlinePresenceBlock,
  contact: ContactQualityBlock,
): InsightItem[] {
  const items: InsightItem[] = [];

  if (!online.websiteAvailable) {
    items.push({
      id: "no-website",
      label: "No website on file",
      severity: "warning",
      confidence: 90,
    });
  } else if (!online.sslLikely) {
    items.push({
      id: "no-ssl",
      label: "No SSL (HTTPS) detected on website URL",
      severity: "warning",
      confidence: 85,
    });
  }

  if (online.websiteAvailable && !signals.enrichment?.contactPage) {
    items.push({
      id: "no-contact-page",
      label: "No contact page discovered yet",
      severity: "info",
      confidence: 70,
    });
  }

  if (
    online.websiteAvailable &&
    (signals.enrichment?.pages ?? 0) > 0 &&
    (signals.enrichment?.pages ?? 0) < 3
  ) {
    items.push({
      id: "thin-site",
      label: "Website appears thin or lightly crawled",
      severity: "info",
      confidence: 60,
    });
  }

  const socialCount = Object.values(online.social).filter(Boolean).length;
  if (socialCount >= 3) {
    items.push({
      id: "strong-social",
      label: "Strong social presence",
      severity: "positive",
      confidence: 80,
    });
  } else if (socialCount === 0 && online.websiteAvailable) {
    items.push({
      id: "weak-social",
      label: "Limited social media footprint",
      severity: "info",
      confidence: 65,
    });
  }

  if (online.websiteQualityScore >= 75) {
    items.push({
      id: "pro-branding",
      label: "Professional digital branding signals",
      severity: "positive",
      confidence: 75,
    });
  }

  if (contact.decisionMakersLikely) {
    items.push({
      id: "decision-makers",
      label: "Likely decision makers identified",
      severity: "positive",
      confidence: 70,
    });
  }

  if (signals.enrichment?.teamPage) {
    items.push({
      id: "team-page",
      label: "Team / people page present — possible growth or hiring signals",
      severity: "positive",
      confidence: 55,
    });
  }

  if ((signals.enrichment?.warnings.length ?? 0) > 0) {
    items.push({
      id: "enrichment-warnings",
      label: "Enrichment reported warnings — review data quality",
      severity: "warning",
      confidence: 80,
    });
  }

  return items.slice(0, 10);
}

export function buildGrowthSignals(
  signals: IntelligenceSignals,
  online: OnlinePresenceBlock,
): GrowthSignalItem[] {
  const items: GrowthSignalItem[] = [];

  if (signals.enrichment?.discoveredAt) {
    const ageMs =
      Date.now() - new Date(signals.enrichment.discoveredAt).getTime();
    if (ageMs < 1000 * 60 * 60 * 24 * 45) {
      items.push({
        id: "recent-enrichment",
        label: "Recently updated website data",
        evidence: "Enrichment snapshot within last 45 days",
      });
    }
  }

  if (signals.enrichment?.teamPage) {
    items.push({
      id: "hiring-or-team",
      label: "Hiring / team page present",
      evidence: "Team page discovered during enrichment",
    });
  }

  if ((signals.enrichment?.pages ?? 0) >= 6) {
    items.push({
      id: "expanding-services",
      label: "Expanding services footprint",
      evidence: "Multiple website pages crawled",
    });
  }

  const socialCount = Object.values(online.social).filter(Boolean).length;
  if (socialCount >= 2) {
    items.push({
      id: "growing-online",
      label: "Growing online presence",
      evidence: `${socialCount} social channels detected`,
    });
  }

  if (signals.city && signals.region) {
    items.push({
      id: "location-footprint",
      label: "Clear geographic footprint",
      evidence: `${signals.city}, ${signals.region}`,
    });
  }

  return items;
}

export function buildRecommendations(
  signals: IntelligenceSignals,
  contact: ContactQualityBlock,
  lead: LeadPotentialBlock,
  online: OnlinePresenceBlock,
): RecommendationItem[] {
  const items: RecommendationItem[] = [];

  if (lead.temperature === "hot" || lead.temperature === "warm") {
    if (contact.phoneAvailable) {
      items.push({
        id: "call",
        action: "Call this company",
        priority: "high",
        rationale: "Warm/hot lead potential with phone available",
      });
    }
    if (contact.emailAvailable) {
      items.push({
        id: "intro-email",
        action: "Send introduction email",
        priority: "high",
        rationale: "Contactable email present for outreach",
      });
    }
  }

  if (!contact.decisionMakersLikely) {
    items.push({
      id: "research-dm",
      action: "Research decision makers",
      priority: "medium",
      rationale: "Few decision-maker signals in contacts yet",
    });
  }

  if (online.websiteAvailable) {
    items.push({
      id: "visit-site",
      action: "Visit website first",
      priority: "medium",
      rationale: "Validate messaging and offerings before outreach",
    });
  }

  if (lead.temperature === "cold" || lead.temperature === "very_cold") {
    items.push({
      id: "wait",
      action: "Wait 30 days and re-analyze",
      priority: "low",
      rationale: "Limited readiness — enrich or nurture before outreach",
    });
  }

  if (signals.categoryName && lead.score >= 55) {
    items.push({
      id: "campaign-fit",
      action: `Strong candidate for ${signals.categoryName} campaigns`,
      priority: "medium",
      rationale: "Category + lead score align with targeted sequences",
    });
  }

  if (!online.sslLikely && online.websiteAvailable) {
    items.push({
      id: "note-ssl",
      action: "Note digital maturity gap in pitch",
      priority: "low",
      rationale: "Missing HTTPS can indicate modernization opportunity",
    });
  }

  return items.slice(0, 8);
}
