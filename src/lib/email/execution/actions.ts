/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { z } from "zod";

import { resolveFirstStep } from "@/lib/email/execution/step-resolver";
import { calculateWaitDelayMs } from "@/lib/email/execution/wait";
import {
  createEnrollmentIfNotExists,
  createStepExecutionIfNotExists,
  makeScheduleIdempotencyKey,
  upsertQueueJob,
} from "@/lib/email/execution/queue";
import { createServiceClient } from "@/lib/supabase/admin";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { getSequenceVersion } from "@/lib/email/sequence/queries";
import { parseStepsJson } from "@/lib/email/sequence/steps";
import {
  getEmailCampaign,
  loadSuppressionLookup,
  lookupSuppressionStatus,
} from "@/lib/email/campaign/queries";
import { isValidEmailSyntax } from "@/lib/email/validators";

type SupabaseLike = any;

export type ExecutionActionResult = {
  success: boolean;
  message: string;
  id?: string;
};

export async function startCampaignExecutionAction(input: {
  campaignId: string;
}): Promise<ExecutionActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  const orgId = context.organization.id;
  const userId = context.membership.user_id;

  const schema = z.object({ campaignId: z.string().min(1) });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Invalid input." };

  const campaign = await getEmailCampaign(orgId, parsed.data.campaignId);
  if (!campaign) return { success: false, message: "Campaign not found." };

  if (campaign.status !== "approved") {
    return { success: false, message: "Only approved campaigns may start execution." };
  }
  if (!campaign.locked) {
    return { success: false, message: "Campaign must be locked for execution." };
  }

  const sequenceId = campaign.sequence_id ?? null;
  const sequenceVersionId = campaign.sequence_version_id ?? null;
  if (!sequenceId || !sequenceVersionId) {
    return {
      success: false,
      message: "Campaign does not have a locked sequence version (Phase 21D required).",
    };
  }

  const supabase = createServiceClient() as unknown as SupabaseLike;

  // Prevent duplicate active execution.
  const { data: existing } = await supabase
    .from("email_campaign_executions")
    .select("*")
    .eq("organization_id", orgId)
    .eq("campaign_id", campaign.id)
    .in("status", ["preparing", "ready", "running", "paused"])
    .order("created_at", { ascending: false })
    .limit(1);

  if ((existing ?? []).length) {
    return {
      success: true,
      message: "Execution already exists (no duplicates created).",
      id: existing![0].id,
    };
  }

  // Ensure recipient snapshot exists.
  const { count: snapshotCount, error: countError } = await supabase
    .from("email_recipients")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("campaign_id", campaign.id)
    .eq("is_snapshot", true);

  if (countError) throw new Error(countError.message);
  if (!snapshotCount || snapshotCount < 1) {
    return { success: false, message: "Recipient snapshot missing. Create snapshot first." };
  }

  // Load sequence version steps + first step.
  const sequenceVersion = await getSequenceVersion(orgId, sequenceVersionId);
  if (!sequenceVersion) return { success: false, message: "Sequence version not found." };

  const steps = parseStepsJson(sequenceVersion.steps_json as any);
  const firstStep = resolveFirstStep(steps as any);
  if (!firstStep) return { success: false, message: "Sequence has no start step." };

  const now = new Date().toISOString();

  const { data: createdExec, error: createExecError } = await supabase
    .from("email_campaign_executions")
    .insert({
      organization_id: orgId,
      campaign_id: campaign.id,
      campaign_approval_id: campaign.approved_by ? null : null,
      sequence_id: sequenceId,
      sequence_version_id: sequenceVersionId,
      status: "ready",
      total_recipient_count: snapshotCount ?? 0,
      enrolled_count: 0,
      active_count: 0,
      completed_count: 0,
      stopped_count: 0,
      failed_count: 0,
      created_by: userId,
      started_by: userId,
      started_at: now,
      pause_reason: null,
      cancel_reason: null,
    })
    .select("*")
    .single();

  if (createExecError) return { success: false, message: createExecError.message };
  const executionId = createdExec.id as string;

  // Snapshot recipients (immutable rows).
  const batchSize = 100;
  const recipientsRes = await supabase
    .from("email_recipients")
    .select("*")
    .eq("organization_id", orgId)
    .eq("campaign_id", campaign.id)
    .eq("is_snapshot", true)
    .order("created_at", { ascending: true })
    .limit(5000);

  const recipients = recipientsRes.data ?? [];

  // Re-check suppression once per org.
  const suppressionLookup = await loadSuppressionLookup(orgId);

  let enrolledCount = 0;
  const seqStepsVersionId = sequenceVersionId;

  for (let i = 0; i < recipients.length; i += batchSize) {
    const chunk = recipients.slice(i, i + batchSize);
    const createdInChunk: string[] = [];

    for (const r of chunk) {
      const preferredEmail = r.preferred_email as string | null;
      if (!preferredEmail) continue;
      if (!isValidEmailSyntax(preferredEmail)) continue;

      const currentSuppression = lookupSuppressionStatus(
        suppressionLookup,
        preferredEmail,
      );
      if (currentSuppression !== "active") continue;

      const scheduledFor =
        firstStep.type === "wait"
          ? new Date(
              new Date(now).getTime() + calculateWaitDelayMs(firstStep),
            ).toISOString()
          : now;

      const enrollment = await createEnrollmentIfNotExists({
        supabase,
        organizationId: orgId,
        campaignExecutionId: executionId,
        campaignId: campaign.id,
        recipientSnapshotId: r.id as string,
        leadId: r.lead_id ?? null,
        companyId: r.company_id ?? null,
        contactId: r.contact_id ?? null,
        emailAddress: preferredEmail,
        sequenceId,
        sequenceVersionId: seqStepsVersionId,
        status: scheduledFor === now ? "active" : "scheduled",
        currentStepId: firstStep.id,
        currentStepNumber: firstStep.order,
        nextExecutionTimeIso: scheduledFor,
      });

      const stepExec = await createStepExecutionIfNotExists({
        supabase,
        organizationId: orgId,
        enrollmentId: enrollment.id,
        campaignExecutionId: executionId,
        sequenceStepId: firstStep.id,
        sequenceVersionId: seqStepsVersionId,
        stepNumber: firstStep.order,
        stepType: firstStep.type,
        attemptCount: 0,
        scheduledForIso: scheduledFor,
      });

      const idempotencyKey = makeScheduleIdempotencyKey({
        stepExecutionId: stepExec.id,
        scheduledForIso: scheduledFor,
      });

      await upsertQueueJob({
        supabase,
        organizationId: orgId,
        jobType:
          firstStep.type === "email"
            ? "process_email_step"
            : firstStep.type === "wait"
              ? "process_wait_step"
              : firstStep.type === "condition"
                ? "process_condition_step"
                : firstStep.type === "manual_task"
                  ? "process_manual_task_step"
                  : "process_end_step",
        campaignExecutionId: executionId,
        enrollmentId: enrollment.id,
        stepExecutionId: stepExec.id,
        sequenceStepId: firstStep.id,
        status: "scheduled",
        priority: 0,
        scheduledForIso: scheduledFor,
        idempotencyKey,
        attemptCount: 0,
        maximumAttempts: 5,
        payload: { stepType: firstStep.type },
      });

      createdInChunk.push(enrollment.id);
    }

    enrolledCount += createdInChunk.length;
  }

  await supabase
    .from("email_campaign_executions")
    .update({
      enrolled_count: enrolledCount,
      active_count: enrolledCount,
    })
    .eq("organization_id", orgId)
    .eq("id", executionId);

  return {
    success: true,
    message: `Execution prepared (${enrolledCount} enrollments). Worker/scheduler not run automatically.`,
    id: executionId,
  };
}

