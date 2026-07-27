import type { Metadata } from "next";

import { EmailSubnav } from "@/components/email/email-subnav";
import { SequenceEditorForm } from "@/components/email/sequence-editor-form";
import { PageHeader } from "@/components/layout/page-header";
import { listActiveTemplatesForCampaign } from "@/lib/email/campaign/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: "New Email Sequence" };

export default async function NewEmailSequencePage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const templates = await listActiveTemplatesForCampaign(
    context.organization.id,
  );

  return (
    <div>
      <PageHeader
        title="New sequence"
        description="Build a draft multi-step flow. Publish locks template versions."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Sequences", href: "/email/sequences" },
          { label: "New" },
        ]}
      />
      <EmailSubnav currentPath="/email/sequences" />
      <SequenceEditorForm mode="create" templates={templates} />
    </div>
  );
}
