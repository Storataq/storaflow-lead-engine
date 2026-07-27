import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";

import { ImpersonationBanner } from "@/components/platform-admin/impersonation-banner";
import { Toaster } from "@/components/ui/sonner";
import { APP_NAME } from "@/lib/constants";
import {
  isCurrentUserPlatformAdmin,
  requirePlatformAdmin,
} from "@/lib/platform-admin/auth";
import { PLATFORM_UI } from "@/lib/platform-admin/constants";
import { getActiveImpersonation } from "@/lib/platform-admin/queries";
import { requireUser } from "@/lib/organizations/get-active-organization";
import { createServiceClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function PlatformAdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  try {
    await requireUser();
  } catch {
    redirect("/login");
  }

  const isAdmin = await isCurrentUserPlatformAdmin();
  if (!isAdmin) {
    redirect("/dashboard");
  }

  const admin = await requirePlatformAdmin();
  let impersonationOrgName: string | null = null;
  let impersonationMode: string | null = null;
  let impersonationReason: string | null = null;
  try {
    const session = await getActiveImpersonation(admin.userId);
    if (session) {
      const supabase = createServiceClient();
      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", session.target_organization_id)
        .maybeSingle();
      impersonationOrgName =
        org?.name ?? session.target_organization_id;
      impersonationMode = session.mode;
      impersonationReason = session.reason;
    }
  } catch {
    impersonationOrgName = null;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      {impersonationOrgName && impersonationMode && impersonationReason ? (
        <ImpersonationBanner
          organizationName={impersonationOrgName}
          mode={impersonationMode}
          reason={impersonationReason}
        />
      ) : null}
      <header className="border-b border-border px-4 py-3 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {APP_NAME} · Staff only
            </p>
            <h1 className="text-lg font-semibold">{PLATFORM_UI.hubTitle}</h1>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to app
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
