/**
 * Phase 27A — AI Agent Platform public barrel (client-safe).
 */

export {
  AI_PROVIDERS,
  AI_PROVIDER_LABELS,
  AGENT_LIFECYCLE_STATUSES,
  AGENT_STATUS_LABELS,
  APPROVAL_MODES,
  APPROVAL_MODE_LABELS,
  MEMORY_SCOPES,
  MEMORY_SCOPE_LABELS,
  SYSTEM_AGENT_SLUG,
  SYSTEM_TOOL_KEYS,
  AI_PLATFORM_UI,
  AI_PLATFORM_NAV,
  DEFAULT_FAILOVER_CHAIN,
} from "@/ai/constants";

export type {
  AiProviderCode,
  AgentLifecycleStatus,
  ApprovalMode,
  MemoryScope,
} from "@/ai/constants";

export {
  canTransition,
} from "@/ai/agents/lifecycle-client";

export {
  buildExecutionPlan,
  topologicalSort,
  groupParallelReady,
} from "@/ai/planner/planner";

export {
  rankMemoryRelevance,
  summarizeMemory,
} from "@/ai/memory/rank-client";

export {
  scanUserInput,
  assertToolPermission,
} from "@/ai/security/engine";

export {
  estimateCostUsd,
} from "@/ai/providers/costs";

export {
  renderPromptTemplate,
} from "@/ai/prompts/render";

export {
  scoreGrounding,
  detectHallucinationRisk,
} from "@/ai/evaluation/score";
