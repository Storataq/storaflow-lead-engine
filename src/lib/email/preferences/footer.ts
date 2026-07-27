/**
 * Compliant footer + header injection for non-essential outbound email.
 */

import { FOOTER_VERSION } from "@/lib/email/preferences/constants";

export type FooterInjectionInput = {
  htmlBody: string;
  textBody: string | null;
  organizationName: string;
  postalAddress: string | null;
  preferenceCenterUrl: string;
  unsubscribeUrl: string;
  privacyPolicyUrl: string | null;
  termsUrl: string | null;
  categoryLabel?: string | null;
  language?: string | null;
};

export type FooterInjectionResult = {
  htmlBody: string;
  textBody: string | null;
  footerHtml: string;
  footerVersion: string;
  alreadyHadFooter: boolean;
};

const FOOTER_MARKER = "data-storaflow-email-footer";

function t(language: string | null | undefined, key: string): string {
  const lang = (language ?? "en").toLowerCase().startsWith("nl") ? "nl" : "en";
  const dict: Record<string, Record<string, string>> = {
    en: {
      unsubscribe: "Unsubscribe",
      preferences: "Manage preferences",
      privacy: "Privacy policy",
      terms: "Terms",
      category: "Category",
      sentBy: "Sent by",
    },
    nl: {
      unsubscribe: "Afmelden",
      preferences: "Voorkeuren beheren",
      privacy: "Privacybeleid",
      terms: "Voorwaarden",
      category: "Categorie",
      sentBy: "Verzonden door",
    },
  };
  return dict[lang][key] ?? dict.en[key] ?? key;
}

export function injectCompliantFooter(
  input: FooterInjectionInput,
): FooterInjectionResult {
  if (input.htmlBody.includes(FOOTER_MARKER)) {
    return {
      htmlBody: input.htmlBody,
      textBody: input.textBody,
      footerHtml: "",
      footerVersion: FOOTER_VERSION,
      alreadyHadFooter: true,
    };
  }

  const lines: string[] = [];
  lines.push(`${t(input.language, "sentBy")} ${input.organizationName}`);
  if (input.postalAddress) lines.push(input.postalAddress);
  if (input.categoryLabel) {
    lines.push(`${t(input.language, "category")}: ${input.categoryLabel}`);
  }

  const footerHtml = `
<div ${FOOTER_MARKER}="1" style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.5;color:#6b7280;">
  <p style="margin:0 0 8px 0;">${lines.map((l) => escapeHtml(l)).join("<br/>")}</p>
  <p style="margin:0;">
    <a href="${escapeAttr(input.unsubscribeUrl)}">${escapeHtml(t(input.language, "unsubscribe"))}</a>
    &nbsp;·&nbsp;
    <a href="${escapeAttr(input.preferenceCenterUrl)}">${escapeHtml(t(input.language, "preferences"))}</a>
    ${
      input.privacyPolicyUrl
        ? `&nbsp;·&nbsp;<a href="${escapeAttr(input.privacyPolicyUrl)}">${escapeHtml(t(input.language, "privacy"))}</a>`
        : ""
    }
    ${
      input.termsUrl
        ? `&nbsp;·&nbsp;<a href="${escapeAttr(input.termsUrl)}">${escapeHtml(t(input.language, "terms"))}</a>`
        : ""
    }
  </p>
</div>`.trim();

  const footerText = [
    "",
    "---",
    ...lines,
    `${t(input.language, "unsubscribe")}: ${input.unsubscribeUrl}`,
    `${t(input.language, "preferences")}: ${input.preferenceCenterUrl}`,
    input.privacyPolicyUrl
      ? `${t(input.language, "privacy")}: ${input.privacyPolicyUrl}`
      : null,
    input.termsUrl ? `${t(input.language, "terms")}: ${input.termsUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const htmlBody = /<\/body>/i.test(input.htmlBody)
    ? input.htmlBody.replace(/<\/body>/i, `${footerHtml}</body>`)
    : `${input.htmlBody}\n${footerHtml}`;

  const textBody = input.textBody
    ? `${input.textBody}\n${footerText}`
    : footerText;

  return {
    htmlBody,
    textBody,
    footerHtml,
    footerVersion: FOOTER_VERSION,
    alreadyHadFooter: false,
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
