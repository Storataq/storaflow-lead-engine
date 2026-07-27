import type { Metadata } from "next";
import Link from "next/link";

import { IntegrationsMarketplace } from "@/components/integrations/integrations-marketplace";
import { PageErrorState } from "@/components/layout/page-error-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { buildMarketplaceDashboard } from "@/lib/integrations/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = { title: "Integrations Marketplace" };

export default async function IntegrationsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const canManage =
    context.membership.role === "owner" || context.membership.role === "admin";

  let errorMessage: string | null = null;
  let dashboard: Awaited<ReturnType<typeof buildMarketplaceDashboard>> | null =
    null;

  try {
    dashboard = await buildMarketplaceDashboard(context.organization.id);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Could not load marketplace. Apply migration 20260726000034_integrations_marketplace.sql if needed.",
    );
  }

  if (errorMessage || !dashboard) {
    return (
      <div>
        <PageHeader
          title="Integrations Marketplace"
          description="Connect third-party services without custom development."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Integrations" },
          ]}
        />
        <PageErrorState
          title="Integrations"
          description={errorMessage ?? "Unavailable"}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Integrations Marketplace"
        description="Browse, connect, and sync CRM, marketing, storage, AI, and automation providers."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Integrations" },
        ]}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            size="sm"
            render={<Link href="/integrations/sync-history" />}
          >
            Sync history
          </Button>
        }
      />
      <IntegrationsMarketplace
        catalog={dashboard.catalog}
        featured={dashboard.featured}
        connections={dashboard.connections}
        installedCodes={dashboard.installedCodes}
        canManage={canManage}
        stats={dashboard.stats}
      />
    </div>
  );
}
