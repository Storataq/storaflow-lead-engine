"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  Minus,
  Presentation,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/layout/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  buildExecutiveDashboardData,
  DATE_RANGE_OPTIONS,
  EXECUTIVE_DASHBOARD_NOTICE,
  type DashboardFilters,
  type DateRangeKey,
  type DrawerKind,
} from "@/lib/crm/executive-dashboard";
import { formatDealValue } from "@/lib/crm/constants";
import type {
  CrmDealRow,
  CrmLeadWithRelations,
  CrmTaskRow,
  OrgMemberOption,
} from "@/lib/crm/queries";
import { cn } from "@/lib/utils";

type ExecutiveCrmDashboardProps = {
  leads: CrmLeadWithRelations[];
  deals: CrmDealRow[];
  tasks: CrmTaskRow[];
  members: OrgMemberOption[];
};

const DEFAULT_FILTERS: DashboardFilters = {
  dateRange: "30d",
  customFrom: null,
  customTo: null,
  source: "all",
  qualification: "all",
  opportunityClass: "all",
  pipelineStage: "all",
  dealStatus: "all",
  priority: "all",
  outreachReadiness: "all",
  industry: "all",
  channel: "all",
};

function TrendIcon({
  direction,
}: {
  direction: "up" | "down" | "flat";
}) {
  if (direction === "up") return <ArrowUpRight className="size-3.5 text-emerald-600" />;
  if (direction === "down") return <ArrowDownRight className="size-3.5 text-red-600" />;
  return <Minus className="size-3.5 text-muted-foreground" />;
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const width = max <= 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate text-muted-foreground">{label}</span>
        <span className="tabular-nums font-medium">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-foreground/70"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function severityClass(severity: string): string {
  switch (severity) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-800";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    default:
      return "border-sky-200 bg-sky-50 text-sky-800";
  }
}

