"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";
import { StickyNote } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createNoteAction } from "@/lib/crm/actions";
import type { CrmLeadWithRelations, CrmNoteRow } from "@/lib/crm/queries";

type NotesManagerProps = {
  notes: CrmNoteRow[];
  leads: CrmLeadWithRelations[];
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function NotesManager({ notes, leads }: NotesManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function onCreate(formData: FormData) {
    const text = String(formData.get("body_text") ?? "").trim();
    formData.set("body_html", `<p>${text.replace(/\n/g, "<br/>")}</p>`);
    startTransition(async () => {
      const result = await createNoteAction(formData);
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
      {notes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="Nog geen notities"
          description="Schrijf rich-text notities op leadniveau."
        />
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <article
              key={note.id}
              className="rounded-xl border border-border p-4"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{formatDate(note.created_at)}</span>
                {note.lead_id ? (
                  <Link
                    href={`/crm/leads/${note.lead_id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    Bekijk lead
                  </Link>
                ) : null}
              </div>
              <div
                className="prose prose-sm max-w-none text-sm"
                dangerouslySetInnerHTML={{ __html: note.body_html }}
              />
            </article>
          ))}
        </div>
      )}

      <Card className="max-w-xl shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Notitie toevoegen</CardTitle>
          <CardDescription>Chronologisch opgeslagen per lead.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={onCreate} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="lead_id">Lead</Label>
              <select
                id="lead_id"
                name="lead_id"
                required
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                defaultValue={leads[0]?.id}
              >
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.company_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="body_text">Inhoud</Label>
              <Textarea id="body_text" name="body_text" rows={5} required />
            </div>
            <Button type="submit" disabled={pending || leads.length === 0}>
              {pending ? "Opslaan…" : "Notitie opslaan"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
