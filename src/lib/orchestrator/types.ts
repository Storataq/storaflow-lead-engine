/**
 * Phase 27H — AI Orchestrator types.
 */

import type { Json } from "@/types/supabase";

export type OrchestratorOrgSettingsRow = {
  organization_id: string;
  enabled: boolean;
  approval_policy: string;
  autonomy_level: string;
  provider: string;
  model: string;
  provider_priority_json: Json;
  default_agents_json: Json;
  model_router_json: Json;
  workflow_timeout_seconds: number;
  retry_limit: number;
  cost_limit_usd: number;
  memory_policy_json: Json;
  notification_rules_json: Json;
  rate_limit_per_minute: number;
  metadata_json: Json;
  created_at: string;
  updated_at: string;
};

export type OrchestratorGoalRow = {
  id: string;
  organization_id: string;
  goal_text: string;
  intent: string;
  status: string;
  priority: number;
  filters_json: Json;
  context_json: Json;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type OrchestratorPlanRow = {
  id: string;
  organization_id: string;
  goal_id: string;
  version: number;
  status: string;
  steps_json: Json;
  parallel_groups_json: Json;
  dependencies_json: Json;
  estimated_cost_usd: number;
  estimated_duration_ms: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type OrchestratorExecutionRow = {
  id: string;
  organization_id: string;
  goal_id: string;
  plan_id: string;
  status: string;
  progress_pct: number;
  agents_json: Json;
  result_json: Json;
  merged_report: string;
  executive_summary: string;
  cost_usd: number;
  tokens_used: number;
  provider: string | null;
  model: string | null;
  latency_ms: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type OrchestratorTaskRow = {
  id: string;
  organization_id: string;
  execution_id: string;
  plan_id: string;
  step_key: string;
  agent_slug: string;
  title: string;
  status: string;
  priority: number;
  depends_on_json: Json;
  parallel_group: number | null;
  attempt: number;
  max_attempts: number;
  timeout_seconds: number;
  input_json: Json;
  output_json: Json;
  error_message: string | null;
  provider: string | null;
  model: string | null;
  cost_usd: number;
  latency_ms: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OrchestratorApprovalRow = {
  id: string;
  organization_id: string;
  execution_id: string;
  task_id: string | null;
  approval_type: string;
  status: string;
  title: string;
  rationale: string;
  required_roles_json: Json;
  decided_by: string | null;
  decided_at: string | null;
  payload_json: Json;
  created_at: string;
};

export type OrchestratorHistoryEventRow = {
  id: string;
  organization_id: string;
  execution_id: string | null;
  goal_id: string | null;
  event_type: string;
  actor_user_id: string | null;
  summary: string;
  payload_json: Json;
  provider: string | null;
  model: string | null;
  cost_usd: number;
  created_at: string;
};

export type PlanStep = {
  stepKey: string;
  agentSlug: string;
  title: string;
  dependsOn: string[];
  parallelGroup: number;
  approvalRequired: boolean;
  estimatedCostUsd: number;
  estimatedDurationMs: number;
};

export type TaskResult = {
  stepKey: string;
  agentSlug: string;
  title: string;
  status: "completed" | "failed" | "skipped";
  summary: string;
  insights: string[];
  recommendations: string[];
  risks: string[];
  actionItems: string[];
  costUsd: number;
  tokensUsed: number;
  latencyMs: number;
  provider: string;
  model: string;
};

export type MergedResult = {
  report: string;
  executiveSummary: string;
  insights: string[];
  recommendations: string[];
  risks: string[];
  actionItems: string[];
  nextSteps: string[];
  conflictsResolved: number;
  duplicatesRemoved: number;
};

export type OrchestratorAnalytics = {
  workflowCount: number;
  runningCount: number;
  successRate: number;
  avgDurationMs: number;
  totalCostUsd: number;
  totalTokens: number;
  failureCount: number;
  agentPerformance: Array<{
    agentSlug: string;
    runs: number;
    successRate: number;
    avgLatencyMs: number;
    costUsd: number;
  }>;
};
