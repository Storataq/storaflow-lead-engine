import type { Metadata } from "next";

import { CampaignReadyManager } from "@/components/crm/campaign-ready-manager";
import { CrmSubnav } from "@/components/crm/crm-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { PageErrorState } from "@/components/layout/page-error-state";
import { listCampaignReady } from "@/lib/crm/funnel-activation/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = {
  title: "Campaign Ready",
};

export default async function CampaignReadyPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  let items = null;
  let errorMessage: string | null = null;

  try {
    items = await listCampaignReady(context.organization.id);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon campaign-ready lijst niet laden. Voer migratie 20260726000010_funnel_activation.sql uit indien nog niet gedaan.",
    );
  }

  if (errorMessage) {
    return (
      <div>
        <PageHeader
          title="Campaign Ready"
          description="Leads prepared for future email campaigns."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "CRM", href: "/crm" },
            { label: "Campaign Ready" },
          ]}
        />
        <CrmSubnav currentPath="/crm/campaign-ready" />
        <PageErrorState title="Campaign Ready" description={errorMessage} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Campaign Ready"
        description="Queue for future Automated Email Engine enrollment — no sending."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Campaign Ready" },
        ]}
      />
      <CrmSubnav currentPath="/crm/campaign-ready" />
      <CampaignReadyManager items={items ?? []} />
    </div>
  );
}
