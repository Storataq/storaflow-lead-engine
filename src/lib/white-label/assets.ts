/**
 * Asset validation for white-label uploads (SVG/PNG/JPG/WEBP/ICO).
 */

import {
  ALLOWED_ASSET_MIME_TYPES,
  MAX_ASSET_BYTES,
  MAX_ASSET_DIMENSION,
  type WhiteLabelLogoSlot,
} from "@/lib/white-label/constants";

export type AssetValidationResult =
  | {
      ok: true;
      contentType: string;
      byteSize: number;
      widthPx?: number;
      heightPx?: number;
    }
  | { ok: false; message: string };

export function validateAssetMeta(input: {
  contentType: string;
  byteSize: number;
  widthPx?: number | null;
  heightPx?: number | null;
  slot?: WhiteLabelLogoSlot;
}): AssetValidationResult {
  const type = input.contentType.toLowerCase().trim();
  if (
    !ALLOWED_ASSET_MIME_TYPES.includes(
      type as (typeof ALLOWED_ASSET_MIME_TYPES)[number],
    )
  ) {
    return {
      ok: false,
      message: "Unsupported file type. Use SVG, PNG, JPG, WEBP, or ICO.",
    };
  }
  if (input.byteSize <= 0 || input.byteSize > MAX_ASSET_BYTES) {
    return {
      ok: false,
      message: `File must be between 1 byte and ${MAX_ASSET_BYTES / 1024} KB.`,
    };
  }
  if (
    input.widthPx != null &&
    (input.widthPx < 1 || input.widthPx > MAX_ASSET_DIMENSION)
  ) {
    return { ok: false, message: "Image width is out of allowed range." };
  }
  if (
    input.heightPx != null &&
    (input.heightPx < 1 || input.heightPx > MAX_ASSET_DIMENSION)
  ) {
    return { ok: false, message: "Image height is out of allowed range." };
  }
  if (input.slot === "favicon" && input.widthPx && input.widthPx > 512) {
    return {
      ok: false,
      message: "Favicon should be 512×512 or smaller.",
    };
  }
  return {
    ok: true,
    contentType: type,
    byteSize: input.byteSize,
    widthPx: input.widthPx ?? undefined,
    heightPx: input.heightPx ?? undefined,
  };
}

export function isHttpOrDataUrl(url: string): boolean {
  const v = url.trim();
  if (!v) return false;
  if (v.startsWith("data:image/")) return true;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export function estimateDataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return dataUrl.length;
  const b64 = dataUrl.slice(comma + 1);
  return Math.floor((b64.length * 3) / 4);
}
