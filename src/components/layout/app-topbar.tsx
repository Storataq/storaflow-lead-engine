"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

import { logoutAction } from "@/lib/auth/actions";
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
}: AppTopbarProps) {
  const pathname = usePathname();

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
                        pathname === child.href ||
                        pathname.startsWith(`${child.href}/`);
                      return (
                        <Link
                          key={child.href}
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
    </header>
  );
}
