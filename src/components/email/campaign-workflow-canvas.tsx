"use client";

import {
  useCallback,
  useRef,
  useState,
  useTransition,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BUILDER_BLOCK_LABELS,
  BUILDER_BLOCK_TYPES,
  type BuilderBlockType,
} from "@/lib/email/campaign-builder/constants";
import { saveCampaignWorkflowAction } from "@/lib/email/campaign-builder/actions";
import type {
  WorkflowEdge,
  WorkflowGraph,
  WorkflowNode,
} from "@/lib/email/campaign-builder/types";
import { cn } from "@/lib/utils";

type CampaignWorkflowCanvasProps = {
  campaignId: string;
  initialGraph: WorkflowGraph;
  readOnly?: boolean;
};

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function CampaignWorkflowCanvas({
  campaignId,
  initialGraph,
  readOnly = false,
}: CampaignWorkflowCanvasProps) {
  const [graph, setGraph] = useState<WorkflowGraph>(initialGraph);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dragRef = useRef<{
    nodeId: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const panRef = useRef<{
    startX: number;
    startY: number;
    originPanX: number;
    originPanY: number;
  } | null>(null);

  const selected = graph.nodes.find((n) => n.id === selectedId) ?? null;

  const addBlock = useCallback((type: BuilderBlockType) => {
    if (readOnly) return;
    setGraph((prev) => {
      const node: WorkflowNode = {
        id: newId(type),
        type,
        label: BUILDER_BLOCK_LABELS[type],
        x: 120 - prev.panX / prev.zoom + prev.nodes.length * 24,
        y: 120 - prev.panY / prev.zoom,
        config: {},
      };
      const last = prev.nodes[prev.nodes.length - 1];
      const edges: WorkflowEdge[] = [...prev.edges];
      if (last && type !== "start") {
        edges.push({
          id: newId("edge"),
          source: last.id,
          target: node.id,
        });
      }
      return { ...prev, nodes: [...prev.nodes, node], edges };
    });
  }, [readOnly]);

  function onNodePointerDown(e: ReactPointerEvent, node: WorkflowNode) {
    if (readOnly || node.type === "start") {
      setSelectedId(node.id);
      return;
    }
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      nodeId: node.id,
      startX: e.clientX,
      startY: e.clientY,
      originX: node.x,
      originY: node.y,
    };
    setSelectedId(node.id);
  }

  function onCanvasPointerDown(e: ReactPointerEvent) {
    if ((e.target as HTMLElement).dataset.canvas !== "true") return;
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originPanX: graph.panX,
      originPanY: graph.panY,
    };
    setSelectedId(null);
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (dragRef.current) {
      const dx = (e.clientX - dragRef.current.startX) / graph.zoom;
      const dy = (e.clientY - dragRef.current.startY) / graph.zoom;
      const { nodeId, originX, originY } = dragRef.current;
      setGraph((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === nodeId
            ? { ...n, x: originX + dx, y: originY + dy }
            : n,
        ),
      }));
      return;
    }
    if (panRef.current) {
      const dx = e.clientX - panRef.current.startX;
      const dy = e.clientY - panRef.current.startY;
      setGraph((prev) => ({
        ...prev,
        panX: panRef.current!.originPanX + dx,
        panY: panRef.current!.originPanY + dy,
      }));
    }
  }

  function onPointerUp() {
    dragRef.current = null;
    panRef.current = null;
  }

  function zoomBy(delta: number) {
    setGraph((prev) => ({
      ...prev,
      zoom: Math.min(1.8, Math.max(0.45, Number((prev.zoom + delta).toFixed(2)))),
    }));
  }

  function removeSelected() {
    if (!selected || selected.type === "start" || readOnly) return;
    setGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== selected.id),
      edges: prev.edges.filter(
        (e) => e.source !== selected.id && e.target !== selected.id,
      ),
    }));
    setSelectedId(null);
  }

  function save() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("campaignId", campaignId);
      fd.set("graphJson", JSON.stringify(graph));
      const result = await saveCampaignWorkflowAction(fd);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
    });
  }

  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => zoomBy(0.1)}>
          Zoom +
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => zoomBy(-0.1)}>
          Zoom −
        </Button>
        <Badge variant="outline">{Math.round(graph.zoom * 100)}%</Badge>
        {!readOnly ? (
          <>
            <Button type="button" size="sm" onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save workflow"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={removeSelected}
              disabled={!selected || selected.type === "start"}
            >
              Remove block
            </Button>
          </>
        ) : null}
      </div>

      {!readOnly ? (
        <div className="flex flex-wrap gap-2">
          {BUILDER_BLOCK_TYPES.filter((t) => t !== "start").map((type) => (
            <Button
              key={type}
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => addBlock(type)}
            >
              + {BUILDER_BLOCK_LABELS[type]}
            </Button>
          ))}
        </div>
      ) : null}

      <div
        className="relative h-[440px] overflow-hidden rounded-xl border bg-muted/30 touch-none"
        data-canvas="true"
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        role="application"
        aria-label="Campaign workflow canvas"
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {graph.edges.map((edge) => {
            const s = nodeMap.get(edge.source);
            const t = nodeMap.get(edge.target);
            if (!s || !t) return null;
            const x1 = s.x * graph.zoom + graph.panX + 70;
            const y1 = s.y * graph.zoom + graph.panY + 28;
            const x2 = t.x * graph.zoom + graph.panX + 70;
            const y2 = t.y * graph.zoom + graph.panY + 28;
            return (
              <g key={edge.id}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="currentColor"
                  className="text-border"
                  strokeWidth={2}
                  markerEnd="url(#arrow)"
                />
                {edge.label ? (
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 6}
                    className="fill-muted-foreground text-[10px]"
                    textAnchor="middle"
                  >
                    {edge.label}
                  </text>
                ) : null}
              </g>
            );
          })}
          <defs>
            <marker
              id="arrow"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L6,3 L0,6 Z" className="fill-border" />
            </marker>
          </defs>
        </svg>

        {graph.nodes.map((node) => (
          <button
            key={node.id}
            type="button"
            className={cn(
              "absolute w-[140px] rounded-lg border bg-background px-3 py-2 text-left shadow-sm transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selectedId === node.id && "ring-2 ring-ring",
              node.type === "start" && "border-emerald-500/40",
              (node.type === "end" || node.type === "exit") && "border-rose-500/40",
              node.type === "send_email" && "border-sky-500/40",
              (node.type === "condition" ||
                node.type === "decision" ||
                node.type === "split") &&
                "border-amber-500/40",
            )}
            style={{
              transform: `translate(${node.x * graph.zoom + graph.panX}px, ${
                node.y * graph.zoom + graph.panY
              }px) scale(${graph.zoom})`,
              transformOrigin: "top left",
            }}
            onPointerDown={(e) => onNodePointerDown(e, node)}
          >
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {BUILDER_BLOCK_LABELS[node.type]}
            </p>
            <p className="truncate text-sm font-medium">{node.label}</p>
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Drag the canvas to pan. Drag blocks to reposition. Layout is stored on the
        campaign; sequence execution still uses sequence steps when linked.
      </p>
    </div>
  );
}
