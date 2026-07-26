"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Globe2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { startWebsiteEnrichmentAction } from "@/lib/enrichment/actions";
import { COMPLIANCE_NOTICE } from "@/lib/enrichment/types";
import { formatDateTime } from "@/lib/ui/format";

export type WebsiteEnrichmentSummary = {
  lastJobId: string | null;
  lastStatus: string | null;
  lastCompletedAt: string | null;
  emailsFound: number;
  phonesFound: number;
  pagesProcessed: number;
  contactPage: string | null;
  aboutPage: string | null;
  teamPage: string | null;
  availability: string | null;
  websiteUrl: string | null;
};

type WebsiteEnrichmentPanelProps = {
  companyId: string;
  websiteUrl: string | null;
  summary: WebsiteEnrichmentSummary;
};

export function WebsiteEnrichmentPanel({
  companyId,
  websiteUrl,
  summary,
}: WebsiteEnrichmentPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function handleStart() {
    if (busy || pending) return;
    setBusy(true);
    try {
      const result = await startWebsiteEnrichmentAction(companyId);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      startTransition(() => {
        if (result.jobId) router.push(`/jobs/${result.jobId}`);
        router.refresh();
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
              <Globe2 className="size-4" aria-hidden />
              Website Enrichment
            </CardTitle>
            <CardDescription>
              Ontdek publieke e-mails, telefoons en social links vanaf de
              bedrijfswebsite (HTTP/HTML, geen browser automation).
            </CardDescription>
          </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={!websiteUrl || busy || pending}
                onClick={() => {
                  void handleStart();
                }}
              >
                <RefreshCw className="size-3.5" aria-hidden />
                {busy || pending ? "Bezig…" : "Start enrichment"}
              </Button>
              <Button
                nativeButton={false}
                size="sm"
                variant="outline"
                render={<Link href={`/companies/${companyId}/enrichment`} />}
              >
                View results
              </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {!websiteUrl ? (
          <p className="text-muted-foreground">
            Geen website-URL beschikbaar. Voeg eerst een website toe via scrape
            of handmatige data.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border px-3 py-2">
                <p className="text-xs text-muted-foreground">Website status</p>
                <p className="mt-1 font-medium">
                  {summary.availability ?? "Nog niet gecontroleerd"}
                </p>
              </div>
              <div className="rounded-lg border border-border px-3 py-2">
                <p className="text-xs text-muted-foreground">Laatste job</p>
                <p className="mt-1 font-medium">
                  {summary.lastStatus ?? "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border px-3 py-2">
                <p className="text-xs text-muted-foreground">E-mails gevonden</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {summary.emailsFound}
                </p>
              </div>
              <div className="rounded-lg border border-border px-3 py-2">
                <p className="text-xs text-muted-foreground">Telefoons</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {summary.phonesFound}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {summary.contactPage ? (
                <Badge variant="secondary">Contact page gevonden</Badge>
              ) : null}
              {summary.aboutPage ? (
                <Badge variant="secondary">About page gevonden</Badge>
              ) : null}
              {summary.teamPage ? (
                <Badge variant="secondary">Team page gevonden</Badge>
              ) : null}
              {summary.pagesProcessed > 0 ? (
                <Badge variant="outline">
                  {summary.pagesProcessed} pagina&apos;s verwerkt
                </Badge>
              ) : null}
            </div>

            <p className="text-xs text-muted-foreground">
              Laatste enrichment:{" "}
              {summary.lastCompletedAt
                ? formatDateTime(summary.lastCompletedAt)
                : "Nog niet uitgevoerd"}
              {summary.lastJobId ? (
                <>
                  {" · "}
                  <Link
                    href={`/jobs/${summary.lastJobId}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    Bekijk job
                  </Link>
                </>
              ) : null}
            </p>

            <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              {COMPLIANCE_NOTICE} Syntax/MX-validatie bewijst geen mailbox
              deliverability en geen toestemming voor outreach.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
