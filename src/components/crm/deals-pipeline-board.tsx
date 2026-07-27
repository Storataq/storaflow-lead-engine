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
import { Handshake } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/layout/empty-state";
import { LeadScoreBadge } from "@/components/crm/lead-score-badge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { moveDealStageAction } from "@/lib/crm/actions";
import { formatDealValue } from "@/lib/crm/constants";
import {
  effectiveDealProbability,
  weightedRevenue,
} from "@/lib/crm/pipeline/constants";
import type {
  CrmDealWithRelations,
  CrmPipelineRow,
  CrmStageRow,
  OrgMemberOption,
} from "@/lib/crm/queries";
import { cn } from "@/lib/utils";

type DealsPipelineBoardProps = {
  pipelines: CrmPipelineRow[];
  stages: CrmStageRow[];
  deals: CrmDealWithRelations[];
  members: OrgMemberOption[];
  initialPipelineId: string;
};

function ownerLabel(ownerId: string | null, members: OrgMemberOption[]) {
  if (!ownerId) return "Unassigned";
  return (
    members.find((member) => member.userId === ownerId)?.label ??
    ownerId.slice(0, 8)
  );
}

function DealCard({
  deal,
  stage,
  members,
  dragging,
}: {
  deal: CrmDealWithRelations;
  stage: CrmStageRow | null;
  members: OrgMemberOption[];
  dragging?: boolean;
}) {
  const probability = effectiveDealProbability(
    deal.probability,
    stage?.probability,
  );
  const expected = weightedRevenue(Number(deal.value), probability);

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-3 shadow-none",
        dragging && "opacity-90 ring-2 ring-primary/30",
      )}
    >
      <Link
        href={`/crm/deals/${deal.id}`}
        className="font-medium hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        {deal.title}
      </Link>
      <p className="mt-1 text-sm text-muted-foreground">
        {deal.lead?.company_name ?? "No company"}
      </p>
      <p className="mt-1 text-sm font-medium">
        {formatDealValue(Number(deal.value), deal.currency)}
      </p>
      <p className="text-xs text-muted-foreground">
        Expected {formatDealValue(expected, deal.currency)} · {probability}%
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        <Badge variant="outline">{deal.priority}</Badge>
        <Badge variant="secondary">{deal.status}</Badge>
        {deal.lead_ai_score != null || deal.lead_score_classification ? (
          <LeadScoreBadge
            score={deal.lead_ai_score}
            classification={deal.lead_score_classification}
          />
        ) : null}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {ownerLabel(deal.owner_user_id, members)}
      </p>
      <p className="text-xs text-muted-foreground">
        Updated{" "}
        {new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(
          new Date(deal.updated_at),
        )}
      </p>
    </div>
  );
}

function SortableDealCard({
  deal,
  stage,
  members,
}: {
  deal: CrmDealWithRelations;
  stage: CrmStageRow | null;
  members: OrgMemberOption[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: deal.id, data: { type: "deal", deal } });

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
      <DealCard deal={deal} stage={stage} members={members} />
    </div>
  );
}

function StageColumn({
  stage,
  deals,
  members,
}: {
  stage: CrmStageRow;
  deals: CrmDealWithRelations[];
  members: OrgMemberOption[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border border-border bg-muted/20",
        isOver && "ring-2 ring-primary/20",
      )}
    >
      <div className="border-b border-border px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: stage.color }}
              aria-hidden
            />
            <h3 className="text-sm font-medium">{stage.name}</h3>
          </div>
          <Badge variant="outline">{deals.length}</Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Win prob. {stage.probability ?? 0}%
        </p>
      </div>
      <SortableContext
        items={deals.map((deal) => deal.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto p-2">
          {deals.map((deal) => (
            <SortableDealCard
              key={deal.id}
              deal={deal}
              stage={stage}
              members={members}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function DealsPipelineBoard({
  pipelines,
  stages,
  deals,
  members,
  initialPipelineId,
}: DealsPipelineBoardProps) {
  const [pipelineId, setPipelineId] = useState(
    initialPipelineId || pipelines[0]?.id || "",
  );
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

  const filteredDeals = useMemo(() => {
    const q = query.trim().toLowerCase();
    return deals.filter((deal) => {
      if (deal.pipeline_id !== pipelineId) return false;
      if (!q) return true;
      return (
        deal.title.toLowerCase().includes(q) ||
        (deal.lead?.company_name ?? "").toLowerCase().includes(q) ||
        (deal.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [deals, pipelineId, query]);

  const dealsByStage = useMemo(() => {
    const map = new Map<string, CrmDealWithRelations[]>();
    for (const stage of pipelineStages) map.set(stage.id, []);
    for (const deal of filteredDeals) {
      const list = map.get(deal.stage_id);
      if (list) list.push(deal);
    }
    return map;
  }, [filteredDeals, pipelineStages]);

  const activeDeal = filteredDeals.find((deal) => deal.id === activeId) ?? null;
  const activeStage =
    pipelineStages.find((stage) => stage.id === activeDeal?.stage_id) ?? null;

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    const dealId = String(event.active.id);
    setActiveId(null);
    const overId = event.over?.id ? String(event.over.id) : null;
    if (!overId) return;

    const overStage =
      pipelineStages.find((stage) => stage.id === overId) ??
      pipelineStages.find((stage) =>
        (dealsByStage.get(stage.id) ?? []).some((deal) => deal.id === overId),
      );
    if (!overStage) return;

    const deal = filteredDeals.find((row) => row.id === dealId);
    if (!deal || deal.stage_id === overStage.id) return;

    startTransition(async () => {
      const result = await moveDealStageAction(dealId, overStage.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
    });
  }

  if (pipelines.length === 0) {
    return (
      <EmptyState
        icon={Handshake}
        title="No pipelines"
        description="Create a sales pipeline first."
        actionLabel="Pipelines"
        actionHref="/crm/pipelines"
      />
    );
  }

  return (
    <div className={cn("space-y-4", pending && "opacity-80")}>
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="flex h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={pipelineId}
          aria-label="Pipeline"
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
          placeholder="Filter deals…"
          className="max-w-xs"
          aria-label="Filter deals"
        />
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
              deals={dealsByStage.get(stage.id) ?? []}
              members={members}
            />
          ))}
        </div>
        <DragOverlay>
          {activeDeal ? (
            <DealCard
              deal={activeDeal}
              stage={activeStage}
              members={members}
              dragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
