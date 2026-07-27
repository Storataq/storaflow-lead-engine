"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { optimizeSubjectsAction } from "@/lib/email/campaign-builder/actions";

type ScoreRow = {
  subject: string;
  openRate: number;
  spamRisk: number;
  professionalTone: number;
  urgency: number;
  personalization: number;
  overall: number;
  rationale: string[];
};

type AiSubjectOptimizerProps = {
  campaignId?: string;
  defaultPurpose?: string;
  defaultOffer?: string;
};

export function AiSubjectOptimizer({
  campaignId,
  defaultPurpose = "",
  defaultOffer = "",
}: AiSubjectOptimizerProps) {
  const [purpose, setPurpose] = useState(defaultPurpose);
  const [offer, setOffer] = useState(defaultOffer);
  const [company, setCompany] = useState("");
  const [customSubjects, setCustomSubjects] = useState("");
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const fd = new FormData();
      if (campaignId) fd.set("campaignId", campaignId);
      fd.set("purpose", purpose);
      fd.set("offer", offer);
      fd.set("company", company);
      if (customSubjects.trim()) fd.set("subjects", customSubjects);
      const result = await optimizeSubjectsAction(fd);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setScores((result.scores as ScoreRow[]) ?? []);
      toast.success(result.message);
    });
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">AI Subject Optimizer</CardTitle>
        <CardDescription>
          Generate and score subject lines for open rate, spam risk, tone, urgency,
          and personalization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="subj-purpose">Purpose</Label>
            <Input
              id="subj-purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="subj-offer">Offer</Label>
            <Input
              id="subj-offer"
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="subj-company">Company</Label>
            <Input
              id="subj-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme BV"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="subj-custom">Custom subjects (one per line, optional)</Label>
          <Textarea
            id="subj-custom"
            value={customSubjects}
            onChange={(e) => setCustomSubjects(e.target.value)}
            rows={3}
            placeholder={"{{first_name}}, quick idea for your team\nFollow-up on pilot invite"}
          />
        </div>
        <Button type="button" onClick={run} disabled={pending}>
          {pending ? "Scoring…" : "Generate & score"}
        </Button>

        {scores.length > 0 ? (
          <ul className="space-y-3">
            {scores.map((row) => (
              <li
                key={row.subject}
                className="rounded-lg border p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{row.subject}</p>
                  <Badge>Overall {row.overall}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Open {row.openRate}</span>
                  <span>Spam {row.spamRisk}</span>
                  <span>Tone {row.professionalTone}</span>
                  <span>Urgency {row.urgency}</span>
                  <span>Personal {row.personalization}</span>
                </div>
                {row.rationale.length > 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {row.rationale.join(" · ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
