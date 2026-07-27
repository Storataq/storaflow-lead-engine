import type { Metadata } from "next";

import { EmailSubnav } from "@/components/email/email-subnav";
import { TemplateEditorForm } from "@/components/email/template-editor-form";
import { PageHeader } from "@/components/layout/page-header";
import { listTemplateFolders } from "@/lib/email/template/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: "New Email Template" };

export default async function NewEmailTemplatePage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const folders = await listTemplateFolders(context.organization.id);

  return (
    <div>
      <PageHeader
        title="New template"
        description="Draft a reusable email template with merge variables."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Templates", href: "/email/templates" },
          { label: "New" },
        ]}
      />
      <EmailSubnav currentPath="/email/templates" />
      <TemplateEditorForm mode="create" folders={folders} />
    </div>
  );
}
