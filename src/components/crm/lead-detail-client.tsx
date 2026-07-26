"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { RichNoteEditor } from "@/components/crm/rich-note-editor";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createTaskAction,
  updateLeadAction,
} from "@/lib/crm/actions";
import {
  CRM_TASK_PRIORITIES,
  formatDealValue,
} from "@/lib/crm/constants";
import type {
  CrmDealRow,
  CrmLeadWithRelations,
  CrmNoteRow,
  CrmPipelineRow,
  CrmStageRow,
  CrmTaskRow,
} from "@/lib/crm/queries";
import { cn } from "@/lib/utils";

type ActivityRow = {
  id: string;
  event_type: string;
  description: string;
  created_at: string;
};

type LeadDetailClientProps = {
  lead: CrmLeadWithRelations;
  pipelines: CrmPipelineRow[];
  stages: CrmStageRow[];
  tasks: CrmTaskRow[];
  notes: CrmNoteRow[];
  activities: ActivityRow[];
  deals: CrmDealRow[];
};

const TABS = [
  "algemeen",
  "bedrijf",
  "contacten",
  "deals",
  "taken",
  "notities",
  "timeline",
] as const;

type Tab = (typeof TABS)[number];

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function LeadDetailClient({
  lead,
  pipelines,
  stages,
  tasks,
  notes,
  activities,
  deals,
}: LeadDetailClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("algemeen");
  const [pending, startTransition] = useTransition();
  const [pipelineId, setPipelineId] = useState(lead.pipeline_id);
  const pipelineStages = stages.filter(
    (stage) => stage.pipeline_id === pipelineId,
  );

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function saveLead(formData: FormData) {
    startTransition(async () => {
      const result = await updateLeadAction(lead.id, formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  async function saveTask(formData: FormData) {
    startTransition(async () => {
      const result = await createTaskAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{lead.status}</Badge>
        {lead.stage ? (
          <Badge
            variant="outline"
            style={{ borderColor: lead.stage.color, color: lead.stage.color }}
          >
            {lead.stage.name}
          </Badge>
        ) : null}
        {lead.pipeline ? (
          <span className="text-sm text-muted-foreground">
            {lead.pipeline.name}
          </span>
        ) : null}
        <span className="text-sm text-muted-foreground">
          {formatDealValue(Number(lead.deal_value), lead.currency)}
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={cn(
              "shrink-0 rounded-lg border px-3 py-1.5 text-sm capitalize transition-colors",
              tab === item
                ? "border-foreground/20 bg-muted font-medium"
                : "border-transparent text-muted-foreground hover:bg-muted/60",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "algemeen" || tab === "bedrijf" ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">
              {tab === "bedrijf" ? "Bedrijf" : "Algemeen"}
            </CardTitle>
            <CardDescription>
              Bewerk leadgegevens, pipeline en stage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={saveLead} className="space-y-4">
              <fieldset disabled={pending} className="space-y-4 border-0 p-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="company_name">Bedrijf</Label>
                    <Input
                      id="company_name"
                      name="company_name"
                      defaultValue={lead.company_name}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_name">Contactpersoon</Label>
                    <Input
                      id="contact_name"
                      name="contact_name"
                      defaultValue={lead.contact_name ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={lead.email ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefoon</Label>
                    <Input
                      id="phone"
                      name="phone"
                      defaultValue={lead.phone ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      name="website"
                      defaultValue={lead.website ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Land</Label>
                    <Input
                      id="country"
                      name="country"
                      defaultValue={lead.country ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Stad</Label>
                    <Input id="city" name="city" defaultValue={lead.city ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Branche</Label>
                    <Input
                      id="industry"
                      name="industry"
                      defaultValue={lead.industry ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source">Bron</Label>
                    <Input
                      id="source"
                      name="source"
                      defaultValue={lead.source ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lead_score">Leadscore</Label>
                    <Input
                      id="lead_score"
                      name="lead_score"
                      type="number"
                      min={0}
                      max={100}
                      defaultValue={lead.lead_score}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deal_value">Dealwaarde</Label>
                    <Input
                      id="deal_value"
                      name="deal_value"
                      type="number"
                      min={0}
                      defaultValue={Number(lead.deal_value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pipeline_id">Pipeline</Label>
                    <select
                      id="pipeline_id"
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
                  <div className="space-y-2">
                    <Label htmlFor="stage_id">Stage</Label>
                    <select
                      id="stage_id"
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
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="tags">Tags</Label>
                    <Input
                      id="tags"
                      name="tags"
                      defaultValue={(lead.tags ?? []).join(", ")}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="notes">Notities</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      rows={3}
                      defaultValue={lead.notes ?? ""}
                    />
                  </div>
                </div>
                {lead.company_id ? (
                  <p className="text-sm text-muted-foreground">
                    Gekoppeld bedrijf:{" "}
                    <Link
                      href={`/companies/${lead.company_id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      bekijken
                    </Link>
                  </p>
                ) : null}
                <Button type="submit" disabled={pending}>
                  {pending ? "Opslaan…" : "Opslaan"}
                </Button>
              </fieldset>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {tab === "contacten" ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Contacten</CardTitle>
            <CardDescription>
              Primaire contactgegevens van deze lead.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Naam</span>
              <span>{lead.contact_name ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">E-mail</span>
              <span>{lead.email ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Telefoon</span>
              <span>{lead.phone ?? "—"}</span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === "deals" ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Deals</CardTitle>
            <CardDescription>Deals gekoppeld aan deze lead.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {deals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nog geen deals.{" "}
                <Link
                  href="/crm/deals"
                  className="font-medium underline-offset-4 hover:underline"
                >
                  Maak een deal
                </Link>
              </p>
            ) : (
              deals.map((deal) => (
                <Link
                  key={deal.id}
                  href={`/crm/deals/${deal.id}`}
                  className="block rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{deal.title}</span>
                    <Badge variant="secondary">{deal.status}</Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {formatDealValue(Number(deal.value), deal.currency)}
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "taken" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Taken</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nog geen taken.</p>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <p className="font-medium">{task.title}</p>
                    <p className="text-muted-foreground">
                      {task.priority} · {task.status}
                      {task.due_at ? ` · ${formatDate(task.due_at)}` : ""}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Taak toevoegen</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={saveTask} className="space-y-3">
                <input type="hidden" name="lead_id" value={lead.id} />
                <div className="space-y-2">
                  <Label htmlFor="task_title">Titel</Label>
                  <Input id="task_title" name="title" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task_description">Beschrijving</Label>
                  <Textarea id="task_description" name="description" rows={3} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="due_at">Deadline</Label>
                    <Input id="due_at" name="due_at" type="datetime-local" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Prioriteit</Label>
                    <select
                      id="priority"
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
                <Button type="submit" disabled={pending}>
                  Taak opslaan
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "notities" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Notities</CardTitle>
              <CardDescription>Chronologisch, nieuwste eerst.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nog geen notities.
                </p>
              ) : (
                notes.map((note) => (
                  <article
                    key={note.id}
                    className="rounded-lg border border-border px-3 py-2"
                  >
                    <p className="mb-2 text-xs text-muted-foreground">
                      {formatDate(note.created_at)}
                    </p>
                    <div
                      className="prose prose-sm max-w-none text-sm"
                      dangerouslySetInnerHTML={{ __html: note.body_html }}
                    />
                  </article>
                ))
              )}
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Schrijven</CardTitle>
            </CardHeader>
            <CardContent>
              <RichNoteEditor leadId={lead.id} onSaved={refresh} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "timeline" ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Timeline</CardTitle>
            <CardDescription>
              Chronologische activiteiten voor deze lead.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nog geen activiteiten.
              </p>
            ) : (
              <ul className="space-y-3">
                {activities.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant="secondary">{item.event_type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {item.description}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
