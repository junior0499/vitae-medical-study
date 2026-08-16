"use client";

import { useEffect, useState } from "react";
import { flushOfflineActions, offlineQueueCount } from "@/lib/offline-client";

export function OfflineManager() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [queued, setQueued] = useState(() => typeof window === "undefined" ? 0 : offlineQueueCount());

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const sync = () => { setOnline(true); flushOfflineActions().then(() => setQueued(offlineQueueCount())).catch(() => undefined); };
    const offline = () => setOnline(false);
    const queueChanged = () => setQueued(offlineQueueCount());
    window.addEventListener("online", sync);
    window.addEventListener("offline", offline);
    window.addEventListener("vitae-offline-queue", queueChanged);
    if (window.navigator.onLine) flushOfflineActions().then(() => setQueued(offlineQueueCount())).catch(() => undefined);
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", offline); window.removeEventListener("vitae-offline-queue", queueChanged); };
  }, []);

  if (online && !queued) return null;
  return <a className={online ? "offline-status is-syncing" : "offline-status"} href="/offline"><span>{online ? "↻" : "⌁"}</span>{online ? `${queued} change${queued === 1 ? "" : "s"} waiting to sync` : "Offline · changes stay on this device"}</a>;
}
