"use client";

import {
  Building2,
  CheckCircle2,
  CircleDashed,
  Copy,
  ExternalLink,
  Handshake,
  Link2,
  ListTodo,
  Loader2,
  NotebookPen,
  RefreshCw,
  Sparkles,
  UserRound,
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
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  buildCompanyActivityTimeline,
  computeCompanyHealth,
  computeContactSummary,
  computeIntelligenceScores,
  enrichmentSteps,
  scoreTone,
  verificationBadge,
  verificationLabel,
  type EnrichmentStepStatus,
} from "@/lib/crm/company-intelligence";
import type {
  CrmDealRow,
  CrmLeadContactRow,
  CrmLeadWithRelations,
  CrmNoteRow,
  CrmTaskRow,
  LeadCompanyEnrichment,
} from "@/lib/crm/queries";
import { cn } from "@/lib/utils";

type ActivityRow = {
  id: string;
  event_type: string;
  description: string;
  created_at: string;
};

type CompanyIntelligenceDashboardProps = {
  lead: CrmLeadWithRelations;
  enrichment: LeadCompanyEnrichment;
  contacts: CrmLeadContactRow[];
  tasks: CrmTaskRow[];
  deals: CrmDealRow[];
  notes: CrmNoteRow[];
  activities: ActivityRow[];
};

function displayValue(value: string | null | undefined): string {
  return value?.trim() ? value : "—";
}

