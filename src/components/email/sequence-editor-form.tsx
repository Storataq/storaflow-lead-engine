"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { SequenceFlowPreview } from "@/components/email/sequence-flow-preview";
import { AIWritingPanel } from "@/components/email/ai-writing-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  EMAIL_SEQUENCE_CATEGORIES,
  EMAIL_SEQUENCE_CATEGORY_LABELS,
  MANDATORY_STOP_RULES,
  SEQUENCE_STEP_TYPES,
  SEQUENCE_STEP_TYPE_LABELS,
  type SequenceStepType,
} from "@/lib/email/sequence/constants";
import {
  createEmailSequenceAction,
  updateEmailSequenceAction,
  type SequenceActionResult,
} from "@/lib/email/sequence/actions";
import {
  createDefaultStep,
  parseStepsJson,
  renumberSteps,
  type SequenceStep,
} from "@/lib/email/sequence/steps";
import { previewSequenceTimeline } from "@/lib/email/sequence/timing";
import type { EmailSequenceRow } from "@/lib/email/sequence/queries";
import type { Json } from "@/types/supabase";

type TemplateOption = {
  id: string;
  name: string;
  language: string;
  status: string;
};

type SequenceEditorFormProps = {
  mode: "create" | "edit";
  sequence?: EmailSequenceRow | null;
  templates: TemplateOption[];
};

const initialState: SequenceActionResult = {
  success: false,
  message: "",
};

function defaultSteps(): SequenceStep[] {
  return renumberSteps([
    createDefaultStep("email", 1),
    createDefaultStep("wait", 2),
    createDefaultStep("email", 3),
    createDefaultStep("end", 4),
  ]);
}

