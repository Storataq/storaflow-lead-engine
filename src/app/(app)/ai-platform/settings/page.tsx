import type { Metadata } from "next";

import { AiSettingsForm } from "@/components/ai-platform/ai-settings-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AI_PLATFORM_UI } from "@/ai/constants";
import { getAiOrgSettings } from "@/ai/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: AI_PLATFORM_UI.settingsTitle };

export default async function AiSettingsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const settings = await getAiOrgSettings(context.organization.id);
  const canManage =
    context.membership.role === "owner" || context.membership.role === "admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title={AI_PLATFORM_UI.settingsTitle}
        description="Per-organization providers, autonomy, limits, memory, logging, and security."
      />
      <Card>
        <CardHeader>
          <CardTitle>Organization AI settings</CardTitle>
        </CardHeader>
        <CardContent>
          {canManage ? (
            <AiSettingsForm settings={settings} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Only owners and admins can change AI platform settings.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
