import type { Metadata } from "next";
import Link from "next/link";

import { APP_NAME, APP_SHORT_NAME } from "@/lib/constants";
import { PWA_UI } from "@/lib/pwa/constants";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

/** Cached offline fallback page for the service worker. */
export default function OfflinePage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 bg-background px-6 py-16 text-center">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {APP_SHORT_NAME}
      </p>
      <h1 className="text-2xl font-semibold">{APP_NAME} is offline</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {PWA_UI.offlineBanner} Cached dashboard, companies, contacts, tasks, and
        notes remain available when previously visited.
      </p>
      <Link
        href="/dashboard"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Try dashboard
      </Link>
    </div>
  );
}
