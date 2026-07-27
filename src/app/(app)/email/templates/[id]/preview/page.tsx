import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmailSubnav } from "@/components/email/email-subnav";
import { TemplatePreviewPanel } from "@/components/email/template-preview-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  getEmailTemplate,
  listLeadsForTemplatePreview,
} from "@/lib/email/template/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: "Template Preview" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EmailTemplatePreviewPage({ params }: PageProps) {
  const { id } = await params;
  const context = await getActiveOrganization();
  if (!context) return null;

  const [template, leads] = await Promise.all([
    getEmailTemplate(context.organization.id, id),
    listLeadsForTemplatePreview(context.organization.id),
  ]);

  if (!template) notFound();

  return (
    <div>
      <PageHeader
        title={`Preview · ${template.name}`}
        description="Rendered with CRM lead data and fallbacks — no email is sent."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Templates", href: "/email/templates" },
          { label: template.name, href: `/email/templates/${id}` },
          { label: "Preview" },
        ]}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href={`/email/templates/${id}/edit`} />}
          >
            Edit
          </Button>
        }
      />
      <EmailSubnav currentPath="/email/templates" />
      <TemplatePreviewPanel template={template} leads={leads} />
    </div>
  );
}
