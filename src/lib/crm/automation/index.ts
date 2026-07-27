/**
 * Phase 25F — AI Sales Automation Engine public surface.
 */

export {
  AUTOMATION_BLOCK_TYPES,
  AUTOMATION_BLOCK_LABELS,
  AUTOMATION_TRIGGERS,
  AUTOMATION_TRIGGER_LABELS,
  AUTOMATION_CONDITIONS,
  AUTOMATION_CONDITION_LABELS,
  AUTOMATION_ACTIONS,
  AUTOMATION_ACTION_LABELS,
  AUTOMATION_STATUSES,
  AUTOMATION_STATUS_LABELS,
  AUTOMATION_RUN_STATUSES,
  AUTOMATION_RUN_STATUS_LABELS,
  FUTURE_CHANNELS,
  type AutomationBlockType,
  type AutomationTrigger,
  type AutomationActionType,
  type AutomationStatus,
  type AutomationRunStatus,
} from "@/lib/crm/automation/constants";

export {
  emptyAutomationGraph,
  parseAutomationGraph,
  linearGraphFromActions,
} from "@/lib/crm/automation/graph";

export {
  SYSTEM_AUTOMATION_TEMPLATES,
  listSystemAutomationTemplates,
  suggestAutomationsFromContext,
} from "@/lib/crm/automation/templates";

export { evaluateCondition, evaluateAllConditions } from "@/lib/crm/automation/conditions";
export { executeAutomationRun } from "@/lib/crm/automation/executor";
export { processPendingAutomationEvents } from "@/lib/crm/automation/processor";

export {
  listAutomations,
  getAutomation,
  listAutomationRuns,
  getAutomationRun,
  listAutomationRunLogs,
  listAutomationVersions,
  buildAutomationDashboard,
} from "@/lib/crm/automation/queries";

export {
  upsertAutomationAction,
  setAutomationEnabledAction,
  deleteAutomationAction,
  saveAutomationWorkflowAction,
  runAutomationNowAction,
  processAutomationQueueAction,
  createAutomationFromTemplateAction,
} from "@/lib/crm/automation/actions";
