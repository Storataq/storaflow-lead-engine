"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ListTodo } from "lucide-react";

import { JobProgressBar } from "@/components/jobs/job-progress-bar";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  JOB_SORT_OPTIONS,
  QUEUE_BUCKETS,
  formatRuntimeMs,
  normalizeJobStatus,
  type JobSortOption,
} from "@/lib/jobs/constants";
import type { ScrapeJobWithSearch } from "@/lib/jobs/queries";
import type { ScrapeJobStatus } from "@/types/database";

type JobsQueueProps = {
  initialItems: ScrapeJobWithSearch[];
  initialError?: string | null;
};

type StatusFilter = ScrapeJobStatus | "all";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Alle statussen" },
  { value: "pending", label: "Pending" },
  { value: "queued", label: "Queued" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "failed", label: "Failed" },
];

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function bucketCount(
  items: ScrapeJobWithSearch[],
  statuses: readonly string[],
): number {
  return items.filter((item) =>
    statuses.includes(normalizeJobStatus(item.status)),
  ).length;
}

export function JobsQueue({ initialItems, initialError }: JobsQueueProps) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<JobSortOption>("newest");

  const filtered = useMemo(() => {
    let next = [...initialItems];
    if (status !== "all") {
      next = next.filter(
        (item) => normalizeJobStatus(item.status) === normalizeJobStatus(status),
      );
    }
    next.sort((a, b) =>
      sort === "oldest"
        ? a.created_at.localeCompare(b.created_at)
        : b.created_at.localeCompare(a.created_at),
    );
    return next;
  }, [initialItems, status, sort]);

  if (initialError) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {initialError}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {QUEUE_BUCKETS.map((bucket) => (
          <Card key={bucket.key} className="shadow-none">
            <CardHeader className="pb-2">
              <CardDescription>{bucket.label}</CardDescription>
              <CardTitle className="text-2xl">
                {bucketCount(initialItems, bucket.statuses)}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <select
            className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as StatusFilter)
            }
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={sort}
            onChange={(event) =>
              setSort(event.target.value as JobSortOption)
            }
          >
            {JOB_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <Button nativeButton={false} render={<Link href="/zoekopdrachten" />}>
          Start vanaf zoekopdracht
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="Nog geen scrape jobs"
          description="Start een scrape vanuit een zoekopdracht. De mock-connector vult resultaten zonder externe API's."
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zoekopdracht</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Bron</TableHead>
                  <TableHead>Gevonden</TableHead>
                  <TableHead>Runtime</TableHead>
                  <TableHead>Laatste update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link
                        href={`/jobs/${item.id}`}
                        className="font-medium hover:underline"
                      >
                        {item.search_queries?.name ?? "Zoekopdracht"}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <JobStatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="min-w-40">
                      <JobProgressBar
                        pagesProcessed={item.pages_processed}
                        targetPages={item.target_pages}
                        progressPercent={item.progress_percent}
                        status={item.status}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.current_source_code ?? "—"}
                    </TableCell>
                    <TableCell>{item.companies_found}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRuntimeMs(item.runtime_ms)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(item.updated_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {filtered.map((item) => (
              <Link
                key={item.id}
                href={`/jobs/${item.id}`}
                className="block space-y-3 rounded-xl border border-border p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {item.search_queries?.name ?? "Zoekopdracht"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.current_source_code ?? "geen bron"} ·{" "}
                      {formatDate(item.updated_at)}
                    </p>
                  </div>
                  <JobStatusBadge status={item.status} />
                </div>
                <JobProgressBar
                  pagesProcessed={item.pages_processed}
                  targetPages={item.target_pages}
                  progressPercent={item.progress_percent}
                  status={item.status}
                />
                <p className="text-sm text-muted-foreground">
                  {item.companies_found} gevonden · runtime{" "}
                  {formatRuntimeMs(item.runtime_ms)}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
