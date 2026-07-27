"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BILLING_UI } from "@/lib/billing/constants";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/billing", label: BILLING_UI.dashboardTitle },
  { href: "/billing/plans", label: BILLING_UI.plansTitle },
  { href: "/billing/usage", label: BILLING_UI.usageTitle },
  { href: "/billing/invoices", label: BILLING_UI.invoicesTitle },
  { href: "/billing/seats", label: BILLING_UI.seatsTitle },
  { href: "/billing/addons", label: BILLING_UI.addonsTitle },
  { href: "/billing/portal", label: BILLING_UI.portalTitle },
] as const;

export function BillingSubnav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label={BILLING_UI.hubTitle}
      className="mb-6 flex flex-wrap gap-1 border-b border-border pb-2"
    >
      {LINKS.map((link) => {
        const active =
          link.href === "/billing"
            ? pathname === "/billing"
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
