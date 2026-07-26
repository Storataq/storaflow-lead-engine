"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";

import { createNoteAction } from "@/lib/crm/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type RichNoteEditorProps = {
  leadId: string;
  onSaved?: () => void;
};

export function RichNoteEditor({ leadId, onSaved }: RichNoteEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();

  function exec(command: string) {
    document.execCommand(command);
    editorRef.current?.focus();
  }

  function save() {
    const html = editorRef.current?.innerHTML?.trim() ?? "";
    const text = editorRef.current?.innerText?.trim() ?? "";
    if (!text) {
      toast.error("Notitie mag niet leeg zijn.");
      return;
    }

    const formData = new FormData();
    formData.set("lead_id", leadId);
    formData.set("body_html", html);
    formData.set("body_text", text);

    startTransition(async () => {
      const result = await createNoteAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      if (editorRef.current) editorRef.current.innerHTML = "";
      onSaved?.();
    });
  }

  return (
    <div className="space-y-2">
      <Label>Nieuwe notitie</Label>
      <div className="flex flex-wrap gap-1">
        <Button type="button" size="sm" variant="outline" onClick={() => exec("bold")}>
          Vet
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => exec("italic")}
        >
          Cursief
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => exec("insertUnorderedList")}
        >
          Lijst
        </Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Notitie bewerken"
        className="min-h-28 rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        suppressContentEditableWarning
      />
      <Button type="button" disabled={pending} onClick={save}>
        {pending ? "Opslaan…" : "Notitie opslaan"}
      </Button>
    </div>
  );
}
