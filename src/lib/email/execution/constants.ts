/**
 * Email Execution Engine — Phase 21E
 * Queue / scheduler / execution state (no external provider dispatch).
 */

export const CAMPAIGN_EXECUTION_STATUSES = [
  "draft",
  "preparing",
  "ready",
  "running",
  "paused",
  "completed",
  "cancelled",
  "failed",
] as const;

export type CampaignExecutionStatus =
  (typeof CAMPAIGN_EXECUTION_STATUSES)[number];

export const ENROLLMENT_STATUSES = [
  "pending",
  "scheduled",
  "active",
  "waiting",
  "paused",
  "completed",
  "stopped",
  "failed",
  "cancelled",
] as const;

export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const STEP_EXECUTION_STATUSES = [
  "pending",
  "queued",
  "scheduled",
  "processing",
  "completed",
  "skipped",
  "failed",
  "cancelled",
  "stopped",
] as const;

export type StepExecutionStatus = (typeof STEP_EXECUTION_STATUSES)[number];

export const EXECUTION_QUEUE_JOB_STATUSES = [
  "pending",
  "scheduled",
  "available",
  "locked",
  "processing",
  "completed",
  "retry",
  "failed",
  "cancelled",
  "dead_letter",
] as const;

export type ExecutionQueueJobStatus =
  (typeof EXECUTION_QUEUE_JOB_STATUSES)[number];

export const EXECUTION_QUEUE_JOB_TYPES = [
  "process_sequence_step",
  "process_email_step",
  "process_wait_step",
  "process_condition_step",
  "process_manual_task_step",
  "process_end_step",
] as const;

export type ExecutionQueueJobType =
  (typeof EXECUTION_QUEUE_JOB_TYPES)[number];

export const DEFAULT_MAX_JOB_ATTEMPTS = 5;
export const DEFAULT_JOB_PRIORITY = 0;
export const DEFAULT_QUEUE_LEASE_SECONDS = 120;

export function isExecutionTerminalStatus(status: string): boolean {
  return (
    status === "completed" ||
    status === "cancelled" ||
    status === "failed" ||
    status === "stopped"
  );
}

