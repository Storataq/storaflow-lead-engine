/**
 * Phase 27D — Marketing agent shared types.
 */

import type {
  MarketingCampaignType,
  MarketingChannel,
  RecommendationType,
  SegmentCode,
  SocialChannel,
} from "@/lib/marketing-agent/constants";
import type { Json } from "@/types/supabase";

export type MarketingAgentOrgSettingsRow = {
  organization_id: string;
  enabled: boolean;
  approval_mode: string;
  provider: string;
  model: string;
  brand_voice: string;
  tone_of_voice: string;
  email_daily_limit: number;
  content_policies_json: Json;
  notification_rules_json: Json;
  rate_limit_per_minute: number;
  metadata_json: Json;
  created_at: string;
  updated_at: string;
};

export type MarketingCampaignRow = {
  id: string;
  organization_id: string;
  email_campaign_id: string | null;
  name: string;
  campaign_type: string;
  objective: string;
  status: string;
  channel: string;
  audience_summary: string;
  plan_json: Json;
  emails_json: Json;
  ctas_json: Json;
  success_criteria_json: Json;
  schedule_json: Json;
  ai_score: number;
  performance_json: Json;
  owner_user_id: string | null;
  provider: string | null;
  model: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MarketingSegmentRow = {
  id: string;
  organization_id: string;
  name: string;
  segment_code: string;
  description: string;
  filter_json: Json;
  estimated_size: number;
  ai_score: number;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MarketingContentRow = {
  id: string;
  organization_id: string;
  campaign_id: string | null;
  content_type: string;
  channel: string | null;
  title: string;
  subject: string | null;
  preview_text: string | null;
  body_text: string;
  cta_text: string | null;
  variants_json: Json;
  personalization_json: Json;
  status: string;
  ai_score: number;
  provider: string | null;
  model: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MarketingLandingAnalysisRow = {
  id: string;
  organization_id: string;
  url: string;
  title: string;
  conversion_score: number;
  readability_score: number;
  seo_score: number;
  structure_score: number;
  content_quality_score: number;
  overall_score: number;
  analysis_json: Json;
  improvements_json: Json;
  provider: string | null;
  model: string | null;
  created_by: string | null;
  created_at: string;
};

export type MarketingAbTestRow = {
  id: string;
  organization_id: string;
  campaign_id: string | null;
  name: string;
  test_type: string;
  status: string;
  variants_json: Json;
  metric_primary: string;
  winner_variant_id: string | null;
  confidence: number;
  results_json: Json;
  created_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MarketingAutomationRow = {
  id: string;
  organization_id: string;
  name: string;
  trigger_type: string;
  status: string;
  workflow_json: Json;
  nurture_rules_json: Json;
  handoff_to_sales: boolean;
  ai_score: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MarketingRecommendationRow = {
  id: string;
  organization_id: string;
  campaign_id: string | null;
  recommendation_type: string;
  title: string;
  rationale: string;
  priority: number;
  status: string;
  payload_json: Json;
  created_at: string;
};

export type MarketingAnalyticsSnapshotRow = {
  id: string;
  organization_id: string;
  period_key: string;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  conversion_rate: number;
  roi: number;
  campaign_score: number;
  engagement_score: number;
  lead_growth: number;
  pipeline_impact: number;
  revenue_impact: number;
  metrics_json: Json;
  created_at: string;
};

export type MarketingHistoryEventRow = {
  id: string;
  organization_id: string;
  campaign_id: string | null;
  event_type: string;
  actor_user_id: string | null;
  summary: string;
  payload_json: Json;
  provider: string | null;
  model: string | null;
  cost_usd: number;
  created_at: string;
};

export type LeadSignalInput = {
  id: string;
  companyName: string | null;
  email: string | null;
  industry: string | null;
  country: string | null;
  leadScore: number | null;
  aiLeadScore: number | null;
  scoreClassification: string | null;
  dealValue: number | null;
  status: string;
  tags: string[] | null;
  source: string | null;
  updatedAt: string;
  createdAt: string;
};

export type CampaignPlan = {
  name: string;
  campaignType: MarketingCampaignType;
  objective: string;
  audience: string;
  channel: MarketingChannel;
  schedule: { startOffsetDays: number; cadenceDays: number; steps: number };
  emails: Array<{ subject: string; preview: string; body: string; cta: string }>;
  ctas: string[];
  subjects: string[];
  followUps: string[];
  successCriteria: string[];
  aiScore: number;
};

export type SegmentDefinition = {
  code: SegmentCode;
  name: string;
  description: string;
  filter: Record<string, unknown>;
  estimatedSize: number;
  aiScore: number;
};

export type GeneratedEmail = {
  subject: string;
  previewText: string;
  body: string;
  cta: string;
  followUp: string;
  reminder: string;
  closing: string;
  signature: string;
  variants: Array<{ subject: string; body: string }>;
};

export type SocialPost = {
  channel: SocialChannel;
  title: string;
  body: string;
  cta: string | null;
  hashtags: string[];
};

export type LandingAnalysisResult = {
  title: string;
  conversionScore: number;
  readabilityScore: number;
  seoScore: number;
  structureScore: number;
  contentQualityScore: number;
  overallScore: number;
  improvements: string[];
  analysis: Record<string, unknown>;
};

export type AbVariant = {
  id: string;
  label: string;
  value: string;
  impressions: number;
  conversions: number;
};

export type AbTestResult = {
  winnerVariantId: string | null;
  confidence: number;
  variants: AbVariant[];
};

export type WorkflowNode = {
  id: string;
  type: "email" | "wait" | "task" | "handoff" | "condition";
  label: string;
  config: Record<string, unknown>;
};

export type WorkflowGraph = {
  nodes: WorkflowNode[];
  edges: Array<{ from: string; to: string }>;
};

export type NurturePlan = {
  contentSequence: string[];
  channel: MarketingChannel;
  frequencyDays: number;
  stopAfterDays: number;
  handoffToSalesWhen: string;
};

export type MarketingRecommendation = {
  type: RecommendationType;
  title: string;
  rationale: string;
  priority: number;
  payload: Record<string, unknown>;
};

export type MarketingAnalytics = {
  openRate: number;
  clickRate: number;
  bounceRate: number;
  conversionRate: number;
  roi: number;
  campaignScore: number;
  engagementScore: number;
  leadGrowth: number;
  pipelineImpact: number;
  revenueImpact: number;
};

export type MarketingFilters = {
  campaignId?: string;
  channel?: string;
  segmentCode?: string;
  status?: string;
  ownerUserId?: string;
  minAiScore?: number;
  q?: string;
};

export type MarketingDashboardStats = {
  activeCampaigns: number;
  draftCampaigns: number;
  segments: number;
  contentItems: number;
  openRecommendations: number;
  analytics: MarketingAnalytics;
  topCampaigns: Array<{ id: string; name: string; aiScore: number; status: string }>;
  recentRecommendations: MarketingRecommendation[];
  emailCampaignCount: number;
};
