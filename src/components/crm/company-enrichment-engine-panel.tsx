"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Download,
  Globe2,
  ListTree,
  Mail,
  RefreshCw,
  Share2,
  ShieldCheck,
  Sparkles,
  Store,
  Cpu,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  companyEnrichmentService,
  enrichmentStatusLabel,
  scoreLabelFromTotal,
  type CompanyEnrichmentResult,
  type EnrichmentCardKind,
  type EnrichmentFieldStatus,
} from "@/lib/crm/company-enrichment";
import type {
  CrmLeadContactRow,
  CrmLeadWithRelations,
  LeadCompanyEnrichment,
} from "@/lib/crm/queries";
import { cn } from "@/lib/utils";

type CompanyEnrichmentEnginePanelProps = {
  lead: CrmLeadWithRelations;
  enrichment: LeadCompanyEnrichment;
  contacts: CrmLeadContactRow[];
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusBadgeClass(status: EnrichmentFieldStatus): string {
  switch (status) {
    case "verified":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "missing":
      return "border-slate-200 bg-slate-50 text-slate-700";
    case "estimated":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "placeholder":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "mock":
      return "border-violet-200 bg-violet-50 text-violet-800";
  }
}

function scoreBadgeClass(label: ReturnType<typeof scoreLabelFromTotal>): string {
  switch (label) {
    case "Excellent":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "Good":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "Average":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "Poor":
      return "border-red-200 bg-red-50 text-red-800";
  }
}

function cardIcon(kind: EnrichmentCardKind) {
  switch (kind) {
    case "company_score":
      return Sparkles;
    case "website":
      return Globe2;
    case "contact":
      return Mail;
    case "social":
      return Share2;
    case "business":
      return Building2;
    case "google":
      return Store;
    case "technology":
      return Cpu;
    case "trust":
      return ShieldCheck;
  }
}

export function CompanyEnrichmentEnginePanel({
  lead,
  enrichment,
  contacts,
}: CompanyEnrichmentEnginePanelProps) {
  const [tick, setTick] = useState(0);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const result = useMemo(() => {
    void tick;
    return companyEnrichmentService.build({
      lead,
      enrichment,
      contacts,
      now: new Date(),
    });
  }, [lead, enrichment, contacts, tick]);

  const [scoreOverride, setScoreOverride] = useState<
    CompanyEnrichmentResult["score"] | null
  >(null);

  const score = scoreOverride ?? result.score;

  function refreshIntelligence() {
    setScoreOverride(null);
    setTick((value) => value + 1);
    toast.success("Intelligence vernieuwd", {
      description: "Mock enrichment pass opnieuw uitgevoerd.",
    });
  }

  function recalculateScore() {
    const next = companyEnrichmentService.recalculateScore(result);
    setScoreOverride(next);
    toast.success("Score herberekend", {
      description: `${next.total} · ${next.label}`,
    });
  }

  function downloadReport() {
    const payload = {
      generatedAt: new Date().toISOString(),
      companyName: result.companyName,
      leadId: result.leadId,
      score,
      fields: result.fields,
      timeline: result.timeline,
      sources: result.sources,
      note: "Mock enrichment report — replace with live connectors later.",
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `enrichment-report-${lead.id.slice(0, 8)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Report gedownload", {
      description: "Mock JSON-rapport opgeslagen.",
    });
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-none">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-base">Enrichment Engine</CardTitle>
              <CardDescription>
                Mock company intelligence — klaar om later te koppelen aan
                connectors (Google, LinkedIn, OpenCorporates, …).
              </CardDescription>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold tabular-nums",
                    scoreBadgeClass(score.label),
                  )}
                >
                  Company Score {score.total}
                </span>
                <Badge
                  variant="outline"
                  className={cn("border", scoreBadgeClass(score.label))}
                >
                  {score.label}
                </Badge>
                <Badge variant="secondary">Mock engine</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={refreshIntelligence}
              >
                <RefreshCw className="size-3.5" />
                Refresh Intelligence
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={recalculateScore}
              >
                <Sparkles className="size-3.5" />
                Recalculate Score
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setSourcesOpen(true)}
              >
                <ListTree className="size-3.5" />
                View Sources
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={downloadReport}
              >
                <Download className="size-3.5" />
                Download Report
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {score.breakdown.map((item) => (
              <div
                key={item.key}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{item.label}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "border tabular-nums",
                      item.awarded
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-slate-50 text-slate-600",
                    )}
                  >
                    {item.awarded ? `+${item.points}` : "0"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
        {result.cards.map((card) => {
          const Icon = cardIcon(card.kind);
          return (
            <Card key={card.kind} className="shadow-none">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40">
                      <Icon className="size-4 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-base">{card.title}</CardTitle>
                      <CardDescription>{card.description}</CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("border shrink-0", statusBadgeClass(card.status))}
                  >
                    {enrichmentStatusLabel(card.status)}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2 pt-1 text-xs text-muted-foreground">
                  <Badge variant="secondary">
                    Confidence {card.confidence}%
                  </Badge>
                  <span>Bron: {card.source}</span>
                  <span>·</span>
                  <span>Update: {formatDate(card.lastUpdated)}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {card.items.map((item) => (
                  <div
                    key={`${card.kind}-${item.key}`}
                    className="rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/30"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{item.label}</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border",
                          statusBadgeClass(item.status),
                        )}
                      >
                        {enrichmentStatusLabel(item.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 break-words text-muted-foreground">
                      {item.value}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>Confidence {item.confidence}%</span>
                      <span>Bron: {item.source}</span>
                      <span>{formatDate(item.lastUpdated)}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Enrichment Timeline</CardTitle>
          <CardDescription>
            Gevonden signalen tijdens de mock enrichment pass
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="relative space-y-0 border-l border-border pl-6">
            {result.timeline.map((event) => (
              <li key={event.id} className="relative pb-5 last:pb-0">
                <span className="absolute -left-[1.55rem] mt-1.5 size-2.5 rounded-full border border-border bg-background" />
                <div className="rounded-lg border border-border px-3 py-2 transition-colors hover:bg-muted/30">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{event.label}</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border",
                          statusBadgeClass(event.status),
                        )}
                      >
                        {enrichmentStatusLabel(event.status)}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(event.occurredAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {event.description}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Bron: {event.source}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Dialog open={sourcesOpen} onOpenChange={setSourcesOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enrichment Sources</DialogTitle>
            <DialogDescription>
              Mock bronnen — later te vervangen door echte connectors.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
            {result.sources.map((source) => (
              <li
                key={source.id}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{source.name}</p>
                  <Badge variant="secondary">{source.type}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {source.description}
                </p>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
