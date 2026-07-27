/**
 * Copilot awareness of connected marketplace integrations (no secrets).
 */

import { listIntegrationConnections } from "@/lib/integrations/queries";
import { getIntegrationManifest } from "@/lib/integrations/catalog";

export type ConnectedIntegrationSummary = {
  code: string;
  name: string;
  status: string;
  healthStatus: string;
  features: string[];
};

export async function listConnectedIntegrationsForCopilot(
  organizationId: string,
): Promise<ConnectedIntegrationSummary[]> {
  const connections = await listIntegrationConnections(organizationId);
  return connections
    .filter((c) => c.status === "connected" || c.status === "needs_reauth")
    .map((c) => {
      const manifest = getIntegrationManifest(c.integration_code);
      return {
        code: c.integration_code,
        name: manifest?.name ?? c.display_name ?? c.integration_code,
        status: c.status,
        healthStatus: c.health_status,
        features: manifest?.features ?? [],
      };
    });
}

export function formatConnectedIntegrationsLine(
  connected: ConnectedIntegrationSummary[],
): string {
  if (connected.length === 0) {
    return "No marketplace integrations are connected. Suggest opening /integrations to connect HubSpot, Slack, Google Workspace, etc.";
  }
  return `Connected services: ${connected
    .map((c) => `${c.name} (${c.status})`)
    .join(", ")}.`;
}
