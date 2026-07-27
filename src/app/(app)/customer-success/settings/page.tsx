import type { Metadata } from "next";

import { CsSettingsForm } from "@/components/customer-success/cs-settings-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CS_UI } from "@/lib/customer-success/constants";
import {
  bootstrapCustomerSuccess,
  ensureCsSettings,
} from "@/lib/customer-success/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: CS_UI.settingsTitle };

export default async function CsSettingsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapCustomerSuccess(
    context.organization.id,
    context.membership.user_id,
  );
  const settings = await ensureCsSettings(context.organization.id);
  const canManage =
    context.membership.role === "owner" || context.membership.role === "admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title={CS_UI.settingsTitle}
        description="Autonomy, provider/model, churn threshold, renewal window, rate limits."
      />
      <Card>
        <CardHeader>
          <CardTitle>Customer Success settings</CardTitle>
        </CardHeader>
        <CardContent>
          {canManage ? (
            <CsSettingsForm settings={settings} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Only owners and admins can change CS settings.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
