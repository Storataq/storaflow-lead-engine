"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Copy,
  Download,
  Minus,
  RefreshCw,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

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
  ATTENTION_PRIORITY_LABELS,
  EXEC_FILTER_STORAGE_KEY,
  METRIC_GLOSSARY,
} from "@/lib/crm/executive-analytics/constants";
import { saveExecutiveReportAction } from "@/lib/crm/executive-analytics/actions";
import type {
  ExecutiveAnalyticsBundle,
  ExecutiveFilters,
} from "@/lib/crm/executive-analytics/types";
import {
  EXEC_DATE_RANGE_OPTIONS,
  type ExecDateRangeKey,
} from "@/lib/crm/executive-analytics/date-range";
import { formatDealValue } from "@/lib/crm/constants";
import { cn } from "@/lib/utils";

type Props = {
  bundle: ExecutiveAnalyticsBundle;
};

function TrendBadge({
  direction,
  percentage,
  label,
}: {
  direction: string;
  percentage: number | null;
  label: string;
}) {
  if (direction === "unavailable" || percentage == null) {
    return (
      <span className="text-xs text-muted-foreground" title={label}>
        No comparison
      </span>
    );
  }
  const Icon =
    direction === "up"
      ? ArrowUpRight
      : direction === "down"
        ? ArrowDownRight
        : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs",
        direction === "up" && "text-emerald-700 dark:text-emerald-400",
        direction === "down" && "text-rose-700 dark:text-rose-400",
        direction === "flat" && "text-muted-foreground",
      )}
      title={label}
    >
      <Icon className="size-3.5" aria-hidden />
      <span className="tabular-nums">{percentage}%</span>
      <span className="sr-only">{direction}</span>
    </span>
  );
}

function BarRow({
  label,
  value,
  max,
  href,
}: {
  label: string;
  value: number;
  max: number;
  href?: string | null;
}) {
  const width = max <= 0 ? 0 : Math.round((value / max) * 100);
  const inner = (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate text-muted-foreground">{label}</span>
        <span className="tabular-nums font-medium">{value}</span>
      </div>
      <div
        className="h-2 rounded-full bg-muted"
        role="meter"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className="h-2 rounded-full bg-foreground/70 motion-safe:transition-all"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block hover:opacity-90">
        {inner}
      </Link>
    );
  }
  return inner;
}

function filtersToQuery(filters: ExecutiveFilters): string {
  const p = new URLSearchParams();
  p.set("range", filters.dateRange);
  if (filters.customFrom) p.set("from", filters.customFrom);
  if (filters.customTo) p.set("to", filters.customTo);
  if (filters.ownerUserId) p.set("owner", filters.ownerUserId);
  if (filters.pipelineId) p.set("pipeline", filters.pipelineId);
  if (filters.campaignId) p.set("campaign", filters.campaignId);
  if (filters.industry) p.set("industry", filters.industry);
  if (filters.country) p.set("country", filters.country);
  if (filters.leadClassification) p.set("class", filters.leadClassification);
  if (filters.dealStatus) p.set("dealStatus", filters.dealStatus);
  if (filters.currency) p.set("currency", filters.currency);
  return p.toString();
}

