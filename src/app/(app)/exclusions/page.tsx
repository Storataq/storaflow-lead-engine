import type { Metadata } from "next";
import { Ban } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Uitsluitlijst",
};

export default function ExclusionsPage() {
  return (
    <div>
      <PageHeader
        title="Uitsluitlijst"
        description="Blokkeer domeinen, e-mailadressen, bedrijven, zoekwoorden of landen."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Uitsluitlijst" },
        ]}
      />
      <EmptyState
        icon={Ban}
        title="Uitsluitlijst is leeg"
        description="Uitsluitingen worden gecontroleerd vóór crawlen, opslaan en exporteren. Beheer volgt in een latere fase."
      />
    </div>
  );
}
