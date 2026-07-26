"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { GitBranch, RefreshCw } from "lucide-react";
import { toast } from "sonner";

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
  activateFunnelForCompanyAction,
  retryFunnelActivationAction,
} from "@/lib/crm/funnel-activation/actions";
import { FUNNEL_COMPLIANCE_NOTICE } from "@/lib/crm/funnel-activation/types";
import { formatDateTime } from "@/lib/ui/format";

export type FunnelActivationSummary = {
  runId: string | null;
  status: string | null;
  leadId: string | null;
  campaignStatus: string | null;
  salesPriority: string | null;
  preferredEmail: string | null;
  qualificationScore: number | null;
  opportunityScore: number | null;
  lastActivatedAt: string | null;
  warnings: string[];
};

type FunnelActivationPanelProps = {
  companyId: string;
  summary: FunnelActivationSummary;
};

export function FunnelActivationPanel({
  companyId,
  summary,
}: FunnelActivationPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function handleActivate(force = false) {
    if (busy || pending) return;
    const confirmed = window.confirm(
      "Start funnel activation for this company? This creates/reuses a lead, qualifies it, places it in the pipeline (up to outreach-ready), and creates follow-up tasks. No email will be sent.",
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      const result = force
        ? await retryFunnelActivationAction(companyId, summary.leadId)
        : await activateFunnelForCompanyAction(companyId, {
            confirmed: true,
            force,
          });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      startTransition(() => {
        if (result.leadId) router.push(`/crm/leads/${result.leadId}`);
        else router.refresh();
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="shadow-none">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <GitBranch className="size-4" aria-hidden />
              Funnel Activation
            </CardTitle>
            <CardDescription>
              Bridge scrape/enrichment → lead → qualification → pipeline →
              campaign readiness (no email send).
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy || pending}
              onClick={() => {
                void handleActivate(false);
              }}
            >
              <RefreshCw className="size-3.5" aria-hidden />
              {busy || pending ? "Working…" : "Activate funnel"}
            </Button>
            {summary.runId ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy || pending}
                onClick={() => {
                  void handleActivate(true);
                }}
              >
                Retry
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border px-3 py-2">
            <p className="text-xs text-muted-foreground">Workflow</p>
            <p className="mt-1 font-medium">{summary.status ?? "Not run"}</p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2">
            <p className="text-xs text-muted-foreground">Campaign readiness</p>
            <p className="mt-1 font-medium">
              {summary.campaignStatus ?? "—"}
            </p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2">
            <p className="text-xs text-muted-foreground">Priority</p>
            <p className="mt-1 font-medium">
              {summary.salesPriority ?? "—"}
            </p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2">
            <p className="text-xs text-muted-foreground">Preferred email</p>
            <p className="mt-1 truncate font-medium">
              {summary.preferredEmail ?? "—"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {summary.qualificationScore != null ? (
            <Badge variant="secondary">
              Qualification {summary.qualificationScore}
            </Badge>
          ) : null}
          {summary.opportunityScore != null ? (
            <Badge variant="secondary">
              Opportunity {summary.opportunityScore}
            </Badge>
          ) : null}
          {summary.leadId ? (
            <Button
              nativeButton={false}
              size="sm"
              variant="outline"
              render={<Link href={`/crm/leads/${summary.leadId}`} />}
            >
              Review lead
            </Button>
          ) : null}
          <Button
            nativeButton={false}
            size="sm"
            variant="outline"
            render={<Link href="/crm/campaign-ready" />}
          >
            Campaign ready
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Last activation:{" "}
          {summary.lastActivatedAt
            ? formatDateTime(summary.lastActivatedAt)
            : "Never"}
        </p>

        <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {FUNNEL_COMPLIANCE_NOTICE}
        </p>
      </CardContent>
    </Card>
  );
}
