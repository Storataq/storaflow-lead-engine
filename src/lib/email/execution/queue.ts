/* eslint-disable @typescript-eslint/no-explicit-any */
import { DEFAULT_MAX_JOB_ATTEMPTS } from "@/lib/email/execution/constants";
import { createServiceClient } from "@/lib/supabase/admin";

type SupabaseLike = any;

export function makeScheduleIdempotencyKey(input: {
  stepExecutionId: string;
  scheduledForIso: string;
}): string {
  return `schedule:${input.stepExecutionId}:${input.scheduledForIso}`;
}

export async function claimExecutionQueueJobs(input: {
  organizationId: string;
  workerId: string;
  batchSize: number;
  leaseSeconds: number;
  nowIso: string;
}): Promise<any[]> {
  const supabase = createServiceClient() as unknown as SupabaseLike;
  const { data } = await supabase.rpc("claim_email_execution_queue_jobs", {
    p_organization_id: input.organizationId,
    p_worker_id: input.workerId,
    p_batch_size: input.batchSize,
    p_now: input.nowIso,
    p_lease_seconds: input.leaseSeconds,
  });
  return (data ?? []) as any[];
}

export async function upsertQueueJob(input: {
  supabase: SupabaseLike;
  organizationId: string;
  jobType: string;
  campaignExecutionId: string | null;
  enrollmentId: string | null;
  stepExecutionId: string | null;
  sequenceStepId?: string | null;
  status: string;
  priority: number;
  scheduledForIso: string | null;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
  maximumAttempts?: number;
  attemptCount?: number;
}): Promise<any> {
  const existing = await input.supabase
    .from("email_queue_jobs")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();

  if (existing?.data) return existing.data;

  const { data, error } = await input.supabase
    .from("email_queue_jobs")
    .insert({
      organization_id: input.organizationId,
      job_type: input.jobType,
      campaign_execution_id: input.campaignExecutionId,
      enrollment_id: input.enrollmentId,
      step_execution_id: input.stepExecutionId,
      sequence_step_id: input.sequenceStepId ?? null,
      status: input.status,
      priority: input.priority ?? 0,
      scheduled_for: input.scheduledForIso ?? null,
      idempotency_key: input.idempotencyKey,
      payload_json: (input.payload ?? {}) as any,
      maximum_attempts: input.maximumAttempts ?? DEFAULT_MAX_JOB_ATTEMPTS,
      attempt_count: input.attemptCount ?? 0,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createStepExecutionIfNotExists(input: {
  supabase: SupabaseLike;
  organizationId: string;
  enrollmentId: string;
  campaignExecutionId: string;
  sequenceStepId: string;
  sequenceVersionId: string | null;
  stepNumber: number;
  stepType: string;
  attemptCount: number;
  scheduledForIso: string;
}): Promise<any> {
  const existing = await input.supabase
    .from("email_step_executions")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("enrollment_id", input.enrollmentId)
    .eq("sequence_step_id", input.sequenceStepId)
    .eq("attempt_count", input.attemptCount)
    .maybeSingle();
  if (existing?.data) return existing.data;

  const { data, error } = await input.supabase
    .from("email_step_executions")
    .insert({
      organization_id: input.organizationId,
      enrollment_id: input.enrollmentId,
      campaign_execution_id: input.campaignExecutionId,
      sequence_step_id: input.sequenceStepId,
      sequence_version_id: input.sequenceVersionId ?? null,
      step_number: input.stepNumber,
      step_type: input.stepType,
      status: "scheduled",
      scheduled_for: input.scheduledForIso,
      attempt_count: input.attemptCount,
      result_data: {},
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createEnrollmentIfNotExists(input: {
  supabase: SupabaseLike;
  organizationId: string;
  campaignExecutionId: string;
  campaignId: string;
  recipientSnapshotId: string;
  leadId: string | null;
  companyId: string | null;
  contactId: string | null;
  emailAddress: string;
  sequenceId: string | null;
  sequenceVersionId: string | null;
  status: string;
  currentStepId: string | null;
  currentStepNumber: number | null;
  nextExecutionTimeIso: string | null;
}): Promise<any> {
  const existing = await input.supabase
    .from("email_sequence_enrollments")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("campaign_execution_id", input.campaignExecutionId)
    .eq("recipient_snapshot_id", input.recipientSnapshotId)
    .eq("sequence_version_id", input.sequenceVersionId)
    .maybeSingle();
  if (existing?.data) return existing.data;

  const { data, error } = await input.supabase
    .from("email_sequence_enrollments")
    .insert({
      organization_id: input.organizationId,
      campaign_execution_id: input.campaignExecutionId,
      campaign_id: input.campaignId,
      recipient_snapshot_id: input.recipientSnapshotId,
      lead_id: input.leadId ?? null,
      company_id: input.companyId ?? null,
      contact_id: input.contactId ?? null,
      email_address: input.emailAddress,
      sequence_id: input.sequenceId ?? null,
      sequence_version_id: input.sequenceVersionId ?? null,
      status: input.status,
      current_step_id: input.currentStepId,
      current_step_number: input.currentStepNumber,
      next_execution_time: input.nextExecutionTimeIso ?? null,
      timezone_strategy: "utc",
      attempt_count: 0,
      pause_reason: null,
      stop_reason: null,
      completion_reason: null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

