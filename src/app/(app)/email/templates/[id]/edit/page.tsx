import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EmailSubnav } from "@/components/email/email-subnav";
import { TemplateEditorForm } from "@/components/email/template-editor-form";
import { PageHeader } from "@/components/layout/page-header";
import {
  getEmailTemplate,
  listTemplateFolders,
} from "@/lib/email/template/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: "Edit Email Template" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EditEmailTemplatePage({ params }: PageProps) {
  const { id } = await params;
  const context = await getActiveOrganization();
  if (!context) return null;

  const [template, folders] = await Promise.all([
    getEmailTemplate(context.organization.id, id),
    listTemplateFolders(context.organization.id),
  ]);

  if (!template) notFound();

  return (
    <div>
      <PageHeader
        title={`Edit · ${template.name}`}
        description="Saving an active template with content changes creates a new version."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Templates", href: "/email/templates" },
          { label: template.name, href: `/email/templates/${id}` },
          { label: "Edit" },
        ]}
      />
      <EmailSubnav currentPath="/email/templates" />
      <TemplateEditorForm mode="edit" template={template} folders={folders} />
    </div>
  );
}
