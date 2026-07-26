"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Clock3,
  Database,
  Gauge,
  Plug,
  Radar,
  ShieldCheck,
  Sparkles,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  IntelligenceSourceBadge,
  IntelligenceSourceCard,
  PipelineStepState,
} from "@/lib/company-intelligence/connector-interfaces";
import {
  getSourcesConfidenceDashboard,
  getSourcesHealthSummary,
  INTELLIGENCE_SOURCE_CARDS,
} from "@/lib/company-intelligence/sources-catalog";
import { cn } from "@/lib/utils";

type FilterKey = "all" | "ready" | "coming_soon" | "mock" | "offline";

function formatDate(value: string | null): string {
  if (!value) return "Nog nooit";
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function badgeLabel(badge: IntelligenceSourceBadge): string {
  switch (badge) {
    case "ready":
      return "Ready";
    case "coming_soon":
      return "Coming Soon";
    case "disabled":
      return "Disabled";
    case "mock_source":
      return "Mock Source";
    case "inactive":
      return "Inactive";
    case "healthy":
      return "Healthy";
    case "warning":
      return "Warning";
    case "offline":
      return "Offline";
  }
}

function badgeClass(badge: IntelligenceSourceBadge): string {
  switch (badge) {
    case "ready":
    case "healthy":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "coming_soon":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "disabled":
    case "inactive":
      return "border-slate-200 bg-slate-50 text-slate-700";
    case "mock_source":
      return "border-violet-200 bg-violet-50 text-violet-800";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "offline":
      return "border-red-200 bg-red-50 text-red-800";
  }
}

function queueLabel(status: IntelligenceSourceCard["queueStatus"]): string {
  switch (status) {
    case "idle":
      return "Idle";
    case "queued":
      return "Queued";
    case "running":
      return "Running";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "retrying":
      return "Retrying";
  }
}

function pipelineStateLabel(state: PipelineStepState): string {
  switch (state) {
    case "completed":
      return "Completed";
    case "waiting":
      return "Waiting";
    case "mock":
      return "Mock";
    case "future":
      return "Future";
  }
}

function pipelineStateClass(state: PipelineStepState): string {
  switch (state) {
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "waiting":
      return "border-slate-200 bg-slate-50 text-slate-700";
    case "mock":
      return "border-violet-200 bg-violet-50 text-violet-800";
    case "future":
      return "border-sky-200 bg-sky-50 text-sky-800";
  }
}

export function IntelligenceSourcesCenter({
  initialLoading = false,
}: {
  initialLoading?: boolean;
}) {
  const [selectedId, setSelectedId] = useState(
    INTELLIGENCE_SOURCE_CARDS[0]?.id ?? "",
  );
  const [filter, setFilter] = useState<FilterKey>("all");
  const [loading] = useState(initialLoading);

  const sources = INTELLIGENCE_SOURCE_CARDS;
  const confidence = useMemo(
    () => getSourcesConfidenceDashboard(sources),
    [sources],
  );
  const health = useMemo(() => getSourcesHealthSummary(sources), [sources]);

  const filtered = useMemo(() => {
    return sources.filter((source) => {
      switch (filter) {
        case "ready":
          return source.badges.includes("ready");
        case "coming_soon":
          return source.badges.includes("coming_soon");
        case "mock":
          return source.badges.includes("mock_source");
        case "offline":
          return (
            source.badges.includes("offline") || source.health === "offline"
          );
        default:
          return true;
      }
    });
  }, [sources, filter]);

  const selected =
    filtered.find((source) => source.id === selectedId) ??
    filtered[0] ??
    sources[0] ??
    null;

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Source Overview + Health */}
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Source Overview
              </h2>
              <p className="text-sm text-muted-foreground">
                Voorbereiding op live connectors — uitsluitend mock data.
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button type="button" size="sm" variant="outline" />}
              >
                Filter: {filter.replace("_", " ")}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(
                  [
                    ["all", "All sources"],
                    ["ready", "Ready"],
                    ["coming_soon", "Coming soon"],
                    ["mock", "Mock sources"],
                    ["offline", "Offline"],
                  ] as const
                ).map(([value, label]) => (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              {
                label: "Healthy Sources",
                value: String(health.healthySources),
                icon: ShieldCheck,
              },
              {
                label: "Inactive Sources",
                value: String(health.inactiveSources),
                icon: Activity,
              },
              {
                label: "Avg Response Time",
                value: `${health.averageResponseTimeMs} ms`,
                icon: Clock3,
              },
              {
                label: "Avg Confidence",
                value: `${health.averageConfidence}%`,
                icon: Gauge,
              },
              {
                label: "Connector Readiness",
                value: `${health.connectorReadinessPercent}%`,
                icon: Plug,
              },
              {
                label: "Future API Readiness",
                value: `${health.futureApiReadinessPercent}%`,
                icon: Sparkles,
              },
            ].map((widget) => (
              <Card key={widget.label} className="shadow-none">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40">
                    <widget.icon className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{widget.label}</p>
                    <p className="text-sm font-semibold">{widget.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Confidence Dashboard */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Confidence Dashboard</CardTitle>
            <CardDescription>Mock percentages over alle bronnen</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ["Overall Confidence", confidence.overallConfidence],
                ["Freshness", confidence.freshness],
                ["Coverage", confidence.coverage],
                ["Reliability", confidence.reliability],
                ["Completeness", confidence.completeness],
              ] as const
            ).map(([label, value]) => (
              <Progress key={label} value={value} className="w-full">
                <div className="mb-1 flex w-full items-center justify-between gap-2">
                  <ProgressLabel>{label}</ProgressLabel>
                  <ProgressValue />
                </div>
              </Progress>
            ))}
          </CardContent>
        </Card>

        {/* Source Cards + Detail */}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <section className="space-y-3">
            <h2 className="text-base font-semibold tracking-tight">
              Source Cards
            </h2>
            {filtered.length === 0 ? (
              <EmptyState
                icon={Radar}
                title="Geen bronnen in dit filter"
                description="Kies een ander filter om mock sources te tonen."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filtered.map((source) => {
                  const active = selected?.id === source.id;
                  return (
                    <button
                      key={source.id}
                      type="button"
                      onClick={() => setSelectedId(source.id)}
                      className={cn(
                        "rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40",
                        active && "border-foreground/30 bg-muted/50",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{source.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {source.description}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 capitalize">
                          {source.connectorType}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {source.badges.map((badge) => (
                          <Badge
                            key={badge}
                            variant="outline"
                            className={cn("border", badgeClass(badge))}
                          >
                            {badgeLabel(badge)}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <span>Confidence {source.confidence}%</span>
                        <span>Coverage {source.coverage}%</span>
                        <span>Freshness {source.freshness}%</span>
                        <span>Queue: {queueLabel(source.queueStatus)}</span>
                        <span>Records ~{source.estimatedRecords}</span>
                        <span>Sync: {formatDate(source.lastSyncAt)}</span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Future: {source.futureAvailability}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold tracking-tight">
              Source Details
            </h2>
            {selected ? (
              <SourceDetailPanel source={selected} />
            ) : (
              <EmptyState
                icon={Database}
                title="Selecteer een bron"
                description="Klik op een source card om details te bekijken."
              />
            )}
          </section>
        </div>

        {/* Future connector information */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">
              Future Connector Information
            </CardTitle>
            <CardDescription>
              Interfaces zijn klaar — geen live API, scraping of AI in deze fase.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion>
              {sources.map((source) => (
                <AccordionItem key={source.id} value={source.id}>
                  <AccordionTrigger>
                    <span className="flex flex-wrap items-center gap-2">
                      {source.name}
                      <Badge variant="secondary">{source.version}</Badge>
                    </span>
                  </AccordionTrigger>
                  <AccordionPanel>
                    <div className="space-y-2 text-sm">
                      <p>{source.futureNotes}</p>
                      <p>
                        Connector:{" "}
                        <span className="font-medium text-foreground">
                          {source.connectorName}
                        </span>
                      </p>
                      <p>Availability: {source.futureAvailability}</p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {source.fields.map((field) => (
                          <Badge key={field} variant="outline">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </AccordionPanel>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

function SourceDetailPanel({ source }: { source: IntelligenceSourceCard }) {
  return (
    <Card className="shadow-none">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{source.name}</CardTitle>
            <CardDescription>{source.description}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {source.badges.map((badge) => (
              <Badge
                key={badge}
                variant="outline"
                className={cn("border", badgeClass(badge))}
              >
                {badgeLabel(badge)}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          {[
            ["Source Type", source.connectorType],
            ["Version", source.version],
            ["Connector Name", source.connectorName],
            ["Current Status", source.health],
            ["Last Synchronization", formatDate(source.lastSyncAt)],
            ["Average Runtime", `${source.averageRuntimeMs} ms`],
            ["Average Confidence", `${source.averageConfidence}%`],
            ["Queue Status", queueLabel(source.queueStatus)],
            ["Estimated Records", String(source.estimatedRecords)],
            ["Health", source.healthMessage],
          ].map(([label, value]) => (
            <div key={label} className="space-y-0.5">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="font-medium capitalize">{value}</dd>
            </div>
          ))}
        </dl>

        <div>
          <h3 className="mb-2 text-sm font-medium">Processing Pipeline</h3>
          <ol className="space-y-2">
            {source.pipeline.map((step, index) => (
              <li key={step.id} className="flex items-center gap-3 text-sm">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-xs font-medium">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{step.label}</span>
                    <Badge
                      variant="outline"
                      className={cn("border", pipelineStateClass(step.state))}
                    >
                      {pipelineStateLabel(step.state)}
                    </Badge>
                  </div>
                </div>
                {index < source.pipeline.length - 1 ? (
                  <span className="sr-only">next</span>
                ) : null}
              </li>
            ))}
          </ol>
          <div className="mt-2 hidden text-center text-xs text-muted-foreground sm:block">
            Search → Fetch → Normalize → Validate → Store → Enrich → CRM
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium">Available Data Fields</h3>
          <div className="flex flex-wrap gap-1.5">
            {source.fields.map((field) => (
              <Tooltip key={field}>
                <TooltipTrigger
                  render={
                    <Badge variant="outline" className="cursor-default" />
                  }
                >
                  {field}
                </TooltipTrigger>
                <TooltipContent>
                  Field planned for {source.name} connector
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">General Information</p>
          <p className="mt-1">{source.futureNotes}</p>
          <p className="mt-2 text-xs">Future: {source.futureAvailability}</p>
        </div>
      </CardContent>
    </Card>
  );
}
