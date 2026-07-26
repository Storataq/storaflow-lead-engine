"use client";

import { useState } from "react";
import { Users } from "lucide-react";

import { LeadCreateSheet } from "@/components/crm/lead-create-sheet";
import { LeadsKanban } from "@/components/crm/leads-kanban";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import type {
  CrmLeadWithRelations,
  CrmPipelineRow,
  CrmStageRow,
} from "@/lib/crm/queries";

type LeadsWorkspaceProps = {
  pipelines: CrmPipelineRow[];
  stages: CrmStageRow[];
  leads: CrmLeadWithRelations[];
  activePipelineId: string;
};

export function LeadsWorkspace({
  pipelines,
  stages,
  leads,
  activePipelineId,
}: LeadsWorkspaceProps) {
  const [open, setOpen] = useState(false);
  const [pipelineId, setPipelineId] = useState(activePipelineId);

  const pipelineStages = stages.filter(
    (stage) => stage.pipeline_id === pipelineId,
  );
  const pipelineLeads = leads.filter((lead) => lead.pipeline_id === pipelineId);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <select
          className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
        <Button onClick={() => setOpen(true)}>Nieuwe lead</Button>
      </div>

      {pipelineStages.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Geen funnel stages"
          description="Voeg stages toe via Funnels om het Kanban-bord te gebruiken."
          actionLabel="Naar funnels"
          actionHref="/crm/funnels"
        />
      ) : pipelineLeads.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nog geen leads"
          description="Maak je eerste lead aan of converteer later een gescraped bedrijf."
          action={
            <Button onClick={() => setOpen(true)}>Nieuwe lead</Button>
          }
        />
      ) : (
        <LeadsKanban
          stages={pipelineStages}
          leads={pipelineLeads}
          pipelineId={pipelineId}
        />
      )}

      <LeadCreateSheet
        open={open}
        onOpenChange={setOpen}
        pipelines={pipelines}
        stages={stages}
        defaultPipelineId={pipelineId}
      />
    </div>
  );
}
