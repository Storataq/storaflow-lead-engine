import type { Metadata } from "next";
import Link from "next/link";

import { CampaignBuilderDashboard } from "@/components/email/campaign-builder-dashboard";
import { CampaignCalendar } from "@/components/email/campaign-calendar";
import { EmailSubnav } from "@/components/email/email-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { PageErrorState } from "@/components/layout/page-error-state";
import { Button } from "@/components/ui/button";
import { buildCampaignPerformanceWidgets } from "@/lib/email/campaign-builder/queries";
import { listEmailCampaigns } from "@/lib/email/campaign/queries";
import {
  getDeliveryOverview,
} from "@/lib/email/provider";
import { getEngagementOverview } from "@/lib/email/tracking";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = { title: "Campaign Calendar" };

export default async function CampaignCalendarPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  let errorMessage: string | null = null;
  let campaigns: Awaited<ReturnType<typeof listEmailCampaigns>> = [];
  let widgets = buildCampaignPerformanceWidgets([]);
  let analytics = {
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    replies: 0,
    bounces: 0,
    spamReports: 0,
    unsubscribed: 0,
    openRate: 0,
    ctr: 0,
    conversionRate: 0,
  };

  try {
    campaigns = await listEmailCampaigns(context.organization.id);
    widgets = buildCampaignPerformanceWidgets(campaigns);
    const [delivery, engagement] = await Promise.all([
      getDeliveryOverview(context.organization.id),
      getEngagementOverview(context.organization.id),
    ]);
    const sent = delivery.sent ?? 0;
    const delivered = delivery.delivered ?? 0;
    const opened = engagement.uniqueOpens ?? 0;
    const clicked = engagement.uniqueClicks ?? 0;
    const openRate =
      delivered > 0 ? Math.round((opened / delivered) * 1000) / 10 : 0;
    const ctr =
      delivered > 0 ? Math.round((clicked / delivered) * 1000) / 10 : 0;
    analytics = {
      sent,
      delivered,
      opened,
      clicked,
      replies: engagement.repliedMessages ?? 0,
      bounces: (delivery.softBounced ?? 0) + (delivery.hardBounced ?? 0),
      spamReports: delivery.complained ?? 0,
      unsubscribed: 0,
      openRate,
      ctr,
      conversionRate: ctr,
    };
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Could not load campaign calendar. Apply migration 20260726000029 if needed.",
    );
  }

  if (errorMessage) {
    return (
      <div>
        <PageHeader
          title="Campaign Calendar"
          description="Schedule view for drafts, running, and completed campaigns."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Email Engine", href: "/email" },
            { label: "Calendar" },
          ]}
        />
        <EmailSubnav currentPath="/email/campaigns/calendar" />
        <PageErrorState title="Calendar" description={errorMessage} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Campaign Calendar & Dashboard"
        description="Performance widgets, upcoming sends, and a visual calendar of campaign activity."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Calendar" },
        ]}
        actions={
          <Button
            nativeButton={false}
            render={<Link href="/email/campaigns/new/builder" />}
          >
            AI Builder
          </Button>
        }
      />
      <EmailSubnav currentPath="/email/campaigns/calendar" />
      <div className="space-y-8">
        <CampaignBuilderDashboard widgets={widgets} analytics={analytics} />
        <CampaignCalendar campaigns={campaigns} />
      </div>
    </div>
  );
}
