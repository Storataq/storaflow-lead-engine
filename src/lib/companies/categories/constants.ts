/**
 * Phase 23A — Configurable default company categories.
 * Seeded per organization via ensureDefaultCompanyCategories.
 */

export type DefaultCompanyCategoryDef = {
  name: string;
  slug: string;
  description?: string;
  icon: string;
  color: string;
  sortOrder: number;
};

export const COMPANY_CATEGORY_ICON_OPTIONS = [
  "Building2",
  "Store",
  "UtensilsCrossed",
  "Coffee",
  "Hotel",
  "ShoppingBag",
  "ShoppingCart",
  "Warehouse",
  "Factory",
  "Truck",
  "Package",
  "Hammer",
  "HeartPulse",
  "GraduationCap",
  "Calculator",
  "Scale",
  "Home",
  "Megaphone",
  "Monitor",
  "Laptop",
  "Briefcase",
  "Wrench",
  "Recycle",
  "Shirt",
  "Gem",
  "Cpu",
  "Car",
  "MoreHorizontal",
] as const;

export type CompanyCategoryIconName =
  (typeof COMPANY_CATEGORY_ICON_OPTIONS)[number];

export const COMPANY_CATEGORY_COLOR_OPTIONS = [
  "#0F766E",
  "#0369A1",
  "#4F46E5",
  "#7C3AED",
  "#BE185D",
  "#C2410C",
  "#B45309",
  "#15803D",
  "#334155",
  "#DC2626",
] as const;

/** Default taxonomy — extend this list to change org bootstrap defaults. */
export const DEFAULT_COMPANY_CATEGORIES: DefaultCompanyCategoryDef[] = [
  { name: "Restaurant", slug: "restaurant", icon: "UtensilsCrossed", color: "#C2410C", sortOrder: 10 },
  { name: "Cafe", slug: "cafe", icon: "Coffee", color: "#B45309", sortOrder: 20 },
  { name: "Hotel", slug: "hotel", icon: "Hotel", color: "#0369A1", sortOrder: 30 },
  { name: "Retail Store", slug: "retail-store", icon: "Store", color: "#4F46E5", sortOrder: 40 },
  { name: "Webshop", slug: "webshop", icon: "ShoppingCart", color: "#7C3AED", sortOrder: 50 },
  { name: "Supermarket", slug: "supermarket", icon: "ShoppingBag", color: "#15803D", sortOrder: 60 },
  { name: "Wholesaler", slug: "wholesaler", icon: "Warehouse", color: "#334155", sortOrder: 70 },
  { name: "Manufacturer", slug: "manufacturer", icon: "Factory", color: "#0F766E", sortOrder: 80 },
  { name: "Distributor", slug: "distributor", icon: "Package", color: "#0369A1", sortOrder: 90 },
  { name: "Logistics", slug: "logistics", icon: "Truck", color: "#334155", sortOrder: 100 },
  { name: "Courier", slug: "courier", icon: "Package", color: "#C2410C", sortOrder: 110 },
  { name: "Transport", slug: "transport", icon: "Truck", color: "#0F766E", sortOrder: 120 },
  { name: "Construction", slug: "construction", icon: "Hammer", color: "#B45309", sortOrder: 130 },
  { name: "Healthcare", slug: "healthcare", icon: "HeartPulse", color: "#DC2626", sortOrder: 140 },
  { name: "Education", slug: "education", icon: "GraduationCap", color: "#4F46E5", sortOrder: 150 },
  { name: "Accounting", slug: "accounting", icon: "Calculator", color: "#0369A1", sortOrder: 160 },
  { name: "Legal", slug: "legal", icon: "Scale", color: "#334155", sortOrder: 170 },
  { name: "Real Estate", slug: "real-estate", icon: "Home", color: "#0F766E", sortOrder: 180 },
  { name: "Marketing Agency", slug: "marketing-agency", icon: "Megaphone", color: "#BE185D", sortOrder: 190 },
  { name: "Software Company", slug: "software-company", icon: "Monitor", color: "#4F46E5", sortOrder: 200 },
  { name: "IT Services", slug: "it-services", icon: "Laptop", color: "#0369A1", sortOrder: 210 },
  { name: "Consultancy", slug: "consultancy", icon: "Briefcase", color: "#7C3AED", sortOrder: 220 },
  { name: "Repair Shop", slug: "repair-shop", icon: "Wrench", color: "#C2410C", sortOrder: 230 },
  { name: "Recycling", slug: "recycling", icon: "Recycle", color: "#15803D", sortOrder: 240 },
  { name: "Thrift Store", slug: "thrift-store", icon: "Shirt", color: "#B45309", sortOrder: 250 },
  { name: "Vintage Store", slug: "vintage-store", icon: "Store", color: "#BE185D", sortOrder: 260 },
  { name: "Antique Store", slug: "antique-store", icon: "Gem", color: "#334155", sortOrder: 270 },
  { name: "Electronics", slug: "electronics", icon: "Cpu", color: "#4F46E5", sortOrder: 280 },
  { name: "Automotive", slug: "automotive", icon: "Car", color: "#DC2626", sortOrder: 290 },
  { name: "Other", slug: "other", icon: "MoreHorizontal", color: "#334155", sortOrder: 999 },
];
