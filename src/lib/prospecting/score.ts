/**
 * Deterministic prospect lead score 0–100 + quality + recommendation.
 */

import type {
  LeadQuality,
  ProspectRecommendation,
} from "@/lib/prospecting/constants";
import type {
  DetectedOpportunity,
  ProspectScoreResult,
} from "@/lib/prospecting/types";

export type ScoreInput = {
  hasWebsite: boolean;
  hasEmail: boolean;
  hasPhone: boolean;
  hasAddress: boolean;
  hasSocial: boolean;
  employeeBand?: string | null;
  revenueBand?: string | null;
  businessClass?: string | null;
  analysisConfidence: number;
  digitalMaturity: number;
  storaflowFit: number;
  opportunities: DetectedOpportunity[];
  isDuplicate?: boolean;
};

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function qualityFromScore(
  score: number,
  employeeBand?: string | null,
): LeadQuality {
  if (score >= 85 && (employeeBand === "501-1000" || employeeBand === "1000+")) {
    return "strategic";
  }
  if (score >= 80 && (employeeBand === "201-500" || employeeBand === "501-1000" || employeeBand === "1000+")) {
    return "enterprise";
  }
  if (score >= 75) return "hot";
  if (score >= 50) return "warm";
  return "cold";
}

export function recommendationFromScore(
  score: number,
  opportunities: DetectedOpportunity[],
): ProspectRecommendation {
  if (score < 30) return "not_interesting";
  const highOps = opportunities.filter((o) => o.severity === "high").length;
  if (score >= 80 || highOps >= 2) return "call_now";
  if (score >= 65) return "book_demo";
  if (score >= 55) return "send_email";
  if (score >= 40) return "linkedin";
  return "later";
}

export function computeProspectScore(input: ScoreInput): ProspectScoreResult {
  const factors: ProspectScoreResult["factors"] = [];
  let score = 12;

  if (input.hasWebsite) {
    score += 12;
    factors.push({ key: "website", points: 12, note: "Website aanwezig" });
  }
  if (input.hasEmail) {
    score += 10;
    factors.push({ key: "email", points: 10, note: "E-mail gevonden" });
  }
  if (input.hasPhone) {
    score += 8;
    factors.push({ key: "phone", points: 8, note: "Telefoon gevonden" });
  }
  if (input.hasAddress) {
    score += 4;
    factors.push({ key: "address", points: 4, note: "Adres aanwezig" });
  }
  if (input.hasSocial) {
    score += 4;
    factors.push({ key: "social", points: 4, note: "Social presence" });
  }

  const sizePoints: Record<string, number> = {
    "1-10": 4,
    "11-50": 8,
    "51-200": 12,
    "201-500": 14,
    "501-1000": 16,
    "1000+": 18,
  };
  const size = input.employeeBand
    ? sizePoints[input.employeeBand] ?? 3
    : 3;
  score += size;
  factors.push({
    key: "size",
    points: size,
    note: `Grootteband ${input.employeeBand ?? "unknown"}`,
  });

  const revenuePoints: Record<string, number> = {
    unknown: 2,
    "<1M": 4,
    "1M-5M": 8,
    "5M-20M": 12,
    "20M-50M": 14,
    "50M+": 16,
  };
  const rev = input.revenueBand
    ? revenuePoints[input.revenueBand] ?? 2
    : 2;
  score += rev;
  factors.push({
    key: "revenue",
    points: rev,
    note: `Omzetklasse ${input.revenueBand ?? "unknown"}`,
  });

  const classBoost = [
    "software",
    "wholesale",
    "logistics",
    "manufacturing",
    "retail",
  ].includes(input.businessClass ?? "")
    ? 8
    : 3;
  score += classBoost;
  factors.push({
    key: "industry",
    points: classBoost,
    note: `Branche ${input.businessClass ?? "other"}`,
  });

  const digital = Math.round(input.digitalMaturity * 0.18);
  score += digital;
  factors.push({
    key: "digital_maturity",
    points: digital,
    note: "Digitale volwassenheid",
  });

  const fit = Math.round(input.storaflowFit * 0.2);
  score += fit;
  factors.push({
    key: "storaflow_fit",
    points: fit,
    note: "Match met Storaflow",
  });

  const highOps = input.opportunities.filter((o) => o.severity === "high").length;
  const oppPts = Math.min(12, highOps * 4 + input.opportunities.length);
  score += oppPts;
  factors.push({
    key: "opportunities",
    points: oppPts,
    note: `${input.opportunities.length} opportunity signal(s)`,
  });

  if (input.isDuplicate) {
    score -= 25;
    factors.push({
      key: "duplicate",
      points: -25,
      note: "Mogelijke duplicate",
    });
  }

  const finalScore = clamp(score);
  const confidence = Math.max(
    0.15,
    Math.min(
      0.98,
      input.analysisConfidence * 0.55 +
        (input.hasWebsite ? 0.15 : 0) +
        (input.hasEmail || input.hasPhone ? 0.15 : 0) +
        Math.min(0.2, input.opportunities.length * 0.04),
    ),
  );

  return {
    score: finalScore,
    quality: qualityFromScore(finalScore, input.employeeBand),
    confidence: Math.round(confidence * 100) / 100,
    factors,
    recommendation: recommendationFromScore(finalScore, input.opportunities),
  };
}
