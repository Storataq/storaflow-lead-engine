import type { Metadata } from "next";
import Link from "next/link";

import { EmailSubnav } from "@/components/email/email-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { ReloadErrorAlert } from "@/components/layout/reload-error-alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import {
  getEmailCampaignExecution,
  listSequenceEnrollmentsForExecution,
  listExecutionQueueJobs,
} from "@/lib/email/execution/queries";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = { title: "Execution Detail" };

type PageProps = { params: Promise<{ id: string }> };

export default async function ExecutionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const context = await getActiveOrganization();
  if (!context) return null;
  const orgId = context.organization.id;

  let errorMessage: string | null = null;
  let execution: Awaited<ReturnType<typeof getEmailCampaignExecution>> = null;
  let enrollments: Awaited<
    ReturnType<typeof listSequenceEnrollmentsForExecution>
  > = [];
  let queueJobs: Awaited<ReturnType<typeof listExecutionQueueJobs>> = [];

  try {
    [execution, enrollments, queueJobs] = await Promise.all([
      getEmailCampaignExecution({ organizationId: orgId, executionId: id }),
      listSequenceEnrollmentsForExecution({
        organizationId: orgId,
        executionId: id,
        limit: 50,
      }),
      listExecutionQueueJobs({ organizationId: orgId, limit: 100 }),
    ]);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon executiondetails niet laden.",
    );
  }

  if (errorMessage) {
    return (
      <div>
        <PageHeader
          title="Execution"
          description="Sequence execution detail."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Email Engine", href: "/email" },
            { label: "Executions", href: "/email/executions" },
            { label: id },
          ]}
        />
        <EmailSubnav currentPath="/email/executions" />
        <ReloadErrorAlert description={errorMessage} />
      </div>
    );
  }

  if (!execution) {
    return (
      <div>
        <PageHeader
          title="Execution"
          description="Sequence execution detail."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Email Engine", href: "/email" },
            { label: "Executions", href: "/email/executions" },
            { label: id },
          ]}
        />
        <EmailSubnav currentPath="/email/executions" />
        <p className="text-sm text-muted-foreground">Execution not found.</p>
      </div>
    );
  }

  type EnrollmentRow = {
    id: string;
    status?: string | null;
    current_step_number?: number | null;
    current_step_id?: string | null;
  };

  const enrollmentRows = Array.isArray(enrollments)
    ? (enrollments as EnrollmentRow[])
    : [];

  const stepCounts = {
    waiting: enrollmentRows.filter((e) => e.status === "waiting").length,
    scheduled: enrollmentRows.filter((e) => e.status === "scheduled").length,
    active: enrollmentRows.filter((e) => e.status === "active").length,
    completed: enrollmentRows.filter((e) => e.status === "completed").length,
    stopped: enrollmentRows.filter((e) => e.status === "stopped").length,
    failed: enrollmentRows.filter((e) => e.status === "failed").length,
  };

  return (
    <div>
      <PageHeader
        title={`Execution ${execution.id}`}
        description="Execution architecture: internal queue and rendered snapshots. Live provider dispatch remains gated."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Executions", href: "/email/executions" },
          { label: execution.id },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/email/enrollments">Enrollments</Link>}
            />
          </div>
        }
      />
      <EmailSubnav currentPath="/email/executions" />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{execution.status}</Badge>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Enrolled</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {execution.enrolled_count ?? 0}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Queue due</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{queueJobs.length}</CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Waiting</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{stepCounts.waiting}</CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Scheduled</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{stepCounts.scheduled}</CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Completed</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{stepCounts.completed}</CardContent>
        </Card>
      </div>

      <div className="rounded-lg border">
        <div className="p-3 text-sm font-medium text-muted-foreground">
          Enrollments (sample)
        </div>
        <div className="divide-y">
          {enrollmentRows.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              No enrollments yet.
            </div>
          ) : null}
          {enrollmentRows.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 p-3">
              <div>
                <div className="font-medium">
                  <Link
                    href={`/email/enrollments/${e.id}`}
                    className="underline"
                  >
                    Enrollment {e.id}
                  </Link>
                </div>
                <div className="text-xs text-muted-foreground">
                  Step {e.current_step_number ?? "—"} · {e.current_step_id ?? "—"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{e.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

