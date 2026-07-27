import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { CreateOrganizationForm } from "@/components/auth/create-organization-form";
import { AiCopilotShell } from "@/components/copilot/ai-copilot-shell";
import { MobileBottomNav } from "@/components/pwa/mobile-bottom-nav";
import { PageErrorState } from "@/components/layout/page-error-state";
import { WhiteLabelThemeStyle } from "@/components/white-label/white-label-theme-style";
import { Toaster } from "@/components/ui/sonner";
import {
  NAV_ITEMS,
  resolveOrganizationDisplayName,
  resolveSupportEmail,
} from "@/lib/constants";
import {
  getActiveOrganization,
  listUserOrganizations,
  requireUser,
} from "@/lib/organizations/get-active-organization";
import { isCurrentUserPlatformAdmin } from "@/lib/platform-admin/auth";
import {
  filterNavItemsForWhiteLabel,
  isFeatureEnabled,
} from "@/lib/white-label/features";
import { getWhiteLabelConfig } from "@/lib/white-label/queries";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let userEmail = "";
  try {
    const { user } = await requireUser();
    userEmail = user.email ?? "";
  } catch {
    redirect("/login");
  }

  let context: Awaited<ReturnType<typeof getActiveOrganization>> = null;
  let organizations: Awaited<ReturnType<typeof listUserOrganizations>> = [];
  let orgLoadError: string | null = null;

  try {
    context = await getActiveOrganization();
    organizations = await listUserOrganizations();
  } catch (error) {
    orgLoadError = toUserFacingError(
      error,
      "Kon organisatiecontext niet laden. Probeer opnieuw of log opnieuw in.",
    );
  }

  if (orgLoadError) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center px-4 py-10">
        <PageErrorState
          title="Organisatie niet beschikbaar"
          description={orgLoadError}
          backHref="/login"
          backLabel="Naar login"
        />
        <Toaster />
      </div>
    );
  }

  if (!context) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center bg-[radial-gradient(ellipse_at_top,_oklch(0.97_0_0),_oklch(1_0_0)_45%,_oklch(0.96_0.01_250))] px-4 py-10">
        <CreateOrganizationForm />
        <Toaster />
      </div>
    );
  }

  const organizationName = resolveOrganizationDisplayName(
    context.organization.name,
  );
  const supportEmail = resolveSupportEmail(
    context.organization.support_email ?? null,
  );

  const whiteLabel = await getWhiteLabelConfig(context.organization.id, {
    name: context.organization.name,
    support_email: context.organization.support_email,
    logo_url: context.organization.logo_url,
    terms_url: context.organization.terms_url,
    privacy_policy_url: context.organization.privacy_policy_url,
  });

  const navItems = filterNavItemsForWhiteLabel(NAV_ITEMS, whiteLabel.config);
  const showCopilot = isFeatureEnabled(whiteLabel.config, "copilot");
  const isPlatformAdmin = await isCurrentUserPlatformAdmin();
  const productName = whiteLabel.config.applicationName;
  const logoUrl =
    whiteLabel.config.logos.sidebar_logo ||
    whiteLabel.config.logos.primary_logo ||
    whiteLabel.config.logos.small_logo ||
    null;
  const poweredBy = whiteLabel.config.email.hidePoweredBy
    ? " "
    : whiteLabel.config.email.footerPoweredBy;

  return (
    <div className="flex min-h-full flex-1 bg-background">
      <WhiteLabelThemeStyle cssText={whiteLabel.themeCss} />
      <AppSidebar
        organizationName={organizationName}
        productName={productName}
        logoUrl={logoUrl}
        poweredBy={poweredBy}
        navItems={navItems}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          userEmail={userEmail}
          userName={context.profile?.full_name ?? null}
          organizationName={organizationName}
          supportEmail={
            whiteLabel.config.supportEmail.trim() || supportEmail
          }
          organizations={organizations.map((row) => ({
            id: row.organization.id,
            name: resolveOrganizationDisplayName(row.organization.name),
          }))}
          activeOrganizationId={context.organization.id}
          isPlatformAdmin={isPlatformAdmin}
        />
        <main className="flex-1 px-4 py-6 pb-24 lg:px-8 lg:pb-6">
          {children}
        </main>
        <MobileBottomNav />
      </div>
      <Toaster />
      {showCopilot ? <AiCopilotShell /> : null}
    </div>
  );
}
