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
  CrmStageRow,
} from "@/lib/crm/queries";
import { LeadScoreBadge } from "@/components/crm/lead-score-badge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type LeadsKanbanProps = {
  stages: CrmStageRow[];
  leads: CrmLeadWithRelations[];
  pipelineId: string;
};

function LeadCard({
  lead,
  dragging,
}: {
  lead: CrmLeadWithRelations;
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
      {lead.contact_name ? (
        <p className="mt-1 text-xs text-muted-foreground">{lead.contact_name}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <LeadScoreBadge
          score={lead.ai_lead_score ?? lead.lead_score}
          classification={lead.score_classification}
        />
        {lead.deal_value > 0 ? (
          <span className="text-xs text-muted-foreground">
            {formatDealValue(Number(lead.deal_value), lead.currency)}
          </span>
        ) : null}
      </div>
      {lead.city || lead.country ? (
        <p className="mt-2 truncate text-xs text-muted-foreground">
          {[lead.city, lead.country].filter(Boolean).join(", ")}
        </p>
      ) : null}
    </div>
  );
}

function SortableLeadCard({ lead }: { lead: CrmLeadWithRelations }) {
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
      <LeadCard lead={lead} />
    </div>
  );
}

function StageColumn({
  stage,
  leads,
}: {
  stage: CrmStageRow;
  leads: CrmLeadWithRelations[];
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
            <SortableLeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function LeadsKanban({ stages, leads }: LeadsKanbanProps) {
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [items, setItems] = useState(leads);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const sources = useMemo(() => {
    return [
      ...new Set(items.map((item) => item.source).filter(Boolean)),
    ] as string[];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((lead) => {
      if (sourceFilter !== "all" && lead.source !== sourceFilter) return false;
      if (!query.trim()) return true;
      const needle = query.trim().toLowerCase();
      return [
        lead.company_name,
        lead.contact_name ?? "",
        lead.email ?? "",
        lead.city ?? "",
        lead.country ?? "",
        ...(lead.tags ?? []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [items, query, sourceFilter]);

  const byStage = useMemo(() => {
    const map = new Map<string, CrmLeadWithRelations[]>();
    for (const stage of stages) map.set(stage.id, []);
    for (const lead of filtered) {
      const bucket = map.get(lead.stage_id);
      if (bucket) bucket.push(lead);
    }
    return map;
  }, [filtered, stages]);

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
      stages.find((stage) => stage.id === overId) ??
      stages.find((stage) =>
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
            }
          : lead,
      ),
    );

    startTransition(() => {
      void moveLeadStageAction(leadId, overStage.id)
        .then((result) => {
          if (!result.success) {
            toast.error(result.message);
            setItems(leads);
            return;
          }
          toast.success(result.message);
        })
        .catch(() => {
          toast.error("Stage wijzigen mislukt. Probeer opnieuw.");
          setItems(leads);
        });
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="kanban-search" className="sr-only">
          Filter leads
        </label>
        <Input
          id="kanban-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Zoek op bedrijf, contact, tag…"
          className="sm:max-w-xs"
          aria-label="Filter leads"
        />
        <select
          className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={sourceFilter}
          aria-label="Filter op bron"
          onChange={(event) => setSourceFilter(event.target.value)}
        >
          <option value="all">Alle bronnen</option>
          {sources.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          {stages.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              leads={byStage.get(stage.id) ?? []}
            />
          ))}
        </div>
        <DragOverlay>
          {activeLead ? <LeadCard lead={activeLead} dragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
