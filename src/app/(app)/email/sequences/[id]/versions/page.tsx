import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmailSubnav } from "@/components/email/email-subnav";
import { SequenceDuplicateButton } from "@/components/email/sequence-action-buttons";
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
import { compareSequenceVersions } from "@/lib/email/sequence/validation";
import {
  getEmailSequence,
  listSequenceVersions,
} from "@/lib/email/sequence/queries";
import { parseStepsJson } from "@/lib/email/sequence/steps";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: "Sequence Versions" };

type PageProps = { params: Promise<{ id: string }> };

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function EmailSequenceVersionsPage({ params }: PageProps) {
  const { id } = await params;
  const context = await getActiveOrganization();
  if (!context) return null;

  const orgId = context.organization.id;
  const [sequence, versions] = await Promise.all([
    getEmailSequence(orgId, id),
    listSequenceVersions(orgId, id),
  ]);

  if (!sequence) notFound();

  const currentSteps = parseStepsJson(sequence.steps_json);
  const latestPublished = versions[0];
  const comparison =
    latestPublished && versions[1]
      ? compareSequenceVersions(
          parseStepsJson(latestPublished.steps_json),
          parseStepsJson(versions[1].steps_json),
        )
      : null;

  return (
    <div>
      <PageHeader
        title={`Versions · ${sequence.name}`}
        description="Immutable published snapshots — historical versions are read-only."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Sequences", href: "/email/sequences" },
          { label: sequence.name, href: `/email/sequences/${id}` },
          { label: "Versions" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href={`/email/sequences/${id}`} />}
            >
              Back to sequence
            </Button>
            <SequenceDuplicateButton sequenceId={id} />
          </div>
        }
      />
      <EmailSubnav currentPath="/email/sequences" />

      {comparison ? (
        <div className="mb-4 rounded-lg border p-4 text-sm">
          <p className="font-medium">
            Compare v{latestPublished?.version_number} vs v
            {versions[1]?.version_number}
          </p>
          <ul className="mt-2 list-disc pl-5 text-muted-foreground">
            {comparison.added.length > 0 ? (
              <li>Added steps: {comparison.added.map((s) => s.name).join(", ")}</li>
            ) : null}
            {comparison.removed.length > 0 ? (
              <li>
                Removed steps: {comparison.removed.map((s) => s.name).join(", ")}
              </li>
            ) : null}
            {comparison.reordered ? <li>Steps reordered</li> : null}
            {comparison.changed.some((c) => c.fields.includes("email")) ? (
              <li>Template changes detected</li>
            ) : null}
            {comparison.changed.some((c) => c.fields.includes("delay")) ? (
              <li>Delay changes detected</li>
            ) : null}
          </ul>
        </div>
      ) : null}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Steps</TableHead>
              <TableHead>Published</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Current</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>v{sequence.version} (draft head)</TableCell>
              <TableCell>{sequence.status}</TableCell>
              <TableCell>{currentSteps.length}</TableCell>
              <TableCell>—</TableCell>
              <TableCell>Working copy</TableCell>
              <TableCell>
                {sequence.current_version_id ? (
                  <Badge variant="outline">draft</Badge>
                ) : (
                  "—"
                )}
              </TableCell>
            </TableRow>
            {versions.map((v) => (
              <TableRow key={v.id}>
                <TableCell>v{v.version_number}</TableCell>
                <TableCell>{v.status}</TableCell>
                <TableCell>
                  {parseStepsJson(v.steps_json).length}
                </TableCell>
                <TableCell>{formatDate(v.published_at)}</TableCell>
                <TableCell>{v.change_notes ?? "—"}</TableCell>
                <TableCell>
                  {v.is_current ? <Badge>current</Badge> : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {versions.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No published versions yet. Publish from the sequence detail page.
        </p>
      ) : null}
    </div>
  );
}
