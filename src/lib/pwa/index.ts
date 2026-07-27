/**
 * Phase 26H — PWA public surface (client-safe).
 */

export {
  PWA_UI,
  PWA_CACHE_VERSION,
  MOBILE_BOTTOM_NAV,
  PWA_PUSH_TYPE_LABELS,
  PWA_OFFLINE_ACTION_LABELS,
} from "@/lib/pwa/constants";

export {
  enqueueOfflineAction,
  listOfflineQueue,
  flushOfflineQueue,
} from "@/lib/pwa/offline-queue";

export { shareNative, buildEntityShareUrl } from "@/lib/pwa/share";

export {
  detectDeviceCapabilities,
  CAMERA_EXTENSION_POINTS,
  requestNotificationPermission,
} from "@/lib/pwa/device";

export {
  registerServiceWorker,
  promptPwaInstall,
  isStandaloneDisplay,
} from "@/lib/pwa/register";
