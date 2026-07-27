"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PLATFORM_UI } from "@/lib/platform-admin/constants";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/platform-admin", label: PLATFORM_UI.dashboardTitle },
  { href: "/platform-admin/organizations", label: PLATFORM_UI.organizationsTitle },
  { href: "/platform-admin/users", label: PLATFORM_UI.usersTitle },
  { href: "/platform-admin/subscriptions", label: PLATFORM_UI.subscriptionsTitle },
  { href: "/platform-admin/licenses", label: PLATFORM_UI.licensesTitle },
  { href: "/platform-admin/support", label: PLATFORM_UI.supportTitle },
  { href: "/platform-admin/monitoring", label: PLATFORM_UI.monitoringTitle },
  { href: "/platform-admin/audit", label: PLATFORM_UI.auditTitle },
  { href: "/platform-admin/feature-flags", label: PLATFORM_UI.featureFlagsTitle },
  { href: "/platform-admin/announcements", label: PLATFORM_UI.announcementsTitle },
  { href: "/platform-admin/settings", label: PLATFORM_UI.settingsTitle },
  { href: "/platform-admin/search", label: PLATFORM_UI.searchTitle },
  { href: "/platform-admin/security", label: PLATFORM_UI.securityTitle },
] as const;

export function PlatformAdminSubnav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label={PLATFORM_UI.hubTitle}
      className="mb-6 flex flex-wrap gap-1 border-b border-border pb-2"
    >
      {LINKS.map((link) => {
        const active =
          link.href === "/platform-admin"
            ? pathname === "/platform-admin"
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
