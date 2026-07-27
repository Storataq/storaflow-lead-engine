import Link from "next/link";

import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  href?: string;
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "md";
};

/**
 * TODO(branding): Swap the placeholder mark for the official Storaflow logo asset
 * (SVG preferred) under /public/brand/ when available.
 */
export function BrandMark({
  href = "/dashboard",
  className,
  showWordmark = true,
  size = "sm",
}: BrandMarkProps) {
  const markSize = size === "md" ? "size-9 text-base" : "size-7 text-sm";

  const content = (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-md bg-slate-900 font-semibold text-slate-50",
          markSize,
        )}
        aria-hidden
      >
        S
      </span>
      {showWordmark ? (
        <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
      ) : null}
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="inline-flex items-center">
      {content}
    </Link>
  );
}
