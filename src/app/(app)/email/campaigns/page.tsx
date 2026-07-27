import type { Metadata } from "next";
import Link from "next/link";

import { CampaignsManager } from "@/components/email/campaigns-manager";
import { EmailSubnav } from "@/components/email/email-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { PageErrorState } from "@/components/layout/page-error-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getCampaignDashboardStats,
  listEmailCampaigns,
} from "@/lib/email/campaign/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = { title: "Email Campaigns" };

export default async function EmailCampaignsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  let campaigns = null;
  let stats = null;
  let errorMessage: string | null = null;

  try {
    campaigns = await listEmailCampaigns(context.organization.id);
    stats = await getCampaignDashboardStats(context.organization.id);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Could not load campaigns. Apply migration 20260726000013_campaign_manager.sql if needed.",
    );
  }

  if (errorMessage) {
    return (
      <div>
        <PageHeader
          title="Campaigns"
          description="Campaign Manager — prepare and approve outreach (no sending)."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Email Engine", href: "/email" },
            { label: "Campaigns" },
          ]}
        />
        <EmailSubnav currentPath="/email/campaigns" />
        <PageErrorState title="Campaigns" description={errorMessage} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Create, validate and approve campaigns from Campaign Ready — no emails are sent."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Campaigns" },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/email/campaigns/new/builder" />}
            >
              AI Builder
            </Button>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/email/campaigns/calendar" />}
            >
              Calendar
            </Button>
            <Button
              nativeButton={false}
              render={<Link href="/email/campaigns/new/wizard" />}
            >
              New campaign
            </Button>
          </div>
        }
      />
      <EmailSubnav currentPath="/email/campaigns" />

      {stats ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["Draft", stats.draft],
              ["Needs review", stats.needsReview],
              ["Ready", stats.ready],
              ["Approved", stats.approved],
              ["Eligible recipients", stats.totalEligible],
              ["Excluded", stats.totalExcluded],
              ["Blocking errors", stats.withBlockingErrors],
              ["Avg readiness", stats.averageReadinessScore],
            ] as const
          ).map(([label, value]) => (
            <Card key={label} className="shadow-none">
              <CardHeader className="pb-2">
                <CardDescription>{label}</CardDescription>
                <CardTitle className="text-base">{value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : null}

      <CampaignsManager campaigns={campaigns ?? []} />
    </div>
  );
}
