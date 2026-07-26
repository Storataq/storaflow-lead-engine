import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center px-4 py-10">
      <Card className="w-full shadow-none" role="status">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
            <FileQuestion
              className="size-5 text-muted-foreground"
              aria-hidden
            />
          </div>
          <CardTitle className="text-base">Pagina niet gevonden</CardTitle>
          <CardDescription className="text-pretty">
            Deze pagina bestaat niet of je hebt geen toegang. Controleer de URL
            of ga terug naar het dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap justify-center gap-2 pb-8">
          <Button nativeButton={false} render={<Link href="/dashboard" />}>
            Naar dashboard
          </Button>
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/crm" />}
          >
            Naar CRM
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
