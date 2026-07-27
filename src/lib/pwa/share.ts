/**
 * Native share + clipboard helpers.
 */

export type SharePayload = {
  title: string;
  text?: string;
  url: string;
};

export async function shareNative(
  payload: SharePayload,
): Promise<"shared" | "copied" | "unsupported"> {
  if (typeof navigator === "undefined") return "unsupported";

  const url =
    payload.url.startsWith("http") || typeof window === "undefined"
      ? payload.url
      : new URL(payload.url, window.location.origin).toString();

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url,
      });
      return "shared";
    } catch {
      // user cancelled or failed — fall through to copy
    }
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return "copied";
  }

  return "unsupported";
}

export function buildEntityShareUrl(
  kind: "company" | "contact" | "deal" | "report",
  id: string,
  origin?: string,
): string {
  const base =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : "");
  const paths: Record<typeof kind, string> = {
    company: `/companies/${id}`,
    contact: `/crm/contacts/${id}`,
    deal: `/crm/deals/${id}`,
    report: `/crm/executive`,
  };
  return `${base}${paths[kind]}`;
}
