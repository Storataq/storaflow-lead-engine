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
  listPlatformAuditEvents,
  listPlatformSubscriptions,
} from "@/lib/platform-admin/queries";

export const metadata: Metadata = { title: PLATFORM_UI.supportTitle };

export default async function PlatformSupportPage() {
  await requirePlatformAdmin();
  const [audit, subs] = await Promise.all([
    listPlatformAuditEvents(30),
    listPlatformSubscriptions(20),
  ]);

  return (
    <div>
      <PageHeader
        title={PLATFORM_UI.supportTitle}
        description="Org logs, audit, billing history, API/webhook views for support."
        breadcrumbs={[
          { label: PLATFORM_UI.hubTitle, href: "/platform-admin" },
          { label: PLATFORM_UI.supportTitle },
        ]}
      />
      <PlatformAdminSubnav />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Recent platform audit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {audit.length === 0 ? (
              <p className="text-muted-foreground">{PLATFORM_UI.emptyAudit}</p>
            ) : (
              audit.map((a) => (
                <p key={a.id}>
                  {a.action} · {a.admin_email ?? "—"} ·{" "}
                  {a.affected_organization_id?.slice(0, 8) ?? "—"}
                </p>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Billing snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {subs.map((s) => (
              <p key={s.id}>
                {s.organizationName} · {s.status} · {s.plan?.name ?? "—"}
              </p>
            ))}
          </CardContent>
        </Card>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Session / automation / API / webhook deep-links reuse org security,
        billing, and platform-api modules.
      </p>
    </div>
  );
}
