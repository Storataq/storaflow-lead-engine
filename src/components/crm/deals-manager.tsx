"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Handshake } from "lucide-react";
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
  CrmDealRow,
  CrmPipelineRow,
  CrmStageRow,
} from "@/lib/crm/queries";

type DealsManagerProps = {
  deals: CrmDealRow[];
  pipelines: CrmPipelineRow[];
  stages: CrmStageRow[];
};

export function DealsManager({
  deals,
  pipelines,
  stages,
}: DealsManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pipelineId, setPipelineId] = useState(pipelines[0]?.id ?? "");
  const pipelineStages = useMemo(
    () => stages.filter((stage) => stage.pipeline_id === pipelineId),
    [stages, pipelineId],
  );

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
      {deals.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="Nog geen deals"
          description="Maak een deal aan gekoppeld aan een pipeline-stage."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titel</TableHead>
                <TableHead>Waarde</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verwachte close</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map((deal) => (
                <TableRow key={deal.id}>
                  <TableCell className="font-medium">{deal.title}</TableCell>
                  <TableCell>
                    {formatDealValue(Number(deal.value), deal.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{deal.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {deal.expected_close_date ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Card className="max-w-xl shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Nieuwe deal</CardTitle>
          <CardDescription>Eenvoudige dealregistratie zonder automation.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={onCreate} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="title">Titel</Label>
              <Input id="title" name="title" required />
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
