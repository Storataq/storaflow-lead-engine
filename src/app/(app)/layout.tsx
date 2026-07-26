import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { CreateOrganizationForm } from "@/components/auth/create-organization-form";
import { Toaster } from "@/components/ui/sonner";
import {
  getActiveOrganization,
  requireUser,
} from "@/lib/organizations/get-active-organization";

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

  const context = await getActiveOrganization();

  if (!context) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center bg-[radial-gradient(ellipse_at_top,_oklch(0.97_0_0),_oklch(1_0_0)_45%,_oklch(0.96_0.01_250))] px-4 py-10">
        <CreateOrganizationForm />
        <Toaster />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 bg-background">
      <AppSidebar organizationName={context.organization.name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          title={context.organization.name}
          userEmail={userEmail}
          userName={context.profile?.full_name ?? null}
          organizationName={context.organization.name}
        />
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
