import type { Metadata } from "next";
import Link from "next/link";

import { PlatformAdminSubnav } from "@/components/platform-admin/platform-admin-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PLATFORM_UI } from "@/lib/platform-admin/constants";
import {
  getPlatformDashboardStats,
  getSystemHealthSnapshot,
  listPlatformNotifications,
} from "@/lib/platform-admin/queries";

export const metadata: Metadata = { title: PLATFORM_UI.dashboardTitle };

export default async function PlatformAdminDashboardPage() {
  const [stats, health, notifications] = await Promise.all([
    getPlatformDashboardStats(),
    getSystemHealthSnapshot(),
    listPlatformNotifications(),
  ]);

  const widgets = [
    { label: "Total organizations", value: stats.totalOrganizations },
    { label: "Active organizations", value: stats.activeOrganizations },
    { label: "Trial organizations", value: stats.trialOrganizations },
    { label: "Expired trials", value: stats.expiredTrials },
    { label: "MRR", value: `€${(stats.mrrCents / 100).toFixed(2)}` },
    { label: "ARR (ready)", value: `€${(stats.arrCents / 100).toFixed(2)}` },
    { label: "Active users", value: stats.activeUsers },
    { label: "Total users", value: stats.totalUsers },
    { label: "API usage", value: stats.apiUsage },
    { label: "AI usage", value: stats.aiUsage },
    { label: "Storage (MB)", value: stats.storageUsageMb },
    { label: "Webhook activity", value: stats.webhookActivity },
  ] as const;

  return (
    <div>
      <PageHeader
        title={PLATFORM_UI.dashboardTitle}
        description={PLATFORM_UI.hubDescription}
        breadcrumbs={[{ label: PLATFORM_UI.hubTitle }]}
      />
      <PlatformAdminSubnav />

      <div className="mb-4 flex flex-wrap gap-2">
        <BadgeStatus
          label="System health"
          value={stats.systemHealth}
        />
        <BadgeStatus label="Platform status" value={stats.platformStatus} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {widgets.map((w) => (
          <Card key={w.label} className="shadow-none">
            <CardHeader className="pb-2">
              <CardDescription>{w.label}</CardDescription>
              <CardTitle className="text-2xl">{w.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">System health</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(health).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <span className="capitalize text-muted-foreground">{k}</span>
                <span>{v}</span>
              </div>
            ))}
            <Button
              nativeButton={false}
              variant="outline"
              size="sm"
              className="mt-2"
              render={<Link href="/platform-admin/monitoring" />}
            >
              Open monitoring
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Admin notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {notifications.length === 0 ? (
              <p className="text-muted-foreground">No notifications.</p>
            ) : (
              notifications.slice(0, 5).map((n) => (
                <p key={n.id}>
                  {n.title} · {n.severity}
                </p>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BadgeStatus({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-md border border-border px-2 py-1 text-xs">
      {label}: <strong>{value}</strong>
    </span>
  );
}
