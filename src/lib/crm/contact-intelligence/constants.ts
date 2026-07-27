/**
 * Phase 25B — Contact Intelligence constants & score bands.
 */

export const CONTACT_INTELLIGENCE_PROMPT_VERSION = "25b.1";

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

export type IntelligenceStatus =
  | "idle"
  | "processing"
  | "completed"
  | "failed";

export type IntelligenceSource =
  | "manual"
  | "enrichment"
  | "scheduled"
  | "api"
  | "lead";

export type PreferredChannel =
  | "email"
  | "phone"
  | "linkedin"
  | "meeting"
  | "unknown";

export type ContactBadgeCode =
  | "ceo"
  | "founder"
  | "owner"
  | "director"
  | "manager"
  | "buyer"
  | "marketing"
  | "finance"
  | "operations"
  | "hot_lead"
  | "decision_maker"
  | "vip"
  | "technical"
  | "commercial";

export const CONTACT_BADGE_LABELS: Record<ContactBadgeCode, string> = {
  ceo: "CEO",
  founder: "Founder",
  owner: "Owner",
  director: "Director",
  manager: "Manager",
  buyer: "Buyer",
  marketing: "Marketing",
  finance: "Finance",
  operations: "Operations",
  hot_lead: "Hot Lead",
  decision_maker: "Decision Maker",
  vip: "VIP",
  technical: "Technical",
  commercial: "Commercial",
};
