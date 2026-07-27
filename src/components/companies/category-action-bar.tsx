"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  activateCategoryFunnelAction,
  addCategoryTagsAction,
  assignCategoryOwnerAction,
  createCategoryCampaignDraftAction,
  createCategoryFollowUpPlanAction,
  createCategorySequenceDraftAction,
  createCategoryTasksAction,
  generateCategoryAiEmailAction,
} from "@/lib/companies/category-actions";
import type { CategoryCompanyListItem } from "@/lib/companies/category-actions/types";

type MemberOption = { userId: string; label: string };
type TemplateOption = { id: string; name: string };
type SequenceOption = { id: string; name: string };
type SenderOption = { id: string; name: string };

type CategoryActionBarProps = {
  categoryId: string;
  categoryName: string;
  companies: CategoryCompanyListItem[];
  canAct: boolean;
  members: MemberOption[];
  templates: TemplateOption[];
  sequences: SequenceOption[];
  senders: SenderOption[];
};

type DialogKind =
  | null
  | "funnel"
  | "campaign"
  | "sequence"
  | "ai"
  | "task"
  | "tags"
  | "owner"
  | "followup";

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function CategoryActionBar({
  categoryId,
  categoryName,
  companies,
  canAct,
  members,
  templates,
  sequences,
  senders,
}: CategoryActionBarProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const [campaignName, setCampaignName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [sequenceId, setSequenceId] = useState("");
  const [senderId, setSenderId] = useState("");
  const [taskTitle, setTaskTitle] = useState("Call Companies");
  const [taskDue, setTaskDue] = useState("");
  const [taskOwner, setTaskOwner] = useState("");
  const [tagInput, setTagInput] = useState(`${categoryName}, Pilot`);
  const [ownerId, setOwnerId] = useState("");
  const [aiPurpose, setAiPurpose] = useState("");
  const [waitDays, setWaitDays] = useState("5");

  const [filterReady, setFilterReady] = useState(false);
  const [filterCountry, setFilterCountry] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterOwner, setFilterOwner] = useState("");
  const [filterLeadStatus, setFilterLeadStatus] = useState("");

  const filtered = useMemo(() => {
    return companies.filter((row) => {
      if (filterReady && !row.campaignReady) return false;
      if (
        filterCountry &&
        !(row.country ?? "").toLowerCase().includes(filterCountry.toLowerCase())
      ) {
        return false;
      }
      if (
        filterCity &&
        !(row.city ?? "").toLowerCase().includes(filterCity.toLowerCase())
      ) {
        return false;
      }
      if (filterTag) {
        const needle = filterTag.toLowerCase();
        if (!row.tags.some((t) => t.toLowerCase().includes(needle))) return false;
      }
      if (filterOwner && row.ownerUserId !== filterOwner) return false;
      if (filterLeadStatus && row.leadStatus !== filterLeadStatus) return false;
      return true;
    });
  }, [
    companies,
    filterReady,
    filterCountry,
    filterCity,
    filterTag,
    filterOwner,
    filterLeadStatus,
  ]);

  const selectedIds = useMemo(() => {
    if (selected.size === 0) return filtered.map((c) => c.id);
    return [...selected];
  }, [selected, filtered]);

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (!checked) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(filtered.map((c) => c.id)));
  }

  function run(action: () => Promise<void>) {
    startTransition(async () => {
      setProgress("Working…");
      try {
        await action();
      } finally {
        setProgress(null);
      }
    });
  }

  function exportCompanies() {
    const header = [
      "Company Name",
      "Website",
      "City",
      "Country",
      "Status",
      "Lead Status",
      "Campaign Ready",
      "Tags",
    ];
    const lines = [header.join(",")];
    for (const row of filtered.filter(
      (c) => selected.size === 0 || selected.has(c.id),
    )) {
      lines.push(
        [
          row.company_name,
          row.website_url ?? "",
          row.city ?? "",
          row.country ?? "",
          row.status,
          row.leadStatus ?? "",
          row.campaignReady ? "yes" : "no",
          row.tags.join("; "),
        ]
          .map((cell) => escapeCsv(String(cell)))
          .join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${categoryName.toLowerCase().replace(/\s+/g, "-")}-companies.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Companies exported.");
  }

  function exportContactsHint() {
    toast.message(
      "Open Contacts and filter by these companies, or run funnel activation first to sync CRM contacts.",
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-muted/20 p-3">
        {canAct ? (
          <>
            <Button type="button" size="sm" onClick={() => setDialog("funnel")}>
              Add to Funnel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDialog("campaign")}
            >
              Start Email Campaign
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDialog("sequence")}
            >
              Create Email Sequence
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDialog("ai")}
            >
              Generate AI Email
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDialog("task")}
            >
              Create CRM Task
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDialog("tags")}
            >
              Add Tag
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDialog("owner")}
            >
              Assign Owner
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDialog("followup")}
            >
              Follow-up Plan
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            View-only: ask an owner or admin to run category actions.
          </p>
        )}
        <Button type="button" size="sm" variant="ghost" onClick={exportCompanies}>
          Export Companies
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={exportContactsHint}
        >
          Export Contacts
        </Button>
        {progress ? (
          <Badge variant="secondary">{progress}</Badge>
        ) : (
          <Badge variant="outline">
            {selected.size > 0
              ? `${selected.size} selected`
              : `${filtered.length} companies (all filtered)`}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-border p-3 text-sm">
        <label className="inline-flex items-center gap-2">
          <Checkbox
            checked={filterReady}
            onCheckedChange={(v) => setFilterReady(Boolean(v))}
          />
          Campaign Ready
        </label>
        <Input
          className="h-8 w-28"
          placeholder="Country"
          value={filterCountry}
          onChange={(e) => setFilterCountry(e.target.value)}
        />
        <Input
          className="h-8 w-28"
          placeholder="City"
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
        />
        <Input
          className="h-8 w-28"
          placeholder="Tag"
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
        />
        <select
          className="h-8 rounded-lg border border-input bg-transparent px-2"
          value={filterOwner}
          onChange={(e) => setFilterOwner(e.target.value)}
          aria-label="Filter owner"
        >
          <option value="">Any owner</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.label}
            </option>
          ))}
        </select>
        <select
          className="h-8 rounded-lg border border-input bg-transparent px-2"
          value={filterLeadStatus}
          onChange={(e) => setFilterLeadStatus(e.target.value)}
          aria-label="Filter lead status"
        >
          <option value="">Any lead status</option>
          <option value="open">Open</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    filtered.length > 0 &&
                    filtered.every((c) => selected.has(c.id))
                  }
                  onCheckedChange={(v) => toggleAll(Boolean(v))}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Ready</TableHead>
              <TableHead>Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(row.id)}
                    onCheckedChange={(v) => toggle(row.id, Boolean(v))}
                    aria-label={`Select ${row.company_name}`}
                  />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/companies/${row.id}`}
                    className="font-medium hover:underline"
                  >
                    {row.company_name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {[row.city, row.country].filter(Boolean).join(", ") || "—"}
                </TableCell>
                <TableCell>
                  {row.leadId ? (
                    <Link
                      href={`/crm/leads/${row.leadId}`}
                      className="text-sm hover:underline"
                    >
                      {row.leadStatus ?? "lead"}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  {row.campaignReady ? (
                    <Badge variant="secondary">Ready</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {row.tags.slice(0, 3).join(", ") || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Funnel */}
      <Dialog open={dialog === "funnel"} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Funnel</DialogTitle>
            <DialogDescription>
              Activates the existing funnel pipeline for {selectedIds.length}{" "}
              compan{selectedIds.length === 1 ? "y" : "ies"}. Confirmation
              required.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const result = await activateCategoryFunnelAction({
                    categoryId,
                    companyIds: selectedIds,
                    confirmed: true,
                  });
                  if (!result.success) toast.error(result.message);
                  else toast.success(result.message);
                  setDialog(null);
                  router.refresh();
                })
              }
            >
              Confirm activation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign */}
      <Dialog open={dialog === "campaign"} onOpenChange={() => setDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Start Email Campaign</DialogTitle>
            <DialogDescription>
              Creates a <strong>draft</strong> only. Review recipients, sender
              and sequence before launch. Estimated volume: {selectedIds.length}{" "}
              companies in category filter (Campaign Ready + approved only).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Campaign name"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />
            <select
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              <option value="">Template (optional)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
              value={sequenceId}
              onChange={(e) => setSequenceId(e.target.value)}
            >
              <option value="">Sequence (optional)</option>
              {sequences.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
            >
              <option value="">Sender profile (optional)</option>
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const result = await createCategoryCampaignDraftAction({
                    categoryId,
                    categoryName,
                    companyIds: selected.size > 0 ? selectedIds : undefined,
                    name: campaignName || undefined,
                    templateId: templateId || null,
                    sequenceId: sequenceId || null,
                    senderProfileId: senderId || null,
                    confirmed: true,
                  });
                  if (!result.success) {
                    toast.error(result.message);
                    return;
                  }
                  toast.success(result.message);
                  setDialog(null);
                  if (result.campaignId) {
                    router.push(`/email/campaigns/${result.campaignId}`);
                  } else {
                    router.refresh();
                  }
                })
              }
            >
              Create draft campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sequence */}
      <Dialog open={dialog === "sequence"} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Email Sequence</DialogTitle>
            <DialogDescription>
              Creates a draft sequence named for this category, or open an
              existing sequence to assign later from the campaign wizard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/email/sequences" />}
            >
              Browse sequences
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const result = await createCategorySequenceDraftAction({
                    categoryId,
                    categoryName,
                  });
                  if (!result.success) {
                    toast.error(result.message);
                    return;
                  }
                  toast.success(result.message);
                  setDialog(null);
                  if (result.sequenceId) {
                    router.push(`/email/sequences/${result.sequenceId}/edit`);
                  }
                })
              }
            >
              Create new sequence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI */}
      <Dialog open={dialog === "ai"} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate AI Email</DialogTitle>
            <DialogDescription>
              Uses category “{categoryName}” as audience context. AI never
              sends — review the draft in Email AI history.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder={`e.g. Generate ${categoryName} introduction`}
            value={aiPurpose}
            onChange={(e) => setAiPurpose(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const result = await generateCategoryAiEmailAction({
                    categoryId,
                    categoryName,
                    purpose: aiPurpose || undefined,
                  });
                  if (!result.success) toast.error(result.message);
                  else toast.success(result.message);
                  setDialog(null);
                  router.push("/email/ai/history");
                })
              }
            >
              Generate draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tasks */}
      <Dialog open={dialog === "task"} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create CRM Tasks</DialogTitle>
            <DialogDescription>
              Creates one task per selected company (creates a lead when
              missing). Count: {selectedIds.length}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Task title"
            />
            <Input
              type="datetime-local"
              value={taskDue}
              onChange={(e) => setTaskDue(e.target.value)}
            />
            <select
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
              value={taskOwner}
              onChange={(e) => setTaskOwner(e.target.value)}
            >
              <option value="">Assign to me</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const result = await createCategoryTasksAction({
                    categoryId,
                    companyIds: selectedIds,
                    title: taskTitle,
                    dueAt: taskDue || null,
                    assignedUserId: taskOwner || null,
                  });
                  if (!result.success) toast.error(result.message);
                  else toast.success(result.message);
                  setDialog(null);
                  router.refresh();
                })
              }
            >
              Create tasks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tags */}
      <Dialog open={dialog === "tags"} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tags</DialogTitle>
            <DialogDescription>
              Comma-separated tags applied to CRM leads for selected companies.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Restaurant, Pilot, Hot Lead"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const result = await addCategoryTagsAction({
                    categoryId,
                    companyIds: selectedIds,
                    tags: tagInput.split(/[,;\n]/),
                  });
                  if (!result.success) toast.error(result.message);
                  else toast.success(result.message);
                  setDialog(null);
                  router.refresh();
                })
              }
            >
              Apply tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Owner */}
      <Dialog open={dialog === "owner"} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Owner</DialogTitle>
            <DialogDescription>
              Assigns CRM lead owner for {selectedIds.length} companies.
            </DialogDescription>
          </DialogHeader>
          <select
            className="h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.label}
              </option>
            ))}
          </select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const result = await assignCategoryOwnerAction({
                    categoryId,
                    companyIds: selectedIds,
                    ownerUserId: ownerId || null,
                  });
                  if (!result.success) toast.error(result.message);
                  else toast.success(result.message);
                  setDialog(null);
                  router.refresh();
                })
              }
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow-up */}
      <Dialog open={dialog === "followup"} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Follow-up Plan</DialogTitle>
            <DialogDescription>
              Composes CRM tasks (call + reminder). Full workflow automation is
              reserved for a future engine — this uses existing tasks only.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="number"
            min={1}
            max={90}
            value={waitDays}
            onChange={(e) => setWaitDays(e.target.value)}
            aria-label="Wait days"
          />
          <p className="text-xs text-muted-foreground">
            Days until reminder task (1–90).
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const result = await createCategoryFollowUpPlanAction({
                    categoryId,
                    companyIds: selectedIds,
                    firstTaskTitle: "Call Companies",
                    waitDays: Number(waitDays) || 5,
                  });
                  if (!result.success) toast.error(result.message);
                  else toast.success(result.message);
                  setDialog(null);
                  router.refresh();
                })
              }
            >
              Create plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
