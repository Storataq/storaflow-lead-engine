import type { Metadata } from "next";
import Link from "next/link";

import { EmailSubnav } from "@/components/email/email-subnav";
import { SequencesManager } from "@/components/email/sequences-manager";
import { PageHeader } from "@/components/layout/page-header";
import { PageErrorState } from "@/components/layout/page-error-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getSequenceDashboardStats,
  listEmailSequences,
} from "@/lib/email/sequence/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = { title: "Email Sequences" };

export default async function EmailSequencesPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const orgId = context.organization.id;
  let sequences = null;
  let stats = null;
  let errorMessage: string | null = null;

  try {
    [sequences, stats] = await Promise.all([
      listEmailSequences(orgId),
      getSequenceDashboardStats(orgId),
    ]);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Could not load sequences. Apply migration 20260726000014_email_sequence_engine.sql if needed.",
    );
  }

  if (errorMessage) {
    return (
      <div>
        <PageHeader
          title="Sequences"
          description="Multi-step email flows — structure and validation only."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Email Engine", href: "/email" },
            { label: "Sequences" },
          ]}
        />
        <EmailSubnav currentPath="/email/sequences" />
        <PageErrorState title="Sequences" description={errorMessage} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Sequences"
        description="Create, version and validate multi-step flows — no sending or scheduling yet."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Sequences" },
        ]}
        actions={
          <Button
            nativeButton={false}
            render={<Link href="/email/sequences/new" />}
          >
            New sequence
          </Button>
        }
      />
      <EmailSubnav currentPath="/email/sequences" />

      {stats ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <CardDescription>Draft</CardDescription>
              <CardTitle className="text-base">{stats.draft}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <CardDescription>Active</CardDescription>
              <CardTitle className="text-base">{stats.active}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <CardDescription>With errors</CardDescription>
              <CardTitle className="text-base">{stats.withErrors}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <CardDescription>Used by campaigns</CardDescription>
              <CardTitle className="text-base">{stats.usedByCampaigns}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      ) : null}

      <SequencesManager sequences={sequences ?? []} />
    </div>
  );
}
