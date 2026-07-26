"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { toast } from "sonner";

import { LeadCreateSheet } from "@/components/crm/lead-create-sheet";
import { EmptyState } from "@/components/layout/empty-state";
import { TruncatedText } from "@/components/layout/truncated-text";
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
  assignLeadsAction,
  deleteLeadsAction,
  moveLeadsPipelineAction,
} from "@/lib/crm/actions";
import {
  CRM_LEAD_STATUSES,
  formatDealValue,
} from "@/lib/crm/constants";
import type {
  CrmLeadWithRelations,
  CrmPipelineRow,
  CrmStageRow,
  OrgMemberOption,
} from "@/lib/crm/queries";
import type { CrmLeadStatus } from "@/types/database";

type LeadsTableProps = {
  leads: CrmLeadWithRelations[];
  pipelines: CrmPipelineRow[];
  stages: CrmStageRow[];
  members: OrgMemberOption[];
};

const PAGE_SIZE = 10;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function ownerLabel(
  ownerId: string | null,
  members: OrgMemberOption[],
): string {
  if (!ownerId) return "—";
  return members.find((member) => member.userId === ownerId)?.label ??
    ownerId.slice(0, 8);
}

function exportCsv(rows: CrmLeadWithRelations[], members: OrgMemberOption[]) {
  const header = [
    "Bedrijf",
    "Contactpersoon",
    "Status",
    "Pipeline",
    "Waarde",
    "Bron",
    "Eigenaar",
    "Laatste activiteit",
    "Aangemaakt",
  ];
  const lines = rows.map((lead) =>
    [
      lead.company_name,
      lead.contact_name ?? "",
      lead.status,
      lead.pipeline?.name ?? "",
      String(lead.deal_value ?? 0),
      lead.source ?? "",
      ownerLabel(lead.owner_user_id, members),
      lead.updated_at,
      lead.created_at,
    ]
      .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function LeadsTable({
  leads,
  pipelines,
  stages,
  members,
}: LeadsTableProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CrmLeadStatus | "all">("all");
  const [pipelineId, setPipelineId] = useState("all");
  const [source, setSource] = useState("all");
  const [ownerId, setOwnerId] = useState("all");
  const [page, setPage] = useState(1);
  const [bulkPipelineId, setBulkPipelineId] = useState(
    pipelines[0]?.id ?? "",
  );

  const sources = useMemo(
    () =>
      [...new Set(leads.map((lead) => lead.source).filter(Boolean))] as string[],
    [leads],
  );

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      if (status !== "all" && lead.status !== status) return false;
      if (pipelineId !== "all" && lead.pipeline_id !== pipelineId) return false;
      if (source !== "all" && lead.source !== source) return false;
      if (ownerId !== "all" && lead.owner_user_id !== ownerId) return false;
      if (!query.trim()) return true;
      const needle = query.trim().toLowerCase();
      return [
        lead.company_name,
        lead.contact_name ?? "",
        lead.email ?? "",
        lead.source ?? "",
        lead.pipeline?.name ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [leads, status, pipelineId, source, ownerId, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const bulkStages = stages.filter(
    (stage) => stage.pipeline_id === bulkPipelineId,
  );

  function toggleAll(checked: boolean) {
    setSelected(checked ? pageRows.map((row) => row.id) : []);
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((current) =>
      checked ? [...new Set([...current, id])] : current.filter((item) => item !== id),
    );
  }

  function runBulk(
    action: () => Promise<{ success: boolean; message: string }>,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setSelected([]);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-14 z-10 space-y-3 rounded-xl border border-border bg-background/95 p-3 backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Zoek bedrijf, contact, bron…"
              className="sm:max-w-xs"
              aria-label="Zoek leads"
            />
            <select
              className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={status}
              aria-label="Filter status"
              onChange={(event) => {
                setStatus(event.target.value as CrmLeadStatus | "all");
                setPage(1);
              }}
            >
              <option value="all">Alle statussen</option>
              {CRM_LEAD_STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={pipelineId}
              aria-label="Filter pipeline"
              onChange={(event) => {
                setPipelineId(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">Alle pipelines</option>
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </select>
            <select
              className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={source}
              aria-label="Filter bron"
              onChange={(event) => {
                setSource(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">Alle bronnen</option>
              {sources.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={ownerId}
              aria-label="Filter eigenaar"
              onChange={(event) => {
                setOwnerId(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">Alle eigenaren</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.label}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={() => setCreateOpen(true)}>Nieuwe lead</Button>
        </div>

        {selected.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3 lg:flex-row lg:flex-wrap lg:items-center">
            <span className="text-sm font-medium">
              {selected.length} geselecteerd
            </span>
            <select
              className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={bulkPipelineId}
              aria-label="Bulk pipeline"
              onChange={(event) => setBulkPipelineId(event.target.value)}
            >
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </select>
            <select
              className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              aria-label="Bulk stage"
              id="bulk-stage"
              defaultValue={bulkStages[0]?.id}
            >
              {bulkStages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                const stageSelect = document.getElementById(
                  "bulk-stage",
                ) as HTMLSelectElement | null;
                const stageId = stageSelect?.value;
                if (!stageId) {
                  toast.error("Kies een stage.");
                  return;
                }
                runBulk(() =>
                  moveLeadsPipelineAction(selected, bulkPipelineId, stageId),
                );
              }}
            >
              Verplaats pipeline
            </Button>
            <select
              className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              aria-label="Bulk toewijzen"
              id="bulk-owner"
              defaultValue={members[0]?.userId ?? ""}
            >
              <option value="">Niet toegewezen</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.label}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                const ownerSelect = document.getElementById(
                  "bulk-owner",
                ) as HTMLSelectElement | null;
                const value = ownerSelect?.value || null;
                runBulk(() => assignLeadsAction(selected, value));
              }}
            >
              Toewijzen
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                const rows = leads.filter((lead) => selected.includes(lead.id));
                exportCsv(rows, members);
                toast.success("Export gedownload.");
              }}
            >
              Export
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={() => {
                if (!window.confirm(`${selected.length} lead(s) verwijderen?`)) {
                  return;
                }
                runBulk(() => deleteLeadsAction(selected));
              }}
            >
              Delete
            </Button>
          </div>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={leads.length === 0 ? "Nog geen leads" : "Geen resultaten"}
          description={
            leads.length === 0
              ? "Maak je eerste lead aan om je CRM te vullen."
              : "Pas je filters aan of wis de zoekopdracht."
          }
          action={
            leads.length === 0 ? (
              <Button onClick={() => setCreateOpen(true)}>Nieuwe lead</Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Selecteer alles"
                      checked={
                        pageRows.length > 0 &&
                        pageRows.every((row) => selected.includes(row.id))
                      }
                      onChange={(event) => toggleAll(event.target.checked)}
                    />
                  </TableHead>
                  <TableHead>Bedrijf</TableHead>
                  <TableHead>Contactpersoon</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pipeline</TableHead>
                  <TableHead>Waarde</TableHead>
                  <TableHead>Bron</TableHead>
                  <TableHead>Eigenaar</TableHead>
                  <TableHead>Laatste activiteit</TableHead>
                  <TableHead>Aangemaakt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`Selecteer ${lead.company_name}`}
                        checked={selected.includes(lead.id)}
                        onChange={(event) =>
                          toggleOne(lead.id, event.target.checked)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/crm/leads/${lead.id}`}
                        className="font-medium hover:underline"
                      >
                        {lead.company_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <TruncatedText value={lead.contact_name} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{lead.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <TruncatedText value={lead.pipeline?.name} />
                    </TableCell>
                    <TableCell>
                      {formatDealValue(Number(lead.deal_value), lead.currency)}
                    </TableCell>
                    <TableCell>
                      <TruncatedText value={lead.source} />
                    </TableCell>
                    <TableCell>
                      <TruncatedText
                        value={ownerLabel(lead.owner_user_id, members)}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(lead.updated_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(lead.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {pageRows.map((lead) => (
              <div
                key={lead.id}
                className="space-y-2 rounded-xl border border-border p-4"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selected.includes(lead.id)}
                    onChange={(event) =>
                      toggleOne(lead.id, event.target.checked)
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/crm/leads/${lead.id}`}
                      className="font-medium hover:underline"
                    >
                      {lead.company_name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {lead.contact_name ?? "Geen contact"} ·{" "}
                      {formatDealValue(Number(lead.deal_value), lead.currency)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="secondary">{lead.status}</Badge>
                      <Badge variant="outline">
                        {lead.pipeline?.name ?? "Pipeline"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {filtered.length} lead(s) · pagina {currentPage}/{pageCount}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Vorige
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage >= pageCount}
                onClick={() =>
                  setPage((value) => Math.min(pageCount, value + 1))
                }
              >
                Volgende
              </Button>
            </div>
          </div>
        </>
      )}

      <LeadCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        pipelines={pipelines}
        stages={stages}
        defaultPipelineId={pipelines[0]?.id ?? ""}
      />
    </div>
  );
}
