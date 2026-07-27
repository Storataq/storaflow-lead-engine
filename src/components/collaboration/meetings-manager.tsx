"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createMeetingAction } from "@/lib/collaboration/actions";
import {
  COLLAB_UI,
  MEETING_STATUS_LABELS,
  type MeetingStatus,
} from "@/lib/collaboration/constants";
import { generateMeetingRecap } from "@/lib/collaboration/ai";
import type { MeetingRow } from "@/lib/collaboration/types";
import { formatDateTime } from "@/lib/ui/format";

type Props = {
  meetings: MeetingRow[];
};

export function MeetingsManager({ meetings }: Props) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [agenda, setAgenda] = useState("");
  const [notes, setNotes] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = meetings.find((m) => m.id === selectedId) ?? null;
  const recap = useMemo(() => {
    if (!selected) return null;
    const actions = Array.isArray(selected.action_items_json)
      ? (selected.action_items_json as Array<{ title?: string }>).map(
          (a) => a.title ?? String(a),
        )
      : [];
    return generateMeetingRecap({
      title: selected.title,
      agenda: selected.agenda_html,
      notes: selected.notes_html,
      actionItems: actions.filter(Boolean) as string[],
    });
  }, [selected]);

  return (
    <div className="space-y-6">
      <form
        className="max-w-xl space-y-3 rounded-lg border border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const r = await createMeetingAction({
              title,
              agendaHtml: agenda,
              notesHtml: notes,
              scheduledAt: scheduledAt
                ? new Date(scheduledAt).toISOString()
                : null,
              status: "scheduled",
              actionItemsJson: [],
              participantsJson: [],
            });
            if (r.success) {
              toast.success(r.message);
              setTitle("");
              setAgenda("");
              setNotes("");
              setScheduledAt("");
            } else toast.error(r.message);
          });
        }}
      >
        <h3 className="text-sm font-semibold">Schedule meeting</h3>
        <p className="text-xs text-muted-foreground">
          {COLLAB_UI.futureVideo} · {COLLAB_UI.futureChat}
        </p>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          required
        />
        <Input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          aria-label="Scheduled at"
        />
        <Textarea
          value={agenda}
          onChange={(e) => setAgenda(e.target.value)}
          placeholder="Agenda"
          rows={3}
        />
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Meeting notes"
          rows={3}
        />
        <Button type="submit" disabled={pending}>
          Save meeting
        </Button>
      </form>

      {meetings.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {COLLAB_UI.emptyMeetings}
        </p>
      ) : (
        <ul className="space-y-3">
          {meetings.map((meeting) => (
            <li
              key={meeting.id}
              className="rounded-lg border border-border px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{meeting.title}</p>
                <Badge variant="secondary">
                  {MEETING_STATUS_LABELS[meeting.status as MeetingStatus] ??
                    meeting.status}
                </Badge>
              </div>
              {meeting.scheduled_at ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(meeting.scheduled_at)}
                </p>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="mt-2"
                onClick={() =>
                  setSelectedId((id) =>
                    id === meeting.id ? null : meeting.id,
                  )
                }
              >
                AI meeting recap
              </Button>
              {selectedId === meeting.id && recap ? (
                <div className="mt-2 rounded-md bg-muted/50 p-3">
                  <p className="font-medium">{recap.title}</p>
                  <p className="text-muted-foreground">{recap.body}</p>
                  <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                    {recap.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
