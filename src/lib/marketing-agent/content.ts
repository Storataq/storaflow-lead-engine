/**
 * Email, social, and long-form content generation.
 */

import {
  SOCIAL_CHANNEL_LABELS,
  type ContentType,
  type SocialChannel,
} from "@/lib/marketing-agent/constants";
import type { GeneratedEmail, SocialPost } from "@/lib/marketing-agent/types";

export function generateMarketingEmail(params: {
  topic: string;
  campaignType?: string | null;
  brandVoice?: string | null;
  tone?: string | null;
}): GeneratedEmail {
  const topic = params.topic.trim() || "Storaflow update";
  const voice = params.brandVoice?.trim() || "professional";
  const tone = params.tone?.trim() || "helpful";
  const type = params.campaignType?.trim() || "campaign";

  const subject = `${topic}: de volgende stap voor {{company}}`;
  const previewText = `${tone} tip over ${topic} — 2 minuten lezen`;
  const cta = "Plan een korte demo";
  const body = [
    `Beste {{first_name}},`,
    ``,
    `Voor {{company}} in {{industry}} delen we een ${tone} update over ${topic}.`,
    `Onze toon is ${voice}; focus op resultaat, niet op hype.`,
    ``,
    `Waarom nu:`,
    `- Snellere opvolging van warme leads`,
    `- Duidelijke CTA en meetbare next step`,
    `- Aansluiting op jullie CRM-proces`,
    ``,
    `${cta} → {{cta_url}}`,
    ``,
    `Met vriendelijke groet,`,
    `{{sender_name}}`,
  ].join("\n");

  const variants = [
    {
      subject: `Snel vraagje over ${topic}`,
      body: `Beste {{first_name}},\n\nMag ik 10 minuten om ${topic} te bespreken voor {{company}}?\n\nGroet,\n{{sender_name}}`,
    },
    {
      subject: `${topic} — case voor {{industry}}`,
      body: `Beste {{first_name}},\n\nWe hielpen een vergelijkbaar team in {{industry}} met ${topic}.\nZal ik de aanpak delen?\n\nGroet,\n{{sender_name}}`,
    },
  ];

  return {
    subject,
    previewText,
    body,
    cta,
    followUp: `Follow-up ${type}: heb je de update over ${topic} kunnen bekijken?`,
    reminder: `Herinnering: openstaand punt rond ${topic} voor {{company}}.`,
    closing: "Ik hoor graag wat de beste volgende stap is.",
    signature: "{{sender_name}} · Storaflow",
    variants,
  };
}

export function generateSocialContent(params: {
  topic: string;
  channel: SocialChannel;
  brandVoice?: string | null;
}): SocialPost {
  const topic = params.topic.trim() || "Storaflow";
  const voice = params.brandVoice?.trim() || "professional";
  const channelLabel = SOCIAL_CHANNEL_LABELS[params.channel];

  const bodies: Record<SocialChannel, string> = {
    linkedin: `${topic}: hoe teams pipeline en nurturing strakker maken.\n\nToon: ${voice}. Wat is jullie grootste bottleneck deze maand?`,
    facebook: `Nieuw: ${topic}. Praktische tips om meer leads om te zetten — toon ${voice}.`,
    instagram: `${topic} ✨\nKorte tip voor marketers die resultaat willen.\n#${topic.replace(/\s+/g, "")}`,
    x: `${topic}: 1 tip, 1 CTA, geen fluff. Klaar voor een snellere funnel?`,
    threads: `Thread over ${topic} — wat werkt écht in B2B nurturing.`,
    tiktok: `Hook: stop met generieke emails.\nPoint: ${topic}\nCTA: probeer onze checklist.`,
    youtube: `Script outline: ${topic}\n1) Probleem 2) Bewijs 3) Demo CTA`,
    blog: `# ${topic}\n\nIntroductie, 3 inzichten, checklist, CTA. Toon: ${voice}.`,
    newsletter: `In deze editie: ${topic}, 1 case, 1 tip, 1 CTA.`,
  };

  return {
    channel: params.channel,
    title: `${channelLabel}: ${topic}`,
    body: bodies[params.channel],
    cta: "Meer weten",
    hashtags: ["Storaflow", "B2B", "Marketing", topic.replace(/\s+/g, "")].slice(
      0,
      4,
    ),
  };
}

export function generateLongFormContent(params: {
  topic: string;
  contentType: ContentType;
  brandVoice?: string | null;
}): { title: string; body: string; cta: string; aiScore: number } {
  const topic = params.topic.trim() || "Storaflow";
  const voice = params.brandVoice?.trim() || "professional";
  const type = params.contentType;

  const titles: Partial<Record<ContentType, string>> = {
    blog: `Blog: ${topic} — praktische gids`,
    news: `Nieuws: ${topic}`,
    case_study: `Case study: resultaten met ${topic}`,
    product_update: `Product update: ${topic}`,
    faq: `FAQ: ${topic}`,
    guide: `Handleiding: ${topic}`,
    whitepaper: `Whitepaper: ${topic}`,
    landing: `Landing page copy: ${topic}`,
    ad: `Advertentietekst: ${topic}`,
    seo: `SEO content: ${topic}`,
    newsletter: `Nieuwsbrief: ${topic}`,
    cta: `CTA-varianten: ${topic}`,
    prompt: `Prompt library: ${topic}`,
    email: `Email: ${topic}`,
    social: `Social: ${topic}`,
  };

  const body = [
    `# ${titles[type] ?? topic}`,
    ``,
    `Doel: waarde leveren rond ${topic} in een ${voice} toon.`,
    ``,
    `## Kernpunten`,
    `1. Probleem en impact`,
    `2. Aanpak / oplossing`,
    `3. Bewijs / voorbeeld`,
    `4. Duidelijke next step`,
    ``,
    `## CTA`,
    `Plan een gesprek of download de checklist.`,
  ].join("\n");

  return {
    title: titles[type] ?? topic,
    body,
    cta: "Plan demo",
    aiScore: 62 + (topic.length > 8 ? 8 : 0),
  };
}
