import type {
  HealthBand,
  IntelligenceSource,
  IntelligenceStatus,
  LeadTemperature,
} from "@/lib/companies/intelligence/constants";
import type { Database } from "@/types/supabase";

export type CompanyIntelligenceProfileRow =
  Database["public"]["Tables"]["company_intelligence_profiles"]["Row"];

export type CompanyIntelligenceRunRow =
  Database["public"]["Tables"]["company_intelligence_runs"]["Row"];

export type AiSummaryBlock = {
  whatTheyDo: string;
  targetAudience: string;
  productsServices: string;
  businessModel: string;
  estimatedSize: string;
  marketPosition: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  confidence: number;
};

export type BusinessProfileBlock = {
  industry: string | null;
  subIndustry: string | null;
  businessCategory: string | null;
  companyType: string | null;
  audience: "b2b" | "b2c" | "both" | "unknown";
  estimatedEmployees: string | null;
  estimatedRevenue: string | null;
  foundedYear: number | null;
  country: string | null;
  region: string | null;
  languages: string[];
};

export type OnlinePresenceBlock = {
  websiteAvailable: boolean;
  sslLikely: boolean;
  mobileFriendlyUnknown: boolean;
  social: {
    facebook: boolean;
    instagram: boolean;
    linkedin: boolean;
    x: boolean;
    youtube: boolean;
    tiktok: boolean;
  };
  googleBusiness: boolean;
  reviewPlatforms: boolean;
  websiteQualityScore: number;
};

export type InsightItem = {
  id: string;
  label: string;
  severity: "info" | "positive" | "warning" | "critical";
  confidence: number;
};

export type HealthBlock = {
  score: number;
  band: HealthBand;
  factors: Array<{ id: string; label: string; score: number; weight: number }>;
};

export type LeadPotentialBlock = {
  score: number;
  temperature: LeadTemperature;
  reasons: string[];
};

export type ContactQualityBlock = {
  score: number;
  emailAvailable: boolean;
  phoneAvailable: boolean;
  decisionMakersLikely: boolean;
  linkedinPresence: boolean;
  summary: string;
};

export type GrowthSignalItem = {
  id: string;
  label: string;
  evidence: string;
};

export type RecommendationItem = {
  id: string;
  action: string;
  priority: "high" | "medium" | "low";
  rationale: string;
};

export type CompanyIntelligenceResult = {
  summary: AiSummaryBlock;
  businessProfile: BusinessProfileBlock;
  onlinePresence: OnlinePresenceBlock;
  insights: InsightItem[];
  health: HealthBlock;
  leadPotential: LeadPotentialBlock;
  contactQuality: ContactQualityBlock;
  growthSignals: GrowthSignalItem[];
  recommendations: RecommendationItem[];
  confidence: number;
  needsReview: boolean;
  analyzedBy: "automatic" | "hybrid" | "manual";
  provider: string | null;
  model: string | null;
  signalsSummary: Record<string, unknown>;
};

export type GenerateIntelligenceInput = {
  organizationId: string;
  companyId: string;
  source?: IntelligenceSource;
  actorUserId?: string | null;
  useAi?: boolean;
};

export type IntelligencePanelData = {
  profile: CompanyIntelligenceProfileRow | null;
  latestRun: CompanyIntelligenceRunRow | null;
  status: IntelligenceStatus;
};
