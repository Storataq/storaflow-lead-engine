import type { Metadata } from "next";

import { AiPlatformSubnav } from "@/components/ai-platform/ai-platform-subnav";
import { AI_PLATFORM_UI } from "@/ai/constants";

export const metadata: Metadata = { title: AI_PLATFORM_UI.hubTitle };

export default function AiPlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <AiPlatformSubnav />
      {children}
    </div>
  );
}
