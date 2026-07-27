"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileText } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { TruncatedText } from "@/components/layout/truncated-text";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  EMAIL_TEMPLATE_CATEGORIES,
  EMAIL_TEMPLATE_CATEGORY_LABELS,
  EMAIL_TEMPLATE_STATUSES,
  EMAIL_TEMPLATE_STATUS_LABELS,
  type EmailTemplateCategory,
  type EmailTemplateStatusExtended,
} from "@/lib/email/template/constants";
import type { EmailTemplateFolderRow, EmailTemplateRow } from "@/lib/email/template/queries";

type TemplatesManagerProps = {
  templates: EmailTemplateRow[];
  folders: EmailTemplateFolderRow[];
  initialError?: string | null;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function categoryLabel(category: string | null): string {
  if (!category) return "—";
  if (category in EMAIL_TEMPLATE_CATEGORY_LABELS) {
    return EMAIL_TEMPLATE_CATEGORY_LABELS[category as EmailTemplateCategory];
  }
  return category;
}

function statusLabel(status: string): string {
  if (status in EMAIL_TEMPLATE_STATUS_LABELS) {
    return EMAIL_TEMPLATE_STATUS_LABELS[status as EmailTemplateStatusExtended];
  }
  return status;
}

export function TemplatesManager({
  templates,
  folders,
  initialError = null,
}: TemplatesManagerProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [language, setLanguage] = useState("all");
  const [folderId, setFolderId] = useState("all");
  const [tag, setTag] = useState("");

  const languages = useMemo(() => {
    return [...new Set(templates.map((t) => t.language).filter(Boolean))].sort();
  }, [templates]);

  const filtered = useMemo(() => {
    return templates.filter((row) => {
      if (category !== "all" && row.category !== category) return false;
      if (status !== "all" && row.status !== status) return false;
      if (language !== "all" && row.language !== language) return false;
      if (folderId !== "all" && row.folder_id !== folderId) return false;
      if (tag.trim()) {
        const needle = tag.trim().toLowerCase();
        if (!(row.tags ?? []).some((t) => t.toLowerCase().includes(needle))) {
          return false;
        }
      }
      if (query.trim()) {
        const needle = query.trim().toLowerCase();
        const haystack = [
          row.name,
          row.description ?? "",
          row.category ?? "",
          row.subject,
          row.language,
          row.status,
          row.created_by ?? "",
          ...(row.tags ?? []),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [templates, query, category, status, language, folderId, tag]);

  const folderName = (id: string | null) => {
    if (!id) return "—";
    return folders.find((f) => f.id === id)?.name ?? "—";
  };

  if (initialError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{initialError}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div>
            <label htmlFor="tpl-search" className="mb-1 block text-xs text-muted-foreground">
              Search
            </label>
            <Input
              id="tpl-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, category, creator…"
              aria-label="Search templates"
            />
          </div>
          <div>
            <label htmlFor="tpl-category" className="mb-1 block text-xs text-muted-foreground">
              Category
            </label>
            <select
              id="tpl-category"
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">All</option>
              {EMAIL_TEMPLATE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {EMAIL_TEMPLATE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tpl-status" className="mb-1 block text-xs text-muted-foreground">
              Status
            </label>
            <select
              id="tpl-status"
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All</option>
              {EMAIL_TEMPLATE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {EMAIL_TEMPLATE_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tpl-lang" className="mb-1 block text-xs text-muted-foreground">
              Language
            </label>
            <select
              id="tpl-lang"
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="all">All</option>
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tpl-folder" className="mb-1 block text-xs text-muted-foreground">
              Folder
            </label>
            <select
              id="tpl-folder"
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
            >
              <option value="all">All</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tpl-tag" className="mb-1 block text-xs text-muted-foreground">
              Tag
            </label>
            <Input
              id="tpl-tag"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="Sales, VIP…"
            />
          </div>
        </div>
        <Button
          nativeButton={false}
          render={<Link href="/email/templates/new" />}
        >
          New template
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={templates.length === 0 ? "No templates yet" : "No matches"}
          description={
            templates.length === 0
              ? "Create a draft template to start building the email library."
              : "Try adjusting search or filters."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Lang</TableHead>
                <TableHead>Folder</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <Link
                        href={`/email/templates/${row.id}`}
                        className="font-medium text-foreground underline-offset-2 hover:underline"
                      >
                        <TruncatedText value={row.name} maxWidthClassName="max-w-56" />
                      </Link>
                      {row.is_library_placeholder ? (
                        <Badge variant="secondary">Library placeholder</Badge>
                      ) : null}
                      {(row.tags ?? []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row.tags.slice(0, 3).map((t) => (
                            <Badge key={t} variant="outline">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{categoryLabel(row.category)}</TableCell>
                  <TableCell>{statusLabel(row.status)}</TableCell>
                  <TableCell>{row.language}</TableCell>
                  <TableCell>{folderName(row.folder_id)}</TableCell>
                  <TableCell>v{row.version}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(row.updated_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
