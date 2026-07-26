import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Ban,
  Building2,
  CheckSquare,
  Download,
  Filter,
  GitBranch,
  Handshake,
  Kanban,
  LayoutDashboard,
  ListTodo,
  Mail,
  Plug,
  Search,
  Settings,
  StickyNote,
  Users,
} from "lucide-react";

export const navIconMap = {
  LayoutDashboard,
  Kanban,
  GitBranch,
  Filter,
  Users,
  Handshake,
  CheckSquare,
  StickyNote,
  Search,
  ListTodo,
  Plug,
  Building2,
  Mail,
  Ban,
  Download,
  Activity,
  Settings,
} as const satisfies Record<string, LucideIcon>;

export type NavIconName = keyof typeof navIconMap;
