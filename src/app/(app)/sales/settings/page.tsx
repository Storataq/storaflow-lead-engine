import type { Metadata } from "next";

import { SalesSettingsForm } from "@/components/sales/sales-settings-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SALES_UI } from "@/lib/sales-agent/constants";
import {
  bootstrapSalesAgent,
  ensureSalesSettings,
} from "@/lib/sales-agent/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: SALES_UI.settingsTitle };

export default async function SalesSettingsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapSalesAgent(
    context.organization.id,
    context.membership.user_id,
  );
  const settings = await ensureSalesSettings(context.organization.id);
  const canManage =
    context.membership.role === "owner" || context.membership.role === "admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title={SALES_UI.settingsTitle}
        description="Autonomy, approval, provider/model, forecast sensitivity, risk threshold, reminders, working hours."
      />
      <Card>
        <CardHeader>
          <CardTitle>Sales agent settings</CardTitle>
        </CardHeader>
        <CardContent>
          {canManage ? (
            <SalesSettingsForm settings={settings} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Only owners and admins can change sales agent settings.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
