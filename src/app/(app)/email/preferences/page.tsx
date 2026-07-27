import type { Metadata } from "next";

import { EmailSubnav } from "@/components/email/email-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { ReloadErrorAlert } from "@/components/layout/reload-error-alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getPreferenceStats,
  listRecipientPreferences,
  type PreferenceListRow,
  type PreferenceStats,
} from "@/lib/email/preferences/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = { title: "Email Preferences" };

const EMPTY_STATS: PreferenceStats = {
  subscribed: 0,
  partiallySubscribed: 0,
  paused: 0,
  unsubscribed: 0,
  complaintBlocked: 0,
  hardBounceBlocked: 0,
  suppressed: 0,
  legalHold: 0,
  preferenceUpdates: 0,
  oneClickUnsubscribes: 0,
  replyUnsubscribes: 0,
};

export default async function EmailPreferencesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const context = await getActiveOrganization();
  if (!context) return null;
  const sp = await searchParams;

  let errorMessage: string | null = null;
  let rows: PreferenceListRow[] = [];
  let stats: PreferenceStats = EMPTY_STATS;

  try {
    [rows, stats] = await Promise.all([
      listRecipientPreferences(context.organization.id, {
        status: sp.status,
        q: sp.q,
      }),
      getPreferenceStats(context.organization.id),
    ]);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon preference-gegevens niet laden. Controleer of de preferences-migratie is uitgevoerd.",
    );
  }

  return (
    <div>
      <PageHeader
        title="Preferences"
        description="Recipient communication status, frequency, pauses and eligibility."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Preferences" },
        ]}
      />
      <EmailSubnav currentPath="/email/preferences" />

      {errorMessage ? (
        <ReloadErrorAlert description={errorMessage} />
      ) : (
        <>
          <div className="mb-6 grid gap-3 md:grid-cols-4 xl:grid-cols-6">
            {[
              ["Subscribed", stats.subscribed],
              ["Partial", stats.partiallySubscribed],
              ["Paused", stats.paused],
              ["Unsubscribed", stats.unsubscribed],
              ["Complaints", stats.complaintBlocked],
              ["Hard bounce", stats.hardBounceBlocked],
              ["One-click", stats.oneClickUnsubscribes],
              ["Updates", stats.preferenceUpdates],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-semibold">{String(value)}</p>
              </div>
            ))}
          </div>

          <form className="mb-4 flex flex-wrap gap-2">
            <input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Search email"
              className="h-10 rounded-md border bg-background px-3 text-sm"
            />
            <select
              name="status"
              defaultValue={sp.status ?? ""}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All statuses</option>
              <option value="subscribed">Subscribed</option>
              <option value="partially_subscribed">Partial</option>
              <option value="paused">Paused</option>
              <option value="unsubscribed">Unsubscribed</option>
              <option value="complaint_blocked">Complaint</option>
              <option value="hard_bounce_blocked">Hard bounce</option>
              <option value="suppressed">Suppressed</option>
            </select>
            <button
              type="submit"
              className="h-10 rounded-md border px-4 text-sm hover:bg-muted"
            >
              Filter
            </button>
          </form>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Eligible</TableHead>
                  <TableHead>Pause until</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">
                      No preference records yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">
                        {row.emailNormalized}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{row.effectiveStatus}</Badge>
                      </TableCell>
                      <TableCell>{row.frequencyType}</TableCell>
                      <TableCell>
                        {row.eligibleForOutreach ? "yes" : "no"}
                      </TableCell>
                      <TableCell>
                        {row.pauseEndsAt
                          ? new Date(row.pauseEndsAt).toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {row.lastPreferenceUpdateAt
                          ? new Date(row.lastPreferenceUpdateAt).toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell>{row.source ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
