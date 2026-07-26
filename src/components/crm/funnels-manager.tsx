"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Filter } from "lucide-react";
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
import { createStageAction } from "@/lib/crm/actions";
import type { CrmPipelineRow, CrmStageRow } from "@/lib/crm/queries";

type FunnelsManagerProps = {
  pipelines: CrmPipelineRow[];
  stages: CrmStageRow[];
};

export function FunnelsManager({ pipelines, stages }: FunnelsManagerProps) {
  const router = useRouter();
  const [pipelineId, setPipelineId] = useState(pipelines[0]?.id ?? "");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(
    () =>
      stages
        .filter((stage) => stage.pipeline_id === pipelineId)
        .sort((a, b) => a.sort_order - b.sort_order),
    [stages, pipelineId],
  );

  async function onCreate(formData: FormData) {
    startTransition(async () => {
      const result = await createStageAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  if (pipelines.length === 0) {
    return (
      <EmptyState
        icon={Filter}
        title="Geen pipelines"
        description="Maak eerst een pipeline aan."
        actionLabel="Naar pipelines"
        actionHref="/crm/pipelines"
      />
    );
  }

  return (
    <div className="space-y-4">
      <select
        className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
        value={pipelineId}
        aria-label="Kies pipeline"
        onChange={(event) => setPipelineId(event.target.value)}
      >
        {pipelines.map((pipeline) => (
          <option key={pipeline.id} value={pipeline.id}>
            {pipeline.name}
          </option>
        ))}
      </select>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-2">
          {filtered.map((stage) => (
            <div
              key={stage.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <div className="min-w-0">
                  <p className="font-medium">{stage.name}</p>
                  <p className="text-xs text-muted-foreground">{stage.slug}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {stage.is_won ? <Badge variant="secondary">Gewonnen</Badge> : null}
                {stage.is_lost ? <Badge variant="destructive">Verloren</Badge> : null}
              </div>
            </div>
          ))}
        </div>

        <Card className="h-fit shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Stage toevoegen</CardTitle>
            <CardDescription>Volledig configureerbare funnel stages.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={onCreate} className="space-y-3">
              <input type="hidden" name="pipeline_id" value={pipelineId} />
              <div className="space-y-2">
                <Label htmlFor="name">Naam</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Kleur</Label>
                <Input id="color" name="color" type="color" defaultValue="#64748b" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="is_won" />
                Gewonnen-stage
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="is_lost" />
                Verloren-stage
              </label>
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Opslaan…" : "Stage toevoegen"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
