import type { Metadata } from "next";

import { CustomerSuccessSubnav } from "@/components/customer-success/cs-subnav";
import { CS_UI } from "@/lib/customer-success/constants";

export const metadata: Metadata = { title: CS_UI.hubTitle };

export default function CustomerSuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <CustomerSuccessSubnav />
      {children}
    </div>
  );
}
