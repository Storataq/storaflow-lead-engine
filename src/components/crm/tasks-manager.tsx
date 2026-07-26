"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
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
import type { CrmTaskRow } from "@/lib/crm/queries";

type TasksManagerProps = {
  tasks: CrmTaskRow[];
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function TasksManager({ tasks }: TasksManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

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

  return (
    <div className="space-y-4">
      {tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Nog geen taken"
          description="Plan follow-ups en deadlines gekoppeld aan leads."
        />
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
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
            Titel, beschrijving, deadline, prioriteit en status.
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
            <Button type="submit" disabled={pending}>
              {pending ? "Opslaan…" : "Taak opslaan"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
