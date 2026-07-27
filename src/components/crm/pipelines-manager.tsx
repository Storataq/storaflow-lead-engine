"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { GitBranch } from "lucide-react";
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
  archivePipelineAction,
  createPipelineAction,
  updatePipelineAction,
} from "@/lib/crm/actions";
import type { CrmPipelineRow } from "@/lib/crm/queries";

type PipelinesManagerProps = {
  pipelines: CrmPipelineRow[];
};

export function PipelinesManager({ pipelines }: PipelinesManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function onCreate(formData: FormData) {
    startTransition(async () => {
      const result = await createPipelineAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  async function onUpdate(formData: FormData) {
    startTransition(async () => {
      const result = await updatePipelineAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  function onArchive(pipelineId: string, archive: boolean) {
    startTransition(async () => {
      const result = await archivePipelineAction(pipelineId, archive);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-3">
        {pipelines.length === 0 ? (
          <EmptyState
            icon={GitBranch}
            title="Nog geen pipelines"
            description="Pipelines worden automatisch aangemaakt bij eerste CRM-gebruik, of voeg er zelf een toe."
          />
        ) : (
          pipelines.map((pipeline) => (
            <Card key={pipeline.id} className="shadow-none">
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    {pipeline.name}
                    {pipeline.is_default ? (
                      <Badge variant="secondary">Default</Badge>
                    ) : null}
                    {pipeline.is_archived ? (
                      <Badge variant="outline">Archived</Badge>
                    ) : null}
                  </CardTitle>
                  <CardDescription>
                    {pipeline.description ?? "Geen beschrijving"}
                  </CardDescription>
                </div>
                <span
                  className="mt-1 size-3 rounded-full"
                  style={{ backgroundColor: pipeline.color }}
                  aria-hidden
                />
              </CardHeader>
              <CardContent className="space-y-3">
                <form
                  action={onUpdate}
                  className="grid gap-2 sm:grid-cols-2"
                >
                  <input type="hidden" name="pipeline_id" value={pipeline.id} />
                  <div className="space-y-1">
                    <Label htmlFor={`name-${pipeline.id}`}>Name</Label>
                    <Input
                      id={`name-${pipeline.id}`}
                      name="name"
                      defaultValue={pipeline.name}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`color-${pipeline.id}`}>Color</Label>
                    <Input
                      id={`color-${pipeline.id}`}
                      name="color"
                      type="color"
                      defaultValue={pipeline.color}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor={`desc-${pipeline.id}`}>Description</Label>
                    <Input
                      id={`desc-${pipeline.id}`}
                      name="description"
                      defaultValue={pipeline.description ?? ""}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    <Button type="submit" size="sm" disabled={pending}>
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        onArchive(pipeline.id, !pipeline.is_archived)
                      }
                    >
                      {pipeline.is_archived ? "Restore" : "Archive"}
                    </Button>
                  </div>
                </form>
                <p className="text-xs text-muted-foreground">
                  slug: {pipeline.slug}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className="h-fit shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Nieuwe pipeline</CardTitle>
          <CardDescription>
            Krijgt automatisch de standaard funnel stages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={onCreate} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">Naam</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="bijv. Enterprise"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Beschrijving</Label>
              <Input id="description" name="description" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Kleur</Label>
              <Input
                id="color"
                name="color"
                type="color"
                defaultValue="#2563eb"
              />
            </div>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Opslaan…" : "Pipeline toevoegen"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
