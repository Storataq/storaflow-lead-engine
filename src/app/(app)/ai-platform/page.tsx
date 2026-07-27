import type { Metadata } from "next";

import { AiApprovalButtons } from "@/components/ai-platform/ai-approval-buttons";
import { AiRunConsole } from "@/components/ai-platform/ai-run-console";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AI_PLATFORM_UI } from "@/ai/constants";
import { bootstrapAiPlatform, getAiOverview } from "@/ai/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { formatDateTime } from "@/lib/ui/format";

export const metadata: Metadata = { title: AI_PLATFORM_UI.overviewTitle };

export default async function AiPlatformOverviewPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  await bootstrapAiPlatform(
    context.organization.id,
    context.membership.user_id,
  );
  const overview = await getAiOverview(context.organization.id);
  const m = overview.monitoring;

  const metrics = [
    { label: "Active agents", value: m.activeAgents },
    { label: "Queued tasks", value: m.queuedTasks },
    { label: "Running tasks", value: m.runningTasks },
    { label: "Dead letter", value: m.deadLetterTasks },
    { label: "Completed (24h)", value: m.completedRuns24h },
    { label: "Failed (24h)", value: m.failedRuns24h },
    { label: "Pending approvals", value: m.pendingApprovals },
    { label: "Avg latency (ms)", value: m.avgLatencyMs },
    { label: "Cost today ($)", value: m.costTodayUsd },
    { label: "Cost month ($)", value: m.costMonthUsd },
    { label: "Memory entries", value: m.memoryEntries },
    { label: "Tool calls (24h)", value: m.toolInvocations24h },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={AI_PLATFORM_UI.hubTitle}
        description="Enterprise AI Agent Platform kernel for Storaflow — multi-provider, multi-tenant, security-first."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{item.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kernel console</CardTitle>
            <CardDescription>
              Start a run on the system kernel assistant with planner, tools, and failover.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AiRunConsole />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Provider status</CardTitle>
            <CardDescription>Configured adapters for model routing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(m.providerStatus).map(([code, status]) => (
              <div
                key={code}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>{status.label}</span>
                <Badge variant={status.configured ? "default" : "secondary"}>
                  {status.configured ? "Configured" : "Not configured"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pending approvals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.pendingApprovals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending approvals.</p>
            ) : (
              overview.pendingApprovals.map((a) => (
                <div
                  key={a.id}
                  className="space-y-2 rounded-md border p-3 text-sm"
                >
                  <p className="font-medium">{a.action_summary}</p>
                  <p className="text-muted-foreground">
                    {formatDateTime(a.created_at)}
                  </p>
                  <AiApprovalButtons approvalId={a.id} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent runs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overview.recentRuns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No runs yet.</p>
            ) : (
              overview.recentRuns.map((run) => (
                <div
                  key={run.id}
                  className="flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{run.input_text}</p>
                    <p className="text-muted-foreground">
                      {formatDateTime(run.created_at)} · {run.provider ?? "—"} /{" "}
                      {run.model ?? "—"}
                    </p>
                  </div>
                  <Badge variant="outline">{run.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
