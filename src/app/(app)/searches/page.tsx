import type { Metadata } from "next";
import { Search } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Zoekopdrachten",
};

export default function SearchesPage() {
  return (
    <div>
      <PageHeader
        title="Zoekopdrachten"
        description="Beheer zoekopdrachten op branche, plaats, regio en land."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Zoekopdrachten" },
        ]}
        actions={
          <Button nativeButton={false} render={<Link href="/searches/new" />}>
            Nieuwe zoekopdracht
          </Button>
        }
      />
      <EmptyState
        icon={Search}
        title="Nog geen zoekopdrachten"
        description="Maak een zoekopdracht aan om publieke bedrijfswebsites te ontdekken. Scraping volgt in een latere fase."
        actionLabel="Zoekopdracht aanmaken"
        actionHref="/searches/new"
      />
    </div>
  );
}
