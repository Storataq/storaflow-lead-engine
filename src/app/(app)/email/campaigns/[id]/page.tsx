import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  CampaignApproveForm,
  CampaignArchiveButton,
  CampaignDuplicateButton,
  CampaignRejectForm,
  CampaignRestoreButton,
  CampaignReturnDraftButton,
  CampaignSnapshotButton,
  CampaignSubmitReviewButton,
  CampaignValidateButton,
  CampaignStartExecutionButton,
} from "@/components/email/campaign-action-buttons";
import { CampaignRecipientPreview } from "@/components/email/campaign-recipient-preview";
import { EmailSubnav } from "@/components/email/email-subnav";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CAMPAIGN_COMPLIANCE_NOTICE,
  EMAIL_CAMPAIGN_STATUS_LABELS,
  EMAIL_CAMPAIGN_TYPE_LABELS,
  type EmailCampaignStatusExtended,
  type EmailCampaignType,
} from "@/lib/email/campaign/constants";
import {
  getEmailCampaign,
  listCampaignActivities,
  listCampaignApprovals,
  listCampaignRecipients,
  listCampaignValidations,
  listSenderProfiles,
  parseAudienceDefinition,
  previewCampaignAudience,
} from "@/lib/email/campaign/queries";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: "Campaign Detail" };

