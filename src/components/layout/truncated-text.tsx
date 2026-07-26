import { cn } from "@/lib/utils";

type TruncatedTextProps = {
  value: string | null | undefined;
  empty?: string;
  className?: string;
  /** Tailwind max-width utility, e.g. max-w-48 */
  maxWidthClassName?: string;
};

/**
 * Truncates long cell text and exposes the full value via native title tooltip.
 */
export function TruncatedText({
  value,
  empty = "—",
  className,
  maxWidthClassName = "max-w-48",
}: TruncatedTextProps) {
  const text = value?.trim() ? value.trim() : null;
  if (!text) {
    return <span className={cn("text-muted-foreground", className)}>{empty}</span>;
  }

  return (
    <span
      title={text}
      className={cn(
        "block truncate text-muted-foreground",
        maxWidthClassName,
        className,
      )}
    >
      {text}
    </span>
  );
}
