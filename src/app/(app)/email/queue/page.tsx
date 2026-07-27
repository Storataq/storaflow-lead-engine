import type { Metadata } from "next";

import { EmailSubnav } from "@/components/email/email-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { listExecutionQueueJobs } from "@/lib/email/execution/queries";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Email Queue" };

export default async function EmailQueuePage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const jobs = await listExecutionQueueJobs({
    organizationId: context.organization.id,
    limit: 100,
  });

  type ExecutionQueueJobRow = {
    id: string;
    job_type?: string | null;
    status?: string | null;
    scheduled_for?: string | null;
    available_at?: string | null;
    attempt_count?: number | null;
    maximum_attempts?: number | null;
    enrollment_id?: string | null;
  };

  return (
    <div>
      <PageHeader
        title="Queue"
        description="Execution queue jobs (internal). Scheduled → available → locked/processing → completed/dead-letter. No external provider dispatch."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Queue" },
        ]}
      />
      <EmailSubnav currentPath="/email/queue" />

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-muted-foreground">
            <tr>
              <th className="p-3 text-left font-medium">Job type</th>
              <th className="p-3 text-left font-medium">Status</th>
              <th className="p-3 text-left font-medium">Scheduled</th>
              <th className="p-3 text-left font-medium">Attempts</th>
              <th className="p-3 text-right font-medium">Open</th>
            </tr>
          </thead>
          <tbody>
            {(jobs ?? []).length === 0 ? (
              <tr>
                <td className="p-4 text-sm text-muted-foreground" colSpan={5}>
                  No execution queue jobs yet.
                </td>
              </tr>
            ) : null}
            {((jobs ?? []) as ExecutionQueueJobRow[]).map((j) => (
              <tr key={j.id} className="border-t">
                <td className="p-3 text-muted-foreground">{j.job_type}</td>
                <td className="p-3">
                  <Badge variant="outline">{j.status}</Badge>
                </td>
                <td className="p-3 text-muted-foreground">
                  {j.scheduled_for ?? j.available_at ?? "—"}
                </td>
                <td className="p-3 text-muted-foreground">
                  {j.attempt_count ?? 0}/{j.maximum_attempts ?? 5}
                </td>
                <td className="p-3 text-right">
                  {j.enrollment_id ? (
                    <a
                      href={`/email/enrollments/${j.enrollment_id}`}
                      className="underline"
                    >
                      Enrollment
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
