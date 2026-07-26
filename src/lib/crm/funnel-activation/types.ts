/**
 * Funnel Activation & Campaign Readiness — shared types (Phase 20D).
 */

export type FunnelActivationMode = "manual" | "assisted" | "automatic";

export type AutoDealMode = "never" | "recommend" | "automatic";

export type FunnelActivationStatus =
  | "pending"
  | "evaluating"
  | "creating_lead"
  | "qualifying"
  | "analyzing_opportunity"
  | "assigning_pipeline"
  | "creating_tasks"
  | "calculating_campaign_readiness"
  | "completed"
  | "completed_with_warnings"
  | "needs_review"
  | "failed"
  | "cancelled"
  | "retrying";

export type FunnelActivationStep =
  | "eligibility"
  | "contact_check"
  | "lead"
  | "qualification"
  | "opportunity"
  | "priority"
  | "pipeline"
  | "deal"
  | "tasks"
  | "campaign_readiness"
  | "timeline";

export type CompanyEligibilityStatus =
  | "eligible"
  | "not_eligible"
  | "needs_review"
  | "already_activated"
  | "suppressed"
  | "duplicate"
  | "missing_information";

export type ContactabilityClass =
  | "email_ready"
  | "phone_ready"
  | "multi_channel_ready"
  | "general_contact_only"
  | "needs_review"
  | "missing_contact_data"
  | "blocked"
  | "suppressed";

export type CampaignReadinessStatus =
  | "ready"
  | "ready_with_review"
  | "needs_contact"
  | "needs_verification"
  | "needs_personalization"
  | "needs_approval"
  | "duplicate"
  | "suppressed"
  | "blocked"
  | "not_qualified"
  | "not_eligible"
  | "unknown";

export type CampaignApprovalStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "changes_required"
  | "automatically_approved"
  | "suppressed";

export type SalesPriority =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "nurture"
  | "not_ready";

export type PersonalizationStatus =
  | "personalized"
  | "company_level"
  | "limited"
  | "missing_personalization"
  | "needs_review";

export type FunnelActivationPolicy = {
  mode: FunnelActivationMode;
  qualificationThreshold: number;
  opportunityThreshold: number;
  autoDealMode: AutoDealMode;
  autoCreateTasks: boolean;
  allowRoleEmails: boolean;
  requireNamedContact: boolean;
  requireManualApproval: boolean;
  skipRecentActivationHours: number;
  defaultPipelineId: string | null;
};

export const DEFAULT_FUNNEL_POLICY: FunnelActivationPolicy = {
  mode: "assisted",
  qualificationThreshold: 50,
  opportunityThreshold: 40,
  autoDealMode: "recommend",
  autoCreateTasks: true,
  allowRoleEmails: true,
  requireNamedContact: false,
  requireManualApproval: true,
  skipRecentActivationHours: 24,
  defaultPipelineId: null,
};

export const FUNNEL_COMPLIANCE_NOTICE =
  "Campaign Ready does not equal legal consent. Technical email validation is not marketing permission. Users remain responsible for privacy and anti-spam compliance.";

export type FunnelActivationRequest = {
  organizationId: string;
  companyId?: string | null;
  leadId?: string | null;
  userId?: string | null;
  triggerSource:
    | "manual"
    | "company_detail"
    | "lead_detail"
    | "bulk"
    | "enrichment_completed"
    | "scrape_completed"
    | "retry"
    | "api";
  force?: boolean;
  confirmed?: boolean;
};

export type FunnelActivationError = {
  step: FunnelActivationStep | "unknown";
  category:
    | "temporary"
    | "permanent"
    | "validation"
    | "configuration"
    | "permission"
    | "duplicate"
    | "suppression"
    | "unknown";
  message: string;
};

export type FunnelActivationStatistics = {
  leadCreated: boolean;
  leadReused: boolean;
  tasksCreated: number;
  tasksReused: number;
  dealRecommended: boolean;
  dealCreated: boolean;
  duplicatesPrevented: number;
  warnings: string[];
};

export type FunnelActivationResult = {
  success: boolean;
  status: FunnelActivationStatus;
  runId: string | null;
  companyId: string | null;
  leadId: string | null;
  pipelineId: string | null;
  stageId: string | null;
  stageSlug: string | null;
  stageReason: string | null;
  qualificationScore: number;
  opportunityScore: number;
  salesPriority: SalesPriority;
  campaignReadinessStatus: CampaignReadinessStatus;
  approvalStatus: CampaignApprovalStatus;
  preferredEmail: string | null;
  nextBestAction: string | null;
  statistics: FunnelActivationStatistics;
  errors: FunnelActivationError[];
  message: string;
};

export type CampaignReadinessFactor = {
  key: string;
  label: string;
  passed: boolean;
  required: boolean;
  detail: string;
};

export type CampaignReadinessResult = {
  status: CampaignReadinessStatus;
  approvalStatus: CampaignApprovalStatus;
  salesPriority: SalesPriority;
  personalizationStatus: PersonalizationStatus;
  preferredEmail: string | null;
  preferredName: string | null;
  preferredPhone: string | null;
  contactId: string | null;
  contactability: ContactabilityClass;
  qualificationScore: number;
  opportunityScore: number;
  priorityScore: number;
  reasons: string[];
  missingRequirements: string[];
  factors: CampaignReadinessFactor[];
  personalizationFields: Record<string, string | null>;
  suppressionReason: string | null;
  alternatives: Array<{
    email: string;
    score: number;
    reason: string;
  }>;
};

/** Payload shape for the future Automated Email Engine (no send). */
export type CampaignRecipientPreview = {
  leadId: string;
  companyId: string | null;
  contactId: string | null;
  preferredEmail: string | null;
  preferredName: string | null;
  personalization: Record<string, string | null>;
  qualificationScore: number;
  opportunityScore: number;
  priority: SalesPriority;
  ownerUserId: string | null;
  approvalStatus: CampaignApprovalStatus;
  suppressionStatus: string | null;
  readinessStatus: CampaignReadinessStatus;
  readinessReasons: string[];
};
