import type { Metadata } from "next";
import { Users } from "lucide-react";

import { EmailSubnav } from "@/components/email/email-subnav";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: "Email Recipients" };

export default async function EmailRecipientsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  return (
    <div>
      <PageHeader
        title="Recipients"
        description="Recipient enrollment and status live under Enrollments. Use Campaign Ready to prepare CRM leads."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Recipients" },
        ]}
      />
      <EmailSubnav currentPath="/email/recipients" />
      <EmptyState
        icon={Users}
        title="No dedicated recipients inbox yet"
        description="Enrollment status is available under Enrollments. Prepare CRM leads via Campaign Ready, then start an execution from Campaigns."
        actionLabel="Open enrollments"
        actionHref="/email/enrollments"
        secondaryActionLabel="Campaign Ready"
        secondaryActionHref="/crm/campaign-ready"
      />
    </div>
  );
}
