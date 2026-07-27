/**
 * Phase 25F — automation queries & dashboard widgets.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  CrmAutomationRow,
  CrmAutomationRunLogRow,
  CrmAutomationRunRow,
  CrmAutomationVersionRow,
} from "@/lib/crm/automation/types";

export type {
  CrmAutomationRow,
  CrmAutomationRunRow,
  CrmAutomationRunLogRow,
  CrmAutomationVersionRow,
} from "@/lib/crm/automation/types";

export type AutomationListFilters = {
  query?: string;
  status?: string;
  trigger?: string;
  ownerUserId?: string;
};

export async function listAutomations(
  organizationId: string,
  filters: AutomationListFilters = {},
): Promise<CrmAutomationRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("crm_automations")
    .select("*")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.trigger && filters.trigger !== "all") {
    query = query.eq("trigger_type", filters.trigger);
  }
  if (filters.ownerUserId && filters.ownerUserId !== "all") {
    query = query.eq("owner_user_id", filters.ownerUserId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let rows = data ?? [];
  if (filters.query?.trim()) {
    const needle = filters.query.trim().toLowerCase();
    rows = rows.filter((r) =>
      [r.name, r.description ?? "", r.trigger_type, r.status]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }
  return rows;
}

export async function getAutomation(
  organizationId: string,
  automationId: string,
): Promise<CrmAutomationRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_automations")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", automationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function listAutomationRuns(
  organizationId: string,
  filters: {
    automationId?: string;
    status?: string;
    limit?: number;
  } = {},
): Promise<CrmAutomationRunRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("crm_automation_runs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 50);

  if (filters.automationId) {
    query = query.eq("automation_id", filters.automationId);
  }
  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAutomationRun(
  organizationId: string,
  runId: string,
): Promise<CrmAutomationRunRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_automation_runs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", runId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function listAutomationRunLogs(
  organizationId: string,
  runId: string,
): Promise<CrmAutomationRunLogRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_automation_run_logs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("run_id", runId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listAutomationVersions(
  organizationId: string,
  automationId: string,
): Promise<CrmAutomationVersionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_automation_versions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("automation_id", automationId)
    .order("version_number", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function buildAutomationDashboard(organizationId: string) {
  const [automations, runs] = await Promise.all([
    listAutomations(organizationId),
    listAutomationRuns(organizationId, { limit: 200 }),
  ]);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayIso = startOfDay.toISOString();

  const running = runs.filter(
    (r) => r.status === "running" || r.status === "pending",
  ).length;
  const completedToday = runs.filter(
    (r) => r.status === "completed" && r.created_at >= todayIso,
  ).length;
  const failedToday = runs.filter(
    (r) => r.status === "failed" && r.created_at >= todayIso,
  ).length;

  const usage = new Map<string, number>();
  for (const run of runs) {
    usage.set(run.automation_id, (usage.get(run.automation_id) ?? 0) + 1);
  }
  const mostUsed = [...usage.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({
      automation: automations.find((a) => a.id === id) ?? null,
      count,
    }));

  const finished = runs.filter(
    (r) => r.status === "completed" || r.status === "failed",
  );
  const successRate =
    finished.length === 0
      ? 0
      : Math.round(
          (finished.filter((r) => r.status === "completed").length /
            finished.length) *
            1000,
        ) / 10;

  const queue = runs
    .filter((r) => r.status === "pending" || r.status === "running")
    .slice(0, 10);

  return {
    totals: {
      automations: automations.length,
      active: automations.filter((a) => a.status === "active" && a.enabled)
        .length,
      running,
      completedToday,
      failedToday,
      successRate,
    },
    mostUsed,
    queue,
    automations,
    recentRuns: runs.slice(0, 12),
  };
}
