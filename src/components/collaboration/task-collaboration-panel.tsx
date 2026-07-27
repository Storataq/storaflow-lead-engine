"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addChecklistItemAction,
  addSubtaskAction,
  addTaskWatcherAction,
} from "@/lib/collaboration/actions";

type Props = {
  taskId: string;
  members: Array<{ userId: string; label: string }>;
};

export function TaskCollaborationPanel({ taskId, members }: Props) {
  const [pending, startTransition] = useTransition();
  const [checklistTitle, setChecklistTitle] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [watcherId, setWatcherId] = useState(members[0]?.userId ?? "");

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-border p-3 text-sm">
      <p className="font-medium">Task collaboration</p>
      <p className="text-xs text-muted-foreground">
        Watchers, followers, checklists, subtasks, dependencies, comments &
        attachments.
      </p>
      <div className="flex flex-wrap gap-2">
        <Input
          value={checklistTitle}
          onChange={(e) => setChecklistTitle(e.target.value)}
          placeholder="Checklist item"
          className="max-w-xs"
        />
        <Button
          type="button"
          size="sm"
          disabled={pending || !checklistTitle.trim()}
          onClick={() =>
            startTransition(async () => {
              const r = await addChecklistItemAction({
                taskId,
                title: checklistTitle,
              });
              toast[r.success ? "success" : "error"](r.message);
              if (r.success) setChecklistTitle("");
            })
          }
        >
          Add checklist
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input
          value={subtaskTitle}
          onChange={(e) => setSubtaskTitle(e.target.value)}
          placeholder="Subtask"
          className="max-w-xs"
        />
        <Button
          type="button"
          size="sm"
          disabled={pending || !subtaskTitle.trim()}
          onClick={() =>
            startTransition(async () => {
              const r = await addSubtaskAction({
                parentTaskId: taskId,
                title: subtaskTitle,
              });
              toast[r.success ? "success" : "error"](r.message);
              if (r.success) setSubtaskTitle("");
            })
          }
        >
          Add subtask
        </Button>
      </div>
      {members.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={watcherId}
            onChange={(e) => setWatcherId(e.target.value)}
            aria-label="Watcher"
          >
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.label}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            disabled={pending || !watcherId}
            onClick={() =>
              startTransition(async () => {
                const r = await addTaskWatcherAction({
                  taskId,
                  userId: watcherId,
                  role: "watcher",
                });
                toast[r.success ? "success" : "error"](r.message);
              })
            }
          >
            Add watcher
          </Button>
        </div>
      ) : null}
    </div>
  );
}
