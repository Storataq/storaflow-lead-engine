import type { Metadata } from "next";
import Link from "next/link";

import { LeadScoringSettingsForm } from "@/components/crm/lead-scoring-settings-form";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ensureLeadScoringSettings } from "@/lib/crm/lead-scoring/settings";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: "Lead Scoring Settings" };

export default async function LeadScoringSettingsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const settings = await ensureLeadScoringSettings(context.organization.id);

  return (
    <div>
      <PageHeader
        title="Lead Scoring Settings"
        description="Configure weights, classification thresholds, and automation triggers."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Lead Scoring", href: "/crm/scoring" },
          { label: "Settings" },
        ]}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/crm/scoring" />}
          >
            Back to scoring
          </Button>
        }
      />
      <LeadScoringSettingsForm settings={settings} />
    </div>
  );
}
