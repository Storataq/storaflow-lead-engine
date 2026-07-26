"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Minus,
  Sparkles,
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
  Progress,
  ProgressLabel,
} from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createTaskAction } from "@/lib/crm/actions";
import {
  buildExecutiveInsights,
  buildOpportunityOverview,
  buildOpportunityRecords,
  channelLabel,
  classificationLabel,
  OPPORTUNITY_ENGINE_NOTICE,
  quadrantLabel,
  readinessLabel,
  stageLabel,
  type OpportunityClassification,
  type OpportunityRecord,
  type RecommendedChannel,
} from "@/lib/crm/opportunity-insights";
import { formatDealValue } from "@/lib/crm/constants";
import type { CrmLeadWithRelations } from "@/lib/crm/queries";
import { cn } from "@/lib/utils";

type OpportunityInsightsDashboardProps = {
  leads: CrmLeadWithRelations[];
};

type DetailTab =
  | "overview"
  | "score"
  | "insights"
  | "signals"
  | "nba"
  | "readiness"
  | "timeline";

type SortKey = "score" | "value" | "probability" | "company" | "activity";

const PAGE_SIZE = 10;

function classificationClass(value: OpportunityClassification): string {
  switch (value) {
    case "strategic":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "high_potential":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "promising":
      return "border-teal-200 bg-teal-50 text-teal-800";
    case "nurture":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "low_potential":
      return "border-slate-200 bg-slate-50 text-slate-700";
    case "insufficient_data":
      return "border-orange-200 bg-orange-50 text-orange-800";
  }
}

