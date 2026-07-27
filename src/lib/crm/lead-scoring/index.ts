/**
 * Phase 25E — AI Lead Scoring Engine public surface.
 */

export {
  SCORING_CATEGORIES,
  SCORING_CATEGORY_LABELS,
  DEFAULT_CATEGORY_WEIGHTS,
  SUB_SCORE_KEYS,
  SUB_SCORE_LABELS,
  LEAD_CLASSIFICATIONS,
  LEAD_CLASSIFICATION_LABELS,
  CLASSIFICATION_COLORS,
  OPPORTUNITY_BANDS,
  OPPORTUNITY_BAND_LABELS,
  BUYING_READINESS_VALUES,
  BUYING_READINESS_LABELS,
  LEAD_SCORING_AUTOMATION_EVENTS,
  classificationFromScore,
  opportunityBandFromScore,
  type ScoringCategory,
  type SubScoreKey,
  type LeadClassification,
  type OpportunityBand,
  type BuyingReadiness,
} from "@/lib/crm/lead-scoring/constants";

export { computeLeadScore } from "@/lib/crm/lead-scoring/score";
export { collectLeadScoringSignals } from "@/lib/crm/lead-scoring/signals";
export { generateLeadScore } from "@/lib/crm/lead-scoring/generate";
export { applyLeadScoringResult } from "@/lib/crm/lead-scoring/apply";
export {
  ensureLeadScoringSettings,
  defaultScoringSettings,
} from "@/lib/crm/lead-scoring/settings";
export { maybeRecalculateLeadScoreInBackground } from "@/lib/crm/lead-scoring/background";

export {
  getLeadScoringProfile,
  listLeadScoreHistory,
  listOpenScoringAlerts,
  listScoredLeads,
  buildLeadScoringLeaderboards,
} from "@/lib/crm/lead-scoring/queries";

export {
  recalculateLeadScoreAction,
  recalculateLeadScoresBatchAction,
  updateLeadScoringSettingsAction,
  acknowledgeScoringAlertAction,
} from "@/lib/crm/lead-scoring/actions";

export type {
  LeadScoringResult,
  CategoryScore,
  ExplanationItem,
  RiskItem,
  NextBestActionItem,
} from "@/lib/crm/lead-scoring/types";
