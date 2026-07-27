import {
  Briefcase,
  Building2,
  Calculator,
  Car,
  Coffee,
  Cpu,
  Factory,
  Gem,
  GraduationCap,
  Hammer,
  HeartPulse,
  Home,
  Hotel,
  Laptop,
  Megaphone,
  Monitor,
  MoreHorizontal,
  Package,
  Recycle,
  Scale,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Store,
  Truck,
  UtensilsCrossed,
  Warehouse,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { createElement } from "react";

const ICON_MAP: Record<string, LucideIcon> = {
  Building2,
  Store,
  UtensilsCrossed,
  Coffee,
  Hotel,
  ShoppingBag,
  ShoppingCart,
  Warehouse,
  Factory,
  Truck,
  Package,
  Hammer,
  HeartPulse,
  GraduationCap,
  Calculator,
  Scale,
  Home,
  Megaphone,
  Monitor,
  Laptop,
  Briefcase,
  Wrench,
  Recycle,
  Shirt,
  Gem,
  Cpu,
  Car,
  MoreHorizontal,
};

export function getCategoryIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Building2;
  return ICON_MAP[name] ?? Building2;
}

export function CategoryIcon({
  name,
  color,
  className,
}: {
  name?: string | null;
  color?: string | null;
  className?: string;
}) {
  const Icon = getCategoryIcon(name);
  return (
    <span
      className={
        className ??
        "inline-flex size-8 items-center justify-center rounded-md border border-border"
      }
      style={color ? { color, borderColor: `${color}55` } : undefined}
    >
      {createElement(Icon, { className: "size-4", "aria-hidden": true })}
    </span>
  );
}
