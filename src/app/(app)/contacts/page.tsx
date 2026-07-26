import type { Metadata } from "next";
import { Suspense } from "react";

import { ContactsManager } from "@/components/contacts/contacts-manager";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import {
  listContactSignals,
  type ContactSignal,
} from "@/lib/contacts/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = {
  title: "Contactgegevens",
};

async function ContactsContent() {
  const context = await getActiveOrganization();
  if (!context) {
    return null;
  }

  let items: ContactSignal[] = [];
  let errorMessage: string | null = null;

  try {
    items = await listContactSignals(context.organization.id);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon contactgegevens niet laden. Probeer het opnieuw.",
    );
  }

  return (
    <ContactsManager initialItems={items} initialError={errorMessage} />
  );
}

export default function ContactsPage() {
  return (
    <div>
      <PageHeader
        title="Contactgegevens"
        description="Publieke zakelijke e-mailadressen en telefoonnummers uit mock scrapes."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Contactgegevens" },
        ]}
      />
      <Suspense fallback={<PageSkeleton filters={2} variant="table" />}>
        <ContactsContent />
      </Suspense>
    </div>
  );
}
