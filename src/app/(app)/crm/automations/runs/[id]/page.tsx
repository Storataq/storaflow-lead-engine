import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CrmSubnav } from "@/components/crm/crm-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AUTOMATION_RUN_STATUS_LABELS,
  type AutomationRunStatus,
} from "@/lib/crm/automation/constants";
import {
  getAutomation,
  getAutomationRun,
  listAutomationRunLogs,
} from "@/lib/crm/automation/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: "Automation Run" };

type PageProps = { params: Promise<{ id: string }> };

export default async function AutomationRunPage({ params }: PageProps) {
  const { id } = await params;
  const context = await getActiveOrganization();
  if (!context) return null;

  const run = await getAutomationRun(context.organization.id, id);
  if (!run) notFound();

  const [logs, automation] = await Promise.all([
    listAutomationRunLogs(context.organization.id, id),
    getAutomation(context.organization.id, run.automation_id),
  ]);

  const actions = Array.isArray(run.executed_actions_json)
    ? (run.executed_actions_json as Array<{
        action: string;
        status: string;
        detail?: string;
      }>)
    : [];

  return (
    <div>
      <PageHeader
        title="Automation run"
        description={`${automation?.name ?? "Automation"} · ${run.trigger_type ?? "manual"}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Automations", href: "/crm/automations" },
          ...(automation
            ? [
                {
                  label: automation.name,
                  href: `/crm/automations/${automation.id}`,
                },
              ]
            : []),
          { label: "Run" },
        ]}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={
              <Link
                href={
                  automation
                    ? `/crm/automations/${automation.id}`
                    : "/crm/automations"
                }
              />
            }
          >
            Back
          </Button>
        }
      />
      <CrmSubnav currentPath="/crm/automations" />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
            <CardTitle className="text-base">
              <Badge variant="outline">
                {AUTOMATION_RUN_STATUS_LABELS[
                  run.status as AutomationRunStatus
                ] ?? run.status}
              </Badge>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Duration</CardDescription>
            <CardTitle className="text-base tabular-nums">
              {run.duration_ms != null ? `${run.duration_ms} ms` : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Started</CardDescription>
            <CardTitle className="text-base text-sm font-normal">
              {run.started_at
                ? new Date(run.started_at).toLocaleString()
                : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Retries</CardDescription>
            <CardTitle className="text-base tabular-nums">
              {run.retry_count}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {run.error_message ? (
        <Card className="mb-6 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Error</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-rose-700 dark:text-rose-300">
            {run.error_message}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Executed actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {actions.length === 0 ? (
              <p className="text-muted-foreground">No actions recorded.</p>
            ) : (
              actions.map((a, i) => (
                <div key={`${a.action}-${i}`} className="rounded-lg border p-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{a.action}</span>
                    <Badge variant="secondary">{a.status}</Badge>
                  </div>
                  {a.detail ? (
                    <p className="text-xs text-muted-foreground">{a.detail}</p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Execution logs</CardTitle>
            <CardDescription>
              Timestamp, step, result, and errors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              {logs.map((log) => (
                <li key={log.id} className="rounded-lg border p-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{log.level}</Badge>
                    {log.step_type ? (
                      <Badge variant="secondary">{log.step_type}</Badge>
                    ) : null}
                    <time className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </time>
                    {log.execution_time_ms != null ? (
                      <span className="text-xs text-muted-foreground">
                        {log.execution_time_ms}ms
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1">{log.message}</p>
                  {log.result ? (
                    <p className="text-xs text-muted-foreground">
                      Result: {log.result}
                    </p>
                  ) : null}
                  {log.error_message ? (
                    <p className="text-xs text-rose-700 dark:text-rose-300">
                      {log.error_message}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
