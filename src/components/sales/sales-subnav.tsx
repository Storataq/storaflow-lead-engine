"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SALES_NAV, SALES_UI } from "@/lib/sales-agent/constants";
import { cn } from "@/lib/utils";

export function SalesSubnav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label={SALES_UI.hubTitle}
      className="mb-6 flex flex-wrap gap-1 border-b border-border pb-2"
    >
      {SALES_NAV.map((link) => {
        const active =
          link.href === "/sales"
            ? pathname === "/sales"
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
