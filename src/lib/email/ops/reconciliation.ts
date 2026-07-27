/**
 * Phase 21L — queue reconciliation (dry-run by default).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createServiceClient } from "@/lib/supabase/admin";
import { createCorrelationId } from "@/lib/email/ops/security";

type SupabaseLike = any;

export type ReconciliationFinding = {
  findingCode: string;
  severity: "informational" | "warning" | "high_priority" | "critical";
  resourceType?: string;
  resourceId?: string;
  description: string;
  evidence?: Record<string, unknown>;
};

export async function runQueueReconciliation(input: {
  organizationId: string;
  userId?: string | null;
  mode?: "dry_run" | "repair";
  repairExpiredLocks?: boolean;
}): Promise<{
  runId: string;
  correlationId: string;
  findings: ReconciliationFinding[];
  repaired: number;
}> {
  const supabase = createServiceClient() as SupabaseLike;
  const correlationId = createCorrelationId("recon");
  const mode = input.mode ?? "dry_run";
  const now = new Date().toISOString();

  const { data: run } = await supabase
    .from("email_reconciliation_runs")
    .insert({
      organization_id: input.organizationId,
      run_type: mode === "repair" ? "authorized_repair" : "full_dry_run",
      mode,
      status: "running",
      correlation_id: correlationId,
      started_at: now,
      created_by: input.userId ?? null,
    })
    .select("id")
    .single();

  const findings: ReconciliationFinding[] = [];
  let repaired = 0;

  // Expired locks still marked locked/processing
  const { data: expiredLocks } = await supabase
    .from("email_queue_jobs")
    .select("id, status, lease_expires_at, locked_by")
    .eq("organization_id", input.organizationId)
    .in("status", ["locked", "processing"])
    .lt("lease_expires_at", now)
    .limit(200);

  for (const job of expiredLocks ?? []) {
    findings.push({
      findingCode: "expired_lock",
      severity: "warning",
      resourceType: "email_queue_jobs",
      resourceId: job.id,
      description: `Job ${job.id} lease expired while status=${job.status}`,
      evidence: { locked_by: job.locked_by, lease_expires_at: job.lease_expires_at },
    });

    if (mode === "repair" && input.repairExpiredLocks) {
      await supabase
        .from("email_queue_jobs")
        .update({
          status: "available",
          locked_by: null,
          lease_expires_at: null,
        })
        .eq("organization_id", input.organizationId)
        .eq("id", job.id);
      repaired += 1;
    }
  }

  // Past-due scheduled jobs
  const { data: overdue } = await supabase
    .from("email_queue_jobs")
    .select("id, scheduled_for, status")
    .eq("organization_id", input.organizationId)
    .eq("status", "scheduled")
    .lt("scheduled_for", now)
    .limit(200);

  for (const job of overdue ?? []) {
    findings.push({
      findingCode: "overdue_scheduled",
      severity: "informational",
      resourceType: "email_queue_jobs",
      resourceId: job.id,
      description: `Scheduled job is past due (${job.scheduled_for})`,
    });
  }

  // Jobs without enrollment
  const { data: orphanJobs } = await supabase
    .from("email_queue_jobs")
    .select("id, enrollment_id, status")
    .eq("organization_id", input.organizationId)
    .is("enrollment_id", null)
    .in("status", ["scheduled", "available", "locked", "processing", "retry"])
    .limit(100);

  for (const job of orphanJobs ?? []) {
    findings.push({
      findingCode: "orphan_job",
      severity: "high_priority",
      resourceType: "email_queue_jobs",
      resourceId: job.id,
      description: "Active queue job has no enrollment_id",
    });
  }

  if (run?.id) {
    if (findings.length) {
      await supabase.from("email_reconciliation_findings").insert(
        findings.map((f) => ({
          organization_id: input.organizationId,
          run_id: run.id,
          finding_code: f.findingCode,
          severity: f.severity,
          resource_type: f.resourceType ?? null,
          resource_id: f.resourceId ?? null,
          description: f.description,
          evidence_json: f.evidence ?? {},
          repaired:
            mode === "repair" &&
            f.findingCode === "expired_lock" &&
            Boolean(input.repairExpiredLocks),
        })),
      );
    }

    await supabase
      .from("email_reconciliation_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        summary_json: {
          findingCount: findings.length,
          repaired,
          mode,
        },
      })
      .eq("id", run.id);
  }

  return {
    runId: run?.id ?? "unpersisted",
    correlationId,
    findings,
    repaired,
  };
}
