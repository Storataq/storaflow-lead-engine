"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GitBranch } from "lucide-react";
import { toast } from "sonner";

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
  EMAIL_SEQUENCE_CATEGORIES,
  EMAIL_SEQUENCE_CATEGORY_LABELS,
  EMAIL_SEQUENCE_STATUSES,
  EMAIL_SEQUENCE_STATUS_LABELS,
  type EmailSequenceCategory,
  type EmailSequenceStatusExtended,
} from "@/lib/email/sequence/constants";
import { duplicateEmailSequenceAction } from "@/lib/email/sequence/actions";
import { parseStepsJson, countEmailSteps } from "@/lib/email/sequence/steps";
import type { EmailSequenceRow } from "@/lib/email/sequence/queries";

type SequencesManagerProps = {
  sequences: EmailSequenceRow[];
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
  if (category in EMAIL_SEQUENCE_CATEGORY_LABELS) {
    return EMAIL_SEQUENCE_CATEGORY_LABELS[category as EmailSequenceCategory];
  }
  return category;
}

function statusLabel(status: string): string {
  if (status in EMAIL_SEQUENCE_STATUS_LABELS) {
    return EMAIL_SEQUENCE_STATUS_LABELS[status as EmailSequenceStatusExtended];
  }
  return status;
}

function estimateDurationDays(sequence: EmailSequenceRow): number {
  const validation = sequence.last_validation_json;
  if (validation && typeof validation === "object" && !Array.isArray(validation)) {
    const summary = (validation as { summary?: { estimatedDurationDays?: number } })
      .summary;
    if (summary?.estimatedDurationDays != null) {
      return summary.estimatedDurationDays;
    }
  }
  return 0;
}

export function SequencesManager({
  sequences,
  initialError = null,
}: SequencesManagerProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [language, setLanguage] = useState("all");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const languages = useMemo(() => {
    return [
      ...new Set(sequences.map((s) => s.default_language).filter(Boolean)),
    ].sort();
  }, [sequences]);

  const filtered = useMemo(() => {
    return sequences.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (category !== "all" && row.category !== category) return false;
      if (language !== "all" && row.default_language !== language) return false;
      if (query.trim()) {
        const needle = query.trim().toLowerCase();
        const hay = [row.name, row.description ?? "", row.category]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [sequences, status, category, language, query]);

  if (initialError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{initialError}</AlertDescription>
      </Alert>
    );
  }

  if (sequences.length === 0) {
    return (
      <EmptyState
        icon={GitBranch}
        title="No sequences yet"
        description="Create a multi-step email sequence with waits, conditions and stop rules."
        action={
          <Button nativeButton={false} render={<Link href="/email/sequences/new" />}>
            New sequence
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search name, description…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
        <select
          className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All statuses</option>
          {EMAIL_SEQUENCE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {EMAIL_SEQUENCE_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">All categories</option>
          {EMAIL_SEQUENCE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {EMAIL_SEQUENCE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <select
          className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="all">All languages</option>
          {languages.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Steps</TableHead>
              <TableHead>Readiness</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => {
              const steps = parseStepsJson(row.steps_json);
              const emailSteps = countEmailSteps(steps);
              const duration = estimateDurationDays(row);

              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      href={`/email/sequences/${row.id}`}
                      className="font-medium hover:underline"
                    >
                      <TruncatedText
                        value={row.name}
                        maxWidthClassName="max-w-48"
                        className="text-foreground"
                      />
                    </Link>
                    {row.description ? (
                      <TruncatedText
                        value={row.description}
                        maxWidthClassName="max-w-56"
                      />
                    ) : null}
                  </TableCell>
                  <TableCell>{categoryLabel(row.category)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{statusLabel(row.status)}</Badge>
                  </TableCell>
                  <TableCell>v{row.version}</TableCell>
                  <TableCell>
                    {steps.length} ({emailSteps} email
                    {duration > 0 ? ` · ~${duration}d` : ""})
                  </TableCell>
                  <TableCell>
                    {row.readiness_score ?? 0}
                    {row.readiness_classification ? (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({row.readiness_classification.replace(/_/g, " ")})
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(row.updated_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        nativeButton={false}
                        render={
                          <Link href={`/email/sequences/${row.id}/edit`} />
                        }
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          startTransition(async () => {
                            const result = await duplicateEmailSequenceAction(
                              row.id,
                            );
                            if (!result.success) {
                              toast.error(result.message);
                              return;
                            }
                            toast.success(result.message);
                            if (result.id) {
                              router.push(`/email/sequences/${result.id}`);
                              router.refresh();
                            }
                          });
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No sequences match your filters.
        </p>
      ) : null}
    </div>
  );
}
