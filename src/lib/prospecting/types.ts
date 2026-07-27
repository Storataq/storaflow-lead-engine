/**
 * Phase 27B — Prospecting types.
 */

import type {
  BusinessClass,
  LeadQuality,
  OpportunityCode,
  ProspectRecommendation,
  ProspectStatus,
} from "@/lib/prospecting/constants";
import type { Json } from "@/types/supabase";

export type ProspectingOrgSettingsRow = {
  organization_id: string;
  enabled: boolean;
  min_lead_score: number;
  min_ai_confidence: number;
  auto_enrich: boolean;
  auto_crm_suggest: boolean;
  approval_mode: string;
  provider: string;
  model: string;
  rate_limit_per_minute: number;
  metadata_json: Json;
  created_at: string;
  updated_at: string;
};

export type ProspectingSearchRow = {
  id: string;
  organization_id: string;
  name: string;
  status: string;
  industry: string | null;
  industries_json: Json;
  country: string | null;
  region: string | null;
  city: string | null;
  company_size: string | null;
  employee_band: string | null;
  revenue_band: string | null;
  technology: string | null;
  tags_json: Json;
  keywords_json: Json;
  keyword: string | null;
  min_lead_score: number | null;
  created_by: string | null;
  deleted_at: string | null;
  metadata_json: Json;
  created_at: string;
  updated_at: string;
};

export type ProspectingProspectRow = {
  id: string;
  organization_id: string;
  search_id: string | null;
  company_id: string | null;
  crm_lead_id: string | null;
  company_name: string;
  normalized_name: string;
  website_url: string | null;
  normalized_domain: string | null;
  industry: string | null;
  business_class: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  company_size: string | null;
  employee_band: string | null;
  revenue_band: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  description: string | null;
  social_json: Json;
  technologies_json: Json;
  tags_json: Json;
  analysis_json: Json;
  enrichment_json: Json;
  opportunities_json: Json;
  decision_makers_json: Json;
  research_summary: string | null;
  lead_score: number;
  lead_quality: string;
  ai_confidence: number;
  recommendation: string;
  status: string;
  duplicate_of_prospect_id: string | null;
  is_duplicate: boolean;
  source: string;
  last_researched_at: string | null;
  last_scored_at: string | null;
  provider: string | null;
  model: string | null;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  created_by: string | null;
  deleted_at: string | null;
  metadata_json: Json;
  created_at: string;
  updated_at: string;
};

export type ProspectingResearchRunRow = {
  id: string;
  organization_id: string;
  prospect_id: string;
  agent_id: string | null;
  ai_run_id: string | null;
  status: string;
  stage: string;
  input_json: Json;
  output_json: Json;
  error_message: string | null;
  provider: string | null;
  model: string | null;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  latency_ms: number;
  started_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProspectingHistoryEventRow = {
  id: string;
  organization_id: string;
  prospect_id: string | null;
  search_id: string | null;
  research_run_id: string | null;
  event_type: string;
  actor_user_id: string | null;
  summary: string;
  payload_json: Json;
  provider: string | null;
  model: string | null;
  cost_usd: number;
  created_at: string;
};

export type ProspectingBulkJobRow = {
  id: string;
  organization_id: string;
  job_type: string;
  status: string;
  total_count: number;
  success_count: number;
  failure_count: number;
  input_json: Json;
  result_json: Json;
  error_message: string | null;
  created_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyAnalysisResult = {
  summary: string;
  whatTheyDo: string;
  products: string[];
  services: string[];
  audience: string;
  usps: string[];
  technologies: string[];
  socialHints: Record<string, string>;
  contactHints: { emails: string[]; phones: string[] };
  businessClass: BusinessClass;
  industry: string;
  confidence: number;
};

export type DetectedOpportunity = {
  code: OpportunityCode;
  label: string;
  severity: "low" | "medium" | "high";
  rationale: string;
};

export type DecisionMakerSuggestion = {
  role: string;
  rationale: string;
  priority: number;
};

export type ProspectScoreResult = {
  score: number;
  quality: LeadQuality;
  confidence: number;
  factors: Array<{ key: string; points: number; note: string }>;
  recommendation: ProspectRecommendation;
};

export type ProspectFilters = {
  minScore?: number;
  maxScore?: number;
  country?: string;
  region?: string;
  industry?: string;
  businessClass?: string;
  employeeBand?: string;
  status?: ProspectStatus | string;
  tag?: string;
  minConfidence?: number;
  recommendation?: string;
  q?: string;
};

export type ProspectingDashboardStats = {
  totalProspects: number;
  newProspects: number;
  topOpportunities: number;
  avgScore: number;
  scoredCount: number;
  crmLinked: number;
  scoreBuckets: Record<string, number>;
  classDistribution: Record<string, number>;
  countryDistribution: Record<string, number>;
  recentRecommendations: Array<{
    id: string;
    company_name: string;
    recommendation: string;
    lead_score: number;
  }>;
};
