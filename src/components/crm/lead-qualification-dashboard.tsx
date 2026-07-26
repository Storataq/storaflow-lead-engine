"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Flame,
  Snowflake,
  SunMedium,
  Target,
  ThermometerSnowflake,
} from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Progress,
  ProgressLabel,
} from "@/components/ui/progress";
import { RadialProgress } from "@/components/ui/radial-progress";
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
import {
  buildInsightCards,
  buildQualificationMetrics,
  qualifyLeads,
  type LeadClassification,
  type LeadPriority,
  type LeadQualification,
} from "@/lib/crm/qualification";
import type { CrmLeadWithRelations } from "@/lib/crm/queries";
import { cn } from "@/lib/utils";

type LeadQualificationDashboardProps = {
  leads: CrmLeadWithRelations[];
};

type FilterKey =
  | "all"
  | "hot"
  | "warm"
  | "cold"
  | "qualified"
  | "unqualified"
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "opportunity_high";

function classificationLabel(value: LeadClassification): string {
  switch (value) {
    case "hot":
      return "Hot Lead";
    case "warm":
      return "Warm Lead";
    case "cold":
      return "Cold Lead";
    case "unqualified":
      return "Unqualified";
  }
}

function classificationClass(value: LeadClassification): string {
  switch (value) {
    case "hot":
      return "border-red-200 bg-red-50 text-red-800";
    case "warm":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "cold":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "unqualified":
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function priorityClass(value: LeadPriority): string {
  switch (value) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-800";
    case "high":
      return "border-orange-200 bg-orange-50 text-orange-800";
    case "medium":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "low":
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function scoreToneClass(color: LeadQualification["score"]["color"]): string {
  switch (color) {
    case "green":
      return "border-emerald-200 bg-emerald-50 text-emerald-800 stroke-emerald-600";
    case "orange":
      return "border-amber-200 bg-amber-50 text-amber-800 stroke-amber-600";
    case "red":
      return "border-red-200 bg-red-50 text-red-800 stroke-red-600";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700 stroke-slate-500";
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function LeadQualificationDashboard({
  leads,
}: LeadQualificationDashboardProps) {
  const qualifications = useMemo(() => qualifyLeads(leads), [leads]);
  const metrics = useMemo(
    () => buildQualificationMetrics(qualifications),
    [qualifications],
  );
  const insights = useMemo(
    () => buildInsightCards(qualifications),
    [qualifications],
  );

  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedId, setSelectedId] = useState<string>(
    qualifications[0]?.leadId ?? "",
  );

  const filtered = useMemo(() => {
    return qualifications.filter((item) => {
      switch (filter) {
        case "hot":
        case "warm":
        case "cold":
          return item.classification === filter;
        case "qualified":
          return item.qualified;
        case "unqualified":
          return !item.qualified;
        case "critical":
        case "high":
        case "medium":
        case "low":
          return item.priority === filter;
        case "opportunity_high":
          return item.opportunity.total >= 65;
        default:
          return true;
      }
    });
  }, [qualifications, filter]);

  const selected =
    filtered.find((item) => item.leadId === selectedId) ??
    filtered[0] ??
    null;

  const overviewWidgets = [
    { label: "Total Leads", value: String(metrics.totalLeads) },
    { label: "Qualified Leads", value: String(metrics.qualifiedLeads) },
    { label: "Unqualified Leads", value: String(metrics.unqualifiedLeads) },
    { label: "Hot Leads", value: String(metrics.hotLeads) },
    { label: "Warm Leads", value: String(metrics.warmLeads) },
    { label: "Cold Leads", value: String(metrics.coldLeads) },
    {
      label: "Avg Qualification Score",
      value: `${metrics.averageQualificationScore}`,
    },
    {
      label: "Conversion Potential",
      value: `${metrics.conversionPotential}%`,
    },
  ];

  const insightEntries = [
    { label: "Highest Score", item: insights.highestScore, field: "score" as const },
    { label: "Lowest Score", item: insights.lowestScore, field: "score" as const },
    {
      label: "Fastest Qualification",
      item: insights.fastestQualification,
      field: "history" as const,
    },
    {
      label: "Most Complete Profile",
      item: insights.mostCompleteProfile,
      field: "completeness" as const,
    },
    {
      label: "Highest Opportunity",
      item: insights.highestOpportunity,
      field: "opportunity" as const,
    },
    {
      label: "Lowest Confidence",
      item: insights.lowestConfidence,
      field: "confidence" as const,
    },
  ];

  if (leads.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title="Nog geen leads om te kwalificeren"
        description="Voeg leads toe in CRM om de qualification engine te gebruiken."
        actionLabel="Naar Leads"
        actionHref="/crm/leads"
      />
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Dashboard metrics */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">
            Qualification Dashboard
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {overviewWidgets.map((widget) => (
              <Card key={widget.label} className="shadow-none">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{widget.label}</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">
                    {widget.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Priority + Probability */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Priority Matrix</CardTitle>
              <CardDescription>Critical → Low (mock)</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["critical", "Critical"],
                  ["high", "High"],
                  ["medium", "Medium"],
                  ["low", "Low"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left transition-colors hover:bg-muted/40",
                    priorityClass(key),
                  )}
                >
                  <p className="text-sm font-medium">{label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {metrics.priorityCounts[key]}
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Sales Probability</CardTitle>
              <CardDescription>Geschatte kans (mock)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {([10, 25, 50, 75, 90] as const).map((probability) => (
                <Progress
                  key={probability}
                  value={
                    metrics.totalLeads === 0
                      ? 0
                      : Math.round(
                          (metrics.probabilityDistribution[probability] /
                            metrics.totalLeads) *
                            100,
                        )
                  }
                  className="w-full"
                >
                  <div className="mb-1 flex w-full items-center justify-between gap-2">
                    <ProgressLabel>{probability}% probability</ProgressLabel>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {metrics.probabilityDistribution[probability]} leads
                    </span>
                  </div>
                </Progress>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Insight cards */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">
            Insight Cards
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {insightEntries.map((entry) => (
              <Card key={entry.label} className="shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {entry.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {entry.item ? (
                    <>
                      <p className="font-semibold">{entry.item.companyName}</p>
                      <p className="mt-1 text-muted-foreground">
                        {entry.field === "score" &&
                          `Score ${entry.item.score.total}`}
                        {entry.field === "opportunity" &&
                          `Opportunity ${entry.item.opportunity.total}`}
                        {entry.field === "confidence" &&
                          `Confidence ${entry.item.confidence}%`}
                        {entry.field === "completeness" &&
                          `Completeness ${entry.item.profileCompleteness}%`}
                        {entry.field === "history" &&
                          `${entry.item.history.length} timeline events`}
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">—</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Filters */}
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "All"],
              ["hot", "Hot"],
              ["warm", "Warm"],
              ["cold", "Cold"],
              ["qualified", "Qualified"],
              ["unqualified", "Unqualified"],
              ["critical", "Critical"],
              ["high", "High"],
              ["medium", "Medium"],
              ["low", "Low"],
              ["opportunity_high", "High Opportunity"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-xs transition-colors",
                filter === value
                  ? "border-foreground/20 bg-muted font-medium"
                  : "border-transparent text-muted-foreground hover:bg-muted/60",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          {/* Table */}
          <Card className="shadow-none overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">Qualified Leads</CardTitle>
              <CardDescription>
                Score, classificatie, priority en next best action
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {filtered.length === 0 ? (
                <div className="px-6">
                  <EmptyState
                    icon={ThermometerSnowflake}
                    title="Geen leads in dit filter"
                    description="Kies een ander filter om resultaten te tonen."
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Probability</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((item) => (
                      <TableRow
                        key={item.leadId}
                        className={cn(
                          "cursor-pointer",
                          selected?.leadId === item.leadId && "bg-muted/40",
                        )}
                        onClick={() => setSelectedId(item.leadId)}
                      >
                        <TableCell className="font-medium">
                          {item.companyName}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                "border tabular-nums",
                                scoreToneClass(item.score.color),
                              )}
                            >
                              {item.score.percentage}%
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "border",
                              classificationClass(item.classification),
                            )}
                          >
                            {classificationLabel(item.classification)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "border capitalize",
                              priorityClass(item.priority),
                            )}
                          >
                            {item.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {item.salesProbability}%
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.nextBestAction.primary.label}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Detail panel */}
          <div className="space-y-4">
            {selected ? (
              <QualificationDetailPanel item={selected} />
            ) : (
              <EmptyState
                icon={Target}
                title="Selecteer een lead"
                description="Klik op een rij om qualification details te zien."
              />
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function QualificationDetailPanel({ item }: { item: LeadQualification }) {
  return (
    <Card className="shadow-none">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{item.companyName}</CardTitle>
            <CardDescription>Lead qualification detail panel</CardDescription>
          </div>
          <Button
            nativeButton={false}
            size="sm"
            variant="outline"
            render={<Link href={`/crm/leads/${item.leadId}`} />}
          >
            Open lead
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant="outline"
            className={cn("border", classificationClass(item.classification))}
          >
            {classificationLabel(item.classification)}
          </Badge>
          <Badge
            variant="outline"
            className={cn("border capitalize", priorityClass(item.priority))}
          >
            {item.priority}
          </Badge>
          <Badge variant="secondary">
            {item.qualified ? "Qualified" : "Unqualified"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Overall Score</p>
            <RadialProgress
              value={item.score.percentage}
              indicatorClassName={cn(
                item.score.color === "green" && "stroke-emerald-600",
                item.score.color === "orange" && "stroke-amber-600",
                item.score.color === "red" && "stroke-red-600",
                item.score.color === "slate" && "stroke-slate-500",
              )}
              label="Score"
            />
            <Badge
              variant="outline"
              className={cn("border", scoreToneClass(item.score.color))}
            >
              {item.score.percentage}%
            </Badge>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Opportunity Score</p>
            <RadialProgress
              value={item.opportunity.percentage}
              indicatorClassName="stroke-sky-600"
              label="Opportunity"
            />
            <p className="text-xs text-muted-foreground">
              Confidence {item.confidence}%
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border px-3 py-3 text-sm">
          <p className="text-xs text-muted-foreground">Recommended Action</p>
          <p className="mt-1 font-medium">
            {item.nextBestAction.primary.label}
          </p>
          <p className="mt-1 text-muted-foreground">
            {item.nextBestAction.primary.rationale}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.nextBestAction.alternatives.map((action) => (
              <Tooltip key={action.id}>
                <TooltipTrigger
                  render={<Badge variant="outline" className="cursor-default" />}
                >
                  {action.label}
                </TooltipTrigger>
                <TooltipContent>{action.rationale}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium">Lead Score Factors</h3>
          <div className="space-y-2">
            {item.score.factors.map((factor) => (
              <Progress
                key={factor.key}
                value={(factor.points / factor.maxPoints) * 100}
                className="w-full"
              >
                <div className="mb-1 flex w-full items-center justify-between gap-2">
                  <ProgressLabel>{factor.label}</ProgressLabel>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {factor.points}/{factor.maxPoints}
                  </span>
                </div>
              </Progress>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border px-3 py-3">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
              <Flame className="size-3.5 text-muted-foreground" />
              Strengths
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {item.strengths.map((strength) => (
                <li key={strength}>• {strength}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-border px-3 py-3">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
              <Snowflake className="size-3.5 text-muted-foreground" />
              Weaknesses
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {item.weaknesses.map((weakness) => (
                <li key={weakness}>• {weakness}</li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium">Qualification Timeline</h3>
          <ol className="relative space-y-0 border-l border-border pl-5">
            {item.history.map((event) => (
              <li key={event.id} className="relative pb-4 last:pb-0">
                <span className="absolute -left-[1.4rem] mt-1.5 size-2.5 rounded-full border border-border bg-background" />
                <div className="rounded-lg border border-border px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{event.label}</span>
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
        </div>

        <Accordion>
          <AccordionItem value="opportunity">
            <AccordionTrigger>Opportunity breakdown</AccordionTrigger>
            <AccordionPanel>
              <ul className="space-y-2 text-sm">
                {item.opportunity.factors.map((factor) => (
                  <li
                    key={factor.key}
                    className="flex items-center justify-between gap-2"
                  >
                    <span>{factor.label}</span>
                    <Badge variant="secondary" className="tabular-nums">
                      {factor.score}
                    </Badge>
                  </li>
                ))}
              </ul>
            </AccordionPanel>
          </AccordionItem>
          <AccordionItem value="history">
            <AccordionTrigger>Qualification history (raw)</AccordionTrigger>
            <AccordionPanel>
              <p className="text-sm">
                {item.history.length} events · updated{" "}
                {formatDate(item.updatedAt)}
              </p>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <SunMedium className="size-3.5" />
            Sales probability {item.salesProbability}%
          </span>
          <span>·</span>
          <span>Profile completeness {item.profileCompleteness}%</span>
        </div>
      </CardContent>
    </Card>
  );
}
