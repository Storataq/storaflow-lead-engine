import type { Metadata } from "next";
import { Download } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Exporteren",
};

export default function ExportsPage() {
  return (
    <div>
      <PageHeader
        title="Exporteren"
        description="Exporteer gefilterde leads naar CSV (en later Excel). Geblokkeerde contacten worden nooit meegenomen."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Exporteren" },
        ]}
      />
      <EmptyState
        icon={Download}
        title="Nog geen exports"
        description="Bouw eerst een leadlijst via zoekopdrachten en mock scrapes. Export volgt in een latere fase."
        actionLabel="Naar zoekopdrachten"
        actionHref="/zoekopdrachten"
        secondaryActionLabel="Naar bedrijven"
        secondaryActionHref="/companies"
      />
    </div>
  );
}
