/**
 * Phase 25E — AI Lead Scoring Engine constants.
 */

export const SCORING_PROMPT_VERSION = "25e.1";

export const SCORING_CATEGORIES = [
  "website_quality",
  "website_technology",
  "seo",
  "social_presence",
  "business_completeness",
  "contact_completeness",
  "decision_makers",
  "industry_match",
  "company_size",
  "revenue_estimate",
  "employee_estimate",
  "geographic_region",
  "activity",
  "email_engagement",
  "campaign_engagement",
  "crm_activity",
  "historical_success",
  "review_reputation",
  "growth_signals",
  "ai_confidence",
] as const;

export type ScoringCategory = (typeof SCORING_CATEGORIES)[number];

export const SCORING_CATEGORY_LABELS: Record<ScoringCategory, string> = {
  website_quality: "Website Quality",
  website_technology: "Website Technology",
  seo: "SEO",
  social_presence: "Social Presence",
  business_completeness: "Business Completeness",
  contact_completeness: "Contact Completeness",
  decision_makers: "Decision Makers",
  industry_match: "Industry Match",
  company_size: "Company Size",
  revenue_estimate: "Revenue Estimate",
  employee_estimate: "Employee Estimate",
  geographic_region: "Geographic Region",
  activity: "Activity",
  email_engagement: "Email Engagement",
  campaign_engagement: "Campaign Engagement",
  crm_activity: "CRM Activity",
  historical_success: "Historical Success",
  review_reputation: "Review Reputation",
  growth_signals: "Growth Signals",
  ai_confidence: "AI Confidence",
};

/** Default equal-ish weights (sum ≈ 100). Orgs can override via settings. */
export const DEFAULT_CATEGORY_WEIGHTS: Record<ScoringCategory, number> = {
  website_quality: 8,
  website_technology: 4,
  seo: 4,
  social_presence: 5,
  business_completeness: 7,
  contact_completeness: 8,
  decision_makers: 8,
  industry_match: 5,
  company_size: 4,
  revenue_estimate: 3,
  employee_estimate: 3,
  geographic_region: 3,
  activity: 6,
  email_engagement: 6,
  campaign_engagement: 5,
  crm_activity: 6,
  historical_success: 4,
  review_reputation: 3,
  growth_signals: 5,
  ai_confidence: 3,
};

export const SUB_SCORE_KEYS = [
  "website",
  "contact",
  "company",
  "marketing",
  "sales",
  "engagement",
  "growth",
  "relationship",
] as const;

export type SubScoreKey = (typeof SUB_SCORE_KEYS)[number];

export const SUB_SCORE_LABELS: Record<SubScoreKey, string> = {
  website: "Website Score",
  contact: "Contact Score",
  company: "Company Score",
  marketing: "Marketing Score",
  sales: "Sales Score",
  engagement: "Engagement Score",
  growth: "Growth Score",
  relationship: "Relationship Score",
};

export const LEAD_CLASSIFICATIONS = [
  "very_hot",
  "hot",
  "warm",
  "cold",
  "very_cold",
] as const;

export type LeadClassification = (typeof LEAD_CLASSIFICATIONS)[number];

export const LEAD_CLASSIFICATION_LABELS: Record<LeadClassification, string> = {
  very_hot: "Very Hot",
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
  very_cold: "Very Cold",
};

export const DEFAULT_CLASSIFICATION_RANGES = {
  very_hotMin: 85,
  hotMin: 70,
  warmMin: 50,
  coldMin: 30,
} as const;

export function classificationFromScore(
  score: number,
  ranges = DEFAULT_CLASSIFICATION_RANGES,
): LeadClassification {
  if (score >= ranges.very_hotMin) return "very_hot";
  if (score >= ranges.hotMin) return "hot";
  if (score >= ranges.warmMin) return "warm";
  if (score >= ranges.coldMin) return "cold";
  return "very_cold";
}

export const CLASSIFICATION_COLORS: Record<LeadClassification, string> = {
  very_hot: "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/30",
  hot: "bg-orange-500/15 text-orange-800 dark:text-orange-200 border-orange-500/30",
  warm: "bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-500/30",
  cold: "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-500/30",
  very_cold: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
};

export const OPPORTUNITY_BANDS = [
  "very_high",
  "high",
  "medium",
  "low",
  "very_low",
] as const;

export type OpportunityBand = (typeof OPPORTUNITY_BANDS)[number];

export const OPPORTUNITY_BAND_LABELS: Record<OpportunityBand, string> = {
  very_high: "Very High",
  high: "High",
  medium: "Medium",
  low: "Low",
  very_low: "Very Low",
};

export function opportunityBandFromScore(score: number): OpportunityBand {
  if (score >= 85) return "very_high";
  if (score >= 70) return "high";
  if (score >= 50) return "medium";
  if (score >= 30) return "low";
  return "very_low";
}

export const BUYING_READINESS_VALUES = [
  "ready_now",
  "ready_soon",
  "researching",
  "unknown",
  "long_term",
] as const;

export type BuyingReadiness = (typeof BUYING_READINESS_VALUES)[number];

export const BUYING_READINESS_LABELS: Record<BuyingReadiness, string> = {
  ready_now: "Ready Now",
  ready_soon: "Ready Soon",
  researching: "Researching",
  unknown: "Unknown",
  long_term: "Long Term",
};

export const SCORING_ALERT_TYPES = [
  "became_hot",
  "score_increased",
  "score_decreased",
  "opportunity_increased",
  "risk_increased",
  "decision_maker_found",
  "needs_attention",
  "custom",
] as const;

export type ScoringAlertType = (typeof SCORING_ALERT_TYPES)[number];

export const SCORING_NBA_EXAMPLES = [
  "Call immediately",
  "Send proposal",
  "Schedule demo",
  "Enroll campaign",
  "Wait one week",
  "Research company",
  "Assign sales owner",
] as const;

export const LEAD_SCORING_AUTOMATION_EVENTS = [
  "lead_became_hot",
  "lead_score_increased",
  "lead_score_decreased",
  "lead_opportunity_increased",
  "lead_risk_increased",
  "lead_decision_maker_found",
  "lead_needs_attention",
  "lead_score_recalculated",
] as const;

export type LeadScoringAutomationEvent =
  (typeof LEAD_SCORING_AUTOMATION_EVENTS)[number];
