import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EmailSubnav } from "@/components/email/email-subnav";
import { SequenceEditorForm } from "@/components/email/sequence-editor-form";
import { PageHeader } from "@/components/layout/page-header";
import { listActiveTemplatesForCampaign } from "@/lib/email/campaign/queries";
import { getEmailSequence } from "@/lib/email/sequence/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: "Edit Sequence" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EditEmailSequencePage({ params }: PageProps) {
  const { id } = await params;
  const context = await getActiveOrganization();
  if (!context) return null;

  const [sequence, templates] = await Promise.all([
    getEmailSequence(context.organization.id, id),
    listActiveTemplatesForCampaign(context.organization.id),
  ]);

  if (!sequence) notFound();

  const locked =
    sequence.status === "archived" || sequence.status === "active";

  return (
    <div>
      <PageHeader
        title={`Edit · ${sequence.name}`}
        description={
          locked
            ? "Active/archived sequences cannot be edited. Duplicate or restore first."
            : "Save as draft. Run validation before publishing."
        }
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Sequences", href: "/email/sequences" },
          { label: sequence.name, href: `/email/sequences/${id}` },
          { label: "Edit" },
        ]}
      />
      <EmailSubnav currentPath="/email/sequences" />
      {locked ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          This sequence is locked. Publish creates immutable versions; active
          sequences require duplication for structural edits.
        </p>
      ) : (
        <SequenceEditorForm
          mode="edit"
          sequence={sequence}
          templates={templates}
        />
      )}
    </div>
  );
}
