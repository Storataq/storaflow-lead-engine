import type { Metadata } from "next";

import { ConnectorsManager } from "@/components/connectors/connectors-manager";
import { PageHeader } from "@/components/layout/page-header";
import { listRegisteredManifests } from "@/lib/scraping/registry";

export const metadata: Metadata = {
  title: "Connectors",
};

export default function ConnectorsPage() {
  const connectors = listRegisteredManifests();

  return (
    <div>
      <PageHeader
        title="Connector Management"
        description="Modulaire wereldwijde connectors — momenteel uitsluitend mock (geen netwerk)."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Connectors" },
        ]}
      />
      <ConnectorsManager connectors={connectors} />
    </div>
  );
}
