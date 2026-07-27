import type { Metadata } from "next";

import { OrchestratorGoalTextarea } from "@/components/orchestrator/orchestrator-action-buttons";
import { OrchestratorSettingsForm } from "@/components/orchestrator/orchestrator-settings-form";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ORCHESTRATOR_UI } from "@/lib/orchestrator/constants";
import {
  bootstrapOrchestrator,
  ensureOrchestratorSettings,
} from "@/lib/orchestrator/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: ORCHESTRATOR_UI.settingsTitle };

export default async function OrchestratorSettingsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapOrchestrator(
    context.organization.id,
    context.membership.user_id,
  );
  const settings = await ensureOrchestratorSettings(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={ORCHESTRATOR_UI.settingsTitle}
        description="Approval policy, autonomy, model router, timeouts, cost limits."
      />
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Owner/admin only.</CardDescription>
        </CardHeader>
        <CardContent>
          <OrchestratorSettingsForm settings={settings} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Bulk goals</CardTitle>
          <CardDescription>One goal per line.</CardDescription>
        </CardHeader>
        <CardContent>
          <OrchestratorGoalTextarea />
        </CardContent>
      </Card>
    </div>
  );
}
