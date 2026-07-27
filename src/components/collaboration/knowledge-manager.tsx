"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createKnowledgeArticleAction,
  createKnowledgeCategoryAction,
  toggleFavoriteAction,
} from "@/lib/collaboration/actions";
import {
  COLLAB_UI,
  KNOWLEDGE_STATUS_LABELS,
  type KnowledgeStatus,
} from "@/lib/collaboration/constants";
import type {
  KnowledgeArticleRow,
  KnowledgeCategoryRow,
} from "@/lib/collaboration/types";
import { formatDateTime } from "@/lib/ui/format";

type Props = {
  articles: KnowledgeArticleRow[];
  categories: KnowledgeCategoryRow[];
  canManageCategories: boolean;
};

export function KnowledgeManager({
  articles,
  categories,
  canManageCategories,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [body, setBody] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [query, setQuery] = useState("");

  const filtered = articles.filter((a) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.body_text.toLowerCase().includes(q) ||
      a.slug.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={COLLAB_UI.searchPlaceholder}
        aria-label="Search knowledge"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <form
          className="space-y-3 rounded-lg border border-border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const r = await createKnowledgeArticleAction({
                title,
                slug: slug || title.toLowerCase().replace(/\s+/g, "-"),
                bodyHtml: `<p>${body.replace(/</g, "&lt;")}</p>`,
                bodyText: body,
                status: "published",
              });
              if (r.success) {
                toast.success(r.message);
                setTitle("");
                setSlug("");
                setBody("");
              } else toast.error(r.message);
            });
          }}
        >
          <h3 className="text-sm font-semibold">New article</h3>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            required
          />
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="slug"
          />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Article body (rich text ready)"
            rows={5}
            required
          />
          <Button type="submit" disabled={pending}>
            Publish
          </Button>
        </form>

        {canManageCategories ? (
          <form
            className="space-y-3 rounded-lg border border-border p-4"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const r = await createKnowledgeCategoryAction({
                  name: categoryName,
                  slug:
                    categorySlug ||
                    categoryName.toLowerCase().replace(/\s+/g, "-"),
                });
                if (r.success) {
                  toast.success(r.message);
                  setCategoryName("");
                  setCategorySlug("");
                } else toast.error(r.message);
              });
            }}
          >
            <h3 className="text-sm font-semibold">New category</h3>
            <Input
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Category name"
              required
            />
            <Input
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              placeholder="slug"
            />
            <Button type="submit" disabled={pending}>
              Add category
            </Button>
            <ul className="text-sm text-muted-foreground">
              {categories.map((c) => (
                <li key={c.id}>
                  {c.name} <span className="text-xs">({c.slug})</span>
                </li>
              ))}
            </ul>
          </form>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {COLLAB_UI.emptyKnowledge}
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((article) => (
            <li
              key={article.id}
              className="rounded-lg border border-border px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{article.title}</p>
                <Badge variant="secondary">
                  {KNOWLEDGE_STATUS_LABELS[
                    article.status as KnowledgeStatus
                  ] ?? article.status}
                </Badge>
                <Badge variant="outline">v{article.version}</Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-muted-foreground">
                {article.body_text}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(article.updated_at)}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await toggleFavoriteAction({
                        entityType: "knowledge_article",
                        entityId: article.id,
                      });
                      toast[r.success ? "success" : "error"](r.message);
                    })
                  }
                >
                  Favorite
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
