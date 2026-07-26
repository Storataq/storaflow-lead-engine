import type { Metadata } from "next";
import { Mail } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Contactgegevens",
};

export default function ContactsPage() {
  return (
    <div>
      <PageHeader
        title="Contactgegevens"
        description="Publieke zakelijke e-mailadressen, telefoonnummers en contactformulieren."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Contactgegevens" },
        ]}
      />
      <EmptyState
        icon={Mail}
        title="Nog geen contactgegevens"
        description="Alleen duidelijk gepubliceerde zakelijke contacten worden bewaard. Extractie volgt in de scraperfase."
      />
    </div>
  );
}
