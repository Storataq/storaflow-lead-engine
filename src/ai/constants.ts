/**
 * Phase 27A — AI Agent Platform constants (client-safe labels).
 */

export const AI_PROVIDERS = [
  "openai",
  "anthropic",
  "gemini",
  "azure_openai",
  "mistral",
  "llama",
  "none",
] as const;

export type AiProviderCode = (typeof AI_PROVIDERS)[number];

export const AI_PROVIDER_LABELS: Record<AiProviderCode, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google Gemini",
  azure_openai: "Azure OpenAI",
  mistral: "Mistral",
  llama: "Llama",
  none: "Disabled",
};

export const AGENT_LIFECYCLE_STATUSES = [
  "created",
  "idle",
  "planning",
  "waiting",
  "running",
  "needs_approval",
  "paused",
  "retrying",
  "failed",
  "completed",
  "cancelled",
] as const;

export type AgentLifecycleStatus = (typeof AGENT_LIFECYCLE_STATUSES)[number];

export const AGENT_STATUS_LABELS: Record<AgentLifecycleStatus, string> = {
  created: "Created",
  idle: "Idle",
  planning: "Planning",
  waiting: "Waiting",
  running: "Running",
  needs_approval: "Needs approval",
  paused: "Paused",
  retrying: "Retrying",
  failed: "Failed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const RUN_STATUSES = [
  "planning",
  "waiting",
  "running",
  "needs_approval",
  "paused",
  "retrying",
  "failed",
  "completed",
  "cancelled",
] as const;

export type AiRunStatus = (typeof RUN_STATUSES)[number];

export const TASK_QUEUE_NAMES = [
  "default",
  "priority",
  "retry",
  "dead_letter",
  "scheduled",
] as const;

export type AiTaskQueueName = (typeof TASK_QUEUE_NAMES)[number];

export const TASK_STATUSES = [
  "queued",
  "scheduled",
  "running",
  "waiting",
  "needs_approval",
  "retrying",
  "failed",
  "completed",
  "cancelled",
  "dead",
] as const;

export type AiTaskStatus = (typeof TASK_STATUSES)[number];

export const APPROVAL_MODES = [
  "read_only",
  "suggest",
  "approval_required",
  "semi_autonomous",
  "fully_autonomous",
] as const;

export type ApprovalMode = (typeof APPROVAL_MODES)[number];

export const APPROVAL_MODE_LABELS: Record<ApprovalMode, string> = {
  read_only: "Read only",
  suggest: "Suggest",
  approval_required: "Approval required",
  semi_autonomous: "Semi autonomous",
  fully_autonomous: "Fully autonomous",
};

export const MEMORY_SCOPES = [
  "short_term",
  "conversation",
  "user",
  "company",
  "agent",
  "workflow",
  "shared",
  "long_term",
] as const;

export type MemoryScope = (typeof MEMORY_SCOPES)[number];

export const MEMORY_SCOPE_LABELS: Record<MemoryScope, string> = {
  short_term: "Short term",
  conversation: "Conversation",
  user: "User",
  company: "Company",
  agent: "Agent",
  workflow: "Workflow",
  shared: "Shared",
  long_term: "Long term",
};

export const KNOWLEDGE_SOURCE_TYPES = [
  "crm",
  "document",
  "faq",
  "playbook",
  "company_info",
  "policy",
  "note",
  "web",
  "custom",
] as const;

export type KnowledgeSourceType = (typeof KNOWLEDGE_SOURCE_TYPES)[number];

export const SYSTEM_AGENT_SLUG = "storaflow-kernel-assistant";

export const SYSTEM_TOOL_KEYS = [
  "crm.search_companies",
  "crm.search_contacts",
  "crm.search_deals",
  "crm.list_tasks",
  "memory.save",
  "memory.recall",
  "knowledge.search",
  "analytics.summary",
] as const;

export type SystemToolKey = (typeof SYSTEM_TOOL_KEYS)[number];

export const AI_EVENT_TYPES = [
  "agent.registered",
  "agent.status_changed",
  "run.started",
  "run.completed",
  "run.failed",
  "task.created",
  "task.completed",
  "task.failed",
  "approval.requested",
  "approval.resolved",
  "memory.saved",
  "workflow.finished",
  "tool.invoked",
  "provider.failover",
  "cost.recorded",
] as const;

export type AiEventType = (typeof AI_EVENT_TYPES)[number];

export const AI_PLATFORM_UI = {
  hubTitle: "AI Platform",
  overviewTitle: "Overview",
  agentsTitle: "Agents",
  tasksTitle: "Tasks",
  workflowsTitle: "Workflows",
  memoryTitle: "Memory",
  contextTitle: "Context",
  knowledgeTitle: "Knowledge",
  promptsTitle: "Prompt Library",
  toolsTitle: "Tools",
  providersTitle: "Providers",
  costsTitle: "Costs",
  logsTitle: "Logs",
  securityTitle: "Security",
  settingsTitle: "Settings",
} as const;

export const AI_PLATFORM_NAV = [
  { href: "/ai-platform", label: AI_PLATFORM_UI.overviewTitle },
  { href: "/ai-platform/agents", label: AI_PLATFORM_UI.agentsTitle },
  { href: "/ai-platform/tasks", label: AI_PLATFORM_UI.tasksTitle },
  { href: "/ai-platform/workflows", label: AI_PLATFORM_UI.workflowsTitle },
  { href: "/ai-platform/memory", label: AI_PLATFORM_UI.memoryTitle },
  { href: "/ai-platform/context", label: AI_PLATFORM_UI.contextTitle },
  { href: "/ai-platform/knowledge", label: AI_PLATFORM_UI.knowledgeTitle },
  { href: "/ai-platform/prompts", label: AI_PLATFORM_UI.promptsTitle },
  { href: "/ai-platform/tools", label: AI_PLATFORM_UI.toolsTitle },
  { href: "/ai-platform/providers", label: AI_PLATFORM_UI.providersTitle },
  { href: "/ai-platform/costs", label: AI_PLATFORM_UI.costsTitle },
  { href: "/ai-platform/logs", label: AI_PLATFORM_UI.logsTitle },
  { href: "/ai-platform/security", label: AI_PLATFORM_UI.securityTitle },
  { href: "/ai-platform/settings", label: AI_PLATFORM_UI.settingsTitle },
] as const;

/** Approximate USD per 1K tokens — used for realtime cost ledger. */
export const MODEL_COST_PER_1K: Record<
  string,
  { input: number; output: number }
> = {
  "gpt-4.1-mini": { input: 0.0004, output: 0.0016 },
  "gpt-4.1": { input: 0.002, output: 0.008 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "gpt-4o": { input: 0.0025, output: 0.01 },
  "claude-sonnet-4-20250514": { input: 0.003, output: 0.015 },
  "claude-3-5-haiku-latest": { input: 0.0008, output: 0.004 },
  "gemini-2.0-flash": { input: 0.0001, output: 0.0004 },
  "gemini-1.5-pro": { input: 0.00125, output: 0.005 },
};

export const DEFAULT_FAILOVER_CHAIN: AiProviderCode[] = [
  "openai",
  "anthropic",
  "gemini",
];
