import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmailSubnav } from "@/components/email/email-subnav";
import { TemplateRestoreVersionButton } from "@/components/email/template-action-buttons";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getEmailTemplate,
  listTemplateVersions,
} from "@/lib/email/template/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: "Template Versions" };

type PageProps = { params: Promise<{ id: string }> };

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function EmailTemplateVersionsPage({ params }: PageProps) {
  const { id } = await params;
  const context = await getActiveOrganization();
  if (!context) return null;

  const [template, versions] = await Promise.all([
    getEmailTemplate(context.organization.id, id),
    listTemplateVersions(context.organization.id, id),
  ]);

  if (!template) notFound();

  return (
    <div>
      <PageHeader
        title={`Versions · ${template.name}`}
        description="Immutable snapshots — published versions are never overwritten."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Templates", href: "/email/templates" },
          { label: template.name, href: `/email/templates/${id}` },
          { label: "Versions" },
        ]}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href={`/email/templates/${id}`} />}
          >
            Back to template
          </Button>
        }
      />
      <EmailSubnav currentPath="/email/templates" />

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Created</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No version history yet.
                </TableCell>
              </TableRow>
            ) : (
              versions.map((version) => (
                <TableRow key={version.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">v{version.version_number}</span>
                      {version.is_current ? (
                        <Badge variant="secondary">Current</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {version.subject}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {version.change_notes || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(version.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    {!version.is_current ? (
                      <TemplateRestoreVersionButton
                        templateId={id}
                        versionNumber={version.version_number}
                      />
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
