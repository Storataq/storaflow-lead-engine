"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { CategoryIcon } from "@/components/companies/category-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  reclassifyCompanyAction,
  resetAutomaticClassificationAction,
} from "@/lib/companies/classification";
import type { CompanyCategoryRow } from "@/lib/companies/categories";
import type {
  CompanyClassificationHistoryRow,
  CompanyClassificationRow,
} from "@/lib/companies/classification/types";

type Alternative = {
  categoryId?: string;
  name?: string;
  confidence?: number;
};

type CategoryIntelligencePanelProps = {
  companyId: string;
  currentCategory: CompanyCategoryRow | null;
  suggestedCategory: CompanyCategoryRow | null;
  classification: CompanyClassificationRow | null;
  history: CompanyClassificationHistoryRow[];
  categories: CompanyCategoryRow[];
  manualOverride: boolean;
  needsReview: boolean;
  confidence: number | null;
  classifiedAt: string | null;
  classifiedBy: string | null;
  canManage: boolean;
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function bandLabel(band: string | null | undefined): string {
  switch (band) {
    case "auto_select":
      return "Auto-selected (≥95%)";
    case "needs_confirmation":
      return "Needs confirmation (80–94%)";
    case "possible":
      return "Possible (50–79%)";
    case "unknown":
      return "Unknown (<50%)";
    default:
      return "Not classified";
  }
}

function parseKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function parseAlternatives(value: unknown): Alternative[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Alternative =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
}

export function CategoryIntelligencePanel({
  companyId,
  currentCategory,
  suggestedCategory,
  classification,
  history,
  categories,
  manualOverride,
  needsReview,
  confidence,
  classifiedAt,
  classifiedBy,
  canManage,
}: CategoryIntelligencePanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showHistory, setShowHistory] = useState(false);

  const keywords = parseKeywords(classification?.keywords_json);
  const alternatives = parseAlternatives(classification?.alternatives_json);
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const displayConfidence =
    confidence ??
    (classification?.confidence != null
      ? Number(classification.confidence)
      : null);

  function reclassify() {
    startTransition(async () => {
      const result = await reclassifyCompanyAction(companyId);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  function resetAutomatic() {
    startTransition(async () => {
      const result = await resetAutomaticClassificationAction(companyId);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Category Intelligence</CardTitle>
            <CardDescription>
              Transparent AI suggestion with confidence and reasons. You always
              decide the final category.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {needsReview ? (
              <Badge variant="secondary">Needs review</Badge>
            ) : null}
            {manualOverride ? (
              <Badge variant="outline">Manual override</Badge>
            ) : null}
            {!suggestedCategory && displayConfidence != null && displayConfidence < 50 ? (
              <Badge variant="outline">Unknown</Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Current category</p>
            <div className="mt-2 flex items-center gap-2">
              <CategoryIcon
                name={currentCategory?.icon}
                color={currentCategory?.color}
              />
              <p className="font-medium">
                {currentCategory?.name ?? "No category"}
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Suggested category</p>
            <div className="mt-2 flex items-center gap-2">
              <CategoryIcon
                name={suggestedCategory?.icon}
                color={suggestedCategory?.color}
              />
              <p className="font-medium">
                {suggestedCategory?.name ?? "Unknown — manual review required"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Confidence</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">
              {displayConfidence != null ? `${Math.round(displayConfidence)}%` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {bandLabel(classification?.confidence_band)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last classification</p>
            <p className="mt-1 text-sm font-medium">
              {formatDate(classifiedAt ?? classification?.updated_at ?? null)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Classified by</p>
            <p className="mt-1 text-sm font-medium capitalize">
              {classifiedBy ?? classification?.classified_by ?? "—"}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Reason</p>
          <p className="mt-1 text-sm">
            {classification?.reason ||
              "No classification yet. Run Reclassify Company to analyse available signals."}
          </p>
        </div>

        {keywords.length > 0 ? (
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Keywords found</p>
            <div className="flex flex-wrap gap-1.5">
              {keywords.slice(0, 16).map((keyword) => (
                <Badge key={keyword} variant="secondary">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {alternatives.length > 0 ? (
          <div>
            <p className="mb-2 text-xs text-muted-foreground">
              Alternative categories
            </p>
            <ul className="space-y-1 text-sm">
              {alternatives.slice(0, 3).map((alt, index) => {
                const name =
                  alt.name ??
                  (alt.categoryId
                    ? categoryById.get(alt.categoryId)?.name
                    : null) ??
                  "Unknown";
                const score =
                  typeof alt.confidence === "number"
                    ? `${Math.round(alt.confidence)}%`
                    : "—";
                return (
                  <li
                    key={`${name}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-1.5"
                  >
                    <span>{name}</span>
                    <span className="text-muted-foreground">{score}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={reclassify} disabled={pending}>
              {pending ? "Working…" : "Reclassify Company"}
            </Button>
            {manualOverride ? (
              <Button
                type="button"
                variant="outline"
                onClick={resetAutomatic}
                disabled={pending}
              >
                Reset Automatic Classification
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Classification is view-only for your role. Ask an owner or admin to
            reclassify or override.
          </p>
        )}

        {history.length > 0 ? (
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory((v) => !v)}
            >
              {showHistory ? "Hide history" : "Show classification history"}
            </Button>
            {showHistory ? (
              <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto text-sm">
                {history.map((row) => {
                  const oldName = row.old_category_id
                    ? categoryById.get(row.old_category_id)?.name ?? "—"
                    : "—";
                  const newName = row.new_category_id
                    ? categoryById.get(row.new_category_id)?.name ?? "—"
                    : "—";
                  return (
                    <li
                      key={row.id}
                      className="rounded-md border border-border px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                          {oldName} → {newName}
                        </span>
                        <Badge variant="outline">
                          {row.is_automatic ? "Automatic" : "Manual"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(row.created_at)}
                        {row.confidence != null
                          ? ` · ${Math.round(Number(row.confidence))}%`
                          : ""}
                        {row.reason ? ` · ${row.reason}` : ""}
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
