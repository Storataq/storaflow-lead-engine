"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { BrandMark } from "@/components/brand/brand-mark";
import { navIconMap, type NavIconName } from "@/components/layout/nav-icons";
import { APP_POWERED_BY, type NavItem } from "@/lib/constants";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  organizationName: string;
  productName?: string | null;
  logoUrl?: string | null;
  poweredBy?: string | null;
  navItems: readonly NavItem[];
};

export function AppSidebar({
  organizationName,
  productName,
  logoUrl,
  poweredBy,
  navItems,
}: AppSidebarProps) {
  const pathname = usePathname();
  const crmOpenDefault = pathname.startsWith("/crm");
  const [crmOpen, setCrmOpen] = useState(crmOpenDefault);
  const collabOpenDefault = pathname.startsWith("/collaboration") || pathname === "/activity";
  const [collabOpen, setCollabOpen] = useState(collabOpenDefault);
  const securityOpenDefault = pathname.startsWith("/security");
  const [securityOpen, setSecurityOpen] = useState(securityOpenDefault);

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
      <div className="flex h-14 items-center border-b border-sidebar-border px-5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <BrandMark
            href="/dashboard"
            productName={productName}
            logoUrl={logoUrl}
          />
          <span className="truncate pl-9 text-xs text-muted-foreground">
            {organizationName}
          </span>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const Icon =
            navIconMap[item.icon as NavIconName] ?? navIconMap.Sparkles;
          const hasChildren = Boolean(item.children?.length);
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          if (!hasChildren) {
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
          }

          const open =
            item.href === "/crm"
              ? crmOpen || active
              : item.href === "/collaboration"
                ? collabOpen || active
                : item.href === "/security"
                  ? securityOpen || active
                  : active;

          return (
            <div key={item.href} className="space-y-1">
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-sidebar-accent/70 font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
                )}
                aria-expanded={open}
                aria-controls={
                  item.href === "/crm"
                    ? "crm-nav-children"
                    : item.href === "/collaboration"
                      ? "collab-nav-children"
                      : item.href === "/security"
                        ? "security-nav-children"
                        : undefined
                }
                onClick={() => {
                  if (item.href === "/crm") setCrmOpen((value) => !value);
                  if (item.href === "/collaboration")
                    setCollabOpen((value) => !value);
                  if (item.href === "/security")
                    setSecurityOpen((value) => !value);
                }}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 transition-transform",
                    open && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
              {open ? (
                <div
                  id={
                    item.href === "/crm"
                      ? "crm-nav-children"
                      : item.href === "/collaboration"
                        ? "collab-nav-children"
                        : item.href === "/security"
                          ? "security-nav-children"
                          : undefined
                  }
                  className="space-y-1"
                >
                  {item.children?.map((child) => {
                    const ChildIcon =
                      navIconMap[child.icon as NavIconName] ??
                      navIconMap.Sparkles;
                    const childActive =
                      child.href === item.href
                        ? pathname === child.href
                        : pathname === child.href ||
                          pathname.startsWith(`${child.href}/`);
                    return (
                      <Link
                        key={`${child.href}-${child.label}`}
                        href={child.href}
                        aria-current={childActive ? "page" : undefined}
                        className={cn(
                          "ml-3 flex min-h-9 items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          childActive
                            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                            : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
                        )}
                      >
                        <ChildIcon className="size-3.5 shrink-0" aria-hidden />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-4 text-xs text-muted-foreground">
        <p>Alleen publieke zakelijke gegevens</p>
        <p className="mt-1">{poweredBy?.trim() || APP_POWERED_BY}</p>
      </div>
    </aside>
  );
}
