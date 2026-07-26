import type { Metadata } from "next";

import { IntelligenceSourcesCenter } from "@/components/crm/intelligence-sources-center";
import { CrmSubnav } from "@/components/crm/crm-subnav";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Intelligence Sources",
};

export default function IntelligenceSourcesPage() {
  return (
    <div>
      <PageHeader
        title="Company Intelligence Sources"
        description="Sources Center ter voorbereiding op live connectors. Uitsluitend mock data — geen externe API's."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Company Intelligence", href: "/crm/intelligence" },
          { label: "Sources" },
        ]}
      />
      <CrmSubnav currentPath="/crm/intelligence/sources" />
      <IntelligenceSourcesCenter />
    </div>
  );
}
