/**
 * HTML sanitization + plain-text generation for email templates.
 * Lightweight, deterministic — no DOM dependency.
 */

export type HtmlValidationIssue = {
  code:
    | "script_tag"
    | "inline_js"
    | "unsafe_tag"
    | "broken_link"
    | "large_image"
    | "invalid_format"
    | "broken_html";
  severity: "error" | "warning";
  message: string;
};

const UNSAFE_TAGS = [
  "script",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "button",
  "link",
  "meta",
  "base",
];

export function sanitizeEmailHtml(html: string): string {
  let out = html;
  for (const tag of UNSAFE_TAGS) {
    const block = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
    const selfClosing = new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi");
    out = out.replace(block, "");
    out = out.replace(selfClosing, "");
  }
  // event handlers
  out = out.replace(/\son[a-z]+\s*=\s*(["'])[\s\S]*?\1/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");
  // javascript: URLs
  out = out.replace(
    /(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi,
    '$1="#"',
  );
  return out;
}

export function validateEmailHtml(html: string): HtmlValidationIssue[] {
  const issues: HtmlValidationIssue[] = [];
  if (/<script\b/i.test(html)) {
    issues.push({
      code: "script_tag",
      severity: "error",
      message: "Script tags are not allowed in email HTML",
    });
  }
  if (/\son[a-z]+\s*=/i.test(html) || /javascript:/i.test(html)) {
    issues.push({
      code: "inline_js",
      severity: "error",
      message: "Inline JavaScript / javascript: URLs are not allowed",
    });
  }
  for (const tag of ["iframe", "object", "embed", "form"]) {
    if (new RegExp(`<${tag}\\b`, "i").test(html)) {
      issues.push({
        code: "unsafe_tag",
        severity: "error",
        message: `Unsafe tag <${tag}> is not allowed`,
      });
    }
  }

  const hrefs = [...html.matchAll(/href\s*=\s*(["'])(.*?)\1/gi)];
  for (const match of hrefs) {
    const url = (match[2] ?? "").trim();
    if (!url || url === "#") continue;
    if (
      !/^(https?:|mailto:|tel:|\{\{)/i.test(url) &&
      !url.startsWith("/")
    ) {
      issues.push({
        code: "broken_link",
        severity: "warning",
        message: `Suspicious or unsupported link: ${url.slice(0, 80)}`,
      });
    }
  }

  const images = [...html.matchAll(/<img\b[^>]*>/gi)];
  for (const match of images) {
    const tag = match[0];
    if (!/\bsrc\s*=/i.test(tag)) {
      issues.push({
        code: "large_image",
        severity: "warning",
        message: "Image tag missing src attribute",
      });
    }
    // Heuristic: data URIs can be huge
    const dataUri = tag.match(/src\s*=\s*(["'])(data:image\/[^"']+)\1/i);
    if (dataUri && (dataUri[2]?.length ?? 0) > 100_000) {
      issues.push({
        code: "large_image",
        severity: "warning",
        message: "Embedded data-URI image is very large (>100KB)",
      });
    }
  }

  const openTags = (html.match(/<[a-zA-Z][^>/]*>/g) ?? []).length;
  const closeTags = (html.match(/<\/[a-zA-Z]+>/g) ?? []).length;
  if (html.includes("<") && Math.abs(openTags - closeTags) > 8) {
    issues.push({
      code: "broken_html",
      severity: "warning",
      message: "HTML may be unbalanced (open/close tag count differs significantly)",
    });
  }

  if (/<\s+[a-z]/i.test(html)) {
    issues.push({
      code: "invalid_format",
      severity: "warning",
      message: "Possible invalid HTML tag formatting detected",
    });
  }

  return issues;
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
