import type { Metadata } from "next";
import Link from "next/link";

import { SecuritySubnav } from "@/components/security/security-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SECURITY_UI } from "@/lib/security/constants";
import {
  ensureSecurityPolicies,
  getSecurityDashboardStats,
  listLoginAttempts,
  listSecurityAlerts,
} from "@/lib/security/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { formatDateTime } from "@/lib/ui/format";

export const metadata: Metadata = { title: SECURITY_UI.hubTitle };

export default async function SecurityDashboardPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  await ensureSecurityPolicies(
    context.organization.id,
    context.membership.user_id,
  );

  const [stats, alerts, attempts] = await Promise.all([
    getSecurityDashboardStats(context.organization.id),
    listSecurityAlerts(context.organization.id),
    listLoginAttempts(context.organization.id, 8),
  ]);

  const widgets = [
    { label: "Recent logins (7d)", value: stats.recentLogins },
    { label: "Failed logins (7d)", value: stats.failedLogins },
    { label: "Active sessions", value: stats.activeSessions },
    { label: "Devices", value: stats.devices },
    { label: "MFA adoption", value: stats.mfaEnabledUsers },
    { label: "Open alerts", value: stats.openAlerts },
    { label: "Permission changes", value: stats.permissionChanges },
    { label: "Audit events (7d)", value: stats.auditEvents },
  ] as const;

  return (
    <div>
      <PageHeader
        title={SECURITY_UI.dashboardTitle}
        description={SECURITY_UI.hubDescription}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: SECURITY_UI.hubTitle },
        ]}
      />
      <SecuritySubnav />
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
            <CardTitle className="text-base">Recent login attempts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {attempts.length === 0 ? (
              <p className="text-muted-foreground">No attempts yet.</p>
            ) : (
              attempts.map((a) => (
                <div key={a.id} className="flex justify-between gap-2">
                  <span>
                    {a.email ?? "—"} · {a.success ? "OK" : "Fail"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(a.created_at)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Open alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {alerts.filter((a) => a.status === "open").slice(0, 5).map((a) => (
              <p key={a.id}>{a.title}</p>
            ))}
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/security/alerts" />}
            >
              View alerts
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
