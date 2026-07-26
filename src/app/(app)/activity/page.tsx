import type { Metadata } from "next";
import { Activity } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Activiteiten",
};

export default function ActivityPage() {
  return (
    <div>
      <PageHeader
        title="Activiteiten"
        description="Auditlog van acties binnen je organisatie."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Activiteiten" },
        ]}
      />
      <EmptyState
        icon={Activity}
        title="Nog geen activiteiten"
        description="Gebeurtenissen zoals organisatie-aanmaak, statuswijzigingen en exports worden hier zichtbaar."
      />
    </div>
  );
}
