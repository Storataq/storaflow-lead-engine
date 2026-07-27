/**
 * Phase 21L — kill switches, test mode, circuit breaker, emergency stop.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createServiceClient } from "@/lib/supabase/admin";
import {
  envFlag,
  parseAllowlist,
} from "@/lib/email/ops/security";

type SupabaseLike = any;

export type EmailEmergencyControls = {
  organization_id: string;
  email_sending_enabled: boolean;
  scheduler_enabled: boolean;
  worker_enabled: boolean;
  provider_dispatch_enabled: boolean;
  webhook_processing_enabled: boolean;
  tracking_enabled: boolean;
  analytics_aggregation_enabled: boolean;
  emergency_stop: boolean;
  emergency_stop_reason: string | null;
  test_mode: boolean;
  test_recipient_allowlist_json: string[];
  provider_circuit_state: "closed" | "open" | "half_open" | "disabled";
  provider_circuit_reason: string | null;
  provider_circuit_opened_at: string | null;
  provider_consecutive_failures: number;
  daily_send_limit: number | null;
  hourly_send_limit: number | null;
};

const DEFAULT_CONTROLS: Omit<EmailEmergencyControls, "organization_id"> = {
  email_sending_enabled: true,
  scheduler_enabled: true,
  worker_enabled: true,
  provider_dispatch_enabled: false,
  webhook_processing_enabled: true,
  tracking_enabled: true,
  analytics_aggregation_enabled: true,
  emergency_stop: false,
  emergency_stop_reason: null,
  test_mode: true,
  test_recipient_allowlist_json: [],
  provider_circuit_state: "closed",
  provider_circuit_reason: null,
  provider_circuit_opened_at: null,
  provider_consecutive_failures: 0,
  daily_send_limit: 50,
  hourly_send_limit: 20,
};

export async function ensureEmergencyControls(
  organizationId: string,
): Promise<EmailEmergencyControls> {
  const supabase = createServiceClient() as SupabaseLike;
  const { data } = await supabase
    .from("email_emergency_controls")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (data) {
    return {
      ...data,
      test_recipient_allowlist_json: Array.isArray(
        data.test_recipient_allowlist_json,
      )
        ? data.test_recipient_allowlist_json
        : [],
    } as EmailEmergencyControls;
  }

  const { data: inserted } = await supabase
    .from("email_emergency_controls")
    .insert({
      organization_id: organizationId,
      ...DEFAULT_CONTROLS,
      provider_dispatch_enabled: envFlag("EMAIL_PROVIDER_DISPATCH_ENABLED"),
      test_mode: envFlag("EMAIL_TEST_MODE", true),
    })
    .select("*")
    .single();

  if (inserted) {
    return {
      ...inserted,
      test_recipient_allowlist_json: Array.isArray(
        inserted.test_recipient_allowlist_json,
      )
        ? inserted.test_recipient_allowlist_json
        : [],
    } as EmailEmergencyControls;
  }

  return { organization_id: organizationId, ...DEFAULT_CONTROLS };
}

export type DispatchGateResult = {
  allowed: boolean;
  code: string;
  message: string;
  controls: EmailEmergencyControls;
};

export async function evaluateDispatchGate(input: {
  organizationId: string;
  recipientEmail: string;
}): Promise<DispatchGateResult> {
  const controls = await ensureEmergencyControls(input.organizationId);

  if (envFlag("EMAIL_EMERGENCY_STOP") || controls.emergency_stop) {
    return {
      allowed: false,
      code: "emergency_stop",
      message: controls.emergency_stop_reason ?? "Emergency stop is active.",
      controls,
    };
  }

  if (!envFlag("EMAIL_SENDING_ENABLED", true) || !controls.email_sending_enabled) {
    return {
      allowed: false,
      code: "sending_disabled",
      message: "Email sending is disabled.",
      controls,
    };
  }

  if (!envFlag("EMAIL_WORKER_ENABLED", true) || !controls.worker_enabled) {
    return {
      allowed: false,
      code: "worker_disabled",
      message: "Worker is disabled.",
      controls,
    };
  }

  const envDispatch = envFlag("EMAIL_PROVIDER_DISPATCH_ENABLED");
  if (!envDispatch || !controls.provider_dispatch_enabled) {
    return {
      allowed: false,
      code: "provider_dispatch_disabled",
      message:
        "Provider dispatch is disabled. Enable EMAIL_PROVIDER_DISPATCH_ENABLED and org control after test-mode validation.",
      controls,
    };
  }

  if (
    controls.provider_circuit_state === "open" ||
    controls.provider_circuit_state === "disabled"
  ) {
    return {
      allowed: false,
      code: "circuit_open",
      message:
        controls.provider_circuit_reason ??
        "Provider circuit breaker is open.",
      controls,
    };
  }

  const testMode = envFlag("EMAIL_TEST_MODE", controls.test_mode);
  if (testMode || controls.test_mode) {
    const allowlist = [
      ...controls.test_recipient_allowlist_json.map((e) => e.toLowerCase()),
      ...parseAllowlist(process.env.EMAIL_TEST_RECIPIENT_ALLOWLIST),
    ];
    const email = input.recipientEmail.trim().toLowerCase();
    const domain = email.split("@")[1] ?? "";
    const allowed =
      allowlist.includes(email) ||
      allowlist.includes(`*@${domain}`) ||
      ["example.com", "example.org", "example.net"].includes(domain);

    if (!allowed) {
      return {
        allowed: false,
        code: "test_allowlist_blocked",
        message:
          "Test mode is enabled. Recipient is not on the allowlist (or example.com/org/net).",
        controls,
      };
    }
  }

  return {
    allowed: true,
    code: "ok",
    message: "Dispatch permitted.",
    controls,
  };
}

export async function recordProviderDispatchOutcome(input: {
  organizationId: string;
  success: boolean;
  errorCode?: string | null;
}) {
  const supabase = createServiceClient() as SupabaseLike;
  const controls = await ensureEmergencyControls(input.organizationId);
  const threshold = Number(
    process.env.EMAIL_PROVIDER_FAILURE_THRESHOLD ?? 5,
  );
  const enabled = envFlag("EMAIL_PROVIDER_CIRCUIT_BREAKER_ENABLED", true);

  if (!enabled) return;

  if (input.success) {
    await supabase
      .from("email_emergency_controls")
      .update({
        provider_consecutive_failures: 0,
        provider_circuit_state:
          controls.provider_circuit_state === "half_open"
            ? "closed"
            : controls.provider_circuit_state === "open"
              ? "closed"
              : controls.provider_circuit_state,
        provider_circuit_reason: null,
        provider_circuit_opened_at: null,
      })
      .eq("organization_id", input.organizationId);
    return;
  }

  const failures = (controls.provider_consecutive_failures ?? 0) + 1;
  const openCircuit =
    failures >= threshold ||
    input.errorCode === "provider_auth" ||
    input.errorCode === "authentication_failure";

  await supabase
    .from("email_emergency_controls")
    .update({
      provider_consecutive_failures: failures,
      provider_circuit_state: openCircuit ? "open" : controls.provider_circuit_state,
      provider_circuit_reason: openCircuit
        ? `Opened after ${failures} consecutive provider failures`
        : controls.provider_circuit_reason,
      provider_circuit_opened_at: openCircuit
        ? new Date().toISOString()
        : controls.provider_circuit_opened_at,
    })
    .eq("organization_id", input.organizationId);
}

export async function setEmergencyStop(input: {
  organizationId: string;
  actorUserId: string;
  reason: string;
  stop: boolean;
}) {
  const supabase = createServiceClient() as SupabaseLike;
  await ensureEmergencyControls(input.organizationId);
  await supabase
    .from("email_emergency_controls")
    .update(
      input.stop
        ? {
            emergency_stop: true,
            emergency_stop_reason: input.reason,
            emergency_stopped_at: new Date().toISOString(),
            emergency_stopped_by: input.actorUserId,
            provider_dispatch_enabled: false,
          }
        : {
            emergency_stop: false,
            emergency_stop_reason: null,
            emergency_stopped_at: null,
            emergency_stopped_by: null,
          },
    )
    .eq("organization_id", input.organizationId);
}
