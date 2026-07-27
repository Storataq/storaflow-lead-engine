/**
 * Phase 27D — AI Marketing Agent constants (client-safe).
 */

export const MARKETING_AGENT_SLUG = "storaflow-marketing-agent";
export const MARKETING_AGENT_VERSION = "1.0.0";

export const MARKETING_CAMPAIGN_TYPES = [
  "product_launch",
  "lead_nurturing",
  "cold_outreach",
  "re_engagement",
  "newsletter",
  "event",
  "promotion",
  "upsell",
  "cross_sell",
  "renewal",
  "custom",
] as const;

export type MarketingCampaignType = (typeof MARKETING_CAMPAIGN_TYPES)[number];

export const MARKETING_CAMPAIGN_TYPE_LABELS: Record<MarketingCampaignType, string> = {
  product_launch: "Product Launch",
  lead_nurturing: "Lead Nurturing",
  cold_outreach: "Cold Outreach",
  re_engagement: "Re-engagement",
  newsletter: "Newsletter",
  event: "Event",
  promotion: "Promotion",
  upsell: "Upsell",
  cross_sell: "Cross-sell",
  renewal: "Renewal",
  custom: "Custom",
};

export const MARKETING_CHANNELS = [
  "email",
  "social",
  "landing",
  "multi",
  "blog",
  "ads",
] as const;

export type MarketingChannel = (typeof MARKETING_CHANNELS)[number];

export const SEGMENT_CODES = [
  "new_leads",
  "warm_leads",
  "hot_prospects",
  "inactive_customers",
  "enterprise",
  "vip",
  "high_revenue_potential",
  "low_activity",
  "new_customers",
  "loyal_customers",
  "custom",
] as const;

export type SegmentCode = (typeof SEGMENT_CODES)[number];

export const SEGMENT_CODE_LABELS: Record<SegmentCode, string> = {
  new_leads: "Nieuwe leads",
  warm_leads: "Warme leads",
  hot_prospects: "Hot prospects",
  inactive_customers: "Inactieve klanten",
  enterprise: "Enterprise",
  vip: "VIP",
  high_revenue_potential: "Hoog omzetpotentieel",
  low_activity: "Lage activiteit",
  new_customers: "Nieuwe klanten",
  loyal_customers: "Trouwe klanten",
  custom: "Custom",
};

export const CONTENT_TYPES = [
  "email",
  "social",
  "blog",
  "news",
  "case_study",
  "product_update",
  "faq",
  "guide",
  "whitepaper",
  "landing",
  "ad",
  "seo",
  "newsletter",
  "cta",
  "prompt",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export const SOCIAL_CHANNELS = [
  "linkedin",
  "facebook",
  "instagram",
  "x",
  "threads",
  "tiktok",
  "youtube",
  "blog",
  "newsletter",
] as const;

export type SocialChannel = (typeof SOCIAL_CHANNELS)[number];

export const SOCIAL_CHANNEL_LABELS: Record<SocialChannel, string> = {
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
  x: "X",
  threads: "Threads",
  tiktok: "TikTok",
  youtube: "YouTube",
  blog: "Blog",
  newsletter: "Nieuwsbrief",
};

export const AB_TEST_TYPES = [
  "subject",
  "cta",
  "image",
  "copy",
  "button",
  "color",
  "landing",
  "timing",
] as const;

export type AbTestType = (typeof AB_TEST_TYPES)[number];

export const RECOMMENDATION_TYPES = [
  "send_time",
  "audience",
  "subject",
  "cta",
  "channel",
  "frequency",
  "campaign",
  "optimization",
] as const;

export type RecommendationType = (typeof RECOMMENDATION_TYPES)[number];

export const MARKETING_UI = {
  hubTitle: "AI Marketing",
  overviewTitle: "Overview",
  campaignsTitle: "Campaigns",
  audienceTitle: "Audience",
  segmentsTitle: "Segments",
  emailTitle: "Email",
  landingTitle: "Landing Pages",
  automationTitle: "Automation",
  contentTitle: "Content",
  abTestsTitle: "A/B Tests",
  analyticsTitle: "Analytics",
  recommendationsTitle: "Recommendations",
  historyTitle: "History",
  settingsTitle: "Settings",
} as const;

export const MARKETING_NAV = [
  { href: "/marketing", label: MARKETING_UI.overviewTitle },
  { href: "/marketing/campaigns", label: MARKETING_UI.campaignsTitle },
  { href: "/marketing/audience", label: MARKETING_UI.audienceTitle },
  { href: "/marketing/segments", label: MARKETING_UI.segmentsTitle },
  { href: "/marketing/email", label: MARKETING_UI.emailTitle },
  { href: "/marketing/landing-pages", label: MARKETING_UI.landingTitle },
  { href: "/marketing/automation", label: MARKETING_UI.automationTitle },
  { href: "/marketing/content", label: MARKETING_UI.contentTitle },
  { href: "/marketing/ab-tests", label: MARKETING_UI.abTestsTitle },
  { href: "/marketing/analytics", label: MARKETING_UI.analyticsTitle },
  { href: "/marketing/recommendations", label: MARKETING_UI.recommendationsTitle },
  { href: "/marketing/history", label: MARKETING_UI.historyTitle },
  { href: "/marketing/settings", label: MARKETING_UI.settingsTitle },
] as const;
