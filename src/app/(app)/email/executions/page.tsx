import type { Metadata } from "next";
import Link from "next/link";

import { EmailSubnav } from "@/components/email/email-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import {
  listEmailCampaignExecutions,
  listExecutionQueueJobs,
} from "@/lib/email/execution/queries";

export const metadata: Metadata = { title: "Executions" };

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function ExecutionsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const orgId = context.organization.id;
  const now = new Date().toISOString();

  const [executions, dueJobs] = await Promise.all([
    listEmailCampaignExecutions({ organizationId: orgId, limit: 50 }),
    listExecutionQueueJobs({ organizationId: orgId, limit: 200 }),
  ]);

  type ExecutionRow = {
    id: string;
    status?: string | null;
    campaign_id?: string | null;
    enrolled_count?: number | null;
    started_at?: string | null;
  };

  const executionRows = Array.isArray(executions)
    ? (executions as ExecutionRow[])
    : [];

  type QueueJobRow = {
    scheduled_for?: string | null;
    status?: string | null;
  };

  const queueJobRows = Array.isArray(dueJobs)
    ? (dueJobs as QueueJobRow[])
    : [];

  const counts = {
    preparing: executionRows.filter((e) => e.status === "preparing").length,
    ready: executionRows.filter((e) => e.status === "ready").length,
    running: executionRows.filter((e) => e.status === "running").length,
    paused: executionRows.filter((e) => e.status === "paused").length,
    completed: executionRows.filter((e) => e.status === "completed").length,
    failed: executionRows.filter((e) => e.status === "failed").length,
  };

  const due = queueJobRows.filter((j) => {
    if (!j.scheduled_for) return false;
    const status = j.status ?? "";
    if (!["scheduled", "available", "retry"].includes(status)) return false;
    return j.scheduled_for <= now;
  }).length;

  return (
    <div>
      <PageHeader
        title="Executions"
        description="Sequence execution architecture: enrollments, step executions, and internal queue. No external emails are sent."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Executions" },
        ]}
      />
      <EmailSubnav currentPath="/email/executions" />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Preparing</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{counts.preparing}</CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Running</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{counts.running}</CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Paused</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{counts.paused}</CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Completed</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{counts.completed}</CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Failed</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{counts.failed}</CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Queue due</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{due}</CardContent>
        </Card>
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-muted-foreground">
            <tr>
              <th className="p-3 text-left font-medium">Execution</th>
              <th className="p-3 text-left font-medium">Status</th>
              <th className="p-3 text-left font-medium">Enrolled</th>
              <th className="p-3 text-left font-medium">Started</th>
              <th className="p-3 text-right font-medium">Open</th>
            </tr>
          </thead>
          <tbody>
            {executions.length === 0 ? (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={5}>
                  No executions yet.
                </td>
              </tr>
            ) : null}
            {executionRows.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3">
                  <Link href={`/email/executions/${e.id}`} className="underline">
                    {e.campaign_id ? `Campaign ${e.campaign_id}` : e.id}
                  </Link>
                </td>
                <td className="p-3">
                  <Badge variant="outline">{e.status}</Badge>
                </td>
                <td className="p-3">{e.enrolled_count ?? 0}</td>
                <td className="p-3 text-muted-foreground">{formatDate(e.started_at)}</td>
                <td className="p-3 text-right">
                  <Button
                    nativeButton={false}
                    variant="outline"
                    render={<Link href={`/email/executions/${e.id}`}>Open</Link>}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

