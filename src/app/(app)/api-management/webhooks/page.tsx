import type { Metadata } from "next";

import { ApiManagementSubnav } from "@/components/platform-api/api-management-subnav";
import { WebhooksManager } from "@/components/platform-api/webhooks-manager";
import { PageHeader } from "@/components/layout/page-header";
import {
  listPlatformWebhooks,
  listWebhookDeliveries,
} from "@/lib/platform-api/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: "Webhooks" };

export default async function WebhooksPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const canManage =
    context.membership.role === "owner" || context.membership.role === "admin";
  const [webhooks, deliveries] = await Promise.all([
    listPlatformWebhooks(context.organization.id),
    listWebhookDeliveries(context.organization.id, { limit: 40 }),
  ]);

  return (
    <div>
      <PageHeader
        title="Webhooks"
        description="Signed outbound events with retries, delivery logs, and HTTPS-only targets."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "API Management", href: "/api-management" },
          { label: "Webhooks" },
        ]}
      />
      <ApiManagementSubnav currentPath="/api-management/webhooks" />
      <WebhooksManager
        webhooks={webhooks}
        deliveries={deliveries}
        canManage={canManage}
      />
    </div>
  );
}
