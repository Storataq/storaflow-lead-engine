import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CampaignEditorForm } from "@/components/email/campaign-editor-form";
import { EmailSubnav } from "@/components/email/email-subnav";
import { PageHeader } from "@/components/layout/page-header";
import {
  getEmailCampaign,
  listActiveTemplatesForCampaign,
  listSenderProfiles,
} from "@/lib/email/campaign/queries";
import { listActiveSequencesForCampaign } from "@/lib/email/sequence/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: "Edit Campaign" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EditEmailCampaignPage({ params }: PageProps) {
  const { id } = await params;
  const context = await getActiveOrganization();
  if (!context) return null;

  const [campaign, templates, senders, sequences] = await Promise.all([
    getEmailCampaign(context.organization.id, id),
    listActiveTemplatesForCampaign(context.organization.id),
    listSenderProfiles(context.organization.id),
    listActiveSequencesForCampaign(context.organization.id),
  ]);

  if (!campaign) notFound();

  return (
    <div>
      <PageHeader
        title={`Edit · ${campaign.name}`}
        description={
          campaign.locked
            ? "This campaign is locked. Return to Draft before editing."
            : "Save changes as draft. Re-run validation after edits."
        }
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Campaigns", href: "/email/campaigns" },
          { label: campaign.name, href: `/email/campaigns/${id}` },
          { label: "Edit" },
        ]}
      />
      <EmailSubnav currentPath="/email/campaigns" />
      {campaign.locked ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Approved/archived campaigns cannot be edited here. Use Return to Draft
          on the detail page first.
        </p>
      ) : (
        <CampaignEditorForm
          mode="edit"
          campaign={campaign}
          templates={templates}
          sequences={sequences}
          senders={senders}
        />
      )}
    </div>
  );
}
