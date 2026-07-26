"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CircleDot,
  Handshake,
  Lightbulb,
  ListTodo,
  NotebookPen,
  Paperclip,
  Pencil,
  Plus,
  Sparkles,
  StickyNote,
  Target,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { RichNoteEditor } from "@/components/crm/rich-note-editor";
import {
  CompanyIntelligenceDashboard,
  CompanyIntelligenceSidebar,
} from "@/components/crm/company-intelligence-dashboard";
import { EmptyState } from "@/components/layout/empty-state";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  convertLeadToDealAction,
  createLeadContactAction,
  createTaskAction,
  deleteLeadContactAction,
  deleteNoteAction,
  deleteTaskAction,
  updateLeadAction,
  updateLeadContactAction,
  updateNoteAction,
  updateTaskAction,
  updateTaskStatusAction,
} from "@/lib/crm/actions";
import {
  CRM_LEAD_STATUSES,
  CRM_TASK_PRIORITIES,
  CRM_TASK_STATUSES,
  formatDealValue,
} from "@/lib/crm/constants";
import {
  computeLeadScore,
  temperatureLabel,
  type LeadTemperature,
} from "@/lib/crm/lead-score";
import type {
  CrmDealRow,
  CrmLeadContactRow,
  CrmLeadWithRelations,
  CrmNoteRow,
  CrmPipelineRow,
  CrmStageRow,
  CrmTaskRow,
  LeadCompanyEnrichment,
  OrgMemberOption,
} from "@/lib/crm/queries";
import { cn } from "@/lib/utils";

type ActivityRow = {
  id: string;
  event_type: string;
  description: string;
  created_at: string;
};

type LeadWorkspaceProps = {
  lead: CrmLeadWithRelations;
  enrichment: LeadCompanyEnrichment;
  pipelines: CrmPipelineRow[];
  stages: CrmStageRow[];
  tasks: CrmTaskRow[];
  notes: CrmNoteRow[];
  activities: ActivityRow[];
  deals: CrmDealRow[];
  contacts: CrmLeadContactRow[];
  members: OrgMemberOption[];
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "intelligence", label: "Intelligence" },
  { id: "timeline", label: "Timeline" },
  { id: "notes", label: "Notes" },
  { id: "tasks", label: "Tasks" },
  { id: "deals", label: "Deals" },
  { id: "contacts", label: "Contacts" },
  { id: "files", label: "Files" },
] as const;

