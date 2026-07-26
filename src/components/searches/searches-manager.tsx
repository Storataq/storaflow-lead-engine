"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { MoreHorizontal, Pencil, Play, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { startScrapeAction } from "@/lib/jobs/actions";
import { SearchQuerySheet } from "@/components/searches/search-query-sheet";
import { SearchStatusBadge } from "@/components/searches/search-status-badge";
import { EmptyState } from "@/components/layout/empty-state";
import { TruncatedText } from "@/components/layout/truncated-text";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteSearchQueryAction } from "@/lib/searches/actions";
import {
  SEARCH_CRITERIA_STATUSES,
  SEARCH_SORT_OPTIONS,
  type SearchSortOption,
} from "@/lib/searches/constants";
import type { SearchQueryRow } from "@/lib/searches/queries";
import {
  formatCountryList,
} from "@/lib/international/display";
import { formatSourceList } from "@/lib/international/sources";
import type { SearchCriteriaStatus } from "@/types/database";

type SearchesManagerProps = {
  initialItems: SearchQueryRow[];
  initialError?: string | null;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function joinPreview(values: string[], empty = "—"): string {
  if (!values.length) return empty;
  if (values.length <= 2) return values.join(", ");
  return `${values.slice(0, 2).join(", ")} +${values.length - 2}`;
}

function previewList(labels: string, empty = "—"): string {
  if (!labels || labels === "—") return empty;
  const parts = labels.split(", ");
  if (parts.length <= 2) return labels;
  return `${parts.slice(0, 2).join(", ")} +${parts.length - 2}`;
}

function requirementsPreview(
  websiteRequired: boolean,
  linkedinRequired: boolean,
): string {
  const parts = [
    websiteRequired ? "Website" : null,
    linkedinRequired ? "LinkedIn" : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

function countriesPreview(codes: string[]): string {
  return previewList(formatCountryList(codes));
}

function sourcesPreview(codes: string[]): string {
  return previewList(formatSourceList(codes));
}

function matchesSearch(item: SearchQueryRow, needle: string): boolean {
  const haystack = [
    item.name,
    item.search_prompt ?? "",
    ...(item.keywords ?? []),
    ...(item.cities ?? []),
    ...(item.regions ?? []),
    ...(item.countries ?? []),
    ...(item.languages ?? []),
    ...(item.industries ?? []),
    ...(item.sources ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export function SearchesManager({
  initialItems,
  initialError = null,
}: SearchesManagerProps) {
  const router = useRouter();
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SearchCriteriaStatus | "all">("all");
  const [sort, setSort] = useState<SearchSortOption>("newest");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<SearchQueryRow | null>(null);
  const [deleting, setDeleting] = useState<SearchQueryRow | null>(null);
  const [pending, startTransition] = useTransition();

  const items = useMemo(
    () => initialItems.filter((item) => !removedIds.includes(item.id)),
    [initialItems, removedIds],
  );

  const filtered = useMemo(() => {
    let next = [...items];

    if (status !== "all") {
      next = next.filter((item) => item.status === status);
    }

    if (query.trim()) {
      const needle = query.trim().toLowerCase();
      next = next.filter((item) => matchesSearch(item, needle));
    }

    next.sort((a, b) => {
      switch (sort) {
        case "oldest":
          return a.updated_at.localeCompare(b.updated_at);
        case "name_asc":
          return a.name.localeCompare(b.name, "nl");
        case "name_desc":
          return b.name.localeCompare(a.name, "nl");
        case "newest":
        default:
          return b.updated_at.localeCompare(a.updated_at);
      }
    });

    return next;
  }, [items, query, status, sort]);

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(item: SearchQueryRow) {
    setEditing(item);
    setSheetOpen(true);
  }

  function handleSaved() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function confirmDelete() {
    if (!deleting) return;
    const result = await deleteSearchQueryAction(deleting.id);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    setRemovedIds((current) => [...current, deleting.id]);
    toast.success(result.message);
    setDeleting(null);
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleStartScrape(item: SearchQueryRow) {
    const result = await startScrapeAction(item.id);
    if (!result.success || !result.jobId) {
      toast.error(result.message);
      return;
    }
    if (result.message.includes("al een scrape")) {
      toast.message(result.message);
    } else {
      toast.success(result.message);
    }
    startTransition(() => {
      router.push(`/jobs/${result.jobId}`);
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
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative w-full sm:max-w-xs">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <label htmlFor="searches-query" className="sr-only">
              Zoekopdrachten filteren
            </label>
            <Input
              id="searches-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Zoeken op naam, stad, keyword…"
              className="pl-8"
              aria-label="Zoekopdrachten filteren"
            />
          </div>
          <select
            className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={status}
            aria-label="Filter op status"
            onChange={(event) =>
              setStatus(event.target.value as SearchCriteriaStatus | "all")
            }
          >
            <option value="all">Alle statussen</option>
            {SEARCH_CRITERIA_STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={sort}
            aria-label="Sorteer zoekopdrachten"
            onChange={(event) =>
              setSort(event.target.value as SearchSortOption)
            }
          >
            {SEARCH_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={openCreate}>Nieuwe zoekopdracht</Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title={
            items.length === 0
              ? "Nog geen zoekopdrachten"
              : "Geen resultaten"
          }
          description={
            items.length === 0
              ? "Maak je eerste zoekopdracht om mock scrapes te starten."
              : "Geen zoekopdrachten gevonden voor deze filters."
          }
          action={
            items.length === 0 ? (
              <Button onClick={openCreate}>Nieuwe zoekopdracht</Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Naam</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Landen</TableHead>
                  <TableHead>Steden</TableHead>
                  <TableHead>Keywords</TableHead>
                  <TableHead>Bronnen</TableHead>
                  <TableHead>Gewijzigd</TableHead>
                  <TableHead className="w-12 text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id} className="group">
                    <TableCell>
                      <div className="space-y-0.5">
                        <Link
                          href={`/zoekopdrachten/${item.id}`}
                          className="font-medium hover:underline"
                        >
                          {item.name}
                        </Link>
                        {item.search_prompt ? (
                          <p className="line-clamp-1 max-w-56 text-xs text-muted-foreground">
                            {item.search_prompt}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <SearchStatusBadge status={item.status} />
                    </TableCell>
                    <TableCell>
                      <TruncatedText
                        value={countriesPreview(item.countries ?? [])}
                      />
                    </TableCell>
                    <TableCell>
                      <TruncatedText value={joinPreview(item.cities ?? [])} />
                    </TableCell>
                    <TableCell>
                      <TruncatedText
                        value={joinPreview(item.keywords ?? [])}
                      />
                    </TableCell>
                    <TableCell>
                      <TruncatedText
                        value={sourcesPreview(item.sources ?? [])}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(item.updated_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-sm" />
                          }
                        >
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Acties</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              router.push(`/zoekopdrachten/${item.id}`);
                            }}
                          >
                            Bekijken
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              void handleStartScrape(item);
                            }}
                          >
                            <Play className="size-4" />
                            Start mock scrape
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(item)}>
                            <Pencil className="size-4" />
                            Bewerken
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleting(item)}
                          >
                            <Trash2 className="size-4" />
                            Verwijderen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-border p-4 shadow-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <Link
                      href={`/zoekopdrachten/${item.id}`}
                      className="font-medium hover:underline"
                    >
                      {item.name}
                    </Link>
                    <SearchStatusBadge status={item.status} />
                    {item.search_prompt ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {item.search_prompt}
                      </p>
                    ) : null}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="icon-sm" />}
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          void handleStartScrape(item);
                        }}
                      >
                        Start mock scrape
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(item)}>
                        Bewerken
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleting(item)}
                      >
                        Verwijderen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <dl className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <div>Landen: {countriesPreview(item.countries ?? [])}</div>
                  <div>Steden: {joinPreview(item.cities ?? [])}</div>
                  <div>Keywords: {joinPreview(item.keywords ?? [])}</div>
                  <div>Bronnen: {sourcesPreview(item.sources ?? [])}</div>
                  <div>
                    Eisen:{" "}
                    {requirementsPreview(
                      item.website_required,
                      item.linkedin_required,
                    )}
                  </div>
                  <div>Gewijzigd: {formatDate(item.updated_at)}</div>
                </dl>
              </div>
            ))}
          </div>
        </>
      )}

      <SearchQuerySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initial={editing}
        onSaved={handleSaved}
      />

      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zoekopdracht verwijderen?</DialogTitle>
            <DialogDescription>
              “{deleting?.name}” wordt permanent verwijderd. Dit kan niet
              ongedaan worden gemaakt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Annuleren
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                void confirmDelete();
              }}
            >
              {pending ? "Verwijderen…" : "Verwijderen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
