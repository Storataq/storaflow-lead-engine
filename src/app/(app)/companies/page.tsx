import type { Metadata } from "next";
import { Building2 } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Bedrijven",
};

export default function CompaniesPage() {
  return (
    <div>
      <PageHeader
        title="Bedrijven"
        description="Overzicht van gevonden bedrijven met status, bron en contacten."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Bedrijven" },
        ]}
      />
      <EmptyState
        icon={Building2}
        title="Nog geen bedrijven"
        description="Bedrijven verschijnen hier na discovery en website-crawling. Filters en statusbeheer volgen in een latere fase."
      />
    </div>
  );
}
