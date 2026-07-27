/**
 * Phase 26B — Platform API public surface (client-safe).
 */

export {
  API_PERMISSION_TIERS,
  API_PERMISSION_TIER_LABELS,
  API_KEY_STATUSES,
  API_KEY_STATUS_LABELS,
  API_SCOPES,
  API_SCOPE_LABELS,
  PLATFORM_WEBHOOK_EVENTS,
  PLATFORM_WEBHOOK_EVENT_LABELS,
  WEBHOOK_STATUSES,
  WEBHOOK_STATUS_LABELS,
  DELIVERY_STATUS_LABELS,
  BULK_OPERATION_LABELS,
  API_ERROR_LABELS,
  SDK_TARGETS,
  CURRENT_API_VERSION,
} from "@/lib/platform-api/constants";

export { hasScope, scopesForTier } from "@/lib/platform-api/scopes";
export type {
  PlatformApiKeyPublic,
  PlatformWebhookPublic,
} from "@/lib/platform-api/types";
