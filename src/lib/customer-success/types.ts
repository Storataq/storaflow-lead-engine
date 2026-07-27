/**
 * Phase 27F — Customer Success shared types.
 */

import type {
  CrossSellProduct,
  CsRecommendationType,
  HealthClass,
  UpsellOpportunity,
} from "@/lib/customer-success/constants";
import type { Json } from "@/types/supabase";

export type CsOrgSettingsRow = {
  organization_id: string;
  enabled: boolean;
  approval_mode: string;
  provider: string;
  model: string;
  health_weights_json: Json;
  churn_threshold: number;
  renewal_window_days: number;
  notification_rules_json: Json;
  customer_segments_json: Json;
  rate_limit_per_minute: number;
  metadata_json: Json;
  created_at: string;
  updated_at: string;
};

export type CsProfileRow = {
  id: string;
  organization_id: string;
  company_id: string;
  health_score: number;
  health_class: string;
  churn_probability: number;
  churn_reason: string | null;
  churn_confidence: number;
  nps_score: number | null;
  csat_score: number | null;
  adoption_score: number;
  engagement_score: number;
  revenue_value: number;
  contract_ends_at: string | null;
  renewal_probability: number | null;
  owner_user_id: string | null;
  signals_json: Json;
  insights_json: Json;
  upsell_json: Json;
  cross_sell_json: Json;
  feature_adoption_json: Json;
  timeline_json: Json;
  ai_confidence: number;
  provider: string | null;
  model: string | null;
  analyzed_at: string;
  created_at: string;
  updated_at: string;
};

export type CsPlanRow = {
  id: string;
  organization_id: string;
  company_id: string;
  profile_id: string | null;
  name: string;
  status: string;
  milestones_json: Json;
  progress_percent: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CsRenewalRow = {
  id: string;
  organization_id: string;
  company_id: string;
  profile_id: string | null;
  contract_ends_at: string;
  renewal_probability: number;
  risk_level: string;
  status: string;
  recommendations_json: Json;
  tasks_json: Json;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CsOnboardingRow = {
  id: string;
  organization_id: string;
  company_id: string;
  profile_id: string | null;
  status: string;
  checklist_json: Json;
  progress_percent: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CsRecommendationRow = {
  id: string;
  organization_id: string;
  company_id: string | null;
  recommendation_type: string;
  title: string;
  rationale: string;
  priority: number;
  status: string;
  payload_json: Json;
  created_at: string;
};

export type CsAlertRow = {
  id: string;
  organization_id: string;
  company_id: string | null;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  status: string;
  payload_json: Json;
  created_at: string;
};

export type CsHistoryEventRow = {
  id: string;
  organization_id: string;
  company_id: string | null;
  event_type: string;
  actor_user_id: string | null;
  summary: string;
  payload_json: Json;
  provider: string | null;
  model: string | null;
  cost_usd: number;
  created_at: string;
};

export type CustomerSignalInput = {
  companyId: string;
  companyName: string;
  status: string;
  industry: string | null;
  country: string | null;
  updatedAt: string;
  createdAt: string;
  lastCheckedAt: string | null;
  intelligenceScore: number | null;
  openTasks: number;
  overdueTasks: number;
  noteCount: number;
  wonDealValue: number;
  openDealValue: number;
  daysSinceActivity: number;
  contactCount: number;
  billingPastDue: boolean;
  contractEndsAt: string | null;
  seatsPurchased: number | null;
  npsHint: number | null;
  csatHint: number | null;
};

export type HealthWeights = {
  activity: number;
  adoption: number;
  support: number;
  nps: number;
  revenue: number;
  contract: number;
  payment: number;
  tasks: number;
};

export type HealthResult = {
  healthScore: number;
  healthClass: HealthClass;
  adoptionScore: number;
  engagementScore: number;
  featureAdoption: Record<string, "high" | "low" | "never">;
  confidence: number;
};

export type ChurnResult = {
  probability: number;
  reason: string;
  confidence: number;
  actions: string[];
  impact: string;
};

export type RenewalResult = {
  contractEndsAt: string | null;
  probability: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  recommendations: string[];
  tasks: string[];
};

export type OnboardingItem = {
  id: string;
  label: string;
  done: boolean;
};

export type OnboardingResult = {
  items: OnboardingItem[];
  progressPercent: number;
  status: "not_started" | "in_progress" | "completed" | "stalled";
};

export type UpsellItem = {
  code: UpsellOpportunity;
  label: string;
  rationale: string;
};

export type CrossSellItem = {
  code: CrossSellProduct;
  label: string;
  rationale: string;
};

export type SuccessMilestone = {
  id: string;
  weekLabel: string;
  title: string;
  description: string;
  done: boolean;
};

export type CsInsightBundle = {
  strengths: string[];
  problems: string[];
  improvements: string[];
  risks: string[];
  opportunities: string[];
  actions: string[];
};

export type CsRecommendation = {
  type: CsRecommendationType;
  title: string;
  rationale: string;
  priority: number;
  companyId?: string;
  payload?: Record<string, unknown>;
};

export type CsAlert = {
  type:
    | "no_login"
    | "high_support"
    | "low_health"
    | "contract_expiring"
    | "negative_trend"
    | "onboarding_incomplete"
    | "payment_risk"
    | "churn_spike";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  message: string;
  companyId?: string;
};

export type CsFilters = {
  minHealth?: number;
  maxHealth?: number;
  healthClass?: string;
  minChurn?: number;
  ownerUserId?: string;
  country?: string;
  industry?: string;
  minConfidence?: number;
  q?: string;
};

export type CsDashboardStats = {
  customerCount: number;
  avgHealth: number;
  atRiskCount: number;
  highChurnCount: number;
  renewalsSoon: number;
  onboardingInProgress: number;
  upsellOpportunities: number;
  openRecommendations: number;
  openAlerts: number;
  recentRecommendations: CsRecommendation[];
};
