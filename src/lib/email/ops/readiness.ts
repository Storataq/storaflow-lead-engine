/**
 * Phase 21L — campaign launch gate + readiness checklist.
 */

import { ensureEmergencyControls } from "@/lib/email/ops/controls";
import { validateEmailEnvironment } from "@/lib/email/ops/env";
import { envFlag } from "@/lib/email/ops/security";

export type LaunchGateCheck = {
  code: string;
  ok: boolean;
  blocking: boolean;
  message: string;
};

export async function evaluateCampaignLaunchGate(input: {
  organizationId: string;
  campaignStatus: string;
  recipientCount: number;
  hasSequenceVersion: boolean;
  senderVerified: boolean;
  footerReady: boolean;
  organizationIdentityPresent: boolean;
}): Promise<{ allowed: boolean; checks: LaunchGateCheck[] }> {
  const controls = await ensureEmergencyControls(input.organizationId);
  const env = validateEmailEnvironment({
    production: envFlag("EMAIL_PRODUCTION_MODE"),
  });

  const checks: LaunchGateCheck[] = [
    {
      code: "campaign_approved",
      ok: ["approved", "ready", "scheduled"].includes(input.campaignStatus),
      blocking: true,
      message: `Campaign status is ${input.campaignStatus}`,
    },
    {
      code: "recipients_present",
      ok: input.recipientCount > 0,
      blocking: true,
      message: `Recipient snapshot count: ${input.recipientCount}`,
    },
    {
      code: "sequence_locked",
      ok: input.hasSequenceVersion,
      blocking: true,
      message: input.hasSequenceVersion
        ? "Sequence version present"
        : "Sequence version missing",
    },
    {
      code: "sender_verified",
      ok: input.senderVerified,
      blocking: true,
      message: input.senderVerified
        ? "Sender profile present"
        : "Sender profile missing/unverified",
    },
    {
      code: "footer_ready",
      ok: input.footerReady,
      blocking: true,
      message: input.footerReady
        ? "Unsubscribe/footer ready"
        : "Footer/unsubscribe requirements incomplete",
    },
    {
      code: "organization_identity",
      ok: input.organizationIdentityPresent,
      blocking: envFlag("EMAIL_COMPANY_ADDRESS_REQUIRED", true),
      message: input.organizationIdentityPresent
        ? "Organization identity present"
        : "Organization postal address missing",
    },
    {
      code: "emergency_stop",
      ok: !controls.emergency_stop && !envFlag("EMAIL_EMERGENCY_STOP"),
      blocking: true,
      message: controls.emergency_stop
        ? "Emergency stop is active"
        : "Emergency stop clear",
    },
    {
      code: "provider_circuit",
      ok: controls.provider_circuit_state !== "open",
      blocking: true,
      message:
        controls.provider_circuit_state === "open"
          ? "Provider circuit breaker is open"
          : "Provider circuit closed",
    },
    {
      code: "env_ready",
      ok: env.ready,
      blocking: true,
      message: env.ready
        ? "Environment validation passed"
        : env.blockingErrors.map((e) => e.message).join("; "),
    },
    {
      code: "test_mode_clarity",
      ok: true,
      blocking: false,
      message: controls.test_mode || envFlag("EMAIL_TEST_MODE", true)
        ? "TEST MODE active — only allowlisted recipients"
        : "Live mode — confirm recipient list carefully",
    },
  ];

  return {
    allowed: checks.every((c) => c.ok || !c.blocking),
    checks,
  };
}

export const DEFAULT_READINESS_CHECKS = [
  { code: "database_migrations", category: "Database", blocking: true },
  { code: "rls_enabled", category: "RLS", blocking: true },
  { code: "auth_sessions", category: "Authentication", blocking: true },
  { code: "org_isolation", category: "Organization Isolation", blocking: true },
  { code: "queue_claim", category: "Queue", blocking: true },
  { code: "scheduler_secret", category: "Scheduler", blocking: true },
  { code: "worker_heartbeat", category: "Worker", blocking: false },
  { code: "provider_key", category: "Provider", blocking: true },
  { code: "webhook_secret", category: "Webhooks", blocking: true },
  { code: "tracking_secret", category: "Tracking", blocking: true },
  { code: "preference_tokens", category: "Preferences", blocking: true },
  { code: "suppression_dispatch_recheck", category: "Compliance", blocking: true },
  { code: "ai_auto_actions_off", category: "AI", blocking: true },
  { code: "emergency_stop_available", category: "Operations", blocking: true },
  { code: "test_mode_allowlist", category: "Testing", blocking: false },
  { code: "docs_runbooks", category: "Documentation", blocking: false },
] as const;
