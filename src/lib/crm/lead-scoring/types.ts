import type {
  BuyingReadiness,
  LeadClassification,
  OpportunityBand,
  ScoringCategory,
  SubScoreKey,
} from "@/lib/crm/lead-scoring/constants";

export type CategoryScore = {
  category: ScoringCategory;
  score: number;
  weight: number;
  weighted: number;
  rationale: string;
};

export type ExplanationItem = {
  code: string;
  label: string;
  sentiment: "positive" | "negative" | "neutral";
};

export type RiskItem = {
  code: string;
  label: string;
  severity: "low" | "medium" | "high";
};

export type NextBestActionItem = {
  id: string;
  action: string;
  priority: "high" | "medium" | "low";
  rationale: string;
};

export type LeadScoringResult = {
  overallScore: number;
  classification: LeadClassification;
  opportunityBand: OpportunityBand;
  opportunityConfidence: number;
  riskScore: number;
  buyingReadiness: BuyingReadiness;
  confidence: number;
  categoryScores: CategoryScore[];
  subScores: Record<SubScoreKey, number>;
  explanations: ExplanationItem[];
  risks: RiskItem[];
  nextBestActions: NextBestActionItem[];
  signalsSummary: Record<string, unknown>;
  weightsSnapshot: Record<string, number>;
  provider: string | null;
  model: string | null;
};
