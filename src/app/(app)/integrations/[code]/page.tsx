import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { IntegrationDetailClient } from "@/components/integrations/integration-detail-client";
import { PageErrorState } from "@/components/layout/page-error-state";
import { PageHeader } from "@/components/layout/page-header";
import { getIntegrationManifest } from "@/lib/integrations/catalog";
import {
  listIntegrationConnections,
  listSyncRuns,
} from "@/lib/integrations/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

type PageProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { code } = await params;
  const manifest = getIntegrationManifest(code);
  return { title: manifest?.name ?? "Integration" };
}

export default async function IntegrationDetailPage({ params }: PageProps) {
  const { code } = await params;
  const manifest = getIntegrationManifest(code);
  if (!manifest) notFound();

  const context = await getActiveOrganization();
  if (!context) return null;

  const canManage =
    context.membership.role === "owner" || context.membership.role === "admin";

  let errorMessage: string | null = null;
  let connection = null;
  let syncRuns: Awaited<ReturnType<typeof listSyncRuns>> = [];

  try {
    const connections = await listIntegrationConnections(
      context.organization.id,
    );
    connection =
      connections.find(
        (c) =>
          c.integration_code === code &&
          c.status !== "disconnected",
      ) ??
      connections.find((c) => c.integration_code === code) ??
      null;
    if (connection) {
      syncRuns = await listSyncRuns(context.organization.id, {
        connectionId: connection.id,
        limit: 20,
      });
    }
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Could not load integration. Apply migration 20260726000034_integrations_marketplace.sql if needed.",
    );
  }

  if (errorMessage) {
    return (
      <div>
        <PageHeader
          title={manifest.name}
          description={manifest.description}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Integrations", href: "/integrations" },
            { label: manifest.name },
          ]}
        />
        <PageErrorState title={manifest.name} description={errorMessage} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={manifest.name}
        description={manifest.description}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Integrations", href: "/integrations" },
          { label: manifest.name },
        ]}
      />
      <IntegrationDetailClient
        manifest={manifest}
        connection={connection}
        syncRuns={syncRuns}
        canManage={canManage}
      />
    </div>
  );
}
