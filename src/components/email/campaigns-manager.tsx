"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Megaphone } from "lucide-react";
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
  EMAIL_CAMPAIGN_STATUS_LABELS,
  EMAIL_CAMPAIGN_STATUSES,
  EMAIL_CAMPAIGN_TYPE_LABELS,
  EMAIL_CAMPAIGN_TYPES,
  type EmailCampaignStatusExtended,
  type EmailCampaignType,
} from "@/lib/email/campaign/constants";
import {
  archiveEmailCampaignAction,
  duplicateEmailCampaignAction,
} from "@/lib/email/campaign/actions";
import type { EmailCampaignRow } from "@/lib/email/campaign/queries";

type CampaignsManagerProps = {
  campaigns: EmailCampaignRow[];
  initialError?: string | null;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function CampaignsManager({
  campaigns,
  initialError = null,
}: CampaignsManagerProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [language, setLanguage] = useState("all");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const languages = useMemo(
    () => [...new Set(campaigns.map((c) => c.language))].sort(),
    [campaigns],
  );

  const filtered = useMemo(() => {
    return campaigns.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (type !== "all" && row.campaign_type !== type) return false;
      if (language !== "all" && row.language !== language) return false;
      if (query.trim()) {
        const needle = query.trim().toLowerCase();
        const hay = [
          row.name,
          row.description ?? "",
          row.objective ?? "",
          row.campaign_type,
          row.status,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [campaigns, query, status, type, language]);

  if (initialError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{initialError}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="c-search" className="mb-1 block text-xs text-muted-foreground">
              Search
            </label>
            <Input
              id="c-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, description…"
            />
          </div>
          <div>
            <label htmlFor="c-status" className="mb-1 block text-xs text-muted-foreground">
              Status
            </label>
            <select
              id="c-status"
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All</option>
              {EMAIL_CAMPAIGN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {EMAIL_CAMPAIGN_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="c-type" className="mb-1 block text-xs text-muted-foreground">
              Type
            </label>
            <select
              id="c-type"
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="all">All</option>
              {EMAIL_CAMPAIGN_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EMAIL_CAMPAIGN_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="c-lang" className="mb-1 block text-xs text-muted-foreground">
              Language
            </label>
            <select
              id="c-lang"
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="all">All</option>
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/email/campaigns/new" />}
          >
            Quick create
          </Button>
          <Button
            nativeButton={false}
            render={<Link href="/email/campaigns/new/wizard" />}
          >
            Wizard
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={campaigns.length === 0 ? "No campaigns yet" : "No matches"}
          description={
            campaigns.length === 0
              ? "Create a draft campaign from Campaign Ready leads."
              : "Try adjusting filters."
          }
          actionLabel="Create campaign"
          actionHref="/email/campaigns/new/wizard"
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      href={`/email/campaigns/${row.id}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      <TruncatedText
                        value={row.name}
                        maxWidthClassName="max-w-56"
                      />
                    </Link>
                    {row.locked ? (
                      <Badge variant="secondary" className="mt-1">
                        Locked
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {row.campaign_type in EMAIL_CAMPAIGN_TYPE_LABELS
                      ? EMAIL_CAMPAIGN_TYPE_LABELS[
                          row.campaign_type as EmailCampaignType
                        ]
                      : row.campaign_type}
                  </TableCell>
                  <TableCell>
                    {row.status in EMAIL_CAMPAIGN_STATUS_LABELS
                      ? EMAIL_CAMPAIGN_STATUS_LABELS[
                          row.status as EmailCampaignStatusExtended
                        ]
                      : row.status}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.valid_recipient_count}/{row.recipient_count}
                  </TableCell>
                  <TableCell>{row.readiness_score}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(row.updated_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => {
                          startTransition(async () => {
                            const result =
                              await duplicateEmailCampaignAction(row.id);
                            if (!result.success) {
                              toast.error(result.message);
                              return;
                            }
                            toast.success(result.message);
                            if (result.id) {
                              router.push(`/email/campaigns/${result.id}`);
                              router.refresh();
                            }
                          });
                        }}
                      >
                        Duplicate
                      </Button>
                      {row.status !== "archived" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => {
                            startTransition(async () => {
                              const result =
                                await archiveEmailCampaignAction(row.id);
                              if (!result.success) {
                                toast.error(result.message);
                                return;
                              }
                              toast.success(result.message);
                              router.refresh();
                            });
                          }}
                        >
                          Archive
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
