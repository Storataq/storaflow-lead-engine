import type { Metadata } from "next";

import { EmailSubnav } from "@/components/email/email-subnav";
import { PageHeader } from "@/components/layout/page-header";
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
  getDeliveryOverview,
  listRecentProviderEvents,
} from "@/lib/email/provider";
import {
  getEngagementOverview,
  listRecentTrackingEvents,
} from "@/lib/email/tracking";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: "Email Analytics" };

export default async function EmailAnalyticsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const [overview, engagement, recentEvents, recentTracking] = await Promise.all([
    getDeliveryOverview(context.organization.id),
    getEngagementOverview(context.organization.id),
    listRecentProviderEvents(context.organization.id, 12),
    listRecentTrackingEvents(context.organization.id, 12),
  ]);

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Delivery, engagement, and operational email metrics. AI insights summarize Phase 21J data on demand."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Analytics" },
        ]}
      />
      <EmailSubnav currentPath="/email/analytics" />
      <div className="mb-4">
        <a
          href="/email/analytics/insights"
          className="text-sm font-medium underline-offset-4 hover:underline"
        >
          Open AI insights →
        </a>
      </div>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {[
          ["Prepared", overview.prepared],
          ["Sent", overview.sent],
          ["Delivered", overview.delivered],
          ["Delayed", overview.delayed],
          ["Soft bounces", overview.softBounced],
          ["Hard bounces", overview.hardBounced],
          ["Complaints", overview.complained],
          ["Rejected", overview.rejected],
          ["Failed", overview.failed],
          ["Opened", engagement.openedMessages],
          ["Unique opens", engagement.uniqueOpens],
          ["Clicked", engagement.clickedMessages],
          ["Unique clicks", engagement.uniqueClicks],
          ["Replied", engagement.repliedMessages],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{String(value)}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border">
        <div className="border-b px-4 py-3">
          <h2 className="font-medium">Recent provider events</h2>
          <p className="text-sm text-muted-foreground">
            Verified inbound webhook events correlated to outbound dispatch rows.
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Normalized</TableHead>
                <TableHead>Processing</TableHead>
                <TableHead>Correlation</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    No provider events yet.
                  </TableCell>
                </TableRow>
              ) : (
                recentEvents.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.provider}</TableCell>
                    <TableCell>{row.eventType}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.normalizedEventType}</Badge>
                    </TableCell>
                    <TableCell>{row.processingStatus}</TableCell>
                    <TableCell>{row.correlationStatus}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.providerMessageId ?? "—"}
                    </TableCell>
                    <TableCell>{new Date(row.receivedAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="mt-6 rounded-lg border">
        <div className="border-b px-4 py-3">
          <h2 className="font-medium">Recent engagement events</h2>
          <p className="text-sm text-muted-foreground">
            Privacy-aware app-side open, click and reply tracking.
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Occurred</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTracking.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    No tracking events yet.
                  </TableCell>
                </TableRow>
              ) : (
                recentTracking.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Badge variant="outline">{row.eventType}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[420px] truncate">
                      {row.targetUrl ?? "—"}
                    </TableCell>
                    <TableCell>{new Date(row.occurredAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
