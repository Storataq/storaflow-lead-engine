"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  SECURITY_AUDIT_ACTION_LABELS,
  SECURITY_UI,
  type SecurityAuditAction,
} from "@/lib/security/constants";
import type { SecurityAuditRow } from "@/lib/security/types";
import { formatDateTime, formatStatusLabel } from "@/lib/ui/format";

type Props = { events: SecurityAuditRow[] };

export function AuditLogViewer({ events }: Props) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q),
    );
  }, [events, query]);

  return (
    <div className="space-y-4">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search audit events…"
        aria-label="Search audit"
      />
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{SECURITY_UI.emptyAudit}</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((e) => (
            <li
              key={e.id}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="secondary">
                  {SECURITY_AUDIT_ACTION_LABELS[
                    e.action as SecurityAuditAction
                  ] ?? formatStatusLabel(e.action)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(e.created_at)}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">{e.description}</p>
              {e.ip_address ? (
                <p className="text-xs text-muted-foreground">{e.ip_address}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
