"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Workflow } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AUTOMATION_RUN_STATUS_LABELS,
  AUTOMATION_STATUS_LABELS,
  AUTOMATION_STATUSES,
  AUTOMATION_TRIGGER_LABELS,
  AUTOMATION_TRIGGERS,
  type AutomationRunStatus,
  type AutomationStatus,
  type AutomationTrigger,
} from "@/lib/crm/automation/constants";
import {
  createAutomationFromTemplateAction,
  deleteAutomationAction,
  processAutomationQueueAction,
  setAutomationEnabledAction,
} from "@/lib/crm/automation/actions";
import { listSystemAutomationTemplates } from "@/lib/crm/automation/templates";
import type {
  CrmAutomationRow,
  CrmAutomationRunRow,
} from "@/lib/crm/automation/types";

type Dashboard = {
  totals: {
    automations: number;
    active: number;
    running: number;
    completedToday: number;
    failedToday: number;
    successRate: number;
  };
  mostUsed: Array<{ automation: CrmAutomationRow | null; count: number }>;
  queue: CrmAutomationRunRow[];
  automations: CrmAutomationRow[];
  recentRuns: CrmAutomationRunRow[];
};

type AutomationsManagerProps = {
  dashboard: Dashboard;
  canManage: boolean;
};

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-base tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

export function AutomationsManager({
  dashboard,
  canManage,
}: AutomationsManagerProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [trigger, setTrigger] = useState("all");
  const [pending, startTransition] = useTransition();
  const templates = listSystemAutomationTemplates();

  const filtered = useMemo(() => {
    return dashboard.automations.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (trigger !== "all" && row.trigger_type !== trigger) return false;
      if (query.trim()) {
        const needle = query.trim().toLowerCase();
        const hay = [row.name, row.description ?? "", row.trigger_type]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [dashboard.automations, query, status, trigger]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Metric label="Automations" value={dashboard.totals.automations} />
        <Metric label="Active" value={dashboard.totals.active} />
        <Metric label="Running / queued" value={dashboard.totals.running} />
        <Metric label="Completed today" value={dashboard.totals.completedToday} />
        <Metric label="Failed today" value={dashboard.totals.failedToday} />
        <Metric
          label="Success rate"
          value={`${dashboard.totals.successRate}%`}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {canManage ? (
          <>
            <Button
              nativeButton={false}
              render={<Link href="/crm/automations/new" />}
            >
              New automation
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const result = await processAutomationQueueAction();
                  if (!result.success) toast.error(result.message);
                  else {
                    toast.success(result.message);
                    router.refresh();
                  }
                });
              }}
            >
              Process queue
            </Button>
          </>
        ) : null}
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">AI template suggestions</CardTitle>
          <CardDescription>
            Ready-made workflows — Hot Lead, New Company, Cold Lead, and more.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => (
            <div key={tpl.code} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{tpl.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {tpl.description}
              </p>
              {tpl.aiSuggestion ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  AI: {tpl.aiSuggestion}
                </p>
              ) : null}
              {canManage ? (
                <Button
                  type="button"
                  size="sm"
                  className="mt-2"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await createAutomationFromTemplateAction(
                        tpl.code,
                      );
                      if (!result.success) {
                        toast.error(result.message);
                        return;
                      }
                      toast.success(result.message);
                      if (result.id) {
                        router.push(`/crm/automations/${result.id}`);
                        router.refresh();
                      }
                    });
                  }}
                >
                  Use template
                </Button>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Most used</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboard.mostUsed.length === 0 ? (
              <p className="text-sm text-muted-foreground">No runs yet.</p>
            ) : (
              dashboard.mostUsed.map((row, idx) => (
                <div
                  key={row.automation?.id ?? idx}
                  className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm"
                >
                  <span className="truncate">
                    {row.automation?.name ?? "Deleted automation"}
                  </span>
                  <Badge variant="secondary">{row.count}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Automation queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboard.queue.length === 0 ? (
              <p className="text-sm text-muted-foreground">Queue empty.</p>
            ) : (
              dashboard.queue.map((run) => (
                <Link
                  key={run.id}
                  href={`/crm/automations/runs/${run.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm hover:bg-muted/40"
                >
                  <span className="truncate">{run.trigger_type ?? "run"}</span>
                  <Badge variant="outline">
                    {AUTOMATION_RUN_STATUS_LABELS[
                      run.status as AutomationRunStatus
                    ] ?? run.status}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search automations…"
          aria-label="Search automations"
        />
        <select
          className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Status"
        >
          <option value="all">All statuses</option>
          {AUTOMATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {AUTOMATION_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={trigger}
          onChange={(e) => setTrigger(e.target.value)}
          aria-label="Trigger"
        >
          <option value="all">All triggers</option>
          {AUTOMATION_TRIGGERS.map((t) => (
            <option key={t} value={t}>
              {AUTOMATION_TRIGGER_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title="No automations"
          description="Create a draft workflow or start from an AI template."
          actionLabel={canManage ? "New automation" : undefined}
          actionHref={canManage ? "/crm/automations/new" : undefined}
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <Link
                  href={`/crm/automations/${row.id}`}
                  className="font-medium hover:underline"
                >
                  {row.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {AUTOMATION_TRIGGER_LABELS[
                    row.trigger_type as AutomationTrigger
                  ] ?? row.trigger_type}{" "}
                  · v{row.current_version}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {AUTOMATION_STATUS_LABELS[row.status as AutomationStatus] ??
                    row.status}
                </Badge>
                {canManage ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          const result = await setAutomationEnabledAction(
                            row.id,
                            !row.enabled,
                          );
                          if (!result.success) toast.error(result.message);
                          else {
                            toast.success(result.message);
                            router.refresh();
                          }
                        });
                      }}
                    >
                      {row.enabled ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          const result = await deleteAutomationAction(row.id);
                          if (!result.success) toast.error(result.message);
                          else {
                            toast.success(result.message);
                            router.refresh();
                          }
                        });
                      }}
                    >
                      Archive
                    </Button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Recent runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {dashboard.recentRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No execution history.</p>
          ) : (
            dashboard.recentRuns.map((run) => (
              <Link
                key={run.id}
                href={`/crm/automations/runs/${run.id}`}
                className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm hover:bg-muted/40"
              >
                <div>
                  <p className="font-medium">{run.trigger_type ?? "Run"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(run.created_at).toLocaleString()}
                    {run.duration_ms != null ? ` · ${run.duration_ms}ms` : ""}
                  </p>
                </div>
                <Badge variant="outline">
                  {AUTOMATION_RUN_STATUS_LABELS[
                    run.status as AutomationRunStatus
                  ] ?? run.status}
                </Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
