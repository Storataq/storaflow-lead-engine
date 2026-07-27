"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PROSPECTING_NAV, PROSPECTING_UI } from "@/lib/prospecting/constants";
import { cn } from "@/lib/utils";

export function ProspectingSubnav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label={PROSPECTING_UI.hubTitle}
      className="mb-6 flex flex-wrap gap-1 border-b border-border pb-2"
    >
      {PROSPECTING_NAV.map((link) => {
        const active =
          link.href === "/prospecting"
            ? pathname === "/prospecting"
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