type PageProps = { params: Promise<{ id: string }> };

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function EmailCampaignDetailPage({ params }: PageProps) {
  const { id } = await params;
  const context = await getActiveOrganization();
  if (!context) return null;

  const orgId = context.organization.id;
  const campaign = await getEmailCampaign(orgId, id);
  if (!campaign) notFound();

  const [
    recipients,
    activities,
    approvals,
    validations,
    senders,
    audiencePreview,
  ] = await Promise.all([
    listCampaignRecipients(orgId, id, 100),
    listCampaignActivities(orgId, id),
    listCampaignApprovals(orgId, id),
    listCampaignValidations(orgId, id, 5),
    listSenderProfiles(orgId),
    previewCampaignAudience({
      organizationId: orgId,
      definition: parseAudienceDefinition(campaign.audience_definition_json),
      page: 1,
      pageSize: 10,
    }).catch(() => null),
  ]);

  const supabase = await createClient();
  let template: {
    name: string;
    subject: string;
    preview_text: string | null;
    html_body: string;
    text_body: string | null;
    language: string;
    status: string;
    version: number;
    variables: string[];
    fallbacks_json: unknown;
  } | null = null;

  if (campaign.template_id) {
    const { data } = await supabase
      .from("email_templates")
      .select(
        "name, subject, preview_text, html_body, text_body, language, status, version, variables, fallbacks_json",
      )
      .eq("organization_id", orgId)
      .eq("id", campaign.template_id)
      .maybeSingle();
    template = data;
  }

  const sender = senders.find((s) => s.id === campaign.sender_profile_id);
  const canApproveRole =
    context.membership.role === "owner" ||
    context.membership.role === "admin";

  const statusLabel =
    campaign.status in EMAIL_CAMPAIGN_STATUS_LABELS
      ? EMAIL_CAMPAIGN_STATUS_LABELS[
          campaign.status as EmailCampaignStatusExtended
        ]
      : campaign.status;
  const typeLabel =
    campaign.campaign_type in EMAIL_CAMPAIGN_TYPE_LABELS
      ? EMAIL_CAMPAIGN_TYPE_LABELS[
          campaign.campaign_type as EmailCampaignType
        ]
      : campaign.campaign_type;

  const templateForPreview = {
    subject:
      campaign.template_subject_snapshot ?? template?.subject ?? "(no template)",
    previewText:
      campaign.template_preview_snapshot ?? template?.preview_text ?? null,
    htmlBody:
      campaign.template_html_snapshot ??
      template?.html_body ??
      "<p>No template selected</p>",
    textBody: campaign.template_text_snapshot ?? template?.text_body ?? null,
    fallbacksJson: template?.fallbacks_json as never,
  };

  const lastIssues =
    validations[0]?.issues_json && Array.isArray(validations[0].issues_json)
      ? (validations[0].issues_json as Array<{
          severity: string;
          message: string;
          code: string;
        }>)
      : [];

  return (
    <div>
      <PageHeader
        title={campaign.name}
        description={campaign.description ?? "Campaign detail — no sending"}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Campaigns", href: "/email/campaigns" },
          { label: campaign.name },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              nativeButton={false}
              variant="secondary"
              render={<Link href={`/email/campaigns/${id}/builder`} />}
            >
              AI Builder
            </Button>
            {!campaign.locked ? (
              <Button
                nativeButton={false}
                render={<Link href={`/email/campaigns/${id}/edit`} />}
              >
                Edit
              </Button>
            ) : null}
            <CampaignDuplicateButton campaignId={id} />
            {campaign.status === "archived" ? (
              <CampaignRestoreButton campaignId={id} />
            ) : (
              <CampaignArchiveButton campaignId={id} />
            )}
            {campaign.status === "approved" ? (
              <CampaignReturnDraftButton campaignId={id} />
            ) : null}
          </div>
        }
      />
      <EmailSubnav currentPath="/email/campaigns" />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
            <CardTitle className="text-base">{statusLabel}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Type</CardDescription>
            <CardTitle className="text-base">{typeLabel}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Readiness</CardDescription>
            <CardTitle className="text-base">
              {campaign.readiness_score} · {campaign.readiness_classification}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Recipients</CardDescription>
            <CardTitle className="text-base">
              {campaign.valid_recipient_count}/{campaign.recipient_count}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Lock</CardDescription>
            <CardTitle className="text-base">
              {campaign.locked ? "Locked" : "Editable"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-6">
        {/* Overview */}
        <Card className="shadow-none" id="overview">
          <CardHeader>
            <CardTitle className="text-base">Overview</CardTitle>
            <CardDescription>
              Language {campaign.language}
              {campaign.objective ? ` · ${campaign.objective}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>{CAMPAIGN_COMPLIANCE_NOTICE}</p>
            <p>
              Sequence link reserved for Phase 21D
              {campaign.sequence_id ? ` (${campaign.sequence_id})` : " (none)"}.
            </p>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Prepare & approve</CardTitle>
            <CardDescription>No Send button — execution disabled</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <CampaignValidateButton campaignId={id} />
              <CampaignSnapshotButton campaignId={id} />
              {!campaign.locked ? (
                <CampaignSubmitReviewButton campaignId={id} />
              ) : null}
            </div>
            {canApproveRole && campaign.status === "approved" && campaign.locked ? (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <CampaignStartExecutionButton campaignId={id} />
              </div>
            ) : null}
            {canApproveRole &&
            (campaign.status === "needs_review" ||
              campaign.status === "ready") ? (
              <div className="space-y-2 border-t pt-3">
                <CampaignApproveForm campaignId={id} />
                <CampaignRejectForm campaignId={id} />
              </div>
            ) : null}
            {!canApproveRole ? (
              <p className="text-xs text-muted-foreground">
                Approval requires owner or admin role.
              </p>
            ) : null}
          </CardContent>
        </Card>

        {/* Audience */}
        <Card className="shadow-none" id="audience">
          <CardHeader>
            <CardTitle className="text-base">Audience</CardTitle>
            <CardDescription>
              Preview from Campaign Ready / CRM filters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {audiencePreview ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    Matching {audiencePreview.statistics.totalMatching}
                  </Badge>
                  <Badge variant="secondary">
                    Valid {audiencePreview.statistics.validRecipients}
                  </Badge>
                  <Badge variant="outline">
                    Missing email {audiencePreview.statistics.missingEmail}
                  </Badge>
                  <Badge variant="outline">
                    Invalid {audiencePreview.statistics.invalidEmail}
                  </Badge>
                  <Badge variant="outline">
                    Suppressed {audiencePreview.statistics.suppressed}
                  </Badge>
                  <Badge variant="outline">
                    Duplicate {audiencePreview.statistics.duplicate}
                  </Badge>
                </div>
                {audiencePreview.exclusions.length > 0 ? (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      Exclusions (sample)
                    </p>
                    <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                      {audiencePreview.exclusions.slice(0, 8).map((ex) => (
                        <li key={`${ex.leadId}-${ex.code}`}>
                          {ex.email ?? "no email"} — {ex.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground">
                Audience preview unavailable until migration is applied.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recipients */}
        <Card className="shadow-none" id="recipients">
          <CardHeader>
            <CardTitle className="text-base">Recipient snapshot</CardTitle>
            <CardDescription>
              Frozen when Ready/Approved — CRM changes do not alter approved sets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recipients.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No snapshot yet. Run “Build recipient snapshot”.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Eligibility</TableHead>
                      <TableHead>Priority</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipients.slice(0, 40).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.company_name ?? "—"}</TableCell>
                        <TableCell>{r.preferred_email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.eligibility_status}</Badge>
                        </TableCell>
                        <TableCell>{r.priority ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Template */}
        <Card className="shadow-none" id="template">
          <CardHeader>
            <CardTitle className="text-base">Template</CardTitle>
            <CardDescription>
              {template
                ? `${template.name} · ${template.language} · v${template.version} (${template.status})`
                : "No template selected"}
              {campaign.template_version_id
                ? " · version locked"
                : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="mb-2">
              Subject:{" "}
              {campaign.template_subject_snapshot ?? template?.subject ?? "—"}
            </p>
            <div className="flex flex-wrap gap-1">
              {(
                campaign.template_variables_snapshot?.length
                  ? campaign.template_variables_snapshot
                  : (template?.variables ?? [])
              ).map((v) => (
                <Badge key={v} variant="secondary">
                  {`{{${v}}}`}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Personalization */}
        <Card className="shadow-none" id="personalization">
          <CardHeader>
            <CardTitle className="text-base">Personalization preview</CardTitle>
          </CardHeader>
          <CardContent>
            <CampaignRecipientPreview
              recipients={recipients}
              template={templateForPreview}
            />
          </CardContent>
        </Card>

        {/* Validation */}
        <Card className="shadow-none" id="validation">
          <CardHeader>
            <CardTitle className="text-base">Validation</CardTitle>
            <CardDescription>
              Latest score {campaign.readiness_score} (
              {campaign.readiness_classification})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lastIssues.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Run validation to generate issues and recommendations.
              </p>
            ) : (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {lastIssues.map((issue) => (
                  <li key={`${issue.code}-${issue.message}`}>
                    [{issue.severity}] {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Approval */}
        <Card className="shadow-none" id="approval">
          <CardHeader>
            <CardTitle className="text-base">Approval history</CardTitle>
          </CardHeader>
          <CardContent>
            {approvals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No approvals yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {approvals.map((a) => (
                  <li key={a.id} className="rounded-lg border p-2">
                    <span className="font-medium">{a.status}</span>
                    {a.reviewed_at ? ` · ${formatDate(a.reviewed_at)}` : ""}
                    {a.reason ? ` — ${a.reason}` : ""}
                    {a.notes ? ` · ${a.notes}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className="shadow-none" id="settings">
          <CardHeader>
            <CardTitle className="text-base">Settings & sender</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              Sender:{" "}
              {sender
                ? `${sender.name} <${sender.sender_email}> (${sender.status} / domain ${sender.domain_verification_status})`
                : "—"}
            </p>
            <p>
              Compliance acknowledged: {campaign.compliance_ack ? "Yes" : "No"}
            </p>
            <p className="text-muted-foreground">
              Tracking and stop-on-reply are placeholders for later phases.
            </p>
          </CardContent>
        </Card>

        {/* Activity */}
        <Card className="shadow-none" id="activity">
          <CardHeader>
            <CardTitle className="text-base">Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {activities.map((a) => (
                  <li key={a.id} className="border-b border-border/60 pb-2">
                    <span className="font-medium">{a.event_type}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {formatDate(a.created_at)}
                    </span>
                    <p className="text-muted-foreground">{a.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
