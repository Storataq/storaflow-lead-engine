"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { registerAgentAction } from "@/ai/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function RegisterAgentForm() {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await registerAgentAction({ slug, name, description });
          if (r.success) {
            toast.success(r.message);
            setSlug("");
            setName("");
            setDescription("");
          } else toast.error(r.message);
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="agent-slug">Slug</Label>
        <Input
          id="agent-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="sales-research-agent"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="agent-name">Name</Label>
        <Input
          id="agent-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sales Research Agent"
          required
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="agent-desc">Description</Label>
        <Textarea
          id="agent-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Registering…" : "Register agent"}
        </Button>
      </div>
    </form>
  );
}
