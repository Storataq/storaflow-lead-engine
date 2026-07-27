/**
 * Client-side offline outbox (IndexedDB). Syncs when online.
 */

import type { PwaOfflineActionType } from "@/lib/pwa/constants";

const DB_NAME = "storaflow-pwa";
const DB_VERSION = 1;
const STORE = "offline_queue";

export type OfflineQueueItem = {
  id: string;
  clientId: string;
  actionType: PwaOfflineActionType;
  payload: Record<string, unknown>;
  createdAt: string;
  status: "queued" | "syncing" | "failed";
  error?: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IDB open failed"));
  });
}

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `q_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export async function enqueueOfflineAction(input: {
  actionType: PwaOfflineActionType;
  payload: Record<string, unknown>;
}): Promise<OfflineQueueItem> {
  const item: OfflineQueueItem = {
    id: uuid(),
    clientId: uuid(),
    actionType: input.actionType,
    payload: input.payload,
    createdAt: new Date().toISOString(),
    status: "queued",
  };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return item;
}

export async function listOfflineQueue(): Promise<OfflineQueueItem[]> {
  try {
    const db = await openDb();
    const items = await new Promise<OfflineQueueItem[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result as OfflineQueueItem[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
}

export async function removeOfflineItem(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function clearSyncedOfflineItems(
  ids: string[],
): Promise<void> {
  for (const id of ids) {
    await removeOfflineItem(id);
  }
}

/** Flush queue to server sync endpoint when online. */
export async function flushOfflineQueue(): Promise<{
  synced: number;
  failed: number;
}> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }
  const items = await listOfflineQueue();
  let synced = 0;
  let failed = 0;
  for (const item of items) {
    if (item.status === "syncing") continue;
    try {
      const res = await fetch("/api/pwa/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: item.clientId,
          actionType: item.actionType,
          payload: item.payload,
          createdAt: item.createdAt,
        }),
      });
      if (res.ok) {
        await removeOfflineItem(item.id);
        synced += 1;
      } else {
        failed += 1;
      }
    } catch {
      failed += 1;
    }
  }
  return { synced, failed };
}
