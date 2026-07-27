/**
 * Execution worker — Phase 21E
 *
 * Processes internal execution queue jobs and produces rendered-message snapshots.
 * This phase does NOT call any external email provider.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { previewEmailTemplate } from "@/lib/email/template";
import { DEFAULT_VARIABLE_FALLBACKS } from "@/lib/email/template/constants";
import { createEmailProvider } from "@/lib/email/provider";
import { prepareTrackedMessage } from "@/lib/email/tracking";
import {
  buildListUnsubscribeHeaders,
  injectCompliantFooter,
  issuePreferenceTokens,
  recalculateAndPersistEffectiveStatus,
} from "@/lib/email/preferences";
import { normalizeSuppressionEmail } from "@/lib/email/suppression";
import { parseStepsJson } from "@/lib/email/sequence/steps";
import {
  getEmailSequence,
  getSequenceVersion,
} from "@/lib/email/sequence/queries";
import { evaluateExecutionStopRules } from "@/lib/email/execution/stop-rules";
import { resolveNextStep } from "@/lib/email/execution/step-resolver";
import { calculateWaitDelayMs } from "@/lib/email/execution/wait";
import type { Json } from "@/types/supabase";
import { createServiceClient } from "@/lib/supabase/admin";
import {
  claimExecutionQueueJobs,
  createStepExecutionIfNotExists,
  makeScheduleIdempotencyKey,
  upsertQueueJob,
} from "@/lib/email/execution/queue";
import {
  evaluateDispatchGate,
  recordProviderDispatchOutcome,
} from "@/lib/email/ops/controls";
import { upsertWorkerHeartbeat } from "@/lib/email/ops/health";
import { createCorrelationId } from "@/lib/email/ops/security";

type SupabaseLike = any;

function buildDispatchIdempotencyKey(input: {
  organizationId: string;
  enrollmentId: string;
  stepExecutionId: string;
}): string {
  return `dispatch:${input.organizationId}:${input.enrollmentId}:${input.stepExecutionId}`;
}

async function cancelPendingJobsForEnrollment(input: {
  supabase: SupabaseLike;
  organizationId: string;
  enrollmentId: string;
  now: string;
}) {
  await input.supabase
    .from("email_queue_jobs")
    .update({
      status: "cancelled",
      cancelled_at: input.now,
    })
    .eq("organization_id", input.organizationId)
    .eq("enrollment_id", input.enrollmentId)
    .in("status", ["scheduled", "available", "locked", "processing", "retry"]);
}

export async function runExecutionWorker(input: {
  organizationId: string;
  workerId: string;
  batchSize: number;
  leaseSeconds: number;
  nowIso: string;
  simulation?: boolean;
}): Promise<{ processed: number; completed: number; failed: number }> {
  const supabase = createServiceClient() as unknown as SupabaseLike;
  const correlationId = createCorrelationId("worker");
  const simulation = Boolean(input.simulation);

  await upsertWorkerHeartbeat({
    organizationId: input.organizationId,
    workerId: input.workerId,
    status: "running",
  });

  console.info("[email_ops] worker_batch_start", {
    correlationId,
    organizationId: input.organizationId,
    workerId: input.workerId,
    simulation,
  });

  const claimed = await claimExecutionQueueJobs({
    organizationId: input.organizationId,
    workerId: input.workerId,
    batchSize: input.batchSize,
    leaseSeconds: input.leaseSeconds,
    nowIso: input.nowIso,
  });

  let processed = 0;
  let completed = 0;
  let failed = 0;

  for (const job of claimed) {
    processed += 1;
    const jobId = job.id as string;
    const stepExecutionId = job.step_execution_id as string | null;

    try {
      await supabase
        .from("email_queue_jobs")
        .update({
          status: "processing",
          last_attempt_at: input.nowIso,
        })
        .eq("organization_id", input.organizationId)
        .eq("id", jobId);

      if (!stepExecutionId) {
        await supabase
          .from("email_queue_jobs")
          .update({
            status: "failed",
            error_code: "missing_step_execution",
            error_message: "Queue job has no step_execution_id",
            failed_at: input.nowIso,
          })
          .eq("organization_id", input.organizationId)
          .eq("id", jobId);
        failed += 1;
        continue;
      }

      const { data: stepExec } = await supabase
        .from("email_step_executions")
        .select("*")
        .eq("organization_id", input.organizationId)
        .eq("id", stepExecutionId)
        .maybeSingle();

      if (!stepExec) throw new Error("Step execution not found");

      await supabase
        .from("email_step_executions")
        .update({
          status: "processing",
          started_at: input.nowIso,
        })
        .eq("organization_id", input.organizationId)
        .eq("id", stepExecutionId);

      const enrollmentId = stepExec.enrollment_id as string;
      const { data: enrollment } = await supabase
        .from("email_sequence_enrollments")
        .select("*")
        .eq("organization_id", input.organizationId)
        .eq("id", enrollmentId)
        .maybeSingle();

      if (!enrollment) throw new Error("Enrollment not found");

      const recipientSnapshotId =
        enrollment.recipient_snapshot_id as string;
      const { data: recipient } = await supabase
        .from("email_recipients")
        .select("*")
        .eq("organization_id", input.organizationId)
        .eq("id", recipientSnapshotId)
        .maybeSingle();

      if (!recipient) throw new Error("Recipient snapshot not found");

      const campaignExecutionId = enrollment.campaign_execution_id as string;
      const { data: campaignExecution } = await supabase
        .from("email_campaign_executions")
        .select("*")
        .eq("organization_id", input.organizationId)
        .eq("id", campaignExecutionId)
        .maybeSingle();
      if (!campaignExecution) throw new Error("Campaign execution not found");

      const sequenceVersionId = stepExec.sequence_version_id as string | null;
      const sequenceId = campaignExecution.sequence_id as string | null;

      const sequenceSteps = sequenceVersionId
        ? parseStepsJson(
            (await getSequenceVersion(input.organizationId, sequenceVersionId))?.steps_json ?? [],
          )
        : [];
      const currentStep = sequenceSteps.find(
        (s: any) => s.id === stepExec.sequence_step_id,
      );
      if (!currentStep) throw new Error("Current sequence step not found");

      const sequence = sequenceId
        ? await getEmailSequence(input.organizationId, sequenceId)
        : null;
      const stopRules = sequence?.stop_rules_json
        ? (sequence.stop_rules_json as unknown as string[])
        : [];

      const conditionInput = {
        qualificationScore: recipient.qualification_score ?? null,
        opportunityScore: recipient.opportunity_score ?? null,
        validationStatus: recipient.validation_status ?? null,
        suppressionStatus: recipient.suppression_status ?? null,
        campaignApprovalStatus: "approved",
        personalizationJson: recipient.personalization_json ?? {},
        manualFlag: false,
      };

      const stopDecision = evaluateExecutionStopRules({
        stopRules,
        campaignExecutionStatus: campaignExecution.status,
        enrollmentStatus: enrollment.status,
        suppressionStatus: recipient.suppression_status ?? null,
        validationStatus: recipient.validation_status ?? null,
        attemptCount: job.attempt_count ?? 0,
        maximumAttempts: job.maximum_attempts ?? 5,
      });

      if (stopDecision.stop) {
        await supabase
          .from("email_step_executions")
          .update({
            status: "stopped",
            result_type: "stop",
            result_data: stopDecision as Json,
            completed_at: input.nowIso,
            error_message: stopDecision.stopReason ?? null,
          })
          .eq("organization_id", input.organizationId)
          .eq("id", stepExecutionId);

        await supabase
          .from("email_sequence_enrollments")
          .update({
            status: "stopped",
            stop_reason: stopDecision.stopReason ?? null,
            stopped_at: input.nowIso,
          })
          .eq("organization_id", input.organizationId)
          .eq("id", enrollmentId);

        await supabase
          .from("email_execution_stop_events")
          .insert({
            organization_id: input.organizationId,
            enrollment_id: enrollmentId,
            step_execution_id: stepExecutionId,
            rule_type: stopDecision.evaluations[0]?.ruleType ?? null,
            rule_code: stopDecision.stopReason ?? null,
            stop_reason: stopDecision.stopReason ?? null,
            source: "stop_rules",
            evaluated_at: input.nowIso,
            result_json: stopDecision as any,
          });

        await cancelPendingJobsForEnrollment({
          supabase,
          organizationId: input.organizationId,
          enrollmentId,
          now: input.nowIso,
        });

        await supabase
          .from("email_queue_jobs")
          .update({
            status: "completed",
            result_json: { stopped: true, stopReason: stopDecision.stopReason } as any,
            completed_at: input.nowIso,
          })
          .eq("organization_id", input.organizationId)
          .eq("id", jobId);

        completed += 1;
        continue;
      }

      // Resolve + process.
      if (currentStep.type === "email") {
        const template = {
          subject: currentStep.email?.subjectSnapshot ?? "",
          previewText: currentStep.email?.previewSnapshot ?? null,
          htmlBody: currentStep.email?.htmlSnapshot ?? "",
          textBody: currentStep.email?.textSnapshot ?? null,
          fallbacks: DEFAULT_VARIABLE_FALLBACKS,
        };

        const data = {
          ...(recipient.personalization_json ?? {}),
          unsubscribeLink: "{{unsubscribeLink}}",
          preferenceCenterLink: "{{preferenceCenterLink}}",
          currentDate: new Date().toISOString(),
        } as any;

        const rendered = previewEmailTemplate({
          template,
          data,
        });

        const requiredVars: string[] = currentStep.email?.requiredVariables ?? [];
        const missingRequired = requiredVars.length
          ? rendered.missingVariables.filter((v) => requiredVars.includes(v))
          : [];
        const missingOptional = rendered.missingVariables.filter(
          (v) => !requiredVars.includes(v),
        );

        if (missingRequired.length > 0) {
          await supabase
            .from("email_step_executions")
            .update({
              status: "failed",
              failed_at: input.nowIso,
              error_code: "missing_required_personalization",
              error_message: `Missing: ${missingRequired.join(", ")}`,
            })
            .eq("organization_id", input.organizationId)
            .eq("id", stepExecutionId);

          await supabase
            .from("email_sequence_enrollments")
            .update({
              status: "failed",
              stop_reason: "missing_personalization",
            })
            .eq("organization_id", input.organizationId)
            .eq("id", enrollmentId);

          await supabase
            .from("email_queue_jobs")
            .update({
              status: "failed",
              failed_at: input.nowIso,
              error_code: "missing_required_personalization",
              error_message: `Missing: ${missingRequired.join(", ")}`,
            })
            .eq("organization_id", input.organizationId)
            .eq("id", jobId);

          failed += 1;
          continue;
        }

        const { data: campaign } = await supabase
          .from("email_campaigns")
          .select("id, sender_profile_id, language")
          .eq("organization_id", input.organizationId)
          .eq("id", campaignExecution.campaign_id)
          .maybeSingle();

        const senderProfileId =
          currentStep.email?.senderProfileId ?? campaign?.sender_profile_id ?? null;

        const { data: senderProfile } = senderProfileId
          ? await supabase
              .from("email_sender_profiles")
              .select("*")
              .eq("organization_id", input.organizationId)
              .eq("id", senderProfileId)
              .maybeSingle()
          : { data: null };

        if (!senderProfile) {
          await supabase
            .from("email_step_executions")
            .update({
              status: "failed",
              failed_at: input.nowIso,
              error_code: "missing_sender_profile",
              error_message: "Sender profile not found for provider dispatch.",
            })
            .eq("organization_id", input.organizationId)
            .eq("id", stepExecutionId);

          await supabase
            .from("email_sequence_enrollments")
            .update({
              status: "failed",
              stop_reason: "missing_sender_profile",
            })
            .eq("organization_id", input.organizationId)
            .eq("id", enrollmentId);

          await supabase
            .from("email_queue_jobs")
            .update({
              status: "failed",
              failed_at: input.nowIso,
              error_code: "missing_sender_profile",
              error_message: "Sender profile not found for provider dispatch.",
            })
            .eq("organization_id", input.organizationId)
            .eq("id", jobId);

          failed += 1;
          continue;
        }

        const { data: renderedMsg } = await supabase
          .from("email_rendered_messages")
          .insert({
            organization_id: input.organizationId,
            campaign_id: campaignExecution.campaign_id,
            campaign_execution_id: campaignExecutionId,
            enrollment_id: enrollmentId,
            recipient_snapshot_id: recipientSnapshotId,
            step_execution_id: stepExecutionId,
            template_id: currentStep.email?.templateId ?? null,
            template_version_id: currentStep.email?.templateVersionId ?? null,
            sender_profile_id: senderProfileId,
            recipient_email: recipient.preferred_email,
            recipient_name: recipient.preferred_name ?? null,
            language: currentStep.email?.language ?? null,
            subject: rendered.subject,
            preview_text: rendered.previewText ?? "",
            html_body: rendered.htmlBody,
            text_body: rendered.textBody ?? "",
            personalization_values:
              (recipient.personalization_json ?? {}) as any,
            fallback_values: DEFAULT_VARIABLE_FALLBACKS as any,
            missing_optional_values: missingOptional.length,
            unsubscribe_token_placeholder: "#",
          })
          .select("*")
          .single();

        const provider = createEmailProvider(
          (senderProfile.provider_code as any) ?? "resend",
        );
        const dispatchIdempotencyKey = buildDispatchIdempotencyKey({
          organizationId: input.organizationId,
          enrollmentId,
          stepExecutionId,
        });

        const existingDispatch = await supabase
          .from("email_queue")
          .select("*")
          .eq("organization_id", input.organizationId)
          .eq("idempotency_key", dispatchIdempotencyKey)
          .maybeSingle();

        const queueInsertPayload = {
          organization_id: input.organizationId,
          campaign_id: campaignExecution.campaign_id,
          recipient_id: recipientSnapshotId,
          sequence_id: sequenceId,
          step_id: currentStep.id,
          template_id: currentStep.email?.templateId ?? null,
          status: "sending",
          scheduled_at: input.nowIso,
          provider_code: provider.code,
          provider_message_id: null,
          attempt_count: 0,
          last_error: null,
          campaign_execution_id: campaignExecutionId,
          enrollment_id: enrollmentId,
          step_execution_id: stepExecutionId,
          rendered_message_id: renderedMsg?.id ?? null,
          sender_profile_id: senderProfileId,
          template_version_id: currentStep.email?.templateVersionId ?? null,
          from_name: senderProfile.sender_name,
          from_email: senderProfile.sender_email,
          reply_to_email:
            currentStep.email?.replyToEmail ??
            senderProfile.reply_to_email ??
            senderProfile.sender_email,
          idempotency_key: dispatchIdempotencyKey,
          provider_status: "dispatching",
          provider_payload_json: {
            request: {
              to: recipient.preferred_email,
              subject: rendered.subject,
              templateVersionId: currentStep.email?.templateVersionId ?? null,
            },
          },
        };

        const queueRow =
          existingDispatch.data ??
          (
            await supabase
              .from("email_queue")
              .insert(queueInsertPayload)
              .select("*")
              .single()
          ).data;

        if (!queueRow) {
          throw new Error("Failed to create outbound queue dispatch row");
        }

        // Phase 21I — dispatch-time preference / suppression recheck
        const emailNormalized = normalizeSuppressionEmail(
          recipient.preferred_email,
        );
        const categoryCode =
          (currentStep.email as { categoryCode?: string } | undefined)
            ?.categoryCode ?? "sales_outreach";
        const purpose =
          (currentStep.email as { purpose?: string } | undefined)?.purpose ??
          "sales_outreach";

        const eligibility = await recalculateAndPersistEffectiveStatus({
          organizationId: input.organizationId,
          emailNormalized,
          categoryCode,
          campaignId: campaignExecution.campaign_id,
          sequenceId,
        });

        if (
          !eligibility.eligible &&
          purpose !== "transactional" &&
          purpose !== "essential_system" &&
          purpose !== "legal"
        ) {
          await supabase
            .from("email_queue")
            .update({
              status: "cancelled",
              last_error: `Blocked by preference/suppression: ${eligibility.blockingReasons.join(", ")}`,
              failed_at: input.nowIso,
            })
            .eq("id", queueRow.id);

          await supabase
            .from("email_step_executions")
            .update({
              status: "stopped",
              completed_at: input.nowIso,
              result_type: "dispatch_blocked",
              error_code: "preference_or_suppression_block",
              error_message: eligibility.blockingReasons.join("; "),
            })
            .eq("id", stepExecutionId);

          await supabase
            .from("email_sequence_enrollments")
            .update({
              status: eligibility.pauseActive ? "paused" : "stopped",
              stop_reason: eligibility.strongestSuppressionReason
                ? `suppression:${eligibility.strongestSuppressionReason}`
                : "preference_block",
              stopped_at: input.nowIso,
            })
            .eq("id", enrollmentId);

          await cancelPendingJobsForEnrollment({
            supabase,
            organizationId: input.organizationId,
            enrollmentId,
            now: input.nowIso,
          });

          await supabase
            .from("email_queue_jobs")
            .update({
              status: "cancelled",
              cancelled_at: input.nowIso,
              error_code: "dispatch_blocked",
              error_message: eligibility.blockingReasons.join("; "),
            })
            .eq("id", jobId);

          completed += 1;
          continue;
        }

        const preferenceTokens = await issuePreferenceTokens({
          organizationId: input.organizationId,
          emailNormalized,
          queueItemId: queueRow.id,
          campaignId: campaignExecution.campaign_id,
          categoryCode,
          contactId: recipient.contact_id ?? null,
          leadId: recipient.lead_id ?? null,
        });

        const { data: organization } = await supabase
          .from("organizations")
          .select(
            "name, postal_address, privacy_policy_url, terms_url, default_email_language",
          )
          .eq("id", input.organizationId)
          .maybeSingle();

        const htmlForSend = rendered.htmlBody
          .replaceAll("{{unsubscribeLink}}", preferenceTokens.unsubscribePageUrl)
          .replaceAll(
            "{{preferenceCenterLink}}",
            preferenceTokens.preferenceCenterUrl,
          );

        const textForSend = (rendered.textBody ?? "")
          .replaceAll("{{unsubscribeLink}}", preferenceTokens.unsubscribePageUrl)
          .replaceAll(
            "{{preferenceCenterLink}}",
            preferenceTokens.preferenceCenterUrl,
          );

        const footered = injectCompliantFooter({
          htmlBody: htmlForSend,
          textBody: textForSend || null,
          organizationName: organization?.name ?? "Organization",
          postalAddress: organization?.postal_address ?? null,
          preferenceCenterUrl: preferenceTokens.preferenceCenterUrl,
          unsubscribeUrl: preferenceTokens.unsubscribePageUrl,
          privacyPolicyUrl: organization?.privacy_policy_url ?? null,
          termsUrl: organization?.terms_url ?? null,
          categoryLabel: categoryCode,
          language:
            currentStep.email?.language ??
            organization?.default_email_language ??
            "en",
        });

        const trackedMessage = await prepareTrackedMessage({
          organizationId: input.organizationId,
          queueItemId: queueRow.id,
          renderedMessageId: renderedMsg?.id ?? "",
          campaignExecutionId,
          enrollmentId,
          stepExecutionId,
          recipientId: recipientSnapshotId,
          campaignId: campaignExecution.campaign_id,
          htmlBody: footered.htmlBody,
          textBody: footered.textBody,
          replyTo:
            currentStep.email?.replyToEmail ??
            senderProfile.reply_to_email ??
            senderProfile.sender_email,
        });

        await supabase
          .from("email_rendered_messages")
          .update({
            html_body: trackedMessage.htmlBody,
            text_body: trackedMessage.textBody ?? "",
            unsubscribe_token_placeholder: preferenceTokens.unsubscribePageUrl,
            communication_purpose: purpose,
            communication_category_code: categoryCode,
            footer_version: footered.footerVersion,
            footer_html: footered.footerHtml,
            list_unsubscribe_header: preferenceTokens.oneClickUrl,
            preference_token_id: preferenceTokens.preferenceTokenId,
            one_click_token_id: preferenceTokens.oneClickTokenId,
          })
          .eq("organization_id", input.organizationId)
          .eq("id", renderedMsg?.id ?? "");

        await supabase
          .from("email_queue")
          .update({
            reply_to_email: trackedMessage.replyTo,
          })
          .eq("organization_id", input.organizationId)
          .eq("id", queueRow.id);

        await supabase.from("email_events").insert({
          organization_id: input.organizationId,
          queue_item_id: queueRow.id,
          recipient_id: recipientSnapshotId,
          campaign_id: campaignExecution.campaign_id,
          event_type: "email_queued",
          payload_json: {
            provider: provider.code,
            stepExecutionId,
          } as any,
          occurred_at: input.nowIso,
        });

        const listHeaders = buildListUnsubscribeHeaders(
          preferenceTokens.oneClickUrl,
        );

        const gate = await evaluateDispatchGate({
          organizationId: input.organizationId,
          recipientEmail: recipient.preferred_email,
        });

        if (!gate.allowed || simulation) {
          const blockCode = simulation
            ? "simulation_mode"
            : gate.code;
          const blockMessage = simulation
            ? "Simulation mode: provider.send skipped. Enable EMAIL_PROVIDER_DISPATCH_ENABLED + org control + live=true to dispatch."
            : gate.message;

          await supabase
            .from("email_queue")
            .update({
              status: simulation ? "queued" : "cancelled",
              last_error: blockMessage,
              provider_status: blockCode,
              failed_at: simulation ? null : input.nowIso,
            })
            .eq("organization_id", input.organizationId)
            .eq("id", queueRow.id);

          await supabase
            .from("email_step_executions")
            .update({
              status: simulation ? "completed" : "stopped",
              completed_at: input.nowIso,
              result_type: blockCode,
              error_code: blockCode,
              error_message: blockMessage,
              result_data: {
                rendered_message_id: renderedMsg?.id ?? null,
                simulation,
                gate: gate.code,
              } as any,
            })
            .eq("organization_id", input.organizationId)
            .eq("id", stepExecutionId);

          await supabase
            .from("email_queue_jobs")
            .update({
              status: simulation ? "completed" : "cancelled",
              completed_at: simulation ? input.nowIso : null,
              cancelled_at: simulation ? null : input.nowIso,
              error_code: blockCode,
              error_message: blockMessage,
            })
            .eq("id", jobId);

          console.info("[email_ops] dispatch_blocked", {
            correlationId,
            jobId,
            blockCode,
            simulation,
          });

          completed += 1;
          continue;
        }

        const sendResult = await provider.send({
          organizationId: input.organizationId,
          to: recipient.preferred_email,
          subject: rendered.subject,
          htmlBody: trackedMessage.htmlBody,
          textBody: trackedMessage.textBody ?? null,
          fromEmail: senderProfile.sender_email,
          fromName: senderProfile.sender_name,
          replyTo: trackedMessage.replyTo,
          headers: listHeaders,
          idempotencyKey: dispatchIdempotencyKey,
          metadata: {
            campaignExecutionId,
            enrollmentId,
            stepExecutionId,
            correlationId,
            testMode: gate.controls.test_mode ? "true" : "false",
          },
        });

        await recordProviderDispatchOutcome({
          organizationId: input.organizationId,
          success: Boolean(sendResult.success && sendResult.providerMessageId),
          errorCode: sendResult.success ? null : "provider_dispatch_failed",
        });

        if (!sendResult.success || !sendResult.providerMessageId) {
          await supabase
            .from("email_queue")
            .update({
              status: "failed",
              last_error: sendResult.errorMessage ?? "Provider dispatch failed",
              attempt_count: (queueRow.attempt_count ?? 0) + 1,
              provider_status: sendResult.providerStatus ?? "failed",
              provider_payload_json: {
                ...(queueRow.provider_payload_json ?? {}),
                response: sendResult.providerPayload ?? {},
              } as any,
              failed_at: input.nowIso,
            })
            .eq("organization_id", input.organizationId)
            .eq("id", queueRow.id);

          await supabase
            .from("email_step_executions")
            .update({
              status: "failed",
              failed_at: input.nowIso,
              error_code: "provider_dispatch_failed",
              error_message: sendResult.errorMessage ?? "Provider dispatch failed",
              result_type: "provider_dispatch_failed",
              result_data: {
                rendered_message_id: renderedMsg?.id ?? null,
                provider_code: sendResult.providerCode,
                provider_status: sendResult.providerStatus ?? "failed",
              } as any,
            })
            .eq("organization_id", input.organizationId)
            .eq("id", stepExecutionId);

          await supabase
            .from("email_sequence_enrollments")
            .update({
              status: "failed",
              stop_reason: "provider_dispatch_failed",
            })
            .eq("organization_id", input.organizationId)
            .eq("id", enrollmentId);

          await supabase
            .from("email_queue_jobs")
            .update({
              status: "failed",
              failed_at: input.nowIso,
              error_code: "provider_dispatch_failed",
              error_message: sendResult.errorMessage ?? "Provider dispatch failed",
            })
            .eq("organization_id", input.organizationId)
            .eq("id", jobId);

          failed += 1;
          continue;
        }

        await supabase
          .from("email_queue")
          .update({
            status: "sent",
            provider_message_id: sendResult.providerMessageId,
            provider_status: sendResult.providerStatus ?? "accepted",
            provider_payload_json: {
              ...(queueRow.provider_payload_json ?? {}),
              response: sendResult.providerPayload ?? {},
            } as any,
            accepted_at: input.nowIso,
            sent_at: input.nowIso,
          })
          .eq("organization_id", input.organizationId)
          .eq("id", queueRow.id);

        await supabase.from("email_events").insert({
          organization_id: input.organizationId,
          queue_item_id: queueRow.id,
          recipient_id: recipientSnapshotId,
          campaign_id: campaignExecution.campaign_id,
          event_type: "email_sent",
          payload_json: {
            provider: sendResult.providerCode,
            providerMessageId: sendResult.providerMessageId,
            providerStatus: sendResult.providerStatus ?? "accepted",
          } as any,
          occurred_at: input.nowIso,
        });

        const resolution = resolveNextStep({
          steps: sequenceSteps,
          currentStep,
          conditionInput,
        });

        await supabase
          .from("email_step_executions")
          .update({
            status: "completed",
            completed_at: input.nowIso,
            result_type: "email_dispatched",
            result_data: {
              rendered_message_id: renderedMsg?.id ?? null,
              queue_item_id: queueRow.id,
              provider_dispatch: {
                provider_code: sendResult.providerCode,
                provider_message_id: sendResult.providerMessageId,
                provider_status: sendResult.providerStatus ?? "accepted",
              },
            } as any,
            next_step_id: resolution.nextStep?.id ?? null,
            branch_selected: resolution.branchSelected ?? null,
          })
          .eq("organization_id", input.organizationId)
          .eq("id", stepExecutionId);

        if (resolution.nextStep) {
          const scheduledFor =
            resolution.nextStep.type === "wait"
              ? new Date(
                  new Date(input.nowIso).getTime() +
                    calculateWaitDelayMs(resolution.nextStep),
                ).toISOString()
              : input.nowIso;

          const nextExec = await createStepExecutionIfNotExists({
            supabase,
            organizationId: input.organizationId,
            enrollmentId,
            campaignExecutionId,
            sequenceStepId: resolution.nextStep.id,
            sequenceVersionId: sequenceVersionId,
            stepNumber: resolution.nextStep.order,
            stepType: resolution.nextStep.type,
            attemptCount: 0,
            scheduledForIso: scheduledFor,
          });

          await upsertQueueJob({
            supabase,
            organizationId: input.organizationId,
            jobType:
              resolution.nextStep.type === "email"
                ? "process_email_step"
                : resolution.nextStep.type === "wait"
                  ? "process_wait_step"
                  : resolution.nextStep.type === "condition"
                    ? "process_condition_step"
                    : resolution.nextStep.type === "manual_task"
                      ? "process_manual_task_step"
                      : "process_end_step",
            campaignExecutionId,
            enrollmentId,
            stepExecutionId: nextExec.id,
            sequenceStepId: resolution.nextStep.id,
            status: "scheduled",
            priority: 0,
            scheduledForIso: scheduledFor,
            idempotencyKey: makeScheduleIdempotencyKey({
              stepExecutionId: nextExec.id,
              scheduledForIso: scheduledFor,
            }),
            attemptCount: 0,
            maximumAttempts: job.maximum_attempts ?? 5,
            payload: {},
          });

          await supabase
            .from("email_sequence_enrollments")
            .update({
              status: scheduledFor === input.nowIso ? "active" : "scheduled",
              current_step_id: resolution.nextStep.id,
              current_step_number: resolution.nextStep.order,
              previous_step_id: currentStep.id,
              next_execution_time: scheduledFor,
            })
            .eq("organization_id", input.organizationId)
            .eq("id", enrollmentId);
        }

        await supabase
          .from("email_queue_jobs")
          .update({
            status: "completed",
            result_json: { scheduledNext: Boolean(resolution.nextStep) } as any,
            completed_at: input.nowIso,
          })
          .eq("organization_id", input.organizationId)
          .eq("id", jobId);

        completed += 1;
        continue;
      }

      if (currentStep.type === "wait") {
        const resolution = resolveNextStep({
          steps: sequenceSteps,
          currentStep,
          conditionInput,
        });

        await supabase
          .from("email_step_executions")
          .update({
            status: "completed",
            completed_at: input.nowIso,
            result_type: "wait_completed",
            next_step_id: resolution.nextStep?.id ?? null,
          })
          .eq("organization_id", input.organizationId)
          .eq("id", stepExecutionId);

        if (resolution.nextStep) {
          const scheduledFor =
            resolution.nextStep.type === "wait"
              ? new Date(
                  new Date(input.nowIso).getTime() +
                    calculateWaitDelayMs(resolution.nextStep),
                ).toISOString()
              : input.nowIso;
          const nextExec = await createStepExecutionIfNotExists({
            supabase,
            organizationId: input.organizationId,
            enrollmentId,
            campaignExecutionId,
            sequenceStepId: resolution.nextStep.id,
            sequenceVersionId: sequenceVersionId,
            stepNumber: resolution.nextStep.order,
            stepType: resolution.nextStep.type,
            attemptCount: 0,
            scheduledForIso: scheduledFor,
          });
          await upsertQueueJob({
            supabase,
            organizationId: input.organizationId,
            jobType: "process_sequence_step",
            campaignExecutionId,
            enrollmentId,
            stepExecutionId: nextExec.id,
            sequenceStepId: resolution.nextStep.id,
            status: "scheduled",
            priority: 0,
            scheduledForIso: scheduledFor,
            idempotencyKey: makeScheduleIdempotencyKey({
              stepExecutionId: nextExec.id,
              scheduledForIso: scheduledFor,
            }),
            attemptCount: 0,
            maximumAttempts: job.maximum_attempts ?? 5,
            payload: {},
          });
          await supabase
            .from("email_sequence_enrollments")
            .update({
              status:
                scheduledFor === input.nowIso ? "active" : "scheduled",
              current_step_id: resolution.nextStep.id,
              current_step_number: resolution.nextStep.order,
              previous_step_id: currentStep.id,
              next_execution_time: scheduledFor,
            })
            .eq("organization_id", input.organizationId)
            .eq("id", enrollmentId);
        }

        await supabase
          .from("email_queue_jobs")
          .update({
            status: "completed",
            completed_at: input.nowIso,
          })
          .eq("organization_id", input.organizationId)
          .eq("id", jobId);

        completed += 1;
        continue;
      }

      if (currentStep.type === "condition") {
        const resolution = resolveNextStep({
          steps: sequenceSteps,
          currentStep,
          conditionInput,
        });

        await supabase
          .from("email_step_executions")
          .update({
            status: "completed",
            completed_at: input.nowIso,
            result_type: "condition_evaluated",
            result_data: {
              branchSelected: resolution.branchSelected ?? null,
            } as any,
            next_step_id: resolution.nextStep?.id ?? null,
            branch_selected: resolution.branchSelected ?? null,
          })
          .eq("organization_id", input.organizationId)
          .eq("id", stepExecutionId);

        if (resolution.nextStep) {
          const scheduledFor =
            resolution.nextStep.type === "wait"
              ? new Date(
                  new Date(input.nowIso).getTime() +
                    calculateWaitDelayMs(resolution.nextStep),
                ).toISOString()
              : input.nowIso;
          const nextExec = await createStepExecutionIfNotExists({
            supabase,
            organizationId: input.organizationId,
            enrollmentId,
            campaignExecutionId,
            sequenceStepId: resolution.nextStep.id,
            sequenceVersionId: sequenceVersionId,
            stepNumber: resolution.nextStep.order,
            stepType: resolution.nextStep.type,
            attemptCount: 0,
            scheduledForIso: scheduledFor,
          });
          await upsertQueueJob({
            supabase,
            organizationId: input.organizationId,
            jobType:
              resolution.nextStep.type === "email"
                ? "process_email_step"
                : resolution.nextStep.type === "wait"
                  ? "process_wait_step"
                  : resolution.nextStep.type === "condition"
                    ? "process_condition_step"
                    : resolution.nextStep.type === "manual_task"
                      ? "process_manual_task_step"
                      : "process_end_step",
            campaignExecutionId,
            enrollmentId,
            stepExecutionId: nextExec.id,
            sequenceStepId: resolution.nextStep.id,
            status: "scheduled",
            priority: 0,
            scheduledForIso: scheduledFor,
            idempotencyKey: makeScheduleIdempotencyKey({
              stepExecutionId: nextExec.id,
              scheduledForIso: scheduledFor,
            }),
            attemptCount: 0,
            maximumAttempts: job.maximum_attempts ?? 5,
            payload: {},
          });
          await supabase
            .from("email_sequence_enrollments")
            .update({
              status:
                scheduledFor === input.nowIso ? "active" : "scheduled",
              current_step_id: resolution.nextStep.id,
              current_step_number: resolution.nextStep.order,
              previous_step_id: currentStep.id,
              next_execution_time: scheduledFor,
            })
            .eq("organization_id", input.organizationId)
            .eq("id", enrollmentId);
        }

        await supabase
          .from("email_queue_jobs")
          .update({
            status: "completed",
            completed_at: input.nowIso,
          })
          .eq("organization_id", input.organizationId)
          .eq("id", jobId);

        completed += 1;
        continue;
      }

      if (currentStep.type === "manual_task") {
        const blocking = currentStep.task?.blocking ?? true;
        await supabase
          .from("email_step_executions")
          .update({
            status: "completed",
            completed_at: input.nowIso,
            result_type: "manual_task_ready",
            result_data: { blocking },
          })
          .eq("organization_id", input.organizationId)
          .eq("id", stepExecutionId);

        if (blocking) {
          await supabase
            .from("email_sequence_enrollments")
            .update({
              status: "waiting",
              stop_reason: "manual_task_blocking",
            })
            .eq("organization_id", input.organizationId)
            .eq("id", enrollmentId);

          await supabase
            .from("email_queue_jobs")
            .update({
              status: "completed",
              completed_at: input.nowIso,
            })
            .eq("organization_id", input.organizationId)
            .eq("id", jobId);

          completed += 1;
          continue;
        }

        // Non-blocking: schedule ordered next step.
        const resolution = resolveNextStep({
          steps: sequenceSteps,
          currentStep,
          conditionInput,
        });
        if (resolution.nextStep) {
          const scheduledFor =
            resolution.nextStep.type === "wait"
              ? new Date(
                  new Date(input.nowIso).getTime() +
                    calculateWaitDelayMs(resolution.nextStep),
                ).toISOString()
              : input.nowIso;
          const nextExec = await createStepExecutionIfNotExists({
            supabase,
            organizationId: input.organizationId,
            enrollmentId,
            campaignExecutionId,
            sequenceStepId: resolution.nextStep.id,
            sequenceVersionId: sequenceVersionId,
            stepNumber: resolution.nextStep.order,
            stepType: resolution.nextStep.type,
            attemptCount: 0,
            scheduledForIso: scheduledFor,
          });
          await upsertQueueJob({
            supabase,
            organizationId: input.organizationId,
            jobType: "process_sequence_step",
            campaignExecutionId,
            enrollmentId,
            stepExecutionId: nextExec.id,
            sequenceStepId: resolution.nextStep.id,
            status: "scheduled",
            priority: 0,
            scheduledForIso: scheduledFor,
            idempotencyKey: makeScheduleIdempotencyKey({
              stepExecutionId: nextExec.id,
              scheduledForIso: scheduledFor,
            }),
            attemptCount: 0,
            maximumAttempts: job.maximum_attempts ?? 5,
            payload: {},
          });
          await supabase
            .from("email_sequence_enrollments")
            .update({
              status:
                scheduledFor === input.nowIso ? "active" : "scheduled",
              current_step_id: resolution.nextStep.id,
              current_step_number: resolution.nextStep.order,
              previous_step_id: currentStep.id,
              next_execution_time: scheduledFor,
            })
            .eq("organization_id", input.organizationId)
            .eq("id", enrollmentId);
        }

        await supabase
          .from("email_queue_jobs")
          .update({
            status: "completed",
            completed_at: input.nowIso,
          })
          .eq("organization_id", input.organizationId)
          .eq("id", jobId);

        completed += 1;
        continue;
      }

      if (currentStep.type === "end") {
        await supabase
          .from("email_step_executions")
          .update({
            status: "completed",
            completed_at: input.nowIso,
            result_type: "end_reached",
            result_data: { endReason: currentStep.endReason },
          })
          .eq("organization_id", input.organizationId)
          .eq("id", stepExecutionId);

        await supabase
          .from("email_sequence_enrollments")
          .update({
            status: "completed",
            completion_reason:
              currentStep.endReason ?? ("sequence_completed" as any),
            completed_at: input.nowIso,
          })
          .eq("organization_id", input.organizationId)
          .eq("id", enrollmentId);

        await cancelPendingJobsForEnrollment({
          supabase,
          organizationId: input.organizationId,
          enrollmentId,
          now: input.nowIso,
        });

        await supabase
          .from("email_queue_jobs")
          .update({
            status: "completed",
            completed_at: input.nowIso,
          })
          .eq("organization_id", input.organizationId)
          .eq("id", jobId);

        completed += 1;
        continue;
      }

      await supabase
        .from("email_queue_jobs")
        .update({
          status: "completed",
          completed_at: input.nowIso,
        })
        .eq("organization_id", input.organizationId)
        .eq("id", jobId);

      completed += 1;
    } catch (e: any) {
      failed += 1;
      const msg = e?.message ? String(e.message) : "Unknown worker error";
      await supabase
        .from("email_queue_jobs")
        .update({
          status: "failed",
          failed_at: input.nowIso,
          error_code: "worker_error",
          error_message: msg,
        })
        .eq("organization_id", input.organizationId)
        .eq("id", jobId);
    }
  }

  await upsertWorkerHeartbeat({
    organizationId: input.organizationId,
    workerId: input.workerId,
    status: "idle",
  });

  console.info("[email_ops] worker_batch_done", {
    correlationId,
    processed,
    completed,
    failed,
    simulation,
  });

  return { processed, completed, failed };
}

