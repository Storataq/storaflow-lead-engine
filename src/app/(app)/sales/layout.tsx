import type { Metadata } from "next";

import { SalesSubnav } from "@/components/sales/sales-subnav";
import { SALES_UI } from "@/lib/sales-agent/constants";

export const metadata: Metadata = { title: SALES_UI.hubTitle };

export default function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <SalesSubnav />
      {children}
    </div>
  );
}
