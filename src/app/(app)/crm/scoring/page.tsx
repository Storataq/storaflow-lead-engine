import type { Metadata } from "next";
import Link from "next/link";

import { LeadScoringDashboard } from "@/components/crm/lead-scoring-dashboard";
import { PageHeader } from "@/components/layout/page-header";
import { PageErrorState } from "@/components/layout/page-error-state";
import { Button } from "@/components/ui/button";
import {
  buildLeadScoringLeaderboards,
  listOpenScoringAlerts,
  listScoredLeads,
} from "@/lib/crm/lead-scoring/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = { title: "AI Lead Scoring" };

export default async function LeadScoringPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  let errorMessage: string | null = null;
  let leaderboards: Awaited<ReturnType<typeof buildLeadScoringLeaderboards>> = {
    highest: [],
    fastestGrowing: [],
    biggestOpportunities: [],
    highestRisk: [],
    recentlyImproved: [],
    needsAttention: [],
    totals: { scored: 0, hot: 0, avgScore: 0 },
  };
  let alerts: Awaited<ReturnType<typeof listOpenScoringAlerts>> = [];
  let leads: Awaited<ReturnType<typeof listScoredLeads>> = [];

  try {
    const orgId = context.organization.id;
    [leaderboards, alerts, leads] = await Promise.all([
      buildLeadScoringLeaderboards(orgId),
      listOpenScoringAlerts(orgId),
      listScoredLeads(orgId, {}, 150),
    ]);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Could not load lead scoring. Apply migration 20260726000030_ai_lead_scoring_engine.sql if needed.",
    );
  }

  if (errorMessage) {
    return (
      <div>
        <PageHeader
          title="AI Lead Scoring"
          description="Explainable weighted lead scores across CRM."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "CRM", href: "/crm" },
            { label: "Lead Scoring" },
          ]}
        />
        <PageErrorState title="Lead Scoring" description={errorMessage} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="AI Lead Scoring"
        description="Transparent 0–100 scores with classifications, opportunity/risk, NBA, history, and alerts."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Lead Scoring" },
        ]}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/crm/scoring/settings" />}
          >
            Settings
          </Button>
        }
      />
      <LeadScoringDashboard
        leaderboards={leaderboards}
        alerts={alerts}
        leads={leads}
      />
    </div>
  );
}
