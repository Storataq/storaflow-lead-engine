import type { Metadata } from "next";

import { CrmSubnav } from "@/components/crm/crm-subnav";
import { NotesManager } from "@/components/crm/notes-manager";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { listLeads, listNotes } from "@/lib/crm/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = {
  title: "Notities",
};

export default async function CrmNotesPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  let notes: Awaited<ReturnType<typeof listNotes>> = [];
  let leads: Awaited<ReturnType<typeof listLeads>> = [];
  let errorMessage: string | null = null;
  try {
    [notes, leads] = await Promise.all([
      listNotes(context.organization.id),
      listLeads(context.organization.id),
    ]);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon notities niet laden. Voer migratie 000008 uit als tabellen ontbreken.",
    );
  }

  return (
    <div>
      <PageHeader
        title="Notities"
        description="Rijke tekstnotities, chronologisch per lead."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Notities" },
        ]}
      />
      <CrmSubnav currentPath="/crm/notes" />
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : (
        <NotesManager notes={notes} leads={leads} />
      )}
    </div>
  );
}
