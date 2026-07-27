"use client";

import { Badge } from "@/components/ui/badge";

export function WorkflowVisualizer({
  agents,
  status,
  progressPct,
}: {
  agents: string[];
  status: string;
  progressPct: number;
}) {
  if (!agents.length) {
    return (
      <p className="text-sm text-muted-foreground">Geen agent-keten.</p>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {agents.map((slug, i) => (
          <div key={`${slug}-${i}`} className="flex items-center gap-2">
            <Badge variant={status === "running" ? "default" : "outline"}>
              {slug.replace("storaflow-", "").replace("-agent", "")}
            </Badge>
            {i < agents.length - 1 ? (
              <span className="text-muted-foreground">↓</span>
            ) : null}
          </div>
        ))}
        <Badge variant="secondary">Resultaat</Badge>
      </div>
      <div className="h-2 w-full overflow-hidden rounded bg-muted">
        <div
          className="h-full bg-foreground/70 transition-all"
          style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {status} · {Math.round(progressPct)}%
      </p>
    </div>
  );
}
