"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  bulkRunGoalsAction,
  controlExecutionAction,
  decideApprovalAction,
  submitGoalAction,
} from "@/lib/orchestrator/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function OrchestratorGoalForm() {
  const [goal, setGoal] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await submitGoalAction(goal);
          if (r.success) {
            toast.success(r.message);
            setGoal("");
          } else toast.error(r.message);
        });
      }}
    >
      <Input
        className="flex-1"
        placeholder='Bijv. "Analyseer mijn volledige pipeline."'
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        disabled={pending}
      />
      <Button type="submit" disabled={pending || goal.trim().length < 5}>
        {pending ? "Orchestrating…" : "Run workflow"}
      </Button>
    </form>
  );
}

export function OrchestratorBulkGoalsButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await bulkRunGoalsAction([
            "Analyseer mijn volledige pipeline.",
            "Voorspel de omzet.",
            "Vind upsell kansen.",
          ]);
          if (r.success) toast.success(r.message);
          else toast.error(r.message);
        })
      }
    >
      {pending ? "Bulk…" : "Bulk sample goals"}
    </Button>
  );
}

export function ExecutionControlButtons({
  executionId,
  status,
}: {
  executionId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const run = (action: "pause" | "resume" | "cancel" | "restart") =>
    startTransition(async () => {
      const r = await controlExecutionAction(executionId, action);
      if (r.success) toast.success(r.message);
      else toast.error(r.message);
    });

  return (
    <div className="flex flex-wrap gap-1">
      {status === "running" || status === "queued" ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run("pause")}>
          Pause
        </Button>
      ) : null}
      {status === "paused" ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run("resume")}>
          Resume
        </Button>
      ) : null}
      {!["completed", "cancelled", "failed"].includes(status) ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run("cancel")}>
          Stop
        </Button>
      ) : null}
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run("restart")}>
        Restart
      </Button>
    </div>
  );
}

export function ApprovalButtons({ approvalId }: { approvalId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await decideApprovalAction(approvalId, "approved");
            if (r.success) toast.success(r.message);
            else toast.error(r.message);
          })
        }
      >
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await decideApprovalAction(approvalId, "rejected");
            if (r.success) toast.success(r.message);
            else toast.error(r.message);
          })
        }
      >
        Reject
      </Button>
    </div>
  );
}

export function OrchestratorGoalTextarea() {
  const [text, setText] = useState(
    "Zoek 300 interessante bedrijven in Duitsland.\nAnalyseer mijn volledige pipeline.\nMaak een executive rapport.",
  );
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-2">
      <Textarea
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={pending}
      />
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const goals = text
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean);
            const r = await bulkRunGoalsAction(goals);
            if (r.success) toast.success(r.message);
            else toast.error(r.message);
          })
        }
      >
        {pending ? "Running…" : "Run bulk goals"}
      </Button>
    </div>
  );
}
