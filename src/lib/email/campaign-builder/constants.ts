/**
 * Phase 25D — AI Email Campaign Builder constants.
 */

export const BUILDER_MODES = ["classic", "ai_builder"] as const;
export type BuilderMode = (typeof BUILDER_MODES)[number];

export const BUILDER_BLOCK_TYPES = [
  "start",
  "send_email",
  "wait",
  "delay",
  "condition",
  "decision",
  "split",
  "goal",
  "exit",
  "end",
] as const;

export type BuilderBlockType = (typeof BUILDER_BLOCK_TYPES)[number];

export const BUILDER_BLOCK_LABELS: Record<BuilderBlockType, string> = {
  start: "Start",
  send_email: "Send Email",
  wait: "Wait",
  delay: "Delay",
  condition: "Condition",
  decision: "Decision",
  split: "Split (A/B)",
  goal: "Goal",
  exit: "Exit",
  end: "End",
};

/** Map builder blocks → sequence step types where applicable. */
export const BUILDER_TO_SEQUENCE_STEP: Partial<
  Record<BuilderBlockType, "email" | "wait" | "condition" | "end" | "manual_task">
> = {
  send_email: "email",
  wait: "wait",
  delay: "wait",
  condition: "condition",
  decision: "condition",
  exit: "end",
  end: "end",
};

export const EXTENDED_CAMPAIGN_TYPES = [
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

export type ExtendedCampaignType = (typeof EXTENDED_CAMPAIGN_TYPES)[number];

export const EXTENDED_CAMPAIGN_TYPE_LABELS: Record<ExtendedCampaignType, string> = {
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

export const MERGE_FIELDS = [
  { key: "first_name", label: "First Name", token: "{{first_name}}" },
  { key: "last_name", label: "Last Name", token: "{{last_name}}" },
  { key: "company", label: "Company", token: "{{company}}" },
  { key: "industry", label: "Industry", token: "{{industry}}" },
  { key: "city", label: "City", token: "{{city}}" },
  { key: "country", label: "Country", token: "{{country}}" },
  { key: "website", label: "Website", token: "{{website}}" },
  { key: "lead_score", label: "Lead Score", token: "{{lead_score}}" },
  { key: "custom_field", label: "Custom Field", token: "{{custom_field}}" },
] as const;

export const AUTOMATION_TRIGGERS = [
  { id: "email_opened", label: "If Email Opened" },
  { id: "email_clicked", label: "If Email Clicked" },
  { id: "no_response", label: "If No Response" },
  { id: "replied", label: "If Replied" },
  { id: "bounced", label: "If Bounced" },
  { id: "unsubscribed", label: "If Unsubscribed" },
  { id: "lead_score_increased", label: "If Lead Score Increased" },
  { id: "contact_updated", label: "If Contact Updated" },
] as const;

export const WAIT_UNITS = [
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
  { value: "weeks", label: "Weeks" },
  { value: "business_days", label: "Business Days" },
  { value: "specific_date", label: "Specific Date" },
  { value: "specific_time", label: "Specific Time" },
] as const;

export const TEMPLATE_LIBRARY_CATEGORIES = [
  "sales",
  "marketing",
  "support",
  "follow_up",
  "reminder",
  "announcement",
  "newsletter",
  "seasonal",
] as const;

export const AI_RECOMMENDATION_EXAMPLES = [
  "Improve subject line",
  "Shorten email",
  "Send earlier",
  "Increase personalization",
  "Split campaign",
  "Pause campaign",
  "Duplicate successful campaign",
] as const;
