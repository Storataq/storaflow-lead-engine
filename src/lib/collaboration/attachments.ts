/**
 * Attachment validation + virus-scan ready metadata.
 */

import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_BYTES,
} from "@/lib/collaboration/constants";

export type AttachmentValidation =
  | {
      ok: true;
      contentType: string;
      byteSize: number;
      virusScanStatus: "pending" | "skipped";
    }
  | { ok: false; message: string };

export function validateAttachmentMeta(input: {
  contentType: string;
  byteSize: number;
  fileName?: string;
}): AttachmentValidation {
  const type = input.contentType.toLowerCase().trim();
  if (
    !ALLOWED_ATTACHMENT_MIME_TYPES.includes(
      type as (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number],
    )
  ) {
    return {
      ok: false,
      message: "Unsupported file type.",
    };
  }
  if (input.byteSize <= 0 || input.byteSize > MAX_ATTACHMENT_BYTES) {
    return {
      ok: false,
      message: `File must be between 1 byte and ${MAX_ATTACHMENT_BYTES / (1024 * 1024)} MB.`,
    };
  }
  const name = input.fileName?.toLowerCase() ?? "";
  if (name.endsWith(".exe") || name.endsWith(".bat") || name.endsWith(".cmd")) {
    return { ok: false, message: "Executable files are not allowed." };
  }
  return {
    ok: true,
    contentType: type,
    byteSize: input.byteSize,
    virusScanStatus: "pending",
  };
}

export function isHttpOrDataUrl(url: string): boolean {
  const v = url.trim();
  if (!v) return false;
  if (v.startsWith("data:")) return true;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
