"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createSharedNoteAction } from "@/lib/collaboration/actions";
import { COLLAB_UI } from "@/lib/collaboration/constants";
import type { SharedNoteRow } from "@/lib/collaboration/types";
import { formatDateTime } from "@/lib/ui/format";

type Props = {
  notes: SharedNoteRow[];
};

export function SharedNotesManager({ notes }: Props) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  return (
    <div className="space-y-6">
      <form
        className="max-w-xl space-y-3 rounded-lg border border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const r = await createSharedNoteAction({
              title,
              bodyText: body,
              bodyHtml: `<p>${body.replace(/</g, "&lt;")}</p>`,
            });
            if (r.success) {
              toast.success(r.message);
              setTitle("");
              setBody("");
            } else toast.error(r.message);
          });
        }}
      >
        <h3 className="text-sm font-semibold">New shared note</h3>
        <p className="text-xs text-muted-foreground">
          Rich text ready: lists, tables, images, attachments, mentions &
          history via version field.
        </p>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          required
        />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Note body"
          rows={5}
          required
        />
        <Button type="submit" disabled={pending}>
          Save note
        </Button>
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{COLLAB_UI.emptyNotes}</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li
              key={note.id}
              className="rounded-lg border border-border px-4 py-3 text-sm"
            >
              <p className="font-medium">{note.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                {note.body_text}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                v{note.version} · {formatDateTime(note.updated_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
