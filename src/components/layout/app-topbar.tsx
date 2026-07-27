"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  logoutAction,
  setActiveOrganizationAction,
} from "@/lib/auth/actions";
import { NAV_ITEMS, APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { navIconMap, type NavIconName } from "@/components/layout/nav-icons";
import { cn } from "@/lib/utils";

type AppTopbarProps = {
  title: string;
  userEmail: string;
  userName: string | null;
  organizationName: string;
  organizations?: Array<{ id: string; name: string }>;
  activeOrganizationId?: string;
};

function initials(name: string | null, email: string): string {
  if (name?.trim()) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function AppTopbar({
  title,
  userEmail,
  userName,
  organizationName,
  organizations = [],
  activeOrganizationId,
}: AppTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur lg:px-6">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon-sm" className="lg:hidden" />
            }
          >
            <Menu className="size-4" />
            <span className="sr-only">Menu openen</span>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 max-w-[85vw] p-0 sm:max-w-sm">
            <SheetHeader className="border-b border-border px-4 py-3 text-left">
              <SheetTitle>{APP_NAME}</SheetTitle>
              <p className="text-xs text-muted-foreground">{organizationName}</p>
            </SheetHeader>
            <nav className="flex max-h-[80vh] flex-col gap-1 overflow-y-auto p-3">
              {NAV_ITEMS.map((item) => {
                const Icon = navIconMap[item.icon as NavIconName];
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

                return (
                  <div key={item.href} className="space-y-1">
                    <Link
                      href={item.children?.[0]?.href ?? item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm",
                        active
                          ? "bg-accent font-medium"
                          : "text-muted-foreground hover:bg-accent/70",
                      )}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                    {item.children?.map((child) => {
                      const ChildIcon = navIconMap[child.icon as NavIconName];
                      const childActive =
                        child.href === item.href
                          ? pathname === child.href
                          : pathname === child.href ||
                            pathname.startsWith(`${child.href}/`);
                      return (
                        <Link
                          key={`${child.href}-${child.label}`}
                          href={child.href}
                          className={cn(
                            "ml-4 flex items-center gap-2 rounded-md px-3 py-1.5 text-sm",
                            childActive
                              ? "bg-accent font-medium"
                              : "text-muted-foreground hover:bg-accent/70",
                          )}
                        >
                          <ChildIcon className="size-3.5" />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
        <p className="text-sm font-medium tracking-tight">{title}</p>
      </div>

      <div className="flex items-center gap-2">
        {organizations.length > 1 ? (
          <select
            className="hidden h-8 max-w-[12rem] truncate rounded-lg border border-input bg-transparent px-2 text-sm sm:block"
            aria-label="Actieve organisatie"
            disabled={pending}
            value={activeOrganizationId ?? organizations[0]?.id}
            onChange={(event) => {
              const nextId = event.target.value;
              startTransition(async () => {
                const result = await setActiveOrganizationAction(nextId);
                if (result && !result.success) {
                  toast.error(result.message);
                  return;
                }
                router.refresh();
              });
            }}
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" className="gap-2 px-2" />}
          >
            <Avatar className="size-7">
              <AvatarFallback className="text-xs">
                {initials(userName, userEmail)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-40 truncate text-sm sm:inline">
              {userName ?? userEmail}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">
                  {userName ?? "Gebruiker"}
                </span>
                <span className="text-xs text-muted-foreground">{userEmail}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={<Link href="/settings" />}
              nativeButton={false}
            >
              Instellingen
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href="/settings/ai" />}
              nativeButton={false}
            >
              AI-instellingen
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                void logoutAction();
              }}
            >
              Uitloggen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
