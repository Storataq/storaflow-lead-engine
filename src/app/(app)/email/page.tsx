import type { Metadata } from "next";
import Link from "next/link";

import { EmailModulePlaceholder } from "@/components/email/email-module-placeholder";
import { EmailSubnav } from "@/components/email/email-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  EMAIL_ENGINE_CAPABILITIES,
  EMAIL_ENGINE_COMPLIANCE_NOTICE,
  EMAIL_ENGINE_PHASE,
} from "@/lib/email/types";
import { CRM_EMAIL_INTEGRATION_POINTS } from "@/lib/email/crm-bridge";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = {
  title: "Email Engine",
};

export default async function EmailOverviewPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  return (
    <div>
      <PageHeader
        title="Automated Email Engine"
        description={`Native Storaflow module — phase: ${EMAIL_ENGINE_PHASE}. Live sending is gated by env, org controls, and allowlists.`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine" },
        ]}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/crm/campaign-ready" />}
          >
            Campaign Ready (CRM)
          </Button>
        }
      />
      <EmailSubnav currentPath="/email" />

      <div className="mb-4 space-y-4">
        <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {EMAIL_ENGINE_COMPLIANCE_NOTICE}
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["Sending", EMAIL_ENGINE_CAPABILITIES.sending],
              ["Scheduling", EMAIL_ENGINE_CAPABILITIES.schedulingExecution],
              ["Open tracking", EMAIL_ENGINE_CAPABILITIES.openTracking],
              ["Providers", EMAIL_ENGINE_CAPABILITIES.providerIntegrations],
            ] as const
          ).map(([label, enabled]) => (
            <Card key={label} className="shadow-none">
              <CardHeader className="pb-2">
                <CardDescription>{label}</CardDescription>
                <CardTitle className="text-base">
                  {enabled ? "Enabled" : "Disabled"}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">CRM integration points</CardTitle>
            <CardDescription>
              Prepared hooks only — pipeline is not auto-updated.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {CRM_EMAIL_INTEGRATION_POINTS.map((item) => (
                <li key={item.key}>
                  <span className="font-medium text-foreground">{item.key}</span>
                  {" — "}
                  {item.description}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <EmailModulePlaceholder
          title="Module map"
          description="Templates, campaigns, sequences, queue, tracking, preferences, analytics, AI assist, and operations are available. Live dispatch remains gated."
          upcoming={[
            "Broader recipient inbox UX",
            "Additional provider adapters",
            "Deeper CRM auto-sync (manual review first)",
          ]}
        />
      </div>
    </div>
  );
}
