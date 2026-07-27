"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createKnowledgeAction } from "@/ai/actions";
import { KNOWLEDGE_SOURCE_TYPES, type KnowledgeSourceType } from "@/ai/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CreateKnowledgeForm() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sourceType, setSourceType] = useState<KnowledgeSourceType>("playbook");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await createKnowledgeAction({ title, body, sourceType });
          if (r.success) {
            toast.success(r.message);
            setTitle("");
            setBody("");
          } else toast.error(r.message);
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="k-title">Title</Label>
        <Input id="k-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="k-type">Source type</Label>
        <select
          id="k-type"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value as KnowledgeSourceType)}
        >
          {KNOWLEDGE_SOURCE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="k-body">Body</Label>
        <Textarea id="k-body" value={body} onChange={(e) => setBody(e.target.value)} rows={5} required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Add knowledge"}
      </Button>
    </form>
  );
}
