import type { Metadata } from "next";

import Link from "next/link";

import { EmailModulePlaceholder } from "@/components/email/email-module-placeholder";
import { EmailSubnav } from "@/components/email/email-subnav";
import { SenderProfilesPanel } from "@/components/email/sender-profiles-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { listSenderProfiles } from "@/lib/email/campaign/queries";
import { getEmailProviderDiagnostics } from "@/lib/email/provider";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Email Settings" };

export default async function EmailSettingsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  let profiles = null;
  let errorMessage: string | null = null;
  const providerDiagnostics = getEmailProviderDiagnostics();
  try {
    profiles = await listSenderProfiles(context.organization.id);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Could not load sender profiles. Apply migration 000013 if needed.",
    );
  }

  return (
    <div>
      <PageHeader
        title="Email Settings"
        description="Sender profiles foundation. Provider credentials remain for a later phase."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Settings" },
        ]}
      />
      <EmailSubnav currentPath="/email/settings" />

      <div className="mb-4">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/settings/ai" />}
        >
          Open AI settings
        </Button>
      </div>

      <div className="mb-6 space-y-2">
        <h2 className="text-sm font-medium">Sender profiles</h2>
        <p className="text-sm text-muted-foreground">
          Provider status:{" "}
          {providerDiagnostics.hasResendKey
            ? "Resend configured via server environment"
            : "No provider key configured yet"}
          .
        </p>
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : (
          <SenderProfilesPanel profiles={profiles ?? []} />
        )}
      </div>

      <EmailModulePlaceholder
        title="Provider & send settings"
        description="Resend is the first wired provider through EmailSendingProvider. Additional providers remain future work."
        upcoming={[
          "Per-organization provider credentials",
          "Org rate limits & business hours",
          "Webhook diagnostics",
          "Domain verification sync",
        ]}
      />
    </div>
  );
}
