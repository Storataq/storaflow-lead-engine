/**
 * Phase 21L — operational health model + queue overview.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createServiceClient } from "@/lib/supabase/admin";
import { validateEmailEnvironment } from "@/lib/email/ops/env";
import { ensureEmergencyControls } from "@/lib/email/ops/controls";
import { envFlag } from "@/lib/email/ops/security";
import { getAIProviderDiagnostics } from "@/lib/email/ai/provider";
import { getEmailProviderDiagnostics } from "@/lib/email/provider";

type SupabaseLike = any;

export type HealthComponentStatus =
  | "healthy"
  | "degraded"
  | "unhealthy"
  | "disabled"
  | "unknown";

export type HealthComponent = {
  component: string;
  status: HealthComponentStatus;
  latencyMs?: number;
  errorSummary?: string | null;
  warningSummary?: string | null;
  evidence?: Record<string, unknown>;
  checkedAt: string;
};

export type EmailOpsOverview = {
  overall: HealthComponentStatus;
  components: HealthComponent[];
  queue: {
    pending: number;
    processing: number;
    deadLetter: number;
    oldestPendingAt: string | null;
  };
  controls: Awaited<ReturnType<typeof ensureEmergencyControls>>;
  openIncidents: number;
  openAlerts: number;
  workerHeartbeatAt: string | null;
};

async function countJobs(
  supabase: SupabaseLike,
  organizationId: string,
  statuses: string[],
) {
  const { count } = await supabase
    .from("email_queue_jobs")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .in("status", statuses);
  return count ?? 0;
}

export async function buildEmailOpsOverview(
  organizationId: string,
): Promise<EmailOpsOverview> {
  const started = Date.now();
  const supabase = createServiceClient() as SupabaseLike;
  const controls = await ensureEmergencyControls(organizationId);
  const env = validateEmailEnvironment({
    production: envFlag("EMAIL_PRODUCTION_MODE"),
  });
  const providerDiag = getEmailProviderDiagnostics();
  const aiDiag = getAIProviderDiagnostics();

  const [
    pending,
    processing,
    deadLetter,
    oldestPending,
    heartbeats,
    incidents,
    alerts,
  ] = await Promise.all([
    countJobs(supabase, organizationId, [
      "scheduled",
      "available",
      "locked",
      "retry",
    ]),
    countJobs(supabase, organizationId, ["processing", "locked"]),
    countJobs(supabase, organizationId, ["dead_letter", "failed"]),
    supabase
      .from("email_queue_jobs")
      .select("scheduled_for")
      .eq("organization_id", organizationId)
      .in("status", ["scheduled", "available", "retry"])
      .order("scheduled_for", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("email_worker_heartbeats")
      .select("last_heartbeat_at, worker_id, status")
      .eq("organization_id", organizationId)
      .order("last_heartbeat_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("email_incidents")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("status", ["open", "investigating", "monitoring"]),
    supabase
      .from("email_operational_alerts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "open"),
  ]);

  const checkedAt = new Date().toISOString();
  const components: HealthComponent[] = [];

  components.push({
    component: "environment",
    status: env.ready
      ? env.warnings.length
        ? "degraded"
        : "healthy"
      : "unhealthy",
    warningSummary: env.warnings.map((w) => w.message).join("; ") || null,
    errorSummary: env.blockingErrors.map((e) => e.message).join("; ") || null,
    evidence: { checkCount: env.checks.length },
    checkedAt,
  });

  components.push({
    component: "database",
    status: "healthy",
    latencyMs: Date.now() - started,
    checkedAt,
  });

  const backlogWarning = Number(
    process.env.EMAIL_MAX_QUEUE_BACKLOG_WARNING ?? 100,
  );
  const backlogCritical = Number(
    process.env.EMAIL_MAX_QUEUE_BACKLOG_CRITICAL ?? 500,
  );
  components.push({
    component: "queue",
    status:
      pending >= backlogCritical
        ? "unhealthy"
        : pending >= backlogWarning
          ? "degraded"
          : "healthy",
    evidence: { pending, processing, deadLetter },
    warningSummary:
      pending >= backlogWarning ? `Queue backlog ${pending}` : null,
    checkedAt,
  });

  const heartbeatAt = heartbeats.data?.last_heartbeat_at ?? null;
  const heartbeatTimeout = Number(
    process.env.EMAIL_WORKER_HEARTBEAT_TIMEOUT_SECONDS ?? 300,
  );
  const heartbeatAgeSec = heartbeatAt
    ? (Date.now() - new Date(heartbeatAt).getTime()) / 1000
    : null;
  components.push({
    component: "worker",
    status: !controls.worker_enabled
      ? "disabled"
      : heartbeatAgeSec == null
        ? "unknown"
        : heartbeatAgeSec > heartbeatTimeout
          ? "degraded"
          : "healthy",
    evidence: { heartbeatAt, workerId: heartbeats.data?.worker_id ?? null },
    checkedAt,
  });

  components.push({
    component: "email_provider",
    status: controls.emergency_stop
      ? "disabled"
      : controls.provider_circuit_state === "open"
        ? "unhealthy"
        : !controls.provider_dispatch_enabled
          ? "disabled"
          : providerDiag.hasResendKey
            ? "healthy"
            : "degraded",
    warningSummary: !providerDiag.hasResendKey
      ? "RESEND_API_KEY not configured"
      : controls.provider_circuit_reason,
    checkedAt,
  });

  components.push({
    component: "webhook_processing",
    status: !controls.webhook_processing_enabled
      ? "disabled"
      : process.env.RESEND_WEBHOOK_SECRET
        ? "healthy"
        : "degraded",
    checkedAt,
  });

  components.push({
    component: "tracking",
    status: !controls.tracking_enabled
      ? "disabled"
      : process.env.EMAIL_TRACKING_SECRET
        ? "healthy"
        : "unhealthy",
    errorSummary: !process.env.EMAIL_TRACKING_SECRET
      ? "EMAIL_TRACKING_SECRET missing"
      : null,
    checkedAt,
  });

  components.push({
    component: "ai_provider",
    status: !envFlag("EMAIL_AI_ENABLED")
      ? "disabled"
      : aiDiag.openaiConfigured
        ? "healthy"
        : "degraded",
    checkedAt,
  });

  components.push({
    component: "scheduler",
    status: !controls.scheduler_enabled
      ? "disabled"
      : process.env.EMAIL_EXECUTION_INTERNAL_SECRET
        ? "healthy"
        : "degraded",
    checkedAt,
  });

  const rank: Record<HealthComponentStatus, number> = {
    unhealthy: 4,
    degraded: 3,
    unknown: 2,
    disabled: 1,
    healthy: 0,
  };
  const overall = components.reduce<HealthComponentStatus>((acc, c) => {
    return rank[c.status] > rank[acc] ? c.status : acc;
  }, "healthy");

  // Persist lightweight snapshots (best effort)
  for (const c of components) {
    await supabase.from("email_operational_health").upsert(
      {
        organization_id: organizationId,
        component: c.component,
        status: c.status,
        latency_ms: c.latencyMs ?? null,
        error_summary: c.errorSummary ?? null,
        warning_summary: c.warningSummary ?? null,
        evidence_json: c.evidence ?? {},
        checked_at: checkedAt,
        last_success_at: c.status === "healthy" ? checkedAt : null,
        last_failure_at:
          c.status === "unhealthy" || c.status === "degraded" ? checkedAt : null,
      },
      { onConflict: "organization_id,component" },
    );
  }

  return {
    overall,
    components,
    queue: {
      pending,
      processing,
      deadLetter,
      oldestPendingAt: oldestPending.data?.scheduled_for ?? null,
    },
    controls,
    openIncidents: incidents.count ?? 0,
    openAlerts: alerts.count ?? 0,
    workerHeartbeatAt: heartbeatAt,
  };
}

export async function upsertWorkerHeartbeat(input: {
  organizationId: string;
  workerId: string;
  status: string;
}) {
  const supabase = createServiceClient() as SupabaseLike;
  await supabase.from("email_worker_heartbeats").upsert(
    {
      organization_id: input.organizationId,
      worker_id: input.workerId,
      status: input.status,
      last_heartbeat_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,worker_id" },
  );
}
