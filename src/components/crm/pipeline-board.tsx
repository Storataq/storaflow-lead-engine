"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

import { moveLeadStageAction } from "@/lib/crm/actions";
import { formatDealValue } from "@/lib/crm/constants";
import type {
  CrmLeadWithRelations,
  CrmPipelineRow,
  CrmStageRow,
  OrgMemberOption,
} from "@/lib/crm/queries";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PipelineBoardProps = {
  pipelines: CrmPipelineRow[];
  stages: CrmStageRow[];
  leads: CrmLeadWithRelations[];
  members: OrgMemberOption[];
  initialPipelineId: string;
};

function ownerLabel(
  ownerId: string | null,
  members: OrgMemberOption[],
): string {
  if (!ownerId) return "Niet toegewezen";
  return (
    members.find((member) => member.userId === ownerId)?.label ??
    ownerId.slice(0, 8)
  );
}

function LeadCard({
  lead,
  members,
  dragging,
}: {
  lead: CrmLeadWithRelations;
  members: OrgMemberOption[];
  dragging?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-3 shadow-none",
        dragging && "opacity-90 ring-2 ring-primary/30",
      )}
    >
      <Link
        href={`/crm/leads/${lead.id}`}
        className="font-medium hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        {lead.company_name}
      </Link>
      <p className="mt-1 text-sm font-medium">
        {formatDealValue(Number(lead.deal_value), lead.currency)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {ownerLabel(lead.owner_user_id, members)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Laatste activiteit:{" "}
        {new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(
          new Date(lead.updated_at),
        )}
      </p>
    </div>
  );
}

function SortableLeadCard({
  lead,
  members,
}: {
  lead: CrmLeadWithRelations;
  members: OrgMemberOption[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id, data: { type: "lead", lead } });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn("touch-none", isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
    >
      <LeadCard lead={lead} members={members} />
    </div>
  );
}

function StageColumn({
  stage,
  leads,
  members,
}: {
  stage: CrmStageRow;
  leads: CrmLeadWithRelations[];
  members: OrgMemberOption[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { type: "stage", stage },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border border-border bg-muted/20",
        isOver && "ring-2 ring-primary/20",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: stage.color }}
            aria-hidden
          />
          <h3 className="truncate text-sm font-medium">{stage.name}</h3>
        </div>
        <Badge variant="outline">{leads.length}</Badge>
      </div>
      <SortableContext
        items={leads.map((lead) => lead.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto p-2">
          {leads.map((lead) => (
            <SortableLeadCard key={lead.id} lead={lead} members={members} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function PipelineBoard({
  pipelines,
  stages,
  leads,
  members,
  initialPipelineId,
}: PipelineBoardProps) {
  const [pipelineId, setPipelineId] = useState(initialPipelineId);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState(leads);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const pipelineStages = useMemo(
    () =>
      stages
        .filter((stage) => stage.pipeline_id === pipelineId)
        .sort((a, b) => a.sort_order - b.sort_order),
    [stages, pipelineId],
  );

  const pipelineLeads = useMemo(() => {
    return items.filter((lead) => {
      if (lead.pipeline_id !== pipelineId) return false;
      if (!query.trim()) return true;
      const needle = query.trim().toLowerCase();
      return [
        lead.company_name,
        lead.contact_name ?? "",
        ownerLabel(lead.owner_user_id, members),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [items, pipelineId, query, members]);

  const totalValue = pipelineLeads.reduce(
    (sum, lead) => sum + Number(lead.deal_value ?? 0),
    0,
  );

  const byStage = useMemo(() => {
    const map = new Map<string, CrmLeadWithRelations[]>();
    for (const stage of pipelineStages) map.set(stage.id, []);
    for (const lead of pipelineLeads) {
      const bucket = map.get(lead.stage_id);
      if (bucket) bucket.push(lead);
    }
    return map;
  }, [pipelineLeads, pipelineStages]);

  const activeLead = activeId
    ? items.find((lead) => lead.id === activeId) ?? null
    : null;

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const leadId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;
    if (!overId) return;

    const overStage =
      pipelineStages.find((stage) => stage.id === overId) ??
      pipelineStages.find((stage) =>
        (byStage.get(stage.id) ?? []).some((lead) => lead.id === overId),
      );

    if (!overStage) return;
    const current = items.find((lead) => lead.id === leadId);
    if (!current || current.stage_id === overStage.id) return;

    setItems((prev) =>
      prev.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              stage_id: overStage.id,
              stage: {
                id: overStage.id,
                name: overStage.name,
                color: overStage.color,
                slug: overStage.slug,
                is_won: overStage.is_won,
                is_lost: overStage.is_lost,
              },
              status: overStage.is_won
                ? "won"
                : overStage.is_lost
                  ? "lost"
                  : "open",
              updated_at: new Date().toISOString(),
            }
          : lead,
      ),
    );

    startTransition(() => {
      void moveLeadStageAction(leadId, overStage.id).then((result) => {
        if (!result.success) {
          toast.error(result.message);
          setItems(leads);
          return;
        }
        toast.success(result.message);
      });
    });
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-14 z-10 flex flex-col gap-3 rounded-xl border border-border bg-background/95 p-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
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
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter kaarten…"
            className="sm:max-w-xs"
            aria-label="Filter pipeline"
          />
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Totale pipeline waarde</p>
            <p className="font-semibold">{formatDealValue(totalValue)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Aantal deals</p>
            <p className="font-semibold">{pipelineLeads.length}</p>
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          {pipelineStages.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              leads={byStage.get(stage.id) ?? []}
              members={members}
            />
          ))}
        </div>
        <DragOverlay>
          {activeLead ? (
            <LeadCard lead={activeLead} members={members} dragging />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
