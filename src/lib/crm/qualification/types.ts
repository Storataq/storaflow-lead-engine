/**
 * Lead Qualification Engine — contracts (Phase 17).
 * Mock-ready interfaces for future intelligent prioritization.
 * No AI / API implementations in this phase.
 */

export type LeadClassification = "hot" | "warm" | "cold" | "unqualified";

export type LeadPriority = "critical" | "high" | "medium" | "low";

export type SalesProbability = 10 | 25 | 50 | 75 | 90;

export type NextBestActionType =
  | "call_company"
  | "visit_website"
  | "verify_email"
  | "research_business"
  | "schedule_follow_up"
  | "add_to_campaign"
  | "review_later";

export type QualificationHistoryEventType =
  | "lead_created"
  | "qualified"
  | "reviewed"
  | "assigned"
  | "contact_planned"
  | "campaign_ready";

export interface LeadScoreFactor {
  key: string;
  label: string;
  points: number;
  maxPoints: number;
  active: boolean;
  weight: number;
}

export interface LeadScore {
  total: number;
  percentage: number;
  color: "green" | "orange" | "red" | "slate";
  factors: LeadScoreFactor[];
  calculatedAt: string;
}

export interface OpportunityScore {
  total: number;
  percentage: number;
  factors: {
    key: string;
    label: string;
    score: number;
    weight: number;
  }[];
  calculatedAt: string;
}

export interface Recommendation {
  id: string;
  type: NextBestActionType;
  label: string;
  rationale: string;
  priority: LeadPriority;
}

export interface NextBestAction {
  primary: Recommendation;
  alternatives: Recommendation[];
}

export interface QualificationHistoryEvent {
  id: string;
  type: QualificationHistoryEventType;
  label: string;
  description: string;
  occurredAt: string;
}

export interface QualificationMetrics {
  totalLeads: number;
  qualifiedLeads: number;
  unqualifiedLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  averageQualificationScore: number;
  conversionPotential: number;
  priorityCounts: Record<LeadPriority, number>;
  probabilityDistribution: Record<SalesProbability, number>;
}

export interface LeadQualification {
  leadId: string;
  companyName: string;
  score: LeadScore;
  opportunity: OpportunityScore;
  confidence: number;
  classification: LeadClassification;
  qualified: boolean;
  priority: LeadPriority;
  salesProbability: SalesProbability;
  nextBestAction: NextBestAction;
  history: QualificationHistoryEvent[];
  strengths: string[];
  weaknesses: string[];
  profileCompleteness: number;
  updatedAt: string;
}
