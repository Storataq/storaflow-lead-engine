"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ORCHESTRATOR_NAV } from "@/lib/orchestrator/constants";
import { cn } from "@/lib/utils";

export function OrchestratorSubnav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 border-b pb-2">
      {ORCHESTRATOR_NAV.map((item) => {
        const active =
          item.href === "/orchestrator"
            ? pathname === "/orchestrator"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-sm transition-colors",
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
