"use client";

type OfflineAction = {
  id: string;
  endpoint: string;
  method: "POST" | "PUT" | "PATCH";
  body: unknown;
  createdAt: string;
};

const queueKey = "vitae-offline-actions-v1";

function readQueue(): OfflineAction[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(queueKey) ?? "[]") as OfflineAction[]; } catch { return []; }
}

function writeQueue(actions: OfflineAction[]) {
  window.localStorage.setItem(queueKey, JSON.stringify(actions.slice(-100)));
  window.dispatchEvent(new CustomEvent("vitae-offline-queue", { detail: actions.length }));
}

export function enqueueOfflineAction(endpoint: string, method: OfflineAction["method"], body: unknown) {
  if (typeof window === "undefined") return;
  writeQueue([...readQueue(), { id: crypto.randomUUID(), endpoint, method, body, createdAt: new Date().toISOString() }]);
}

export async function flushOfflineActions() {
  if (typeof window === "undefined" || !window.navigator.onLine) return 0;
  const queued = readQueue();
  const remaining: OfflineAction[] = [];
  let synced = 0;
  for (const action of queued) {
    try {
      const response = await fetch(action.endpoint, {
        method: action.method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(action.body),
      });
      if (response.ok) synced += 1;
      else remaining.push(action);
    } catch { remaining.push(action); }
  }
  writeQueue(remaining);
  return synced;
}

export async function saveTravelPack(urls: string[]) {
  if (!("serviceWorker" in navigator)) throw new Error("Offline saving is not supported in this browser.");
  const registration = await navigator.serviceWorker.ready;
  if (!registration.active) throw new Error("The offline helper is not ready yet. Refresh once and retry.");
  return new Promise<{ cached: number; failed: number }>((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => reject(new Error("Offline saving took too long. Retry while the connection is stable.")), 45_000);
    channel.port1.onmessage = (event) => { window.clearTimeout(timeout); if (event.data?.ok) resolve({ cached: Number(event.data.cached) || 0, failed: Number(event.data.failed) || 0 }); else reject(new Error(event.data?.error ?? "The offline pack could not be saved.")); };
    registration.active?.postMessage({ type: "CACHE_TRAVEL_PACK", urls }, [channel.port2]);
  });
}

export function offlineQueueCount() {
  return readQueue().length;
}
