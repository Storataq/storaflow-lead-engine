import type { Metadata } from "next";

import { ApiManagementSubnav } from "@/components/platform-api/api-management-subnav";
import { ApiPlatformDashboard } from "@/components/platform-api/api-platform-dashboard";
import { PageErrorState } from "@/components/layout/page-error-state";
import { PageHeader } from "@/components/layout/page-header";
import { buildApiPlatformDashboard } from "@/lib/platform-api/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = { title: "API Management" };

export default async function ApiManagementPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const canManage =
    context.membership.role === "owner" || context.membership.role === "admin";

  let errorMessage: string | null = null;
  let dashboard: Awaited<ReturnType<typeof buildApiPlatformDashboard>> | null =
    null;
  try {
    dashboard = await buildApiPlatformDashboard(context.organization.id);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Could not load API platform. Apply migration 20260726000035_api_webhook_platform.sql if needed.",
    );
  }

  if (errorMessage || !dashboard) {
    return (
      <div>
        <PageHeader
          title="API & Webhooks"
          description="Secure platform API keys, outbound webhooks, and usage."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "API Management" },
          ]}
        />
        <ApiManagementSubnav currentPath="/api-management" />
        <PageErrorState
          title="API Management"
          description={errorMessage ?? "Unavailable"}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="API & Webhooks"
        description="Versioned REST API (/api/v1), API keys, signed webhooks, rate limits, and audit."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "API Management" },
        ]}
      />
      <ApiManagementSubnav currentPath="/api-management" />
      <ApiPlatformDashboard stats={dashboard.stats} canManage={canManage} />
    </div>
  );
}
