import type { Metadata } from "next";

import { PageErrorState } from "@/components/layout/page-error-state";
import { PageHeader } from "@/components/layout/page-header";
import { WhiteLabelSettingsForm } from "@/components/white-label/white-label-settings-form";
import { getWhiteLabelConfig } from "@/lib/white-label/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = { title: "White Label" };

export default async function WhiteLabelSettingsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const canManage =
    context.membership.role === "owner" || context.membership.role === "admin";

  let errorMessage: string | null = null;
  let resolved: Awaited<ReturnType<typeof getWhiteLabelConfig>> | null = null;

  try {
    resolved = await getWhiteLabelConfig(context.organization.id, {
      name: context.organization.name,
      support_email: context.organization.support_email,
      logo_url: context.organization.logo_url,
      terms_url: context.organization.terms_url,
      privacy_policy_url: context.organization.privacy_policy_url,
    });
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Could not load White Label. Apply migration 20260726000036_white_label_platform.sql if needed.",
    );
  }

  if (errorMessage || !resolved) {
    return (
      <div>
        <PageHeader
          title="White Label"
          description="Rebrand Storaflow for partners, agencies, and enterprises."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Settings", href: "/settings" },
            { label: "White Label" },
          ]}
        />
        <PageErrorState
          title="White Label"
          description={errorMessage ?? "Unavailable"}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="White Label"
        description="Logos, colors, fonts, domains, feature toggles, email & login branding — isolated per organization."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Settings", href: "/settings" },
          { label: "White Label" },
        ]}
      />
      {!canManage ? (
        <p className="mb-4 text-sm text-muted-foreground">
          View only — owners and admins can edit White Label settings.
        </p>
      ) : null}
      <WhiteLabelSettingsForm
        initialConfig={resolved.config}
        domains={resolved.domains}
        partners={resolved.partners}
        canManage={canManage}
        themeCss={resolved.themeCss}
      />
    </div>
  );
}
