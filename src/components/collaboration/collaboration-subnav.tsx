"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { COLLAB_UI } from "@/lib/collaboration/constants";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/collaboration", label: "Overview" },
  { href: "/collaboration/notifications", label: COLLAB_UI.notificationsTitle },
  { href: "/collaboration/teams", label: COLLAB_UI.teamsTitle },
  { href: "/collaboration/knowledge", label: COLLAB_UI.knowledgeTitle },
  { href: "/collaboration/notes", label: COLLAB_UI.notesTitle },
  { href: "/collaboration/meetings", label: COLLAB_UI.meetingsTitle },
  { href: "/activity", label: COLLAB_UI.activityTitle },
] as const;

export function CollaborationSubnav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Collaboration"
      className="mb-6 flex flex-wrap gap-1 border-b border-border pb-2"
    >
      {LINKS.map((link) => {
        const active =
          link.href === "/collaboration"
            ? pathname === "/collaboration"
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
