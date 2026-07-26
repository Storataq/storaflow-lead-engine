"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createLeadAction } from "@/lib/crm/actions";
import type { CrmPipelineRow, CrmStageRow } from "@/lib/crm/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type LeadCreateSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelines: CrmPipelineRow[];
  stages: CrmStageRow[];
  defaultPipelineId: string;
};

export function LeadCreateSheet({
  open,
  onOpenChange,
  pipelines,
  stages,
  defaultPipelineId,
}: LeadCreateSheetProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pipelineId, setPipelineId] = useState(defaultPipelineId);

  const pipelineStages = stages.filter(
    (stage) => stage.pipeline_id === pipelineId,
  );

  async function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createLeadAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      onOpenChange(false);
      if (result.id) {
        router.push(`/crm/leads/${result.id}`);
        router.refresh();
      } else {
        router.refresh();
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-[100vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(560px,calc(100vw-1.5rem))]"
      >
        <SheetHeader className="shrink-0 border-b border-border pr-12">
          <SheetTitle>Nieuwe lead</SheetTitle>
          <SheetDescription>
            Voeg een lead toe aan je pipeline. Scrape-bedrijven kun je later
            handmatig converteren.
          </SheetDescription>
        </SheetHeader>
        <form action={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <fieldset
            disabled={pending}
            className="min-h-0 flex-1 space-y-4 overflow-y-auto border-0 p-4"
          >
            <div className="space-y-2">
              <Label htmlFor="company_name">Bedrijf *</Label>
              <Input id="company_name" name="company_name" required autoFocus />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact_name">Contactpersoon</Label>
                <Input id="contact_name" name="contact_name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefoon</Label>
                <Input id="phone" name="phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Land</Label>
                <Input id="country" name="country" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Stad</Label>
                <Input id="city" name="city" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Branche</Label>
                <Input id="industry" name="industry" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Bron</Label>
                <Input id="source" name="source" defaultValue="manual" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead_score">Leadscore</Label>
                <Input
                  id="lead_score"
                  name="lead_score"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deal_value">Dealwaarde</Label>
                <Input
                  id="deal_value"
                  name="deal_value"
                  type="number"
                  min={0}
                  step="1"
                  defaultValue={0}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pipeline_id">Pipeline</Label>
                <select
                  id="pipeline_id"
                  name="pipeline_id"
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  value={pipelineId}
                  onChange={(event) => setPipelineId(event.target.value)}
                >
                  {pipelines.map((pipeline) => (
                    <option key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stage_id">Stage</Label>
                <select
                  id="stage_id"
                  name="stage_id"
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  defaultValue={pipelineStages[0]?.id}
                  required
                >
                  {pipelineStages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                name="tags"
                placeholder="bijv. hot, partner, inbound"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notities</Label>
              <Textarea id="notes" name="notes" rows={3} />
            </div>
          </fieldset>
          <SheetFooter className="shrink-0 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuleren
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Opslaan…" : "Opslaan"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
