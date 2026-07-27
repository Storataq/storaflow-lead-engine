import Link from "next/link";

import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  href?: string | null;
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "md";
  productName?: string | null;
  logoUrl?: string | null;
};

/**
 * Organization-aware brand mark. Falls back to Storaflow placeholder.
 */
export function BrandMark({
  href = "/dashboard",
  className,
  showWordmark = true,
  size = "sm",
  productName,
  logoUrl,
}: BrandMarkProps) {
  const markSize = size === "md" ? "size-9 text-base" : "size-7 text-sm";
  const name = productName?.trim() || APP_NAME;
  const initial = name.charAt(0).toUpperCase() || "S";

  const content = (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className={cn("rounded-md object-contain", markSize)}
          loading="lazy"
        />
      ) : (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-md bg-primary font-semibold text-primary-foreground",
            markSize,
          )}
          aria-hidden
        >
          {initial}
        </span>
      )}
      {showWordmark ? (
        <span className="text-sm font-semibold tracking-tight">{name}</span>
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
