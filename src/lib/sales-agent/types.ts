/**
 * Phase 27C — Sales agent shared types.
 */

import type {
  NextBestAction,
  RiskLevel,
  SalesOpportunityCode,
} from "@/lib/sales-agent/constants";
import type { Json } from "@/types/supabase";

export type SalesAgentOrgSettingsRow = {
  organization_id: string;
  enabled: boolean;
  approval_mode: string;
  provider: string;
  model: string;
  forecast_sensitivity: number;
  risk_threshold: number;
  reminder_frequency_hours: number;
  working_hours_start: number;
  working_hours_end: number;
  timezone: string;
  notification_rules_json: Json;
  rate_limit_per_minute: number;
  metadata_json: Json;
  created_at: string;
  updated_at: string;
};

export type SalesDealInsightRow = {
  id: string;
  organization_id: string;
  deal_id: string;
  priority_score: number;
  closing_probability: number;
  expected_revenue: number;
  risk_level: string;
  risk_score: number;
  predicted_close_date: string | null;
  next_best_action: string;
  obstacles_json: Json;
  missed_activities_json: Json;
  coach_tips_json: Json;
  opportunities_json: Json;
  analysis_json: Json;
  ai_confidence: number;
  provider: string | null;
  model: string | null;
  analyzed_at: string;
  created_at: string;
  updated_at: string;
};

export type SalesDailyBriefingRow = {
  id: string;
  organization_id: string;
  user_id: string | null;
  briefing_date: string;
  greeting: string;
  summary_json: Json;
  priorities_json: Json;
  follow_ups_count: number;
  high_risk_count: number;
  new_opportunities_count: number;
  waiting_reply_count: number;
  expiring_quotes_count: number;
  provider: string | null;
  model: string | null;
  created_at: string;
};

export type SalesForecastSnapshotRow = {
  id: string;
  organization_id: string;
  period_type: string;
  period_key: string;
  forecast_revenue: number;
  pipeline_revenue: number;
  weighted_revenue: number;
  target_revenue: number | null;
  target_hit_probability: number | null;
  confidence: number;
  breakdown_json: Json;
  created_by: string | null;
  created_at: string;
};

export type SalesMeetingBriefRow = {
  id: string;
  organization_id: string;
  deal_id: string | null;
  lead_id: string | null;
  company_id: string | null;
  title: string;
  meeting_at: string | null;
  brief_json: Json;
  summary_json: Json;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SalesEmailDraftRow = {
  id: string;
  organization_id: string;
  deal_id: string | null;
  lead_id: string | null;
  template_type: string;
  subject: string;
  body_text: string;
  status: string;
  provider: string | null;
  model: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SalesHistoryEventRow = {
  id: string;
  organization_id: string;
  deal_id: string | null;
  event_type: string;
  actor_user_id: string | null;
  summary: string;
  payload_json: Json;
  provider: string | null;
  model: string | null;
  cost_usd: number;
  created_at: string;
};

export type DealSignalInput = {
  dealId: string;
  title: string;
  value: number;
  status: string;
  probability: number | null;
  expectedCloseDate: string | null;
  lastStageChangedAt: string | null;
  updatedAt: string;
  createdAt: string;
  leadAiScore: number | null;
  competitor: string | null;
  openTasks: number;
  overdueTasks: number;
  daysSinceLastActivity: number | null;
  noteCount: number;
  stageSortOrder: number | null;
  stageName: string | null;
};

export type DealAnalysisResult = {
  priorityScore: number;
  closingProbability: number;
  expectedRevenue: number;
  riskLevel: RiskLevel;
  riskScore: number;
  predictedCloseDate: string | null;
  nextBestAction: NextBestAction;
  obstacles: string[];
  missedActivities: string[];
  coachTips: string[];
  opportunities: Array<{ code: SalesOpportunityCode; label: string; rationale: string }>;
  confidence: number;
};

export type PriorityItem = {
  dealId: string;
  title: string;
  priorityScore: number;
  riskLevel: RiskLevel;
  nextBestAction: NextBestAction;
  reason: string;
  value: number;
};

export type DailyBriefingSummary = {
  greeting: string;
  followUps: number;
  highRisk: number;
  newOpportunities: number;
  waitingReply: number;
  expiringQuotes: number;
  priorities: PriorityItem[];
};

export type PipelineHealthResult = {
  healthScore: number;
  openDeals: number;
  wonDeals: number;
  lostDeals: number;
  winRate: number;
  avgCycleDays: number;
  pipelineRevenue: number;
  weightedRevenue: number;
  bottlenecks: string[];
  conversionNotes: string[];
};

export type ForecastResult = {
  month: number;
  quarter: number;
  year: number;
  pipelineRevenue: number;
  weightedRevenue: number;
  confidence: number;
  targetHitProbability: number | null;
};

export type SalesFilters = {
  ownerUserId?: string;
  pipelineId?: string;
  stageId?: string;
  minLeadScore?: number;
  minPriority?: number;
  minRevenue?: number;
  closingBefore?: string;
  riskLevel?: RiskLevel | string;
  minConfidence?: number;
  q?: string;
};

export type SalesDashboardStats = {
  briefing: DailyBriefingSummary;
  pipeline: PipelineHealthResult;
  forecast: ForecastResult;
  highRiskDeals: number;
  topOpportunities: number;
  recentRecommendations: PriorityItem[];
  analyzedDeals: number;
};
