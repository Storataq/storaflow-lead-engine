import type { Metadata } from "next";

import { ProspectingSubnav } from "@/components/prospecting/prospecting-subnav";
import { PROSPECTING_UI } from "@/lib/prospecting/constants";

export const metadata: Metadata = { title: PROSPECTING_UI.hubTitle };

export default function ProspectingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <ProspectingSubnav />
      {children}
    </div>
  );
}