function readinessClass(status: OpportunityRecord["outreachReadiness"]["status"]): string {
  switch (status) {
    case "ready":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "almost_ready":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "needs_enrichment":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "blocked":
    case "excluded":
      return "border-red-200 bg-red-50 text-red-800";
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function TrendIcon({
  direction,
}: {
  direction: "up" | "down" | "flat";
}) {
  if (direction === "up") return <ArrowUpRight className="size-3.5" />;
  if (direction === "down") return <ArrowDownRight className="size-3.5" />;
  return <Minus className="size-3.5" />;
}

export function OpportunityInsightsDashboard({
  leads,
}: OpportunityInsightsDashboardProps) {
  const records = useMemo(() => buildOpportunityRecords(leads), [leads]);
  const overview = useMemo(() => buildOpportunityOverview(records), [records]);
  const executive = useMemo(() => buildExecutiveInsights(records), [records]);

  const [search, setSearch] = useState("");
  const [classification, setClassification] = useState<string>("all");
  const [readiness, setReadiness] = useState<string>("all");
  const [channel, setChannel] = useState<string>("all");
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);
  const [hasEmailOnly, setHasEmailOnly] = useState(false);
  const [hasPhoneOnly, setHasPhoneOnly] = useState(false);
  const [scoreMin, setScoreMin] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let rows = records.filter((record) => {
      if (query && !record.companyName.toLowerCase().includes(query)) {
        return false;
      }
      if (classification !== "all" && record.classification !== classification) {
        return false;
      }
      if (readiness !== "all" && record.outreachReadiness.status !== readiness) {
        return false;
      }
      if (channel !== "all" && record.channel.primary !== channel) {
        return false;
      }
      if (needsReviewOnly && !record.needsReview) return false;
      if (hasEmailOnly && !record.hasEmail) return false;
      if (hasPhoneOnly && !record.hasPhone) return false;
      if (record.score.total < scoreMin) return false;
      return true;
    });

    rows = [...rows].sort((a, b) => {
      switch (sortKey) {
        case "company":
          return a.companyName.localeCompare(b.companyName);
        case "value":
          return b.commercial.estimatedDealValue - a.commercial.estimatedDealValue;
        case "probability":
          return (
            b.commercial.conversionProbability - a.commercial.conversionProbability
          );
        case "activity":
          return (
            new Date(b.lastActivityAt).getTime() -
            new Date(a.lastActivityAt).getTime()
          );
        default:
          return b.score.total - a.score.total;
      }
    });

    return rows;
  }, [
    records,
    search,
    classification,
    readiness,
    channel,
    needsReviewOnly,
    hasEmailOnly,
    hasPhoneOnly,
    scoreMin,
    sortKey,
  ]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const selected =
    records.find((record) => record.leadId === selectedId) ?? null;

  function openRecord(id: string) {
    setSelectedId(id);
    setDetailTab("overview");
  }

  function createFollowUpTask(record: OpportunityRecord) {
    const formData = new FormData();
    formData.set("lead_id", record.leadId);
    formData.set("title", `Follow-up: ${record.nextBestActions.primary.title}`);
    formData.set(
      "description",
      `${record.nextBestActions.primary.reason}\n\n(Generated from Opportunity Insights — mock)`,
    );
    formData.set("priority", "high");
    startTransition(async () => {
      const result = await createTaskAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Follow-up taak aangemaakt");
    });
  }

  if (leads.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Nog geen opportunities"
        description="Voeg CRM leads toe om Opportunity Insights te berekenen."
        actionLabel="Naar Leads"
        actionHref="/crm/leads"
      />
    );
  }

  const executiveCards = [
    { label: "Highest Potential Account", record: executive.highestPotential },
    { label: "Most Urgent Opportunity", record: executive.mostUrgent },
    { label: "Best Campaign Candidate", record: executive.bestCampaignCandidate },
    { label: "Highest Expected Value", record: executive.highestExpectedValue },
    {
      label: "Strongest Buying Signals",
      record: executive.strongestBuyingSignals,
    },
    {
      label: "Most Complete Company Profile",
      record: executive.mostCompleteProfile,
    },
    {
      label: "Opportunity Needing Enrichment",
      record: executive.needingEnrichment,
    },
    { label: "Opportunity at Risk", record: executive.atRisk },
  ];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Alert>
          <AlertDescription>{OPPORTUNITY_ENGINE_NOTICE}</AlertDescription>
        </Alert>

        {/* KPI overview */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">
            Executive Opportunity Overview
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {overview.map((kpi) => (
              <Card key={kpi.key} className="shadow-none">
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <p className="cursor-help text-xs text-muted-foreground underline-offset-2 hover:underline" />
                        }
                      >
                        {kpi.label}
                      </TooltipTrigger>
                      <TooltipContent>{kpi.tooltip}</TooltipContent>
                    </Tooltip>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendIcon direction={kpi.trendDirection} />
                      {kpi.trendLabel}
                    </span>
                  </div>
                  <p className="text-xl font-semibold tabular-nums">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.explanation}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Executive insight cards */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">
            Commercial Insight Cards
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {executiveCards.map((card) => (
              <button
                key={card.label}
                type="button"
                disabled={!card.record}
                onClick={() => card.record && openRecord(card.record.leadId)}
                className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40 disabled:cursor-default disabled:opacity-60"
              >
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="mt-1 font-semibold">
                  {card.record?.companyName ?? "—"}
                </p>
                {card.record ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Score {card.record.score.total} · EV{" "}
                    {formatDealValue(card.record.commercial.expectedValue)}
                  </p>
                ) : null}
              </button>
            ))}
          </div>
        </section>

        {/* Matrix */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Opportunity Matrix</CardTitle>
            <CardDescription>
              Conversion probability × opportunity score (lightweight CSS)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  "prioritize_now",
                  "strategic_nurture",
                  "quick_wins",
                  "low_priority",
                ] as const
              ).map((quadrant) => {
                const items = records.filter((r) => r.matrixQuadrant === quadrant);
                return (
                  <div
                    key={quadrant}
                    className="min-h-28 rounded-xl border border-border p-3"
                  >
                    <p className="text-sm font-medium">{quadrantLabel(quadrant)}</p>
                    <p className="text-xs text-muted-foreground">
                      {items.length} opportunities
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {items.slice(0, 4).map((item) => (
                        <button
                          key={item.leadId}
                          type="button"
                          className="rounded-md border border-border px-2 py-0.5 text-xs hover:bg-muted/50"
                          onClick={() => openRecord(item.leadId)}
                        >
                          {item.companyName}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Filters & Sorting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Input
                placeholder="Zoek bedrijf…"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
              />
              <select
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                value={classification}
                onChange={(event) => {
                  setClassification(event.target.value);
                  setPage(0);
                }}
              >
                <option value="all">All classifications</option>
                {(
                  [
                    "strategic",
                    "high_potential",
                    "promising",
                    "nurture",
                    "low_potential",
                    "insufficient_data",
                  ] as const
                ).map((value) => (
                  <option key={value} value={value}>
                    {classificationLabel(value)}
                  </option>
                ))}
              </select>
              <select
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                value={readiness}
                onChange={(event) => {
                  setReadiness(event.target.value);
                  setPage(0);
                }}
              >
                <option value="all">All readiness</option>
                {(
                  [
                    "ready",
                    "almost_ready",
                    "needs_enrichment",
                    "blocked",
                    "excluded",
                  ] as const
                ).map((value) => (
                  <option key={value} value={value}>
                    {readinessLabel(value)}
                  </option>
                ))}
              </select>
              <select
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                value={channel}
                onChange={(event) => {
                  setChannel(event.target.value);
                  setPage(0);
                }}
              >
                <option value="all">All channels</option>
                {(
                  [
                    "email",
                    "phone",
                    "linkedin",
                    "website_form",
                    "manual_research",
                    "no_outreach",
                  ] as const
                ).map((value: RecommendedChannel) => (
                  <option key={value} value={value}>
                    {channelLabel(value)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2">
                <span className="text-muted-foreground">Min score</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  className="w-20"
                  value={scoreMin}
                  onChange={(event) => {
                    setScoreMin(Number(event.target.value) || 0);
                    setPage(0);
                  }}
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={needsReviewOnly}
                  onChange={(event) => {
                    setNeedsReviewOnly(event.target.checked);
                    setPage(0);
                  }}
                />
                Needs Review
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={hasEmailOnly}
                  onChange={(event) => {
                    setHasEmailOnly(event.target.checked);
                    setPage(0);
                  }}
                />
                Has Email
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={hasPhoneOnly}
                  onChange={(event) => {
                    setHasPhoneOnly(event.target.checked);
                    setPage(0);
                  }}
                />
                Has Phone
              </label>
              <select
                className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as SortKey)}
              >
                <option value="score">Sort: Score</option>
                <option value="value">Sort: Estimated Value</option>
                <option value="probability">Sort: Probability</option>
                <option value="company">Sort: Company</option>
                <option value="activity">Sort: Last Activity</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="shadow-none overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Opportunity Table</CardTitle>
            <CardDescription>
              {filtered.length} resultaten · pagina {page + 1}/{pageCount}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {filtered.length === 0 ? (
              <div className="px-6">
                <EmptyState
                  icon={Sparkles}
                  title="Geen opportunities in dit filter"
                  description="Pas filters of zoekterm aan."
                />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Classification</TableHead>
                        <TableHead>Qualification</TableHead>
                        <TableHead>Est. Value</TableHead>
                        <TableHead>Conv.</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Readiness</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Last Activity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageRows.map((record) => (
                        <TableRow
                          key={record.leadId}
                          className="cursor-pointer"
                          onClick={() => openRecord(record.leadId)}
                        >
                          <TableCell className="font-medium">
                            {record.companyName}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {record.score.total}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "border",
                                classificationClass(record.classification),
                              )}
                            >
                              {classificationLabel(record.classification)}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize">
                            {record.qualificationLabel} (
                            {record.qualificationScore})
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {formatDealValue(
                              record.commercial.estimatedDealValue,
                              record.commercial.currency,
                            )}
                            <span className="ml-1 text-xs text-muted-foreground">
                              est.
                            </span>
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {record.commercial.conversionProbability}%
                          </TableCell>
                          <TableCell className="capitalize">
                            {record.commercial.salesUrgency}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "border",
                                readinessClass(record.outreachReadiness.status),
                              )}
                            >
                              {readinessLabel(record.outreachReadiness.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-40 truncate text-muted-foreground">
                            {record.nextBestActions.primary.title}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {formatDate(record.lastActivityAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={page === 0}
                    onClick={() => setPage((value) => Math.max(0, value - 1))}
                  >
                    Vorige
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {page + 1} / {pageCount}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={page >= pageCount - 1}
                    onClick={() =>
                      setPage((value) => Math.min(pageCount - 1, value + 1))
                    }
                  >
                    Volgende
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Detail sheet */}
        <Sheet
          open={Boolean(selected)}
          onOpenChange={(open) => {
            if (!open) setSelectedId(null);
          }}
        >
          <SheetContent
            side="right"
            className="w-full overflow-y-auto sm:max-w-xl"
          >
            {selected ? (
              <>
                <SheetHeader className="border-b border-border">
                  <SheetTitle>{selected.companyName}</SheetTitle>
                  <SheetDescription>
                    Opportunity detail · score {selected.score.total}
                  </SheetDescription>
                  <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "border",
                        classificationClass(selected.classification),
                      )}
                    >
                      {classificationLabel(selected.classification)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "border",
                        readinessClass(selected.outreachReadiness.status),
                      )}
                    >
                      {readinessLabel(selected.outreachReadiness.status)}
                    </Badge>
                  </div>
                </SheetHeader>

                <div className="flex gap-1 overflow-x-auto border-b border-border px-2">
                  {(
                    [
                      ["overview", "Overview"],
                      ["score", "Score"],
                      ["insights", "Insights"],
                      ["signals", "Signals"],
                      ["nba", "Next Action"],
                      ["readiness", "Readiness"],
                      ["timeline", "Timeline"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setDetailTab(id)}
                      className={cn(
                        "shrink-0 border-b-2 px-3 py-2 text-xs transition-colors",
                        detailTab === id
                          ? "border-foreground font-medium"
                          : "border-transparent text-muted-foreground",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="space-y-4 p-4">
                  {detailTab === "overview" ? (
                    <div className="grid gap-3 sm:grid-cols-2 text-sm">
                      {[
                        ["Opportunity Score", String(selected.score.total)],
                        [
                          "Classification",
                          classificationLabel(selected.classification),
                        ],
                        [
                          "Conversion Probability",
                          `${selected.commercial.conversionProbability}%`,
                        ],
                        [
                          "Estimated Value",
                          `${formatDealValue(selected.commercial.estimatedDealValue)} (est.)`,
                        ],
                        [
                          "Expected Value",
                          formatDealValue(selected.commercial.expectedValue),
                        ],
                        [
                          "Priority / Urgency",
                          selected.commercial.salesUrgency,
                        ],
                        [
                          "Outreach Readiness",
                          readinessLabel(selected.outreachReadiness.status),
                        ],
                        [
                          "Recommended Channel",
                          channelLabel(selected.channel.primary),
                        ],
                        [
                          "Suggested Stage",
                          stageLabel(selected.pipelineRecommendation.stage),
                        ],
                        [
                          "Matrix Quadrant",
                          quadrantLabel(selected.matrixQuadrant),
                        ],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-lg border border-border px-3 py-2"
                        >
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="mt-0.5 font-medium capitalize">{value}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {detailTab === "score" ? (
                    <div className="space-y-3">
                      {selected.score.breakdown.map((factor) => (
                        <div
                          key={factor.key}
                          className="rounded-lg border border-border px-3 py-2 text-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium">{factor.label}</p>
                            <Badge variant="secondary" className="tabular-nums">
                              {factor.weightedContribution.toFixed(1)}
                            </Badge>
                          </div>
                          <Progress
                            value={factor.rawScore}
                            className="mt-2 w-full"
                          >
                            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                              <ProgressLabel>
                                Raw {factor.rawScore} · weight{" "}
                                {(factor.weight * 100).toFixed(0)}%
                              </ProgressLabel>
                            </div>
                          </Progress>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {factor.explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {detailTab === "insights" ? (
                    <div className="space-y-4">
                      {(
                        [
                          "strength",
                          "weakness",
                          "opportunity",
                          "risk",
                        ] as const
                      ).map((category) => {
                        const items =
                          category === "risk"
                            ? selected.risks.map((risk) => ({
                                id: risk.id,
                                title: risk.title,
                                description: risk.description,
                                confidence: risk.confidence,
                                recommendedResponse: risk.recommendedResponse,
                              }))
                            : selected.insights
                                .filter((insight) => insight.category === category)
                                .map((insight) => ({
                                  id: insight.id,
                                  title: insight.title,
                                  description: insight.description,
                                  confidence: insight.confidence,
                                  recommendedResponse:
                                    insight.recommendedResponse,
                                }));
                        return (
                          <div key={category}>
                            <h3 className="mb-2 text-sm font-medium capitalize">
                              {category === "opportunity"
                                ? "Commercial Opportunities"
                                : category === "risk"
                                  ? "Risks"
                                  : `${category}s`}
                            </h3>
                            {items.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                Geen items.
                              </p>
                            ) : (
                              <ul className="space-y-2">
                                {items.map((item) => (
                                  <li
                                    key={item.id}
                                    className="rounded-lg border border-border px-3 py-2 text-sm"
                                  >
                                    <p className="font-medium">{item.title}</p>
                                    <p className="mt-1 text-muted-foreground">
                                      {item.description}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      Confidence {item.confidence}% ·{" "}
                                      {item.recommendedResponse}
                                    </p>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  {detailTab === "signals" ? (
                    <ul className="space-y-2">
                      {selected.buyingSignals.map((signal) => (
                        <li
                          key={signal.id}
                          className="rounded-lg border border-border px-3 py-2 text-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium">{signal.name}</p>
                            <Badge variant="secondary">{signal.polarity}</Badge>
                          </div>
                          <p className="mt-1 text-muted-foreground">
                            {signal.explanation}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Strength {signal.strength} · Confidence{" "}
                            {signal.confidence}% · {signal.source} · simulated
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {detailTab === "nba" ? (
                    <div className="space-y-3">
                      {[
                        selected.nextBestActions.primary,
                        selected.nextBestActions.secondary,
                      ].map((action, index) => (
                        <div
                          key={action.id}
                          className="rounded-lg border border-border px-3 py-3 text-sm"
                        >
                          <p className="text-xs text-muted-foreground">
                            {index === 0 ? "Primary" : "Secondary"}
                          </p>
                          <p className="font-medium">{action.title}</p>
                          <p className="mt-1 text-muted-foreground">
                            {action.reason}
                          </p>
                          <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                            <span>Priority: {action.priority}</span>
                            <span>Timing: {action.suggestedTiming}</span>
                            <span>
                              Channel: {channelLabel(action.recommendedChannel)}
                            </span>
                            <span>Outcome: {action.expectedOutcome}</span>
                            <span>
                              Prerequisites: {action.prerequisites.join(", ")}
                            </span>
                          </div>
                        </div>
                      ))}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toast.message("Marked as reviewed", {
                              description: "Mock local state only.",
                            })
                          }
                        >
                          Mark as reviewed
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => createFollowUpTask(selected)}
                        >
                          Create task
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toast.message("Add to campaign", {
                              description:
                                "Prepared UI — nog geen campaign engine.",
                            })
                          }
                        >
                          Add to campaign
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toast.message("Move to pipeline", {
                              description: `Suggestie: ${stageLabel(selected.pipelineRecommendation.stage)} — geen auto-move.`,
                            })
                          }
                        >
                          Move to pipeline
                        </Button>
                        <Button
                          nativeButton={false}
                          size="sm"
                          render={
                            <Link href={`/crm/leads/${selected.leadId}`} />
                          }
                        >
                          Open lead
                          <ArrowRight className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {detailTab === "readiness" ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          Score {selected.outreachReadiness.score}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "border",
                            readinessClass(selected.outreachReadiness.status),
                          )}
                        >
                          {readinessLabel(selected.outreachReadiness.status)}
                        </Badge>
                      </div>
                      <ul className="space-y-2">
                        {selected.outreachReadiness.checklist.map((item) => (
                          <li
                            key={item.key}
                            className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                          >
                            <span>
                              {item.label}
                              {item.required ? " *" : ""}
                            </span>
                            <Badge
                              variant={item.complete ? "secondary" : "outline"}
                            >
                              {item.complete ? "Complete" : "Missing"}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                      <Alert>
                        <AlertDescription>
                          {selected.outreachReadiness.notice}
                        </AlertDescription>
                      </Alert>
                      <div className="rounded-lg border border-border px-3 py-2 text-sm">
                        <p className="font-medium">Recommended channel</p>
                        <p className="mt-1">
                          {channelLabel(selected.channel.primary)} · alt{" "}
                          {channelLabel(selected.channel.alternative)}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {selected.channel.reason}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {detailTab === "timeline" ? (
                    <ol className="relative space-y-0 border-l border-border pl-5">
                      {selected.timeline.map((event) => (
                        <li key={event.id} className="relative pb-4 last:pb-0">
                          <span className="absolute -left-[1.4rem] mt-1.5 size-2.5 rounded-full border border-border bg-background" />
                          <div className="rounded-lg border border-border px-3 py-2 text-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-medium">{event.label}</p>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(event.occurredAt)}
                              </span>
                            </div>
                            <p className="mt-1 text-muted-foreground">
                              {event.description}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </div>
              </>
            ) : null}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
