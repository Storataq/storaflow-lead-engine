"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { GitBranch } from "lucide-react";
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
import { activateFunnelBulkAction } from "@/lib/crm/funnel-activation/actions";
import type { FunnelDashboardStats } from "@/lib/crm/funnel-activation/queries";
import { FUNNEL_COMPLIANCE_NOTICE } from "@/lib/crm/funnel-activation/types";
import { formatDateTime } from "@/lib/ui/format";

type FunnelActivationDashboardProps = {
  stats: FunnelDashboardStats;
  companies: Array<{ id: string; company_name: string; website_url: string | null }>;
};

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function FunnelActivationDashboard({
  stats,
  companies,
}: FunnelActivationDashboardProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const selectable = useMemo(
    () => companies.filter((c) => c.website_url).slice(0, 40),
    [companies],
  );

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 10),
    );
  }

  function runBulk() {
    if (!selected.length) {
      toast.error("Select companies first.");
      return;
    }
    const confirmed = window.confirm(
      `Activate funnel for ${selected.length} companies? Max 10. Recent activations are reused. No emails will be sent.`,
    );
    if (!confirmed) return;
    startTransition(async () => {
      const result = await activateFunnelBulkAction(selected, { confirmed: true });
      if (!result.success && result.activated === 0) {
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
        <Metric label="Companies w/ website" value={stats.companiesEligibleEstimate} />
        <Metric label="Leads created (runs)" value={stats.leadsCreated} />
        <Metric label="Leads reused (runs)" value={stats.leadsReused} />
        <Metric label="Qualified (≥50)" value={stats.qualifiedLeads} />
        <Metric label="High / critical priority" value={stats.highPriority} />
        <Metric label="Campaign ready" value={stats.campaignReady} />
        <Metric label="Needs review" value={stats.needsReview} />
        <Metric label="Suppressed" value={stats.suppressed} />
        <Metric label="Failed workflows" value={stats.failedRuns} />
        <Metric label="Tasks created (est.)" value={stats.tasksCreatedEstimate} />
        <Metric
          label="Duplicates prevented (est.)"
          value={stats.duplicatesPreventedEstimate}
        />
      </div>

      <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        {FUNNEL_COMPLIANCE_NOTICE}
      </p>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Readiness distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {Object.entries(stats.readinessDistribution).length === 0 ? (
            <p className="text-sm text-muted-foreground">No readiness rows yet.</p>
          ) : (
            Object.entries(stats.readinessDistribution).map(([key, count]) => (
              <Badge key={key} variant="secondary">
                {key.replaceAll("_", " ")}: {count}
              </Badge>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Bulk activation</CardTitle>
          <CardDescription>
            Selected companies only · confirmation required · max 10.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectable.length === 0 ? (
            <EmptyState
              icon={GitBranch}
              title="No companies with website"
              description="Scrape or enrich companies first."
            />
          ) : (
            <>
              <div className="max-h-56 overflow-auto rounded-lg border border-border">
                <ul className="divide-y divide-border text-sm">
                  {selectable.map((company) => (
                    <li
                      key={company.id}
                      className="flex items-center gap-3 px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(company.id)}
                        onChange={() => toggle(company.id)}
                        aria-label={`Select ${company.company_name}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {company.company_name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {company.website_url}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                type="button"
                disabled={pending || selected.length === 0}
                onClick={runBulk}
              >
                {pending ? "Working…" : `Activate selected (${selected.length})`}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Recent activation runs</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No runs yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Warnings</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>
                      <Badge variant="secondary">{run.status}</Badge>
                    </TableCell>
                    <TableCell>{run.triggerSource}</TableCell>
                    <TableCell className="tabular-nums">
                      {run.warningCount}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(run.createdAt)}
                    </TableCell>
                    <TableCell>
                      {run.leadId ? (
                        <Button
                          nativeButton={false}
                          size="sm"
                          variant="outline"
                          render={<Link href={`/crm/leads/${run.leadId}`} />}
                        >
                          Lead
                        </Button>
                      ) : run.companyId ? (
                        <Button
                          nativeButton={false}
                          size="sm"
                          variant="outline"
                          render={
                            <Link href={`/companies/${run.companyId}`} />
                          }
                        >
                          Company
                        </Button>
                      ) : null}
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
