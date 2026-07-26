"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { MoreHorizontal, Pencil, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SearchQuerySheet } from "@/components/searches/search-query-sheet";
import { SearchStatusBadge } from "@/components/searches/search-status-badge";
import { EmptyState } from "@/components/layout/empty-state";
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
  formatIndustryList,
} from "@/lib/international/display";
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

function countriesPreview(codes: string[]): string {
  const labels = formatCountryList(codes);
  if (labels === "—") return labels;
  const parts = labels.split(", ");
  if (parts.length <= 2) return labels;
  return `${parts.slice(0, 2).join(", ")} +${parts.length - 2}`;
}

function industriesPreview(codes: string[]): string {
  const labels = formatIndustryList(codes);
  if (labels === "—") return labels;
  const parts = labels.split(", ");
  if (parts.length <= 2) return labels;
  return `${parts.slice(0, 2).join(", ")} +${parts.length - 2}`;
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
      next = next.filter((item) => item.name.toLowerCase().includes(needle));
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
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Zoeken op naam…"
              className="pl-8"
            />
          </div>
          <select
            className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={status}
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
            className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={sort}
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
        <div className="space-y-3">
          <EmptyState
            icon={Search}
            title="Nog geen zoekopdrachten"
            description={
              items.length === 0
                ? "Maak je eerste zoekopdracht."
                : "Geen zoekopdrachten gevonden voor deze filters."
            }
          />
          {items.length === 0 ? (
            <div className="flex justify-center">
              <Button onClick={openCreate}>Nieuwe zoekopdracht</Button>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Naam</TableHead>
                  <TableHead>Countries</TableHead>
                  <TableHead>Industries</TableHead>
                  <TableHead>Keywords</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-12 text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id} className="group">
                    <TableCell>
                      <Link
                        href={`/zoekopdrachten/${item.id}`}
                        className="font-medium hover:underline"
                      >
                        {item.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {countriesPreview(item.countries ?? [])}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {industriesPreview(item.industries ?? [])}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {joinPreview(item.keywords ?? [])}
                    </TableCell>
                    <TableCell>
                      <SearchStatusBadge status={item.status} />
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

          <div className="grid gap-3 md:hidden">
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
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="icon-sm" />}
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
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
                  <div>Countries: {countriesPreview(item.countries ?? [])}</div>
                  <div>Industries: {industriesPreview(item.industries ?? [])}</div>
                  <div>Keywords: {joinPreview(item.keywords ?? [])}</div>
                  <div>Updated: {formatDate(item.updated_at)}</div>
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
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
