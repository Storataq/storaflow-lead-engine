import type { Metadata } from "next";

import { DevicesManager } from "@/components/security/devices-manager";
import { SecuritySubnav } from "@/components/security/security-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { SECURITY_UI } from "@/lib/security/constants";
import { listUserDevices } from "@/lib/security/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: SECURITY_UI.devicesTitle };

export default async function SecurityDevicesPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const devices = await listUserDevices(context.membership.user_id);

  return (
    <div>
      <PageHeader
        title={SECURITY_UI.devicesTitle}
        description="Trusted devices, first seen, last used, revoke."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: SECURITY_UI.hubTitle, href: "/security" },
          { label: SECURITY_UI.devicesTitle },
        ]}
      />
      <SecuritySubnav />
      <DevicesManager devices={devices} />
    </div>
  );
}
