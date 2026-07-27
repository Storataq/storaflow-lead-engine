/**
 * Phase 27B — AI Prospecting public barrel (client-safe).
 */

export {
  PROSPECTING_AGENT_SLUG,
  PROSPECTING_AGENT_VERSION,
  BUSINESS_CLASSES,
  BUSINESS_CLASS_LABELS,
  LEAD_QUALITIES,
  LEAD_QUALITY_LABELS,
  PROSPECT_RECOMMENDATIONS,
  PROSPECT_RECOMMENDATION_LABELS,
  PROSPECT_STATUSES,
  PROSPECT_STATUS_LABELS,
  DECISION_MAKER_ROLES,
  OPPORTUNITY_CODES,
  OPPORTUNITY_LABELS,
  EMPLOYEE_BANDS,
  REVENUE_BANDS,
  PROSPECTING_UI,
  PROSPECTING_NAV,
} from "@/lib/prospecting/constants";

export type {
  BusinessClass,
  LeadQuality,
  ProspectRecommendation,
  ProspectStatus,
  OpportunityCode,
} from "@/lib/prospecting/constants";

export {
  classifyBusiness,
} from "@/lib/prospecting/classify";

export {
  computeProspectScore,
  qualityFromScore,
  recommendationFromScore,
} from "@/lib/prospecting/score";

export {
  detectOpportunities,
  suggestDecisionMakers,
} from "@/lib/prospecting/opportunities";

export {
  analyzeWebsiteContent,
  estimateDigitalMaturity,
  websiteLooksOutdated,
} from "@/lib/prospecting/analyze";

export {
  normalizeProspectName,
  normalizeDomainFromUrl,
} from "@/lib/prospecting/duplicates";

export {
  prospectsToCsv,
  prospectsToJson,
  prospectsToExcelCsv,
  prospectsToPdfText,
} from "@/lib/prospecting/export";
