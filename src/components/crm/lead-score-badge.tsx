"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  CLASSIFICATION_COLORS,
  LEAD_CLASSIFICATION_LABELS,
  type LeadClassification,
} from "@/lib/crm/lead-scoring/constants";
import { cn } from "@/lib/utils";

type LeadScoreBadgeProps = {
  score?: number | null;
  classification?: string | null;
  size?: "sm" | "md";
  href?: string;
  className?: string;
};

export function LeadScoreBadge({
  score,
  classification,
  size = "sm",
  href,
  className,
}: LeadScoreBadgeProps) {
  if (score == null && !classification) return null;
  const cls = (classification ?? "cold") as LeadClassification;
  const label =
    cls in LEAD_CLASSIFICATION_LABELS
      ? LEAD_CLASSIFICATION_LABELS[cls]
      : classification;
  const tone =
    cls in CLASSIFICATION_COLORS
      ? CLASSIFICATION_COLORS[cls]
      : CLASSIFICATION_COLORS.cold;

  const content = (
    <Badge
      variant="outline"
      className={cn(
        "border tabular-nums",
        tone,
        size === "md" && "px-2.5 py-1 text-sm",
        className,
      )}
      aria-label={
        score != null
          ? `Lead score ${Math.round(score)}, ${label}`
          : `Lead ${label}`
      }
    >
      {score != null ? Math.round(score) : "—"}
      {label ? ` · ${label}` : null}
    </Badge>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex">
        {content}
      </Link>
    );
  }
  return content;
}
