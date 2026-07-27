import Link from "next/link";

import { cn } from "@/lib/utils";

const EMAIL_NAV = [
  { href: "/email", label: "Overview" },
  { href: "/email/campaigns", label: "Campaigns" },
  { href: "/email/campaigns/calendar", label: "Calendar" },
  { href: "/email/campaigns/new/builder", label: "AI Builder" },
  { href: "/email/templates", label: "Templates" },
  { href: "/email/sequences", label: "Sequences" },
  { href: "/email/executions", label: "Executions" },
  { href: "/email/enrollments", label: "Enrollments" },
  { href: "/email/recipients", label: "Recipients" },
  { href: "/email/queue", label: "Queue" },
  { href: "/email/analytics", label: "Analytics" },
  { href: "/email/operations", label: "Operations" },
  { href: "/email/ai/history", label: "AI" },
  { href: "/email/preferences", label: "Preferences" },
  { href: "/email/suppression", label: "Suppression" },
  { href: "/email/settings", label: "Settings" },
] as const;

type EmailSubnavProps = {
  currentPath: string;
};

export function EmailSubnav({ currentPath }: EmailSubnavProps) {
  const activeHref = EMAIL_NAV.reduce<string | null>((best, item) => {
    const matches =
      item.href === "/email"
        ? currentPath === "/email"
        : currentPath === item.href || currentPath.startsWith(`${item.href}/`);
    if (!matches) return best;
    if (!best || item.href.length > best.length) return item.href;
    return best;
  }, null);

  return (
    <nav
      aria-label="Email Engine navigatie"
      className="sticky top-14 z-10 mb-6 -mx-1 flex gap-2 overflow-x-auto bg-background/95 px-1 py-2 backdrop-blur supports-backdrop-filter:bg-background/80"
    >
      {EMAIL_NAV.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "min-h-9 shrink-0 rounded-lg border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-foreground/20 bg-muted font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
