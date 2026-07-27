/**
 * Phase 23B — Company category classification confidence + keyword lexicon.
 */

export const CLASSIFICATION_CONFIDENCE = {
  autoSelectMin: 95,
  needsConfirmationMin: 80,
  possibleMin: 50,
} as const;

export type ConfidenceBand =
  | "auto_select"
  | "needs_confirmation"
  | "possible"
  | "unknown";

export function confidenceBandFromScore(score: number): ConfidenceBand {
  if (score >= CLASSIFICATION_CONFIDENCE.autoSelectMin) return "auto_select";
  if (score >= CLASSIFICATION_CONFIDENCE.needsConfirmationMin) {
    return "needs_confirmation";
  }
  if (score >= CLASSIFICATION_CONFIDENCE.possibleMin) return "possible";
  return "unknown";
}

/** Keyword lexicon keyed by default category slug. */
export const CATEGORY_KEYWORD_LEXICON: Record<string, string[]> = {
  restaurant: [
    "restaurant", "menu", "diner", "dining", "chef", "reservation",
    "opening hours", "gastronomy", "bistro", "brasserie", "eetcafe",
  ],
  cafe: [
    "cafe", "café", "coffee", "espresso", "latte", "bakery cafe",
    "koffie", "tearoom", "coffee shop",
  ],
  hotel: [
    "hotel", "hostel", "booking", "check-in", "rooms", "suite",
    "accommodation", "overnight", "guesthouse",
  ],
  "retail-store": [
    "store", "shop", "retail", "boutique", "showroom", "in-store",
    "winkel",
  ],
  webshop: [
    "webshop", "ecommerce", "e-commerce", "online store", "add to cart",
    "shipping", "checkout", "shopify", "woocommerce",
  ],
  supermarket: [
    "supermarket", "grocery", "groceries", "supermarkt", "hypermarkt",
  ],
  wholesaler: ["wholesale", "wholesaler", "b2b supply", "groothandel"],
  manufacturer: [
    "manufacturer", "manufacturing", "factory", "production", "fabriek",
    "made in",
  ],
  distributor: ["distributor", "distribution", "dealer network"],
  logistics: ["logistics", "warehousing", "fulfillment", "logistiek"],
  courier: ["courier", "parcel", "express delivery", "koerier"],
  transport: ["transport", "freight", "trucking", "haulage", "vervoer"],
  construction: [
    "construction", "bouw", "contractor", "renovation", "building company",
  ],
  healthcare: [
    "healthcare", "clinic", "medical", "hospital", "zorg", "dentist",
    "pharmacy", "apotheek",
  ],
  education: [
    "school", "university", "education", "training", "academy", "onderwijs",
  ],
  accounting: [
    "accounting", "bookkeeping", "accountant", "boekhoud", "tax advisory",
  ],
  legal: ["law firm", "attorney", "legal", "advocaat", "notary", "notaris"],
  "real-estate": [
    "real estate", "realtor", "property", "makelaar", "vastgoed", "rentals",
  ],
  "marketing-agency": [
    "marketing agency", "advertising", "seo agency", "social media agency",
    "branding agency",
  ],
  "software-company": [
    "software", "saas", "platform", "app development", "product company",
  ],
  "it-services": [
    "it services", "managed services", "msp", "system integrator",
    "helpdesk", "it support",
  ],
  consultancy: [
    "consultancy", "consulting", "advisory", "adviseurs", "strategy firm",
  ],
  "repair-shop": ["repair", "service center", "fix shop", "reparatie"],
  recycling: ["recycling", "recycle", "waste management", "kringloop"],
  "thrift-store": ["thrift", "second hand", "tweedehands", "charity shop"],
  "vintage-store": ["vintage", "retro store"],
  "antique-store": ["antique", "antiques", "antiek"],
  electronics: ["electronics", "consumer electronics", "elektronica"],
  automotive: [
    "automotive", "car dealer", "garage", "auto", "vehicle", "autobedrijf",
  ],
  other: [],
};
