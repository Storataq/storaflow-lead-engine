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
        description="Voeg later uitsluitingen toe om domeinen of contacten te blokkeren vóór crawlen, opslaan en exporteren."
        actionLabel="Naar instellingen"
        actionHref="/settings"
      />
    </div>
  );
}
