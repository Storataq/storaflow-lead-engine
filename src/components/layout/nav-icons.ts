import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Ban,
  Building2,
  Download,
  LayoutDashboard,
  ListTodo,
  Mail,
  Search,
  Settings,
} from "lucide-react";

export const navIconMap = {
  LayoutDashboard,
  Search,
  ListTodo,
  Building2,
  Mail,
  Ban,
  Download,
  Activity,
  Settings,
} as const satisfies Record<string, LucideIcon>;

export type NavIconName = keyof typeof navIconMap;
