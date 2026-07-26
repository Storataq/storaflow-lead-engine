# Storaflow Worker (Phase 20B)

The live scraper uses the existing queue + **Scraper Engine**.

## Current execution modes

1. **Dev / UI (default)** — open `/jobs/[id]`; `JobRunnerControls` polls `advanceMockScrapeAction`, which runs `JobExecutor` → `ScraperEngine` (mock or OpenStreetMap live).
2. **In-process worker helper** — `processNextQueuedJob(supabase, organizationId)` claims one queued job and advances it to completion.

## First live connector

`openstreetmap` — Nominatim HTTP search (no API key). Rate-limited (~1 req/s) with identifying User-Agent.

Mock (`mock`) and Google Maps MVP mock (`google_maps`) remain available.

## Future

A long-running Node process can loop:

```ts
import { createClient } from "@supabase/supabase-js";
import { processNextQueuedJob } from "../src/lib/jobs/workers";

// use service role — never expose to the browser
while (true) {
  const result = await processNextQueuedJob(supabase, organizationId);
  if (result.idle) await sleep(2000);
}
```

No separate worker binary is required for Phase 20B — the UI poll path is production-capable for single-tenant use.