export async function pauseCampaignExecutionAction(input: {
  executionId: string;
  reason?: string;
}): Promise<ExecutionActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };
  const supabase = createServiceClient() as unknown as SupabaseLike;

  await supabase
    .from("email_campaign_executions")
    .update({
      status: "paused",
      pause_reason: input.reason ?? null,
      paused_at: new Date().toISOString(),
    })
    .eq("organization_id", context.organization.id)
    .eq("id", input.executionId);

  return { success: true, message: "Execution paused.", id: input.executionId };
}

export async function resumeCampaignExecutionAction(input: {
  executionId: string;
}): Promise<ExecutionActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };
  const supabase = createServiceClient() as unknown as SupabaseLike;

  await supabase
    .from("email_campaign_executions")
    .update({
      status: "running",
      resumed_at: new Date().toISOString(),
    })
    .eq("organization_id", context.organization.id)
    .eq("id", input.executionId);

  return { success: true, message: "Execution resumed.", id: input.executionId };
}

export async function cancelCampaignExecutionAction(input: {
  executionId: string;
  reason?: string;
}): Promise<ExecutionActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };
  const supabase = createServiceClient() as unknown as SupabaseLike;

  await supabase
    .from("email_campaign_executions")
    .update({
      status: "cancelled",
      cancel_reason: input.reason ?? null,
      cancelled_at: new Date().toISOString(),
    })
    .eq("organization_id", context.organization.id)
    .eq("id", input.executionId);

  return { success: true, message: "Execution cancelled.", id: input.executionId };
}

