import type { LucideIcon } from "lucide-react";
import Link from "next/link";

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
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <Card className="border-dashed shadow-none">
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="max-w-md text-pretty">
          {description}
        </CardDescription>
      </CardHeader>
      {actionLabel && actionHref ? (
        <CardContent className="flex justify-center pb-8">
          <Button nativeButton={false} render={<Link href={actionHref} />}>
            {actionLabel}
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}