export function ExecutiveCrmDashboard({
  leads,
  deals,
  tasks,
  members,
}: ExecutiveCrmDashboardProps) {
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const [now] = useState(() => new Date());
  const [tick, setTick] = useState(0);
  const [drawer, setDrawer] = useState<DrawerKind>(null);
  const [pipelineFilter, setPipelineFilter] = useState<string | null>(null);

  const data = useMemo(() => {
    void tick;
    return buildExecutiveDashboardData({
      leads,
      deals,
      tasks,
      members,
      filters: {
        ...filters,
        pipelineStage: pipelineFilter ?? filters.pipelineStage,
      },
      now,
    });
  }, [leads, deals, tasks, members, filters, now, tick, pipelineFilter]);

  const industries = useMemo(() => {
    const set = new Set(
      leads.map((lead) => lead.industry).filter((value): value is string => Boolean(value)),
    );
    return [...set].sort();
  }, [leads]);

  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `executive-dashboard-${filters.dateRange}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Dashboard export gedownload (JSON)");
  }

  const drawerItems =
    drawer && drawer !== null ? data.drawerLists[drawer] ?? [] : [];

  const maxFunnel = Math.max(...data.funnel.map((stage) => stage.count), 1);
  const maxSeries = Math.max(
    ...data.series.leadsOverTime.map((point) => point.value),
    1,
  );
  const maxForecast = Math.max(
    ...data.revenue.monthly.map((point) => point.estimate),
    1,
  );

  if (leads.length === 0 && deals.length === 0) {
    return (
      <EmptyState
        icon={Presentation}
        title="Nog geen CRM-data"
        description="Voeg leads of deals toe om het Executive Dashboard te vullen."
        actionLabel="Naar Leads"
        actionHref="/crm/leads"
      />
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Alert>
          <AlertDescription>{EXECUTIVE_DASHBOARD_NOTICE}</AlertDescription>
        </Alert>

        {/* Header controls */}
        <Card className="shadow-none">
          <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Executive CRM Dashboard</p>
              <p className="text-xs text-muted-foreground">
                Periode: {data.rangeLabel} · Last updated{" "}
                {new Intl.DateTimeFormat("nl-NL", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(data.generatedAt))}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                value={filters.dateRange}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    dateRange: event.target.value as DateRangeKey,
                  }))
                }
              >
                {DATE_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {filters.dateRange === "custom" ? (
                <>
                  <Input
                    type="date"
                    className="w-auto"
                    value={filters.customFrom ?? ""}
                    onChange={(event) =>
                      setFilters((prev) => ({
                        ...prev,
                        customFrom: event.target.value || null,
                      }))
                    }
                  />
                  <Input
                    type="date"
                    className="w-auto"
                    value={filters.customTo ?? ""}
                    onChange={(event) =>
                      setFilters((prev) => ({
                        ...prev,
                        customTo: event.target.value || null,
                      }))
                    }
                  />
                </>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label="Dashboard vernieuwen"
                onClick={() => setTick((value) => value + 1)}
              >
                <RefreshCw className="size-3.5" aria-hidden />
                Refresh
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label="Dashboard exporteren als JSON"
                onClick={exportJson}
              >
                <Download className="size-3.5" aria-hidden />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Dashboard Filters</CardTitle>
            <CardDescription>Lokale filters — geen extra server requests</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <select
              className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={filters.qualification}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  qualification: event.target.value,
                }))
              }
            >
              <option value="all">All qualifications</option>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
              <option value="unqualified">Unqualified</option>
            </select>
            <select
              className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={filters.opportunityClass}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  opportunityClass: event.target.value,
                }))
              }
            >
              <option value="all">All opportunity classes</option>
              <option value="strategic">Strategic</option>
              <option value="high_potential">High Potential</option>
              <option value="promising">Promising</option>
              <option value="nurture">Nurture</option>
              <option value="low_potential">Low Potential</option>
              <option value="insufficient_data">Insufficient Data</option>
            </select>
            <select
              className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={filters.dealStatus}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  dealStatus: event.target.value,
                }))
              }
            >
              <option value="all">All deal statuses</option>
              <option value="open">Open</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
            <select
              className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={filters.outreachReadiness}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  outreachReadiness: event.target.value,
                }))
              }
            >
              <option value="all">All readiness</option>
              <option value="ready">Ready</option>
              <option value="almost_ready">Almost Ready</option>
              <option value="needs_enrichment">Needs Enrichment</option>
              <option value="blocked">Blocked</option>
            </select>
            <select
              className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={filters.source}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, source: event.target.value }))
              }
            >
              <option value="all">All sources</option>
              <option value="google_maps">Google Maps</option>
              <option value="google_search">Google Search</option>
              <option value="company_website">Company Website</option>
              <option value="linkedin">LinkedIn</option>
              <option value="manual">Manual</option>
              <option value="import">Import</option>
            </select>
            <select
              className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={filters.channel}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, channel: event.target.value }))
              }
            >
              <option value="all">All channels</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="linkedin">LinkedIn</option>
              <option value="manual_research">Manual Research</option>
            </select>
            <select
              className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={filters.priority}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  priority: event.target.value,
                }))
              }
            >
              <option value="all">All priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={filters.industry}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  industry: event.target.value,
                }))
              }
            >
              <option value="all">All industries</option>
              {industries.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* KPIs */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">Primary KPIs</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {data.kpis.map((kpi) => (
              <button
                key={kpi.key}
                type="button"
                className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40"
                onClick={() => kpi.drawer && setDrawer(kpi.drawer)}
              >
                <div className="flex items-start justify-between gap-2">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span className="cursor-help text-xs text-muted-foreground underline-offset-2 hover:underline" />
                      }
                    >
                      {kpi.label}
                    </TooltipTrigger>
                    <TooltipContent>{kpi.tooltip}</TooltipContent>
                  </Tooltip>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendIcon direction={kpi.trend.direction} />
                    {kpi.trend.percentage}%
                  </span>
                </div>
                <p className="mt-2 text-xl font-semibold tabular-nums">
                  {kpi.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {kpi.trend.previousLabel}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* Funnel + Pipeline */}
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Lead Funnel</CardTitle>
              <CardDescription>Stage counts & drop-off</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.funnel.length === 0 ? (
                <p className="text-sm text-muted-foreground">Empty funnel</p>
              ) : (
                data.funnel.map((stage) => (
                  <div key={stage.id} className="space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="font-medium">{stage.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {stage.count} · {stage.percentOfTotal}%
                        {stage.conversionFromPrevious !== null
                          ? ` · conv ${stage.conversionFromPrevious}%`
                          : ""}
                        {stage.dropOffCount > 0
                          ? ` · drop ${stage.dropOffCount}`
                          : ""}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted">
                      <div
                        className="h-2.5 rounded-full bg-foreground/70"
                        style={{
                          width: `${Math.round((stage.count / maxFunnel) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Pipeline Overview</CardTitle>
              <CardDescription>
                Klik een stage om te filteren (geen auto-move)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.pipeline.map((stage) => (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() =>
                    setPipelineFilter((current) =>
                      current === stage.match ? null : stage.match,
                    )
                  }
                  className={cn(
                    "flex w-full flex-col gap-1 rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40",
                    pipelineFilter === stage.match && "bg-muted/50",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{stage.label}</span>
                    <span className="tabular-nums">{stage.count}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDealValue(stage.totalValue)} · avg{" "}
                    {formatDealValue(stage.averageValue)} · conv{" "}
                    {stage.conversionProbability}% · age {stage.averageAgeDays}d
                    · stalled {stage.stalledCount}
                  </p>
                </button>
              ))}
              {pipelineFilter ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setPipelineFilter(null)}
                >
                  Clear stage filter
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Conversion + Revenue */}
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Conversion Analytics</CardTitle>
              <CardDescription>
                Best: {data.conversionHighlights.bestStage} · Weakest:{" "}
                {data.conversionHighlights.weakestStage}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.conversions.map((metric) => (
                <div
                  key={metric.id}
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{metric.label}</span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      {metric.rate}%
                      <TrendIcon direction={metric.trend.direction} />
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Prev {metric.previousRate}% · Δ {metric.difference} ·{" "}
                    {metric.explanation}
                  </p>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Largest drop-off: {data.conversionHighlights.largestDropOff} ·
                Avg duration {data.conversionHighlights.averageDurationDays}d
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Revenue Forecast</CardTitle>
              <CardDescription>All values are estimates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                {[
                  ["Current Pipeline", formatDealValue(data.revenue.currentPipelineValue)],
                  ["Weighted Pipeline", formatDealValue(data.revenue.weightedPipelineValue)],
                  ["Expected This Month", formatDealValue(data.revenue.expectedThisMonth)],
                  ["Expected Next Month", formatDealValue(data.revenue.expectedNextMonth)],
                  ["Expected Quarter", formatDealValue(data.revenue.expectedThisQuarter)],
                  ["Won Revenue", formatDealValue(data.revenue.wonRevenue)],
                  ["At-Risk Revenue", formatDealValue(data.revenue.atRiskRevenue)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border px-3 py-2">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-medium tabular-nums">{value}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Monthly forecast</p>
                {data.revenue.monthly.map((point) => (
                  <BarRow
                    key={point.month}
                    label={point.month}
                    value={point.estimate}
                    max={maxForecast}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Qualification + Opportunities */}
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Qualification Analytics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Hot", data.qualification.hot],
                  ["Warm", data.qualification.warm],
                  ["Cold", data.qualification.cold],
                  ["Unqualified", data.qualification.unqualified],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border px-3 py-2">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-semibold tabular-nums">{value}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Avg qual {data.qualification.averageQualificationScore} · opp{" "}
                {data.qualification.averageOpportunityScore} · readiness{" "}
                {data.qualification.averageOutreachReadiness} · confidence{" "}
                {data.qualification.averageDataConfidence}
              </p>
              <div className="space-y-2">
                {data.qualification.channelDistribution.map((item) => (
                  <BarRow
                    key={item.key}
                    label={item.label}
                    value={item.count}
                    max={Math.max(
                      ...data.qualification.channelDistribution.map((d) => d.count),
                      1,
                    )}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Opportunity Analytics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ["Strategic", data.opportunities.strategic],
                  ["High Potential", data.opportunities.highPotential],
                  ["Promising", data.opportunities.promising],
                  ["Nurture", data.opportunities.nurture],
                  ["Low Potential", data.opportunities.lowPotential],
                  ["Insufficient Data", data.opportunities.insufficientData],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border px-3 py-2">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-semibold tabular-nums">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {data.opportunities.cards.map((card) => (
                  <Link
                    key={card.label + card.id}
                    href={card.href ?? "/crm/opportunities"}
                    className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/40"
                  >
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                    <p className="font-medium">{card.value}</p>
                    {card.secondary ? (
                      <p className="text-xs text-muted-foreground">
                        {card.secondary}
                      </p>
                    ) : null}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sources + Deals */}
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Source Performance</CardTitle>
              <CardDescription>Simulated source assignment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.sources.slice(0, 8).map((source) => (
                <button
                  key={source.id}
                  type="button"
                  className="flex w-full flex-col gap-1 rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-muted/40"
                  onClick={() => setDrawer("source_detail")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{source.name}</span>
                    <Badge variant="secondary">simulated</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {source.leadsDiscovered} leads · {source.leadsQualified}{" "}
                    qualified · {source.conversionRate}% · conf{" "}
                    {source.sourceConfidence}% ·{" "}
                    {formatDealValue(source.estimatedValue)}
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Deal Analytics</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 text-sm">
              {[
                ["Total Deals", String(data.deals.totalDeals)],
                ["Open Deals", String(data.deals.openDeals)],
                ["Won Deals", String(data.deals.wonDeals)],
                ["Lost Deals", String(data.deals.lostDeals)],
                ["Win Rate", `${data.deals.winRate}%`],
                ["Avg Deal Value", formatDealValue(data.deals.averageDealValue)],
                ["Avg Sales Cycle", `${data.deals.averageSalesCycleDays}d`],
                ["Won Revenue", formatDealValue(data.deals.totalWonRevenue)],
                ["Expected Revenue", formatDealValue(data.deals.expectedRevenue)],
                ["Stalled Deals", String(data.deals.stalledDeals)],
              ].map(([label, value]) => (
                <button
                  key={label}
                  type="button"
                  className="rounded-lg border border-border px-3 py-2 text-left hover:bg-muted/40"
                  onClick={() =>
                    label === "Stalled Deals" ? setDrawer("stalled_deals") : undefined
                  }
                >
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-medium tabular-nums">{value}</p>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Outreach + Tasks */}
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Outreach Readiness</CardTitle>
              <CardDescription>
                Technical checklist only — no legal approval
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Ready for Email", data.outreach.readyEmail],
                  ["Ready for Phone", data.outreach.readyPhone],
                  ["Manual Research", data.outreach.readyManual],
                  ["Needs Enrichment", data.outreach.needsEnrichment],
                  ["Blocked", data.outreach.blocked],
                  ["Excluded", data.outreach.excluded],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border px-3 py-2">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-semibold tabular-nums">{value}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {data.outreach.missingRequirements.map((item) => (
                  <BarRow
                    key={item.key}
                    label={item.label}
                    value={item.count}
                    max={Math.max(
                      ...data.outreach.missingRequirements.map((r) => r.count),
                      1,
                    )}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Task & Follow-up Analytics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ["Open", data.tasks.open],
                  ["Overdue", data.tasks.overdue],
                  ["Due Today", data.tasks.dueToday],
                  ["Due This Week", data.tasks.dueThisWeek],
                  ["Completed", data.tasks.completed],
                  ["Follow-ups Required", data.tasks.followUpsRequired],
                  ["Leads Without Follow-up", data.tasks.leadsWithoutFollowUp],
                  ["High Priority", data.tasks.highPriority],
                ].map(([label, value]) => (
                  <button
                    key={label}
                    type="button"
                    className="rounded-lg border border-border px-3 py-2 text-left hover:bg-muted/40"
                    onClick={() =>
                      label === "Overdue" ? setDrawer("overdue_tasks") : undefined
                    }
                  >
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-semibold tabular-nums">{value}</p>
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {data.taskList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Geen taken.</p>
                ) : (
                  data.taskList.slice(0, 6).map((task) => (
                    <div
                      key={task.id}
                      className="rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <p className="font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.companyName ?? "—"} · {task.priority} ·{" "}
                        {task.status} · {task.ownerLabel}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts series */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Leads over time</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.series.leadsOverTime.map((point) => (
                <BarRow
                  key={point.label}
                  label={point.label}
                  value={point.value}
                  max={maxSeries}
                />
              ))}
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Opportunities over time</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.series.opportunitiesOverTime.map((point) => (
                <BarRow
                  key={point.label}
                  label={point.label}
                  value={point.value}
                  max={Math.max(
                    ...data.series.opportunitiesOverTime.map((p) => p.value),
                    1,
                  )}
                />
              ))}
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Pipeline value by stage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.series.pipelineValueByStage.slice(0, 6).map((point) => (
                <BarRow
                  key={point.label}
                  label={point.label}
                  value={point.value}
                  max={Math.max(
                    ...data.series.pipelineValueByStage.map((p) => p.value),
                    1,
                  )}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Alerts + Activity + Summary */}
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Executive Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Geen alerts.</p>
              ) : (
                data.alerts.map((alert) => (
                  <button
                    key={alert.id}
                    type="button"
                    className="w-full rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-muted/40"
                    onClick={() => alert.drawer && setDrawer(alert.drawer)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn("border", severityClass(alert.severity))}
                      >
                        {alert.severity}
                      </Badge>
                      <span className="font-medium">{alert.title}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {alert.description}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {alert.relatedLabel} · {alert.suggestedAction}
                    </p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Recent CRM Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">Geen activiteit.</p>
              ) : (
                data.activity.slice(0, 10).map((event) => (
                  <div
                    key={event.id}
                    className="rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{event.title}</p>
                      <Badge variant="secondary">{event.module}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {event.companyName ?? "—"} · {event.actor}
                    </p>
                    {event.href ? (
                      <Link
                        href={event.href}
                        className="mt-1 inline-block text-xs underline-offset-4 hover:underline"
                      >
                        Open
                      </Link>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Executive Summary</CardTitle>
            <CardDescription>
              Rule-based summary · not AI-generated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {data.summary.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </CardContent>
        </Card>

        {/* Top performers */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">
            Top Performers
          </h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(
              [
                ["Highest scoring leads", data.topPerformers.highestScoringLeads],
                [
                  "Highest value opportunities",
                  data.topPerformers.highestValueOpportunities,
                ],
                [
                  "Best converting sources",
                  data.topPerformers.bestConvertingSources,
                ],
                [
                  "Most active pipeline stages",
                  data.topPerformers.mostActivePipelineStages,
                ],
                [
                  "Highest expected-value deals",
                  data.topPerformers.highestExpectedValueDeals,
                ],
                [
                  "Most complete profiles",
                  data.topPerformers.mostCompleteProfiles,
                ],
              ] as const
            ).map(([title, items]) => (
              <Card key={title} className="shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">—</p>
                  ) : (
                    items.map((item) => (
                      <Link
                        key={item.id + item.label}
                        href={item.href ?? "#"}
                        className="flex items-center justify-between gap-2 text-sm hover:underline"
                      >
                        <span className="truncate">{item.label}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {item.value}
                        </span>
                      </Link>
                    ))
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Sheet open={Boolean(drawer)} onOpenChange={(open) => !open && setDrawer(null)}>
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Detail</SheetTitle>
              <SheetDescription>
                Gefilterde records voor {drawer?.replaceAll("_", " ")}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-2 p-4">
              {drawerItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Geen items.</p>
              ) : (
                drawerItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href ?? "#"}
                    className="block rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/40"
                  >
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                  </Link>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
