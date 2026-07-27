/**
 * Phase 25H — Storaflow AI Copilot constants.
 */

export const COPILOT_MODES = [
  "floating",
  "sidebar",
  "docked",
  "fullscreen",
] as const;

export type CopilotMode = (typeof COPILOT_MODES)[number];

export const COPILOT_MODE_LABELS: Record<CopilotMode, string> = {
  floating: "Floating",
  sidebar: "Sidebar",
  docked: "Docked",
  fullscreen: "Full screen",
};

export const COPILOT_INTENTS = [
  "search_companies",
  "search_contacts",
  "search_deals",
  "search_tasks",
  "search_campaigns",
  "filter_leads",
  "insights",
  "recommendations",
  "summarize",
  "write_email",
  "analytics",
  "propose_action",
  "multi_step",
  "help",
  "general",
] as const;

export type CopilotIntent = (typeof COPILOT_INTENTS)[number];

export const COPILOT_ACTION_TYPES = [
  "create_company",
  "create_contact",
  "create_deal",
  "create_task",
  "move_deal",
  "assign_user",
  "start_campaign",
  "generate_email",
  "create_automation",
  "export_data",
  "delete_record",
  "refresh_lead_score",
  "analyze_website",
  "export_to_hubspot",
  "create_calendar_event",
  "upload_to_drive",
  "notify_slack",
] as const;

export type CopilotActionType = (typeof COPILOT_ACTION_TYPES)[number];

export const COPILOT_ACTION_LABELS: Record<CopilotActionType, string> = {
  create_company: "Create company",
  create_contact: "Create contact",
  create_deal: "Create deal",
  create_task: "Create task",
  move_deal: "Move deal",
  assign_user: "Assign user",
  start_campaign: "Start campaign",
  generate_email: "Generate email",
  create_automation: "Create automation",
  export_data: "Export data",
  delete_record: "Delete record",
  refresh_lead_score: "Refresh lead score",
  analyze_website: "Analyze website",
  export_to_hubspot: "Export to HubSpot",
  create_calendar_event: "Create Google Calendar meeting",
  upload_to_drive: "Upload to Google Drive",
  notify_slack: "Notify Slack",
};

/** Actions that mutate data — always require confirmation. */
export const COPILOT_MUTATING_ACTIONS = new Set<CopilotActionType>([
  "create_company",
  "create_contact",
  "create_deal",
  "create_task",
  "move_deal",
  "assign_user",
  "start_campaign",
  "create_automation",
  "delete_record",
  "refresh_lead_score",
  "analyze_website",
  "export_data",
  "export_to_hubspot",
  "create_calendar_event",
  "upload_to_drive",
  "notify_slack",
]);

export const STARTER_PROMPTS = [
  {
    code: "find_leads",
    title: "Find new leads",
    prompt: "Find hot leads I should follow up with today.",
    category: "sales",
  },
  {
    code: "analyze_pipeline",
    title: "Analyze my pipeline",
    prompt: "Summarize my pipeline and highlight stuck deals.",
    category: "crm",
  },
  {
    code: "improve_campaign",
    title: "Improve campaign",
    prompt: "Which campaign performs best and what should I improve?",
    category: "email",
  },
  {
    code: "show_opportunities",
    title: "Show opportunities",
    prompt: "Show highest-opportunity leads and recommended next actions.",
    category: "sales",
  },
  {
    code: "who_needs_followup",
    title: "Who needs follow-up?",
    prompt: "Show overdue tasks and stale leads that need follow-up.",
    category: "tasks",
  },
  {
    code: "companies_no_website",
    title: "Companies without websites",
    prompt: "Show companies without websites.",
    category: "data",
  },
  {
    code: "missing_dms",
    title: "Missing decision makers",
    prompt: "Find companies missing decision makers.",
    category: "contacts",
  },
  {
    code: "write_cold_email",
    title: "Write cold email",
    prompt: "Draft a professional cold email for hot leads in retail.",
    category: "email",
  },
  {
    code: "export_hubspot",
    title: "Export to HubSpot",
    prompt: "Export this list to HubSpot.",
    category: "integrations",
  },
  {
    code: "notify_slack",
    title: "Notify Slack",
    prompt: "Notify Slack about my hottest leads.",
    category: "integrations",
  },
] as const;

export const QUICK_ACTIONS = [
  { id: "search_companies", label: "Search companies", prompt: "Find companies" },
  { id: "create_campaign", label: "Create campaign", prompt: "Help me create a campaign for hot leads." },
  { id: "generate_email", label: "Generate email", prompt: "Generate a follow-up email." },
  { id: "create_task", label: "Create task", prompt: "Create a follow-up task for my hottest lead." },
  { id: "import_companies", label: "Import companies", prompt: "How do I import companies into Storaflow?" },
  { id: "analyze_website", label: "Analyze website", prompt: "Which companies need website re-analysis?" },
  { id: "refresh_score", label: "Refresh lead score", prompt: "Which leads should I refresh AI lead scores for?" },
] as const;

export const FUTURE_VOICE_CAPABILITIES = [
  "voice_input",
  "voice_output",
  "speech_to_text",
  "text_to_speech",
] as const;

export const FUTURE_AI_PROVIDERS = [
  "openai",
  "anthropic",
  "google",
  "azure_openai",
  "self_hosted",
  "local_llm",
] as const;

export const COPILOT_UI_STORAGE_KEY = "storaflow.copilot.ui.v1";
