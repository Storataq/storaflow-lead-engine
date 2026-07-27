import type { Metadata } from "next";

import { CampaignEditorForm } from "@/components/email/campaign-editor-form";
import { EmailSubnav } from "@/components/email/email-subnav";
import { PageHeader } from "@/components/layout/page-header";
import {
  listActiveTemplatesForCampaign,
  listSenderProfiles,
} from "@/lib/email/campaign/queries";
import { listActiveSequencesForCampaign } from "@/lib/email/sequence/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: "New Campaign" };

export default async function NewEmailCampaignPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const [templates, senders, sequences] = await Promise.all([
    listActiveTemplatesForCampaign(context.organization.id),
    listSenderProfiles(context.organization.id),
    listActiveSequencesForCampaign(context.organization.id),
  ]);

  return (
    <div>
      <PageHeader
        title="New campaign"
        description="Create a draft campaign. Use the wizard for a guided flow."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Campaigns", href: "/email/campaigns" },
          { label: "New" },
        ]}
      />
      <EmailSubnav currentPath="/email/campaigns" />
      <CampaignEditorForm
        mode="create"
        templates={templates}
        sequences={sequences}
        senders={senders}
      />
    </div>
  );
}