function ensureHttp(url: string): string {
  return url.startsWith("http") ? url : `https://${url}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toneClass(tone: "green" | "orange" | "red"): string {
  if (tone === "green") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (tone === "orange") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-red-200 bg-red-50 text-red-800";
}

function verificationClass(
  badge: ReturnType<typeof verificationBadge>,
): string {
  if (badge === "verified") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (badge === "needs_review") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function enrichmentStatusIcon(status: EnrichmentStepStatus) {
  if (status === "completed") return CheckCircle2;
  if (status === "running") return Loader2;
  return CircleDashed;
}

function enrichmentStatusLabel(status: EnrichmentStepStatus): string {
  if (status === "completed") return "Completed";
  if (status === "running") return "Running";
  return "Pending";
}

async function copyText(label: string, value: string | null | undefined) {
  if (!value?.trim()) {
    toast.error(`${label} niet beschikbaar`);
    return;
  }
  try {
    await navigator.clipboard.writeText(value.trim());
    toast.success(`${label} gekopieerd`);
  } catch {
    toast.error(`Kon ${label.toLowerCase()} niet kopiëren`);
  }
}

export function CompanyIntelligenceDashboard({
  lead,
  enrichment,
  contacts,
  tasks,
  deals,
  notes,
  activities,
}: CompanyIntelligenceDashboardProps) {
  const website = lead.website || enrichment.website;
  const phone = lead.phone || enrichment.phone;
  const email = lead.email;
  const industry = lead.industry || enrichment.industry;
  const country = lead.country || enrichment.country;
  const city = lead.city || enrichment.city;
  const region = enrichment.region;
  const linkedin = enrichment.linkedinUrl;

  const verification = verificationBadge(lead, enrichment);
  const health = computeCompanyHealth(lead, enrichment, contacts);
  const summary = computeContactSummary(lead, enrichment, contacts);
  const steps = enrichmentSteps(lead, enrichment, contacts);
  const openDeals = deals.filter((deal) => deal.status === "open").length;
  const openTasks = tasks.filter(
    (task) => task.status !== "done" && task.status !== "cancelled",
  ).length;
  const scores = computeIntelligenceScores(
    lead,
    enrichment,
    openDeals,
    openTasks,
  );

  const companyTimeline = buildCompanyActivityTimeline({
    leadCreatedAt: lead.created_at,
    activities,
    contacts,
    tasksCreatedHints: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      created_at: task.created_at,
    })),
    deals: deals.map((deal) => ({
      id: deal.id,
      title: deal.title,
      created_at: deal.created_at,
    })),
    notes: notes.map((note) => ({
      id: note.id,
      created_at: note.created_at,
    })),
  }).slice(0, 12);

  const overviewFields: { label: string; value: string; href?: string }[] = [
    { label: "Bedrijfsnaam", value: displayValue(lead.company_name) },
    {
      label: "Website",
      value: displayValue(website),
      href: website ? ensureHttp(website) : undefined,
    },
    { label: "Telefoon", value: displayValue(phone) },
    { label: "E-mail", value: displayValue(email) },
    { label: "Industrie", value: displayValue(industry) },
    { label: "Categorie", value: displayValue(enrichment.category) },
    { label: "Land", value: displayValue(country) },
    { label: "Regio", value: displayValue(region) },
    { label: "Stad", value: displayValue(city) },
    { label: "Adres", value: displayValue(enrichment.address) },
    { label: "Postcode", value: displayValue(enrichment.postalCode) },
    {
      label: "LinkedIn URL",
      value: displayValue(linkedin),
      href: linkedin ?? undefined,
    },
    {
      label: "Facebook URL",
      value: displayValue(enrichment.facebookUrl),
      href: enrichment.facebookUrl ?? undefined,
    },
    {
      label: "Instagram URL",
      value: displayValue(enrichment.instagramUrl),
      href: enrichment.instagramUrl ?? undefined,
    },
    {
      label: "X/Twitter URL",
      value: displayValue(enrichment.twitterUrl),
      href: enrichment.twitterUrl ?? undefined,
    },
  ];

  const socialCount = [
    linkedin,
    enrichment.facebookUrl,
    enrichment.instagramUrl,
    enrichment.twitterUrl,
  ].filter((value) => Boolean(value?.trim())).length;

  const lastActivity = companyTimeline[0]?.createdAt ?? lead.updated_at;
  const contactCompleteness = Math.round(
    ((summary.emailCount > 0 ? 1 : 0) +
      (summary.phoneCount > 0 ? 1 : 0) +
      (summary.hasLinkedIn ? 1 : 0) +
      (summary.contactCount > 0 ? 1 : 0)) *
      25,
  );

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Company Overview */}
        <Card className="shadow-none">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/50">
                  <Building2 className="size-7 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-lg">{lead.company_name}</CardTitle>
                  <CardDescription>
                    Company Overview — bestaande data + placeholders
                  </CardDescription>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn("border", verificationClass(verification))}
                    >
                      {verificationLabel(verification)}
                    </Badge>
                    {website ? (
                      <Badge variant="secondary">Website gevonden</Badge>
                    ) : null}
                    {socialCount > 0 ? (
                      <Badge variant="secondary">
                        {socialCount} social profile
                        {socialCount === 1 ? "" : "s"}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

              <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  toast.message("Refresh Company", {
                    description: "Placeholder — nog geen backend refresh.",
                  })
                }
              >
                <RefreshCw className="size-3.5" />
                Refresh Company
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  toast.message("Enrich Company", {
                    description: "Placeholder enrichment — nog geen AI/API.",
                  })
                }
              >
                <Sparkles className="size-3.5" />
                Enrich Company
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!website}
                onClick={() => {
                  if (!website) return;
                  window.open(ensureHttp(website), "_blank", "noopener,noreferrer");
                }}
              >
                <ExternalLink className="size-3.5" />
                Open Website
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!linkedin}
                onClick={() => {
                  if (!linkedin) return;
                  window.open(linkedin, "_blank", "noopener,noreferrer");
                }}
              >
                <Link2 className="size-3.5" />
                Open LinkedIn
              </Button>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void copyText("Website", website)}
                    />
                  }
                >
                  <Copy className="size-3.5" />
                  Copy Website
                </TooltipTrigger>
                <TooltipContent>Kopieer website-URL</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void copyText("E-mail", email)}
                    />
                  }
                >
                  <Copy className="size-3.5" />
                  Copy Email
                </TooltipTrigger>
                <TooltipContent>Kopieer e-mailadres</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void copyText("Telefoon", phone)}
                    />
                  }
                >
                  <Copy className="size-3.5" />
                  Copy Phone
                </TooltipTrigger>
                <TooltipContent>Kopieer telefoonnummer</TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {overviewFields.map((field) => (
                <div key={field.label} className="space-y-0.5 text-sm">
                  <dt className="text-xs text-muted-foreground">{field.label}</dt>
                  <dd className="break-words font-medium">
                    {field.href && field.value !== "—" ? (
                      <a
                        href={field.href}
                        target="_blank"
                        rel="noreferrer"
                        className="underline-offset-4 hover:underline"
                      >
                        {field.value}
                      </a>
                    ) : (
                      field.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        {/* Widgets row */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Website gevonden",
              value: website ? "Ja" : "Nee",
              icon: ExternalLink,
            },
            {
              label: "Social profiles",
              value: String(socialCount),
              icon: Link2,
            },
            {
              label: "Contact completeness",
              value: `${contactCompleteness}%`,
              icon: UserRound,
            },
            {
              label: "Open deals",
              value: String(openDeals),
              icon: Handshake,
            },
            {
              label: "Open tasks",
              value: String(openTasks),
              icon: ListTodo,
            },
            {
              label: "Notes",
              value: String(notes.length),
              icon: NotebookPen,
            },
            {
              label: "Laatste activiteit",
              value: formatDate(lastActivity),
              icon: RefreshCw,
            },
          ].map((widget) => (
            <Card key={widget.label} className="shadow-none">
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40">
                  <widget.icon className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{widget.label}</p>
                  <p className="truncate text-sm font-semibold">{widget.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Company Health */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Company Health</CardTitle>
              <CardDescription>Dummy scores op basis van beschikbare data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {health.map((metric) => (
                <Progress key={metric.id} value={metric.score} className="w-full">
                  <div className="mb-1 flex w-full items-center justify-between gap-2">
                    <ProgressLabel>{metric.label}</ProgressLabel>
                    <ProgressValue />
                  </div>
                </Progress>
              ))}
            </CardContent>
          </Card>

          {/* Contact Summary */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Contact Summary</CardTitle>
              <CardDescription>Samenvatting van bereikbaarheid</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Contactpersonen", value: String(summary.contactCount) },
                {
                  label: "Primaire contactpersoon",
                  value: displayValue(summary.primaryName),
                },
                { label: "Aantal e-mails", value: String(summary.emailCount) },
                { label: "Aantal telefoons", value: String(summary.phoneCount) },
                {
                  label: "LinkedIn aanwezig",
                  value: summary.hasLinkedIn ? "Ja" : "Nee",
                },
                {
                  label: "Website aanwezig",
                  value: summary.hasWebsite ? "Ja" : "Nee",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="mt-0.5 font-medium">{item.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Enrichment Status */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Enrichment Status</CardTitle>
              <CardDescription>
                Placeholder pipeline — nog geen backend
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {steps.map((step) => {
                const Icon = enrichmentStatusIcon(step.status);
                return (
                  <div
                    key={step.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        className={cn(
                          "size-4 text-muted-foreground",
                          step.status === "running" && "animate-spin",
                        )}
                      />
                      <span>{step.label}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        step.status === "completed" &&
                          "border-emerald-200 bg-emerald-50 text-emerald-800",
                        step.status === "running" &&
                          "border-amber-200 bg-amber-50 text-amber-800",
                        step.status === "pending" &&
                          "border-slate-200 bg-slate-50 text-slate-700",
                      )}
                    >
                      {enrichmentStatusLabel(step.status)}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Lead Intelligence Score Panel */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Lead Intelligence</CardTitle>
              <CardDescription>
                Score panel — dummy berekening, geen AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(
                [
                  ["Lead Score", scores.leadScore],
                  ["Intent Score", scores.intentScore],
                  ["Fit Score", scores.fitScore],
                  ["Opportunity Score", scores.opportunityScore],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <Badge
                    variant="outline"
                    className={cn("border tabular-nums", toneClass(scoreTone(value)))}
                  >
                    {value}
                  </Badge>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-sm">
                <span className="font-medium">Priority</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "border",
                    scores.priority === "Critical" &&
                      "border-red-200 bg-red-50 text-red-800",
                    scores.priority === "High" &&
                      "border-orange-200 bg-orange-50 text-orange-800",
                    scores.priority === "Medium" &&
                      "border-amber-200 bg-amber-50 text-amber-800",
                    scores.priority === "Low" &&
                      "border-slate-200 bg-slate-50 text-slate-700",
                  )}
                >
                  {scores.priority}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Company Activity */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Company Activity</CardTitle>
            <CardDescription>
              Timeline met bestaande events + enrichment placeholder
            </CardDescription>
          </CardHeader>
          <CardContent>
            {companyTimeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nog geen activiteit.</p>
            ) : (
              <ol className="relative space-y-0 border-l border-border pl-6">
                {companyTimeline.map((item) => (
                  <li key={item.id} className="relative pb-5 last:pb-0">
                    <span className="absolute -left-[1.55rem] mt-1 size-2.5 rounded-full border border-border bg-background" />
                    <div className="rounded-lg border border-border px-3 py-2 transition-colors hover:bg-muted/30">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge variant="secondary">{item.label}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

type CompanyIntelligenceSidebarProps = {
  lead: CrmLeadWithRelations;
  enrichment: LeadCompanyEnrichment;
  contacts: CrmLeadContactRow[];
  tasks: CrmTaskRow[];
  deals: CrmDealRow[];
};

export function CompanyIntelligenceSidebar({
  lead,
  enrichment,
  contacts,
  tasks,
  deals,
}: CompanyIntelligenceSidebarProps) {
  const openDeals = deals.filter((deal) => deal.status === "open").length;
  const openTasks = tasks.filter(
    (task) => task.status !== "done" && task.status !== "cancelled",
  ).length;
  const scores = computeIntelligenceScores(
    lead,
    enrichment,
    openDeals,
    openTasks,
  );
  const website = lead.website || enrichment.website;
  const phone = lead.phone || enrichment.phone;

  const quickFacts = [
    { label: "Employees", value: "—" },
    { label: "Revenue", value: "—" },
    { label: "Founded", value: "—" },
    {
      label: "Company Size",
      value: displayValue(enrichment.companySize),
    },
    { label: "Business Type", value: displayValue(enrichment.category) },
  ];

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quick Facts</CardTitle>
            <CardDescription>Placeholders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {quickFacts.map((fact) => (
              <div
                key={fact.label}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-muted-foreground">{fact.label}</span>
                <span className="font-medium">{fact.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Lead Intelligence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(
              [
                ["Lead", scores.leadScore],
                ["Intent", scores.intentScore],
                ["Fit", scores.fitScore],
                ["Opportunity", scores.opportunityScore],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-muted-foreground">{label}</span>
                <Badge
                  variant="outline"
                  className={cn("border tabular-nums", toneClass(scoreTone(value)))}
                >
                  {value}
                </Badge>
              </div>
            ))}
            <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
              <span className="font-medium">Priority</span>
              <Badge variant="secondary">{scores.priority}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="justify-start"
              onClick={() =>
                toast.message("Refresh Company", {
                  description: "Placeholder — nog geen backend.",
                })
              }
            >
              <RefreshCw className="size-3.5" />
              Refresh Company
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="justify-start"
              onClick={() =>
                toast.message("Enrich Company", {
                  description: "Placeholder — nog geen enrichment.",
                })
              }
            >
              <Sparkles className="size-3.5" />
              Enrich Company
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="justify-start"
              disabled={!website}
              onClick={() => {
                if (!website) return;
                window.open(ensureHttp(website), "_blank", "noopener,noreferrer");
              }}
            >
              <ExternalLink className="size-3.5" />
              Open Website
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="justify-start"
              disabled={!enrichment.linkedinUrl}
              onClick={() => {
                if (!enrichment.linkedinUrl) return;
                window.open(
                  enrichment.linkedinUrl,
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
            >
              <Link2 className="size-3.5" />
              Open LinkedIn
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="justify-start"
              onClick={() => void copyText("Website", website)}
            >
              <Copy className="size-3.5" />
              Copy Website
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="justify-start"
              onClick={() => void copyText("E-mail", lead.email)}
            >
              <Copy className="size-3.5" />
              Copy Email
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="justify-start"
              onClick={() => void copyText("Telefoon", phone)}
            >
              <Copy className="size-3.5" />
              Copy Phone
            </Button>
            <p className="text-xs text-muted-foreground">
              Contacts: {contacts.length} · Open taken: {openTasks}
            </p>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
