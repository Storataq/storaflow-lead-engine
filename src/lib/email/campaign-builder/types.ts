import type { BuilderBlockType } from "@/lib/email/campaign-builder/constants";
import type { Database } from "@/types/supabase";

export type WorkflowNode = {
  id: string;
  type: BuilderBlockType;
  label: string;
  x: number;
  y: number;
  config?: Record<string, unknown>;
  sequenceStepId?: string | null;
};

export type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type WorkflowGraph = {
  version: number;
  zoom: number;
  panX: number;
  panY: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

export type AiBrief = {
  purpose?: string;
  audience?: string;
  offer?: string;
  cta?: string;
  tone?: string;
  language?: string;
  campaignType?: string;
};

export type CalendarMetadata = {
  timezone?: string;
  preferredSendWindowStart?: string;
  preferredSendWindowEnd?: string;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  proposedStart?: string;
};

export type SubjectScoreBreakdown = {
  openRate: number;
  spamRisk: number;
  professionalTone: number;
  urgency: number;
  personalization: number;
  overall: number;
  rationale: string[];
};

export type CampaignRecommendation = {
  id: string;
  action: string;
  priority: "high" | "medium" | "low";
  rationale: string;
};

export type EmailAbTestRow =
  Database["public"]["Tables"]["email_campaign_ab_tests"]["Row"];
export type EmailAbVariantRow =
  Database["public"]["Tables"]["email_campaign_ab_variants"]["Row"];
export type EmailSubjectScoreRow =
  Database["public"]["Tables"]["email_ai_subject_scores"]["Row"];
