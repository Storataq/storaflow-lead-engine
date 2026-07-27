import type { Metadata } from "next";

import { EmailModulePlaceholder } from "@/components/email/email-module-placeholder";
import { EmailSubnav } from "@/components/email/email-subnav";
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
        description="Enrollment from Campaign Ready — gate helpers only, no enrollment writes yet."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Recipients" },
        ]}
      />
      <EmailSubnav currentPath="/email/recipients" />
      <EmailModulePlaceholder
        title="Recipient Engine"
        description="Uses Phase 20D campaign readiness previews. Suppression must block enrollment."
        upcoming={[
          "Import approved Campaign Ready leads",
          "Preferred email / name resolution",
          "Per-recipient sequence status",
        ]}
      />
    </div>
  );
}
