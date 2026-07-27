import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EmailSubnav } from "@/components/email/email-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { ReloadErrorAlert } from "@/components/layout/reload-error-alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { getSequenceEnrollment } from "@/lib/email/execution/queries";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = { title: "Enrollment Detail" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EnrollmentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const context = await getActiveOrganization();
  if (!context) return null;

  const orgId = context.organization.id;

  let enrollment: Awaited<ReturnType<typeof getSequenceEnrollment>> = null;
  try {
    enrollment = await getSequenceEnrollment({
      organizationId: orgId,
      enrollmentId: id,
    });
  } catch (error) {
    return (
      <div>
        <PageHeader
          title="Enrollment"
          description="Internal execution state."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Email Engine", href: "/email" },
            { label: "Enrollments", href: "/email/enrollments" },
            { label: id },
          ]}
        />
        <EmailSubnav currentPath="/email/enrollments" />
        <ReloadErrorAlert
          description={toUserFacingError(
            error,
            "Kon enrollment niet laden.",
          )}
        />
      </div>
    );
  }

  if (!enrollment) notFound();

  let relatedError: string | null = null;
  let renderedMessages: Array<{
    id?: string;
    subject?: string | null;
    step_execution_id?: string | null;
  }> = [];
  let stopRuleEvents: Array<{
    id?: string;
    rule_code?: string | null;
    evaluated_at?: string | null;
  }> = [];

  try {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const supabase = (await createClient()) as any;
    const [rendered, stopEvents] = await Promise.all([
      supabase
        .from("email_rendered_messages")
        .select("*")
        .eq("organization_id", orgId)
        .eq("enrollment_id", id)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("email_execution_stop_events")
        .select("*")
        .eq("organization_id", orgId)
        .eq("enrollment_id", id)
        .order("evaluated_at", { ascending: false })
        .limit(5),
    ]);

    renderedMessages = Array.isArray(rendered?.data) ? rendered.data : [];
    stopRuleEvents = Array.isArray(stopEvents?.data) ? stopEvents.data : [];
  } catch (error) {
    relatedError = toUserFacingError(
      error,
      "Kon aanvullende enrollmentgegevens niet laden.",
    );
  }

  return (
    <div>
      <PageHeader
        title={`Enrollment ${id}`}
        description="Internal execution state and rendered-message snapshots. Live provider dispatch remains gated."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Enrollments", href: "/email/enrollments" },
          { label: id },
        ]}
        actions={<Badge variant="outline">{enrollment.status}</Badge>}
      />
      <EmailSubnav currentPath="/email/enrollments" />

      {relatedError ? (
        <div className="mb-4">
          <ReloadErrorAlert description={relatedError} />
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recipient</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {enrollment.email_address ?? "—"}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Current step</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {enrollment.current_step_number ?? "—"} ·{" "}
            {enrollment.current_step_id ?? "—"}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Next execution</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {enrollment.next_execution_time ?? "—"}
          </CardContent>
        </Card>
      </div>

      {enrollment.stop_reason ? (
        <div className="mb-4 rounded-lg border p-3 text-sm text-muted-foreground">
          Stop reason: {enrollment.stop_reason}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Rendered messages</CardTitle>
          </CardHeader>
          <CardContent>
            {renderedMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No rendered-message snapshots yet.
              </p>
            ) : (
              <div className="space-y-3">
                {renderedMessages.map((m) => (
                  <div key={m.id ?? "unknown"} className="rounded border p-3">
                    <p className="text-xs text-muted-foreground">Subject</p>
                    <p className="font-medium">{m.subject ?? "—"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Step execution {m.step_execution_id ?? "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Stop events</CardTitle>
          </CardHeader>
          <CardContent>
            {stopRuleEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No stop events recorded.
              </p>
            ) : (
              <ul className="space-y-2">
                {stopRuleEvents.map((s) => (
                  <li
                    key={s.id ?? "unknown"}
                    className="text-sm text-muted-foreground"
                  >
                    {s.rule_code ?? "stop"} · {s.evaluated_at ?? "—"}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
