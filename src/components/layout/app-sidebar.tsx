"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navIconMap, type NavIconName } from "@/components/layout/nav-icons";
import { NAV_ITEMS, APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  organizationName: string;
};

export function AppSidebar({ organizationName }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
      <div className="flex h-14 items-center border-b border-sidebar-border px-5">
        <Link href="/dashboard" className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
          <span className="truncate text-xs text-muted-foreground">
            {organizationName}
          </span>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const Icon = navIconMap[item.icon as NavIconName];
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-4 text-xs text-muted-foreground">
        Alleen publieke zakelijke gegevens
      </div>
    </aside>
  );
}
