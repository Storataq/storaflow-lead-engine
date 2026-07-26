import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Nieuwe zoekopdracht",
};

export default function NewSearchPage() {
  return (
    <div>
      <PageHeader
        title="Nieuwe zoekopdracht"
        description="Formulier volgt in fase 2. De datastructuur en statusflow zijn al voorbereid."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Zoekopdrachten", href: "/searches" },
          { label: "Nieuw" },
        ]}
      />
      <Card className="max-w-2xl border-dashed shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Binnenkort beschikbaar</CardTitle>
          <CardDescription>
            Velden zoals zoekterm, branche, plaats, regio, land en bronnen worden
            in de volgende fase aangesloten op server actions en de database.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Status na opslaan: <code>draft</code>. Daarna kun je een scrape-job
          starten via de worker.
        </CardContent>
      </Card>
    </div>
  );
}
