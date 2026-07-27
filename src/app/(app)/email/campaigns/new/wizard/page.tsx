import type { Metadata } from "next";

import { CampaignWizard } from "@/components/email/campaign-wizard";
import { EmailSubnav } from "@/components/email/email-subnav";
import { PageHeader } from "@/components/layout/page-header";
import {
  listActiveTemplatesForCampaign,
  listSenderProfiles,
} from "@/lib/email/campaign/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: "Campaign Wizard" };

export default async function CampaignWizardPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const [templates, senders] = await Promise.all([
    listActiveTemplatesForCampaign(context.organization.id),
    listSenderProfiles(context.organization.id),
  ]);

  return (
    <div>
      <PageHeader
        title="Campaign wizard"
        description="Guided draft creation — save anytime. Validation and approval happen on the detail page."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Campaigns", href: "/email/campaigns" },
          { label: "Wizard" },
        ]}
      />
      <EmailSubnav currentPath="/email/campaigns" />
      <CampaignWizard templates={templates} senders={senders} />
    </div>
  );
}
