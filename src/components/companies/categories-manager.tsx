"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderKanban, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { CategoryFormDialog } from "@/components/companies/category-form-dialog";
import { CategoryIcon } from "@/components/companies/category-icon";
import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  deleteCompanyCategoryAction,
  setCompanyCategoryActiveAction,
  type CompanyCategoryWithCount,
} from "@/lib/companies/categories";

type CategoriesManagerProps = {
  categories: CompanyCategoryWithCount[];
  canManage: boolean;
};

export function CategoriesManager({
  categories,
  canManage,
}: CategoriesManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all",
  );
  const [sortBy, setSortBy] = useState<"order" | "name" | "count">("order");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyCategoryWithCount | null>(null);

  const filtered = useMemo(() => {
    let rows = [...categories];
    if (statusFilter === "active") rows = rows.filter((r) => r.is_active);
    if (statusFilter === "inactive") rows = rows.filter((r) => !r.is_active);
    if (query.trim()) {
      const needle = query.trim().toLowerCase();
      rows = rows.filter((r) =>
        [r.name, r.description ?? "", r.slug]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      );
    }
    rows.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "count") return b.companyCount - a.companyCount;
      return a.sort_order - b.sort_order || a.name.localeCompare(b.name);
    });
    return rows;
  }, [categories, query, statusFilter, sortBy]);

  function refresh() {
    router.refresh();
  }

  function toggleActive(category: CompanyCategoryWithCount) {
    startTransition(async () => {
      const result = await setCompanyCategoryActiveAction(
        category.id,
        !category.is_active,
      );
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      refresh();
    });
  }

  function remove(category: CompanyCategoryWithCount) {
    if (
      !window.confirm(
        `Categorie “${category.name}” verwijderen? Dit kan alleen als er geen bedrijven aan gekoppeld zijn.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteCompanyCategoryAction(category.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoek categorie…"
              aria-label="Zoek categorie"
            />
          </div>
          <select
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "active" | "inactive")
            }
            aria-label="Filter status"
          >
            <option value="all">All statuses</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
          <select
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "order" | "name" | "count")
            }
            aria-label="Sorteren"
          >
            <option value="order">Sort order</option>
            <option value="name">Name</option>
            <option value="count">Company count</option>
          </select>
        </div>
        {canManage ? (
          <Button
            type="button"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            Nieuwe categorie
          </Button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Nog geen categorieën"
          description="Maak je eerste bedrijfscategorie aan of controleer of migratie 000023 is uitgevoerd."
          action={
            canManage ? (
              <Button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                Create category
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Companies</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div className="flex items-start gap-3">
                      <CategoryIcon
                        name={category.icon}
                        color={category.color}
                      />
                      <div>
                        <p className="font-medium">{category.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {category.description || category.slug}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={category.is_active ? "secondary" : "outline"}>
                      {category.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{category.companyCount}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {category.sort_order}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        nativeButton={false}
                        size="sm"
                        variant="outline"
                        render={
                          <Link href={`/companies/categories/${category.id}`} />
                        }
                      >
                        Overview
                      </Button>
                      {canManage ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() => {
                              setEditing(category);
                              setDialogOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() => toggleActive(category)}
                          >
                            {category.is_active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={pending || category.companyCount > 0}
                            onClick={() => remove(category)}
                            title={
                              category.companyCount > 0
                                ? "This category is assigned to companies. Please reassign those companies first."
                                : "Delete category"
                            }
                          >
                            Delete
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editing}
        onSaved={refresh}
      />
    </div>
  );
}
