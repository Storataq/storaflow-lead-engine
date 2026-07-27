import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  EMAIL_CAMPAIGN_STATUS_LABELS,
  EMAIL_CAMPAIGN_TYPE_LABELS,
  type EmailCampaignStatusExtended,
  type EmailCampaignType,
} from "@/lib/email/campaign/constants";
import type { EmailCampaignRow } from "@/lib/email/campaign/queries";

type CampaignBuilderDashboardProps = {
  widgets: {
    active: number;
    completed: number;
    draft: number;
    paused: number;
    upcoming: EmailCampaignRow[];
    bestPerforming: EmailCampaignRow[];
    topEmails: Array<{
      campaignId: string;
      campaignName: string;
      subject: string;
      recipients: number;
    }>;
  };
  analytics?: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    replies: number;
    bounces: number;
    spamReports: number;
    unsubscribed: number;
    openRate: number;
    ctr: number;
    conversionRate: number;
  };
};

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function CampaignBuilderDashboard({
  widgets,
  analytics,
}: CampaignBuilderDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Active / scheduled" value={widgets.active} />
        <Metric label="Completed" value={widgets.completed} />
        <Metric label="Draft" value={widgets.draft} />
        <Metric label="Paused" value={widgets.paused} />
      </div>

      {analytics ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Email analytics</CardTitle>
            <CardDescription>
              Delivery and engagement widgets for the campaign dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              <Metric label="Sent" value={analytics.sent} />
              <Metric label="Delivered" value={analytics.delivered} />
              <Metric label="Opened" value={analytics.opened} />
              <Metric label="Clicked" value={analytics.clicked} />
              <Metric label="Replies" value={analytics.replies} />
              <Metric label="Bounces" value={analytics.bounces} />
              <Metric label="Spam reports" value={analytics.spamReports} />
              <Metric label="Unsubscribed" value={analytics.unsubscribed} />
              <Metric label="Open rate" value={`${analytics.openRate}%`} />
              <Metric label="CTR" value={`${analytics.ctr}%`} />
              <Metric
                label="Conversion rate"
                value={`${analytics.conversionRate}%`}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Upcoming sends</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {widgets.upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming sends.</p>
            ) : (
              widgets.upcoming.map((c) => (
                <Link
                  key={c.id}
                  href={`/email/campaigns/${c.id}`}
                  className="block rounded-lg border p-2 text-sm hover:bg-muted/40"
                >
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.scheduled_for
                      ? new Date(c.scheduled_for).toLocaleString()
                      : "Unscheduled"}{" "}
                    ·{" "}
                    {EMAIL_CAMPAIGN_STATUS_LABELS[
                      c.status as EmailCampaignStatusExtended
                    ] ?? c.status}
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Best performing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {widgets.bestPerforming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active/completed campaigns yet.
              </p>
            ) : (
              widgets.bestPerforming.map((c) => (
                <Link
                  key={c.id}
                  href={`/email/campaigns/${c.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm hover:bg-muted/40"
                >
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {EMAIL_CAMPAIGN_TYPE_LABELS[
                        c.campaign_type as EmailCampaignType
                      ] ?? c.campaign_type}
                    </p>
                  </div>
                  <Badge variant="outline">{c.readiness_score}</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Top performing emails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {widgets.topEmails.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No subjects locked yet.
              </p>
            ) : (
              widgets.topEmails.map((row) => (
                <Link
                  key={row.campaignId}
                  href={`/email/campaigns/${row.campaignId}`}
                  className="block rounded-lg border p-2 text-sm hover:bg-muted/40"
                >
                  <p className="font-medium">{row.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.campaignName} · {row.recipients} eligible
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
