"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Download, Upload } from "lucide-react";
import { toast } from "sonner";

import { CategoryIcon } from "@/components/companies/category-icon";
import { EmptyState } from "@/components/layout/empty-state";
import { TruncatedText } from "@/components/layout/truncated-text";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  assignCompanyCategoryAction,
  bulkAssignCompanyCategoryAction,
  createCategoryIfMissingAction,
  type CompanyCategoryRow,
} from "@/lib/companies/categories";
import {
  bulkClassifyCompaniesAction,
  classifyAfterCsvImportAction,
} from "@/lib/companies/classification";
import type { CompanyRow } from "@/lib/companies/queries";

type CompaniesManagerProps = {
  initialItems: CompanyRow[];
  categories: CompanyCategoryRow[];
  canAssign?: boolean;
  initialError?: string | null;
};

type IntelligenceFilter =
  | "all"
  | "needs_review"
  | "manual_override"
  | "unknown"
  | "auto_high"
  | "confirm"
  | "possible";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: string): string {
  switch (status) {
    case "new":
      return "Nieuw";
    case "reviewed":
      return "Beoordeeld";
    case "qualified":
      return "Gekwalificeerd";
    case "not_relevant":
      return "Niet relevant";
    case "contacted":
      return "Benaderd";
    case "customer":
      return "Klant";
    case "blocked":
      return "Geblokkeerd";
    default:
      return status;
  }
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

type PendingImportRow = {
  companyName: string;
  website: string;
  categoryName: string;
  matchedCategoryId: string | null;
  needsCreate: boolean;
  hasImportedCategory: boolean;
};

export function CompaniesManager({
  initialItems,
  categories,
  canAssign = true,
  initialError = null,
}: CompaniesManagerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [suggestedFilter, setSuggestedFilter] = useState<string[]>([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [noCategoryOnly, setNoCategoryOnly] = useState(false);
  const [intelligenceFilter, setIntelligenceFilter] =
    useState<IntelligenceFilter>("all");
  const [sortBy, setSortBy] = useState<"name" | "category" | "found" | "confidence">(
    "found",
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<PendingImportRow[]>([]);
  const [createMissing, setCreateMissing] = useState(true);
  const [classifyProgress, setClassifyProgress] = useState<string | null>(null);

  const categoryById = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  const activeCategories = useMemo(
    () => categories.filter((c) => c.is_active),
    [categories],
  );

  const filterOptions = includeInactive
    ? categories
    : activeCategories;

  const filtered = useMemo(() => {
    let rows = [...initialItems];

    if (noCategoryOnly) {
      rows = rows.filter((item) => !item.company_category_id);
    } else if (categoryFilter.length > 0) {
      const selectedIds = new Set(categoryFilter);
      rows = rows.filter(
        (item) =>
          item.company_category_id &&
          selectedIds.has(item.company_category_id),
      );
    }

    if (suggestedFilter.length > 0) {
      const suggestedIds = new Set(suggestedFilter);
      rows = rows.filter(
        (item) =>
          item.suggested_company_category_id &&
          suggestedIds.has(item.suggested_company_category_id),
      );
    }

    if (intelligenceFilter === "needs_review") {
      rows = rows.filter((item) => item.category_needs_review);
    } else if (intelligenceFilter === "manual_override") {
      rows = rows.filter((item) => item.category_manual_override);
    } else if (intelligenceFilter === "unknown") {
      rows = rows.filter((item) => {
        const conf = item.category_confidence;
        return (
          !item.company_category_id &&
          (conf == null || Number(conf) < 50)
        );
      });
    } else if (intelligenceFilter === "auto_high") {
      rows = rows.filter(
        (item) =>
          item.category_confidence != null &&
          Number(item.category_confidence) >= 95,
      );
    } else if (intelligenceFilter === "confirm") {
      rows = rows.filter((item) => {
        const conf = Number(item.category_confidence ?? -1);
        return conf >= 80 && conf < 95;
      });
    } else if (intelligenceFilter === "possible") {
      rows = rows.filter((item) => {
        const conf = Number(item.category_confidence ?? -1);
        return conf >= 50 && conf < 80;
      });
    }

    if (query.trim()) {
      const needle = query.trim().toLowerCase();
      rows = rows.filter((item) => {
        const categoryName = item.company_category_id
          ? categoryById.get(item.company_category_id)?.name ?? ""
          : "";
        const suggestedName = item.suggested_company_category_id
          ? categoryById.get(item.suggested_company_category_id)?.name ?? ""
          : "";
        const haystack = [
          item.company_name,
          item.city ?? "",
          item.country ?? "",
          item.industry ?? "",
          item.website_url ?? "",
          categoryName,
          suggestedName,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      });
    }

    rows.sort((a, b) => {
      if (sortBy === "name") {
        return a.company_name.localeCompare(b.company_name);
      }
      if (sortBy === "category") {
        const an = a.company_category_id
          ? categoryById.get(a.company_category_id)?.name ?? ""
          : "";
        const bn = b.company_category_id
          ? categoryById.get(b.company_category_id)?.name ?? ""
          : "";
        return an.localeCompare(bn) || a.company_name.localeCompare(b.company_name);
      }
      if (sortBy === "confidence") {
        return (
          Number(b.category_confidence ?? -1) -
          Number(a.category_confidence ?? -1)
        );
      }
      return (
        new Date(b.first_found_at).getTime() -
        new Date(a.first_found_at).getTime()
      );
    });

    return rows;
  }, [
    initialItems,
    query,
    categoryFilter,
    suggestedFilter,
    noCategoryOnly,
    intelligenceFilter,
    sortBy,
    categoryById,
  ]);

  function toggleSelected(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (!checked) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(filtered.map((item) => item.id)));
  }

  function quickAssign(companyId: string, categoryId: string) {
    startTransition(async () => {
      const result = await assignCompanyCategoryAction(
        companyId,
        categoryId || null,
      );
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  function applyBulk() {
    const ids = Array.from(selected);
    startTransition(async () => {
      const result = await bulkAssignCompanyCategoryAction(
        ids,
        bulkCategoryId || null,
      );
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setSelected(new Set());
      router.refresh();
    });
  }

  function applyBulkClassify() {
    const ids = Array.from(selected);
    startTransition(async () => {
      setClassifyProgress(`Classifying 0/${ids.length}…`);
      // Process in one server call; progress label shows work is running.
      const result = await bulkClassifyCompaniesAction(ids);
      setClassifyProgress(null);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setSelected(new Set());
      router.refresh();
    });
  }

  function exportCsv() {
    const header = [
      "Company Name",
      "Status",
      "City",
      "Country",
      "Industry",
      "Category Name",
      "Website",
      "First Found At",
    ];
    const lines = [header.join(",")];
    for (const item of filtered) {
      const categoryName = item.company_category_id
        ? categoryById.get(item.company_category_id)?.name ?? ""
        : "";
      lines.push(
        [
          item.company_name,
          item.status,
          item.city ?? "",
          item.country ?? "",
          item.industry ?? "",
          categoryName,
          item.website_url ?? "",
          item.first_found_at,
        ]
          .map((cell) => escapeCsv(String(cell)))
          .join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "companies-export.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function parseImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length < 2) {
        toast.error("CSV has no data rows.");
        return;
      }
      const headers = lines[0]
        .split(",")
        .map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
      const nameIdx = headers.findIndex((h) =>
        ["company name", "company_name", "bedrijf", "name"].includes(h),
      );
      const categoryIdx = headers.findIndex((h) =>
        ["category name", "category", "categorie"].includes(h),
      );
      const websiteIdx = headers.findIndex((h) =>
        ["website", "website_url", "url"].includes(h),
      );
      if (nameIdx < 0) {
        toast.error("CSV must include a Company Name column.");
        return;
      }

      const byName = new Map(
        categories.map((c) => [c.name.trim().toLowerCase(), c]),
      );
      const rows: PendingImportRow[] = [];
      for (const line of lines.slice(1)) {
        const cells = line.match(/("([^"]|"")*"|[^,]*)/g)?.map((cell) =>
          cell.replace(/^"|"$/g, "").replace(/""/g, '"').trim(),
        ) ?? [];
        const companyName = cells[nameIdx] ?? "";
        const categoryName = categoryIdx >= 0 ? cells[categoryIdx] ?? "" : "";
        if (!companyName) continue;
        const matched = categoryName
          ? byName.get(categoryName.toLowerCase()) ?? null
          : null;
        rows.push({
          companyName,
          website: websiteIdx >= 0 ? cells[websiteIdx] ?? "" : "",
          categoryName,
          matchedCategoryId: matched?.id ?? null,
          needsCreate: Boolean(categoryName) && !matched,
          hasImportedCategory: Boolean(categoryName),
        });
      }
      setImportRows(rows);
      setImportOpen(true);
    };
    reader.readAsText(file);
  }

  function applyImport() {
    startTransition(async () => {
      const nameToId = new Map(
        categories.map((c) => [c.name.trim().toLowerCase(), c.id]),
      );
      const warnings: string[] = [];
      let matched = 0;

      for (const row of importRows) {
        let categoryId = row.matchedCategoryId;
        if (!categoryId && row.needsCreate && row.hasImportedCategory) {
          if (!createMissing) continue;
          const created = await createCategoryIfMissingAction(row.categoryName);
          if (!created.success || !created.categoryId) {
            toast.error(created.message);
            return;
          }
          categoryId = created.categoryId;
          nameToId.set(row.categoryName.toLowerCase(), categoryId);
        }

        const company = initialItems.find(
          (item) =>
            item.company_name.trim().toLowerCase() ===
              row.companyName.trim().toLowerCase() ||
            (row.website &&
              item.website_url &&
              item.website_url.includes(row.website.replace(/^https?:\/\//, ""))),
        );
        if (!company) continue;
        matched += 1;

        if (categoryId) {
          const assign = await assignCompanyCategoryAction(
            company.id,
            categoryId,
          );
          if (!assign.success) {
            toast.error(assign.message);
            return;
          }
        }

        const classified = await classifyAfterCsvImportAction(
          company.id,
          categoryId ?? null,
        );
        if (!classified.success) {
          toast.error(classified.message);
          return;
        }
        if (classified.warning) {
          warnings.push(`${row.companyName}: ${classified.warning}`);
        }
      }

      if (warnings.length > 0) {
        toast.warning(
          `${warnings.length} AI mismatch warning(s). Imported categories were kept.`,
        );
        for (const warning of warnings.slice(0, 3)) {
          toast.message(warning);
        }
      } else {
        toast.success(
          `CSV import finished for ${matched} matching companies.`,
        );
      }
      setImportOpen(false);
      setImportRows([]);
      router.refresh();
    });
  }

  if (initialError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{initialError}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <label htmlFor="companies-search" className="sr-only">
              Zoek bedrijven
            </label>
            <Input
              id="companies-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Zoeken op naam, stad, categorie…"
              aria-label="Zoek bedrijven"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={exportCsv}>
              <Download className="size-4" />
              Export CSV
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) parseImportFile(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              Import categories
            </Button>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/companies/categories" />}
            >
              Categories
            </Button>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/settings/company-categories" />}
            >
              Manage categories
            </Button>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/zoekopdrachten" />}
            >
              Start vanaf zoekopdracht
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-start">
          <select
            multiple
            className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2 py-1 text-sm sm:max-w-xs"
            value={categoryFilter}
            onChange={(e) => {
              setNoCategoryOnly(false);
              setCategoryFilter(
                Array.from(e.target.selectedOptions).map((o) => o.value),
              );
            }}
            aria-label="Filter current categories"
          >
            {filterOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            multiple
            className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2 py-1 text-sm sm:max-w-xs"
            value={suggestedFilter}
            onChange={(e) =>
              setSuggestedFilter(
                Array.from(e.target.selectedOptions).map((o) => o.value),
              )
            }
            aria-label="Filter suggested categories"
          >
            {filterOptions.map((category) => (
              <option key={`suggested-${category.id}`} value={category.id}>
                Suggested: {category.name}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="inline-flex items-center gap-2">
              <Checkbox
                checked={noCategoryOnly}
                onCheckedChange={(checked) => {
                  setNoCategoryOnly(Boolean(checked));
                  if (checked) setCategoryFilter([]);
                }}
              />
              No category
            </label>
            <label className="inline-flex items-center gap-2">
              <Checkbox
                checked={includeInactive}
                onCheckedChange={(checked) =>
                  setIncludeInactive(Boolean(checked))
                }
              />
              Include inactive
            </label>
            <select
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              value={intelligenceFilter}
              onChange={(e) =>
                setIntelligenceFilter(e.target.value as IntelligenceFilter)
              }
              aria-label="Classification filter"
            >
              <option value="all">All classification states</option>
              <option value="needs_review">Needs review</option>
              <option value="manual_override">Manual override</option>
              <option value="unknown">Unknown</option>
              <option value="auto_high">Confidence ≥95%</option>
              <option value="confirm">Confidence 80–94%</option>
              <option value="possible">Confidence 50–79%</option>
            </select>
            <select
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as
                    | "name"
                    | "category"
                    | "found"
                    | "confidence",
                )
              }
              aria-label="Sort companies"
            >
              <option value="found">Newest found</option>
              <option value="name">Company name</option>
              <option value="category">Category</option>
              <option value="confidence">Confidence</option>
            </select>
          </div>
        </div>

        {canAssign && selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/20 p-3">
            <span className="text-sm text-muted-foreground">
              {selected.size} selected
            </span>
            <select
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              value={bulkCategoryId}
              onChange={(e) => setBulkCategoryId(e.target.value)}
              aria-label="Bulk category"
            >
              <option value="">No category</option>
              {activeCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <Button type="button" onClick={applyBulk} disabled={pending}>
              Bulk update category
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={applyBulkClassify}
              disabled={pending}
            >
              {classifyProgress ?? "Classify Companies"}
            </Button>
          </div>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={
            initialItems.length === 0
              ? "Nog geen bedrijven"
              : "Geen resultaten"
          }
          description={
            initialItems.length === 0
              ? "Voer een eerste mock scrape uit vanuit een zoekopdracht. Gevonden bedrijven verschijnen hier."
              : "Geen bedrijven gevonden voor deze filters."
          }
          actionLabel={
            initialItems.length === 0 ? "Naar zoekopdrachten" : undefined
          }
          actionHref={
            initialItems.length === 0 ? "/zoekopdrachten" : undefined
          }
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        filtered.length > 0 &&
                        filtered.every((item) => selected.has(item.id))
                      }
                      onCheckedChange={(checked) =>
                        toggleAll(Boolean(checked))
                      }
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Bedrijf</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Suggested</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stad</TableHead>
                  <TableHead>Land</TableHead>
                  <TableHead>Branche</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Gevonden</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const category = item.company_category_id
                    ? categoryById.get(item.company_category_id)
                    : null;
                  const suggested = item.suggested_company_category_id
                    ? categoryById.get(item.suggested_company_category_id)
                    : null;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(item.id)}
                          onCheckedChange={(checked) =>
                            toggleSelected(item.id, Boolean(checked))
                          }
                          aria-label={`Select ${item.company_name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/companies/${item.id}`}
                          className="font-medium hover:underline"
                        >
                          {item.company_name}
                        </Link>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.category_needs_review ? (
                            <Badge variant="secondary">Review</Badge>
                          ) : null}
                          {item.category_manual_override ? (
                            <Badge variant="outline">Override</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {canAssign ? (
                          <div className="flex items-center gap-2">
                            <CategoryIcon
                              name={category?.icon}
                              color={category?.color}
                              className="inline-flex size-7 items-center justify-center rounded-md border border-border"
                            />
                            <select
                              className="h-8 max-w-[10rem] rounded-lg border border-input bg-transparent px-2 text-sm"
                              value={item.company_category_id ?? ""}
                              disabled={pending}
                              onChange={(e) =>
                                quickAssign(item.id, e.target.value)
                              }
                              aria-label={`Category for ${item.company_name}`}
                            >
                              <option value="">No category</option>
                              {activeCategories.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.name}
                                </option>
                              ))}
                              {category && !category.is_active ? (
                                <option value={category.id}>
                                  {category.name} (inactive)
                                </option>
                              ) : null}
                            </select>
                          </div>
                        ) : (
                          <span className="text-sm">
                            {category?.name ?? "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {suggested?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.category_confidence != null
                          ? `${Math.round(Number(item.category_confidence))}%`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {statusLabel(item.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <TruncatedText value={item.city} />
                      </TableCell>
                      <TableCell>
                        <TruncatedText value={item.country} />
                      </TableCell>
                      <TableCell>
                        <TruncatedText value={item.industry} />
                      </TableCell>
                      <TableCell>
                        <TruncatedText
                          value={item.website_url}
                          maxWidthClassName="max-w-56"
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(item.first_found_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {filtered.map((item) => {
              const category = item.company_category_id
                ? categoryById.get(item.company_category_id)
                : null;
              return (
                <Link
                  key={item.id}
                  href={`/companies/${item.id}`}
                  className="block space-y-2 rounded-xl border border-border p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{item.company_name}</p>
                    <Badge variant="secondary">{statusLabel(item.status)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {category?.name ?? "No category"} ·{" "}
                    {[item.city, item.country].filter(Boolean).join(" · ") ||
                      "Geen locatie"}
                  </p>
                </Link>
              );
            })}
          </div>
        </>
      )}

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import categories from CSV</DialogTitle>
            <DialogDescription>
              Imported categories are kept as-is. Rows without a category run
              AI classification. Matching uses company name or website.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>{importRows.length} rows parsed.</p>
            <p>
              Missing categories:{" "}
              {importRows.filter((row) => row.needsCreate).length}
            </p>
            <label className="inline-flex items-center gap-2">
              <Checkbox
                checked={createMissing}
                onCheckedChange={(checked) =>
                  setCreateMissing(Boolean(checked))
                }
              />
              Create new category when missing?
            </label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setImportOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={applyImport} disabled={pending}>
              {pending ? "Importing…" : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
