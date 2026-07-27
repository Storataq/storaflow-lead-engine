import { Mail } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EMAIL_ENGINE_COMPLIANCE_NOTICE } from "@/lib/email/types";

type EmailPlaceholderProps = {
  title: string;
  description: string;
  upcoming?: string[];
};

export function EmailModulePlaceholder({
  title,
  description,
  upcoming = [],
}: EmailPlaceholderProps) {
  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        {EMAIL_ENGINE_COMPLIANCE_NOTICE}
      </p>
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Mail}
            title="Foundation placeholder"
            description="Architecture is ready. Sending, tracking and campaign execution ship in later phases."
          />
          {upcoming.length > 0 ? (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {upcoming.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
