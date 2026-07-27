import type { Metadata } from "next";

import { CompleteMeetingButton } from "@/components/sales/complete-meeting-button";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SALES_UI } from "@/lib/sales-agent/constants";
import {
  bootstrapSalesAgent,
  listMeetingBriefs,
} from "@/lib/sales-agent/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { formatDateTime } from "@/lib/ui/format";

export const metadata: Metadata = { title: SALES_UI.meetingsTitle };

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export default async function SalesMeetingsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapSalesAgent(
    context.organization.id,
    context.membership.user_id,
  );
  const meetings = await listMeetingBriefs(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={SALES_UI.meetingsTitle}
        description="Pre-meeting briefs (company, history, questions, objections) and post-meeting summaries with CRM updates."
      />
      <Card>
        <CardHeader>
          <CardTitle>Meeting briefs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {meetings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No briefs yet — create from Deals → Meeting brief.
            </p>
          ) : (
            meetings.map((m) => {
              const brief = asRecord(m.brief_json);
              const summary = asRecord(m.summary_json);
              const questions = asStringList(brief.questionsToAsk);
              const objections = asStringList(brief.possibleObjections);
              const focus = asStringList(brief.focusPoints);
              const actions = asStringList(summary.actionItems);
              return (
                <div
                  key={m.id}
                  className="space-y-2 rounded-md border px-3 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{m.title}</p>
                      <p className="text-muted-foreground">
                        {m.meeting_at
                          ? formatDateTime(m.meeting_at)
                          : formatDateTime(m.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{m.status}</Badge>
                      {m.status === "briefed" ? (
                        <CompleteMeetingButton meetingId={m.id} />
                      ) : null}
                    </div>
                  </div>
                  {typeof brief.meetingGoal === "string" ? (
                    <p>
                      <span className="text-muted-foreground">Goal: </span>
                      {brief.meetingGoal}
                    </p>
                  ) : null}
                  {focus.length > 0 ? (
                    <p className="text-muted-foreground">
                      Focus: {focus.join(" · ")}
                    </p>
                  ) : null}
                  {questions.length > 0 ? (
                    <div>
                      <p className="text-muted-foreground">Questions</p>
                      <ul className="list-disc pl-5">
                        {questions.slice(0, 5).map((q) => (
                          <li key={q}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {objections.length > 0 ? (
                    <div>
                      <p className="text-muted-foreground">Objections</p>
                      <ul className="list-disc pl-5">
                        {objections.slice(0, 4).map((o) => (
                          <li key={o}>{o}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {typeof summary.summary === "string" ? (
                    <p className="whitespace-pre-wrap">{summary.summary}</p>
                  ) : null}
                  {actions.length > 0 ? (
                    <ul className="list-disc pl-5">
                      {actions.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
