/**
 * Opportunity Insights & Next Best Action — contracts (Phase 18).
 * Deterministic, explainable, AI-ready. isAiGenerated always false for now.
 */

export type OpportunityClassification =
  | "strategic"
  | "high_potential"
  | "promising"
  | "nurture"
  | "low_potential"
  | "insufficient_data";

export type SalesUrgency = "immediate" | "high" | "medium" | "low" | "none";

export type OutreachReadinessStatus =
  | "ready"
  | "almost_ready"
  | "needs_enrichment"
  | "blocked"
  | "excluded";

export type RecommendedChannel =
  | "email"
  | "phone"
  | "linkedin"
  | "website_form"
  | "manual_research"
  | "no_outreach";

export type NbaPriority =
  | "immediate"
  | "high"
  | "medium"
  | "low"
  | "no_action";

export type InsightPolarity = "positive" | "neutral" | "negative";

export type InsightCategory =
  | "strength"
  | "weakness"
  | "opportunity"
  | "risk";

export type SuggestedPipelineStage =
  | "new"
  | "qualified"
  | "contact_planned"
  | "contacted"
  | "engaged"
  | "proposal"
  | "nurture"
  | "closed"
  | "archive";

export type OpportunityMatrixQuadrant =
  | "prioritize_now"
  | "strategic_nurture"
  | "quick_wins"
  | "low_priority";

export interface AIInsightMetadata {
  provider?: string;
  model?: string;
  generatedAt?: string;
  confidence?: number;
  explanation?: string;
  sourceIds?: string[];
  isAiGenerated: boolean;
}

export interface OpportunityScoreBreakdownItem {
  key: string;
  label: string;
  weight: number;
  rawScore: number;
  weightedContribution: number;
  explanation: string;
}

export interface OpportunityScore {
  total: number;
  breakdown: OpportunityScoreBreakdownItem[];
  calculatedAt: string;
  metadata: AIInsightMetadata;
}

export interface CommercialPotential {
  estimatedDealValue: number;
  estimatedMonthlyValue: number;
  estimatedAnnualValue: number;
  conversionProbability: number;
  expectedValue: number;
  salesUrgency: SalesUrgency;
  suggestedPipelineStage: SuggestedPipelineStage;
  currency: string;
  isEstimate: true;
}

export interface BuyingSignal {
  id: string;
  name: string;
  strength: number;
  confidence: number;
  explanation: string;
  source: string;
  detectedAt: string;
  polarity: InsightPolarity;
  simulated: true;
}

export interface OpportunityInsight {
  id: string;
  category: InsightCategory;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  confidence: number;
  recommendedResponse: string;
  metadata: AIInsightMetadata;
}

export interface OpportunityRisk {
  id: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  confidence: number;
  recommendedResponse: string;
}

export interface NextBestActionRecommendation {
  id: string;
  title: string;
  priority: NbaPriority;
  reason: string;
  suggestedTiming: string;
  recommendedChannel: RecommendedChannel;
  expectedOutcome: string;
  confidence: number;
  prerequisites: string[];
  metadata: AIInsightMetadata;
}

export interface OutreachReadinessChecklistItem {
  key: string;
  label: string;
  complete: boolean;
  required: boolean;
}

export interface OutreachReadiness {
  score: number;
  status: OutreachReadinessStatus;
  checklist: OutreachReadinessChecklistItem[];
  notice: string;
}

export interface ChannelRecommendation {
  primary: RecommendedChannel;
  alternative: RecommendedChannel;
  reason: string;
  confidence: number;
  missingPrerequisites: string[];
}

export interface PipelineRecommendation {
  stage: SuggestedPipelineStage;
  reason: string;
  confidence: number;
}

export interface OpportunityTimelineEvent {
  id: string;
  label: string;
  description: string;
  occurredAt: string;
  type: string;
}

export interface OpportunityRecord {
  leadId: string;
  companyName: string;
  industry: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  qualificationScore: number;
  qualificationLabel: string;
  score: OpportunityScore;
  classification: OpportunityClassification;
  commercial: CommercialPotential;
  buyingSignals: BuyingSignal[];
  insights: OpportunityInsight[];
  risks: OpportunityRisk[];
  nextBestActions: {
    primary: NextBestActionRecommendation;
    secondary: NextBestActionRecommendation;
  };
  outreachReadiness: OutreachReadiness;
  channel: ChannelRecommendation;
  pipelineRecommendation: PipelineRecommendation;
  timeline: OpportunityTimelineEvent[];
  matrixQuadrant: OpportunityMatrixQuadrant;
  lastActivityAt: string;
  needsReview: boolean;
  hasEmail: boolean;
  hasPhone: boolean;
}

export interface OpportunityOverviewKpi {
  key: string;
  label: string;
  value: string;
  explanation: string;
  tooltip: string;
  trendLabel: string;
  trendDirection: "up" | "down" | "flat";
}

export interface OpportunityExecutiveInsights {
  highestPotential: OpportunityRecord | null;
  mostUrgent: OpportunityRecord | null;
  bestCampaignCandidate: OpportunityRecord | null;
  highestExpectedValue: OpportunityRecord | null;
  strongestBuyingSignals: OpportunityRecord | null;
  mostCompleteProfile: OpportunityRecord | null;
  needingEnrichment: OpportunityRecord | null;
  atRisk: OpportunityRecord | null;
}
