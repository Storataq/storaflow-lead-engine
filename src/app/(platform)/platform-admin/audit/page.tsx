import type { Metadata } from "next";

import { PlatformAdminSubnav } from "@/components/platform-admin/platform-admin-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { requirePlatformAdmin } from "@/lib/platform-admin/auth";
import { PLATFORM_UI } from "@/lib/platform-admin/constants";
import { listPlatformAuditEvents } from "@/lib/platform-admin/queries";
import { formatDateTime } from "@/lib/ui/format";

export const metadata: Metadata = { title: PLATFORM_UI.auditTitle };

export default async function PlatformAuditPage() {
  await requirePlatformAdmin();
  const events = await listPlatformAuditEvents(200);

  return (
    <div>
      <PageHeader
        title={PLATFORM_UI.auditTitle}
        description="Every platform action — admin, timestamp, org, user, old/new, IP."
        breadcrumbs={[
          { label: PLATFORM_UI.hubTitle, href: "/platform-admin" },
          { label: PLATFORM_UI.auditTitle },
        ]}
      />
      <PlatformAdminSubnav />
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">{PLATFORM_UI.emptyAudit}</p>
      ) : (
        <ul className="space-y-2">
          {events.map((e) => (
            <li
              key={e.id}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              <p className="font-medium">{e.action}</p>
              <p className="text-xs text-muted-foreground">
                {e.admin_email ?? e.admin_user_id ?? "—"} ·{" "}
                {formatDateTime(e.created_at)} · IP {e.ip_address ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                Org {e.affected_organization_id ?? "—"} · User{" "}
                {e.affected_user_id ?? "—"}
              </p>
              {e.description ? <p>{e.description}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
