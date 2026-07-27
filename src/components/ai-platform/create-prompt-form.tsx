"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createPromptAction } from "@/ai/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CreatePromptForm() {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("general");
  const [body, setBody] = useState(
    "You are {{agent_name}}. Organization: {{organization_name}}.",
  );
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await createPromptAction({
            slug,
            name,
            templateBody: body,
            category,
          });
          if (r.success) {
            toast.success(r.message);
            setSlug("");
            setName("");
          } else toast.error(r.message);
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="p-slug">Slug</Label>
          <Input id="p-slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-name">Name</Label>
          <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-cat">Category</Label>
        <Input id="p-cat" value={category} onChange={(e) => setCategory(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-body">Template (use {"{{var}}"})</Label>
        <Textarea id="p-body" value={body} onChange={(e) => setBody(e.target.value)} rows={5} required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save prompt version"}
      </Button>
    </form>
  );
}
