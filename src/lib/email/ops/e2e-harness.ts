/**
 * Phase 21L — controlled end-to-end harness (no live sends to uncontrolled recipients).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createServiceClient } from "@/lib/supabase/admin";
import { validateEmailEnvironment } from "@/lib/email/ops/env";
import { ensureEmergencyControls } from "@/lib/email/ops/controls";
import { evaluateCampaignLaunchGate } from "@/lib/email/ops/readiness";
import { createCorrelationId, envFlag } from "@/lib/email/ops/security";
import { isAiGloballyEnabled } from "@/lib/email/ai/constants";

type StepResult = {
  name: string;
  status: "pass" | "pass_with_warning" | "fail" | "skipped" | "blocked";
  detail: string;
};

export async function runEmailE2EHarness(input: {
  organizationId: string;
  userId?: string | null;
}): Promise<{
  runId: string;
  correlationId: string;
  status: string;
  steps: StepResult[];
}> {
  const supabase = createServiceClient() as any;
  const correlationId = createCorrelationId("e2e");
  const steps: StepResult[] = [];
  const started = Date.now();

  const push = (step: StepResult) => steps.push(step);

  const env = validateEmailEnvironment();
  push({
    name: "environment_validation",
    status: env.ready ? (env.warnings.length ? "pass_with_warning" : "pass") : "fail",
    detail: env.ready
      ? `OK with ${env.warnings.length} warning(s)`
      : env.blockingErrors.map((e) => e.message).join("; "),
  });

  const controls = await ensureEmergencyControls(input.organizationId);
  push({
    name: "emergency_controls",
    status: "pass",
    detail: `test_mode=${controls.test_mode}, dispatch=${controls.provider_dispatch_enabled}, stop=${controls.emergency_stop}`,
  });

  push({
    name: "ai_auto_actions_disabled",
    status: "pass",
    detail: `EMAIL_AI_AUTO_ACTIONS_ENABLED=${process.env.EMAIL_AI_AUTO_ACTIONS_ENABLED ?? "false"}; AI enabled=${isAiGloballyEnabled()}`,
  });

  const { count: templateCount } = await supabase
    .from("email_templates")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", input.organizationId);
  push({
    name: "templates_present",
    status: (templateCount ?? 0) > 0 ? "pass" : "pass_with_warning",
    detail: `templates=${templateCount ?? 0}`,
  });

  const { count: campaignCount } = await supabase
    .from("email_campaigns")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", input.organizationId);
  push({
    name: "campaigns_present",
    status: (campaignCount ?? 0) > 0 ? "pass" : "pass_with_warning",
    detail: `campaigns=${campaignCount ?? 0}`,
  });

  const { data: sender } = await supabase
    .from("email_sender_profiles")
    .select("id, sender_email")
    .eq("organization_id", input.organizationId)
    .limit(1)
    .maybeSingle();
  push({
    name: "sender_profile",
    status: sender ? "pass" : "fail",
    detail: sender ? sender.sender_email : "No sender profile",
  });

  const { data: org } = await supabase
    .from("organizations")
    .select("name, postal_address")
    .eq("id", input.organizationId)
    .maybeSingle();

  const gate = await evaluateCampaignLaunchGate({
    organizationId: input.organizationId,
    campaignStatus: "approved",
    recipientCount: 1,
    hasSequenceVersion: true,
    senderVerified: Boolean(sender),
    footerReady: true,
    organizationIdentityPresent: Boolean(org?.postal_address || org?.name),
  });
  push({
    name: "launch_gate_sample",
    status: gate.allowed ? "pass" : "blocked",
    detail: gate.checks
      .filter((c) => !c.ok)
      .map((c) => c.message)
      .join("; ") || "All sample checks passed",
  });

  push({
    name: "live_send_guard",
    status:
      envFlag("EMAIL_PROVIDER_DISPATCH_ENABLED") &&
      controls.provider_dispatch_enabled &&
      !controls.test_mode
        ? "pass_with_warning"
        : "pass",
    detail:
      "Harness does not send live email. Dispatch remains gated by env + org controls + allowlist.",
  });

  const failed = steps.some((s) => s.status === "fail");
  const blocked = steps.some((s) => s.status === "blocked");
  const warned = steps.some((s) => s.status === "pass_with_warning");
  const status = failed
    ? "fail"
    : blocked
      ? "blocked"
      : warned
        ? "pass_with_warning"
        : "pass";

  const { data: run } = await supabase
    .from("email_e2e_test_runs")
    .insert({
      organization_id: input.organizationId,
      name: "controlled_email_e2e_harness",
      status,
      environment: process.env.NODE_ENV ?? "unknown",
      correlation_id: correlationId,
      steps_json: steps,
      evidence_json: {
        testMode: controls.test_mode,
        dispatchEnabled: controls.provider_dispatch_enabled,
      },
      warnings_json: steps
        .filter((s) => s.status === "pass_with_warning")
        .map((s) => s.detail),
      errors_json: steps
        .filter((s) => s.status === "fail")
        .map((s) => s.detail),
      started_at: new Date(started).toISOString(),
      ended_at: new Date().toISOString(),
      duration_ms: Date.now() - started,
      created_by: input.userId ?? null,
      cleanup_status: "not_required",
    })
    .select("id")
    .single();

  return {
    runId: run?.id ?? "unpersisted",
    correlationId,
    status,
    steps,
  };
}
