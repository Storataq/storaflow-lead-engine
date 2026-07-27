/**
 * Device capability scaffolds — camera, mic, location, biometric, file picker.
 * Permissions-Policy must allow features when enabling live APIs.
 */

export type DeviceCapability =
  | "clipboard"
  | "location"
  | "camera"
  | "microphone"
  | "biometric"
  | "file_picker"
  | "share"
  | "notifications"
  | "vibration";

export function detectDeviceCapabilities(): Record<
  DeviceCapability,
  boolean
> {
  if (typeof window === "undefined") {
    return {
      clipboard: false,
      location: false,
      camera: false,
      microphone: false,
      biometric: false,
      file_picker: false,
      share: false,
      notifications: false,
      vibration: false,
    };
  }
  return {
    clipboard: Boolean(navigator.clipboard?.writeText),
    location: "geolocation" in navigator,
    camera: Boolean(navigator.mediaDevices?.getUserMedia),
    microphone: Boolean(navigator.mediaDevices?.getUserMedia),
    biometric:
      typeof window.PublicKeyCredential !== "undefined" ||
      Boolean(navigator.credentials),
    file_picker: true,
    share: typeof navigator.share === "function",
    notifications: "Notification" in window,
    vibration: typeof navigator.vibrate === "function",
  };
}

/** Future: document capture / business card / QR / barcode. */
export const CAMERA_EXTENSION_POINTS = [
  "document_capture",
  "business_card_scanner",
  "qr_scanner",
  "barcode_scanner",
  "photo_upload",
] as const;

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}
