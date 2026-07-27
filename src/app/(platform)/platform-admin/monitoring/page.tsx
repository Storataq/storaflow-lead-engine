import type { Metadata } from "next";

import { PlatformAdminSubnav } from "@/components/platform-admin/platform-admin-subnav";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePlatformAdmin } from "@/lib/platform-admin/auth";
import { PLATFORM_UI } from "@/lib/platform-admin/constants";
import {
  getPlatformDashboardStats,
  getSystemHealthSnapshot,
} from "@/lib/platform-admin/queries";

export const metadata: Metadata = { title: PLATFORM_UI.monitoringTitle };

export default async function PlatformMonitoringPage() {
  await requirePlatformAdmin();
  const [health, stats] = await Promise.all([
    getSystemHealthSnapshot(),
    getPlatformDashboardStats(),
  ]);

  return (
    <div>
      <PageHeader
        title={PLATFORM_UI.monitoringTitle}
        description="API, database, queue, AI, email, storage, webhooks, auth."
        breadcrumbs={[
          { label: PLATFORM_UI.hubTitle, href: "/platform-admin" },
          { label: PLATFORM_UI.monitoringTitle },
        ]}
      />
      <PlatformAdminSubnav />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(health).map(([k, v]) => (
          <Card key={k} className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base capitalize">{k}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{v}</CardContent>
          </Card>
        ))}
      </div>
      <Card className="mt-6 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Usage analytics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3 text-sm">
          <p>Orgs: {stats.totalOrganizations}</p>
          <p>API requests: {stats.apiUsage}</p>
          <p>AI: {stats.aiUsage}</p>
          <p>Users: {stats.totalUsers}</p>
          <p>Webhooks: {stats.webhookActivity}</p>
          <p>Storage MB: {stats.storageUsageMb}</p>
        </CardContent>
      </Card>
    </div>
  );
}
