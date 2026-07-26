import Link from "next/link";

import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const crmChildren =
  NAV_ITEMS.find((item) => item.href === "/crm")?.children ?? [];

type CrmSubnavProps = {
  currentPath: string;
};

export function CrmSubnav({ currentPath }: CrmSubnavProps) {
  return (
    <div className="sticky top-14 z-10 mb-6 -mx-1 flex gap-2 overflow-x-auto bg-background/95 px-1 py-2 backdrop-blur supports-backdrop-filter:bg-background/80">
      {crmChildren.map((item) => {
        const active =
          item.href === "/crm"
            ? currentPath === "/crm"
            : currentPath === item.href ||
              currentPath.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-lg border px-3 py-1.5 text-sm transition-colors",
              active
                ? "border-foreground/20 bg-muted font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
