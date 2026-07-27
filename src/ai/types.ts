/**
 * Phase 27A — AI Agent Platform shared types.
 */

import type {
  AgentLifecycleStatus,
  AiEventType,
  AiProviderCode,
  AiRunStatus,
  AiTaskQueueName,
  AiTaskStatus,
  ApprovalMode,
  KnowledgeSourceType,
  MemoryScope,
} from "@/ai/constants";
import type { Json } from "@/types/supabase";

export type AiOrgSettingsRow = {
  organization_id: string;
  default_provider: string;
  default_model: string;
  failover_providers: Json;
  approval_mode: string;
  max_tokens_per_request: number;
  monthly_budget_usd: number | null;
  memory_enabled: boolean;
  logging_enabled: boolean;
  security_strict: boolean;
  rate_limit_per_minute: number;
  prompt_policy_json: Json;
  tool_policy_json: Json;
  metadata_json: Json;
  created_at: string;
  updated_at: string;
};

export type AiAgentRow = {
  id: string;
  organization_id: string;
  slug: string;
  name: string;
  description: string;
  version: string;
  status: string;
  owner_user_id: string | null;
  capabilities_json: Json;
  tools_json: Json;
  permissions_json: Json;
  provider: string;
  model: string;
  temperature: number;
  max_tokens: number;
  timeout_ms: number;
  retry_policy_json: Json;
  approval_mode: string;
  logging_enabled: boolean;
  system_prompt: string;
  is_system: boolean;
  deleted_at: string | null;
  metadata_json: Json;
  created_at: string;
  updated_at: string;
};

export type AiRunRow = {
  id: string;
  organization_id: string;
  agent_id: string;
  initiated_by: string | null;
  status: string;
  input_text: string;
  input_json: Json;
  output_text: string | null;
  output_json: Json;
  plan_json: Json;
  error_message: string | null;
  provider: string | null;
  model: string | null;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  latency_ms: number;
  approval_status: string | null;
  started_at: string | null;
  completed_at: string | null;
  metadata_json: Json;
  created_at: string;
  updated_at: string;
};

