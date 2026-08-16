"use client";

import { useEffect, useState } from "react";
import { offlineQueueCount, saveTravelPack } from "@/lib/offline-client";

const corePack = ["/learn", "/routes", "/learning-graph", "/diagnostic", "/cases", "/visual-lab", "/learn/cardiovascular/cardiac-cycle", "/learn/cardiovascular/cardiac-output", "/assessment", "/review", "/mistakes", "/maps", "/offline"];

export function OfflineWorkspace() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [queued, setQueued] = useState(() => typeof window === "undefined" ? 0 : offlineQueueCount());
  const [message, setMessage] = useState("");
  useEffect(() => {
    const update = () => { setOnline(window.navigator.onLine); setQueued(offlineQueueCount()); };
    window.addEventListener("online", update); window.addEventListener("offline", update); window.addEventListener("vitae-offline-queue", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); window.removeEventListener("vitae-offline-queue", update); };
  }, []);
  async function prepare() {
    setMessage("Preparing the core learning pack…");
    try { await saveTravelPack(corePack); setMessage("Core lessons and practice pages are saved on this device for travel."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "The travel pack could not be prepared."); }
  }
  return <div className="offline-page"><header className="offline-hero"><div><span className="eyebrow"><i /> Offline & travel mode</span><h1>Carry the lesson.<br />Leave the textbook.</h1><p>Save lightweight lesson pages and practice screens before travelling. Notes and recall ratings made offline stay on this device and sync when connection returns.</p><button className="primary-button primary-button--dark" type="button" onClick={prepare}>Save core learning pack <span>↓</span></button>{message ? <small role="status">{message}</small> : null}</div><div><span className={online ? "is-online" : ""}>{online ? "Online now" : "Offline now"}</span><strong>{queued}<small>changes waiting to sync</small></strong><p>Textbook PDFs are deliberately excluded so the pack stays fast and small.</p></div></header><section className="offline-features"><article><span>01</span><strong>Lessons</strong><p>Cardiac cycle and cardiac output pages, explanations, and built-in concept maps.</p></article><article><span>02</span><strong>Practice</strong><p>Assessment, review, mistake, route, and saved-map screens remain available.</p></article><article><span>03</span><strong>Private drafts</strong><p>Offline notes and recall ratings wait locally, then sync with your account.</p></article></section><aside className="offline-safety"><span>⌁</span><div><strong>Use travel mode on a private device.</strong><p>Offline drafts are stored in this browser until they sync. Do not use it on a shared computer.</p></div><a href="/learn">Return to learning</a></aside></div>;
}
