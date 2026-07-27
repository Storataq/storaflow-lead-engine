"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SCORING_CATEGORIES,
  SCORING_CATEGORY_LABELS,
} from "@/lib/crm/lead-scoring/constants";
import { updateLeadScoringSettingsAction } from "@/lib/crm/lead-scoring/actions";
import type { LeadScoringSettings } from "@/lib/crm/lead-scoring/settings";

type LeadScoringSettingsFormProps = {
  settings: LeadScoringSettings;
};

export function LeadScoringSettingsForm({
  settings,
}: LeadScoringSettingsFormProps) {
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateLeadScoringSettingsAction(fd);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Engine</CardTitle>
          <CardDescription>
            Classification ranges and automation-ready triggers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={settings.enabled}
            />
            Scoring enabled
          </label>
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <Label htmlFor="veryHotMin">Very Hot ≥</Label>
              <Input
                id="veryHotMin"
                name="veryHotMin"
                type="number"
                defaultValue={settings.classificationRanges.very_hotMin}
              />
            </div>
            <div>
              <Label htmlFor="hotMin">Hot ≥</Label>
              <Input
                id="hotMin"
                name="hotMin"
                type="number"
                defaultValue={settings.classificationRanges.hotMin}
              />
            </div>
            <div>
              <Label htmlFor="warmMin">Warm ≥</Label>
              <Input
                id="warmMin"
                name="warmMin"
                type="number"
                defaultValue={settings.classificationRanges.warmMin}
              />
            </div>
            <div>
              <Label htmlFor="coldMin">Cold ≥</Label>
              <Input
                id="coldMin"
                name="coldMin"
                type="number"
                defaultValue={settings.classificationRanges.coldMin}
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(settings.automationTriggers).map(([key, value]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name={`auto_${key}`}
                  defaultChecked={Boolean(value)}
                />
                {key}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Category weights</CardTitle>
          <CardDescription>
            Relative weights (normalized at score time). Sum need not be 100.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SCORING_CATEGORIES.map((cat) => (
              <div key={cat}>
                <Label htmlFor={`weight_${cat}`}>
                  {SCORING_CATEGORY_LABELS[cat]}
                </Label>
                <Input
                  id={`weight_${cat}`}
                  name={`weight_${cat}`}
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={settings.weights[cat]}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