export function SequenceEditorForm({
  mode,
  sequence,
  templates,
}: SequenceEditorFormProps) {
  const router = useRouter();
  const boundUpdate = updateEmailSequenceAction.bind(null, sequence!.id);

  async function formActionWithState(
    _prev: SequenceActionResult,
    formData: FormData,
  ): Promise<SequenceActionResult> {
    if (mode === "create") return createEmailSequenceAction(formData);
    return boundUpdate(formData);
  }

  const [state, formAction, pending] = useActionState(
    formActionWithState,
    initialState,
  );

  const initialSteps = useMemo(() => {
    if (sequence?.steps_json) {
      return parseStepsJson(sequence.steps_json as Json);
    }
    return defaultSteps();
  }, [sequence?.steps_json]);

  const [steps, setSteps] = useState<SequenceStep[]>(initialSteps);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(
    initialSteps[0]?.id ?? null,
  );

  useEffect(() => {
    if (!state.message) return;
    if (state.success) {
      toast.success(state.message);
      if (state.id) {
        router.push(`/email/sequences/${state.id}`);
        router.refresh();
      }
    } else {
      toast.error(state.message);
    }
  }, [state, router]);

  const selectedStep = steps.find((s) => s.id === selectedStepId) ?? null;
  const timeline = previewSequenceTimeline({ steps });
  const templateNames = Object.fromEntries(
    templates.map((t) => [t.id, t.name]),
  );
  const stopRulesJson = JSON.stringify(
    sequence?.stop_rules_json && Array.isArray(sequence.stop_rules_json)
      ? sequence.stop_rules_json
      : [...MANDATORY_STOP_RULES],
  );

  function updateStep(stepId: string, patch: Partial<SequenceStep>) {
    setSteps((prev) =>
      renumberSteps(
        prev.map((s) => (s.id === stepId ? { ...s, ...patch } : s)),
      ),
    );
  }

  function addStep(type: SequenceStepType) {
    const next = createDefaultStep(type, steps.length + 1);
    setSteps((prev) => renumberSteps([...prev, next]));
    setSelectedStepId(next.id);
  }

  function removeStep(stepId: string) {
    setSteps((prev) => renumberSteps(prev.filter((s) => s.id !== stepId)));
    setSelectedStepId((current) =>
      current === stepId ? (steps[0]?.id ?? null) : current,
    );
  }

  function moveStep(stepId: string, direction: -1 | 1) {
    const sorted = [...steps].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((s) => s.id === stepId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= sorted.length) return;
    const copy = [...sorted];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    setSteps(renumberSteps(copy));
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="steps_json" value={JSON.stringify(steps)} />
      <input type="hidden" name="stop_rules_json" value={stopRulesJson} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name">Sequence name</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={sequence?.name ?? ""}
            placeholder="Hospitality nurture — 3 touch"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            rows={2}
            defaultValue={sequence?.description ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            name="category"
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            defaultValue={sequence?.category ?? "custom"}
          >
            {EMAIL_SEQUENCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {EMAIL_SEQUENCE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="default_language">Default language</Label>
          <Input
            id="default_language"
            name="default_language"
            defaultValue={sequence?.default_language ?? "en"}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium">Steps</h3>
            <div className="flex flex-wrap gap-1">
              {SEQUENCE_STEP_TYPES.map((type) => (
                <Button
                  key={type}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addStep(type)}
                >
                  + {SEQUENCE_STEP_TYPE_LABELS[type]}
                </Button>
              ))}
            </div>
          </div>
          <ul className="space-y-2">
            {[...steps]
              .sort((a, b) => a.order - b.order)
              .map((step) => (
                <li
                  key={step.id}
                  className={`flex items-center justify-between rounded-md border px-2 py-1.5 text-sm ${
                    selectedStepId === step.id ? "border-primary bg-muted/40" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="flex-1 text-left"
                    onClick={() => setSelectedStepId(step.id)}
                  >
                    {step.order}. {step.name}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({SEQUENCE_STEP_TYPE_LABELS[step.type]})
                    </span>
                  </button>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => moveStep(step.id, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => moveStep(step.id, 1)}
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeStep(step.id)}
                    >
                      ×
                    </Button>
                  </div>
                </li>
              ))}
          </ul>
        </div>

        <div className="space-y-3 rounded-lg border p-4">
          <h3 className="text-sm font-medium">Step editor</h3>
          {selectedStep ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={selectedStep.name}
                  onChange={(e) =>
                    updateStep(selectedStep.id, { name: e.target.value })
                  }
                />
              </div>
              {selectedStep.type === "email" ? (
                <div className="space-y-2">
                  <Label>Template</Label>
                  <select
                    className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    value={selectedStep.email?.templateId ?? ""}
                    onChange={(e) =>
                      updateStep(selectedStep.id, {
                        email: {
                          ...selectedStep.email,
                          templateId: e.target.value || null,
                        },
                      })
                    }
                  >
                    <option value="">Select template…</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} · {t.language} ({t.status})
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {selectedStep.type === "wait" ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Delay value</Label>
                    <Input
                      type="number"
                      min={0}
                      value={selectedStep.delay?.value ?? 1}
                      onChange={(e) =>
                        updateStep(selectedStep.id, {
                          delay: {
                            ...selectedStep.delay,
                            value: Number(e.target.value),
                            unit: selectedStep.delay?.unit ?? "business_days",
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <select
                      className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                      value={selectedStep.delay?.unit ?? "business_days"}
                      onChange={(e) =>
                        updateStep(selectedStep.id, {
                          delay: {
                            ...selectedStep.delay,
                            value: selectedStep.delay?.value ?? 1,
                            unit: e.target.value as NonNullable<
                              typeof selectedStep.delay
                            >["unit"],
                          },
                        })
                      }
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="calendar_days">Calendar days</option>
                      <option value="business_days">Business days</option>
                    </select>
                  </div>
                </div>
              ) : null}
              {selectedStep.type === "condition" ? (
                <div className="space-y-2">
                  <Label>Field</Label>
                  <Input
                    value={selectedStep.condition?.field ?? ""}
                    onChange={(e) =>
                      updateStep(selectedStep.id, {
                        condition: {
                          ...selectedStep.condition,
                          field: e.target.value,
                          operator:
                            selectedStep.condition?.operator ?? "equals",
                        },
                      })
                    }
                  />
                  <Label>Operator</Label>
                  <Input
                    value={selectedStep.condition?.operator ?? "equals"}
                    onChange={(e) =>
                      updateStep(selectedStep.id, {
                        condition: {
                          ...selectedStep.condition,
                          field: selectedStep.condition?.field ?? "",
                          operator: e.target.value as NonNullable<
                            typeof selectedStep.condition
                          >["operator"],
                        },
                      })
                    }
                  />
                  <Label>Yes branch step</Label>
                  <select
                    className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    value={selectedStep.condition?.yesBranchStepId ?? ""}
                    onChange={(e) =>
                      updateStep(selectedStep.id, {
                        condition: {
                          ...selectedStep.condition,
                          field: selectedStep.condition?.field ?? "",
                          operator:
                            selectedStep.condition?.operator ?? "equals",
                          yesBranchStepId: e.target.value || null,
                        },
                      })
                    }
                  >
                    <option value="">—</option>
                    {steps
                      .filter((s) => s.id !== selectedStep.id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.order}. {s.name}
                        </option>
                      ))}
                  </select>
                  <Label>No branch step</Label>
                  <select
                    className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    value={selectedStep.condition?.noBranchStepId ?? ""}
                    onChange={(e) =>
                      updateStep(selectedStep.id, {
                        condition: {
                          ...selectedStep.condition,
                          field: selectedStep.condition?.field ?? "",
                          operator:
                            selectedStep.condition?.operator ?? "equals",
                          noBranchStepId: e.target.value || null,
                        },
                      })
                    }
                  >
                    <option value="">—</option>
                    {steps
                      .filter((s) => s.id !== selectedStep.id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.order}. {s.name}
                        </option>
                      ))}
                  </select>
                </div>
              ) : null}
              {selectedStep.type === "manual_task" ? (
                <div className="space-y-2">
                  <Label>Task title</Label>
                  <Input
                    value={selectedStep.task?.title ?? ""}
                    onChange={(e) =>
                      updateStep(selectedStep.id, {
                        task: {
                          ...selectedStep.task,
                          taskType: selectedStep.task?.taskType ?? "custom_task",
                          title: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              ) : null}
              {selectedStep.type === "end" ? (
                <div className="space-y-2">
                  <Label>End reason</Label>
                  <Input
                    value={selectedStep.endReason ?? "sequence_completed"}
                    onChange={(e) =>
                      updateStep(selectedStep.id, {
                        endReason: e.target.value as NonNullable<
                          typeof selectedStep.endReason
                        >,
                      })
                    }
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a step to edit.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-medium">Flow preview (timing estimates)</h3>
        <SequenceFlowPreview
          steps={steps}
          timeline={timeline}
          templateNames={templateNames}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Mandatory stop rules (unsubscribe, complaint, hard bounce, suppression)
        are always included. AI may propose draft steps only — never auto-activates
        a sequence.
      </p>

      <AIWritingPanel
        sequenceId={sequence?.id}
        initialSubject={sequence?.name ?? ""}
        initialBody=""
      />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Create draft"
              : "Save sequence"}
        </Button>
        <Button
          type="button"
          variant="outline"
          nativeButton={false}
          render={
            <Link
              href={
                sequence
                  ? `/email/sequences/${sequence.id}`
                  : "/email/sequences"
              }
            />
          }
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
