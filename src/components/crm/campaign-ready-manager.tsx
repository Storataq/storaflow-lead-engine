"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { updateCampaignApprovalAction } from "@/lib/crm/funnel-activation/actions";
import type { CampaignReadinessRow } from "@/lib/crm/funnel-activation/queries";
import { FUNNEL_COMPLIANCE_NOTICE } from "@/lib/crm/funnel-activation/types";
import { formatDateTime } from "@/lib/ui/format";
import { Mail } from "lucide-react";

type CampaignReadyManagerProps = {
  items: CampaignReadinessRow[];
  initialError?: string | null;
};

export function CampaignReadyManager({
  items,
  initialError = null,
}: CampaignReadyManagerProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("all");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (statusFilter === "all") return items;
    return items.filter((item) => item.status === statusFilter);
  }, [items, statusFilter]);

  async function approve(leadId: string, decision: "approved" | "rejected") {
    const result = await updateCampaignApprovalAction(leadId, decision);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    startTransition(() => router.refresh());
  }

  if (initialError) {
    return (
      <EmptyState
        icon={Mail}
        title="Campaign ready unavailable"
        description={initialError}
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        {FUNNEL_COMPLIANCE_NOTICE} No Send Email action in this phase.
      </p>

      <div className="flex flex-wrap gap-2">
        {[
          "all",
          "ready",
          "ready_with_review",
          "needs_approval",
          "needs_contact",
          "needs_verification",
          "suppressed",
          "not_qualified",
        ].map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={statusFilter === value ? "default" : "outline"}
            onClick={() => setStatusFilter(value)}
          >
            {value.replaceAll("_", " ")}
          </Button>
        ))}
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Campaign-ready queue</CardTitle>
          <CardDescription>
            Leads prepared for the future Automated Email Engine.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No matching records"
              description="Activate funnels from companies or leads first."
              actionLabel="Funnel dashboard"
              actionHref="/crm/funnel-activation"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Scores</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link
                        href={`/crm/leads/${item.leadId}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {item.companyName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {item.preferredName ?? "—"}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-sm">
                      {item.preferredEmail ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {item.status.replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {item.approvalStatus.replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.salesPriority}</TableCell>
                    <TableCell className="tabular-nums text-xs">
                      Q{item.qualificationScore} / O{item.opportunityScore}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(item.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          nativeButton={false}
                          size="sm"
                          variant="outline"
                          render={<Link href={`/crm/leads/${item.leadId}`} />}
                        >
                          View
                        </Button>
                        {item.approvalStatus === "pending_review" &&
                        item.status !== "suppressed" ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              disabled={pending}
                              onClick={() => {
                                void approve(item.leadId, "approved");
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
                                void approve(item.leadId, "rejected");
                              }}
                            >
                              Reject
                            </Button>
                          </>
                        ) : null}
                      </div>
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
