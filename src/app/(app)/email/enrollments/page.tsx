import type { Metadata } from "next";
import Link from "next/link";

import { EmailSubnav } from "@/components/email/email-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createServiceClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Enrollments" };

export default async function EnrollmentsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const orgId = context.organization.id;

  const supabase = createServiceClient();

  const { data: enrollments } = await supabase
    .from("email_sequence_enrollments")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100);

  type EnrollmentRow = {
    id: string;
    email_address?: string | null;
    campaign_execution_id?: string | null;
    current_step_number?: number | null;
    current_step_id?: string | null;
    status?: string | null;
  };

  const enrollmentRows = Array.isArray(enrollments)
    ? (enrollments as EnrollmentRow[])
    : [];

  return (
    <div>
      <PageHeader
        title="Enrollments"
        description="Recipient enrollments into sequence executions (internal queue only)."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Enrollments" },
        ]}
      />
      <EmailSubnav currentPath="/email/enrollments" />

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-muted-foreground">
            <tr>
              <th className="p-3 text-left font-medium">Recipient</th>
              <th className="p-3 text-left font-medium">Execution</th>
              <th className="p-3 text-left font-medium">Step</th>
              <th className="p-3 text-left font-medium">Status</th>
              <th className="p-3 text-right font-medium">Open</th>
            </tr>
          </thead>
          <tbody>
            {enrollmentRows.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3">
                  <span className="font-medium">{e.email_address}</span>
                </td>
                <td className="p-3 text-muted-foreground">
                  {e.campaign_execution_id}
                </td>
                <td className="p-3 text-muted-foreground">
                  {e.current_step_number ?? "—"} · {e.current_step_id ?? "—"}
                </td>
                <td className="p-3">
                  <Badge variant="outline">{e.status}</Badge>
                </td>
                <td className="p-3 text-right">
                  <Link
                    href={`/email/enrollments/${e.id}`}
                    className="underline"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {enrollmentRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-sm text-muted-foreground">
                  No enrollments yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

