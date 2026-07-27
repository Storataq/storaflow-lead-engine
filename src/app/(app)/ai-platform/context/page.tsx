import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AI_PLATFORM_UI } from "@/ai/constants";
import { buildAgentContext } from "@/ai/context/builder";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: AI_PLATFORM_UI.contextTitle };

export default async function AiContextPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const bundle = await buildAgentContext({
    organizationId: context.organization.id,
    organizationName: context.organization.name,
    userId: context.membership.user_id,
    userRole: context.membership.role,
    permissions: ["companies:read", "contacts:read", "deals:read", "tasks:read"],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={AI_PLATFORM_UI.contextTitle}
        description="Live context assembled from org, user, CRM, memory, and knowledge."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Companies", bundle.crmSnapshot.companies],
          ["Contacts", bundle.crmSnapshot.contacts],
          ["Deals", bundle.crmSnapshot.deals],
          ["Open tasks", bundle.crmSnapshot.openTasks],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <p className="text-2xl font-semibold tabular-nums">{value}</p>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Context snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
            {JSON.stringify(bundle, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
