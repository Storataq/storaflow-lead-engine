import type { Metadata } from "next";

import { PlatformAdminSubnav } from "@/components/platform-admin/platform-admin-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { requirePlatformAdmin } from "@/lib/platform-admin/auth";
import {
  LICENSE_TYPE_LABELS,
  PLATFORM_UI,
  type LicenseType,
} from "@/lib/platform-admin/constants";
import { listPlatformLicenses } from "@/lib/platform-admin/queries";

export const metadata: Metadata = { title: PLATFORM_UI.licensesTitle };

export default async function PlatformLicensesPage() {
  await requirePlatformAdmin();
  const licenses = await listPlatformLicenses();

  return (
    <div>
      <PageHeader
        title={PLATFORM_UI.licensesTitle}
        description="Seat, enterprise, white-label, partner, and lifetime licenses."
        breadcrumbs={[
          { label: PLATFORM_UI.hubTitle, href: "/platform-admin" },
          { label: PLATFORM_UI.licensesTitle },
        ]}
      />
      <PlatformAdminSubnav />
      {licenses.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No licenses yet. Create from organization detail support tools.
        </p>
      ) : (
        <ul className="space-y-2">
          {licenses.map((l) => (
            <li
              key={l.id}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              <Badge variant="outline">
                {LICENSE_TYPE_LABELS[l.license_type as LicenseType] ??
                  l.license_type}
              </Badge>
              <Badge className="ml-2" variant="secondary">
                {l.status}
              </Badge>
              <p className="mt-1 text-muted-foreground">
                Org {l.organization_id.slice(0, 8)}… · seats {l.seats}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
