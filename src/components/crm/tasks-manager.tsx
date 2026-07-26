"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare } from "lucide-react";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createTaskAction,
  updateTaskStatusAction,
} from "@/lib/crm/actions";
import {
  CRM_TASK_PRIORITIES,
  CRM_TASK_STATUSES,
} from "@/lib/crm/constants";
import type {
  CrmDealRow,
  CrmLeadWithRelations,
  CrmTaskRow,
} from "@/lib/crm/queries";
import { cn } from "@/lib/utils";

type TasksManagerProps = {
  tasks: CrmTaskRow[];
  leads: CrmLeadWithRelations[];
  deals: CrmDealRow[];
};

type TaskView = "open" | "today" | "week" | "done";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function endOfWeek(date: Date): Date {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  next.setDate(next.getDate() + diff);
  return endOfDay(next);
}

export function TasksManager({ tasks, leads, deals }: TasksManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [view, setView] = useState<TaskView>("open");
  const [priority, setPriority] = useState<string>("all");

  const filtered = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now).getTime();
    const todayEnd = endOfDay(now).getTime();
    const weekEnd = endOfWeek(now).getTime();

    return tasks.filter((task) => {
      if (priority !== "all" && task.priority !== priority) return false;

      const due = task.due_at ? new Date(task.due_at).getTime() : null;
      switch (view) {
        case "done":
          return task.status === "done";
        case "today":
          return (
            task.status !== "done" &&
            task.status !== "cancelled" &&
            due !== null &&
            due >= todayStart &&
            due <= todayEnd
          );
        case "week":
          return (
            task.status !== "done" &&
            task.status !== "cancelled" &&
            due !== null &&
            due >= todayStart &&
            due <= weekEnd
          );
        case "open":
        default:
          return task.status !== "done" && task.status !== "cancelled";
      }
    });
  }, [tasks, view, priority]);

  async function onCreate(formData: FormData) {
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

  function setStatus(taskId: string, status: CrmTaskRow["status"]) {
    startTransition(async () => {
      const result = await updateTaskStatusAction(taskId, status);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  const views: { key: TaskView; label: string }[] = [
    { key: "open", label: "Open" },
    { key: "today", label: "Vandaag" },
    { key: "week", label: "Deze week" },
    { key: "done", label: "Voltooid" },
  ];

  return (
    <div className="space-y-4">
      <div className="sticky top-14 z-10 flex flex-col gap-3 rounded-xl border border-border bg-background/95 p-3 backdrop-blur sm:flex-row sm:items-center">
        <div className="flex gap-2 overflow-x-auto">
          {views.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setView(item.key)}
              className={cn(
                "shrink-0 rounded-lg border px-3 py-1.5 text-sm",
                view === item.key
                  ? "border-foreground/20 bg-muted font-medium"
                  : "border-transparent text-muted-foreground hover:bg-muted/60",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <select
          className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={priority}
          aria-label="Filter prioriteit"
          onChange={(event) => setPriority(event.target.value)}
        >
          <option value="all">Alle prioriteiten</option>
          {CRM_TASK_PRIORITIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Geen taken"
          description="Plan follow-ups gekoppeld aan leads of deals."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => (
            <div
              key={task.id}
              className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <p className="font-medium">{task.title}</p>
                {task.description ? (
                  <p className="text-sm text-muted-foreground">
                    {task.description}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{task.priority}</Badge>
                  <Badge variant="outline">{task.status}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Deadline: {formatDate(task.due_at)}
                  </span>
                  {task.lead_id ? (
                    <Link
                      href={`/crm/leads/${task.lead_id}`}
                      className="text-xs font-medium underline-offset-4 hover:underline"
                    >
                      Lead
                    </Link>
                  ) : null}
                  {task.deal_id ? (
                    <Link
                      href={`/crm/deals/${task.deal_id}`}
                      className="text-xs font-medium underline-offset-4 hover:underline"
                    >
                      Deal
                    </Link>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {CRM_TASK_STATUSES.map((status) => (
                  <Button
                    key={status.value}
                    size="sm"
                    variant={task.status === status.value ? "default" : "outline"}
                    disabled={pending}
                    onClick={() => setStatus(task.id, status.value)}
                  >
                    {status.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Card className="max-w-xl shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Nieuwe taak</CardTitle>
          <CardDescription>
            Koppel optioneel aan een lead of deal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={onCreate} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="title">Titel</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Beschrijving</Label>
              <Textarea id="description" name="description" rows={3} />
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
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lead_id">Lead</Label>
                <select
                  id="lead_id"
                  name="lead_id"
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  defaultValue=""
                >
                  <option value="">Geen</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.company_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deal_id">Deal</Label>
                <select
                  id="deal_id"
                  name="deal_id"
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  defaultValue=""
                >
                  <option value="">Geen</option>
                  {deals.map((deal) => (
                    <option key={deal.id} value={deal.id}>
                      {deal.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Opslaan…" : "Taak opslaan"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
