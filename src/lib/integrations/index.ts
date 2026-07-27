/**
 * Phase 25I — Integrations Marketplace public surface (client-safe).
 */

export {
  INTEGRATION_CATEGORIES,
  INTEGRATION_CATEGORY_LABELS,
  CONNECTION_STATUSES,
  CONNECTION_STATUS_LABELS,
  HEALTH_STATUS_LABELS,
  SYNC_MODE_LABELS,
  SYNC_RUN_STATUS_LABELS,
  SYNC_ERROR_LABELS,
  MARKETPLACE_SORTS,
  MARKETPLACE_SORT_LABELS,
} from "@/lib/integrations/constants";

export {
  INTEGRATION_CATALOG,
  getIntegrationManifest,
  listIntegrationCatalog,
} from "@/lib/integrations/catalog";

export type {
  IntegrationManifest,
  IntegrationPlugin,
  IntegrationFeature,
  IntegrationConnectionRow,
  IntegrationSyncRunRow,
} from "@/lib/integrations/types";
