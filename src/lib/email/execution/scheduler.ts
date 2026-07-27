/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@/lib/supabase/admin";

type SupabaseLike = any;

export async function runExecutionScheduler(input: {
  organizationId: string;
  workerId: string;
  nowIso: string;
  dueLimit: number;
}): Promise<{ runId: string; released: number; skipped: number }> {
  const supabase = createServiceClient() as unknown as SupabaseLike;

  const { data: run } = await supabase
    .from("email_scheduler_runs")
    .insert({
      organization_id: input.organizationId,
      status: "running",
      worker_id: input.workerId,
      jobs_found: 0,
      jobs_released: 0,
      jobs_skipped: 0,
      jobs_failed: 0,
    })
    .select("*")
    .single();

  const runId = run.id as string;

  // Release due jobs (scheduled_for <= now). Avoid modifying locked/processing jobs.
  const { data: due } = await supabase
    .from("email_queue_jobs")
    .select("id")
    .eq("organization_id", input.organizationId)
    .in("status", ["scheduled"])
    .lte("scheduled_for", input.nowIso)
    .limit(input.dueLimit);

  const jobIds = (due ?? []).map((j: any) => j.id);

  if (jobIds.length === 0) {
    await supabase
      .from("email_scheduler_runs")
      .update({
        status: "completed",
        completed_at: input.nowIso,
        jobs_found: 0,
        jobs_released: 0,
      })
      .eq("id", runId);
    return { runId, released: 0, skipped: 0 };
  }

  const { count } = await supabase
    .from("email_queue_jobs")
    .update({
      status: "available",
      available_at: input.nowIso,
    })
    .in("id", jobIds);

  await supabase
    .from("email_scheduler_runs")
    .update({
      status: "completed",
      completed_at: input.nowIso,
      jobs_found: jobIds.length,
      jobs_released: count ?? jobIds.length,
      jobs_skipped: 0,
    })
    .eq("id", runId);

  return {
    runId,
    released: count ?? jobIds.length,
    skipped: 0,
  };
}

