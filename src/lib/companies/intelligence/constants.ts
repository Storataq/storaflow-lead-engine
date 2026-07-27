/**
 * Phase 25A — Company Intelligence constants & score bands.
 */

export const INTELLIGENCE_PROMPT_VERSION = "25a.1";

export const HEALTH_BANDS = {
  excellentMin: 80,
  goodMin: 65,
  averageMin: 45,
} as const;

export type HealthBand =
  | "excellent"
  | "good"
  | "average"
  | "needs_attention";

export function healthBandFromScore(score: number): HealthBand {
  if (score >= HEALTH_BANDS.excellentMin) return "excellent";
  if (score >= HEALTH_BANDS.goodMin) return "good";
  if (score >= HEALTH_BANDS.averageMin) return "average";
  return "needs_attention";
}

export const HEALTH_BAND_LABELS: Record<HealthBand, string> = {
  excellent: "Excellent",
  good: "Good",
  average: "Average",
  needs_attention: "Needs Attention",
};

export type LeadTemperature = "hot" | "warm" | "cold" | "very_cold";

export function leadTemperatureFromScore(score: number): LeadTemperature {
  if (score >= 75) return "hot";
  if (score >= 55) return "warm";
  if (score >= 35) return "cold";
  return "very_cold";
}

export const LEAD_TEMPERATURE_LABELS: Record<LeadTemperature, string> = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
  very_cold: "Very Cold",
};

export type IntelligenceStatus =
  | "idle"
  | "processing"
  | "completed"
  | "failed";

export type IntelligenceSource =
  | "manual"
  | "enrichment"
  | "scheduled"
  | "api";
