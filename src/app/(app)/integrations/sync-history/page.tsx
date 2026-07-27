import type { Metadata } from "next";
import Link from "next/link";

import { IntegrationSyncHistory } from "@/components/integrations/integration-sync-history";
import { PageErrorState } from "@/components/layout/page-error-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  listIntegrationConnections,
  listSyncRuns,
} from "@/lib/integrations/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = { title: "Integration Sync History" };

export default async function IntegrationSyncHistoryPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  let errorMessage: string | null = null;
  let runs: Awaited<ReturnType<typeof listSyncRuns>> = [];
  const connectionLabels: Record<string, string> = {};

  try {
    const connections = await listIntegrationConnections(
      context.organization.id,
    );
    for (const c of connections) {
      connectionLabels[c.id] =
        `${c.integration_code}::${c.display_name ?? c.integration_code}`;
    }
    runs = await listSyncRuns(context.organization.id, { limit: 100 });
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Could not load sync history. Apply migration 20260726000034_integrations_marketplace.sql if needed.",
    );
  }

  if (errorMessage) {
    return (
      <div>
        <PageHeader
          title="Sync history"
          description="Manual, scheduled, incremental, and full synchronization runs."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Integrations", href: "/integrations" },
            { label: "Sync history" },
          ]}
        />
        <PageErrorState title="Sync history" description={errorMessage} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Sync history"
        description="Started, finished, duration, imported/exported records, warnings, and errors."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Integrations", href: "/integrations" },
          { label: "Sync history" },
        ]}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            size="sm"
            render={<Link href="/integrations" />}
          >
            Back to marketplace
          </Button>
        }
      />
      <IntegrationSyncHistory runs={runs} connectionLabels={connectionLabels} />
    </div>
  );
}
