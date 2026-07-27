import type { Metadata } from "next";

import { ApiKeysManager } from "@/components/platform-api/api-keys-manager";
import { ApiManagementSubnav } from "@/components/platform-api/api-management-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { listPlatformApiKeys } from "@/lib/platform-api/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: "API Keys" };

export default async function ApiKeysPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const canManage =
    context.membership.role === "owner" || context.membership.role === "admin";
  const keys = await listPlatformApiKeys(context.organization.id);

  return (
    <div>
      <PageHeader
        title="API keys"
        description="Create, rotate, and revoke keys. Secrets are shown once and stored as hashes."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "API Management", href: "/api-management" },
          { label: "API keys" },
        ]}
      />
      <ApiManagementSubnav currentPath="/api-management/keys" />
      <ApiKeysManager keys={keys} canManage={canManage} />
    </div>
  );
}
