import type {
  ContactBadgeCode,
  HealthBand,
  IntelligenceSource,
  IntelligenceStatus,
  PreferredChannel,
} from "@/lib/crm/contact-intelligence/constants";
import type { Database } from "@/types/supabase";

export type ContactIntelligenceProfileRow =
  Database["public"]["Tables"]["contact_intelligence_profiles"]["Row"];

export type ContactIntelligenceRunRow =
  Database["public"]["Tables"]["contact_intelligence_runs"]["Row"];

export type ContactAiSummary = {
  who: string;
  currentRole: string;
  responsibilities: string;
  decisionMakingInfluence: string;
  possibleInterests: string[];
  communicationStyle: string;
  potentialValue: string;
  confidence: number;
};

export type ContactProfileBlock = {
  jobTitle: string | null;
  department: string | null;
  managementLevel: string | null;
  decisionMakerLevel: string | null;
  technicalRole: boolean;
  commercialRole: boolean;
  financeRole: boolean;
  operationsRole: boolean;
  estimatedSeniority: string | null;
  primaryLanguage: string | null;
  country: string | null;
  region: string | null;
  timezone: string | null;
};

export type DecisionMakerBlock = {
  buyingInfluence: number;
  decisionAuthority: number;
  budgetInfluence: number;
  technicalInfluence: number;
  executiveInfluence: number;
  isDecisionMaker: boolean;
  summary: string;
};

export type CommunicationPreferencesBlock = {
  preferredChannel: PreferredChannel;
  frequency: string;
  bestTiming: string;
  rationale: string;
};

export type ContactHealthBlock = {
  score: number;
  band: HealthBand;
  factors: Array<{ id: string; label: string; score: number; weight: number }>;
};

export type ContactQualityBlock = {
  score: number;
  explanations: Array<{ id: string; label: string; detail: string; points: number }>;
};

export type TimelineItem = {
  id: string;
  type: string;
  label: string;
  at: string;
  detail?: string;
};

export type InsightItem = {
  id: string;
  label: string;
  severity: "info" | "positive" | "warning" | "critical";
  confidence: number;
};

export type RecommendationItem = {
  id: string;
  action: string;
  priority: "high" | "medium" | "low";
  rationale: string;
};

export type ContactBadgeItem = {
  code: ContactBadgeCode;
  label: string;
};

export type ContactIntelligenceResult = {
  summary: ContactAiSummary;
  profile: ContactProfileBlock;
  decisionMaker: DecisionMakerBlock;
  communication: CommunicationPreferencesBlock;
  health: ContactHealthBlock;
  quality: ContactQualityBlock;
  timeline: TimelineItem[];
  insights: InsightItem[];
  recommendations: RecommendationItem[];
  badges: ContactBadgeItem[];
  confidence: number;
  needsReview: boolean;
  analyzedBy: "automatic" | "hybrid" | "manual";
  provider: string | null;
  model: string | null;
  signalsSummary: Record<string, unknown>;
};

export type ContactIntelligenceListFilters = {
  decisionMaker?: boolean;
  department?: string;
  managementLevel?: string;
  minHealthScore?: number;
  minQualityScore?: number;
  minConfidence?: number;
  country?: string;
  language?: string;
  preferredChannel?: PreferredChannel;
  q?: string;
};

export type IntelligenceStatusAlias = IntelligenceStatus;
export type IntelligenceSourceAlias = IntelligenceSource;
