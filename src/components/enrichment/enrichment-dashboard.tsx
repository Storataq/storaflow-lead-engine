"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Building2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import { startBulkWebsiteEnrichmentAction } from "@/lib/enrichment/actions";
import type { EnrichmentDashboardStats } from "@/lib/enrichment/queries";
import { COMPLIANCE_NOTICE } from "@/lib/enrichment/types";
import { formatRuntimeMs } from "@/lib/jobs/constants";
import { formatDateTime } from "@/lib/ui/format";

type EnrichmentDashboardProps = {
  stats: EnrichmentDashboardStats;
  companiesWithWebsite: Array<{
    id: string;
    company_name: string;
    website_url: string | null;
  }>;
};

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function EnrichmentDashboard({
  stats,
  companiesWithWebsite,
}: EnrichmentDashboardProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const selectable = useMemo(
    () => companiesWithWebsite.filter((c) => c.website_url).slice(0, 40),
    [companiesWithWebsite],
  );

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 10),
    );
  }

  function runBulk() {
    if (selected.length === 0) {
      toast.error("Selecteer eerst bedrijven met een website.");
      return;
    }
    const confirmed = window.confirm(
      `Queue website enrichment voor ${selected.length} bedrijf(ven)? Max 10 per batch. Recent verrijkte bedrijven worden overgeslagen.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await startBulkWebsiteEnrichmentAction(selected, {
        confirmed: true,
        skipRecentlyEnriched: true,
      });
      if (!result.success && result.queued === 0) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setSelected([]);
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Jobs queued" value={stats.queued} />
        <Metric label="Jobs running" value={stats.running} />
        <Metric label="Companies enriched" value={stats.companiesEnriched} />
        <Metric label="Websites unreachable" value={stats.unreachable} />
        <Metric label="Emails discovered" value={stats.emailsDiscovered} />
        <Metric label="Phones discovered" value={stats.phonesDiscovered} />
        <Metric label="Named contacts" value={stats.namedContactsFound} />
        <Metric label="Duplicates prevented" value={stats.duplicatesPrevented} />
        <Metric label="Jobs with warnings" value={stats.withWarnings} />
        <Metric label="Jobs failed" value={stats.failed} />
        <Metric
          label="Avg crawl duration"
          value={
            stats.averageDurationMs
              ? formatRuntimeMs(stats.averageDurationMs)
              : "—"
          }
        />
        <Metric label="Jobs completed" value={stats.completed} />
      </div>

      <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        {COMPLIANCE_NOTICE}
      </p>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Bulk enrichment</CardTitle>
          <CardDescription>
            Selecteer maximaal 10 bedrijven met website. Recent verrijkte
            records (&lt;24u) worden overgeslagen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectable.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Geen bedrijven met website"
              description="Voeg eerst bedrijven toe via scrape of handmatig."
            />
          ) : (
            <>
              <div className="max-h-56 overflow-auto rounded-lg border border-border">
                <ul className="divide-y divide-border text-sm">
                  {selectable.map((company) => (
                    <li key={company.id} className="flex items-center gap-3 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.includes(company.id)}
                        onChange={() => toggle(company.id)}
                        aria-label={`Selecteer ${company.company_name}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{company.company_name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {company.website_url}
                        </p>
                      </div>
                      <Button
                        nativeButton={false}
                        variant="ghost"
                        size="sm"
                        render={<Link href={`/companies/${company.id}`} />}
                      >
                        Open
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                type="button"
                disabled={pending || selected.length === 0}
                onClick={runBulk}
              >
                {pending
                  ? "Bezig…"
                  : `Start bulk (${selected.length})`}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Recent enrichment jobs</CardTitle>
          <CardDescription>
            Website-crawl jobs via bestaande scrape_jobs queue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nog geen website-enrichment jobs.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bedrijf</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contacten</TableHead>
                  <TableHead>Pagina&apos;s</TableHead>
                  <TableHead>Gestart</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      {job.companyId ? (
                        <Link
                          href={`/companies/${job.companyId}`}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {job.companyName ?? "Bedrijf"}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{job.status}</Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {job.contactsFound}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {job.pagesProcessed}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(job.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                        render={<Link href={`/jobs/${job.id}`} />}
                      >
                        Job
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
