/**
 * Compatibility shim for Phase 20D imports.
 * Canonical types live in `@/lib/email/types`.
 */

export type {
  EmailCampaignStatus,
  EmailSequenceStepType,
  EmailQueueStatus as EmailDeliveryStatus,
} from "@/lib/email/types";

export {
  EMAIL_ENGINE_CAPABILITIES as FutureEmailEngineConceptsFlags,
  EMAIL_ENGINE_COMPLIANCE_NOTICE,
} from "@/lib/email/types";

/** Documented concepts for later implementation — not executed. */
export type FutureEmailEngineConcepts = {
  campaign: import("@/lib/email/types").EmailCampaignStatus;
  sequence: import("@/lib/email/types").EmailSequenceStepType;
  template: "html" | "text";
  recipient: "lead" | "contact";
  personalization: "merge_fields";
  emailQueue: "org_scoped";
  scheduledSend: "timezone_aware";
  delivery: import("@/lib/email/types").EmailQueueStatus;
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
  "Funnel stops at outreach-ready — send lives in Email Engine later phases",
  "EmailSendingProvider abstraction → Resend/Postmark/SendGrid/SES/SMTP",
  "email_suppressions must block queue enrollment automatically",
] as const;
