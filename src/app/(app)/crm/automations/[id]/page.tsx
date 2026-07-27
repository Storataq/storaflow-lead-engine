import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AutomationEditor } from "@/components/crm/automation-editor";
import { CrmSubnav } from "@/components/crm/crm-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AUTOMATION_RUN_STATUS_LABELS,
  type AutomationRunStatus,
} from "@/lib/crm/automation/constants";
import {
  getAutomation,
  listAutomationRuns,
  listAutomationVersions,
} from "@/lib/crm/automation/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: "Automation" };

type PageProps = { params: Promise<{ id: string }> };

export default async function AutomationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const context = await getActiveOrganization();
  if (!context) return null;

  const canManage =
    context.membership.role === "owner" || context.membership.role === "admin";

  const automation = await getAutomation(context.organization.id, id);
  if (!automation) notFound();

  const [runs, versions] = await Promise.all([
    listAutomationRuns(context.organization.id, {
      automationId: id,
      limit: 20,
    }),
    listAutomationVersions(context.organization.id, id),
  ]);

  return (
    <div>
      <PageHeader
        title={automation.name}
        description={automation.description ?? "Sales automation workflow"}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Automations", href: "/crm/automations" },
          { label: automation.name },
        ]}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/crm/automations" />}
          >
            All automations
          </Button>
        }
      />
      <CrmSubnav currentPath="/crm/automations" />

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Versions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {versions.length === 0 ? (
              <p className="text-muted-foreground">No versions yet.</p>
            ) : (
              versions.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between gap-2 rounded-lg border p-2"
                >
                  <span>
                    v{v.version_number} · {v.name}
                  </span>
                  <Badge variant="outline">
                    {v.is_current ? "current" : v.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Execution history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {runs.length === 0 ? (
              <p className="text-muted-foreground">No runs yet.</p>
            ) : (
              runs.map((run) => (
                <Link
                  key={run.id}
                  href={`/crm/automations/runs/${run.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border p-2 hover:bg-muted/40"
                >
                  <span>
                    {new Date(run.created_at).toLocaleString()}
                    {run.duration_ms != null ? ` · ${run.duration_ms}ms` : ""}
                  </span>
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

      <AutomationEditor automation={automation} canManage={canManage} />
    </div>
  );
}
