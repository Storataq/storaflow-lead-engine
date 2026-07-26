"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
  activateFunnelForLeadAction,
  updateCampaignApprovalAction,
} from "@/lib/crm/funnel-activation/actions";
import { FUNNEL_COMPLIANCE_NOTICE } from "@/lib/crm/funnel-activation/types";

type LeadFunnelReadinessCardProps = {
  leadId: string;
  readiness: {
    status: string;
    approvalStatus: string;
    salesPriority: string;
    preferredEmail: string | null;
    preferredName: string | null;
    qualificationScore: number;
    opportunityScore: number;
    reasons: string[];
    missingRequirements: string[];
  } | null;
  nextBestAction?: string | null;
};

export function LeadFunnelReadinessCard({
  leadId,
  readiness,
  nextBestAction,
}: LeadFunnelReadinessCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (busy || pending) return;
    setBusy(true);
    try {
      const result = await activateFunnelForLeadAction(leadId, {
        confirmed: true,
        force: true,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  async function decide(decision: "approved" | "rejected") {
    const result = await updateCampaignApprovalAction(leadId, decision);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    startTransition(() => router.refresh());
  }

  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Funnel & campaign readiness</CardTitle>
          <CardDescription>
            Qualification, opportunity, priority and campaign prep — no send.
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={busy || pending}
          onClick={() => {
            void refresh();
          }}
        >
          {busy || pending ? "Working…" : "Recalculate"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!readiness ? (
          <p className="text-muted-foreground">
            Not calculated yet. Run recalculate to activate/refresh the funnel
            path.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {readiness.status.replaceAll("_", " ")}
              </Badge>
              <Badge variant="outline">
                {readiness.approvalStatus.replaceAll("_", " ")}
              </Badge>
              <Badge variant="outline">{readiness.salesPriority}</Badge>
              <Badge variant="outline">
                Q{readiness.qualificationScore} / O{readiness.opportunityScore}
              </Badge>
            </div>
            <p>
              Preferred contact:{" "}
              <span className="font-medium">
                {readiness.preferredName ?? "—"}
              </span>{" "}
              · {readiness.preferredEmail ?? "No email"}
            </p>
            {nextBestAction ? (
              <p className="text-muted-foreground">
                Next best action: {nextBestAction}
              </p>
            ) : null}
            {readiness.missingRequirements.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Missing: {readiness.missingRequirements.join(", ")}
              </p>
            ) : null}
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              {readiness.reasons.slice(0, 5).map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            {readiness.approvalStatus === "pending_review" &&
            readiness.status !== "suppressed" ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    void decide("approved");
                  }}
                >
                  Approve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    void decide("rejected");
                  }}
                >
                  Reject
                </Button>
              </div>
            ) : null}
            <Button
              nativeButton={false}
              size="sm"
              variant="outline"
              render={<Link href="/crm/campaign-ready" />}
            >
              Open campaign-ready queue
            </Button>
          </>
        )}
        <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {FUNNEL_COMPLIANCE_NOTICE}
        </p>
      </CardContent>
    </Card>
  );
}
