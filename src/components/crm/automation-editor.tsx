"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { AutomationWorkflowCanvas } from "@/components/crm/automation-workflow-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AUTOMATION_ACTION_LABELS,
  AUTOMATION_ACTIONS,
  AUTOMATION_CONDITION_LABELS,
  AUTOMATION_CONDITIONS,
  AUTOMATION_TRIGGER_LABELS,
  AUTOMATION_TRIGGERS,
  FUTURE_CHANNELS,
} from "@/lib/crm/automation/constants";
import {
  runAutomationNowAction,
  setAutomationEnabledAction,
  upsertAutomationAction,
} from "@/lib/crm/automation/actions";
import {
  emptyAutomationGraph,
  parseAutomationGraph,
} from "@/lib/crm/automation/graph";
import type { CrmAutomationRow } from "@/lib/crm/automation/types";
import { Badge } from "@/components/ui/badge";

type AutomationEditorProps = {
  automation?: CrmAutomationRow | null;
  canManage: boolean;
};

export function AutomationEditor({
  automation,
  canManage,
}: AutomationEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(automation?.name ?? "");
  const [description, setDescription] = useState(automation?.description ?? "");
  const [triggerType, setTriggerType] = useState(
    automation?.trigger_type ?? "lead_became_hot",
  );
  const graph = automation
    ? parseAutomationGraph(automation.workflow_graph_json)
    : emptyAutomationGraph();

  function saveMeta() {
    startTransition(async () => {
      const fd = new FormData();
      if (automation?.id) fd.set("automationId", automation.id);
      fd.set("name", name || "Untitled automation");
      fd.set("description", description);
      fd.set("triggerType", triggerType);
      fd.set("graphJson", JSON.stringify(graph));
      fd.set("status", automation?.status ?? "draft");
      fd.set("enabled", automation?.enabled ? "true" : "false");
      const result = await upsertAutomationAction(fd);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      if (result.id && !automation) {
        router.push(`/crm/automations/${result.id}`);
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Automation details</CardTitle>
          <CardDescription>
            Owner/admin only for create, edit, enable, and delete.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="auto-name">Name</Label>
            <Input
              id="auto-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canManage}
            />
          </div>
          <div>
            <Label htmlFor="auto-desc">Description</Label>
            <Textarea
              id="auto-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              disabled={!canManage}
            />
          </div>
          <div>
            <Label htmlFor="auto-trigger">Trigger</Label>
            <select
              id="auto-trigger"
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value)}
              disabled={!canManage}
            >
              {AUTOMATION_TRIGGERS.map((t) => (
                <option key={t} value={t}>
                  {AUTOMATION_TRIGGER_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          {canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={saveMeta} disabled={pending}>
                {pending ? "Saving…" : automation ? "Save details" : "Create"}
              </Button>
              {automation ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        const result = await setAutomationEnabledAction(
                          automation.id,
                          !automation.enabled,
                        );
                        if (!result.success) toast.error(result.message);
                        else {
                          toast.success(result.message);
                          router.refresh();
                        }
                      });
                    }}
                  >
                    {automation.enabled ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        const result = await runAutomationNowAction(
                          automation.id,
                        );
                        if (!result.success) toast.error(result.message);
                        else {
                          toast.success(result.message);
                          if (result.runId) {
                            router.push(
                              `/crm/automations/runs/${result.runId}`,
                            );
                          }
                          router.refresh();
                        }
                      });
                    }}
                  >
                    Run now
                  </Button>
                </>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Supported conditions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {AUTOMATION_CONDITIONS.map((c) => (
              <Badge key={c} variant="outline">
                {AUTOMATION_CONDITION_LABELS[c]}
              </Badge>
            ))}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Supported actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {AUTOMATION_ACTIONS.map((a) => (
              <Badge key={a} variant="secondary">
                {AUTOMATION_ACTION_LABELS[a]}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Future channels</CardTitle>
          <CardDescription>
            Architecture ready for SMS, WhatsApp, LinkedIn, push, voice, APIs,
            marketplace modules.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {FUTURE_CHANNELS.map((c) => (
            <Badge key={c} variant="outline">
              {c}
            </Badge>
          ))}
        </CardContent>
      </Card>

      {automation ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Visual workflow</CardTitle>
            <CardDescription>
              Drag blocks: Start, Trigger, Condition, Delay, Action, Decision,
              Split, Merge, Exit, End. Loops are reserved for later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AutomationWorkflowCanvas
              automationId={automation.id}
              name={name || automation.name}
              triggerType={triggerType}
              initialGraph={graph}
              readOnly={!canManage}
            />
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          Save the automation to unlock the visual builder.
        </p>
      )}
    </div>
  );
}
