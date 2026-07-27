import type { Metadata } from "next";

import { RevenueSettingsForm } from "@/components/revenue/revenue-settings-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { REVENUE_UI } from "@/lib/revenue-intelligence/constants";
import {
  bootstrapRevenueIntelligence,
  ensureRevenueSettings,
} from "@/lib/revenue-intelligence/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: REVENUE_UI.settingsTitle };

export default async function RevenueSettingsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapRevenueIntelligence(
    context.organization.id,
    context.membership.user_id,
  );
  const settings = await ensureRevenueSettings(context.organization.id);
  const canManage =
    context.membership.role === "owner" || context.membership.role === "admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title={REVENUE_UI.settingsTitle}
        description="Forecast horizon, provider/model, autonomy, rate limits."
      />
      <Card>
        <CardHeader>
          <CardTitle>Revenue Intelligence settings</CardTitle>
        </CardHeader>
        <CardContent>
          {canManage ? (
            <RevenueSettingsForm settings={settings} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Only owners and admins can change revenue settings.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