type TabId = (typeof TABS)[number]["id"];
type TaskFilter = "open" | "completed" | "overdue";
type DialogKind =
  | "edit"
  | "task"
  | "note"
  | "deal"
  | "contact"
  | "edit-note"
  | "edit-task"
  | "edit-contact"
  | null;

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateOnly(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function toDatetimeLocal(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function memberLabel(
  members: OrgMemberOption[],
  userId: string | null,
): string {
  if (!userId) return "Niet toegewezen";
  return members.find((item) => item.userId === userId)?.label ?? "Onbekend";
}

function displayValue(value: string | null | undefined): string {
  return value?.trim() ? value : "—";
}

function temperatureClass(temp: LeadTemperature): string {
  switch (temp) {
    case "hot":
      return "border-red-200 bg-red-50 text-red-700";
    case "warm":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "qualified":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function scoreColorClass(color: "green" | "orange" | "red"): string {
  if (color === "green") return "text-emerald-600";
  if (color === "orange") return "text-amber-600";
  return "text-red-600";
}

function scoreRingClass(color: "green" | "orange" | "red"): string {
  if (color === "green") return "border-emerald-500 bg-emerald-50";
  if (color === "orange") return "border-amber-500 bg-amber-50";
  return "border-red-500 bg-red-50";
}

function activityIcon(eventType: string) {
  if (eventType.includes("task") && eventType.includes("done")) {
    return CheckCircle2;
  }
  if (eventType.includes("task")) return ListTodo;
  if (eventType.includes("deal")) return Handshake;
  if (eventType.includes("note")) return StickyNote;
  if (eventType.includes("stage") || eventType.includes("pipeline")) {
    return Target;
  }
  if (eventType.includes("contact")) return UserPlus;
  if (eventType.includes("created")) return CircleDot;
  return CircleDot;
}

function activityLabel(eventType: string): string {
  if (eventType.includes("lead.created")) return "Lead created";
  if (eventType.includes("status") || eventType.includes("won") || eventType.includes("lost")) {
    return "Status changed";
  }
  if (eventType.includes("stage") || eventType.includes("pipeline")) {
    return "Pipeline moved";
  }
  if (eventType.includes("task") && (eventType.includes("done") || eventType.includes("completed"))) {
    return "Task completed";
  }
  if (eventType.includes("task")) return "Task created";
  if (eventType.includes("deal")) return "Deal created";
  if (eventType.includes("note")) return "Note added";
  if (eventType.includes("contact")) return "Contact added";
  return eventType.replace(/^crm\./, "");
}

const AI_SUMMARY = {
  summary:
    "Dit bedrijf lijkt een goede fit voor Storaflow op basis van branche en digitale aanwezigheid. Placeholder — nog geen AI-analyse.",
  signals: [
    "Actieve website met contactmogelijkheden",
    "Contactgegevens deels beschikbaar",
    "Pipeline-activiteit in de afgelopen periode",
  ],
  nextAction:
    "Plan een kennismakingsgesprek of stuur een gerichte follow-up over hun leadgeneratieproces.",
  risks: [
    "Nog geen bevestigde koopintentie",
    "Beperkte company intelligence (geen live enrichment)",
    "Concurrentie in dezelfde markt mogelijk",
  ],
};

export function LeadWorkspace({
  lead,
  enrichment,
  pipelines,
  stages,
  tasks,
  notes,
  activities,
  deals,
  contacts,
  members,
}: LeadWorkspaceProps) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("overview");
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [editingNote, setEditingNote] = useState<CrmNoteRow | null>(null);
  const [editingTask, setEditingTask] = useState<CrmTaskRow | null>(null);
  const [editingContact, setEditingContact] =
    useState<CrmLeadContactRow | null>(null);
  const [pipelineId, setPipelineId] = useState(lead.pipeline_id);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("open");
  const [nowMs] = useState(() => Date.now());

  const pipelineStages = stages.filter(
    (stage) => stage.pipeline_id === pipelineId,
  );

  const score = useMemo(
    () =>
      computeLeadScore({
        ...lead,
        linkedinUrl: enrichment.linkedinUrl,
        companySize: enrichment.companySize,
      }),
    [lead, enrichment],
  );

  const openTasks = tasks.filter(
    (task) => task.status !== "done" && task.status !== "cancelled",
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (taskFilter === "completed") return task.status === "done";
      if (taskFilter === "overdue") {
        return (
          task.status !== "done" &&
          task.status !== "cancelled" &&
          Boolean(task.due_at) &&
          new Date(task.due_at!).getTime() < nowMs
        );
      }
      return task.status !== "done" && task.status !== "cancelled";
    });
  }, [tasks, taskFilter, nowMs]);

  const chronologicalActivities = useMemo(
    () =>
      [...activities].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [activities],
  );

  function refresh() {
    startTransition(() => router.refresh());
  }

  function closeDialog() {
    setDialog(null);
    setEditingNote(null);
    setEditingTask(null);
    setEditingContact(null);
  }

  function runAction(
    action: () => Promise<{ success: boolean; message: string }>,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      closeDialog();
      router.refresh();
    });
  }

  async function saveLead(formData: FormData) {
    runAction(() => updateLeadAction(lead.id, formData));
  }

  async function saveTask(formData: FormData) {
    formData.set("lead_id", lead.id);
    runAction(() => createTaskAction(formData));
  }

  async function saveDeal(formData: FormData) {
    runAction(() => convertLeadToDealAction(lead.id, formData));
  }

  async function saveContact(formData: FormData) {
    formData.set("lead_id", lead.id);
    runAction(() => createLeadContactAction(formData));
  }

  const companyFields: { label: string; value: string }[] = [
    { label: "Bedrijfsnaam", value: displayValue(lead.company_name) },
    {
      label: "Website",
      value: displayValue(lead.website || enrichment.website),
    },
    {
      label: "Telefoon",
      value: displayValue(lead.phone || enrichment.phone),
    },
    { label: "E-mail", value: displayValue(lead.email) },
    { label: "LinkedIn", value: displayValue(enrichment.linkedinUrl) },
    { label: "Facebook", value: displayValue(enrichment.facebookUrl) },
    { label: "Instagram", value: displayValue(enrichment.instagramUrl) },
    { label: "X/Twitter", value: displayValue(enrichment.twitterUrl) },
    { label: "Land", value: displayValue(lead.country || enrichment.country) },
    { label: "Regio", value: displayValue(enrichment.region) },
    { label: "Stad", value: displayValue(lead.city || enrichment.city) },
    { label: "Adres", value: displayValue(enrichment.address) },
    { label: "Postcode", value: displayValue(enrichment.postalCode) },
    {
      label: "Branche",
      value: displayValue(lead.industry || enrichment.industry),
    },
    {
      label: "Bedrijfsgrootte",
      value: displayValue(enrichment.companySize),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="shadow-none">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/50">
              <Building2 className="size-6 text-muted-foreground" />
            </div>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-semibold tracking-tight">
                  {lead.company_name}
                </h2>
                <Badge
                  variant="outline"
                  className={cn("border", temperatureClass(score.temperature))}
                >
                  {temperatureLabel(score.temperature)}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                    scoreRingClass(score.color),
                    scoreColorClass(score.color),
                  )}
                >
                  Score {score.score}
                </span>
                {lead.stage ? (
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: lead.stage.color,
                      color: lead.stage.color,
                    }}
                  >
                    {lead.stage.name}
                  </Badge>
                ) : null}
                <Badge variant="secondary">
                  {CRM_LEAD_STATUSES.find((item) => item.value === lead.status)
                    ?.label ?? lead.status}
                </Badge>
                <span className="text-muted-foreground">
                  Eigenaar: {memberLabel(members, lead.owner_user_id)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDialog("edit")}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDialog("task")}
            >
              <Plus className="size-3.5" />
              Add Task
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setTab("notes");
                setDialog("note");
              }}
            >
              <NotebookPen className="size-3.5" />
              Add Note
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setDialog("deal")}
            >
              <Handshake className="size-3.5" />
              Convert to Deal
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3-column layout */}
      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_280px]">
        {/* Left — Company */}
        <aside className="space-y-4">
          <Card className="shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Company</CardTitle>
                <Badge
                  variant="outline"
                  className={cn("border", temperatureClass(score.temperature))}
                >
                  {temperatureLabel(score.temperature)}
                </Badge>
              </div>
              <CardDescription>Bedrijfsgegevens van deze lead</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {companyFields.map((field) => (
                <div key={field.label} className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">{field.label}</p>
                  {(() => {
                    const site = lead.website || enrichment.website;
                    if (field.label === "Website" && site) {
                      return (
                        <a
                          href={
                            site.startsWith("http") ? site : `https://${site}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="break-all font-medium underline-offset-4 hover:underline"
                        >
                          {site}
                        </a>
                      );
                    }
                    if (field.label === "LinkedIn" && enrichment.linkedinUrl) {
                      return (
                        <a
                          href={enrichment.linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all font-medium underline-offset-4 hover:underline"
                        >
                          {enrichment.linkedinUrl}
                        </a>
                      );
                    }
                    if (field.label === "E-mail" && lead.email) {
                      return (
                        <a
                          href={`mailto:${lead.email}`}
                          className="break-all font-medium underline-offset-4 hover:underline"
                        >
                          {lead.email}
                        </a>
                      );
                    }
                    return (
                      <p className="break-words font-medium">{field.value}</p>
                    );
                  })()}
                </div>
              ))}
              {lead.company_id ? (
                <Button
                  nativeButton={false}
                  render={<Link href={`/companies/${lead.company_id}`} />}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Bedrijf openen
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </aside>

        {/* Center */}
        <section className="min-w-0 space-y-4">
          <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "shrink-0 border-b-2 px-3 py-2 text-sm transition-colors",
                  tab === item.id
                    ? "border-foreground font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === "overview" ? (
            <div className="space-y-4">
              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">Company Overview</CardTitle>
                  <CardDescription>
                    Beschrijving en interne context
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      Beschrijving
                    </p>
                    <p className="leading-relaxed text-foreground">
                      {enrichment.description?.trim() ||
                        lead.notes?.trim() ||
                        "Nog geen beschrijving beschikbaar voor dit bedrijf."}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      Interne notities
                    </p>
                    <p className="leading-relaxed whitespace-pre-wrap text-foreground">
                      {lead.notes?.trim() || "Geen interne notities."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="size-4 text-muted-foreground" />
                      AI Summary
                    </CardTitle>
                    <CardDescription>Placeholder — geen AI-call</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm leading-relaxed text-muted-foreground">
                    {AI_SUMMARY.summary}
                  </CardContent>
                </Card>
                <Card className="shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Lightbulb className="size-4 text-muted-foreground" />
                      Buying Signals
                    </CardTitle>
                    <CardDescription>Placeholder</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {AI_SUMMARY.signals.map((signal) => (
                        <li key={signal} className="flex gap-2">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground/40" />
                          {signal}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card className="shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Target className="size-4 text-muted-foreground" />
                      Next Best Action
                    </CardTitle>
                    <CardDescription>Placeholder</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm leading-relaxed text-muted-foreground">
                    {AI_SUMMARY.nextAction}
                  </CardContent>
                </Card>
                <Card className="shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <AlertTriangle className="size-4 text-muted-foreground" />
                      Risk Analysis
                    </CardTitle>
                    <CardDescription>Placeholder</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {AI_SUMMARY.risks.map((risk) => (
                        <li key={risk} className="flex gap-2">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground/40" />
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}

          {tab === "intelligence" ? (
            <CompanyIntelligenceDashboard
              lead={lead}
              enrichment={enrichment}
              contacts={contacts}
              tasks={tasks}
              deals={deals}
              notes={notes}
              activities={activities}
            />
          ) : null}

          {tab === "timeline" ? (
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Timeline</CardTitle>
                <CardDescription>
                  Chronologische activiteit voor deze lead
                </CardDescription>
              </CardHeader>
              <CardContent>
                {chronologicalActivities.length === 0 ? (
                  <EmptyState
                    icon={CircleDot}
                    title="Nog geen activiteit"
                    description="Acties op deze lead verschijnen hier automatisch."
                  />
                ) : (
                  <ol className="relative space-y-0 border-l border-border pl-6">
                    {chronologicalActivities.map((item) => {
                      const Icon = activityIcon(item.event_type);
                      return (
                        <li key={item.id} className="relative pb-6 last:pb-0">
                          <span className="absolute -left-[1.9rem] flex size-7 items-center justify-center rounded-full border border-border bg-background">
                            <Icon className="size-3.5 text-muted-foreground" />
                          </span>
                          <div className="rounded-lg border border-border px-3 py-2 transition-colors hover:bg-muted/40">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <Badge variant="secondary">
                                {activityLabel(item.event_type)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(item.created_at)}
                              </span>
                            </div>
                            <p className="mt-1.5 text-sm text-muted-foreground">
                              {item.description}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </CardContent>
            </Card>
          ) : null}

          {tab === "notes" ? (
            <div className="space-y-4">
              <Card className="shadow-none">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base">Notes</CardTitle>
                    <CardDescription>CRUD voor leadnotities</CardDescription>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setDialog("note")}
                  >
                    <Plus className="size-3.5" />
                    Nieuwe notitie
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {notes.length === 0 ? (
                    <EmptyState
                      icon={StickyNote}
                      title="Nog geen notities"
                      description="Voeg de eerste notitie toe voor dit bedrijf."
                    />
                  ) : (
                    notes.map((note) => (
                      <article
                        key={note.id}
                        className="rounded-lg border border-border px-3 py-3 transition-colors hover:bg-muted/30"
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground">
                            {memberLabel(members, note.created_by)} ·{" "}
                            {formatDate(note.created_at)}
                          </p>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label="Notitie bewerken"
                              onClick={() => {
                                setEditingNote(note);
                                setDialog("edit-note");
                              }}
                            >
                              <Pencil className="size-3.5" aria-hidden />
                            </Button>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label="Notitie verwijderen"
                              disabled={pending}
                              onClick={() =>
                                runAction(() => deleteNoteAction(note.id))
                              }
                            >
                              <Trash2 className="size-3.5" aria-hidden />
                            </Button>
                          </div>
                        </div>
                        <div
                          className="prose prose-sm max-w-none text-sm"
                          dangerouslySetInnerHTML={{ __html: note.body_html }}
                        />
                      </article>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}

          {tab === "tasks" ? (
            <Card className="shadow-none">
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">Tasks</CardTitle>
                    <CardDescription>Taken gekoppeld aan deze lead</CardDescription>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setDialog("task")}
                  >
                    <Plus className="size-3.5" />
                    Nieuwe taak
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      ["open", "Open"],
                      ["completed", "Completed"],
                      ["overdue", "Overdue"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTaskFilter(value)}
                      className={cn(
                        "rounded-lg border px-2.5 py-1 text-xs transition-colors",
                        taskFilter === value
                          ? "border-foreground/20 bg-muted font-medium"
                          : "border-transparent text-muted-foreground hover:bg-muted/60",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredTasks.length === 0 ? (
                  <EmptyState
                    icon={ListTodo}
                    title="Geen taken in dit filter"
                    description="Maak een taak of wissel van filter."
                  />
                ) : (
                  filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-lg border border-border px-3 py-3 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium">{task.title}</p>
                          {task.description ? (
                            <p className="text-sm text-muted-foreground">
                              {task.description}
                            </p>
                          ) : null}
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <Badge variant="secondary">{task.priority}</Badge>
                            <Badge variant="outline">{task.status}</Badge>
                            <span>Deadline: {formatDate(task.due_at)}</span>
                            <span>
                              Toegewezen:{" "}
                              {memberLabel(members, task.assigned_user_id)}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {task.status !== "done" ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={pending}
                              onClick={() =>
                                runAction(() =>
                                  updateTaskStatusAction(task.id, "done"),
                                )
                              }
                            >
                              Afronden
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Taak bewerken"
                            onClick={() => {
                              setEditingTask(task);
                              setDialog("edit-task");
                            }}
                          >
                            <Pencil className="size-3.5" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Taak verwijderen"
                            disabled={pending}
                            onClick={() =>
                              runAction(() => deleteTaskAction(task.id))
                            }
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ) : null}

          {tab === "deals" ? (
            <Card className="shadow-none">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Deals</CardTitle>
                  <CardDescription>Gekoppelde deals</CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setDialog("deal")}
                >
                  <Plus className="size-3.5" />
                  Nieuwe deal
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {deals.length === 0 ? (
                  <EmptyState
                    icon={Handshake}
                    title="Nog geen deals"
                    description="Converteer deze lead naar een deal om te starten."
                  />
                ) : (
                  deals.map((deal) => {
                    const pipeline = pipelines.find(
                      (item) => item.id === deal.pipeline_id,
                    );
                    const stage = stages.find(
                      (item) => item.id === deal.stage_id,
                    );
                    return (
                      <Link
                        key={deal.id}
                        href={`/crm/deals/${deal.id}`}
                        className="block rounded-lg border border-border px-3 py-3 transition-colors hover:bg-muted/40"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium">{deal.title}</p>
                          <Badge variant="secondary">{deal.status}</Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span>
                            {formatDealValue(Number(deal.value), deal.currency)}
                          </span>
                          <span>{pipeline?.name ?? "—"}</span>
                          <span>{stage?.name ?? "—"}</span>
                          <span>
                            Close: {formatDateOnly(deal.expected_close_date)}
                          </span>
                        </div>
                      </Link>
                    );
                  })
                )}
              </CardContent>
            </Card>
          ) : null}

          {tab === "contacts" ? (
            <Card className="shadow-none">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Contacts</CardTitle>
                  <CardDescription>
                    Meerdere contactpersonen per lead
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setDialog("contact")}
                >
                  <Plus className="size-3.5" />
                  Contact toevoegen
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {contacts.length === 0 ? (
                  <EmptyState
                    icon={UserPlus}
                    title="Nog geen contactpersonen"
                    description="Voeg decision makers en andere contacten toe."
                  />
                ) : (
                  contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="rounded-lg border border-border px-3 py-3 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">
                              {`${contact.first_name} ${contact.last_name}`.trim() ||
                                "Naamloos"}
                            </p>
                            {contact.is_primary ? (
                              <Badge variant="secondary">Primair</Badge>
                            ) : null}
                          </div>
                          <p className="text-muted-foreground">
                            {displayValue(contact.job_title)}
                          </p>
                          <p className="text-muted-foreground">
                            {displayValue(contact.email)} ·{" "}
                            {displayValue(contact.phone)}
                          </p>
                          {contact.linkedin_url ? (
                            <a
                              href={contact.linkedin_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-muted-foreground underline-offset-4 hover:underline"
                            >
                              LinkedIn
                            </a>
                          ) : null}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Contact bewerken"
                            onClick={() => {
                              setEditingContact(contact);
                              setDialog("edit-contact");
                            }}
                          >
                            <Pencil className="size-3.5" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Contact verwijderen"
                            disabled={pending}
                            onClick={() =>
                              runAction(() =>
                                deleteLeadContactAction(contact.id),
                              )
                            }
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ) : null}

          {tab === "files" ? (
            <EmptyState
              icon={Paperclip}
              title="Bestanden volgen later"
              description="File uploads zijn nog niet beschikbaar in deze fase. Placeholder tab."
            />
          ) : null}
        </section>

        {/* Right rail */}
        <aside className="space-y-4">
          <CompanyIntelligenceSidebar
            lead={lead}
            enrichment={enrichment}
            contacts={contacts}
            tasks={tasks}
            deals={deals}
          />

          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Lead Score</CardTitle>
              <CardDescription>Dummy score (geen AI)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                className={cn(
                  "mx-auto flex size-20 items-center justify-center rounded-full border-4 text-2xl font-semibold",
                  scoreRingClass(score.color),
                  scoreColorClass(score.color),
                )}
              >
                {score.score}
              </div>
              <ul className="space-y-1.5 text-xs">
                {score.factors.map((factor) => (
                  <li
                    key={factor.label}
                    className="flex items-center justify-between gap-2"
                  >
                    <span
                      className={
                        factor.active
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      {factor.label}
                    </span>
                    <span className="text-muted-foreground">
                      {factor.active ? `+${factor.points}` : "0"}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {chronologicalActivities.slice(0, 5).length === 0 ? (
                <p className="text-sm text-muted-foreground">Geen activiteit.</p>
              ) : (
                chronologicalActivities.slice(0, 5).map((item) => (
                  <div key={item.id} className="text-sm">
                    <p className="font-medium leading-snug">
                      {activityLabel(item.event_type)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(item.created_at)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Open Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {openTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Geen open taken.</p>
              ) : (
                openTasks.slice(0, 5).map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    className="block w-full rounded-md px-1 py-1 text-left text-sm hover:bg-muted/50"
                    onClick={() => setTab("tasks")}
                  >
                    <p className="font-medium leading-snug">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(task.due_at)}
                    </p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Deals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {deals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Geen deals.</p>
              ) : (
                deals.slice(0, 4).map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/crm/deals/${deal.id}`}
                    className="block text-sm hover:underline"
                  >
                    <p className="font-medium">{deal.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDealValue(Number(deal.value), deal.currency)}
                    </p>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Contacts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Geen contacten.</p>
              ) : (
                contacts.slice(0, 5).map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    className="block w-full text-left text-sm hover:underline"
                    onClick={() => setTab("contacts")}
                  >
                    <p className="font-medium">
                      {`${contact.first_name} ${contact.last_name}`.trim()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {displayValue(contact.job_title)}
                    </p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Edit lead */}
      <Dialog
        open={dialog === "edit"}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Lead bewerken</DialogTitle>
            <DialogDescription>
              Werk bedrijfsgegevens, pipeline en eigenaar bij.
            </DialogDescription>
          </DialogHeader>
          <form action={saveLead} className="space-y-3">
            <fieldset disabled={pending} className="space-y-3 border-0 p-0">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="ws_company_name">Bedrijf</Label>
                  <Input
                    id="ws_company_name"
                    name="company_name"
                    defaultValue={lead.company_name}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ws_contact_name">Contact</Label>
                  <Input
                    id="ws_contact_name"
                    name="contact_name"
                    defaultValue={lead.contact_name ?? ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ws_email">E-mail</Label>
                  <Input
                    id="ws_email"
                    name="email"
                    type="email"
                    defaultValue={lead.email ?? ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ws_phone">Telefoon</Label>
                  <Input
                    id="ws_phone"
                    name="phone"
                    defaultValue={lead.phone ?? ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ws_website">Website</Label>
                  <Input
                    id="ws_website"
                    name="website"
                    defaultValue={lead.website ?? ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ws_country">Land</Label>
                  <Input
                    id="ws_country"
                    name="country"
                    defaultValue={lead.country ?? ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ws_city">Stad</Label>
                  <Input
                    id="ws_city"
                    name="city"
                    defaultValue={lead.city ?? ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ws_industry">Branche</Label>
                  <Input
                    id="ws_industry"
                    name="industry"
                    defaultValue={lead.industry ?? ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ws_source">Bron</Label>
                  <Input
                    id="ws_source"
                    name="source"
                    defaultValue={lead.source ?? ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ws_lead_score">Leadscore</Label>
                  <Input
                    id="ws_lead_score"
                    name="lead_score"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={lead.lead_score}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ws_deal_value">Dealwaarde</Label>
                  <Input
                    id="ws_deal_value"
                    name="deal_value"
                    type="number"
                    min={0}
                    defaultValue={Number(lead.deal_value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ws_pipeline_id">Pipeline</Label>
                  <select
                    id="ws_pipeline_id"
                    name="pipeline_id"
                    className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    value={pipelineId}
                    onChange={(event) => setPipelineId(event.target.value)}
                  >
                    {pipelines.map((pipeline) => (
                      <option key={pipeline.id} value={pipeline.id}>
                        {pipeline.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ws_stage_id">Stage</Label>
                  <select
                    id="ws_stage_id"
                    name="stage_id"
                    className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    defaultValue={lead.stage_id}
                  >
                    {pipelineStages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ws_owner">Eigenaar</Label>
                  <select
                    id="ws_owner"
                    name="owner_user_id"
                    className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    defaultValue={lead.owner_user_id ?? ""}
                  >
                    <option value="">Niet toegewezen</option>
                    {members.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="ws_tags">Tags</Label>
                  <Input
                    id="ws_tags"
                    name="tags"
                    defaultValue={(lead.tags ?? []).join(", ")}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="ws_notes">Interne notities</Label>
                  <Textarea
                    id="ws_notes"
                    name="notes"
                    rows={3}
                    defaultValue={lead.notes ?? ""}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Annuleren
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Opslaan…" : "Opslaan"}
                </Button>
              </DialogFooter>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add task */}
      <Dialog
        open={dialog === "task"}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Taak toevoegen</DialogTitle>
            <DialogDescription>
              Nieuwe taak voor {lead.company_name}
            </DialogDescription>
          </DialogHeader>
          <form action={saveTask} className="space-y-3">
            <fieldset disabled={pending} className="space-y-3 border-0 p-0">
              <div className="space-y-1.5">
                <Label htmlFor="new_task_title">Titel</Label>
                <Input id="new_task_title" name="title" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new_task_description">Beschrijving</Label>
                <Textarea
                  id="new_task_description"
                  name="description"
                  rows={3}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="new_task_due">Deadline</Label>
                  <Input id="new_task_due" name="due_at" type="datetime-local" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new_task_priority">Prioriteit</Label>
                  <select
                    id="new_task_priority"
                    name="priority"
                    className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    defaultValue="normal"
                  >
                    {CRM_TASK_PRIORITIES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new_task_assignee">Assigned User</Label>
                <select
                  id="new_task_assignee"
                  name="assigned_user_id"
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  defaultValue=""
                >
                  <option value="">Huidige gebruiker</option>
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.label}
                    </option>
                  ))}
                </select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Annuleren
                </Button>
                <Button type="submit" disabled={pending}>
                  Opslaan
                </Button>
              </DialogFooter>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit task */}
      <Dialog
        open={dialog === "edit-task" && Boolean(editingTask)}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Taak bewerken</DialogTitle>
          </DialogHeader>
          {editingTask ? (
            <form
              action={(formData) =>
                runAction(() => updateTaskAction(editingTask.id, formData))
              }
              className="space-y-3"
            >
              <fieldset disabled={pending} className="space-y-3 border-0 p-0">
                <div className="space-y-1.5">
                  <Label htmlFor="edit_task_title">Titel</Label>
                  <Input
                    id="edit_task_title"
                    name="title"
                    defaultValue={editingTask.title}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit_task_description">Beschrijving</Label>
                  <Textarea
                    id="edit_task_description"
                    name="description"
                    rows={3}
                    defaultValue={editingTask.description ?? ""}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit_task_due">Deadline</Label>
                    <Input
                      id="edit_task_due"
                      name="due_at"
                      type="datetime-local"
                      defaultValue={toDatetimeLocal(editingTask.due_at)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit_task_priority">Prioriteit</Label>
                    <select
                      id="edit_task_priority"
                      name="priority"
                      className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                      defaultValue={editingTask.priority}
                    >
                      {CRM_TASK_PRIORITIES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit_task_status">Status</Label>
                    <select
                      id="edit_task_status"
                      name="status"
                      className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                      defaultValue={editingTask.status}
                    >
                      {CRM_TASK_STATUSES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit_task_assignee">Assigned User</Label>
                    <select
                      id="edit_task_assignee"
                      name="assigned_user_id"
                      className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                      defaultValue={editingTask.assigned_user_id ?? ""}
                    >
                      <option value="">Niet toegewezen</option>
                      {members.map((member) => (
                        <option key={member.userId} value={member.userId}>
                          {member.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    Annuleren
                  </Button>
                  <Button type="submit" disabled={pending}>
                    Opslaan
                  </Button>
                </DialogFooter>
              </fieldset>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Add note */}
      <Dialog
        open={dialog === "note"}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Notitie toevoegen</DialogTitle>
          </DialogHeader>
          <RichNoteEditor
            leadId={lead.id}
            onSaved={() => {
              closeDialog();
              refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit note */}
      <Dialog
        open={dialog === "edit-note" && Boolean(editingNote)}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Notitie bewerken</DialogTitle>
          </DialogHeader>
          {editingNote ? (
            <form
              action={(formData) =>
                runAction(() => updateNoteAction(editingNote.id, formData))
              }
              className="space-y-3"
            >
              <fieldset disabled={pending} className="space-y-3 border-0 p-0">
                <div className="space-y-1.5">
                  <Label htmlFor="edit_note_body">Inhoud</Label>
                  <Textarea
                    id="edit_note_body"
                    name="body_text"
                    rows={6}
                    defaultValue={editingNote.body_text}
                    required
                  />
                  <input type="hidden" name="body_html" value="" />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    Annuleren
                  </Button>
                  <Button type="submit" disabled={pending}>
                    Opslaan
                  </Button>
                </DialogFooter>
              </fieldset>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Convert / new deal */}
      <Dialog
        open={dialog === "deal"}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convert to Deal</DialogTitle>
            <DialogDescription>
              Maak een deal vanuit {lead.company_name}
            </DialogDescription>
          </DialogHeader>
          <form action={saveDeal} className="space-y-3">
            <fieldset disabled={pending} className="space-y-3 border-0 p-0">
              <div className="space-y-1.5">
                <Label htmlFor="deal_title">Naam</Label>
                <Input
                  id="deal_title"
                  name="title"
                  defaultValue={`Deal — ${lead.company_name}`}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deal_value">Waarde</Label>
                <Input
                  id="deal_value"
                  name="value"
                  type="number"
                  min={0}
                  defaultValue={Number(lead.deal_value) || 0}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deal_close">Expected Close Date</Label>
                <Input
                  id="deal_close"
                  name="expected_close_date"
                  type="date"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Pipeline: {lead.pipeline?.name ?? "—"} · Status: open
              </p>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Annuleren
                </Button>
                <Button type="submit" disabled={pending}>
                  Deal aanmaken
                </Button>
              </DialogFooter>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add contact */}
      <Dialog
        open={dialog === "contact"}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contact toevoegen</DialogTitle>
          </DialogHeader>
          <form action={saveContact} className="space-y-3">
            <fieldset disabled={pending} className="space-y-3 border-0 p-0">
              <ContactFormFields />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Annuleren
                </Button>
                <Button type="submit" disabled={pending}>
                  Opslaan
                </Button>
              </DialogFooter>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit contact */}
      <Dialog
        open={dialog === "edit-contact" && Boolean(editingContact)}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contact bewerken</DialogTitle>
          </DialogHeader>
          {editingContact ? (
            <form
              action={(formData) =>
                runAction(() =>
                  updateLeadContactAction(editingContact.id, formData),
                )
              }
              className="space-y-3"
            >
              <fieldset disabled={pending} className="space-y-3 border-0 p-0">
                <ContactFormFields contact={editingContact} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    Annuleren
                  </Button>
                  <Button type="submit" disabled={pending}>
                    Opslaan
                  </Button>
                </DialogFooter>
              </fieldset>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ContactFormFields({ contact }: { contact?: CrmLeadContactRow }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="contact_first_name">Voornaam</Label>
          <Input
            id="contact_first_name"
            name="first_name"
            defaultValue={contact?.first_name ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact_last_name">Achternaam</Label>
          <Input
            id="contact_last_name"
            name="last_name"
            defaultValue={contact?.last_name ?? ""}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact_job_title">Functie</Label>
        <Input
          id="contact_job_title"
          name="job_title"
          defaultValue={contact?.job_title ?? ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact_email">E-mail</Label>
        <Input
          id="contact_email"
          name="email"
          type="email"
          defaultValue={contact?.email ?? ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact_phone">Telefoon</Label>
        <Input
          id="contact_phone"
          name="phone"
          defaultValue={contact?.phone ?? ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact_linkedin">LinkedIn</Label>
        <Input
          id="contact_linkedin"
          name="linkedin_url"
          defaultValue={contact?.linkedin_url ?? ""}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_primary"
          defaultChecked={contact?.is_primary ?? false}
          className="size-4 rounded border-input"
        />
        Primaire contactpersoon
      </label>
    </>
  );
}

/** @deprecated Prefer LeadWorkspace — kept for import compatibility */
export { LeadWorkspace as LeadDetailClient };
