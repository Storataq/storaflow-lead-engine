"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Filter } from "lucide-react";
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
import {
  createStageAction,
  reorderStagesAction,
  updateStageAction,
} from "@/lib/crm/actions";
import type { CrmPipelineRow, CrmStageRow } from "@/lib/crm/queries";

type FunnelsManagerProps = {
  pipelines: CrmPipelineRow[];
  stages: CrmStageRow[];
};

export function FunnelsManager({ pipelines, stages }: FunnelsManagerProps) {
  const router = useRouter();
  const [pipelineId, setPipelineId] = useState(pipelines[0]?.id ?? "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(
    () =>
      stages
        .filter((stage) => stage.pipeline_id === pipelineId)
        .sort((a, b) => a.sort_order - b.sort_order),
    [stages, pipelineId],
  );

  function refresh() {
    router.refresh();
  }

  async function onCreate(formData: FormData) {
    startTransition(async () => {
      const result = await createStageAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      refresh();
    });
  }

  async function onUpdate(formData: FormData) {
    startTransition(async () => {
      const result = await updateStageAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setEditingId(null);
      refresh();
    });
  }

  function moveStage(stageId: string, direction: -1 | 1) {
    const ids = filtered.map((stage) => stage.id);
    const index = ids.indexOf(stageId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) return;
    const next = [...ids];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    startTransition(async () => {
      const result = await reorderStagesAction(pipelineId, next);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      refresh();
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
          {filtered.map((stage, index) => (
            <div
              key={stage.id}
              className="rounded-xl border border-border px-4 py-3"
            >
              {editingId === stage.id ? (
                <form action={onUpdate} className="space-y-3">
                  <input type="hidden" name="stage_id" value={stage.id} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor={`name-${stage.id}`}>Naam</Label>
                      <Input
                        id={`name-${stage.id}`}
                        name="name"
                        defaultValue={stage.name}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`color-${stage.id}`}>Kleur</Label>
                      <Input
                        id={`color-${stage.id}`}
                        name="color"
                        type="color"
                        defaultValue={stage.color}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`prob-${stage.id}`}>Probability %</Label>
                      <Input
                        id={`prob-${stage.id}`}
                        name="probability"
                        type="number"
                        min={0}
                        max={100}
                        defaultValue={stage.probability ?? 0}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="is_won"
                        defaultChecked={stage.is_won}
                      />
                      Gewonnen
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="is_lost"
                        defaultChecked={stage.is_lost}
                      />
                      Verloren
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={pending}>
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    <div className="min-w-0">
                      <p className="font-medium">{stage.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {stage.slug} · {stage.probability ?? 0}% probability
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {stage.is_won ? (
                      <Badge variant="secondary">Won</Badge>
                    ) : null}
                    {stage.is_lost ? (
                      <Badge variant="destructive">Lost</Badge>
                    ) : null}
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Move up"
                      disabled={pending || index === 0}
                      onClick={() => moveStage(stage.id, -1)}
                    >
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Move down"
                      disabled={pending || index === filtered.length - 1}
                      onClick={() => moveStage(stage.id, 1)}
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(stage.id)}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <Card className="h-fit shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Stage toevoegen</CardTitle>
            <CardDescription>
              Configureer naam, kleur en win probability.
            </CardDescription>
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
                <Input
                  id="color"
                  name="color"
                  type="color"
                  defaultValue="#64748b"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="probability">Probability %</Label>
                <Input
                  id="probability"
                  name="probability"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={20}
                />
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
