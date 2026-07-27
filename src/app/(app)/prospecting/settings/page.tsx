import type { Metadata } from "next";

import { ProspectingSettingsForm } from "@/components/prospecting/prospecting-settings-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PROSPECTING_UI } from "@/lib/prospecting/constants";
import {
  bootstrapProspecting,
  getProspectingSettings,
} from "@/lib/prospecting/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: PROSPECTING_UI.settingsTitle };

export default async function ProspectingSettingsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapProspecting(
    context.organization.id,
    context.membership.user_id,
  );
  const settings = await getProspectingSettings(context.organization.id);
  const canManage =
    context.membership.role === "owner" || context.membership.role === "admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title={PROSPECTING_UI.settingsTitle}
        description="Enable/disable agent, scoring thresholds, enrichment, autonomy, provider/model."
      />
      <Card>
        <CardHeader>
          <CardTitle>Prospecting settings</CardTitle>
        </CardHeader>
        <CardContent>
          {canManage ? (
            <ProspectingSettingsForm settings={settings} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Only owners and admins can change prospecting settings.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
