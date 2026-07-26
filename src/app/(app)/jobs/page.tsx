import type { Metadata } from "next";
import { ListTodo } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Scrapingtaken",
};

export default function JobsPage() {
  return (
    <div>
      <PageHeader
        title="Scrapingtaken"
        description="Volg queued, lopende en afgeronde scrapingtaken."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Scrapingtaken" },
        ]}
      />
      <EmptyState
        icon={ListTodo}
        title="Nog geen scrapingtaken"
        description="Taken worden aangemaakt wanneer je een zoekopdracht start. De worker verwerkt queued jobs buiten de webrequest."
      />
    </div>
  );
}
