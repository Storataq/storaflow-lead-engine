import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AiCampaignBuilder } from "@/components/email/ai-campaign-builder";
import { EmailSubnav } from "@/components/email/email-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  emptyWorkflowGraph,
  parseWorkflowGraph,
} from "@/lib/email/campaign-builder/graph";
import { buildCampaignRecommendations } from "@/lib/email/campaign-builder/recommendations";
import {
  listCampaignAbTests,
  listSubjectScores,
} from "@/lib/email/campaign-builder/queries";
import { getEmailCampaign } from "@/lib/email/campaign/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Campaign Builder" };

type PageProps = { params: Promise<{ id: string }> };

export default async function CampaignBuilderPage({ params }: PageProps) {
  const { id } = await params;
  const context = await getActiveOrganization();
  if (!context) return null;

  const campaign = await getEmailCampaign(context.organization.id, id);
  if (!campaign) notFound();

  const graph = parseWorkflowGraph(campaign.workflow_graph_json);
  const initialGraph =
    graph.nodes.length > 0 ? graph : emptyWorkflowGraph();

  const recommendations = buildCampaignRecommendations({
    campaign,
    subject: campaign.template_subject_snapshot,
    bodyLength: campaign.template_html_snapshot?.length,
  });

  let abTests: Awaited<ReturnType<typeof listCampaignAbTests>> = [];
  let scores: Awaited<ReturnType<typeof listSubjectScores>> = [];
  try {
    [abTests, scores] = await Promise.all([
      listCampaignAbTests(context.organization.id, id),
      listSubjectScores(context.organization.id, id, 8),
    ]);
  } catch {
    // Tables may not exist until migration 00029 is applied.
  }

  return (
    <div>
      <PageHeader
        title={`Builder · ${campaign.name}`}
        description="AI workflow editor, subject scoring, A/B drafts, and multi-device preview."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Campaigns", href: "/email/campaigns" },
          { label: campaign.name, href: `/email/campaigns/${id}` },
          { label: "Builder" },
        ]}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href={`/email/campaigns/${id}`} />}
          >
            Campaign detail
          </Button>
        }
      />
      <EmailSubnav currentPath="/email/campaigns" />

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">A/B tests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {abTests.length === 0 ? (
              <p className="text-muted-foreground">No A/B drafts yet.</p>
            ) : (
              abTests.map((test) => (
                <div key={test.id} className="rounded-lg border p-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{test.name}</span>
                    <Badge variant="outline">{test.status}</Badge>
                    <Badge variant="secondary">{test.test_dimension}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {test.variants.map((v) => v.label).join(" / ")} · metric{" "}
                    {test.metric}
                    {test.auto_pick_winner ? " · auto-winner" : ""}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Saved subject scores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {scores.length === 0 ? (
              <p className="text-muted-foreground">No scored subjects yet.</p>
            ) : (
              scores.map((s) => (
                <div key={s.id} className="rounded-lg border p-2">
                  <p className="font-medium">{s.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    Overall {Number(s.overall_score)} · Open{" "}
                    {Number(s.open_rate_score)} · Spam{" "}
                    {Number(s.spam_risk_score)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <AiCampaignBuilder
        campaign={campaign}
        initialGraph={initialGraph}
        recommendations={recommendations}
      />
    </div>
  );
}
