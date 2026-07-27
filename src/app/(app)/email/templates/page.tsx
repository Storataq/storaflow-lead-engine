import type { Metadata } from "next";
import Link from "next/link";

import { EmailSubnav } from "@/components/email/email-subnav";
import { TemplatesManager } from "@/components/email/templates-manager";
import { PageHeader } from "@/components/layout/page-header";
import { PageErrorState } from "@/components/layout/page-error-state";
import { Button } from "@/components/ui/button";
import {
  ensureDefaultTemplateFolders,
  ensureLibraryPlaceholders,
  listEmailTemplates,
} from "@/lib/email/template/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = { title: "Email Templates" };

export default async function EmailTemplatesPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const orgId = context.organization.id;
  let templates = null;
  let folders = null;
  let errorMessage: string | null = null;

  try {
    folders = await ensureDefaultTemplateFolders(orgId);
    await ensureLibraryPlaceholders(orgId, context.membership.user_id);
    templates = await listEmailTemplates(orgId);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Could not load templates. Apply migration 20260726000012_email_template_engine.sql if needed.",
    );
  }

  if (errorMessage) {
    return (
      <div>
        <PageHeader
          title="Templates"
          description="Email template & personalization engine — no sending."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Email Engine", href: "/email" },
            { label: "Templates" },
          ]}
        />
        <EmailSubnav currentPath="/email/templates" />
        <PageErrorState title="Templates" description={errorMessage} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Templates"
        description="Create, version, preview and personalize email templates — no AI generation, no sending."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Templates" },
        ]}
        actions={
          <Button
            nativeButton={false}
            render={<Link href="/email/templates/new" />}
          >
            New template
          </Button>
        }
      />
      <EmailSubnav currentPath="/email/templates" />
      <TemplatesManager
        templates={templates ?? []}
        folders={folders ?? []}
      />
    </div>
  );
}
