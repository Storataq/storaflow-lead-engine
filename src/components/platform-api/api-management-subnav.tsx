"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/api-management", label: "Overview" },
  { href: "/api-management/keys", label: "API keys" },
  { href: "/api-management/webhooks", label: "Webhooks" },
  { href: "/api-management/logs", label: "Logs" },
  { href: "/api-management/usage", label: "Usage" },
  { href: "/api-management/docs", label: "Documentation" },
] as const;

export function ApiManagementSubnav({ currentPath }: { currentPath: string }) {
  return (
    <nav
      aria-label="API management"
      className="mb-6 flex flex-wrap gap-1 border-b border-border pb-2"
    >
      {LINKS.map((link) => {
        const active =
          link.href === "/api-management"
            ? currentPath === link.href
            : currentPath.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
