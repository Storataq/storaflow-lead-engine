/**
 * Sequence Engine constants (Phase 21D).
 */

export const EMAIL_SEQUENCE_STATUSES = [
  "draft",
  "active",
  "inactive",
  "archived",
  "deprecated",
] as const;

export type EmailSequenceStatusExtended =
  (typeof EMAIL_SEQUENCE_STATUSES)[number];

export const EMAIL_SEQUENCE_STATUS_LABELS: Record<
  EmailSequenceStatusExtended,
  string
> = {
  draft: "Draft",
  active: "Active",
  inactive: "Inactive",
  archived: "Archived",
  deprecated: "Deprecated",
};

export const EMAIL_SEQUENCE_CATEGORIES = [
  "cold_outreach",
  "lead_nurture",
  "pilot_invitation",
  "partnership",
  "follow_up",
  "re_engagement",
  "welcome",
  "reminder",
  "custom",
] as const;

export type EmailSequenceCategory = (typeof EMAIL_SEQUENCE_CATEGORIES)[number];

export const EMAIL_SEQUENCE_CATEGORY_LABELS: Record<
  EmailSequenceCategory,
  string
> = {
  cold_outreach: "Cold Outreach",
  lead_nurture: "Lead Nurture",
  pilot_invitation: "Pilot Invitation",
  partnership: "Partnership",
  follow_up: "Follow-up",
  re_engagement: "Re-engagement",
  welcome: "Welcome",
  reminder: "Reminder",
  custom: "Custom",
};

export const SEQUENCE_STEP_TYPES = [
  "email",
  "wait",
  "manual_task",
  "condition",
  "end",
] as const;

export type SequenceStepType = (typeof SEQUENCE_STEP_TYPES)[number];

export const SEQUENCE_STEP_TYPE_LABELS: Record<SequenceStepType, string> = {
  email: "Email",
  wait: "Wait",
  manual_task: "Manual Task",
  condition: "Condition",
  end: "End",
};

export const DELAY_UNITS = [
  "minutes",
  "hours",
  "calendar_days",
  "business_days",
  "until_weekday",
  "until_business_window",
] as const;

export type DelayUnit = (typeof DELAY_UNITS)[number];

export const CONDITION_OPERATORS = [
  "equals",
  "not_equals",
  "greater_than",
  "less_than",
  "greater_than_or_equal",
  "less_than_or_equal",
  "contains",
  "does_not_contain",
  "is_empty",
  "is_not_empty",
  "in",
  "not_in",
] as const;

export type ConditionOperator = (typeof CONDITION_OPERATORS)[number];

export const END_REASONS = [
  "sequence_completed",
  "reply_received",
  "recipient_suppressed",
  "recipient_unsubscribed",
  "campaign_stopped",
  "manual_exit",
  "qualification_changed",
  "invalid_contact",
  "custom_exit",
] as const;

export type EndReason = (typeof END_REASONS)[number];

export const STOP_RULE_TYPES = [
  "stop_on_reply",
  "stop_on_unsubscribe",
  "stop_on_complaint",
  "stop_on_hard_bounce",
  "stop_on_manual_pause",
  "stop_on_lead_status_change",
  "stop_on_pipeline_stage_change",
  "stop_on_deal_won",
  "stop_on_deal_lost",
  "stop_on_suppressed",
  "stop_after_max_attempts",
  "custom_rule",
] as const;

export type StopRuleType = (typeof STOP_RULE_TYPES)[number];

export const MANDATORY_STOP_RULES: StopRuleType[] = [
  "stop_on_unsubscribe",
  "stop_on_complaint",
  "stop_on_hard_bounce",
  "stop_on_suppressed",
];

export const DEFAULT_SEQUENCE_SAFETY_LIMITS = {
  maxSteps: 25,
  maxEmailSteps: 10,
  maxDurationDays: 90,
  minDelayMinutesBetweenEmails: 60,
  maxEmailsPerRecipient: 10,
};

export const SEQUENCE_READINESS_CLASSIFICATIONS = [
  "not_ready",
  "needs_work",
  "ready_with_warnings",
  "ready",
  "active",
] as const;

export type SequenceReadinessClassification =
  (typeof SEQUENCE_READINESS_CLASSIFICATIONS)[number];

export const SEQUENCE_ACTIVITY_TYPES = [
  "sequence_created",
  "sequence_updated",
  "step_added",
  "step_changed",
  "step_deleted",
  "steps_reordered",
  "validation_completed",
  "validation_failed",
  "sequence_published",
  "version_created",
  "sequence_duplicated",
  "sequence_archived",
  "sequence_restored",
  "campaign_linked",
  "campaign_unlinked",
] as const;

export const JOURNEY_PREVIEW_SCENARIOS = [
  "no_reply",
  "reply_after_step_1",
  "link_clicked",
  "invalid_email",
  "unsubscribed",
  "manual_approval_required",
  "custom",
] as const;

export type JourneyPreviewScenario =
  (typeof JOURNEY_PREVIEW_SCENARIOS)[number];
