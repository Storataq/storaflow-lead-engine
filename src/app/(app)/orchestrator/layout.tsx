import type { Metadata } from "next";

import { OrchestratorSubnav } from "@/components/orchestrator/orchestrator-subnav";
import { ORCHESTRATOR_UI } from "@/lib/orchestrator/constants";

export const metadata: Metadata = { title: ORCHESTRATOR_UI.hubTitle };

export default function OrchestratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <OrchestratorSubnav />
      {children}
    </div>
  );
}
