"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SECURITY_UI } from "@/lib/security/constants";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/security", label: SECURITY_UI.dashboardTitle },
  { href: "/security/sessions", label: SECURITY_UI.sessionsTitle },
  { href: "/security/devices", label: SECURITY_UI.devicesTitle },
  { href: "/security/mfa", label: SECURITY_UI.mfaTitle },
  { href: "/security/sso", label: SECURITY_UI.ssoTitle },
  { href: "/security/policies", label: SECURITY_UI.policiesTitle },
  { href: "/security/roles", label: SECURITY_UI.rolesTitle },
  { href: "/security/audit", label: SECURITY_UI.auditTitle },
  { href: "/security/alerts", label: SECURITY_UI.alertsTitle },
  { href: "/security/admin", label: SECURITY_UI.adminTitle },
] as const;

export function SecuritySubnav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Security"
      className="mb-6 flex flex-wrap gap-1 border-b border-border pb-2"
    >
      {LINKS.map((link) => {
        const active =
          link.href === "/security"
            ? pathname === "/security"
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
