import type { Metadata } from "next";
import Link from "next/link";

import { AiCampaignBuilder } from "@/components/email/ai-campaign-builder";
import { EmailSubnav } from "@/components/email/email-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { emptyWorkflowGraph } from "@/lib/email/campaign-builder/graph";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: "AI Campaign Builder" };

export default async function NewAiCampaignBuilderPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  return (
    <div>
      <PageHeader
        title="AI Campaign Builder"
        description="Visually design campaigns, generate emails with AI, optimize subjects, and draft A/B tests."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Campaigns", href: "/email/campaigns" },
          { label: "AI Builder" },
        ]}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/email/campaigns/new/wizard" />}
          >
            Classic wizard
          </Button>
        }
      />
      <EmailSubnav currentPath="/email/campaigns" />
      <AiCampaignBuilder initialGraph={emptyWorkflowGraph()} />
    </div>
  );
}
