"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
};

/** Horizontal-scroll table wrapper with sticky header support. */
export function MobileTableShell({ children, className }: Props) {
  return (
    <div
      className={cn(
        "w-full overflow-x-auto overscroll-x-contain rounded-lg border border-border [-webkit-overflow-scrolling:touch]",
        className,
      )}
    >
      <div className="min-w-[36rem] [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10 [&_thead_th]:bg-background">
        {children}
      </div>
    </div>
  );
}

type CardListProps = {
  children: ReactNode;
  className?: string;
};

/** Card-view alternative for dense tables on small screens. */
export function MobileCardList({ children, className }: CardListProps) {
  return (
    <div className={cn("grid gap-3 md:hidden", className)}>{children}</div>
  );
}

export function MobileTouchTarget({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-h-11 min-w-11 touch-manipulation", className)}>
      {children}
    </div>
  );
}