export type AiTaskRow = {
  id: string;
  organization_id: string;
  run_id: string;
  parent_task_id: string | null;
  queue_name: string;
  title: string;
  status: string;
  priority: number;
  depends_on_json: Json;
  input_json: Json;
  output_json: Json;
  tool_name: string | null;
  attempt: number;
  max_attempts: number;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  timeout_ms: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type AiMemoryEntryRow = {
  id: string;
  organization_id: string;
  memory_scope: string;
  scope_key: string;
  agent_id: string | null;
  run_id: string | null;
  user_id: string | null;
  company_id: string | null;
  content: string;
  summary: string | null;
  rank_score: number;
  embedding_json: Json;
  expires_at: string | null;
  metadata_json: Json;
  created_at: string;
};

export type AiKnowledgeDocumentRow = {
  id: string;
  organization_id: string;
  source_type: string;
  title: string;
  body: string;
  source_ref: string | null;
  tags_json: Json;
  chunk_index: number;
  embedding_json: Json;
  is_active: boolean;
  deleted_at: string | null;
  metadata_json: Json;
  created_at: string;
  updated_at: string;
};

export type AiPromptTemplateRow = {
  id: string;
  organization_id: string;
  slug: string;
  name: string;
  category: string;
  version: number;
  locale: string;
  template_body: string;
  variables_json: Json;
  parent_slug: string | null;
  ab_variant: string | null;
  is_active: boolean;
  deleted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AiToolDefinitionRow = {
  id: string;
  organization_id: string | null;
  tool_key: string;
  name: string;
  description: string;
  version: string;
  input_schema_json: Json;
  output_schema_json: Json;
  required_permissions_json: Json;
  timeout_ms: number;
  retry_count: number;
  logging_enabled: boolean;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
};

export type AiApprovalRow = {
  id: string;
  organization_id: string;
  run_id: string;
  task_id: string | null;
  requested_by: string | null;
  reviewed_by: string | null;
  status: string;
  action_summary: string;
  payload_json: Json;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export type AiCostLedgerRow = {
  id: string;
  organization_id: string;
  user_id: string | null;
  agent_id: string | null;
  run_id: string | null;
  provider: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  day_key: string;
  metadata_json: Json;
  created_at: string;
};

export type AiEventRow = {
  id: string;
  organization_id: string;
  event_type: string;
  agent_id: string | null;
  run_id: string | null;
  task_id: string | null;
  payload_json: Json;
  created_at: string;
};

export type AiExecutionLogRow = {
  id: string;
  organization_id: string;
  run_id: string | null;
  task_id: string | null;
  agent_id: string | null;
  user_id: string | null;
  provider: string | null;
  model: string | null;
  tool_name: string | null;
  input_preview: string;
  output_preview: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  latency_ms: number;
  approval_status: string | null;
  error_message: string | null;
  security_flags_json: Json;
  created_at: string;
};

export type AiWorkflowRow = {
  id: string;
  organization_id: string;
  slug: string;
  name: string;
  description: string;
  definition_json: Json;
  status: string;
  deleted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ModelCompletionRequest = {
  system: string;
  user: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  responseFormat?: "text" | "json";
};

export type ModelCompletionUsage = {
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
};

export type ModelCompletionResult = {
  content: string;
  provider: AiProviderCode;
  model: string;
  usage: ModelCompletionUsage;
  failoverUsed: boolean;
  attemptedProviders: AiProviderCode[];
};

export type AiProviderAdapter = {
  readonly code: AiProviderCode;
  isConfigured(): boolean;
  complete(request: ModelCompletionRequest): Promise<{
    content: string;
    model: string;
    usage: ModelCompletionUsage;
  }>;
};

export type PlanSubtask = {
  id: string;
  title: string;
  priority: number;
  dependsOn: string[];
  toolName?: string;
  input?: Record<string, unknown>;
  parallelGroup?: string;
};

export type ExecutionPlan = {
  summary: string;
  subtasks: PlanSubtask[];
  parallelGroups: string[];
};

export type AgentContextBundle = {
  organizationId: string;
  organizationName: string;
  userId: string | null;
  userRole: string | null;
  locale: string;
  timezone: string;
  permissions: string[];
  memorySnippets: string[];
  knowledgeSnippets: string[];
  crmSnapshot: {
    companies: number;
    contacts: number;
    deals: number;
    openTasks: number;
  };
  activeWorkflowSlug: string | null;
};

export type ToolInvokeInput = {
  organizationId: string;
  userId: string | null;
  agentId: string | null;
  runId: string | null;
  toolKey: string;
  input: Record<string, unknown>;
  grantedPermissions: string[];
};

export type ToolInvokeResult = {
  ok: boolean;
  output: Record<string, unknown>;
  error?: string;
  latencyMs: number;
};

export type SecurityScanResult = {
  allowed: boolean;
  flags: string[];
  sanitizedInput: string;
};

export type MonitoringSnapshot = {
  activeAgents: number;
  queuedTasks: number;
  runningTasks: number;
  deadLetterTasks: number;
  failedRuns24h: number;
  completedRuns24h: number;
  costTodayUsd: number;
  costMonthUsd: number;
  avgLatencyMs: number;
  pendingApprovals: number;
  providerStatus: Record<string, { configured: boolean; label: string }>;
  memoryEntries: number;
  toolInvocations24h: number;
};

export type TypedAgentStatus = AgentLifecycleStatus;
export type TypedRunStatus = AiRunStatus;
export type TypedTaskStatus = AiTaskStatus;
export type TypedQueueName = AiTaskQueueName;
export type TypedApprovalMode = ApprovalMode;
export type TypedMemoryScope = MemoryScope;
export type TypedKnowledgeSource = KnowledgeSourceType;
export type TypedEventType = AiEventType;
