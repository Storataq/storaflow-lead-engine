"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createWorkflowAction } from "@/ai/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateWorkflowForm() {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [agents, setAgents] = useState(
    "storaflow-kernel-assistant",
  );
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await createWorkflowAction({
            slug,
            name,
            agentSlugs: agents
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          });
          if (r.success) {
            toast.success(r.message);
            setSlug("");
            setName("");
          } else toast.error(r.message);
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="wf-slug">Slug</Label>
        <Input id="wf-slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="wf-name">Name</Label>
        <Input id="wf-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="wf-agents">Agent slugs (comma-separated chain)</Label>
        <Input id="wf-agents" value={agents} onChange={(e) => setAgents(e.target.value)} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Create workflow"}
      </Button>
    </form>
  );
}
