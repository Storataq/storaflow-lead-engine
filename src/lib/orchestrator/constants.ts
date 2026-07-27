/**
 * Phase 27H — AI Orchestrator constants (client-safe).
 */

export const ORCHESTRATOR_AGENT_SLUG = "storaflow-orchestrator-agent";
export const ORCHESTRATOR_AGENT_VERSION = "1.0.0";

/** Registered specialist agents the orchestrator can select. */
export const COLLABORATING_AGENTS = [
  {
    slug: "storaflow-prospecting-agent",
    label: "Prospecting Agent",
    intents: ["prospecting", "companies", "leads", "germany", "markt"],
  },
  {
    slug: "storaflow-sales-agent",
    label: "Sales Agent",
    intents: ["sales", "pipeline", "deals", "afspraken", "meetings"],
  },
  {
    slug: "storaflow-marketing-agent",
    label: "Marketing Agent",
    intents: ["marketing", "campagne", "campaign", "content"],
  },
  {
    slug: "storaflow-customer-success-agent",
    label: "Customer Success Agent",
    intents: ["upsell", "churn", "renewal", "onboarding", "customer"],
  },
  {
    slug: "storaflow-revenue-intelligence-agent",
    label: "Revenue Agent",
    intents: ["revenue", "omzet", "forecast", "mrr", "arr", "kpi"],
  },
  {
    slug: "storaflow-kernel-assistant",
    label: "Copilot",
    intents: ["report", "executive", "samenvatting", "general"],
  },
] as const;

export type CollaboratingAgentSlug =
  (typeof COLLABORATING_AGENTS)[number]["slug"];

export const GOAL_INTENTS = [
  "prospecting",
  "pipeline_analysis",
  "meeting_prep",
  "marketing_campaign",
  "revenue_forecast",
  "upsell",
  "competitor_research",
  "executive_report",
  "customer_success",
  "general",
] as const;

export type GoalIntent = (typeof GOAL_INTENTS)[number];

export const GOAL_INTENT_LABELS: Record<GoalIntent, string> = {
  prospecting: "Prospecting",
  pipeline_analysis: "Pipeline analyse",
  meeting_prep: "Meeting prep",
  marketing_campaign: "Marketingcampagne",
  revenue_forecast: "Omzetforecast",
  upsell: "Upsell kansen",
  competitor_research: "Concurrentieonderzoek",
  executive_report: "Executive rapport",
  customer_success: "Customer Success",
  general: "Algemeen",
};

export const APPROVAL_POLICIES = [
  "auto",
  "manual",
  "multi",
  "workflow",
  "critical",
  "semi_autonomous",
  "fully_autonomous",
  "approval_required",
] as const;

export type ApprovalPolicy = (typeof APPROVAL_POLICIES)[number];

export const APPROVAL_POLICY_LABELS: Record<ApprovalPolicy, string> = {
  auto: "Auto Approval",
  manual: "Manual Approval",
  multi: "Multi Approval",
  workflow: "Workflow Approval",
  critical: "Critical Approval",
  semi_autonomous: "Semi Autonomous",
  fully_autonomous: "Fully Autonomous",
  approval_required: "Approval Required",
};

export const EXECUTION_STATUSES = [
  "queued",
  "running",
  "paused",
  "awaiting_approval",
  "completed",
  "failed",
  "cancelled",
  "partial",
] as const;

export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

export const TASK_STATUSES = [
  "queued",
  "running",
  "waiting",
  "completed",
  "failed",
  "skipped",
  "cancelled",
  "retrying",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const COST_STRATEGIES = [
  "cheapest",
  "fastest",
  "best",
  "balanced",
] as const;

export type CostStrategy = (typeof COST_STRATEGIES)[number];

export const COST_STRATEGY_LABELS: Record<CostStrategy, string> = {
  cheapest: "Goedkoopste model",
  fastest: "Snelste model",
  best: "Beste model",
  balanced: "Gebalanceerd",
};

export const ORCHESTRATOR_UI = {
  hubTitle: "AI Orchestrator",
  overviewTitle: "Overview",
  liveTitle: "Live Workflows",
  agentsTitle: "Agents",
  plansTitle: "Plans",
  tasksTitle: "Tasks",
  approvalsTitle: "Approvals",
  executionsTitle: "Executions",
  failuresTitle: "Failures",
  performanceTitle: "Performance",
  costsTitle: "Costs",
  historyTitle: "History",
  settingsTitle: "Settings",
} as const;

export const ORCHESTRATOR_NAV = [
  { href: "/orchestrator", label: ORCHESTRATOR_UI.overviewTitle },
  { href: "/orchestrator/live", label: ORCHESTRATOR_UI.liveTitle },
  { href: "/orchestrator/agents", label: ORCHESTRATOR_UI.agentsTitle },
  { href: "/orchestrator/plans", label: ORCHESTRATOR_UI.plansTitle },
  { href: "/orchestrator/tasks", label: ORCHESTRATOR_UI.tasksTitle },
  { href: "/orchestrator/approvals", label: ORCHESTRATOR_UI.approvalsTitle },
  { href: "/orchestrator/executions", label: ORCHESTRATOR_UI.executionsTitle },
  { href: "/orchestrator/failures", label: ORCHESTRATOR_UI.failuresTitle },
  { href: "/orchestrator/performance", label: ORCHESTRATOR_UI.performanceTitle },
  { href: "/orchestrator/costs", label: ORCHESTRATOR_UI.costsTitle },
  { href: "/orchestrator/history", label: ORCHESTRATOR_UI.historyTitle },
  { href: "/orchestrator/settings", label: ORCHESTRATOR_UI.settingsTitle },
] as const;