export function ExecutiveAnalyticsDashboard({ bundle }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [reportName, setReportName] = useState("");
  const [summaryKey, setSummaryKey] = useState(0);

  const filters = bundle.filters;

  const applyFilters = (next: Partial<ExecutiveFilters>) => {
    const merged = { ...filters, ...next };
    try {
      localStorage.setItem(EXEC_FILTER_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      /* ignore */
    }
    startTransition(() => {
      router.push(`/crm/executive?${filtersToQuery(merged)}`);
    });
  };

  const summaryText = useMemo(() => {
    const s = bundle.aiSummary;
    return [
      `Period: ${s.periodLabel}`,
      "",
      "Main developments:",
      ...s.mainDevelopments.map((x) => `• ${x}`),
      "",
      "Positive signals:",
      ...(s.positiveSignals.length
        ? s.positiveSignals.map((x) => `• ${x}`)
        : ["• None detected"]),
      "",
      "Risks:",
      ...(s.risks.length ? s.risks.map((x) => `• ${x}`) : ["• None detected"]),
      "",
      "Opportunities:",
      ...(s.opportunities.length
        ? s.opportunities.map((x) => `• ${x}`)
        : ["• None detected"]),
      "",
      "Recommended actions:",
      ...s.recommendedActions.map((x) => `• ${x}`),
      "",
      `Generated: ${s.generatedAt}`,
      "(Rule-based summary grounded in live metrics — not model-generated.)",
    ].join("\n");
  }, [bundle.aiSummary]);

  const exportCsv = () => {
    const lines = [
      "section,key,value",
      ...bundle.kpis.map(
        (k) => `kpi,${k.key},"${k.value.replace(/"/g, '""')}"`,
      ),
      ...bundle.attention.map(
        (a) => `attention,${a.priority},"${a.title.replace(/"/g, '""')}"`,
      ),
      ...bundle.revenue.pipelineByCurrency.map(
        (b) => `pipeline,${b.currency},${b.total}`,
      ),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `executive-analytics-${bundle.organizationId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported for current filters.");
  };

  const saveReport = () => {
    startTransition(async () => {
      const result = await saveExecutiveReportAction({
        name: reportName || `Report ${new Date().toLocaleDateString()}`,
        filters,
      });
      if (result.success) {
        toast.success(result.message);
        setReportName("");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const maxClass = Math.max(
    1,
    ...bundle.leadQuality.distribution.map((d) => d.count),
  );
  const maxFunnelSales = Math.max(
    1,
    ...bundle.funnels.sales.map((s) => s.count),
  );
  const maxFunnelEmail = Math.max(
    1,
    ...bundle.funnels.email.map((s) => s.count),
  );

  return (
    <div className="space-y-8">
      {/* Global filters */}
      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Executive filters</CardTitle>
              <CardDescription>
                {bundle.organizationName} · {bundle.rangeLabel} · generated{" "}
                {new Date(bundle.generatedAt).toLocaleString()}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="md:hidden"
                onClick={() => setFiltersOpen((v) => !v)}
              >
                {filtersOpen ? "Hide filters" : "Filters"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => router.refresh()}
              >
                <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
                Refresh
              </Button>
              {bundle.role.canExport ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={exportCsv}
                >
                  <Download className="mr-1.5 size-3.5" aria-hidden />
                  Export CSV
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent
          className={cn(
            "grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
            !filtersOpen && "max-md:hidden",
          )}
        >
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Date range</span>
            <select
              className="flex h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={filters.dateRange}
              onChange={(e) =>
                applyFilters({
                  dateRange: e.target.value as ExecDateRangeKey,
                })
              }
            >
              {EXEC_DATE_RANGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {filters.dateRange === "custom" ? (
            <>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">From</span>
                <Input
                  type="date"
                  value={filters.customFrom ?? ""}
                  onChange={(e) =>
                    applyFilters({ customFrom: e.target.value || null })
                  }
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">To</span>
                <Input
                  type="date"
                  value={filters.customTo ?? ""}
                  onChange={(e) =>
                    applyFilters({ customTo: e.target.value || null })
                  }
                />
              </label>
            </>
          ) : null}
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Industry</span>
            <Input
              placeholder="All"
              defaultValue={filters.industry ?? ""}
              onBlur={(e) =>
                applyFilters({ industry: e.target.value.trim() || null })
              }
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Country</span>
            <Input
              placeholder="All"
              defaultValue={filters.country ?? ""}
              onBlur={(e) =>
                applyFilters({ country: e.target.value.trim() || null })
              }
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Lead classification</span>
            <select
              className="flex h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={filters.leadClassification ?? ""}
              onChange={(e) =>
                applyFilters({
                  leadClassification: e.target.value || null,
                })
              }
            >
              <option value="">All</option>
              <option value="very_hot">Very hot</option>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
              <option value="very_cold">Very cold</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Deal status</span>
            <select
              className="flex h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={filters.dealStatus ?? ""}
              onChange={(e) =>
                applyFilters({ dealStatus: e.target.value || null })
              }
            >
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Currency</span>
            <Input
              placeholder="e.g. EUR"
              defaultValue={filters.currency ?? ""}
              onBlur={(e) =>
                applyFilters({
                  currency: e.target.value.trim().toUpperCase() || null,
                })
              }
            />
          </label>
        </CardContent>
      </Card>

      {bundle.notices.length > 0 ? (
        <div
          className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-900 dark:text-amber-100"
          role="status"
        >
          {bundle.notices.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </div>
      ) : null}

      {/* KPI cards — first viewport priority */}
      <section aria-labelledby="exec-kpi-heading">
        <h2 id="exec-kpi-heading" className="mb-3 text-lg font-semibold">
          Executive KPIs
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {bundle.kpis.map((item) => (
            <Card key={item.key} className="shadow-none">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center justify-between gap-2">
                  <span title={item.tooltip}>{item.label}</span>
                  <TrendBadge
                    direction={item.trend.direction}
                    percentage={item.trend.percentage}
                    label={item.trend.label}
                  />
                </CardDescription>
                <CardTitle className="text-xl tabular-nums">
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {item.value}
                    </Link>
                  ) : (
                    item.value
                  )}
                </CardTitle>
              </CardHeader>
              {item.unavailableReason ? (
                <CardContent className="pt-0 text-xs text-muted-foreground">
                  {item.unavailableReason}
                </CardContent>
              ) : null}
            </Card>
          ))}
        </div>
      </section>

      {/* Needs attention + AI summary */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4" aria-hidden />
              Needs attention
            </CardTitle>
            <CardDescription>
              Prioritized issues from live CRM, scoring, campaigns, and automations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {bundle.attention.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No critical issues detected for this period.
              </p>
            ) : (
              bundle.attention.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-2 rounded-lg border p-2 text-sm"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {ATTENTION_PRIORITY_LABELS[item.priority]}
                      </Badge>
                      <span className="font-medium">{item.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  {item.href ? (
                    <Button
                      nativeButton={false}
                      size="sm"
                      variant="outline"
                      render={<Link href={item.href} />}
                    >
                      Open
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none" key={summaryKey}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4" aria-hidden />
              AI executive summary
            </CardTitle>
            <CardDescription>
              Grounded in dashboard metrics · rule-based (not model-generated) ·{" "}
              {new Date(bundle.aiSummary.generatedAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-medium">Main developments</p>
              <ul className="list-disc pl-4 text-muted-foreground">
                {bundle.aiSummary.mainDevelopments.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="font-medium">Facts</p>
                <ul className="list-disc pl-4 text-xs text-muted-foreground">
                  {bundle.aiSummary.facts.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium">Suggestions</p>
                <ul className="list-disc pl-4 text-xs text-muted-foreground">
                  {bundle.aiSummary.suggestions.length === 0 ? (
                    <li>None</li>
                  ) : (
                    bundle.aiSummary.suggestions.map((x) => (
                      <li key={x}>{x}</li>
                    ))
                  )}
                </ul>
              </div>
            </div>
            {bundle.aiSummary.unavailableNotes.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Unavailable: {bundle.aiSummary.unavailableNotes.join(" · ")}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setSummaryKey((k) => k + 1);
                  router.refresh();
                  toast.message("Summary refreshed from latest metrics.");
                }}
              >
                Refresh summary
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(summaryText);
                  toast.success("Summary copied.");
                }}
              >
                <Copy className="mr-1.5 size-3.5" aria-hidden />
                Copy
              </Button>
              <Button
                nativeButton={false}
                size="sm"
                variant="outline"
                render={<Link href="/crm/analytics" />}
              >
                Supporting metrics
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue */}
      <section aria-labelledby="exec-revenue-heading" className="space-y-3">
        <h2 id="exec-revenue-heading" className="text-lg font-semibold">
          Revenue & pipeline
        </h2>
        {bundle.revenue.multiCurrency ? (
          <p className="text-sm text-muted-foreground">
            Multiple currencies detected — values are grouped; no FX conversion
            is applied.
          </p>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Pipeline by currency</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {bundle.revenue.pipelineByCurrency.length === 0 ? (
                <p className="text-muted-foreground">
                  No open deals. Create deals in CRM to populate pipeline value.
                </p>
              ) : (
                bundle.revenue.pipelineByCurrency.map((b) => (
                  <div
                    key={b.currency}
                    className="flex justify-between rounded-lg border p-2"
                  >
                    <span>{b.currency}</span>
                    <span className="tabular-nums font-medium">
                      {formatDealValue(b.total, b.currency)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Deals by stage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {bundle.revenue.dealsByStage.length === 0 ? (
                <p className="text-sm text-muted-foreground">No open deals.</p>
              ) : (
                bundle.revenue.dealsByStage.map((s) => (
                  <BarRow
                    key={s.stageId}
                    label={`${s.stageName} (${s.valueByCurrency.map((v) => formatDealValue(v.total, v.currency)).join(", ") || "—"})`}
                    value={s.count}
                    max={Math.max(
                      1,
                      ...bundle.revenue.dealsByStage.map((x) => x.count),
                    )}
                    href="/crm/pipeline"
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Funnels */}
      <section aria-labelledby="exec-funnel-heading" className="space-y-3">
        <h2 id="exec-funnel-heading" className="text-lg font-semibold">
          Funnel analytics
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Sales funnel</CardTitle>
              <CardDescription>
                Overall conversion:{" "}
                {bundle.funnels.salesOverallConversion == null
                  ? "—"
                  : `${bundle.funnels.salesOverallConversion}%`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {bundle.funnels.sales.map((step) => (
                <div key={step.id} className="space-y-1">
                  <BarRow
                    label={step.label}
                    value={step.count}
                    max={maxFunnelSales}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Conv. from previous:{" "}
                    {step.conversionFromPrevious == null
                      ? "—"
                      : `${step.conversionFromPrevious}%`}
                    {step.dropOffPercent != null
                      ? ` · Drop-off ${step.dropOffPercent}%`
                      : ""}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Email campaign funnel</CardTitle>
              <CardDescription>
                Overall conversion:{" "}
                {bundle.funnels.emailOverallConversion == null
                  ? "—"
                  : `${bundle.funnels.emailOverallConversion}%`}
                {bundle.campaigns.privacyNote
                  ? ` · ${bundle.campaigns.privacyNote}`
                  : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {bundle.funnels.email.every((s) => s.count === 0) ? (
                <p className="text-sm text-muted-foreground">
                  No email activity in this period. Launch a campaign to
                  populate this funnel.
                </p>
              ) : (
                bundle.funnels.email.map((step) => (
                  <BarRow
                    key={step.id}
                    label={step.label}
                    value={step.count}
                    max={maxFunnelEmail}
                    href="/email/analytics"
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Lead quality + intelligence */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Lead quality</CardTitle>
            <CardDescription>
              Avg score: {bundle.leadQuality.averageScore ?? "—"} · Scored:{" "}
              {bundle.leadQuality.scoredCount}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {bundle.leadQuality.distribution.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No scored leads yet. Open AI Lead Scoring to calculate scores.
              </p>
            ) : (
              bundle.leadQuality.distribution.map((d) => (
                <BarRow
                  key={d.key}
                  label={d.label}
                  value={d.count}
                  max={maxClass}
                  href={`/crm/scoring`}
                />
              ))
            )}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">
              Company & contact intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-lg border p-2">
              Decision makers:{" "}
              <span className="font-medium tabular-nums">
                {bundle.intelligence.decisionMakers}
              </span>
            </div>
            <div className="rounded-lg border p-2">
              Missing emails:{" "}
              <span className="font-medium tabular-nums">
                {bundle.intelligence.contactsMissingEmail}
              </span>
            </div>
            <div className="rounded-lg border p-2">
              Missing roles:{" "}
              <span className="font-medium tabular-nums">
                {bundle.intelligence.contactsMissingRole}
              </span>
            </div>
            <div className="rounded-lg border p-2">
              No website:{" "}
              <span className="font-medium tabular-nums">
                {bundle.intelligence.companiesWithoutWebsite ?? "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns + automations */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Campaign performance</CardTitle>
            <CardDescription>
              Open {bundle.campaigns.openRate ?? "—"}% · Reply{" "}
              {bundle.campaigns.replyRate ?? "—"}% · Bounce{" "}
              {bundle.campaigns.bounceRate ?? "—"}%
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border p-2">
                Sent: {bundle.campaigns.sent}
              </div>
              <div className="rounded-lg border p-2">
                Replied: {bundle.campaigns.replied}
              </div>
              <div className="rounded-lg border p-2">
                Bounced: {bundle.campaigns.bounced}
              </div>
              <div className="rounded-lg border p-2">
                Unsubscribed: {bundle.campaigns.unsubscribed}
              </div>
            </div>
            {bundle.campaigns.topCampaigns.map((c) => (
              <Link
                key={c.id}
                href={c.href}
                className="flex justify-between rounded-lg border p-2 hover:bg-muted/40"
              >
                <span className="truncate">{c.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {c.sent} sent
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Automation performance</CardTitle>
            <CardDescription>
              Success rate: {bundle.automations.successRate ?? "—"}%
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border p-2">
                Active: {bundle.automations.active}
              </div>
              <div className="rounded-lg border p-2">
                Today: {bundle.automations.executionsToday}
              </div>
              <div className="rounded-lg border p-2">
                Failed today: {bundle.automations.failedToday}
              </div>
              <div className="rounded-lg border p-2">
                Avg duration:{" "}
                {bundle.automations.averageDurationMs == null
                  ? "—"
                  : `${bundle.automations.averageDurationMs}ms`}
              </div>
            </div>
            {bundle.automations.mostFailing.length > 0 ? (
              <div>
                <p className="mb-1 text-xs font-medium text-rose-700 dark:text-rose-300">
                  Needs attention — failing
                </p>
                {bundle.automations.mostFailing.map((a) => (
                  <Link
                    key={a.id}
                    href={a.href}
                    className="flex justify-between border-b py-1 text-xs"
                  >
                    <span>{a.name}</span>
                    <span>{a.count}</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Geo / industry / sources */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Geographic</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {bundle.geo.leadsByCountry.length === 0 ? (
              <p className="text-sm text-muted-foreground">No country data.</p>
            ) : (
              bundle.geo.leadsByCountry.slice(0, 6).map((g) => (
                <BarRow
                  key={g.key}
                  label={g.label}
                  value={g.count}
                  max={Math.max(
                    1,
                    ...bundle.geo.leadsByCountry.map((x) => x.count),
                  )}
                />
              ))
            )}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Industry / category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {bundle.industry.avgScoreByIndustry.map((row) => (
              <div
                key={row.key}
                className="flex justify-between text-sm"
              >
                <span className="truncate">{row.label}</span>
                <span className="tabular-nums">
                  avg {row.avg} ({row.count})
                </span>
              </div>
            ))}
            {bundle.industry.avgScoreByIndustry.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Score-by-industry appears after leads are scored.
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Source performance</CardTitle>
            <CardDescription>
              {bundle.sources.attributionAvailable
                ? "From recorded lead sources"
                : "Most sources unknown — attribution was not recorded"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {bundle.sources.rows.slice(0, 8).map((s) => (
              <div key={s.key} className="flex justify-between gap-2">
                <span title={s.note}>{s.label}</span>
                <span className="tabular-nums">{s.leads}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recommendations + activity + reports */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {bundle.recommendations.map((r) => (
              <div key={r.id} className="rounded-lg border p-2">
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">{r.rationale}</p>
                {r.href ? (
                  <Link
                    href={r.href}
                    className="text-xs underline underline-offset-2"
                  >
                    Open filtered view
                  </Link>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              {bundle.activity.recent.length === 0 ? (
                <li className="text-muted-foreground">
                  No activity events yet.
                </li>
              ) : (
                bundle.activity.recent.map((a) => (
                  <li key={a.id} className="border-b pb-1">
                    <div className="flex justify-between gap-2">
                      <span className="truncate">{a.title}</span>
                      <Badge variant="outline">{a.module}</Badge>
                    </div>
                    <time className="text-xs text-muted-foreground">
                      {new Date(a.timestamp).toLocaleString()}
                    </time>
                  </li>
                ))
              )}
            </ol>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Saved reports</CardTitle>
            <CardDescription>
              Persist filters for later · schedule hooks prepared
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {bundle.role.canManageReports ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Report name"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={saveReport}
                >
                  Save
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Owners/admins can save reports.
              </p>
            )}
            {bundle.reports.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="truncate">
                  {r.name}
                  {r.isDefault ? " · default" : ""}
                  {r.isFavorite ? " ★" : ""}
                </span>
              </div>
            ))}
            {bundle.availability.reports === "unavailable" ? (
              <p className="text-xs text-muted-foreground">
                Apply migration 20260726000032 to enable saved reports.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Glossary */}
      <details className="rounded-lg border p-3 text-sm">
        <summary className="cursor-pointer font-medium">
          Metric glossary
        </summary>
        <ul className="mt-3 space-y-2 text-muted-foreground">
          {METRIC_GLOSSARY.map((m) => (
            <li key={m.name}>
              <span className="font-medium text-foreground">{m.name}</span> —{" "}
              {m.definition} Calculation: {m.calculation}. Date field:{" "}
              {m.dateField}.
            </li>
          ))}
        </ul>
      </details>

      {/* Keep legacy link */}
      <p className="text-xs text-muted-foreground">
        Pipeline detail also available on{" "}
        <Link href="/crm/analytics" className="underline">
          Pipeline Analytics
        </Link>
        . Filter query: {searchParams.toString() || "(defaults)"}.
      </p>
    </div>
  );
}
