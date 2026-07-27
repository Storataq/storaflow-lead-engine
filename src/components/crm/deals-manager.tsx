"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Handshake } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/layout/empty-state";
import { TruncatedText } from "@/components/layout/truncated-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createDealAction } from "@/lib/crm/actions";
import { formatDealValue } from "@/lib/crm/constants";
import type {
  CrmDealWithRelations,
  CrmLeadWithRelations,
  CrmPipelineRow,
  CrmStageRow,
  OrgMemberOption,
} from "@/lib/crm/queries";

type DealsManagerProps = {
  deals: CrmDealWithRelations[];
  pipelines: CrmPipelineRow[];
  stages: CrmStageRow[];
  leads: CrmLeadWithRelations[];
  members: OrgMemberOption[];
};

function ownerLabel(
  ownerId: string | null,
  members: OrgMemberOption[],
): string {
  if (!ownerId) return "—";
  return members.find((member) => member.userId === ownerId)?.label ??
    ownerId.slice(0, 8);
}

export function DealsManager({
  deals,
  pipelines,
  stages,
  leads,
  members,
}: DealsManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pipelineId, setPipelineId] = useState(pipelines[0]?.id ?? "");
  const [filterPipeline, setFilterPipeline] = useState("all");
  const [filterStage, setFilterStage] = useState("all");
  const [filterOwner, setFilterOwner] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterQuery, setFilterQuery] = useState("");
  const [minValue, setMinValue] = useState("");
  const [minProbability, setMinProbability] = useState("");

  const pipelineStages = useMemo(
    () => stages.filter((stage) => stage.pipeline_id === pipelineId),
    [stages, pipelineId],
  );

  const filteredDeals = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    const minV = minValue ? Number(minValue) : null;
    const minP = minProbability ? Number(minProbability) : null;
    return deals.filter((deal) => {
      if (filterPipeline !== "all" && deal.pipeline_id !== filterPipeline) {
        return false;
      }
      if (filterStage !== "all" && deal.stage_id !== filterStage) return false;
      if (filterOwner !== "all" && deal.owner_user_id !== filterOwner) {
        return false;
      }
      if (filterPriority !== "all" && deal.priority !== filterPriority) {
        return false;
      }
      if (minV != null && Number.isFinite(minV) && Number(deal.value) < minV) {
        return false;
      }
      if (minP != null && Number.isFinite(minP)) {
        const p =
          deal.probability != null
            ? Number(deal.probability)
            : Number(deal.stage?.probability ?? 0);
        if (p < minP) return false;
      }
      if (!q) return true;
      return (
        deal.title.toLowerCase().includes(q) ||
        (deal.lead?.company_name ?? "").toLowerCase().includes(q) ||
        (deal.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [
    deals,
    filterPipeline,
    filterStage,
    filterOwner,
    filterPriority,
    filterQuery,
    minValue,
    minProbability,
  ]);

  async function onCreate(formData: FormData) {
    startTransition(async () => {
      const result = await createDealAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-3 lg:grid-cols-4">
        <Input
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Search title, company, tags…"
          aria-label="Search deals"
        />
        <select
          className="flex h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={filterPipeline}
          aria-label="Filter pipeline"
          onChange={(e) => setFilterPipeline(e.target.value)}
        >
          <option value="all">All pipelines</option>
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          className="flex h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={filterStage}
          aria-label="Filter stage"
          onChange={(e) => setFilterStage(e.target.value)}
        >
          <option value="all">All stages</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          className="flex h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={filterOwner}
          aria-label="Filter owner"
          onChange={(e) => setFilterOwner(e.target.value)}
        >
          <option value="all">All owners</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.label}
            </option>
          ))}
        </select>
        <select
          className="flex h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={filterPriority}
          aria-label="Filter priority"
          onChange={(e) => setFilterPriority(e.target.value)}
        >
          <option value="all">All priorities</option>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <Input
          type="number"
          min={0}
          value={minValue}
          onChange={(e) => setMinValue(e.target.value)}
          placeholder="Min deal value"
          aria-label="Min deal value"
        />
        <Input
          type="number"
          min={0}
          max={100}
          value={minProbability}
          onChange={(e) => setMinProbability(e.target.value)}
          placeholder="Min probability %"
          aria-label="Min probability"
        />
      </div>

      {filteredDeals.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="Nog geen deals"
          description="Maak een deal aan gekoppeld aan een lead en pipeline-stage."
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Waarde</TableHead>
                  <TableHead>Prob.</TableHead>
                  <TableHead>Eigenaar</TableHead>
                  <TableHead>Verwachte sluitdatum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell>
                      <Link
                        href={`/crm/deals/${deal.id}`}
                        className="font-medium hover:underline"
                      >
                        {deal.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {deal.lead_id ? (
                        <Link
                          href={`/crm/leads/${deal.lead_id}`}
                          className="text-muted-foreground hover:underline"
                        >
                          {deal.lead?.company_name ?? "Lead"}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{deal.stage?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{deal.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{deal.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      {formatDealValue(Number(deal.value), deal.currency)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {deal.probability != null
                        ? `${Math.round(Number(deal.probability))}%`
                        : deal.stage?.probability != null
                          ? `${deal.stage.probability}%`
                          : "—"}
                    </TableCell>
                    <TableCell>
                      <TruncatedText
                        value={ownerLabel(deal.owner_user_id, members)}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {deal.expected_close_date ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {filteredDeals.map((deal) => (
              <Link
                key={deal.id}
                href={`/crm/deals/${deal.id}`}
                className="block space-y-2 rounded-xl border border-border p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{deal.title}</p>
                  <Badge variant="secondary">{deal.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDealValue(Number(deal.value), deal.currency)}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}

      <Card className="max-w-xl shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Nieuwe deal</CardTitle>
          <CardDescription>
            Koppel een deal aan een lead en pipeline-stage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={onCreate} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="title">Titel</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead_id">Lead</Label>
              <select
                id="lead_id"
                name="lead_id"
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                defaultValue={leads[0]?.id ?? ""}
              >
                <option value="">Geen lead</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.company_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pipeline_id">Pipeline</Label>
                <select
                  id="pipeline_id"
                  name="pipeline_id"
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  value={pipelineId}
                  onChange={(event) => setPipelineId(event.target.value)}
                >
                  {pipelines.map((pipeline) => (
                    <option key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stage_id">Stage</Label>
                <select
                  id="stage_id"
                  name="stage_id"
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  required
                  defaultValue={pipelineStages[0]?.id}
                >
                  {pipelineStages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Waarde</Label>
              <Input id="value" name="value" type="number" min={0} defaultValue={0} />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Opslaan…" : "Deal opslaan"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
