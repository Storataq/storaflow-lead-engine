"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ListTodo } from "lucide-react";

import { JobProgressBar } from "@/components/jobs/job-progress-bar";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
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
  MOCK_SCRAPE_TARGET_PAGES,
  toUiJobStatus,
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
  { value: "queued", label: "Pending" },
  { value: "running", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Paused" },
];

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function JobsQueue({ initialItems, initialError }: JobsQueueProps) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<JobSortOption>("newest");

  const filtered = useMemo(() => {
    let next = [...initialItems];
    if (status !== "all") {
      next = next.filter((item) => item.status === status);
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
          Naar zoekopdrachten
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="Nog geen scrapingtaken"
          description="Start een scrape vanuit een opgeslagen zoekopdracht. De mock-engine vult bedrijven zonder externe API's."
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zoekopdracht</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Voortgang</TableHead>
                  <TableHead>Bedrijven</TableHead>
                  <TableHead>Aangemaakt</TableHead>
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
                      <p className="text-xs text-muted-foreground">
                        {toUiJobStatus(item.status)} · {item.job_type}
                      </p>
                    </TableCell>
                    <TableCell>
                      <JobStatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="min-w-40">
                      <JobProgressBar
                        pagesProcessed={item.pages_processed}
                        targetPages={MOCK_SCRAPE_TARGET_PAGES}
                        status={item.status}
                      />
                    </TableCell>
                    <TableCell>{item.companies_found}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(item.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 md:hidden">
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
                      {formatDate(item.created_at)}
                    </p>
                  </div>
                  <JobStatusBadge status={item.status} />
                </div>
                <JobProgressBar
                  pagesProcessed={item.pages_processed}
                  targetPages={MOCK_SCRAPE_TARGET_PAGES}
                  status={item.status}
                />
                <p className="text-sm text-muted-foreground">
                  {item.companies_found} bedrijven · {item.pages_processed}/
                  {MOCK_SCRAPE_TARGET_PAGES} pagina&apos;s
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
