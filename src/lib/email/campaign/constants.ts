/**
 * Campaign Manager constants (Phase 21C).
 */

export const EMAIL_CAMPAIGN_TYPES = [
  "cold_outreach",
  "lead_nurturing",
  "welcome_series",
  "follow_up",
  "re_engagement",
  "event_invitation",
  "sales_campaign",
  "customer_success",
  "retention",
  "newsletter",
  "introduction",
  "pilot_invitation",
  "partnership",
  "announcement",
  "custom",
] as const;

export type EmailCampaignType = (typeof EMAIL_CAMPAIGN_TYPES)[number];

export const EMAIL_CAMPAIGN_TYPE_LABELS: Record<EmailCampaignType, string> = {
  cold_outreach: "Cold Outreach",
  lead_nurturing: "Lead Nurturing",
  welcome_series: "Welcome Series",
  follow_up: "Follow-up Sequence",
  re_engagement: "Re-engagement",
  event_invitation: "Event Invitation",
  sales_campaign: "Sales Campaign",
  customer_success: "Customer Success",
  retention: "Retention",
  newsletter: "Newsletter",
  introduction: "Introduction",
  pilot_invitation: "Pilot Invitation",
  partnership: "Partnership",
  announcement: "Announcement",
  custom: "Custom",
};

/** Full status set including future execution statuses. */
export const EMAIL_CAMPAIGN_STATUSES = [
  "draft",
  "needs_review",
  "ready",
  "approved",
  "scheduled",
  "running",
  "paused",
  "completed",
  "cancelled",
  "archived",
  "failed",
] as const;

export type EmailCampaignStatusExtended =
  (typeof EMAIL_CAMPAIGN_STATUSES)[number];

export const EMAIL_CAMPAIGN_STATUS_LABELS: Record<
  EmailCampaignStatusExtended,
  string
> = {
  draft: "Draft",
  needs_review: "Needs Review",
  ready: "Ready",
  approved: "Approved",
  scheduled: "Scheduled",
  running: "Running",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
  archived: "Archived",
  failed: "Failed",
};

/** Statuses reachable in Phase 21C (no send/execution). */
export const CAMPAIGN_MANAGER_EDITABLE_STATUSES = [
  "draft",
  "needs_review",
  "ready",
  "approved",
  "archived",
] as const;

export const SENDER_PROFILE_STATUSES = [
  "draft",
  "pending_verification",
  "verified",
  "invalid",
  "disabled",
] as const;

export type SenderProfileStatus = (typeof SENDER_PROFILE_STATUSES)[number];

export const CAMPAIGN_APPROVAL_DECISIONS = [
  "pending_review",
  "approved",
  "rejected",
  "changes_required",
  "invalidated",
] as const;

export type CampaignApprovalDecision =
  (typeof CAMPAIGN_APPROVAL_DECISIONS)[number];

export const RECIPIENT_ELIGIBILITY_STATUSES = [
  "eligible",
  "eligible_with_warning",
  "needs_review",
  "missing_email",
  "invalid_email",
  "suppressed",
  "duplicate",
  "missing_personalization",
  "wrong_language",
  "not_qualified",
  "not_eligible",
] as const;

export type RecipientEligibilityStatus =
  (typeof RECIPIENT_ELIGIBILITY_STATUSES)[number];

export const READINESS_CLASSIFICATIONS = [
  "not_ready",
  "needs_work",
  "ready_with_warnings",
  "ready",
  "approved",
] as const;

export type ReadinessClassification =
  (typeof READINESS_CLASSIFICATIONS)[number];

export const DEFAULT_CAMPAIGN_SETTINGS = {
  timezone: "UTC",
  trackingPreference: "disabled" as const,
  unsubscribeRequired: true,
  stopOnReply: true,
  duplicatePrevention: true,
  maxRecipients: 5000,
  approvalRequired: true,
};

export const CAMPAIGN_COMPLIANCE_NOTICE =
  "Campaign approval confirms technical readiness only. The organization remains responsible for lawful outreach and marketing compliance.";

export const CAMPAIGN_ACTIVITY_TYPES = [
  "campaign_created",
  "campaign_updated",
  "audience_changed",
  "audience_preview_generated",
  "template_selected",
  "template_version_locked",
  "recipient_snapshot_created",
  "validation_completed",
  "validation_failed",
  "campaign_submitted_for_review",
  "campaign_approved",
  "campaign_rejected",
  "approval_invalidated",
  "campaign_duplicated",
  "campaign_archived",
  "campaign_restored",
] as const;
