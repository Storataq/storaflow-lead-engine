import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmailSubnav } from "@/components/email/email-subnav";
import { SequenceFlowPreview } from "@/components/email/sequence-flow-preview";
import {
  SequenceArchiveButton,
  SequenceDuplicateButton,
  SequencePublishButton,
  SequenceRestoreButton,
  SequenceValidateButton,
} from "@/components/email/sequence-action-buttons";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  EMAIL_SEQUENCE_CATEGORY_LABELS,
  EMAIL_SEQUENCE_STATUS_LABELS,
  type EmailSequenceCategory,
  type EmailSequenceStatusExtended,
} from "@/lib/email/sequence/constants";
import {
  countCampaignsUsingSequence,
  getEmailSequence,
  listCampaignsLinkedToSequence,
  listSequenceActivities,
  listSequenceValidations,
} from "@/lib/email/sequence/queries";
import {
  countEmailSteps,
  parseStepsJson,
} from "@/lib/email/sequence/steps";
import { previewRecipientJourney } from "@/lib/email/sequence/journey";
import { previewSequenceTimeline } from "@/lib/email/sequence/timing";
import { listActiveTemplatesForCampaign } from "@/lib/email/campaign/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: "Sequence Detail" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EmailSequenceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const context = await getActiveOrganization();
  if (!context) return null;

  const orgId = context.organization.id;
  const [sequence, activities, validations, campaigns, templates, usageCount] =
    await Promise.all([
      getEmailSequence(orgId, id),
      listSequenceActivities(orgId, id),
      listSequenceValidations(orgId, id, 5),
      listCampaignsLinkedToSequence(orgId, id),
      listActiveTemplatesForCampaign(orgId),
      countCampaignsUsingSequence(orgId, id),
    ]);

  if (!sequence) notFound();

  const steps = parseStepsJson(sequence.steps_json);
  const timeline = previewSequenceTimeline({ steps });
  const templateNames = Object.fromEntries(
    templates.map((t) => [t.id, t.name]),
  );
  const firstEmail = steps.find((s) => s.type === "email");
  const firstTemplate = templates.find(
    (t) => t.id === firstEmail?.email?.templateId,
  );
  const journey = previewRecipientJourney({
    steps,
    scenario: "no_reply",
    templateContent: firstTemplate
      ? {
          subject: "{{contactFirstName}} — quick question",
          htmlBody: "<p>Hello {{contactFirstName}}</p>",
          textBody: "Hello {{contactFirstName}}",
        }
      : undefined,
  });

  const validation = sequence.last_validation_json as {
    ok?: boolean;
    issues?: Array<{ severity: string; message: string }>;
    summary?: { blockingCount?: number; warningCount?: number };
  } | null;

  const category =
    sequence.category in EMAIL_SEQUENCE_CATEGORY_LABELS
      ? EMAIL_SEQUENCE_CATEGORY_LABELS[sequence.category as EmailSequenceCategory]
      : sequence.category;
  const status =
    sequence.status in EMAIL_SEQUENCE_STATUS_LABELS
      ? EMAIL_SEQUENCE_STATUS_LABELS[
          sequence.status as EmailSequenceStatusExtended
        ]
      : sequence.status;

  const canEdit =
    sequence.status !== "archived" && sequence.status !== "active";

  return (
    <div>
      <PageHeader
        title={sequence.name}
        description={sequence.description ?? "Sequence detail — preview only"}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Sequences", href: "/email/sequences" },
          { label: sequence.name },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <Button
                nativeButton={false}
                render={<Link href={`/email/sequences/${id}/edit`} />}
              >
                Edit
              </Button>
            ) : null}
            <SequenceValidateButton sequenceId={id} />
            {sequence.status === "draft" ? (
              <SequencePublishButton sequenceId={id} />
            ) : null}
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href={`/email/sequences/${id}/versions`} />}
            >
              Versions
            </Button>
            <SequenceDuplicateButton sequenceId={id} />
            {sequence.status === "archived" ? (
              <SequenceRestoreButton sequenceId={id} />
            ) : sequence.status !== "archived" ? (
              <SequenceArchiveButton sequenceId={id} />
            ) : null}
          </div>
        }
      />
      <EmailSubnav currentPath="/email/sequences" />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
            <CardTitle className="text-base">{status}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Version / Readiness</CardDescription>
            <CardTitle className="text-base">
              v{sequence.version} · {sequence.readiness_score ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Steps</CardDescription>
            <CardTitle className="text-base">
              {steps.length} ({countEmailSteps(steps)} email)
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Campaign usage</CardDescription>
            <CardTitle className="text-base">{usageCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription>
              {category} · {sequence.default_language}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Classification:{" "}
              <Badge variant="outline">
                {sequence.readiness_classification ?? "not_ready"}
              </Badge>
            </p>
            {validation?.summary ? (
              <p className="text-muted-foreground">
                Blocking: {validation.summary.blockingCount ?? 0} · Warnings:{" "}
                {validation.summary.warningCount ?? 0}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Validation issues</CardTitle>
            <CardDescription>Latest validation snapshot</CardDescription>
          </CardHeader>
          <CardContent>
            {validation?.issues?.length ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {validation.issues.slice(0, 8).map((issue, i) => (
                  <li key={i}>
                    <span className="text-foreground">[{issue.severity}]</span>{" "}
                    {issue.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Run validation to see issues.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Flow preview</CardTitle>
            <CardDescription>{timeline.disclaimer}</CardDescription>
          </CardHeader>
          <CardContent>
            <SequenceFlowPreview
              steps={steps}
              timeline={timeline}
              templateNames={templateNames}
            />
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Recipient journey (preview)</CardTitle>
            <CardDescription>{journey.disclaimer}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{journey.outcome}</p>
            <ul className="space-y-2">
              {journey.steps.map((step) => (
                <li key={step.stepId} className="rounded border p-2">
                  <p className="font-medium">
                    {step.stepName} ({step.stepType})
                  </p>
                  <p className="text-muted-foreground">{step.action}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Linked campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">None yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {campaigns.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/email/campaigns/${c.id}`}
                      className="underline"
                    >
                      {c.name}
                    </Link>{" "}
                    · {c.status}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ul className="space-y-2 text-sm text-muted-foreground">
                {activities.slice(0, 8).map((a) => (
                  <li key={a.id}>
                    <span className="text-foreground">{a.event_type}</span> —{" "}
                    {a.description}
                  </li>
                ))}
              </ul>
            )}
            {validations.length > 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Last validation score: {validations[0].readiness_score}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
