/**
 * Phase 27H — AI Orchestrator public barrel (client-safe).
 */

export {
  ORCHESTRATOR_AGENT_SLUG,
  ORCHESTRATOR_AGENT_VERSION,
  COLLABORATING_AGENTS,
  GOAL_INTENTS,
  GOAL_INTENT_LABELS,
  APPROVAL_POLICIES,
  APPROVAL_POLICY_LABELS,
  COST_STRATEGIES,
  COST_STRATEGY_LABELS,
  ORCHESTRATOR_UI,
  ORCHESTRATOR_NAV,
} from "@/lib/orchestrator/constants";

export type {
  GoalIntent,
  ApprovalPolicy,
  CostStrategy,
  CollaboratingAgentSlug,
} from "@/lib/orchestrator/constants";

export {
  detectGoalIntent,
  selectAgentsForIntent,
  buildGoalPlan,
} from "@/lib/orchestrator/planner";

export { mergeTaskResults, simulateAgentTask } from "@/lib/orchestrator/merge";
export {
  pickModel,
  decideRecovery,
  shouldRequireApproval,
} from "@/lib/orchestrator/cost";
