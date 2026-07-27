import type { Metadata } from "next";

import { ProspectSearchForm } from "@/components/prospecting/prospect-search-form";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  PROSPECT_RECOMMENDATION_LABELS,
  PROSPECTING_UI,
  type ProspectRecommendation,
} from "@/lib/prospecting/constants";
import {
  bootstrapProspecting,
  getProspectingDashboard,
} from "@/lib/prospecting/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: PROSPECTING_UI.overviewTitle };

export default async function ProspectingOverviewPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  await bootstrapProspecting(
    context.organization.id,
    context.membership.user_id,
  );
  const stats = await getProspectingDashboard(context.organization.id);

  const metrics = [
    { label: "Prospects", value: stats.totalProspects },
    { label: "New (7d)", value: stats.newProspects },
    { label: "Top opportunities", value: stats.topOpportunities },
    { label: "Avg lead score", value: stats.avgScore },
    { label: "Scored", value: stats.scoredCount },
    { label: "CRM linked", value: stats.crmLinked },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={PROSPECTING_UI.hubTitle}
        description="Find, research, score, and prepare high-quality company leads — powered by the AI Agent Platform."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardHeader className="pb-2">
              <CardDescription>{m.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{m.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & add</CardTitle>
          <CardDescription>
            Filter by branche, locatie, grootte, technologie, tags — or research a single company.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProspectSearchForm />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Lead score verdeling</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Object.entries(stats.scoreBuckets).map(([bucket, count]) => (
              <div key={bucket} className="flex justify-between">
                <span>{bucket}</span>
                <span className="tabular-nums">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Branche verdeling</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Object.entries(stats.classDistribution)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([cls, count]) => (
                <div key={cls} className="flex justify-between">
                  <span>{cls}</span>
                  <span className="tabular-nums">{count}</span>
                </div>
              ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Landen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Object.entries(stats.countryDistribution)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([country, count]) => (
                <div key={country} className="flex justify-between">
                  <span>{country}</span>
                  <span className="tabular-nums">{count}</span>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI aanbevelingen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {stats.recentRecommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scored prospects yet.</p>
          ) : (
            stats.recentRecommendations.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
              >
                <span className="truncate font-medium">{r.company_name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{r.lead_score}</Badge>
                  <Badge variant="secondary">
                    {PROSPECT_RECOMMENDATION_LABELS[
                      r.recommendation as ProspectRecommendation
                    ] ?? r.recommendation}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
