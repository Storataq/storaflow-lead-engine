import type { Metadata } from "next";

import { EmailSubnav } from "@/components/email/email-subnav";
import { SuppressionsManager } from "@/components/email/suppressions-manager";
import { PageHeader } from "@/components/layout/page-header";
import { ReloadErrorAlert } from "@/components/layout/reload-error-alert";
import {
  listSuppressions,
  type SuppressionListRow,
} from "@/lib/email/preferences/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = { title: "Email Suppression" };

export default async function EmailSuppressionPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; q?: string }>;
}) {
  const context = await getActiveOrganization();
  if (!context) return null;
  const sp = await searchParams;

  let errorMessage: string | null = null;
  let rows: SuppressionListRow[] = [];

  try {
    rows = await listSuppressions(context.organization.id, {
      reason: sp.reason,
      q: sp.q,
      active: true,
    });
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon suppressions niet laden. Controleer of de preferences-migratie is uitgevoerd.",
    );
  }

  const canManage =
    context.membership.role === "owner" ||
    context.membership.role === "admin";

  return (
    <div>
      <PageHeader
        title="Suppression"
        description="Organization-scoped blocks for unsubscribe, complaint, hard bounce and manual do-not-contact."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Suppression" },
        ]}
      />
      <EmailSubnav currentPath="/email/suppression" />
      {errorMessage ? (
        <ReloadErrorAlert description={errorMessage} />
      ) : (
        <>
          <form className="mb-4 flex flex-wrap gap-2">
            <input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Search email"
              className="h-10 rounded-md border bg-background px-3 text-sm"
            />
            <select
              name="reason"
              defaultValue={sp.reason ?? ""}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All reasons</option>
              <option value="unsubscribed">Unsubscribed</option>
              <option value="complaint">Complaint</option>
              <option value="bounce_hard">Hard bounce</option>
              <option value="manual">Manual</option>
              <option value="do_not_contact">Do not contact</option>
              <option value="legal_restriction">Legal</option>
            </select>
            <button
              type="submit"
              className="h-10 rounded-md border px-4 text-sm hover:bg-muted"
            >
              Filter
            </button>
          </form>
          <SuppressionsManager rows={rows} canManage={canManage} />
        </>
      )}
    </div>
  );
}
