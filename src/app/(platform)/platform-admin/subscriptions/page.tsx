import type { Metadata } from "next";

import { PlatformAdminSubnav } from "@/components/platform-admin/platform-admin-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { requirePlatformAdmin } from "@/lib/platform-admin/auth";
import { PLATFORM_UI } from "@/lib/platform-admin/constants";
import { listPlatformSubscriptions } from "@/lib/platform-admin/queries";
import { formatDateTime } from "@/lib/ui/format";

export const metadata: Metadata = { title: PLATFORM_UI.subscriptionsTitle };

export default async function PlatformSubscriptionsPage() {
  await requirePlatformAdmin();
  const subs = await listPlatformSubscriptions();

  return (
    <div>
      <PageHeader
        title={PLATFORM_UI.subscriptionsTitle}
        description="Plans, trials, seats, renewals across all tenants."
        breadcrumbs={[
          { label: PLATFORM_UI.hubTitle, href: "/platform-admin" },
          { label: PLATFORM_UI.subscriptionsTitle },
        ]}
      />
      <PlatformAdminSubnav />
      <ul className="space-y-2">
        {subs.map((s) => (
          <li
            key={s.id}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            <div className="flex flex-wrap gap-2">
              <span className="font-medium">{s.organizationName}</span>
              <Badge variant="outline">{s.status}</Badge>
              <Badge variant="secondary">{s.plan?.name ?? "—"}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Seats {s.seats_purchased} · interval {s.billing_interval} · renew{" "}
              {s.current_period_end
                ? formatDateTime(s.current_period_end)
                : "—"}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
