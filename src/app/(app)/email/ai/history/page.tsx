import type { Metadata } from "next";
import Link from "next/link";

import { EmailSubnav } from "@/components/email/email-subnav";
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
import { AI_GENERATION_TYPE_LABELS } from "@/lib/email/ai/constants";
import { listAIGenerations } from "@/lib/email/ai/queries";
import { getAIProviderDiagnostics } from "@/lib/email/ai/provider";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: "AI Generation History" };

export default async function EmailAIHistoryPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const [generations, diagnostics] = await Promise.all([
    listAIGenerations({
      organizationId: context.organization.id,
      limit: 75,
    }),
    Promise.resolve(getAIProviderDiagnostics()),
  ]);

  return (
    <div>
      <PageHeader
        title="AI history"
        description="Audit trail of AI-assisted drafts. Outputs require human review and never send automatically."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "AI History" },
        ]}
      />
      <EmailSubnav currentPath="/email/ai/history" />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>
          Provider: {diagnostics.preferredProvider}
          {diagnostics.openaiConfigured ? " (configured)" : " (not configured)"}
        </span>
        <Badge variant="outline">
          Auto-actions: always off
        </Badge>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/settings/ai" />}
        >
          AI settings
        </Button>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/email/ai/reply" />}
        >
          Reply assistant
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {generations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No AI generations yet. Enable AI in settings and use the
                  writing panel on a template.
                </TableCell>
              </TableRow>
            ) : (
              generations.map((g: {
                id: string;
                generation_type: string;
                approval_state: string;
                model: string | null;
                confidence: string | null;
                created_at: string;
              }) => (
                <TableRow key={g.id}>
                  <TableCell>
                    {AI_GENERATION_TYPE_LABELS[
                      g.generation_type as keyof typeof AI_GENERATION_TYPE_LABELS
                    ] ?? g.generation_type}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{g.approval_state}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {g.model ?? "—"}
                  </TableCell>
                  <TableCell>{g.confidence ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(g.created_at).toLocaleString()}
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
