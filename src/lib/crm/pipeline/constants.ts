/**
 * Phase 25C — sales pipeline constants (probabilities, close reasons, task types).
 */

export const DEFAULT_STAGE_PROBABILITIES: Record<string, number> = {
  nieuw: 10,
  gekwalificeerd: 25,
  "contact-gepland": 35,
  "eerste-email": 40,
  "follow-up": 50,
  "demo-gepland": 60,
  onderhandeling: 75,
  gewonnen: 100,
  verloren: 0,
};

export const DEAL_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

export type DealPriority = (typeof DEAL_PRIORITIES)[number]["value"];

export const CRM_TASK_TYPES = [
  { value: "call", label: "Call" },
  { value: "meeting", label: "Meeting" },
  { value: "email", label: "Email" },
  { value: "follow_up", label: "Follow-up" },
  { value: "demo", label: "Demo" },
  { value: "proposal", label: "Proposal" },
  { value: "reminder", label: "Reminder" },
  { value: "internal", label: "Internal Task" },
] as const;

export type CrmTaskType = (typeof CRM_TASK_TYPES)[number]["value"];

export const DEFAULT_LOST_REASONS = [
  { code: "price", label: "Price" },
  { code: "no_budget", label: "No Budget" },
  { code: "no_response", label: "No Response" },
  { code: "timing", label: "Timing" },
  { code: "competitor", label: "Competitor" },
  { code: "other", label: "Other" },
] as const;

export const DEFAULT_WON_REASONS = [
  { code: "product_fit", label: "Product Fit" },
  { code: "relationship", label: "Relationship" },
  { code: "price", label: "Price" },
  { code: "features", label: "Features" },
  { code: "support", label: "Support" },
  { code: "referral", label: "Referral" },
] as const;

export const PIPELINE_AUTOMATION_EVENTS = [
  "stage_changed",
  "deal_won",
  "deal_lost",
  "task_overdue",
  "deal_inactive",
  "large_opportunity",
  "lead_became_hot",
  "lead_score_increased",
  "lead_score_decreased",
  "lead_opportunity_increased",
  "lead_risk_increased",
  "lead_decision_maker_found",
  "lead_needs_attention",
  "lead_score_recalculated",
] as const;

export type PipelineAutomationEvent =
  (typeof PIPELINE_AUTOMATION_EVENTS)[number];

export function effectiveDealProbability(
  dealProbability: number | null | undefined,
  stageProbability: number | null | undefined,
): number {
  if (dealProbability != null && Number.isFinite(dealProbability)) {
    return Math.max(0, Math.min(100, Number(dealProbability)));
  }
  if (stageProbability != null && Number.isFinite(stageProbability)) {
    return Math.max(0, Math.min(100, Number(stageProbability)));
  }
  return 0;
}

export function weightedRevenue(
  value: number,
  probabilityPercent: number,
): number {
  return (Number(value) || 0) * (probabilityPercent / 100);
}
