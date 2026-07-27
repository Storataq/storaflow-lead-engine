/**
 * Phase 21L — operations / hardening public surface.
 */

export {
  timingSafeStringEqual,
  createCorrelationId,
  isSafeHttpUrl,
  escapeCsvCell,
  redactSecret,
  envFlag,
  parseAllowlist,
} from "@/lib/email/ops/security";

export { validateEmailEnvironment } from "@/lib/email/ops/env";
export {
  ensureEmergencyControls,
  evaluateDispatchGate,
  recordProviderDispatchOutcome,
  setEmergencyStop,
} from "@/lib/email/ops/controls";
export {
  buildEmailOpsOverview,
  upsertWorkerHeartbeat,
} from "@/lib/email/ops/health";
export { runQueueReconciliation } from "@/lib/email/ops/reconciliation";
export {
  evaluateCampaignLaunchGate,
  DEFAULT_READINESS_CHECKS,
} from "@/lib/email/ops/readiness";
export { checkRateLimit } from "@/lib/email/ops/rate-limit";
export { runEmailE2EHarness } from "@/lib/email/ops/e2e-harness";
