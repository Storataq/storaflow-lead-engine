import { Badge } from "@/components/ui/badge";
import {
  CONTACT_BADGE_LABELS,
  type ContactBadgeCode,
} from "@/lib/crm/contact-intelligence/constants";
import { cn } from "@/lib/utils";

type BadgeInput =
  | ContactBadgeCode
  | { code: string; label?: string }
  | string;

function resolveBadge(input: BadgeInput): { code: string; label: string } {
  if (typeof input === "string") {
    const code = input as ContactBadgeCode;
    return {
      code,
      label: CONTACT_BADGE_LABELS[code] ?? input,
    };
  }
  const code = String(input.code);
  return {
    code,
    label:
      input.label ??
      CONTACT_BADGE_LABELS[code as ContactBadgeCode] ??
      code,
  };
}

export function ContactBadge({
  badge,
  className,
}: {
  badge: BadgeInput;
  className?: string;
}) {
  const { label } = resolveBadge(badge);
  return (
    <Badge variant="secondary" className={cn("font-normal", className)}>
      {label}
    </Badge>
  );
}

export function ContactBadgeList({
  badges,
  className,
}: {
  badges: BadgeInput[];
  className?: string;
}) {
  if (!badges.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {badges.map((badge, index) => {
        const resolved = resolveBadge(badge);
        return (
          <ContactBadge
            key={`${resolved.code}-${index}`}
            badge={resolved}
          />
        );
      })}
    </div>
  );
}
