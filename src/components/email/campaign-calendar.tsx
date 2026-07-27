"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  EMAIL_CAMPAIGN_STATUS_LABELS,
  type EmailCampaignStatusExtended,
} from "@/lib/email/campaign/constants";
import type { EmailCampaignRow } from "@/lib/email/campaign/queries";
import { cn } from "@/lib/utils";

type CampaignCalendarProps = {
  campaigns: EmailCampaignRow[];
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function statusTone(status: string) {
  switch (status) {
    case "running":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "scheduled":
      return "bg-sky-500/15 text-sky-700 dark:text-sky-300";
    case "completed":
      return "bg-muted text-muted-foreground";
    case "paused":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-200";
    case "draft":
      return "bg-violet-500/10 text-violet-700 dark:text-violet-300";
    default:
      return "bg-muted/60 text-foreground";
  }
}

export function CampaignCalendar({ campaigns }: CampaignCalendarProps) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    const total = daysInMonth(cursor);
    const offset = (first.getDay() + 6) % 7; // Monday-first
    const items: Array<{ day: number | null; dateKey: string | null }> = [];
    for (let i = 0; i < offset; i++) items.push({ day: null, dateKey: null });
    for (let day = 1; day <= total; day++) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      items.push({ day, dateKey: key });
    }
    return items;
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, EmailCampaignRow[]>();
    for (const c of campaigns) {
      const raw = c.scheduled_for || c.created_at;
      const key = raw.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(c);
      map.set(key, list);
    }
    return map;
  }, [campaigns]);

  const label = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(cursor);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium">{label}</h2>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
              )
            }
          >
            Previous
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setCursor(startOfMonth(new Date()))}
          >
            Today
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
              )
            }
          >
            Next
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-1 font-medium">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          const events = cell.dateKey ? byDay.get(cell.dateKey) ?? [] : [];
          return (
            <div
              key={`${cell.dateKey ?? "empty"}-${idx}`}
              className={cn(
                "min-h-24 rounded-lg border p-1.5",
                cell.day ? "bg-background" : "bg-muted/20",
              )}
            >
              {cell.day ? (
                <>
                  <p className="mb-1 text-xs font-medium">{cell.day}</p>
                  <ul className="space-y-1">
                    {events.slice(0, 3).map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`/email/campaigns/${c.id}`}
                          className={cn(
                            "block truncate rounded px-1 py-0.5 text-[10px] leading-tight",
                            statusTone(c.status),
                          )}
                          title={c.name}
                        >
                          {c.name}
                        </Link>
                      </li>
                    ))}
                    {events.length > 3 ? (
                      <li className="text-[10px] text-muted-foreground">
                        +{events.length - 3} more
                      </li>
                    ) : null}
                  </ul>
                </>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          ["scheduled", "running", "completed", "paused", "draft"] as const
        ).map((s) => (
          <Badge key={s} variant="outline" className={statusTone(s)}>
            {EMAIL_CAMPAIGN_STATUS_LABELS[s as EmailCampaignStatusExtended] ?? s}
          </Badge>
        ))}
      </div>
    </div>
  );
}
