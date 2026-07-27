import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  HEALTH_BAND_LABELS,
  type HealthBand,
} from "@/lib/crm/contact-intelligence/constants";
import { cn } from "@/lib/utils";

function scoreTone(score: number): string {
  if (score >= 80) return "text-emerald-700 dark:text-emerald-400";
  if (score >= 65) return "text-sky-700 dark:text-sky-400";
  if (score >= 45) return "text-amber-700 dark:text-amber-400";
  return "text-rose-700 dark:text-rose-400";
}

function barTone(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 65) return "bg-sky-500";
  if (score >= 45) return "bg-amber-500";
  return "bg-rose-500";
}

export function ContactScoreCard({
  title,
  score,
  subtitle,
  badge,
}: {
  title: string;
  score: number | null;
  subtitle?: string;
  badge?: string | null;
}) {
  const value = score == null ? null : Math.round(score);
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="flex items-end justify-between gap-2 text-base">
          <span
            className={cn(
              "text-3xl font-semibold tabular-nums",
              value == null ? "text-muted-foreground" : scoreTone(value),
            )}
            aria-label={value == null ? "No score" : `Score ${value} of 100`}
          >
            {value ?? "—"}
          </span>
          {badge ? <Badge variant="secondary">{badge}</Badge> : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value ?? 0}
        >
          <div
            className={cn("h-full rounded-full transition-all", barTone(value ?? 0))}
            style={{ width: `${value ?? 0}%` }}
          />
        </div>
        {subtitle ? (
          <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ContactHealthScoreCard({
  score,
  band,
}: {
  score: number | null;
  band: HealthBand | null;
}) {
  return (
    <ContactScoreCard
      title="Contact Health"
      score={score}
      badge={band ? HEALTH_BAND_LABELS[band] : null}
      subtitle="Profile, verification, company match, activity, relationship"
    />
  );
}

export function ContactQualityScoreCard({
  score,
}: {
  score: number | null;
}) {
  return (
    <ContactScoreCard
      title="Contact Quality"
      score={score}
      subtitle="Email, phone, role, completeness, activity, decision maker"
    />
  );
}

export function InfluenceMeter({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const score = Math.round(value);
  return (
    <div className="space-y-1">
      <div className="flex justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{score}</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
      >
        <div
          className={cn("h-full rounded-full", barTone(score))}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export function ContactIntelSectionCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("shadow-none", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">{children}</CardContent>
    </Card>
  );
}

export function KeyValueRows({
  rows,
}: {
  rows: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <dl className="space-y-2">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0"
        >
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="max-w-[65%] text-right font-medium">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
