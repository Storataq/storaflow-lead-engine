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
  JOB_PRIORITIES,
  JOB_SORT_OPTIONS,
  QUEUE_BUCKETS,
  formatRuntimeMs,
  jobPriorityLabel,
  normalizeJobStatus,
  priorityRank,
  type JobSortOption,
  type QueueBucketKey,
} from "@/lib/jobs/constants";
import type { ScrapeJobWithSearch } from "@/lib/jobs/queries";
import type { ScrapeJobPriority, ScrapeJobStatus } from "@/types/database";
import { cn } from "@/lib/utils";

type JobsQueueProps = {
  initialItems: ScrapeJobWithSearch[];
  initialError?: string | null;
};

type StatusFilter = ScrapeJobStatus | "all";

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
  const [bucket, setBucket] = useState<QueueBucketKey | "all">("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [priority, setPriority] = useState<ScrapeJobPriority | "all">("all");
  const [source, setSource] = useState("all");
  const [searchName, setSearchName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [sort, setSort] = useState<JobSortOption>("newest");

  const sourceOptions = useMemo(() => {
    const codes = new Set(
      initialItems
        .map((item) => item.current_source_code)
        .filter((value): value is string => Boolean(value)),
    );
    return [...codes].sort();
  }, [initialItems]);

  const filtered = useMemo(() => {
    let next = [...initialItems];

    if (bucket !== "all") {
      const selected = QUEUE_BUCKETS.find((item) => item.key === bucket);
      if (selected) {
        const allowed = new Set<string>(selected.statuses);
        next = next.filter((item) =>
          allowed.has(normalizeJobStatus(item.status)),
        );
      }
    } else if (status !== "all") {
      const wanted = normalizeJobStatus(status);
      next = next.filter((item) => normalizeJobStatus(item.status) === wanted);
    }

    if (priority !== "all") {
      next = next.filter((item) => item.priority === priority);
    }

    if (source !== "all") {
      next = next.filter((item) => item.current_source_code === source);
    }

    if (searchName.trim()) {
      const needle = searchName.trim().toLowerCase();
      next = next.filter((item) =>
        (item.search_queries?.name ?? "").toLowerCase().includes(needle),
      );
    }

    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      next = next.filter(
        (item) => new Date(item.created_at).getTime() >= from,
      );
    }

    next.sort((a, b) => {
      if (sort === "priority") {
        const rank = priorityRank(b.priority) - priorityRank(a.priority);
        if (rank !== 0) return rank;
      }
      return sort === "oldest"
        ? a.created_at.localeCompare(b.created_at)
        : b.created_at.localeCompare(a.created_at);
    });

    return next;
  }, [
    initialItems,
    bucket,
    status,
    priority,
    source,
    searchName,
    dateFrom,
    sort,
  ]);

  if (initialError) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {initialError}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {QUEUE_BUCKETS.map((item) => {
          const active = bucket === item.key;
          return (
            <button
              key={item.key}
              type="button"
              className={cn(
                "rounded-xl border border-border bg-card text-left transition-colors hover:bg-muted/40",
                active && "border-primary ring-2 ring-primary/20",
              )}
              onClick={() => {
                setStatus("all");
                setBucket((current) =>
                  current === item.key ? "all" : item.key,
                );
              }}
            >
              <Card className="border-0 shadow-none">
                <CardHeader className="pb-2">
                  <CardDescription>{item.label}</CardDescription>
                  <CardTitle className="text-2xl">
                    {bucketCount(initialItems, item.statuses)}
                  </CardTitle>
                </CardHeader>
              </Card>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <input
          className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          placeholder="Zoekopdracht…"
          value={searchName}
          onChange={(event) => setSearchName(event.target.value)}
        />
        <select
          className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={status}
          onChange={(event) => {
            setBucket("all");
            setStatus(event.target.value as StatusFilter);
          }}
        >
          <option value="all">Alle statussen</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="queued">Queued</option>
          <option value="active">Active / Running</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={priority}
          onChange={(event) =>
            setPriority(event.target.value as ScrapeJobPriority | "all")
          }
        >
          <option value="all">Alle prioriteiten</option>
          {JOB_PRIORITIES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={source}
          onChange={(event) => setSource(event.target.value)}
        >
          <option value="all">Alle bronnen</option>
          {sourceOptions.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
        />
        <select
          className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={sort}
          onChange={(event) => setSort(event.target.value as JobSortOption)}
        >
          {JOB_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button
          nativeButton={false}
          className="lg:ml-auto"
          render={<Link href="/zoekopdrachten" />}
        >
          Start vanaf zoekopdracht
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="Geen scrape jobs"
          description="Start een scrape vanuit een zoekopdracht. De MockWorker simuleert progress lokaal."
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border xl:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zoekopdracht</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioriteit</TableHead>
                  <TableHead>Voortgang</TableHead>
                  <TableHead>Bron</TableHead>
                  <TableHead>Bedrijven</TableHead>
                  <TableHead>Contacten</TableHead>
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
                    <TableCell className="text-muted-foreground">
                      {jobPriorityLabel(item.priority)}
                    </TableCell>
                    <TableCell className="min-w-40">
                      <JobProgressBar
                        pagesProcessed={item.pages_processed}
                        targetPages={item.pages_total || item.target_pages}
                        progressPercent={item.progress_percent}
                        status={item.status}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.current_source_code ?? "—"}
                    </TableCell>
                    <TableCell>{item.companies_found}</TableCell>
                    <TableCell>{item.contacts_found}</TableCell>
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

          <div className="grid gap-3 xl:hidden">
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
                      {jobPriorityLabel(item.priority)} ·{" "}
                      {item.current_source_code ?? "geen bron"}
                    </p>
                  </div>
                  <JobStatusBadge status={item.status} />
                </div>
                <JobProgressBar
                  pagesProcessed={item.pages_processed}
                  targetPages={item.pages_total || item.target_pages}
                  progressPercent={item.progress_percent}
                  status={item.status}
                />
                <p className="text-sm text-muted-foreground">
                  {item.companies_found} bedrijven · {item.contacts_found}{" "}
                  contacten · {formatRuntimeMs(item.runtime_ms)}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
