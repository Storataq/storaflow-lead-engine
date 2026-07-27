import type { Metadata } from "next";

import { RevenueSubnav } from "@/components/revenue/revenue-subnav";
import { REVENUE_UI } from "@/lib/revenue-intelligence/constants";

export const metadata: Metadata = { title: REVENUE_UI.hubTitle };

export default function RevenueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <RevenueSubnav />
      {children}
    </div>
  );
}
