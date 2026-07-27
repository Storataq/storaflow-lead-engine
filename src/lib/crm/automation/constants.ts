/**
 * Phase 25F — AI Sales Automation Engine constants.
 */

export const AUTOMATION_BLOCK_TYPES = [
  "start",
  "trigger",
  "condition",
  "delay",
  "action",
  "decision",
  "split",
  "merge",
  "exit",
  "end",
  "loop", // future-ready
] as const;

export type AutomationBlockType = (typeof AUTOMATION_BLOCK_TYPES)[number];

export const AUTOMATION_BLOCK_LABELS: Record<AutomationBlockType, string> = {
  start: "Start",
  trigger: "Trigger",
  condition: "Condition",
  delay: "Delay",
  action: "Action",
  decision: "Decision",
  split: "Split",
  merge: "Merge",
  exit: "Exit",
  end: "End",
  loop: "Loop (soon)",
};

export const AUTOMATION_TRIGGERS = [
  "company_created",
  "company_updated",
  "contact_created",
  "contact_updated",
  "lead_score_changed",
  "lead_became_hot",
  "lead_score_increased",
  "lead_score_decreased",
  "company_health_changed",
  "deal_created",
  "deal_won",
  "deal_lost",
  "pipeline_stage_changed",
  "stage_changed",
  "task_completed",
  "task_overdue",
  "campaign_started",
  "campaign_finished",
  "email_sent",
  "email_opened",
  "email_clicked",
  "email_replied",
  "website_reanalyzed",
  "ai_analysis_completed",
] as const;

export type AutomationTrigger = (typeof AUTOMATION_TRIGGERS)[number];

export const AUTOMATION_TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  company_created: "Company Created",
  company_updated: "Company Updated",
  contact_created: "Contact Created",
  contact_updated: "Contact Updated",
  lead_score_changed: "Lead Score Changed",
  lead_became_hot: "Lead Became Hot",
  lead_score_increased: "Lead Score Increased",
  lead_score_decreased: "Lead Score Decreased",
  company_health_changed: "Company Health Changed",
  deal_created: "Deal Created",
  deal_won: "Deal Won",
  deal_lost: "Deal Lost",
  pipeline_stage_changed: "Pipeline Stage Changed",
  stage_changed: "Stage Changed",
  task_completed: "Task Completed",
  task_overdue: "Task Overdue",
  campaign_started: "Campaign Started",
  campaign_finished: "Campaign Finished",
  email_sent: "Email Sent",
  email_opened: "Email Opened",
  email_clicked: "Email Clicked",
  email_replied: "Email Replied",
  website_reanalyzed: "Website Re-analyzed",
  ai_analysis_completed: "AI Analysis Completed",
};

export const AUTOMATION_CONDITIONS = [
  "lead_score",
  "health_score",
  "industry",
  "country",
  "city",
  "pipeline",
  "stage",
  "owner",
  "tag",
  "company_category",
  "contact_role",
  "decision_maker",
  "campaign",
  "email_status",
  "activity",
  "risk_score",
  "opportunity_score",
] as const;

export type AutomationConditionField = (typeof AUTOMATION_CONDITIONS)[number];

export const AUTOMATION_CONDITION_LABELS: Record<
  AutomationConditionField,
  string
> = {
  lead_score: "Lead Score",
  health_score: "Health Score",
  industry: "Industry",
  country: "Country",
  city: "City",
  pipeline: "Pipeline",
  stage: "Stage",
  owner: "Owner",
  tag: "Tag",
  company_category: "Company Category",
  contact_role: "Contact Role",
  decision_maker: "Decision Maker",
  campaign: "Campaign",
  email_status: "Email Status",
  activity: "Activity",
  risk_score: "Risk Score",
  opportunity_score: "Opportunity Score",
};

export const AUTOMATION_ACTIONS = [
  "assign_owner",
  "create_task",
  "schedule_call",
  "schedule_meeting",
  "send_email",
  "enroll_campaign",
  "move_pipeline",
  "move_stage",
  "update_tag",
  "notify_user",
  "slack_ready",
  "teams_ready",
  "webhook_ready",
  "export_ready",
  "run_ai_analysis",
  "refresh_lead_score",
] as const;

export type AutomationActionType = (typeof AUTOMATION_ACTIONS)[number];

export const AUTOMATION_ACTION_LABELS: Record<AutomationActionType, string> = {
  assign_owner: "Assign Owner",
  create_task: "Create Task",
  schedule_call: "Schedule Call",
  schedule_meeting: "Schedule Meeting",
  send_email: "Send Email",
  enroll_campaign: "Enroll Campaign",
  move_pipeline: "Move Pipeline",
  move_stage: "Move Stage",
  update_tag: "Update Tag",
  notify_user: "Notify User",
  slack_ready: "Slack Ready",
  teams_ready: "Teams Ready",
  webhook_ready: "Webhook Ready",
  export_ready: "Export Ready",
  run_ai_analysis: "Run AI Analysis",
  refresh_lead_score: "Refresh Lead Score",
};

export const AUTOMATION_STATUSES = [
  "draft",
  "active",
  "paused",
  "archived",
] as const;

export type AutomationStatus = (typeof AUTOMATION_STATUSES)[number];

export const AUTOMATION_STATUS_LABELS: Record<AutomationStatus, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  archived: "Archived",
};

export const AUTOMATION_RUN_STATUSES = [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;

export type AutomationRunStatus = (typeof AUTOMATION_RUN_STATUSES)[number];

export const AUTOMATION_RUN_STATUS_LABELS: Record<AutomationRunStatus, string> =
  {
    pending: "Pending",
    running: "Running",
    completed: "Completed",
    failed: "Failed",
    cancelled: "Cancelled",
  };

export const FUTURE_CHANNELS = [
  "sms",
  "whatsapp",
  "linkedin",
  "push",
  "voice",
  "external_api",
  "marketplace",
] as const;
