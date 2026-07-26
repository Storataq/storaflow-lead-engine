import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  /** Custom primary action (e.g. open a sheet). Prefer over actionHref when both set. */
  action?: ReactNode;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  action,
}: EmptyStateProps) {
  const linkAction =
    !action && actionLabel && actionHref ? (
      <Button nativeButton={false} render={<Link href={actionHref} />}>
        {actionLabel}
      </Button>
    ) : null;

  return (
    <Card className="border-dashed shadow-none">
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
          <Icon className="size-5 text-muted-foreground" aria-hidden />
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="max-w-md text-pretty">
          {description}
        </CardDescription>
      </CardHeader>
      {action || linkAction ? (
        <CardContent className="flex justify-center pb-8">
          {action ?? linkAction}
        </CardContent>
      ) : null}
    </Card>
  );
}
