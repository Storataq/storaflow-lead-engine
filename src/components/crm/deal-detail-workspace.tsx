"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  closeDealAction,
  createTaskAction,
  moveDealStageAction,
  updateDealAction,
} from "@/lib/crm/actions";
import { formatDealValue } from "@/lib/crm/constants";
import {
  CRM_TASK_TYPES,
  DEAL_PRIORITIES,
  effectiveDealProbability,
  weightedRevenue,
} from "@/lib/crm/pipeline";
import type { DealNbaItem } from "@/lib/crm/pipeline/nba";
import type {
  CrmDealWithRelations,
  CrmStageRow,
  OrgMemberOption,
} from "@/lib/crm/queries";

type HistoryRow = {
  id: string;
  from_stage_id: string | null;
  to_stage_id: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  created_at: string;
};

type CloseReason = {
  id: string;
  kind: string;
  code: string;
  label: string;
};

type DealDetailWorkspaceProps = {
  deal: CrmDealWithRelations;
  stages: CrmStageRow[];
  history: HistoryRow[];
  nba: DealNbaItem[];
  wonReasons: CloseReason[];
  lostReasons: CloseReason[];
  members: OrgMemberOption[];
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function DealDetailWorkspace({
  deal,
  stages,
  history,
  nba,
  wonReasons,
  lostReasons,
  members,
}: DealDetailWorkspaceProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const pipelineStages = stages
    .filter((stage) => stage.pipeline_id === deal.pipeline_id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const probability = effectiveDealProbability(
    deal.probability,
    deal.stage?.probability,
  );
  const expected = weightedRevenue(Number(deal.value), probability);

  function run(action: () => Promise<{ success: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-4">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Deal overview</CardTitle>
            <CardDescription className="flex flex-wrap gap-2">
              <Badge variant="secondary">{deal.status}</Badge>
              <Badge variant="outline">{deal.priority}</Badge>
              {(deal.tags ?? []).map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Company</span>
              <span>
                {deal.lead_id ? (
                  <Link
                    href={`/crm/leads/${deal.lead_id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {deal.lead?.company_name ?? "Lead"}
                  </Link>
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Primary contact</span>
              <span>{deal.lead?.contact_name ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Deal value</span>
              <span>{formatDealValue(Number(deal.value), deal.currency)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Expected revenue</span>
              <span>{formatDealValue(expected, deal.currency)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Win probability</span>
              <span>{probability}%</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Pipeline / stage</span>
              <span>
                {deal.pipeline?.name ?? "—"} / {deal.stage?.name ?? "—"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Expected close</span>
              <span>{deal.expected_close_date ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Owner</span>
              <span>
                {members.find((m) => m.userId === deal.owner_user_id)?.label ??
                  "—"}
              </span>
            </div>
            {deal.description ? (
              <p className="sm:col-span-2 rounded-lg border border-border bg-muted/30 p-3 text-muted-foreground">
                {deal.description}
              </p>
            ) : null}
            {deal.won_reason ? (
              <p className="sm:col-span-2 text-sm">
                Won reason: <strong>{deal.won_reason}</strong>
              </p>
            ) : null}
            {deal.lost_reason ? (
              <p className="sm:col-span-2 text-sm">
                Lost reason: <strong>{deal.lost_reason}</strong>
                {deal.competitor ? ` · Competitor: ${deal.competitor}` : ""}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Edit deal</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 sm:grid-cols-2"
              action={(formData) => run(() => updateDealAction(formData))}
            >
              <input type="hidden" name="deal_id" value={deal.id} />
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="title">Deal name</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={deal.title}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="value">Deal value</Label>
                <Input
                  id="value"
                  name="value"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={Number(deal.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="probability">Probability %</Label>
                <Input
                  id="probability"
                  name="probability"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={deal.probability ?? ""}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="priority">Priority</Label>
                <select
                  id="priority"
                  name="priority"
                  defaultValue={deal.priority}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  {DEAL_PRIORITIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="expected_close_date">Expected close</Label>
                <Input
                  id="expected_close_date"
                  name="expected_close_date"
                  type="date"
                  defaultValue={deal.expected_close_date ?? ""}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  name="tags"
                  defaultValue={(deal.tags ?? []).join(", ")}
                  placeholder="enterprise, renewal"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={deal.description ?? ""}
                  rows={3}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="owner_user_id">Owner</Label>
                <select
                  id="owner_user_id"
                  name="owner_user_id"
                  defaultValue={deal.owner_user_id ?? ""}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="">Unassigned</option>
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" disabled={pending}>
                Save deal
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Deal timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No stage history yet. Move the deal to start the timeline.
              </p>
            ) : (
              <ol className="relative space-y-3 border-l border-border pl-4">
                <li>
                  <p className="font-medium">Created</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(deal.created_at)}
                  </p>
                </li>
                {history.map((item) => {
                  const toStage = stages.find((s) => s.id === item.to_stage_id);
                  return (
                    <li key={item.id}>
                      <p className="font-medium">
                        Moved stage → {toStage?.name ?? item.to_stage_id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(item.created_at)}
                        {item.to_status ? ` · ${item.to_status}` : ""}
                        {item.note ? ` · ${item.note}` : ""}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">AI Next Best Action</CardTitle>
            <CardDescription>Explainable recommendations for this deal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {nba.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-border px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{item.action}</p>
                  <Badge variant="secondary">{item.priority}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.rationale}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Move stage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pipelineStages.map((stage) => (
              <Button
                key={stage.id}
                type="button"
                variant={stage.id === deal.stage_id ? "secondary" : "outline"}
                className="w-full justify-between"
                disabled={pending || stage.id === deal.stage_id}
                onClick={() =>
                  run(() => moveDealStageAction(deal.id, stage.id))
                }
              >
                <span className="flex items-center gap-2">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  {stage.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {stage.probability}%
                </span>
              </Button>
            ))}
          </CardContent>
        </Card>

        {deal.status === "open" ? (
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Close deal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                className="space-y-3"
                action={(formData) => {
                  formData.set("outcome", "won");
                  run(() => closeDealAction(formData));
                }}
              >
                <input type="hidden" name="deal_id" value={deal.id} />
                <Label htmlFor="won_reason">Winning reason</Label>
                <select
                  id="won_reason"
                  name="reason"
                  required
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  {wonReasons.map((reason) => (
                    <option key={reason.id} value={reason.label}>
                      {reason.label}
                    </option>
                  ))}
                </select>
                <Textarea
                  name="close_notes"
                  placeholder="Notes"
                  rows={2}
                />
                <Button type="submit" disabled={pending} className="w-full">
                  Mark won
                </Button>
              </form>
              <form
                className="space-y-3 border-t border-border pt-3"
                action={(formData) => {
                  formData.set("outcome", "lost");
                  run(() => closeDealAction(formData));
                }}
              >
                <input type="hidden" name="deal_id" value={deal.id} />
                <Label htmlFor="lost_reason">Lost reason</Label>
                <select
                  id="lost_reason"
                  name="reason"
                  required
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  {lostReasons.map((reason) => (
                    <option key={reason.id} value={reason.label}>
                      {reason.label}
                    </option>
                  ))}
                </select>
                <Input name="competitor" placeholder="Competitor (optional)" />
                <Textarea
                  name="close_notes"
                  placeholder="Notes"
                  rows={2}
                />
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={pending}
                  className="w-full"
                >
                  Mark lost
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Add task</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              action={(formData) => {
                formData.set("deal_id", deal.id);
                if (deal.lead_id) formData.set("lead_id", deal.lead_id);
                run(() => createTaskAction(formData));
              }}
            >
              <Input name="title" placeholder="Task title" required />
              <select
                name="task_type"
                defaultValue="follow_up"
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                {CRM_TASK_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <Input name="due_at" type="datetime-local" />
              <Button type="submit" disabled={pending} className="w-full">
                Create task
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
