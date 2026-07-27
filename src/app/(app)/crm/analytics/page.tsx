import type { Metadata } from "next";
import Link from "next/link";

import { CrmSubnav } from "@/components/crm/crm-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDealValue } from "@/lib/crm/constants";
import { getPipelineAnalytics } from "@/lib/crm/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = {
  title: "Pipeline Analytics",
};

export default async function CrmAnalyticsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  let errorMessage: string | null = null;
  let analytics: Awaited<ReturnType<typeof getPipelineAnalytics>> | null =
    null;

  try {
    analytics = await getPipelineAnalytics(context.organization.id);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon analytics niet laden. Voer migratie 00028 uit indien nodig.",
    );
  }

  const forecastWidgets = [
    {
      label: "Pipeline Value",
      value: formatDealValue(analytics?.pipelineValue ?? 0),
    },
    {
      label: "Weighted Revenue",
      value: formatDealValue(analytics?.weightedRevenue ?? 0),
    },
    {
      label: "Expected Revenue",
      value: formatDealValue(analytics?.expectedRevenue ?? 0),
    },
    {
      label: "Monthly Forecast",
      value: formatDealValue(analytics?.monthlyForecast ?? 0),
    },
    {
      label: "Quarter Forecast",
      value: formatDealValue(analytics?.quarterForecast ?? 0),
    },
    {
      label: "Annual Forecast",
      value: formatDealValue(analytics?.annualForecast ?? 0),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Pipeline Analytics"
        description="Revenue forecast, conversion, win/loss analysis and stage distribution."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Analytics" },
        ]}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/crm/pipeline?view=deals" />}
          >
            Open deal board
          </Button>
        }
      />
      <CrmSubnav currentPath="/crm/analytics" />

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {forecastWidgets.map((widget) => (
              <Card key={widget.label} className="shadow-none">
                <CardHeader className="pb-2">
                  <CardDescription>{widget.label}</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">
                    {widget.value}
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Conversion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Open deals</span>
                  <span>{analytics?.openDeals ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Won</span>
                  <span>{analytics?.wonDeals ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lost</span>
                  <span>{analytics?.lostDeals ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Win rate</span>
                  <span>{analytics?.winRate ?? 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Loss rate</span>
                  <span>{analytics?.lossRate ?? 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg deal size</span>
                  <span>
                    {formatDealValue(analytics?.averageDealSize ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg sales cycle</span>
                  <span>
                    {analytics?.averageSalesCycleDays != null
                      ? `${analytics.averageSalesCycleDays} days`
                      : "—"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Deals per stage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(analytics?.dealsPerStage ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No open deals.</p>
                ) : (
                  analytics?.dealsPerStage.map((stage) => (
                    <div
                      key={stage.stageId}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.stageName}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {stage.count} · {formatDealValue(stage.value)}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">Won deal analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(analytics?.wonReasonBreakdown ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No won reasons yet.
                    </p>
                  ) : (
                    analytics?.wonReasonBreakdown.map((row) => (
                      <div
                        key={row.reason}
                        className="flex justify-between text-sm"
                      >
                        <span>{row.reason}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {row.count}
                        </span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">Lost deal analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(analytics?.lostReasonBreakdown ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No lost reasons yet.
                    </p>
                  ) : (
                    analytics?.lostReasonBreakdown.map((row) => (
                      <div
                        key={row.reason}
                        className="flex justify-between text-sm"
                      >
                        <span>{row.reason}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {row.count}
                        </span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
