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
    <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
      {crmChildren.map((item) => {
        const active =
          currentPath === item.href || currentPath.startsWith(`${item.href}/`);
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
