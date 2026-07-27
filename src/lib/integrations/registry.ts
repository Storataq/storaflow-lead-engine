/**
 * Plugin registry — register adapters without touching core marketplace UI.
 */

import { getIntegrationManifest } from "@/lib/integrations/catalog";
import type {
  IntegrationPlugin,
  IntegrationSyncAdapter,
  SyncAdapterResult,
} from "@/lib/integrations/types";

const plugins = new Map<string, IntegrationPlugin>();

function stubSync(code: string): IntegrationSyncAdapter {
  return {
    async run(): Promise<SyncAdapterResult> {
      // Provider adapters are extension points — simulate a healthy empty sync
      return {
        imported: 0,
        exported: 0,
        warnings: [
          `${code}: live provider adapter not configured yet — sync scaffolding OK.`,
        ],
        cursor: { stub: true, at: new Date().toISOString() },
      };
    },
  };
}

export function registerIntegrationPlugin(plugin: IntegrationPlugin): void {
  plugins.set(plugin.manifest.code, plugin);
}

export function getIntegrationPlugin(code: string): IntegrationPlugin | null {
  const existing = plugins.get(code);
  if (existing) return existing;
  const manifest = getIntegrationManifest(code);
  if (!manifest) return null;
  return { manifest, sync: stubSync(code) };
}

export function listRegisteredPlugins(): IntegrationPlugin[] {
  return [...plugins.values()];
}

/** Bootstrap default stubs for catalog entries */
export function bootstrapIntegrationPlugins(): void {
  // Lazy: plugins resolve via getIntegrationPlugin even if not pre-registered
}
