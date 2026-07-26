/**
 * Future Automated Email Engine — type placeholders only (Phase 20D+).
 * No sending, no provider SDK, no migrations in Foundation.
 */

export type EmailCampaignStatus =
  | "draft"
  | "scheduled"
  | "running"
  | "paused"
  | "completed"
  | "cancelled";

export type EmailSequenceStepType = "email" | "wait" | "condition";

export type EmailDeliveryStatus =
  | "queued"
  | "scheduled"
  | "sending"
  | "delivered"
  | "bounced"
  | "failed"
  | "opened"
  | "clicked"
  | "replied"
  | "unsubscribed";

/** Documented concepts for later implementation — not persisted. */
export type FutureEmailEngineConcepts = {
  campaign: EmailCampaignStatus;
  sequence: EmailSequenceStepType;
  template: "html" | "text";
  recipient: "lead" | "contact";
  personalization: "merge_fields";
  emailQueue: "org_scoped";
  scheduledSend: "timezone_aware";
  delivery: EmailDeliveryStatus;
  bounce: "hard" | "soft";
  reply: "stop_on_reply";
  unsubscribe: "list_unsubscribe";
  analytics: "opens_clicks_replies";
};

export const EMAIL_ENGINE_INTEGRATION_POINTS = [
  "Opportunity outreach readiness → campaign eligibility",
  "campaign_readiness + approval_status → enrollment gate (Phase 20D)",
  "toCampaignRecipientPreview() → recipient + personalization payload",
  "CRM lead / contact → recipient resolution",
  "Tasks / notes → human override + audit trail",
  "Executive Dashboard → campaign performance KPIs (later)",
  "Exclusions list → never send",
  "Funnel stops at outreach-ready — send lives in Email Engine project",
] as const;
