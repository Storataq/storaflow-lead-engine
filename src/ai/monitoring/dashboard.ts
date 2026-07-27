/**
 * Observability snapshot for the AI Platform dashboard.
 */

import { getProviderStatusMap } from "@/ai/providers/router";
import { sumCost } from "@/ai/costs/ledger";
import type { MonitoringSnapshot } from "@/ai/types";
import { createClient } from "@/lib/supabase/server";

export async function getMonitoringSnapshot(
  organizationId: string,
): Promise<MonitoringSnapshot> {
  const supabase = await createClient();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;

  const [
    agents,
    queued,
    running,
    dead,
    failedRuns,
    completedRuns,
    approvals,
    memory,
    toolEvents,
    logs,
    costToday,
    costMonth,
  ] = await Promise.all([
    supabase
      .from("ai_agents")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("status", ["planning", "waiting", "running", "needs_approval", "retrying"])
      .is("deleted_at", null),
    supabase
      .from("ai_tasks")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("status", ["queued", "scheduled"]),
    supabase
      .from("ai_tasks")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "running"),
    supabase
      .from("ai_tasks")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("queue_name", "dead_letter"),
    supabase
      .from("ai_runs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "failed")
      .gte("created_at", since24h),
    supabase
      .from("ai_runs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "completed")
      .gte("created_at", since24h),
    supabase
      .from("ai_approvals")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "pending"),
    supabase
      .from("ai_memory_entries")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("ai_events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("event_type", "tool.invoked")
      .gte("created_at", since24h),
    supabase
      .from("ai_execution_logs")
      .select("latency_ms")
      .eq("organization_id", organizationId)
      .gte("created_at", since24h)
      .limit(200),
    sumCost({ organizationId, fromDay: today, toDay: today }),
    sumCost({ organizationId, fromDay: monthStart, toDay: today }),
  ]);

  const latencies = (logs.data ?? []).map((r) => Number(r.latency_ms ?? 0));
  const avgLatencyMs =
    latencies.length === 0
      ? 0
      : Math.round(
          latencies.reduce((a, b) => a + b, 0) / latencies.length,
        );

  return {
    activeAgents: agents.count ?? 0,
    queuedTasks: queued.count ?? 0,
    runningTasks: running.count ?? 0,
    deadLetterTasks: dead.count ?? 0,
    failedRuns24h: failedRuns.count ?? 0,
    completedRuns24h: completedRuns.count ?? 0,
    costTodayUsd: Math.round(costToday * 1e6) / 1e6,
    costMonthUsd: Math.round(costMonth * 1e6) / 1e6,
    avgLatencyMs,
    pendingApprovals: approvals.count ?? 0,
    providerStatus: getProviderStatusMap(),
    memoryEntries: memory.count ?? 0,
    toolInvocations24h: toolEvents.count ?? 0,
  };
}
