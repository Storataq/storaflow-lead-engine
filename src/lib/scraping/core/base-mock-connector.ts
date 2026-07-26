/**
 * Base mock connector — all registered connectors extend this for now.
 * Live implementations will replace searchPage() without changing the registry API.
 */

import { generateMockCompanies } from "@/lib/scraping/mock/generate-companies";
import type {
  Connector,
  ConnectorJob,
  ConnectorManifest,
  ConnectorSearchPage,
} from "@/lib/scraping/types/connector";

export abstract class BaseMockConnector implements Connector {
  abstract readonly manifest: ConnectorManifest;

  async searchPage(job: ConnectorJob): Promise<ConnectorSearchPage> {
    const items = generateMockCompanies({
      sourceCode: this.manifest.code,
      job,
      count: job.pageSize,
    });

    return {
      sourceCode: this.manifest.code,
      items,
      hasMore: true,
      progress: {
        percent: Math.min(100, (job.pageIndex + 1) * 20),
        message: `Mock page ${job.pageIndex + 1}`,
        processed: items.length,
      },
      meta: { mock: true, mode: this.manifest.mode },
    };
  }

  async healthCheck() {
    return this.manifest.health;
  }
}
