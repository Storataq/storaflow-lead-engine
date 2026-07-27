import type { Metadata } from "next";

import { EmailSubnav } from "@/components/email/email-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  requestAICampaignInsightFormAction,
  dismissAIInsightFormAction,
} from "@/lib/email/ai/insight-actions";
import { listAIInsights } from "@/lib/email/ai/queries";
import { buildEmailAnalyticsDashboard } from "@/lib/email/analytics/service";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: "AI Analytics Insights" };

export default async function EmailAnalyticsInsightsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const [insights, dashboard] = await Promise.all([
    listAIInsights(context.organization.id),
    buildEmailAnalyticsDashboard({
      organizationId: context.organization.id,
      rangeKey: "last_30_days",
    }).catch(() => null),
  ]);

  return (
    <div>
      <PageHeader
        title="AI insights"
        description="Explainable observations grounded in Phase 21J metrics. Generated on demand — not on every page load. Correlation only."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Analytics", href: "/email/analytics" },
          { label: "AI Insights" },
        ]}
      />
      <EmailSubnav currentPath="/email/analytics" />

      <div className="mb-4 flex flex-wrap gap-2">
        <form action={requestAICampaignInsightFormAction}>
          <Button type="submit">Request new analysis</Button>
        </form>
      </div>

      {dashboard ? (
        <div className="mb-6 rounded-lg border p-4 text-sm text-muted-foreground">
          <p>
            Metric source: last 30 days · sample size {dashboard.sampleSize} ·{" "}
            {dashboard.warnings.length} data-quality warning(s)
          </p>
          <ul className="mt-2 list-disc pl-5">
            {dashboard.insights.slice(0, 5).map((i) => (
              <li key={i.code}>
                <span className="font-medium text-foreground">{i.title}</span>{" "}
                — {i.explanation}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-3">
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No stored AI insights yet. Rule-based analytics insights above are
            always available without AI.
          </p>
        ) : (
          insights.map((insight: {
            id: string;
            title: string;
            explanation: string;
            severity: string;
            confidence: string;
            review_status: string;
            generated_at: string;
          }) => (
            <div key={insight.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{insight.title}</h3>
                    <Badge variant="outline">{insight.severity}</Badge>
                    <Badge variant="outline">{insight.confidence}</Badge>
                    <Badge variant="outline">{insight.review_status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {insight.explanation}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Generated {new Date(insight.generated_at).toLocaleString()}
                  </p>
                </div>
                {insight.review_status === "open" ? (
                  <form action={dismissAIInsightFormAction}>
                    <input type="hidden" name="insightId" value={insight.id} />
                    <Button type="submit" variant="outline" size="sm">
                      Dismiss
                    </Button>
                  </form>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
