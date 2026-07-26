export type {
  AIInsightMetadata,
  BuyingSignal,
  ChannelRecommendation,
  CommercialPotential,
  NextBestActionRecommendation,
  OpportunityClassification,
  OpportunityExecutiveInsights,
  OpportunityInsight,
  OpportunityOverviewKpi,
  OpportunityRecord,
  OpportunityRisk,
  OpportunityScore,
  OpportunityScoreBreakdownItem,
  OutreachReadiness,
  PipelineRecommendation,
  RecommendedChannel,
  SalesUrgency,
  SuggestedPipelineStage,
} from "@/lib/crm/opportunity-insights/types";

export {
  buildExecutiveInsights,
  buildOpportunityOverview,
  buildOpportunityRecord,
  buildOpportunityRecords,
  channelLabel,
  classificationLabel,
  quadrantLabel,
  readinessLabel,
  stageLabel,
} from "@/lib/crm/opportunity-insights/engine";

export {
  OPPORTUNITY_ENGINE_NOTICE,
  OPPORTUNITY_INSIGHTS_VERSION,
  OUTREACH_LEGAL_NOTICE,
} from "@/lib/crm/opportunity-insights/mock-data";
