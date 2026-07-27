"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  classifyReplyAction,
  generateEmailAIAction,
} from "@/lib/email/ai/actions";

export function AIReplyAssistantPanel() {
  const [pending, startTransition] = useTransition();

  function onClassify(formData: FormData) {
    startTransition(async () => {
      const result = await classifyReplyAction(formData);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
      if (result.warnings?.length) {
        toast.message(result.warnings[0]);
      }
    });
  }

  function onDraft(formData: FormData) {
    startTransition(async () => {
      formData.set("generationType", "reply_draft");
      const result = await generateEmailAIAction(formData);
      if (result.success) {
        toast.success(result.message);
        const first = (result.variants as Array<{ plainText?: string }> | undefined)?.[0];
        if (first?.plainText) {
          toast.message(first.plainText.slice(0, 180) + "…");
        }
      } else toast.error(result.message);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={onClassify} className="space-y-3 rounded-lg border p-4">
        <h3 className="font-medium">Classify inbound reply</h3>
        <p className="text-sm text-muted-foreground">
          Deterministic classification is always stored. AI is optional and
          never erases unsubscribe/complaint heuristics. No auto-send.
        </p>
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" name="subject" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="body">Body</Label>
          <Textarea id="body" name="body" rows={6} required />
        </div>
        <Button type="submit" disabled={pending}>
          Classify
        </Button>
      </form>

      <form action={onDraft} className="space-y-3 rounded-lg border p-4">
        <h3 className="font-medium">Draft a reply</h3>
        <p className="text-sm text-muted-foreground">
          Creates a reviewable draft only. There is no one-click send from AI.
        </p>
        <div className="space-y-2">
          <Label htmlFor="existingBody">Inbound reply</Label>
          <Textarea id="existingBody" name="existingBody" rows={6} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="campaignPurpose">Goal</Label>
          <Input
            id="campaignPurpose"
            name="campaignPurpose"
            placeholder="Confirm interest and propose a meeting"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tone">Tone</Label>
          <Input id="tone" name="tone" defaultValue="professional" />
        </div>
        <Button type="submit" disabled={pending}>
          Draft reply
        </Button>
      </form>
    </div>
  );
}
