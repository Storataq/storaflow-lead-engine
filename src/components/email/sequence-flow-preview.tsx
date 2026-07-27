"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SEQUENCE_STEP_TYPE_LABELS,
  type SequenceStepType,
} from "@/lib/email/sequence/constants";
import type { SequenceStep } from "@/lib/email/sequence/steps";
import type { TimelinePreviewResult } from "@/lib/email/sequence/timing";

type TemplateLookup = Record<string, string>;

type SequenceFlowPreviewProps = {
  steps: SequenceStep[];
  timeline?: TimelinePreviewResult | null;
  templateNames?: TemplateLookup;
};

export function SequenceFlowPreview({
  steps,
  timeline,
  templateNames = {},
}: SequenceFlowPreviewProps) {
  const sorted = [...steps].sort((a, b) => a.order - b.order);

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No steps yet. Add at least one email or task step and an end step.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((step) => {
        const entry = timeline?.entries.find((e) => e.stepId === step.id);
        const typeLabel =
          SEQUENCE_STEP_TYPE_LABELS[step.type as SequenceStepType] ?? step.type;

        return (
          <Card key={step.id} className="shadow-none">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{step.order}</Badge>
                <CardTitle className="text-base">{step.name}</CardTitle>
                <Badge>{typeLabel}</Badge>
              </div>
              {step.description ? (
                <CardDescription>{step.description}</CardDescription>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {step.type === "email" && step.email?.templateId ? (
                <p>
                  Template:{" "}
                  <span className="text-foreground">
                    {templateNames[step.email.templateId] ??
                      step.email.templateId}
                  </span>
                </p>
              ) : null}
              {step.type === "wait" && step.delay ? (
                <p>
                  Delay:{" "}
                  <span className="text-foreground">
                    {entry?.delayLabel ??
                      `${step.delay.value} ${step.delay.unit}`}
                  </span>
                </p>
              ) : null}
              {step.type === "condition" && step.condition ? (
                <p>
                  If{" "}
                  <span className="text-foreground">
                    {step.condition.field} {step.condition.operator}{" "}
                    {String(step.condition.value ?? "")}
                  </span>
                  {step.condition.yesBranchStepId ? (
                    <> → yes branch</>
                  ) : null}
                  {step.condition.noBranchStepId ? <> → no branch</> : null}
                </p>
              ) : null}
              {step.type === "manual_task" && step.task ? (
                <p>
                  Task:{" "}
                  <span className="text-foreground">{step.task.title}</span>
                </p>
              ) : null}
              {step.type === "end" ? (
                <p>
                  End reason:{" "}
                  <span className="text-foreground">
                    {step.endReason ?? "sequence_completed"}
                  </span>
                </p>
              ) : null}
              {entry?.approximateAt ? (
                <p className="text-xs">
                  Preview timing: {entry.approximateAt} ({entry.delayLabel})
                </p>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
      {timeline ? (
        <p className="text-xs text-muted-foreground">{timeline.disclaimer}</p>
      ) : null}
    </div>
  );
}
